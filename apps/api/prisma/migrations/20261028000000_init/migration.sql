-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('RECYCLE_PET', 'RECYCLE_CAN', 'RECYCLE_PAPER', 'REUSE_CONTAINER', 'PLANT_TREE', 'COMMUTE_PUBLIC', 'COMMUTE_WALK', 'COMMUTE_BICYCLE');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('ACTION_REWARD', 'REDEMPTION', 'ADMIN_ADJUSTMENT', 'BADGE_BONUS');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'CLAIMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PinType" AS ENUM ('FULL_BIN', 'HAZARD', 'RECYCLING_STATION', 'COMPOST_SITE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "PinStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateTable
CREATE TABLE "students_master" (
    "student_id" TEXT NOT NULL,
    "prefix" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "grade_level" TEXT NOT NULL,
    "classroom" TEXT NOT NULL,
    "is_registered" BOOLEAN NOT NULL DEFAULT false,
    "registered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_master_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "student_id" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "password_hash" TEXT,
    "google_id" TEXT,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "points" INTEGER NOT NULL DEFAULT 0,
    "total_co2_saved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eco_actions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "ActionType" NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "points_awarded" INTEGER NOT NULL DEFAULT 0,
    "co2_saved_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "image_object_key" TEXT NOT NULL,
    "thumbnail_object_key" TEXT,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "p_hash" TEXT NOT NULL,
    "d_hash" TEXT NOT NULL,
    "a_hash" TEXT NOT NULL,
    "color_histogram" DOUBLE PRECISION[],
    "similarity_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "suspicious_reason" TEXT,
    "ai_verified" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ai_summary_thai" TEXT,
    "ai_detected_objects" TEXT[],
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "commute_window_key" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eco_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "reference_id" TEXT,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reward_item_id" TEXT NOT NULL,
    "cost_at_purchase" INTEGER NOT NULL,
    "redemption_code" TEXT NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "trigger_threshold" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "user_id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_id","badge_id")
);

-- CreateTable
CREATE TABLE "map_pins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "PinType" NOT NULL,
    "status" "PinStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "image_url" TEXT,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "payload" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "students_master_grade_level_classroom_idx" ON "students_master"("grade_level", "classroom");

-- CreateIndex
CREATE UNIQUE INDEX "users_student_id_key" ON "users"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_points_idx" ON "users"("points" DESC);

-- CreateIndex
CREATE INDEX "users_total_co2_saved_idx" ON "users"("total_co2_saved" DESC);

-- CreateIndex
CREATE INDEX "eco_actions_user_id_created_at_idx" ON "eco_actions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "eco_actions_status_created_at_idx" ON "eco_actions"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "eco_actions_d_hash_idx" ON "eco_actions"("d_hash");

-- CreateIndex
CREATE INDEX "eco_actions_p_hash_idx" ON "eco_actions"("p_hash");

-- CreateIndex
CREATE UNIQUE INDEX "eco_actions_user_id_commute_window_key_key" ON "eco_actions"("user_id", "commute_window_key");

-- CreateIndex
CREATE INDEX "point_transactions_user_id_created_at_idx" ON "point_transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "point_transactions_type_idx" ON "point_transactions"("type");

-- CreateIndex
CREATE UNIQUE INDEX "redemptions_redemption_code_key" ON "redemptions"("redemption_code");

-- CreateIndex
CREATE INDEX "redemptions_user_id_created_at_idx" ON "redemptions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "redemptions_status_idx" ON "redemptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "badges_code_key" ON "badges"("code");

-- CreateIndex
CREATE INDEX "map_pins_status_idx" ON "map_pins"("status");

-- CreateIndex
CREATE INDEX "map_pins_type_idx" ON "map_pins"("type");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students_master"("student_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eco_actions" ADD CONSTRAINT "eco_actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eco_actions" ADD CONSTRAINT "eco_actions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_reward_item_id_fkey" FOREIGN KEY ("reward_item_id") REFERENCES "reward_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_pins" ADD CONSTRAINT "map_pins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_pins" ADD CONSTRAINT "map_pins_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
