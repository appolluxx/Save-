/**
 * SaveRaks Authentication Service
 * 
 * DESIGN PRINCIPLE:
 * - Issues cryptographically signed JWT tokens with 7-day expiration.
 * - Password hashing using bcryptjs (cost factor 12).
 * - Google ID token verification via google-auth-library.
 * - Generates secure, readable voucher claim codes (e.g. "SR-9K2L-7X4M").
 * 
 * @module services/auth
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/error.middleware.js';

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

/**
 * Hashes a plaintext password using bcrypt with work factor 12.
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 12);
}

/**
 * Compares plaintext password against bcrypt hash in constant time.
 */
export async function verifyPassword(plainPassword, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Issues signed JWT session token.
 */
export function issueJwtToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      studentId: user.studentId,
    },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Sets secure HTTP-Only authentication cookie.
 */
export function setAuthCookie(res, token) {
  res.cookie('saveraks_token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Generates an uppercase, cryptographically secure voucher claim code.
 * Format: SR-XXXX-XXXX
 */
export function generateVoucherCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes confusing characters (0, 1, I, O)
  const bytes = crypto.randomBytes(8);
  let code = 'SR-';
  for (let i = 0; i < 4; i++) {
    code += chars[bytes[i] % chars.length];
  }
  code += '-';
  for (let i = 4; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Verifies staff invite secret using constant-time comparison.
 */
export function verifyStaffInviteSecret(providedSecret) {
  if (!providedSecret || typeof providedSecret !== 'string') return false;
  const targetSecret = env.STAFF_INVITE_SECRET;
  
  if (Buffer.byteLength(providedSecret) !== Buffer.byteLength(targetSecret)) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(providedSecret), Buffer.from(targetSecret));
}

/**
 * Verifies Google ID token server-side via google-auth-library.
 */
export async function verifyGoogleIdToken(idToken) {
  if (googleClient && env.GOOGLE_CLIENT_ID) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email_verified) {
        throw new AppError(401, 'Google account email is not verified', 'UNVERIFIED_GOOGLE_EMAIL');
      }
      return {
        googleId: payload.sub,
        email: payload.email,
        displayName: payload.name || payload.email.split('@')[0],
        avatarUrl: payload.picture || null,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(401, `Google identity verification failed: ${err.message}`, 'INVALID_GOOGLE_TOKEN');
    }
  }

  // Development/Test mock verification when GOOGLE_CLIENT_ID is not configured
  if (env.NODE_ENV !== 'production' && idToken.startsWith('mock_google_')) {
    return {
      googleId: `google_${idToken}`,
      email: `mock_${idToken}@surasak.ac.th`,
      displayName: 'Mock Google Student',
      avatarUrl: null,
    };
  }

  throw new AppError(
    501,
    'Google Single Sign-On is not configured on this server (missing GOOGLE_CLIENT_ID)',
    'GOOGLE_SSO_NOT_CONFIGURED'
  );
}
