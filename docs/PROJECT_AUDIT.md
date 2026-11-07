# Project Audit: SaveRaks (SaveRaks 2.0 Rebuild)

**Document Reference:** `docs/PROJECT_AUDIT.md`  
**Date & Time:** October 28, 2026, 22:30:00 +07:00 (Asia/Bangkok)  
**Author:** Technical Lead & Principal Software Architect  
**Status:** Initial Read-Only Audit Completed — Pending Architecture Approval  

---

## 1. Executive Summary

SaveRaks is an environmental engagement and sustainability platform designed specifically for **Surasakmontree School** (Bangkok, Thailand). Its purpose is to empower students and staff to actively participate in eco-friendly behaviors—including waste sorting, recycling, public commute, tree planting, and zero-waste initiatives—incentivized through an authoritative eco-points ledger, gamified badges, leaderboards, and a verified school marketplace.

This document represents the official, read-only architectural and operational audit of the repository workspace, installed toolchain, and legacy reference artifacts prior to writing any production code.

---

## 2. Workspace & Repository State Inspection

A comprehensive inspection of the local filesystem, environment paths, and Git version control was conducted. The findings are documented below:

### 2.1 Target Repository Location
- **Active Workspace Directory:** `D:\Project_SaveRaks`
- **Initial Working Directory:** `C:\Users\john`
- **Git Version Control Status:**
  - Neither `C:\Users\john` nor `D:\Project_SaveRaks` contained an initialized `.git` repository (`fatal: not a git repository (or any of the parent directories): .git`).
  - The target workspace is freshly created and contains no initialized application code, package manifests, or build scripts.
- **Repository Cleanliness:**
  - Target project directory `D:\Project_SaveRaks` contains only a legacy folder named `Old _vertion`.
  - There are no pre-existing config files (`package.json`, `pnpm-workspace.yaml`, `.env`, `docker-compose.yml`) in the root of `D:\Project_SaveRaks`.
  - **Verdict:** The repository is completely clean and empty. In accordance with technical instructions, this fact is formally documented rather than assuming or inventing pre-existing code.

### 2.2 Installed Runtime & Toolchain Verification
The host machine was inspected for installed CLI tools, runtime engines, and package managers:

| Tool / Runtime | Installed Version | Status / Notes |
| :--- | :--- | :--- |
| **Node.js** | `v24.19.0` | **Verified.** Modern LTS/Current release with native ES Modules (`import`/`export`), top-level `await`, and modern crypto support. |
| **pnpm** | `11.25.0` | **Verified.** High-performance package manager ideal for multi-package monorepos. |
| **npm** | `12.0.2` | **Verified.** Available as alternative/fallback. |
| **yarn** | `1.22.22` | **Verified.** Classic Yarn available. |
| **Git** | `2.55.0.windows.5` | **Verified.** Standard Git version control available. |
| **Docker Engine** | `29.7.2` | **Verified installed.** Note: Docker Desktop daemon was not running during initial scan; local tests will use Node/Prisma or start Docker when required. |
| **PostgreSQL CLI** | Not in system `PATH` | Managed PostgreSQL on **Render** (and Dockerized/cloud Postgres for dev) will be connected via Prisma ORM over connection strings. |

---

## 3. Legacy Reference Audit (`D:\Project_SaveRaks\Old _vertion`)

Per project instructions, the legacy codebase in `D:\Project_SaveRaks\Old _vertion` is **strictly reference-only** for understanding school context, historical rules, and common pitfalls. It must **never** be imported, migrated, or treated as the source of truth.

An architectural security audit of the legacy repository revealed critical failure modes that must be permanently engineered out of the clean rebuild:

### 3.1 Critical Security Vulnerabilities Identified in Legacy Code
1. **Committed Secrets in Git History:**
   - Raw `.env` files containing live secrets, database URLs, and API tokens were previously committed directly to version control.
   - Unencrypted student spreadsheets (`student.xlsx`, `Fixed Excel.xlsx`) were committed into the repository, exposing real student identifiers and student names.
2. **Insecure Authentication & Fallback Bypass:**
   - JWT secret fallback (`process.env.JWT_SECRET || 'secret'`) enabled token forgery if configuration was omitted.
   - Demo student login fallback permitted unauthenticated access when the database connection failed.
   - Unauthenticated test/debug endpoints (`/api/auth/test-db`, `/api/auth/test-ai`) exposed entire student tables.
3. **Client-Side Secret Exposure:**
   - Client bundles in `vite.config.ts` and `geminiService.ts` bundled `GEMINI_API_KEY`, exposing generative AI billing credentials directly in browser source maps.
4. **Marketplace Price & Point Tampering:**
   - `POST /api/marketplace/purchase` in the legacy code accepted `cost` directly from the client request body, allowing any user to redeem rewards for 0 points via HTTP interceptors.
   - Non-atomic point deductions allowed race conditions and double-spending across concurrent redemption requests.
5. **Incomplete Image & Anti-Cheat Pipeline:**
   - MinIO container was declared, but actions controller saved hardcoded `placehold.co` URLs instead of real image uploads.
   - Anti-cheat perceptual hashing calculated hashes but returned hardcoded mock distance values instead of querying historical hashes in the database.
6. **Aggressive Service Worker Caching:**
   - `service-worker.js` cached all HTTP `GET` responses indiscriminately, caching sensitive authenticated `/api/*` endpoints containing personal user data on shared devices.

### 3.2 Inconsistencies & Configuration Drift in Legacy Code
- **Mismatched Schemas:** `database/init.sql` lacked the `students_master` table defined in `prisma/schema.prisma`.
- **Conflicting Upload Limits:** Frontend enforced 5 MB, Nginx allowed 10 MB, and Express allowed 50 MB.
- **Divergent Point Tables:** Point rates differed between root `constants.ts` and backend `actions.routes.ts`.

---

## 4. Rebuild Architectural Principles & Boundaries

The new SaveRaks platform will be engineered from the ground up according to the following mandatory standards:

1. **Native JavaScript ES Modules (ESM):**
   - JavaScript is the default. Do **not** introduce TypeScript unless explicitly approved by the user.
   - Full ESM compliance: `"type": "module"` in all `package.json` manifests, explicit file extensions in imports (`.js`).
2. **Modular Monorepo Architecture:**
   - Monorepo organized via `pnpm` workspaces:
     - `apps/web`: React + Vite frontend application.
     - `apps/api`: Node.js + Express backend service.
     - `packages/shared`: Shared domain constants, schemas, and utility functions.
     - `prisma`: Authoritative PostgreSQL schema and migrations.
     - `tests/e2e`: Automated Playwright end-to-end tests.
     - `docs`: Authoritative system documentation.
3. **Database-First Data Integrity:**
   - Authoritative PostgreSQL schema managed exclusively via Prisma migrations.
   - Immutable, append-only point transaction ledger (`point_transactions`).
   - Zero-trust server-side validation: client is never trusted for points, costs, stock, roles, or approval status.
   - Strict database transactions (`prisma.$transaction`) with atomic conditional decrements.
4. **Defensive Security & Privacy:**
   - Password hashing using Argon2 or bcrypt (`cost = 12`).
   - Server-side Google ID token verification (`google-auth-library`).
   - No fallback secrets; fail-fast environment validation at application boot.
   - PII protection: Public endpoints (`/api/actions`, `/api/leaderboard`, `/api/pins`) strictly exclude sensitive student fields (phone, email, student ID, password hashes).
   - Real, persistent object storage with Sharp image sanitization (EXIF stripped, WebP conversion, thumbnail generation). Ephemeral local disk is never used for permanent storage.
5. **Predictable, Accessible UX:**
   - Mobile-first responsive interface with predictable states: loading skeletons, empty states, error boundaries, confirmation dialogs for destructive actions.
   - Clear waste sorting bin recommendations matching Thai national and school standards (Yellow = Recyclable, Green = Organic, Blue = General, Red/Orange = Hazardous).
6. **Render Cloud Deployment:**
   - Render Static Site for `apps/web`.
   - Render Web Service for `apps/api`.
   - Render PostgreSQL for managed database.
   - Declarative `render.yaml` Blueprint or documented environment configuration.

---

## 5. Audit Sign-Off & Verification

| Milestone | Expected Condition | Verified State |
| :--- | :--- | :--- |
| Workspace Inspected | Read-only scan completed | **VERIFIED** |
| Toolchain Evaluated | Node, pnpm, npm, Git confirmed | **VERIFIED** |
| Legacy Pitfalls Documented | Security flaws & schema drift cataloged | **VERIFIED** |
| Non-Negotiables Established | ESM, JavaScript, Render, Zero-Trust | **VERIFIED** |
| Code Implementation Gate | No production code written prior to approval | **VERIFIED** |
