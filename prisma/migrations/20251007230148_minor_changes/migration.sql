/*
  Warnings:

  - You are about to drop the column `customer_id` on the `service_requests` table. All the data in the column will be lost.
  - Added the required column `category` to the `service_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider_id` to the `service_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `service_name` to the `service_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `service_requests` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."service_requests" DROP CONSTRAINT "service_requests_customer_id_fkey";

-- AlterTable
ALTER TABLE "public"."service_requests" DROP COLUMN "customer_id",
ADD COLUMN     "admin_approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "admin_rejection_reason" TEXT,
ADD COLUMN     "admin_reviewed_at" TIMESTAMP(3),
ADD COLUMN     "admin_reviewed_by" INTEGER,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "created_service_id" INTEGER,
ADD COLUMN     "customersId" INTEGER,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "final_status" "public"."ApprovalStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "lsm_approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lsm_rejection_reason" TEXT,
ADD COLUMN     "lsm_reviewed_at" TIMESTAMP(3),
ADD COLUMN     "lsm_reviewed_by" INTEGER,
ADD COLUMN     "provider_id" INTEGER NOT NULL,
ADD COLUMN     "questions_json" JSONB,
ADD COLUMN     "service_name" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "keyword" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "service_requests_provider_id_idx" ON "public"."service_requests"("provider_id");

-- CreateIndex
CREATE INDEX "service_requests_final_status_idx" ON "public"."service_requests"("final_status");

-- CreateIndex
CREATE INDEX "services_status_idx" ON "public"."services"("status");

-- CreateIndex
CREATE INDEX "services_category_idx" ON "public"."services"("category");

-- CreateIndex
CREATE INDEX "services_name_idx" ON "public"."services"("name");

-- AddForeignKey
ALTER TABLE "public"."service_requests" ADD CONSTRAINT "service_requests_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_requests" ADD CONSTRAINT "service_requests_created_service_id_fkey" FOREIGN KEY ("created_service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_requests" ADD CONSTRAINT "service_requests_customersId_fkey" FOREIGN KEY ("customersId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
