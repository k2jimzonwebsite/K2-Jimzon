# K2 Product Content Project

## Purpose

This private ChatGPT Project turns evidence for one exact sellable product into
the final Draft content K2 staff will review and store. It produces content
only. It does not generate images, create inventory, assign an SKU, set a price,
or publish a product.

## One-time Project setup

1. Create a private ChatGPT Project named **K2 Product Content**.
2. In Admin BOS, open **Scan center → New product research**.
3. Copy **Content Project instructions** and use the complete copied text as the
   Project instructions. The canonical text lives in
   `src/views/admin/productResearchPrompt.js`.
4. Keep this Project separate from the K2 Product Image Studio so a content
   response can never be confused with an image response.

## Per-product input

Attach clear photos for one exact variant:

- front package;
- back or label;
- readable barcode and exact variant;
- ingredients, allergens, directions, storage, warnings, and nutrition or INCI
  panels when applicable.

Then paste the `PRODUCT_JSON` request copied from Admin BOS. Do not combine
different sizes, flavors, concentrations, shades, formulations, or pack counts
in one chat.

## Exact output responsibility

The Project returns one `k2.product-content.v3` JSON object and nothing else:

- `product`: exact identity and label facts;
- `copy`: card copy, full description, useful highlights, and restrained buying
  reasons;
- `seo`: SEO title, meta description, page heading, supporting heading, and
  specific search phrases;
- `usage`: suitable use cases kept separate from ordered preparation,
  application, or operating instructions;
- `media`: text handoff for the separate Image Studio;
- `verification`: sources, unsupported fields, and staff review notes.

Unsupported factual values remain `null` or `[]` and are listed in
`verification.unknown_fields`. Package photos are primary evidence. Official
manufacturer, regulatory, or distributor sources may fill gaps when their
direct URL is recorded. Marketplaces and reseller copy are discovery leads, not
final evidence.

## Foolproof boundaries

- Never output SKU, internal ID, slug, status, review state, stock, quantity,
  price, cost, expiry, batch, lot, delivery, or marketplace availability.
- Never invent origin, authenticity, ingredients, allergens, safety, product
  performance, scarcity, certifications, or customer outcomes.
- A use case explains when or why the product is useful. An instruction explains
  how to prepare, apply, operate, or use it. Do not repeat one as the other.
- Ready-to-use products may have no ordered procedure. Do not invent steps just
  to fill the JSON.
- Return the exact schema keys with no prose or Markdown around the JSON.

## Staff acceptance checklist

Before saving the Draft, staff must confirm:

- the barcode, product name, variant, size, concentration, flavor, shade,
  formulation, and pack count match the physical package;
- label claims, ingredients, allergens, warnings, storage, and directions match
  readable evidence;
- descriptions, headings, and SEO copy are factual and not repetitive;
- use cases and instructions are distinct, practical, and supported;
- unknown facts remain unresolved instead of being guessed;
- every source points to the correct exact variant;
- the JSON contains no operational fields.
