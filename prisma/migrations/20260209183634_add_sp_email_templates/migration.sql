-- CreateTable
CREATE TABLE "public"."sp_email_templates" (
    "id" SERIAL NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "first_message_template" TEXT,
    "job_accepted_subject" TEXT,
    "job_accepted_body" TEXT,
    "negotiation_subject" TEXT,
    "negotiation_body" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sp_email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sp_email_templates_provider_id_key" ON "public"."sp_email_templates"("provider_id");

-- AddForeignKey
ALTER TABLE "public"."sp_email_templates" ADD CONSTRAINT "sp_email_templates_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
