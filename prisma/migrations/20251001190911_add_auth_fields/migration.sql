/*
  Warnings:

  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_login" TIMESTAMP(3),
ADD COLUMN     "password" VARCHAR(255) NOT NULL,
ADD COLUMN     "profile_picture" BYTEA,
ADD COLUMN     "refresh_token" TEXT;
