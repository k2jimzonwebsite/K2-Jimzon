# Barcode assisted product listing

## Agreed behavior

Staff scan a package EAN, UPC or GTIN on a phone. Admin checks K2's product master first. A known product opens its existing inventory path; an unknown code may receive a public catalog identity suggestion. Staff compare the exact variant and size against the physical package, then capture front, back and barcode photos. The prepared AI intake can use those private package photos to draft product copy, SEO fields and image candidates when the paid provider is enabled. Staff review each field and image before saving a Draft. They can upload their own storefront photos through the product's Photos action after saving the Draft; AI images are optional. Price, stock, batch, expiry and publication remain separate commands. A failed lookup or AI call leaves the manual intake usable.

Assumptions: occasional staff scans rather than bulk imports; a lookup should return within five seconds or show a manual fallback; only authenticated Admin staff can call the server lookup; package photos remain private; paid AI keeps the existing per-product, per-session and monthly controls. A saved Draft is not a sellable product.

## Source and image rules

The first public source is Open Food Facts for grocery barcodes. Its fields are suggestions, never canonical product facts. A matching barcode can still name a different formulation, market or pack; the photographed label wins. K2 records the source, lookup time and staff decision, but does not copy public catalog images. Staff can upload their own primary, after-use and supporting storefront photos, whether or not AI images are available. The private intake evidence is never published automatically. Any future AI image candidate must use K2's own package photos and requires staff review before assignment. Product URLs stay noindex until the existing publication and SEO gates pass.

The free Gemini SEO suggestion rechecks Open Food Facts. If that fresh result changes the confirmed barcode, name, brand or quantity, staff must inspect the package and scan again. Changing or rejecting the confirmation discards any suggestion still loading. The small SEO suggestion remains separate from the complete product research JSON required before a Draft; it never fills missing label, safety or media facts by inference.

## Decision log

| Decision | Alternatives considered | Reason and review disposition |
| --- | --- | --- |
| Reuse the current seven-step Admin intake | Create a second listing system | One canonical SKU, Draft, media and publication authority. Owner accepted this flow. |
| Use a public barcode catalog first | Commercial catalog; package photos alone | No new provider contract for an initial grocery pilot. Coverage gaps and outages go to manual intake. Owner selected this source strategy. |
| Offer optional AI images from package photos | Reuse catalog images; supplier media | Owner selected AI candidates from package photos, then clarified that staff can always upload their own storefront photos. Catalog image reuse has separate rights and fidelity risks. |
| Require staff identity review | Auto-accept barcode match | Skeptic, constraint and user reviews found variant mismatch and label fidelity risks. Accepted as a gate. |
| Keep paid AI activation separate | Switch it on with the lookup | Existing OWNER-007 and MAP-017/020 gates control keys, model access, budgets, retention and real-host proof. GPT-6 Luna is a text candidate, not an activated setting. |

The multi-agent design review disposition was **APPROVED** after accepting exact-variant checks, source provenance, bounded calls, distinct no-match/outage states, private photos, staff review and manual recovery. No objection remains against this prepared design. Production activation and real stock acceptance remain in MAP-018 and OWNER-007.
