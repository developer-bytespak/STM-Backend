/*
  Warnings:

  - The `status` column on the `customers` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."CustomerStatus" AS ENUM ('active', 'banned', 'suspended');

-- AlterTable
ALTER TABLE "public"."customers" DROP COLUMN "status",
ADD COLUMN     "status" "public"."CustomerStatus" NOT NULL DEFAULT 'active';
