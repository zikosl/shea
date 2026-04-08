/*
  Warnings:

  - You are about to drop the column `deliveryPrice` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `dispatchedAt` on the `Order` table. All the data in the column will be lost.
  - Added the required column `deliveryId` to the `OrderDispatch` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "OrderDispatch" DROP CONSTRAINT "OrderDispatch_orderId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "deliveryPrice",
DROP COLUMN "dispatchedAt";

-- AlterTable
ALTER TABLE "OrderDispatch" ADD COLUMN     "deliveryId" INTEGER NOT NULL,
ALTER COLUMN "orderId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PartnerDeliverySchedule" (
    "id" SERIAL NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerDeliverySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "type" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "addressId" INTEGER,
    "scheduledAt" TIMESTAMP(3),
    "driverId" INTEGER,
    "deliveryGroupId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryGroup" (
    "id" SERIAL NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "driverId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partnerDeliveryScheduleId" INTEGER,

    CONSTRAINT "DeliveryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerDeliverySchedule_partnerId_idx" ON "PartnerDeliverySchedule"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_orderId_key" ON "Delivery"("orderId");

-- CreateIndex
CREATE INDEX "Delivery_type_idx" ON "Delivery"("type");

-- CreateIndex
CREATE INDEX "Delivery_status_idx" ON "Delivery"("status");

-- CreateIndex
CREATE INDEX "OrderDispatch_deliveryId_idx" ON "OrderDispatch"("deliveryId");

-- CreateIndex
CREATE INDEX "OrderDispatch_driverId_idx" ON "OrderDispatch"("driverId");

-- AddForeignKey
ALTER TABLE "PartnerDeliverySchedule" ADD CONSTRAINT "PartnerDeliverySchedule_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_deliveryGroupId_fkey" FOREIGN KEY ("deliveryGroupId") REFERENCES "DeliveryGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryGroup" ADD CONSTRAINT "DeliveryGroup_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryGroup" ADD CONSTRAINT "DeliveryGroup_partnerDeliveryScheduleId_fkey" FOREIGN KEY ("partnerDeliveryScheduleId") REFERENCES "PartnerDeliverySchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDispatch" ADD CONSTRAINT "OrderDispatch_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDispatch" ADD CONSTRAINT "OrderDispatch_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
