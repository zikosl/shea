# Sweets catalog import

`sweets-catalog.json` is a snapshot of `brands.xlsx`, `categories(1).xlsx`, and
`products_with_category_and_brand_ids.xlsx` supplied for this import. The workbook
`category_id` and `brand_id` values are source keys, not database IDs. Category
keys are mapped explicitly in the JSON; brand keys are copied from the brands
workbook. The seed resolves actual database IDs within the `Sweets & Snacks`
niche.

From `backend/`:

1. Apply Prisma migrations (`npx prisma migrate deploy`) before importing.
2. Run `npm run seed:sweets -- --dry-run` to validate the snapshot without
   connecting to or changing the database.
3. Set `DATABASE_URL` for the intended database, then run
   `npm run seed:sweets -- --apply`.

The seed never deletes data or overwrites imported templates. Its unique
`importSourceUrl` key makes reruns skip existing source products. It refuses to
reuse an image already owned by another template. It creates 11 categories,
139 source brands plus niche-specific `Other`, and up to 922 templates with a
default variant each. The `Promo!` source row maps to `Chocolat`. Blank brand
references map to `Other`. No product types or partner sellable products are
created, so imported templates do not appear for sale until a partner adds
pricing, stock, and availability.

Brand logos and two product images are absent from the source. Existing brand
image fields are not changed; new brands use an empty image URL and require a
UI fallback. The source's product descriptions are French, while `name_ar` is
provided. The image URLs point to an external R2 bucket; confirm rights and
availability before public use.
