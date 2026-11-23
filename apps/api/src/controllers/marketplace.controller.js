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

import { KRATHONG_EVENT } from '@saveraks/shared/constants';
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
 * Creates one persistent, no-points Krathong event voucher per user.
 * POST /api/marketplace/krathong/redeem
 */
export async function redeemKrathongEvent(req, res, next) {
  try {
    const userId = req.user.id;
    const { materialType } = krathongRedemptionSchema.parse(req.body);
    const redemptionWhere = {
      userId_eventKey: { userId, eventKey: KRATHONG_EVENT.key },
    };

    const existing = await prisma.eventRedemption.findUnique({ where: redemptionWhere });
    if (existing) {
      res.status(200).json({
        success: true,
        data: { redemption: mapKrathongRedemption(existing) },
        message: 'คุณมีสิทธิ์แลกกระทงแล้ว ใช้รหัสเดิมได้ที่แท็บคูปองของฉัน',
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
        if (concurrentRedemption) {
          res.status(200).json({
            success: true,
            data: { redemption: mapKrathongRedemption(concurrentRedemption) },
            message: 'คุณมีสิทธิ์แลกกระทงแล้ว ใช้รหัสเดิมได้ที่แท็บคูปองของฉัน',
          });
          return;
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

    res.status(200).json({
      success: true,
      data: [...rewardVouchers, ...eventRedemptions.map(mapKrathongRedemption)].sort(
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
