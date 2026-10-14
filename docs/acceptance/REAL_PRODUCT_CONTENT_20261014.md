# Real product content preparation, 14 October 2026

Owning action: MAP-023, IDEA-20261014-04. MAP-027 retains product-knowledge acceptance. MAP-018 is closed.

The owner requested completion of real inventory details, natural descriptions, SEO and image preparation, and instructed us to research the web first. Barcodes will be entered later, SKU by SKU. The audience and purpose follow the existing K2 Storefront: customers choosing named products, checking the exact pack and adding the intended item to their cart. The primary action remains Add to cart; staff chat supports questions about an item.

## Prepared content

`outputs/01a1395d-4c7c-77b2-9fe8-1760963e7e0c/product-content/K2_PRODUCT_CONTENT_REVIEW.csv` contains all 196 original provisional groups with their existing P0001-style review IDs, source rows and original internal notes. The JSON companion preserves the same data without CSV encoding or formula ambiguity. `K2_SOURCE_STOCK_PRESERVED.json` retains all 241 original stock records and links them to their review groups.

There are 155 description and SEO drafts, 40 manufacturer-reference candidates and 41 descriptions held because the product identity remains too vague. Each row has a proposed public title, draft search terms, a suggested slug, image filename/alt draft, photo capture requirements and the specific facts still needing confirmation. Customer copy excludes display locations, arrival dates and batch notes. Original names and staff notes remain intact. Suggested slugs can repeat across separate stock groups for the same product; they are not unique canonical identifiers or import keys. Do not merge stock groups based on those suggestions.

Humanizer was applied in embedded mode: draft, check for formulaic or unsupported claims, then revise. Descriptions use the named product and practical serving or selection information. No invented quality claims, reviews, guarantees, health benefits, skin treatments, precious metals, fragrance notes, certifications or authenticity claims were added. Neutral SEO describes the product; ranking and traffic improvements have not been measured. Unknown ingredients, allergens, origin and exact storage instructions remain blank rather than being represented as confirmed.

Examples of manufacturer-supported drafts:

- Baiocchi Pistacchio pairs shortcrust biscuits with a soft pistachio cream filling. [Mulino Bianco](https://www.mulinobianco.it/baiocchi-pistacchio)
- Barilla Ragù alla Bolognese is a tomato-based pasta sauce with beef and pork. Warm gently, then stir through freshly cooked pasta. [Barilla](https://www.barilla.com/it-it/prodotti/sughi/ragu/ragu-alla-bolognese)
- Nutella Biscuits have a crunchy biscuit shell and a creamy Nutella filling. [Nutella Italy](https://www.nutella.com/it/it/prodotti/nutella-biscuits)
- Tortina White combines crisp wafers, hazelnut cream and a white chocolate coating. [Loacker](https://www.loacker.com/int/en/products/exquisite-patisserie/tortina-white)

Manufacturer URLs in each row identify the actual research references. A reference is a candidate until the held label matches. Loacker blueberry/raspberry references identify Quadratini Yogurt, but the supplied names do not distinguish Quadratini from Thins; those attributes were not copied. Rio Mare/Nostromo references identify olive-oil products, while the source names often omit the oil/brine variant; those ingredients and storage directions were not assigned. Galatine blue packaging alone does not establish the milk-tablet variant. The Gimoka Gran Crema/Cioccolato mixed name is held because it may describe different drinks. No Vertuo compatibility is inferred from a Nespresso mention.

## Images and missing physical facts

The supplied `Downloads/10_13_2026_JINJIN-INVENTORY-2026.xlsx` contains no `xl/media/` entries. The bounded workspace/public/output image inventory and Downloads image/archive listing did not identify product raw photos. This does not establish that the owner's photos do not exist elsewhere. No generated or manufacturer packaging image was substituted for a photograph of the held product; no photo rights were assumed.

The CSV contains a product-specific filename stem and proposed alt text for mapping actual photos later. Capture the front label, back label, ingredients/allergens/directions, net content, batch/expiry and multipack contents. Clothing/accessory records instead need measurements, materials, size/colour and included contents. Preserve the original photo before cropping or background edits. Image work requires locating those actual files; a generated scene cannot verify the sold pack.

The previous source preparation's 42 groups without a selling price and unconfirmed sales deductions remain actual gaps. This batch preserves original quantities and prices; it does not certify today's physical saleable balance. Packaging, selling units, expiry, price and Website availability still need canonical staff confirmation. Barcode entry is owner-deferred and is not a prerequisite for this copy preparation.

## Verification and current state

Builder: `scripts/prepare-real-product-content-20261014.py`, run using the bundled Python runtime. Its conservation assertions pass: 196 groups, 241 unique source stock rows, byte-identical per-row original internal notes, existing review IDs retained, all records draft-only, and no em/en dashes in description copy. Independent readback verifies CSV/JSON equivalence, exact source group/stock mapping and blank unconfirmed factual fields. The original workbook and CSV remain unchanged. `verification.json` records source SHA-256 and counts.

Development verification: the first sandboxed `npm run verify:development` stopped at an existing loopback HTTP test (52/53), with zero requests received. The focused same test outside the sandbox passed 2/2. The subsequent complete `npm run verify:development` outside the sandbox exited 0, including 53/53 Admin cases and the remaining security/environment/import checks. No application code was changed to accommodate the sandbox networking restriction; no release gate or deployment was repeated.

These are offline preparation files, not the canonical Admin round-trip import format. They contain no ready-to-save record versions, canonical SKU assignments or publication authorization. No database, Vercel, Cloudflare, DNS, stock, catalog or customer records changed. No application release is needed for these content files. They do not close full production readiness or the actual buyer/staff transaction acceptance.

Exact next action remains in MAP-023: locate/map the actual product photos, resolve the 41 identity holds and row-specific label/pack/price/physical-balance checks, then transfer accepted fields through the existing canonical Admin Product Master review/save workflow and designate a real product for buyer/staff acceptance. Recovery: discard this new content folder and revert only this idea's script/documentation; original inventory, existing artifacts and live systems are unaffected.
