import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTION_TYPES,
  ACTION_METADATA,
  SERVER_ACTION_SPECIFICATION,
  BIN_CATEGORIES,
  COMMUTE_RULES,
  SECURITY_LIMITS,
  LEVEL_THRESHOLDS,
  BADGE_DEFINITIONS,
  evaluateCommuteWindow,
  calculateLevel,
  studentVerifySchema,
  studentRegisterSchema,
  staffRegisterSchema,
  loginSchema,
  actionSubmissionSchema,
  marketplacePurchaseSchema,
  aiVisionOutputSchema,
  mapPinCreateSchema,
  adminPointAdjustmentSchema,
  actionReviewSchema,
} from '../src/index.js';

describe('SaveRaks Shared Constants & Utilities', () => {
  it('should define all 8 expected action types with matching metadata and server specifications', () => {
    const actionKeys = Object.keys(ACTION_TYPES);
    assert.equal(actionKeys.length, 8);

    for (const key of actionKeys) {
      assert.ok(ACTION_METADATA[key], `Missing metadata for action ${key}`);
      assert.ok(ACTION_METADATA[key].nameThai, `Missing Thai name for action ${key}`);
      assert.ok(ACTION_METADATA[key].nameEnglish, `Missing English name for action ${key}`);

      assert.ok(SERVER_ACTION_SPECIFICATION[key], `Missing server spec for action ${key}`);
      assert.ok(SERVER_ACTION_SPECIFICATION[key].points > 0, `Points must be positive for ${key}`);
      assert.ok(SERVER_ACTION_SPECIFICATION[key].co2SavedKg > 0, `CO2 factor must be positive for ${key}`);
      assert.ok(SERVER_ACTION_SPECIFICATION[key].source, `Source must be documented for ${key}`);
      assert.ok(SERVER_ACTION_SPECIFICATION[key].unit, `Unit must be specified for ${key}`);
    }
  });

  it('should define 4 official Thai waste sorting bins with accepted items and instructions', () => {
    const bins = ['YELLOW', 'GREEN', 'BLUE', 'ORANGE_RED'];
    for (const bin of bins) {
      assert.ok(BIN_CATEGORIES[bin], `Missing bin category ${bin}`);
      assert.ok(BIN_CATEGORIES[bin].hexColor.startsWith('#'), `Invalid hex color for ${bin}`);
      assert.ok(BIN_CATEGORIES[bin].acceptedItems.length > 0, `No accepted items for ${bin}`);
      assert.ok(BIN_CATEGORIES[bin].instructionsThai, `No instructions for ${bin}`);
    }
  });

  describe('Commute Window Rules (Bangkok Time UTC+7)', () => {
    it('should validate morning commute window on a weekday (Wednesday 07:15 UTC+7 = 00:15 UTC)', () => {
      const wedMorning = new Date('2026-10-28T00:15:00Z');
      const result = evaluateCommuteWindow(wedMorning);
      assert.equal(result.isValid, true);
      assert.equal(result.windowType, 'MORNING');
      assert.equal(result.commuteWindowKey, '2026-10-28:MORNING');
    });

    it('should validate afternoon commute window on a weekday (Wednesday 16:30 UTC+7 = 09:30 UTC)', () => {
      const wedAfternoon = new Date('2026-10-28T09:30:00Z');
      const result = evaluateCommuteWindow(wedAfternoon);
      assert.equal(result.isValid, true);
      assert.equal(result.windowType, 'AFTERNOON');
      assert.equal(result.commuteWindowKey, '2026-10-28:AFTERNOON');
    });

    it('should reject commute outside approved school windows (Wednesday 12:00 UTC+7 = 05:00 UTC)', () => {
      const wedNoon = new Date('2026-10-28T05:00:00Z');
      const result = evaluateCommuteWindow(wedNoon);
      assert.equal(result.isValid, false);
      assert.equal(result.windowType, null);
      assert.match(result.reason, /outside allowed school commute windows/i);
    });

    it('should reject commute on weekends (Sunday 07:30 UTC+7 = 00:30 UTC)', () => {
      const sunMorning = new Date('2026-10-25T00:30:00Z');
      const result = evaluateCommuteWindow(sunMorning);
      assert.equal(result.isValid, false);
      assert.equal(result.windowType, null);
      assert.match(result.reason, /Monday through Friday/i);
    });
  });

  describe('calculateLevel()', () => {
    it('should correctly calculate levels and progress across thresholds', () => {
      // Level 1 boundary (0 - 99 pts)
      assert.deepEqual(calculateLevel(0), {
        level: 1,
        currentThreshold: 0,
        nextThreshold: 100,
        progressPercent: 0,
      });

      assert.deepEqual(calculateLevel(50), {
        level: 1,
        currentThreshold: 0,
        nextThreshold: 100,
        progressPercent: 50,
      });

      // Level 2 boundary (100 - 299 pts)
      assert.deepEqual(calculateLevel(100), {
        level: 2,
        currentThreshold: 100,
        nextThreshold: 300,
        progressPercent: 0,
      });

      assert.deepEqual(calculateLevel(250), {
        level: 2,
        currentThreshold: 100,
        nextThreshold: 300,
        progressPercent: 75,
      });

      // Maximum Level (10,000+ pts)
      const maxLevel = calculateLevel(15000);
      assert.equal(maxLevel.level, 8);
      assert.equal(maxLevel.nextThreshold, null);
      assert.equal(maxLevel.progressPercent, 100);

      // Negative points boundary safety
      assert.equal(calculateLevel(-50).level, 1);
    });
  });

  describe('Security Limits & Badges', () => {
    it('should enforce strict 5MB upload limit and MIME types', () => {
      assert.equal(SECURITY_LIMITS.MAX_FILE_SIZE_BYTES, 5 * 1024 * 1024);
      assert.deepEqual(SECURITY_LIMITS.ALLOWED_MIME_TYPES, ['image/jpeg', 'image/png', 'image/webp']);
      assert.equal(SECURITY_LIMITS.HAMMING_DUPLICATE_THRESHOLD, 5);
    });

    it('should define official badge triggers', () => {
      assert.ok(BADGE_DEFINITIONS.FIRST_ACTION);
      assert.ok(BADGE_DEFINITIONS.STREAK_7);
      assert.ok(BADGE_DEFINITIONS.MASTER_SORTER);
    });
  });
});

describe('SaveRaks Validation Schemas (Zod)', () => {
  describe('studentVerifySchema', () => {
    it('should accept valid 5-digit Surasakmontree student ID', () => {
      const res = studentVerifySchema.safeParse({ studentId: '53580' });
      assert.ok(res.success);
      assert.equal(res.data.studentId, '53580');
    });

    it('should reject invalid student IDs (too short, too long, non-numeric)', () => {
      assert.equal(studentVerifySchema.safeParse({ studentId: '5358' }).success, false);
      assert.equal(studentVerifySchema.safeParse({ studentId: '535801' }).success, false);
      assert.equal(studentVerifySchema.safeParse({ studentId: '5358A' }).success, false);
      assert.equal(studentVerifySchema.safeParse({ studentId: '' }).success, false);
      assert.equal(studentVerifySchema.safeParse({}).success, false);
    });
  });

  describe('studentRegisterSchema', () => {
    const validStudent = {
      studentId: '53580',
      displayName: 'Somchai Jaidee',
      password: 'Password123',
      email: 'somchai@example.com',
      phone: '0812345678',
    };

    it('should accept valid student registration data', () => {
      const res = studentRegisterSchema.safeParse(validStudent);
      assert.ok(res.success);
      assert.equal(res.data.displayName, 'Somchai Jaidee');
      assert.equal(res.data.email, 'somchai@example.com');
    });

    it('should transform empty email and phone to undefined', () => {
      const res = studentRegisterSchema.safeParse({
        ...validStudent,
        email: '',
        phone: '',
      });
      assert.ok(res.success);
      assert.equal(res.data.email, undefined);
      assert.equal(res.data.phone, undefined);
    });

    it('should reject weak passwords', () => {
      // Too short (< 8 chars)
      assert.equal(studentRegisterSchema.safeParse({ ...validStudent, password: 'Pass1' }).success, false);
      // No uppercase
      assert.equal(studentRegisterSchema.safeParse({ ...validStudent, password: 'password123' }).success, false);
      // No lowercase
      assert.equal(studentRegisterSchema.safeParse({ ...validStudent, password: 'PASSWORD123' }).success, false);
      // No number
      assert.equal(studentRegisterSchema.safeParse({ ...validStudent, password: 'PasswordLong' }).success, false);
    });

    it('should reject unauthorized injected fields (strictObject defense)', () => {
      const res = studentRegisterSchema.safeParse({
        ...validStudent,
        role: 'ADMIN', // Tampered role injection attempt
        points: 9999,  // Tampered points injection attempt
      });
      assert.equal(res.success, false, 'Should reject extra unauthorized fields');
    });

    it('should reject invalid phone formats', () => {
      assert.equal(studentRegisterSchema.safeParse({ ...validStudent, phone: '12345' }).success, false);
      assert.equal(studentRegisterSchema.safeParse({ ...validStudent, phone: '081234567890' }).success, false);
    });
  });

  describe('staffRegisterSchema', () => {
    const validStaff = {
      email: 'teacher.som@surasak.ac.th',
      displayName: 'Kru Som',
      password: 'StaffPassword2026',
      staffInviteCode: 'STAFF_SECRET_KEY_SURASAK_123',
    };

    it('should accept valid staff registration data', () => {
      const res = staffRegisterSchema.safeParse(validStaff);
      assert.ok(res.success);
      assert.equal(res.data.displayName, 'Kru Som');
    });

    it('should reject short or missing staff invite code', () => {
      assert.equal(staffRegisterSchema.safeParse({ ...validStaff, staffInviteCode: 'short' }).success, false);
      assert.equal(staffRegisterSchema.safeParse({ ...validStaff, staffInviteCode: '' }).success, false);
    });

    it('should reject invalid staff email', () => {
      assert.equal(staffRegisterSchema.safeParse({ ...validStaff, email: 'not-an-email' }).success, false);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login identifiers', () => {
      assert.ok(loginSchema.safeParse({ identifier: '53580', password: 'secretPassword' }).success);
      assert.ok(loginSchema.safeParse({ identifier: 'user@example.com', password: 'secretPassword' }).success);
    });

    it('should reject empty or missing fields', () => {
      assert.equal(loginSchema.safeParse({ identifier: '', password: '123' }).success, false);
      assert.equal(loginSchema.safeParse({ identifier: '53580', password: '' }).success, false);
      assert.equal(loginSchema.safeParse({}).success, false);
    });
  });

  describe('marketplacePurchaseSchema (Anti-Tampering Protection)', () => {
    const validUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    it('should accept valid purchase request containing only rewardItemId', () => {
      const res = marketplacePurchaseSchema.safeParse({ rewardItemId: validUUID });
      assert.ok(res.success);
      assert.equal(res.data.rewardItemId, validUUID);
    });

    it('should reject non-UUID rewardItemId', () => {
      assert.equal(marketplacePurchaseSchema.safeParse({ rewardItemId: 'invalid-id' }).success, false);
      assert.equal(marketplacePurchaseSchema.safeParse({ rewardItemId: '' }).success, false);
    });

    it('CRITICAL SECURITY: should REJECT client-supplied price tampering (cost: 0 / points: 0)', () => {
      const tamperedPayload = {
        rewardItemId: validUUID,
        cost: 0, // Attacker attempts to buy for 0 points
      };
      const res = marketplacePurchaseSchema.safeParse(tamperedPayload);
      assert.equal(res.success, false, 'strictObject must reject unauthorized cost field');
    });

    it('CRITICAL SECURITY: should REJECT client-supplied discount or quantity fields', () => {
      const tamperedPayload = {
        rewardItemId: validUUID,
        discount: 100,
        quantity: 50,
      };
      const res = marketplacePurchaseSchema.safeParse(tamperedPayload);
      assert.equal(res.success, false);
    });
  });

  describe('actionSubmissionSchema', () => {
    it('should accept valid action submission with coordinates', () => {
      const res = actionSubmissionSchema.safeParse({
        type: ACTION_TYPES.RECYCLE_PET,
        description: 'Recycled 2 clear water bottles at cafeteria bin',
        latitude: 13.7760,
        longitude: 100.5550,
      });
      assert.ok(res.success);
      assert.equal(res.data.type, 'RECYCLE_PET');
    });

    it('should accept valid action submission without optional coordinates or description', () => {
      const res = actionSubmissionSchema.safeParse({
        type: ACTION_TYPES.COMMUTE_PUBLIC,
      });
      assert.ok(res.success);
      assert.equal(res.data.description, '');
    });

    it('should reject invalid action types', () => {
      assert.equal(actionSubmissionSchema.safeParse({ type: 'INVALID_TYPE' }).success, false);
      assert.equal(actionSubmissionSchema.safeParse({ type: '' }).success, false);
    });

    it('should reject out-of-range coordinates', () => {
      assert.equal(
        actionSubmissionSchema.safeParse({
          type: ACTION_TYPES.RECYCLE_PET,
          latitude: 95.0, // > 90
        }).success,
        false
      );
      assert.equal(
        actionSubmissionSchema.safeParse({
          type: ACTION_TYPES.RECYCLE_PET,
          longitude: -185.0, // < -180
        }).success,
        false
      );
    });

    it('should reject unauthorized point injection fields', () => {
      const res = actionSubmissionSchema.safeParse({
        type: ACTION_TYPES.RECYCLE_PET,
        pointsAwarded: 1000, // Attacker attempts to award self points
      });
      assert.equal(res.success, false);
    });
  });

  describe('aiVisionOutputSchema', () => {
    it('should validate structured AI computer vision response', () => {
      const validAIResponse = {
        isValid: true,
        detectedCategory: 'RECYCLE_PET',
        confidence: 0.95,
        detectedObjects: ['plastic bottle', 'yellow recycling bin'],
        thaiSummary: 'พบขวดพลาสติก PET ใสในถังขยะรีไซเคิลอย่างถูกต้อง',
        recommendedBinColor: 'YELLOW',
      };
      const res = aiVisionOutputSchema.safeParse(validAIResponse);
      assert.ok(res.success);
      assert.equal(res.data.confidence, 0.95);
    });

    it('should reject invalid confidence values (<0 or >1)', () => {
      assert.equal(
        aiVisionOutputSchema.safeParse({
          isValid: true,
          detectedCategory: 'PET',
          confidence: 1.5, // > 1
          detectedObjects: [],
          thaiSummary: 'text',
          recommendedBinColor: 'YELLOW',
        }).success,
        false
      );
    });

    it('should reject invalid bin color enum', () => {
      assert.equal(
        aiVisionOutputSchema.safeParse({
          isValid: true,
          detectedCategory: 'PET',
          confidence: 0.9,
          detectedObjects: [],
          thaiSummary: 'text',
          recommendedBinColor: 'PURPLE', // Not an official bin color
        }).success,
        false
      );
    });
  });

  describe('mapPinCreateSchema', () => {
    it('should validate valid campus map pin report', () => {
      const res = mapPinCreateSchema.safeParse({
        type: 'FULL_BIN',
        description: 'ถังขยะรีไซเคิลหน้าอาคาร 1 ขยะล้น',
        latitude: 13.7760,
        longitude: 100.5550,
      });
      assert.ok(res.success);
    });

    it('should reject missing or too short descriptions', () => {
      assert.equal(
        mapPinCreateSchema.safeParse({
          type: 'FULL_BIN',
          description: 'a', // too short
          latitude: 13.7760,
          longitude: 100.5550,
        }).success,
        false
      );
    });
  });

  describe('adminPointAdjustmentSchema', () => {
    const validAdjustment = {
      targetUserId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      amount: 50,
      reason: 'School environmental club volunteer bonus',
    };

    it('should accept valid positive and negative point adjustments', () => {
      assert.ok(adminPointAdjustmentSchema.safeParse(validAdjustment).success);
      assert.ok(adminPointAdjustmentSchema.safeParse({ ...validAdjustment, amount: -20 }).success);
    });

    it('should reject zero point adjustment (amount: 0)', () => {
      const res = adminPointAdjustmentSchema.safeParse({ ...validAdjustment, amount: 0 });
      assert.equal(res.success, false);
    });

    it('should reject missing or too short reason', () => {
      assert.equal(adminPointAdjustmentSchema.safeParse({ ...validAdjustment, reason: 'hi' }).success, false);
      assert.equal(adminPointAdjustmentSchema.safeParse({ ...validAdjustment, reason: '' }).success, false);
    });
  });

  describe('actionReviewSchema', () => {
    it('should accept APPROVED without rejection reason', () => {
      const res = actionReviewSchema.safeParse({ status: 'APPROVED' });
      assert.ok(res.success);
    });

    it('should accept REJECTED with valid rejection reason', () => {
      const res = actionReviewSchema.safeParse({
        status: 'REJECTED',
        rejectReason: 'Photo is blurry and does not show clear PET plastic',
      });
      assert.ok(res.success);
    });

    it('should reject REJECTED if rejection reason is missing or too short', () => {
      const resNoReason = actionReviewSchema.safeParse({ status: 'REJECTED' });
      assert.equal(resNoReason.success, false);

      const resShortReason = actionReviewSchema.safeParse({ status: 'REJECTED', rejectReason: 'no' });
      assert.equal(resShortReason.success, false);
    });
  });
});
