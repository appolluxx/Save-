/**
 * SaveRaks Campus Map & Collection Points Controller
 * 
 * DESIGN PRINCIPLE:
 * - Interactive map of Surasakmontree School collection bins and hazard reports.
 * - Coordinates rounded to 4 decimal places for privacy protection.
 * - Staff can mark reported issues as RESOLVED.
 * 
 * @module controllers/pins
 */

import { mapPinCreateSchema } from '@saveraks/shared/schemas';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/error.middleware.js';

/**
 * Returns campus collection pins and open issue reports.
 * GET /api/pins
 */
export async function listPins(req, res, next) {
  try {
    const pins = await prisma.mapPin.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        description: true,
        latitude: true,
        longitude: true,
        imageUrl: true,
        createdAt: true,
        reporter: {
          select: {
            displayName: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: pins.map((p) => ({
        id: p.id,
        type: p.type,
        status: p.status,
        description: p.description,
        latitude: Number(p.latitude.toFixed(4)),
        longitude: Number(p.longitude.toFixed(4)),
        imageUrl: p.imageUrl,
        reportedBy: p.reporter.displayName,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Creates a campus issue report pin (e.g. FULL_BIN, HAZARD).
 * POST /api/pins
 */
export async function createPin(req, res, next) {
  try {
    const payload = mapPinCreateSchema.parse({
      type: req.body.type,
      description: req.body.description,
      latitude: Number(req.body.latitude),
      longitude: Number(req.body.longitude),
    });

    const pin = await prisma.mapPin.create({
      data: {
        userId: req.user.id,
        type: payload.type,
        description: payload.description,
        latitude: payload.latitude,
        longitude: payload.longitude,
        status: 'OPEN',
      },
      select: {
        id: true,
        type: true,
        description: true,
        latitude: true,
        longitude: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: pin,
      message: 'Campus pin reported successfully. Janitorial and maintenance staff notified.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Staff/Admin resolves a reported pin.
 * PATCH /api/pins/:id/resolve
 */
export async function resolvePin(req, res, next) {
  try {
    const { id } = req.params;

    const pin = await prisma.mapPin.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedBy: req.user.id,
        resolvedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      data: pin,
      message: 'Map pin marked as resolved',
    });
  } catch (error) {
    next(error);
  }
}
