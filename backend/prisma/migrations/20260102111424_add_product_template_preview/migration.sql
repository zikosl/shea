-- This is an empty migration.
CREATE VIEW "ProductTemplatePartnerPreview" AS
SELECT
  pt.id               AS product_template_id,
  p."partnerId"       AS partner_id,

  pt.name,
  pt.name_ar,
  pt.description,
  pt.product_type_id,
  pt.brand_id,

  v.id                AS variant_id,
  v.name              AS variant_name,
  v.sku               AS variant_sku,

  p.id                AS product_id,
  p.price             AS price,
  p.available,
  p.stock

FROM "ProductTemplate" pt

-- first variant per template
JOIN LATERAL (
  SELECT *
  FROM "Variant"
  WHERE "productId" = pt.id
  ORDER BY id ASC
  LIMIT 1
) v ON true

-- first product per (variant, partner)
JOIN LATERAL (
  SELECT *
  FROM "Product"
  WHERE "variantId" = v.id
    AND "partnerId" IS NOT NULL
  ORDER BY id ASC
  LIMIT 1
) p ON true;
