-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('pending', 'received', 'disputed');

-- AlterTable
ALTER TABLE "public"."jobs" ADD COLUMN     "edited_answers" JSONB,
ADD COLUMN     "sp_accepted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "method" TEXT,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'pending',
    "marked_by" INTEGER,
    "marked_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_job_id_key" ON "public"."payments"("job_id");

-- CreateIndex
CREATE INDEX "payments_job_id_idx" ON "public"."payments"("job_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "public"."payments"("status");

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
