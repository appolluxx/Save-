# SaveRaks 2.0 — Production Readiness Audit Evidence

**Document Reference:** `docs/RELEASE_AUDIT_EVIDENCE.md`  
**Date & Time:** October 29, 2026, 08:55:00 +07:00 (Asia/Bangkok)  
**Workspace:** `D:\Project_SaveRaks`  
**Runtime:** Node.js `v24.19.0`, pnpm `11.25.0`, Playwright `1.50.1`

---

## 1. Automated Test Execution Log

### Test Suite 1: Shared Domain Models & Constants (`@saveraks/shared`)
- **Command:** `pnpm -C "D:\Project_SaveRaks" --filter @saveraks/shared test`
- **Underlying Runner:** `node --test test/**/*.test.js`
- **Exit Code:** `0`
- **Duration:** `296ms`
- **Results:**
  - Total Tests: `41`
  - Passed: `41`
  - Failed: `0`
  - Skipped: `0`
- **Verified Areas:**
  - 8 Action Types and specifications (`RECYCLE_PET`, `RECYCLE_CAN`, `RECYCLE_PAPER`, `REUSE_CONTAINER`, `PLANT_TREE`, `COMMUTE_PUBLIC`, `COMMUTE_WALK`, `COMMUTE_BICYCLE`).
  - 4 Thai waste sorting bins (Yellow, Green, Blue, Orange/Red).
  - Commute window evaluation (Bangkok UTC+7, morning 05:00–08:30, afternoon 14:50–19:00, weekday boundary checks, weekend rejection).
  - Level threshold calculation (8 tiers, progress percentages).
  - Strict Zod validation schemas (`studentVerifySchema`, `studentRegisterSchema`, `staffRegisterSchema`, `loginSchema`, `marketplacePurchaseSchema` anti-tampering, `actionSubmissionSchema`, `aiVisionOutputSchema`, `mapPinCreateSchema`, `adminPointAdjustmentSchema`, `actionReviewSchema`).
- **Test Boundaries:** Pure in-memory unit tests; zero mocks.

---

### Test Suite 2: Backend Services, Security & API Pipeline (`@saveraks/api`)
- **Command:** `pnpm -C "D:\Project_SaveRaks" --filter @saveraks/api test`
- **Underlying Runner:** `node --test test/**/*.test.js`
- **Exit Code:** `0`
- **Duration:** `4.8s`
- **Results:**
  - Total Tests: `30`
  - Passed: `30`
  - Failed: `0`
  - Skipped: `0`
- **Verified Areas:**
  - Health endpoint (`/api/health`) offline database resilience probe (returns 503 when PostgreSQL server is disconnected).
  - Auth route security boundaries:
    - 400 on student verification with non-5-digit ID.
    - 400 on student registration with weak password.
    - 400 on student registration with unauthorized injected fields (e.g. `role: ADMIN`).
    - 401 on staff registration with invalid invite secret.
    - 401 on unauthenticated access to `/api/auth/me`.
  - Marketplace authorization & anti-tampering:
    - 401 on unauthenticated purchase.
    - 400/401 on price tampering payload (`cost: 0`).
  - Administrative role boundaries:
    - 401 on unauthenticated access to `/api/admin/evidence`.
    - 401 on unauthenticated access to `/api/admin/users`.
  - Public endpoints & 404 route handling (`ROUTE_NOT_FOUND`).
  - **CORS Configuration & Render host property compatibility (`isAllowedOrigin`):**
    - Full origin matching (`https://saveraks.onrender.com`).
    - Render host property protocol-agnostic matching (`saveraks-web.onrender.com`).
    - Unauthorized origin rejection in production.
    - Dev/test origin pass-through.
  - Prisma Client & Data Models validation (10 models and 7 schema enums verified in DMMF).
  - Storage service:
    - Sharp WebP conversion with EXIF stripping and 320x320 thumbnail generation.
    - Rejection of images < 256x256 px (`IMAGE_TOO_SMALL`).
    - Rejection of corrupted non-image buffers (`INVALID_IMAGE`).
    - Persistent object key generation (`actions/YYYY-MM/uuid.webp`).
    - **Fail-closed production storage guard:** throws `STORAGE_UNCONFIGURED` (503) when Cloudinary keys are missing in production.
  - Anti-cheat service:
    - 16-hex character generation for aHash, dHash, 32x32 DCT pHash, and 192-bin color histogram.
    - Bitwise Hamming distance calculations (0 to 64).
    - Cosine similarity between histogram vectors.
    - Exact duplicate detection (Hamming $\le 5$ bits $\rightarrow$ `REJECTED`).
    - Clean image verification.
    - **Query ordering validation:** verifies `orderBy: { createdAt: 'desc' }` is passed to Prisma query.
  - AI vision service:
    - Fallback output structure when external AI keys are unavailable.
    - Routing `isValid: false` environmental images to `PENDING` with 0 points awarded.
- **Test Boundaries:** Sharp image operations run live against memory buffers; external cloud APIs (Groq, Gemini, Cloudinary) tested with simulated keys or fallback handlers; database calls run against mocked Prisma or offline connection probe.

---

### Test Suite 3: Frontend Build & Asset Verification (`@saveraks/web`)
- **Command:** `pnpm -C "D:\Project_SaveRaks" --filter @saveraks/web test`
- **Exit Code:** `0`
- **Duration:** `130ms`
- **Results:**
  - Total Tests: `2`
  - Passed: `2`
  - Failed: `0`
  - Skipped: `0`
- **Verified Areas:**
  - `dist/index.html` structure and root mounting container.
  - Compiled JavaScript bundle (`dist/assets/*.js`) within size budget (< 1 MB).
  - Compiled Tailwind CSS bundle (`dist/assets/*.css`).

---

### Test Suite 4: Playwright Multi-Device E2E Tests (`@saveraks/e2e`)
- **Command:** `pnpm -C "D:\Project_SaveRaks" --filter @saveraks/e2e test:e2e`
- **Exit Code:** `0`
- **Duration:** `1.2m`
- **Workers:** 4 parallel workers
- **Browser Devices Tested:**
  1. Desktop Chrome (1280x720)
  2. Mobile Pixel 7 (412x915)
  3. Mobile iPhone 14 (390x844)
- **Results:**
  - Total Tests: `36`
  - Passed: `36`
  - Failed: `0`
  - Skipped: `0`
- **Verified Specs:**
  - `auth.spec.js` (4 tests per device = 12 runs): Login tabs, student ID verification step, staff invite code requirement, Google SSO button.
  - `navigation.spec.js` (3 tests per device = 9 runs): Home feed rendering, bottom navigation across tabs, zero horizontal scrollbar on mobile viewport (375px/390px/412px).
  - `waste-scanner.spec.js` (2 tests per device = 6 runs): AI scanner UI, upload box, scan button disabled until image attached.
  - `marketplace.spec.js` (1 test per device = 3 runs): Rewards catalog display, stock badge, eco point cost indicator.
  - `admin.spec.js` (2 tests per device = 6 runs): Unauthenticated redirect to `/login`, authenticated view of 4 admin tabs (Evidence, Vouchers, Users, Reports).
- **Test Boundaries:** Real production Vite preview web server; client-side route interception (`page.route()`) for backend API responses.

---

### Test Suite 5: Root Monorepo Full Build
- **Command:** `pnpm -C "D:\Project_SaveRaks" -r build`
- **Exit Code:** `0`
- **Duration:** `7.2s`
- **Output Artifacts:**
  - `@saveraks/shared`: Exported ESM modules ready.
  - `@saveraks/api`: Prisma Client v6.19.3 generated.
  - `@saveraks/web`: 1,653 React modules transformed; bundles generated (HTML 1.27 kB, CSS 27.76 kB, JS 292.66 kB).
  - `@saveraks/e2e`: Package validated.

---

## 2. Defect Reproductions & Fix Verifications

### Defect 1: Missing Migration SQL for Render Deployment
- **Reproduction:** Running `npx prisma migrate deploy` without a migration folder returns `No migrations found` and exits without creating database tables on a clean PostgreSQL instance.
- **Verification:** Created `apps/api/prisma/migrations/20261028000000_init/migration.sql` with all 10 tables, 7 enums, foreign keys, and indexes. Validated with `npx prisma validate`.

### Defect 2: AI Vision Auto-Approval on `isValid: false`
- **Reproduction:** Sending an image where AI returns `{ isValid: false, confidence: 0.95 }` previously evaluated `confidence >= 0.6` and approved the action, crediting points.
- **Verification:** Added check `!aiAnalysis.isValid` in `actions.controller.js`. Verified via unit test in `services.test.js` confirming status is `PENDING` with 0 points.

### Defect 3: Base64 Fallback in Production Storage
- **Reproduction:** When `NODE_ENV === 'production'` and Cloudinary keys were missing, `storage.service.js` returned `data:image/webp;base64,...`, inserting huge strings into PostgreSQL.
- **Verification:** Updated `storage.service.js` to throw `STORAGE_UNCONFIGURED` (503) in production. Verified with regression test in `services.test.js`.

### Defect 4: Admin Negative Point Deduction
- **Reproduction:** Admin calling `/api/admin/adjust-points` with `amount: -500` for a user with `100` points resulted in `points: -400`.
- **Verification:** Added boundary check `if (amount < 0 && user.points + amount < 0)` throwing `INSUFFICIENT_POINTS` and conditional SQL decrement `points: { gte: Math.abs(amount) }`.

### Defect 5: Render Host Property CORS Rejection
- **Reproduction:** Render sets `CORS_ALLOWED_ORIGINS=saveraks-web.onrender.com` via `property: host`. Browser sends `Origin: https://saveraks-web.onrender.com`. Simple `.includes()` failed and rejected requests with 403.
- **Verification:** Implemented `isAllowedOrigin` protocol-agnostic matcher in `app.js`. Verified with 4 regression tests in `api-routes.test.js`.

### Defect 6: Missing Rate Limiter on Expensive AI Scan Preview
- **Reproduction:** `/api/actions/scan-preview` allowed 200 requests per 15 minutes, allowing AI quota exhaustion.
- **Verification:** Mounted dedicated `aiScanLimiter` (20 req/15min) on `/api/actions/scan-preview`.

### Defect 7: Anti-Cheat Query Non-Deterministic Ordering
- **Reproduction:** `evaluateImageAntiCheat` used `take: 500` without `orderBy`, retrieving arbitrary records once total actions exceeded 500.
- **Verification:** Added `orderBy: { createdAt: 'desc' }` to query. Verified with regression test in `services.test.js`.
