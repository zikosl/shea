CREATE TYPE "CloudStoreStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "SyncSource" AS ENUM ('CLOUD', 'LOCAL_GATEWAY', 'SOLO_POS');

CREATE TABLE "CloudStore" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "partnerId" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Algiers',
  "status" "CloudStoreStatus" NOT NULL DEFAULT 'ACTIVE',
  "gatewayTokenHash" TEXT,
  "gatewayTokenIssuedAt" TIMESTAMP(3),
  "gatewayLastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "CloudStore_partnerId_code_key" ON "CloudStore"("partnerId", "code");

CREATE TABLE "CloudProduct" (
  "storeId" TEXT NOT NULL,
  "productId" INTEGER NOT NULL,
  "variantId" INTEGER,
  "name" TEXT NOT NULL,
  "nameAr" TEXT,
  "variantName" TEXT,
  "sku" TEXT,
  "image" TEXT,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reorderThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "trackInventory" BOOLEAN NOT NULL DEFAULT true,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "visibleInPos" BOOLEAN NOT NULL DEFAULT true,
  "sourceUpdatedAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CloudProduct_pkey" PRIMARY KEY ("storeId", "productId"),
  CONSTRAINT "CloudProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "CloudStore"("id") ON DELETE CASCADE
);
CREATE INDEX "CloudProduct_storeId_visibleInPos_idx" ON "CloudProduct"("storeId", "visibleInPos");

CREATE TABLE "CloudSale" (
  "id" UUID NOT NULL PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "saleNumber" TEXT NOT NULL,
  "terminalId" TEXT,
  "cashierId" TEXT,
  "cashierName" TEXT,
  "customerName" TEXT,
  "subtotal" DOUBLE PRECISION NOT NULL,
  "discountTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CloudSale_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "CloudStore"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "CloudSale_storeId_saleNumber_key" ON "CloudSale"("storeId", "saleNumber");
CREATE INDEX "CloudSale_storeId_occurredAt_idx" ON "CloudSale"("storeId", "occurredAt");

CREATE TABLE "CloudSaleItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "saleId" UUID NOT NULL,
  "productId" INTEGER NOT NULL,
  "productName" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "CloudSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "CloudSale"("id") ON DELETE CASCADE
);

CREATE TABLE "SyncEvent" (
  "sequence" SERIAL NOT NULL PRIMARY KEY,
  "eventId" UUID NOT NULL UNIQUE,
  "storeId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "source" "SyncSource" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "entityVersion" INTEGER NOT NULL DEFAULT 1,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "CloudStore"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "SyncEvent_storeId_idempotencyKey_key" ON "SyncEvent"("storeId", "idempotencyKey");
CREATE INDEX "SyncEvent_storeId_sequence_idx" ON "SyncEvent"("storeId", "sequence");

CREATE TABLE "SyncCursor" (
  "storeId" TEXT NOT NULL,
  "consumerId" TEXT NOT NULL,
  "lastSequence" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SyncCursor_pkey" PRIMARY KEY ("storeId", "consumerId"),
  CONSTRAINT "SyncCursor_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "CloudStore"("id") ON DELETE CASCADE
);
