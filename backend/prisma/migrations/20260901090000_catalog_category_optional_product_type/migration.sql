-- Store the required category directly so product type can be optional.
ALTER TABLE "ProductTemplate" ADD COLUMN "category_id" INTEGER;
ALTER TABLE "ProductTemplateRequest" ADD COLUMN "category_id" INTEGER;
ALTER TABLE "Variant" ADD COLUMN "description" TEXT;
ALTER TABLE "ProductTemplateRequestVariant" ADD COLUMN "description" TEXT;

UPDATE "ProductTemplate" template
SET "category_id" = product_type."category_id"
FROM "ProductType" product_type
WHERE product_type.id = template."product_type_id";

UPDATE "ProductTemplateRequest" request
SET "category_id" = product_type."category_id"
FROM "ProductType" product_type
WHERE product_type.id = request."product_type_id";

ALTER TABLE "ProductTemplate" ALTER COLUMN "category_id" SET NOT NULL;
ALTER TABLE "ProductTemplateRequest" ALTER COLUMN "category_id" SET NOT NULL;
ALTER TABLE "ProductTemplate" ALTER COLUMN "product_type_id" DROP NOT NULL;
ALTER TABLE "ProductTemplateRequest" ALTER COLUMN "product_type_id" DROP NOT NULL;

ALTER TABLE "ProductTemplate"
  ADD CONSTRAINT "ProductTemplate_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductTemplateRequest"
  ADD CONSTRAINT "ProductTemplateRequest_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ProductTemplate_category_id_idx" ON "ProductTemplate"("category_id");
CREATE INDEX "ProductTemplateRequest_category_id_idx" ON "ProductTemplateRequest"("category_id");

-- A template is always immediately usable, even when the admin defines no options.
INSERT INTO "Variant" ("name", "description", "productId")
SELECT 'Default', '', template.id
FROM "ProductTemplate" template
WHERE NOT EXISTS (
  SELECT 1 FROM "Variant" variant WHERE variant."productId" = template.id
);

DROP VIEW IF EXISTS "ProductTemplatePartnerPreview";
DROP VIEW IF EXISTS "ProductView";
DROP VIEW IF EXISTS "ProductTemplateView";

CREATE VIEW "ProductTemplateView" AS
SELECT
  template.id,
  template.name,
  template.name_ar,
  template.description,
  template.product_type_id,
  template.brand_id,
  template.category_id,
  category.niche_id
FROM "ProductTemplate" template
JOIN "Category" category ON category.id = template.category_id;

CREATE VIEW "ProductView" AS
SELECT
  product.id,
  COALESCE(product."customName", template.name) AS name,
  template.name_ar,
  product.price,
  product."costPrice",
  product.discount,
  product.available,
  product.stock,
  product."reorderThreshold",
  product."isVisibleInPos",
  product."onlineVisible",
  product."isActive",
  product."customName",
  product."customDescription",
  product."customImages",
  product."vendorSku",
  product."vendorBarcode",
  product.notes,
  product."partnerId",
  product."variantId",
  COALESCE(product."vendorSku", variant.sku) AS sku,
  variant.name AS "variantName",
  template.brand_id,
  template.product_type_id,
  template.category_id,
  variant."productId" AS product_template_id
FROM "Product" product
JOIN "Variant" variant ON product."variantId" = variant.id
JOIN "ProductTemplate" template ON variant."productId" = template.id;

CREATE VIEW "ProductTemplatePartnerPreview" AS
SELECT
  template.id AS product_template_id,
  product."partnerId" AS "partnerId",
  template.name,
  template.name_ar,
  template.description,
  template.product_type_id,
  template.category_id,
  template.brand_id,
  variant.id AS "variantId",
  variant.name AS variant_name,
  variant.sku AS variant_sku,
  product.id AS product_id,
  product.price,
  product."costPrice",
  product.discount,
  product.available,
  product.stock,
  product."reorderThreshold",
  product."isVisibleInPos",
  product."onlineVisible",
  product."isActive",
  product."customName",
  product."customDescription",
  product."customImages",
  product."vendorSku",
  product."vendorBarcode",
  product.notes
FROM "ProductTemplate" template
JOIN LATERAL (
  SELECT * FROM "Variant"
  WHERE "productId" = template.id
  ORDER BY id ASC
  LIMIT 1
) variant ON true
JOIN LATERAL (
  SELECT * FROM "Product"
  WHERE "variantId" = variant.id AND "partnerId" IS NOT NULL
  ORDER BY id ASC
  LIMIT 1
) product ON true;
