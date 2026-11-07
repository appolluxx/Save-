# SaveRaks 2.0 — Pre-Production Release Readiness Checklist

**Document Reference:** `docs/RELEASE_READINESS_CHECKLIST.md`  
**Target Environment:** Render Cloud (Static Site + Web Service + Managed PostgreSQL)  
**Target Organization:** Surasakmontree School (โรงเรียนสุรศักดิ์มนตรี)

---

## 1. Infrastructure & Database Deployment (Render)

- [ ] **Render Blueprint Deployment:**
  - Connect Git repository containing `render.yaml` to the Render Dashboard.
  - Apply the blueprint to create:
    - `saveraks-web` (Static Site for React frontend)
    - `saveraks-api` (Web Service for Node.js Express backend)
    - `saveraks-db` (Managed PostgreSQL instance)
- [ ] **Database Migration Execution:**
  - Verify `apps/api/prisma/migrations/20261028000000_init/migration.sql` runs during backend build (`npx prisma migrate deploy`).
  - Confirm table creation and unique indexes (`students_master`, `users`, `eco_actions`, `point_transactions`, `reward_items`, `redemptions`, `badges`, `map_pins`, `audit_logs`).
- [ ] **Initial Database Seeding:**
  - Execute database seeder `node apps/api/prisma/seed.js` to populate:
    - 6 core Surasakmontree school rewards (behavior score credit, canteen snack voucher, eco keychain, certificate, stationery, tumbler).
    - 5 official campus waste collection and hazard reporting stations.
    - 5 standard gamification badges.

---

## 2. Environment Variables & Secret Configuration

Configure the following environment variables in the Render Dashboard for `saveraks-api`:

| Variable Name | Required Value / Source | Security Guidance |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables strict CORS, secure cookie flags, and production error masking. |
| `DATABASE_URL` | Auto-linked from `saveraks-db` | Connection string to Render PostgreSQL (`sslmode=require`). |
| `JWT_SECRET` | 64-character random string | Generate with: `openssl rand -hex 32`. Must be at least 32 characters. |
| `STAFF_INVITE_SECRET` | 32-character random string | Distributed only to verified Surasakmontree teachers and admin staff. |
| `CORS_ALLOWED_ORIGINS` | Auto-linked from `saveraks-web` (`host`) | Protocol-agnostic matcher handles `saveraks-web.onrender.com`. Add custom school domains if applicable. |
| `STORAGE_PROVIDER` | `cloudinary` | Disables local/base64 fallback in production. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name | Registered account for school photo storage. |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Managed in Cloudinary developer console. |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | Stored as a protected secret in Render. |
| `GROQ_API_KEY` | Groq Vision API Key | Used for fast Llama-3.2-11b waste classification. |
| `GEMINI_API_KEY` | Google Gemini API Key | Fallback vision provider for high-availability. |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Web Client ID | Configured with authorized origin `https://saveraks-web.onrender.com`. |

Configure in Render Dashboard for `saveraks-web`:
| Variable Name | Required Value / Source | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://saveraks-api.onrender.com` | Base URL of the backend Web Service. |
| `VITE_GOOGLE_CLIENT_ID` | Same Google Web Client ID | Enables frontend Google Identity Services login. |

---

## 3. School Administrative & Policy Sign-Off

- [ ] **Student Master Roster Import:**
  - Export official Surasakmontree School student list (5-digit student ID, prefix, first name, last name, grade level `ม.1`–`ม.6`, classroom e.g. `4/2`).
  - Import records into `students_master` table with `is_registered = false`.
- [ ] **Eco-Action Point Values Approval:**
  - Submit provisional point values from `packages/shared/src/constants.js` to school executive board:
    - PET Bottle Recycling: **10 points**
    - Aluminum Can Recycling: **15 points**
    - Paper/Cardboard: **8 points**
    - Reusable Container/Tumbler: **12 points**
    - Plant/Tree Care: **50 points**
    - Public Transit Commute: **20 points**
    - Walking / Bicycle Commute: **25 points**
- [ ] **Campus Bin Mapping Verification:**
  - Janitorial leads and environmental committee verify physical bin locations and match them with initial `MapPin` coordinates on campus.
- [ ] **Voucher Claim Procedure Handover:**
  - Train welfare store staff on navigating to `/admin` $\rightarrow$ "Vouchers" tab to scan or enter student claim codes (`SR-XXXX-XXXX`) and mark them as `CLAIMED`.

---

## 4. Operational Monitoring & Health Verification

- [ ] **Health Endpoint Verification:**
  - Request `GET https://saveraks-api.onrender.com/api/health` and verify HTTP 200 response:
    ```json
    { "status": "healthy", "database": "connected", "uptime": 12.3 }
    ```
- [ ] **Test Transaction Audit:**
  - Create test student account with an authorized test ID.
  - Submit sample waste photo and verify that:
    - Multi-hash fingerprint is calculated and stored.
    - Cloudinary receives and serves the WebP image.
    - Points credit properly and record in `point_transactions`.
- [ ] **Deactivation Test:**
  - Suspend test account from Admin panel; verify student session is immediately rejected on subsequent requests.
