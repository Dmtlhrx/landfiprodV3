-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_conversationId_fkey";

-- AlterTable
ALTER TABLE "chat_messages" ALTER COLUMN "conversationId" DROP NOT NULL,
ALTER COLUMN "conversationId" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
