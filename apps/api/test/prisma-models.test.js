import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PrismaClient,
  Role,
  ActionType,
  ActionStatus,
  TransactionType,
  RedemptionStatus,
  PinType,
} from '@prisma/client';

describe('Prisma Client & Data Models Validation', () => {
  it('should export all 10 required database models in Prisma DMMF', () => {
    const prisma = new PrismaClient();
    assert.ok(prisma.studentsMaster, 'Missing studentsMaster model');
    assert.ok(prisma.user, 'Missing user model');
    assert.ok(prisma.ecoAction, 'Missing ecoAction model');
    assert.ok(prisma.pointTransaction, 'Missing pointTransaction model');
    assert.ok(prisma.rewardItem, 'Missing rewardItem model');
    assert.ok(prisma.redemption, 'Missing redemption model');
    assert.ok(prisma.badge, 'Missing badge model');
    assert.ok(prisma.userBadge, 'Missing userBadge model');
    assert.ok(prisma.mapPin, 'Missing mapPin model');
    assert.ok(prisma.auditLog, 'Missing auditLog model');
  });

  it('should export all expected schema enums', () => {
    assert.deepEqual(Role, {
      STUDENT: 'STUDENT',
      STAFF: 'STAFF',
      ADMIN: 'ADMIN',
    });

    assert.ok(ActionType.RECYCLE_PET);
    assert.ok(ActionType.COMMUTE_PUBLIC);
    assert.ok(ActionStatus.PENDING);
    assert.ok(ActionStatus.APPROVED);
    assert.ok(TransactionType.ACTION_REWARD);
    assert.ok(TransactionType.REDEMPTION);
    assert.ok(RedemptionStatus.PENDING);
    assert.ok(PinType.FULL_BIN);
  });
});
