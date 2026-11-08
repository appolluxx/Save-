/**
 * SaveRaks Shared Validation Schemas (Zod)
 * 
 * DESIGN PRINCIPLE:
 * - Strict server-side validation schemas.
 * - Strip or reject unauthorized client-supplied fields (e.g. costs, roles, points).
 * - Shared across frontend forms (React Hook Form) and backend request middleware.
 * 
 * @module @saveraks/shared/schemas
 */

import { z } from 'zod';
import { ACTION_TYPES, PIN_TYPES } from './constants.js';

// ---------------------------------------------------------------------------
// Common Primitives & Regular Expressions
// ---------------------------------------------------------------------------

// 5-digit student ID pattern for Surasakmontree School
export const STUDENT_ID_REGEX = /^\d{5}$/;

// Thai phone number pattern (0 followed by 8 or 9 digits: e.g., 0812345678, 021234567)
export const THAI_PHONE_REGEX = /^0\d{8,9}$/;

// Password complexity: min 8 chars
export const passwordSchema = z
  .string()
  .min(8, 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร')
  .max(100, 'รหัสผ่านต้องไม่เกิน 100 ตัวอักษร');

// ---------------------------------------------------------------------------
// 1. Authentication & Registration Schemas
// ---------------------------------------------------------------------------

export const studentVerifySchema = z.strictObject({
  studentId: z
    .string()
    .trim()
    .regex(STUDENT_ID_REGEX, 'Student ID must be exactly 5 numeric digits'),
});

export const studentRegisterSchema = z.strictObject({
  studentId: z
    .string()
    .trim()
    .regex(STUDENT_ID_REGEX, 'Student ID must be exactly 5 numeric digits'),
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name cannot exceed 100 characters'),
  password: passwordSchema,
  email: z
    .string()
    .trim()
    .email('Invalid email address format')
    .toLowerCase()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  phone: z
    .string()
    .trim()
    .regex(THAI_PHONE_REGEX, 'Invalid Thai phone number format')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export const staffRegisterSchema = z.strictObject({
  email: z
    .string()
    .trim()
    .email('Invalid email address format')
    .toLowerCase(),
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name cannot exceed 100 characters'),
  password: passwordSchema,
  staffInviteCode: z
    .string()
    .trim()
    .min(16, 'Staff invite secret must be at least 16 characters'),
});

export const loginSchema = z.strictObject({
  identifier: z
    .string()
    .trim()
    .min(3, 'Identifier must be at least 3 characters')
    .max(255, 'Identifier cannot exceed 255 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(100, 'Password cannot exceed 100 characters'),
});

export const googleAuthSchema = z.strictObject({
  idToken: z
    .string()
    .trim()
    .min(20, 'Google ID token is required'),
});

// ---------------------------------------------------------------------------
// 2. Environmental Action Submission Schemas
// ---------------------------------------------------------------------------

export const actionSubmissionSchema = z.strictObject({
  type: z.nativeEnum(ACTION_TYPES, {
    errorMap: () => ({ message: 'Invalid or unsupported environmental action type' }),
  }),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .default(''),
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),
});

// ---------------------------------------------------------------------------
// 3. Marketplace & Redemption Schemas
// ---------------------------------------------------------------------------

/**
 * Strict purchase schema:
 * NEVER permits client-supplied cost, points, discount, or stock.
 * Extra fields will cause validation rejection via z.strictObject().
 */
export const marketplacePurchaseSchema = z.strictObject({
  rewardItemId: z
    .string()
    .trim()
    .uuid('Reward Item ID must be a valid UUID'),
});

// ---------------------------------------------------------------------------
// 4. AI Vision Structured Output Schemas
// ---------------------------------------------------------------------------

export const aiVisionOutputSchema = z.strictObject({
  isValid: z.boolean(),
  detectedCategory: z.string().trim().min(1),
  confidence: z
    .number()
    .min(0, 'Confidence cannot be less than 0')
    .max(1, 'Confidence cannot exceed 1'),
  detectedObjects: z.array(z.string().trim()),
  thaiSummary: z.string().trim().min(1),
  recommendedBinColor: z.enum(['YELLOW', 'GREEN', 'BLUE', 'ORANGE_RED']),
});

// ---------------------------------------------------------------------------
// 5. School Map & Campus Pin Schemas
// ---------------------------------------------------------------------------

export const mapPinCreateSchema = z.strictObject({
  type: z.nativeEnum(PIN_TYPES, {
    errorMap: () => ({ message: 'Invalid pin type' }),
  }),
  description: z
    .string()
    .trim()
    .min(3, 'Description must be at least 3 characters')
    .max(1000, 'Description cannot exceed 1000 characters'),
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

// ---------------------------------------------------------------------------
// 6. Administrative Action Schemas
// ---------------------------------------------------------------------------

export const adminPointAdjustmentSchema = z.strictObject({
  targetUserId: z
    .string()
    .trim()
    .uuid('Target User ID must be a valid UUID'),
  amount: z
    .number()
    .int('Adjustment amount must be an integer')
    .refine((val) => val !== 0, 'Adjustment amount cannot be zero'),
  reason: z
    .string()
    .trim()
    .min(5, 'A valid reason of at least 5 characters is required for audit logs')
    .max(255, 'Reason cannot exceed 255 characters'),
});

export const actionReviewSchema = z
  .strictObject({
    status: z.enum(['APPROVED', 'REJECTED']),
    rejectReason: z
      .string()
      .trim()
      .max(500, 'Reject reason cannot exceed 500 characters')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'REJECTED' && (!data.rejectReason || data.rejectReason.length < 3)) {
        return false;
      }
      return true;
    },
    {
      message: 'A rejection reason of at least 3 characters is mandatory when rejecting an action',
      path: ['rejectReason'],
    }
  );
