-- Create the business capability vocabulary and the Gift Store extension.
CREATE TYPE "CapabilityCode" AS ENUM ('CUSTOM_ORDERS', 'QUOTATIONS', 'GIFT_BUILDER', 'GIFT_TEMPLATES', 'PRODUCTION', 'PRODUCTION_TASKS', 'DELIVERY_PICKUP', 'GIFT_GALLERY', 'GIFT_REPORTS');
CREATE TYPE "CapabilityOverrideEffect" AS ENUM ('ENABLE', 'DISABLE');
CREATE TYPE "CustomOrderStatus" AS ENUM ('DRAFT', 'REQUESTED', 'QUOTED', 'AWAITING_CUSTOMER_APPROVAL', 'CONFIRMED', 'MATERIALS_RESERVED', 'IN_PREPARATION', 'READY', 'FULFILLED', 'CANCELLED');
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');
CREATE TYPE "FulfillmentMode" AS ENUM ('PICKUP', 'DELIVERY');
CREATE TYPE "ProductionTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE');

CREATE TABLE "NicheCapability" ("id" SERIAL PRIMARY KEY, "nicheId" INTEGER NOT NULL, "capability" "CapabilityCode" NOT NULL, "enabledByDefault" BOOLEAN NOT NULL DEFAULT true);
CREATE TABLE "PartnerCapabilityOverride" ("id" SERIAL PRIMARY KEY, "partnerId" INTEGER NOT NULL, "capability" "CapabilityCode" NOT NULL, "effect" "CapabilityOverrideEffect" NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "CustomOrder" ("id" TEXT PRIMARY KEY, "orderNumber" TEXT NOT NULL, "partnerId" INTEGER NOT NULL, "customerName" TEXT NOT NULL, "customerPhone" TEXT, "status" "CustomOrderStatus" NOT NULL DEFAULT 'DRAFT', "requiredAt" TIMESTAMP(3), "fulfillmentMode" "FulfillmentMode" NOT NULL DEFAULT 'PICKUP', "deliveryAddress" TEXT, "note" TEXT, "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0, "discount" DOUBLE PRECISION NOT NULL DEFAULT 0, "total" DOUBLE PRECISION NOT NULL DEFAULT 0, "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "GiftSpecification" ("id" TEXT PRIMARY KEY, "customOrderId" TEXT NOT NULL, "occasion" TEXT, "recipientName" TEXT, "cardMessage" TEXT, "style" TEXT, "wrappingNote" TEXT);
CREATE TABLE "CustomOrderLine" ("id" TEXT PRIMARY KEY, "customOrderId" TEXT NOT NULL, "productId" INTEGER, "name" TEXT NOT NULL, "description" TEXT, "quantity" DOUBLE PRECISION NOT NULL, "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0, "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0, "total" DOUBLE PRECISION NOT NULL DEFAULT 0, "sortOrder" INTEGER NOT NULL DEFAULT 0);
CREATE TABLE "GiftQuotation" ("id" TEXT PRIMARY KEY, "quoteNumber" TEXT NOT NULL, "customOrderId" TEXT NOT NULL, "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT', "subtotal" DOUBLE PRECISION NOT NULL, "discount" DOUBLE PRECISION NOT NULL DEFAULT 0, "total" DOUBLE PRECISION NOT NULL, "validUntil" TIMESTAMP(3), "note" TEXT, "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "GiftQuotationLine" ("id" TEXT PRIMARY KEY, "quotationId" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "quantity" DOUBLE PRECISION NOT NULL, "unitPrice" DOUBLE PRECISION NOT NULL, "total" DOUBLE PRECISION NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0);
CREATE TABLE "ProductionTask" ("id" TEXT PRIMARY KEY, "customOrderId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "status" "ProductionTaskStatus" NOT NULL DEFAULT 'TODO', "dueAt" TIMESTAMP(3), "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "GiftTemplate" ("id" TEXT PRIMARY KEY, "partnerId" INTEGER NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "occasion" TEXT, "image" TEXT, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "GiftTemplateItem" ("id" TEXT PRIMARY KEY, "templateId" TEXT NOT NULL, "productId" INTEGER, "name" TEXT NOT NULL, "quantity" DOUBLE PRECISION NOT NULL, "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0, "sortOrder" INTEGER NOT NULL DEFAULT 0);
CREATE TABLE "StockReservation" ("id" TEXT PRIMARY KEY, "customOrderId" TEXT NOT NULL, "productId" INTEGER NOT NULL, "quantity" DOUBLE PRECISION NOT NULL, "releasedAt" TIMESTAMP(3), "consumedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE UNIQUE INDEX "NicheCapability_nicheId_capability_key" ON "NicheCapability"("nicheId","capability");
CREATE INDEX "NicheCapability_capability_idx" ON "NicheCapability"("capability");
CREATE UNIQUE INDEX "PartnerCapabilityOverride_partnerId_capability_key" ON "PartnerCapabilityOverride"("partnerId","capability");
CREATE INDEX "PartnerCapabilityOverride_capability_effect_idx" ON "PartnerCapabilityOverride"("capability","effect");
CREATE UNIQUE INDEX "CustomOrder_orderNumber_key" ON "CustomOrder"("orderNumber");
CREATE INDEX "CustomOrder_partnerId_status_requiredAt_idx" ON "CustomOrder"("partnerId","status","requiredAt");
CREATE INDEX "CustomOrder_partnerId_updatedAt_idx" ON "CustomOrder"("partnerId","updatedAt");
CREATE UNIQUE INDEX "GiftSpecification_customOrderId_key" ON "GiftSpecification"("customOrderId");
CREATE INDEX "CustomOrderLine_customOrderId_sortOrder_idx" ON "CustomOrderLine"("customOrderId","sortOrder");
CREATE INDEX "CustomOrderLine_productId_idx" ON "CustomOrderLine"("productId");
CREATE UNIQUE INDEX "GiftQuotation_quoteNumber_key" ON "GiftQuotation"("quoteNumber");
CREATE INDEX "GiftQuotation_customOrderId_createdAt_idx" ON "GiftQuotation"("customOrderId","createdAt");
CREATE INDEX "GiftQuotationLine_quotationId_sortOrder_idx" ON "GiftQuotationLine"("quotationId","sortOrder");
CREATE INDEX "ProductionTask_customOrderId_status_sortOrder_idx" ON "ProductionTask"("customOrderId","status","sortOrder");
CREATE INDEX "GiftTemplate_partnerId_active_name_idx" ON "GiftTemplate"("partnerId","active","name");
CREATE INDEX "GiftTemplateItem_templateId_sortOrder_idx" ON "GiftTemplateItem"("templateId","sortOrder");
CREATE UNIQUE INDEX "StockReservation_customOrderId_productId_key" ON "StockReservation"("customOrderId","productId");
CREATE INDEX "StockReservation_productId_releasedAt_consumedAt_idx" ON "StockReservation"("productId","releasedAt","consumedAt");

ALTER TABLE "NicheCapability" ADD CONSTRAINT "NicheCapability_nicheId_fkey" FOREIGN KEY ("nicheId") REFERENCES "Niche"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerCapabilityOverride" ADD CONSTRAINT "PartnerCapabilityOverride_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomOrder" ADD CONSTRAINT "CustomOrder_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftSpecification" ADD CONSTRAINT "GiftSpecification_customOrderId_fkey" FOREIGN KEY ("customOrderId") REFERENCES "CustomOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomOrderLine" ADD CONSTRAINT "CustomOrderLine_customOrderId_fkey" FOREIGN KEY ("customOrderId") REFERENCES "CustomOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomOrderLine" ADD CONSTRAINT "CustomOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GiftQuotation" ADD CONSTRAINT "GiftQuotation_customOrderId_fkey" FOREIGN KEY ("customOrderId") REFERENCES "CustomOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftQuotationLine" ADD CONSTRAINT "GiftQuotationLine_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "GiftQuotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionTask" ADD CONSTRAINT "ProductionTask_customOrderId_fkey" FOREIGN KEY ("customOrderId") REFERENCES "CustomOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftTemplate" ADD CONSTRAINT "GiftTemplate_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftTemplateItem" ADD CONSTRAINT "GiftTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GiftTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftTemplateItem" ADD CONSTRAINT "GiftTemplateItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_customOrderId_fkey" FOREIGN KEY ("customOrderId") REFERENCES "CustomOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing Gift niches receive sensible defaults; administrators can change them later.
INSERT INTO "NicheCapability" ("nicheId","capability","enabledByDefault")
SELECT n.id, capability, true
FROM "Niche" n
CROSS JOIN unnest(ARRAY['CUSTOM_ORDERS','QUOTATIONS','GIFT_BUILDER','GIFT_TEMPLATES','PRODUCTION','PRODUCTION_TASKS','DELIVERY_PICKUP','GIFT_GALLERY','GIFT_REPORTS']::"CapabilityCode"[]) capability
WHERE lower(n.name) LIKE '%gift%'
ON CONFLICT DO NOTHING;

