-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('pending', 'verified', 'rejected');

-- AlterTable
ALTER TABLE "public"."service_providers" ADD COLUMN     "business_name" TEXT,
ADD COLUMN     "experience_level" TEXT,
ADD COLUMN     "max_price" DECIMAL(10,2),
ADD COLUMN     "min_price" DECIMAL(10,2),
ADD COLUMN     "terms_accepted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."provider_service_areas" (
    "id" SERIAL NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "zipcode" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_service_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."provider_documents" (
    "id" SERIAL NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'pending',
    "verified_by" INTEGER,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_service_areas_zipcode_idx" ON "public"."provider_service_areas"("zipcode");

-- CreateIndex
CREATE INDEX "provider_service_areas_provider_id_idx" ON "public"."provider_service_areas"("provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_service_areas_provider_id_zipcode_key" ON "public"."provider_service_areas"("provider_id", "zipcode");

-- CreateIndex
CREATE INDEX "provider_documents_provider_id_idx" ON "public"."provider_documents"("provider_id");

-- AddForeignKey
ALTER TABLE "public"."provider_service_areas" ADD CONSTRAINT "provider_service_areas_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."provider_documents" ADD CONSTRAINT "provider_documents_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
