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

import { marketplacePurchaseSchema } from '@saveraks/shared/schemas';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import { generateVoucherCode } from '../services/auth.service.js';

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
 * Returns current user's redemption vouchers.
 * GET /api/marketplace/redemptions
 */
export async function getMyRedemptions(req, res, next) {
  try {
    const redemptions = await prisma.redemption.findMany({
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
    });

    res.status(200).json({
      success: true,
      data: redemptions.map((r) => ({
        id: r.id,
        rewardTitle: r.rewardItem.title,
        rewardDescription: r.rewardItem.description,
        rewardImageUrl: r.rewardItem.imageUrl,
        costAtPurchase: r.costAtPurchase,
        redemptionCode: r.redemptionCode,
        status: r.status,
        claimedAt: r.claimedAt,
        createdAt: r.createdAt,
      })),
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

    const redemption = await prisma.redemption.findUnique({
      where: { redemptionCode: code.toUpperCase() },
      include: {
        rewardItem: true,
        user: { select: { displayName: true, studentId: true } },
      },
    });

    if (!redemption) {
      throw new AppError(404, 'Voucher code not found', 'VOUCHER_NOT_FOUND');
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
