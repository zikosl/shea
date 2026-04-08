/*
  Warnings:

  - You are about to drop the column `deliveryTex` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "deliveryTex",
ADD COLUMN     "deliveryTax" INTEGER NOT NULL DEFAULT 0;
