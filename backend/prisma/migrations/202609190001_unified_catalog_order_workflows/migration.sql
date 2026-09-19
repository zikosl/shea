-- Additive workflow foundation. Existing API fields and foreign keys remain intact.
CREATE TYPE "CatalogSubmissionStatus" AS ENUM ('DRAFT', 'PENDING', 'PARTIALLY_APPROVED', 'APPROVED', 'MERGED', 'REJECTED');
CREATE TYPE "CatalogVisibility" AS ENUM ('INTERNAL', 'PUBLIC');
CREATE TYPE "OrderStatus" AS ENUM ('REQUESTED', 'PARTNER_ACCEPTED', 'PARTNER_REJECTED', 'AWAITING_CLIENT_APPROVAL', 'CONFIRMED', 'PREPARING', 'READY', 'FULFILLMENT_STARTED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "OrderKind" AS ENUM ('STANDARD', 'GIFT', 'DRIVER_REQUEST');
CREATE TYPE "PricingMode" AS ENUM ('FIXED', 'QUOTE_REQUIRED');
CREATE TYPE "OrderRequestKind" AS ENUM ('CUSTOM', 'GIFT', 'PRICE_CONFIRMATION');
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED');

ALTER TYPE "CustomOrderStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED' AFTER 'CONFIRMED';
ALTER TYPE "CustomOrderStatus" ADD VALUE IF NOT EXISTS 'PREPARATION_DUE' AFTER 'SCHEDULED';

ALTER TABLE "CustomOrder"
  ADD COLUMN "requestKind" "OrderRequestKind" NOT NULL DEFAULT 'GIFT',
  ADD COLUMN "proposedFor" TIMESTAMP(3),
  ADD COLUMN "confirmedFor" TIMESTAMP(3),
  ADD COLUMN "preparationStartsAt" TIMESTAMP(3);

ALTER TABLE "GiftQuotation" ADD COLUMN "proposedFor" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "priceOnRequest" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CatalogSubmission" (
  "id" TEXT NOT NULL,
  "partnerId" INTEGER NOT NULL,
  "localId" TEXT,
  "status" "CatalogSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT,
  "adminNote" TEXT,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogSubmission_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CatalogProposal" ADD COLUMN "submissionId" TEXT;
ALTER TABLE "ProductTemplateRequest" ADD COLUMN "submissionId" TEXT;

CREATE TABLE "ProvisionalProduct" (
  "id" TEXT NOT NULL,
  "partnerId" INTEGER NOT NULL,
  "requestVariantId" INTEGER NOT NULL,
  "canonicalProductId" INTEGER,
  "visibility" "CatalogVisibility" NOT NULL DEFAULT 'INTERNAL',
  "name" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL DEFAULT '',
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "costPrice" DOUBLE PRECISION,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "trackInventory" BOOLEAN NOT NULL DEFAULT true,
  "localId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProvisionalProduct_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order"
  ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'REQUESTED',
  ADD COLUMN "kind" "OrderKind" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "pricingMode" "PricingMode" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "readyAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

ALTER TABLE "OrderItem"
  ADD COLUMN "nameSnapshot" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "variantSnapshot" TEXT,
  ADD COLUMN "skuSnapshot" TEXT;

CREATE TABLE "OrderStatusHistory" (
  "id" TEXT NOT NULL,
  "orderId" INTEGER NOT NULL,
  "from" "OrderStatus",
  "to" "OrderStatus" NOT NULL,
  "actorId" INTEGER,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutboxEvent" (
  "id" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderQuotation" (
  "id" TEXT NOT NULL,
  "orderId" INTEGER NOT NULL,
  "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
  "subtotal" DOUBLE PRECISION NOT NULL,
  "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL,
  "validUntil" TIMESTAMP(3),
  "note" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderQuotation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderQuotationLine" (
  "id" TEXT NOT NULL,
  "quotationId" TEXT NOT NULL,
  "orderItemId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "total" DOUBLE PRECISION NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "OrderQuotationLine_pkey" PRIMARY KEY ("id")
);

UPDATE "Order" o
SET "kind" = CASE
  WHEN o."source" = 'GIFT' THEN 'GIFT'::"OrderKind"
  WHEN o."source" = 'DRIVER_REQUEST' THEN 'DRIVER_REQUEST'::"OrderKind"
  ELSE 'STANDARD'::"OrderKind"
END;

UPDATE "Order" o
SET "status" = CASE
  WHEN d."status" = 1 THEN 'PARTNER_ACCEPTED'::"OrderStatus"
  WHEN d."status" = 2 THEN 'READY'::"OrderStatus"
  WHEN d."status" IN (3, 4) THEN 'FULFILLMENT_STARTED'::"OrderStatus"
  WHEN d."status" = 5 THEN 'COMPLETED'::"OrderStatus"
  WHEN d."status" = 6 THEN 'CANCELLED'::"OrderStatus"
  ELSE 'REQUESTED'::"OrderStatus"
END,
"acceptedAt" = CASE WHEN d."status" >= 1 AND d."status" < 6 THEN d."updatedAt" ELSE NULL END,
"readyAt" = CASE WHEN d."status" >= 2 AND d."status" < 6 THEN d."updatedAt" ELSE NULL END,
"completedAt" = CASE WHEN d."status" = 5 THEN d."updatedAt" ELSE NULL END,
"cancelledAt" = CASE WHEN d."status" = 6 THEN d."updatedAt" ELSE NULL END
FROM "Delivery" d
WHERE d."orderId" = o."id";

UPDATE "OrderItem" oi
SET "nameSnapshot" = COALESCE(NULLIF(p."customName", ''), pt."name", ''),
    "variantSnapshot" = v."name",
    "skuSnapshot" = COALESCE(p."vendorSku", v."sku")
FROM "Product" p
JOIN "Variant" v ON v."id" = p."variantId"
JOIN "ProductTemplate" pt ON pt."id" = v."productId"
WHERE oi."productId" = p."id";

INSERT INTO "OrderStatusHistory" ("id", "orderId", "from", "to", "createdAt")
SELECT md5(random()::text || clock_timestamp()::text || o."id"::text), o."id", NULL, o."status", o."createdAt"
FROM "Order" o;

CREATE UNIQUE INDEX "CatalogSubmission_partnerId_localId_key" ON "CatalogSubmission"("partnerId", "localId");
CREATE INDEX "CatalogSubmission_status_createdAt_idx" ON "CatalogSubmission"("status", "createdAt");
CREATE INDEX "CatalogSubmission_partnerId_createdAt_idx" ON "CatalogSubmission"("partnerId", "createdAt");
CREATE INDEX "CatalogProposal_submissionId_idx" ON "CatalogProposal"("submissionId");
CREATE INDEX "ProductTemplateRequest_submissionId_idx" ON "ProductTemplateRequest"("submissionId");
CREATE UNIQUE INDEX "ProvisionalProduct_partnerId_requestVariantId_key" ON "ProvisionalProduct"("partnerId", "requestVariantId");
CREATE UNIQUE INDEX "ProvisionalProduct_partnerId_localId_key" ON "ProvisionalProduct"("partnerId", "localId");
CREATE INDEX "ProvisionalProduct_partnerId_visibility_createdAt_idx" ON "ProvisionalProduct"("partnerId", "visibility", "createdAt");
CREATE INDEX "ProvisionalProduct_canonicalProductId_idx" ON "ProvisionalProduct"("canonicalProductId");
CREATE INDEX "Order_partnerId_status_createdAt_idx" ON "Order"("partnerId", "status", "createdAt");
CREATE INDEX "Order_clientId_status_createdAt_idx" ON "Order"("clientId", "status", "createdAt");
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");
CREATE INDEX "OrderStatusHistory_actorId_createdAt_idx" ON "OrderStatusHistory"("actorId", "createdAt");
CREATE UNIQUE INDEX "OutboxEvent_idempotencyKey_key" ON "OutboxEvent"("idempotencyKey");
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");
CREATE INDEX "OrderQuotation_orderId_createdAt_idx" ON "OrderQuotation"("orderId", "createdAt");
CREATE INDEX "OrderQuotationLine_quotationId_sortOrder_idx" ON "OrderQuotationLine"("quotationId", "sortOrder");
CREATE INDEX "OrderQuotationLine_orderItemId_idx" ON "OrderQuotationLine"("orderItemId");

ALTER TABLE "CatalogSubmission" ADD CONSTRAINT "CatalogSubmission_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogProposal" ADD CONSTRAINT "CatalogProposal_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CatalogSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductTemplateRequest" ADD CONSTRAINT "ProductTemplateRequest_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CatalogSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProvisionalProduct" ADD CONSTRAINT "ProvisionalProduct_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProvisionalProduct" ADD CONSTRAINT "ProvisionalProduct_requestVariantId_fkey" FOREIGN KEY ("requestVariantId") REFERENCES "ProductTemplateRequestVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProvisionalProduct" ADD CONSTRAINT "ProvisionalProduct_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderQuotation" ADD CONSTRAINT "OrderQuotation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderQuotationLine" ADD CONSTRAINT "OrderQuotationLine_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "OrderQuotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
