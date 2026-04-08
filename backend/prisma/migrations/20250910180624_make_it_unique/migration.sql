/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `ProductAttribute` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ProductAttribute" ALTER COLUMN "name_ar" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttribute_name_key" ON "ProductAttribute"("name");
