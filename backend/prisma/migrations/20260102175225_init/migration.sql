-- This is an empty migration.
-- This is an empty migration.
CREATE OR REPLACE VIEW "ProductView" AS
SELECT
    p.id,
    ptm.name,
    ptm.name_ar,
    p.price,
    p.available,
    p.stock,
    p."partnerId",
    p."variantId",
    v.sku,
    v.name as "variantName",
    ptm.brand_id,
    ptm.product_type_id,
    pt.category_id,
    v."productId" as product_template_id
FROM
    "Product" p
    JOIN "Variant" v on p."variantId" = v.id
    JOIN "ProductTemplate" ptm on v."productId" = ptm.id
    JOIN "ProductType" pt ON ptm.product_type_id = pt.id;