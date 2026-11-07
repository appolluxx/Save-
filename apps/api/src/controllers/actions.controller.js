/**
 * SaveRaks Environmental Actions Controller
 * 
 * DESIGN PRINCIPLE:
 * - Server is sole authority on point awards and CO2 savings.
 * - Enforces anti-cheat image comparison, commute time windows, and rate limits.
 * - Executes approved point credits inside atomic database transactions with PointTransaction ledger rows.
 * - Exposes public feed with strict student privacy sanitization.
 * 
 * @module controllers/actions
 */

import {
  actionSubmissionSchema,
} from '@saveraks/shared/schemas';

import {
  ACTION_TYPES,
  COMMUTE_RULES,
  SERVER_ACTION_SPECIFICATION,
  evaluateCommuteWindow,
} from '@saveraks/shared/constants';

import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import {
  sanitizeAndProcessImage,
  uploadActionImages,
} from '../services/storage.service.js';

import {
  computeImageFingerprint,
  evaluateImageAntiCheat,
  enforceRateLimits,
} from '../services/anticheat.service.js';

import { analyzeWasteImage } from '../services/ai-vision.service.js';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const BANGKOK_OFFSET_MILLISECONDS = 7 * 60 * 60 * 1000;
const roundToHundredth = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const WEEKDAY_INDEX_FROM_MONDAY = Object.freeze({
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
});
const THAI_WEEKDAY_LABELS = Object.freeze(['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']);

/**
 * Returns Monday at 00:00 in the school's Asia/Bangkok timezone as a UTC Date.
 * @param {Date} [date=new Date()]
 * @returns {Date}
 */
export function getBangkokWeekStart(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: COMMUTE_RULES.TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdayOffset = WEEKDAY_INDEX_FROM_MONDAY[values.weekday] ?? 0;
  const bangkokDateAtUtcMidnight = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day) - weekdayOffset
  );

  return new Date(bangkokDateAtUtcMidnight - BANGKOK_OFFSET_MILLISECONDS);
}

/**
 * Aggregates approved action records into a seven-day school-week series.
 * @param {{ createdAt: Date | string, pointsAwarded?: number, co2SavedKg?: number }[]} actions
 * @param {Date} [now=new Date()]
 * @returns {{ weekStart: string, currentDayIndex: number, totalActions: number, totalPointsEarned: number, totalCo2SavedKg: number, days: object[] }}
 */
export function buildWeeklyTelemetry(actions, now = new Date()) {
  const weekStart = getBangkokWeekStart(now);
  const days = Array.from({ length: 7 }, (_, index) => {
    const dayStart = new Date(weekStart.getTime() + index * MILLISECONDS_PER_DAY);
    const bangkokDate = new Date(dayStart.getTime() + BANGKOK_OFFSET_MILLISECONDS);

    return {
      date: bangkokDate.toISOString().slice(0, 10),
      label: THAI_WEEKDAY_LABELS[index],
      actions: 0,
      pointsEarned: 0,
      co2SavedKg: 0,
    };
  });

  for (const action of actions) {
    const createdAt = new Date(action.createdAt).getTime();
    const dayIndex = Math.floor((createdAt - weekStart.getTime()) / MILLISECONDS_PER_DAY);

    if (!Number.isFinite(createdAt) || dayIndex < 0 || dayIndex >= days.length) continue;

    days[dayIndex].actions += 1;
    days[dayIndex].pointsEarned += Number(action.pointsAwarded) || 0;
    days[dayIndex].co2SavedKg += Number(action.co2SavedKg) || 0;
  }

  const currentDayIndex = Math.floor((now.getTime() - weekStart.getTime()) / MILLISECONDS_PER_DAY);
  const totalActions = days.reduce((total, day) => total + day.actions, 0);
  const totalPointsEarned = days.reduce((total, day) => total + day.pointsEarned, 0);
  const roundedDays = days.map((day) => ({
    ...day,
    co2SavedKg: roundToHundredth(day.co2SavedKg),
  }));
  const totalCo2SavedKg = roundedDays.reduce((total, day) => total + day.co2SavedKg, 0);

  return {
    weekStart: days[0].date,
    currentDayIndex: Math.max(0, Math.min(days.length - 1, currentDayIndex)),
    totalActions,
    totalPointsEarned,
    totalCo2SavedKg: roundToHundredth(totalCo2SavedKg),
    days: roundedDays,
  };
}

/**
 * Submits an environmental action with photographic proof.
 * POST /api/actions
 */
export async function submitAction(req, res, next) {
  try {
    const userId = req.user.id;

    // 1. Validate Form Fields via Zod
    const payload = actionSubmissionSchema.parse({
      type: req.body.type,
      description: req.body.description,
      latitude: req.body.latitude ? Number(req.body.latitude) : undefined,
      longitude: req.body.longitude ? Number(req.body.longitude) : undefined,
    });

    // 2. Validate Image Attachment
    if (!req.file || !req.file.buffer) {
      throw new AppError(400, 'A photographic evidence image is required for environmental actions', 'MISSING_IMAGE');
    }

    // 3. Enforce Commute Time Window Rules (if applicable)
    let commuteWindowKey = null;
    if (COMMUTE_RULES.ELIGIBLE_ACTION_TYPES.includes(payload.type)) {
      const commuteCheck = evaluateCommuteWindow(new Date());
      if (!commuteCheck.isValid) {
        throw new AppError(400, commuteCheck.reason, 'COMMUTE_WINDOW_VIOLATION');
      }
      commuteWindowKey = commuteCheck.commuteWindowKey;

      // Check if user already submitted in this window
      const existingCommute = await prisma.ecoAction.findFirst({
        where: {
          userId,
          commuteWindowKey,
        },
      });

      if (existingCommute) {
        throw new AppError(
          400,
          `You have already submitted a commute action for window [${commuteWindowKey}]. Max 1 submission per window.`,
          'DUPLICATE_COMMUTE_WINDOW'
        );
      }
    }

    // 4. Enforce Cooldown (60s) and Hourly Caps (10/hr)
    await enforceRateLimits(userId, prisma);

    // 5. Sanitize & Optimize Image with Sharp
    const { mainBuffer, thumbBuffer } = await sanitizeAndProcessImage(req.file.buffer);

    // 6. Compute Perceptual Hashes & Histogram
    const fingerprint = await computeImageFingerprint(mainBuffer);

    // 7. Run Database-Backed Anti-Cheat Evaluation
    const antiCheat = await evaluateImageAntiCheat(fingerprint, userId, prisma);

    // 8. Upload to Persistent Cloud Storage
    const storageResult = await uploadActionImages(mainBuffer, thumbBuffer, 'actions');

    // 9. Run AI Computer Vision Analysis
    const aiAnalysis = await analyzeWasteImage(mainBuffer);

    // 10. Determine Final Approval Status & Authoritative Points
    const actionSpec = SERVER_ACTION_SPECIFICATION[payload.type];
    const authoritativePoints = actionSpec ? actionSpec.points : 0;
    const authoritativeCo2 = actionSpec ? actionSpec.co2SavedKg : 0;

    let finalStatus = 'APPROVED';
    let pointsToAward = authoritativePoints;
    let co2ToAward = authoritativeCo2;
    let rejectionReason = null;

    if (antiCheat.verdict === 'REJECTED') {
      finalStatus = 'REJECTED';
      pointsToAward = 0;
      co2ToAward = 0;
      rejectionReason = antiCheat.reason;
    } else if (antiCheat.verdict === 'PENDING' || aiAnalysis.confidence < 0.6 || !aiAnalysis.isValid) {
      finalStatus = 'PENDING';
      pointsToAward = 0;
      co2ToAward = 0;
      rejectionReason =
        antiCheat.reason ||
        (!aiAnalysis.isValid
          ? 'Image was not recognized as a valid environmental activity'
          : 'Flagged for staff review due to low AI confidence');
    }

    // 11. Atomic Database Transaction: Save Action & Ledger Row
    const action = await prisma.$transaction(async (tx) => {
      const newAction = await tx.ecoAction.create({
        data: {
          userId,
          type: payload.type,
          status: finalStatus,
          pointsAwarded: pointsToAward,
          co2SavedKg: co2ToAward,
          imageObjectKey: storageResult.imageObjectKey,
          thumbnailObjectKey: storageResult.thumbnailObjectKey,
          imageUrl: storageResult.imageUrl,
          thumbnailUrl: storageResult.thumbnailUrl,
          pHash: fingerprint.pHash,
          dHash: fingerprint.dHash,
          aHash: fingerprint.aHash,
          colorHistogram: fingerprint.colorHistogram,
          similarityScore: antiCheat.similarityScore,
          suspiciousReason: antiCheat.reason,
          aiVerified: aiAnalysis.isValid,
          aiConfidence: aiAnalysis.confidence,
          aiSummaryThai: aiAnalysis.thaiSummary,
          aiDetectedObjects: aiAnalysis.detectedObjects,
          latitude: payload.latitude || null,
          longitude: payload.longitude || null,
          commuteWindowKey,
          rejectReason: rejectionReason,
        },
      });

      // If approved immediately, credit points to user and write ledger row
      if (finalStatus === 'APPROVED' && pointsToAward > 0) {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            points: { increment: pointsToAward },
            totalCo2Saved: { increment: co2ToAward },
          },
          select: { points: true },
        });

        await tx.pointTransaction.create({
          data: {
            userId,
            amount: pointsToAward,
            balanceAfter: updatedUser.points,
            type: 'ACTION_REWARD',
            referenceId: newAction.id,
            description: `Awarded points for verified ${payload.type}`,
          },
        });
      }

      return newAction;
    });

    res.status(201).json({
      success: true,
      data: {
        action: {
          id: action.id,
          type: action.type,
          status: action.status,
          pointsAwarded: action.pointsAwarded,
          co2SavedKg: action.co2SavedKg,
          imageUrl: action.imageUrl,
          thumbnailUrl: action.thumbnailUrl,
          aiSummaryThai: action.aiSummaryThai,
          rejectReason: action.rejectReason,
          createdAt: action.createdAt,
        },
        verdict: antiCheat.verdict,
        message:
          finalStatus === 'APPROVED'
            ? `Action verified! You earned ${pointsToAward} eco points.`
            : finalStatus === 'PENDING'
            ? 'Action submitted and queued for teacher verification.'
            : 'Action rejected by anti-cheat duplicate detection.',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public feed of approved actions with privacy sanitization.
 * GET /api/actions
 */
export async function getFeed(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;
    const now = new Date();
    const weekStart = getBangkokWeekStart(now);

    const [actions, total, weeklyActions] = await Promise.all([
      prisma.ecoAction.findMany({
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          pointsAwarded: true,
          co2SavedKg: true,
          imageUrl: true,
          thumbnailUrl: true,
          aiSummaryThai: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              studentMaster: {
                select: {
                  gradeLevel: true,
                  classroom: true,
                },
              },
            },
          },
        },
      }),
      prisma.ecoAction.count({ where: { status: 'APPROVED' } }),
      prisma.ecoAction.findMany({
        where: {
          status: 'APPROVED',
          createdAt: { gte: weekStart },
        },
        select: {
          createdAt: true,
          pointsAwarded: true,
          co2SavedKg: true,
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        actions: actions.map((a) => ({
          id: a.id,
          type: a.type,
          pointsAwarded: a.pointsAwarded,
          co2SavedKg: a.co2SavedKg,
          imageUrl: a.imageUrl,
          thumbnailUrl: a.thumbnailUrl,
          aiSummaryThai: a.aiSummaryThai,
          createdAt: a.createdAt,
          user: {
            id: a.user.id,
            displayName: a.user.displayName,
            avatarUrl: a.user.avatarUrl,
            gradeLevel: a.user.studentMaster?.gradeLevel || null,
            classroom: a.user.studentMaster?.classroom || null,
          },
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        weeklyTelemetry: buildWeeklyTelemetry(weeklyActions, now),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Returns current student's action submission history.
 * GET /api/actions/me
 */
export async function getMyActions(req, res, next) {
  try {
    const actions = await prisma.ecoAction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        status: true,
        pointsAwarded: true,
        co2SavedKg: true,
        imageUrl: true,
        thumbnailUrl: true,
        aiSummaryThai: true,
        rejectReason: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      data: actions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Real-time AI waste sorting scanner preview (does not create an action).
 * POST /api/actions/scan-preview
 */
export async function scanWastePreview(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      throw new AppError(400, 'Image file required for AI waste scan', 'MISSING_IMAGE');
    }

    const { mainBuffer } = await sanitizeAndProcessImage(req.file.buffer);
    const analysis = await analyzeWasteImage(mainBuffer);

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
}
