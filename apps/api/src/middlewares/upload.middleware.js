/**
 * SaveRaks Safe File Upload Middleware
 * 
 * DESIGN PRINCIPLE:
 * - Uses in-memory storage (memoryStorage) so files never touch ephemeral disk.
 * - Enforces strict 5 MB file size boundary.
 * - Enforces MIME type whitelisting (JPEG, PNG, WebP).
 * 
 * @module middlewares/upload
 */

import multer from 'multer';
import { SECURITY_LIMITS } from '@saveraks/shared/constants';
import { AppError } from './error.middleware.js';

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (SECURITY_LIMITS.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        400,
        `Invalid file type (${file.mimetype}). Allowed types: ${SECURITY_LIMITS.ALLOWED_MIME_TYPES.join(', ')}`,
        'INVALID_FILE_TYPE'
      ),
      false
    );
  }
}

export const uploadActionImage = multer({
  storage,
  limits: {
    fileSize: SECURITY_LIMITS.MAX_FILE_SIZE_BYTES, // 5 MB
    files: 1, // Single image per action
  },
  fileFilter,
}).single('image');
