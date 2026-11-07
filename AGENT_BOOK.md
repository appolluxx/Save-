# 📖 SaveRaks 2.0 — The Master Agent Book (System Architecture & Knowledge Base)

> **Purpose:** This document is the single source of truth (SSOT) designed specifically for **AI Agents** (and human engineers) working on the SaveRaks project. Any AI Agent entering this workspace must read this book first to understand the architecture, sacred domain logic, database schemas, APIs, and strict operational guidelines.

---

## 1. Project Orientation & Mission

* **Project Name:** SaveRaks 2.0 (Saveรักษ์)
* **Organization:** Surasakmontree School (โรงเรียนสุรศักดิ์มนตรี, Bangkok, Thailand)
* **Mission:** Gamified environmental engagement platform enabling students and staff to track, verify, and earn points (SRT) for eco-friendly behaviors:
  1. AI-assisted waste sorting (4-bin standard)
  2. Low-carbon commute tracking (walking, bicycle, BTS/MRT, public bus with GPS verification)
  3. Energy conservation and tree planting
  4. Campus hazard and full-bin reporting (Campus Matrix)
  5. School marketplace rewards (canteen vouchers, behavior score credit, eco certificates)
  6. Robust Anti-Cheat engine detecting duplicate images and coordinate spoofing

---

## 2. Monorepo Topology & Tech Stack

This project is structured as a **PNPM Monorepo** (Zero TypeScript, Pure JavaScript ESM):

```
Project_SaveRaks/
├── package.json              # Root workspace orchestrator
├── pnpm-workspace.yaml       # Defines packages: apps/* and packages/*
├── render.yaml               # Infrastructure-as-Code for Render Cloud deployment
├── .env.example              # Blueprint for required environment variables
├── AGENT_BOOK.md             # This document (AI Agent Handbook)
│
├── packages/
│   └── shared/               # Shared Domain Logic, Constants & Zod Schemas
│       ├── package.json      # @saveraks/shared
│       └── src/
│           ├── constants.js  # Action rates, commute rules, bin categories, coordinates
│           ├── schemas.js    # Zod validation schemas for all API payloads
│           └── index.js      # Barrel export
│
├── apps/
│   ├── api/                  # Express REST API Backend
│   │   ├── package.json      # @saveraks/api
│   │   ├── prisma/
│   │   │   ├── schema.prisma # PostgreSQL Database Schema
│   │   │   ├── migrations/   # Version-controlled SQL migrations
│   │   │   └── seed.js       # Database seeder (badges, initial pins, rewards)
│   │   └── src/
│   │       ├── server.js     # Entry point & Express configuration
│   │       ├── controllers/  # Route handlers (auth, actions, market, pins, admin)
│   │       ├── middleware/   # JWT auth, RBAC, error handler, rate limiter, upload
│   │       ├── routes/       # Express route definitions
│   │       └── services/     # Anti-cheat, storage (Cloudinary/Local), AI Vision
│   │
│   └── web/                  # Mobile-First React SPA Frontend
│       ├── package.json      # @saveraks/web
│       ├── index.html        # HTML entry point (viewport-fit=cover, Prompt font)
│       ├── vite.config.js    # Vite configuration (port 5173, proxy /api to 4000)
│       ├── tailwind.config.js# Brand tokens (brand-50..900, bin-green/yellow/blue/red)
│       └── src/
│           ├── main.jsx      # React DOM root
│           ├── App.jsx       # React Router switchboard
│           ├── api/client.js # Standardized Fetch API client wrapper
│           ├── context/      # AuthContext (state, tokens, session storage)
│           ├── components/   # Layout, Navbar, BottomNav, ProtectedRoute
│           └── pages/        # All 9 primary views (Feed, Vision, Submit, Shop, etc.)
│
└── docs/                     # Architectural specs, audit reports & deployment guides
```

---

## 3. Sacred Domain Logic & Invariants (NEVER VIOLATE)

Any AI Agent modifying code must strictly preserve these school-specific business rules:

### A. School Geolocation & Coordinates
* **School Name:** โรงเรียนสุรศักดิ์มนตรี (Surasakmontree School)
* **Official Coordinates:** `Latitude: 13.8196° N, Longitude: 100.5613° E` (or default campus bounds: `13.7760° N, 100.5550° E`)
* **Acceptable Verification Radius:** Maximum **500 meters** (`0.5 km`) from school center.

### B. Commute Time Windows (Anti-Gaming Policy)
Commute actions (`commute`, `walk`, `bicycle`) can **ONLY** be submitted during designated school travel hours:
* **Morning Window:** `06:00 – 09:00` (ก่อนเข้าแถวเคารพธงชาติ)
* **Afternoon Window:** `14:50 – 20:30` (หลังเลิกเรียน)
* Submissions outside these windows are automatically rejected by `@saveraks/shared` via `evaluateCommuteWindow()`.

### C. Student Verification Rule
* Students **MUST** be verified against the `students_master` table using their **5-digit Student ID** (`studentId`).
* Grade levels are Thai secondary: `ม.1` through `ม.6`.

### D. Eco-Action Point Economy (SRT Rates)
Points are strictly governed by `ACTION_TYPES` in `packages/shared/src/constants.js`:

| Action Type | Key | Points (SRT) | Carbon Saved (kgCO₂e) | Description |
| :--- | :--- | :---: | :---: | :--- |
| **Walk** | `walk` | **10** | 0.40 | เดินเท้ามาโรงเรียน |
| **Bicycle** | `bicycle` | **8** | 0.35 | ปั่นจักรยาน |
| **Public Transit** | `commute` | **15** | 0.80 | รถเมล์, BTS, MRT |
| **Tree Planting** | `tree_planting` | **20** | 2.50 | ปลูก/ดูแลต้นไม้ |
| **PET Recycle** | `recycling_pet` | **5** | 0.15 | คัดแยกขวดพลาสติกใส |
| **Can Recycle** | `recycling_can` | **8** | 0.30 | กระป๋องอลูมิเนียม |
| **Energy Saving** | `energy_saving` | **5** | 0.25 | ปิดไฟ/พัดลม/ถอดปลั๊ก |
| **Zero Waste** | `zero_waste` | **5** | 0.10 | ใช้แก้วส่วนตัว/ถุงผ้า |

### E. 4-Bin Standard Waste Classification
* 🟢 **ถังขยะเปียก (Green / Organic):** เศษอาหาร, เปลือกผลไม้, ใบไม้
* 🔵 **ถังขยะทั่วไป (Blue / General):** ซองขนม, ถุงพลาสติกเปื้อน, กล่องโฟม
* 🟡 **ถังขยะรีไซเคิล (Yellow / Recycle):** ขวดแก้ว, กระดาษ, ลัง, ขวดพลาสติก PET, กระป๋อง
* 🔴 **ถังขยะอันตราย (Red / Hazardous):** ถ่านไฟฉาย, หลอดไฟ, อุปกรณ์อิเล็กทรอนิกส์

---

## 4. Database Schema & Data Models

Prisma model summary (`apps/api/prisma/schema.prisma`):

1. **`StudentsMaster`**: Pre-seeded official school roster (`studentId` 5-digit unique, `firstName`, `lastName`, `gradeLevel`, `classroom`, `isRegistered`).
2. **`User`**: Account identity (`studentId` or `email`, `role: STUDENT | STAFF | ADMIN`, `points`, `totalCo2SavedKg`, `banned`).
3. **`EcoAction`**: Logged action (`userId`, `type`, `pointsEarned`, `co2SavedKg`, `imageUrl`, `imageHash`, `pHash`, `dHash`, `status: PENDING | APPROVED | REJECTED`, `flagReason`).
4. **`PointTransaction`**: Append-only financial ledger (`userId`, `actionId`, `amount`, `balanceAfter`, `type: EARN | SPEND | ADJUST`).
5. **`RewardItem`**: Shop items (`title`, `costPoints`, `stock`, `category: BEHAVIOR_SCORE | SNACK | MERCH | CERTIFICATE`).
6. **`Redemption`**: Claimed vouchers (`userId`, `rewardItemId`, `redemptionCode`, `status: ISSUED | CLAIMED | EXPIRED`).
7. **`Badge` & `UserBadge`**: Gamification achievements.
8. **`MapPin`**: Campus Matrix pins (`latitude`, `longitude`, `type: FULL_BIN | HAZARD | COMPOST`, `status`).
9. **`AuditLog`**: Security tracking for admin actions.

> **RULE:** Financial point updates must always be wrapped in atomic transactions (`prisma.$transaction`) updating both `User.points` and creating a `PointTransaction` record.

---

## 5. Anti-Cheat & Image Integrity Architecture

The system uses a 5-layer defence pipeline (`apps/api/src/services/anticheat.service.js`):

```
Image Upload
     │
     ▼
[Layer 1: Sharp Pre-processing] ➔ Normalize resolution, strip EXIF GPS spoofing
     │
     ▼
[Layer 2: Perceptual Hashing]   ➔ Generate 64-bit pHash (Frequency), dHash (Gradient), aHash (Average)
     │
     ▼
[Layer 3: Hamming Distance]     ➔ Compare against candidate actions (Hamming distance <= 6 is duplicate)
     │
     ▼
[Layer 4: Color Histogram]      ➔ Cosine similarity across normalized RGB bins (>= 0.90 is duplicate)
     │
     ▼
[Layer 5: Decision & Flagging]  ➔ If duplicate detected: Mark status = 'PENDING', isFlagged = true, quarantine points
```

---

## 6. API Routing Matrix

All endpoints are mounted under `/api` in `apps/api/src/server.js`:

| Prefix | Handler | Description |
| :--- | :--- | :--- |
| `GET /api/health` | Root | Service healthcheck & timestamp |
| `/api/auth` | `auth.controller.js` | `verify-student`, `register/student`, `register/staff`, `login`, `google`, `me` |
| `/api/actions` | `actions.controller.js` | Submit photo action, `scan-preview`, user action history |
| `/api/marketplace` | `marketplace.controller.js` | Browse catalog, purchase rewards, view vouchers |
| `/api/pins` | `pins.controller.js` | View campus map pins, report new full bins/hazards |
| `/api/leaderboard` | `leaderboard.controller.js` | Individual and classroom carbon rankings, school stats |
| `/api/admin` | `admin.controller.js` | Evidence verification queue, approve/reject, voucher claim, user audit |

---

## 7. Frontend Pages & Routing Architecture

React SPA routes configured in `apps/web/src/App.jsx`:

1. `/login` ➔ [`LoginPage.jsx`](file:///D:/Project_SaveRaks/apps/web/src/pages/LoginPage.jsx) (Student verification, Staff register, Google SSO, Back button)
2. `/` ➔ [`FeedPage.jsx`](file:///D:/Project_SaveRaks/apps/web/src/pages/FeedPage.jsx) (Impact hero stats, quick action shortcuts, live peer activity feed)
3. `/vision` ➔ [`VisionPage.jsx`](file:///D:/Project_SaveRaks/apps/web/src/pages/VisionPage.jsx) (Camera scanner, AI bin advisor with upcycling tips)
4. `/submit` ➔ [`SubmitActionPage.jsx`](file:///D:/Project_SaveRaks/apps/web/src/pages/SubmitActionPage.jsx) (Photo proof upload, commute window check)
5. `/shop` ➔ [`ShopPage.jsx`](file:///D:/Project_SaveRaks/apps/web/src/pages/ShopPage.jsx) (Eco-rewards catalog, balance pill, voucher redemption QR/code)
6. `/leaderboard` ➔ [`LeaderboardPage.jsx`](file:///D:/Project_SaveRaks/apps/web/src/pages/LeaderboardPage.jsx) (Individual champions, grade filters ม.1–ม.6)
7. `/map` ➔ [`MapPage.jsx`](file:///D:/Project_SaveRaks/apps/web/src/pages/MapPage.jsx) (Campus Matrix, full bin reporter, station coordinates)
8. `/profile` ➔ [`ProfilePage.jsx`](file:///D:/Project_SaveRaks/apps/web/src/pages/ProfilePage.jsx) (Level badge, progress bar, action history)
9. `/admin` ➔ [`AdminPage.jsx`](file:///D:/Project_SaveRaks/apps/web/src/pages/AdminPage.jsx) (Teacher dashboard, anti-cheat evidence queue, voucher scanner)

---

## 8. Common Operational Commands for Agents

### Start Local Development
```powershell
# 1. Run Web Dev Server (Vite port 5173)
cd D:\Project_SaveRaks\apps\web
npx vite --host --port 5173

# 2. Run API Server (port 4000)
cd D:\Project_SaveRaks\apps\api
node --watch src/server.js
```

### Run Tests & Validation
```powershell
cd D:\Project_SaveRaks
# Run all unit and integration tests across all packages:
pnpm -r test

# Run Prisma schema validation:
cd apps/api
npx prisma validate
```

### Build for Production
```powershell
cd D:\Project_SaveRaks
pnpm -r build
```

---

## 9. Golden Rules for Future AI Agents

1. **Pure JavaScript ESM Only:** Do NOT add TypeScript `.ts` or `.tsx` files to this monorepo. All code is pure Node.js 20+ ES Modules (`.js`, `.jsx`).
2. **Never import across monorepo packages directly:** Always import via `@saveraks/shared`, never `../../packages/shared/src/constants.js`.
3. **Fail-Closed Security:** Never bypass anti-cheat checks or student verification.
4. **Never hardcode secrets:** All sensitive API keys (`GEMINI_API_KEY`, `CLOUDINARY_API_SECRET`, `JWT_SECRET`) must be retrieved through `process.env`.
5. **Always test build after edits:** Run `npx vite build` in `apps/web` after modifying frontend components to guarantee zero build regressions.
