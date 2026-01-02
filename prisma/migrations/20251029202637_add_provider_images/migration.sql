-- AlterTable
ALTER TABLE "public"."service_providers" ADD COLUMN     "banner_url" TEXT,
ADD COLUMN     "gallery_images" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "logo_url" TEXT;
