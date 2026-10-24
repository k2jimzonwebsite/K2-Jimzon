# Live shopper journey and listing readiness

MAP-023 / IDEA-20261024-07. The owner asked whether listings are fully production ready and requested acting as a shopper, with successful checkout and payment assumed. This receipt distinguishes the actual walkthrough from that assumption.

**Assessment: the basic shopping and order-request path works, but full production readiness is not established.** Resolve the confirmed mobile interaction and search gaps, complete the applicable live product information, and retain the separate real order/fulfillment acceptance. The 66 intentionally hidden Drafts can remain hidden while staff resolve their documented facts; their existence alone does not prevent launching a supported subset.

## Observed live path

Actual host: https://www.k2jimzon.com. Exact-K2 reads at **2026-10-24T13:39:17.894Z** and **13:48:05.660Z** both show196products,130Live Website listings,66Drafts,49batch records and273projected units. There are44positive-availability and86zero-availability Website listings. A projection is not a new physical count.

| Step | Actual result |
| --- | --- |
| Home to catalog | Shop the Collection opens the130-product catalog. Categories are available. |
| Natural search | English pistachio returns only sold-out Gusto Etna. Italian pistacchio returns four products, including three in stock. This is a confirmed discovery gap. |
| In-stock detail | K2-SKU-001173 Siciliani Pistacchio Crunchy200g shows PHP499,7available,200g pack/net weight and relevant primary/AFTER presentation. |
| Quantity upper limit | Increasing from1to7 gives PHP3493 and disables further increase. No quantity above stock was added. |
| Basket arithmetic | Two jars give PHP998; increasing the cart to3gives PHP1497; decreasing back to2restores PHP998. Name and200g remain visible. |
| Refresh persistence | Reload retains the two-item basket. |
| Checkout review | Correct product, quantity2, unit price499 and products total998. Contact/delivery labels and manual payment expectations are visible. |
| Standard delivery | NCR → City of Manila → Ermita → Barangay659 returns PHP95, totalPHP1093, with package weight explicitly estimated and a delivery-charge acceptance choice. No fee acceptance or final submission was made. |
| Express delivery | NCR express requires a staff quote; total stays not final. No courier booking. |
| Pickup | Quote settles at No charge and totalPHP998. |
| Invalid coupon | QA-INVALID-20261024 produces That coupon is invalid or not eligible for this cart. The998+95total stays1093. |
| Payment preferences | GCash and MariBank choices are available; alternate preference can be selected. Actual payment is assumed per owner, not tested. |
| Security check | Cloudflare Success is visibly observed automatically. Agent did not solve a challenge or bypass protection. Contact fields stay blank; submit stays disabled. |
| Phone checkout |390x844emulated viewport,375pxdocument width and375pxscroll width: no horizontal page overflow. Chat overlaps the submit button; see finding below. Phone dark/light and desktop screenshots inspected. No physical phone/touch acceptance claimed. |
| Sold-out product | K2-SKU-001071 Gusto Etna600g stays sold out, with Pasabuy instead of Add to cart. |
| Pasabuy handoff | Keyboard and standalone pointer activation open /pasabuy. Form receives exact Gusto Etna Pistachio Spread20%600g, quantity1and the source SKU note. No request was submitted. |
| Cleanup | Remove the two unsubmitted test jars; empty basket total0and Review order request disabled. Original dark mode, normal1280x720viewport and initial001071page restored. |

An initial immediate Pasabuy click after route navigation showed no transition. Later keyboard and settled standalone pointer rechecks both pass with correct prefill. The initial observation is retained and **is not a confirmed dead-button finding**. Likewise, loading snapshots during search/quote transitions are not final results; settled captures are the evidence above.

## Confirmed findings

After means required target below; no fix has been implemented or deployed by this test.

| Before | After | Why |
| --- | --- | --- |
| At390x844, the fixed chat button overlaps mobile Submit order request by **131x33.97px**. Submit rect x37–338/y695.97–747.97; chat x207–355/y714–764. Label/right-side click area is covered. | Keep the complete checkout action and label clear of fixed chat/navigation at normal form scroll positions and both themes. | A shopper should not need to scroll around a floating widget to read or activate the primary action. Existing mobile overlay work remains the implementation owner. |
| English pistachio finds only one sold-out product; pistacchio finds4including3in stock. | Reconcile English/Italian spelling support through the existing catalogSearch implementation and its pending work. | A normal English query currently hides buyable matches. Do not create a second search implementation. |
| Sampled001173food detail has no ingredient/allergen information and Product details says information unavailable; staff must supply it. | Record supported label facts or provide the relevant verified information before relying on a complete listing claim. | Important buying information is still deferred to staff. Unknown facts must stay unknown rather than be generated. |

The first finding affects an important mobile action; the second has a spelling workaround. Content completeness needs product-specific judgment. No unsupported legal/WCAG compliance conclusion or blanket barcode requirement is inferred.

## Listing inventory context

SELECT-only presence checks across130Website products find0missing primaries,0nonpositive retail SRPs and0unreviewed flags. This confirms presence/flags, not correctness of every label or every image. Dedicated Pack size is blank on51and Net Weight on81; names or front photos can still contain legitimate quantity information, so these counts are not automatic publication failures.

All130dedicated shipping_weight_g fields are blank. The tested checkout nevertheless calculates delivery using an **explicit estimated weight**, so a missing field is not proof that quotes fail. Staff need to validate actual parcel weight/fee before final payment instructions. All130legacy ingredients/allergens fields are blank; separate Product Knowledge was not exhaustively queried. Do not translate those column counts into a claim that every public page has no ingredient information. The sampled001173page demonstrably lacks it.

Seven exact-name groups cover20Website records: Borella Carne, Borella Prosciutto, Chalou and four G.Bellini lines. Same names do not establish duplicate inventory; preserve SKU histories and use the existing protected family/identity workflow when facts support it. This remains a shopper clarity consideration rather than an instruction to merge records.

The earlier12perfume photo corrections and five recovered listings remain untouched. The66-product staff Word reference remains at docs/staff/K2_Jimzon_66_Draft_Products_Staff_Handoff_20261024.docx.

## Assumed and unverified

Successful order submission and payment are the owner's explicit assumption. This walkthrough therefore does **not** prove actual order creation, confirmation, payment receipt/verification, reservation, exact-lot picking, dispatch, tracking or delivery. Genuine hosted operational acceptance remains in MAP-023. No contact data was entered and no production order, Pasabuy request, message, payment or courier booking was submitted by this check.

Fresh preflight:k2-project confirms pixplcjqivlfflickobf and the exact K2 URL. readiness:k2-live exits0with9verified/2owner/3connector/0blocked. Owner stock facts/hosted-caller acceptance and unreached connector surfaces remain separate; passing preconditions do not make this a completed production E2E or authorize a write.

## Conservation and evidence

Python assertions pass: **all196complete product records identical**, Website memberships identical, batch count49unchanged; test SKU stays PHP499/7units. Cart restored to0, no active viewport override, original dark restored. No application source edit, K2 SQL write, migration, provider setting or deployment occurred. No application build/release suite was necessary for a read-only hosted walkthrough and documentation receipt.

Raw snapshots/DOM/screenshots/gates: outputs/shopper-e2e-20261024. Tracked key evidence: docs/acceptance/shopper-e2e-20261024/verification.json, listing-completeness.json, mobile-submit-overlap.json and inspected screenshots. Read command: node --env-file=.env.local outputs/inventory-photo-audit-20261024/read-live.mjs, copied into this task's before.json/after.json. Conservation check asserts before.products==after.products, before.website==after.website and both lot counts49. DOM receipts assert the settled standard/pickup totals, coupon error and exact Pasabuy SKU prefill.

Owning backlog remains **MAP-023**. Exact next: use the existing mobile-overlay work to clear checkout CTA/chat overlap, reconcile spelling support with the existing search work, and complete applicable reviewed product facts. Then repeat only affected hosted shopper checks under normal release authorization; real order/fulfillment acceptance remains separately required. No completed save or earlier media correction should be replayed. Recovery for this audit is scoped documentation correction; test basket/display restoration already passed.

![Confirmed mobile checkout overlap](shopper-e2e-20261024/checkout-mobile-dark-overlap-confirmed.png)
