/**
 * SaveRaks Express Application Pipeline
 * 
 * DESIGN PRINCIPLE:
 * - Security-first middleware stack (Helmet, CORS allowlists, Rate Limits).
 * - Centralized JSON parsing and cookie parsing.
 * - Mounts all API routes under /api prefix.
 * - Global error handling middleware.
 * 
 * @module app
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, AppError } from './middlewares/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// 1. Security Headers via Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// 2. Strict CORS Configuration with Protocol-Agnostic Matching (Render host property support)
const rawOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());

export function isAllowedOrigin(origin, allowedOrigins = rawOrigins, nodeEnv = env.NODE_ENV) {
  // Allow requests with no origin (like mobile apps, server-to-server, curl, direct browser GET)
  if (!origin || nodeEnv !== 'production') return true;
  
  // Auto-allow any railway.app subdomain or localhost
  try {
    const parsed = new URL(origin);
    if (parsed.hostname.endsWith('.railway.app') || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true;
    }
  } catch {
    // Ignore malformed origin
  }

  return allowedOrigins.some((allowed) => {
    if (!allowed) return false;
    if (allowed === '*' || allowed === origin) return true;
    if (`https://${allowed}` === origin || `http://${allowed}` === origin) return true;
    try {
      const parsed = new URL(origin);
      if (allowed === parsed.host || allowed === parsed.origin || allowed === parsed.hostname) return true;
    } catch {
      // Ignore malformed origin
    }
    return false;
  });
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin, rawOrigins, env.NODE_ENV)) {
        callback(null, true);
      } else {
        callback(new AppError(403, `CORS origin not permitted: ${origin}`, 'CORS_REJECTED'));
      }
    },
    credentials: true,
  })
);

// 3. Request Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Rate Limiting
if (env.NODE_ENV !== 'test') {
  // Global API limiter: 200 requests per 15 minutes
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests from this IP, please try again later.',
      },
    },
  });
  app.use('/api', globalLimiter);

  // Dedicated limiter for expensive AI vision & image processing: 20 requests per 15 minutes
  const aiScanLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'AI_SCAN_RATE_LIMIT_EXCEEDED',
        message: 'Too many waste scanning requests. Please wait before analyzing another image.',
      },
    },
  });
  app.use('/api/actions/scan-preview', aiScanLimiter);

  // Stricter limiter for authentication endpoints: 10 attempts per 15 minutes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many login or registration attempts. Please wait 15 minutes.',
      },
    },
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/verify-student', authLimiter);
  app.use('/api/auth/google', authLimiter);
}

// 5. Mount API Routes
app.use('/api', apiRouter);

// 6. Serve Frontend Static Assets in Production (if web/dist exists)
const clientDistPath = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // Client-side SPA fallback for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 7. Handle 404 Route Not Found
app.use((req, res, next) => {
  next(new AppError(404, `Endpoint not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
});

// 8. Centralized Error Handler
app.use(errorHandler);
