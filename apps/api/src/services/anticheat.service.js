/**
 * SaveRaks Database-Backed Anti-Cheat & Duplicate Image Detection Service
 * 
 * DESIGN PRINCIPLE:
 * - Computes 64-bit aHash, dHash, pHash and normalized 192-bin RGB Color Histogram.
 * - Queries historical database records (no hardcoded constants or simulated checks).
 * - Enforces submission cooldowns (60s) and hourly limits (10/hr).
 * - Flags near-duplicates as PENDING for teacher review, rejects exact duplicates.
 * 
 * @module services/anticheat
 */

import sharp from 'sharp';
import { SECURITY_LIMITS } from '@saveraks/shared/constants';
import { AppError } from '../middlewares/error.middleware.js';

// Pre-computed DCT-II cosine matrix for 32x32 -> 8x8 DCT
const DCT_N = 32;
const DCT_COEFFS = new Float64Array(8 * DCT_N);
for (let k = 0; k < 8; k++) {
  for (let n = 0; n < DCT_N; n++) {
    DCT_COEFFS[k * DCT_N + n] = Math.cos((Math.PI / DCT_N) * (n + 0.5) * k);
  }
}

/**
 * Computes 64-bit aHash, dHash, pHash (16 hex chars) and 192-bin color histogram.
 * @param {Buffer} buffer - Cleaned image buffer
 * @returns {Promise<{ aHash: string, dHash: string, pHash: string, colorHistogram: number[] }>}
 */
export async function computeImageFingerprint(buffer) {
  // 1. Average Hash (aHash) - 8x8 Grayscale
  const { data: aData } = await sharp(buffer)
    .grayscale()
    .resize(8, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const aAvg = aData.reduce((sum, v) => sum + v, 0) / 64;
  let aBits = '';
  for (let i = 0; i < 64; i++) {
    aBits += aData[i] >= aAvg ? '1' : '0';
  }
  const aHash = BigInt('0b' + aBits).toString(16).padStart(16, '0');

  // 2. Difference Hash (dHash) - 9x8 Grayscale
  const { data: dData } = await sharp(buffer)
    .grayscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let dBits = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = dData[row * 9 + col];
      const right = dData[row * 9 + col + 1];
      dBits += left > right ? '1' : '0';
    }
  }
  const dHash = BigInt('0b' + dBits).toString(16).padStart(16, '0');

  // 3. Perceptual Hash (pHash) - 32x32 DCT -> top-left 8x8
  const { data: pData } = await sharp(buffer)
    .grayscale()
    .resize(32, 32, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rowDct = new Float64Array(DCT_N * 8);
  for (let row = 0; row < DCT_N; row++) {
    for (let k = 0; k < 8; k++) {
      let sum = 0;
      for (let n = 0; n < DCT_N; n++) {
        sum += pData[row * DCT_N + n] * DCT_COEFFS[k * DCT_N + n];
      }
      rowDct[row * 8 + k] = sum;
    }
  }

  const dct = new Float64Array(64);
  for (let u = 0; u < 8; u++) {
    for (let v = 0; v < 8; v++) {
      let sum = 0;
      for (let row = 0; row < DCT_N; row++) {
        sum += rowDct[row * 8 + v] * DCT_COEFFS[u * DCT_N + row];
      }
      dct[u * 8 + v] = sum;
    }
  }

  // Median of AC coefficients (excluding DC component at index 0)
  const acValues = Array.from(dct.slice(1)).sort((a, b) => a - b);
  const median = acValues[Math.floor(acValues.length / 2)];

  let pBits = '';
  for (let i = 0; i < 64; i++) {
    pBits += dct[i] > median ? '1' : '0';
  }
  const pHash = BigInt('0b' + pBits).toString(16).padStart(16, '0');

  // 4. Normalized 192-bin Color Histogram (64R + 64G + 64B)
  const { data: cData, info: cInfo } = await sharp(buffer)
    .resize(64, 64, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const histogram = new Float64Array(192);
  for (let i = 0; i < cData.length; i += cInfo.channels) {
    const r = cData[i];
    const g = cData[i + 1];
    const b = cData[i + 2];
    histogram[Math.min(63, Math.floor(r / 4))]++;
    histogram[64 + Math.min(63, Math.floor(g / 4))]++;
    histogram[128 + Math.min(63, Math.floor(b / 4))]++;
  }

  const sum = histogram.reduce((acc, val) => acc + val, 0);
  const normalizedHistogram = Array.from(histogram).map((val) => (sum > 0 ? val / sum : 0));

  return { aHash, dHash, pHash, colorHistogram: normalizedHistogram };
}

/**
 * Calculates bitwise Hamming distance between two 16-hex strings (0 to 64).
 */
export function hammingDistance(hex1, hex2) {
  if (!hex1 || !hex2 || hex1.length !== 16 || hex2.length !== 16) return 64;
  const xor = BigInt('0x' + hex1) ^ BigInt('0x' + hex2);
  const binary = xor.toString(2);
  let distance = 0;
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === '1') distance++;
  }
  return distance;
}

/**
 * Calculates Cosine similarity between two float arrays (0.0 to 1.0).
 */
export function cosineSimilarity(arr1, arr2) {
  if (!arr1 || !arr2 || arr1.length !== arr2.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < arr1.length; i++) {
    dotProduct += arr1[i] * arr2[i];
    normA += arr1[i] * arr1[i];
    normB += arr2[i] * arr2[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Compares fingerprint against database history and returns anti-cheat verdict.
 * @param {{ pHash: string, dHash: string, colorHistogram: number[] }} fingerprint
 * @param {string} userId - Current user ID
 * @param {any} prismaClient - Prisma database client
 * @returns {Promise<{ verdict: 'CLEAN' | 'PENDING' | 'REJECTED', reason: string | null, similarityScore: number, matchedActionId: string | null }>}
 */
export async function evaluateImageAntiCheat(fingerprint, userId, prismaClient) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Query historical actions from last 90 days across all users, OR all time for this user (ordered by newest first)
  const historicalActions = await prismaClient.ecoAction.findMany({
    where: {
      OR: [
        { createdAt: { gte: ninetyDaysAgo } },
        { userId: userId },
      ],
      status: { in: ['APPROVED', 'PENDING'] },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      pHash: true,
      dHash: true,
      colorHistogram: true,
    },
    take: 500, // Safe bounding limit
  });

  let minHamming = 64;
  let maxCosine = 0;
  let matchedActionId = null;

  for (const prev of historicalActions) {
    const dDist = hammingDistance(fingerprint.dHash, prev.dHash);
    const pDist = hammingDistance(fingerprint.pHash, prev.pHash);
    const combinedDist = Math.min(dDist, pDist);

    let cosine = 0;
    if (prev.colorHistogram && prev.colorHistogram.length === 192) {
      cosine = cosineSimilarity(fingerprint.colorHistogram, prev.colorHistogram);
    }

    if (combinedDist < minHamming) {
      minHamming = combinedDist;
      matchedActionId = prev.id;
    }
    if (cosine > maxCosine) {
      maxCosine = cosine;
    }

    // Exact or near-exact duplicate detected (threshold <= 5 bits)
    if (combinedDist <= SECURITY_LIMITS.HAMMING_DUPLICATE_THRESHOLD) {
      return {
        verdict: 'REJECTED',
        reason: 'Duplicate image detected: This exact photo was already submitted previously.',
        similarityScore: Number((1 - combinedDist / 64).toFixed(4)),
        matchedActionId: prev.id,
      };
    }
  }

  // Highly suspicious visual similarity (threshold <= 10 bits OR high histogram similarity)
  if (
    minHamming <= SECURITY_LIMITS.HAMMING_SUSPICIOUS_THRESHOLD ||
    (minHamming <= 14 && maxCosine >= SECURITY_LIMITS.HISTOGRAM_COSINE_SIMILARITY_THRESHOLD)
  ) {
    return {
      verdict: 'PENDING',
      reason: `Flagged for staff review: High visual similarity to previous submission (Hamming: ${minHamming}, Cosine: ${maxCosine.toFixed(3)})`,
      similarityScore: Number((1 - minHamming / 64).toFixed(4)),
      matchedActionId,
    };
  }

  return {
    verdict: 'CLEAN',
    reason: null,
    similarityScore: Number((1 - minHamming / 64).toFixed(4)),
    matchedActionId: null,
  };
}

/**
 * Enforces submission cooldown (60 seconds) and hourly submission cap (10/hr).
 * @param {string} userId
 * @param {any} prismaClient
 */
export async function enforceRateLimits(userId, prismaClient) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const sixtySecondsAgo = new Date(Date.now() - SECURITY_LIMITS.ACTION_COOLDOWN_SECONDS * 1000);

  // Check 60-second cooldown on most recent submission
  const recentAction = await prismaClient.ecoAction.findFirst({
    where: {
      userId,
      createdAt: { gte: sixtySecondsAgo },
    },
    select: { createdAt: true },
  });

  if (recentAction) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(recentAction.createdAt).getTime()) / 1000);
    const waitSeconds = SECURITY_LIMITS.ACTION_COOLDOWN_SECONDS - elapsedSeconds;
    throw new AppError(
      429,
      `Please wait ${waitSeconds} more seconds before submitting another action (60s cooldown).`,
      'RATE_LIMIT_COOLDOWN'
    );
  }

  // Check hourly cap (< 10 actions/hr)
  const hourlyCount = await prismaClient.ecoAction.count({
    where: {
      userId,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (hourlyCount >= SECURITY_LIMITS.MAX_ACTIONS_PER_HOUR) {
    throw new AppError(
      429,
      `Hourly limit reached (${SECURITY_LIMITS.MAX_ACTIONS_PER_HOUR} actions/hour). Please try again later.`,
      'RATE_LIMIT_HOURLY_EXCEEDED'
    );
  }
}
