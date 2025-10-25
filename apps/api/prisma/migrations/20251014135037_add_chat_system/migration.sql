/*
  Warnings:

  - You are about to drop the column `loanId` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `parcelId` on the `chat_messages` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('ADMIN', 'MODERATOR', 'MEMBER', 'GUEST');

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_loanId_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_parcelId_fkey";

-- DropIndex
DROP INDEX "chat_messages_loanId_idx";

-- DropIndex
DROP INDEX "chat_messages_parcelId_idx";

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "loanId",
DROP COLUMN "message",
DROP COLUMN "parcelId",
ADD COLUMN     "content" TEXT,
ADD COLUMN     "conversationId" TEXT NOT NULL DEFAULT 'default_conversation',
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "reactions" JSONB,
ADD COLUMN     "replyToId" TEXT;

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" TEXT NOT NULL,
    "type" "ChatType" NOT NULL DEFAULT 'GROUP',
    "name" TEXT,
    "parcelId" TEXT,
    "loanId" TEXT,
    "createdBy" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_participants" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL DEFAULT 'default_conversation',
    "userId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "lastReadAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_events" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL DEFAULT 'default_conversation',
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_conversations_parcelId_idx" ON "chat_conversations"("parcelId");

-- CreateIndex
CREATE INDEX "chat_conversations_loanId_idx" ON "chat_conversations"("loanId");

-- CreateIndex
CREATE INDEX "chat_conversations_type_idx" ON "chat_conversations"("type");

-- CreateIndex
CREATE INDEX "chat_participants_userId_idx" ON "chat_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_participants_conversationId_userId_key" ON "chat_participants"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "chat_events_conversationId_userId_idx" ON "chat_events"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "chat_events_expiresAt_idx" ON "chat_events"("expiresAt");

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_idx" ON "chat_messages"("conversationId");

-- CreateIndex
CREATE INDEX "chat_messages_replyToId_idx" ON "chat_messages"("replyToId");

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "p2p_loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
