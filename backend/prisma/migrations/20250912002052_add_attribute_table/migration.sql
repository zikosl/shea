/*
  Warnings:

  - You are about to drop the column `name` on the `ProductAttribute` table. All the data in the column will be lost.
  - You are about to drop the column `name_ar` on the `ProductAttribute` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `ProductAttributeValue` table. All the data in the column will be lost.
  - Added the required column `attribute_id` to the `ProductAttribute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `ProductAttribute` table without a default value. This is not possible if the table is not empty.
  - Made the column `product_attribute_id` on table `ProductAttributeValue` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ProductAttributeValue" DROP CONSTRAINT "ProductAttributeValue_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductAttributeValue" DROP CONSTRAINT "ProductAttributeValue_product_attribute_id_fkey";

-- DropIndex
DROP INDEX "ProductAttribute_name_key";

-- AlterTable
ALTER TABLE "ProductAttribute" DROP COLUMN "name",
DROP COLUMN "name_ar",
ADD COLUMN     "attribute_id" INTEGER NOT NULL,
ADD COLUMN     "productId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ProductAttributeValue" DROP COLUMN "productId",
ALTER COLUMN "product_attribute_id" SET NOT NULL;

-- CreateTable
CREATE TABLE "Attribute" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_name_key" ON "Attribute"("name");

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "Attribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_product_attribute_id_fkey" FOREIGN KEY ("product_attribute_id") REFERENCES "ProductAttribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
