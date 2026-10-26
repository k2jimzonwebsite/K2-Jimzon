# Storefront SEO improvements — local preparation

Owner: MAP-024, IDEA-20261026-03 and accepted ideas 05–09. The owner requested implementation on 26 October. This batch is prepared on `codex/seo-audit-20261026`; no new production promotion is authorized or claimed here.

## Structured-data decision before implementation

Schema skill eligibility index: 89/100, strong candidate (alignment 25/25, Google support 18/25, factual completeness 18/20, correctness 15/15, maintenance 8/10, policy risk 5/5). This is an internal assessment, not a Google score or rich-result promise. The public storefront visibly identifies K2, its contact channels, social profiles and returns policy. Minimal OnlineStore identity is appropriate; addresses, hours, ratings, freight fees, return windows and unverified barcodes are excluded. The existing single product builder remains authoritative. Initial HTML and client navigation must use the same merchant builder; private and unavailable rendered routes must clear it.

Official references checked 26 October: https://developers.google.com/search/docs/appearance/structured-data/organization and https://developers.google.com/search/docs/appearance/structured-data/return-policy . Google supports an organization-level return-policy link without inventing detailed conditions. Local JSON syntax and route/visible-content checks are required; external code validation has now passed as recorded below. Google rendered-host acceptance remains unverified until this batch is deployed.

## Work and evidence

The owner requested improvements to discovery, mobile delivery and factual Pasabuy content. Source preparation is qualified; this batch is not deployed. Full initial-body rendering remains an architecture assessment under idea07. The prior production PR33, Google property/link, accepted index requests and Analytics setup remain the previously verified state.

- Public menu, footer, Home calls to action and product rails now expose native canonical links. Ordinary navigation retains shared client history/focus; modified clicks retain browser behavior. Filters and private basket actions retain their existing behavior.
- Contact, Privacy, Terms and Returns have distinct initial and rendered page heads. Store/Policies aliases canonicalize to their existing destinations. The shared sitemap stays4marketing+107ready=111URLs;9held products remain noindexed. No new sitemap/index request or publication flag changed.
- Existing brand fonts are served locally, with their official source hashes and OFL licenses. The existing wood JPG has a25,100byte delivery copy versus543,116bytes.231reviewed source URLs resolve to209unique source hashes/418bounded256or768px lossless WebP files, all hashes/dimensions/provenance verified. Original detail photos remain unchanged; new/unknown uploads and failed derivatives use original URLs. The current Home3image rail reduces about2.57MB of source images to120,598bytes; this is an asset-byte comparison, not an actual-host speed or CWV result.
- Home shipping copy and Pasabuy disclosures explain request details, approval before buying, agreed sea/air and destination confirmation. No fees, shipment deadlines, nationwide promise, reviews or examples were fabricated.
- One shared OnlineStore builder describes visible public identity/contact/social/return-policy facts in initial and rendered heads. It clears on private/unavailable rendered routes. A read-only narrow catalog brand join enriches the existing product builder:116brands,49recordedweights,0recordedorigins. Baseline fields and116/107/9scope are unchanged. Existing runtime stock remains current; no static stock promise, GTIN or country is guessed.
- The Optional analytics prompt defers in the immersive store without writing or granting consent, then reappears on leaving. Existing permission, decline, privacy, expiry, private-route disable and withdrawal behavior remain qualified.

## Verification and independent review

Durable logs, original failures, source/media receipts and screenshots are under seo-improvements-20261026/. Archived log copies normalize line endings and trailing horizontal whitespace; original captured hashes/bytes are retained in the companion JSON, and original runtime files remain in .tools. Companion JSON pins the evidence. Actual commands/results:

| Check | Result |
| --- | --- |
| Existing test:store-orientation |12/12pass after collision fix; all10previous CI failures included |
| Playwright selling config / search-visibility-ui |22/22pass; final alignment follow-up2/2 |
| API config / affected sitemap, identity, discovery, polish, copy, policy and video contracts |137/137pass |
| Existing map027 storefront journeys |44pass+4filename expectation failures, then all4pass after JPEG→WebP expectations;48reconciled |
| npm run verify:development |exit0 once after final behavioral code edit; later EOF-only cleanup has no behavior change |
| npm --ignore-scripts run build:storefront |exit0; landing146.84/150.50KBJSgzip and29.99/30.00KBCSSgzip; boundary/secrets pass |
| npm --ignore-scripts run build:admin |exit0;227.44/300KBapplication, boundary/secrets pass |
| node --test tests/vercel-build-output.test.mjs |3/3pass; separate APIs/security and hashed cache routes preserved |
| Built HTML and delivery verification |111URLs,116brands,49weights,4distinctpolicy/contactheads,one merchant block per125generatedpages;418hashes and dimensions match |
| K2 read-only gates |exactprojectpreflight;readiness8verified/2owner/3connector/0failed after2preserved provider timeouts;catalogrefresh116rows;anonymousbrandrelationHTTP200 |

The initial browser run timed out during local server startup. The documented no-watch acceptance mode then passed. An initial legacy journey run was stopped at an obsolete button selector; semantic expectations were corrected, without weakening behavior assertions. The full legacy run's four remaining failures only expected wood-bg.jpg; focused unchanged behavior checks passed with wood-bg.webp. Original REDs and partial runs are retained. Prior remote CI40315394577 remains historically failed, not retroactively green. New PR CI and the full pre-promotion release gate are separate.

Independent source reviewer reports no Critical/Important findings; one Minor desktop anchor alignment note was corrected and confirmed. The fresh visual reviewer used the installed fallback reviewer contract and returned disposition **ship** for the supplied26localproduction-build captures and sampled source. Its actual scope/limitations are in finish-review.md; there was no new comp round. All26captures were opened, including both themes and320/375/777/1440widths; scrollWidth stays within viewport. Three detector findings are unchanged incumbent interactive-store CSS/pinned Fraunces; no identity restyling. The independent documenter retry completed after an initial usage interruption, confirmed ordinary extension, and preserved PRODUCT and the design sidecar. Two wording corrections in the new DESIGN note were resolved; see design-documentation.md.

## External schema validation

In the connected browser for k2jimzonwebsite@gmail.com, the exact prepared Combino HTML was submitted as code input. [Google Rich Results Test](https://search.google.com/test/rich-results/result?id=XfZuCyicSTW72VyN60AUpA) reports6validitems:Product snippet,Merchant listing,Breadcrumb,Local business,Organization,Return policy. Schema.org reports0errors/0warnings and3top-levelitems. This is prepared-code validation, not a deployed URL inspection or indexing promise. Screenshots and external-validation.json are retained.

Merchant-listing optional notices remain for Offer availability/shippingDetails/hasMerchantReturnPolicy. Static availability/freight is deliberately omitted instead of inventing current stock or a quoted fee; runtime availability uses canonical public stock and the global organization return-policy link validates separately. Other optional rating/address facts are likewise not invented. Search Console enhancements/outcomes remain to be checked after publication.

## Remaining and recovery

Only MAP-024 owns unfinished work: complete the feature PR receipt, obtain explicit live-promotion approval, run verify:release once immediately before that promotion, then verify both actual artifacts/hosts, anonymous brand reads, linked public routes, media/fonts, Google rendered product/Pasabuy and consent/private behavior. Rerun mobile PSI on actual hosts after promotion; no lab/field improvement, new indexed product count, rank, traffic, conversion or sales result is claimed yet. Preserve pre-existing OAuth/human/physical acceptance gaps and later initial-body architecture assessment; deferred ideas10–13 remain outside the queue.

Recovery: scoped source revert or restore the prior approved artifacts. Originals and provider/business state are unchanged; no database rollback, catalog activation replay, terms acceptance or duplicate indexing request. All pre-existing modified tracked screenshots and original untracked screenshot folders were preserved and excluded from this batch. No application builds/tests are required for receipt-only documentation updates.
