/*
  Warnings:

  - You are about to drop the column `endTime` on the `PartnerDeliverySchedule` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `PartnerDeliverySchedule` table. All the data in the column will be lost.
  - Added the required column `time` to the `PartnerDeliverySchedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PartnerDeliverySchedule" DROP COLUMN "endTime",
DROP COLUMN "startTime",
ADD COLUMN     "time" TEXT NOT NULL;
