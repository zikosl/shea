ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CONTRIBUTOR';

CREATE TYPE "CatalogContributionKind" AS ENUM ('BARCODE', 'PRODUCT');
CREATE TYPE "CatalogContributionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "Contributor" (
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Contributor_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "CatalogContribution" (
    "id" TEXT NOT NULL,
    "contributorId" INTEGER NOT NULL,
    "localId" TEXT NOT NULL,
    "kind" "CatalogContributionKind" NOT NULL,
    "status" "CatalogContributionStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatalogContribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogContribution_contributorId_localId_key" ON "CatalogContribution"("contributorId", "localId");
CREATE INDEX "CatalogContribution_status_createdAt_idx" ON "CatalogContribution"("status", "createdAt");
CREATE INDEX "CatalogContribution_contributorId_createdAt_idx" ON "CatalogContribution"("contributorId", "createdAt");

ALTER TABLE "Contributor" ADD CONSTRAINT "Contributor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogContribution" ADD CONSTRAINT "CatalogContribution_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
