/**
 * SaveRaks Centralized Error Handling Middleware
 * 
 * DESIGN PRINCIPLE:
 * - Deterministic, uniform error response format across all endpoints.
 * - Protects internal database stack traces from leaking to clients in production.
 * - Translates Zod and Prisma exceptions into actionable HTTP status codes.
 * 
 * @module middlewares/error
 */

import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';

export class AppError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable error message
   * @param {string} [code='APP_ERROR'] - Machine-readable error code
   * @param {any} [details=null] - Optional structured error details
   */
  constructor(statusCode, message, code = 'APP_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Express error handling middleware
 */
export function errorHandler(err, req, res, next) {
  // 1. Operational AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // 2. Zod Schema Validation Error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    const firstMessage = formattedErrors[0]?.message || 'ข้อมูลที่กรอกไม่ถูกต้อง';
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: firstMessage,
        details: formattedErrors,
      },
    });
  }

  // 3. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      const target = err.meta?.target ? ` (${err.meta.target})` : '';
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: `A record with this unique value already exists${target}`,
        },
      });
    }

    // Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested record could not be found',
        },
      });
    }
  }

  // 4. Multer File Upload Errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'Uploaded file exceeds the maximum allowed limit of 5 MB',
      },
    });
  }

  // 5. Unhandled Internal Server Errors
  console.error('💥 Unhandled Exception:', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        env.NODE_ENV === 'production'
          ? 'An unexpected internal server error occurred'
          : err.message,
    },
  });
}
