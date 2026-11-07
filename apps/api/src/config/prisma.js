/**
 * SaveRaks Prisma Client Singleton
 * 
 * DESIGN PRINCIPLE:
 * - Shared database client connection pool across all services.
 * - Prevents multiple instances during development reloads.
 * 
 * @module config/prisma
 */

import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
