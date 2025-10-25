-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
