# SaveRaks 2.0: Clean Architecture & Strava Athletic UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor SaveRaks 2.0 into a Strava-inspired athletic environmental platform for Surasakmontree School featuring activity-first social feeds, 3-column telemetry metric blocks, 7-day progress bars, social kudos, and the iconic center RECORD button, backed by a clean modular service layer.

**Architecture:** Backend moves business rules out of monolithic controllers into dedicated pure domain services (`actions.service.js`, `anticheat.service.js`, `marketplace.service.js`), while frontend adopts a Strava Feature-Sliced Architecture (`src/features/*`) with athletic UI primitives (`src/components/ui/*`) and `@tanstack/react-query` data hooks.

**Tech Stack:** Node.js 20+, Express.js, Prisma ORM, PostgreSQL, React 18, Vite, Tailwind CSS, TanStack Query, Lucide Icons. Pure JavaScript ESM only (zero TypeScript).

**Spec:** `D:\Project_SaveRaks\docs\superpowers\specs\2026-10-30-saveraks-architecture-and-ui-revamp-design.md`

## Global Constraints

* Pure JavaScript ESM only: strictly no `.ts` or `.tsx` files.
* Single source of truth for constants in `@saveraks/shared`. Never use direct relative file imports across packages.
* Strava Athletic Aesthetic: Strava Orange (`#FC4C02`), Eco Emerald (`#059669`), Graphite text (`#1F1F24`), solid white cards on light gray canvas (`#F4F4F6`).
* Pure Sans-Serif Typography: Strictly use modern, athletic sans-serif typefaces (`Prompt, Inter, sans-serif`); zero serif fonts.
* Zero Emojis as UI Icons: Strictly no emojis. All icons must be scalable Lucide React SVG components with consistent 2px stroke width.
* Sacred School Invariants: 500m geofence around Surasakmontree School (`13.8196° N, 100.5613° E`), commute windows (`06:00–09:00`, `14:50–20:30` weekdays), 5-digit student IDs, 4-bin color standards.
* Fail-Closed Security: Waste actions preserve verification security in production; non-waste actions bypass waste AI and auto-approve based on geofence and anti-cheat hashing.

## Review Focus

1. **Strava 3-Column Telemetry Display:** Activity cards and submission summaries must format stats horizontally into 3 columns (`POINTS`, `CO₂ SAVED`, `GPS / CATEGORY`) with bold athletic numbers and small uppercase labels.
2. **7-Day Telemetry Bar Chart:** Mon–Sun weekly chart rendered on the feed displaying daily activity check-ins.
3. **Non-Waste Action Auto-Approval:** Walking, cycling, transit, tree planting, and energy saving must auto-approve with points credited when geofence and anti-cheat pass, without ever calling waste-bin AI.
4. **Iconic Grounded Navigation:** Fixed bottom tab bar with elevated circular `#FC4C02` Record button triggering action recording.
5. **Zero Build & Test Regressions:** `pnpm -r test` and `npx vite build` must pass 100%.

---

### Task 1: Backend Domain Service Decoupling & Resilient Non-Waste Pipeline

**Files:**
- Create: `apps/api/src/services/actions.service.js`
- Modify: `apps/api/src/controllers/actions.controller.js`
- Modify: `apps/api/src/services/ai-vision.service.js`
- Test: `apps/api/test/services.test.js`

- [ ] **Step 1: Write unit tests for `actions.service.js` pipeline**
  Add tests asserting that non-waste actions (`walk`, `tree_planting`) bypass waste-bin AI and auto-approve when geofence and anti-cheat pass, and calculate 7-day weekly telemetry.
- [ ] **Step 2: Implement `actions.service.js`**
  Extract submission pipeline, atomic point transaction creation, and weekly telemetry calculator (`getWeeklyTelemetry`).
- [ ] **Step 3: Refactor `actions.controller.js` to thin handler**
  Delegate submission logic to `actions.service.js`, keeping the controller focused strictly on HTTP status codes and Zod parsing.
- [ ] **Step 4: Update `ai-vision.service.js` fallback**
  Provide simulated approval for development/test mode (`NODE_ENV !== 'production'`) when API keys are absent, while retaining `PENDING` quarantine for production.
- [ ] **Step 5: Run backend test suite**
  Execute `cd D:\Project_SaveRaks\apps\api; node --test test/**/*.test.js` and ensure all tests pass.

---

### Task 2: Strava Athletic UI Primitives & Grounded Layout Shell

**Files:**
- Create: `apps/web/src/components/ui/Button.jsx`
- Create: `apps/web/src/components/ui/Card.jsx`
- Create: `apps/web/src/components/ui/Badge.jsx`
- Create: `apps/web/src/components/ui/Input.jsx`
- Create: `apps/web/src/components/ui/MetricBlock.jsx`
- Create: `apps/web/src/components/layout/AppShell.jsx`
- Create: `apps/web/src/components/layout/Header.jsx`
- Create: `apps/web/src/components/layout/StravaBottomNav.jsx`
- Modify: `apps/web/src/index.css`

- [ ] **Step 1: Define Strava athletic tokens in `index.css`**
  Configure Strava Orange (`#FC4C02`), Graphite (`#1F1F24`), canvas (`#F4F4F6`), and Prompt typography without any glow gradients.
- [ ] **Step 2: Build `MetricBlock.jsx` and UI primitives**
  Implement the signature 3-column horizontal metric layout and athletic buttons.
- [ ] **Step 3: Build `AppShell.jsx`, `Header.jsx`, `StravaBottomNav.jsx`**
  Implement the grounded 5-tab bar with the iconic circular center **RECORD** button (`#FC4C02`).
- [ ] **Step 4: Verify build integrity**
  Run `cd D:\Project_SaveRaks\apps\web; npx vite build` to verify clean compilation.

---

### Task 3: TanStack Query Data Hooks & Auth Session Management

**Files:**
- Create: `apps/web/src/hooks/useActions.js`
- Create: `apps/web/src/hooks/useMarketplace.js`
- Create: `apps/web/src/hooks/useLeaderboard.js`
- Modify: `apps/web/src/context/AuthContext.jsx`
- Modify: `apps/web/src/App.jsx`

- [ ] **Step 1: Configure `QueryClientProvider` in `App.jsx`**
  Wrap router in TanStack `QueryClientProvider`.
- [ ] **Step 2: Implement `useActions.js`**
  Provide queries for public feed, user history, and action submission mutations.
- [ ] **Step 3: Implement `useMarketplace.js`**
  Provide queries for catalog items, active user vouchers, and purchase mutations.
- [ ] **Step 4: Implement `useLeaderboard.js`**
  Provide queries for grade-level segments and school carbon rankings.
- [ ] **Step 5: Verify build**
  Run `npx vite build` in `apps/web`.

---

### Task 4: Refactor Feed (Strava Activity Posts & 7-Day Telemetry Chart)

**Files:**
- Create: `apps/web/src/features/feed/WeeklyTelemetryChart.jsx`
- Create: `apps/web/src/features/feed/StravaActivityCard.jsx`
- Create: `apps/web/src/features/feed/StravaFeedList.jsx`
- Modify: `apps/web/src/pages/FeedPage.jsx`

- [ ] **Step 1: Build `WeeklyTelemetryChart.jsx`**
  Render Mon–Sun athletic bar chart with check-in fills and carbon savings.
- [ ] **Step 2: Build `StravaActivityCard.jsx`**
  Athlete header, activity title, 3-column metric block, GPS map badge, and social Kudos button.
- [ ] **Step 3: Connect to `FeedPage.jsx`**
  Wire real feed query and display activity stream.
- [ ] **Step 4: Verify build**
  Run `npx vite build` in `apps/web`.

---

### Task 5: Refactor Action Submission (Strava Record Flow) & Scanner

**Files:**
- Create: `apps/web/src/features/actions/StravaRecordModal.jsx`
- Create: `apps/web/src/features/actions/SportActionSelector.jsx`
- Create: `apps/web/src/features/scanner/CameraViewfinder.jsx`
- Create: `apps/web/src/features/scanner/BinAdvisorResult.jsx`
- Modify: `apps/web/src/pages/SubmitActionPage.jsx`
- Modify: `apps/web/src/pages/VisionPage.jsx`

- [ ] **Step 1: Build `StravaRecordModal.jsx` and `SportActionSelector.jsx`**
  Athletic workout recording interface for Walk/Bicycle/Transit/Tree Planting with live GPS status.
- [ ] **Step 2: Refactor `VisionPage.jsx`**
  Clean camera viewfinder with 4-bin classification guidance and zero fake AI bloat.
- [ ] **Step 3: Verify build**
  Run `npx vite build` in `apps/web`.

---

### Task 6: Refactor Marketplace, Leaderboard, Auth & Admin Views

**Files:**
- Modify: `apps/web/src/pages/ShopPage.jsx`
- Modify: `apps/web/src/pages/LeaderboardPage.jsx`
- Modify: `apps/web/src/pages/MapPage.jsx`
- Modify: `apps/web/src/pages/LoginPage.jsx`
- Modify: `apps/web/src/pages/ProfilePage.jsx`
- Modify: `apps/web/src/pages/AdminPage.jsx`

- [ ] **Step 1: Refactor `LeaderboardPage.jsx` & `ShopPage.jsx`**
  Strava segment-style leaderboards (Classroom rankings ม.1–ม.6) and school reward catalog.
- [ ] **Step 2: Refactor `LoginPage.jsx` & `ProfilePage.jsx`**
  Athlete profile card, 5-digit student login, and trophy badge achievements.
- [ ] **Step 3: Refactor `AdminPage.jsx` & `MapPage.jsx`**
  Clean admin queue and campus pin station map.
- [ ] **Step 4: Verify build**
  Run `npx vite build` in `apps/web`.

---

### Task 7: Monorepo Full Verification & Playwright E2E Validation

**Files:**
- Test: All monorepo packages (`packages/shared`, `apps/api`, `apps/web`, `tests/e2e`)

- [ ] **Step 1: Run monorepo unit & integration tests**
  Execute `cd D:\Project_SaveRaks; pnpm -r test` to verify 100% test pass.
- [ ] **Step 2: Run monorepo production builds**
  Execute `cd D:\Project_SaveRaks; pnpm -r build` to ensure all packages build without warnings.
- [ ] **Step 3: Verify Playwright E2E test specs**
  Run `cd D:\Project_SaveRaks\tests\e2e; node --test test/**/*.test.js` to confirm all E2E configuration and structural suites succeed.
