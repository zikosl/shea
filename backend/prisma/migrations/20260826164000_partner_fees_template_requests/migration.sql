-- Add partner fee rules and product template request workflow.
CREATE TYPE "PartnerFeeType" AS ENUM ('NONE', 'PERCENTAGE', 'FIXED', 'MIXED');
CREATE TYPE "ProductTemplateRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MERGED');

ALTER TABLE "Partner"
  ADD COLUMN "feeType" "PartnerFeeType" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "feeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "fixedFee" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "Order"
  ADD COLUMN "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "partnerGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "partnerFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "partnerNet" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "partnerFeeType" "PartnerFeeType" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "partnerFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "partnerFixedFee" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE "ProductTemplateRequest" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "name_ar" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "product_type_id" INTEGER NOT NULL,
  "brand_id" INTEGER,
  "partnerId" INTEGER NOT NULL,
  "status" "ProductTemplateRequestStatus" NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "adminNote" TEXT,
  "approvedTemplateId" INTEGER,
  "mergedIntoTemplateId" INTEGER,
  "hasOrder" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductTemplateRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductTemplateRequestVariant" (
  "id" SERIAL NOT NULL,
  "requestId" INTEGER NOT NULL,
  "name" TEXT,
  "sku" TEXT,
  "image" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "price" DOUBLE PRECISION,
  "stock" INTEGER,
  CONSTRAINT "ProductTemplateRequestVariant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductTemplateRequest_partnerId_status_idx" ON "ProductTemplateRequest"("partnerId", "status");
CREATE INDEX "ProductTemplateRequest_product_type_id_idx" ON "ProductTemplateRequest"("product_type_id");
CREATE INDEX "ProductTemplateRequest_brand_id_idx" ON "ProductTemplateRequest"("brand_id");

ALTER TABLE "ProductTemplateRequest" ADD CONSTRAINT "ProductTemplateRequest_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductTemplateRequest" ADD CONSTRAINT "ProductTemplateRequest_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductTemplateRequest" ADD CONSTRAINT "ProductTemplateRequest_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductTemplateRequest" ADD CONSTRAINT "ProductTemplateRequest_approvedTemplateId_fkey" FOREIGN KEY ("approvedTemplateId") REFERENCES "ProductTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductTemplateRequestVariant" ADD CONSTRAINT "ProductTemplateRequestVariant_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ProductTemplateRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
