# Sweets and snacks barcode research

The catalog has 922 product templates. Fourteen unit barcodes have source-backed matches and are recorded in `prisma/data/sweets-catalog.json`. The other 908 are intentionally unassigned. Do not infer a barcode from a brand and product name alone: package size, flavor, market, and whether the code belongs to one item or a multipack all matter.

The barcode source is `/Users/zakaria/Downloads/Stock.csv` (Latin-1, semicolon-delimited, 42,010 product rows). All fourteen codes below were checked against the CSV, then independently checked against a product-level listing. The CSV has the same barcode values as the earlier ZIP, but is easier to parse and has intact accented column names. The export is not an inventory snapshot: all quantity and price fields are zero. Do not import it wholesale; some barcode values fail GTIN validation and one designation contains an unescaped semicolon.

| Catalog item | Unit barcode | CSV line | Independent evidence |
| --- | --- | ---: | --- |
| Toblerone, milk chocolate, yellow wrapper, 50 g | 76145513 (EAN-8) | 7366 | [Catalog source photo](https://candy-days.com/fr/product/toblerone-50g), [unit EAN listing](https://www.stama.co/products/toblerone-50g/) |
| Smarties tube, 38 g | 40057781 (EAN-8) | 36773 | [38 g code listing](https://www.buycott.com/brand/15123/nestle-smarties-upc) |
| Nutella, 750 g | 3017624047509 (EAN-13) | 29076 | [750 g listing](https://www.foodfactor.net/produits/3017624047509/nutella.php) |
| Toblerone, 35 g | 76145759 (EAN-8) | 39698 | [unit EAN listing](https://www.stama.co/products/toblerone-35g/) |
| Kinder Schoko-Bons, 300 g | 4008400280127 (EAN-13) | 34754 | [300 g listing](https://outlet.drogeriedepot.de/suess-salzig/schokolade/kinder-schoko-bons-pr-022099/) |
| Nutella, 630 g | 59032823 (EAN-8) | 29073 | [630 g GTIN listing](https://www.kespro.com/tuotteet/nutella-hasselpahkina-kaakaolevite-630g-59032823) |
| Nutella, 825 g | 3017620428258 (EAN-13) | 29078 | [825 g barcode listing](https://www.aykilicgross.com/urun/nutella-cikolata-cam-kavanoz-825-gr.html) |
| Nutella, 350 g | 80177173 (EAN-8) | 29085 | [350 g unit barcode listing](https://rednevaltrading.com/product/nutella-jar-350g/) |
| Toblerone milk, 100 g | 7614500010013 (EAN-13) | 7375 | [100 g GTIN listing](https://www.kespro.com/en/products/toblerone-maitosuklaa-suklaapatukka-100g-7614500010013) |
| Nestlé Crunch milk, 100 g | 3033710001279 (EAN-13) | 7639 | [100 g EAN listing](https://www.auchan.fr/nestle-crunch-tablette-de-chocolat-au-lait/pr-C1871474) |
| Gullón Twin Go cocoa/vanilla biscuits, 145 g | 8410376046922 (EAN-13) | 20644 | [Shea source product and photo](https://candy-days.com/fr/product/twin-go-145g-j38h), [product-code listing](https://nutrifoodindex.com/product/twin-go) |
| Kinder Maxi, 11 bars | 4008400828022 (EAN-13) | 23443 | [T11 pack listing](https://www.thefreshmarketdubai.com/products/kinder-maxi-t11-231g-4008400828022) |
| Ferrero Rocher, 16 pieces | 8000500037874 (EAN-13) | 17024 | [T16 pack listing](https://www.dischem.co.za/ferrero-rocher-200g-t16-783) |
| Haribo Roulette, 25 g roll | 8691216019805 (EAN-13) | 20919 | [Shea source photo](https://candy-days.com/fr/product/haribo-roulette), [supplier catalog](https://dmg-manual-live.s3.ap-south-1.amazonaws.com/Production/exb_doc/492/82085/Abbar_Catalog_All_Products_May2024.pdf) |

Examples requiring physical pack confirmation:

- Nutella B-ready 22 g has multiple market-specific single-unit codes, while a 6 x 22 g pack has another code.
- Quality Street 265 g appears under more than one retail EAN.
- Snickers 50 g appears under multiple EANs.
- Loose/unbranded nuts and other variable-weight products may have retailer-assigned labels instead of a universal manufacturer GTIN.
- `MILKA CHOCO PAUSE 260G` is an exact text-and-size match in the stock export, but its code `5621710100917` lacks independent confirmation; it was not applied.
- A broader CSV name-and-size search found `MILKA WAFER 30G` (line 26068, `59939788`), but the independent unit listing specifies the hazelnut version while the Shea catalog does not specify flavor.
- `M&MS PEANUT 45G` (line 26193, `5900951140310`) has several valid regional codes for the same size; confirm the physical wrapper before choosing one.
- `HARIBO SOFTBONS/250G` (line 20921) cannot be assigned to the generic Shea `Haribo 250g` entry.
- `MALTESERS CHOCO 37G` (line 26586) has a 12-digit code that differs from a commonly published 13-digit code; a check digit alone does not make it the right retail unit.

To complete coverage, capture a barcode scan or clear back-of-pack image for each exact SKU sold by Shea's suppliers. Record the pack size and flavor, validate the GTIN check digit, and compare against a manufacturer or supplier unit-level listing. Never substitute a case or multipack barcode for a single item. Once a sourced `barcode` and `barcodeSource` are added to the catalog, `yarn seed:sweets --apply` can fill an empty barcode on the imported Standard variant without overwriting a conflicting code. Run the dry-run first.

For a full repeatable review queue, run `yarn ts-node prisma/audit-sweets-barcodes.ts /path/to/Stock.csv` from `backend`. It writes `prisma/reports/sweets-barcode-review.csv` with one row per catalog product, status, and up to three CSV candidates. Candidate rows are not approved barcodes.
