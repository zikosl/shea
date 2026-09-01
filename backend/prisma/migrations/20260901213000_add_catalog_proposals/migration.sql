CREATE TYPE "CatalogProposalEntityType" AS ENUM ('CATEGORY', 'PRODUCT_TYPE');
CREATE TYPE "CatalogProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'MERGED', 'REJECTED');

ALTER TABLE "Product" ADD COLUMN "trackInventory" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ProductTemplateRequest" ALTER COLUMN "category_id" DROP NOT NULL;
ALTER TABLE "ProductTemplateRequest" ADD COLUMN "categoryProposalId" TEXT;
ALTER TABLE "ProductTemplateRequest" ADD COLUMN "productTypeProposalId" TEXT;

CREATE TABLE "CatalogProposal" (
  "id" TEXT NOT NULL,
  "partnerId" INTEGER NOT NULL,
  "deviceId" TEXT,
  "localId" TEXT NOT NULL,
  "entityType" "CatalogProposalEntityType" NOT NULL,
  "status" "CatalogProposalStatus" NOT NULL DEFAULT 'PENDING',
  "name" TEXT NOT NULL,
  "name_ar" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "image" TEXT,
  "nicheId" INTEGER NOT NULL,
  "categoryId" INTEGER,
  "parentProposalId" TEXT,
  "resolvedCategoryId" INTEGER,
  "resolvedProductTypeId" INTEGER,
  "rejectionReason" TEXT,
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "CatalogProposal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogProposal_partnerId_localId_key" ON "CatalogProposal"("partnerId", "localId");
CREATE INDEX "CatalogProposal_partnerId_status_createdAt_idx" ON "CatalogProposal"("partnerId", "status", "createdAt");
CREATE INDEX "CatalogProposal_entityType_status_createdAt_idx" ON "CatalogProposal"("entityType", "status", "createdAt");
CREATE INDEX "CatalogProposal_parentProposalId_idx" ON "CatalogProposal"("parentProposalId");

ALTER TABLE "CatalogProposal" ADD CONSTRAINT "CatalogProposal_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogProposal" ADD CONSTRAINT "CatalogProposal_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CatalogProposal" ADD CONSTRAINT "CatalogProposal_nicheId_fkey"
  FOREIGN KEY ("nicheId") REFERENCES "Niche"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogProposal" ADD CONSTRAINT "CatalogProposal_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogProposal" ADD CONSTRAINT "CatalogProposal_parentProposalId_fkey"
  FOREIGN KEY ("parentProposalId") REFERENCES "CatalogProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CatalogProposal" ADD CONSTRAINT "CatalogProposal_resolvedCategoryId_fkey"
  FOREIGN KEY ("resolvedCategoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogProposal" ADD CONSTRAINT "CatalogProposal_resolvedProductTypeId_fkey"
  FOREIGN KEY ("resolvedProductTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductTemplateRequest" ADD CONSTRAINT "ProductTemplateRequest_categoryProposalId_fkey"
  FOREIGN KEY ("categoryProposalId") REFERENCES "CatalogProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductTemplateRequest" ADD CONSTRAINT "ProductTemplateRequest_productTypeProposalId_fkey"
  FOREIGN KEY ("productTypeProposalId") REFERENCES "CatalogProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
