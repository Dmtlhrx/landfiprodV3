/*
  # Initial Hedera Africa Database Schema
  
  1. New Tables
    - `users` - User accounts with Hedera wallet integration
      - `id` (cuid, primary key)
      - `email` (text, unique)
      - `passwordHash` (text)
      - `displayName` (text)
      - `walletHedera` (text, unique, optional)
      - `role` (enum: USER, ADMIN)
      - `did` (text, optional) - Decentralized Identity
      - `createdAt` (timestamptz)
      - `updatedAt` (timestamptz)
    
    - `parcels` - Land parcels for tokenization
      - `id` (cuid, primary key)  
      - `ownerId` (text, foreign key to users)
      - `title` (text)
      - `description` (text, optional)
      - `latitude` (float)
      - `longitude` (float) 
      - `areaM2` (integer) - Area in square meters
      - `docUrl` (text, optional) - Document URL
      - `htsTokenId` (text, optional) - Hedera Token Service ID
      - `priceUsd` (integer, optional)
      - `status` (enum: DRAFT, LISTED, SOLD, COLLATERALIZED)
      - `createdAt` (timestamptz)
      - `updatedAt` (timestamptz)
    
    - `loans` - DeFi loan contracts using NFT collateral
      - `id` (cuid, primary key)
      - `borrowerId` (text, foreign key to users)
      - `parcelId` (text, foreign key to parcels)
      - `principalUsd` (integer) - Loan amount in USD
      - `ltvBps` (integer) - Loan-to-value in basis points
      - `rateAprBps` (integer) - APR in basis points
      - `status` (enum: PENDING, ACTIVE, REPAID, LIQUIDATED)
      - `createdAt` (timestamptz)
      - `updatedAt` (timestamptz)
    
    - `activities` - Activity feed for HCS integration
      - `id` (cuid, primary key)
      - `parcelId` (text, foreign key to parcels)
      - `type` (text) - Activity type
      - `ref` (text, optional) - Transaction reference
      - `metadata` (jsonb, optional) - Additional data
      - `createdAt` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Admin users can access all data

  3. Indexes
    - Add indexes for frequently queried columns
    - Optimize for dashboard queries and marketplace filtering
*/

-- Create custom types
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "ParcelStatus" AS ENUM ('DRAFT', 'LISTED', 'SOLD', 'COLLATERALIZED');
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'ACTIVE', 'REPAID', 'LIQUIDATED');

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "walletHedera" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "did" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create parcels table
CREATE TABLE IF NOT EXISTS "parcels" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parcels_pkey" PRIMARY KEY ("id")
);

-- Create loans table
CREATE TABLE IF NOT EXISTS "loans" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "principalUsd" INTEGER NOT NULL,
    "ltvBps" INTEGER NOT NULL,
    "rateAprBps" INTEGER NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- Create activities table
CREATE TABLE IF NOT EXISTS "activities" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ref" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_walletHedera_key" ON "users"("walletHedera");
CREATE INDEX IF NOT EXISTS "parcels_ownerId_idx" ON "parcels"("ownerId");
CREATE INDEX IF NOT EXISTS "parcels_status_idx" ON "parcels"("status");
CREATE INDEX IF NOT EXISTS "parcels_location_idx" ON "parcels"("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "loans_borrowerId_idx" ON "loans"("borrowerId");
CREATE INDEX IF NOT EXISTS "loans_parcelId_idx" ON "loans"("parcelId");
CREATE INDEX IF NOT EXISTS "activities_parcelId_idx" ON "activities"("parcelId");
CREATE INDEX IF NOT EXISTS "activities_createdAt_idx" ON "activities"("createdAt");

-- Add foreign key constraints
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loans" ADD CONSTRAINT "loans_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable Row Level Security
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "parcels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "loans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data" ON "users"
    FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own data" ON "users"
    FOR UPDATE USING (auth.uid()::text = id);

-- RLS Policies for parcels table
CREATE POLICY "Users can read all parcels" ON "parcels"
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create own parcels" ON "parcels"
    FOR INSERT WITH CHECK (auth.uid()::text = "ownerId");

CREATE POLICY "Users can update own parcels" ON "parcels"
    FOR UPDATE USING (auth.uid()::text = "ownerId");

-- RLS Policies for loans table
CREATE POLICY "Users can read own loans" ON "loans"
    FOR SELECT USING (auth.uid()::text = "borrowerId");

CREATE POLICY "Users can create own loans" ON "loans"
    FOR INSERT WITH CHECK (auth.uid()::text = "borrowerId");

CREATE POLICY "Users can update own loans" ON "loans"
    FOR UPDATE USING (auth.uid()::text = "borrowerId");

-- RLS Policies for activities table
CREATE POLICY "Users can read parcel activities" ON "activities"
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM parcels 
            WHERE parcels.id = activities."parcelId"
        )
    );

-- Admin policies (can access everything)
CREATE POLICY "Admins can read all users" ON "users"
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'ADMIN'
        )
    );

CREATE POLICY "Admins can read all parcels" ON "parcels"
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'ADMIN'
        )
    );

CREATE POLICY "Admins can read all loans" ON "loans"
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role = 'ADMIN'
        )
    );