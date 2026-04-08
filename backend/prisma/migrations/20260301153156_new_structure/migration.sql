/*
  Warnings:

  - You are about to drop the `Attribute` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductAttribute` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductAttributeValue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductVariantAttributeValue` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProductAttribute" DROP CONSTRAINT "ProductAttribute_attribute_id_fkey";

-- DropForeignKey
ALTER TABLE "ProductAttribute" DROP CONSTRAINT "ProductAttribute_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductAttributeValue" DROP CONSTRAINT "ProductAttributeValue_product_attribute_id_fkey";

-- DropForeignKey
ALTER TABLE "ProductVariantAttributeValue" DROP CONSTRAINT "ProductVariantAttributeValue_valueId_fkey";

-- DropForeignKey
ALTER TABLE "ProductVariantAttributeValue" DROP CONSTRAINT "ProductVariantAttributeValue_variantId_fkey";

-- DropTable
DROP TABLE "Attribute";

-- DropTable
DROP TABLE "ProductAttribute";

-- DropTable
DROP TABLE "ProductAttributeValue";

-- DropTable
DROP TABLE "ProductVariantAttributeValue";

-- CreateTable
CREATE TABLE "Tags" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "variantId" INTEGER NOT NULL,

    CONSTRAINT "Tags_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Tags" ADD CONSTRAINT "Tags_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
