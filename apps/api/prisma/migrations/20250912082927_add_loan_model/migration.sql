-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "principalUsd" DOUBLE PRECISION NOT NULL,
    "ltvBps" INTEGER NOT NULL,
    "rateAprBps" INTEGER NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
