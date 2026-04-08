/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Pricing` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Pricing_name_key" ON "Pricing"("name");
