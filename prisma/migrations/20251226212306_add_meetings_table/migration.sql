-- CreateEnum
CREATE TYPE "public"."MeetingStatus" AS ENUM ('pending', 'scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show');

-- CreateTable
CREATE TABLE "public"."meetings" (
    "id" UUID NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "lsm_id" INTEGER NOT NULL,
    "provider_email" TEXT,
    "provider_business_name" TEXT,
    "google_event_id" TEXT NOT NULL,
    "meet_link" TEXT NOT NULL,
    "conference_id" TEXT,
    "scheduled_start" TIMESTAMP(3) NOT NULL,
    "scheduled_end" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "email_sent_at" TIMESTAMP(3),
    "email_status" TEXT DEFAULT 'pending',
    "meeting_status" "public"."MeetingStatus" NOT NULL DEFAULT 'pending',
    "title" TEXT,
    "meeting_description" TEXT,
    "is_rescheduled" BOOLEAN NOT NULL DEFAULT false,
    "rescheduled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meetings_google_event_id_key" ON "public"."meetings"("google_event_id");

-- CreateIndex
CREATE INDEX "meetings_provider_id_idx" ON "public"."meetings"("provider_id");

-- CreateIndex
CREATE INDEX "meetings_lsm_id_idx" ON "public"."meetings"("lsm_id");

-- CreateIndex
CREATE INDEX "meetings_google_event_id_idx" ON "public"."meetings"("google_event_id");

-- CreateIndex
CREATE INDEX "meetings_meeting_status_idx" ON "public"."meetings"("meeting_status");

-- CreateIndex
CREATE INDEX "meetings_scheduled_start_idx" ON "public"."meetings"("scheduled_start");

-- AddForeignKey
ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_lsm_id_fkey" FOREIGN KEY ("lsm_id") REFERENCES "public"."local_service_managers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
