/*
  Warnings:

  - You are about to drop the column `partnerDeliveryScheduleId` on the `DeliveryGroup` table. All the data in the column will be lost.
  - You are about to drop the column `partnerId` on the `PartnerDeliverySchedule` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "DeliveryGroup" DROP CONSTRAINT "DeliveryGroup_partnerDeliveryScheduleId_fkey";

-- DropForeignKey
ALTER TABLE "PartnerDeliverySchedule" DROP CONSTRAINT "PartnerDeliverySchedule_partnerId_fkey";

-- DropIndex
DROP INDEX "PartnerDeliverySchedule_partnerId_idx";

-- AlterTable
ALTER TABLE "DeliveryGroup" DROP COLUMN "partnerDeliveryScheduleId";

-- AlterTable
ALTER TABLE "PartnerDeliverySchedule" DROP COLUMN "partnerId";
