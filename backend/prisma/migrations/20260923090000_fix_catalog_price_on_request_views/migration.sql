-- Keep catalog read views aligned with Product pricing fields.
CREATE OR REPLACE VIEW "ProductView" AS
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
  variant."productId" AS product_template_id,
  product."priceOnRequest"
FROM "Product" product
JOIN "Variant" variant ON product."variantId" = variant.id
JOIN "ProductTemplate" template ON variant."productId" = template.id;

CREATE OR REPLACE VIEW "ProductTemplatePartnerPreview" AS
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
  product.notes,
  product."priceOnRequest"
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
