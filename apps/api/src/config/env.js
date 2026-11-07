/**
 * SaveRaks Fail-Fast Environment Configuration
 * 
 * DESIGN PRINCIPLE:
 * - Validates all environment variables on application bootstrap using Zod.
 * - Prevents startup if critical secrets (JWT_SECRET, DATABASE_URL) are missing or weak.
 * - Zero fallback secrets permitted in production.
 * 
 * @module config/env
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env from current directory or monorepo root if available
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // Fallback to process.cwd() .env

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  
  // Database Connection
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Security & Authentication Secrets
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long for cryptographic security')
    .default(
      process.env.NODE_ENV === 'production'
        ? ''
        : 'dev_test_jwt_secret_at_least_32_characters_long_for_safety_only'
    ),
  STAFF_INVITE_SECRET: z
    .string()
    .min(16, 'STAFF_INVITE_SECRET must be at least 16 characters long')
    .default(
      process.env.NODE_ENV === 'production'
        ? ''
        : 'dev_test_staff_invite_secret_16chars'
    ),
  
  // CORS Security
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:4000'),
  
  // Storage Provider
  STORAGE_PROVIDER: z.enum(['cloudinary', 's3', 'mock']).default('mock'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  
  // AI Vision Keys (Optional in dev/test, handled by graceful fallback)
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ FATAL CONFIGURATION ERROR: Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

export const env = parsed.success ? parsed.data : process.env;
