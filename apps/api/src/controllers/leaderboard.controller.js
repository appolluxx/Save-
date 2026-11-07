/**
 * SaveRaks Leaderboard & School Impact Controller
 * 
 * DESIGN PRINCIPLE:
 * - Real-time student and classroom environmental rankings.
 * - Enforces strict privacy sanitization (no phone numbers, emails, or student IDs).
 * - Supports filtering by grade level, classroom, and monthly periods.
 * 
 * @module controllers/leaderboard
 */

import { prisma } from '../config/prisma.js';

/**
 * Returns privacy-sanitized leaderboard.
 * GET /api/leaderboard
 */
export async function getLeaderboard(req, res, next) {
  try {
    const { gradeLevel, classroom, period } = req.query;

    const where = {
      isActive: true,
      role: 'STUDENT',
    };

    // Filter by student master grade or classroom if requested
    if (gradeLevel || classroom) {
      where.studentMaster = {};
      if (gradeLevel) where.studentMaster.gradeLevel = String(gradeLevel);
      if (classroom) where.studentMaster.classroom = String(classroom);
    }

    const students = await prisma.user.findMany({
      where,
      orderBy: { points: 'desc' },
      take: 50,
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        points: true,
        totalCo2Saved: true,
        studentMaster: {
          select: {
            gradeLevel: true,
            classroom: true,
          },
        },
        badges: {
          take: 3,
          include: {
            badge: {
              select: {
                code: true,
                icon: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Compute school-wide aggregate impact
    const aggregates = await prisma.user.aggregate({
      where: { role: 'STUDENT', isActive: true },
      _sum: {
        points: true,
        totalCo2Saved: true,
      },
      _count: {
        id: true,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        leaderboard: students.map((s, index) => ({
          rank: index + 1,
          id: s.id,
          displayName: s.displayName,
          avatarUrl: s.avatarUrl,
          points: s.points,
          totalCo2Saved: s.totalCo2Saved,
          gradeLevel: s.studentMaster?.gradeLevel || null,
          classroom: s.studentMaster?.classroom || null,
          badges: s.badges.map((b) => ({
            code: b.badge.code,
            icon: b.badge.icon,
            name: b.badge.name,
          })),
        })),
        schoolStats: {
          totalStudents: aggregates._count.id || 0,
          totalPointsEarned: aggregates._sum.points || 0,
          totalCo2SavedKg: Number((aggregates._sum.totalCo2Saved || 0).toFixed(2)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
