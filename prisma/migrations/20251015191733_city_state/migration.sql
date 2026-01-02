-- AlterTable
ALTER TABLE "public"."customers" ADD COLUMN     "city" TEXT,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "public"."service_providers" ADD COLUMN     "city" TEXT,
ADD COLUMN     "state" TEXT;
