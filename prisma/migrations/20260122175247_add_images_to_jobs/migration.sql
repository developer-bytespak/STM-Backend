-- AlterTable
ALTER TABLE "public"."jobs" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
