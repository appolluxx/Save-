/**
 * SaveRaks Authentication & Token Verification Middleware
 * 
 * DESIGN PRINCIPLE:
 * - Supports HTTP-Only secure cookies and Bearer authorization headers.
 * - Enforces active account status check on every authenticated request.
 * - Attaches authenticated user payload to req.user.
 * 
 * @module middlewares/auth
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from './error.middleware.js';

export async function authenticate(req, res, next) {
  try {
    let token = null;

    // 1. Check HTTP-Only Cookie
    if (req.cookies && req.cookies.saveraks_token) {
      token = req.cookies.saveraks_token;
    }
    // 2. Check Authorization Header (Bearer)
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError(401, 'Authentication token required', 'UNAUTHORIZED');
    }

    // 3. Verify JWT Signature and Expiration
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        throw new AppError(401, 'Authentication session has expired. Please log in again.', 'TOKEN_EXPIRED');
      }
      throw new AppError(401, 'Invalid authentication token', 'INVALID_TOKEN');
    }

    // 4. Verify User Still Exists and Is Active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        studentId: true,
        email: true,
        phone: true,
        role: true,
        displayName: true,
        avatarUrl: true,
        points: true,
        totalCo2Saved: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError(401, 'User account no longer exists', 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError(403, 'User account has been suspended or deactivated', 'ACCOUNT_DEACTIVATED');
    }

    // 5. Attach User to Request Context
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
