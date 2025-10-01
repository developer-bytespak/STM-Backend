-- CreateEnum
CREATE TYPE "public"."RetentionStatus" AS ENUM ('new', 'returning', 'churned');

-- CreateEnum
CREATE TYPE "public"."ProviderTier" AS ENUM ('Bronze', 'Silver', 'Gold', 'PESP');

-- CreateEnum
CREATE TYPE "public"."ProviderStatus" AS ENUM ('active', 'inactive', 'banned');

-- CreateEnum
CREATE TYPE "public"."LSMStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."PaymentType" AS ENUM ('service_job', 'office_booking');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('credit_card', 'bank_transfer', 'paypal');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('Unpaid', 'Paid');

-- CreateEnum
CREATE TYPE "public"."RefundReason" AS ENUM ('customer_request', 'provider_cancel', 'dispute', 'error');

-- CreateEnum
CREATE TYPE "public"."RefundStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "public"."OfficeSpaceStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('Booked', 'Cancelled', 'Completed');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('text', 'image', 'document');

-- CreateEnum
CREATE TYPE "public"."CallStatus" AS ENUM ('completed', 'busy', 'no_answer', 'failed');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('job', 'payment', 'message', 'system', 'rating', 'feedback');

-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('in_app', 'email', 'sms');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('customer', 'service_provider', 'local_service_manager', 'admin');

-- CreateEnum
CREATE TYPE "public"."ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "public"."SenderType" AS ENUM ('customer', 'service_provider', 'local_service_manager', 'admin');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(15) NOT NULL,
    "role" "public"."Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_retention_metrics" (
    "id" UUID NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "first_job_date" TIMESTAMP(6) NOT NULL,
    "last_job_date" TIMESTAMP(6),
    "total_jobs" INTEGER NOT NULL DEFAULT 0,
    "total_spent" DECIMAL(12,2) DEFAULT 0.00,
    "retention_status" "public"."RetentionStatus" NOT NULL DEFAULT 'new',
    "days_since_last_job" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_retention_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_providers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "experience" INTEGER NOT NULL,
    "Description" TEXT,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "tier" "public"."ProviderTier" NOT NULL DEFAULT 'Bronze',
    "location" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" "public"."ProviderStatus" NOT NULL DEFAULT 'active',
    "lsm_id" INTEGER NOT NULL,
    "earning" DECIMAL(10,2) DEFAULT 0.00,
    "total_jobs" INTEGER DEFAULT 0,

    CONSTRAINT "service_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."local_service_managers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "region" VARCHAR(255) NOT NULL,
    "status" "public"."LSMStatus" NOT NULL DEFAULT 'active',
    "closed_deals_count" INTEGER DEFAULT 0,
    "earnings" DECIMAL(10,2) DEFAULT 0.00,

    CONSTRAINT "local_service_managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admin" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "churn_threshold" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."jobs" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "description" VARCHAR(255),
    "status" "public"."JobStatus" NOT NULL DEFAULT 'pending',
    "service_id" INTEGER,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "price" DECIMAL(10,2) NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "visit_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ratings_feedback" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "rating" INTEGER DEFAULT 0,
    "feedback" TEXT NOT NULL,
    "punctuality_rating" INTEGER DEFAULT 0,
    "response_time" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."performance_metrics" (
    "id" SERIAL NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "job_count" INTEGER DEFAULT 0,
    "avg_rating" DECIMAL(3,2) DEFAULT 0.00,
    "punctuality_score" DECIMAL(3,2) DEFAULT 0.00,
    "avg_response_time" DECIMAL(5,2) DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" SERIAL NOT NULL,
    "office_id" INTEGER,
    "job_id" INTEGER,
    "payment_type" "public"."PaymentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" "public"."PaymentMethod" NOT NULL,
    "payment_status" "public"."PaymentStatus" NOT NULL DEFAULT 'pending',
    "payment_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "invoice_id" SERIAL NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "pay_date" TIMESTAMP(3),
    "invoice_status" "public"."InvoiceStatus" NOT NULL DEFAULT 'Unpaid',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "public"."refunds" (
    "refund_id" UUID NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "refund_reason" "public"."RefundReason",
    "reason_description" TEXT,
    "status" "public"."RefundStatus" NOT NULL DEFAULT 'pending',
    "processed_by" INTEGER,
    "processed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("refund_id")
);

-- CreateTable
CREATE TABLE "public"."LSM_logs" (
    "id" SERIAL NOT NULL,
    "lsm_id" INTEGER NOT NULL,
    "action_type" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LSM_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."office_spaces" (
    "id" SERIAL NOT NULL,
    "Owner_name" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "size" VARCHAR(255) NOT NULL,
    "region" VARCHAR(255) NOT NULL,
    "status" "public"."OfficeSpaceStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "office_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."office_bookings" (
    "booking_id" SERIAL NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "office_id" INTEGER NOT NULL,
    "booking_from" TIMESTAMP(3) NOT NULL,
    "booking_until" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'Booked',

    CONSTRAINT "office_bookings_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "public"."market_data" (
    "id" SERIAL NOT NULL,
    "region" VARCHAR(255) NOT NULL,
    "service_id" INTEGER NOT NULL,
    "average_price" DECIMAL(10,2) NOT NULL,
    "demand_trend" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat" (
    "id" UUID NOT NULL,
    "job_id" INTEGER,
    "customer_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "lsm_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "message_id" UUID NOT NULL,
    "chat_id" UUID NOT NULL,
    "sender_type" "public"."SenderType" NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "message" TEXT,
    "file" BYTEA,
    "message_type" "public"."MessageType" NOT NULL DEFAULT 'text',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "public"."call_logs" (
    "call_id" UUID NOT NULL,
    "job_id" INTEGER,
    "call_sid" VARCHAR(100),
    "call_duration" INTEGER NOT NULL DEFAULT 0,
    "call_status" "public"."CallStatus" NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("call_id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "notification_id" UUID NOT NULL,
    "recipient_type" "public"."SenderType" NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "notification_type" "public"."NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "channel" "public"."NotificationChannel" NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "public"."services" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_by" INTEGER NOT NULL,
    "approved_by" INTEGER,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."provider_services" (
    "provider_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "min_price" INTEGER,
    "max_price" INTEGER,

    CONSTRAINT "provider_services_pkey" PRIMARY KEY ("provider_id","service_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_key" ON "public"."customers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_providers_user_id_key" ON "public"."service_providers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "local_service_managers_user_id_key" ON "public"."local_service_managers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_id_key" ON "public"."admin"("user_id");

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_retention_metrics" ADD CONSTRAINT "customer_retention_metrics_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_providers" ADD CONSTRAINT "service_providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_providers" ADD CONSTRAINT "service_providers_lsm_id_fkey" FOREIGN KEY ("lsm_id") REFERENCES "public"."local_service_managers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."local_service_managers" ADD CONSTRAINT "local_service_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admin" ADD CONSTRAINT "admin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."jobs" ADD CONSTRAINT "jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."jobs" ADD CONSTRAINT "jobs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."jobs" ADD CONSTRAINT "jobs_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ratings_feedback" ADD CONSTRAINT "ratings_feedback_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ratings_feedback" ADD CONSTRAINT "ratings_feedback_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_metrics" ADD CONSTRAINT "performance_metrics_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "public"."office_spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."local_service_managers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LSM_logs" ADD CONSTRAINT "LSM_logs_lsm_id_fkey" FOREIGN KEY ("lsm_id") REFERENCES "public"."local_service_managers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."office_bookings" ADD CONSTRAINT "office_bookings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."office_bookings" ADD CONSTRAINT "office_bookings_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "public"."office_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."market_data" ADD CONSTRAINT "market_data_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat" ADD CONSTRAINT "chat_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat" ADD CONSTRAINT "chat_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat" ADD CONSTRAINT "chat_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat" ADD CONSTRAINT "chat_lsm_id_fkey" FOREIGN KEY ("lsm_id") REFERENCES "public"."local_service_managers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."call_logs" ADD CONSTRAINT "call_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."services" ADD CONSTRAINT "services_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."services" ADD CONSTRAINT "services_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."local_service_managers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."provider_services" ADD CONSTRAINT "provider_services_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."provider_services" ADD CONSTRAINT "provider_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
