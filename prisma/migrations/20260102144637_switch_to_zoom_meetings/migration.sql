/*
  Warnings:

  - You are about to drop the column `conference_id` on the `meetings` table. All the data in the column will be lost.
  - You are about to drop the column `google_event_id` on the `meetings` table. All the data in the column will be lost.
  - You are about to drop the column `meet_link` on the `meetings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[zoom_meeting_id]` on the table `meetings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `zoom_join_url` to the `meetings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `zoom_meeting_id` to the `meetings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `zoom_start_url` to the `meetings` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."meetings_google_event_id_idx";

-- DropIndex
DROP INDEX "public"."meetings_google_event_id_key";

-- AlterTable
ALTER TABLE "public"."meetings" DROP COLUMN "conference_id",
DROP COLUMN "google_event_id",
DROP COLUMN "meet_link",
ADD COLUMN     "zoom_join_url" TEXT NOT NULL,
ADD COLUMN     "zoom_meeting_id" TEXT NOT NULL,
ADD COLUMN     "zoom_start_url" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "meetings_zoom_meeting_id_key" ON "public"."meetings"("zoom_meeting_id");

-- CreateIndex
CREATE INDEX "meetings_zoom_meeting_id_idx" ON "public"."meetings"("zoom_meeting_id");
