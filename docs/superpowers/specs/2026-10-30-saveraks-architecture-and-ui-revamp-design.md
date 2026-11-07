# 📐 System Design: SaveRaks 2.0 (Strava Athletic Architecture & UI)

* **Date:** 2026-10-30
* **Status:** LOCKED & APPROVED
* **Author:** Antigravity / Gemini & User
* **Design Philosophy:** **Strava Athletic** — Activity-first social feed, 3-column telemetry metric blocks, 7-day progress bars, social kudos, zero emojis, pure sans-serif typography, and the iconic center record button.
* **Target Workspace:** `D:\Project_SaveRaks`
* **Design System Reference:** `D:\Project_SaveRaks\design-system\saveraks-2-0\MASTER.md`

---

## 1. Strava Athletic Design Principles

1. **Activity-First Social Feed:** Every eco-action (walking to school, bicycle, waste sorting, energy saving) displays as a rich activity post with athlete avatar, classroom, GPS/school tag, title, and social kudos.
2. **Signature 3-Column Horizontal Metric Blocks:** Key statistics formatted in bold athletic sans-serif:
   `[POINTS: +10 SRT] | [CO₂ SAVED: 0.40 kg] | [GPS RANGE: 150 m]`
3. **Weekly Progress Telemetry:** 7-day Mon–Sun bar chart tracking daily school commute and recycling consistency.
4. **Grounded Bottom Navigation with Iconic Orange RECORD Button:** Fixed athletic tab bar with an elevated circular `#FC4C02` Record button in the center.
5. **Zero Emojis & Pure Sans-Serif:** 100% vector SVG icons (Lucide 2px stroke); typefaces strictly `Prompt` (Thai) and `Inter / system-ui` (English and metrics).
6. **High-Contrast Athletic Palette:** Strava Orange (`#FC4C02`), Surasakmontree Green (`#059669`), Graphite (`#1F1F24`), pure white cards (`#FFFFFF`), light gray canvas (`#F4F4F6`).

---

## 2. Monorepo Architecture & Clean Service Layer

* **Backend:**
  - `apps/api/src/services/actions.service.js`: Domain submission logic, 7-day telemetry calculator, atomic `PointTransaction` ledger records.
  - Non-waste actions (`walk`, `bicycle`, `commute`, `tree_planting`, `energy_saving`) auto-approve when geofence ($\le 500$m) and anti-cheat hash pass without calling waste-bin AI.
  - Waste sorting (`recycling_pet`, `recycling_can`) preserves fail-closed security in production.
  - Controllers are thin HTTP parsers.
* **Frontend:**
  - `src/components/ui/`: `Button`, `Card`, `Badge`, `Input`, `Modal`, `MetricBlock`.
  - `src/components/layout/`: `AppShell`, `Header`, `StravaBottomNav`.
  - `src/features/`: `feed/` (Strava activity cards, weekly chart), `actions/` (Record workout flow), `scanner/` (Waste vision HUD), `marketplace/` (Vouchers & Challenges), `map/` (Campus segments & stations), `profile/` (Athlete profile & stats).
  - Data hooks powered by `@tanstack/react-query`.
* **Zero Regressions:** 100% test passing across the monorepo.
