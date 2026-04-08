-- This is an empty migration.

CREATE OR REPLACE VIEW product_template_view AS
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


CREATE OR REPLACE VIEW product_template_full_view AS
SELECT
    pt.*,

    ptype.category_id,
    c.name        AS category_name,
    c.name_ar     AS category_name_ar,

    c.niche_id,
    n.name        AS niche_name,
    n.name_ar     AS niche_name_ar,
    n.image       AS niche_image

FROM "ProductTemplate" pt
JOIN "ProductType" ptype ON ptype.id = pt.product_type_id
JOIN "Category" c        ON c.id = ptype.category_id
LEFT JOIN "Niche" n      ON n.id = c.niche_id;
