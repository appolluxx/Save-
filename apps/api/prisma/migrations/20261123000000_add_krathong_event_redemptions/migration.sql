-- CreateTable
CREATE TABLE "event_redemptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_key" TEXT NOT NULL,
    "material_type" TEXT NOT NULL,
    "redemption_code" TEXT NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_redemptions_redemption_code_key" ON "event_redemptions"("redemption_code");

-- CreateIndex
CREATE UNIQUE INDEX "event_redemptions_user_id_event_key_key" ON "event_redemptions"("user_id", "event_key");

-- CreateIndex
CREATE INDEX "event_redemptions_status_created_at_idx" ON "event_redemptions"("status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "event_redemptions" ADD CONSTRAINT "event_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
