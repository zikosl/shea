-- Connect gift requests to the authenticated client and, after acceptance,
-- to the existing fulfillment order instead of creating a parallel delivery flow.
ALTER TYPE "OrderSource" ADD VALUE IF NOT EXISTS 'GIFT';

ALTER TABLE "CustomOrder"
  ADD COLUMN "clientId" INTEGER,
  ADD COLUMN "addressId" INTEGER,
  ADD COLUMN "confirmedOrderId" INTEGER;

ALTER TABLE "GiftQuotationLine" ADD COLUMN "productId" INTEGER;

CREATE UNIQUE INDEX "CustomOrder_confirmedOrderId_key" ON "CustomOrder"("confirmedOrderId");
CREATE INDEX "CustomOrder_clientId_updatedAt_idx" ON "CustomOrder"("clientId", "updatedAt");
CREATE INDEX "GiftQuotationLine_productId_idx" ON "GiftQuotationLine"("productId");

ALTER TABLE "CustomOrder"
  ADD CONSTRAINT "CustomOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("userId") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CustomOrder_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CustomOrder_confirmedOrderId_fkey" FOREIGN KEY ("confirmedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GiftQuotationLine"
  ADD CONSTRAINT "GiftQuotationLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
