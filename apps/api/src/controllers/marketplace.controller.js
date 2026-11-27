/**
 * SaveRaks Marketplace & Atomic Redemption Controller
 * 
 * DESIGN PRINCIPLE:
 * - Server-authoritative item costs and stock decrements.
 * - Atomic database transactions protect against double-spending and overselling.
 * - Cryptographic, readable voucher codes (SR-XXXX-XXXX).
 * - Full financial-grade ledger tracking in PointTransaction.
 * 
 * @module controllers/marketplace
 */

import { ACTION_TYPES, KRATHONG_EVENT } from '@saveraks/shared/constants';
import {
  krathongRedemptionSchema,
  marketplacePurchaseSchema,
} from '@saveraks/shared/schemas';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import {
  generateKrathongVoucherCode,
  generateVoucherCode,
} from '../services/auth.service.js';

const KRATHONG_ACTION_TYPES = Object.freeze({
  PET: ACTION_TYPES.RECYCLE_PET,
  CAN: ACTION_TYPES.RECYCLE_CAN,
});
const KRATHONG_MATERIAL_BY_ACTION_TYPE = Object.freeze(
  Object.fromEntries(Object.entries(KRATHONG_ACTION_TYPES).map(([material, type]) => [type, material])),
);

function ensureRewardEligibility(user) {
  if (user.userGroup === 'EXTERNAL') {
    throw new AppError(403, 'บัญชีบุคคลภายนอกสะสมคะแนนได้ แต่ยังแลกรางวัลไม่ได้', 'REDEMPTION_NOT_ALLOWED');
  }
}

export function isKrathongMaterialEligible(materialType, approvedCount) {
  const requiredCount = KRATHONG_EVENT.materials[materialType]?.quantity;
  return Number.isFinite(Number(approvedCount)) && Number(approvedCount) >= requiredCount;
}

async function getApprovedKrathongCount(userId, materialType) {
  const actionType = KRATHONG_ACTION_TYPES[materialType];
  if (!actionType) return 0;
  return prisma.ecoAction.count({
    where: { userId, type: actionType, status: 'APPROVED' },
  });
}

function describeKrathongMaterial(materialType) {
  const material = KRATHONG_EVENT.materials[materialType];
  return `${material.label} ${material.quantity} ${material.unit} · ${material.condition}`;
}

function mapKrathongRedemption(redemption) {
  const materialRequirement = describeKrathongMaterial(redemption.materialType);
  return {
    id: redemption.id,
    eventKey: redemption.eventKey,
    isEvent: true,
    materialType: redemption.materialType,
    materialRequirement,
    rewardTitle: `สิทธิ์${KRATHONG_EVENT.title}`,
    rewardDescription: `${materialRequirement} · จำกัด 1 ใบต่อท่าน`,
    costAtPurchase: 0,
    redemptionCode: redemption.redemptionCode,
    status: redemption.status,
    claimedAt: redemption.claimedAt,
    createdAt: redemption.createdAt,
  };
}

/**
 * Lists all active reward items in catalog.
 * GET /api/marketplace/items
 */
export async function listItems(req, res, next) {
  try {
    const items = await prisma.rewardItem.findMany({
      where: { isActive: true },
      orderBy: { cost: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        cost: true,
        stock: true,
        imageUrl: true,
      },
    });

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Purchases a reward item using eco points in an atomic transaction.
 * POST /api/marketplace/purchase
 */
export async function purchaseItem(req, res, next) {
  try {
    ensureRewardEligibility(req.user);
    const userId = req.user.id;
    const { rewardItemId } = marketplacePurchaseSchema.parse(req.body);

    const redemption = await prisma.$transaction(async (tx) => {
      // 1. Fetch reward item from DB to ensure server-side price authority
      const reward = await tx.rewardItem.findFirst({
        where: { id: rewardItemId, isActive: true },
      });

      if (!reward) {
        throw new AppError(404, 'Reward item not found or is currently inactive', 'REWARD_NOT_FOUND');
      }

      if (reward.stock <= 0) {
        throw new AppError(400, 'Reward is currently out of stock', 'OUT_OF_STOCK');
      }

      // 2. Atomically decrement stock (conditional update ensures no overselling)
      const stockUpdate = await tx.rewardItem.updateMany({
        where: {
          id: reward.id,
          isActive: true,
          stock: { gt: 0 },
        },
        data: {
          stock: { decrement: 1 },
        },
      });

      if (stockUpdate.count === 0) {
        throw new AppError(400, 'Reward is out of stock', 'OUT_OF_STOCK');
      }

      // 3. Atomically decrement user points (conditional update ensures sufficient balance)
      const userUpdate = await tx.user.updateMany({
        where: {
          id: userId,
          isActive: true,
          points: { gte: reward.cost },
        },
        data: {
          points: { decrement: reward.cost },
        },
      });

      if (userUpdate.count === 0) {
        throw new AppError(400, 'Insufficient eco points for this redemption', 'INSUFFICIENT_POINTS');
      }

      // 4. Generate unique cryptographic claim code
      const redemptionCode = generateVoucherCode();

      // 5. Create Redemption record
      const newRedemption = await tx.redemption.create({
        data: {
          userId,
          rewardItemId: reward.id,
          costAtPurchase: reward.cost,
          redemptionCode,
          status: 'PENDING',
        },
        include: {
          rewardItem: {
            select: {
              title: true,
              imageUrl: true,
            },
          },
        },
      });

      // 6. Fetch updated user balance for ledger record
      const updatedUser = await tx.user.findUnique({
        where: { id: userId },
        select: { points: true },
      });

      // 7. Write immutable negative transaction to PointTransaction ledger
      await tx.pointTransaction.create({
        data: {
          userId,
          amount: -reward.cost,
          balanceAfter: updatedUser.points,
          type: 'REDEMPTION',
          referenceId: newRedemption.id,
          description: `Redeemed ${reward.title} for ${reward.cost} eco points`,
        },
      });

      return {
        ...newRedemption,
        remainingPoints: updatedUser.points,
      };
    });

    res.status(201).json({
      success: true,
      data: {
        redemption: {
          id: redemption.id,
          title: redemption.rewardItem.title,
          costAtPurchase: redemption.costAtPurchase,
          redemptionCode: redemption.redemptionCode,
          status: redemption.status,
          createdAt: redemption.createdAt,
        },
        remainingPoints: redemption.remainingPoints,
        message: 'Reward redeemed successfully! Present this code at the school office.',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Returns verified PET/CAN scan totals and event progress for the current user.
 * Only approved scans count toward redemption; pending scans are shown separately.
 * GET /api/marketplace/krathong/progress
 */
export async function getKrathongProgress(req, res, next) {
  try {
    const rows = await prisma.ecoAction.groupBy({
      by: ['type', 'status'],
      where: {
        userId: req.user.id,
        type: { in: Object.values(KRATHONG_ACTION_TYPES) },
        status: { in: ['APPROVED', 'PENDING'] },
      },
      _count: { id: true },
    });

    const materials = Object.fromEntries(
      Object.entries(KRATHONG_EVENT.materials).map(([materialType, material]) => [
        materialType,
        {
          approvedCount: 0,
          pendingCount: 0,
          requiredCount: material.quantity,
          remainingCount: material.quantity,
          eligible: false,
        },
      ]),
    );

    for (const row of rows) {
      const materialType = KRATHONG_MATERIAL_BY_ACTION_TYPE[row.type];
      if (!materialType) continue;
      if (row.status === 'APPROVED') materials[materialType].approvedCount = row._count.id;
      if (row.status === 'PENDING') materials[materialType].pendingCount = row._count.id;
    }

    for (const material of Object.values(materials)) {
      material.remainingCount = Math.max(0, material.requiredCount - material.approvedCount);
      material.eligible = material.remainingCount === 0;
    }

    res.status(200).json({ success: true, data: { materials } });
  } catch (error) {
    next(error);
  }
}

/**
 * Creates one persistent, no-points Krathong event voucher per user.
 * POST /api/marketplace/krathong/redeem
 */
export async function redeemKrathongEvent(req, res, next) {
  try {
    ensureRewardEligibility(req.user);
    const userId = req.user.id;
    const { materialType } = krathongRedemptionSchema.parse(req.body);
    const redemptionWhere = {
      userId_eventKey: { userId, eventKey: KRATHONG_EVENT.key },
    };

    const existing = await prisma.eventRedemption.findUnique({ where: redemptionWhere });
    const requestedCount = await getApprovedKrathongCount(userId, materialType);
    const canSwitchPendingVoucher = existing?.status === 'PENDING' &&
      existing.materialType !== materialType &&
      isKrathongMaterialEligible(materialType, requestedCount);
    const eligibleMaterialType = canSwitchPendingVoucher
      ? materialType
      : existing && existing.status !== 'CANCELLED'
        ? existing.materialType
        : materialType;
    const material = KRATHONG_EVENT.materials[eligibleMaterialType];
    const approvedCount = eligibleMaterialType === materialType
      ? requestedCount
      : await getApprovedKrathongCount(userId, eligibleMaterialType);

    if (!isKrathongMaterialEligible(eligibleMaterialType, approvedCount)) {
      if (existing?.status === 'PENDING') {
        await prisma.eventRedemption.updateMany({
          where: { id: existing.id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
      }
      throw new AppError(
        400,
        `ต้องมีรายการสแกน ${material.label} ที่ได้รับอนุมัติอย่างน้อย ${material.quantity} ชิ้น (ขณะนี้ ${approvedCount} ชิ้น)`,
        'KRATHONG_REQUIREMENT_NOT_MET',
      );
    }

    if (existing && existing.status !== 'CANCELLED' && !canSwitchPendingVoucher) {
      res.status(200).json({
        success: true,
        data: { redemption: mapKrathongRedemption(existing) },
        message: 'คุณมีสิทธิ์แลกกระทงแล้ว ใช้รหัสเดิมได้ที่แท็บคูปองของฉัน',
      });
      return;
    }

    if (canSwitchPendingVoucher) {
      const switchedRedemption = await prisma.eventRedemption.update({
        where: { id: existing.id },
        data: {
          materialType,
          redemptionCode: generateKrathongVoucherCode(),
        },
      });
      res.status(200).json({
        success: true,
        data: { redemption: mapKrathongRedemption(switchedRedemption) },
        message: 'เงื่อนไขวัสดุครบแล้ว ใช้รหัสแลกกระทงใหม่ได้',
      });
      return;
    }

    if (existing?.status === 'CANCELLED') {
      const reactivatedRedemption = await prisma.eventRedemption.update({
        where: { id: existing.id },
        data: {
          materialType,
          redemptionCode: generateKrathongVoucherCode(),
          status: 'PENDING',
          claimedAt: null,
        },
      });
      res.status(200).json({
        success: true,
        data: { redemption: mapKrathongRedemption(reactivatedRedemption) },
        message: 'ครบเงื่อนไขแล้ว ใช้รหัสแลกกระทงใหม่ได้',
      });
      return;
    }

    let redemption;
    try {
      redemption = await prisma.eventRedemption.create({
        data: {
          userId,
          eventKey: KRATHONG_EVENT.key,
          materialType,
          redemptionCode: generateKrathongVoucherCode(),
        },
      });
    } catch (error) {
      // The database constraint protects the one-voucher limit if the user taps twice.
      if (error?.code === 'P2002') {
        const concurrentRedemption = await prisma.eventRedemption.findUnique({
          where: redemptionWhere,
        });
        const concurrentCount = concurrentRedemption
          ? await getApprovedKrathongCount(userId, concurrentRedemption.materialType)
          : 0;
        if (
          concurrentRedemption &&
          concurrentRedemption.status !== 'CANCELLED' &&
          isKrathongMaterialEligible(concurrentRedemption.materialType, concurrentCount)
        ) {
          res.status(200).json({
            success: true,
            data: { redemption: mapKrathongRedemption(concurrentRedemption) },
            message: 'คุณมีสิทธิ์แลกกระทงแล้ว ใช้รหัสเดิมได้ที่แท็บคูปองของฉัน',
          });
          return;
        }
        if (
          concurrentRedemption?.status === 'CANCELLED' &&
          isKrathongMaterialEligible(concurrentRedemption.materialType, concurrentCount)
        ) {
          const reactivatedRedemption = await prisma.eventRedemption.update({
            where: { id: concurrentRedemption.id },
            data: {
              redemptionCode: generateKrathongVoucherCode(),
              status: 'PENDING',
              claimedAt: null,
            },
          });
          res.status(200).json({
            success: true,
            data: { redemption: mapKrathongRedemption(reactivatedRedemption) },
            message: 'ครบเงื่อนไขแล้ว ใช้รหัสแลกกระทงใหม่ได้',
          });
          return;
        }
        if (concurrentRedemption && !isKrathongMaterialEligible(concurrentRedemption.materialType, concurrentCount)) {
          const concurrentMaterial = KRATHONG_EVENT.materials[concurrentRedemption.materialType];
          throw new AppError(
            400,
            `ต้องมีรายการสแกน ${concurrentMaterial.label} ที่ได้รับอนุมัติอย่างน้อย ${concurrentMaterial.quantity} ชิ้น (ขณะนี้ ${concurrentCount} ชิ้น)`,
            'KRATHONG_REQUIREMENT_NOT_MET',
          );
        }
      }
      throw error;
    }

    res.status(201).json({
      success: true,
      data: { redemption: mapKrathongRedemption(redemption) },
      message: 'สร้างรหัสแลกกระทงสำเร็จ แสดงรหัสนี้ให้เจ้าหน้าที่ตรวจวัสดุ',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Returns current user's marketplace and event redemption vouchers.
 * GET /api/marketplace/redemptions
 */
export async function getMyRedemptions(req, res, next) {
  try {
    const [redemptions, eventRedemptions] = await Promise.all([
      prisma.redemption.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          rewardItem: {
            select: {
              title: true,
              description: true,
              imageUrl: true,
            },
          },
        },
      }),
      prisma.eventRedemption.findMany({
        where: { userId: req.user.id, eventKey: KRATHONG_EVENT.key },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const rewardVouchers = redemptions.map((r) => ({
      id: r.id,
      rewardTitle: r.rewardItem.title,
      rewardDescription: r.rewardItem.description,
      rewardImageUrl: r.rewardItem.imageUrl,
      costAtPurchase: r.costAtPurchase,
      redemptionCode: r.redemptionCode,
      status: r.status,
      claimedAt: r.claimedAt,
      createdAt: r.createdAt,
      isEvent: false,
    }));

    const visibleEventRedemptions = await Promise.all(
      eventRedemptions.map(async (redemption) => {
        if (!['PENDING', 'CLAIMED'].includes(redemption.status)) return null;
        const approvedCount = await getApprovedKrathongCount(req.user.id, redemption.materialType);
        return isKrathongMaterialEligible(redemption.materialType, approvedCount)
          ? redemption
          : null;
      }),
    );

    res.status(200).json({
      success: true,
      data: [...rewardVouchers, ...visibleEventRedemptions.filter(Boolean).map(mapKrathongRedemption)].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      ),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Staff/Admin verifies and marks a voucher as claimed upon physical pickup.
 * PATCH /api/marketplace/redemptions/:code/claim
 */
export async function claimVoucher(req, res, next) {
  try {
    const { code } = req.params;
    const normalizedCode = code.trim().toUpperCase();

    const redemption = await prisma.redemption.findUnique({
      where: { redemptionCode: normalizedCode },
      include: {
        rewardItem: true,
        user: { select: { displayName: true, studentId: true } },
      },
    });

    if (!redemption) {
      const eventRedemption = await prisma.eventRedemption.findUnique({
        where: { redemptionCode: normalizedCode },
        include: {
          user: { select: { displayName: true, studentId: true } },
        },
      });

      if (!eventRedemption) {
        throw new AppError(404, 'Voucher code not found', 'VOUCHER_NOT_FOUND');
      }

      if (eventRedemption.status === 'CLAIMED') {
        throw new AppError(
          400,
          `Voucher was already claimed on ${eventRedemption.claimedAt}`,
          'ALREADY_CLAIMED',
        );
      }
      if (eventRedemption.status !== 'PENDING') {
        throw new AppError(
          400,
          'Voucher has already been cancelled and cannot be claimed',
          'ALREADY_CLAIMED',
        );
      }

      const approvedCount = await getApprovedKrathongCount(
        eventRedemption.userId,
        eventRedemption.materialType,
      );
      if (!isKrathongMaterialEligible(eventRedemption.materialType, approvedCount)) {
        await prisma.eventRedemption.updateMany({
          where: { id: eventRedemption.id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
        const material = KRATHONG_EVENT.materials[eventRedemption.materialType];
        throw new AppError(
          400,
          `ใช้รหัสไม่ได้ ต้องมีรายการสแกน ${material.label} ที่ได้รับอนุมัติอย่างน้อย ${material.quantity} ชิ้น (ขณะนี้ ${approvedCount} ชิ้น)`,
          'KRATHONG_REQUIREMENT_NOT_MET',
        );
      }

      const eventUpdate = await prisma.eventRedemption.updateMany({
        where: { id: eventRedemption.id, status: 'PENDING' },
        data: { status: 'CLAIMED', claimedAt: new Date() },
      });

      if (eventUpdate.count === 0) {
        throw new AppError(
          400,
          'Voucher has already been claimed or is not in claimable status',
          'ALREADY_CLAIMED',
        );
      }

      const updatedEventRedemption = await prisma.eventRedemption.findUnique({
        where: { id: eventRedemption.id },
      });

      res.status(200).json({
        success: true,
        data: {
          id: updatedEventRedemption.id,
          status: updatedEventRedemption.status,
          claimedAt: updatedEventRedemption.claimedAt,
          studentName: eventRedemption.user.displayName,
          studentId: eventRedemption.user.studentId,
          rewardTitle: `สิทธิ์${KRATHONG_EVENT.title}`,
          materialType: eventRedemption.materialType,
          materialRequirement: describeKrathongMaterial(eventRedemption.materialType),
        },
        message: 'Krathong event voucher marked as successfully claimed',
      });
      return;
    }

    if (redemption.status === 'CLAIMED') {
      throw new AppError(400, `Voucher was already claimed on ${redemption.claimedAt}`, 'ALREADY_CLAIMED');
    }

    const updateResult = await prisma.redemption.updateMany({
      where: {
        id: redemption.id,
        status: 'PENDING',
      },
      data: {
        status: 'CLAIMED',
        claimedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new AppError(400, 'Voucher has already been claimed or is not in claimable status', 'ALREADY_CLAIMED');
    }

    const updated = await prisma.redemption.findUnique({
      where: { id: redemption.id },
    });

    res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        claimedAt: updated.claimedAt,
        studentName: redemption.user.displayName,
        studentId: redemption.user.studentId,
        rewardTitle: redemption.rewardItem.title,
      },
      message: 'Voucher marked as successfully claimed',
    });
  } catch (error) {
    next(error);
  }
}
