ALTER TYPE "OrderSource" ADD VALUE IF NOT EXISTS 'DRIVER_REQUEST';

CREATE TABLE "PartnerDriverRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "packageDescription" TEXT NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupLatitude" DOUBLE PRECISION NOT NULL,
    "pickupLongitude" DOUBLE PRECISION NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "destinationLatitude" DOUBLE PRECISION NOT NULL,
    "destinationLongitude" DOUBLE PRECISION NOT NULL,
    "cashToCollect" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerDriverRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartnerDriverRequest_requestNumber_key" ON "PartnerDriverRequest"("requestNumber");
CREATE UNIQUE INDEX "PartnerDriverRequest_orderId_key" ON "PartnerDriverRequest"("orderId");
CREATE INDEX "PartnerDriverRequest_partnerId_createdAt_idx" ON "PartnerDriverRequest"("partnerId", "createdAt");

ALTER TABLE "PartnerDriverRequest"
ADD CONSTRAINT "PartnerDriverRequest_partnerId_fkey"
FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartnerDriverRequest"
ADD CONSTRAINT "PartnerDriverRequest_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
