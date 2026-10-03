-- Expose both language descriptions to the existing catalog read views.
CREATE OR REPLACE VIEW "ProductTemplateView" AS
SELECT
  template.id,
  template.name,
  template.name_ar,
  template.description,
  template.product_type_id,
  template.brand_id,
  template.category_id,
  category.niche_id,
  template.description_ar
FROM "ProductTemplate" template
JOIN "Category" category ON category.id = template.category_id;

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
  product."priceOnRequest",
  template.description,
  template.description_ar,
  variant.name_ar AS "variantNameAr"
FROM "Product" product
JOIN "Variant" variant ON product."variantId" = variant.id
JOIN "ProductTemplate" template ON variant."productId" = template.id;

CREATE OR REPLACE VIEW "ProductTemplatePartnerPreview" AS
SELECT
  template.id AS product_template_id,
  choice."partnerId",
  template.name,
  template.name_ar,
  template.description,
  template.product_type_id,
  template.category_id,
  template.brand_id,
  choice."variantId",
  choice.variant_name,
  choice.variant_sku,
  choice.product_id,
  choice.price,
  choice."costPrice",
  choice.discount,
  choice.available,
  choice.stock,
  choice."reorderThreshold",
  choice."isVisibleInPos",
  choice."onlineVisible",
  choice."isActive",
  choice."customName",
  choice."customDescription",
  choice."customImages",
  choice."vendorSku",
  choice."vendorBarcode",
  choice.notes,
  choice."priceOnRequest",
  choice."trackInventory",
  partner.online AS "partnerOnline",
  template.description_ar,
  choice.variant_name_ar
FROM "ProductTemplate" template
JOIN (
  SELECT DISTINCT ON (variant."productId", product."partnerId")
    variant."productId" AS template_id,
    variant.id AS "variantId",
    variant.name AS variant_name,
    variant.sku AS variant_sku,
    variant.name_ar AS variant_name_ar,
    product.id AS product_id,
    product."partnerId",
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
    product."priceOnRequest",
    product."trackInventory"
  FROM "Variant" variant
  JOIN "Product" product ON product."variantId" = variant.id
  ORDER BY variant."productId", product."partnerId",
    (product.available AND product."isActive" AND product."onlineVisible"
      AND (NOT product."trackInventory" OR product.stock > 0)) DESC,
    variant.id, product.id
) choice ON choice.template_id = template.id
JOIN "Partner" partner ON partner."userId" = choice."partnerId";
