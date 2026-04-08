/*
  Warnings:

  - Made the column `name_ar` on table `ProductTemplate` required. This step will fail if there are existing NULL values in that column.
  - Made the column `description` on table `ProductTemplate` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ProductTemplate" ALTER COLUMN "name_ar" SET NOT NULL,
ALTER COLUMN "name_ar" SET DEFAULT '',
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "description" SET DEFAULT '';
