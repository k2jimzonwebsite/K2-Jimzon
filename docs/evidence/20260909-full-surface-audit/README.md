# Full-surface audit continuation — 9 September 2026

Request: resume the interrupted Storefront/Admin audit and record gaps in the
Master Action Plan. Owning item: MAP-028 J, IDEA-20260909-01; J merges findings
into existing I items and MAP-024. This file contains evidence, not a second backlog.

Local baseline: `41d96df012997cc98751ca405ab632f95ae8806f`, initially clean worktree.
Observations were collected across midnight, 8–9 September, Asia/Singapore.
Public browser observations do not establish the deployed commit identity.

Skills: using-superpowers, systematic-debugging (cause tracing),
verification-before-completion, andrej-karpathy; ui-ux-pro-max, impeccable
(audit, brand and product registers), design-taste-frontend and emil-design-eng.
Existing K2 typography, wood/cream identity, dense Admin and purposeful motion
take precedence over generic skill style suggestions. No UI redesign was made.

## Fresh verification

| Command | Result | What it proves / limitation |
| --- | --- | --- |
| `npm.cmd run test:admin-ui` | 32 passed, 47.6s | Existing isolated Admin navigation, widgets, malformed/missing data, refresh, mobile operations, staff guard/recovery and readiness fixtures. Does not prove production staff credentials, records or writes. |
| `npm.cmd run test:storefront-ui` | 31 passed, 4.3m | Existing catalog/cart/checkout validation, deep links, store keyboard/phone/WebGL fallback, mobile reflow at 200% text, lazy loading, motion and themes. Local catalog/configuration; no real order submitted. |
| `node scripts/audit-readiness-logic.mjs` | Exits 0, Latest returns `[old,new]`, expected `[new,old]`; automatic reload count 0 | Diagnostic is not an assertion suite: exit 0 does not make the comparator correct. Extracted source with fabricated dates; no live import failure induced. |
| `node scripts/audit-security-surfaces.mjs --fail-on-gaps` | Pass | 92 prepared Admin routes, 15 Storefront routes, two Edge functions, zero route-classification gaps and zero unexpected PUBLIC/anon grants in parsed source. Not a production grant audit. |
| `node scripts/map024-evidence/verify-live-discovery.mjs` | MAP024_DISCOVERY_VERIFIED | Public HTTP 200 home HTML with home canonical/Open Graph/Twitter, text/plain robots without Admin route disclosure, XML sitemap with two canonical URLs. No products requested in this invocation. |
| Same verifier with `--product=rana-sfogliavelo` | Fails | `MAP024_DISCOVERY_REFUSAL: /product/rana-sfogliavelo is missing its absolute product canonical tag`. This is the live initial-HTML result, despite the browser's product-specific title. |

Initial sandbox Admin run: 29 browser-launch failures, three source checks pass;
focused rerun isolates `browserType.launch: spawn EPERM` before application
assertions. Approved unsandboxed full rerun passes all 32. Initial sandbox
discovery invocation cannot reach the host; approved public GET rerun works.
These environmental failures are not product defects. A browser DOM inspection
timed out once on `/messages`; subsequent accessibility-state inspection worked.

## Public browser coverage

| Surface | Fresh observation | Scope boundary |
| --- | --- | --- |
| Home, desktop dark theme | One visible Rana item, unknown-stock disabled purchase; ready-to-deliver/physical-stock claims elsewhere. Current FAQ defers payment/timing to staff. | No inventory truth inferred from promotional copy. |
| Catalog | One item with LOW STOCK tag and Stock check pending; purchase disabled. | Source proves static local tag independent of stock. No multiple-product live sort proof; extracted date probe supplies that evidence. |
| Product `/product/rana-sfogliavelo`, 390×844 | Gallery → tabs/recipe → knowledge/staff question → H1/price. Initial H1 top 1801.27 CSS px. No horizontal page overflow. Breadcrumbs 20px high, tabs 30px. Passport says Available on Pasabuy request while stock is unknown. | Measurements are browser emulation, not physical-device or complete WCAG certification. |
| Pairing action | ₱528 offer; click displays The pairing product is not in the current catalog. Cart remains empty. | Existing guard prevents an incomplete bundle; the offer itself is misleading/unavailable. No order mutation. |
| Pasabuy | Labelled contact/item/quantity/preferences form. Sea ~4–6 weeks / air ~1–2 weeks options conflict with flown-cargo wording and staff-confirmed timing elsewhere. | No production submission, CAPTCHA completion, sourcing call or email sent. |
| Wholesale `/trade` | Explicit email-draft workflow, manual commercial review, labelled required fields, no account/price approval claim. | Email-client handoff and actual Admin receipt not exercised. |
| Contact | Explicit Open email draft and instruction to review/send; email address available; no business number published. | No message sent. Marketplace/social handles are text, not verified connections. |
| Account | Customer accounts are not active yet; Contact K2 route offered. | Sign-in, account claim, history and customer authorization remain unverified live. |
| Guest messages | Secure guest messaging is not active. Surrounding auto-refresh/return-request instructions and generic Refresh to retry remain displayed. | Needs feature-aware recovery copy and direct working contact action; not evidence of a live inbox. |
| Empty checkout | Your cart is empty; Back to catalog. | No populated production checkout because current item is stock-unavailable. Existing local suite covers populated fixture flow. |
| Confirmation without grant | Order request status unavailable; use reference when contacting staff; catalog recovery. | Does not prove restore of a real submitted order or cross-guest denial. |
| `/store`, live phone portrait | Architectural room, Counter/Pantry shelf navigation, shopkeeper, concierge and unknown-stock shelf item render; page has no horizontal overflow. | Landscape evidence below is isolated fixture evidence. Browser viewport override did not change this tab's measured 390px width when landscape was requested; no fresh live landscape claim. |
| Admin exact guarded host | Invite-only staff sign-in with labelled email/password, recovery and Google option. | No authenticated session available. All operational workspace results are isolated fixture evidence, not real-host Admin acceptance. |

## Source trace and assessment

`StoreContext.jsx` merges `localProducts` into a matching live SKU, including
unoverridden merchandising tags and recipe guide, and explicitly falls back to
local ingredients/allergens/storage/media. `src/data/products.js:331` contains
the Rana Low stock tag. `ProductCard.jsx` renders that tag even when stock is
unknown; its buy guard correctly refuses unknown stock. `ProductPassport.jsx`
uses `stock > 0` versus a Pasabuy branch, collapsing null into the latter.
`MasterProduct.jsx` places the gallery/tabs/knowledge column before the purchase
column on phones. These are confirmed paths, not a claim that the actual package
facts or images are false. Package-evidence approval remains to be established.

`CatalogGrid.jsx` returns zero for Latest sorting. `NewArrivals.jsx` slices the
first four products without a receipt/date ordering contract. The normalized
product object does not preserve the database creation timestamp. Source
catalog reads lack an explicit visible first-load/error/stale/completeness
contract. Existing I-005 covers this scope.

The checked-in `scripts/map024-evidence/published-catalog.json` marks Rana
unpublished (timestamp 21 August); the browser now lists it. The build emitter
consumes that snapshot. This explains a plausible source of discovery drift;
this audit did not inspect the exact deployed build input, so it is not a
proven deployment root cause. Product-specific public verification is required.

System Brain's latest phase-one MAP-017 receipt supersedes its older apply-waiting
checkpoint. It records 14/14 anonymous reads and 26 remaining critical schema
findings. This audit does not rerun production SQL or independently re-certify
the stored receipt. MAP-028 J explicitly protects against repeating the prior
payload from stale instructions.

## Interface assessment

Provisional scores for inspected surfaces and existing fixture coverage only;
unreviewed authenticated production states cannot receive a release score.

| Dimension | Score / 4 | Basis |
| --- | --- | --- |
| Accessibility | 2 | Labelled forms and keyboard/reflow tests pass; product reading order and small targets remain. Full contrast/screen-reader evidence absent. |
| Performance | 3 | Lazy store/globe checks pass; cold local suite is slow, which is not measured production Web Vitals. |
| Responsive | 2 | No observed page overflow and local phone/landscape tests pass; buying priority is poor on the real phone product page. |
| Theming | 3 | Saved/OS theme contracts pass; established K2 tokens retained; no exhaustive live contrast audit. |
| Anti-patterns | 3 | Distinct K2 editorial/store identity and functional Admin. Repeated merchandising headings and unavailable repeated item add noise; preserve identity rather than impose another template. |
| Total | 13/20 | Provisional interface assessment; not operational release acceptance. |

| Before (observed) | After (recommended, not implemented) | Why |
| --- | --- | --- |
| Purchase information below secondary phone panels | Gallery followed by name, price, known/unknown availability and buying action | Make the buying decision reachable and preserve essential warnings. |
| Stock tag, passport and purchase guard disagree | One stock-state meaning throughout | Preserve trust without enabling unknown stock. |
| Inactive inbox shows retry and active-service guidance | Working contact recovery and explicit inactive state | Refresh cannot enable an undeployed feature. |
| Product metadata changes only after client render | Correct product metadata in initial HTML and synchronized sitemap | Support crawlers and share previews. |

Technical fixes belong to the named MAP items. For the UI follow-up, apply
impeccable clarify/harden to stock and inactive-service copy, adapt/layout to
phone product order and targets, then polish and re-audit. All four repository
design skills remain mandatory; no new backlog is created here.

## Retained render evidence

- `admin-desktop-fixture.png`: synthetic Admin metric/connection records.
- `admin-mobile-fixture.png`: same synthetic dashboard at 375px; full-page image
  includes fixed mobile navigation at the original viewport position.
- `store-landscape-fixture.png`: isolated enlarged-text landscape store test.

These were generated by the fresh suites and visually inspected. Original
6 September screenshots overwritten by the test runner were restored byte-for-byte
from the clean baseline after copying the selected new evidence here.

No complete real order/payment/refund, staff receiving/fulfillment, all-writer
inventory lifecycle, account claim, provider authorization matrix, production
rollback, physical-device gesture, screen-reader, contrast or Web Vitals
acceptance is claimed. Exact next work and prerequisites remain MAP-028 J,
I-001–016 and their owning MAP items. Recovery is reverting only this audit's
documentation/evidence diff; no production cleanup is required.
