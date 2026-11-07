# Data Model & Schema Specification: SaveRaks

**Document Reference:** `docs/DATA_MODEL.md`  
**Date & Time:** October 28, 2026, 22:30:00 +07:00 (Asia/Bangkok)  
**Author:** Technical Lead & Principal Software Architect  
**Status:** Approved Data Architecture  

---

## 1. Overview & Data Design Principles

The SaveRaks data model is built on **PostgreSQL** and managed using **Prisma ORM**. It adheres to the following core tenets:

1. **Third Normal Form (3NF) Normalization:** Redundant data is eliminated; transactional references use immutable foreign keys.
2. **Authoritative Point Ledger:** User balances are never updated without a corresponding, immutable entry in `PointTransaction`. This provides a complete financial-grade audit trail of all eco points earned and spent.
3. **Integrity via Database Constraints:** Constraints (unique indexes, check constraints, composite uniqueness) are enforced at the database level rather than relying solely on application-level checks.
4. **Zero-Trust Administrative Auditing:** Sensitive administrative actions (user suspension, manual point adjustments, role changes, reward inventory overrides) generate immutable `AuditLog` rows.
5. **Privacy by Design:** Soft deletions and field-level projections ensure sensitive PII is shielded from public APIs.

---

## 2. Complete Prisma Schema (`apps/api/prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

enum Role {
  STUDENT
  STAFF
  ADMIN
}

enum ActionType {
  RECYCLE_PET
  RECYCLE_CAN
  RECYCLE_PAPER
  REUSE_CONTAINER
  PLANT_TREE
  COMMUTE_PUBLIC
  COMMUTE_WALK
  COMMUTE_BICYCLE
}

enum ActionStatus {
  PENDING
  APPROVED
  REJECTED
}

enum TransactionType {
  ACTION_REWARD
  REDEMPTION
  ADMIN_ADJUSTMENT
  BADGE_BONUS
}

enum RedemptionStatus {
  PENDING
  CLAIMED
  CANCELLED
}

enum PinType {
  FULL_BIN
  HAZARD
  RECYCLING_STATION
  COMPOST_SITE
  MAINTENANCE
}

enum PinStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
}

// ---------------------------------------------------------------------------
// Student Master Roster (Surasakmontree School)
// ---------------------------------------------------------------------------

model StudentsMaster {
  studentId    String    @id @map("student_id") @db.VarChar(10)
  prefix       String?   @db.VarChar(20)
  firstName    String    @map("first_name") @db.VarChar(100)
  lastName     String    @map("last_name") @db.VarChar(100)
  gradeLevel   String    @map("grade_level") @db.VarChar(10) // e.g., "ม.4"
  classroom    String    @db.VarChar(10)                      // e.g., "4/2"
  isRegistered Boolean   @default(false) @map("is_registered")
  registeredAt DateTime? @map("registered_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  user User?

  @@index([gradeLevel, classroom])
  @@map("students_master")
}

// ---------------------------------------------------------------------------
// Core User Identity & Profile
// ---------------------------------------------------------------------------

model User {
  id            String    @id @default(uuid()) @db.Uuid
  studentId     String?   @unique @map("student_id") @db.VarChar(10)
  email         String?   @unique @db.VarChar(255)
  phone         String?   @unique @db.VarChar(20)
  passwordHash  String?   @map("password_hash") @db.VarChar(255) // Optional if Google-only
  googleId      String?   @unique @map("google_id") @db.VarChar(255)
  displayName   String    @map("display_name") @db.VarChar(100)
  avatarUrl     String?   @map("avatar_url") @db.Text
  role          Role      @default(STUDENT)
  points        Int       @default(0)
  totalCo2Saved Float     @default(0) @map("total_co2_saved")
  isActive      Boolean   @default(true) @map("is_active")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  lastLoginAt   DateTime? @map("last_login_at")

  studentMaster     StudentsMaster?    @relation(fields: [studentId], references: [studentId])
  actions           EcoAction[]        @relation("UserActions")
  reviewedActions   EcoAction[]        @relation("ReviewedActions")
  pointTransactions PointTransaction[]
  redemptions       Redemption[]
  badges            UserBadge[]
  reportedPins      MapPin[]           @relation("ReportedPins")
  resolvedPins      MapPin[]           @relation("ResolvedPins")
  auditActions      AuditLog[]         @relation("ActorAuditLogs")

  @@index([role])
  @@index([points(sort: Desc)])
  @@index([totalCo2Saved(sort: Desc)])
  @@map("users")
}

// ---------------------------------------------------------------------------
// Environmental Activities & Submissions
// ---------------------------------------------------------------------------

model EcoAction {
  id                 String       @id @default(uuid()) @db.Uuid
  userId             String       @map("user_id") @db.Uuid
  type               ActionType
  status             ActionStatus @default(PENDING)
  pointsAwarded      Int          @default(0) @map("points_awarded")
  co2SavedKg         Float        @default(0) @map("co2_saved_kg")

  // Real Object Storage Keys & URLs (Persistent Storage)
  imageObjectKey     String       @map("image_object_key") @db.VarChar(255)
  thumbnailObjectKey String?      @map("thumbnail_object_key") @db.VarChar(255)
  imageUrl           String       @map("image_url") @db.Text
  thumbnailUrl       String?      @map("thumbnail_url") @db.Text

  // Perceptual Hashes (64-bit Hex Strings, 16 chars) & 192-bin RGB Histogram
  pHash              String       @map("p_hash") @db.VarChar(16)
  dHash              String       @map("d_hash") @db.VarChar(16)
  aHash              String       @map("a_hash") @db.VarChar(16)
  colorHistogram     Float[]      @map("color_histogram")
  similarityScore    Float        @default(0) @map("similarity_score")
  suspiciousReason   String?      @map("suspicious_reason") @db.Text

  // AI Verification Output
  aiVerified         Boolean      @default(false) @map("ai_verified")
  aiConfidence       Float        @default(0) @map("ai_confidence")
  aiSummaryThai      String?      @map("ai_summary_thai") @db.Text
  aiDetectedObjects  String[]     @map("ai_detected_objects")

  // Geolocation & Commute Time Window Lock
  latitude           Float?
  longitude          Float?
  commuteWindowKey   String?      @map("commute_window_key") @db.VarChar(50) // e.g. "2026-10-28:MORNING"

  // Staff Review & Audit
  reviewedBy         String?      @map("reviewed_by") @db.Uuid
  reviewedAt         DateTime?    @map("reviewed_at")
  rejectReason       String?      @map("reject_reason") @db.Text

  createdAt          DateTime     @default(now()) @map("created_at")
  updatedAt          DateTime     @updatedAt @map("updated_at")

  user     User  @relation("UserActions", fields: [userId], references: [id], onDelete: Cascade)
  reviewer User? @relation("ReviewedActions", fields: [reviewedBy], references: [id])

  // Unique constraint ensures max 1 commute claim per user per window
  @@unique([userId, commuteWindowKey])
  @@index([userId, createdAt(sort: Desc)])
  @@index([status, createdAt(sort: Desc)])
  @@index([dHash])
  @@index([pHash])
  @@map("eco_actions")
}

// ---------------------------------------------------------------------------
// Authoritative Point Ledger (Append-Only)
// ---------------------------------------------------------------------------

model PointTransaction {
  id           String          @id @default(uuid()) @db.Uuid
  userId       String          @map("user_id") @db.Uuid
  amount       Int             // Positive for credits, negative for debits
  balanceAfter Int             @map("balance_after")
  type         TransactionType
  referenceId  String?         @map("reference_id") @db.VarChar(100) // EcoAction ID, Redemption ID, etc.
  description  String          @db.VarChar(255)
  createdAt    DateTime        @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([type])
  @@map("point_transactions")
}

// ---------------------------------------------------------------------------
// Rewards Catalog & Atomic Redemptions
// ---------------------------------------------------------------------------

model RewardItem {
  id          String   @id @default(uuid()) @db.Uuid
  title       String   @db.VarChar(150)
  description String   @db.Text
  cost        Int
  stock       Int      @default(0)
  imageUrl    String?  @map("image_url") @db.Text
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  redemptions Redemption[]

  @@map("reward_items")
}

model Redemption {
  id             String           @id @default(uuid()) @db.Uuid
  userId         String           @map("user_id") @db.Uuid
  rewardItemId   String           @map("reward_item_id") @db.Uuid
  costAtPurchase Int              @map("cost_at_purchase")
  redemptionCode String           @unique @map("redemption_code") @db.VarChar(32) // e.g. "SR-9X2L-4K7P"
  status         RedemptionStatus @default(PENDING)
  claimedAt      DateTime?        @map("claimed_at")
  createdAt      DateTime         @default(now()) @map("created_at")

  user       User       @relation(fields: [userId], references: [id], onDelete: Restrict)
  rewardItem RewardItem @relation(fields: [rewardItemId], references: [id], onDelete: Restrict)

  @@index([userId, createdAt(sort: Desc)])
  @@index([status])
  @@map("redemptions")
}

// ---------------------------------------------------------------------------
// Gamification Badges
// ---------------------------------------------------------------------------

model Badge {
  id               String   @id @default(uuid()) @db.Uuid
  code             String   @unique @db.VarChar(50)
  name             String   @db.VarChar(100)
  description      String   @db.Text
  icon             String   @db.VarChar(50)
  triggerType      String   @map("trigger_type") @db.VarChar(50) // e.g. "COUNT_RECYCLE_PET"
  triggerThreshold Int      @map("trigger_threshold")
  createdAt        DateTime @default(now()) @map("created_at")

  users UserBadge[]

  @@map("badges")
}

model UserBadge {
  userId    String   @map("user_id") @db.Uuid
  badgeId   String   @map("badge_id") @db.Uuid
  awardedAt DateTime @default(now()) @map("awarded_at")

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge Badge @relation(fields: [badgeId], references: [id], onDelete: Cascade)

  @@id([userId, badgeId])
  @@map("user_badges")
}

// ---------------------------------------------------------------------------
// School Map & Collection Pins
// ---------------------------------------------------------------------------

model MapPin {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String    @map("user_id") @db.Uuid
  type        PinType
  status      PinStatus @default(OPEN)
  description String    @db.Text
  latitude    Float
  longitude   Float
  imageUrl    String?   @map("image_url") @db.Text
  resolvedBy  String?   @map("resolved_by") @db.Uuid
  resolvedAt  DateTime? @map("resolved_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  reporter User  @relation("ReportedPins", fields: [userId], references: [id], onDelete: Cascade)
  resolver User? @relation("ResolvedPins", fields: [resolvedBy], references: [id])

  @@index([status])
  @@index([type])
  @@map("map_pins")
}

// ---------------------------------------------------------------------------
// Sensitive Administrative Audit Logging
// ---------------------------------------------------------------------------

model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  actorId    String   @map("actor_id") @db.Uuid
  action     String   @db.VarChar(100) // e.g., "USER_STATUS_CHANGE", "POINT_ADJUSTMENT"
  targetType String   @map("target_type") @db.VarChar(50)
  targetId   String   @map("target_id") @db.VarChar(100)
  payload    Json?
  ipAddress  String?  @map("ip_address") @db.VarChar(45)
  createdAt  DateTime @default(now()) @map("created_at")

  actor User @relation("ActorAuditLogs", fields: [actorId], references: [id], onDelete: Cascade)

  @@index([actorId, createdAt(sort: Desc)])
  @@index([action])
  @@map("audit_logs")
}
```

---

## 3. Referential Actions & Data Retention Policies

| Entity | Relation | On Delete Policy | Rationale |
| :--- | :--- | :--- | :--- |
| `EcoAction` | `User` | `CASCADE` | Deleting a test user cleans up unapproved/pending actions. In production, users are soft-deactivated (`isActive = false`). |
| `PointTransaction`| `User` | `CASCADE` | User-scoped transactions clean up on cascade in dev; production uses ledger soft retention. |
| `Redemption` | `User` / `RewardItem` | `RESTRICT` | Prevents deletion of physical rewards or users if a redemption record exists, preserving financial integrity. |
| `UserBadge` | `User` / `Badge` | `CASCADE` | Badges linked to deleted users are safely cleaned up. |
| `AuditLog` | `User` (Actor) | `CASCADE` (dev) | Audit logs persist admin actions; actor IDs map to administrative user IDs. |

---

## 4. Render PostgreSQL Backup & Restore Procedures

### 4.1 Automated Daily Backups
Render PostgreSQL provides automated continuous backups with point-in-time recovery (PITR) on paid plans, and automated daily logical backups.

### 4.2 Manual Backup Procedure (pg_dump)
To take a zero-downtime, consistent snapshot prior to major migrations:

```bash
# Set external database connection string from Render Dashboard
DATABASE_URL="postgres://user:password@host.render.com:5432/saveraks_db?sslmode=require"

# Dump entire database schema and data in custom compressed format
pg_dump "$DATABASE_URL" -Fc -f "saveraks_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### 4.3 Disaster Recovery / Restore Procedure (pg_restore)
```bash
# Restore snapshot into fresh target database
pg_restore --clean --if-exists --no-owner --no-privileges -d "$TARGET_DATABASE_URL" "saveraks_backup_YYYYMMDD_HHMMSS.dump"

# Run Prisma schema validation after restore
npx prisma db pull
npx prisma validate
```
