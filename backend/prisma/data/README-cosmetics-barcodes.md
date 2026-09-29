# Cosmetics manufacturer barcodes

The catalog keeps Shea's internal scan label in each variant's `sku`. The
`barcode` field is reserved for a verified manufacturer EAN, UPC, or GTIN.
The JSON snapshot currently has no verified manufacturer barcodes.

From the backend working directory:

1. Deploy the `20260930100000_variant_barcode_review` Prisma migration.
2. Run `yarn seed:cosmetics` to connect catalog variants to the internal SKUs
   in the JSON snapshot.
3. Run `yarn enrich:cosmetics-barcodes --offset 0 --limit 25` for a read-only
   source-page lookup. Add `--open-beauty-facts` for community catalog
   candidates. Use `--apply` to queue matches in the database.
4. Continue with `--offset 25`, `--offset 50`, and so on. The default batch
   size is 25, with a maximum of 100 and a pause between products.
5. Review matches at the admin `/barcode-review` page. Check exact package,
   size, scent, shade, and market before approving. Staff can also submit a
   physically scanned code from a product template's variant editor.
6. Run `yarn sync:approved-cosmetics-barcodes --apply` against the reviewed
   database to copy approved codes back into this JSON file. Commit that
   change so later deployments and catalog seeds retain the verified codes.

Lookup results are candidates only. The backend checks GTIN length and check
digit. POS receives the approved variant barcode on its next sync when a
partner-specific barcode has not been set. Never use a candidate code as a
manufacturer barcode before review.
