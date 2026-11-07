/**
 * SaveRaks Role-Based Access Control (RBAC) Middleware
 * 
 * DESIGN PRINCIPLE:
 * - Enforces minimum role requirements on protected administrative endpoints.
 * - Fails with 403 Forbidden if user does not possess required role.
 * 
 * @module middlewares/rbac
 */

import { AppError } from './error.middleware.js';

/**
 * Restricts route access to specific user roles
 * @param  {...string} allowedRoles - List of permitted roles (e.g. 'STAFF', 'ADMIN')
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required before checking authorization', 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          `Access forbidden: required role is [${allowedRoles.join(' or ')}], but your role is [${req.user.role}]`,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}
