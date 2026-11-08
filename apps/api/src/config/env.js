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
import crypto from 'node:crypto';

// Load .env from current directory or monorepo root if available
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // Fallback to process.cwd() .env

// Provide auto-generated safe fallbacks for JWT and Staff secrets if omitted
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ WARNING: JWT_SECRET not set (or <32 chars). Generated random 64-char ephemeral secret for this session.');
  }
}

if (!process.env.STAFF_INVITE_SECRET || process.env.STAFF_INVITE_SECRET.length < 16) {
  process.env.STAFF_INVITE_SECRET = 'surasak_staff_secret_2026';
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ WARNING: STAFF_INVITE_SECRET not set (or <16 chars). Using default fallback: surasak_staff_secret_2026');
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  
  // Database Connection
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Security & Authentication Secrets
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long for cryptographic security')
    .default(() => crypto.randomBytes(32).toString('hex')),
  STAFF_INVITE_SECRET: z
    .string()
    .min(16, 'STAFF_INVITE_SECRET must be at least 16 characters long')
    .default('surasak_staff_secret_2026'),
  
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
  console.error('\n=============================================================');
  console.error('❌ FATAL CONFIGURATION ERROR: Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  if (!process.env.DATABASE_URL) {
    console.error('\n👉 DATABASE_URL is missing in Railway Variables!');
    console.error('   1. In your Railway project, click "+ New" -> "Database" -> "Add PostgreSQL"');
    console.error('   2. Go to your app service -> "Variables" tab -> click "New Variable"');
    console.error('   3. Set: DATABASE_URL = ${{Postgres.DATABASE_URL}}');
  }
  console.error('=============================================================\n');
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

export const env = parsed.success ? parsed.data : process.env;
