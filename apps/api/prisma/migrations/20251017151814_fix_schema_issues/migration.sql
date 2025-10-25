-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_conversationId_fkey";

-- AlterTable
ALTER TABLE "chat_events" ALTER COLUMN "conversationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "chat_participants" ALTER COLUMN "conversationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "aiVerification" JSONB,
ADD COLUMN     "confidenceScore" INTEGER,
ADD COLUMN     "isAuthentic" BOOLEAN,
ADD COLUMN     "manipulationDetected" BOOLEAN DEFAULT false,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ai_verification_logs" (
    "id" TEXT NOT NULL,
    "documentId" TEXT,
    "userId" TEXT NOT NULL,
    "isAuthentic" BOOLEAN NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "manipulationDetected" BOOLEAN NOT NULL,
    "findings" JSONB NOT NULL,
    "risks" JSONB NOT NULL,
    "extractedData" JSONB NOT NULL,
    "technicalDetails" JSONB NOT NULL,
    "filename" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_verification_logs_userId_idx" ON "ai_verification_logs"("userId");

-- CreateIndex
CREATE INDEX "ai_verification_logs_isAuthentic_idx" ON "ai_verification_logs"("isAuthentic");

-- CreateIndex
CREATE INDEX "ai_verification_logs_manipulationDetected_idx" ON "ai_verification_logs"("manipulationDetected");

-- CreateIndex
CREATE INDEX "ai_verification_logs_createdAt_idx" ON "ai_verification_logs"("createdAt");

-- CreateIndex
CREATE INDEX "documents_parcelId_idx" ON "documents"("parcelId");

-- CreateIndex
CREATE INDEX "documents_isAuthentic_idx" ON "documents"("isAuthentic");

-- CreateIndex
CREATE INDEX "documents_manipulationDetected_idx" ON "documents"("manipulationDetected");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_verification_logs" ADD CONSTRAINT "ai_verification_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
