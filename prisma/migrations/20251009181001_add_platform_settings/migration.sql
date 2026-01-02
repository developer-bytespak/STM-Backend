-- CreateTable
CREATE TABLE "public"."platform_settings" (
    "id" SERIAL NOT NULL,
    "response_deadline_mins" INTEGER NOT NULL DEFAULT 60,
    "warning_threshold" INTEGER NOT NULL DEFAULT 3,
    "popularity_threshold" INTEGER NOT NULL DEFAULT 10,
    "cancellation_fee_percentage" DECIMAL(5,2) NOT NULL DEFAULT 25,
    "default_in_person_visit_cost" DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_settings_created_at_idx" ON "public"."platform_settings"("created_at");
