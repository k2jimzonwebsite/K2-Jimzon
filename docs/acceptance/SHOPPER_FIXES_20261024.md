# Shopper fixes — local verification, 24 October 2026

Owner: MAP-023 / IDEA-20261024-07. The owner authorized fixing the confirmed shopper findings with all four design skills, Superpowers and Andrej Karpathy. This receipt follows `SHOPPER_JOURNEY_20261024.md`; it does not replace that actual-host evidence with local fixtures.

## Result and source boundary

The checkout collision and English/Italian pistachio discovery gap are corrected and verified locally. No main push, merge, PR, deployment, provider setting, SQL, product-data save, review/publication decision, stock, price, customer, message, order or payment change occurred. Existing feature branch `codex/admin-google-turnstile-recovery` and unrelated dirty work are preserved. The production hosts still need a separately authorized source promotion and affected hosted checks. Full real order/payment/fulfillment acceptance remains open under MAP-023.

| Before | After, verified locally | Why |
| --- | --- | --- |
| Fixed chat covers the checkout submit button; original live overlap131×33.97px | Reuse `StorefrontChatButton` in the checkout introduction, in normal document flow; suppress the shell's floating instance only for checkout | Help remains available without covering form actions at any scroll position |
| Removing the opener while opening the drawer could shift inline content and lose return focus | Inline opener remains mounted while the existing dialog opens; Escape returns focus to it | Preserve layout and keyboard recovery |
| English pistachio finds only the English-named sold-out listing | Existing token scoring recognizes complete pistachio/pistachios/pistacchio/pistacchi words across the same searchable fields | Discover Italian-named available products while retaining literal ranking, explicit sorting, categories and recommendation deduplication |

Changed source: `src/components/shop/StorefrontChatButton.jsx`, the chat import/inline render sites in `src/views/Checkout.jsx`, and the bounded alias helper/call sites in `src/lib/catalogSearch.js`. Existing family/variant/name, canonical brand and subcategory work in these files predated this slice and is preserved. No new dependency, search engine, data model, palette, typography or animation system.

Skills applied: using-superpowers, systematic-debugging, brainstorming/writing-plans within the sole owning MAP item, test-driven-development, andrej-karpathy, ui-ux-pro-max, impeccable, design-taste-frontend, emil-design-eng, verification-before-completion and requesting-code-review. Owner's explicit proceed accepted the bounded fixes; no redesign was proposed. The existing K2 wood/editorial identity and design tokens govern the refinement.

## Verification

| Check | Observed result |
| --- | --- |
| `node --test tests/catalog-search.test.mjs` before alias |9pass/2fail; English search returned only Etna, missing the three Italian-named fixtures |
| Same command after alias |11/11pass, including singular/plural/case, literal exact-name ranking, category/price ordering, multiword relevance, no added Pistacchiotto alias, existing brand/subcategory cases |
| `npx playwright test tests/checkout-chat-ui.spec.js --config playwright.storefront-recovery.config.js --grep '390px light'` before chat correction |Expected zero overlap, actual4658px²; meaningful browser RED |
| Same file/config after correction |8/8 responsive cases pass:320/390/430/1440px, light/dark, reduced motion. Zero measured submit/chat overlap, no horizontal overflow, ≥44px chat target, one checkout help button, keyboard Enter opens real drawer, Escape closes and restores focus |
| Same file/config `--grep 'empty checkout\|English pistachio'` |2/2pass: empty-cart checkout help/focus; rendered catalog has one direct match for English and Italian against the Italian-named synthetic product |
| Independent `shopper_fix_review` |No actionable findings; independently reran search11/11 and inspected source/390px dark help image; code approved subject to final gate/receipt |
| `npm run verify:development` |Exit0 after final code edits, once. Lint, relevant contract/security suites, environment/dependency boundaries, source secret scan and import integrity pass. Full log: `outputs/shopper-fixes-20261024/development.log` |
| `npm --ignore-scripts run build:storefront` |Exit0. Explicit build script runs normally; npm pre/post hooks suppressed to avoid repeating the completed development gate. Build, static recovery/metadata, production boundary, bundle budgets and dist secret scan pass. Landing JS149.82/150.50kB and CSS29.99/30.00kB gzip. Log: `outputs/shopper-fixes-20261024/storefront-build.log` |

The ordinary selling fixture initially stalled on CSS transformation; the first sandboxed attempt also could not access loopback. Both attempts were interrupted, not reported as passing. Reusing the repository's existing no-watch storefront-recovery fixture resolved local execution. Its testMatch now includes the new checkout file, so the normal `test:storefront-recovery`/release chain retains this regression. No live connection was used in those tests.

Sixteen captures are in `docs/acceptance/shopper-fixes-20261024/` (submit and help at all eight width/theme combinations). The320light help,390dark submit and1440light help captures were visually inspected together. No second polish batch was needed. Captures contain explicitly synthetic product data; the blocked test challenge shows the existing failed/retry state, not a production CAPTCHA failure or successful checkout. Chromium viewport emulation verifies layout, not physical-device/Safari acceptance. No real order/payment was submitted. Release suite and separate Admin build were not required for this storefront-only local fix; full release qualification remains required before promotion.

## Exact food information still missing — K2-SKU-001173

Product identity is Dolgam I Siciliani Pistacchio Crunchy200g. Research found a material recipe conflict under the same maker/line/form/size, rather than merely a wrapper-color difference:

| Source | Evidence and limitation |
| --- | --- |
| [Italian Gourmet IE, Crunchy200g](https://www.italiangourmet.ie/products/pistachio-cream-with-pistachio-crunks-crunchy-made-in-italy-i-siciliani-200-g-jar) |Lists25% pistachio, palm/palm-kernel fats and lactose. Source advises checking the actual label. |
| [Italian Gourmet FR, Crunchy200g](https://www.italiangourmet.fr/products/dolgam-i-siciliani-crunchy-creme-tartinable-pistaches-avec-pistaches-hachees-200-g-sans-huile-de-palme-sans-gluten) |Lists30% pistachio with coconut/cocoa fats, conflicting with the other exact-named product. Duplicate text even varies the color additive notation. |
| [Dolgam maker products](https://dolgam.it/prodotti/) |Search confirms maker range/200g products; direct fetch timed out and no exact current Crunchy back-label formula was verified. |

Do not copy a Fratelli Sicilia/Scyavuru/BonCrem/industrial filling formula, choose one conflicting recipe, assert gluten-free/palm-free certification, or treat agreement between retailers as actual K2 package evidence. No ingredient/allergen/nutrition/storage value was changed. Price499,200g and all existing listing/stock decisions remain untouched.

Exact next staff evidence: one clear full back/side label photo of the actual001173 Crunchy200g jar showing the complete ingredients, emphasized allergens and precautionary traces; include its front in the same capture set to bind the line. Then translate/save the supported fields through the existing reasoned normal Admin Product Master/review workflow after fresh exact-K2 preflight and zero-failed readiness, reopen and verify the actual public details. No new blanket barcode, expiry, stock-count or online-price requirement. Preserve pending Product Knowledge separately; optional recipe instructions are not the package ingredient declaration. This unresolved fact and genuine operational acceptance stay in MAP-023, not another backlog.

## Handoff and recovery

Owning item remains MAP-023. Next source action is a separately owner-requested release with the existing complete release gate, separate Storefront/Admin artifacts and real-host checks for checkout action clearance/chat, English/Italian search and unchanged shopper flow. No approval is inferred from a credential. There is no pending provider/data command to retry.

To undo this local slice, remove only the new inline prop/checkout suppression/ARIA attributes, the two checkout chat render sites/import, the alias helper/token call-site replacements, this new browser test and its testMatch entry, and the two new alias tests. Preserve all pre-existing dirty family/search/checkout work, the original shopper audit, source snapshots, review and verification evidence. Never use a whole-file reset or stale database snapshot as recovery. Once deployed, use a reviewed source-only rollback followed by affected hosted checks; there was no database migration or product save to reverse.
