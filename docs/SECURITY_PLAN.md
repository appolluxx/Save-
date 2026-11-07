# Security Plan: SaveRaks

**Document Reference:** `docs/SECURITY_PLAN.md`  
**Date & Time:** October 28, 2026, 22:30:00 +07:00 (Asia/Bangkok)  
**Author:** Technical Lead & Principal Security Reviewer  
**Status:** Approved Security Architecture  

---

## 1. Threat Model & OWASP Top 10 Mitigation Matrix

SaveRaks processes student personal identifiers, school activity logs, and reward voucher redemptions. The security plan is constructed around a zero-trust model:

| Threat Category | Potential Attack Vector in SaveRaks | Mitigation Strategy in Clean Rebuild |
| :--- | :--- | :--- |
| **BOLA (Broken Object Level Authorization)** | Student attempts to read or cancel another student's reward redemption or action history via direct UUID manipulation. | Every controller verifies that `req.user.id === resource.userId` unless the authenticated actor possesses the `ADMIN` or `STAFF` role. |
| **Broken Authentication** | Credential brute-forcing, token forging via weak fallback secrets, or session replay. | Bcrypt password hashing (`cost = 12`); Google ID tokens verified exclusively server-side via `google-auth-library`; JWT secrets enforced at $\ge 32$ characters with zero fallbacks; strict rate limits on `/api/auth/*`. |
| **Mass Assignment & Tampering** | Attacker injects `{ points: 9999, role: "ADMIN", cost: 0 }` in request bodies. | Zero-trust payload parsing via strict Zod schemas. Controllers pick **only** explicitly allowed fields (`rewardItemId`, `actionType`, `description`). Points and costs are retrieved strictly from the database. |
| **Race Conditions & Double-Spending** | Rapid concurrent requests to `/api/marketplace/purchase` to redeem more stock than available or spend points multiple times. | Atomic database transactions (`prisma.$transaction`) with conditional SQL decrements (`WHERE stock > 0` and `WHERE points >= cost`). |
| **Unrestricted File Upload** | Malicious executable upload, SVG XSS payloads, or multi-gigabyte denial-of-service files. | Strict 5 MB upload ceiling; memory storage; magic-byte MIME type validation; image re-encoding to WebP with Sharp (stripping all EXIF and malicious metadata). |
| **Ephemeral Disk Data Loss** | Storing uploaded user photos on Render's ephemeral container filesystem. | Mandatory cloud object storage (AWS S3 / Cloudinary / Supabase / MinIO). Ephemeral local disk is strictly prohibited for permanent storage. |
| **Anti-Cheat Evasion** | Re-uploading identical images from previous weeks or web image scraping to farm eco points. | Perceptual hashing (`pHash`, `dHash`, `aHash`) and 192-bin RGB color histogram compared against all historical submissions in PostgreSQL; Hamming distance $\le 5$ triggers immediate rejection. |

---

## 2. Authentication & Session Security

### 2.1 Password Hashing Specification
- Algorithm: **Bcrypt** with a work factor (salt rounds) of `12`.
- Passwords must meet minimum complexity requirements (enforced by Zod schema):
  - Minimum 8 characters.
  - At least one uppercase letter, one lowercase letter, and one number.
- Constant-time password comparison (`bcrypt.compare()`) protects against timing attacks.

### 2.2 Google Identity Services (Server-Side Verification)
- The frontend retrieves a Google ID token from Google Identity Services.
- The token is submitted to `POST /api/auth/google`.
- The server verifies token integrity using `OAuth2Client.verifyIdToken()`:
  ```javascript
  import { OAuth2Client } from 'google-auth-library';
  import { env } from '../config/env.js';

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

  export async function verifyGoogleToken(idToken) {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email_verified) {
      throw new Error('Google email is not verified');
    }
    return {
      googleId: payload.sub,
      email: payload.email,
      displayName: payload.name,
      avatarUrl: payload.picture,
    };
  }
  ```

### 2.3 Token Security & HTTP-Only Cookies
- **Access Tokens:** Signed with HMAC-SHA256 (`jwt.sign()`) using `env.JWT_SECRET` (minimum 32 random characters). Expiration is set to 7 days.
- **Cookie Security Attributes:**
  - `httpOnly: true`: Completely prevents access from client-side JavaScript, mitigating XSS token theft.
  - `secure: process.env.NODE_ENV === 'production'`: Transmitted exclusively over TLS/HTTPS.
  - `sameSite: 'lax'`: Provides CSRF protection for standard top-level navigation while supporting cross-site context.
  - `path: '/'`.

---

## 3. Fail-Fast Environment Configuration

To permanently eliminate the vulnerability of fallback secrets (e.g. `JWT_SECRET || 'secret'`), the server implements fail-fast schema validation at process startup. If any required variable is missing or malformed, the process immediately logs the validation failure and terminates (`process.exit(1)`):

```javascript
// apps/api/src/config/env.js
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  STAFF_INVITE_SECRET: z.string().min(16, 'STAFF_INVITE_SECRET must be at least 16 characters long'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  
  // Storage Configuration (Persistent Cloud Object Storage)
  STORAGE_PROVIDER: z.enum(['s3', 'cloudinary', 'minio']).default('cloudinary'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  
  // AI Vision Keys
  GROQ_API_KEY: z.string().min(10, 'GROQ_API_KEY is required for AI Vision'),
  GEMINI_API_KEY: z.string().optional(),
  
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ FATAL: Invalid or missing environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
```

---

## 4. Anti-Tampering & Concurrency Protections

### 4.1 Zero-Trust Point & Price Invariants
1. **No Client-Supplied Points:**
   - The client request body for `POST /api/actions` specifies **only** `type`, `description`, `latitude`, `longitude`, and image attachment.
   - Points are looked up server-side from `packages/shared/src/constants.js`.
2. **No Client-Supplied Prices:**
   - The client request body for `POST /api/marketplace/purchase` specifies **only** `{ rewardItemId }`.
   - The cost is retrieved directly from the verified database record (`RewardItem.cost`).
3. **Atomic Marketplace Transaction:**
   ```javascript
   await prisma.$transaction(async (tx) => {
     // 1. Fetch active reward
     const reward = await tx.rewardItem.findFirst({
       where: { id: rewardItemId, isActive: true },
     });
     if (!reward) throw new AppError(404, 'Reward not found');

     // 2. Decrement stock atomically (guards against overselling)
     const stockUpdate = await tx.rewardItem.updateMany({
       where: { id: reward.id, isActive: true, stock: { gt: 0 } },
       data: { stock: { decrement: 1 } },
     });
     if (stockUpdate.count === 0) throw new AppError(400, 'Reward is out of stock');

     // 3. Decrement user points atomically (guards against negative balance)
     const userUpdate = await tx.user.updateMany({
       where: { id: userId, isActive: true, points: { gte: reward.cost } },
       data: { points: { decrement: reward.cost } },
     });
     if (userUpdate.count === 0) throw new AppError(400, 'Insufficient eco points');

     // 4. Create redemption voucher
     const redemptionCode = generateSecureVoucherCode(); // e.g. "SR-8K3P-9X2L"
     const redemption = await tx.redemption.create({
       data: {
         userId,
         rewardItemId: reward.id,
         costAtPurchase: reward.cost,
         redemptionCode,
         status: 'PENDING',
       },
     });

     // 5. Append immutable entry to PointTransaction ledger
     await tx.pointTransaction.create({
       data: {
         userId,
         amount: -reward.cost,
         balanceAfter: (await tx.user.findUnique({ where: { id: userId } })).points,
         type: 'REDEMPTION',
         referenceId: redemption.id,
         description: `Redeemed ${reward.title}`,
       },
     });

     return redemption;
   });
   ```

---

## 5. Safe File Upload Pipeline & Image Sanitization

To ensure user uploads can never compromise server infrastructure or leak sensitive EXIF location metadata:

1. **Upload Constraints:**
   - Handled via `multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })`.
   - Whitelist of allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
2. **Sharp Image Sanitization:**
   ```javascript
   import sharp from 'sharp';

   export async function processImageUpload(buffer) {
     const image = sharp(buffer);
     const metadata = await image.metadata();

     if (!metadata.width || !metadata.height) {
       throw new AppError(400, 'Invalid image format');
     }
     if (metadata.width < 256 || metadata.height < 256) {
       throw new AppError(400, 'Image resolution too low (minimum 256x256 px)');
     }

     // Rotate based on EXIF orientation, strip EXIF metadata, compress to WebP
     const mainBuffer = await sharp(buffer)
       .rotate()
       .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
       .webp({ quality: 82 })
       .toBuffer();

     // Generate optimized square thumbnail
     const thumbBuffer = await sharp(buffer)
       .rotate()
       .resize(320, 320, { fit: 'cover' })
       .webp({ quality: 75 })
       .toBuffer();

     return { mainBuffer, thumbBuffer };
   }
   ```
3. **Persistent Cloud Storage:**
   - Both buffers are streamed directly to persistent cloud storage (Cloudinary or AWS S3).
   - Only storage object keys and public URLs are saved to PostgreSQL.

---

## 6. Network & Header Security

### 6.1 Security Headers via Helmet
The Express API utilizes `helmet()` with tailored directives:
- `Content-Security-Policy`: Restricts resource loading to trusted domains.
- `Strict-Transport-Security` (HSTS): Enforces HTTPS (`maxAge: 31536000; includeSubDomains`).
- `X-Frame-Options: DENY`: Mitigates clickjacking attacks.
- `X-Content-Type-Options: nosniff`: Prevents MIME type sniffing.

### 6.2 Rate Limiting Architecture
Implemented via `express-rate-limit`:
- **Global API Limiter:** 100 requests per 15 minutes per IP.
- **Authentication Limiter:** 5 requests per 15 minutes per IP on `/api/auth/login` and `/api/auth/register/*`.
- **Action Submission Limiter:** 10 submissions per 60 minutes per user; 60-second cooldown between individual submissions.

### 6.3 CORS Whitelist
The API strictly restricts CORS origins to the production Render Web URL and local development hosts:
```javascript
const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new AppError(403, 'CORS origin not allowed'));
    }
  },
  credentials: true,
}));
```
