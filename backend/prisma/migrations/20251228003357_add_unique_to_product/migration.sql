/*
  Warnings:

  - A unique constraint covering the columns `[partnerId,variantId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Product_partnerId_variantId_key" ON "Product"("partnerId", "variantId");
