ALTER TABLE "Variant" ADD COLUMN "barcode" TEXT;
ALTER TABLE "Variant" ADD COLUMN "barcodeSource" TEXT;
ALTER TABLE "Variant" ADD COLUMN "barcodeVerifiedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Variant_barcode_key" ON "Variant"("barcode");

CREATE TYPE "BarcodeCandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TABLE "BarcodeCandidate" (
  "id" TEXT NOT NULL,
  "variantId" INTEGER NOT NULL,
  "barcode" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "sourceName" TEXT,
  "matchScore" INTEGER NOT NULL DEFAULT 0,
  "status" "BarcodeCandidateStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BarcodeCandidate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BarcodeCandidate_variantId_barcode_sourceUrl_key" ON "BarcodeCandidate"("variantId", "barcode", "sourceUrl");
CREATE INDEX "BarcodeCandidate_status_createdAt_idx" ON "BarcodeCandidate"("status", "createdAt");
CREATE INDEX "BarcodeCandidate_variantId_idx" ON "BarcodeCandidate"("variantId");
ALTER TABLE "BarcodeCandidate" ADD CONSTRAINT "BarcodeCandidate_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
