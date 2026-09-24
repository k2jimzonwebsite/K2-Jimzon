# K2 Jimzon — System Brain (Current State)

**24 September Admin phone navigation and text layout (IDEA-20260924-03; locally prepared):** The mobile drawer is an accessible focus-trapped dialog with current-section disclosure groups and a separate Staff tools disclosure; desktop navigation and route permissions remain. The mobile header uses short section names and drops the redundant horizontal action bar. Inventory retains its in-workspace Add inventory action; CSV and spreadsheet choices sit in the Staff tools group. Shared workspace headings, metric details, status text and buttons wrap within their containers. The 360px browser walk through all 18 Admin sections passed. Focused Admin contracts passed 41/41; `npm run verify:development` and `npm run build:admin` passed, with Admin entry 217.34/300.00 kB minified. Full Admin browser run passed 38/39; the one failure was an ambiguous test selector covering both visible phone and hidden desktop headings. The corrected case passed 1/1 in isolation. Physical staff acceptance and real-host behavior remain open. This is local code only; no provider, database or production deployment changed. See `docs/evidence/20260924-admin-mobile/README.md`.

**24 September search readiness (IDEA-20260924-02; locally prepared):** Catalog, Pasabuy and Trade now have distinct truthful titles, descriptions, canonicals and social text in both route navigation and initial-response HTML. The Storefront build emits those three pages and a four-route canonical sitemap (Home, Catalog, Pasabuy, Trade). The read-only product projection now includes description fields and reports missing descriptions; it does not change publication. The product-wide `noindex` header and sitemap exclusion remain ON pending real product images, unique descriptions, owner publication review and exact-host search acceptance. Focused contracts passed 14/14 and `npm run verify:development` passed. The storefront build passed with four stable URLs, zero product URLs, 3 marketing prerenders and JS/CSS budget 150.48/150.50 and 29.58/30.00 kB gzip. This is a local artifact, not a deployed search result. Evidence and recovery: `docs/evidence/20260924-seo-readiness/README.md`; MAP-024/MAP-018/MAP-025 own the remaining actions.

**24 September local manual QR preparation (IDEA-20260924-01):** Storefront checkout lets the buyer select GCash or MariBank, stores the preference in the order note, and the confirmation view displays the matching owner-supplied receiving QR image. It still states that staff must confirm the order and total before transfer. Local evidence: focused contracts 9/9; mobile choice and MariBank browser purchase/receipt journeys pass; isolated PostgreSQL payment evidence/independent verification/packing rehearsal exits 0; `verify:development` passes; storefront build meets 150.26/150.50 kB JS and 29.58/30.00 kB CSS budgets. These are separate synthetic fixtures, not a single real paid order. The current public storefront remains on an older artifact. No real transfer, second-device QR scan, or independent merchant-account verification is established. Admin's structured evidence and separate verifier remain the canonical paid boundary. Active MAP-023/MAP-025 retain real acceptance and release steps. See `docs/evidence/20260924-manual-qr-payment/README.md`.

**23 September 3D Store Ergonomics & Bottom Popups (IDEA-20260923-02, production deployed):** Refactored the 3D Interactive Store (`/store`) per owner request: (1) K2 Shopkeeper repositioned from top-left to a toggleable pop-up at the bottom of the screen (`.k2-store-guide` with `flex-direction: column-reverse !important;` and bottom anchor); (2) Selected product details converted from permanent sidebar column into a toggleable bottom pop-up card (`.k2-store-product-popup`) anchored above the bottom rail, dismissing cleanly when toggled or closed; (3) Floating zoom buttons (+, restore, -) removed from the 3D scene, relying on intuitive touch drag/pinch and mouse wheel/drag; (4) Eliminated bottom washed-out white gradient haze on `.k2-store-rail`, allowing the natural wood background (`/wood-bg.jpg`) to remain fully visible; (5) Removed redundant cabinet product lists, establishing the bottom rail as the single canonical source for items available in cabinets; (6) Solved mobile 375px collision prevention and pointer interception: `.k2-store-product-popup` constrained with `left: calc(3.5rem + 1.25rem);` on mobile to prevent covering the 56px closed keeper avatar toggle; `.k2-store-basket-dock` elevated to `z-index: 35` and `.k2-store-sheet-layer` elevated to `z-index: 40` to guarantee the mobile 'Review basket' button and checkout sheets are never blocked from clicks. Pushed to GitHub `main` (commit `4fdf164`). CI run `35858906468` passed 100% green (`build-and-smoke` in 9m59s, `critical-sql-behavior` in 54s). Live Vercel deployment verified returning `HTTP 200 OK` on `https://www.k2jimzon.com/store`. Verified with `npm run test:store-orientation` (12/12 passed), `tests/smoke.spec.js:324` mobile journey (passed in 1.3m), `tests/mobile-store-moderation-pwa-contract.spec.js` (4/4 passed), `npm run verify:development` (zero warnings/errors), and production builds (`build:storefront` JS 150.13 kB / 150.50 kB gzip, CSS 29.42 kB / 30.00 kB gzip; `build:admin` 214.07 kB / 300.00 kB).

**23 September Storefront light mode soft white palette (IDEA-20260923-01, locally prepared):** Implemented owner-requested 4-color soft white palette (`#D5D5D5`, `#B3B3B3`, `#DBDBDB`, `#111111`) across both the 3D interactive store and the entire 2D storefront and footer, replacing raw white and warm Tuscan creams while strictly preserving the natural wood background (`url('/wood-bg.jpg')`) and ambient radial lighting blend. CSS tokens updated in `src/index.css` (`--store-surface-bg: #DBDBDB`, `--store-surface-border: #B3B3B3`, `--product-img-bg: #D5D5D5`, `.storefront-ui` background `#D5D5D5`, `.store-atmosphere` layers) and `src/interactive-store.css`; theme-color meta tag synchronized to `#D5D5D5` across `index.html`, `public/theme-init.js`, `StoreContext.jsx`, and `productResearchPrompt.js`. Hardcoded colors eliminated across `InteractiveShop.jsx`, `StoreChatPanel.jsx`, `StoreFaqPanel.jsx`, and `StoreSeoPanel.jsx`. In-stock and low-stock indicators calibrated to `#38522B` and `#8F3625` to guarantee WCAG AA/AAA contrast ($\ge 4.5:1$, measured $>6:1$ and $>12:1$ for text). `npm run prebuild` passed clean, `tests/store-readability-ui.spec.js` Playwright suite passed across all 390px/1440px viewport and contrast checks (7/7 passed), `npm run build:storefront` verified bundle budgets (JS 150.17 kB / 150.50 kB gzip; CSS 29.44 kB / 30.00 kB gzip), and `npm run verify:development` exited 0. This change affects client presentation only; dark obsidian mode, database, orders, cart, and authentication remain untouched.

**23 September guest-cutover compatibility follow-up (locally prepared):** Production's read-only migration ledger has no MAP-019 identity or MAP-020 guest boundary migration, and production lacks signed guest start/reply RPCs and their private tables while direct chat stays active. Its order submission RPC now has eleven arguments with three trailing defaults. The older guest-boundary preflight incorrectly insisted on a nine-argument function identity, so an isolated current-signature fixture first reproduced `MAP020_PREFLIGHT: live guest source commands are missing`. The preflight now also accepts that exact eleven-argument identity when enough defaults make nine-argument calls valid; isolated preflight and moderation apply/behavior/rollback then passed. This does not apply the earlier migrations, configure private/Vercel secrets or Turnstile, verify a preview, activate Admin/guest BFFs, or prove production moderation. Keep the live direct writer and both Vercel artifacts unchanged until the MAP-019/020 rollback-only chain rehearsal and MAP-017 authorized cutover.

**23 September latest local release recheck (prepared only):** `npm run verify:release` exited 0: 1,152 tests passed, with separate Storefront and Admin production builds and their security/bundle gates passing. The earlier base-suite stall was local Windows process-control denial during Playwright teardown; three test-fixture adjustments removed stale locator/cold mount/long-journey timeout failures. Vercel now exposes both K2 projects to read-only inspection, but their latest production deployments remain on prior GitHub SHA `3f018432d786f2f9b15d9f6d80d68ba4a2a40522`. Read-only Supabase metadata still lacks the guest-chat RPC/table prerequisites for the moderation migration and retains the legacy direct-chat writer. Thus delete/IP block is locally prepared, not deployable or live; applying the migration now would fail and an isolated grant change would break chat. No push, database application, flag flip or deployment occurred. MAP-019/020 owns prerequisite reconciliation; MAP-017 owns the authorized coordinated cutover; MAP-025/027/028 retain real-role and phone acceptance.

**23 September earlier release recheck (superseded for local gate only):** The collapsed Shopkeeper now stacks below chat sheets in phone landscape; focused MAP-027/moderation/security checks pass 85/85. A fresh full release command printed 945 base passes but hung before its phase summary and later suites. Read-only production Supabase metadata shows no guest-start RPC required by the moderation migration and no moderation RPC, while anonymous retains the legacy direct-chat writer. The migration would fail against today's schema; no GitHub push, database application, flag flip, or deployment occurred. MAP-019/020 owns prerequisite reconciliation and MAP-017 owns the eventual controlled cutover.

**22 September mobile store, chat moderation, marketplace footer and Admin install slice (IDEA-20260922-03 through -06, locally prepared):** The phone Store Shopkeeper renders as a 56×56 collapsed control, auto-collapses behind store sheets, and the camera buttons form a horizontal 44px toolbar. The footer contains the six owner-approved Pasabuy Italy by K2 and Jworldbasket Lazada/Shopee/TikTok destinations without connector claims. The Admin build emits a network-only `admin-sw.js` and offers install only when the browser exposes its install prompt; authenticated operational data is not cached. Prepared Inbox moderation adds separate delete, block and manual-unblock commands for Admin/SuperAdmin, stores only keyed 32-byte IP hashes, protects active account-linked conversations, and records content-free deletion receipts. Focused contracts pass 4/4; Storefront and Admin production builds and the final `npm run verify:development` gate pass locally; a rendered 390×844 check measured the collapsed Shopkeeper at 56×56 and confirmed it stayed collapsed behind the Questions sheet. The migration is prepared only: it has not been applied to Supabase, neither artifact has been deployed, and physical-device/Admin-role acceptance remains open in the owning MAP item.

**23 September branch review correction (prepared only):** The anonymous moderation migration now refuses deletion for any linked customer account, authorizes the otherwise forbidden event-history cascade only inside the exact delete transaction, removes conversation grant scopes, denies missing/nonstaff profile roles, accepts the three signed moderation actions in the shared Admin verifier, and revokes the legacy direct chat writer that otherwise bypasses IP blocks. Open virtual-store chat clears a server-deleted thread on the next successful poll. An isolated PostgreSQL 17.11 rehearsal passed migration, role denial, delete with event/grant cleanup, block/unblock, revoked-account refusal and rollback; it is not production-schema or real-host proof. These are local source changes, not applied database or deployed behavior. The legacy writer revocation requires a coordinated guest BFF cutover; current direct-mode production chat must not receive this migration in isolation. The owning MAP item tracks release checks, preview/real-host verification and rollback.

**23 September local Git state:** Reviewed mobile/chat/Admin-install work is integrated into local `main` through `bde1f12`, followed by this documentation receipt; `origin/main` is not pushed. Post-merge focused contracts pass 4/4. The complete release command did not finish and was interrupted after printing 945 passing base cases; it is not a passing release receipt. Nothing was pushed, deployed or applied to Supabase. Remaining work and the coordinated chat cutover are in the active MAP slice.

**22 September verification cadence (IDEA-20260922-02, repository process):** Development uses focused tests for the affected surface and one `npm run verify:development` static/security pass after the final code edit. An owner-requested live promotion uses `npm run verify:release` once before the production-linked `main` push. Markdown-only pushes skip the remote application workflow, so a post-release receipt cannot retrigger the full acceptance and database rehearsal jobs. This process change does not reduce the production release gate or change deployed Storefront, Admin, database, provider, or channel behavior.

**22 September Admin quick tools (IDEA-20260922-01, production deployed):** GitHub `main` commit `8a1548f9a00666ba620a6f49f89677a0a1f45548` is live on Admin. The gear panel now has named tools and shortcuts to existing search, barcode scan, inventory, orders, messages, Workflow map and keyboard help. Shared AdminDialog handles focus and Escape; the draggable gear recovers within the viewport after resizing. Fields and placeholders are readable, expiry guidance reflects the 90-day arrival rule without releasing stock, and scratchpad notes explicitly stay in this browser. CI run `35703351371` and both Vercel projects passed; the Admin canonical host and deployed quick-tools markers were verified. This is deployment evidence, not representative staff or physical-device acceptance. MAP-025 retains those checks. Evidence, changed surfaces and recovery: `docs/evidence/20260922-admin-quick-tools/README.md` and `docs/runbooks/DEPLOYMENT_RUNBOOK.md`.

**22 September whole-Storefront reading and readiness preparation (IDEA-20260921-09, production deployed):** Shared labels/metadata use a 14px floor, fields use 16px, browser default root size is respected, light/dark accent text is separately contrasted, basket names wrap and policy paragraphs have a reading measure. Checkout and its saved note no longer advertise unapproved payment methods; wholesale copy is simpler. GitHub `main` commit `8a1548f9a00666ba620a6f49f89677a0a1f45548`, CI run `35703351371`, both Vercel projects, canonical hosts and the deployed payment-copy marker were verified. No provider connection, real inventory approval, payment activation or marketplace adapter was added. Evidence: `docs/evidence/20260921-storefront-readiness/README.md` and `docs/runbooks/DEPLOYMENT_RUNBOOK.md`. MAP-017/018/019/023/025/026 retain their owner-input, activation and human-acceptance gates.

**21–22 September Storefront readability (IDEA-20260921-08 / MAP-027, production deployed):** Store shelf names and product details use Source Sans UI type; shelf names are 17px, metadata 14px and chat inputs 16px. Store sheets, chat labels, controls and footer use contrasting theme colors. Mobile scene arrows are replaced by swipe/pinch guidance while category tabs remain available. Short drags change shelves, pinch preserves the existing zoom, and Ctrl/Meta-wheel remains available to the browser. GitHub `main` commit `8a1548f9a00666ba620a6f49f89677a0a1f45548`, CI run `35703351371`, both Vercel projects, canonical build markers and the deployed swipe/pinch marker were verified. Physical-device acceptance remains in MAP-027; no provider change is claimed. Evidence and recovery: `docs/evidence/20260921-store-readability/README.md` and `docs/runbooks/DEPLOYMENT_RUNBOOK.md`.

**21 September combined staff-help and continuity production release (IDEA-20260921-02 through -07):** GitHub `main` commit `36bbfa461f2e967239e0950dbdd8e4f30603d769` is live on both Vercel projects. The Admin uses one readable custom help tooltip, clearer purchase-order versus consignment guidance, one searchable glossary entry for every Admin screen, stronger secondary-text contrast, plain icons, the owner-approved one-tap Milan Draft-and-Pack action with an immediate SKU/name receipt, and the direct authenticated Globe RPC transport. The Storefront chat conversation ID persists in same-browser `localStorage`, reads the prior `sessionStorage` value once for continuity, and writes both during the transition. This does not add cross-device recovery, customer authentication, a provider, or new write authority. CI run `35586397300` passed both jobs; both Vercel checks succeeded; canonical build markers returned the correct targets; and deployed assets contain the Workflow map, Globe direct RPC, and chat persistence code. Local gates passed 1,129/1,129 tests, Storefront 150.16/150.50 kB gzip JS plus 29.34/30.00 kB gzip CSS, and Admin 211.67/300.00 kB. Representative staff/physical-device acceptance and authenticated Globe save/reload plus Staff denial remain open in MAP-025/MAP-020. Deployment and recovery receipts: `docs/runbooks/DEPLOYMENT_RUNBOOK.md`.

**21 September full Admin clarity and workflow-guide audit (IDEA-20260921-03 / MAP-028 I-012/I-016):** Local Admin copy and guide routing are verified. All staff entry points now say `Workflow map`; every quoted guide control is checked against a real label; custody, count, consignment and stock-allocation steps open their owning workspaces; and unsupported work says `No Admin control yet.` instead of naming an invented action. Staff messages in Suppliers, Messages, Globe Display, System readiness, Staff & Roles, intake and guide diagrams use shorter words while preserving permissions, records, reasons, warnings and save checks. Focused language/guide contracts pass 43/43, the complete Admin browser suite passes 35/35 across phone and desktop cases, the uninterrupted release suite passes 1,129/1,129, and the Admin production build passes at 211.67/300.00 kB with security and secret gates. This code is local and does not prove deployment, physical-device behavior or representative staff comprehension. MAP-025 still owns Staff-role and Admin-role task acceptance. Evidence and recovery: `docs/evidence/20260921-admin-clarity-audit/README.md`.

**21 September Globe Display Admin editing recovery (IDEA-20260921-02 / MAP-020):** Production Supabase exposes `execute_admin_globe_review_direct_v1` to authenticated users and denies it to anonymous users. The security-definer function authorizes only `public.is_admin()` actors with AAL2, retains bounded payloads, optimistic versions, evidence-gated publication, draft-only creation, idempotent receipts and immutable Globe review events. Direct `globe_products` updates and `reviews` inserts remain revoked from `authenticated`. The production Admin UI now uses this RPC while `VITE_ADMIN_BFF_ENABLED` is off and retains the existing BFF transport if a coordinated cutover later enables it. Isolated PostgreSQL behavior checks pass for Admin save, exact retry, changed-payload rejection, draft creation, publication, Staff denial, AAL1 denial and audit uniqueness; the final release passed CI and the deployed Globe chunk contains the direct RPC name. Authenticated exact-host save/reload and Staff denial acceptance remain open. Rollback drops only the new direct RPC and returns Globe editing to the prior read-only state. Evidence: `docs/evidence/20260921-admin-globe-direct/README.md`.

**21 September Admin help clarity (IDEA-20260921-01 / MAP-028 I-012/I-016):** Locally prepared plain tooltip copy across Count & Close, delivery, customers, coupons, Pasabuy, holds, fulfillment and dashboard panels; shorter workflow-map headings/category descriptions plus two orientation help tips. Existing logic and setup gates unchanged. 692 contracts and 3 focused browser checks passed; Admin build 201.18/300 kB. Code release a1a8507 is deployed: both GitHub Vercel checks succeeded and new Admin assets returned HTTP 200 with the updated copy. Count & Close phone flow passed 1/1 locally; storefront browser retry passed 8/8. Evidence: docs/evidence/20260921-admin-help/README.md and live-assets.json. Staff comprehension and authenticated production writes remain unverified.

**20 September production promotion:** eb38d22 is pushed to GitHub and both
Vercel production projects are READY at that SHA. Canonical Admin/storefront
domains return 200 and their correct build markers; Admin sign-in rendered.
Deployment IDs, rollback and CI limitations are in DEPLOYMENT_RUNBOOK.md.
No database migrations or feature switches were applied. Staff workflow acceptance
remains separate. CI's stale calculator punctuation assertion was corrected;
14/14 calculator checks pass and the follow-up remote run must be checked.

**20 September Admin plain words (IDEA-20260920-14, MAP-028 I-012, local code):**
Inventory now uses plain group names and separates Product description from Use
& ingredients. Website settings and Status & staff notes remain optional groups.
Shop allocation/transfer headings and controls use stock/transfer wording and
distinguish reviewing from saving a stock split. All record keys, handlers,
permissions, states, quantities, approvals and save boundaries remain unchanged.
Focused contracts pass 43/43; full contract phase passes 692/692; editor browser
checks pass 2/2, including 375/1440px retained drafts and exact deletion retry.
Admin build/prebuild pass at 201.20/300.00 kB. Evidence, final suite receipts and
source recovery: `docs/evidence/20260920-admin-plain-words/`. These are local
checks; deployment, physical-device and representative staff acceptance remain
in MAP-028 I-012 / MAP-025.


**20 September Cash on Delivery admin switch (IDEA-20260920-12, MAP-023 payment scope, code locally verified, uncommitted):**
Checkout offers prepaid only and defaults to it; the COD card appears only while an Admin switch in the fulfillment hub is on, backed by `public.payment_method_availability` (anon read, staff-only write, seeded off). Forged COD order notes are refused by the storefront BFF (`COD_UNAVAILABLE`) and by an additive trigger that fires only on newly claimed COD notes and never blocks existing rows or unrelated updates. Until the prepared migration applies in the MAP-017 window, the code default keeps COD hidden everywhere. Evidence: `tests/payment-method-availability-contract.spec.js` 6/6 (failing-first), portable rehearsal exit 0 (apply, replay, default-off, anon read, prepaid insert, COD refusal, on/off transitions, untouched-update pass, clean rollback), `test:contracts` 692/692, `test:selling-surfaces` 8/8, `test:admin-ui` 35/35, `npm run prebuild` clean, both builds within budget. One `test:storefront-ui` failure is proven pre-existing on clean main (chat button chunk loads before store entry; recorded under MAP-027, not this slice). Live deploy and staff acceptance remain pending owner promotion and real-host verification. This entry is code-local evidence only, not a live claim.

**20 September Admin hardening follow-ups (007 audit: IDEA-20260920-08/-10/-11, code locally verified, uncommitted):**
Three audit findings fixed locally. Packing slip prints alone: `k2-print-slip` plus `@media print` in `src/index.css` hides the Admin chrome and backdrop on paper (MAP-023). Staff-role users see disabled privileged controls with the named reason instead of enabled controls the server would only refuse; own PIN, own MFA, and the directory stay available, and server checks remain the authority (MAP-020). Idle sessions end: 30-minute window with a 2-minute plain-words warning, then sign-out through the existing logout path; packing and scanning activity resets the timer (MAP-019). Evidence: new `tests/admin-hardening-followup-contract.spec.js` 3/3 (failing-first, registered in `test:contracts`), `test:contracts` 686/686, `test:selling-surfaces` 8/8, `test:admin-ui` 35/35 (staff-privilege fixture now carries its Admin role explicitly), `npm run prebuild` clean, `build:admin` 201.20 kB / 300 kB. IDEA-20260920-09 (action history UI) stays sequenced behind the MAP-017 database window. Live deploy and staff acceptance remain pending owner promotion and real-host verification. This entry is code-local evidence only, not a live claim.

**20 September Audit fix slices 5 and 7 (IDEA-20260920-06, IDEA-20260920-07, MAP-028 tone-down scope, code locally verified, uncommitted):**
Both audit backlogs applied. Zero raw emoji in Admin (family icons or plain words; ✓/× text feedback explicitly allowed). Every listed touch target meets 44px, including the padded Sheet-mode switch and the StartHere close with its new accessible name. One accent holds (emerald normalized to forest; StoreAsset emerald approval flow exempt as a single-hue tool theme). HelpTip phone help floats above the tab bar; sub-nav tabs signal off-screen content; counts stay honest while loading. Evidence: quiet-workspace spec 17/17, `test:contracts` 683/683, `test:selling-surfaces` 8/8, `test:admin-ui` 35/35, `npm run prebuild` clean (1409 files), `build:admin` 199.38 kB / 300 kB. Sheet stays a real-device acceptance task under MAP-025. Presentation only. Live deploy and staff acceptance remain pending owner promotion and real-host verification. This entry is code-local evidence only, not a live claim.

**20 September Sub-categorized workspaces slice 4 (IDEA-20260920-05, MAP-028 tone-down scope, code locally verified, uncommitted):**
Suppliers is now `Suppliers` | `Purchase orders` with counts; banners and the add dialog stay outside the panels. PasabuyManager (queue-plus-detail) and Sheet (single grid with lenses) were inspected and kept as-is: each already shows one job per frame. The command palette reaches all 18 sections; admin-only destinations stay hidden from Staff roles via a `canManageStaff` prop mirroring the sidebar, with the overview fallback unchanged. Evidence: sub-nav spec 9/9, `test:contracts` 675/675, `test:selling-surfaces` 8/8, `npm run prebuild` clean (1409 files), `build:admin` 199.20 kB / 300 kB. Audit same day: zero stale copy in source, all 13 tour anchors resolve, 2 guide paths updated for the new sub-tabs, and full re-verification passes (`test:admin-ui` 35/35 with 2 tests updated to use the tabs, `test:admin-product-master-ui` 2/2, both builds within budget). Presentation only. Live deploy and staff acceptance remain pending owner promotion and real-host verification. This entry is code-local evidence only, not a live claim.

**20 September Sub-categorized workspaces slice 3 (IDEA-20260920-05, MAP-028 tone-down scope, code locally verified, uncommitted):**
One job per Admin frame behind named sub-tabs. A full category map across all 47 Admin files showed only Customers (directory + wholesale triage stacked) and StaffPermissions (Invite, PIN, People, AI spending, 2FA stacked) without sub-navigation; the rest already gate by modes, tabs, lenses, rails, or master-detail. New shared `WorkspaceTabs` (`AdminWorkspaceUi.jsx`: tablist, aria-selected, 44px, counts, instant, no motion). Customers is now `Customer directory` | `Wholesale inquiries`; StaffPermissions is now `People` | `Security` | `AI spending`. Banners, MetricRail, alerts, and dialogs stay outside the panels; defaults keep the primary job first. New words use plain staff language with facts unchanged. Evidence: new `tests/admin-workspace-subnav-contract.spec.js` 5/5 (failing-first, registered in `test:contracts`), `test:contracts` 671/671, `test:selling-surfaces` 8/8, `npm run prebuild` clean (1409 files), `build:admin` 198.21 kB / 300 kB. Sequenced later (not built): Suppliers split, Pasabuy detail gating, Sheet sub-nav, palette coverage beyond 9 of 18 sections. Live deploy and staff acceptance remain pending owner promotion and real-host verification. This entry is code-local evidence only, not a live claim.

**20 September Quiet Admin workspace slice 2 (IDEA-20260920-01, MAP-028 tone-down scope, code locally verified, uncommitted):**
Admin workspaces no longer render every secondary block immediately. New shared `DetailBlock` disclosure (`AdminWorkspaceUi.jsx`: 44px trigger, `aria-expanded`, instant toggle, Plus/Minus icons, no motion) starts closed by default; applied to the Inventory edit modal (`Content & Copywriting`, `Website & SEO`, `Management` closed; `Product Identity`, `Pricing`, `Inventory` open). Queues, blockers, empty states, and error banners never collapse. Plain-words pass: scan-center `guarded workflow` removed, `Milan Packing POV` to `Milan Packing View`, `ultra-fast packing` to plain action words, J&T `1-tap booking assistant` and `Bulk Batch` redundancy removed, `Review Discrepancies` to `Review differences`, fabricated `Authentic Italian Product` fallback to `Name not recorded`. Facts, states, permissions, and records unchanged. Evidence: new `tests/admin-quiet-workspace-contract.spec.js` 9/9 (failing-first, registered in `test:contracts`), `test:contracts` 666/666, `test:selling-surfaces` 8/8, `test:admin-ui` 35/35 twice consecutively, `npm run prebuild` clean (1408 files), `build:admin` 198.20 kB / 300 kB. Follow-up available: apply `DetailBlock` to the next noisiest secondary blocks and finish the deferred Slice C structural merges with visual verification. Live deploy and staff acceptance remain pending owner promotion and real-host verification. This entry is code-local evidence only, not a live claim.

**19 September GlobeOverlay DB-field binding fix (globe review display, code locally verified, uncommitted):**
Storefront `GlobeOverlay.jsx` read legacy seed-shaped fields (`comment/body/author/location/verified`) that neither the Supabase provider (`globeCms.jsx:104-115` → `text/name/channel/item`) nor the seed (`globeSeedReviews.js` → `text/name`) supply, so any published DB review rendered a blank quote. Fixed binding to `text/name/channel` with legacy fallbacks; no layout, token, typography, or motion change. Changed file: `src/components/globe/GlobeOverlay.jsx:137-148`. Evidence: api contracts 24/24, review-globe recovery 2/2, `npm run prebuild` clean (1407 files), `build:storefront` JS 150.15/150.50 kB gzip + CSS 29.25/30.00 kB gzip. Live DB still holds 17 enabled `globe_products` and 0 `reviews` rows, and the Admin BFF env gate (`VITE_ADMIN_BFF_ENABLED`, `K2_ADMIN_BFF_ENABLED`, `K2_SESSION_COOKIE_KEY`, `K2_ADMIN_ORIGINS`, DB-matched `K2_ADMIN_BFF_REQUEST_SECRET`) is still off, so Admin saves and published-review display remain pending owner-authorized activation and real-host verification. This entry is code-local evidence only, not a live claim.

**18 September Admin BOS hover-? tone-down (IDEA-20260918-01, MAP-028 admin tone-down scope, code locally verified, uncommitted):**
Owner confirmed Admin BOS is hard to navigate: every workspace showed a permanent explanatory paragraph and the header toolbar mixed blue/sky/amber/purple buttons. Applied presentation-only tone-down, admin side only, storefront untouched:
1. **New shared `src/views/admin/HelpTip.jsx`:** quiet ? marker beside each title. The full explanation stays in the DOM (screen-reader `aria-describedby`, native `title`) but is visually collapsed until mouse hover or keyboard focus. The control has a 44px target; phone help uses a viewport-bound bottom panel and desktop help stays anchored to its heading.
2. **`AdminWorkspaceUi.jsx`:** `WorkspaceIntro` and `SectionHeading` render title + ? instead of title + permanent paragraph. No caller changes needed; all 69 description call sites collapse through these two primitives. Eyebrow accent muted from blue to neutral.
3. **`Admin.jsx`:** desktop header subtitle moved behind ? next to the section title; Workflow Map (sky) and Guided Tours (amber) buttons muted to neutral. Blue kept only on primary Scan and + Add Inventory. No Simple/Pro mode per owner decision.
4. **Verification evidence:** `npm run prebuild` clean (1401 files, 0 leaks); `npm run test:admin-ui` 31/33 PASS after the overflow fix, including the re-run signed-channel-evidence 375px test; `npm run build:admin` passes at 197.29 kB / 300.00 kB minified. Two remaining failures are pre-existing on the unmodified baseline (verified via stash): the sales-plan test expects em-dash copy the M-11 policy already replaced with parens, and the period-refresh test fails on its KPI fixture step before reaching changed code.
5. **Unchanged behavior:** all states, transitions, permissions, and copy meaning identical; only always-visible versus hover-revealed presentation changed.
6. **Palette declutter slice 1, same date (ACTIVE per owner, MAP active entry above):** one-accent rule enforced with the four design skills. Blue reserved for primary actions/selection; decorative sky/amber/purple/gold neutralized across Start Here banner and pills, toolbar, map toggles, badges, kickers, section labels, Sheet domain pills/headers, and copilot boxes; primary buttons unified to blue in Coupons, Pasabuy, Sheet, and InventoryGrid; the banned 4px side-stripe in InventoryGrid reduced to a 1px neutral hairline. Semantic states (banners, pills, metric tones, Draft/expiry/fee badges, role badges) deliberately untouched, as are the internally single-hue intake-modal/calculator themes and print styles.
7. **Humanizer pass, same date (humanizer skill):** 18 section descriptions, 7 widget descriptions, and 7 Start Here steps rewritten in plain staff words with facts preserved. Verification re-run: prebuild clean, `test:admin-ui` 31/33 (same 2 pre-existing baseline failures), `build:admin` 197.46 kB / 300 kB.
8. **Money-lens merger + continuity bar, same date:** metrics/sales/revenue widgets merged into one panel with a Channels | Sales | Revenue lens switcher (segmented desktop, dropdown on phones); all ids, labels, headings, filters, buckets, and data paths identical. Sticky continuity strip carries period, refresh, snapshot status, and three live totals. PanelHeading descriptions moved behind ?. Verification re-run: prebuild clean, `test:admin-ui` 31/33 (same 2 pre-existing failures), `build:admin` 197.46 kB / 300 kB.
9. **Scroll-truth slice, same date:** widget/section switches focus headings with `preventScroll` (no more scroll reset on left-panel clicks); shared `useBodyScrollLock` freezes background scroll under WorkflowGuideModal, TourSelectionModal, StartHereGuide, and all AdminDialog modals; tour spotlight scrolls targets into view only when outside the viewport, instantly. Verification: 42/42 guide/tour/dialog contracts pass, `test:admin-ui` 31/33 (same 2 pre-existing failures), `build:admin` 197.70 kB / 300 kB.
10. **Read-only deep-dive audit, same date:** all 47 Admin files read; findings in `docs/evidence/20260918-admin-bos-deep-dive/README.md`. Scanners x3, prompt lenses x4, photo lenses x3, 6-surface help sprawl, per-area brand colors vs status, a11y + 375px punchlists with file:line evidence, 9 ranked logic risks (Milan instant-write path first). Slices A-E proposed; no implementation without its own slice.
11. **Audit slices A, B, D, E applied (C sequenced):** copy, one-accent color with exemptions, 44px/labels/scope/alert a11y, confirm-gates with new `admin-guardrails-contract` 4/4 in `test:contracts`. Evidence: contracts 657/657, admin-ui 31/33 (2 pre-existing), build:admin 198.02 kB / 300 kB. Log in audit doc §4.
12. **Tooltip and visible-copy follow-up, same date:** the shared ? hit target is now 44px; its phone panel cannot widen the document. The command-center channel and payment explanations use shorter staff language, and channel sub-tabs are now `Readiness` / `Stock allocation`. Focused browser acceptance passes 3/3. Full `test:admin-ui` is 33/35; the remaining two failures are the already-recorded stale em-dash expectation and period-refresh fixture. `build:admin` passes at 198.22 kB / 300.00 kB after the full security prebuild.

**17 September Storefront-Wide Unified Live Chat Drawer & Experience Parity (IDEA-20260917-06, MAP-027, code locally verified):**
Unified live customer-staff chat logic across both storefront surfaces (the 2D catalog/shop and the 3D virtual store), making visual/spatial immersion the only difference between surfaces while sharing identical real-time P2P conversation logic and thread continuity:
1. **Unified State & Browser Continuity:** Chat state (`chatOpen`, `chatSeed`) is lifted to `StoreContext.jsx` with shared helper actions `openStoreChat({ question, seed, origin })`, `closeStoreChat()`, and `clearChatSeed()` (aliased as `openChat` and `closeChat`). Both 2D and 3D surfaces leverage direct Supabase messaging (`submit_storefront_chat_v1` and `get_storefront_chat_v1`) and share the same `localStorage` conversation key (`k2-store-chat-convo-id`). The old `sessionStorage` value is accepted once and copied forward, so navigation, reload, tab close, and browser restart on the same browser keep the thread.
2. **Global Slide-Over Chat Drawer (`StoreChatDrawer.jsx`):** Mounted globally in `StorefrontShell` (mirroring `<CartDrawer />`), this high-craft accessible slide-over drawer features the Italian Tricolor brand ribbon, smooth exponential slide-in motion (`transform: translateX(100%)` to `0`), Escape key closing, focus trapping with return-focus, body scroll lock, and embeds `<StoreChatPanel />`.
3. **Zero-Ejection Product Inquiries:** Clicking "Ask staff about this product" on a product detail page (`MasterProduct.jsx`) calls `askStaffAboutProduct()`, which seeds the chat drawer with the SKU and question and opens it immediately over the page. Customers remain comfortably on the product page without being ejected to a disconnected messages view.
4. **Floating Concierge Trigger (`StorefrontChatButton.jsx`):** Mounted across 2D storefront pages (`/catalog`, `/`, `/product/:slug`), offering a floating button (`bottom-20 md:bottom-6 right-5 md:right-6`) with active conversation detection, green status dot, luxury wood styling, and accessible touch target ($\ge 44\times 44$px).
5. **Direct Entry from Contact & Messages Pages:** `Contact.jsx` now provides a prominent "Live store chat" Tuscan card trigger that opens the drawer directly. `GuestMessages.jsx` provides an "Open live chat drawer" card, completely bypassing any inactive BFF barrier.
6. **Design & Code Standards Compliance:** Fully respects the four design skills (`ui-ux-pro-max`, `impeccable`, `design-taste-frontend`, `emil-design-eng`), $\ge 12$px font floor, $\ge 44\times 44$px touch targets (`min-h-11`), clean SVG icons (zero raw emojis), and zero secret leaks.
7. **Verification Evidence:** Playwright contract test suite (`tests/map027-store-polish.spec.js`) 77/77 PASS; contract suite across chat & store surfaces 108/108 PASS; `npm run prebuild:storefront` clean (1,400 files checked, 0 secrets, 0 boundary gaps); Storefront bundle 150.15 kB / 150.50 kB gzip; Admin bundle 196.06 kB / 300.00 kB minified.

**17 September Live 2-Way Peer-to-Peer Storefront to Admin BOS Chat (IDEA-20260917-05, MAP-027, database live on Supabase / code deployed and verified live on GitHub & Vercel):**
Activated direct two-way live person-to-person chat between storefront visitors and staff in Admin BOS without third-party bot roadblocks or serverless proxies:
1. **Live Direct Supabase Chat:** Storefront chat (`StoreChatPanel.jsx`) now operates directly against Supabase RPC functions (`submit_storefront_chat_v1` and `get_storefront_chat_v1`) without requiring Cloudflare Turnstile bot tokens or inactive BFF proxies. Customers can ask shelf questions or general store inquiries by entering their name, contact, and message.
2. **Admin BOS Inbox Realtime Integration (`Inbox.jsx`):** Admin Inbox is subscribed to Supabase Realtime changes on `public.messages` and `public.conversations`. Inbound customer questions appear live with unread counters and virtual store / website badges.
3. **Staff Customer-Visible Replies:** Activated `append_website_customer_reply_v1` on Supabase. Staff clicking "Send to website customer" writes an outbound message and sets conversation status to `Pending`.
4. **Auto-Refreshing Realtime Thread:** Storefront chat listens on Realtime channel `storefront:live_chat` and polls `get_storefront_chat_v1` every 8 seconds. The active conversation reference is saved under `k2-store-chat-convo-id` in same-browser `localStorage`, with the former `sessionStorage` value retained as a compatibility fallback. The UUID remains a scoped guest thread reference; this is not account identity or cross-device recovery.
5. **Quality & Evidence:** 150/150 contract tests PASS; `npm run prebuild:storefront` clean; Storefront bundle 149.89 kB / 150.50 kB gzip; Admin bundle 196.06 kB / 300.00 kB minified; GitHub commit `e699811` deployed to production Vercel and verified live on `www.k2jimzon.com` and `admin.k2jimzon.com` (CI run `35220162090` green).

**17 September J&T VIP Courier Booking, Bulk Parity, and Checkout Questions Audit (IDEA-20260917-02, IDEA-20260917-03, IDEA-20260917-04, MAP-023, code locally verified):**
Delivered pure J&T VIP bulk CSV calculation engine, official Excel template parity (`exptemplete_en.xls`), 1-order batch CSV export, interactive step-by-step dispatch walkthrough mode, buyer persona questions audit, storefront payment preference selector, mobile & desktop dispatch assistant modal, single-warehouse website fulfillment boundary, storefront brand trust indicators, and contract test suites:
1. **Storefront Buyer Persona Questions Audit & Fulfillment Parity:**
   - **Scenario A (Account Login / Profile):** strictly optional passwordless sign-in via Email magic link or Phone SMS OTP (+63 mobile). No passwords, credit cards, or irrelevant user profile questions. Signed-in users can claim and link past guest order records.
   - **Scenario B & C (Buying / Checkout - Returning & Guest):** asks only operationally required physical fulfillment questions: Recipient Full Name, Mobile Number (Philippine 11-digit format `09xxxxxxxxx`), Email Address (optional if mobile given, for digital invoices), Destination Region (for regional weight brackets and J&T province mapping), Delivery Address (with rapid-recognition tips for House #, Street, Barangay, City), Delivery Option (Metro Manila, Courier, or Warehouse pickup), Payment Preference (Cash on Delivery vs Prepaid GCash/Maya/Bank), and Order Notes.
   - **J&T VIP 100% Courier Parity:** Address, telephone, and payment preference map 1:1 to J&T VIP's 13-column bulk template (`exptemplete_en.xls`) and Smart Recognition text box. J&T column 12 (`COD (PHP) (*)`) is automatically populated with the exact grand total for COD or ₱0.00 for prepaid. Address parser handles 3-part Philippine addresses with barangay keywords, eliminating manual typing or staff correction.
2. **Official J&T VIP Template Parity & Bulk Calculation Engine (`src/lib/jntVipBulkEngine.js`):**
   - Implements J&T VIP Philippines bulk order specification with exact 13 contractual headers matching `exptemplete_en.xls`: `Receiver(*)`, `Receiver Telephone (*)`, `Receiver Address (*)`, `Receiver Province (*)`, `Receiver City (*)`, `Receiver Region (*)`, `Express Type (*)`, `Parcel Name (*)`, `Weight (kg)  (*)`, `Total parcels(*)`, `Parcel Value (Insurance Fee) (*)`, `COD (PHP) (*)`, `Remarks`.
   - Accommodates J&T's double-spaced column 8 (`Weight (kg)  (*)`).
   - Added `generateJntVipSingleOrderCsv(order)` for 1-order batch CSV downloads, enabling zero-typing 1-click batch upload on J&T VIP (`My Order > Create Waybills In Bulk`).
   - Standardizes Philippine mobile numbers (`normalizePhilippinePhone`) into canonical `09xxxxxxxxx` format required by J&T auto-assignment.
   - Formats smart recognition addresses (`formatJntSmartAddress`) enabling 1-click paste into J&T VIP's single waybill address parser.
   - Generates RFC 4180 compliant CSV batches with UTF-8 Byte Order Mark (`\uFEFF`) and proper quoting for quotes, commas, and newlines.
   - Validates J&T tracking numbers (`validateJntTrackingNumber`) accepting official `PH...` barcodes and 10 to 16 digit numerical codes.
2. **Staff Admin BOS J&T VIP Dispatch Modal (`src/views/admin/JntVipDispatchModal.jsx` & `OmniOperationsHub.jsx`):**
   - Mounted in `OmniOperationsHub.jsx` for single orders ("J&T VIP Book" in Confirmation Queue and Packing Station) and batch exports ("J&T VIP Batch (.csv)" action header).
   - Single Order tab: provides 1-tap Smart Address copy for J&T VIP single waybill parser, breakdown copy chips (Weight, Value, COD, Remarks), portal shortcut, 1-order batch CSV download button, and physical barcode scanner input that updates order status to handed over.
   - Interactive Guided Mode: 3-step visual progress stepper (`[Step-by-Step Guide]` toggle):
     - Step 1: Recipient Address (smart recognition address copy, direct J&T portal link, step instructions, and 1-order CSV download).
     - Step 2: Package Specs & COD (1-tap copy chips for Weight, Declared Value, COD Amount, Remarks).
     - Step 3: Scan / Save Waybill (laser scan barcode input, validation, and save & mark dispatched).
   - Bulk Batch tab: lists ready-to-pack website orders, 1-tap CSV download, and a 3-step visual guide matching the real J&T VIP portal upload interface (`JWORLDBASKETPH ONLINE STORE`, Bulacan/SJDM default sender).
   - Full `<AdminDialog>` compliance, $\ge 44\times 44$px touch targets (`min-h-11`), strictly $\ge 12$px typography floor, zero em dashes, and zero raw emojis (clean SVG icons only).
3. **Storefront Single-Warehouse Brand & Trust Boundary (`Checkout.jsx` & `CartDrawer.jsx`):**
   - User sees "Fulfilled by K2 Jimzon (Manila Hub Dispatch)" across Checkout delivery option cards and "Fulfilled by K2 Jimzon · Manila Warehouse Dispatch" in the Cart Drawer.
   - Respects single warehouse boundary (`MANILA_MAIN` backs the website while marketplace channels manage separate warehouse reservations).
   - Removed raw emojis and em dashes, enforcing accessible font floors ($\ge 12$px) across all badges and helper copy.
4. **Automated Contracts & Budgets:**
   - Contract test suites `tests/jnt-vip-dispatch-contract.spec.js` (9/9 PASS) and `tests/admin-dialog-contract.spec.js` (7/7 PASS) passed (16/16 PASS total).
   - `npm run prebuild` passed across 1,396 files with 0 secret leaks and 0 boundary gaps.
   - Admin BOS bundle passed at 196.06 kB / 300.00 kB minified (103.94 kB headroom).
   - Storefront bundle passed at JS 149.89 kB / 150.50 kB gzip, CSS 29.37 kB / 30.00 kB gzip.

**17 September Multi-Shop Channel Allocation & Custody Transfer Engine (IDEA-20260917-01, MAP-026, code locally verified):**
Delivered pure multi-shop inventory projection calculation engine, physical custody transfer state machine, PostgreSQL schema and stored procedures, migration rehearsal harness, and Admin BOS staff interfaces:
1. **Multi-Shop Channel Allocation Calculation Engine (`src/lib/channelAllocationEngine.js`):**
   - Implements owner-confirmed multi-shop inventory projection rules: default target coverage of 2 sellable units per active individual shop account (`DEFAULT_TARGET_UNITS = 2`, `DEFAULT_SHOPS` covering Shopee Main/Outlet, TikTok Main/Live Outlet, Lazada Flagship/Express).
   - Evaluates coverage status explicitly: `Covered` (2+ units), `Thin` (1 unit), `Skipped` (intentionally excluded from shop), `Out` (0 units), `Needs review` (discrepancy flagged).
   - Zero double-counting invariant: sum of shop allocations never exceeds Master sellable stock (`masterStock`). Master Inventory remains physical truth across warehouse lots and never shrinks when stock is allocated.
   - Computes outbox synchronization deltas (`calculateOutboxSyncDeltas`) generating structured diffs (`increase_stock` / `decrease_stock`) for downstream marketplace connectors.
2. **Custody Transfer State Machine (`src/lib/custodyTransferEngine.js`):**
   - Implements physical stock custody movement rules: staff request -> admin approval -> receiver acceptance workflow (`pending_approval`, `approved`, `rejected`, `in_transit`, `completed`, `cancelled`).
   - Transfer requests fail closed if requested quantity exceeds unreserved lot availability (`validateTransferAvailability`).
   - Role transition gates: non-admin roles cannot approve or reject transfers (`UNAUTHORIZED_TRANSFER_REVIEW`). Rejections mandate explicit operational reasons.
3. **Database Schema, Views & Stored Procedures (`supabase/migrations/20260917_multi_shop_allocation_and_transfers.sql` and rollback):**
   - Created tables `public.channel_shop_allocations` and `public.inventory_transfer_requests` with row-level security policies.
   - Created view `public.v_multi_shop_stock_projection` aggregating current warehouse stock, allocated units, and per-shop coverage statuses.
   - Created stored procedures `public.rebalance_shop_allocations_v1`, `public.request_inventory_transfer`, and `public.review_inventory_transfer`.
   - Included safe role exception handlers (`exception when undefined_object then null`) ensuring idempotent execution on standalone PostgreSQL instances.
4. **Local PostgreSQL 17 Migration Rehearsal (`scripts/rehearse-multi-shop-transfers-portable.mjs`):**
   - Dedicated test harness running on port 54334 verifying migration application, idempotent replay, ample stock distribution (12 units across 6 shops -> all Covered), scarce stock distribution (3 units -> Priority 1 Covered, Priority 2 Thin, Priority 3-6 Out), fail-closed over-quantity request rejection, admin approval transitions, and clean rollback (`npm run rehearse:shop-transfers` exit code 0).
5. **Admin BOS Staff Interface (`src/views/admin/ShopAllocationManager.jsx` & `ChannelIntegrations.jsx`):**
   - Mounted sub-navigation rail in Channel Integrations toggling between "Channel readiness & connectors" and "Multi-shop stock allocation & custody".
   - Allocation Matrix view: real-time summary cards, product-by-product breakdown, per-shop status pills, and interactive "Rebalance Projections" modal with live 2-unit preview and scarcity warnings.
   - Custody Transfers view: pending approvals queue for admins with Approve / Reject dialogs, historical transfers log, and "Request Custody Transfer" staff modal.
   - Full compliance with 12px font floor, `min-h-11` touch targets, SVG icons, and zero raw emojis.
6. **Automated Contracts & Budgets:**
   - Playwright contract suite `tests/multi-shop-allocation-contract.spec.js` passes 4/4 tests in 4.3s.
   - `npm run prebuild` passed across 1,393 files with 0 secret leaks and 0 boundary gaps.
   - Admin BOS bundle passed at 196.06 kB / 300.00 kB minified (103.94 kB headroom).
   - Storefront bundle passed at JS 149.89 kB / 150.50 kB gzip, CSS 29.32 kB / 30.00 kB gzip.

**17 September GitHub Actions CI fix, PostgreSQL portable runtime lifecycle, and Store Overlay Clearance (code locally verified):**
Resolved root causes in remote CI test and rehearsal execution across Linux and Windows:
1. **Store Overlay Collision Test Isolation & Mobile Layout Clearance:**
   - `tests/store-overlay-collision.spec.js` was omitted from `testIgnore` in `playwright.config.js`, causing `npm run test:base` in `build-and-smoke` to run against the unconfigured dev server on port 5173 where catalog items failed to mount. Added `'store-overlay-collision.spec.js'` to `testIgnore` in `playwright.config.js` and asserted its inclusion in `tests/release-ci-contract.spec.js`.
   - In `tests/store-overlay-collision.spec.js` (test 5: reduced motion fallback 375x812), the flat scene card vertically centered with desktop padding, touching the floating basket dock. On Linux with slightly taller font metrics, the bounding boxes collided. Added mobile rules in `src/interactive-store.css` under `@media (max-width: 900px)` for `.k2-store-flat-scene` (`padding: 0.75rem 1rem 5.5rem; justify-content: flex-start;`) and `.k2-store-flat-scene-card` (`padding: 0.75rem 1rem; border-radius: 1rem;`), giving generous 50px vertical clearance above the basket dock. Verified all 5/5 tests in `npm run test:store-orientation` pass cleanly.
2. **PostgreSQL 17 Linux Socket Permissions, Port Deconfliction & Clean Shutdown:**
   - The Ubuntu 24.04 CI runner defaulted to `/var/run/postgresql` which lacked write permissions for non-root runner user. Added `sudo mkdir -p /var/run/postgresql && sudo chmod 777 /var/run/postgresql` in `.github/workflows/ci.yml`.
   - Updated rehearsal scripts (`rehearse-purchase-time-reservation.mjs`, `rehearse-payment-recovery.mjs`, `rehearse-final-admin-concurrency.mjs`) to pass `-k "${dataDir}"` on non-Windows platforms, read `logPath` on startup failure, and maintain `{ stdio: 'ignore' }` on `pg_ctl start` so Windows `spawnSync` does not hang on inherited child process pipe handles.
   - Replaced hardcoded `path.join(config.binDir, 'pg_ctl.exe')` with `executable['pg_ctl.exe']` in `finally` blocks so PostgreSQL server instances actually shut down on Linux.
   - Changed `rehearse-final-admin-concurrency.mjs` port from `54331` to `54332`, completely eliminating port collisions with `rehearse-purchase-time-reservation.mjs`.
3. **Local Verification Evidence:**
   - `npm run rehearse:purchase-hold` passed with 48/48 properties held.
   - `npm run rehearse:payment-recovery` passed with exit code 0.
   - `npm run rehearse:final-admin` passed with exit code 0.
   - `npm run test:store-orientation` passed 5/5 tests in 3.1m.
   - `tests/release-ci-contract.spec.js` passed 9/9 in 4.6s.
   - `npm run prebuild` passed with 1386 files checked, 0 secrets, and 0 boundary gaps.
   - `npm run build:storefront` passed: JS 149.88 kB / 150.50 kB gzip; CSS 29.26 kB / 30.00 kB gzip.
   - `npm run build:admin` passed: 196.06 kB / 300.00 kB minified (103.94 kB headroom).

**16 September Universal Guided Walkthrough System across all 8 operational lifecycles (IDEA-20260916-08, MAP-021, code locally verified):**
Completed the Universal Guided Walkthrough System across all 8 operational lifecycles in K2 Jimzon Admin BOS, giving staff an interactive guide that highlights real buttons, explains exact warehouse and store procedures in plain words, and allows dual-advance navigation:
1. **Dual-Advance Architecture (Option A):** Replaced blocking full-screen SVG overlays with a 4-panel shaded surround backdrop around active target elements. This leaves the spotlighted interface element completely clickable so staff can perform real operations in the live UI or press [Next Step →] / [N] to rehearse.
2. **Cross-Section Workspace Transitions (Option 3):** When a tour step targets another workspace tab, the tour card shows an active breadcrumb banner ("Switching workspace to [section]...") with a direct action button to change sections.
3. **All 8 Operational Lifecycles Supported:**
   - *New Product Intake:* 5 steps guiding staff through AI prompt copying, ChatGPT photo parsing, Smart Paste JSON validation, and catalog listing.
   - *Existing Stock Intake:* 5 steps guiding physical barcode scanning, expiration date checks, shelf bin placement, and FEFO lot storage.
   - *Cross-Border Supply Chain:* 4 steps guiding flight manifest checks, Milan dispatch verification, and Manila customs arrival.
   - *Inventory Handover & Dispatch:* 4 steps guiding courier handover mode selection, packing slip printing, and custody transfers.
   - *Monthly Physical Count & Close:* 4 steps guiding physical shelf counts, discrepancy reviews, and reconciliation commits.
   - *Customer Order Fulfillment:* 4 steps guiding new order review, courier booking, pick-and-pack, and handover sign-off.
   - *Pasabuy Concierge:* 4 steps guiding customer sourcing review, Italian retail pricing, landed quotes, and customer updates.
   - *Multi-Channel Integrations:* 3 steps guiding Shopee and TikTok sync health, inventory limits, and channel status checks.
4. **Visual Design & Performance Budget Integrity:**
   - Designed with theme palettes using clean inline styles and hex/rgba tokens to keep shared stylesheets small and protect the storefront budget.
   - Replaced legacy emojis in ConsignmentManager, OmniOperationsHub, and PasabuyManager with clean SVG MapIcon components.
   - Strict minimum 44px touch target (min-h-11) and minimum 12px text floor across all walkthrough cards and buttons.
5. **Verification Evidence:**
   - Playwright contract tests in tests/spotlight-tour-contract.spec.js (11/11 PASS), asserting all 8 tours, valid sections, humanizer compliance, and anti-emoji invariants.
   - Playwright admin command center redesign test suite in tests/admin-dashboard-redesign.spec.js (27/27 PASS), including deep-linking, URL synchronization, and browser history.
   - Full prebuild passed (1386 files checked, 0 secrets, 0 boundary gaps).
   - Admin bundle passed at 196.06 kB / 300.00 kB minified.
   - Storefront bundle passed at 149.88 kB / 150.50 kB gzip JS, and 29.26 kB / 30.00 kB gzip CSS.

**16 September Admin BOS Inventory Intake Chooser & Staff Quick Tools Overhaul (IDEA-20260916-07, MAP-021, code locally verified):**
Completed inventory intake selection and staff quick tools UI/UX overhaul in Admin BOS:
1. **Inventory Intake Chooser Modal (`AddInventoryChooserModal.jsx`):** High-contrast modal dialog presented whenever staff initiates inventory creation via the top header action button or the `InventoryGrid` intro button. Distinguishes two distinct operational paths:
   - *Automatic Intake via Barcode:* Designed for restocking incoming physical units of existing catalog SKUs. Features 1-click laser scanner launcher (`Scan & Intake Now →`) and an interactive 5-step guided tour launcher.
   - *Manual Intake via ChatGPT Studio:* Designed for onboarding brand-new Italian provisions without an existing master SKU. Features 1-click Smart Paste JSON launcher, direct manual form creation, and an interactive guided tour launcher.
2. **Top Header & Grid Workspace Integration (`Admin.jsx` & `InventoryGrid.jsx`):**
   - Mounted primary `+ Add Inventory` button (`bg-blue font-bold min-h-11 shadow-sm shadow-blue/20`) in the top header toolbar when viewing the `inventory` section, triggering `launchInventoryTool('add-inventory')`.
   - Mounted primary `+ Add Inventory` button (`bg-blue min-h-11 shadow-lg shadow-blue/20`) in `WorkspaceIntro` actions with `data-tour="add-inventory-btn"`.
   - Forwarded `onStartTour={handleStartTour}` prop into `<InventoryGrid />` so tours can be triggered directly from the chooser modal.
3. **Staff Quick Tools Widget Polish (`AdminToolsWidget.jsx`):**
   - Replaced all raw emojis (`⚙️`, `💰`, `🧮`, `📦`, `📝`, `🇮🇹`, `🇵🇭`) with clean SVG icons (`SettingsIcon`, `CalculatorIcon`, `BagIcon`, `BoxIcon`, `ScaleIcon`, etc.) and styled badges (`IT`, `PH`).
   - Added backdrop overlay (`bg-black/60 backdrop-blur-sm z-[65]`) to prevent visual bleed and accidental backdrop clicks.
   - Added header bar with explicit `[Close ×]` button (`min-h-11 min-w-11`) and `Escape` keyboard listener.
   - Added position reset protection (`pos.y < 80` resets to safe bottom-right) preventing the panel from obscuring the top header controls.
4. **Verification Evidence:** `tests/spotlight-tour-contract.spec.js` (10/10 PASS); `npm run prebuild` clean (0 leaks, 0 boundary gaps, 1386 files); Admin build passes at 195.99 kB / 300.00 kB minified (104.01 kB headroom); Storefront build passes at 149.89 kB / 150.50 kB gzip. 100% compliant with strict $\ge 12$px typography floor, minimum $44\times 44$px touch targets (`min-h-11`), and anti-emoji policy.

**16 September Admin BOS interactive spotlight walkthrough tour system (IDEA-20260916-06, MAP-021, code locally verified):**
Completed full interactive guided spotlight walkthrough tour system for Admin BOS, providing step-by-step visual spotlights, dark room dimming, exact widget highlighting, directives, and embedded prompt studios across both Manual and Automatic inventory intake workflows:
1. **Interactive Spotlight Engine (`SpotlightTourOverlay.jsx`):** Employs SVG `<mask id="spotlight-tour-mask">` with transparent cutout for targeted element bounding rectangle (`getBoundingClientRect`). Features pulsating radar target dot (`animate-ping`), glowing focus frame, floating instruction card with viewport boundary clamping, auto-scrolling to highlighted elements, step indicators, and keyboard controls (`Esc`, `[N]`, `[P]`).
2. **Interactive ChatGPT Studio Station (`tourData.js` & `SpotlightTourOverlay.jsx`):** Embedded prompt engineering station for Manual Inventory Intake (Step 3). Provides category selector pills (Dolci, Pasta, Caffè, Olio), optional custom Italian product name override, live formatted prompt preview, and 1-click clipboard copy (`Copied to Clipboard!`) to draft canonical JSON specifications for Smart Paste.
3. **Workflow Selection Modal (`TourSelectionModal.jsx`):** Multi-choice SOP launcher offering "Manual Product Intake with ChatGPT Studio" vs "Automatic Stock Intake & Barcode Scan" with step counts, estimated durations, and key feature highlights.
4. **Master Workflow Graph & Navigation Integration (`MasterWorkflowGraph.jsx`, `WorkflowGuideModal.jsx`, `Admin.jsx`):** Added `[Start Interactive Spotlight Tour]` button in the Mission header and in `WorkflowDetailDrawer.jsx`, forwarded `onStartTour` through `WorkflowGuideModal`, added `[Guided Tours]` button to the Admin desktop header, and replaced legacy `<span>🗺️</span>` with clean SVG `<MapIcon size={16} />`.
5. **InventoryGrid Tour Target Anchors (`InventoryGrid.jsx`):** Anchored `data-tour="inventory-actions"`, `data-tour="scan-box-btn"`, `data-tour="smart-paste-btn"`, `data-tour="add-product-btn"`, and `data-tour="search-input"`.
6. **Verification Evidence:** `tests/spotlight-tour-contract.spec.js` (8/8 PASS); `npm run test:contracts` (652/652 PASS); `test:selling-surfaces` (8/8 PASS); `npm run prebuild` clean (0 leaks, 1385 files); Admin build passes at 192.41 kB / 300.00 kB minified; Storefront build passes at 149.90 kB / 150.50 kB gzip. 100% compliant with strict $\ge 12$px typography floor, minimum $44\times 44$px touch targets (`min-h-11`), and anti-emoji policy.

**16 September order and pasabuy conversation and message seeding (IDEA-20260916-05, MAP-019 / Queue Item 14, database live on Supabase / code locally verified):**
Eliminated empty support threads when orders or pasabuy requests are submitted:
1. **Schema Enhancements (`public.messages`):** Added `direction text` (`CHECK (direction IN ('inbound', 'outbound', 'internal'))`) and `provider_event_key text` with index on `public.messages`.
2. **Order Submission Support Thread Seeding (`public.submit_order_request_v2`):** Now seeds a `public.conversations` row with `platform = 'Website'`, `status = 'Open'`, `priority = 'normal'`, `unread_count = 1`, `response_due_at = now() + interval '4 hours'`, `last_inbound_at = now()`, `source_kind = 'order_request'`, `source_id = id`, and seeds a `public.messages` row with `sender_type = 'Customer'`, `delivery_status = 'received'`, `direction = 'inbound'`, `provider_event_key = 'guest-order-seed:' || id`, stating order reference and staff review process.
3. **Pasabuy Submission Support Thread Seeding (`public.submit_pasabuy_request`):** Now seeds a `public.conversations` row with `platform = 'Pasabuy'`, `status = 'Open'`, `priority = 'normal'`, `unread_count = 1`, `response_due_at = now() + interval '4 hours'`, `last_inbound_at = now()`, `source_kind = 'pasabuy_request'`, `source_id = id`, and seeds an inbound message detailing the requested item.
4. **Idempotency & Conflict Handling:** Both procedures employ `ON CONFLICT (source_kind, source_id) DO UPDATE` on conversations and `WHERE NOT EXISTS` with `provider_event_key` on messages, ensuring idempotent retries never produce duplicate threads or duplicate seed messages.
5. **Verification Evidence:** Live production rehearsal (`verify-live-rollback.mjs`) on Supabase `pixplcjqivlfflickobf` confirmed order and pasabuy thread creation and 0 duplicate messages on replay. Contract tests `tests/order-request-conversation-seed-contract.spec.js` (3/3 PASS), `tests/guest-conversation-seed-contract.spec.js` (6/6 PASS), full contract suite (652/652 PASS), selling surfaces (8/8 PASS), `npm run prebuild` clean (0 leaks, 0 gaps, 1378 files), Admin build (191.12 kB / 300.00 kB minified), Storefront build (149.89 kB / 150.50 kB gzip). Database migration `20260916_order_and_pasabuy_conversation_seed.sql` applied on live Supabase.

**16 September Workflow Guide visual & tactile interactive enhancements (IDEA-20260916-04, MAP-021, code locally verified):**
Visual polish and interactive guidance capabilities across Admin BOS Master Operations Workflow Guide surfaces:
1. **Clean SVG Primitives (`WorkflowGuideModal.jsx`):** Raw emojis replaced with scalable vector iconography (`MapIcon`, `PlaneIcon`, `ShieldIcon`, `ClockIcon`, `BoxIcon`, `GlobeIcon`); resilient fallback for workspace shortcut button labels.
2. **Canvas Viewport Auto-Focus & Step-Type Filter (`WorkflowSvgCanvas.jsx`):** Added smooth viewport auto-focus centering on active steps (`focusNode`) with a dedicated "Focus Active Node" control; added interactive step-type pills (`All types`, `Scans`, `Decisions`, `Actions`, `Committed`) that dim non-matching nodes; added pulsating active indicator (`animate-ping`) and high-contrast accent ring.
3. **Staff Role Filtering & Shortcut Navigation (`MasterWorkflowGraph.jsx`):** Added role filter dropdown to isolate operations by staff role (`Milan Courier`, `Manila WH Admin`, `Owner / Admin`, `Inventory Specialist`); added global keyboard listeners (`[N]` / Arrow Right for next step, `[P]` / Arrow Left for previous step) with visual kbd shortcut badges.
4. **Visual Breadcrumb Flow & 1-Click Copy (`WorkflowDetailDrawer.jsx`):** Mounted interactive 3-step sequence flow banner (`Prev Step` → `Current Active Step` → `Next Step`) for 1-click step progression; integrated 1-click clipboard copy buttons with visual feedback (`Copied!`) for click target, SOP physical directive, and simulation test barcode; enforced 12px typography floor across all grounding evidence.
5. **Evidence Baseline:** 10/10 workflow tests PASS (`tests/workflow-guide-truth.spec.js`, `tests/workflow-graph-canvas.spec.js`); 652/652 contract tests PASS; 8/8 selling surfaces PASS; `npm run prebuild` clean (0 leaks, 0 gaps, 1378 files); Admin bundle passes at 191.12 kB / 300.00 kB minified; Storefront build passes at 149.89 kB / 150.50 kB gzip.

**16 September Master Operations Workflow Graph follow-through & staff instructional roadmap (IDEA-20260916-03, MAP-021, code locally verified):**
Operational follow-through and staff training UX across all 8 workflows and 49 nodes of the Admin BOS Master Operations Workflow Graph:
1. **Operational Mission & Definition of Done (`workflowData.js`):** Every workflow (`cross_border_lifecycle`, `existing_stock_intake`, `new_product_intake`, `inventory_handover`, `monthly_count`, `new_order`, `pasabuy_lifecycle`, `channel_integration_lifecycle`) has an explicit `goal`, `startingPoint`, and `completionCriteria`.
2. **Staff Action Guides (`workflowData.js` & `workflowGraph.js`):** All 48 operational nodes + `ENTRY_NODE` provide structured `actionGuide`: `targetScreen` (15 allowlisted screens), `whatToClick` (exact button/modal), `actionDirective` (SOP instructions), `nextAction` (handoff guidance), and `exitCriteria` (server gate).
3. **Workflow Mission & Action Roadmap (`MasterWorkflowGraph.jsx`):** Renders Mission cards for Goal, Starting Point, and Definition of Done, alongside an interactive sequential step stepper/roadmap with 1-click step selection.
4. **Staff Action Directive Console (`WorkflowDetailDrawer.jsx`):** Renders a high-visibility hero console with a primary CTA button (`Jump to [targetScreen] ↗`), exact click targets, action directives, 1-click step progression (`Advance to Step [Next #]: [Next Title] →`), and exit criteria.
5. **Evidence Baseline:** `tests/workflow-guide-truth.spec.js` and `tests/workflow-graph-canvas.spec.js` (10/10 PASS); `npm run test:contracts` (652/652 PASS); `test:selling-surfaces` (8/8 PASS); `npm run prebuild` clean (0 leaks, 0 boundary gaps, 1378 files); Admin build passes at 191.12 kB / 300.00 kB minified; Storefront build passes at 149.89 kB / 150.50 kB gzip.

**16 September catalog batch stock reconciliation, permission grants, and full audit remediation (IDEA-20260916-02, MAP-028 K, database live on Supabase / code locally verified):**
Resolved critical inventory, catalog, permission, and RLS policy blockers identified during the 16 September full-project audit:
1. **Catalog Batch Stock & Inventory Balances (Resolves K-01 & K-02, Live on Supabase `pixplcjqivlfflickobf`):** Executed migration `20260916_catalog_stock_reconciliation_and_grants.sql`. Reconciled 21 authentic Italian batch SKUs with physical lots from `public.product_batches`: `products.stock_available = 931`, `products.total_stock = 931`. Populated 29 location balances in `public.inventory_balances` (`location_code = 'MANILA_MAIN'`). Retired legacy mock uppercase SKUs (`LAV-ORO-1KG`, `MUT-PAS-400`, `NUT-BIS-304`, `PST-GEN-190`, `TRF-OIL-500`) to `status = 'Discontinued'`, `published = false`, `stock_available = 0`, eliminating staff confirmation lot reservation crashes.
2. **Stock Projection View Grants (Resolves K-04, Live on Supabase):** Granted `EXECUTE` on `public.get_public_product_stock()` and `SELECT` on `public.v_product_stock_from_batches` to `PUBLIC, anon, authenticated, service_role`. Live query tested and verified: returns 21 rows and 931 sellable units without PostgreSQL 42501 permission denied errors.
3. **RLS Policy for Unlisted Direct-Link Products (Resolves K-05, Live on Supabase):** Updated `products_public_live_read` and `products_authenticated_read` to allow `status IN ('Live', 'Active', 'Unlisted')`, ensuring anonymous visitors navigating to `/product/:sku` for unlisted products can read and buy.
4. **Public Assortment Publication (Resolves K-06, Live on Supabase):** Set `published = true` for all 21 verified authentic Italian batch products. Public storefront catalog query returns 22 live published items with 931 available units, resolving the 0-stock storefront presentation.
5. **Confirmation & Checkout Copy Parity (Resolves K-10, Local):** Updated `src/views/Confirmation.jsx` and `src/views/Checkout.jsx` to state "verify inventory in Manila, review order and delivery details, and send payment instructions directly to you". Added email fallback in `src/views/GuestMessages.jsx` when guest BFF is disabled.
6. **Verification Evidence:** All 659 contract and browser tests PASS (651 contract + 8 selling surfaces); `npm run prebuild` clean (1031 tracked files, 0 secret leaks, 0 boundary gaps); Storefront (149.89 kB / 150.50 kB gzip) and Admin (191.12 kB / 300.00 kB minified) builds PASS within budgets. Database changes permanently active on Supabase production (`pixplcjqivlfflickobf`).

**16 September automated delivery quotation, weight matrix, and checkout parity (IDEA-20260916-01, MAP-023 / MAP-018, database live on Supabase / code locally verified):**
Implemented Shopee/Lazada-style real-time delivery calculation and confirmation across Storefront, BFF, Database, and Admin BOS:
1. **Shipping Engine (`src/lib/cartShippingCalculator.js`):** Computes packed cart weight from item attributes (defaulting to 500g for unspecified provisions). Calculates instant delivery options based on the owner-approved matrix and destination region (`NCR`, `Greater Luzon`, `Visayas`, `Mindanao`, `Pickup`). Base rates: NCR Standard ₱95, Express Dispatch ₱150; Greater Luzon Standard ₱85; Visayas ₱100; Mindanao ₱105; Pickup ₱0 free; overweight scaling at +₱35/kg above 3kg. Method names strictly adhere to fulfillment allowlists (`'Metro Manila delivery'`, `'Metro Manila Express Dispatch'`, `'Courier delivery'`, `'Pickup'`). Unit tests: `tests/cart-shipping-calculator.spec.js` (7/7 PASS).
2. **Storefront BFF Validation (`prepared-api/storefront/order.js`):** Revalidates incoming `shippingAmount` via `strictNumeric` (0 to 100,000) and `shippingQuoteStatus` (`'customer_confirmed'`). Passes confirmed shipping fee and status to database RPC. Contract tests: `tests/automated-delivery-quotation-contract.spec.js` (3/3 PASS) and `tests/guest-commerce-bff-contract.spec.js` (17/17 PASS).
3. **Database Execution on Supabase Production (`pixplcjqivlfflickobf`):** Permanently applied DDL via Supabase Management API per explicit owner direction: added `payment_evidence jsonb NOT NULL DEFAULT '{}'::jsonb` to `public.order_requests`. Updated `public.submit_order_request_v2` with `('Live', 'Active', 'Unlisted')` product ordering support (Queue Item 12) and parameters `p_shipping_amount numeric DEFAULT 0`, `p_shipping_quote_status text DEFAULT NULL`. When `customer_confirmed`, it persists shipping fee, sets `shipping_quote_status = 'customer_confirmed'`, sets `delivery_status = 'ready_to_pack'`, timestamps `customer_delivery_confirmed_at = now()`, and calculates `total_amount = subtotal - discount + shipping_amount`. Dropped obsolete 9-arg overload. Live dry-run verified: returned order `WEB-D48394A695` (`subtotal: 499`, `shipping: 95`, `total: 594`, `delivery_status: ready_to_pack`). Rollback script at `supabase/migrations/20260916_automated_delivery_quotation_rollback.sql`.
4. **Storefront Checkout UX (`src/views/Checkout.jsx` & `src/context/StoreContext.jsx`):** Renders Shopee/Lazada-style delivery option cards with badges (`Recommended`, `Fastest`, `Free`), courier hints, ETAs, and real-time peso pricing. Integrated with a live package weight indicator (`📦 X.X kg · N pkg`) and real-time destination region selector. Maintains the exact `"Delivery address"` input label and exact submit button label `"Submit order request"`, satisfying recovery UI contracts while showing the full order breakdown (Subtotal, Voucher, Delivery fee, Grand Total) in the order summary.
5. **Admin BOS Operational Visibility (`src/views/admin/OmniOperationsHub.jsx`):** Confirmation queue displays delivery status (`Delivery: ₱XX` / `Free` in forest green when customer-confirmed). `DeliveryDetailsModal` auto-detects courier name based on service tier (e.g., Lalamove for Express, J&T Express for Standard, Warehouse Pickup for Pickup), marks confirmed, and pre-fills an operational communication note.
6. **Verification Evidence:** `npm run prebuild` (clean, 0 secret leaks, 0 boundary gaps), `npm run test:base` (863/863 PASS), `tests/smoke.spec.js` (20/20 PASS), `tests/storefront-recovery-ui.spec.js` (14/14 PASS), isolated Storefront build (149.89 kB / 150.50 kB gzip), isolated Admin build (191.12 kB / 300.00 kB minified). Database schema & RPC live in production on Supabase (`pixplcjqivlfflickobf`). Code deployment to Vercel pending git push to `main`.

**16 September 'Unlisted' products direct link ordering parity (Queue Item 12, MAP-023, local):**
Resolved documented inconsistency between Admin/Storefront documented meaning and database order submission RPC:
1. **Documented Meaning Parity:** In `src/views/admin/InventoryGrid.jsx:36`, `Unlisted` is documented as "Hidden from browse — direct link still works". `StoreContext.jsx:302` queries `in('status', ['Live', 'Active', 'Unlisted'])`, withholding `Unlisted` products from the browse grid (`listedProducts`) while allowing direct navigation to `/product/:sku`.
2. **Database RPC Migration (`supabase/migrations/20260916_allow_unlisted_product_orders.sql`):** Updated `public.submit_order_request_v2` allowlist from `('Live', 'Active')` to `('Live', 'Active', 'Unlisted')`. An unlisted, published product can now be checked out via direct link rather than failing with an unexpected `ORDER_SERVICE_UNAVAILABLE` error. Rollback script prepared at `supabase/migrations/20260916_allow_unlisted_product_orders_rollback.sql`. Preflight and postflight registration checks enforced; anon direct grant excluded to preserve the signed guest cutover (`20260812_guest_submission_cutover.sql`).
3. **Local Loopback PostgreSQL Rehearsal (`scripts/rehearse-purchase-time-reservation.mjs`):** Verified 48/48 properties in isolated PostgreSQL 17.11 loopback cluster (port 54331):
   - Prior to migration: order submission for an Unlisted product fails with `Product % is not available for website orders`.
   - Migration applies and replays idempotently without errors.
   - Post-migration: Unlisted product order succeeds with lot hold; Draft product order remains refused.
   - Rollback restores original check; reapplying allows Unlisted again.
4. **Contract Verification (`tests/unlisted-product-ordering-contract.spec.js`):** 5/5 PASS. Full contract suite (647/647 PASS); prebuild clean; Admin build passes (191.12 kB / 300.00 kB); Storefront build passes (149.74 kB / 150.50 kB gzip). Prepared remote execution and Vercel verification guide in `docs/runbooks/SUPABASE_MIGRATION_AND_DEPLOYMENT_HANDOFF.md`. Queue Item 12 removed from `MASTER_ACTION_PLAN.md`.

**16 September AI Prompt Studio mounting and spec alignment (Queue Item 13, MAP-021, local):**
Resolved documented orphan component in `src/components/admin/master-workflow-graph/`:
1. **Component Enhancement (`AiPromptStudioCard.jsx`):** Upgraded category selector buttons with `aria-pressed`, `focus-visible:ring-2`, and $\ge 44$px touch targets (`min-h-11`). Added `aria-label` and `min-h-11` to copy buttons with asynchronous clipboard write and fallback handling. Enforced $\ge 12$px typography floor.
2. **Mounting in Master Workflow Graph (`MasterWorkflowGraph.jsx`):** Mounted `<AiPromptStudioCard />` in a dedicated semantic `<section aria-label="AI Image Studio and Prompt Engineering">` below the step drilldown drawer.
3. **Specification & Contract Verification (`tests/workflow-graph-canvas.spec.js`):** Added contract assertion proving `MasterWorkflowGraph.jsx` imports and mounts `AiPromptStudioCard`, and that `docs/specs/MASTER_WORKFLOW_GRAPH_SPEC.md` matches the mounted component. 4/4 canvas/spec contracts pass; full contract suite (642/642 PASS); prebuild clean; Admin build passes (191.12 kB / 300.00 kB); Storefront build passes (149.74 kB / 150.50 kB gzip). Queue Item 13 removed from `MASTER_ACTION_PLAN.md`.

**16 September inventory readiness end-to-end journey and local rehearsal verification (MAP-023, local):**
Verified the composed UI/BFF/RLS journey from manual intake → field review → Draft product → declared Italy manifest → Milan packing scans → Manila arrival scans → final receipt → canonical stock batches and balances:
1. **Local Loopback PostgreSQL Rehearsal (`scripts/rehearse-inventory-readiness.mjs`):** Exercises the complete 9-step inventory lifecycle in isolated PostgreSQL 17.11 (`.tools/postgresql-17.11/runtime/pgsql/bin`):
   - Product Draft creation via `create_product_draft_server` with internal K2 SKU generation and duplicate SKU rejection.
   - Consignment flight/manifest declaration (`create_consignment_manifest`, `add_consignment_item_v2`) with zero on-hand stock and `Packing_Italy` status.
   - Milan packing scans (`record_consignment_item_scan`) incrementing packed count with over-packing boundary prevention.
   - Manifest transit advancement (`advance_consignment`) requiring sealed/in-transit states before receiving.
   - Manila arrival scans with shortage logging (`result: missing_on_arrival` in `inventory_events`), physical vs sellable stock quarantine separation (items with shelf-life < 90 days quarantined into `inventory_status = 'quarantine'`; physical `on_hand = 25`, sellable `stock_available = 20`).
   - Idempotent receipt retry (`finalize_consignment_receipt`) preventing duplicate balance writes or event duplication.
   - Authorized opening balance reconciliation (`reconcile_product_batches`) requiring AAL2/Admin credentials.
   - Security fail-closed defenses: non-admin refusal, undeclared arrival goods scan refusal, and supplier receipt refusal (`K2_SUPPLIER_RECEIPT_WORKFLOW_UNAVAILABLE`), plus direct table write blocking via RLS.
2. **Composed Contract Test Suite (`tests/inventory-readiness-composed.spec.js`):** Added 5 composed contract test suites:
   - Rehearsal script execution and invariant assertion.
   - BFF consignment command validation (missing parameters, negative quantities, invalid barcodes, unauthorized transitions).
   - Product intake BFF validation (draft creation, price validation, category assignment, duplicate rejection).
   - Client-side scan target selection and refusal reasons (`src/views/admin/consignmentScanTarget.js` — `selectManifestItem`, `scanRefusalReason`).
   - ConsignmentManager UI workflow guards (status badge rendering, flight detail drawer, manifest line display, scan modal locking).
3. **Verification Evidence:**
   - `node scripts/rehearse-inventory-readiness.mjs` (exit code 0; products=3, batches=3, manifests=1, scan_events=28, inventory_events=3, total_on_hand=25, total_sellable=20).
   - `node scripts/rehearse-map023-last-unit-concurrency.mjs` (exit code 0).
   - `npm run test:contracts` (641/641 PASS).
   - `npm run prebuild` (security gates, dependency policy, surface inventory, secret scan, and import integrity all PASS).
   - `npm run build:admin` (191.12 kB / 300.00 kB minified, 0 secrets, static 404 and admin discovery tags emitted).
   - `npm run build:storefront` (149.73 kB / 150.50 kB gzip JS, 27.80 kB / 30.00 kB gzip CSS, 0 secrets).
Locally prepared and verified; remote Supabase migration and production activation remain pending the authorized MAP-017 window.

**16 September structured manual payment evidence record and distinct verification (AUD-OPS-001, MAP-023 §16, MAP-019, local):**
Implemented structured manual payment evidence storage, strict validation, distinct verifier separation of duties, and Staff Admin UI:
1. **Database Schema & RPC Migration (`supabase/migrations/20260916_structured_payment_evidence.sql`):** Added `payment_evidence jsonb` to `order_requests`. Updated `set_order_request_payment_status` to validate method whitelist (`gcash`, `bank_transfer`, `maya`, `cash`, `other`), positive numeric amount, `PHP` currency, nonblank payer name ($\le 140$ chars), nonblank reference ($\le 100$ chars), and optional proof URL/ref ($\le 500$ chars). Enforces separation of duties: when transitioning to `verified`, the verifier confirming funds arrived in the merchant account must not be the submitter who recorded evidence (`auth.uid() <> v_submitter`). Patched `execute_admin_fulfillment_command_v1` to support structured evidence parameter. Rehearsed in `supabase/tests/payment_recovery_behavior.sql` and `scripts/rehearse-payment-recovery.mjs` against local PostgreSQL 17.11 (exit 0).
2. **Admin BFF Validation (`server/admin-bff/fulfillment.js`):** Extended `validateFulfillmentCommand('payment_status', ...)` with strict type and format guards; added granular error codes (`PAYMENT_METHOD_INVALID`, `PAYMENT_AMOUNT_INVALID`, `PAYMENT_CURRENCY_INVALID`, `PAYMENT_PAYER_INVALID`, `PAYMENT_REFERENCE_INVALID`, `PAYMENT_PROOF_INVALID`) in `handleFulfillmentCommand`. Projected `payment_evidence` across `order_requests` reads. Mapped error messages in `src/services/adminBffService.js`.
3. **Staff Admin UI (`src/views/admin/OmniOperationsHub.jsx`):** `PaymentStatusModal` renders structured evidence inputs (method selector, positive amount in PHP, payer name, reference number, optional proof asset URL/ref, notes) when target state is `evidence_submitted`. When target state is `verified`, it renders a structured evidence review card and an explicit merchant account check confirmation checkbox ("I independently checked the merchant receiving account and confirmed funds arrived") and requires a reconciliation note. Added `noValidate` on the form to allow React-driven validation without browser popup suppression and enforced the $\ge 12$px (`text-xs`) typography floor.
Verified by: `node scripts/rehearse-payment-recovery.mjs` (exit 0), `tests/admin-bff-contract.spec.js` (66/66 PASS), `tests/payment-recovery-ui.spec.js` (36/36 PASS in `playwright.payment.config.js`), full contract suite (636/636 PASS), prebuild clean, Admin application build (191.12 kB / 300.00 kB minified), Storefront build (149.73 kB / 150.50 kB gzip JS, 27.80 kB / 30.00 kB gzip CSS), 0 secrets. Locally prepared and verified; remote migration and production activation remain pending the approved MAP-017 window.

**15 September delivery estimate parent state clearing and quote lifecycle (MAP-019/023 I-003, local):**
In `src/components/DeliveryEstimate.jsx`, resolved quote retention lifecycle:
1. When destination, weight, or subtotal changes (`localityId`, `weightG`, `subtotalMinor`), `setQuote(null)` and `onQuote?.(null)` are immediately dispatched alongside `setChecking(true)` before asynchronous rate calculation resolves. This guarantees parent state never displays or commits a stale fee while a new quote is calculating.
2. If `quotable` becomes false (e.g., cart lines become unweighed or empty) or `localityId` is cleared, parent quote state is immediately cleared to null.
3. In `Checkout.jsx`, manual quoting remains current launch behavior ("Courier delivery is quoted for approval after review; nothing is charged here"); the pilot `DeliveryEstimate` component remains unmounted in checkout until remote immutable quote persistence is active under MAP-017/G-001.
Verified by contract tests in `tests/delivery-quote-parity.spec.js` (10/10 PASS). Contracts suite passes 635/635 tests. Production builds pass within budget. Locally prepared work; remote deployment remains open.

**15 September storefront checkout error recovery, idempotent retries, and customer edit lifecycle (MAP-019/023 I-004, local):**
Resolved checkout recovery lifecycle in `StoreContext.jsx` and `Checkout.jsx` under uncertain network outcomes, server rejections, and customer modifications:
1. **Payload Invalidation & Idempotency Key Isolation (`src/context/StoreContext.jsx`):** The checkout request key (`checkoutRequestKeyRef.current`) is bound strictly to the held pending checkout attempt. Adding items, bundles, or changing item quantities in the cart (`addToCart`, `addBundleToCart`, `setQty`) or applying/removing coupons (`applyCoupon`, `removeCoupon`) invalidates held checkout state via `resetPendingCheckout()`, clearing `checkoutPayloadRef.current`, `pendingCheckout`, and resetting the request key to empty so that edited order contents are always submitted with a fresh idempotency key (`crypto.randomUUID()`).
2. **Immediate Unlock on Server Rejections (`src/context/StoreContext.jsx`):** Removed `!recovering` gate from server rejection handling in `runPlaceOrderRequest`. Definite rejection codes (`result.code?.endsWith('_INVALID')`, `INSUFFICIENT_STOCK`, `CONTACT_REQUIRED`, `BOT_CHALLENGE_REQUIRED`, `INVALID_REQUEST`, `RATE_LIMITED`, `INVALID_OR_INELIGIBLE`) immediately invoke `resetPendingCheckout()` to unlock disabled fieldsets on initial submissions and retries alike, preventing customers from becoming trapped in disabled fieldsets upon validation errors.
3. **Accessible Customer Recovery Flow (`src/views/Checkout.jsx`):** When `pendingCheckout` is held, form values (`name`, `email`, `phone`, `address`, `fulfillmentMethod`, `note`) are preserved. Added an accessible secondary action button ("Edit order or contact details") meeting the $\ge 44\times 44$px touch target invariant (`min-h-11`) with clear focus rings. Clicking this action clears held checkout state, enables all fieldsets for immediate revision, and generates a fresh idempotency key upon resubmission. Bot challenge tokens are reset and the Turnstile widget key is incremented on each submission.
Verified by 4 new Playwright browser scenarios in `tests/storefront-recovery-ui.spec.js` (14/14 PASS across the full recovery suite). Contract test suite passes 627/627 (619 contract tests + 8 selling surfaces e2e tests). Separate production builds pass within strict budgets: Storefront landing JS 149.73 kB <= 150.50 kB gzip, CSS 27.80 kB <= 30.00 kB gzip; Admin application 191.12 kB <= 300.00 kB minified; 0 secrets. Evidence: `docs/evidence/20260915-checkout-recovery/README.md`. Locally prepared and verified; remote activation remains open.

**15 September product-led storefront, curated related provisions, and mobile catalog scanning density (MAP-023/027 I-009, local):**
Eliminated full-catalog repetition on single product detail pages and improved mobile catalog scanning density:
1. **Product Detail Scope (`src/views/MasterProduct.jsx`):** Replaced `<CatalogGrid />` (which previously dumped search inputs, category pills, sorting, and all 50+ items beneath product specs) with `RelatedProducts`. The curated section selects up to 4 provisions prioritizing the active product's category or subcategory, renders responsive 2-column mobile cards (`grid-cols-1 min-[370px]:grid-cols-2 md:grid-cols-4`) via `<ProductCard compact />`, and provides an explicit, accessible call-to-action button ("Browse full catalog") with `ArrowIcon` and $\ge 44$px touch target (`min-h-11`) navigating to `/catalog`. Unused `CatalogGrid` import removed from `MasterProduct.jsx`, reducing product chunk size from >30 kB to 24.51 kB.
2. **Mobile Catalog Scanning Density (`src/components/CatalogGrid.jsx`):** Adjusted the 2-column breakpoint from `min-[420px]` to `min-[370px]`. Standard mobile viewports (375px - 414px) now render a balanced 2-column grid instead of a single massive card per row, doubling product scan density while preserving legible typography and $\ge 44\times 44$px touch targets (`ProductCard` action buttons).
Verified by dedicated contracts in `tests/storefront-truth-contract.spec.js` (14/14 PASS), full contracts suite (627/627 PASS + 8/8 selling surfaces PASS), and storefront recovery suite `tests/storefront-recovery-ui.spec.js` (10/10 PASS). Production builds pass within budgets: Storefront landing JS 149.74 kB <= 150.50 kB gzip, CSS 27.80 kB <= 30.00 kB gzip, Admin application 191.12 kB <= 300.00 kB minified, 0 secrets. Evidence and visual captures: `docs/evidence/20260915-product-led-catalog/README.md`. Locally prepared and verified; production deployment remains open.

**15 September mobile store overlay collision removal, touch targets, and visual reflow (MAP-027 I-015, local):**
Reflowed `/store` overlay layout in `src/interactive-store.css` across mobile portrait (375×812) and landscape (844×390) viewports to eliminate bounding box collisions between the 3D Counter scene, shopkeeper toggle/dialogue card, zoom controls, and floating basket dock.
1. **Empty basket hidden:** `.k2-store-basket-dock[data-filled='false']` set to `display: none;`, keeping the 3D counter, shelf banners, and room canvas completely unobstructed.
2. **Filled basket dock relocated & reflowed:** On screens `max-width: 900px`, relocated the filled basket from top-center (`top: 0.5rem; right: 4rem`) down to the bottom-right directly above the product rail (`bottom: calc(44px + 1.15rem); right: 0.75rem; top: auto; left: auto; z-index: 9`). Transformed into a compact horizontal pill (`min-height: 48px; border-radius: 999px; padding: 0.3rem 0.55rem 0.3rem 0.65rem; background: linear-gradient(145deg, #FFFDF8, #EBDCC6); box-shadow: 0 10px 26px rgba(45, 28, 13, 0.24), inset 0 1px rgba(255, 255, 255, 0.85)`). The "Review basket" button meets the $\ge 44\times 44$px touch target invariant with `min-height: 44px; padding: 0 0.85rem; border-radius: 999px; font-size: 0.78rem; font-weight: 750; white-space: nowrap;`. Parcel icon scaled to `width: 2.85rem; height: 2.3rem; transform: scale(0.72);` preventing handle overlap into copy.
3. **Shopkeeper card overlay constrained:** Top-anchored (`top: 0.6rem; left: 0.6rem; z-index: 25; width: min(22rem, calc(100% - 1.2rem))`), constrained to `max-height: calc(100% - 9rem); display: flex; flex-direction: column;` with a scrollable dialogue panel (`max-height: min(10.5rem, calc(100% - 3.5rem)); overflow-y: auto;`). Guarantees $\ge 16$px vertical clearance above the basket dock when fully expanded, preventing dialogue overlap.
4. **iOS auto-zoom fix:** `#keeper-question` input styled at `font-size: 1rem;` (16px) to prevent iOS Safari auto-zooming the viewport on focus.
5. **Overflow and rail protection:** Zero horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`); product rail buttons protected with `max-width: min(80vw, 22rem); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`.
Verified by dedicated tests: `tests/store-overlay-collision.spec.js` (5/5 tests pass in `playwright.store-orientation.config.js`), full contract suite passes 625/625 + 8 selling surfaces tests. Production builds pass within strict budgets: Storefront landing JS 149.76 kB <= 150.50 kB gzip, CSS 27.77 kB <= 30.00 kB gzip, Admin application 191.12 kB <= 300.00 kB minified, 0 secrets exposed. Evidence & visual captures: `docs/evidence/20260915-store-overlay-collisions/README.md`. Locally prepared and verified; production deployment remains open.

**15 September staff workspace completeness, recoverable dialogs, and navigable admin work context (MAP-019/021/023 I-012, H-007, H-024, H-025, local):**
Fulfillment reads in `server/admin-bff/fulfillment.js` enforce explicit bounding limits (`FULFILLMENT_READ_LIMITS`: submitted 200, confirmed 200, lots 1000, staff 50) and return structured completeness metadata (`returned`, `limit`, `truncated`). `OmniOperationsHub.jsx` captures completeness in state and renders an accessible truncation warning banner (`role="alert"`). Shared dialog primitive policy enforced across all inline Admin workflows via `AdminDialog` (`DiscrepancyReconciliationModal.jsx`, `StaffPermissionManager.jsx`, `ConsignmentManager.jsx`, `GlobeCms.jsx`, `ChannelIntegrations.jsx`) with `closeDisabled` write locks disabling dismiss and cancel controls while async operations are in-flight (`busy`, `working`, `finalizing`). Admin work context in `src/views/admin/Admin.jsx` implements `SECTION_ALIASES`, `resolveAdminSection`, and `readInitialSection`, synchronizing active sections with the URL search param (`?section=...`) via `window.history.pushState`, handling browser Back/Forward navigation through `popstate`, and maintaining accessible focus handoff on section heading landmarks (`desktopHeadingRef`, `mobileHeadingRef`).
Verified by dedicated tests: `tests/admin-bff-contract.spec.js` (completeness read bounds), `tests/admin-dialog-contract.spec.js` (7/7 dialog contract tests pass), and `tests/admin-dashboard-redesign.spec.js` (URL sync, deep linking, alias resolution, and history navigation pass). Full contract test suite passes 625/625 + 8 selling surfaces tests. Admin UI suite passes 33/33 tests (`admin.spec.js` + `admin-dashboard-redesign.spec.js`). Production builds pass within budgets: Admin application 191.12 kB <= 300.00 kB minified; Storefront landing JS 149.77 kB <= 150.50 kB gzip, CSS 27.77 kB <= 30.00 kB gzip. Security gates clean. Evidence: `docs/evidence/20260915-staff-workspace-and-dialogs/README.md`. Locally prepared and verified; production BFF deployment remains disabled.

**15 September storefront media fallback, 44px touch targets, discovery sort, mobile buying hierarchy, and launch truth (MAP-028 I-008, I-005, I-006, I-007, local):**
Media failure handling in `StorySection.jsx` and `InteractiveReveal.jsx` provides honest neutral placeholder fallback (`/images/placeholder.svg`) with stable geometry and dataset guards. Touch targets meet the 44px invariant (`min-h-11`, `min-w-11`) across New Arrivals navigation arrows and MasterProduct breadcrumbs/tabs. Catalog discovery sorting (`src/lib/catalogSort.js`) provides explicit comparator logic for 'latest' (descending `created_at` timestamp, deterministic ID tie-breaking, safe null date handling), 'popular', 'price_asc', and 'price_desc'. `CatalogGrid.jsx` integrates 'latest' ("Newest arrivals") option. `StoreContext.jsx` queries Supabase products ordered newest-first (`.order('created_at', { ascending: false })`), preserves `created_at` in normalized records, parses URL search params (`q`, `category`, `sort`) on `/catalog`, updates browser history on filter/sort changes via `replaceState`, and restores filter and sort states on browser popstate. `MasterProduct.jsx` reorders product detail hierarchy so that allergen safety notices (`role="alert"`) and purchase actions (quantity stepper, stock status, and add-to-cart/Pasabuy submission) precede product descriptions, provenance passports, and specifications on all viewports, ensuring mobile shoppers can buy immediately without scrolling past secondary content or missing allergen warnings. Public promises across `site.js` FAQs, Hero, Checkout, Confirmation, and Contact surfaces reconcile strictly with manual launch operating facts (manual GCash/QR planned for launch upon staff stock/quote confirmation; delivery quoted and confirmed per order; no false 1-2 day delivery or 2-3 week Pasabuy transit SLAs; no unapproved Maya/bank/COD payment methods; no self-service returns or instant confirmations).
All 28 focused storefront truth/discovery contracts and 3 storefront copy contracts pass (`tests/storefront-truth-contract.spec.js`, `tests/storefront-discovery-contract.spec.js`, `tests/storefront-copy-contract.spec.js`). Full contract test suite passes 627/627 (619 contract tests + 8 selling surfaces e2e tests). Production builds pass within strict budgets: Admin application 189.73 kB <= 300.00 kB minified; Storefront landing JS 150.40 kB <= 150.50 kB gzip, CSS 27.74 kB <= 30.00 kB gzip. Security, dependency policy, and tracked file checks pass cleanly. Locally prepared and verified; production deployment remains open.

**15 September inventory commitment and owned-stock verification (MAP-028 I-001, local):**
Derived owned-stock read boundary (`src/lib/ownedStock.js`) and Admin consumers (`InventoryGrid.jsx`,
`BatchExpiryManagerModal.jsx`, `server/admin-bff/lots.js`) implemented and verified. Owned stock is
strictly a derived read projection with zero second writable balance, computing physical on hand,
purchase holds, committed owned stock, available sellable stock, and flagging unattributed allocations
as `reconciliationRequired: true`. Deadline extensions on committed reservations fail-closed with
`RESERVATION_ALREADY_COMMITTED` and committed reservations cleanly leave `v_reservations_due`. All 8
concurrent writer races (payment vs confirmation, payment vs cancellation, payment vs expiry sweep,
recount vs payment, custody transfer vs confirmation, consignment receiving vs confirmation, handover vs
cancellation, channel allocation vs confirmation) serialize without deadlock or balance corruption in
`scripts/rehearse-purchase-time-reservation.mjs` (47/47 properties PASS). Full test contracts pass
620/620; prebuild clean; Admin (189.73/300 kB) and Storefront (150.31/150.50 kB JS, 27.56/30 kB CSS)
separate production builds pass within budget. Locally prepared work; production activation remains
gated on MAP-017 and live database migration. Evidence: `docs/evidence/20260914-map-remediation/README.md`.

**15 September intake recovery (IDEA-20260914-02, local):** secure session
creation retains its inner request ID and outer key; evidence upload retains the
original file, session, slot and key until the receipt matches canonical evidence.
Malformed resume data dispatches no create. A later retry denial cannot release
an earlier uncertain outcome. All 19 synthetic intake browser tests passed;
current base acceptance passed 820 tests. Separate builds and prebuild passed:
Storefront 150.31/150.50 kB landing JS gzip, 27.63/30 kB CSS; Admin
189.73/300 kB app minified. Evidence and exact commands:
`docs/evidence/20260914-map-remediation/README.md`. I-002 still owns full
navigation, durable identity/reconciliation, legacy transport and real signed
receipt/storage acceptance. No production activation or provider write occurred.

**14 September inventory, delivery quote, and admin command accessibility remediation (F-021-001, F-023-002, F-028-003, local):**
InventoryGrid distinguishes unknown stock (`stock_available` null/undefined) from out-of-stock, matching Overview availability semantics without inflating out-of-stock counts.
`guestCommerceService.calculateDeliveryQuote` preserves `result.quote` property parity required by `DeliveryEstimate.jsx` (mounting in Checkout remains gated behind I-003 order persistence).
Admin action controls and navigation links meet 44px touch targets across Sheet, InventoryGrid, and Admin shell (`min-h-11`); OmniOperationsHub packing queue adds responsive phone cards for screens `<lg`; OmniOperationsHub dialogs (`HandoverDialog`, `DeliveryDetailsModal`, `PaymentStatusModal`) and Suppliers `SupplierDialog` accept and forward `returnFocusRef` to deterministically restore trigger focus; `adminBffService.js` provides explicit human-readable staff instructions for `AAL2_REQUIRED`, `MFA_REQUIRED`, `STAFF_ACCESS_REQUIRED`, `SESSION_REVOKED`, and `FORBIDDEN_ROLE` without falling back to generic service unavailability.
Failing-first test suite `tests/admin-retained-command-gaps.spec.js` passes 11/11; contracts suite passes 613/613; Admin UI passes 32/32; prebuild (surfaces 92/15, 0 gaps) and separate Admin/Storefront production builds pass within budget. Locally prepared work; production BFF remains disabled.

**14 September review and crawler correction (IDEA-20260914-02, local):**
remote review reads no longer substitute demo testimonials for empty/error
responses; the review globe distinguishes those states. Account/messages/
checkout/confirmation use scoped noindex metadata and prepared Vercel headers.
Nine current storefront recovery cases passed, including the pending unload
guard, refreshed gallery and both review-source failures. Media orphan-review
age now rejects alternate numeric syntax/repeated query values while retaining
the 60-minute default and 60–10080 bounds; 75 focused BFF/validation tests passed.
Base acceptance passed 806 tests after updating the older product-only noindex
assertion. Separate builds passed: Storefront 150.30/150.50 kB landing gzip and
Admin 189.73/300 kB app minified; current prebuild checks passed. These are local
artifacts, not deployed behavior. The wholesale alias redirect/canonical and
publication refresh continuation are tracked in the existing MAP owners.

**14 September intake continuation (IDEA-20260914-02, local):** automatic
field-review transition now uses the existing retained intake command and keeps
reviewed content until the exact receipt is recovered. Complete synthetic intake
acceptance passed 10/10, including failed-response replay and actor disposal.
Sheet has the Grid's actor/role remount key; full Sheet navigation acceptance
is still open. Checkout additionally guards accidental unload while unresolved
and ignores coupon validations that arrive after its payload is frozen. This
does not provide durable checkout recovery after reload. Evidence and fixture
limitations: `docs/evidence/20260914-map-remediation/README.md`.

**14 September MAP-019 remediation (F-019-002, local):** both BFFs now enforce
one shared strict-numeric rule (`server/shared-numeric.js`): canonical numbers
and canonical numeric strings pass, while `true`/`''`/`[]`/`null` and
non-canonical text are rejected with each module's own error code across Admin
coupons/pasabuy/lots/procurement/intake/globe/marketplace validators.
Failing-first `tests/admin-bff-numeric-coercion.spec.js` went 7 red to 8 green;
contracts 573+8, base 782, admin/intake-ai/payment UI suites and both isolated
builds pass. Evidence: `docs/evidence/20260914-map-remediation/README.md`.
Locally prepared, not deployed; the Admin BFF stays disabled. F-019-001
(payment evidence) still waits on owner decisions. F-019-003 also remediated
locally 14 September: Wholesale step-1 copy is path-conditional and Contact
carries one consistent reviewed-hours statement (copy spec 2/2, contracts
575+8, base 784, storefront-ui 31, both builds pass). F-028-001/002 remediated
locally 14 September: inbox visible-page counts, template confirm, same-command
uncertain retry, history actors, coupon Admin blocker + two-step archive, photo
and deletion recovery, 10-char audit reasons, owner-close key retention
(inbox-ui 32, payment-ui 34, contracts 580+8, base 789). F-020-001 remediated
locally 14 September: hostname-bound single-use bot challenges with fail-closed
secrets (contract 5/5, contracts 585+8, base 794, all guest/admin/storefront
suites and both builds pass). F-020-002/003/004 remediated locally 14
September: Shopee 405-on-GET with fail-closed pre-filter and strict env
(webhook spec 10/10 + ingress rehearsal), retention-only legacy media URLs,
and bounded in-memory flood shields in both routers (contracts 594+8, base
803, payment-ui 34, both builds pass).

**14 September autonomous remediation (IDEA-20260914-02, local):** the browser
now retains an uncertain checkout payload/key, freezes its cart/contact/coupon
edits, and renews the bot challenge after submission. Pasabuy, messages and
wholesale also renew failed-submission challenges. Retention currently lasts for
the mounted StoreProvider; hard reload recovery is not established. Cookie decode
failures are isolated per cookie. Customer history metrics require exact counts
matching every loaded supporting history. Canonical product projections no longer
inherit demo facts/media; missing stock remains unknown, unsubstantiated passport
claims are removed, and gallery refresh clamps the active image. The phone product
page places buying information/actions before supporting tabs; tabs/breadcrumbs
have 44px targets, checkout has an associated coupon label, the unsupported Latest
sort is removed, and the shared error boundary uses neutral receipt-aware language.
Focused backend checks passed 82 tests and synthetic browser recovery checks passed
six tests; expanded acceptance is recorded in
`docs/evidence/20260914-map-remediation/README.md`. These changes are locally
prepared, not deployed. MAP-028 J and existing owning items retain remaining
engineering, policy, activation and real-host acceptance. This supersedes the
preceding audit's unchanged-code observation only for the listed corrections.

**14 September master audit — IDEA-20260914-01:** the consolidated report is
`docs/audits/MASTER_PROJECT_AUDIT.md`; fresh receipts and limits are in
`docs/evidence/20260914-master-audit/README.md`. Local evidence: 771 base tests
and 32 dedicated Admin tests passed; both separate builds, secret gates, source
security classification and dependency audit passed. Synthetic browser/helper
probes exposed retry/token, product-gallery, cookie parsing and capped-metric
problems; source review also identified product-fact authority and payment-evidence
gaps. Fourteen findings (six P1, eight P2) remain assigned to existing MAP owners
through MAP-028 J. Overall judgment is 6.4/10, NOT YET for operational launch.
This audit changed documentation/evidence only; no application fix, provider
activation or deployment is claimed. Applied permissions still rely on dated
13 September evidence: automatic approval review blocked the fresh metadata
export before execution. Full real-host/device/business lifecycle acceptance
remains unverified. No operations-rulebook or design target was changed.

**13 September plan completeness review — IDEA-20260913-04:** the MAP launch
guide now surfaces staff/recovery inputs, scheduled-job operation, financial
reconciliation, notification receipts and remaining audit proof. MAP-026 adds
explicit external stock-delay/allocation-transfer and first-sync/reconnect
acceptance. These are planning clarifications, not implemented or activated
capabilities. No application tests or live provider checks were run for this
documentation review; original audit unknowns retain their evidence limits.

**13 September marketplace planning (IDEA-20260913-03):** official Lazada and
TikTok Shop documentation was researched and the existing MAP-026 access gate
refined with website/application preparation and staged acceptance. K2-owned PH
shops remain the scope; Shopee remains deferred. This is documentation-only:
no app submission, seller authorization, provider activation or deployment was
performed. Exact registration eligibility, scopes and review requirements remain
subject to each provider's current console and decision. The plan and official
source links are in MAP-026; the durable intake decision is in FUTURE_IDEAS.
The MAP execution dashboard also contains the owner's complete start-here launch
handoff: ordered work, five input packets, acceptance gates and completion rules.
It distinguishes engineering prepared for inputs from verified operational launch;
it records intended execution without claiming additional implementation or tests.

**13 September production security follow-up — applied and verified:** after the
owner's explicit “yes proceed”, version `20260909023000` was applied once to
`pixplcjqivlfflickobf`, artifact SHA-256
`7BA3F473C3313890F57899A657CD1234FEDAFEEB43DB7465819919EF1FB71E05`.
Independent postflight at **2026-09-13T15:24:53.942Z** confirms the exact receipt
and all eleven permission/applicability checks. Seven internal functions lost
excess browser/PUBLIC execution; the two receiving functions retain service-role
execution. Browser error-report INSERT/policies were removed; staff read remains.
Fresh schema audit reduced **26 to 10 findings**; live anonymous boundary checks
passed **14/14**, with public products and stock readable and private tables denied.
Four legacy guest/coupon RPC grants and six provider-owned default groups remain.
Neither phase one nor this follow-up is to be repeated. Recovery is reviewed
roll-forward or the existing verified backup procedure, not broad regranting.
This supersedes earlier unapplied/authorization-pending statements below for this
exact correction only. No application deployment, payment/delivery configuration,
stock quantity change or guest BFF activation occurred. Receipt and evidence:
`docs/evidence/20260913-audit-remediation/README.md`.

**13 September audit remediation (IDEA-20260913-02, locally prepared):** intake
now rejects coercible boolean/array/object/blank inputs before numeric conversion;
the nine-test intake suite passed after a failing-first regression. Scanner
placeholder exemptions now match complete reviewed values; 18 internal-fragment
negative cases, scanner fixtures, working-tree and history scans pass.
Admin expiry labels use Manila dates. Clearance success reloads the exact saved
lot, retaining prior data/key if that read fails; it no longer invents approval
timestamps or calculates a replacement receipt. The 17-test Admin logic suite
passes, including failed-refresh/same-key recovery. Separate Vercel build commands
and a PostgreSQL 17 CI job are locally prepared; deployment/remote CI are not proved.
Current verification and remaining gates: `docs/evidence/20260913-audit-remediation/README.md`
and the owning MAP items. No production SQL, deployment or business-policy change
has been made in this remediation.

Fresh broader remediation evidence: 770 base tests, 32 Admin UI tests, both
isolated builds and all three stock/payment/final-Admin SQL rehearsals passed.
Final focused intake/Admin/release/guest checks pass 41/41. These counts overlap.
Guest-seed captured recovery tooling now passes actual old/seeded definition,
owner/ACL restoration and later-change refusal on loopback PostgreSQL; full
signed submission behavior and actual target captures remain MAP-019. A fresh
read-only production preflight at 2026-09-13T13:53:03Z still finds no follow-up
receipt and all applicability prerequisites present; schema audit remains 26.
The exact MAP-017 payload and Unlisted policy questions remain pending owner input.

**13 September independent handoff verification (IDEA-20260913-01 / MAP-028 J):**
Other K2 sessions were confirmed stopped. Two real local regressions were
corrected: Overview requested an unsupported one-day reporting window and could
not mount; CSV channel prefixes disagreed with dashboard exact aliases. Overview
now uses the canonical window bounds and shares the CSV channel normalizer.
Fresh isolated Admin **32/32**, focused reporting **39/39**, Storefront/Admin
builds and dependency audit (**0 vulnerabilities**) passed. Security gate/history
also pass after narrowly classifying three historical documentation placeholders;
new negative checks retain credential detection.

The prepared guest-seed rollback was unsafe: it replayed ten older security
functions and ACLs. It now refuses before writes (local PostgreSQL exit 3).
Captured two-function recovery and full composed seed behavior remain MAP-019.
Live metadata at **2026-09-13 03:27 UTC** still has six ledger entries, latest
`20260824143000`; the newer guest submission and commitment functions are absent.
The schema audit still reports **26 critical policy findings**, not 26 proven
exploits. MAP-017 follow-up `20260909023000` remains the first activation gate;
do not repeat the applied phase-one migration. Public host markers are separate
Storefront/Admin, but live Admin still has Storefront discovery tags. Local dirty
`main` and remote main remain `41d96df`; its successful 8 September CI does not
cover the uncommitted handoff. No provider writes or deployment occurred.
Detailed commands, aggregate-suite results, limitations and recovery:
`docs/evidence/20260913-map-verification/README.md`. Remaining work stays in MAP.

The full npm-test sequence was covered across the initial run and corrected
continuation: base 764, orientation 2, Storefront 31, Admin 32, recovery 33,
Inbox 27, product-master 1, owner-close 1, account/wholesale 3, selling 8,
workflow 4 and intake 9 passed (**915 cases across 12 groups**). The initial
aggregate stopped on an outdated custody fixture that omitted the required
reason; its corrected test verifies both blank-reason denial and exact retry
payload. The eight resumed groups all exited 0. This is not one uninterrupted
green `npm test` run. Final targeted reporting/guest recovery tests passed 44/44.
Fourteen older evidence PNGs were restored byte-for-byte after preserving the
new captures in the verification folder; original stash and source work remain.

**13 September stock lifecycle composition, locally verified (MAP-023 / I-001):**
Prepared `20260913_payment_handover_commitment.sql` adds verified payment as
the second commitment caller, accepts attributable committed lots after the old
temporary deadline, and requires commitment at physical handover. First actor/
time/cause and existing RPC ACLs are preserved. Refund changes no stock;
cancellation separately releases lots once. The older confirmation rollback
refuses when payment depends on its helper.

Fresh evidence: purchase rehearsal **37/37** property groups; **81** focused
contracts; existing payment/packing recovery rehearsal and prebuild/security
checks passed. Multi-lot failure rolls back order/coupon/payment/commitment and
signed receipt/nonce changes. Old-body negative controls detect all three
corrected boundaries. The alleged partial-commit defect (AUD2-003) is refuted
for this SQL failure path; no confirmation rewrite was needed. Actual base-runner
selection also refutes AUD2-004: all 55 named contract specs and sales are already
selected by test:base (759 tests in 81 files); this is selection, not a new
aggregate or remote CI pass. No provider/database production change, deployment
or UI change occurred. Evidence/recovery:
`docs/evidence/20260913-stock-lifecycle/README.md`. Owned-stock read consumers,
legacy attribution, current-chain writer races, deadline queues and real-host
acceptance remain I-001; MAP-017 remains the first activation gate.

**12 September autonomous batch, locally verified (prepared, not live):**
the recorded batch checks passed on loopback/fixture evidence with no
production change (this is not verification of every MAP remainder): MAP-017 portable (12 auth groups,
replay, rollback, backup/restore); MAP-018 intake/cleanup/intake-AI plus 9/9
browser; 88 focused BFF/receiving/channel/order/intake contracts; inbox
27/27, payment/recovery 33/33, Admin 32/32; Admin build 188.92/300 kB and
Storefront build (149.85/150 JS, 27.48/30 CSS gzip) with prebuild/security
surfaces zero-gap; `sharp` 0.35.4 (audit 0 vulns); purchase-hold 30/30 with
the newly implemented confirmation ownership deduction; last-unit, payment,
marketplace, channel-vocabulary (13/13), final-admin, invite/MFA/rate/
ingress/claim, product-knowledge and MAP-024 discovery/sitemap contracts;
store orientation/workflow/owner-close/product-master/account/selling/
storefront-ui suites and `test:base` 742/742. Catalog-spreadsheet and
database-backup rehearsals stay env-blocked locally by design. New prepared
artifacts: `20260912_confirmation_stock_commitment.sql` + executed rollback,
`confirmation_commitment_behavior.sql`,
`confirmation-commitment-contract.spec.js`. Full log:
`docs/evidence/20260912-autonomous-batch/README.md`. Production apply,
activation, paid calls, credentials, channels and acceptance remain gated.

**9 September intake command recovery (IDEA-20260908-01 / MAP-028 I-002),
locally verified:** manual checklist-step, Draft and first-inventory callers
retain exact payload/outer receipt identity, freeze review and dismissal, and
preserve uncertainty after malformed receipts or failed post-write refreshes.
Step receipt validation matches the existing SQL session/step/timestamp shape.
Definitive rejection permits correction with a new key; the existing durable
inner intake request identities remain separate. A remounted actor fixture
proves late Draft results cannot advance the replacement modal.
Final evidence: 9 intake browser cases, 87 focused contracts and Admin build /
security / 40-module boundary / 188.92-of-300 kB budget pass. Phone and desktop
screenshots were inspected. This extends the interrupted dirty implementation;
no production or provider state changed. Evidence/recovery and precise limits:
`docs/evidence/20260909-intake-command-retry/README.md`. Other intake callers,
Sheet/full navigation, legacy reconciliation and real signed receipt/audit
acceptance remain open in I-002; this is not full intake or launch completion.

**9 September MAP truth reconciliation — IDEA-20260909-02:** eight completed
queue entries and repeated completed implementation bullets were removed from
the MAP. All 12 whole MAP items remain open for their recorded remainders.
Phase-one apply, widget promotion, browser-blocker, owner decision, route-count
and indexing instructions were corrected against dated evidence. No provider
state or production code changed. The separate follow-up remains prepared.

Resumed independent review corrected remaining stale phase-one, dashboard
promotion and product-indexing directions at their local sections. Fresh reruns
passed 534 contract-stage tests, 22 focused release/route/authorization checks
and five indexing checks (overlapping counts). Earlier browser/build logs were
confirmed, not rerun in this documentation-only continuation. The bounded audit
is finished; MAP-028 J retains its operational findings and I-015 the mobile
repair. Review details and recovery remain in the linked audit evidence.

Fresh local evidence: 533 contract-stage tests; 31 Storefront and 32 Admin browser
cases; eight selling and three catalog-import recovery cases; 23 focused indexing/authorization/CI
contracts; both isolated builds and their security/budget checks. Counts overlap.
The initial selling-browser launch failed with sandbox EPERM; the combined
`test:contracts` invocation is not claimed green. Public GET-only home/robots/
two-URL sitemap verification passes. Full npm test, remote CI, new SQL rehearsal,
physical-device zoom and authenticated production operations are not established.
Exact results and scope: `docs/evidence/20260909-map-truth-audit/README.md`.

The catalog-import recovery spec is excluded from the shared Playwright runner
and remains selected by the dedicated protected payment fixture in npm test.
A new config-importing contract failed before that one-line fix and passes now.
Existing dirty intake/retry/security changes were preserved. Mobile store
overlay collisions and 44px touch targets under MAP-028 I-015/MAP-027 are
resolved and verified with dedicated Playwright collision checks (evidence in
docs/evidence/20260915-store-overlay-collisions/); physical-device GPU pinch/pan
remains an operating target.

Current local behavior retained from completed queue cleanup: MasterProduct is
the single product-detail view; the home globe is intersection-deferred; Admin
modals share AdminDialog; selling journeys have their dedicated fixture; public
History API routes support deep linking/back; the workflow canvas uses the graph
model. Per-target manifests/static asset checks and historical SQL relocation
are implemented. Contact wording does not promise a response time; current
channel values remain governed by OWNER-004. Receiving uses accepted Manila
scans within the Milan ceiling and requires declared positive manifest lines;
undeclared arrival is not supported. This summarizes implemented boundaries,
not blanket production acceptance. Detailed historical evidence remains in Git
history and the existing runbooks; remaining work lives only in the MAP.

**9 September MAP-017 activation preflight:** a fresh approved read-only provider
export still reports 26 critical findings. Eleven-check SQL verifies seven
matching postgres-owned functions, existing error-report RLS/staff reads and
public stock-view access; the unwanted function grants and error-report insertion
remain. A locally verified combined follow-up transaction and exact receipt
contract are prepared under version `20260909023000`; no provider write ran.
The full portable transaction/replay/conflict/restore suite and 41 focused tests
pass. Identity, live Boolean results and limits:
`docs/evidence/20260909-map017-followup.md`. MAP-017 owns authorization/application
and subsequent evidence; phase one stays applied and must not be repeated.

**9 September existing-function lockdown, prepared only (MAP-017):**
`20260909_map017_existing_function_lockdown.sql` revokes PUBLIC/anon/authenticated
execution on the seven existing trigger/receiving signatures and preserves
service-role receiving execution. It changes no function bodies and does not
depend on absent intake/publication functions. The portable PostgreSQL runner
reproduced the vulnerable ACL, then passed browser denials, service-role entry
to the existing receiving guard, five real trigger bodies, replay, missing-target
refusal and exact definition/ACL rollback. Existing 12 authorization groups,
backup/restore and 41 focused contracts also pass. Provider application and
full operational acceptance remain open in MAP-017. Evidence and scope limits:
`docs/evidence/20260909-map017-followup.md`.

**9 September MAP-017 follow-up evidence:** re-auditing the named 8 September
schema export reproduces 26 critical findings, mapped to existing error-report,
function-lockdown and guest-cutover migrations plus six provider-owned defaults.
Fresh local PostgreSQL rehearsal passes 12 authorization groups, error-report
denial, replay, rollback, encrypted backup and isolated restore. The full
function-lockdown file names two intake/publication functions absent from that
export; its prerequisite/slice acceptance remains in MAP-017. No production
state changed. Evidence: `docs/evidence/20260909-map017-followup.md`.

**9 September audit continuation (IDEA-20260909-01 / MAP-028 J):** fresh public
browser checks confirm the Rana product is visible but stock is unavailable;
purchase is disabled while other stock/provenance labels conflict. Customer
accounts and secure guest messages explicitly report inactive; the Admin host
shows staff sign-in. Local Admin 32/32 and Storefront 31/31 browser/contract
suite cases pass. Home/robots/two-URL sitemap discovery passes, but the same
verifier with `--product=rana-sfogliavelo` fails its initial product canonical
check. These findings and phone buying-order/transport-copy gaps are recorded
in MAP-028 J and `docs/evidence/20260909-full-surface-audit/README.md`.
This audit changes documentation only; it does not activate or fix those flows,
reapply MAP-017, or certify authenticated production operations. The permanent
phase-one receipt immediately below supersedes the older apply-waiting entry.

**8 September owner-approved permanent apply:** MAP-017 phase one returned
`APPLIED_AND_VERIFIED` for project `pixplcjqivlfflickobf`, ledger
`20260824143000`, payload SHA-256
`D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62`.
`npm run evidence:map017-anon` passed 14/14 live read checks. Fresh metadata
export and `npm run audit:schema-truth -- --export=live-schema-metadata.json`
report 26 critical findings, down from the recorded 55 total: error-report
anonymous writes, remaining function grants and supabase_admin defaults remain.
MAP-017 remains active for those reviewed follow-ups; do not apply later
migrations under this phase-one approval. The prior apply-approval blocker is
superseded. Recovery remains reviewed roll-forward or verified backup restore.


**Production code release verified, 8 September 2026:**
GitHub `main` is at `6ad7578235c8a6b16ce42b947028f090f1ae1eb1`.
CI `34229084356` passed the complete application acceptance, production builds,
MAP-017 database rehearsal, and catalog migration rehearsal. Vercel production
receipts `6328123772` (Storefront) and `6328115682` (Admin) succeeded for the
same SHA. The canonical Storefront home, `/store`, and Admin guarded route each
returned HTTP 200. The live architectural store rendered at desktop, 390x844
portrait, and 844x390 landscape with its navigation, 3D clerk/counter scene,
shelf concierge, and no horizontal overflow. This is verified code delivery
and unauthenticated render evidence. Exact-host discovery passed canonical and
share metadata, robots, and the two-URL XML sitemap; target marker reads proved
Storefront/Admin artifact separation, and the Admin guarded route rendered the
invite-only staff sign-in boundary. CSP reporting/enforcement remains open.
Prepared Supabase migrations remain
unapplied by this release; paid providers, marketplace channels, authenticated
staff records, and business-write acceptance remain governed by their MAP gates.

**Historical MAP-017 pre-apply checkpoint, superseded by the permanent receipt above:** the guarded executor dry
run passed the exact project, payload SHA-256, ledger, OWNER-005, database and
Storage backup/restore, off-site copy, and owner recovery-access gates. The
permanent production apply was not executed: automatic approval review requires
an explicit active-conversation approval for this disruptive, costly-to-reverse
security/access-control mutation. No DDL or provider state changed in that
preflight. The later owner-approved apply superseded this blocker; phase one
must not be repeated. Current follow-up scope is recorded separately above.

**Dashboard truth follow-up, 7 September (IDEA-20260907-02; code deployed):**
Overview rejects malformed source bodies, invalid backlog counts and unknown/
invalid stock or monetary values rather than presenting valid zero totals.
Visible tabs refresh every 30 seconds and on return; the legacy path also listens
for product/batch changes. The secure path stays cookie-bound with no direct
Realtime subscription. API/UI reporting windows now share Asia/Manila midnight.
Channel aliases are exact; blank/unrecognized sources remain Other. Copy names
creation-day payment-verified value, recorded deadlines and count-based queues.
88 contract/calculation tests, 32 Admin browser tests and Admin build/security
passed. Fixtures prove displayed stock updates, not live database/provider feeds.
Commit `ace4fb6ecdf09ae86d23373bc5bd8fa11c43dbd4` reached GitHub main and
feature; Vercel production receipts `6305213175` (Admin, 08:50:44Z) and
`6305219977` (Storefront, 08:51:09Z) succeeded. Canonical Admin staff sign-in
rendered. CI `34102722278` passed full acceptance and MAP-017/catalog PostgreSQL
rehearsals. Authenticated
data acceptance remains MAP-028 I-012 / MAP-021, not proven by fixture results.
Evidence: `docs/evidence/20260906-admin-widgets/README.md`.

**Production code delivery verified, 7 September 2026:** `46827c7e6c8df2a85e88320c7b1855d917a5b3e4`
reached GitHub `main`; CI run `34083906899` completed successfully. GitHub's
production deployment receipts `6302082283` (Admin) and `6302086373` (Storefront)
both report success for that SHA. Browser verification rendered the canonical
Admin staff sign-in and Storefront home/catalog content. This supersedes the
preflight-only deployment statements below for code delivery. Authenticated staff
acceptance, unapplied SQL, provider configuration and operational activation
remain open. Failed preview statuses shared the production check names; they
must not be interpreted as failed production deployments. Full receipt URLs:
`docs/evidence/20260907-operational-readiness/README.md`.

**7 September release state:** the owner authorized promotion of the integrated
automatic-intake, dashboard and operational-readiness code to GitHub `main` and
the two linked Vercel projects. The complete local release gate passes, including
both isolated builds, all aggregate browser/API suites, security/supply-chain
checks, MAP-017 and catalog database rehearsals, and the focused receiving,
payment, marketplace and exact-shop rehearsals. This authorization is for code
delivery only. Prepared SQL remains unapplied, automatic paid intake remains
configuration/flag gated, no provider call was made, and no external channel was
activated. GitHub CI, Vercel deployment IDs and real-host observations remain to
be recorded after promotion; no live claim is made by this preflight entry.

**Operational readiness refinement, locally verified 7 September 2026
(IDEA-20260907-01):** all three isolated PostgreSQL 17.11 rehearsals pass when
`K2_TEST_PG_BIN` points to the existing local runtime. The last-unit rehearsal
proves lock-safe competition and idempotent confirmation; the marketplace
rehearsal proves exact-shop staged evidence, replay/conflict, Owner Count & Close
behavior, migration replay, postflight, and evidence-preserving rollback; and
the channel-vocabulary rehearsal proves legacy-vocabulary migration/replay,
exact marketplace/shop constraints, external-item uniqueness, public lookup and
indexes. This is local evidence only: no production SQL, provider call,
deployment, or channel activation occurred.

The final focused local acceptance passed 86/86 API/contract checks, 31/31
Admin browser checks, 2/2 intake-AI browser checks, and 1/1 Owner Count & Close
browser check. The separate Admin and Storefront production builds passed their
security, boundary, budget and secret checks; Admin measured 188.47 kB against
the 300.00 kB entry budget, while Storefront measured 149.89 kB/150.00 kB
landing JS gzip and 27.46 kB/30.00 kB CSS gzip. The initial sandbox browser
launch failure was `spawn EPERM`; the approved local reruns passed. Evidence:
`docs/evidence/20260907-operational-readiness/README.md`.

The payment path remains a narrow manual state transition plus free-text
evidence event. Existing events record actor, server timestamp, note and prior/new
payment state, including submission and verification actions. It does not yet
store separate method, amount, currency, payer, reference, proof or
instruction-delivery records, or enforce finance-verifier separation. The recorded GCash idea is not audited/authorized
for implementation and still lacks approved merchant/account/QR details. The
manual intake and flight-receiving paths are prepared with supplier receipt
disabled. The session audit executed the actual receiving/payment functions in a
minimal synthetic SQL schema: independent scans, shortage, retained box/source,
short-dated quarantine, physical/sellable quantities, receipt/payment retry and
payment event actor/time passed. This adds behavioral evidence to the earlier
source-only receiving checks; full UI/BFF/RLS receiving acceptance is still open.
Richer wrong-item/damage/unexpected-goods disposition remains unimplemented;
automatic shelf-life quarantine already exists. Exact-shop snapshot/order staging is prepared and observation-
only; Shopee is Events-only and other external adapters/publication/stock sync
remain unavailable. Remaining activation inputs and implementation work are
recorded in `MASTER_ACTION_PLAN.md` and
`docs/runbooks/PAYMENT_EVIDENCE_AND_INSTRUCTIONS_RUNBOOK.md`.

The audited channel rehearsal passes 13 checks and now verifies exact refusal
errors. External item IDs are unique within a shop; equal item IDs across distinct
shops are allowed. The original test reused the same shop/SKU and did not prove
its claimed cross-shop uniqueness. The last-unit lock probe now observes
`wait_event='PgSleep'` after confirmation before starting the competitor.

**Dashboard widgets, local implementation verified 7 September (IDEA-20260906-07):**
seven named left-panel/mobile destinations now expose one reporting view at a time,
defaulting to Shop & channel metrics. Existing permissions, operational destinations,
sales reconciliation and CSV export are preserved. Neutral panels and stronger
secondary text reduce visual competition. Missing/capped sources are unavailable;
unrecognized channels are separate, and retained snapshots/export filenames keep
their original reporting period. Exact query counts detect known row caps.
31 Admin browser checks and 81 API/logic/sales checks passed; final dashboard
loading/export guard is covered by the focused rerun in its evidence record.
Both separate production builds pass local boundary/security/budget checks.
No commit/deployment, production mutation or channel activation was performed.
Metrics beyond existing K2 records remain explicitly unavailable. Runbook:
`docs/runbooks/ADMIN_DASHBOARD_RUNBOOK.md`; screenshots/results/rollback checkpoint:
`docs/evidence/20260906-admin-widgets/README.md`. Real-host acceptance, latency and
staff timing remain MAP-028 I-012 / MAP-021/023/025.

**Automatic intake, local preparation (IDEA-20260906-05):** the isolated
`codex/automatic-intake-preparation` checkout now contains server-only OpenAI
adapters, signed private jobs/cap reservations, registered-evidence verification,
separate content/image confirmation, field/candidate review, durable recovery and
canonical media attachment. No paid call, production migration or deployment.
24 provider/orchestration and 69 focused existing checks passed. Final phone browser
suite (2 tests, including real modal content review to Draft), separate builds and
composed PostgreSQL lifecycle/concurrency/canonical-media attachment rehearsal pass.
Initial execution approval limits cleared. Second independent review remains
unavailable due to its agent usage limit; initial review defects have passing fixes.
Provider/production acceptance remains MAP-018 / MAP-028 I-016.
Evidence and rollback: `docs/evidence/20260906-intake-ai/README.md` and
`docs/runbooks/PRODUCT_INTAKE_RUNBOOK.md`. Keys alone are insufficient: model
availability (prepared image alias deprecated), retention/cost review, owner caps,
database/runtime activation and authorized real-host testing remain separate gates.

**8 September 3D store orientation, local (IDEA-20260908-02):**
The `/store` architectural room now has a compact phone landscape header and
phone shelf introduction, selection-first detail rail, hidden empty phone basket
and separate space for filled basket/zoom. The minimized keeper uses its avatar
control. Room assets/camera and canonical commerce state are unchanged by this
slice; catalog/shop is separate. Actual WebGL and fallback browser checks use a
fabricated local catalog. Store/clerk/release contracts pass 111/111; final
storefront build passes boundary, secret scan and landing budgets (149.86/150kB
JS, 27.45/30kB CSS gzip). See `docs/evidence/20260908-store-orientation/README.md`
for final browser results and before/after captures. Physical-device/GPU and
real-host acceptance remain MAP-028 I-009/I-015/MAP-027. No deployment occurred.

**8 September wholesale/media recovery, local (IDEA-20260908-01 / I-002):**
Wholesale review forwards the retained key, freezes pending/uncertain triage,
uses shared focus handling and accepts only a matching server receipt with its
exact canonical timestamp. Missing receipts stay unresolved. Media assignment
freezes images/reason, waits for uploads and retains the original assignment key
while cleanup is pending. Upload/save responses are ignored after disposal;
Customers and InventoryGrid are keyed by staff actor/role. Transport and browser
baselines failed before correction. Final shared browser suite: 30/30; focused
contracts: 95/95; Admin build/boundary/budget/secret checks pass (187.36/300 kB
application chunk, 40 manifest modules). This is intercepted local fixture
verification, not deployed receipt or real-host acceptance. Evidence/recovery:
`docs/evidence/20260908-media-retry/README.md`. I-002 retains intake/CSV, complete
navigation/reconciliation and signed provider acceptance. Owner's next priority
is store desktop/portrait/landscape acceptance under IDEA-20260908-02 / I-009.

**8 September coupon continuation, local:** CouponManager create/activate/pause/
archive dialogs retain frozen payloads and receipt keys, preserve the default
start timestamp, block duplicate submissions/dismissal while unresolved, and
permit correction after rejection. Admin scopes the workspace to actor/role.
Four browser cases exposed lost return focus: the trigger was disabled before
AdminDialog captured it. CouponManager now captures it before opening and passes
the optional returnFocusRef to the shared primitive. All 20 payment/coupon browser
cases and 94 focused contracts pass; the Admin build passes its boundary, budget
(187.21/300 kB application chunk) and secret checks. The recovery suite is routed
through its dedicated config by npm test. Evidence/recovery/limitations:
`docs/evidence/20260908-coupon-retry/README.md`. No provider/database/deployment
change was made. I-002 still owns wholesale/media/intake lifetime work and actual
signed receipt/target-host acceptance; earlier coupon-gap notes below are superseded.

**8 September supplier recovery, local:** SupplierDialog now freezes pending
or uncertain details and retains the same key through createSupplierBff. It uses
AdminDialog focus recovery, blocks pending dismissal, handles protected receipt
retry and directs legacy uncertainty to supplier-directory reconciliation. Admin
keys the workspace by staff identity/role. The pending-field test failed first;
the complete 13-case dialog browser suite and post-change Admin build pass
(187.09/300 kB minified application chunk, 40 manifest modules). Final focused
retry/BFF/dialog/intake contracts pass 88/88. Remaining
coupon, wholesale-review, media and intake lifetime issues are recorded in I-002;
no deployment or provider-state claim is made.

**8 September resumed continuation, local:** checkout now shows products total
and delivery quoted after review, removing the standalone quote's final-charge
promise until the accepted fee can be persisted with the order (I-003). The
new regression failed first; 15 delivery/operations contracts and the Storefront
build pass (149.86/150 kB landing JS gzip, 27.45/30 kB CSS gzip). The phone
request → confirmation → reload/back/forward browser journey also passes after
waiting for the lazy checkout heading before checking delivery text. Immutable
quote implementation and target-host acceptance remain in I-003.

I-002's two additional legacy uncertainty/short-viewport browser checks pass;
the saved landscape images were inspected for visible recovery controls and no
horizontal overflow. The five intake JSON transport wrappers now accept retained
keys (five failing-before/passing-after response-loss regressions; 28 focused
contracts pass). Intake UI operation lifetime and supplier/coupon/media caller
recovery remain unfinished. These changes are local; no provider was activated.

**8 September local retry transport / test readiness:** MAP-028 I-002's five
remaining fulfillment service wrappers now forward caller-owned idempotency
keys. Their response-loss regressions failed before correction; 69 focused
retry/BFF contracts and the Admin build passed (186.96/300 kB minified application chunk).
This transport evidence does not establish UI retry or deployed receipt behavior.
I-009's cold-browser trace measured the Vite stylesheet at 53,855.596 ms; the
isolated selling harness now waits for that stylesheet and requires its exact
port, with unchanged test timeout. Ten inventory/CI contracts and all eight
selling browser cases pass (2.3 minutes, first case 59.9 s). No production
performance improvement or provider change is claimed.

**8 September fulfillment dialogs, local:** all five protected fulfillment
mutations now retain their keys through the staff controls. Confirmation,
assignment and transfer show exact payload review; delivery/handover details
freeze during pending or uncertain writes. Shared AdminDialog provides focus
recovery and pending dismissal protection. Ten local browser cases pass,
including same payload/key retries, duplicate submit, corrective edits after
denial and late success after actor remount; final 75 focused contracts and
Admin build pass. Legacy delivery/handover uncertainty requires reconciliation
and offers no claimed receipt retry. No provider or full-workspace end-to-end
evidence is implied. I-002 owns remaining caller audit/fixes and host acceptance;
the design checkpoint records exact pre-edit recovery.

**9 September catalog CSV recovery, local (I-002):** the secure CSV review now
retains exact operation/chunk keys and freezes close, Escape, file replacement
and re-preview during pending or uncertain commits. Its uncertainty warning no
longer hides exact retry and durable-status controls. Disposed staff-view
responses cannot invoke completion for the replacement actor. All three regressions
failed first; the final catalog cases pass 3/3, the shared recovery browser suite
passes 33/33, focused contracts pass 88/88 and the Admin build/security/budget
gates pass (188.92/300 kB, 40 manifest modules). Evidence and pre-edit recovery:
`docs/evidence/20260909-catalog-import-retry/README.md` and
`docs/design-checkpoints/20260909-catalog-import-retry/README.md`. This is local
fixture/build evidence only. I-002 remains open for product-intake caller keys,
authenticated navigation and actual signed receipt/audit acceptance.

**8 September continuation — reconciliation locking, prepared:** I-001's real
purchase/recount fixture reproduced a PostgreSQL deadlock (22/24 properties).
`20260908_reconciliation_lock_order.sql` changes the installed recount to lock
the balance, existing batches by ID, then product; this preserves the count and
audit logic. Missing balances initialize both physical and reserved counters
from the existing lots, while first counts remain supported. The expanded
purchase rehearsal passes 28/28: opposing baskets, purchase/recount, clearance/
recount, exact stock/audit totals, denial of erased lots/below-hold counts,
first count, and exact function/ACL recovery. Final prebuild and 66 focused
contracts pass. No provider or frontend change occurred. Full signed lifecycle,
remaining writers and activation stay open under MAP-023 / I-001.

**8 September continuation — payment balance integrity, prepared:** under
MAP-023 / MAP-028 I-001, the local baseline accepted payment evidence with no
inventory balance and accepted a signed review while a concurrent writer made
the balance inconsistent. `20260908_payment_balance_integrity.sql` patches the
installed payment function after evidence recovery, preserving its ACL. It locks
SKU-ordered balances before reservations/lots and rejects missing, null,
under-reserved or overdrawn counters for evidence submission and verification.
Refund recovery is preserved. The payment rehearsal passes ten balance-denial
cases, signed concurrent-change denial without a success receipt, existing
payment/packing and concurrent-review assertions, double application, and exact
function/ACL restoration/reapplication. Final prebuild and 63 focused contracts
pass. No provider state, deployment, deduction timing or frontend changed.
I-001 now contains the partial writer-lock audit and next purchase/reconciliation
race; all-writer and full signed lifecycle acceptance remain open.

**8 September MAP continuation — IDEA-20260908-01 (local/prepared):** source
inventory documents now declare 91 prepared Admin and 15 prepared Storefront
routes, checked against the registries by the existing security inventory
contract suite. Its new assertion failed against the stale documents before
correction. Duplicate historical counts were removed from current diagrams;
provider function/deployed route inventories remain separately unverified.

The purchase-hold rehearsal reproduced a deadlock for A/B versus B/A baskets
(17/19 properties). Additive `20260908_purchase_hold_lock_order.sql` initializes
and locks all balances in SKU order before lots, preserving coverage checks,
FEFO and installed grants. Applied before the operational tests, it passes 22/22
properties including exact totals, replay, migration replay and captured function/
ACL recovery. Signed payment/packing rehearsal also passes. These are isolated
fixtures; all-writer concurrency, confirmation-time deduction and the full signed
lifecycle remain MAP-028 I-001/MAP-023. No production migration was applied.

Both separate production builds and final prebuild pass. The initial 555 source/
API contracts passed; 24 focused inventory/payment/packing/CI checks passed after
the change. Selling browser checks first hit sandbox launch refusal, then one
120-second initial-navigation timeout with seven passes; the subsequent full
rerun passed 8/8, with the first case still taking about 1.9 minutes. This remains
test reliability evidence, not a closed performance defect or real-host acceptance.
Recovery and next action are recorded in the owning MAP items and runbooks.

**Admin strategy refinement, 6 September (IDEA-20260906-06):** the owner requests
a calmer, easier-to-scan Admin with business states still clearly distinguishable.
The MAP now contains an ordered refinement of I-012/I-016: action/state inventory,
shared-control pilot, navigation consistency, operational journeys and measured
staff acceptance. DESIGN and the rulebook record the required presentation and
logic boundaries. This change is documentation only; no screen, provider setting
or runtime behavior changed. Automatic-intake preparation remains unfinished on
`codex/automatic-intake-preparation` in `.tools/hero-release`; preserve that work.


**Release verified, 6 September:** code commit a438d85 passes full GitHub CI
34021862535, including the complete acceptance command, MAP-017 PostgreSQL
migration/rollback/authorization and catalog spreadsheet rehearsals. Both
Vercel project statuses succeed for this commit. The canonical Admin entry
`https://admin.k2jimzon.com/admin-portal-k2-secure` returns HTTP 200 and the app
bootstrap. This verifies delivery, not an authenticated staff journey. Workflow
record reads remain gated by the existing BFF environment/session controls;
real staff acceptance and business write actions remain MAP-028 I-016.

**CI database follow-up:** 40956ef passes the full browser/contract aggregate and
MAP-017 migration rehearsal in run 34021427328. Authorization rehearsal stops
safely because CI omitted its LOCAL_PG_URL variable. Both rehearsal variables
now target the same isolated CI database; no validator or production setting
changes. Authorization/catalog rehearsal proof subsequently passed in CI 34021862535.

**Workflow records, prepared 6 September (IDEA-20260906-04 / MAP-028 I-016):**
WorkflowRecords adds on-demand catalog and consignment reads to the detail drawer.
It uses getAdminProducts/getAdminConsignments, displays up to ten records and
read time, surfaces partial/error/empty results, prevents overlapping requests
and discards cancelled responses when changing nodes. The BFF switch remains
required; no activation or write command is included. Working-tree fixture
acceptance passes 4/4 browser cases and 12/12 guide contracts; production Admin
build passes. Isolated release verification also passes 4/4 browser cases (9.2s),
12/12 guide contracts, 25/25 CI/configuration contracts and the Admin build
(38 modules, 186.91/300 kB application chunk). Provider acceptance remains I-016.

**CI fixture follow-up, 6 September:** Node 24 clears the base suite; run
34019315203 fails the phone shopping journey because its development knowledge
fixture implicitly depended on local database configuration. Explicit test-only
fixture loading passes the focused journey (1/1, 24.6s). Product runtime and
approval filtering are unchanged. Full remote verification subsequently passed in CI 34021862535;
see the deployment runbook for command and rollback.

**Hero deployed and dependency repair, 6 September 2026:** GitHub main 7dd8585
deployed successfully to Storefront (dpl_6dQ2vBY15gS6dmveB3xiyXydj8bK) and Admin
(dpl_5xofp9tTT8tjwa1HdHqRGW4PFCkr), as reported by GitHub's Vercel checks.
A read-only Chromium visit to https://www.k2jimzon.com returned 200, the new
collection heading and one catalog item after loading. No payment/order was made.
The Vercel connector subsequently switched to an unrelated team and returns 403
for K2; no writes were attempted through that team.

Separate CI 34018726176 failed at npm audit on existing three-stdlib/fflate
0.6.10, GHSA-px8p-9vwx-vf98. The lockfile now resolves compatible 0.6.11 with no
manifest/range changes. An isolated npm ci --ignore-scripts, zero-vulnerability
npm audit, dependency policy and both production builds pass. The repair's
remote CI/deployment remains MAP-020 release follow-up until verified.

**Hero release prepared, 6 September 2026 (IDEA-20260906-03):** three canonical
catalog previews are added above the existing sourcing map. All original hero
content and actions remain. Source is Hero.jsx plus isolated Hero.css; the
pre-edit checkpoint and hashes are under docs/design-checkpoints/20260906-hero-before-additions.
The exact isolated release passes both production builds and 8/8 hero/selling
browser checks. Storefront landing JS is 149.88/150 kB and CSS 27.39/30 kB gzip;
Admin chunk is 186.91/300 kB. Boundary and secret scans pass. Subsequent
deployment confirmation is recorded above.
This focused release excludes unfinished operational changes in the owner workspace.

**Release closure, 6 September:** a438d85 passes full GitHub CI 34021862535
(complete acceptance command, MAP-017 migration/rollback/authorization and catalog
spreadsheet rehearsals). Both Vercel project statuses succeed. The public Admin
entry returns HTTP 200 with its app bootstrap. This is deployment evidence;
authenticated record reads and business-write workflows remain MAP-028 I-016.
Completed release follow-ups are removed from the active MAP. Release history,
commands and rollback remain in the deployment runbook and workflow evidence.
The isolated checkout holds pushed commits; original unfinished changes remain
preserved and must be reconciled deliberately before the next release.

**Release verified, 6 September 2026:** hero commit 7dd8585 reached GitHub main
and both Vercel projects. A read-only canonical-host Chromium visit returned 200
and the new collection heading with one product after loading. Dependency repair
93184bc resolves nested fflate 0.6.10 to compatible 0.6.11 after CI's vulnerability
finding; isolated install, npm audit (zero), dependency policy and both builds
pass. Follow-up d59395e aligns CI Node 24 with Vercel after Node 20 failed three
vercel.ts import contracts; 24 focused contracts pass locally. Both Vercel statuses
are successful for d59395e. CI 34019315203 cleared base checks, then failed on a
database-dependent development knowledge fixture. Test-only repair 40956ef passes
the focused phone shopping journey (1/1, 24.6s). CI 34021427328 passed the full
acceptance command and migration rehearsal; authorization rehearsal safely
rejected its missing LOCAL_PG_URL. Commit a438d85 supplies the same isolated
database to both runners and includes workflow record reads. Twenty-five local
CI/configuration contracts pass; CI 34021862535 subsequently passed.
Release checkout `.tools/hero-release` holds these commits. Original
workspace changes remain intact; do not reset them to align branches.

**Workflow record access prepared locally (IDEA-20260906-04 / MAP-028 I-016):**
catalog and consignment nodes now expose an explicit Load current records action.
`WorkflowRecords.jsx` allowlists existing authenticated Admin service functions;
no diagram-provided URL, direct RPC or mutation is used. It shows up to ten
returned records, request time and batch-limit wording; fails closed on malformed
arrays, displays service failures and cancels/discards reads on node change.
The disabled BFF switch prevents requests. Existing guide state stays advisory.
Four isolated browser cases pass (read/phone bounds, partial batch/refresh,
denial/malformed response, node-switch cancellation); desktop/phone screenshots
were inspected. Twelve guide contracts pass, and the Admin production
build passes (39 manifest modules, 186.96/300 kB application chunk). Fixtures
do not establish real staff authentication or provider activation. This feature
is pushed as a438d85 after isolated 4/4 browser, 12/12 guide, 25/25 configuration
checks and an Admin build (38 modules, 186.91/300 kB). Provider confirmation and
real staff acceptance are pending. Write actions/external integration/editor
scope remains I-016.

**Local additive hero, 6 September 2026 (IDEA-20260906-03):** the existing headline,
CTAs, sourcing map and trust content are preserved. Three catalog product
previews now appear above the map with current retail/wholesale pricing and
canonical product navigation. Loading hides seed previews; missing images use
the local neutral placeholder. Exact pre-edit Hero/FlightMap/global CSS and
verified SHA-256 hashes are saved under
`docs/design-checkpoints/20260906-hero-before-additions/`, with a scoped restore
instruction. FlightMap and global CSS were not edited. Three isolated browser
checks pass: preserved content/keyboard navigation/responsive layout, broken
images and loading/empty states with both original CTA routes. Screenshots cover
375/768/1440 light/dark; landscape and 200% text shelf bounds also pass. The
Storefront production build passes at 149.85/150 kB landing JS and 27.41/30 kB
CSS gzip. Evidence uses fabricated listings and existing mock media, with external
fonts blocked; it is not real catalog/media or deployed acceptance. Retained
logs/screenshots: `docs/evidence/20260906-hero-additions/`. MAP-028 I-009 retains
the wider ecommerce design work and actual-media/owner visual acceptance.

**Local launch FAQ correction, 6 September 2026:** payment copy now describes
manual GCash/QR as planned and tells shoppers to wait for staff-confirmed stock,
delivery charge, total and approved receiving details. Unsupported Maya/bank/COD
options and fixed delivery/Pasabuy timelines were removed. No receiving account,
QR, courier or deployed behavior is established by this wording. MAP-028 I-007
retains the wider public-promise and provenance review.

**Local chunk-recovery correction, 6 September 2026:** automatic reload on
`vite:preloadError` is removed. Failed lazy imports remain unsuppressed so the
existing error boundary can render; recovery requires user action and does not
consult sessionStorage. Two bootstrap regressions failed first and now pass
alongside 17 error-safety/request-timeout checks (19 total). MAP-028 I-010 retains
rendered recovery, shared boundary wording and optional 3D/performance work.
No deployment occurred; see Admin BFF runbook for evidence/recovery scope.

**Fresh full-surface audit, 6 September 2026 (IDEA-20260906-02):** current source,
24 initial route/viewport observations plus eight focused observations, 26
Admin browser tests, both production builds and the security source inventory
were checked. The initial cold phone-home capture was a loading state; the
focused warmed capture rendered successfully. The fixtures show no page-wide
overflow or uncaught page errors, but reveal mobile product buying hierarchy
and optional-store overlay problems. Extracted-source probes reproduce a no-op
Latest sort and repeated chunk reloads beyond the ten-second cooldown. Current
fulfillment callers also narrow the earlier H-002 blanket retry-completion claim:
confirmation, delivery and handover remain direct fresh-key calls. All remaining
engineering and visual work is owned by MAP-028 section I and its linked MAPs;
this record is evidence, not a second backlog. Public-host reads were refused
by the web tool, so deployed state is not refreshed. No product UI or provider
behavior changed in this audit. Retained fixture evidence is under
`docs/evidence/20260906-readiness-audit/`.

**Prepared handover coverage, 6 September 2026:** an isolated baseline proved
handover could succeed without allocations. The correction now requires every
order line's complete packed allocation, refuses stock mismatches and deducts
only captured active reservations. The inventory rehearsal passes 17/17,
including historical-row preservation, catalog stock and replay; its payment
state is seeded. Six payment/packing browser checks also pass. Full signed
lifecycle, OWNER-002 deduction timing and H-020 common locking remain unfinished
under MAP-023. Nothing here establishes deployed or real-host behavior.

**Prepared exact-lot packing, 6 September 2026:** staff select an active
allocation, inspect its batch/expiry/box/location/custodian and explicitly
confirm the physical unit before recording its SKU barcode. Missing identity
blocks confirmation. An uncertain command freezes its barcode/allocation and
retains the same operation key. Local SQL proves exact-lot credit, invalid or
exhausted allocation denial, shelf-life checks, signed replay without duplicate
units and preservation of payment guards. The purchase runner passes 16
properties and 59 focused API/retry checks pass. These are local fixtures;
MAP-023 H-016/H-020/H-023 and OWNER-005 still govern production activation.

**Prepared atomic hold expiry, 6 September 2026:** the composed SQL baseline
reproduced release of confirmed stock. An additive sweep correction now keeps
confirmed/paid/evidence-pending/packed/unknown-deadline commitments, releases
whole eligible orders within an order-count bound, refuses counter mismatches,
records inventory events and refreshes catalog stock. The purchase-hold runner
passes 15/15 properties after the added reservation-coverage guard reproduced
and corrected confirmation of partial/expired allocations; 40 focused contracts
also pass. Complete-hold replay and last-unit races pass with the guard installed.
No provider apply or
deployment occurred. Confirmation-time deduction and full shared-lock/lifecycle
acceptance remain MAP-023 H-019/H-020/H-023; see Guest Commerce runbook.

**Prepared payment recovery, 6 September 2026:** MAP-023 H-015 now has a
protected corrected-evidence path with immutable failed-attempt history,
independent staff verification, expected state/version and stable retry identity.
The actual SQL baseline reproduced the dead end; the correction passes local
eligibility, receipt/HMAC replay, stale-review and simultaneous-reviewer tests.
The payment dialog passes 5/5 isolated browser cases across phone, landscape and
desktop; 550 contracts and the Admin build gates pass. The prepared fulfillment
boundary's CASE parser defect was also reproduced and corrected. This is not
provider-applied or deployed. Manual GCash/QR remains the intended launch model;
receiving details and real ledger acceptance are absent. Stock lifecycle policy,
full composed migrations and real staff/host acceptance remain in the MAP.
Recovery and exact commands are in the Admin BFF runbook.

**Local receiving-routing correction, 5 September 2026:** manifest row actions
now pass the exact manifest-item id, so clicking the second box of a shared SKU
can no longer increment the first. `src/views/admin/consignmentScanTarget.js`
owns selection and refusal, refusals name the box, the chosen line is re-checked
against current quantities before sending, and the box code is visible on both
the desktop table and a new phone card list. 99/99 focused contracts and the
Admin build gates pass. A JSX error in the first card version passed every
source-string contract while the build failed, so the spec now also compiles the
component; 375px rendering remains unvalidated in MAP-028 H-017.

**Local evidence and privilege integrity corrections, 5 September 2026:** intake
evidence is now classified before it is deleted — cleanup requires both a proven
non-registration and proof this request created the object, uploads no longer
overwrite (`upsert: false`), an idempotency conflict never deletes, and an
unknown outcome keeps the bytes as a recoverable pending state. Separately, the
final-Admin invariant is serialized: prepared migration
`20260905_privileged_membership_serialization.sql` adds a transaction-scoped
`k2_private.lock_privileged_membership()` guard and rebuilds both `set_user_role`
and `execute_admin_staff_access_command_v1` to take it before counting Admins,
preserving their receipts, rate limit, audit events and error codes.
`npm run rehearse:final-admin` first reproduces the loss (two concurrent
demotions commit, 0 Admins remain) and then proves the guard holds it (one
commits, one refused with `K2_ADMIN_FINAL_ADMIN`, one Admin remains, no partial
state). 89/89 focused contracts and the Admin build gates pass. The migration is
prepared and unapplied; provider-fixture evidence paths and live application
remain open in MAP-028 H-013/H-014.

**H-013 cleanup-receipt correction, locally prepared 9 September 2026:** the
Admin BFF now accepts only an exact `pending` or `completed` cleanup claim for
the requested cleanup ID before any private Storage deletion. After deletion it
reports completion only when the database returns that same ID with explicit
`completed` status; a missing or malformed completion receipt remains pending.
Two failing-first boundary cases reproduced the prior false completion and
unexpected-claim deletion paths. The final intake/BFF set passed 75/75, the
static MAP-018 contract passed, the isolated PostgreSQL cleanup lifecycle passed,
and the Admin production build/security gates passed with a 188.92 kB/300 kB
application chunk. This is local prepared evidence only: the cleanup migration
and Admin BFF route are not activated here, and authenticated real-provider
failure/recovery remains required under MAP-018/MAP-025.

**Local Inbox completeness correction, 5 September 2026:** the secure Inbox read
keeps its bounds (200 conversations, 2,000 messages) but now caps each
conversation at its newest 30 messages, so one busy thread can no longer starve
the others, and it returns `completeness` metadata plus a per-conversation
`messagesTruncated`. The Admin Inbox shows both: how many conversations are on
screen with older ones beyond the page, and when a thread is showing a sample.
Seven new checks, 103/103 focused contracts, 27/27 isolated Inbox browser tests
and the Admin build gates pass. Cursor-paginated queues, independently paged
thread messages and authoritative dashboard aggregates remain open in MAP-028
H-007.

**Local dashboard truth correction, 5 September 2026:** the overview API and the
Admin dashboard now share one Asia/Manila reporting window
(`src/lib/manilaReportingWindow.js`) instead of UTC and browser-local midnight,
so Italy- and Manila-based staff see the same buckets and the prior period no
longer loses its first eight hours; rapid 7/30/90 switching applies only the
newest response. Unknown data is no longer reported as zero
(`src/lib/overviewAvailability.js`): a failed domain shows "Unavailable" and
drops its comparison, a queue on an unreadable domain is withheld, a total
failure keeps the last successful copy marked stale, the sales CSV is disabled
with a stated reason, null product stock counts as unknown rather than
out-of-stock, and stock holds no longer derive "None overdue" from a failed read.
115/115 focused contracts, 26/26 admin browser tests and the Admin build gates
pass. Real staff acceptance across a Manila midnight and a genuine per-domain
provider outage remain open in MAP-028 H-005/H-006.

**Local delivery-rate retry correction, 5 September 2026:** publishing a delivery
rate and setting courier/source state now use the shared retained-key session
instead of a fresh key per attempt, and an unconfirmed outcome shows the amber
"did not confirm" banner and reloads rather than inviting a second publication.
`ConsignmentManager.jsx` already retained a slot-bound key and is unchanged; a
contract now pins that. Every Admin mutation caller reviewed under H-002 now
retains operation identity. 124/124 focused contracts and the Admin build gates
pass. Real authenticated and real-host command acceptance remains open.

**Local stock-hold retry correction, 5 September 2026:** the retained-key command
session is now the shared `createRetainedOperationSession` primitive, and
`ReservationHolds.jsx` uses it for releasing expired holds and extending a hold
instead of minting a key per attempt. A retry after a lost response reaches the
server as the same logical operation, and an unconfirmed outcome shows the amber
"did not confirm" banner and reloads the record rather than inviting a second
attempt. Inbox behavior is unchanged. 112/112 focused contracts and the Admin
build gates pass. `DeliveryRateControl.jsx` and `ConsignmentManager.jsx` still
mint a key per invocation; real authenticated and real-host acceptance remains
open in MAP-019 / MAP-028.

**Local Inbox ambiguous-command correction, 5 September 2026:** a staff command
whose response was lost is now reported as an unknown outcome, not a clean
failure. `commandOutcomeIsUncertain` classifies timeout and service-unavailable
results, the runtime returns `uncertain: true` and refreshes canonically, and the
Inbox shows an amber "did not confirm" alert while preserving the unsent draft.
The command session exposes `unresolvedCount()` and a `beforeunload` guard warns
before a reload discards an unresolved operation's identity — identities remain
memory-only and are never written to browser storage. 27/27 isolated Inbox tests,
80/80 focused boundary tests and the Admin build gates pass. Other mutation
owners, authenticated actor-switch and real-host command acceptance remain open
in MAP-019 / MAP-028.

**Local Inbox history correction, 5 September 2026:** the conversation event
timeline is now reachable below 1280px through an `xl:hidden` disclosure beside
the existing mobile workflow controls, and a failed history read is reported as a
failure with a retry control instead of being shown as an empty timeline. The
runtime returns `{ ok, events }`; the view tracks loading, error, empty and ready
states and keeps the existing conversation-visit and request-generation guards on
retry. 24/24 isolated Inbox tests, 78/78 focused boundary tests and the Admin
build gates pass. Real-device, text-zoom, screen-reader and long-thread
acceptance for H-012 remain open in MAP-019 / MAP-028.

**Local Inbox polling/unread correction, 5 September 2026:** the Admin Inbox
refresh is now owned rather than unconditional. Polling pauses on hidden tabs,
skips while a read is in flight, aborts on disable, and discards superseded
responses by generation. A failed background poll keeps the loaded queue and
labels it stale instead of emptying it while staff compose; only a first load
with nothing to preserve clears it. Mark-read stamps its issue time, so a
replayed receipt cannot clear a message that arrived after it, and every read
schedules a canonical refresh. 21/21 isolated Inbox tests and 78/78 focused
boundary tests pass, as do the Admin build/security/artifact/budget gates. Local
evidence only: offline/reconnect, provider revocation, authenticated actor-switch
acceptance, H-002 reload reconciliation and H-012 phone history parity remain in
MAP-019 / MAP-028. Commands, rules and rollback are in the Admin BFF runbook.

**Local Inbox draft/focus correction, 5 September 2026:** four browser
regressions reproduced cross-customer draft transfer, late-save text erasure
and workflow focus loss. The actor-keyed workspace now keeps conversation-bound
drafts, clears only the submitted version, rejects stale notice/history results
and renders stable workflow controls. All 15 isolated Inbox tests and 82 focused
API/security/release-CI tests pass, as does the fresh Admin production build.
The dedicated strict loopback harness replaces accidental reuse of another
project on port 5173. See the Admin BFF runbook for commands and recovery.
Fixtures do not establish live authentication, delivery or deployment;
MAP-019 / MAP-028 retains retry/polling/history gaps and MAP-025 real-host proof.

**Local Inbox workflow/read correction, 5 September 2026:** workflow and
mark-read callers now share the existing actor-owned retry session. Two tests
first reproduced fresh keys after response loss; the expanded boundary suite
passes 78/78 and the Admin build/security/artifact/budget gates pass. No provider
activation or deployment. Exact evidence and rollback scope are in the Admin
BFF runbook; H-002 reload, fresh-read and authenticated acceptance remain in
MAP-019 / MAP-028.

**Local Inbox correction, 5 September 2026:** internal-note/website-reply retries
retain operation IDs within one mounted staff actor session, deduplicate
simultaneous identical calls and discard retained state on disposal. Late
completions do not report success into a disposed runtime. Focused boundary
suites pass 75/75 and the Admin build/security/budget gates pass. Not deployed;
reload reconciliation, remaining command owners and authenticated browser
acceptance stay in MAP-019/MAP-028. See the Admin BFF runbook for exact evidence
and rollback scope.

**Local client correction, 5 September 2026:** Admin normal/recovery CSRF cookie
readers now contain malformed encoding and tolerate semicolon spacing. Three
regressions reproduced the earlier exceptions/missed token; combined client,
server cookie, BFF and timeout suites pass 72/72. No provider requests were sent
by these fixtures and no deployment occurred. MAP-025 owns real-host acceptance;
the Admin BFF runbook holds the command and rollback scope.

**Local request correction, 5 September 2026:** shared API timeout protection
now includes body download, preserving cancellation versus timeout and single
attempts for writes. Timeout/Admin BFF/cookie tests pass 69/69 after reproducing
the stalled-body failure. Current callers consume finite API responses; this is
not a streaming-download helper. See the Admin BFF runbook for evidence and
recovery. Not deployed; exact-host acceptance remains in MAP-025.

**Local correction, 5 September 2026:** Admin cookie decoding now contains
malformed percent encoding instead of throwing before authorization. Invalid
values cannot authenticate. Four regression cases reproduced the prior failure;
the focused cookie and Admin BFF suites pass 57/57. See
`docs/runbooks/ADMIN_BFF_SECURITY_RUNBOOK.md` from the repository root for the
command and recovery instructions. Not deployed; broader MAP remediation remains
unfinished.

**Living source of truth. Last updated: 28 August 2026 (rev. 29).**

This is the "never get lost" document. It says what the system is, how our real
workflow maps onto it, everything verified as built, and exactly what to run.
Approved unfinished work lives only in `../MASTER_ACTION_PLAN.md`. When verified
current behavior changes, update this file.

Required operational behavior is defined in
[`OPERATIONS_LOGIC_AND_WORKFLOW.md`](OPERATIONS_LOGIC_AND_WORKFLOW.md). This
System Brain records what is currently implemented; the rulebook records how
completed workflows must behave. Never confuse a rulebook target with a live feature.

New proposals are captured temporarily in
[`FUTURE_IDEAS.md`](FUTURE_IDEAS.md), then rejected, merged, deferred outside the
active queue, or audited into the Master Action Plan. Never treat an intake idea
or MAP item as current production behavior until it is verified and recorded here.

---

## 0. Verified live security state — 24 August 2026

Established by direct, read-only measurement of the live project, not inferred
from repository files. Full detail and reproduction commands are in MAP-016 and
MAP-017 of `../MASTER_ACTION_PLAN.md`.

**Credential state — contained.**

- The legacy HS256 JWT signing key is `revoked`. The previously exposed
  service-role token moved from elevated access (30 rows versus 27 for anonymous)
  to HTTP 401. Legacy API keys remain disabled. The active signing key is ES256.
- `invite-staff` is ACTIVE at version 6 and a real Admin AAL2 invitation now
  completes end to end, producing the system's first durable invitation receipt.
  Before this, the function rejected every caller including valid AAL2 admins.
- Both Vercel deployment targets pass the name-only environment contract, and
  neither carries a provider secret or a secret-shaped `VITE_` variable.

**Database state — anonymous READ access is contained; anonymous WRITE access is
not.**

- Confirmed contained: anonymous requests are refused outright for
  `user_profiles`, `orders`, and `product_batches`, and return no rows for
  `messages`, `conversations`, `channel_credentials`, `staff_allocations`,
  `product_drafts`, and `warehouses`. Customer and staff data is not anonymously
  readable.
- Confirmed exposed: the anonymous role holds `INSERT`, `UPDATE`, `DELETE`, and
  `TRUNCATE` on `brands`, `categories`, `warehouses`, `product_drafts`, and
  `products_old`, plus direct insertion to `error_reports`. Row Level Security is enabled
  on these tables, but their policies are blanket `ALL USING(true)` rules, so RLS
  does not restrict the grant. The `product-images` bucket still allows anyone to
  upload, update, and delete, with no size limit and no MIME allowlist.
- `products_old` is additionally readable by anonymous callers (all 14 rows) and
  is still published in `supabase_realtime`.

**Known live degradation.** Anonymous callers cannot read
`v_product_stock_from_batches`, so the production storefront logs HTTP 401 for it
and falls back to the older `products.stock_available` column. Displayed
availability may therefore not be the authoritative batch-derived count. This is
the same permission gap recorded as repeated "permission denied for view" errors
in the 21 August provider log review.

**Remediation status.** The original phase-one correction is the prepared, rollback-validated
migration `20260812_map017_public_write_boundary_hardening`, which is the single
migration genuinely absent from the applied ledger among the four the schema audit
checks. Codex independently refreshed the corrected 21-finding live audit (13
critical, 7 high) and 12/14 read boundary on 22 August, fixed a cross-schema
grant false positive, and repaired the migration's missing safe public-stock
projection. The exact migration, postflight, and anonymous stock read then passed
in an explicit production transaction ending in `ROLLBACK`; all nine sampled
baseline restoration checks passed. The owner authorized that exact phase-one
migration on 26 August, but required verified recovery first. A named production
application-database backup/loopback restore and a full Storage object-byte/local
restore now pass. The owner-only off-site upload and all eight independent
retrieval/SHA-256 checks pass. The Drive-retrieved first Storage chunk also
reassembled with part 002 to the exact original encrypted archive digest. Owner
recovery access remains Pending, so the guarded executor must still refuse.
No DDL has been applied.
The 29 August executor correction enforces that account-level recovery proof as
a distinct permanent-apply gate instead of conflating it with backup evidence.
Its focused contracts pass 24/24 and the portable PostgreSQL lifecycle passes all
12 authorization groups plus encrypted backup and isolated restore.
The captured metadata is not a complete DDL backup, so the recovery generator
correctly remains fail-closed: pre-commit recovery is the verified PostgreSQL
transaction rollback, while any post-commit incident must use a reviewed
roll-forward correction and must not recreate the known anonymous-write baseline.
An exhaustive metadata-v2 pass now supersedes 21 as the breadth count: 55
findings (47 critical, 7 high, 1 medium) across all 42 public tables, 9 views,
53 functions, schema grants, and default privileges. It found the additional
`error_reports` write, view DML grants, seven `PUBLIC`-executable functions,
eleven unreviewed anonymous RPCs and
twelve unsafe public future-object default groups. All public tables have RLS,
all public views are security-invoker, and client roles lack schema CREATE.
The 24 authenticated RPC evidence gaps are now closed by an explicit function
matrix plus boolean-only live staff/Admin/AAL2 guard signals; 13 reviewed
mutations remain transitional until the Admin BFF supplies idempotency.
Phase one now hardens `postgres` defaults and still passes production rollback;
the Management API role cannot alter six `supabase_admin` default groups, so
those remain provider-owned rather than falsely fixed.

The 24 August read-only refresh found no improvement or drift: the exhaustive
result remains 55 findings (47 critical, 7 high, 1 medium), and anonymous
behavior remains 12/14 with all 14 `products_old` rows exposed and the public
stock view returning HTTP 401. The exact migration again passed a forced-
rollback production rehearsal plus 9/9 restoration checks, and the isolated
PostgreSQL lifecycle passed all 12 authorization groups and idempotent replay.
The isolated server was stopped afterward. These are current preparation and
reversibility facts only; production remains unremediated pending the required
named backup/restore evidence and guarded authorized execution.
The complete local lifecycle is now reproducible with
`npm.cmd run verify:map017-portable`; it uses only the workspace's ignored
PostgreSQL 17.11 runtime, loopback port 55432, and
`k2_map017_rehearsal_local`, then stops a server it started. The command and all
20 schema-truth tool tests pass from a stopped-server state. The rehearsal now
executes the exact generated permanent-apply SQL, including an atomic
payload-bound ledger receipt and a separate 11-invariant read-only verification,
then proves exact replay. The production executor never retries a write and
fails ambiguous responses closed unless that independent receipt and every
postcondition are present. Its payload SHA-256 is
`D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62` and its
planned ledger version is `20260824143000`. OWNER-005 is now recorded as
Authorized, but the executor remains unusable until the exact project, payload,
off-site/Storage recovery, finding count, ledger, and remaining recovery gates
are supplied. No production apply was attempted. The owner also selected private
archive plus verified retirement for the 14-row `products_old` legacy table; its
encrypted database archive now exists and passed isolated equality, while no
access change, Realtime change, or table retirement has occurred yet.

On 28 August, a fresh default-run retry of `npm.cmd run verify:map017-portable`
again passed the artifact, rollback, dry-run, and fixture parser checks but
failed when the bundled PostgreSQL child process attempted to start
(`portable PostgreSQL startup failed: unknown failure`). No database write or
production connection occurred. The last approved workspace run remains the
valid isolated lifecycle evidence; this runner still cannot reproduce it.

The separate `20260826_map017_error_report_boundary` migration is prepared and
verified only in isolated PostgreSQL; it is not applied live and is not part of
the OWNER-005 phase-one payload. Its behavioral test denies 100 direct inserts
for each of `anon` and `authenticated`, proves the row count is unchanged,
preserves the staff-authenticated read policy, and proves an authenticated
non-staff caller cannot read the rollback-only probe row. The migration applies
and replays in `npm.cmd run verify:map017-portable`. Live anonymous insertion to
`error_reports` therefore remains a confirmed exposure until a separately
backup-gated application and live postflight occur.

The 26 August independent correction pins that hash to the final committed SQL
and adds a regression across all authoritative records. The executor dry-run now
derives its authorization and backup safety lines from OWNER-005 instead of
printing a stale hard-coded unauthorized status. It currently reports the
truthful state: owner authorized, named backup/restore evidence pending, and no
apply attempted.

A prepared CLI now creates the MAP-017 pre-migration database artifact without
writing a plaintext dump: it validates the exact Supabase project/TLS boundary,
requires payload/ledger/purpose confirmations, enforces client/server major
parity, captures a deterministic redacted fingerprint of exactly 14
`products_old` rows before and after the dump, encrypts the in-memory custom dump,
authenticates that fingerprint as AES-GCM associated data, and exclusively creates
an encrypted envelope plus redacted manifest. Fourteen focused tests cover target refusal,
credential-free arguments, encryption fidelity, manifest redaction, and
pre-existing-file preservation. This is locally prepared behavior only. No
production database URL, backup passphrase, or isolated restore target is
configured, and no production backup existed at that checkpoint. On 26 August the owner selected
Google Drive and the authorized connector created the owner-only, unshared
`K2 Production Backups` folder under `k2jimzonwebsite@gmail.com`. This verifies a
writable destination only; upload, independent download/checksum, restore, MFA,
capacity, retention, and independent recovery-access evidence remain pending.

The MAP-017 restore verifier is also implemented and exercised locally. It
authenticates/decrypts the envelope, permits only a dedicated empty loopback
database, enforces client/server major parity, restores without replaying source
ownership or privileges, checks schema and migration-ledger health, and writes a
redacted receipt only after the restored 14-row `products_old` fingerprint also
matches exactly. Manifest fingerprint tampering and restored row drift fail
closed. A real PostgreSQL 17.11 portable archive passed that complete encrypted
backup/isolated restore path with 14 seeded legacy rows. At that checkpoint this
was local tooling evidence only; the later production artifact and
representative-data restore are recorded below. Off-site retrieval and
Storage-object restore have still not passed.

A read-only Supabase backup inventory on 26 August returned PITR disabled,
WAL-G enabled, and no available backup entries for the exact production project.
This proves only provider configuration and current inventory; it does not prove
a recoverable backup. Supabase database backups also exclude Storage objects, so
database restore and object restore remain separate evidence gates.

On 27 August the same provider inventory was refreshed and remained unchanged:
PITR disabled, WAL-G enabled, zero named backups. The complete portable gate
passed again outside the process sandbox with 12 authorization groups,
transaction rollback restoration, exact payload apply and replay, error-report
flood denial, an authenticated encrypted custom archive, equality of all 14
legacy rows, and isolated restore. A separate focused run passed 51/51 backup,
restore, schema-truth, authorization, and error-report contracts. A redacted
linked-project Supabase dump dry-run also exited successfully, proving the CLI
can use its native stored credential. The approved production command does not
extract that credential. At that checkpoint `.env.local` still lacked the
explicit production database URL and owner-held backup passphrase, so no
production envelope, manifest, or restore receipt had been created. The later
27 August result is recorded next; no production DDL was attempted.

Later on 27 August the owner replaced the local placeholders with valid values.
The exact project/session-pooler/TLS checks and a read-only PostgreSQL 17
connection passed. Backup
`map017-pixplcjqivlfflickobf-20260827T134506.742Z-be6b75c0db0d` was encrypted
directly to `.backups/map017-pre-migration-20260827-01.k2backup` without a
plaintext dump or production write. Its isolated restore verifies 51 public
relations, the required tables and migration ledger, and exact equality of all
14 authenticated `products_old` rows. Plain PostgreSQL cannot install Supabase's
managed `supabase_vault` extension, so the verifier explicitly excludes and
records ten Vault-owned TOC entries; it also pins both database sessions to UTC
so timestamp serialization is deterministic. The evidence boundary excludes
Vault, Storage objects, provider configuration, off-site upload, and independent
retrieval. Production DDL therefore remains blocked.

The owner also confirmed `k2jimzonwebsite@gmail.com` as K2 Jimzon's primary
owner/provider login, recovery identity, and project contact across Hostinger,
Vercel, Supabase, Search Console, and related services. It remains a Gmail
account identity, not a `@k2jimzon.com` mailbox or permission to store credentials
in repository files.

The production Storage inventory currently contains one public
`product-images` bucket with 36 distinct objects and 115,573,916 bytes. On
27 August `scripts/map017-storage-backup.mjs` downloaded those public bytes
read-only, enforced database-recorded sizes, rejected unsafe or duplicate paths,
hashed every object, and encrypted the complete path/byte archive with
AES-256-GCM. Backup
`map017-storage-pixplcjqivlfflickobf-2026-08-27T141713000Z-6e60fb24d07a`
restored into a dedicated ignored local directory with exact count, total-byte,
and collection-fingerprint equality. Its redacted manifest and receipt expose no
object paths. This proves file-level object recovery only; Supabase bucket-policy
and provider-configuration restoration and live re-upload behavior remain
unverified. No production write or DDL occurred.

The owner then authorized uploading only the encrypted/redacted database and
Storage backup artifacts to the owner-only Google Drive folder. Because the
115,580,694-byte Storage envelope exceeded the connector's 100 MiB input ceiling,
`scripts/split-encrypted-backup.mjs` split it without decryption into
67,108,864-byte and 48,471,830-byte parts and proved exact local reassembly to
SHA-256 `6E60FB24D07A80CB8FDBDBBC7F0EE3EFF86FEE0EE0A9657E9D4F5C94607AE312`.
Drive now holds eight files. Google metadata reports exact byte lengths,
`shared: false`, the intended folder parent, and only owner
`k2jimzonwebsite@gmail.com` on every artifact. Independent connector downloads
matched local SHA-256 for all eight files. The owner used a normal authenticated
Drive session for the first Storage part, which bypassed the connector frame
limit; its 67,108,864 bytes and SHA-256 matched. Reassembly with part 002
produced the exact original encrypted archive digest. Owner recovery access
remains the only MAP-017 production-activation gate.

On 30 August, a fresh owner-authenticated Drive profile check identified
`k2jimzonwebsite@gmail.com`, exposed the owner-only backup folder and both
restore receipts, and returned the complete encrypted database envelope. The
repository validator then authenticated and decrypted that exact named envelope
with the locally retained passphrase without printing it, verifying 674,413
encrypted bytes, the custom PostgreSQL dump signature, and dump SHA-256
`8ED220049E7611D471C7165FEAE3FFA490317197C55C24542DE4D1FA2893581D`.
Current-workstation retrieval/decryption is therefore verified. OWNER-005 stays
Pending until the owner confirms approved password-manager plus separate offline
passphrase custody and current Google 2-Step Verification recovery email/phone;
no production DDL was attempted.

A separate MAP-017 migration now prepares retirement of the obsolete direct
`error_reports` browser write. It drops both known public insert policies,
revokes browser-role `INSERT`, preserves the authenticated staff-read boundary,
and fails closed on catalog drift. PostgreSQL 17.11 applied it twice; 100
anonymous and 100 authenticated direct attempts retained zero rows, while staff
read access remained available and authenticated non-staff access remained
hidden. The full portable authorization, encrypted-backup, and isolated-restore
lifecycle still passed. This is local
database evidence only. The migration is not part of the exact OWNER-005
phase-one payload, has no production authorization/receipt, and has not changed
the live anonymous grant documented above.

**The migration ledger is not a record of what is applied.** There are 60 local
migration files and 5 ledger entries. Spot-checks prove the gap runs both ways:
`audit_logs`, `notifications`, `product_drafts`, and
`k2_private.staff_invitation_operations` all exist live without a ledger entry,
while `globe_cms` and `consignment_manifests` were never applied at all. The live
schema carries 87 tables that no ledger entry accounts for. Treat filenames as
proposals, not history, and never run an ordinary production `supabase db push`.
Reassuringly, none of the five migration files that *do* correspond to ledger
entries has been modified locally, so there is no drift between the repository and
the SQL that was actually applied.

**BFF entrypoints now exist locally but remain doubly disabled and are not
deployed.** The leaf handlers remain in `prepared-api/`; one consolidated guarded
entrypoint now exists at each of `api/admin/index.js` and
`api/storefront/index.js`. Their exact API-prefix rewrites are declared in the
separate Vercel configurations. Each entrypoint returns a minimal `404` unless
both its matching `K2_DEPLOYMENT_TARGET` and independent server switch
(`K2_ADMIN_BFF_ENABLED` or `K2_STOREFRONT_BFF_ENABLED`) are enabled. Both server
switches and both browser switches remain false. Local routing tests are not
Vercel artifact, deployment, or real-host evidence; each preview must still
prove its function inventory and denial behavior before activation.

---

## 0a. Verified live data state — 2 September 2026

Read-only measurement of the production project through the browser-public
anonymous client, exactly as the storefront queries it. This is what a customer's
browser gets today.

**The published catalog returns zero rows, and the cause is the publication flag,
not the status.** Broken down rather than measured as a single number:
`products` readable by `anon` is 27; `status in ('Live','Active','Unlisted')` is
27; `published = true` is **0**; both together, which is what `fetchProducts`
asks for, is **0**. Every row reads `Live / published=false`.

`published` became a gate in `57c340c` on 2 September 2026. Before that commit
`fetchProducts` filtered on status alone, so the flag was inert and no member of
staff had ever set it. The gate shipped without a backfill and the catalog went
to zero the same day. This is a different failure from the all-or-nothing stock
coupling that MAP-023 queue item 11 was originally raised for; that coupling has
since been fixed and no longer holds.

**The gate is nevertheless correct, and the owner has chosen to leave production
empty.** All 27 rows have `primary_image_url`, `secondary_images`, and
`lifestyle_images` empty, and `PhotoManagerModal.jsx:42` requires a published
product to keep a primary photo. By the project's own rule these 27 are not
publishable, which means the catalog that was public before the gate shipped was
showing photoless drafts. Filling the shelves is blocked on photography, not on
engineering: photograph, attach a primary image, then tick `Published` per row in
Sheet mode. `InventoryGrid.jsx:901` hides that checkbox while `secure` is true,
so Sheet mode is the surface that can set it.

The local storefront looks healthy only because `StoreContext` falls back to the
`src/data/products.js` seed in development; production correctly renders an empty
catalog, and a contract now pins that guard, because the seed ships in the bundle
by necessity and is one deleted line from advertising 36 fabricated products.

**`v_product_stock_from_batches` is denied to the anonymous role**, SQLSTATE
`42501`, permission denied for view. `AUD-002` remains open and unchanged.

**`globe_products` holds 17 rows, all enabled and readable.** This is the owner's
curation from the Admin Globe CMS and it is intact; the globe was empty because
of a source-side constant, now removed, not because of the data.

**`reviews` is readable and returns zero rows.** The review globe therefore runs
on a labelled sample set until real rows exist. The owner holds the real reviews
as marketplace screenshots and PDFs, not yet as data.

**Both Vercel projects deploy and serve.** The storefront and admin both built
and deployed from `main` once the configuration defect above was fixed.

## 1. What K2 Jimzon is

K2 Jimzon imports authentic Italian products and sells them in the Philippines.
We are our own brand (not a plain reseller), and we run a **pasabuy-style cargo
model**: products are packed in Italy, flown to the Philippines, received into
hubs, held by specific staff, and sold across our website and marketplaces.

The software is **one project with two faces**:

- **Storefront** — the public website customers buy from.
- **Admin BOS** — the central staff operating system and **source of truth** for
  products, inventory, flights, custody, orders, fulfillment, customers,
  Pasabuy, channel preparation, communication, evidence, and reconciliation.

Shopee, TikTok Shop, Lazada, and future channels must connect through backend
adapters to the same canonical records. No channel connector may create a second
inventory, order, customer, or reporting truth.

**Tech stack:** React + Vite + Tailwind on the front end, **Supabase**
(Postgres + realtime + storage) as the backend, deployed on **Vercel**.
Live project ref: `pixplcjqivlfflickobf`.

---

## 2. Our real operating workflow

This is the actual process the dashboard is built around — not generic
e-commerce:

1. **Pack in Italy** — staff scan items into a cargo box (Milan packing scan).
2. **Confirm shipped** — the Italy side confirms the box has flown out.
3. **Receive in PH** — when the box reaches a hub/warehouse, staff **scan to
   receive** and verify the box contents are complete (discrepancies flagged).
4. **Custody** — received stock is held by a **specific staff member** at a
   **specific hub**. The same product can sit in several hubs with several
   holders at once.
5. **Batches & expiry** — the same product arrives across multiple boxes with
   **different expiry dates**. Each box's stock is its own **batch/lot**.
6. **Sell** — across Website + Shopee/Lazada/TikTok, etc.
7. **Fulfil** — orders land in the Fulfilment Hub; we ship **oldest-expiry
   first (FEFO)**.

There is **no PIN step** — receiving is a scan-to-verify, not a code entry.

---

## 3. The batch / expiry / location system

Current production truth: lot rows, expiry alerts, aggregate inventory, basic
custody fields, exact-lot reservation, unit scanning, and protected custody
transfers are live. The operations hardening and its two security follow-ups
were applied through the migration ledger on 2026-08-10.

The heart of inventory tracking. One product (one SKU) has **many lots**, and
each lot carries its own details.

**Each lot records:** quantity, expiry date, cargo box code, landed date,
**hub (where it is)**, **custodian (who holds it)**, **channel (which platform
it's for)**, and a pin flag.

**What it powers:**

- **Total stock** per product = sum of its lots.
- **Expiry alerts** — the 🔔 bell shows any lot nearing/past expiry, with its
  days-left, box, hub, holder and channel. Sell/clear these first.
- **FEFO allocation target** — confirmation reserves exact eligible lots in
  soonest-expiry order. Pins are attention markers and never override FEFO.
  The legacy `deduct_stock_fefo()` shortcut is intentionally disabled.
  On 31 August 2026 an isolated PostgreSQL 17.11 concurrency rehearsal executed
  the repository's actual `confirm_order_request` definition: two orders raced
  for one eligible unit, the loser waited on the winning lot lock and was refused,
  and final state retained exactly one reservation/order/event with physical and
  reserved quantity `1/1`. A same-order retry after an intentionally ambiguous
  successful response returned the same confirmed order and preserved that exact
  state without another reservation, canonical order, inventory event, or
  reserved-quantity change. This is verified local source behavior for the
  repository function's already-confirmed retry path, not general connector
  ingestion/reconciliation evidence and not proof that
  the live database has the same definition or that any external channel is safe
  to activate. Fresh local closeout passed the complete consignment/receiving
  file 9/9, API/security/source contracts 386/386, and rendered selling journeys
  3/3.
- **Inventory breakdown** — each product card in Inventory shows live splits:
  "42 pcs in 3 lots", 📍 by location, 🛒 by channel, 🙋 by holder.

**Where to edit:** Inventory → open a product → **📦 Batches** → add/edit lots
with all their fields.

---

## 4. Channels & connectors (honest status board)

The **Channels** screen shows each marketplace/chat channel as 🟢 **Live** or
⚪ **Not connected** — and the status is *real*, read from the
`channel_connections` table. A channel turns Live automatically the moment its
backend connector processes a real event. No fake "Connected" badges anymore.

**Key architecture rule (do not break):** connectors run on the **backend**
(Supabase Edge Functions) using the **service-role key**. **API keys are never
entered into the dashboard or any browser** — they live only in **Supabase →
Edge Function secrets**. Treat every API key like a password.

**For a non-technical helper:** each not-connected channel has a **"How to
connect"** button with a plain 5-step guide and buttons that jump straight to
the right Supabase page.

**Shopee connector intake** (`supabase/functions/shopee-webhook`) verifies a
signed push and durably queues it without inventing a SKU, quantity, buyer, or
order. It reports **Events only**, not Live, until full order-detail retrieval
and reconciliation work. Deployment still requires approved credentials and
verification against the exact current Shopee signing contract.
The local prepared intake now bounds requests to 256 KiB JSON with exact UTF-8
decoding and a required 1–30,000 ms absolute body-read deadline that cancels a
stalled stream, requires shop, timestamp, and deterministic event/order-status
identity, and applies an explicitly configured 60–86,400-second replay window.
It no longer uses arrival time as a fallback event key. The prepared Edge path
now calls one service-role-only `capture_shopee_event_v1` database command
instead of directly upserting the inbox. That command uses private forced-RLS
per-shop and global buckets, counts denials durably, fails closed when no
reviewed limits are configured, preserves a processed row on exact replay, and
returns a conflict without overwriting evidence when the same identity carries
changed type or payload. The migration deliberately installs no production
limits. Its isolated PostgreSQL rehearsal passes configuration, privilege, RLS,
budget, replay/conflict, cleanup, postflight, and idempotent-replay assertions;
the 31 August MAP-023 strengthening now explicitly proves an ambiguous successful
response can be retried into the same terminal row, changed evidence cannot
overwrite it, exactly one event row remains, and capture/replay/conflict produce
shop/global budget counts of `3`. The focused boundary passes 5/5 and fresh
API/security/source contracts pass 386/386 plus 3/3 rendered selling journeys.
Earlier complete security/prebuild and separate-build evidence also remains
recorded. This is source-level preparation only:
the migration, limits, official Shopee signing string, retry window, credentials,
deployment, real signed push, durable provider capture, and reconciliation
remain unapplied or unverified, so the channel is not Live.

One canonical channel/shop foundation is now prepared locally under
`20260829_channel_vocabulary_and_shops.sql`. It defines the six channel codes
(`website`, `pasabuy`, `manual`, `shopee`, `lazada`, `tiktok`), one
`channel_shops` row per seller account, and shop identity on order requests and
channel listings. The migration maps known legacy listing spellings, rejects
unknown channels, requires every marketplace order to name a same-channel shop,
forbids shop identity on K2-owned channels, and supports two shops listing the
same SKU without sharing an external item identity. New foreign keys have
dedicated lookup/cascade indexes. Its isolated PostgreSQL 17.11 migration,
idempotent replay, access, index, and behavioral checks pass 12/12. This is
prepared schema truth only: production still has the legacy vocabulary and no
shop-aware connector is live.

The owner approved an inbound-first target on 31 August 2026: K2 should first
stage products, listings, prices, and reported quantities from each individual
marketplace shop, require human product-link/new-Draft decisions, preserve one
K2 SKU with per-shop aliases, and reconcile quantity observations before any
physical-stock effect. The flexible planning target is two eligible units per
individual shop, with Covered, Thin, Skipped, Out, and Needs-review states;
scarce products may skip shops, and recent verified sales may rank a proposal
that the owner can override. Automatic availability rebalancing must not be
confused with a physical custody transfer.

The private backend slice is now **prepared and rehearsed locally, not applied
or deployed**. `20260831_marketplace_snapshot_staging.sql` adds forced-RLS
listing/order evidence, aliases/observations, fee versions, physical-count
reviews, coverage overrides, customer-minimized Pasabuy readiness, a sealed
bookkeeping-handoff artifact, immutable events, and resumable close sessions.
The 81-route Admin BFF exposes fixed listing/order stage/status and
`owner-close/{session,fees,stock,coverage,pasabuy,bookkeeping}` boundaries.
Staff/AAL2 can stage/recover listing evidence; Admin/AAL2 is required for human
product decisions and every close mutation. Reported quantity remains an
observation and the close migration contains no `product_batches` DML.

Three explicitly synthetic Shopee/Lazada/TikTok listing fixtures and three
customer-free order fixtures exercise only K2's normalized contracts; they do
not prove provider columns, current fee policy, settlement fields, or API parity.
The focused snapshot/order/fee/stock/coverage/Pasabuy/bookkeeping/close contracts
pass. Isolated PostgreSQL 17.11 passes bootstrap, preflight, migration, replay,
signed behavior, postflight, non-destructive rollback, and evidence preservation.
It proves exact replay/conflict, Staff denial, Admin link/create/unresolved,
server Draft SKU, versioned close resume, cross-import deduplication, latest-
import fee arithmetic/blocking, matched/reconciled and zero-lot count review,
customer-minimized Pasabuy readiness, blocker-aware handoff completion, forced
RLS, and an unchanged `product_batches` sentinel. The 81-route verifier and
zero-gap security-surface inventory pass.

All nine phone rails are locally prepared: sources, listing import, identity,
orders, fees, physical/exact-lot review, per-shop coverage/alerts, Pasabuy
readiness, and a fixed-schema formula-safe bookkeeping CSV plus sealed completion
event. The mocked secure-BFF journey passes at 375×812 and 812×375 with reduced
motion, no horizontal overflow, and 44px active controls; its portrait render was
visually reviewed. This is local synthetic evidence only. No real export, real
quantity count, provider policy/settlement, production schema/flag/credential,
deployment, physical-device, screen-reader, or staff acceptance was exercised.
Those activation and representative-data steps remain in MAP-023/MAP-026.
Existing Inventory, Sales Summary, Sales Planner, Pasabuy, and lot commands
remain canonical; the former provider-quantity-to-`products` example remains
historical and forbidden.

---

## 5. How data flows once connectors are on

Connector adapters will write into Supabase and the UI can consume canonical
records live. A captured webhook does not mean the full order/message/waybill
workflow is connected:


- Inventory sync → **`products`** → shows in admin Inventory **and** storefront.
- Incoming events → **`channel_event_inbox`** → detail retrieval and
  idempotent normalization → **`order_requests`** → Fulfilment Hub.
- Incoming messages → **`conversations` + `messages`** → unified Inbox.
- Connector heartbeat → **`channel_connections`** → Channels board turns Live.

Full contract in **`CONNECTOR_INTEGRATION_SPEC.md`**.

---

## 6. Database — what exists

**Core tables:** `products`, `orders`, `conversations`, `messages`,
`user_profiles`, plus supply-chain/consignment/notification tables from the
numbered migrations. Machine-readable contract exported in `src/types/database.types.js`.

**Infrastructure & Environment Integrity (MAP-000 verified):**

- **CLI Config:** Official `supabase/config.toml` initialized (`project_id = pixplcjqivlfflickobf`).
- **Secret Isolation:** `.env.example` strictly partitions browser-safe configuration (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) from server-only secrets (all secret `VITE_` prefixes removed).
- **Production Guard:** `src/lib/supabaseClient.js` throws explicit configuration errors in production if required backend environment variables are absent.
- **Repository Cleanliness:** `.gitignore` excludes `supabase/.temp/` linked state.
- **Automated Verification:** `scripts/verify-supabase-integrity.js` validates environment and schema integrity.

**Added recently:**

- `product_batches` — the batch bank (qty, expiry, box, hub, custodian, channel, pin).
- `channel_connections` — real Live/Not-connected status per channel.
- `error_reports` — legacy diagnostic table; current browsers do not write it
  directly, and its still-live anonymous insert boundary is prepared for
  retirement under MAP-017.
- `orders` gained `customer_name`, `customer_email`, `total_amount`.

**Views:** `v_product_stock_from_batches`, `v_expiring_batches`,
`v_stock_by_hub`, `v_stock_by_custodian`, `v_stock_by_channel`,
`v_batch_allocations`.


**Functions:** `is_staff()`, exact-lot reservation, order-first unit packing,
non-destructive reconciliation, partial custody transfer, coupon redemption,
and delivery quotation are live. Deprecated direct-stock and ambiguous-scan
RPCs are unavailable to browser roles.
**Enums:** `channel_type` (order channels incl. shopee/lazada/tiktok/website),
`chat_platform` (inbox platforms).

### Migration source of truth

The historical `RUN_THIS_*` files explain earlier setup but are not the current
upgrade path. For this deployed project use the dated additive migrations in
`README.md`. Never rerun the old consolidated script merely to obtain a newer
feature.

**Moved 25 August 2026.** Those five files now live in `supabase/historical/`,
not `supabase/migrations/`. They sat in the migration directory while being
already-applied history, so any tool walking that directory would try to apply
them, and `scripts/audit-security-surfaces.mjs` had to skip them by filename —
which left their `SECURITY DEFINER` functions, RLS enablement, and policies
outside the security inventory. The audit script now scans
`supabase/historical/` explicitly, so the content is still counted while
migration tooling ignores it. See `supabase/historical/README.md`.

### Historical SQL run order

These files are in `supabase/historical/`. Run them in the Supabase SQL editor
in this order **only when standing up a fresh database** — never against the
deployed project. For a fresh database, run the numbered migrations `0001`–`0018`
and the `20260722/23` RLS files first.

1. **`RUN_THIS_master_setup.sql`** — enums + order fields + batch bank + expiry
   + error reports + `is_staff()`.
2. **`RUN_THIS_batch_location_channel.sql`** — adds `channel` to lots + the
   by-hub / by-holder / by-channel views.
3. **`RUN_THIS_channel_connections.sql`** — the Live/Not-connected status table.
4. **`RUN_THIS_auth_roles.sql`** — staff logins: `is_admin()`, RLS on
   `user_profiles`, anti-role-escalation trigger. (Then bootstrap the first
   admin: sign in once, then `update user_profiles set role='Admin' where
   email='…'`.)
5. **`RUN_THIS_product_drafts.sql`** — the AI Sourcing review-queue table.

All have been run on the live database as of this update.

### Logins, roles & 2FA (secure — no backdoors)

Auth is real Supabase Auth (email+password or Google); passwords are bcrypt-
hashed and never seen by us. Access = a live session whose `user_profiles.role`
is exactly Admin, Staff, or the owner-controlled SuperAdmin role, enforced by
RLS. A newly created Google/email Auth
identity receives the `Customer` role and cannot enter Admin BOS. Staff access
requires either the hardened invitation flow or an explicit audited Admin role
assignment; merely creating an Auth identity grants no Admin access. The live
aggregate on 15 August 2026 contained four existing authorized Admin profiles.
Their identities were not changed during the security repair. The old localStorage "admin=true" flag,
master passcodes, and `password123` fallback were REMOVED. Accounts are
invite-only (super admin invites → person sets their own password → super admin
sets role in **Staff & Roles**). SuperAdmin assignment is owner-controlled and
is not available in the ordinary role selector. Admins can enroll TOTP 2FA on
their own account.
The active production Edge Function `invite-staff` version 6 performs invites
through modern hosted key maps with exact Admin role and AAL2 authorization,
strict origin/body validation, durable operation receipts, bounded retry/rate
behavior, and success only after canonical role persistence. Its production
denial/CORS boundary and rollback-only receipt behavior passed on 15 August 2026;
on 22 August a real Admin AAL2 invitation passed all twelve production checks,
including replay/conflict behavior and canonical Staff-role persistence, with
zero residual test identities or profiles.
Supabase Auth URL Configuration must point at the two Vercel sites (storefront +
admin) or OAuth bounces to localhost.

The active production Admin OAuth callback is the exact public origin
`https://admin.k2jimzon.com/admin-portal-k2-secure`. Vercel
deployment-specific and protected preview URLs are never OAuth callbacks; the
Admin client canonicalizes non-local Google sign-in returns to that stable
origin. When Google returns an eligible Admin/Staff session that still requires
AAL2, the sign-in surface opens the six-digit authenticator step instead of
silently rendering the credential form again. Role lookup failures and accounts
without Admin/Staff access render distinct inline recovery messages.
Google OAuth uses PKCE so access and refresh tokens are not returned in the
address-bar fragment. The auth-state listener performs no nested Supabase Auth
calls while the provider callback lock is held; role and MFA verification are
deferred until the callback has persisted the session and sanitized the URL.
The Staff & Roles screen now reads verified TOTP factors from Supabase and keeps
an `Active` security status visible after enrollment instead of reverting to a
misleading enrollment button. The active Admin production bundle contains this
status behavior. One verified TOTP factor was confirmed in the live provider
aggregate on 15 August 2026; no factor identifier or account detail was recorded.

Permanent product deletion now uses the live Admin+AAL2-only
`delete_products_with_pin_v2` RPC. PIN hashes are held only in
`k2_private.staff_delete_credentials`, never on the broadly readable profile
table; five failed attempts in ten minutes lock the PIN for fifteen minutes.
Each request requires a reason and UUID idempotency key, snapshots the product
into `product_deletions`, and refuses products with stock, listings, or
operational history. Such products must be retained and marked Discontinued.
The legacy PIN-verification oracle and legacy delete RPC are removed. The live
schema currently has zero configured Delete PINs, so an Admin must set one in
Staff & Roles before deleting an eligible unused product.
`docs/runbooks/STAFF_PRODUCT_DELETION_SOP.md` now records the operator procedure,
lockout recovery, eligible-product refusal, durable evidence, and the prepared
BFF cutover behavior. This is documented local readiness, not proof that staff
have configured a PIN or completed a deletion rehearsal.

The browser build contains the project's modern browser-safe publishable key as
a reviewed fallback because the Admin Vercel project did not expose that value
during the 14 August production build. This is public client configuration, not
a service-role or secret key, and it activates no prepared API route.

---

## 7. Other things built into the admin

- **Visual Workflow Guides Suite** — 5 responsive, self-contained SVG process
  diagrams (`FlightWorkflowDiagram`, `CustodyWorkflowDiagram`, `FefoWorkflowDiagram`,
  `FulfillmentWorkflowDiagram`, `PasabuyWorkflowDiagram`) and a master search modal
  (`WorkflowGuideModal`). Accessible globally via `🗺️ Workflow Map` in the admin
  header, shift guide shortcuts in `StartHereGuide.jsx`, and inline expandable
  toggles across Consignments, Batches, Fulfillment, and Pasabuy.
- **Connected workflow guide truth correction (30 August 2026)** — the master
  graph now exposes guide version `2026-08-30-draft.1` and status
  `DRAFT — NOT LOCKED`, identifies the operations rulebook as authority, and
  states that route tracing, checkmarks, and training examples are browser-only
  rehearsal. The former fake barcode simulator no longer auto-completes a step.
  Every jump now targets an actual Admin section. Copy that claimed automatic
  customer alerts, marketplace stock sync, Redis controls, automatic price
  approval, technical warehouse-zone locks, biometric transfer approval,
  camera evidence, fabricated courier waybills/SMS, fixed payment deadlines,
  and universal Pasabuy deposit/refund/discount rules was replaced with the
  current canonical or explicitly manual behavior. New-product guidance now
  names the two approved private Projects—K2 Product Content followed by K2
  Product Image Studio—and the Smart Paste field/image review boundary. Thirteen
  focused workflow contracts, all 383 source/API contracts, all 3 rendered
  Storefront selling journeys, all 24 rendered Admin journeys, the strengthened
  rendered workflow draft/rehearsal assertion, and the complete Admin production
  build pass. Chromium required the approved out-of-sandbox
  browser launch after the sandbox correctly returned `spawn EPERM`.
  This is verified local draft behavior only; it is not a locked staff guide,
  deployed-host evidence, representative phone/laptop acceptance, provider
  verification, or proof that an operational command occurred.
- **Structured staff procedure registry (30 August 2026)** — the searchable
  Operations guide now consumes `staffProcedureRegistry.js`, version
  `2026-08-30-draft.12`, and visibly remains `DRAFT — NOT LOCKED`. Its 18
  procedure contracts cover every MAP-023 minimum operation, including product
  create/edit/archive; manual and paid-API intake/fallback; allowed first-stock
  sources; receive/recount/reconcile/transfer/quarantine/clear/write-off/lot
  edit; publication; order/payment/packing/delivery exceptions; Pasabuy,
  wholesale, messages, staff security, channels, backup/incident/rollback, and
  unavailable integrations. Every contract now carries status, authorized role,
  prerequisites, exact entry point, steps, validations/blockers, expected
  canonical state, forbidden shortcuts, failure recovery, version/effective
  date, and sources. The paid-API route is searchable but explicitly unavailable
  pending OWNER-007's confirmation design, spend ceiling, provider/model,
  retention, server-secret boundary, and production activation; its manual K2
  Product Content → Smart Paste → K2 Product Image Studio fallback remains.
  A separate searchable SuperAdmin procedure now documents the versioned paid
  AI spend controls: per-product/per-session/monthly caps, model snapshot,
  typed enable confirmation, fixed safeguards, and recovery. The controls are
  prepared but unavailable until OWNER-007 and the protected migration are
  activated.
  The migration extends the current signed Admin verifier without dropping its
  existing action names, catalog limit, rate buckets, MFA replacement, website
  reply, or Product Knowledge paths.
  The focused guide/retrieval/graph/channel contract group passes 25/25, and
  the dedicated 375px rendered guide journey passes locally; the browser run required approved out-of-sandbox launch
  after `spawn EPERM`. This proves local guide rendering and coverage only—not
  guide approval, ordinary-staff read-only enforcement, production activation,
  provider behavior, or representative operational acceptance.
- **Outcome-first click-through guide target accepted (31 August 2026; not
  implemented)** — IDEA-20260831-02 is merged into MAP-023 and ADR-008. The
  accepted design keeps the Operations guide read-only: it will help staff find
  an outcome, name and focus each exact control, explain inputs/evidence,
  external handoffs, expected results, canonical completion evidence, and
  recovery, while the owning workflow remains the only operational record. The
  current local implementation does **not** yet have structured per-step control
  targets, outcome aliases, one-step walkthrough states, canonical completion
  read models, or a generic safe external-handoff renderer; its procedure steps
  are still strings and its jump opens only a broad Admin section. Therefore no
  click-through behavior, exact-control focus, automatic workflow verification,
  staff usability acceptance, deployment, or provider behavior is claimed.
- **Start-here guide** + floating 🧭 **Guide** button — the daily workflow,
  written so staff can self-onboard without being told.
- **Dashboard Guide (AI)** — honest, grounded Q&A about what each screen is for
  (no fabricated data).
- **Floating ⚙️ tools gear** — now mounted in the authenticated Admin shell
  after a browser test exposed that the existing file was orphaned. It is
  draggable and contains a bounded four-mode Sales planner, calculator, quick margin,
  cargo volumetric weight, units, VAT 12%, expiry checker, scratchpad, plus a
  pinned Milan/Manila clock and manual EUR→PHP planning rate. The Sales planner
  Check-a-price mode collects fixed fees and gross-sales channel-fee rate
  separately, calculates gross/net sales, goods/other-fixed/percentage-fee and
  total costs, planned gross profit, margin, and markup, and solves the true
  fee-aware break-even price upward to cents. Find-target-price mode solves a
  minimum unit price from cost, total discount, fixed/other costs, gross-sales
  percentage fee, and target gross margin, rounds upward to cents, and
  recomputes the achieved scenario. Find-max-discount mode starts from a chosen
  price, solves the maximum total discount that preserves the target margin,
  rounds the allowance downward to cents, and refuses a result when the target
  fails even without discount. Find-units-needed mode solves the minimum whole
  quantity for a positive planned-profit target and proves one fewer unit misses;
  non-positive contribution or more than 100,000 units fails closed. Every valid
  mode exposes one customer-free Copy planning summary handoff containing its
  timestamp, assumptions, result, and non-posting warning; clipboard denial has
  inline recovery and invalid calculations expose no copy action. Impossible targets fail closed. No mode creates
  a promotion, writes product price, or changes any financial/operational record.
  The panel is height-bounded and internally scrollable so every 44px tool
  control remains reachable at 375×812.
- **Sales computation summary** — Admin Overview now computes submitted-request,
  payment-verified, and fulfilled values separately from the same bounded
  canonical order projection for the selected period. Settled payouts and
  actual profit explicitly render `Unavailable` because K2 has neither a
  canonical settlement ledger nor exact-lot cost snapshots on order lines. Its
  read-only record drilldown now filters the bounded rows by all requests,
  exact payment verification, or exact fulfillment; recomputes the visible
  subtotal, sorts newest first, exposes no customer contact data, and limits the
  rendered review to the newest 25 with explicit truncation copy. Its Download
  CSV action exports every matching row in the selected period through a fixed
  six-column customer-free projection, with UTF-8 BOM/CRLF, formula
  neutralization, normalized channel, exact filter parity, and a dated
  period/filter filename. Deterministic calculation/target/discount/summary/filter/export/mount
  tests pass 14/14; the combined sales/guide contract gate passes 23/23, and
  focused desktop download and 375px drilldown/planner/copy-success/copy-denial
  journeys pass. The copy action is 44px, its explanatory line renders at no
  less than the 12px Admin minimum, and the phone surface has no document
  overflow. The
  final full Admin suite passes 26/26, and the Admin production build passes its
  security preflight, import, artifact-boundary, and built-secret gates. This is
  local verified behavior, not deployed accounting or settlement truth.
- **Payment × fulfillment reconciliation** — the selected-period order
  projection is also partitioned into verified+fulfilled, verified+not
  fulfilled, fulfilled+payment-not-verified, and neither. Each bucket shows
  request count/value, all four reproduce the full selected-period count/value,
  and every bucket opens its exact read-only ledger filter. The two operational
  exceptions preserve exact wording; absence of verified status is never called
  unpaid. Their CSV uses the same customer-free rows. Pure reconciliation and
  filter coverage plus focused desktop/375px journeys pass locally; final shared
  regression/build evidence is recorded in MAP-023.
- **Error monitoring** — Admin crashes emit fixed redacted classifications only
  through the protected Admin BFF when enabled; Storefront failures stay local.
  Browsers never write raw diagnostics directly to `error_reports`; stale-deploy
  chunk errors auto-reload.
- **Scanners** — Milan packing scan, mobile receive scan, discrepancy
  reconciliation, scan-to-AI (all real QR/barcode).
- **AI Sourcing** — dark, mobile, honest review queue reading real
  `product_drafts`. Empty "waiting for drafts from Italy" state; Approve writes
  only real product columns (upsert) and publishes; Reject discards. Backend AI
  feed writes drafts (not wired yet — same pattern as connectors).
- **Design consistency** — a shared `src/components/ui/adminKit.jsx` (one card,
  button, header, alert). All admin panels unified to one surface (`#161922`)
  and hairline borders; screens are mobile-first (44px targets, 16px inputs,
  stacked layouts). Data tables scroll horizontally on phones.
- **Storefront** — mobile-first globe section, real Italy→Manila flight
  animation, chameleon product backgrounds, unified light/dark theme.
- **Verification Evidence** — Full operational and boundary verification report
  is documented in `../MAP_017_AND_ADMIN_WORKFLOW_GUIDES_EVIDENCE_2026-08-15.md`.

---

## 8. Standing rules & decisions (keep these)

- **Honesty:** no fake "connected" states or fabricated data. If it isn't real,
  the UI says so.
- **Secrets:** never in the browser — only Supabase Edge Function secrets.
- **Admin is the source of truth**; storefront reads from it.
- **Luxury wood canvas:** light-mode storefront pages retain `public/wood-bg.jpg`
  behind translucent structural bands. Pure-white page backgrounds are prohibited;
  future redesigns adjust overlay strength instead of removing the texture.
- **FEFO** always — oldest expiry sells first.
- **Shelf-life gate (default enforcement live):** expiry-tracked stock needs at
  least **90 calendar days remaining** for ordinary sale by default.
  Category-specific rules may raise this minimum. Lots with **31–89 days** remaining
  require an explicitly approved, clearly disclosed clearance path; lots with **0–30
  days**, already expired lots, and expiry-tracked lots with an unknown date are not
  sellable and must stay out of available inventory. These are conservative K2 operating
  defaults, not a claim of regulatory sufficiency.
- **Stock is per-staff custody across multiple hubs** — not one warehouse.
- **SQL workflow:** dated additive migrations are rollback-validated and applied
  once through the Supabase migration system. `RUN_THIS_*` files are historical
  references and must not be used as the current upgrade path.

### Current flexible commercial rules

- **Channel direction:** marketplaces remain active acquisition and income channels,
  but K2's near-future objective is to move repeat customers toward direct website
  purchasing. The admin must operate both paths without treating marketplace rules as
  K2-wide rules.
- **Delivery charges:** Shopee, TikTok Shop, Lazada, and other connected channels use
  the delivery charge calculated by that channel. For direct and Pasabuy transactions,
  K2 now has an owner-approved controlled manual-pilot rule: staff may communicate one
  final K2 `STANDARD_FEE` without a fresh J&T inquiry only when a Warehouse A ordinary
  J&T EZ order is direct/Pasabuy, exactly one parcel at or below 3 kg, at or below
  PHP 2,000 merchandise subtotal, explicitly not oversize/remote/ODZ/special-
  protection, and matched to one unambiguous active exact-locality row. All unknown,
  conflicting, unlisted, or ineligible cases retain the existing manual courier-quote
  workflow. Once the customer accepts an eligible standard fee, K2 freezes that charge
  and absorbs ordinary provider-bill variance; later reconciliation may change only a
  future rate version. Numeric PHP 0 is valid only for confirmed K2 pickup, never for
  an unknown fee. Owner-authorized read-only research on
  1 September 2026 verified the Warehouse A J&T VIP hierarchy as
  `BULACAN / SAN-JOSE-DEL-MONTE-CITY / MUZON EAST` and recorded representative
  ordinary, pouch, J&T Super, and valuation-fee responses in
  `docs/JNT_VIP_SAFE_AUTOMATION_INVESTIGATION.md`. The locally prepared control file is
  `outputs/01a05d7c-4c45-7902-892f-ef2c1990cbde/K2_DELIVERY_LOGIC_CONTROL.xlsx`.
  Its eight exact rows and formulas passed local inspection, controlled behavior
  checks, formula-error scanning, and rendered-sheet review. This file is a staff
  quoting/reconciliation aid only: it has not been rehearsed by staff in Excel,
  imported, connected to checkout or the database, applied to a real order, deployed,
  or used to contact/book J&T. The four macro-area amounts remain explicitly
  nonquotable planning floors; the private VIP calculator remains evidence/reference,
  not a live dependency.
- **Customer exceptions:** cancellation, return, exchange, refund, and failed-delivery
  outcomes are handled case by case through direct communication with the customer.
  The system must record the request, conversation, evidence, proposed resolution,
  authorized decision, stock disposition, and final outcome. It must not automatically
  promise a standard result that K2 has not agreed to. The locally prepared order
  confirmation and guest conversation surfaces now make the current cancellation/
  return boundary explicit: there is no self-service path, the customer messages K2
  staff, and each request is reviewed case by case without a response-time promise.
  This is verified local copy and behavior, not production-host or customer acceptance.
- **Pasabuy pricing:** there is no standard percentage or automatic final-price rule.
  The owner decides the price for each request using factors such as season, scarcity,
  sourcing difficulty, actual item cost, delivery/logistics cost, and other documented
  circumstances. The system may calculate and display cost components, but the final
  quoted price remains a manual owner decision with a recorded reason. Estimated and
  actual costs must remain separate.

---

## 9. What's done vs what's next

### Storefront orientation, error recovery and customer policy — verified local state, 15 September 2026

Evidence: `docs/evidence/20260915-policy-and-recovery/README.md`, `docs/evidence/20260908-store-orientation/README.md`.
Skills used: `using-superpowers`, `andrej-karpathy`, `ui-ux-pro-max`, `impeccable`, `design-taste-frontend`, `emil-design-eng`.
Local artifact and Playwright contract evidence:

**Store orientation & first-screen hierarchy (IDEA-20260908-02 / I-009):**
The 3D interactive store at `/store` verified across desktop (1440×900), phone portrait (390×844), and phone landscape (844×390). Header height is bounded (<= 80px), intro height is bounded (<= 115px), empty basket dock is unobtrusive, 3D WebGL room renders without horizontal overflow, and room zoom is accessible. Unsent clerk question drafts are preserved across navigation. Verified with 2/2 passing tests in `npm run test:store-orientation` and 114 store contracts.

**Bounded chunk recovery & target-neutral error boundary (IDEA-20260908-01 / I-010):**
`src/components/ui/ErrorBoundary.jsx` renders target-neutral recovery UI with stable code `UI_SECTION_UNAVAILABLE` and `role="alert"`. Copy references the general shop/section ("This section stopped loading", "Try this section again", "Reload page") and never displays administrative commands ("Reload Admin") on shared storefront surfaces. Touch targets for retry/reload buttons meet the 44px minimum touch target (`min-h-11`). Verified with 5/5 passing tests in `tests/browser-error-safety.spec.js`.

**Customer-facing policy and recovery entry points (IDEA-20260908-01 / I-011):**
Authoritative customer-facing policies published in `src/data/policies.js` covering Privacy, Terms of Service, and Returns & Replacements. Reflects actual manual launch operations: 48-hour inspection upon receipt, photographic evidence requirement, case-by-case replacement/credit without false automated refund SLAs. Accessible, mobile-first view `src/views/Policy.jsx` is lazy-loaded to protect the landing bundle. SPA routes `/privacy`, `/terms`, `/returns`, `/policies` added to `src/lib/storefrontRoutes.js`, `src/StorefrontApp.jsx`, and `vercel.storefront.json`. Accessible 44px policy entry points added to `src/components/Footer.jsx`, `Checkout.jsx`, `Contact.jsx`, `Pasabuy.jsx`, and `Wholesale.jsx`. Verified with 4/4 passing tests in `tests/storefront-policy-contract.spec.js` and wired into `test:contracts`. Storefront landing JS gzip is 149.77 kB / 150.50 kB; CSS gzip is 27.77 kB / 30.00 kB. Admin chunk is 189.73 kB / 300.00 kB minified.

### Storefront, store and deployment session — verified 2 September 2026

Shipped to `origin/main` and deployed by both Vercel projects. Local artifact and
browser evidence unless a line says otherwise.

**Deployment — the reason nothing was going live.** `vercel.ts` resolved
`vercel.storefront.json` and `vercel.admin.json` with `readFileSync` against
`import.meta.url`. That works locally, where the JSON sits beside the module, and
fails once the provider bundles and relocates the config: the files are no longer
on the resolved path, so no deployment configuration is produced. Static JSON
imports now inline both reviewed artifacts into the output. A contract pins the
import form so the runtime-read path cannot return.

**Deployment — two production gaps closed.** Neither project had any redirects,
so `k2-jimzon.vercel.app` and `k2-jimzon-admin.vercel.app` served complete,
indexable second copies of the site beside the custom domains. Each now 308s to
its canonical host, matched on the exact production hostname rather than
`*.vercel.app`, because preview deployments live on that suffix and a wildcard
would bounce every preview into production. Separately, only `/assets/` carried a
cache rule, so the catch-all applied `no-store` to `/ambient/` and roughly a
megabyte of hero video was re-fetched on every page view; it now takes a day of
public caching with a week of stale-while-revalidate, deliberately not
`immutable`, because those filenames are not content-hashed.

**Storefront — hero video on Pasabuy and Wholesale.** Two owner-supplied clips
play in a band across the top of each page, about half the viewport and clamped
so they neither eat a laptop screen nor collapse on a phone. Audio stripped,
`faststart` set, poster shown before the first frame, and no video element
rendered at all under reduced motion so the file is never fetched. Browsers pause
media in a hidden tab and do not reliably restart it — measured, the element
stayed paused permanently — so a visibility listener resumes it. The Wholesale
hero also stopped hotlinking Unsplash.

**Store — lighting is now a state change, not a dimmer.** Lights low drops
ambient and key far enough that the pendants become the reason anything is
visible, tightens their reach from 20 to 13 so each throws a pool rather than a
wash, and closes fog from 52-110 to 26-74 so the far aisle falls into shadow.
Each bay gains a short-range warm light in that state only, because ambient that
low otherwise leaves goods in silhouette. The camera also carries about a
centimetre and a half of sway, which stops it reading as a tripod.

**Store — the shopkeeper is built to the character sheet.** The owner supplied a
sheet with turnarounds, nine expressions, ten poses and a hex palette. Her
colours are now the sheet's swatches rather than values picked by eye: the cap
was orange-red where the sheet is burgundy `#8B1E2D`, the shirt near-white where
the sheet is cream `#F5ECDD`, the denim slate where the sheet is navy `#2C3650`.
Two silhouette errors were corrected outright — her sneakers are white and were
near-black, and her jeans are wide-leg where an earlier pass had tapered them.
She gained hair past the shoulder blades, and the name tag the sheet pins to her
bib.

**Store — the review globe was empty for a recorded reason.** `globe_products`
holds seventeen enabled, readable rows, every one of which was being intersected
with `GLOBE_PRODUCT_IDS`, a hardcoded list of six. Two survived. The `enabled`
flag is the owner's own curation from the Admin Globe CMS and a constant in
source was overruling it for fifteen products. The flag now decides and ordering
comes from `display_order`, which is what the CMS writes. Reviews fall back to a
labelled sample set when the table is empty, in its own dynamically imported
module so ten review texts do not ship in the landing bundle.

**Admin — Sheet mode has a lens.** Search, status, shop and a multi-select
custodian filter with a live count and an empty state. It narrows what is shown,
never what is loaded, and every row keeps its index in `rows`: editing is
index-addressed, so a filtered position would have written the edit to whichever
product sat at that position in the full list. The shop and custodian
assignments are sample data from one clearly labelled, deletable fixture,
because inventory has no shop dimension yet.

**Admin — the delivery money path is covered.** `DeliveryRateControl` was 753
lines deciding what a customer is charged, with no test of any kind and its money
parsing private to the component. `manilaToday` and `pesoInputToMinor` are
extracted and covered. Extracting exposed a real defect: the old parser was raw
`Number.parseFloat`, which read `"95.15 or so"` as 95.15, `"1e5"` as 100000 and
`"85.123"` as 85.12 by silent truncation — each publishing an amount no staff
member confirmed. Input is validated before parsing, and a round-trip test pins
that re-opening a published rate and saving it unchanged cannot move the fee.

**Repository — two rotted contracts and a set of hygiene defects.** The MAP-017
dry-run test pinned an owner gate that had since closed; the delivery-totals test
read `Checkout.jsx` after the quoted-fee line moved to `DeliveryEstimate.jsx`.
Both now assert the property rather than the location. `deliveryQuote.js`
carried a raw NUL byte as a join separator, which made git treat a
money-affecting file as binary — no textual diffs, and no `eol=lf` normalisation
that `.gitattributes` says the security contracts depend on. `.gitignore` had
re-ignored `.env.example` after negating it and ignored two directories holding
tracked files. Prototype-chain lookups in `reservationPolicy`, `shelfLifeGate`
and `channelMeta` resolved inherited names such as `constructor` to Object
members; they now use the `Object.hasOwn` guard `safeUiError` already
established.

**Combined dev mode no longer lies about 404s.** `App.jsx` had no `not_found`
entry, so `VIEWS[key] ?? Home` served the landing page for any unknown URL while
`StorefrontApp` routed it correctly. Production was right and the workstation
quietly disagreed, which made a locally checked 404 meaningless.

*Verification for the session:* `npm test` exit 0 across every suite, prebuild
exit 0, both isolated production builds green with the storefront landing budget
at 149.62/150.00 kB JS gzip, `rehearse:map023-last-unit` unchanged and green, and
`rehearse:purchase-hold` 11/11 on isolated PostgreSQL 17.11.

### Storefront catalog control accessibility — verified local state, 30 August 2026

Catalog product-image controls now expose product-specific accessible names.
The product-title and footer action hit areas use the established 44px minimum
without changing the storefront's wood/editorial layout or interaction model.
The focused rendered 390×844 Chromium suite passed 2/2, and the fresh
Storefront production build passed its security preflight, artifact-boundary
verification, and secret scan. The complete refreshed contract gate also passed
383/383 API/security/source checks and 3/3 rendered selling journeys. This is
local artifact/browser evidence only;
automated full-surface accessibility/contrast analysis, real-device acceptance,
and deployed-host verification remain MAP-028 work.

### Shared Admin dialog accessibility — verified local state, 26 August 2026

All 18 files matching `src/views/admin/*Modal.jsx` now use the single headless
`src/components/ui/AdminDialog.jsx` primitive. It owns dialog semantics,
accessible naming connections, initial focus, a topmost-dialog focus trap,
Escape dismissal, mutation-busy Escape protection, and restoration of focus to
the invoking control. The former unused `ModalShell` was removed so it cannot
become a competing implementation. Existing Admin layout, color, typography,
density, responsive behavior, and motion remain unchanged.

This is verified local behavior, not deployment or real-staff acceptance. The
enumerating contract covers 18/18 modal files and the rendered Chromium Admin
journey proves initial focus, trapped Tab, Escape close, and trigger restoration.
Fresh evidence: `npm.cmd run test:contracts` passed 184/184; the targeted Admin
browser test passed 1/1; and `npm.cmd run build:admin` passed its complete
security preflight, production boundary check, and bundle secret scan.

### Storefront selling-surface coverage — verified local state, 29 August 2026

The rendered product-detail and guest-message paths now have behavioral
Chromium coverage in `tests/storefront-selling-surfaces.spec.js`. The product
journey proves a deep-linked database-shaped product renders its canonical SRP
and FEFO-derived available stock, calculates the multi-unit cart total, and
enforces the last-unit limit. The guest journey proves Turnstile-scoped
conversation creation and reply payloads, idempotency keys, the returned
conversation reference, the staff-receipt status, and the visible no-self-service
cancellation/return policy. A third mobile journey submits a complete order request,
reaches confirmation, verifies the same case-by-case staff-message path without an
SLA promise, and proves no document-level horizontal overflow at 375×812. The dedicated harness is
hermetic: its Supabase REST and guest BFF boundaries are intercepted locally and
external requests are blocked. `npm.cmd run test:selling-surfaces` passes 3/3.
The fresh combined contract gate passes 195 API/source contracts plus both
rendered journeys, and the isolated Storefront production build passes its
security preflight, artifact-boundary verifier, and secret scan. The existing
large main/Globe chunk warnings remain. This is local test evidence only; it
does not prove a live catalog, real customer message delivery, deployment
behavior, or production-host acceptance.

### MAP-023 cancellation correction — local SQL evidence, 5 September 2026

Historical upgrade follow-through: the real expiry migration initially failed
when a pre-policy released row existed. Its prepared cause constraint now uses
NOT VALID at first installation, so old unknown attribution survives while new
insert/update violations are refused. Existing installed constraints are left
intact. The composed rehearsal passes 13/13 including stock/unknown-history
preservation and both constraint-denial paths. This is local PostgreSQL evidence,
not provider inspection, historical reconciliation or permanent schema change.

`20260905_purchase_hold_cancellation.sql` is locally prepared to release active
purchase holds in Submitted and Confirmed states. It excludes historical
releases, attributes new releases, updates catalog stock and rolls back all
changes on a mismatched lot counter. The real baseline reproduced a cancelled
Submitted order retaining stock. The corrected purchase-hold rehearsal passes
12/12 checks, now using the actual expiry migration rather than a copied
trigger; cancellation assertions include history, replay and mismatch rollback.
The associated source/policy suites pass 30/30. Earlier confirmation checks
still assert retained active holds; they do not prove OWNER-002's deduction
rule. Full lifecycle, expiry races, provider historical attribution and
provider activation remain open in MAP-023 H-019–H-023. No provider state changed.
The Guest Commerce BFF runbook contains commands and recovery.

### MAP-018 publication correction — local SQL evidence, 5 September 2026

H-018's original publication function rejected Unlisted → Live with
`K2_PUBLICATION_NOT_READY / under_review_state` in isolated PostgreSQL 17.11.
`20260905_publication_transition_consistency.sql` corrects relisting while
retaining required evidence, and makes unchanged status side-effect-free after
authorization and row locks. It preserves existing RPC ACLs and refuses
installation without its predecessor. The local rehearsal passes relisting,
no-op timestamps/audit, missing human/image/price evidence, Draft/Discontinued
denial, MFA-on-replay, migration replay and restricted ACL preservation.
Product-intake/Admin BFF contracts pass 60/60. The fixture uses simplified
identity/schema helpers; signed-wrapper, concurrent, browser and provider
acceptance remain open in H-018. Commands and recovery are in the Product
Intake runbook. No provider changes occurred.

### MAP-027 cartoon clerk and shopping workflow — local preparation, 5 September 2026

IDEA-20260905-01 is implemented locally under the active MAP-027 owner exception.
The store now imports `AnimeClerk` with an original Blender-authored K2 cap,
articulated arms/elbows/head/legs/eyes/mouth, action-driven poses and a procedural
model-load fallback. The 1,137,508-byte GLB is route-lazy, with 12 joint markers,
11 meshes and 32 material primitives. Its revised studio render was inspected;
the in-store replacement has not yet passed browser visual acceptance.

Shared moments include listening, FAQ reading, chat handoff and basket refusal.
The guide starts tucked; typed questions retain their originating product/shelf.
Chat state survives sheet closure in route memory only, stops polling while
closed, resets its challenge token and exposes conflicting draft choices.
Basket refusal has inline feedback and only successful additions celebrate.
Review basket opens canonical checkout; no request is submitted on addition.
Framing now considers aspect and horizontal clerk bounds, and shelf navigation
resets zoom/pan. Reduced-motion and scene-failure shopping retain semantic UI.

Evidence: 121 MAP-027 pure/source/asset tests passed; `npm run build:storefront`
passed security/import checks, production boundary and budgets (landing JS
149.62/150 kB gzip, CSS 26.76/30 kB gzip). The large lazy Three.js advisory remains.
`tests/smoke.spec.js` has prepared updates, not a passing browser run. Automatic
approval review rejected the local browser reload/inspection due to the account
usage limit. Mobile framing, loaded-model poses/failure and chat reopen still
need real browser checks. No production deployment, provider/database changes,
message delivery or order submission was performed. MAP-027 contains exact
remaining acceptance and recovery; `assets/3d/README.md` describes regeneration.

Continuation on 5 September reran all 121 checks successfully and completed a
fresh Storefront build with the same passing budgets and boundary checks (67
emitted files passed the secret scan). The saved studio render was reinspected;
the cap lettering is readable in that render. Blender MCP is currently
unreachable: `get_scene_info` returned “Could not connect to Blender.” No new
model or application-code change, browser acceptance or deployment occurred.
The owning MAP-027 item retains restart, acceptance and recovery instructions.

The following August evidence describes the earlier procedural renderer and
must not be treated as acceptance of the September replacement.

### MAP-027 Interactive Shop rendering — verified local state, 28 August 2026

The optional `/store` route now has visible Chromium evidence rather than only
source contracts. At 1440×900 with reduced motion disabled, React Three Fiber
creates a live non-lost WebGL context, draws a non-blank aisle frame, moves from
Counter to Coffee through the direct Next control, and retains the semantic
product rail. Camera framing uses the bay midpoint so the complete category sign
stays inside the canvas; the browser crop regression moved from 546 dark pixels
touching the top edge to zero. A failed external mock photo attempts once and
then renders the generated product label instead of a black package.
An injected `webglcontextlost` event unmounts the canvas and reveals the flat
Coffee shelf guide; render exceptions use the same parent fallback.

At 375×812 with reduced motion enabled, no canvas is created. A flat shelf guide
shows the active canonical shelf name/blurb, the shelf navigation occupies a
full-width second header row, the product rail and Leave action remain visible,
and the document has no horizontal overflow. The full-frame light shell now
preserves `wood-bg.jpg` below translucent warm-paper chrome instead of replacing
K2's wood canvas with opaque white. The production Storefront shell does not
mount its ordinary header, cart drawer, footer, mobile spacer, or mobile
navigation behind this route, preventing those layers from painting through the
fallback. Local fixed-light tokens keep labels and placeholders at 5.78:1 or
better even when the site/operating system prefers dark mode.

Keyboard activation of `Enter the store` focuses the room heading; Leave or
Escape returns to Catalog and restores focus to that trigger. At 375×812 with
ordinary motion, the locally verified customer path moves from the WebGL Coffee
shelf through approved usage knowledge, canonical basket persistence and inline
`1 in basket` feedback to `/checkout`; draft knowledge remains excluded. At
812×375 with 125% root text, the reduced-motion path remains operable. The flat
shelf summary, 44px shelf-step controls, and non-shrinking product rail now
occupy separate bands; the compact guide does not cover the summary and the
empty visual basket yields the constrained landscape frame. At 375px, shelf
navigation owns its full row and the minimized guide does not intercept the
product rail. The dark-preference input placeholder and header meet the local
contrast gate, and the corrected `.k2-store-step` layer remains above WebGL.

The same rerun found the localhost-blocking failure: the Antigravity 2D avatar
used `headTilt` without defining it. A populated development catalog therefore
mounted `StoreKeeperAvatar`, threw a `ReferenceError`, and sent `/store` to the
`UI_SECTION_UNAVAILABLE` boundary; the empty production-catalog branch hid the
defect. `headTilt` now derives from the existing delighted/listening expression
state. The populated-catalog browser regression passes. At that rendered
checkpoint, the MAP-027 source contracts passed 84/84 and the isolated browser
group passed 8/8. The
complete Storefront prebuild/security/boundary/secret scan and production build
pass. Fresh local screenshots show a non-lost WebGL aisle plus phone,
dark-reduced-motion, and enlarged-text landscape states. The earlier 3/7 result
and its four polish defects are superseded by this evidence.

One derived store-moment controller now synchronizes the functional 2D pop-out
guide, a single aisle-level 3D clerk, scene accent, and canonical basket
acknowledgement. Welcome, explore, inspect, and added states drive the same
expression/gesture intent. The guide can be opened or tucked away and keeps the
existing bounded human handoff; it never simulates staff presence. It is now the
room's only chat entrance, preserving the active shelf/product context; the
duplicate direct `Ask K2` rail action has been removed. The clerk moves only
among authored positions, retains a stable 0.92 human-scale rig in Counter and
shelf views, and uses its 3D speech cloud only at the Counter because the
accessible guide owns shelf copy. Product positions now use a ten-unit inter-bay
gap, with the clerk at its 12.5-unit midpoint and at aisle depth `z=3.2`; camera
and clerk share travel rate `4`. Five shelf levels are always visible and the
packing model can grow to seven. Her sleeves now articulate into forearms, oval
palms, and thumbs instead of sphere hands. The wave ref is bound to scene `-X`,
her anatomical right while she faces the camera, so the arm raises outward rather
than crossing her torso. The desktop right rail is now an editorial
shelf concierge: Counter shows canonical departments, a shelf shows up to four
canonical product highlights and stock labels, and a selected item reuses the
existing product-detail actions. Ordering FAQ remains an integrated service
control rather than floating above dead space.

The IDEA-20260828-05 correction is locally prepared and source-verified: its five
new red-then-green regression contracts pass, the combined MAP-027 source suites
pass 91/91, import integrity passes, and localhost Vite returns HTTP 200 for all
six changed runtime modules/stylesheets. The complete Storefront prebuild gates
pass, but the final Vite bundle remains unverified because the managed Windows
sandbox cannot read the parent directory while resolving `vite.config.js`; a
fresh rendered Chromium review is also still required. The earlier screenshots
and 8/8 browser evidence establish the pre-correction store only, not this new
inter-bay geometry.

The persistent physical-looking basket dock receives StoreContext lines,
subtotal, and quantity and owns no commerce state. Confirmed additions render
parcel feedback, while checkout retains `Send order request` and preloads only
after the basket exists. CSS ambient light, restrained grain, and moment warmth
add depth without new external assets or heavy post-processing. Reduced motion
removes the new movement while preserving all semantic guide/cart controls.

The 2D and 3D shopkeeper avatar was completely overhauled into an authentic anime/cartoon human mascot:
- 2D SVG avatar features warm multi-tier chestnut/amber gradient irises, double eyelid fold, winged eyeliner, soft blush with diagonal micro-stripes, layered bangs with downward tapered tips, angel ring hair sheen, low ponytail with ribbon, uniform with gold K2 monogram cap, interactive pointer-tracking gaze, click greeting animation, and delight sparkle particle bursts.
- 3D WebGL avatar features high-contrast procedural canvas face textures, non-clipping 120° forward curved visor plate seated above brows, downward-tapered cone hair fringe, modular mouth viseme texture system (`128x128`), and natural breathing/blinking/waving physics.
- Ambient 3D lighting dynamically tunes pendant intensities, sunlight fill, floor bounce, and floating dust particle hues across both Light Mode ("Lights on") and Dark Mode ("Lights low").
- Cross-artifact runtime import in `StoreAssetStudio` was replaced with `useAdminStore` from `AdminStoreContext`, maintaining zero cross-artifact leakage between Admin BOS and Storefront.

Screenshots are local test artifacts, not physical-phone, real screen-reader, deployed-host, or real-product evidence. Production still has no published real catalog/photography, and the Admin knowledge/AI/provider work remains dependency-gated under MAP-027.

The same audit closed a local build-tool exposure: Vite no longer loads every
`.env.local` value into its resolved config. `VITE_CONFIG_ENV_KEYS` and
`BROWSER_ENV_KEYS` restrict config/debug and browser exposure to approved public
names; the security contract, 269-file environment-source audit, five-fixture
environment contract, prebuild secret scan, and isolated Storefront build pass.
This changes local source/build behavior only. Any credential that was already
printed by an earlier debug run still requires owner-authorized rotation; no
provider credential or deployment was changed here.

### Storefront path routing — verified local and artifact-contract state, 1 September 2026

Storefront view state is synchronized to real paths for home, catalog, product,
Pasabuy, trade/wholesale, contact, account, messages, checkout, and confirmation.
The History API records navigation and a cleaned-up `popstate` listener restores
Back/Forward state. Rendered Chromium evidence passes 3/3 for cold catalog,
cold product plus refresh persistence, and browser Back. The Storefront Vercel
contract keeps its API rewrite first and serves only the shared registered paths
through `index.html`; Vercel checks generated product HTML in the filesystem
before the `/product/:sku` client fallback. Admin serves only its protected entry
path. A global SPA catch-all is forbidden in either target, so other unmatched
host paths can retain a real not-found response.
Each isolated build emits a target-specific, script-free, noindex `404.html`, and
the boundary verifier rejects missing recovery structure, script content, or
cross-target identity. Focused routing/discovery contracts pass 36/36 and both
isolated production builds and boundary scans pass. This proves local source and
artifact behavior only; DNS, Vercel alias visibility, preview/live HTTP status,
and real-host deep links remain MAP-024/MAP-025 acceptance work.

### Storefront discovery metadata — prepared local state, verified 29 August 2026

The Storefront artifact now contains a crawler policy, K2 monogram and maskable
icons, deterministic 192×192/512×512 PNG app icons, a 180×180 Apple touch icon,
target-specific manifest icon declarations, a reviewed 1200×630 PNG social card,
generic Open Graph/Twitter identity tags,
and a runtime metadata controller. Product routes publish Product/Offer JSON-LD
using canonical SKU/name/image, PHP SRP, current path, and FEFO-derived available
stock; zero or unknown stock is `OutOfStock`. Rendered Chromium and two source/
artifact contracts pass, as does the isolated Storefront build and boundary
scan. A fresh 29 August build reverified the exact raster dimensions, emitted
Storefront manifest identity and `/` start URL, copied the social card, and
passed the focused discovery/config suite 26/26 plus build-boundary and artifact
secret checks. This is not complete public discovery evidence: the owner-approved
canonical host is now `https://www.k2jimzon.com` and the DNS/Vercel cutover is
recorded separately, but the current reviewed production projection still emits
no product URLs because it has zero published products, and there is no real
shared-link or installed-device preview. Runtime
canonical/share URLs derive the current origin and must not be described as
crawler-side or deployed proof.

### Public Contact claims — verified local state, 26 August 2026

The Contact page publishes email, Messenger, Shopee, and Manila location only.
It explicitly says the business number is not published yet and makes no reply
SLA: messages are reviewed during Manila business hours, but no response time is
promised. The focused desktop/mobile Chromium journey passes and proves no phone
number, live-staff claim, numeric response promise, or `respond promptly` copy is
rendered. This does not mean those channels are monitored in production or that
a customer message was delivered.

### Admin connected workflow graph — verified local state, 26 August 2026

The Master Operations Workflow Graph is one connected, model-driven Admin
surface: 41 nodes and 49 typed edges across supply, catalog, custody, orders,
counts, and Pasabuy. Sequence, decision branch, convergence, enabling, and
recovery-loop edges render distinctly on a bounded pan/zoom canvas generated
from `workflowGraph.js`; the UI no longer connects adjacent DOM nodes. Selecting
a node exposes clickable upstream/downstream context and its repository/screen
grounding while retaining the workflow text, checklist, rules, simulation, and
troubleshooting authored in `workflowData.js`. A finite path tracer can walk any
forward route to each of the three terminal outcomes while recovery loopbacks
remain visible on the map. Model contracts pass 2/2, the focused desktop/mobile
Chromium acceptance passes 1/1 with no 375px document overflow, and the isolated
Admin production build passes its security and artifact checks. The map is an
operational guide, not an authorization grant or evidence that any provider or
production workflow ran.

**Done and live:** base batch/expiry/location/holder/channel records, inventory
breakdowns, expiry alerts, honest channel status, error monitoring, admin
guides/tools, storefront presentation, persistent order/Pasabuy intake, coupons,
consignment scan events, separate admin/storefront production builds, and the
2026-08-10 operations/security hardening package:

- exact eligible-lot FEFO reservation and one-scan-per-unit packing;
- non-destructive lot reconciliation and exact partial custody transfer;
- repeated SKU across flight boxes/lots and manifest history selection;
- server-backed storefront coupons with confirmation-time redemption;
- actual courier quote/customer-confirmation/waybill fields;
- durable connector event inbox and the Shopee Events-only intake state;
- repair of `orders.sku` from archived `products_old` to current `products`.
- anonymous access limited to reviewed customer submission/coupon RPCs;
- deprecated direct-stock, whole-line packing, and ambiguous scan RPCs locked.

**Single unfinished-work queue:** `../MASTER_ACTION_PLAN.md` is the only active
backlog. It contains the audited work still required for catalog loading,
operational completion, connector readiness, analytics, and launch proof.

New proposals are captured temporarily in `FUTURE_IDEAS.md`. After audit, an
accepted proposal moves into the Master Action Plan and is removed from the idea
inbox. After implementation and verification, its final behavior is recorded in
this System Brain and the appropriate rulebook/runbook files, and the completed
MAP item is deleted. The target is an empty Master Action Plan.

Supabase source-of-truth work, separate Vercel production configuration, and
custom-domain activation are now audited active work in MAP-000 and MAP-013.
Unavailable payment gateways, paid-plan features, OAuth credentials, and real
marketplace adapters remain current limitations until their dependencies become
available and the work passes a fresh audit.

### Admin assistance layer (local implementation, 10 August 2026)

### Launch integrity correction (11 August 2026)

The previous claim that MAP-000 through MAP-015 were completed and verified was
rejected by a repository audit. Much of the claimed evidence is local and
uncommitted, and several checks prove only that files or strings exist. The new
product intake currently has compile-breaking imports, placeholder uploads,
unsafe random/mock success fallbacks, direct lot writes, and non-enforced review
gates. New SQL and provider configuration are not proven against the live
schema. A Supabase service-role credential was exposed in a local seed script
and must be treated as compromised. The value has been removed locally, the
unsafe seed has been disabled, and repository, Git-history, and existing-build
secret scans pass. On 14 August 2026, a modern secret key passed a bounded provider
read and legacy API-key use was disabled; the old key now returns 401 as an
`apikey`. The old service-role JWT still grants elevated Bearer access when paired
with the public key. On 15 August the real replacement handler passed local
behavior tests covering AAL2, strict origins/schema, provider failures, existing-
user recovery, target resolution, role persistence, durable replay/conflict,
concurrency, rate limiting, and retry recovery. A prepared database migration
was then applied and the hardened modern-key function was deployed as active
version 5. Exact-origin preflight and unauthenticated/foreign-origin denials passed
live, and rollback-only SQL proved claim/replay/conflict/stale recovery without
retaining fixtures. A real Admin AAL2 success path remains unproven.
The original 24-hour provider query contained only 12 database/pooler events and
did not prove API/Auth/Edge activity safe. A fresh authenticated audit on 21 August
reviewed current API, Auth, Edge Function, PostgreSQL, Storage, and Realtime samples.
It found no Auth error and no observed Edge execution, but did find six permission
denials for `v_product_stock_from_batches` and two failed `supabase_admin` password
attempts. At that audit point zero invitation receipts existed and the provider
containment checks were still open. They were closed on 22 August: the real Admin
AAL2 invitation passed, the legacy HS256 signing key was revoked, the exposed token
was rejected with HTTP 401, and both Vercel targets passed the name-only environment
contract. A secure Vercel connector reconfirmed the real K2 team,
separate READY storefront/Admin production deployments, truthful build-target
markers, and no returned 24-hour runtime-error cluster. The public JWKS confirms
ES256 signing is active.

Local recurrence prevention was expanded on 21 August 2026. The scanner now
detects five additional credential classes used by likely K2 providers: AWS,
Google/Gemini, Slack, SendGrid, and Stripe. GitHub CI fetches complete history
and runs fabricated scanner regressions, the value-free deployment-environment
contract, the current working-tree scan, and the complete history scan before
building. Both Storefront and Admin prebuild lifecycles run the local regression,
environment, repository, and import gates. The combined security gate, both
isolated builds, artifact-boundary verifiers, and bundle scans pass. These are
completed local controls; they do not prove the deferred invitation, Vercel
variable inventory, or Supabase signing-key revocation.

A second ten-control MAP-016 batch on 21 August added detection for Google OAuth
client secrets and refresh tokens, npm, GitLab, Shopify, Twilio, Mailgun, and
Meta/WhatsApp credential formats. A new tracked-sensitive-file policy rejects
non-example environment files, provider/package credential files, private key
and certificate files, and database exports; it is enforced by both prebuilds
and CI. Thirteen blocked and four allowed filename fixtures pass, 756 tracked
paths pass, the expanded 763-file and full-history scans pass, and both isolated
production builds still pass their artifact-boundary and bundle-secret checks.
This remains local recurrence prevention, not provider completion evidence.

A third local MAP-016 batch now checks actual environment expressions across
117 browser files and 69 server/API/Edge files. It allowlists browser-readable
names and rejects secret-shaped or unknown names, dynamic browser access,
`process.env` in browser source, and `import.meta.env` in server source. Eight
clean/denial fixtures pass. The verifier runs in CI and both prebuilds, while
`npm run verify:map016-local` reproduces the full security gate and both isolated
production builds. The complete command passes; this is local proof only.

Local and Vercel Admin browser configuration now prefer the modern Supabase
publishable key from either the build environment or local environment files
over the disabled legacy anon JWT. A direct read-only Auth settings request
with that publishable key returned HTTP 200 on 14 August 2026, and the local
Admin sign-in form renders at `127.0.0.1:5174`. This removes the legacy-key
transport lockout without bypassing invite-only staff roles, password checks, or
MFA. It is local verification, not proof that any specific staff credential can
sign in or that the inactive Admin BFF has been deployed.

A connected read-only provider audit on 11 August verified that all 42 live
public tables have RLS, but this is not sufficient protection by itself. Two
tables have no policy, six carry anon DML grants, two operational views are
anon-selectable, and blanket write policies exist on brands, categories,
warehouses, and the legacy `products_old` table. `product_drafts` permits every
authenticated user to manage every draft. Four guest submission/validation RPCs
and 32 authenticated `SECURITY DEFINER` functions remain externally callable;
their intended grants, internal guards, ownership checks, AAL2, validation, and
negative tests require MAP-017/MAP-020. The 11 August audit saw three recorded
migrations; a fresh 21 August ledger check sees five, adding the two 15 August
Delete-PIN hardening entries. The remote ledger still does not reconcile the full
dated local migration set. No corrective DDL was applied during either read-only
audit.

The prepared MAP-017 phase-1 hardening migration subsequently passed its full
postflight in a live rollback-only transaction on 12 August. A separate query
proved the vulnerable policies, grants, Storage null limits, and legacy Realtime
membership were restored by rollback. This is strong compatibility/reversibility
evidence but is not deployment; the public write and upload vulnerabilities
remain live pending permanent application after credential disablement.

MAP-017 now has a live metadata exporter plus an executable loopback-only local
migration and authorization rehearsal. The runner requires an exact
`k2_map017_rehearsal*` database, builds a vulnerable fixture, proves preflight,
transaction rollback/restoration, apply, anonymous/customer/staff behavior,
Storage and Realtime boundaries, minimal public stock without lot access or
Draft disclosure, and idempotent replay. The separate captured-baseline inverse
generator still fails closed because a faithful general recovery generator is
not implemented; the exact phase-1 transaction is nevertheless proven
reversible locally and against production in rollback-only mode.

The phase-one behavioral SQL now exposes 12 unique machine-counted assertion
groups instead of relying on a hard-coded runner total. The isolated lifecycle
passes anonymous/customer/unsupported-role denials, current Staff/Admin
allowances, legacy-table denial, operational-view RLS, minimal public stock,
Storage denial and bucket limits, Realtime exclusion, and safe future-object
defaults. The assertions execute inside a rollback transaction; a direct check
found no retained fixture rows or future-object probe. This is local database
evidence. Cross-user, guest-grant, cross-hub, guessed-ID, and specialized-role
behavior remain unproven until their canonical schemas and role contracts exist.

On 21 August the schema-truth comparison was extended to consume function
definer/search-path/execute evidence, view grants, Storage object policies, and
required migration-ledger entries. The export contract now requires the full
structural inventory (including columns, constraints, indexes, sequences,
triggers, materialized views, and migrations), and the metadata SQL emits
function grants plus Storage policies. Thirteen focused tests and the MAP-017
artifact verifier pass. This established the initial tooling baseline. On 22
August the repository's portable PostgreSQL 17.11 runtime supplied `psql`, the
local runner executed the behavioral suite, and the corrected migration passed
another live rollback-only rehearsal. The remote ledger still needs exact
object-by-object reconciliation and no production DDL was applied.

The live guest RPC audit also found that order v2 returns the complete internal
order row rather than a minimal receipt, legacy order v1 remains callable and
hardcodes a PHP 85 shipping amount, Pasabuy submission has no idempotency, and
coupon preview exposes internal coupon configuration. The storefront currently
surfaces raw database error messages. These are transitional direct-RPC paths,
not the approved hybrid guest/account boundary. The accepted BFF, receipt,
guest-grant, claiming, and messaging contract is recorded in
`../GUEST_COMMERCE_SECURITY_CONTRACT.md`. Its core submission and guest-message
boundary is prepared behind an inactive feature flag; it is not deployed or
production-proven yet.

No local file, seed transcript, verification-script pass, or Vercel config file
is evidence that its migration, data, provider setting, domain, deployment, or
workflow is live. `MASTER_ACTION_PLAN_DOCUMENTATION.md` is an unverified draft
artifact, not an authoritative completion log. The active launch queue is
restored in `../MASTER_ACTION_PLAN.md` as MAP-016 through MAP-025.

The approved target is now a hybrid customer model: guest order requests remain
available without an account, while optional accounts support saved history and
identity continuity for universal messaging. This is a target, not current live
proof. Admin BOS is approved to move behind a same-origin BFF with HttpOnly
cookie sessions, CSRF protection, server authorization, and enforced MFA for
sensitive staff actions. Domain activation follows the security, operational,
and production-build gates and still requires the exact owner domain/DNS answer.

### Product-intake repair in progress (12 August 2026)

The local admin artifact compiles after repairing the duplicated modal source
and missing icon/prompt imports. The product-intake browser service now fails
closed: it cannot invent an offline SKU, directly insert a Product or lot, or
report publication success after a failed server call. The visible workflow now
uses real camera/file selection, explicit ChatGPT field acceptance, and gated
forward navigation while preserving the existing Admin BOS design. This is not
live workflow proof. A read-only production-schema comparison confirmed that
`product_intake_sessions` is absent and the unapplied draft migration uses
several nonexistent columns and incompatible status values. The corrected
migration, protected evidence uploads, inventory-source handoffs, server
readiness command, authorization/negative tests, and permanent deployment remain
under MAP-018 after the MAP-016/MAP-017 security gate.

The replacement MAP-018 migration now passes its live read-only preflight and
full postflight inside a rollback-only production transaction. A separate query
proved the table, functions, private bucket, lot metadata columns, and status
change were all absent afterward. Locally, evidence uploads target a private
staff/session path; exact matches open the existing lot workflow; possible
duplicates require a recorded physical-variant reason; Draft and first-source
commands are idempotent and AAL2-guarded; Italy intake creates only a manifest
line; and opening balances require admin authority plus owner, unit cost,
location, custodian, batch, box, count, and reason. Supplier receipt remains
truthfully disabled because no canonical receipt record exists. None of these
new server objects is live yet.

On 21 August the prepared Admin BFF evidence path gained immediate compensating
cleanup when a private upload succeeds but signed registration fails. On 24
August that path gained durable reconciliation for the second failure: if Storage
cannot confirm immediate deletion, a forced-RLS private ledger records the owner,
session, exact path, SHA-256, bounded attempts, and completion state. The browser
receives only an opaque cleanup ID. A signed staff+AAL2 retry route claims only
the owner's record, revalidates path/hash, removes the object, and marks complete
only after provider success. The phone modal shows one persistent 44px retry
panel, blocks new selection and forward progress, and never renders the path.
An isolated PostgreSQL 17.11 lifecycle/replay rehearsal, 44 focused contracts,
the zero-gap 63-route security inventory, isolated Admin build, and the existing
reduced-motion 375×812 rendered intake journey pass. This remains local and
inactive: deployed-role denial, real provider failure/recovery, MAP-022 alert
delivery, migration activation, and authenticated live uploads remain required.

Storefront catalogue freshness now treats Realtime as a fast path rather than a
single point of freshness. While visible, the storefront refreshes at most once
per 60-second interval and refreshes immediately after returning to the tab.
Concurrent triggers cannot overlap. Product rows and the authoritative
batch-stock view publish as one coherent snapshot only when both reads succeed;
a partial failure preserves the last known-good catalogue. Two focused contracts
and all 102 contracts pass, as do both isolated builds and boundary/secret
scans. The restricted build runner could not resolve Vite's workspace config;
the identical approved workspace builds passed. Deployment and real-host
staleness/Realtime evidence remain open under MAP-018/MAP-025.

The consolidated Admin router now truthfully supports both methods implemented
by the product-intake session handler: GET resumes a session and POST creates a
replay-safe session through the existing CSRF/idempotency/database-rate
boundary. Previously the router rejected POST with `405` before the handler.
Unsupported methods now return `Allow: GET, POST`; the route-control audit has
zero gaps, all 24 Admin BFF contracts and all 102 contracts pass, and sequential
Storefront/Admin builds pass. A parallel verification attempt was invalidated
when the targets raced on their shared `dist` path; the clean sequential Admin
rerun passed. The route remains prepared and inactive.

The unused shared Edge response template that allowed wildcard CORS, five broad
methods, and arbitrary error details has been removed. The prebuild
security-surface audit now fails if literal wildcard CORS appears anywhere in
production browser/server/prepared API/Edge source; the current count is zero.
A focused regression and all 102 contracts pass. The deletion exposed and fixed
a working-tree scanner edge case: Git-cached paths that no longer exist are
skipped, while unreadable existing files still fail. Fabricated secret-scanner
regressions, the 783-file current-tree scan, and both sequential builds pass.
This is repository prevention, not deployed CORS or real-host denial evidence.

### Admin BFF foundation (local, inactive, 12 August 2026)

The repository now contains a fail-closed same-origin Admin BFF authentication
foundation. It uses the limited Supabase anon key server-side, exact admin-origin
checks, bounded JSON, mandatory live role and AAL2 checks, AES-256-GCM encrypted
HttpOnly cookies, ten-minute MFA pending state, 30-minute inactivity, eight-hour
maximum lifetime, CSRF binding, logout, and safe error codes. Production admin
routes return `404` unless `K2_DEPLOYMENT_TARGET=admin`. The local security
contract passes. This is not the active authentication path: Admin BOS still
uses the Supabase browser session because its operational data calls have not
yet moved to named BFF routes. Login and pending-session MFA now consume a
prepared signed private distributed budget before password Auth or provider
session restoration. Login is capped at 20/IP/15 minutes, 10/contact/hour, and
300/global/minute. MFA is capped at 10/IP/15 minutes, 5/pending session/15
minutes, and 300/global/minute. Domain-separated HMAC-only subjects hide raw IP,
email, and pending-session IDs; process-local brakes remain as a first layer.
Exact status, environment requirements, and migration order
are in `../ADMIN_BFF_SECURITY_RUNBOOK.md` under MAP-019/MAP-020.

The prepared hybrid identity migration also passed exact live preflight,
postflight, and rollback-restoration checks. It replaces the target's direct
Auth-user conversation ownership with separate canonical customers, verified
contacts, optional accounts, deliberate channel identities, hashed scoped guest
grants, one-time claims, and customer-linked orders/conversations. Validation
triggers reject cross-customer account, claim, and grant scopes. No new identity
table or ownership behavior is deployed; evidence is in
`../MAP_019_ROLLBACK_VALIDATION_2026-08-12.md`.

The approved hybrid decision is explicit: a customer does not need an account
to submit an order, Pasabuy request, or website message. Accounts remain optional
for verified history, cross-device continuity, and universal messaging. A local,
inactive Storefront BFF foundation now accepts exact bounded schemas, checks
exact origins and production target, maps failures to stable public codes, and
uses only the limited Supabase key. Its companion database boundary adds
HMAC-signed five-minute requests, nonce replay protection, durable per-IP and
per-contact limits, payload-bound idempotency, canonical customer/contact
creation, scoped order/conversation grants, and minimal receipts. The browser
never receives the signing secret or raw guest token; the BFF writes the latter
to an HttpOnly cookie.

The exact identity, boundary, cutover, coupon/replay, real order, real Pasabuy,
and customer-continuity sequence passed in a production rollback-only
transaction, followed by a separate restoration check. Local contracts and both
separate production builds pass. This is not live: the feature flag remains off,
the accessible Turnstile component still needs real site/secret configuration
and preview-host testing, migrations are unapplied, legacy direct RPCs are still
callable, and account verification/claim routes remain unfinished. A guest
message interface is now prepared behind the disabled Storefront BFF flag. It
uses the scoped HttpOnly grant through same-origin list/reply routes, has
phone-sized controls and complete loading/empty/expired/error states, and does
not require an account; it is not active or real-host tested. Prepared server
routes already prove scoped list/reply behavior and cross-guest denial in
rollback-only production testing.
The local Pasabuy receipt now links directly to this inbox when the flag is
active, and the inbox refreshes every 15 seconds while visible without erasing
the current conversation after a background-refresh failure. A 375px scripted
UI check passed against mocked same-origin BFF responses. The production flag,
migrations, and host remain inactive, so this is not a claim of live customer
messaging.
The local guest inbox can now create the first Website conversation directly,
without an order or Pasabuy request. The prepared endpoint validates an exact
name/contact/message schema, verifies Turnstile, signs `guest_start`, applies
durable IP/contact limits and payload-bound idempotency, writes the canonical
customer/conversation/inbound message, and issues only a scoped HttpOnly grant.
A mocked same-origin 375px start-to-chat flow and four endpoint-denial contracts
pass. This extension has not received a fresh provider rollback rehearsal and
remains inactive with the rest of the guest boundary.
The storefront now keeps Contact us visible as its fifth top-level destination
regardless of that flag. With the flag off it creates a prefilled email draft
and states that the customer must send it; with the flag on it uses the prepared
canonical Website-conversation form. The page shows only confirmed K2 public
details (email, Messenger and Shopee handles, Manila location). No staff-online
state exists, and phone/Viber/WhatsApp remain unpublished pending OWNER-004.
Activation order is in `../GUEST_COMMERCE_BFF_RUNBOOK.md`.

The implementation sequence is also explicit: complete and prove the security,
ownership, session, abuse, and operational boundaries first; activate custom
storefront and Admin domains only after those launch gates pass. Domain setup
does not weaken or replace the guest/account security model.

The Admin BFF now has two inactive read-only vertical slices. Its fixed
`/api/admin/overview` route rechecks the encrypted cookie session, live
staff role, and AAL2; returns only eight allowlisted command-center projections;
labels partial query failures without provider details; and refreshes inactivity
without exposing Auth tokens. `Overview.jsx` can use it through
`VITE_ADMIN_BFF_ENABLED`, but that flag remains false because the rest of the
Admin BOS still calls Supabase from browser JavaScript. The fixed
`/api/admin/products` route adds the minimal SKU/barcode/price/image and
batch-derived-stock projection used by scan and fulfillment context, with an
explicit stock-unavailable state. Eighteen local contracts and both isolated
production boundary builds pass. This is prepared code, not a live
cookie-protected admin claim; the exact remaining browser-operation inventory is
in `../ADMIN_BFF_SECURITY_RUNBOOK.md`.

The fulfillment vertical slice is also prepared but inactive. A fixed read route
returns only the submitted confirmation queue, confirmed packing queue, active
lots, and staff display identities. Seven named server commands preserve the
existing operational rules for reserve, scan, payment evidence, delivery quote
or marketplace charge, courier handover, exact-lot transfer, and box custody.
Each command requires the cookie session, current staff role, AAL2, CSRF, exact
origin, a bounded exact schema, a unique operation key, and a server-only HMAC.
Its database wrapper adds nonce replay denial, durable payload-bound receipts,
per-actor/action limits, and minimal return values. The migration compiled in a
production rollback-only transaction and left no objects afterward. Admin and
storefront builds remain isolated. This does not authorize activation: the
server/private secret pair, permanent migrations, capability-level finance
permission, direct-browser cutover, and deployed denial tests remain pending.

The Admin universal-inbox slice is likewise prepared behind the same disabled
flag. Fixed routes return bounded conversation/message/staff projections and a
20-event history; named commands save an internal note, mark read state, or
update workflow. They use current staff/AAL2, exact origin, CSRF, server HMAC,
nonce replay denial, durable payload-bound operation receipts, rate limits, and
safe errors. The runtime polls the BFF when enabled and otherwise preserves the
current direct path. Crucially, an Admin note remains `internal_only`; no Shopee,
TikTok, Lazada, website, or other external delivery is claimed. Guest/account
continuity depends on the still-unapplied hybrid identity/guest migrations, and
marketplace sending still depends on real approved adapters. The combined SQL
compiled and rolled back on production, 22 contracts and both builds pass, and
no new live object exists.

The Admin Pasabuy slice is now prepared behind the same disabled flag. Its read
route returns an explicit bounded request/quote projection rather than `*` rows;
its two named commands require the current staff/AAL2 cookie session, exact
origin, CSRF, server HMAC, nonce replay denial, durable payload-bound operation
receipts, and per-actor/action limits. Quote inputs are bounded again inside the
database, final price cannot be below computed landed cost, and every version
requires an owner pricing rationale preserved as a Pasabuy event. The suggested
margin remains advisory, while saved/sent/accepted/paid remain separate truths.
The secure screen also requires a real transition reason. The current live
transition matrix is intentionally preserved until the richer rulebook target
has its own migration and acceptance proof. The combined foundation and
Pasabuy SQL compiled against production and rolled back; staged objects were
confirmed absent, 24 contracts and both isolated builds pass, and the secret
scan covers 661 files. No Admin BFF flag, migration, or domain was activated.

The phone-first Product Intake slice is also prepared behind the disabled Admin
BFF flag. Fixed server routes now cover duplicate search, active-session resume
and create, ordered checklist steps, open Italy flights, reviewed Draft creation,
first inventory, publication, and private packaging evidence. The database
wrapper adds signed replay-safe receipts and repeats bounds/ownership/state
checks; publication requires a reason. Packaging evidence is decoded and
re-encoded server-side with Sharp, restricted to JPEG/PNG/WebP, 4 MB, one page,
100–12,000px per side, and 40 megapixels, then registered with dimensions and
SHA-256 in the owner/session private path. It does not trust extension or browser
MIME and strips metadata. The existing phone UI now labels checking versus
verified upload, collapses dense three-column controls on small screens, and no
longer claims Product Master `Live` also publishes marketplace channels. The
MAP-018 foundation compiled independently against production; the wrapper
compiled in a rollback harness with matching dependency signatures; cleanup
checks show no live intake objects. Twenty-seven contracts, both build-isolation
checks, the 672-file secret scan, and a zero-finding production dependency audit
pass. This is not active: both migrations remain unapplied, the Admin BFF flag
is false, supplier receipt is unavailable, deployed canonical-identity and
denial tests remain, and no domain was changed.

On 22 August the real Product Intake component also passed a 375×812 Chromium
acceptance check and the complete five-test Admin UI suite. Phone inventory fields
now stack in one column; the modal has labelled dialog, alert, status, focus, and
Escape behavior; offline state pauses commands and recovers after reconnection;
camera/clipboard fallbacks are explicit; preview object URLs are released; and a
first-inventory command cannot be submitted concurrently. Flight input is
truthfully labelled as expected manifest quantity, not received stock, and final
copy only claims a first source when the authoritative session contains an
`inventory_result`. Supplier receipt remains visibly Pending for MAP-023 rather
than being simulated. The 375px flow also proves the visible camera/file fallback
and an inline, state-preserving failure when a fabricated Storage upload returns
503. The 127-contract suite, MAP-018 static verifier, security
gate, and isolated Admin production build pass. This remains local Tier 1
evidence: migrations and the Admin BFF flag are unapplied, and authenticated
deployed-role, real device permission, real provider failure, and production
activation evidence are still open.

On 26 August the local interruption/resume path received a rendered regression
instead of relying only on helper inspection. Its stateful Supabase fixture now
preserves one active server session across create, Step-2 save, close, and
reopen; the real modal restores the saved checklist step and announces
`Intake resumed` at 375×812 with reduced motion. The resume mapping retains only
server-recorded evidence, reviewed field decisions, Draft identity, and
inventory result. Seven focused source contracts, all 16 Admin UI journeys, the
MAP-018 verifier, and the isolated Admin production build pass. This does not
prove authenticated deployed app switching, mobile process eviction, migration
activation, or production recovery.

Also on 26 August, the prepared opening-balance path stopped accepting typed
hub and custodian values. The real phone modal now selects from the existing
MAP-004 identity registry and filters custodians by their assigned hub. The
Admin BFF rejects unknown IDs and cross-hub custody; the foundation RPC and
signed wrapper independently verify the same records and relationship in
`public.hubs` and `public.custodians`. A reduced-motion 375×812 Chromium journey
shows Milan Cargo Depot with its assigned Marco Rossi custodian and no
horizontal overflow. Sixty focused intake/BFF contracts, all 16 Admin UI
journeys, the MAP-018 verifier, security gate, and isolated 21-module Admin
build pass. This remains local prepared behavior: migrations, feature flag,
deployed-role denials, and production identity truth are not activated or
verified.

The Flight Consignments slice is also prepared behind the disabled Admin BFF
flag. Its fixed read projection returns bounded manifests, lines, and recent
scan events; named commands cover manifest creation, line addition, one-unit
Milan/Manila scans, state advancement, and atomic receipt finalization. The scan
boundary carries the actual scanned code and selected line, then verifies the
code against that line's SKU or product barcode in the database before adding
one unit. The client retains one operation key across a failed-response retry
and generates a new key for the next physical unit. State changes require a
specific reason, and reconciliation variance requires a note. Live table/RPC
shapes and grants were inspected read-only; the foundation and wrapper compiled
inside rollback-only production transactions, staged objects remained absent,
and direct authenticated legacy RPC execution remains live because no cutover
was applied. Twenty-nine contracts and the isolated Admin production build pass.
This does not yet implement the richer damage, unexpected/wrong-item, unknown-
expiry, insufficient-shelf-life, and quarantine disposition workflow required
by MAP-023, and no flag, migration, secret, deployment, or domain was changed.

The live lots/expiry surface was inspected read-only on 12 August. All 21
current lots are `available` and no current row is negative, over-reserved,
availability-inconsistent, missing required positive-stock expiry/hub/custodian,
unsafe at 0–30 days, or an unapproved 31–89-day clearance lot. This clean sample
does not validate future edits: the browser still reads full rows and calls the
two mutation RPCs directly, and the existing reconcile function can write
`quantity_available = quantity` even when a reservation exists. The total-stock
and expiry views also expose physical-count formulas rather than one canonical
eligible-availability formula. No batch-change events exist yet.

An inactive lot/expiry BFF correction is now prepared. It provides a fixed,
bounded read projection and signed reconcile/clearance commands with exact
payloads, reason requirements, durable receipts, replay defense, rate limits,
and safe errors. Its coordinated migration replaces the compatibility trigger
that currently overwrites available quantity, derives sellable units from
physical minus reserved plus disposition/shelf life, adds a database invariant,
corrects the stock and expiry views, and revokes both direct mutation RPCs. The
Admin interface now separates physical/reserved/sellable counts, requires full
positive-lot identity/custody, replaces prompts and raw errors with inline
reasoned states, and locks legacy reconciliation when reservations exist. A
rollback-only production rehearsal proved reservation subtraction, below-
reservation denial, exact audit events, idempotent retry, eligible clearance,
physical expiry reporting, and the sellable stock view. After rollback the live
database still has 21 lots, zero batch events, the legacy trigger/direct grants,
and no staged wrapper or constraint. Thirty-two contracts, the 21-module Admin
build, Admin BFF verifier, and 688-file secret scan pass. This remains inactive:
the migration, private secret, feature flag, deployed tests, and domain were not
changed.

The live coupon surface was inspected read-only on 12 August. The table exists,
has RLS staff policies and authenticated direct select/insert/update grants, but
contains zero coupon rows. Its existing audit trigger records row changes but no
operator reason. No `coupon_change_events` table or signed Admin coupon command
is live. The Admin browser currently performs direct create/toggle/archive writes.

An inactive coupon BFF correction is now prepared. It returns a fixed bounded
register and provides Admin-only create, activate/pause, and archive commands
with exact schemas, bounded percentage/money/count/date fields, specific reasons,
HMAC/nonce/idempotency/rate protection, safe errors, and immutable before/after
events. The coordinated migration revokes direct authenticated coupon mutations.
The four-skill interface keeps the established Admin design, adds reasoned
decisions, safe conflicts, 44px controls, and phone cards instead of requiring a
wide table. A production rollback-only behavior rehearsal proved create, exact
retry without a duplicate event, changed-payload denial, activation, archive,
archived-state denial, and non-Admin denial; rollback restored zero coupons and
the original direct grants, with no staged wrapper/event table remaining. Thirty-
five contracts, the 21-module Admin build, Admin BFF verifier, and 696-file secret
scan pass. This remains inactive: no migration, request secret, feature flag,
deployment, or domain changed.

The customer directory now has an inactive Admin BFF read slice. It is Admin-only
until staff capability enforcement exists, returns a fixed canonical customer/
contact/account/channel projection when MAP-019 identity objects are available,
and falls back honestly to Customer/VIP `user_profiles` while they are absent.
Canonical order, Pasabuy, conversation, value, and unread metrics are returned
only if every supporting query succeeds; otherwise they are unavailable rather
than fabricated as zero. The four-skill UI separates account, guest, and channel
facts, labels the legacy mode, removes generic row selection/raw errors, and uses
phone cards with 44px refresh controls. Existing MAP-019 provider evidence—not a
fresh query—proves the canonical identity tables are currently absent; a fresh
provider audit was unavailable because the connected tool reached its usage
limit. Thirty-six contracts and a 699-file secret scan pass. The post-change
Admin production build is pending for the same execution-quota reason, so this
slice is not build-verified, deployed, or active.

The previous shared React context also caused admin Auth/inbox logic to compile
into the storefront artifact and storefront commerce logic to compile into the
admin artifact even though route manifests looked separate. This is corrected:
`AdminApp` owns `AdminStoreContext` plus admin-only Auth/inbox runtimes, and
`StorefrontApp` owns the commerce `StoreContext`. The boundary verifier now scans
compiled JavaScript for cross-artifact route, cookie, MFA, staff-inbox,
guest-commerce, Turnstile, and voucher markers in addition to manifest paths.
Both local production builds pass. This is verified build isolation, not domain,
deployment, or BFF activation evidence.

On 14 August 2026, Vercel rejected both preview and production attempts for
commit `909d769` because the Hobby plan accepts at most 12 Serverless Functions
and the repository exposed 50 deployable BFF handler files. GitHub CI still passed
both isolated builds and all smoke flows; no new Vercel artifact was published.
An initial `.vercelignore` attempt did not affect Git-based function discovery.
Because both BFF flags remained false, the handlers moved under `prepared-api/`,
outside Vercel's deployable `api/` directory, preserving every handler and
contract locally. Storefront Contact uses its explicit email-draft fallback and
Admin continues its existing browser Supabase Auth. At that point, future BFF
activation required consolidating handlers behind the plan limit (or an
owner-approved upgrade), restoring deployable routes, and repeating real-host
security proof.

On 21 August the prepared Admin leaf handlers were consolidated locally behind
one explicit allowlisted router with 51 exact method-aware routes and a single
serverless entrypoint. Automated verification compares the router with every
prepared endpoint and denies unknown paths. On 22 August the guarded entrypoint
was promoted to `api/admin/index.js` with an exact API-prefix catch-all rewrite and
independent default-off server switch. No provider environment or feature flag
changed, and the Admin still uses its existing direct browser session/data path;
this is prepared activation work, not a live BFF. The 13 Storefront handlers
now have an equivalent allowlisted router and guarded
`api/storefront/index.js` entrypoint. The intended deployment shape is one
function per production artifact, but Vercel preview inventory must still prove
that source discovery preserves that separation. No environment, feature flag,
or deployment was changed.
All 127 API/security contracts, the complete local security gate, and both
sequential isolated production builds pass with the guarded entrypoints. This
does not prove a Vercel preview inventory or a live route.

The prepared Admin session cookie contract is now versioned and exact. New
authentication rotates an opaque session UUID and CSRF token; refresh preserves
the session identity and original hard-expiry anchor while rotating encrypted
provider material. Tampered or malformed payloads fail closed. A durable live
registry was subsequently prepared for device listing, immediate revocation,
provider-session invalidation, and logout-all; it remains inactive MAP-019 work.

On 22 August an additive durable Admin session registry and signed command
boundary were prepared locally. Active cookies are emitted only after the
actor's AAL2/staff-bound registry write succeeds. Protected Admin requests and
the session-status route validate and touch the actor-owned registry row before
cookie refresh; revoked, expired, missing, or cross-user rows fail closed.
Logout attempts durable current-session revocation, and two prepared routes
provide a bounded own-session list plus reasoned, CSRF-protected, payload-bound
idempotent revocation of one or all own sessions. Each registry row stores the
provider JWT `session_id`, and registration requires the matching actor-owned
`auth.sessions` row. Every validation rechecks that row; if password change,
global sign-out, or another provider security action removes it, the K2 row is
immediately revoked with a bounded denial event even while the old access JWT
has time remaining. The isolated PostgreSQL lifecycle proves active validation
followed by provider-row removal and K2 revocation. The Admin router consequently
covers 56 exact prepared routes with zero control gaps and all 139 contracts
pass. The migration and secret are unapplied, the BFF flags remain inactive,
and no live Auth or real-host stolen-cookie denial behavior has been claimed. A
private bounded event ledger records only registration,
validation-denial, and revocation outcomes without tokens, IP addresses,
user-agent strings, provider errors, or free-form payloads; broader correlation,
retention, review, and alerting remain MAP-022 work.

IDEA-20260828-01 adds a required predeployment target, not current behavior. The
repository does not yet enforce one active Admin login per staff account, issue
owner-approved remembered-personal-browser credentials, distinguish remembered
from unremembered history restoration, or prove that restored Admin content is
locked before display. The current prepared session registry, provider-session
binding, 30-minute idle limit, eight-hour hard limit, logout, and `no-store`
contracts are foundations only. MAP-024 owns implementation; MAP-025 owns
supported mobile/desktop real-host proof. Ordinary phone tab/app switching must
not be reported as session expiry merely because document visibility changed.

The same prepared verifier now enforces a second MAP-020 layer above individual
command limits: one private forced-RLS minute bucket caps a staff actor at 360
signed requests across all actions, and a second caps the Admin boundary at
6,000 signed requests across all actors. The BFF maps this exact denial to a
safe `429` with a 60-second retry window. Isolated PostgreSQL assertions prove
both first-denied requests (361 and 6,001), plus rollback/apply/replay. This is
local Tier evidence, not a live capacity claim; the separate prepared durable
pre-auth boundary now covers login, pending-session MFA, and recovery, while
production WAF/provider/host behavior is still open. The credential-login and
recovery-mail routes now additionally require an exact bounded Turnstile token
for `admin_auth` after durable budget consumption and before password Auth or
provider mail. Budget denial skips both challenge and provider work; challenge
denial returns safe `BOT_CHALLENGE_REQUIRED` and skips provider work. The compact
Admin BOS forms reuse an artifact-neutral challenge component only when secure
Admin mode is active and reset it after each request attempt. MFA, recovery-token
verification, and completion remain challenge-free behind their dedicated
durable subjects. One focused server contract and two 375px reduced-motion
browser journeys pass; all 175 API/security contracts and both isolated builds,
cross-artifact boundaries, and secret scans pass. The site/secret keys, Admin
flags, provider settings, WAF, preview, and production remain unchanged and
unverified.

The production Storefront artifact no longer imports the workstation-only
`DemoRail`. Before the 22 August correction, a visitor could append `#demo` and
see a direct browser password form labelled VIP Login plus an unsupported tier-
pricing claim. `StorefrontApp` now ignores that hash, while combined local mode
retains the prototype. A compiled-boundary denylist, focused source contract,
and Storefront-mode Chromium regression prevent the prototype markers from
returning. All 128 API/security contracts and the isolated Storefront build,
boundary, and secret scans pass. This removes a false production identity path;
it does not implement optional customer accounts, verified guest-record claims,
or wholesale commercial authorization, which remain inactive MAP-019 work.

MAP-019 now also has a prepared verified guest-to-account claim boundary. Its
fixed Storefront route validates an ordinary customer Auth bearer session and
active scoped guest grant; the signed database command derives only confirmed
Auth contact, matches the private customer contact hash, rejects identity/account
conflicts, consumes one payload-bound claim, links the optional account, revokes
guest access, and emits one private bounded event. Actor/contact transaction
locks serialize concurrent attempts and idempotent retries do not duplicate the
event. An isolated PostgreSQL 17.11 lifecycle passed rollback restoration,
apply/postflight, success/revocation, nonce and changed-payload denial,
unauthenticated denial, and migration replay. Nine focused and all 130 API/
security contracts pass. This is local evidence only: no migration, account UI,
secret, flag, preview, or production route is active.

The account boundary now continues beyond claim with two owner-scoped routes:
bounded linked order/Pasabuy/conversation history and idempotent Website reply.
Both derive the customer from the active Auth account, accept no customer/user
identifier, exclude contact/delivery PII and internal staff notes, and reject
another customer's conversation. The expanded PostgreSQL lifecycle proves this
behavior after guest-grant revocation. A default-off passwordless Storefront
surface supports email link and phone code, verified claim, scoped history,
offline recovery, refresh, and reply without changing the five-item mobile nav
or promising commercial terms. Two customer-account 375px journeys plus the
secure Wholesale journey pass, including dark/landscape/no-overflow checks. On 25 August the
three passwordless actions moved from direct browser provider calls to fixed
`account/auth/email`, `account/auth/phone`, and `account/auth/verify` Storefront
routes. Each consumes a signed durable HMAC-only IP/contact-or-verification/global
budget before provider email, SMS, or code verification; raw identifiers, codes,
and IP values never reach the rate tables. Limits are 5/IP/15 minutes,
3/contact/hour, 120/global/minute for email; 5/IP/15 minutes, 3/contact/hour,
60/global/minute for SMS send; and 10/IP/15 minutes, 5/phone/15 minutes,
120/global/minute for SMS verification. Email-link and SMS-code issuance now
also require a bounded Turnstile token whose verified action is `customer_auth`.
The server consumes the durable budget first, returns safe `403
BOT_CHALLENGE_REQUIRED` after a challenge denial, and makes no provider delivery
call. SMS-code verification has no redundant challenge and retains its stricter
durable attempt budget. The browser reuses the existing accessible challenge,
sends the token only with issuance, resets it after each request attempt or
ambiguous request failure,
and establishes the ordinary customer session only from the bounded verified
access/refresh pair. On 1 September the complete rendered acceptance run exposed
a deferred-client lifecycle defect: the account hook dereferenced `.auth` on the
promise returned by the lazy Supabase boundary. The hook now awaits that client,
owns cancellation and subscription cleanup, and signs out only through the
resolved client reference. Both previously failing account journeys, secure
Wholesale, the exact 442/442 source/API inventory, the 484/484 base suite, and
the complete seven-stage 550/550 `npm test` aggregate pass locally. Five
focused boundary contracts, the isolated PostgreSQL 17.11 threshold/denial/
replay/privacy/migration-replay rehearsal, all 174 API/security contracts, the
three-journey customer/Wholesale browser harness, the zero-gap security audit,
both BFF verifiers, and a fresh Storefront production build pass. The customer
flag is allowlisted only for the Storefront browser environment. Supabase email/
SMS configuration and delivery, Turnstile site/secret policy, redirect policy,
migration, secrets, environment flags, preview, WAF/provider limits, alerts, and
production remain inactive and unverified.

The Storefront Wholesale fallback no longer fabricates operational success. It
previously minted a random `WA-*` reference, saved it only in localStorage,
called it submitted/recorded, requested a registration number immediately, and
promised a 1–2-business-day review without server or owner evidence. It now
prepares an explicitly unsent email draft, stores no application, asks for a
delivery city/area instead of a full address, defers registration/tax evidence
until an attributable staff request, and disclaims pricing, stock, approval,
credit, delivery, and response-time certainty. All controls have programmatic
labels. A focused source contract and 375px no-overflow Chromium journey pass;
visual inspection confirms the unsent state uses K2 wholesale blue instead of
green success. This is a truthful local fallback, not a canonical durable
wholesale inquiry or commercial authorization boundary. OWNER-003 and MAP-017
still gate commercial activation.

A default-off secure Wholesale path is now prepared behind the tenth fixed
Storefront route. Its additive inquiry-only migration creates a forced-RLS table,
private idempotency receipts, a canonical customer-linked Website conversation,
and scoped guest continuation. Exact Origin, Turnstile, schemas, signed requests,
durable IP/contact limits, payload idempotency, and minimal `WI-*`/`CV-*` receipts
apply. The inquiry schema cannot represent price-list, pricing, credit, terms,
stock, or delivery approval; unknown authority fields fail. The expanded isolated
PostgreSQL 17.11 lifecycle passes rollback, privileges, capture, retry, changed-
payload/authority denial, and migration replay. A third feature-enabled 375px
journey proves receipt rendering without commercial authority. Thirteen focused
Storefront contracts, all 134 API/security contracts, the complete security gate,
both isolated production builds/boundary/secret scans, and all eight default-off
smoke journeys pass. Nothing is live:
MAP-017 gates database/BFF activation and OWNER-003 gates commercial policy.

Customer-data retention/deletion is now explicitly fail-closed. The canonical
schema already restricts deletion through contacts, accounts, channel identity,
guest grants, claims, orders, Pasabuy, Wholesale, and conversations. A new
runbook defines verified request intake, hold classification, dry-run planning,
PII minimization, access/session revocation, preserved operational truth,
audited counts, and backup expiry without inventing retention periods. A source
contract scans all migrations for customer cascade/direct deletion and prevents
a premature account-delete route. `OWNER-006` now holds the missing legal,
finance, anonymization, approval, and backup decisions. This is Tier 0
documented/source-guarded evidence only; no deletion request or erasure endpoint
exists or is claimed.

Admin Wholesale review is now prepared without broadening that authority. One
fixed Admin-only staff/AAL2 projection exposes at most 200 inquiries through
public inquiry/conversation references and never returns raw customer or
conversation IDs. One signed, CSRF- and payload-idempotency-protected command
moves only between `submitted`, `under_review`, and `closed`, requires a bounded
reason, and records actor/from/to evidence in a private ledger. Closed inquiries
can return to review so triage is recoverable. The response and Admin surface
explicitly retain `commercialAuthorityAvailable=false`; buyer approval, pricing,
credit, terms, stock and delivery remain absent and OWNER-003-gated. A 375px
rendered journey and visual review pass with 44px actions and no overflow. The
database lifecycle, 139 contracts, full security gate, 56-route Admin verifier,
and both sequential isolated builds pass locally. No migration, BFF flag,
provider environment, preview, or production host was activated.

MAP-020 now has a source-level security-surface scanner wired into prebuild. Its
25 August baseline covered 68 Admin and 13 Storefront prepared BFF routes, two
Edge Functions, and 289 literal Data API/RPC/Auth/Storage/Realtime/API source operations, with zero
unreviewed dynamic targets after bounded-route, fixed-bucket, and static-channel
corrections. It also inventories the ordered local migration target: 123 unique
SQL function signatures, 125 policies (15 for Storage), 13 publication changes, and
no scheduled jobs. The target has no effective `SECURITY DEFINER` function
missing a fixed `search_path`. A prepared 21 August privilege migration removes
default `PUBLIC` execute from seven trigger helpers and makes the two unused
legacy purchase-receiving RPCs service-role-only, leaving zero target functions
with `PUBLIC` execute. The guest cutover explicitly revokes four legacy direct
RPCs and leaves exactly 11 allowlisted anonymous functions (public stock plus
signed guest/security boundaries); CI rejects unexpected, missing, or restored
public grants. The 68 Admin and 13
Storefront router entries also have exact method and security-control metadata,
centrally enforced method denial, and zero prebuild classification gaps. None of
this DDL or BFF routing is claimed live. The scanner records source and
repository-target exposure; it does not prove production deployment,
authorization, real rate limits, or provider configuration.

The 29 August source refresh expands the prepared Admin router to 70 exact routes:
`inbox/send-reply` adds the signed customer-visible website reply boundary and
`product-knowledge/save` adds the signed reviewed-copy boundary. Both are
AAL2/session/origin/CSRF/idempotency/database-rate classified. The standalone
Admin verifier, source inventory, route documentation, and 366 source/API
contracts agree on 70 Admin and 13 Storefront routes. This remains prepared
source behavior, not proof that either production BFF flag is active.

The prepared Admin BFF now also owns public product-media upload transport.
The fixed route verifies the live Admin session, AAL2, exact origin, CSRF, UUID
idempotency key, MIME, decoded image, byte size, dimensions, and pixel count;
re-encodes JPEG/PNG/WebP without metadata; uploads to a deterministic
actor/idempotency/content-hash path; and completes only after a signed database
command re-verifies the Storage object and records the receipt. The shared
Admin uploader preserves partial success and stable retry keys, exposes
announced recovery state, and no longer accepts raw URLs or SVG. PostgreSQL
rollback/apply/replay, focused contracts, the security gate, Admin verifier, an
isolated Admin build, and a reduced-motion 375px browser check pass. This is
inactive local evidence: other media CMS commands remain pending, and no
migration, feature flag, provider, preview, or
production host was changed.

The product-media workflow now also has a prepared signed assignment and
unassignment boundary. A read-only production check confirmed that the canonical
30-row Product Master uses `primary_image_url`, `image_url`, `lifestyle_images`,
and `secondary_images`; it did not change data. The command accepts only actor-
owned receipt-backed new objects or URLs already assigned to that product,
requires a reason, locks and updates the canonical row atomically, mirrors the
primary compatibility field, records private forced-RLS before/after evidence,
and denies removal of a published/Live primary photo. Inventory and Sheet photo
entry now converge on the dedicated modal, and the broad Inventory detail save
contains no image assignment fields. Rollback/apply/postflight/replay and
behavior, all 139 contracts, the 56-route verifier, zero-gap security inventory,
isolated Admin build, and seven Admin browser tests pass. This remains local and
inactive; Globe/review media, deployed
provider behavior, and real-host denial evidence remain open.

The prepared media boundary now also owns public-object cleanup. Assignment
returns only completed-receipt paths removed from the product and absent from
all canonical product-media fields; Storage removal and signed database
completion are separate so provider ambiguity remains a visible, replayable
`pending` event instead of turning a successful assignment into a false failure.
An Admin/AAL2-only orphan review applies a one-hour minimum age, 100-row review
bound, 25-file reasoned command bound, and a final reference recheck. Inventory
provides the matching Admin-only maintenance dialog and stable retry state.
Rollback/apply/postflight/replay, behavior, 139 contracts, the 56-route verifier,
zero-gap inventory, Admin build, and seven Chromium tests pass locally. No
production Storage object, flag, migration, or host was changed.

Globe configuration and review claims now also have a prepared named Admin
boundary. Globe visibility and review draft/correction/publication/withdrawal
commands are Admin/AAL2-, origin-, CSRF-, signature-, idempotency-, version-,
rate-, reason-, and audit-bound. Review source/reference and rights evidence are
private; anonymous access is column-minimized and published-only. Create never
publishes, correction returns published copy to draft, and withdrawal preserves
history. The phone interface exposes evidence and explicit reasoned actions with
44px controls, reduced motion, and no overflow. Rollback/apply/postflight/replay,
behavior, 140 contracts, the 57-route verifier, zero-gap inventory, isolated
Admin build, and eight Chromium journeys pass locally. The 17-row live Globe
schema and zero live review rows were inspected read-only. No migration, BFF
flag, provider, preview, production host, or public review was changed or proven
live.

The shared Globe context no longer mounts its legacy direct-browser Supabase
Auth listener or Globe/review Data API provider when the Admin BFF is enabled.
`AdminApp` selects an inert legacy context before the remote provider can mount;
the secure Globe workspace continues to use its fixed Admin BFF projection and
commands. Storefront public Globe reads and the explicit flag-off legacy Admin
path are unchanged. A test-first isolation contract, all 173 API/security
contracts, the zero-gap security audit, Admin verifier, 15 Admin Chromium
journeys, and a fresh 21-module Admin build/boundary/secret scan pass. This is
local source/artifact/browser evidence only: the BFF flag, migrations, provider,
preview, and production hosts remain unchanged.

The same secure-mode reachability audit found and corrected a shell product-
projection guard-order defect. `AdminStoreContext` previously returned empty
products whenever the browser Supabase client was absent before checking the
enabled Admin BFF, so a valid cookie-bound session could not populate shared
navigation/search in the intended server-only transport. It now evaluates the
secure transport first, loads through `getAdminProducts`, and polls only that
route while visible; the flag-off browser query and product/lot Realtime branch
is unchanged. `useAdminInboxRuntime` already selected every secure read,
mutation, history request, and poll before its legacy browser query/RPC/Realtime
paths, so it required no change. The regression completed RED→GREEN; all 173
API/security contracts, zero-gap audit, Admin verifier, import check, 15 Admin
Chromium journeys, and the fresh 21-module Admin build/boundary/secret scan pass.
This remains local and inactive; no flag, provider, migration, preview, or
production host changed.

Supplier procurement now has a second prepared named boundary. A read-only live
inspection found zero supplier, purchase-order, and PO-line rows and confirmed
their exact columns and staff policies/grants. The fixed staff/AAL2 projection
does not expose generic rows and explicitly keeps PO creation and receiving
unavailable. Supplier creation alone is prepared as an Admin-only, reasoned,
signed, idempotent, rate-limited, duplicate-safe command with private immutable
evidence; the coordinated migration revokes direct client mutation. The phone
dialog states that supplier identity does not approve pricing or create a PO.
Rollback/apply/postflight/replay, behavior, 141 contracts, the 58-route verifier,
zero-gap inventory, Admin build, and nine UI journeys pass locally. Production
data/grants, flags, migration, preview, and host remain unchanged; the canonical
end-to-end purchasing/receipt/settlement loop remains MAP-023.

Channel readiness now has a prepared named Admin boundary. Read-only production
inspection found eight connection rows, zero listing rows, 120 derived readiness
rows, and confirmed that the legacy internal-event RPC is still directly
executable by authenticated staff in production. The local coordinated
migration replaces browser reads with one staff/AAL2 five-channel aggregate,
revokes the legacy browser command, and adds an Admin-only signed Website/
Pasabuy verification that requires a real canonical public reference, reason,
idempotency, rate limit, and private before/after evidence. The phone surface
keeps 44px actions, focused Escape-close bottom sheets, bounded polling, and
explicitly says external marketplaces are not connected. Rollback/apply/
postflight/replay, 142 contracts, the 59-route verifier, zero-gap inventory,
Admin build, and ten Chromium journeys pass locally. Production data/grants,
flags, migration, preview, and host remain unchanged; no external connector or
marketplace synchronization is proven.

Staff access now has a first prepared named Admin boundary. Read-only production
inspection confirmed four current profiles, all Admin, and direct authenticated
execution of the legacy role/delete-PIN functions; production was not changed.
The fixed Admin/AAL2 projection exposes only bounded profile identity/role fields
and the actor's PIN-configured flag. Signed role and PIN commands require reason,
origin, CSRF, idempotency, rate limits, final-Admin protection, and private
before/after evidence that never stores the PIN or hash; coordinated cutover
revokes the three legacy browser RPCs. The staff surface now also has a prepared
reason-bound secure invitation path: an exact Admin/AAL2 BFF keeps the restored
provider token server-side, requires email, role, and a 3–500 character reason,
and forwards one durable operation key to the Edge function. An additive v2
claim binds and retains that reason while preserving v1 for the currently
deployed Edge version. The separate `K2_STAFF_INVITATIONS_ENABLED` switch stays
fail-closed until the migration and matching Edge version are coordinated.
Fifty focused Admin/Edge contracts, the 64-route verifier, zero-gap inventory,
portable PostgreSQL reason/replay/privilege/re-migration rehearsal, isolated
Admin build, and the focused 375px Chromium journey pass locally; the rendered
phone state was visually reviewed. Production grants/data, migration, Edge
version, flags, preview, and host remain unchanged; a deployed invitation/replay,
deployed denials, and acceptance remain open.

Invited-account TOTP enrollment is now prepared inside the same inactive Admin
BFF auth boundary. A correct staff password with no verified factor receives
only the encrypted ten-minute pending cookie instead of being signed out or
receiving an active session. The exact MFA route removes at most five stale
unverified TOTP factors for that actor, returns one bounded SVG QR/manual key,
verifies only the selected factor, repeats the live staff-role check, requires
provider AAL2, registers the durable session, and only then issues active/CSRF
cookies. The browser never receives provider access or refresh tokens. The
375px setup screen uses visible labels, 44px actions, restart/error recovery,
and reduced-motion handling. Fifty-one focused API/security contracts, the
64-route zero-gap inventory, both isolated production builds, two focused 375px
staff/auth journeys, and four existing MFA/PIN security journeys pass locally;
the rendered phone state was visually reviewed. This is prepared code evidence,
not deployed enrollment proof. Real-provider enrollment, replacement activation,
lost-factor recovery, real-host denials, and owner/staff acceptance remain open
under MAP-019/MAP-025.

Active-factor TOTP replacement is now prepared as a separate fail-closed Admin
boundary. A current Admin/AAL2 session and CSRF/idempotency controls are required;
start accepts only a 3–500 character reason, requires exactly one verified old
factor, records a signed private requested receipt, removes only bounded stale
unverified setups, and returns one bounded new QR/manual key. Completion verifies
the exact new factor before retiring the exact previous factor, refreshes rotated
provider tokens only inside the encrypted cookie, and records a linked private
completion receipt containing the reason and hashed—not raw—factor identifiers.
Ambiguous completion can retry under the same replacement ID, while multiple
active factors and lost-factor recovery fail closed. The dedicated
`K2_MFA_REPLACEMENT_ENABLED` switch remains false until its migration and real
provider/role/host evidence pass. The isolated PostgreSQL 17 rehearsal verifies
private reason retention, AAL2 privileges, requested/completed linkage,
idempotent replay, and migration replay; the focused API contract, 65-route
verifier, zero-gap surface audit, both isolated builds, and reduced-motion
375×812 journey pass locally, and the rendered phone dialog was visually
reviewed. Production schema, factors, sessions, flags, preview, and hosts were
not changed. Lost-factor identity recovery, real-provider replacement/retry,
deployed denials, and owner/staff acceptance remain open.

Staff password recovery is now prepared as three exact inactive Admin routes:
generic email request, server-side token-hash verification, and password
completion. The callback is one exact HTTPS Admin URL whose origin must also be
allowlisted. A verified link must belong to a confirmed current Admin/Staff
identity before the server sets a ten-minute AES-GCM recovery cookie and
separately bound recovery-CSRF cookie; provider tokens never enter browser code
or the redirect. Completion rechecks the identity and role, accepts one matching
12–128 character password, globally signs out provider sessions, clears recovery
cookies, and requires a fresh password-plus-authenticator login. The 375px Admin
BOS flow has generic non-enumerating mail copy, labeled fields, complete error,
loading, and success states, 44px actions, reduced-motion behavior, and no
horizontal overflow. Forty-nine Admin BFF contracts, the 68-route zero-gap
security inventory, both isolated production builds, and the focused 375×812
Chromium journey pass; the phone success state was visually reviewed. Official
provider docs confirm the custom server token-hash template and global sign-out
pattern. This remains local and inactive behind
`K2_ADMIN_PASSWORD_RECOVERY_ENABLED`. The same signed durable pre-auth boundary
uses separate login-contact, MFA-pending-session, recovery-contact,
recovery-token, and recovery-session HMAC domains. It enforces login at 20/IP/15 minutes, 10/contact/hour, and
300/global/minute; pending MFA at 10/IP/15 minutes, 5/session/15 minutes, and
300/global/minute; and recovery at 5/IP/15 minutes, 3/contact/hour, and
120/global/minute. Token verification has separate 10/IP/15-minute,
3/token/15-minute, and 120/global/minute limits before `verifyOtp`. Recovery
completion has its own 10/IP/15-minute,
5/recovery-session/15-minute, and 120/global/minute limits before provider
restoration, password mutation, or global sign-out. Denials persist and return
generic `429` plus `Retry-After`; handler tests prove password Auth,
provider-session restoration, recovery mail, token verification, and recovery-completion provider
calls are never reached after the relevant denial or boundary failure. The
isolated PostgreSQL 17.11 rehearsal proves exact anonymous grant,
table/authenticated denial, forced RLS, all fifteen action/scope thresholds,
denial persistence, replay/signature rejection, cleanup, privacy schema, and
migration replay plus the reusable read-only postflight. All 53 Admin BFF and
179 API/security contracts pass; the 68-route Admin verifier passes and its
source audit still has zero control/grant gaps. The
Supabase template, redirect allowlist, migration/secret, real email,
email-tracking/prefetch behavior, deployed replay/expiry/role denial,
provider/WAF limits, alerts, and real global-revocation checks have not been
performed. Production sessions, schema, provider configuration, flags, preview,
and hosts were not changed. Password recovery does not solve a lost
authenticator, so MAP-019 stays active.

The shared Admin shell and command palette now reuse the authorized product
projection in secure mode. They no longer issue parallel browser reads for
products/orders/staff identities, mislabel staff profiles as customers, or keep
direct Realtime subscriptions alive after secure cutover. Active-SKU and
low-stock badges derive from that fixed projection, and the secure fulfillment
badge now reads the fixed overview backlog projection with cancellation and an
explicit unavailable state instead of fabricated zero. Visible-page refresh is
bounded to 30 seconds. All 149 contracts, the 62-route verifier, the
zero-gap surface audit, and the isolated Admin build pass locally. The feature
flags and production environment remain unchanged.

The remaining shared procurement and inventory helpers now also fail closed in
secure mode. The Kanban purchase-order register uses the fixed procurement
projection; barcode duplicate checks use the protected intake search; Inventory
Grid uses the fixed product projection with visible-page polling and routes new
products to phone-first intake; generic edits/status changes and Smart Paste's
legacy insert are unavailable until attributable commands exist. Permanent
deletion reads PIN-configuration state through the protected staff boundary but
fails closed until its own signed command exists. All 148
contracts, the zero-gap surface audit, the 61-route verifier, and the isolated
Admin build pass locally. This did not activate a migration, feature flag, or
host.

The product-master secure-mode gap is now closed locally with one fixed
Admin/AAL2 GET plus exact signed update, lifecycle, and deletion commands.
Updates require optimistic version truth and private before/after evidence;
lifecycle changes enforce the five-state transition matrix and Live readiness;
deletion reuses the existing PIN, lockout, stock/listing/history safeguards.
Coordinated cutover revokes direct authenticated product DML and legacy deletion
execution from every browser role including `PUBLIC`. Inventory Grid supplies
reasoned 44px actions, explicit permission states, safe recovery, and numeric
weight validation. PostgreSQL rollback/apply/behavior/postflight/replay, 149
contracts, the 62-route zero-gap inventory, and the isolated Admin build pass.
On 27 August a dedicated secure-flag Chromium journey closed the former Windows
`EPERM` review gap. Its first run found that the product editor lacked an
accessible dialog identity. The editor and lifecycle confirmation now use the
shared Admin dialog focus/Escape/restore contract, busy close protection, and a
stable accessible name; editor fields stack into one column at 375px. The real
rendered flow proves reasoned editing, Draft → Under Review confirmation,
delete-PIN initial focus, inline history-based deletion refusal, and zero
horizontal overflow. The focused journey, all 16 Admin UI journeys, 213
API/security contracts plus both selling-surface behaviors, the zero-gap gate,
and the isolated 21-module Admin build pass. Production migration, flags, host,
data, and grants remain unchanged behind the missing backup/restore evidence and
coordinated cutover gates.

System Readiness now has a protected boolean-only Admin/AAL2 route prepared as a
MAP-022 prerequisite. It replaces direct browser session/table probes with fixed
database-access and named-boundary-presence flags, while explicitly returning
false for raw-diagnostic exposure, provider-health proof, and deployment-latency
proof. The mobile bottom sheet adds initial focus, Escape recovery, 44px actions,
and states that the check does not prove WAF, encryption, connector health,
deployment, latency, or throughput. Rollback/apply/postflight/replay, 144
contracts, the 61-route verifier, zero-gap inventory, Admin build, and focused
375px journey pass locally. No migration, route flag, preview, production host,
provider health, or deployed behavior changed; correlation, alerting, retention,
production backup/restore, and operator review remain open.

MAP-021 dependency controls now remove the unused Puppeteer toolchain (24 locked
packages), leaving 20 direct and 274 locked packages. The 21 August npm advisory
query reports zero vulnerabilities. Prebuild validates manifest/lock agreement,
registry/integrity provenance, reviewed licenses, and exactly three approved
esbuild/fsevents install scripts. CI is configured to run the live audit, policy,
and 105 API/security contracts; weekly bounded Dependabot updates are configured.
These controls have passed locally but have not yet produced a new remote CI or
Dependabot run, and they do not prove deployed CSP/headers, source-map policy,
cache behavior, or real-host security.

The 22 August dependency refresh again found zero npm advisories at every
severity across 274 locked packages. CI now includes an isolated PostgreSQL 17
service and a fail-closed catalog-spreadsheet rehearsal runner. The runner
accepts loopback hosts only, requires a `k2_catalog_rehearsal*` database name,
executes identity/commit migrations and behavioral assertions, applies the
emergency rollback, and verifies resulting privileges and preserved evidence.
It passes locally, the workflow YAML parses, all 114 contracts pass, and both
isolated production builds pass boundary, source-map/dev-marker, and secret
scans. The restricted Windows sandbox denied esbuild access to `vite.config.js`;
the identical approved workspace run passed. Remote CI/Dependabot execution and
deployed/real-host behavior remain unproven.

MAP-021 local browser-error handling now emits only the stable
`UI_SECTION_UNAVAILABLE` code, an allowlisted failure kind, and the current
pathname; it no longer sends raw messages, stacks, full URLs, user-agent strings,
or arbitrary component context directly from the browser to `error_reports`.
The Admin error boundary shows the stable code and recovery guidance instead of
provider diagnostics. One allowlisted UI-error mapper now supplies stable codes
and recovery copy across the remaining browser surfaces, including fulfillment
and custody, staff permissions, image upload, product-intake parsing,
consignment receipt recovery, Demo Rail sign-in, and connector retry state. The
System Readiness modal no longer reads or renders raw `error_reports` rows or
URLs; diagnostic details stay unavailable until MAP-022 provides a protected,
redacted server route. Five focused contracts, the full 102-contract suite, and
the eight-test Storefront smoke suite pass.
Both isolated production builds explicitly disable source maps and reject
compiled source-map references, Vite development markers, the removed console
greeting, target leakage, unexpected loopback URLs, and secrets. One exact inert
`http://localhost:9999` marker in the Supabase Auth library is reviewed and
allowlisted. The first smoke run timed out on a cold full-load navigation while
the other five behaviors passed; navigation now waits for DOM readiness and then
asserts the rendered surface. The expanded seven-journey suite later exposed the
same readiness race while a lazy view still showed the Suspense fallback. The
shared helper now waits up to 30 seconds for the initial cold `<main>` surface;
view-specific lazy assertions retain a 15-second bound, and all eight pass,
including the Wholesale fallback truth check. This
is local artifact evidence:
the protected server logging/correlation route, deployed bundle inspection,
headers/CSP, cache rules, and real-host behavior remain unfinished.

MAP-021 browser request boundaries now share an explicit cancellation/deadline
implementation. Admin reads time out after 10 seconds; guest-commerce commands,
Admin commands, and staff invitations after 15 seconds; and private evidence
uploads after 30 seconds. Server-side Turnstile verification remains bounded at
5 seconds. Caller cancellation remains distinct from `REQUEST_TIMEOUT`, browser
commands are never automatically retried, and an ambiguous invitation timeout
preserves its operation key while warning that server truth is uncertain. Admin
GET/HEAD reads use no more than three total attempts for transient network
failures or 408/425/429/500/502/503/504, with 200 ms exponential backoff plus
jitter capped at 2 seconds. Caller cancellation stops backoff, ordinary client
errors do not retry, and a `Retry-After` above the cap returns control to the
user. POST commands, uploads, invitations, and guest submissions remain
single-attempt. Eight focused timeout/retry contracts and all 102 contracts pass,
as do both isolated production builds and their security scans. This is local
evidence only. Account-specific provider/server limit evidence, complete ambiguous-
command truth checks, deployment, and real-host verification remain.

MAP-021 separate Vercel configurations now prepare report-only CSP plus explicit
anti-framing, MIME, referrer, permissions, and cache headers. Storefront HTML is
`no-store`; Admin HTML is `private, no-store`; BFF JSON stays `no-store`; and
fingerprinted assets are public with a one-year immutable lifetime. The known
HTTP catalog-video fixture now uses HTTPS. The pre-render theme bootstrap is a
synchronous same-origin head script, so `script-src` no longer needs
`'unsafe-inline'`; inline style remains allowed pending violation review. CSP is
still report-only. HSTS remains withheld until all production hosts/subdomains
have HTTPS evidence. Five focused contracts, all 102 contracts, both isolated
builds, and eight Storefront smoke behaviors pass. The restricted smoke launch was
denied access to Vite's workspace config; the identical approved workspace run
passed, making that a test-environment limitation rather than a product failure.
Deployed headers/cache behavior, CSP enforcement, invalidation proof, and HSTS
eligibility are not yet verified.

MAP-021 now has a provider-limit/capacity runbook that distinguishes repository
controls, current official-provider ceilings, and missing account evidence. The
audit identified a production contradiction: prepared intake evidence allowed
10 MB while Vercel Functions document a 4.5 MB request/response ceiling. Intake
evidence is now capped at 4 MiB in browser guidance, shared validation, BFF body
handling, normalized output, and contracts; actual buffered bytes must match the
declared length. Existing JPEG/PNG/WebP decode, dimension/page/pixel,
metadata-removal, and private-registration controls remain. Four capacity
contracts and all 102 contracts pass with both isolated builds/security scans.
K2's Vercel plan/Fluid Compute/memory/usage and Supabase plan/compute/pool/spend-
cap/Realtime/Storage/usage are not inferable and remain blocked on authenticated,
redacted dashboard evidence.

MAP-022 now has a real isolated encrypted database backup/restore rehearsal,
superseding the earlier in-memory sample as the strongest local evidence. A
loopback-only runner requires distinct rehearsal-named source/target databases,
streams a PostgreSQL custom dump into memory, encrypts it with AES-256-GCM,
decrypts without a plaintext file, restores with fail-fast `pg_restore`, and
compares exact catalog, operation/event evidence, and privilege fingerprints.
The PostgreSQL 17.11 rehearsal backed up 38,005 dump bytes into 38,069 encrypted
bytes in 337 ms and restored in 277 ms with a matching fingerprint; all 115
contracts pass. `DATABASE_BACKUP_AND_RESTORE_RUNBOOK.md` records provisional
24-hour RPO/8-hour RTO and retention/key/restore controls. No production or
Storage backup, off-site destination, schedule/alert, owner access recovery, or
production-sized RPO/RTO is claimed.

MAP-024's redacted deployment-environment validator now distinguishes the
minimal inactive inventory from an explicit Admin and/or Storefront BFF
activation audit. Activation mode requires every target-specific server URL,
publishable key, signing/cookie secret name, exact-origin allowlist, and
Storefront Turnstile name while continuing to reject provider secrets and
secret-shaped `VITE_` names. A focused contract and five-fixture self-test pass.
It validates names and project separation only; values, matching database
secrets, rewrites, flags, provider state, domains, and real-host behavior remain
unproven.

MAP-024 now also has an identity-independent Vercel configuration
selector at `scripts/map024-evidence/select-vercel-deployment-config.mjs`. Given
an explicit target, current project ID, reviewed target-to-project mapping, and
the two existing artifact contracts, it returns only the exactly matched config
and refuses missing, invalid, unmapped, mismatched, or absent-config input. Four isolated-
process contracts cover two synthetic valid pairs and all refusal classes; the
synthetic IDs prove logic only. A refreshed owner-authenticated Vercel connector
supplied both real K2 project IDs; two additional isolated-process contracts bind
them to their exact target configs and reject an opposite-project pairing. Root
`vercel.ts` now exports that selected config through Vercel's supported
programmatic configuration entrypoint, and the weaker generic
`vercel.json` is removed locally; both readable target configs remain unchanged.
On 30 August a dedicated contract first failed because the generic root JSON
still existed, then passed after that obsolete file was removed; the complete
focused config/security suite now passes 16/16. Fresh Storefront and Admin
production builds pass their boundary and secret checks. This is prepared
repository state, not a deployment. Preview function inventory, opposite-boundary `404`,
disabled BFF switches, routes, headers, cache classes, and rollback still require
provider evidence. Fresh verification after the root-adapter addition passed
234 API/source contracts, two
rendered Storefront selling journeys, the full prebuild gate, and both isolated
artifact builds/boundary scans.

The same read-only provider refresh found the Admin latest production deployment
`READY` and the Storefront latest production deployment `ERROR`. The Storefront
errors-only log shows the tracked-sensitive-file preflight refused Vercel's
checkout because `.git` is unavailable; no security gate was bypassed. The
Storefront project response also did not list the previously recorded apex/`www`
custom domains, while Admin still listed `admin.k2jimzon.com`. These are current
provider reconciliation blockers, not evidence that DNS or public-host behavior
changed. No provider setting or deployment was mutated.

On 27 August 2026, authenticated Hostinger connector access verified registrar
and DNS-edit authority for `k2jimzon.com`, which is transfer-locked and
registered through 27 August 2027. The pre-cutover zone contained only the
Hostinger parking A record and `www` CNAME; no MX or TXT record was present.
Hostinger DNS was changed at TTL 300 to Vercel's verified apex A records and
project-specific `www` and `admin` CNAME targets. Public DNS and Vercel both
verified the new records. The apex returns a 308 redirect to the canonical
`https://www.k2jimzon.com`; Storefront and Admin HTTPS hosts return 200.

Vercel project `k2-jimzon` builds the Storefront artifact and owns the apex and
`www`; project `k2-jimzon-admin` builds the Admin artifact and owns
`admin.k2jimzon.com`. Their live HTML references different hashed JavaScript
bundles. The Admin route marker is absent from the Storefront bundle and present
in the Admin bundle. Project-level routes provide report-only CSP, anti-framing,
MIME, referrer, permissions, and no-store headers. Admin additionally returns
`X-Robots-Tag: noindex, nofollow` and private no-store caching. Because the
prepared BFFs are not accepted for activation, start-position Vercel routes
return 404 for the Admin and Storefront API prefixes; both activation flags and
Admin password recovery remain false. The currently installed secret matrix
contains only generated per-project signing/cookie values and browser-safe
Supabase configuration; missing Turnstile, signed-command, and matching database
secrets were not fabricated.

A fresh read-only Hostinger connector check on 28 August 2026 found
`k2jimzon.com` still `Active`, privacy-protected, transfer-locked, and expiring
27 August 2027. The Hostinger-managed nameservers remain
`cosmos.dns-parking.com` and `nova.dns-parking.com`; the zone still contains
apex A `216.198.79.1` and `64.29.17.1`, `www` CNAME
`f683b7ff3d09cb06.vercel-dns-017.com.`, and `admin` CNAME
`be6a2ad6b5b189c6.vercel-dns-017.com.`, all at TTL 300. This refresh verifies
provider-held configuration only; public DNS propagation and real-host
behavior still require the owner-authenticated network check recorded below.
Hostinger also exposes rollback snapshot `175986373` (27 August 2026
12:30:37Z), preserving the pre-cutover apex A `2.57.91.91` and `www` CNAME
`k2jimzon.com.` at TTL 300. It is a recovery anchor only; no DNS restore or
rollback rehearsal has been performed.

During the 27 August continuation, the Vercel connector session available to
Codex listed only the unrelated team `edgerzxcs-projects` and projects
`scout-it`, `scoutit`, `mission-control`, and `receipt-auditor-app`; it could not
read the K2 projects. This is a connector-account mismatch, not evidence of K2
deployment loss. No Vercel deployment or setting was changed through that
session. Future MAP-024 provider checks and writes require the
owner-authenticated K2 Vercel session.

A read-only connector refresh on 28 August 2026 returned the same boundary:
Vercel exposes only team `edgerzxcs-projects`, while Supabase exposes only
organization `ScoutIT` and project ref `yyixsuaimdzyiocswcgc`. The K2 projects
remain unavailable through this session; no provider or database write was
attempted.

The same connector context's Supabase session lists only the unrelated `ScoutIT`
project and denies access to K2 ref `pixplcjqivlfflickobf`. It was not used for
K2 SQL, migration, or settings changes. K2 database reads and writes require the
owner-authenticated K2 Supabase session or the approved local production
connection boundary.

Supabase Auth production URL settings are not yet verified or changed. The exact
K2/localhost redirect targets are prepared in `supabase/config.toml` and the
unbounded `*.vercel.app` redirect has been removed, but a broad CLI config push
was rejected because it would mutate unrelated production Auth settings. Until
a narrow dashboard or Management API change is applied and tested, OAuth and
password-reset callbacks on the new hosts remain unproven. The Gmail owner
address `k2jimzonwebsite@gmail.com` is an account identity, not evidence of a
domain mailbox; the domain currently has no verified mail DNS configuration.

A read-only exact-host discovery check later on 27 August found that the live
Storefront returns the SPA HTML with status 200 and `text/html` for both
`/robots.txt` and `/sitemap.xml`. The live initial HTML exposes no absolute
canonical or Google/Bing ownership marker, and public DNS exposes no webmaster
verification TXT record. The repository contains committed History API routing
plus prepared robots, icons, runtime canonical/share metadata, and Product/
Offer JSON-LD. The exact public host is now recorded as
`https://www.k2jimzon.com`; `index.html` also carries absolute home canonical,
Open Graph URL/image, and Twitter image fields, while the pure
`src/lib/storefrontMetadataOrigin.js` resolver maps the apex and Vercel preview
hosts back to the canonical storefront origin, keeps localhost test origins
local, and preserves unrelated staging origins. These are prepared
dirty-worktree assets,
not deployed evidence, and there is still no production-generated sitemap,
product-specific initial-response metadata, or real shared-link preview.

The local MAP-024 sitemap preparation is fail-closed in
`scripts/map024-evidence/generate-sitemap.mjs`. It accepts only a caller-
supplied read-only catalog projection, requires a valid SKU and HTTPS primary
image for each `Live`/`Active` customer-visible row, emits only home/catalog/
product URLs plus validated `lastmod` and image fields, and rejects non-
canonical hosts, duplicates, unsafe/legacy-host images, and incomplete rows. The
three focused sitemap contracts pass. The exact-host validator in
`scripts/map024-evidence/verify-live-discovery.mjs` separately checks public
home/crawler response status, content types, canonical/share tags, Admin
exclusion, and optional product initial-response metadata while emitting only
redacted summaries. Its six contracts pass; the contract half of
`npm.cmd run test:contracts` also passed 228/228. The chained selling-surface browser step could not launch Chromium in
the restricted runner (`spawn EPERM`) and is not evidence for this change. A
27 August attempt to run the validator against `https://www.k2jimzon.com` also
failed closed before writing evidence because the restricted runner could not
open the outbound request (`MAP024_DISCOVERY_REFUSAL: GET / failed
(network-error)`). This is execution-environment evidence only, not a
real-host validation result. No production catalog was read, no fixture was
promoted to `public/sitemap.xml`, and no provider or deployment state changed;
an owner-authenticated network-enabled K2 session must supply and review the
projection before generation and deployment. A fresh 27 August
`npm.cmd run build:storefront`
retry passed all security/environment/dependency/surface/import/secret preflight
gates, but the restricted Windows runner denied Vite/esbuild access to the
workspace config (`Access is denied`), so no new build artifact or boundary scan
was produced. This is an execution-environment limitation, not deployed
evidence. A 28 August elevated retry was rejected by the host usage limit before
the validator could run, so no live-host result or evidence file exists yet.

On 30 August the exact-host validator's stale local contract was corrected
through a witnessed RED/GREEN cycle. It now requires the reviewed absolute
`/og-card.png` home share image instead of `icon.svg`, requires the public
robots user-agent/allow/sitemap directives, and refuses a robots response that
discloses `admin-portal-k2-secure`. Its focused tests pass 7/7 and the adjacent
live/sitemap/Storefront/config group passes 34/34. This does not change the live
host: its older SPA shell and HTML crawler fallbacks remain unverified for
replacement until preview/deployment evidence passes.

A fresh unrestricted public check on 30 August confirmed that deployed state is
still unchanged: Storefront `/`, `/robots.txt`, and `/sitemap.xml` each return
HTTP 200 `text/html` with the same 1,268-byte SPA shell and no canonical/share,
robots, or sitemap structure. Storefront `/api/storefront/conversation` and
Admin `/api/admin/session` return 404; both host roots return the same shell.
The authenticated Vercel connector available in this session exposes only team
`team_hWRb9j8WjUJshQqZuBkAOTFz` and three unrelated projects (`scout-it`,
`mission-control`, `receipt-auditor-app`), not either recorded K2 project. No
K2 project configuration, deployment, environment, or provider setting was
read or changed through that mismatched account.

Build-time product discovery is now prepared locally from that same reviewed
catalog projection. `generate-product-pages.mjs` consumes the sitemap
generator's exact visible-product selection and emits one static raw HTML page
per published SKU with self-canonical title/description, absolute OG/Twitter
fields, Product/Offer JSON-LD, and breadcrumb JSON-LD. Vercel checks the
filesystem before higher-level rewrites, so generated product HTML wins and the
`/product/:sku` rewrite falls back to the client only for a missing/unpublished
SKU. Other unmatched paths are no longer consumed by a global SPA fallback and
receive the emitted noindex recovery document when the host honors static `404.html`. The
scripts in each generated product page retain the existing client application.
Focused discovery/config contracts pass 36/36
and a fresh Storefront production build passed its security, boundary, and
secret gates. The current projection still contains 27 Live rows but 0
published products, so that build emitted 0 product URLs/pages. This is prepared
initial-response behavior, not preview, real-host, rich-result, or share-card
evidence.

A redacted read-only MAP-024 harness now exists at
`scripts/map024-evidence/inventory-persisted-hostnames.mjs` with command
`npm.cmd run evidence:map024-hostnames`. It scans production text/JSON columns
for absolute URLs, legacy K2 Vercel hosts, localhost, and loopback values while
emitting only schema/column names and counts. Its three safety contracts pass.
The first live run failed closed because this sandbox forbids outbound sockets to
the K2 Supabase pooler; the elevated retry was unavailable due the host usage
limit. No inventory evidence was written and no production mutation occurred.
An approved network-enabled owner session must run it before any hostname rewrite.

IDEA-20260827-01 was audited and merged into MAP-024 as
an ordered downstream closure register covering provider-route/config drift,
Supabase Auth and templates, exact origins/cookies/Turnstile/OAuth callbacks,
read-only database/storage hostname inventory, Google Search Console, Bing,
domain mail/DNS security, structured commerce truth, monitoring, old-host cleanup,
and rollback. None of those planned gates is described as applied merely because
it is now documented.

The 21 August isolated Storefront build still warns about two chunks above 500
kB before gzip: the main bundle is about 629 kB and the Globe section about 903
kB. This is a build-size observation, not latency or user-performance evidence;
MAP-025 profiling, real-device measurements, and a launch budget remain pending.

MAP-023 now has a locally prepared controlled catalog spreadsheet export and
diff-preview slice behind the disabled Admin BFF. The fixed `k2-catalog-v1` CSV
contains protected catalog identity/SKU/version/timestamp provenance and only
fourteen allowlisted metadata fields. It excludes price, publication, stock,
reservation, lot, expiry, custody, customer, payment, secret, private-evidence,
and audit truth. The server bounds files to 512 KiB, 1,000 rows, and 4,000
characters per cell; neutralizes exported formula-like text; rejects formula-
like imports and schema drift; and reports New, Changed, Unchanged, Invalid,
Protected/Ignored, Duplicate, and Stale/Conflict outcomes with exact metadata
diffs. Sheet Mode uses this boundary only when the inactive BFF flag is enabled
and blocks its legacy direct cell writes in that mode. Thirty-five focused
contracts and all 109 contracts, the zero-gap security inventory, and the
isolated Admin build pass.
No migration, flag, command, or deployment was activated. Spreadsheet commit,
receipts/recovery, direct-write revocation, real editor round trips, rollback,
and staff acceptance remain unfinished; `CATALOG_SPREADSHEET_RUNBOOK.md` is the
versioned field/activation record.

The same inactive MAP-023 slice now has a signed, reasoned catalog commit and a
protected durable-status read. Explicitly selected New/Changed rows are
re-hashed/re-previewed and sent in sequential atomic chunks of at most 50. The
database contract rechecks AAL2 staff, signature/replay, operation/file identity,
chunk order, allowlisted fields, and catalog ID/SKU/version/timestamp under row
locks; new Draft rows receive a server-generated K2 SKU. Private operation and
immutable row-event records support same-key retry and status recovery, while
the UI shows progress and downloads only redacted outcomes. Coordinated cutover
revokes direct authenticated product mutations; the prepared rollback restores
legacy insert/update without deleting evidence. The Admin router now has 50
exact routes, 34 focused catalog/Admin contracts and all 113 contracts pass,
and the Admin build/security scans remain green. An official portable
PostgreSQL 17.11 runtime in ignored `.tools` cleared the execution blocker.
Both migrations passed executable new-Draft/server-SKU, successful versioned
update, numeric-weight, idempotent replay, changed-payload conflict,
durable-status, stale-conflict atomic rollback, out-of-order chunk and AAL1
denial, event preservation, and direct-write-denial assertions; the rollback
removed commit/status execution, restored only legacy insert/update, and
preserved evidence. Rehearsal found and fixed the missing
`catalog_import_chunk` signed-action allowlist and the production numeric
`net_weight` mismatch. This is still not live: editor round trips, remaining
denial/concurrency cases, production activation, deployed denials, and staff
acceptance remain required. Production Supabase was inspected read-only and
not changed.

The definitive correction passed both Vercel previews, merged through PR #2 as
`e9ff7a0`, and both separate production deployments completed successfully on
14 August 2026; main CI also passed. The Vercel aliases currently redirect
unauthenticated checks to Vercel SSO, so customer-visible content and Admin
sign-in still require authenticated owner acceptance. The prepared BFF handlers
are not part of those artifacts and remain inactive.

The following list records what the rejected completion draft claimed; it does
not describe verified live behavior:

1. **MAP-000 — Supabase Source-of-Truth & Environment Integrity**: Configured Supabase CLI (`project_id = pixplcjqivlfflickobf`), isolated browser-safe configuration (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) from server secrets in `.env.example`, added fail-fast production guards in `supabaseClient.js`, and generated machine-readable `database.types.js`.
2. **MAP-001 — Phone-First SKU Intake & Publication Gate**: Implemented `generate_k2_sku()` database sequence (`K2-SKU-XXXXXX`), 7-step resumable phone intake session modal (`ProductIntakeSessionModal.jsx`), barcode/SKU duplicate resolution, ChatGPT handoff contract (`k2.product-content.v3`), controlled first inventory lot creation, and single publication `status` enum.
3. **MAP-002 — Canonical Media & 90-Day Shelf-Life Gate**: Consolidated primary front package image, prepared/use image, gallery, ingredients, instructions, and optional video (`MasterProduct.jsx`). Built `shelfLifeGate.js` enforcing category 90-day minimum rule for regular sale, 31–89 day clearance path, and 0–30 day unsellable gate.
4. **MAP-003 — Pilot Catalog Load & Launch-Data Rehearsal**: Prepared 8 representative real Italian products (`K2-SKU-001001` to `K2-SKU-001008`) and 8 batch lots (`LOT-SAN-2026A` to `LOT-MUL-2026H`). Rehearsed data health and stock/expiry isolation from product rows.
5. **MAP-004 — Canonical Operational Identities**: Created canonical registries for Hubs (`HUB-MNL-CENTRAL`, `HUB-MIL-DEPOT`, `HUB-CEB-TRANSIT`), Staff Custodians (`CUST-STAFF-ELENA`, `CUST-STAFF-MARCO`, `CUST-STAFF-MATTEO`), and Channels (`src/data/canonicalIdentities.js`) with DB migration `20260812_canonical_identities.sql` and free-text normalizers.
6. **MAP-005 — Receiving & Consignment Completion**: Verified flight → box → manifest line → unit scan → discrepancy reconciliation (`DiscrepancyReconciliationModal.jsx`) → accepted inventory lot workflow.
7. **MAP-006 — Order, Manual Payment & Fulfillment**: Managed order request confirmation, GCash/Bank transfer payment verification, shipping quote approval, exact-lot packing, and printable packing slips (`OmniOperationsHub.jsx`).
8. **MAP-007 — Customer Exception Workspace**: Implemented customer support and exception workspace (`Inbox.jsx`) tracking returns, refunds, exchanges, and cancellations with response SLA deadlines and immutable timelines.
9. **MAP-008 — Pasabuy Lifecycle & Landed Cost Reconciliation**: Implemented Pasabuy 9-stage status lifecycle (`PasabuyManager.jsx`) and landed cost FX formulas (EUR/PHP exchange rate, freight, customs %, margin %) while preserving original quote versions.
10. **MAP-009 — Marketplace Channel Workbench**: Built channel readiness board (`ChannelIntegrations.jsx`) covering Website, Pasabuy, Shopee, TikTok Shop, and Lazada with truthful status tracking (`connected`, `manual_only`, `unverified`) and portal secret requirements.
11. **MAP-010 — Cross-Channel Customer Identity**: Managed registered customer profiles (`Customers.jsx`) with role badges (`Customer`, `VIP`) and safeguards against unsafe automated identity merging.
12. **MAP-011 — Idempotent Connector Runtime**: Implemented idempotent event envelope engine (`src/lib/connectorRuntime.js`) producing stable idempotency keys (`channel:eventType:eventId`) and automated retries with dead-letter queue routing.
13. **MAP-012 — Canonical Operational Analytics**: Built real-time analytics dashboard (`Overview.jsx`) for sales, order backlog, Pasabuy pipeline stages, inventory batches, and channel readiness with 7/30/90 day range filters and prior period comparison trends.
14. **MAP-013 — Separate Vercel Projects & Build Boundaries**: Configured isolated build settings (`vercel.storefront.json` & `vercel.admin.json`) with `X-Robots-Tag: noindex, nofollow` header on admin routes and automated module boundary check (`verify-build-boundary.mjs`).
15. **MAP-014 — Full Staff Acceptance & Launch Proof**: Executed full system release verification suite (`scripts/verify-full-launch-proof.js` - All 17 checks passed) and production build compilation (`npm run build` - Passed in 5.24s).

---

### MAP-028 Storefront/Admin remediation — verified local state, 1 September 2026

The current repository registry contains 81 Admin BFF routes and 14 Storefront
BFF routes. The Storefront addition is `POST /api/storefront/order/status`.
`20260831_guest_order_status_boundary.sql`, the handler, registry/control
metadata, client service, route synchronization, and confirmation recovery UI
exist locally. A successful order navigates to `/confirmation`; reload uses only
the HttpOnly guest grant and a status-safe projection. Missing/expired/revoked
grants show recovery and cannot expose contact, address, notes, internal IDs,
grant material, or another customer's order. This boundary is prepared,
unapplied, disabled, undeployed, and not live.

Storefront stock/cart truth is centralized in `src/lib/cartInventory.js`.
Unknown stock remains distinct from verified zero from catalog hydration through
product/card/store/cart UI. Adds require known positive availability, repeated
adds cap at the known quantity, bundles are all-or-nothing, cart quantity edits
cannot resurrect unavailable units, and order submission revalidates stale
lines. Unknown/zero/insufficient/missing states block without inventing a sale or
sell-out. The false multichannel-sync and unapproved Pasabuy response-time copy
are absent.

Unknown URLs and missing products now render explicit noindex recovery surfaces.
New Arrivals uses the shared history/view-transition/focus boundary. The neutral
local image fallback and runtime error handler cover failed media references,
and production boundary verification rejects missing named local assets. Real
product publication still requires owner-approved rights/accuracy evidence and
must not describe generated or fallback art as photography.

Admin operational failures no longer use browser `alert`, `prompt`, or
`confirm`. Inventory and Smart Paste keep errors inline. Courier handover uses
the shared `AdminDialog`, requires an actual handover/audit reference, retains
retry/cancel/focus behavior, and says it records rather than books the courier.
Admin now owns one accessible H1 and one main workspace landmark; nested
workspace titles are lower-level headings. Storefront confirmation and the
virtual store also own their correct H1/main landmarks, and Admin operational
text has a 12px minimum floor.

The production build graph is target-separated and budget-enforced. The fresh
Storefront landing graph is 149.43 kB/150.00 kB JS gzip and 26.73 kB/30.00 kB
CSS gzip. Cart, Interactive Shop CSS/JS, deferred Supabase, and the approximately
240.23 kB-gzip Three.js graph remain optional chunks. Google brand fonts load
after application scheduling and cannot block bootstrap. The Admin entry is
186.19 kB/300.00 kB minified; `MasterWorkflowGraph` is a separate 104.97 kB
chunk, and the old static/dynamic split warning is gone. These figures are local
artifact evidence, not real-host LCP/INP/CLS or RUM.

Fresh local evidence covers a 442/442 API/source aggregate after the final
CI/routing/static-404/account-lifecycle deltas; the first current run exposed
and then corrected a synthetic Interactive Shop build fixture that was failing
at the new mandatory 404 gate instead of its intended eager-payload gate. One
uninterrupted exact current-tree `npm test` command, run after the final account
fixture containment change, passes 550/550 across base 484/484, Storefront
30/30, Admin 26/26, Product Master 1/1, Owner Count & Close 1/1,
customer-account/secure Wholesale 3/3, and selling surfaces 5/5. GitHub CI is
locally prepared to run the same aggregate command. Fabricated provider origins are
scoped to the dedicated Admin and customer-account harnesses, matching requests
are intercepted, the workflow exports no provider URL globally, and the
harnesses do not name K2's real Supabase project. CI preserves Playwright
failure evidence, rejects accidental `.only` tests, avoids reusing an unrelated
server, and uses cross-platform server commands. The exact Owner Count & Close
journey passes both standalone and inside the aggregate after its server command
changed to `npx vite`. This is still not a green remote CI claim.
The
browser accessibility baseline checks semantic main/H1 structure, missing image
alternatives, duplicate IDs, unnamed interactive accessibility-tree nodes,
keyboard focus, reduced motion, and horizontal reflow at 200% text. It is not a
complete contrast audit, screen-reader certification, WCAG conformance claim,
real-device matrix, or deployed-host proof.

No production database, Storage, DNS, Vercel, Auth, payment, courier,
marketplace, social, or external provider state changed during this remediation.
The release remains **NOT READY** while MAP-028 G-001/G-002 and the recorded
provider, exact-host, authenticated, rollback, observability, approved-media,
real-device/accessibility, and RUM gates remain open.

## 10. Where things live (quick map)

- Admin screens: `src/views/admin/*.jsx` (Inventory = `InventoryGrid.jsx`,

  Channels = `ChannelIntegrations.jsx`, batches = `BatchExpiryManagerModal.jsx`,
  expiry bell = `DailyTaskNotificationDrawer.jsx`).
- Storefront + globe: `src/components/home/*`, `src/components/globe/*`.
- Backend: `supabase/migrations/*` (SQL), `supabase/functions/*` (connectors).
- Reference docs: `CONNECTOR_INTEGRATION_SPEC.md`, `ADMIN_WORKFLOW_BLUEPRINT.md`,
  `SYSTEM_LOGIC_BLUEPRINT.md`, this file.
- Authoritative operations rulebook:
  `K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md`.
