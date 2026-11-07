/**
 * SaveRaks Image Sanitization & Object Storage Service
 * 
 * DESIGN PRINCIPLE:
 * - Sanitizes all user-uploaded images via Sharp (removes EXIF, re-encodes to WebP).
 * - Enforces minimum and maximum image resolution boundaries.
 * - Streams buffers directly to cloud object storage (never stored on ephemeral local disk).
 * - Generates fast WebP square thumbnails for mobile feed rendering.
 * 
 * @module services/storage
 */

import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { SECURITY_LIMITS } from '@saveraks/shared/constants';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/error.middleware.js';

/**
 * Validates, re-orients, strips EXIF, and converts an image buffer to WebP.
 * @param {Buffer} buffer - Raw file buffer from Multer
 * @returns {Promise<{ mainBuffer: Buffer, thumbBuffer: Buffer, width: number, height: number }>}
 */
export async function sanitizeAndProcessImage(buffer) {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new AppError(400, 'Invalid or corrupted image file', 'INVALID_IMAGE');
    }

    if (
      metadata.width < SECURITY_LIMITS.MIN_IMAGE_DIMENSION_PX ||
      metadata.height < SECURITY_LIMITS.MIN_IMAGE_DIMENSION_PX
    ) {
      throw new AppError(
        400,
        `Image resolution too low (${metadata.width}x${metadata.height}). Minimum required is ${SECURITY_LIMITS.MIN_IMAGE_DIMENSION_PX}x${SECURITY_LIMITS.MIN_IMAGE_DIMENSION_PX} px`,
        'IMAGE_TOO_SMALL'
      );
    }

    if (
      metadata.width > SECURITY_LIMITS.MAX_IMAGE_DIMENSION_PX ||
      metadata.height > SECURITY_LIMITS.MAX_IMAGE_DIMENSION_PX
    ) {
      throw new AppError(
        400,
        `Image resolution exceeds maximum allowable limits (${metadata.width}x${metadata.height}). Maximum is ${SECURITY_LIMITS.MAX_IMAGE_DIMENSION_PX}x${SECURITY_LIMITS.MAX_IMAGE_DIMENSION_PX} px`,
        'IMAGE_TOO_LARGE'
      );
    }

    // Process main WebP image (max 1280px, EXIF stripped via re-encoding)
    const mainBuffer = await sharp(buffer)
      .rotate()
      .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    // Process thumbnail WebP image (320x320 square, cover fit)
    const thumbBuffer = await sharp(buffer)
      .rotate()
      .resize(320, 320, { fit: 'cover' })
      .webp({ quality: 75, effort: 4 })
      .toBuffer();

    const mainMeta = await sharp(mainBuffer).metadata();

    return {
      mainBuffer,
      thumbBuffer,
      width: mainMeta.width || metadata.width,
      height: mainMeta.height || metadata.height,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(400, `Failed to process image: ${err.message}`, 'IMAGE_PROCESSING_FAILED');
  }
}

/**
 * Uploads processed main and thumbnail WebP buffers to persistent object storage.
 * @param {Buffer} mainBuffer
 * @param {Buffer} thumbBuffer
 * @param {string} [folder='actions']
 * @returns {Promise<{ imageObjectKey: string, thumbnailObjectKey: string, imageUrl: string, thumbnailUrl: string }>}
 */
export async function uploadActionImages(mainBuffer, thumbBuffer, folder = 'actions') {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const fileId = randomUUID();
  const imageObjectKey = `${folder}/${yearMonth}/${fileId}.webp`;
  const thumbnailObjectKey = `${folder}/${yearMonth}/${fileId}_thumb.webp`;

  // 1. Cloudinary Storage Provider
  if (env.STORAGE_PROVIDER === 'cloudinary') {
    if (
      !env.CLOUDINARY_CLOUD_NAME ||
      !env.CLOUDINARY_API_KEY ||
      !env.CLOUDINARY_API_SECRET
    ) {
      if (env.NODE_ENV === 'production') {
        throw new AppError(
          503,
          'Cloud object storage (Cloudinary) credentials are missing in production. Ephemeral base64 fallback is disabled in production.',
          'STORAGE_UNCONFIGURED'
        );
      }
    } else {
      try {
        const { v2: cloudinary } = await import('cloudinary');
        cloudinary.config({
          cloud_name: env.CLOUDINARY_CLOUD_NAME,
          api_key: env.CLOUDINARY_API_KEY,
          api_secret: env.CLOUDINARY_API_SECRET,
          secure: true,
        });

        const uploadStream = (buffer, publicId) =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                public_id: publicId,
                resource_type: 'image',
                format: 'webp',
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            stream.end(buffer);
          });

        const [mainResult, thumbResult] = await Promise.all([
          uploadStream(mainBuffer, `${folder}/${yearMonth}/${fileId}`),
          uploadStream(thumbBuffer, `${folder}/${yearMonth}/${fileId}_thumb`),
        ]);

        return {
          imageObjectKey,
          thumbnailObjectKey,
          imageUrl: mainResult.secure_url,
          thumbnailUrl: thumbResult.secure_url,
        };
      } catch (uploadErr) {
        if (env.NODE_ENV === 'production') {
          throw new AppError(
            503,
            `Cloud object storage upload failed in production: ${uploadErr.message}`,
            'STORAGE_UPLOAD_FAILED'
          );
        }
        console.warn('⚠️ Cloudinary upload failed in non-production, falling back to mock Data URI:', uploadErr.message);
      }
    }
  }

  // Fail-closed guard: in production, disallow silent fallback to base64 Data URIs
  if (env.NODE_ENV === 'production' && env.STORAGE_PROVIDER !== 'mock') {
    throw new AppError(
      503,
      `Persistent cloud storage provider [${env.STORAGE_PROVIDER}] is not available in production.`,
      'STORAGE_UNAVAILABLE'
    );
  }

  // 2. Default Persistent Fallback (Base64 Data URI / Mock Provider for Test & Dev)
  // Ensures application runs deterministically even without live Cloudinary credentials
  const imageUrl = `data:image/webp;base64,${mainBuffer.toString('base64')}`;
  const thumbnailUrl = `data:image/webp;base64,${thumbBuffer.toString('base64')}`;

  return {
    imageObjectKey,
    thumbnailObjectKey,
    imageUrl,
    thumbnailUrl,
  };
}
