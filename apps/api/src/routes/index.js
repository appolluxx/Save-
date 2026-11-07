/**
 * SaveRaks API Route Index & Router Assembly
 * 
 * DESIGN PRINCIPLE:
 * - Mounts modular routers with clear URL paths.
 * - Enforces authentication and RBAC boundaries at the router level.
 * 
 * @module routes/index
 */

import { Router } from 'express';
import { prisma } from '../config/prisma.js';

// Middlewares
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { uploadActionImage } from '../middlewares/upload.middleware.js';

// Controllers
import * as authController from '../controllers/auth.controller.js';
import * as actionsController from '../controllers/actions.controller.js';
import * as marketplaceController from '../controllers/marketplace.controller.js';
import * as leaderboardController from '../controllers/leaderboard.controller.js';
import * as pinsController from '../controllers/pins.controller.js';
import * as adminController from '../controllers/admin.controller.js';

export const apiRouter = Router();

// ---------------------------------------------------------------------------
// 1. Health & Readiness Probe
// ---------------------------------------------------------------------------
apiRouter.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Authentication Routes (/api/auth)
// ---------------------------------------------------------------------------
const authRouter = Router();
authRouter.post('/verify-student', authController.verifyStudent);
authRouter.post('/register/student', authController.registerStudent);
authRouter.post('/register/staff', authController.registerStaff);
authRouter.post('/login', authController.login);
authRouter.post('/google', authController.googleLogin);
authRouter.get('/me', authenticate, authController.getCurrentUser);
authRouter.post('/logout', authController.logout);
apiRouter.use('/auth', authRouter);

// ---------------------------------------------------------------------------
// 3. Environmental Actions Routes (/api/actions)
// ---------------------------------------------------------------------------
const actionsRouter = Router();
actionsRouter.post('/', authenticate, uploadActionImage, actionsController.submitAction);
actionsRouter.get('/', actionsController.getFeed);
actionsRouter.get('/me', authenticate, actionsController.getMyActions);
actionsRouter.post('/scan-preview', uploadActionImage, actionsController.scanWastePreview);
apiRouter.use('/actions', actionsRouter);

// ---------------------------------------------------------------------------
// 4. Marketplace Routes (/api/marketplace)
// ---------------------------------------------------------------------------
const marketplaceRouter = Router();
marketplaceRouter.get('/items', marketplaceController.listItems);
marketplaceRouter.post('/purchase', authenticate, marketplaceController.purchaseItem);
marketplaceRouter.get('/redemptions', authenticate, marketplaceController.getMyRedemptions);
marketplaceRouter.patch(
  '/redemptions/:code/claim',
  authenticate,
  requireRoles('STAFF', 'ADMIN'),
  marketplaceController.claimVoucher
);
apiRouter.use('/marketplace', marketplaceRouter);

// ---------------------------------------------------------------------------
// 5. Leaderboard Routes (/api/leaderboard)
// ---------------------------------------------------------------------------
const leaderboardRouter = Router();
leaderboardRouter.get('/', leaderboardController.getLeaderboard);
apiRouter.use('/leaderboard', leaderboardRouter);

// ---------------------------------------------------------------------------
// 6. Campus Map Pins Routes (/api/pins)
// ---------------------------------------------------------------------------
const pinsRouter = Router();
pinsRouter.get('/', pinsController.listPins);
pinsRouter.post('/', authenticate, pinsController.createPin);
pinsRouter.patch('/:id/resolve', authenticate, requireRoles('STAFF', 'ADMIN'), pinsController.resolvePin);
apiRouter.use('/pins', pinsRouter);

// ---------------------------------------------------------------------------
// 7. Administrative & Review Routes (/api/admin)
// ---------------------------------------------------------------------------
const adminRouter = Router();
adminRouter.use(authenticate, requireRoles('STAFF', 'ADMIN'));

adminRouter.get('/evidence', adminController.getEvidenceQueue);
adminRouter.patch('/evidence/:id', adminController.reviewEvidence);
adminRouter.get('/users', adminController.listUsers);
adminRouter.patch('/users/:id/status', requireRoles('ADMIN'), adminController.updateUserStatus);
adminRouter.post('/adjust-points', requireRoles('ADMIN'), adminController.adjustUserPoints);
adminRouter.get('/reports', adminController.getReports);

apiRouter.use('/admin', adminRouter);
