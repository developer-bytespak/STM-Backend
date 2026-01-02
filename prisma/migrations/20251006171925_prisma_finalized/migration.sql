/*
  Warnings:

  - The values [rejected] on the enum `JobStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `channel` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `service_providersId` on the `ratings_feedback` table. All the data in the column will be lost.
  - You are about to drop the column `approved_by` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `services` table. All the data in the column will be lost.
  - Added the required column `provider_id` to the `ratings_feedback` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."DisputeStatus" AS ENUM ('pending', 'resolved');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."JobStatus_new" AS ENUM ('new', 'in_progress', 'completed', 'cancelled', 'paid', 'rejected_by_sp');
ALTER TABLE "public"."jobs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."jobs" ALTER COLUMN "status" TYPE "public"."JobStatus_new" USING ("status"::text::"public"."JobStatus_new");
ALTER TYPE "public"."JobStatus" RENAME TO "JobStatus_old";
ALTER TYPE "public"."JobStatus_new" RENAME TO "JobStatus";
DROP TYPE "public"."JobStatus_old";
ALTER TABLE "public"."jobs" ALTER COLUMN "status" SET DEFAULT 'new';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."ratings_feedback" DROP CONSTRAINT "ratings_feedback_service_providersId_fkey";

-- DropForeignKey
ALTER TABLE "public"."services" DROP CONSTRAINT "services_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."services" DROP CONSTRAINT "services_created_by_fkey";

-- AlterTable
ALTER TABLE "public"."chat" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" INTEGER,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."jobs" ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "pending_approval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "response_deadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."notifications" DROP COLUMN "channel";

-- AlterTable
ALTER TABLE "public"."ratings_feedback" DROP COLUMN "service_providersId",
ADD COLUMN     "provider_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."service_providers" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "warnings" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."services" DROP COLUMN "approved_by",
DROP COLUMN "created_by",
ALTER COLUMN "status" SET DEFAULT 'approved';

-- DropEnum
DROP TYPE "public"."NotificationChannel";

-- CreateTable
CREATE TABLE "public"."disputes" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "raised_by_type" "public"."SenderType" NOT NULL,
    "status" "public"."DisputeStatus" NOT NULL DEFAULT 'pending',
    "resolved_by" INTEGER,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_search_logs" (
    "id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "zipcode" TEXT,
    "searched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_requests" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "zipcode" TEXT,
    "region" TEXT,
    "customer_id" INTEGER,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."provider_services" (
    "id" SERIAL NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disputes_job_id_key" ON "public"."disputes"("job_id");

-- CreateIndex
CREATE INDEX "service_search_logs_service_id_region_searched_at_idx" ON "public"."service_search_logs"("service_id", "region", "searched_at");

-- CreateIndex
CREATE UNIQUE INDEX "provider_services_provider_id_service_id_key" ON "public"."provider_services"("provider_id", "service_id");

-- AddForeignKey
ALTER TABLE "public"."ratings_feedback" ADD CONSTRAINT "ratings_feedback_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."disputes" ADD CONSTRAINT "disputes_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_search_logs" ADD CONSTRAINT "service_search_logs_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_requests" ADD CONSTRAINT "service_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."provider_services" ADD CONSTRAINT "provider_services_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."provider_services" ADD CONSTRAINT "provider_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
