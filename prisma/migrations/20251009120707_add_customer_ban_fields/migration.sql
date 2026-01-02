/*
  Warnings:

  - Added the required column `region` to the `customers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."customers" ADD COLUMN     "ban_reason" TEXT,
ADD COLUMN     "banned_at" TIMESTAMP(3),
ADD COLUMN     "region" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';
