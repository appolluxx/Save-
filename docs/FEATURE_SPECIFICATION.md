# Feature Specification: SaveRaks

**Document Reference:** `docs/FEATURE_SPECIFICATION.md`  
**Date & Time:** October 28, 2026, 22:30:00 +07:00 (Asia/Bangkok)  
**Author:** Technical Lead & Principal Software Architect  
**Status:** Approved Functional Specification  

---

## 1. Feature 1: Authentication & User Profiles

### 1.1 Objective
Provide secure, streamlined onboarding and authentication for Surasakmontree School students, faculty/staff, and system administrators, supporting both standard credentials and Google Single Sign-On (SSO).

### 1.2 User Stories & Personas
- **Student Persona:** As a student, I want to verify my Student ID and create an account, so that my eco activities are tied to my official classroom record and leaderboard rank.
- **Staff/Teacher Persona:** As a faculty member or janitorial lead, I want to register with an authorized staff invite code to review submitted student activities.
- **Admin Persona:** As a school administrator, I want to manage user statuses and roles with complete audit traceability.

### 1.3 Detailed Requirements
1. **Student Verification & Registration:**
   - Input: `studentId` (5-digit official school ID), `password`, `email` (optional), `phone` (optional), `displayName`.
   - Business Invariants:
     - `studentId` must exist in `StudentsMaster` table.
     - `StudentsMaster.isRegistered` must be `false`. If `true`, reject with HTTP `409 Conflict` ("Student ID already registered").
     - Password hashed using `bcrypt` (work factor 12) or Argon2.
     - Atomic transaction marks `StudentsMaster.isRegistered = true` and creates the `User` record.
2. **Staff Registration:**
   - Input: `email`, `password`, `displayName`, `staffInviteCode`.
   - Invariant: `staffInviteCode` must match server-side environment secret `STAFF_INVITE_SECRET` evaluated via constant-time comparison (`crypto.timingSafeEqual`).
3. **Google Login (SSO):**
   - Client sends Google ID token.
   - Server validates token signature and audience against `GOOGLE_CLIENT_ID` via `google-auth-library`.
   - If user exists with matching `email` or `googleId`, logs them in. If new student, prompts for `studentId` verification link.
4. **Session Management:**
   - Issues signed JWT token (expires in 7 days).
   - Stored in HTTP-only, SameSite=Lax, Secure cookie for web client, or Bearer Authorization header.
   - Logout clears cookies and client-side cached data.
5. **Profile Display & Privacy:**
   - Public view shows: `displayName`, `avatarUrl`, `gradeLevel`, `classroom`, `points`, `totalCo2Saved`, `badges`.
   - Sensitive fields (`passwordHash`, `email`, `phone`, full student records) are stripped from public responses.

---

## 2. Feature 2: AI Waste Sorting & Bin Recommendations

### 2.1 Objective
Guide students in real time to correctly sort items into official school bins using camera capture and server-side AI computer vision, reinforcing sustainable habits.

### 2.2 Bin Classification Standards (Thailand & Surasakmontree School)
The system maps waste items into four official, standardized color-coded categories:

| Bin Color | Thai Category Name | Material Description | Examples |
| :--- | :--- | :--- | :--- |
| **Yellow (ถังเหลือง)** | ขยะรีไซเคิล (Recyclable Waste) | High-value recyclable materials suitable for material recovery. | Clear PET bottles, aluminum cans, cardboard, paper, glass bottles, clean hard plastic containers. |
| **Green (ถังเขียว)** | ขยะอินทรีย์ / ขยะเปียก (Organic Waste) | Biodegradable organic matter suitable for composting or biogas. | Food scraps, fruit peels, vegetable ends, leaves, cafeteria food leftovers. |
| **Blue (ถังน้ำเงิน)** | ขยะทั่วไป (General Waste) | Non-recyclable, non-hazardous waste with low decomposition rate. | Snack wrappers, foam food containers, plastic straws, soiled film wrappers, contaminated tissue. |
| **Red / Orange (ถังแดง/ส้ม)** | ขยะอันตราย (Hazardous Waste) | Toxic, flammable, corrosive, or electronic chemical waste. | Used alkaline batteries, CFL fluorescent tubes, spray cans, electronic waste, cleaning chemicals. |

### 2.3 Detailed Workflow & Output Contract
1. User captures or uploads a photo of an item.
2. Server validates file constraints (WebP/JPEG/PNG, max 5 MB).
3. Image buffer is evaluated by the Server-Side AI Vision Service (Groq Vision with Gemini Flash fallback).
4. System returns a validated structured response:
   ```json
   {
     "success": true,
     "data": {
       "itemName": "Clear Plastic Bottle (ขวดน้ำดื่ม PET)",
       "binColor": "YELLOW",
       "binNameThai": "ถังขยะรีไซเคิล",
       "confidence": 0.94,
       "properAction": "เทของเหลวออกให้หมด บิดขวดให้แบนเพื่อลดปริมาตร และแยกฝาขวดก่อนทิ้ง",
       "upcyclingTip": "ฝาขวดสามารถนำมารวบรวมส่งโครงการ Upcycling ทำเป็นกระถางต้นไม้ได้",
       "eligibleActionType": "RECYCLE_PET",
       "estimatedPoints": 10
     }
   }
   ```
5. User is presented with a direct call-to-action: **"Submit as Environmental Action"** to claim eco points.

---

## 3. Feature 3: Environmental Activities & Evidence Submission

### 3.1 Objective
Encourage and verify students' daily eco-friendly actions across 8 distinct categories, backed by photographic evidence and automated anti-cheat validation.

### 3.2 Action Catalog, Points & Carbon Offsets
All rates are authoritatively defined in `packages/shared/src/constants.js`:

| Action Code | Action Name (Thai / English) | Points | CO2 Saved (kgCO2e) | Verification Requirement |
| :--- | :--- | :---: | :---: | :--- |
| `RECYCLE_PET` | แยกขยะขวดพลาสติก PET | **10** | 0.045 | Photo showing clean PET bottle at yellow bin |
| `RECYCLE_CAN` | แยกกระป๋องอลูมิเนียม | **15** | 0.170 | Photo of compressed aluminum can |
| `RECYCLE_PAPER` | แยกกระดาษ / ลัง | **8** | 0.030 | Photo of stacked paper/cardboard |
| `REUSE_CONTAINER` | พกแก้วน้ำ / กล่องข้าว / ถุงผ้า | **12** | 0.050 | Photo showing reusable cup/box in school canteen |
| `PLANT_TREE` | ปลูกต้นไม้ / ดูแลแปลงเกษตร | **50** | 1.200 | Photo of newly planted seedling or school garden maintenance |
| `COMMUTE_PUBLIC` | เดินทางด้วยรถเมล์ / รถไฟฟ้า | **20** | 0.350 | Photo of transit ticket / bus card within commute time window |
| `COMMUTE_WALK` | เดินมาโรงเรียน | **25** | 0.500 | Commute window check + optional geo-location pin |
| `COMMUTE_BICYCLE` | ปั่นจักรยานมาโรงเรียน | **25** | 0.500 | Commute window check + bicycle parking photo |

### 3.3 Commute Time Window Rules (`COMMUTE_RULES`)
To prevent fraudulent commute claims outside school hours:
- **Timezone:** Evaluated exclusively on the server clock in `"Asia/Bangkok"` (UTC+7).
- **Applicable Days:** Monday through Friday only (no weekend claims).
- **Morning Window:** `05:00` to `08:30` (Max 1 commute submission per user per morning).
- **Afternoon Window:** `14:50` to `19:00` (Max 1 commute submission per user per afternoon).
- **Enforcement:** Unique composite database constraint on `[userId, commuteWindowKey]` (e.g., `user_123:2026-10-28:MORNING`). Attempts to submit duplicates in the same window are rejected with HTTP 400.

### 3.4 Automated Anti-Cheat Verification Pipeline
1. **Submission Rate Limit:** Max 1 submission per 60 seconds (Redis/in-memory cooldown); max 10 submissions per hour.
2. **Image Integrity:** Sharp decodes image, checks minimum resolution (256x256 px), luminance mean, and edge variance (rejecting completely black/blank frames).
3. **Perceptual Hash Comparison:**
   - 64-bit `pHash`, `dHash`, and `aHash` computed as 16-character hex strings.
   - Normalized 192-bin RGB Color Histogram computed.
   - Compared against all historical submissions in PostgreSQL.
   - **Verdict Matrix:**
     - Hamming Distance $\le 5$: Instant `REJECTED` (Identical/Duplicate image).
     - Hamming Distance $\le 10$ OR Cosine Similarity $\ge 0.96$: Flagged as `PENDING` for staff review.
     - Unique image: Proceed to AI verification.

---

## 4. Feature 4: Eco Points Ledger & Transaction History

### 4.1 Objective
Provide an immutable, audit-compliant financial ledger for eco points, ensuring balances are always mathematically sound and tamper-proof.

### 4.2 Functional Invariants
- The server is the **only** authority on point values. Client requests never pass point amounts.
- Every change in points is recorded as an immutable row in `PointTransaction`:
  - `amount`: Positive for action rewards; negative for marketplace purchases and penalty deductions.
  - `balanceAfter`: Authoritative running point balance immediately after transaction execution.
  - `type`: `ACTION_REWARD`, `REDEMPTION`, `ADMIN_ADJUSTMENT`, `BADGE_BONUS`.
  - `referenceId`: ID of the triggering `EcoAction`, `Redemption`, or `AuditLog`.
- In-memory balances on `User.points` are updated within the same transaction block (`prisma.$transaction`).
- Students can browse their complete transaction history, paginated and filtered by date or type.

---

## 5. Feature 5: Leaderboards & School Impact

### 5.1 Objective
Motivate students through positive competition while safeguarding personal privacy.

### 5.2 Scopes & Filtering
- **Overall School Leaderboard:** Top individual students across the school.
- **Grade-Level Leaderboard:** Filtered by grade (`ม.1` through `ม.6`).
- **Classroom Leaderboard:** Aggregate points per classroom (e.g., `ม.4/2`), encouraging collective environmental stewardship.
- **Monthly Reset View:** Displays top performers for the current calendar month alongside all-time stats.

### 5.3 Privacy & Data Sanitization
- Leaderboard projections **only** expose: `id`, `displayName`, `classroom`, `gradeLevel`, `points`, `totalCo2Saved`, and active badges.
- Explicitly excluded: `studentId`, `email`, `phone`, real names, or login timestamps.

---

## 6. Feature 6: Rewards Catalog & Atomic Redemption

### 6.1 Objective
Enable students to redeem their earned eco points for meaningful school rewards, school behavior credits, snacks, stationery, and certificates.

### 6.2 Rewards Catalog Examples (Based on Surasakmontree School Context)
- Behavior Score Credit (+10 คะแนนพฤติกรรม) — Cost: 100 points
- School Canteen Snack Voucher (คูปองขนมร้านสวัสดิการ) — Cost: 200 points
- Eco Keychain / Gachapon (พวงกุญแจรักษ์โลก) — Cost: 300 points
- Eco-Guardian Certificate (เกียรติบัตรนักอนุรักษ์) — Cost: 500 points
- Sustainable Stationery Set (ชุดสมุดปากการักษ์โลก) — Cost: 800 points
- Insulated Reusable Tumbler (แก้วน้ำเก็บความเย็น) — Cost: 1000 points

### 6.3 Redemption Logic & Security
1. Request payload: `{ rewardItemId }` (cost is fetched strictly from DB).
2. Atomic Transaction:
   - Verify `rewardItem.isActive === true` and `rewardItem.stock > 0`.
   - Decrement `RewardItem.stock` by 1 where `stock > 0`.
   - Decrement `User.points` by `reward.cost` where `points >= reward.cost`.
   - Generate unique cryptographic claim code (e.g., `SR-8A3F-9K2L`).
   - Create `Redemption` record with `status: 'COMPLETED'` (pending physical claim).
   - Create `PointTransaction` record with negative points.
3. Physical Claiming:
   - Student presents claim code at the School Welfare Room / Teacher's Office.
   - Staff/Admin scans or enters code, marking `status: 'CLAIMED'`.

---

## 7. Feature 7: Verified School Map & Campus Collection Points

### 7.1 Objective
Provide an interactive campus map of Surasakmontree School highlighting verified waste collection bins, grease traps, compost sites, and hazard reporting locations.

### 7.2 Core Map Locations (Surasakmontree School Coordinates ~ 13.7760° N, 100.5550° E)
- Building 1, 2, 3 Recycling Stations (จุดแยกขยะอาคารเรียน)
- School Canteen Organic Waste Drop-off (จุดทิ้งขยะเปียกโรงอาหาร)
- Football Field & Gymnasium Bin Clusters (จุดคัดแยกขยะสนามฟุตบอลและโรงยิม)
- Hazardous Waste Collection Center (จุดรวบรวมขยะอันตรายและแบตเตอรี่)

### 7.3 Hazard & Full Bin Reporting
- Students can pin an issue (e.g., `FULL_BIN`, `HAZARD`, `DAMAGED_FACILITY`) with photo and description.
- Coordinates are rounded to 4 decimal places in public APIs for privacy.
- Janitorial and maintenance staff receive reported pins and can update status to `RESOLVED`.

---

## 8. Feature 8: Comprehensive Admin Dashboard

### 8.1 Evidence Review Queue
- Live filterable table of pending submissions (`PENDING` or flagged by anti-cheat / low AI confidence).
- Visual side-by-side comparison: submitted photo vs. closest historical perceptual hash match.
- Action controls: `Approve` (triggers atomic point award), `Reject` (requires selecting or typing a reason).

### 8.2 User & Role Management
- Search students and staff by name, classroom, or ID.
- Actions: Activate, Suspend, Adjust Role (`STUDENT`, `STAFF`, `ADMIN`).
- Direct manual point adjustment requiring mandatory reason text; automatically logged in `AuditLog`.

### 8.3 Reward Inventory & Analytics Reports
- Real-time stock monitor, add/edit rewards, toggle availability.
- School-wide impact dashboard: Total CO2e saved, total plastic bottles recycled, active student participation rate.
- Exportable CSV/Excel reports for school green council and administration audits.
