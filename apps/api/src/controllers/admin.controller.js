/**
 * SaveRaks Administrative & Review Queue Controller
 * 
 * DESIGN PRINCIPLE:
 * - Evidence review queue for teacher verification.
 * - Point awards during review execute via atomic database transactions with PointTransaction ledger entries.
 * - Sensitive administrative actions (user suspension, manual points) write immutable AuditLog rows.
 * 
 * @module controllers/admin
 */

import {
  actionReviewSchema,
  adminPointAdjustmentSchema,
} from '@saveraks/shared/schemas';

import { SERVER_ACTION_SPECIFICATION } from '@saveraks/shared/constants';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/error.middleware.js';

/**
 * Returns pending submissions awaiting review.
 * GET /api/admin/evidence
 */
export async function getEvidenceQueue(req, res, next) {
  try {
    const queue = await prisma.ecoAction.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            studentId: true,
            studentMaster: {
              select: {
                gradeLevel: true,
                classroom: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: queue.map((a) => ({
        id: a.id,
        type: a.type,
        status: a.status,
        imageUrl: a.imageUrl,
        thumbnailUrl: a.thumbnailUrl,
        similarityScore: a.similarityScore,
        suspiciousReason: a.suspiciousReason,
        aiConfidence: a.aiConfidence,
        aiSummaryThai: a.aiSummaryThai,
        aiDetectedObjects: a.aiDetectedObjects,
        createdAt: a.createdAt,
        user: {
          id: a.user.id,
          displayName: a.user.displayName,
          studentId: a.user.studentId,
          gradeLevel: a.user.studentMaster?.gradeLevel || null,
          classroom: a.user.studentMaster?.classroom || null,
        },
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reviews pending evidence (approve or reject with reason).
 * PATCH /api/admin/evidence/:id
 */
export async function reviewEvidence(req, res, next) {
  try {
    const { id } = req.params;
    const { status, rejectReason } = actionReviewSchema.parse(req.body);
    const reviewerId = req.user.id;

    const action = await prisma.ecoAction.findUnique({
      where: { id },
    });

    if (!action) {
      throw new AppError(404, 'Action submission not found', 'ACTION_NOT_FOUND');
    }

    if (action.status !== 'PENDING') {
      throw new AppError(400, `Action has already been reviewed (current status: ${action.status})`, 'ALREADY_REVIEWED');
    }

    const actionSpec = SERVER_ACTION_SPECIFICATION[action.type];
    const pointsToAward = actionSpec ? actionSpec.points : 0;
    const co2ToAward = actionSpec ? actionSpec.co2SavedKg : 0;

    const updated = await prisma.$transaction(async (tx) => {
      const reviewed = await tx.ecoAction.update({
        where: { id },
        data: {
          status,
          pointsAwarded: status === 'APPROVED' ? pointsToAward : 0,
          co2SavedKg: status === 'APPROVED' ? co2ToAward : 0,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          rejectReason: status === 'REJECTED' ? rejectReason : null,
        },
      });

      // If approved, atomically credit points and create ledger row
      if (status === 'APPROVED' && pointsToAward > 0) {
        const updatedUser = await tx.user.update({
          where: { id: action.userId },
          data: {
            points: { increment: pointsToAward },
            totalCo2Saved: { increment: co2ToAward },
          },
          select: { points: true },
        });

        await tx.pointTransaction.create({
          data: {
            userId: action.userId,
            amount: pointsToAward,
            balanceAfter: updatedUser.points,
            type: 'ACTION_REWARD',
            referenceId: action.id,
            description: `Staff approved ${action.type}`,
          },
        });
      }

      // Record administrative audit log
      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: 'EVIDENCE_REVIEW',
          targetType: 'EcoAction',
          targetId: action.id,
          payload: { status, rejectReason },
          ipAddress: req.ip || null,
        },
      });

      return reviewed;
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: `Action has been successfully marked as ${status}`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Searches and lists users for administrative management.
 * GET /api/admin/users
 */
export async function listUsers(req, res, next) {
  try {
    const { search, role, page = '1', limit = '20' } = req.query;
    const take = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * take;

    const where = {};
    if (role) where.role = String(role);
    if (search) {
      where.OR = [
        { displayName: { contains: String(search), mode: 'insensitive' } },
        { studentId: { contains: String(search) } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          studentId: true,
          displayName: true,
          email: true,
          role: true,
          points: true,
          totalCo2Saved: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          studentMaster: {
            select: {
              gradeLevel: true,
              classroom: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: users.map((u) => ({
          ...u,
          gradeLevel: u.studentMaster?.gradeLevel || null,
          classroom: u.studentMaster?.classroom || null,
        })),
        pagination: {
          page: parseInt(page, 10),
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Toggles a user's active/suspended status with audit logging.
 * PATCH /api/admin/users/:id/status
 */
export async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { isActive, reason } = req.body;

    if (typeof isActive !== 'boolean') {
      throw new AppError(400, 'isActive must be a boolean value', 'INVALID_STATUS');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: { isActive },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'USER_STATUS_CHANGE',
          targetType: 'User',
          targetId: id,
          payload: { previousState: user.isActive, newState: isActive, reason },
          ipAddress: req.ip || null,
        },
      });

      return u;
    });

    res.status(200).json({
      success: true,
      data: { id: updated.id, isActive: updated.isActive },
      message: `User status updated to ${isActive ? 'Active' : 'Suspended'}`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Manually adjusts a user's eco points with mandatory audit logging.
 * POST /api/admin/adjust-points
 */
export async function adjustUserPoints(req, res, next) {
  try {
    const { targetUserId, amount, reason } = adminPointAdjustmentSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new AppError(404, 'Target user not found', 'USER_NOT_FOUND');

    // Prevent negative point balance invariant violation
    if (amount < 0 && user.points + amount < 0) {
      throw new AppError(
        400,
        `Cannot deduct ${Math.abs(amount)} points: user currently has only ${user.points} points. Point balance cannot become negative.`,
        'INSUFFICIENT_POINTS'
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: {
          id: targetUserId,
          ...(amount < 0 ? { points: { gte: Math.abs(amount) } } : {}),
        },
        data: { points: { increment: amount } },
        select: { id: true, points: true },
      });

      // Write PointTransaction ledger row
      const transaction = await tx.pointTransaction.create({
        data: {
          userId: targetUserId,
          amount,
          balanceAfter: updatedUser.points,
          type: 'ADMIN_ADJUSTMENT',
          description: `Admin adjustment: ${reason}`,
        },
      });

      // Write AuditLog row
      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'POINT_ADJUSTMENT',
          targetType: 'User',
          targetId: targetUserId,
          payload: { amount, reason, newBalance: updatedUser.points },
          ipAddress: req.ip || null,
        },
      });

      return { updatedUser, transaction };
    });

    res.status(200).json({
      success: true,
      data: {
        userId: result.updatedUser.id,
        newPoints: result.updatedUser.points,
        amount,
        transactionId: result.transaction.id,
      },
      message: 'Points successfully adjusted and recorded in authoritative ledger',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generates school-wide environmental metrics report.
 * GET /api/admin/reports
 */
export async function getReports(req, res, next) {
  try {
    const [actionCounts, totalCo2, activeStudents, rewardCounts] = await Promise.all([
      prisma.ecoAction.groupBy({
        by: ['type', 'status'],
        _count: { id: true },
      }),
      prisma.user.aggregate({
        _sum: { totalCo2Saved: true, points: true },
      }),
      prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
      prisma.redemption.count({ where: { status: 'CLAIMED' } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        activeStudents,
        totalPointsInCirculation: totalCo2._sum.points || 0,
        totalCo2SavedKg: Number((totalCo2._sum.totalCo2Saved || 0).toFixed(2)),
        totalRewardsClaimed: rewardCounts,
        actionBreakdown: actionCounts.map((a) => ({
          type: a.type,
          status: a.status,
          count: a._count.id,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}
