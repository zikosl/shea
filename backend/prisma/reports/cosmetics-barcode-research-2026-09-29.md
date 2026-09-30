# Cosmetics barcode research, 2026-09-29

The cosmetics snapshot has 1,759 variants. This pass assigned five GTINs from
exact product/size listings, cross-checked against a second independent listing
and the variant name or saved product image. The other 1,754 variants retain a
null barcode. These are source-verified catalog matches, not scans of Shea's
physical stock; scan incoming packages to confirm market or packaging changes.

| Shea SKU | Product / variant | GTIN | Primary evidence | Corroboration |
| --- | --- | --- | --- | --- |
| SHEA-COS-62E2E99F34D2 | Garnier Ultra Doux Masque Remede, avocado and shea, 340 ml | 3600542510080 | [Parasmart Morocco](https://www.parasmart.ma/products/garnier-ultra-doux-masque-remede-avocat-340ml) | [Carrefour product listing](https://www.carrefour.fr/p/masque-capillaire-remede-nutrition-intense-huile-d-avocat-beurre-de-karite-ultra-doux-haircare-3600542510080) |
| SHEA-COS-BA4651F587C5 | Garnier Ultra Doux Masque-Lait, almond milk, 250 ml | 3600542237048 | [Intermarché](https://www.intermarche.com/produit/ultra-doux-masque-lait-au-lait-d%27amande-bio/3600542237048) | [Auchan](https://www.auchan.fr/ultra-doux-masque-au-lait-d-amande-bio-cheveux-deshydrates/pr-C1256107) |
| SHEA-COS-50374AB706B3 | Garnier Ultra Doux Masque-Lait, honey, 250 ml | 3600542237079 | [Auchan](https://www.auchan.fr/ultra-doux-masque-au-lait-vegetal-bio-miel-cheveux-fragiles-cassants/pr-C1256111) | [Dumyah](https://www.dumyah.com/en/beauty/hair-care/hair-treatments/garnier-ultra-gentle-hair-mask-with-replenishing-honey-bio) |
| SHEA-COS-4F671BBB2BCC | Maybelline Baby Skin primer, 20 ml | 3600530941278 | [Think Pharmacy](https://thinkpharmacy.gr/products/maybelline-baby-skin-primer-pore-eraser) | [Sidalih](https://sidalih.com/en/collections/maybelline/products/maybelline-baby-skin-instant-pore-eraser-clear-20-ml) |
| SHEA-COS-F8526DDDC15B | Maybelline Colossal Curl Bounce mascara, black, 10 ml, non-waterproof packaging | 30145436 | [dm](https://www.dm.hu/p/d/1623536/maybelline-new-york-szempillaspiral-the-colossal-curl-bounce) | [Lilly Drogerie](https://www.lilly.rs/maybelline-new-york-colossal-curl-bounce-maskara-very-black-512893) |

All five codes passed GTIN check-digit validation. A 25-variant Maybelline
batch found one candidate, the Curl Bounce mascara above; several original
source pages returned HTTP 404. Manual research found the Garnier and Baby
Skin matches, plus the two Garnier Masque-Lait variants. A previous production lookup of the first 25 variants skipped
them because their internal SKUs were not present in that database; it did
not actually research those 25 products.

Do not infer a code for an unverified variant from its product title alone.
For example, "Dove Original 250 ml" has several GTINs for different markets
and formulations. "Bourjois Blush 54 Rose Frisson" also appears under multiple
GTINs, including 3052503755434 and 3614225613265. Neither was assigned.
The Garnier Masque-Lait cacao variant was also left unassigned because only
one source with a potential GTIN was found.

## Stock CSV comparison, 2026-09-30

`yarn ts-node prisma/audit-cosmetics-barcodes.ts /Users/zakaria/Downloads/Stock.csv`
compares every catalog variant against the 42,010 stock rows and writes
`prisma/reports/cosmetics-barcode-review.csv`. The stock export has abbreviated
descriptions and omits sizes for many products. The audit rejects 1,043 invalid
GTINs, requires matching brand and variant terms, and never imports a suggestion
automatically. Its current result is 11 sourced variants, seven size-incomplete
single candidates, two ambiguous multi-code candidates, and 1,739 without a
sufficiently specific CSV match. These counts describe this conservative search,
not proof that no barcode exists for the unmatched products.

The OÉ manufacturer's [200 ml spray table](https://www.unhycos.com/produit/deodorants-sprays-fraicheur-parfumee-oe/)
provides exact fragrance, size, and barcode pairs. Six matching catalog variants
were marked verified:

| Shea SKU | 200 ml fragrance | GTIN |
| --- | --- | --- |
| SHEA-COS-BD57D50A764F | Sweet Charm | 3760070491425 |
| SHEA-COS-91AB753328B2 | Absolute Fresh | 3760070491272 |
| SHEA-COS-9D34316B921B | Flower Opus | 3760070491296 |
| SHEA-COS-A3B8DBF46A05 | Isla Vanilla | 3760070491401 |
| SHEA-COS-5C9144354C7C | Just Delicious | 3760070491302 |
| SHEA-COS-F87EA4F1D203 | Purple Dream | 3760070491418 |

Even source-verified catalog codes should be checked against actual incoming
packages before use as a scanned stock identifier. Do not assign one barcode
across fragrance, shade, formulation, or pack-size variants.
