-- DropIndex
DROP INDEX "public"."disputes_job_id_key";

-- AlterTable
ALTER TABLE "public"."chat" ADD COLUMN     "lsm_invited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lsm_joined" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lsm_joined_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."ban_requests" (
    "id" SERIAL NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "requested_by_lsm" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "admin_reviewed_by" INTEGER,
    "admin_reviewed_at" TIMESTAMP(3),
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ban_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ban_requests_provider_id_idx" ON "public"."ban_requests"("provider_id");

-- CreateIndex
CREATE INDEX "ban_requests_status_idx" ON "public"."ban_requests"("status");

-- CreateIndex
CREATE INDEX "disputes_job_id_idx" ON "public"."disputes"("job_id");

-- AddForeignKey
ALTER TABLE "public"."ban_requests" ADD CONSTRAINT "ban_requests_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
