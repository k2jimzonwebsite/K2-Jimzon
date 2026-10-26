# Search visibility and optional Analytics — 26 October 2026

Owner: MAP-024. Ideas: IDEA-20261026-03 / IDEA-20261026-04, merged with IDEA-20260924-06. Branch: `codex/search-visibility-20261026`, based on `a3aca9f2f60c647089d1bea52398e419fc37da77`. This receipt distinguishes provider state from prepared source and actual production behavior. Remaining execution lives only in MAP-024.

## Verified production outcome

26 October2026 / MAP-024 / IDEA-20261026-03 and -04 — VERIFIED LIVE: owner-approved PR33 merged19b06e1cfff313cc375eed26751a540ccbd34805, tree identical to qualifiedf2bf9259. Separate Storefront FJhkvMsgp64srSX4TvmwZZ7K5CtU and Admin DNN4DFxha9skuoVH8XRpshv4YjdN are Ready/Production/Current on exact source and canonical aliases. Actual XML111URLs (4public+107approved products),9held noindex, representative raw/hydrated metadata/images and private/Admin boundaries pass. Google Pasabuy live test now available/can be indexed, rendered actual storefront, indexing request accepted; changed sitemap accepted. GA4 actual204 sanitized public pageview, consent/decline/private/withdrawal and one-event-per-navigation pass; realtime reports1active user/3views on public / and /pasabuy from controlled verification, not customer growth. Source publication and setup are complete. Search Console processing/index selection/rank, remote CI terminal receipts and unrelated callback acceptance remain MAP-024. No business/stock/SQL/Admin settings write. This supersedes earlier preparation/approval/Soft404/no-ingestion checkpoints below. Evidence/recovery: docs/acceptance/SEARCH_VISIBILITY_SETUP_20261026.md/json.

[PR33](https://github.com/k2jimzonwebsite/K2-Jimzon/pull/33), [Storefront production](https://vercel.com/k2-jimzon/k2-jimzon/FJhkvMsgp64srSX4TvmwZZ7K5CtU), [Admin production](https://vercel.com/k2-jimzon/k2-jimzon-admin/DNN4DFxha9skuoVH8XRpshv4YjdN). Subsequent sections retain their historical checkpoint timing; the current result above supersedes pending-release/Soft404/no-ingestion statements.

## Request and decisions

The owner requested Search Console, Analytics and SEO setup through the built-in browser signed in to the correct K2 accounts. The owner expressly accepted Google Analytics' Philippines Terms of Service and Data Processing Terms and approved consent-first public page measurement. Later steering targets the public storefront, Pasabuy, Italian imports and Italy-to-Philippines searches; Admin is satisfactory and further Admin changes are out of this slice.

At the first checkpoint the product noindex gate remained ON in both source/config surfaces. Automatic approval review rejected exposing up to107pages without sufficiently specific consent; that patch was not applied. The owner subsequently explicitly selected “Publish fixes and allow Google to index the107reviewed search-ready products; keep9products noindexed.” This authorizes the live source release and resolves the exact rejection. The coupled switch/header are now changed locally, with per-row holds retained; fresh exact-K2 readback confirms the identical107-SKU set. Production remains pending release-gate/host verification at this checkpoint.

## Applied provider state, verified in the connected browser

| System | Observed result |
| --- | --- |
| Google identity | `k2jimzonwebsite@gmail.com` |
| Search Console | DNS-verified domain property `sc-domain:k2jimzon.com` |
| Hostinger DNS | Added only TXT `@`, TTL300, `google-site-verification=Cf1015RvRuY0QrsGuUxa1fWSQzO32CQv2gPcLLpHIsU` |
| Existing web DNS | Preserved www CNAME `f683b7ff3d09cb06.vercel-dns-017.com`, admin CNAME `be6a2ad6b5b189c6.vercel-dns-017.com`, apex A `216.198.79.1` and `64.29.17.1` (all TTL300) |
| XML sitemap | `https://www.k2jimzon.com/sitemap.xml`: Success, processed successfully, four discovered pages |
| Homepage | Google reports URL on Google / Page indexed; selected and declared canonical `https://www.k2jimzon.com/`; last crawl18October smartphone |
| Catalog | Unknown/unindexed at inspection; indexing request accepted |
| Trade | Discovered/currently not indexed; indexing request accepted |
| Pasabuy | Indexing request rejected after live test: Soft404; Google-rendered screenshot shows `UI_SECTION_UNAVAILABLE`; console identifies failed lazy `Footer-CewJSbbb.js` |
| GA4 | Account413432161 `K2 Jimzon`, property560699207 `K2 Jimzon Storefront`, stream16204048028 `https://www.k2jimzon.com`, measurement `G-4JQ3D0GDB9` |
| Reporting | Philippines GMT+8 and PHP; Shopping/small business1–10 was the setup assumption |
| Collection choices | Optional account sharing off; enhanced measurement off; Google signals and user-provided data off; ads personalization disallowed in all307regions; granular location/device collection switched off and persisted |
| Search Console link | Verified domain linked to the exact GA4 web stream; persisted table checked |
| Retention, read only | Event data2months, user data14months, Reset on new activity on. Defaults observed; not changed |
| GA ingestion | GA home reported no data received; no live tag or ingestion acceptance claimed |

Provider evidence screenshots are in ignored local `docs/evidence/20261026-search-visibility/`: `search-console-ownership-verified.png`, `sitemap-success.png`, `homepage-indexed-google.png`, `catalog-indexing-requested.png`, `trade-indexing-requested.png`, `pasabuy-google-soft404.png`, `pasabuy-google-render.png`, `ga4-search-console-linked.png`, `ga4-collection-minimized.png`. The temporary GA terms screenshot is preparation evidence, not proof of acceptance by itself. These are workstation evidence, not guaranteed available in a fresh clone; the observed facts above are the durable receipt.

Read-only K2 preflight confirms `pixplcjqivlfflickobf` and its exact Supabase URL. Readiness passed8verified/2owner/3connector/0failed after the initial sandbox-network failures were preserved. A provider not reached remains connector-blocked, not observed. No SQL, product, stock, price, user, credential or OAuth configuration writes occurred.

## Prepared source and rationale

- `StorefrontApp.jsx`: isolate a failed lazy Footer from the page; isolate the optional Analytics module so its failure cannot replace shopping content. The actual Google failure was reproduced with a failing local import regression before correction.
- `ProductCard.jsx`: real canonical product anchors preserve normal SPA navigation and browser modified-click behavior. This lets crawlers discover public product URLs without interpreting button actions.
- `storefrontAnalytics.js` / `StorefrontAnalytics.jsx`: Google tag loads only after explicit acceptance, on the canonical public host. Application page views carry a fixed title, allowlisted public path, canonical location without query/hash and referrer origin only. Private account, messages, checkout, confirmation and unknown views suspend collection before history changes. StrictMode/same-route deduplication, DNT/GPC, withdrawal, cookie cleanup and180day consent expiry are enforced. Expiry is rechecked in an open tab, on focus and visibility changes; storage failure is explained.
- Footer supplies equal, reversible consent choices. Initial display is nonmodal and does not steal focus; deliberate reopening focuses the choices; Escape restores the opener. Privacy copy includes the Google partner-processing link. Report-only storefront CSP permits the approved tag and collection endpoints; it is not an enforced-CSP claim.
- Existing catalog projection now reads explicit public columns only from Live/Active, published, human-reviewed Website members through the exact K2 read-only management surface. Snapshot contains116shopper listings;107have a genuine HTTPS primary image and a nonempty description distinct from the other current descriptions. Nine remain search-held:001028/001029,001038/001039,001064/001065,001162/001163/001164. Their shopper listings are preserved. Search hold does not determine whether two variants are operational duplicates.
- Existing sitemap generation excludes `search_indexable:false`; product share pages remain available with noindex for held rows. Runtime metadata follows the same eligibility list. The initial global gate kept all product URLs out of XML. After the explicit107-product approval, the local switch/header are changed together; the candidate sitemap has111URLs (four marketing and107ready products), while9held product share pages stay noindex. The116product HTML files do not mean116indexable pages.
- `/pasabuy` keeps one canonical URL and its existing title `Pasabuy from Italy to the Philippines | K2 Jimzon`. Description, visible heading and introduction now clarify the destination and itemized quote before buying. The process and badge describe the agreed sea or air option, fixing an old air-only claim. No keyword-stuffed satellite pages, invented reviews, promises of delivery time or ranking guarantees.
- `robots.txt` stays crawlable and points at the canonical XML sitemap. Blocking a page in robots would hide its noindex signal. No Admin URL or staff path is added to the public sitemap/robots or public bundle.

The existing Website/publication/stock authorities remain canonical. This is one discovery system, not another catalog or checkout implementation.

## Verification and limits

Evidence logs/captures are under ignored `.tools/search-visibility-20261026/` and `.impeccable/review/`.

| Check | Actual result |
| --- | --- |
| Focused sitemap, prelaunch and discovery contracts |34passed, `discovery-final.log` |
| New real-shell consent and recovery browser suite |12passed, `ui-final.log`; Footer/Analytics failure, real anchors, consent/URL sanitation/private suspension/deduplication/withdrawal, browser signals, keyboard recovery, expiry, five responsive/theme captures |
| Existing selling-surface regression + earlier scoped new cases |10passed before later keyboard/module/expiry additions |
| TDD evidence |Preserved failing Footer, anchor/consent, keyboard, Analytics-import and expiry checks, followed by passing focused results; production failure and early sandbox errors are retained |
| Public live GET verifier |HTTP200 home/robots/XML, four canonical sitemap URLs; `docs/evidence/20261026-search-visibility/live-discovery.json` |
| Three actual products, read only |001001,001017,001173 have distinct initial/hydrated metadata and decoded product images; raw/hydrated product noindex still on; `product-metadata-before-release.json` |
| Pasabuy copy capture |Five variants375light/dark,1440light/dark,777light; all document widths equal viewport, title/description and `/pasabuy` canonical path agree; local dev origin is intentionally localhost |

Final development/build results and source/evidence hashes are in the companion `SEARCH_VISIBILITY_SETUP_20261026.json`; they do not imply release-gate, deployed, Google-render or GA-ingestion completion. Full `verify:release` is reserved for the owner-requested live promotion.

Independent code review found no remaining Critical/Important issue after isolating Analytics failure and enforcing expiry in an open tab. Independent design finish review accepted the five consent variants after removing unnecessary elevation. Pasabuy review requested correcting the air-only badge; that correction was applied and five captures refreshed. The documenter confirms this is an ordinary extension: preserve PRODUCT.md, DESIGN.md and the existing design sidecar. The pre-existing deprecated Register/stale-sidecar notice is not repaired in this task. No raster is added to the product.

Browser fixtures isolate Google, fonts, video and backend data. They verify application commands and responsive behavior, **not** the real vendor's automatic session/engagement traffic, complete attribution, real conversions, physical-device behavior or actual provider operations. Application code sends manual `page_view` only; GA may also generate automatic events. Real-host network inspection, consent acceptance/decline/withdrawal and GA receipt remain required before a live-measurement claim. No purchase/key event is fabricated or defined from a request receipt.

## Scoped diagnostics

The SEO audit is a discovery readiness assessment, not a ranking forecast. A full-site SEO Health Index is withheld: content authority, backlinks, query positions and real traffic are unmeasured. The observed Critical Pasabuy Soft404 blocks a healthy-live-site verdict despite passing local repairs. Primary failure has high confidence (Google render/console plus local reproduction), high indexing impact, low/medium engineering effort, and first priority under MAP-024. Destination copy has high-confidence medium relevance impact and low effort; it is prepared only. Product indexing is an intentional owner gate, not an instruction to remove safeguards.

Measurement readiness diagnostic: **53/100, Broken — do not make performance decisions yet**. Decision alignment20/25 (public-page demand only); event model18/20 (one sanitized pageview contract); actual data integrity0/20 (tag not deployed/received); conversion definition5/15 (no false purchases, commercial funnel deliberately absent); attribution0/10 (query/referrer minimization; no campaign validation); governance10/10 (approved consent contract, documented boundary and recovery). This is a signal-readiness score, not a business KPI. Remediation is the approved source release and real vendor receipt; do not widen collection merely to raise a score.

Google guidance: [SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [blocking indexing](https://developers.google.com/search/docs/crawling-indexing/block-indexing), [SPA automatic events](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications#impact_on_automatic_events). Sitemap submission and better wording do not guarantee indexing or rank.

## Admin read-only qualification, closed at owner direction

Actual anonymous GETs: Admin root/staff HTML200 with `X-Robots-Tag:noindex,nofollow`, private/no-store; session API401; Admin sitemap404; storefront staff path404. Google inspection reports both Admin root and staff route unknown/unindexed (`admin-root-not-indexed.png`, `admin-route-not-indexed.png`). This is current exclusion evidence, not proof that no historical URL ever appeared. Login HTML is reachable; noindex is not authentication. Vercel Standard Protection is enabled and explicitly excludes production Custom Domains. No access setting was changed. Owner then said Admin is good and explicitly continued storefront-only work; do not turn this into a new security project.

## Recovery and exact continuation

Revert only this feature's source if rejected; retain the public ownership TXT unless intentionally revoking Google ownership. A subsequent authorized release can roll back each separate Vercel artifact to its prior verified deployment. Do not recreate the Google account/property, re-request catalog/trade indexing, overwrite DNS records, modify private/Admin gates or replay business writes.

MAP-024 owns the exact next action: promote the qualified owner-authorized candidate for107ready products and9holds; verify both separate artifacts and actual hosts, repeat Pasabuy Google live inspection and request indexing only after a successful render, then verify actual consent behavior and GA receipt. Do not repeat completed release stages for receipt-only edits. Record query impressions/clicks/positions for Pasabuy/Italy/import/Philippines when Search Console has data. Google processing time and rankings remain external outcomes. Unrelated pending OAuth/callback verification stays in the same MAP item.

## Authorized release qualification continuation

Fresh preflight-release.log confirms exactK2; readiness-release.log records8verified/2owner/3connector/0blocked. catalog-release.log reads116rows and confirms the exact previously reviewed107-SKU ready set; discovery-gate-open.log passes34. Independent review evaluates all116initial/generated and runtime metadata decisions:107ready indexable in XML/raw/runtime and9held noindex/out of XML; private4headers retained. These remain source/effect checks until real-host verification.

The first full release attempt exposed a harness registration defect: the new storefront-only file also ran on the combined fixture. Interrupted that attempt, preserved release.log/errors, added its exclusion to playwright.config.js (already registered under test:selling-surfaces), confirmed it absent in base --list, and passed12dedicated tests in ui-gate-open.log. No application behavior was changed for this harness fix. The final development gate passes in development-release-reviewed.log. Corrected complete release is in progress in release-reviewed.log; no full-green claim before terminal0. Google Performance is processing data with no query rows; google-performance-processing.png records this external reporting limit.

### Mobile consent release repair

The full selling suite exposed a real layout integration defect: the lazy Analytics module was outside .storefront-ui, so its mobile-nav-height variable fell back to0 and obstructed320px chat. Unbounded200%text placed its top at−442px. Added the failing consent-200-red.log regression, moved the same isolated lazy boundary into StorefrontShell, capped height relative to viewport/navigation with scrolling, and added a visible44px close equivalent to Escape. Closing without a decision leaves consent absent and collection off; reopening still focuses an enabled decision button. No tracking scope was expanded. The existing enlarged-homepage journey now verifies this close path before continuing. consent-layout-green.log passes all4formerly blocked journeys (homepage200%, consent200%,320chat focus and320browserBack). Final consent/privacy/capture suite is in consent-layout-final.log; six normal viewport/theme captures plus mobile-200.png replace the earlier geometry proof.

Other retained release recovery: actual diagnostics identify the logo assertion race as inherited CSSTransition color,0.01ms,reduced=true; test waits for body theme completion/paint without canceling/finishing logo animation and keeps strict zero-logo-animation acceptance. All38existing logo/buyer cases pass twice in theme-settled.log; buyer assertion now matches approved destination copy. An unrelated Admin navigation ERR_CONNECTION_REFUSED passed focused in admin-connection-retry.log with no Admin changes. Completed stage evidence is composed from the unchanged passing base and focused recovery plus resumed remaining stages; literal initial verify:release attempts retain their exit1 history, not relabelled green.

### Final candidate qualification

Final source passes selling86, consent/privacy14, open-gate discovery34, verify:development, remaining direct receipt/workflow/intake/output stages, and both separate builds. Storefront output has111XMLURLs (4marketing+107ready),116share pages (9held noindex),51modules,JS143.84/150.50kB andCSS29.99/30.00kB gzip. Admin has49modules and227.44/300kB. Fresh preflight/readiness is exactK2,8verified/2owner/3connector/0blocked. Complete release coverage is composed from passing unchanged stages and targeted recovery; initial literal exit1 receipts remain recorded. No claim that an initial literal invocation exited0. Final logs and SHA256 values are in the companion JSON. No application edit followed these final checks.

Primary inspected all seven refreshed consent captures including320px and200%text: decisions/close reachable, navigation/chat clear, incumbent style preserved. The final independent review retry is recorded separately. Test-generated tracked PNG changes and two original untracked screenshot folders are excluded from the source commit; automatic approval review rejected their broad reset, so the working files remain untouched.

Final reviewer found one floor issue: Unicode close glyph. Replaced only that glyph with authored currentColor2px round-stroke SVG, preserving44px target, aria, focus and behavior. Refreshed14consent checks/captures, final development and both builds all exit0 (icon-final/development-icon/build-*-final logs). Independent verdict pass scores that exact finding resolved, disposition ship; this is a scored-fix verdict, not a new whole-site audit.

## Production and provider postflight

Normal GitHub merge used the exact expected head; no branch protection bypass. Qualified candidate and merged production trees compare with an empty diff. Both Vercel status checks succeed and connected dashboard shows Ready/Production/Current with source19b06e1 and canonical www/admin domains. Fresh exactK2 preflight and zero-failed readiness preceded promotion.

Actual commands: node .tools/search-visibility-20261026/verify-live-release.mjs (exit0:111URLs, exact107ready/9held, canonical/robots/private/Admin); verify-live-products.mjs (exit0: three ready and one held hydrated metadata/decoded images); verify-live-analytics.mjs (exit0: no vendor before consent/decline, real Google204, sanitized /pasabuy, private disable/no private URLs, withdrawal cookies removed and vendor absent next public load); verify-live-navigation.mjs (exit0: exactly one vendor page_view for each /pasabuy and / navigation). The first image check ran before image decoding; after adding an explicit decode wait it passes, with no application change. Minimal redacted actual receipts are committed under search-visibility-20261026/. Helpers/log hashes remain in the companion JSON.

Search Console: changed111URL sitemap submission accepted. Its discovered-page counter still shows the prior4 until Google processes the changed XML; do not claim107products already indexed. Pasabuy live inspection at19:33SGT says URL available/Page can be indexed, actual rendered storefront replaces the prior error, and the subsequent indexing request is accepted into the priority crawl queue. No duplicate catalog/trade request. Current Google Index still has not reported Pasabuy indexed; Performance is processing with no query/rank data. Screenshots: sitemap-updated-accepted.png, pasabuy-google-render-repaired.png, pasabuy-indexing-requested.png.

GA4 realtime confirms1active user/3pageviews with only / and /pasabuy rows after consented controlled checks (ga4-public-pages-received.png). These are verification visits, not evidence of acquisition, conversions, sales or ranking. Real vendor session/first-visit/engagement events may be reported alongside manual pageviews; app/private URL collection remains bounded by the tested disable/consent contract. Connected-browser test consent was withdrawn afterwards. Public query/hash probe does not appear in recorded Google payload. No customer form submission, purchase or conversion was fabricated.

Final independent finish retry completed: single close-icon finding scored resolved, disposition ship. Final documenter recheck confirms ordinary extension and unchanged PRODUCT/DESIGN/sidecar, exact screenshot/source/log hashes. Earlier failed reviewer usage attempt is replaced by this explicit retry, not silently treated as a pass.

Remote receipts remain separate: PR CI40314933334 security and critical SQL pass; build-and-smoke was still installing its browser. Production-source CI40315394577 security/critical SQL pass; build-and-smoke is running the full acceptance suite. No remote full-green claim. MAP-024 retains only terminal observation/focused failure follow-up, Google outcome observation, and pre-existing OAuth/callback acceptance. Do not rerun passing local suites or require another production deployment for this receipt.

Rollback: scoped source revert or independently restore prior Storefront6pLTLXpU5wkpBDd2eJBCseQeUJV1 and Admin8zCvrVA6Sq7uKjKetRs7ABDzCtnW artifacts (basea3aca9f2). Retain ownership TXT and GA property/link; do not restore stale catalog/stock/provider data. Source39files and provider changes are enumerated above and in companion JSON.
