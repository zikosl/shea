ALTER TABLE "Brand" ADD COLUMN "name_ar" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProductTemplate" ADD COLUMN "description_ar" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Variant" ADD COLUMN "name_ar" TEXT;
ALTER TABLE "Variant" ADD COLUMN "description_ar" TEXT;
