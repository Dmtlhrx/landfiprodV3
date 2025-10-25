-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'VERIFIED', 'FAILED', 'SUSPICIOUS');

-- CreateEnum
CREATE TYPE "DocumentRiskLevel" AS ENUM ('UNKNOWN', 'VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "extractedEntities" JSONB,
ADD COLUMN     "findings" JSONB,
ADD COLUMN     "riskLevel" "DocumentRiskLevel" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "riskScore" INTEGER,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "documents_verificationStatus_idx" ON "documents"("verificationStatus");

-- CreateIndex
CREATE INDEX "documents_riskLevel_idx" ON "documents"("riskLevel");
