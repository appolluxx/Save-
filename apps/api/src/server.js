/**
 * SaveRaks HTTP Server Bootstrap
 * 
 * DESIGN PRINCIPLE:
 * - Boots HTTP listener on env.PORT.
 * - Handles graceful shutdown on SIGINT and SIGTERM.
 * - Closes Prisma database connection pool cleanly.
 * 
 * @module server
 */

import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { autoSeedIfEmpty } from './services/seed.service.js';

const server = app.listen(env.PORT, async () => {
  console.log(`🚀 SaveRaks API server running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
  console.log(`🔗 Health check available at: http://localhost:${env.PORT}/api/health`);
  // Automatically seed master roster, badges, and rewards if fresh database
  await autoSeedIfEmpty();
});

// Graceful Shutdown Protocol
async function shutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('🔒 HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('📦 Database pool disconnected.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during database disconnect:', err);
      process.exit(1);
    }
  });

  // Force close after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('⚠️ Forcing process exit after shutdown timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
