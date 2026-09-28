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
  partner.online AS "partnerOnline"
FROM "ProductTemplate" template
JOIN (
  SELECT DISTINCT ON (variant."productId", product."partnerId")
    variant."productId" AS template_id,
    variant.id AS "variantId",
    variant.name AS variant_name,
    variant.sku AS variant_sku,
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
