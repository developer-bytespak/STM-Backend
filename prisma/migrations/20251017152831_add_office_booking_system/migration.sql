-- CreateEnum
CREATE TYPE "public"."OfficeStatus" AS ENUM ('available', 'occupied', 'booked', 'maintenance');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- CreateTable
CREATE TABLE "public"."office_spaces" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'private_office',
    "status" "public"."OfficeStatus" NOT NULL DEFAULT 'available',
    "address" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(50) NOT NULL,
    "zip_code" VARCHAR(10) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "area_sqft" INTEGER NOT NULL,
    "daily_price" DECIMAL(10,2) NOT NULL,
    "availability" JSONB NOT NULL DEFAULT '{}',
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "reviews_count" INTEGER NOT NULL DEFAULT 0,
    "total_bookings" INTEGER NOT NULL DEFAULT 0,
    "images" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,

    CONSTRAINT "office_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."office_bookings" (
    "id" UUID NOT NULL,
    "office_space_id" UUID NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "office_name" VARCHAR(255) NOT NULL,
    "provider_name" VARCHAR(255) NOT NULL,
    "provider_email" VARCHAR(255) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "duration_type" VARCHAR(50) NOT NULL DEFAULT 'daily',
    "daily_rate" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'pending',
    "payment_status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "payment_method" VARCHAR(100),
    "transaction_id" VARCHAR(255),
    "special_requests" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "office_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "office_spaces_status_idx" ON "public"."office_spaces"("status");

-- CreateIndex
CREATE INDEX "office_spaces_city_idx" ON "public"."office_spaces"("city");

-- CreateIndex
CREATE INDEX "office_bookings_office_space_id_idx" ON "public"."office_bookings"("office_space_id");

-- CreateIndex
CREATE INDEX "office_bookings_provider_id_idx" ON "public"."office_bookings"("provider_id");

-- CreateIndex
CREATE INDEX "office_bookings_status_idx" ON "public"."office_bookings"("status");

-- AddForeignKey
ALTER TABLE "public"."office_spaces" ADD CONSTRAINT "office_spaces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."office_bookings" ADD CONSTRAINT "office_bookings_office_space_id_fkey" FOREIGN KEY ("office_space_id") REFERENCES "public"."office_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."office_bookings" ADD CONSTRAINT "office_bookings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
