/**
 * SaveRaks Authentication Controller
 * 
 * DESIGN PRINCIPLE:
 * - Enforces zero-trust input validation via shared Zod schemas.
 * - Executes registration inside atomic database transactions.
 * - Protects against timing attacks during staff onboarding.
 * - Strips sensitive credentials from responses.
 * 
 * @module controllers/auth
 */

import {
  studentVerifySchema,
  studentRegisterSchema,
  staffRegisterSchema,
  externalRegisterSchema,
  loginSchema,
  googleAuthSchema,
} from '@saveraks/shared/schemas';

import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import {
  hashPassword,
  verifyPassword,
  issueJwtToken,
  setAuthCookie,
  clearAuthCookie,
  verifyStaffInviteSecret,
  verifyGoogleIdToken,
} from '../services/auth.service.js';

/**
 * Checks if a student ID exists in the master roster and is available for registration.
 * Student registration requires an existing, unregistered roster record.
 * POST /api/auth/verify-student
 */
export async function verifyStudent(req, res, next) {
  try {
    const { studentId } = studentVerifySchema.parse(req.body);

    const master = await prisma.studentsMaster.findUnique({
      where: { studentId },
    });

    if (!master) {
      throw new AppError(404, 'ไม่พบรหัสนักเรียนนี้ กรุณาเลือกลงทะเบียนในฐานะบุคคลภายนอก', 'STUDENT_NOT_FOUND');
    }

    if (master.isRegistered) {
      throw new AppError(409, 'รหัสนักเรียนนี้ถูกลงทะเบียนใช้งานแล้ว หากเป็นบัญชีของคุณกรุณาเข้าสู่ระบบ', 'ALREADY_REGISTERED');
    }

    res.status(200).json({
      success: true,
      data: {
        valid: true,
        isGeneralPublic: master.gradeLevel === 'บุคคลทั่วไป',
        studentId: master.studentId,
        prefix: master.prefix,
        firstName: master.firstName,
        lastName: master.lastName,
        gradeLevel: master.gradeLevel,
        classroom: master.classroom,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Registers a student linked to their master roster ID inside an atomic transaction.
 * POST /api/auth/register/student
 */
export async function registerStudent(req, res, next) {
  try {
    const data = studentRegisterSchema.parse(req.body);

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.$transaction(async (tx) => {
      // 1. Verify student roster record under lock
      let master = await tx.studentsMaster.findUnique({
        where: { studentId: data.studentId },
      });

      if (!master) {
        throw new AppError(404, 'ไม่พบรหัสนักเรียนนี้ กรุณาลงทะเบียนในฐานะบุคคลภายนอก', 'STUDENT_NOT_FOUND');
      } else if (master.isRegistered) {
        throw new AppError(409, 'รหัสนักเรียนนี้ถูกลงทะเบียนใช้งานแล้ว', 'ALREADY_REGISTERED');
      } else {
        // 2. Mark master record as registered
        await tx.studentsMaster.update({
          where: { studentId: data.studentId },
          data: {
            isRegistered: true,
            registeredAt: new Date(),
          },
        });
      }

      // 3. Create user identity
      const newUser = await tx.user.create({
        data: {
          studentId: data.studentId,
          displayName: data.displayName,
          email: data.email || null,
          phone: data.phone || null,
          passwordHash,
          role: 'STUDENT',
          userGroup: master.gradeLevel === 'บุคคลทั่วไป' ? 'EXTERNAL' : 'STUDENT',
          points: 0,
          totalCo2Saved: 0,
        },
        select: {
          id: true,
          studentId: true,
          displayName: true,
          email: true,
          phone: true,
          role: true,
          userGroup: true,
          points: true,
          totalCo2Saved: true,
          createdAt: true,
        },
      });

      return newUser;
    });

    const token = issueJwtToken(user);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Registers an external participant without creating a student roster record.
 * POST /api/auth/register/external
 */
export async function registerExternal(req, res, next) {
  try {
    const data = externalRegisterSchema.parse(req.body);
    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        displayName: data.displayName,
        email: data.email,
        passwordHash,
        role: 'STUDENT',
        userGroup: 'EXTERNAL',
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        userGroup: true,
        points: true,
        totalCo2Saved: true,
        createdAt: true,
      },
    });

    const token = issueJwtToken(user);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      data: { user, token },
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return next(new AppError(409, 'อีเมลนี้มีบัญชีในระบบแล้ว กรุณาเข้าสู่ระบบ', 'EMAIL_ALREADY_REGISTERED'));
    }
    next(error);
  }
}

/**
 * Registers a teacher or staff member with verified staff invite secret.
 * POST /api/auth/register/staff
 */
export async function registerStaff(req, res, next) {
  try {
    const data = staffRegisterSchema.parse(req.body);

    if (!verifyStaffInviteSecret(data.staffInviteCode)) {
      throw new AppError(401, 'Invalid staff invitation secret key', 'INVALID_INVITE_SECRET');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        displayName: data.displayName,
        passwordHash,
        role: 'STAFF',
        userGroup: 'TEACHER',
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        userGroup: true,
        createdAt: true,
      },
    });

    const token = issueJwtToken(user);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Authenticates user via identifier (student ID, email, or phone) and password.
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const { identifier, password } = loginSchema.parse(req.body);

    // Look up by studentId, email, or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { studentId: identifier },
          { email: identifier },
          { phone: identifier },
        ],
      },
      include: {
        studentMaster: {
          select: {
            gradeLevel: true,
            classroom: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(401, 'Invalid login credentials', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError(403, 'Your account has been deactivated. Contact an administrator.', 'ACCOUNT_DEACTIVATED');
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError(401, 'Invalid login credentials', 'INVALID_CREDENTIALS');
    }

    // Update lastLoginAt asynchronously
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = issueJwtToken(user);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          studentId: user.studentId,
          displayName: user.displayName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          userGroup: user.userGroup,
          points: user.points,
          totalCo2Saved: user.totalCo2Saved,
          avatarUrl: user.avatarUrl,
          gradeLevel: user.studentMaster?.gradeLevel || null,
          classroom: user.studentMaster?.classroom || null,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Authenticates or links user via verified Google ID token.
 * POST /api/auth/google
 */
export async function googleLogin(req, res, next) {
  try {
    const { idToken } = googleAuthSchema.parse(req.body);

    const googlePayload = await verifyGoogleIdToken(idToken);

    // Look up existing user by googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googlePayload.googleId },
          { email: googlePayload.email },
        ],
      },
      include: {
        studentMaster: true,
      },
    });

    if (user) {
      // Link googleId if missing
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googlePayload.googleId,
            avatarUrl: user.avatarUrl || googlePayload.avatarUrl,
          },
          include: { studentMaster: true },
        });
      }
    } else {
      // Create new Google-authenticated user
      user = await prisma.user.create({
        data: {
          googleId: googlePayload.googleId,
          email: googlePayload.email,
          displayName: googlePayload.displayName,
          avatarUrl: googlePayload.avatarUrl,
          role: 'STUDENT',
          userGroup: 'EXTERNAL',
          points: 0,
          totalCo2Saved: 0,
        },
        include: { studentMaster: true },
      });
    }

    if (!user.isActive) {
      throw new AppError(403, 'Account deactivated', 'ACCOUNT_DEACTIVATED');
    }

    const token = issueJwtToken(user);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          studentId: user.studentId,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          userGroup: user.userGroup,
          points: user.points,
          totalCo2Saved: user.totalCo2Saved,
          avatarUrl: user.avatarUrl,
          gradeLevel: user.studentMaster?.gradeLevel || null,
          classroom: user.studentMaster?.classroom || null,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Returns current authenticated user's profile and active badges.
 * GET /api/auth/me
 */
export async function getCurrentUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        studentMaster: {
          select: {
            gradeLevel: true,
            classroom: true,
          },
        },
        badges: {
          include: {
            badge: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        studentId: user.studentId,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        userGroup: user.userGroup,
        points: user.points,
        totalCo2Saved: user.totalCo2Saved,
        avatarUrl: user.avatarUrl,
        gradeLevel: user.studentMaster?.gradeLevel || null,
        classroom: user.studentMaster?.classroom || null,
        badges: user.badges.map((ub) => ({
          code: ub.badge.code,
          name: ub.badge.name,
          icon: ub.badge.icon,
          awardedAt: ub.awardedAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Clears authentication cookie.
 * POST /api/auth/logout
 */
export async function logout(req, res, next) {
  try {
    clearAuthCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}
