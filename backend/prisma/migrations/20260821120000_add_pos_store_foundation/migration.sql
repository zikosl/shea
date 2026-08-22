-- Add POS/store-foundation enums.
CREATE TYPE "StockMovementType" AS ENUM ('SALE', 'RETURN', 'RECEIPT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_IN', 'TRANSFER_OUT');
CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'VOIDED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'MIXED', 'OTHER');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "SyncEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'SYNCED', 'ERROR', 'CONFLICT');
CREATE TYPE "SyncEventAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE');

ALTER TYPE "Platform" ADD VALUE IF NOT EXISTS 'DESKTOP';

-- Partner/store product overrides.
ALTER TABLE "Product"
ADD COLUMN "costPrice" DOUBLE PRECISION,
ADD COLUMN "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "reorderThreshold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isVisibleInPos" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "onlineVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "customName" TEXT,
ADD COLUMN "customDescription" TEXT,
ADD COLUMN "customImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "vendorSku" TEXT,
ADD COLUMN "vendorBarcode" TEXT,
ADD COLUMN "notes" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Product_partnerId_isActive_isVisibleInPos_idx" ON "Product"("partnerId", "isActive", "isVisibleInPos");
CREATE INDEX "Product_vendorBarcode_idx" ON "Product"("vendorBarcode");
CREATE INDEX "Product_vendorSku_idx" ON "Product"("vendorSku");

CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "name" TEXT,
    "platform" "Platform" NOT NULL,
    "appVersion" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "deviceId" TEXT,
    "cashierId" INTEGER,
    "sourceOrderId" INTEGER,
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "customerName" TEXT,
    "note" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "productName" TEXT NOT NULL,
    "variantName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "userId" INTEGER,
    "saleId" TEXT,
    "type" "StockMovementType" NOT NULL,
    "quantityDelta" DOUBLE PRECISION NOT NULL,
    "stockBefore" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "deviceId" TEXT,
    "openedById" INTEGER NOT NULL,
    "closedById" INTEGER,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "countedCash" DOUBLE PRECISION,
    "difference" DOUBLE PRECISION,
    "note" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SyncEvent" (
    "id" TEXT NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "deviceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "action" "SyncEventAction" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SyncEventStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "SyncEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" INTEGER,
    "partnerId" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Device_deviceKey_key" ON "Device"("deviceKey");
CREATE INDEX "Device_partnerId_idx" ON "Device"("partnerId");
CREATE INDEX "Device_platform_idx" ON "Device"("platform");

CREATE UNIQUE INDEX "Sale_saleNumber_key" ON "Sale"("saleNumber");
CREATE INDEX "Sale_partnerId_createdAt_idx" ON "Sale"("partnerId", "createdAt");
CREATE INDEX "Sale_partnerId_status_idx" ON "Sale"("partnerId", "status");
CREATE INDEX "Sale_deviceId_idx" ON "Sale"("deviceId");
CREATE INDEX "Sale_cashierId_idx" ON "Sale"("cashierId");

CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");

CREATE INDEX "Payment_saleId_idx" ON "Payment"("saleId");
CREATE INDEX "Payment_method_idx" ON "Payment"("method");

CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");
CREATE INDEX "StockMovement_partnerId_createdAt_idx" ON "StockMovement"("partnerId", "createdAt");
CREATE INDEX "StockMovement_saleId_idx" ON "StockMovement"("saleId");
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");

CREATE INDEX "CashSession_partnerId_status_idx" ON "CashSession"("partnerId", "status");
CREATE INDEX "CashSession_deviceId_idx" ON "CashSession"("deviceId");

CREATE UNIQUE INDEX "SyncEvent_partnerId_idempotencyKey_key" ON "SyncEvent"("partnerId", "idempotencyKey");
CREATE INDEX "SyncEvent_partnerId_status_createdAt_idx" ON "SyncEvent"("partnerId", "status", "createdAt");
CREATE INDEX "SyncEvent_deviceId_idx" ON "SyncEvent"("deviceId");

CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_partnerId_createdAt_idx" ON "AuditLog"("partnerId", "createdAt");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

ALTER TABLE "Device" ADD CONSTRAINT "Device_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Sale" ADD CONSTRAINT "Sale_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SyncEvent" ADD CONSTRAINT "SyncEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SyncEvent" ADD CONSTRAINT "SyncEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

DROP VIEW IF EXISTS "ProductTemplatePartnerPreview";
DROP VIEW IF EXISTS "ProductView";

CREATE VIEW "ProductView" AS
SELECT
    p.id,
    COALESCE(p."customName", ptm.name) AS name,
    ptm.name_ar,
    p.price,
    p."costPrice",
    p.discount,
    p.available,
    p.stock,
    p."reorderThreshold",
    p."isVisibleInPos",
    p."onlineVisible",
    p."isActive",
    p."customName",
    p."customDescription",
    p."customImages",
    p."vendorSku",
    p."vendorBarcode",
    p.notes,
    p."partnerId",
    p."variantId",
    COALESCE(p."vendorSku", v.sku) AS sku,
    v.name AS "variantName",
    ptm.brand_id,
    ptm.product_type_id,
    pt.category_id,
    v."productId" AS product_template_id
FROM
    "Product" p
    JOIN "Variant" v ON p."variantId" = v.id
    JOIN "ProductTemplate" ptm ON v."productId" = ptm.id
    JOIN "ProductType" pt ON ptm.product_type_id = pt.id;

CREATE VIEW "ProductTemplatePartnerPreview" AS
SELECT
  pt.id AS product_template_id,
  p."partnerId" AS "partnerId",

  pt.name,
  pt.name_ar,
  pt.description,
  pt.product_type_id,
  ptt.category_id,
  pt.brand_id,

  v.id AS "variantId",
  v.name AS variant_name,
  v.sku AS variant_sku,

  p.id AS product_id,
  p.price AS price,
  p."costPrice",
  p.discount,
  p.available,
  p.stock,
  p."reorderThreshold",
  p."isVisibleInPos",
  p."onlineVisible",
  p."isActive",
  p."customName",
  p."customDescription",
  p."customImages",
  p."vendorSku",
  p."vendorBarcode",
  p.notes

FROM "ProductTemplate" pt
JOIN "ProductType" ptt ON ptt.id = pt.product_type_id
JOIN LATERAL (
  SELECT *
  FROM "Variant"
  WHERE "productId" = pt.id
  ORDER BY id ASC
  LIMIT 1
) v ON true
JOIN LATERAL (
  SELECT *
  FROM "Product"
  WHERE "variantId" = v.id
    AND "partnerId" IS NOT NULL
  ORDER BY id ASC
  LIMIT 1
) p ON true;
