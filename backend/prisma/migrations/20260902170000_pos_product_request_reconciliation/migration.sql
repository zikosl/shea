ALTER TABLE "ProductTemplateRequest"
  ADD COLUMN "posLocalId" TEXT,
  ADD COLUMN "posDeviceId" TEXT;

ALTER TABLE "ProductTemplateRequestVariant"
  ADD COLUMN "localId" TEXT,
  ADD COLUMN "resolvedVariantId" INTEGER,
  ADD COLUMN "costPrice" DOUBLE PRECISION,
  ADD COLUMN "reorderThreshold" INTEGER,
  ADD COLUMN "trackInventory" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "ProductTemplateRequest_partnerId_posLocalId_key"
  ON "ProductTemplateRequest"("partnerId", "posLocalId");
