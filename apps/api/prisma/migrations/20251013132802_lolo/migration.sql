-- AlterEnum
ALTER TYPE "ParcelStatus" ADD VALUE 'MINTED';

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "parcelId" TEXT,
    "loanId" TEXT,
    "message" TEXT,
    "messageType" TEXT NOT NULL DEFAULT 'TEXT',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_messages_senderId_idx" ON "chat_messages"("senderId");

-- CreateIndex
CREATE INDEX "chat_messages_parcelId_idx" ON "chat_messages"("parcelId");

-- CreateIndex
CREATE INDEX "chat_messages_loanId_idx" ON "chat_messages"("loanId");

-- CreateIndex
CREATE INDEX "chat_messages_createdAt_idx" ON "chat_messages"("createdAt");

-- CreateIndex
CREATE INDEX "p2p_loans_borrowerId_idx" ON "p2p_loans"("borrowerId");

-- CreateIndex
CREATE INDEX "p2p_loans_lenderId_idx" ON "p2p_loans"("lenderId");

-- CreateIndex
CREATE INDEX "parcels_ownerId_idx" ON "parcels"("ownerId");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "p2p_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
