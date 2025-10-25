-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ParcelStatus" AS ENUM ('DRAFT', 'LISTED', 'SOLD', 'COLLATERALIZED');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('VERIFIED', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('OPEN', 'FUNDED', 'ACTIVE', 'REPAID', 'DEFAULTED', 'LIQUIDATED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EndorsementType" AS ENUM ('TRUSTWORTHY', 'RELIABLE_BORROWER', 'FAIR_LENDER', 'LAND_EXPERT', 'COMMUNITY_MEMBER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "walletHedera" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "did" TEXT,
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "completedLoans" INTEGER NOT NULL DEFAULT 0,
    "defaultedLoans" INTEGER NOT NULL DEFAULT 0,
    "verifiedTransactions" INTEGER NOT NULL DEFAULT 0,
    "communityEndorsements" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcels" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "areaM2" INTEGER NOT NULL,
    "docUrl" TEXT,
    "htsTokenId" TEXT,
    "priceUsd" INTEGER,
    "status" "ParcelStatus" NOT NULL DEFAULT 'DRAFT',
    "verificationType" "VerificationType" NOT NULL DEFAULT 'UNVERIFIED',
    "verificationDetails" JSONB,
    "riskAssessment" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "p2p_loans" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "lenderId" TEXT,
    "parcelId" TEXT NOT NULL,
    "principalUsd" INTEGER NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "collateralRatio" DOUBLE PRECISION NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'OPEN',
    "terms" JSONB NOT NULL,
    "repaymentSchedule" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fundedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),

    CONSTRAINT "p2p_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_offers" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "offeredAmount" INTEGER NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "terms" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "endorsements" (
    "id" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "type" "EndorsementType" NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "transactionRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT,
    "loanId" TEXT,
    "type" TEXT NOT NULL,
    "ref" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_walletHedera_key" ON "users"("walletHedera");

-- CreateIndex
CREATE UNIQUE INDEX "endorsements_giverId_receiverId_transactionRef_key" ON "endorsements"("giverId", "receiverId", "transactionRef");

-- AddForeignKey
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "p2p_loans" ADD CONSTRAINT "p2p_loans_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "p2p_loans" ADD CONSTRAINT "p2p_loans_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "p2p_loans" ADD CONSTRAINT "p2p_loans_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_offers" ADD CONSTRAINT "loan_offers_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "p2p_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_offers" ADD CONSTRAINT "loan_offers_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "p2p_loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
