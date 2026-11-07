# Design System Master File: SaveRaks 2.0 (Forest and Sage Campus Utility)

> **Authority:** Single Source of Truth for SaveRaks 2.0 UI/UX.
> **Design Language:** Forest-and-sage campus utility, based on the supplied phone, tablet, and desktop SVGs. Use warm sage canvases, calm surfaces, deep forest structure, and lime for focused calls to action and active states.
> **Audience:** Surasakmontree School (โรงเรียนสุรศักดิ์มนตรี, Bangkok, Thailand)

---

## 1. Strict Anti-Trope Invariants (NEVER VIOLATE)

- ❌ **NO Monotonous Card Stacking:** Vary section hierarchy with dividers, open canvas, and a few clear panels. Avoid repeating identical cards without grouping or purpose.
- ❌ **NO Unfocused Lime:** Use lime as a small highlight or primary CTA with dark forest text. Do not use it for long text or large page backgrounds.
- ❌ **NO Neon / Glow / Mesh Gradients:** Zero `from-purple-500 to-cyan-500`, zero glowing borders, zero frosted-glass blurs.
- ❌ **NO Emojis as UI Icons:** 100% scalable vector SVG icons (Lucide 2px stroke width).
- ❌ **NO Ambiguous Interactive States:** Primary actions use forest with white text, or lime with forest text. Keep touch targets at least 44px high.
- ❌ **Strict Pure Sans-Serif:** Strictly use modern sans-serif typefaces (`Prompt` for Thai, `Inter / system-ui` for English and numbers).

---

## 2. Grounded Color Palette Tokens

| Token Role             | Hex Value                         | Tailwind Class                                            | Contrast / Purpose                                          |
| :--------------------- | :-------------------------------- | :-------------------------------------------------------- | :---------------------------------------------------------- |
| **Forest Primary**     | `#0C342C`                         | `bg-brand-primary`, `text-brand-primary`                  | Main structure, navigation, primary buttons with white text |
| **Forest Hover**       | `#076653`                         | `bg-brand-primary-hover`                                  | Hover and pressed feedback                                  |
| **Lime Accent**        | `#C5E814`                         | `bg-brand-accent`                                         | Primary highlight and CTA with dark forest text             |
| **Positive Olive**     | `#52751D`                         | `text-brand-positive`                                     | Positive status and supporting emphasis                     |
| **Canvas**             | `#F2F6EB`                         | `bg-brand-canvas`                                         | App background and open breathing space                     |
| **Surface**            | `#FAFCF5`                         | `bg-brand-surface`                                        | Cards, sheets, and content panels                           |
| **Soft Sage**          | `#EDF5D8`                         | `bg-brand-soft`                                           | Selected, hover, and grouped states                         |
| **Border**             | `#DDE7D2`                         | `border-gray-200`                                         | Separation against warm surfaces                            |
| **Ink / Body / Muted** | `#183B2D` / `#29351C` / `#72816D` | `text-brand-ink` / `text-brand-body` / `text-brand-muted` | Readable type hierarchy                                     |
| **Streak Accent**      | `#C2410C`                         | `text-[#c2410c]`, `bg-[#fff7ed]`                          | Daily habit streak (`เช็คอิน 5 วันติด`)                     |

### 4-Bin Standard Colors

- 🟢 **Organic / Wet:** `#15803D`
- 🟡 **Recycle:** `#CA8A04`
- 🔵 **General:** `#2563EB`
- 🔴 **Hazardous:** `#DC2626`

---

## 3. Typographic Hierarchy & Metric Layout

- **Metric Hero:** `text-4xl font-black text-brand-ink tracking-tight tabular-nums` (e.g. `120 SRT`)
- **Micro Telemetry Strip:** `text-xs text-gray-600 font-medium` (e.g. `4.20 kg ลดคาร์บอน | 12 ครั้ง กิจกรรม | อันดับ #4`)
- **Section Headers:** `text-xs font-extrabold uppercase tracking-wider text-gray-500`
- **Action Row Titles:** `text-sm font-extrabold text-brand-ink`
- **Action Row Subtitles:** `text-xs text-gray-500`

---

## 4. Responsive Navigation

- **Mobile (`<768px`):** Five-item fixed bottom bar with a raised record action and safe-area spacing.
- **Tablet (`768–1279px`):** Collapsed 88px icon rail, with labels available to assistive technology and on hover.
- **Desktop (`≥1280px`):** 224px labeled sidebar.
- **5 Mobile Triggers:**
  1. `Feed` (`/`) — Live campus stream & daily telemetry
  2. `Map` (`/map`) — Campus Matrix, full bin reporter, stations
  3. `Center Record Trigger` (`/submit`) — Elevated forest circular button with a lime camera icon
  4. `Shop` (`/shop`) — Vouchers & School Canteen catalog
  5. `Profile` (`/profile`) — Athlete progress & rank
