-- This is an empty migration.


-- This is an empty migration.
DROP VIEW product_template_full_view;
DROP VIEW product_template_view;

CREATE OR REPLACE VIEW "ProductTemplateView" AS
SELECT
    pt.id,
    pt.name,
    pt.name_ar,
    pt.description,
    pt.product_type_id,
    pt.brand_id,

    -- added fields
    ptype.category_id,
    c.niche_id

FROM "ProductTemplate" pt
JOIN "ProductType" ptype
    ON ptype.id = pt.product_type_id
JOIN "Category" c
    ON c.id = ptype.category_id;
