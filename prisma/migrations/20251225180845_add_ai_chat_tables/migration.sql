-- CreateEnum
CREATE TYPE "public"."AiChatSenderType" AS ENUM ('user', 'assistant');

-- AlterTable
ALTER TABLE "public"."chat" ADD COLUMN     "ai_session_id" UUID,
ADD COLUMN     "from_ai_flow" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."ai_chat_sessions" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "session_id" UUID NOT NULL,
    "summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_active" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ai_chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_chat_messages" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "sender_type" "public"."AiChatSenderType" NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_chat_sessions_session_id_key" ON "public"."ai_chat_sessions"("session_id");

-- CreateIndex
CREATE INDEX "ai_chat_sessions_user_id_idx" ON "public"."ai_chat_sessions"("user_id");

-- CreateIndex
CREATE INDEX "ai_chat_sessions_is_active_idx" ON "public"."ai_chat_sessions"("is_active");

-- CreateIndex
CREATE INDEX "ai_chat_sessions_session_id_idx" ON "public"."ai_chat_sessions"("session_id");

-- CreateIndex
CREATE INDEX "ai_chat_messages_session_id_idx" ON "public"."ai_chat_messages"("session_id");

-- CreateIndex
CREATE INDEX "ai_chat_messages_created_at_idx" ON "public"."ai_chat_messages"("created_at");

-- AddForeignKey
ALTER TABLE "public"."ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."ai_chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
