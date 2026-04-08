/*
  Warnings:

  - Added the required column `name_ar` to the `ProductAttribute` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductAttribute" ADD COLUMN     "name_ar" TEXT NOT NULL;
