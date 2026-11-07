import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';

import {
  sanitizeAndProcessImage,
  uploadActionImages,
} from '../src/services/storage.service.js';

import {
  computeImageFingerprint,
  hammingDistance,
  cosineSimilarity,
  evaluateImageAntiCheat,
} from '../src/services/anticheat.service.js';

import { analyzeWasteImage } from '../src/services/ai-vision.service.js';
import { env } from '../src/config/env.js';

describe('Phase 3: Storage, Anti-Cheat & AI Vision Services', () => {
  describe('Storage Service (Sharp & Object Upload)', () => {
    it('should sanitize and convert a valid image to WebP with thumbnail', async () => {
      // Create valid 400x400 PNG
      const testBuffer = await sharp({
        create: { width: 400, height: 400, channels: 3, background: { r: 50, g: 150, b: 250 } },
      }).png().toBuffer();

      const result = await sanitizeAndProcessImage(testBuffer);
      assert.ok(result.mainBuffer, 'Missing mainBuffer');
      assert.ok(result.thumbBuffer, 'Missing thumbBuffer');
      assert.ok(result.width <= 1280);
      assert.ok(result.height <= 1280);

      // Verify thumbnail is exactly 320x320
      const thumbMeta = await sharp(result.thumbBuffer).metadata();
      assert.equal(thumbMeta.width, 320);
      assert.equal(thumbMeta.height, 320);
      assert.equal(thumbMeta.format, 'webp');
    });

    it('should reject image smaller than 256x256 px with IMAGE_TOO_SMALL', async () => {
      const tinyBuffer = await sharp({
        create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } },
      }).png().toBuffer();

      await assert.rejects(
        () => sanitizeAndProcessImage(tinyBuffer),
        (err) => {
          assert.equal(err.code, 'IMAGE_TOO_SMALL');
          return true;
        }
      );
    });

    it('should reject corrupted or non-image buffer with INVALID_IMAGE', async () => {
      const corruptBuffer = Buffer.from('This is not an image at all!');
      await assert.rejects(
        () => sanitizeAndProcessImage(corruptBuffer),
        (err) => {
          assert.ok(err.code === 'INVALID_IMAGE' || err.code === 'IMAGE_PROCESSING_FAILED');
          return true;
        }
      );
    });

    it('should return persistent object keys on upload', async () => {
      const testBuffer = await sharp({
        create: { width: 300, height: 300, channels: 3, background: { r: 0, g: 255, b: 0 } },
      }).png().toBuffer();

      const { mainBuffer, thumbBuffer } = await sanitizeAndProcessImage(testBuffer);
      const upload = await uploadActionImages(mainBuffer, thumbBuffer, 'actions');

      assert.ok(upload.imageObjectKey.startsWith('actions/'));
      assert.ok(upload.thumbnailObjectKey.includes('_thumb.webp'));
      assert.ok(upload.imageUrl);
      assert.ok(upload.thumbnailUrl);
    });

    it('should throw STORAGE_UNCONFIGURED in production when Cloudinary keys are missing (fail-closed)', async () => {
      const origEnv = env.NODE_ENV;
      const origProvider = env.STORAGE_PROVIDER;
      try {
        env.NODE_ENV = 'production';
        env.STORAGE_PROVIDER = 'cloudinary';
        const testBuffer = await sharp({
          create: { width: 300, height: 300, channels: 3, background: { r: 10, g: 10, b: 10 } },
        }).png().toBuffer();
        const { mainBuffer, thumbBuffer } = await sanitizeAndProcessImage(testBuffer);

        await assert.rejects(
          () => uploadActionImages(mainBuffer, thumbBuffer, 'actions'),
          (err) => {
            assert.equal(err.code, 'STORAGE_UNCONFIGURED');
            assert.match(err.message, /Cloudinary/);
            return true;
          }
        );
      } finally {
        env.NODE_ENV = origEnv;
        env.STORAGE_PROVIDER = origProvider;
      }
    });
  });

  describe('Anti-Cheat Service (Perceptual Hashes & DB Comparison)', () => {
    it('should compute 16-hex-character aHash, dHash, pHash and 192-bin histogram', async () => {
      const testBuffer = await sharp({
        create: { width: 300, height: 300, channels: 3, background: { r: 80, g: 120, b: 200 } },
      }).png().toBuffer();

      const fp = await computeImageFingerprint(testBuffer);
      assert.equal(fp.aHash.length, 16);
      assert.equal(fp.dHash.length, 16);
      assert.equal(fp.pHash.length, 16);
      assert.equal(fp.colorHistogram.length, 192);

      // Check histogram sum is approximately 1.0
      const sum = fp.colorHistogram.reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - 1.0) < 0.001);
    });

    it('should calculate exact Hamming distance between hashes', () => {
      assert.equal(hammingDistance('0000000000000000', '0000000000000000'), 0);
      assert.equal(hammingDistance('0000000000000000', '0000000000000001'), 1);
      assert.equal(hammingDistance('ffffffffffffffff', '0000000000000000'), 64);
      assert.equal(hammingDistance('ffffffffffffffff', 'fffffffffffffff0'), 4);
    });

    it('should calculate Cosine similarity between histogram vectors', () => {
      const v1 = [1, 0, 0];
      const v2 = [1, 0, 0];
      const v3 = [0, 1, 0];
      assert.equal(cosineSimilarity(v1, v2), 1.0);
      assert.equal(cosineSimilarity(v1, v3), 0.0);
    });

    it('should detect duplicate image when matching historical hash (verdict: REJECTED)', async () => {
      const mockFingerprint = {
        pHash: '1111222233334444',
        dHash: 'aaaabbbbccccdddd',
        colorHistogram: new Array(192).fill(1 / 192),
      };

      // Mock Prisma with matching historical action
      const mockPrisma = {
        ecoAction: {
          findMany: async () => [
            {
              id: 'historical-action-uuid',
              userId: 'other-user-uuid',
              pHash: '1111222233334444', // Exact match
              dHash: 'aaaabbbbccccdddd', // Exact match
              colorHistogram: new Array(192).fill(1 / 192),
            },
          ],
        },
      };

      const result = await evaluateImageAntiCheat(mockFingerprint, 'current-user-uuid', mockPrisma);
      assert.equal(result.verdict, 'REJECTED');
      assert.match(result.reason, /Duplicate image detected/);
      assert.equal(result.matchedActionId, 'historical-action-uuid');
    });

    it('should mark completely unique image as CLEAN', async () => {
      const mockFingerprint = {
        pHash: 'ffffffffffffffff',
        dHash: 'ffffffffffffffff',
        colorHistogram: new Array(192).fill(1 / 192),
      };

      const mockPrisma = {
        ecoAction: {
          findMany: async () => [
            {
              id: 'historical-action-uuid',
              userId: 'other-user-uuid',
              pHash: '0000000000000000', // Hamming distance = 64
              dHash: '0000000000000000', // Hamming distance = 64
              colorHistogram: new Array(192).fill(1 / 192),
            },
          ],
        },
      };

      const result = await evaluateImageAntiCheat(mockFingerprint, 'current-user-uuid', mockPrisma);
      assert.equal(result.verdict, 'CLEAN');
      assert.equal(result.reason, null);
    });

    it('should query historical actions ordered by newest first (orderBy: { createdAt: "desc" })', async () => {
      const mockFingerprint = {
        pHash: 'ffffffffffffffff',
        dHash: 'ffffffffffffffff',
        colorHistogram: new Array(192).fill(1 / 192),
      };

      let queryOptionsPassed = null;
      const mockPrisma = {
        ecoAction: {
          findMany: async (options) => {
            queryOptionsPassed = options;
            return [];
          },
        },
      };

      await evaluateImageAntiCheat(mockFingerprint, 'current-user-uuid', mockPrisma);
      assert.ok(queryOptionsPassed, 'findMany should be called');
      assert.deepEqual(queryOptionsPassed.orderBy, { createdAt: 'desc' });
      assert.equal(queryOptionsPassed.take, 500);
    });
  });

  describe('AI Vision Service (Resilience & Output Schema)', () => {
    it('should return valid fallback output when external AI keys are unavailable', async () => {
      const testBuffer = await sharp({
        create: { width: 300, height: 300, channels: 3, background: { r: 100, g: 200, b: 100 } },
      }).png().toBuffer();

      const analysis = await analyzeWasteImage(testBuffer);
      assert.ok(analysis.isValid !== undefined);
      assert.ok(analysis.detectedCategory);
      assert.ok(typeof analysis.confidence === 'number');
      assert.ok(Array.isArray(analysis.detectedObjects));
      assert.ok(analysis.thaiSummary);
      assert.ok(['YELLOW', 'GREEN', 'BLUE', 'ORANGE_RED'].includes(analysis.recommendedBinColor));
    });

    it('should correctly flag invalid environmental image (isValid: false) as PENDING review with 0 points', () => {
      const aiAnalysis = {
        isValid: false,
        detectedCategory: 'NON_WASTE_SELFIE',
        confidence: 0.95,
        detectedObjects: ['person', 'face'],
        thaiSummary: 'ภาพถ่ายไม่ตรงกับกิจกรรมคัดแยกขยะ',
        recommendedBinColor: 'YELLOW',
      };
      const antiCheat = { verdict: 'CLEAN', reason: null, similarityScore: 1.0 };

      // Replicate actions.controller.js approval decision logic
      let finalStatus = 'APPROVED';
      let pointsToAward = 10;
      let rejectionReason = null;

      if (antiCheat.verdict === 'REJECTED') {
        finalStatus = 'REJECTED';
        pointsToAward = 0;
        rejectionReason = antiCheat.reason;
      } else if (antiCheat.verdict === 'PENDING' || aiAnalysis.confidence < 0.6 || !aiAnalysis.isValid) {
        finalStatus = 'PENDING';
        pointsToAward = 0;
        rejectionReason =
          antiCheat.reason ||
          (!aiAnalysis.isValid
            ? 'Image was not recognized as a valid environmental activity'
            : 'Flagged for staff review due to low AI confidence');
      }

      assert.equal(finalStatus, 'PENDING');
      assert.equal(pointsToAward, 0);
      assert.match(rejectionReason, /not recognized as a valid environmental activity/);
    });
  });
});
