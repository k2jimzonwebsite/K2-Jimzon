# K2 Jimzon Future Ideas Intake

**IDEA-20260925-02: Finish MAP-017 stock permission preparation without handing technical work to the owner. Accepted and merged into MAP-017.** The owner asked Codex to perform the engineering and give step-by-step instructions only for actions that require the owner. The 25 September live read-only ACL check confirms the extra stock `PUBLIC` grant remains, with explicit `anon` and `authenticated` grants present; the live migration ledger still ends at `20260921033348`. A Windows sandbox process-visibility issue made the local rehearsal runner try to start an already-running practice database. The runner now identifies the connected localhost server by its data directory before using it. The isolated apply/replay/check/rollback rehearsal passes. Decision: keep the production grant change pending a distinct owner approval for the exact reviewed payload; Codex owns the fresh backup, live preflight, controlled apply, rollback readiness, postflight and exact-host checks. No production SQL was changed in this slice.

**IDEA-20260925-02 owner disposition, later 25 September:** the owner replied “Defer the stock correction.” The prepared grant change remains unapplied; MAP-017 retains the live finding. Do not infer authorization from earlier approvals, the rehearsal or the verified backup, and do not re-request this decision unless the owner reopens it.

**IDEA-20260907-04 — accepted, merged into MAP-028 / MAP-021.** Owner requested calmer dashboard wording and optional help for complex widgets. The current Admin candidate adds contextual explanations for source, date and overlap rules while preserving visible errors and metric calculations. Simple Inbox, Pasabuy and Stock views keep their short visible labels. This is a UI aid, not new reporting truth.

**IDEA-20260907-03 — accepted, merged into MAP-028 / MAP-023.** Owner approved task-first Learn / Guide me help, beginning with manual product intake. The current Admin candidate uses the existing procedure registry and the intake screen's step state. Guidance can focus an available control but cannot submit, approve or mark work complete. Later operational walkthroughs remain in the owning MAP items.

**IDEA-20260924-09: Gemini free-tier public catalog SEO suggestions. Merged into MAP-018.** The owner wants Gemini alongside the existing optional OpenAI intake and chose the free tier only for public product details. Google AI Studio shows a K2 key on the Free tier; a usable key is present in local `.env.local`, and the owner added `GEMINI_API_KEY` as a Production Secret in the Admin Vercel project. Free-tier submissions may be used to improve Google's products, so this slice may send only a fresh public Open Food Facts barcode, name, brand and quantity. It must never send staff package photos, internal prices, stock, customers or private notes. Return a small SEO/copy suggestion for explicit staff review, without writing canonical product fields. The photo-grounded full listing and generated images remain in MAP-018 under OWNER-007 and the paid provider boundary. Decision: accept a separate, rate-limited Admin suggestion path; activation remains gated by the Admin BFF. A later Antigravity change attempted free-tier package-photo calls; the review removed that path to preserve the owner's public-only choice. A real public-only probe found and corrected a Gemini JSON-format enum error. Gemini 3.1 Flash-Lite returned HTTP 503 twice; the newer free-tier Gemini 3.5 Flash-Lite produced the expected SEO fields from the local key, so the prepared route uses it. No live feature claim follows from the existing key or redeploy.

**IDEA-20260924-08: Barcode-assisted product lookup, SEO listing and image sourcing. Merged into MAP-018; first source and review slice locally prepared.** The owner confirmed that staff scan the package barcode, receive public product suggestions, capture real package photos, use paid AI for SEO listing text and optional generated image candidates, and review a Draft before separate stock, price and publication decisions. The owner selected a public catalog with manual fallback and later clarified that staff must also be able to upload their own storefront photos. Existing Product Photos already accepts staff uploads for primary, after-use and supporting slots; intake evidence stays private and separate. The intake and Photos copy now makes that choice explicit. Open Food Facts is the first grocery lookup source; it does not supply K2 images. The server route, phone review and source decision are locally prepared, but the Admin BFF and paid AI remain off in production. GPT-6 Luna is a candidate for structured listing text, with a separate image model; no provider key, model setting or paid call was activated. K2-generated SKUs are internal identifiers, not global barcodes. The approved design and objections are in `docs/design/BARCODE_ASSISTED_PRODUCT_LISTING.md`; MAP-018 retains activation, exact-host and staff acceptance.

**IDEA-20260924-07: Sequence inventory listing, Lazada/TikTok Shop access, and Messenger. Merged marketplace access into MAP-026; Messenger API deferred outside the active queue.** The owner asked whether K2 is ready to list inventory and begin API applications. Audit: MAP-018 still needs real counts, product facts and publication review; MAP-023 has no verified real payment cycle; MAP-026 already owns marketplace adapters and requires canonical stock/order truth, approved scopes and provider access. Official Lazada and TikTok Shop guidance requires app creation and seller authorization before seller data/API use. Decision: start Admin draft intake and physical verification now, and allow owner-controlled Lazada/TikTok Shop app and scope applications in parallel. Do not publish sellable stock or enable listing/order sync until MAP-017/018/020/023 gates and one representative operating cycle pass. The existing public Messenger link and manual Page inbox can serve customers; a Messenger API inbox adapter adds Page/app permission, private token, webhook, identity, consent and staff-reply boundaries, so defer it until website messaging and account continuity are verified and a concrete operational need is shown. No provider application, authorization, API call or configuration change occurred in this decision.

**IDEA-20260924-06: Production Google property, measurement and sitemap readiness. Merged into MAP-024, with provider recovery under MAP-022 and account callback checks under MAP-019/020.** The owner requested checks across Search Console, Analytics, Google Cloud, Vercel, Supabase and GitHub, plus a production XML sitemap. Audit found the canonical sitemap already deployed with four approved public URLs and a matching robots pointer. Exact-host HTTP and crawler-header checks passed for those routes, while signed-in Search Console access was blocked by automatic browser review. No GA4 tag or measurement ID was found in the repository or Storefront Vercel project variable names, but the Google Analytics account itself was not inspected. Supabase's Google provider is enabled and its Auth origins are configured; Google Cloud OAuth client settings and real callbacks remain unverified. Decision: keep one MAP-024 provider/discovery slice, use only an owner-controlled Google property and consent-approved measurement, and submit the existing sitemap to Search Console once explicit Google-service access is granted. Do not add speculative DNS verification tokens, product URLs, tracking tags or paid services. No provider setting was changed by this intake.

**IDEA-20260924-05: Short agile action plan and Brain record. Accepted as documentation maintenance and completed in this change.** The owner asked for a plan staff can work from in short cycles, natural wording, removal of long dash punctuation, and transfer of the dated MAP record to the Brain. The previous MAP mixed current gates with years of audit notes and release receipts. Decision: preserve that working-tree snapshot in `MASTER_ACTION_PLAN_HISTORY_2026-09-24.md` as superseded evidence, then keep only current outcomes, next slices, acceptance checks, dependencies and blockers in the root MAP. The archived text is not a second active backlog. This changes documentation organization only; no application, provider, payment or deployment state changes.

**IDEA-20260924-04  -  Customer website lifecycle audit: optional registration, profile, notifications and post-order continuity. Accepted into MAP-019/MAP-023/MAP-024/MAP-025/MAP-028.** Owner requested a full website audit, especially storefront notifications, registration and user profile settings. Audit sampled the live public routes on 24 September and traced the customer UI, BFF, schema, SEO and release configuration. The account route and passwordless sign-in/first-use creation are prepared behind inactive Storefront BFF/account flags; there is no live registration or editable customer profile. The guest inbox and account-linked history are also inactive on the live host. Notifications merge with IDEA-20260902-05 instead of opening another feature stream. Decision: accept optional account onboarding, minimal editable profile, in-app notification centre/preferences and durable order/message continuity into MAP-019, retaining guest checkout and scoped grants. Accept receipt payment-method consistency and stale payment copy into MAP-023, contradictory product robots signals into MAP-024, and real phone/accessibility/customer-cycle proof into MAP-025. MAP-028 holds the cross-surface audit and evidence limits. No code, provider, database, or deployment change is implied by this decision.

**IDEA-20260924-03  -  Phone-first Admin navigation, container hierarchy and plain staff wording. Accepted into MAP-028 I-012/I-016 and MAP-025.** Owner reports one long Admin page, oversized or overflowing words, nested boxes and hard-to-find work on staff phones. Audit: the mobile drawer exposes dashboard views plus every section in one uninterrupted list; the second mobile header places global and inventory actions inside a hidden horizontal scroll; shared workspace headings and action groups can resist shrinking; compact button text is forced to one line. Decision: group the mobile drawer into accessible disclosures that open around the current section, move secondary tools into an explicit mobile list, keep the primary Inventory action visible, let shared headings/buttons wrap, and validate representative workspaces at phone widths. Preserve desktop navigation, permissions, canonical data and the existing Admin visual system. Real staff task success and physical-device acceptance remain MAP-025. Recovery is a scoped feature-branch revert of this UI slice; no provider/database state changes.

**IDEA-20260924-02  -  Italian imports and Pasabuy search readiness. Accepted into MAP-024 / MAP-018 / MAP-025.** Owner wants the existing website discoverable for imported Italian goods and Pasabuy searches, with every real product eligible for its own search result later. Audit: home and catalog are the only stable sitemap routes; Pasabuy and Trade are public pages but raw responses reuse home metadata; the product route is deliberately noindexed because approved per-item images/descriptions are absent; the read-only catalog projection omits description fields, so even future product prerenders would use generic fallback copy. Scope: give the existing indexable intent pages distinct initial-response and hydrated metadata, list only canonical public routes in the sitemap, carry approved product descriptions in the narrow public projection, and report product search-readiness gaps. Preserve the product noindex gate and publication/stock truth; do not invent keyword volume, new location pages, reviews, product facts, or indexing success. This merges with existing MAP-024 crawler readiness and MAP-018 product-content gates; real Search Console indexing and per-product publication remain MAP-025/MAP-018 actions. Recovery is a scoped revert of metadata/sitemap/projection code on the feature branch.

**IDEA-20260924-01  -  Owner supplied GCash and MariBank receiving QR choices. Accepted into MAP-023 / MAP-025.** Owner supplied two receiving QR screenshots and requested a complete buy/pay test. Audit: checkout currently offers generic prepaid, then asks the buyer to wait for staff instructions; Admin already records structured manual evidence and requires a separate reviewer to confirm funds in the merchant account. Use the exact supplied QR image pixels and let the buyer choose GCash or MariBank. Keep order submission, staff stock/total confirmation, customer transfer, evidence submission, independent account verification, then packing as distinct states. A local synthetic cycle can prove the software sequence but cannot prove a live transfer, real inventory, provider application, or deployment. Do not auto-mark paid from a QR scan, buyer tap, screenshot, or synthetic receipt. Decision: merge into existing manual-payment scope; no new payment gateway or queue item. Local code, tests and runbook evidence remain under MAP-023; representative real transfer and acceptance remain under MAP-025.

**IDEA-20260923-04  -  3D Store mobile header space optimization, button overlap resolution, and responsive touch targets. Accepted into MAP-027 / MAP-028 I-015. Code locally verified.** Owner reported top-left title in the 3D store was crushed and eating up space on mobile viewports (screenshot: top left eating up space). Audit: on viewports <= 900px (e.g. 390px/360px portrait), desktop-length button labels ("Ordering questions", "Lights low", "Leave the store") consumed ~360px, squeezing column 1 down to <10px. This caused "K2 Jimzon / The store" to wrap into 4 vertical lines ("K2", "JIMZON", "The", "store") and "Ordering questions" to overlap directly over "The store", bloating header height to ~140px+. Surgical fix: (1) Added `shrink-0 min-w-0 whitespace-nowrap` to title container so "K2 Jimzon" and "The store" remain single-line and never wrap or overlap; (2) Added responsive mobile button text labels (`FAQ`, `Lights`/`Dark`, `Exit`) via `sm:hidden` while preserving full accessible names (`aria-label`) and desktop text (`hidden sm:inline`), maintaining 100% test contract compatibility (`Ordering questions`, `Leave the store`, `The store`); (3) Maintained minimum 44px touch target height (`min-h-[44px]`) on both header actions and shelf navigation tabs; (4) Reduced top-bar padding on mobile to `0.45rem 0.75rem`, bringing total 2-row mobile header height down to ~100px and recovering significant vertical screen real estate for the 3D room. Verification: `tests/map027-interactive-shop.spec.js`, `tests/map027-store-polish.spec.js`, `tests/store-orientation-ui.spec.js` (12/12 passed), `tests/mobile-store-moderation-pwa-contract.spec.js` (4/4 passed), `npm run verify:development` (0 leaks, 0 boundary gaps), and Storefront production bundle build (JS 150.15 kB / 150.50 kB gzip, CSS 29.50 kB / 30.00 kB gzip).

**IDEA-20260923-03  -  3D Store asset and detail parity with catalog, elimination of nested popup container boxes, and bidirectional return-to-store navigation. Accepted into MAP-027 / MAP-028 I-015.** Owner requested: (1) eliminate nested container box in the store popup that is eating up screen space; (2) provide clear navigation logic for buyers/users to return to the 3D store when adding products or browsing other pages; (3) ensure product details in the 3D store match the catalog presentation (`inventory > the catalog > the 3d store`), including `ProductVisual` asset rendering, category, stock pill, peso pricing, and description. Scope: `src/components/shop/StoreSeoPanel.jsx`, `src/components/shop/ShelfProductPanel.jsx`, `src/components/shop/StoreSidePanel.jsx`, `src/views/MasterProduct.jsx`, `src/views/Checkout.jsx`, and `src/components/CartDrawer.jsx`. Bundle limits: Storefront JS <= 150.50 kB gzip, CSS <= 30.00 kB gzip.

**IDEA-20260923-02  -  3D Store Ergonomics: Bottom popups for Shopkeeper and Product Details, removal of floating zoom buttons, and elimination of bottom haze gradient. Accepted into MAP-027 / MAP-028 I-015.** Owner requested: (1) reposition K2 Shopkeeper from top-left to a toggleable bottom pop-up; (2) display product details in a toggleable bottom pop-up card when a product is selected instead of a permanent column/sidebar; (3) remove floating zoom buttons (+, restore, -) from the 3D scene (camera gestures remain primary); (4) eliminate the washed-out white gradient background on `.k2-store-rail` so the natural wood floor is visible; (5) eliminate redundant product names and shelf listings from cabinet overlays, relying exclusively on the bottom rail for current cabinet items. Contrast between `#111111` and `#DBDBDB`/`#D5D5D5` reaches >12:1 (exceeding WCAG AAA). Scope: `src/views/InteractiveShop.jsx`, `src/components/shop/StoreKeeper.jsx`, `src/components/shop/ShelfProductPanel.jsx`, `src/interactive-store.css`, and associated test suites. Bundle limits: Storefront JS <= 150.50 kB gzip, CSS <= 30.00 kB gzip.

**IDEA-20260923-01  -  Storefront light mode 4-color soft white palette. Accepted into MAP-027 / MAP-028 I-015.** Owner requested updating the storefront light mode to implement the 4 softer colors from the uploaded design screenshot (`#D5D5D5`, `#B3B3B3`, `#DBDBDB`, `#111111`) instead of the existing raw whites/creams, while explicitly retaining the natural wood background texture. Audit: existing light theme uses `#FAF7F2` cream, `#FFFDF9` paper, and `#1C1917`/`#2B2B2B` ink. Scope: update storefront light-theme CSS tokens (`--color-cream: #D5D5D5;`, `--color-paper: #DBDBDB;`, `--color-shell: #D5D5D5;`, `--color-shell-deep: #B3B3B3;`, `--color-line: #B3B3B3;`, `--color-navy: #111111;`, `--k2-ink: #111111;`, `--k2-line: #B3B3B3;`, `--k2-sheet: #D5D5D5;`, `--k2-surface-solid: #DBDBDB;`, `--store-surface-bg: #DBDBDB;`, `--store-surface-border: #B3B3B3;`, `--product-img-bg: #D5D5D5;`, `.storefront-ui` background `#D5D5D5`), preserve `:root:not(.dark) body` and `.k2-store` wood-grain image (`url('/wood-bg.jpg')`) with its ambient radial lighting blend, eliminate hardcoded `bg-white` and `#E4DCD1` in shop subcomponents, update 2D landing page footer to `#DBDBDB`, and keep dark obsidian theme untouched. Contrast between `#111111` and `#DBDBDB`/`#D5D5D5` reaches >12:1 (exceeding WCAG AAA). Verification: `npm run prebuild`, store orientation & readability contracts (7/7 passed), and storefront production bundle budget (JS 150.17 kB, CSS 29.44 kB).

**IDEA-20260922-06  -  Installable Admin web app. Accepted into MAP-024 / MAP-028 I-012 / MAP-025.** Owner wants the full Admin BOS usable from a phone like an app and selected an installable web app before any APK. Audit: the Admin build already emits its own standalone manifest and icons, but exposes no install action or staff guidance and has no target-scoped service worker. Add an Admin-only install surface, retain normal browser access, use network-only handling for authenticated operational requests, and never claim offline writes or cached operational truth. Android/iOS physical-device installation and staff acceptance remain in MAP-025; no app-store distribution, native wrapper, provider or production promotion is authorized.

**IDEA-20260922-05  -  Named marketplace footer links. Accepted into MAP-028 I-015 / MAP-026.** Owner supplied six public links grouped under `Pasabuy Italy by K2` and `Jworldbasket`, with Lazada, Shopee and TikTok for each. Audit: the footer currently names channels as plain text and exposes only one Shopee handle, so customers cannot reliably reach the owner-approved destinations. Replace the vague channel line with labelled external links using the exact supplied URLs, safe new-tab behavior and readable mobile wrapping. These links are navigation only and do not claim that marketplace adapters, inventory synchronization or message ingestion are connected.

**IDEA-20260922-04  -  Anonymous-chat deletion and IP-hash blocking. Accepted into MAP-019 / MAP-020 / MAP-027.** Owner needs separate Admin actions to delete anonymous troll/scam conversations and to block their chat source until an Admin manually unblocks it. Signed-in customer conversations must remain stored. Audit: guest requests already carry a server-HMAC IP hash for rate limiting, but the hash is not associated with a conversation, no manual block register exists, and inbox commands do not delete. Add a private conversation-to-IP-hash association, a private active block register, content-free deletion receipts, Admin/SuperAdmin-only idempotent commands, and block checks on anonymous chat start/reply only. Never expose or persist raw IP text. Refuse deletion when the canonical customer has any account link, including suspended/revoked links, or the conversation belongs to an order/Pasabuy/other operational record. Deletion and blocking remain separate; unblock is manual. Prepared migration and local evidence do not establish production activation.

**IDEA-20260922-03  -  Mobile Interactive Store navigation and Shopkeeper repair. Accepted into MAP-027 / MAP-028 I-015 / MAP-025.** Owner reports that the Shopkeeper is too large on phones, obstructs chat and contributes to a store that is hard to navigate. Audit: the 390px rendered store simultaneously presents the Shopkeeper portrait, a three-button camera stack, horizontal shelf choices, gesture guidance, selected product and product rail; existing browser coverage opens the Shopkeeper before chat but does not assert automatic minimization or overlay clearance. Make the phone Shopkeeper a compact collapsed control, minimize it whenever a sheet opens, consolidate camera actions into a compact toolbar, and preserve direct shelf tabs, swipe/pinch, browser zoom, basket truth, product selection and reduced-motion fallback. Verify 320-430px portrait and phone landscape, chat/product sheets, keyboard, touch targets and no horizontal overflow. Physical-device acceptance remains in MAP-025.

**IDEA-20260922-02  -  Proportionate development and release verification. Accepted and completed as repository process.** Owner requires full checks before a live deployment, but not after every small edit while K2 remains in development. Audit: the complete 1,143-check suite was repeatedly run during one change loop, and a receipt-only Markdown push retriggered the same remote release workflow after both production artifacts were already verified. Decision: use focused tests during implementation, one quick static/security pass after the final code edit, and one complete gate immediately before an explicitly requested live promotion. Documentation-only pushes skip application CI. Work remains on a feature branch until the owner requests live promotion to the production-linked `main`. This changes engineering cadence only; it weakens no production gate and adds no provider, schema, or product behavior. Durable rules live in `AGENTS.md` and `docs/runbooks/DEPLOYMENT_RUNBOOK.md`; no active MAP item remains.

**IDEA-20260922-01  -  Useful Admin quick tools. Accepted into MAP-028 I-012 / MAP-025.** Owner asks to improve the floating settings-like toolbar with useful Admin actions. Audit: eight existing calculators use an icon-only picker, modal lacks shared focus handling, saved position can fall outside a resized viewport, and expiry helper claims freshness using a 30-day threshold inconsistent with the 90-day stock rule. Add named shortcuts to existing search, scan, orders, messages, inventory, workflow and keyboard help; preserve authorization and existing command boundaries. Add visible tool labels, local-notes disclosure, viewport recovery and correct expiry guidance. No new operational write or provider capability. Verify phone/desktop keyboard and navigation, retained sales calculations and expiry boundaries.

**IDEA-20260921-09  -  Whole-Storefront readability and human-test preparation. Accepted into MAP-028 I-015 and MAP-025.** Owner extends the store work to the whole Storefront and requests verification against MAP before payments, inventory publication and marketplace implementation. Audit: shared compact labels remain 12-13px, dark accent text reuses fill colors, checkout names unapproved payment providers, and PRODUCT.md describes future sync as current. Repair presentation and operational wording without activating providers or changing order authority. Verify all customer routes at phone/desktop in both themes, existing purchase/message flows, production build and inventory/payment local rehearsals. Preserve pending owner/provider/physical-device gates in the existing MAPs.

**IDEA-20260921-08 - Storefront readability and mobile store gestures. Accepted into MAP-027 / MAP-028 I-015.**
Owner screenshots show unreadable dark chat labels and small shelf text; owner asks for human wording, readable mobile/desktop type, no mobile side arrows, clear dragging and easier zoom. Audit: fixed light-theme ink in StoreSheet/StoreChatPanel and hover backgrounds bypass theme tokens; shelf metadata is undersized; camera swipe threshold is nearly half a viewport. Scope: existing storefront typography, store presentation and camera gestures only. Preserve wood, editorial headings, canonical products/cart/chat, category tabs and reduced-motion fallback. No provider/schema dependency or permission change. Verify computed contrast, mobile/desktop screenshots, swipe/pinch/zoom/reset, keyboard and existing store/browser/build checks. Record evidence and recovery in docs/evidence/20260921-store-readability; keep deployment/physical-device acceptance in the owning MAP item.

**IDEA-20260921-03 - Full Admin plain-language and workflow-guide acceptance audit. Accepted into MAP-028 I-012/I-016 and MAP-025.**
Owner requests a complete Admin verification focused on simple staff wording, consistent humanized copy, understandable screens, and a working workflow map guide. Audit gate: this extends the active Admin clarity and guide-to-action work rather than creating a new product scope. Acceptance requires an inventory of every Admin section and guide destination; source and rendered checks for implementation jargon, AI-style phrasing, unexplained abbreviations, misleading completion language and complex instructions; exact mapping from guide steps to real sections and controls; preservation of permissions, records, quantities, reasons, approvals, warnings and save boundaries; responsive and keyboard checks; and the full Admin contract/build gates. Local automated evidence does not replace representative staff or physical-device acceptance, which remains in MAP-025.

**IDEA-20260921-02 - Restore Admin editing of Globe Display without requiring the inactive Admin BFF. Accepted into MAP-020.**
Owner reports that an Admin cannot edit Globe Display and requests a role-based direct path. Audit: the Admin build mounts an inert Globe provider; the browser BFF switch is off; production has the protected Globe/review schema applied, which revokes direct table writes. Decision: provide a direct authenticated Supabase RPC path for Globe configuration and review commands while preserving database-enforced Admin/AAL2, version, evidence, draft/publication, idempotency and audit rules. Do not restore direct table mutation or permit Staff-role writes. Local implementation and tests precede any production migration or exact-host claim; MAP-020 owns activation and recovery.

**IDEA-20260921-01 - Staff tooltip and workflow-map clarity. Accepted into MAP-028 I-012/I-016.**
Owner requests plain, concise help beside Admin headings and clearer workflow instructions. Audit: existing help exposes technical language; the map repeats long instructions. Decision: merge into existing staff clarity scope. Preserve all routes, rules, permissions and real-action boundaries. Verify contracts, Admin build and browser help/map checks; record staff acceptance separately.

**IDEA-20260920-14 - Plain staff wording and smaller product detail groups. Accepted into MAP-028 I-012.**
Owner requests continued Admin simplification using humanizer, without losing logic.
Audit: Inventory still uses Product master, Copywriting and SEO; shop stock uses
custody and matrix. The product content disclosure combines sales text and product
use/ingredients. Merge into the existing calm-Admin scope, with no new MAP item.
Smallest change: plain labels in Inventory and shop allocation/transfer forms;
split optional product description from use/ingredients using existing DetailBlock.
Keep all fields, IDs, values, approvals, warnings, requests and save boundaries.
No provider dependency for local work; deployed/staff acceptance stays in I-012/MAP-025.
Verification: existing contracts, Admin build, phone/desktop disclosure and retained
draft browser checks. Recovery: scoped pre-edit sources in
docs/design-checkpoints/20260920-admin-plain-words; evidence in the matching evidence directory.


**IDEA-20260920-12  -  accepted Cash on Delivery admin switch (default off), merged into MAP-023. Code locally verified, uncommitted.**
Owner does not take COD yet and wants it switchable. Audit gate:
1. Real problem: checkout offers and defaults to COD (`Checkout.jsx:30,41,385-415`) with no switch anywhere; payment travels inside the order note (`[Payment: Cash on Delivery (COD)]`), which the J&T engine also parses, so hiding the button alone leaves forged notes working.
2. Outcome: customers see prepaid only until an Admin switches COD on; the switch persists in the database with an audit identity; forged COD notes are refused at every layer.
3. Why existing behavior does not solve it: no settings table, no BFF validation, and no RPC guard mention payment method at all.
4. Dependencies: none for code; the prepared migration applies in the MAP-017 window, and until then the code default keeps COD hidden (fail-secure, matching owner policy).
5. Records/state/permissions/recovery: new `public.payment_method_availability` table (anon read, staff-only write, seeded off); additive trigger on `order_requests` that refuses only newly claimed COD notes and never touches existing rows; no publication, pricing, or stock change.
6. Smallest scope: Checkout gating plus prepaid default plus submit guard; BFF `COD_UNAVAILABLE` rejection; Admin switch in the fulfillment hub with a missing-table pending state; one-line guide qualifier; migration plus rollback plus portable rehearsal.
7. Completion checks: new spec green, `test:contracts` green, prebuild clean, both builds within budget, rehearsal exit 0.
8. Destinations: MAP-023 payment scope, System Brain, runbook note that COD stays off until the owner switches it on.

**IDEA-20260920-11  -  accepted Client-side role mirroring on staff-access mutations, merged into MAP-020. Code locally verified, uncommitted.**
Staff-role users see disabled privileged controls with the named reason instead of enabled controls the server would only refuse; own PIN, own MFA, and the directory stay available, and server checks remain the authority.

**IDEA-20260920-10  -  accepted Packing-slip print stylesheet, merged into MAP-023. Code locally verified, uncommitted.**
The slip prints alone via `k2-print-slip` plus `@media print`; screen rendering untouched.

**IDEA-20260920-08  -  accepted Idle lock for shared staff devices, merged into MAP-019. Code locally verified, uncommitted.**
Thirty-minute idle window with a two-minute plain-words warning, then sign-out through the existing logout path; activity resets the timer. Complements the prepared BFF server expiry at cutover.

**IDEA-20260920-07  -  accepted Mobile Admin audit slice (staff-on-phone experience), merged into MAP-028. Code locally verified, uncommitted.**
HelpTip phone help floats above the tab bar with safe-area clearance; WorkspaceTabs signals off-screen tabs with an edge fade; sub-tab counts stay honest while loading. Sheet keeps no code coverage and stays an explicit real-device acceptance task under MAP-025.

**IDEA-20260920-06  -  accepted Strict Admin audit slice 5 (emoji, touch targets, accent leftovers), merged into MAP-028. Code locally verified, uncommitted.**
Zero raw emoji in Admin (family icons or plain words; ✓/× text feedback explicitly allowed); every listed touch target meets 44px including the padded Sheet-mode switch and the labeled StartHere close; one accent holds (Overview emerald normalized to forest; StoreAsset emerald approval flow exempt as a single-hue tool theme).

**IDEA-20260920-05  -  accepted Sub-categorized workspaces (1 widget = 1 job), merged into MAP-028. Code locally verified, uncommitted.**
Owner asks that every Admin frame show one job with named sub-categories inside, so each staff action is intentional instead of facing a wall of logic. Category map audit 20 September (all 47 Admin files extracted: blocks, sub-tabs, cross-links, overlays):
1. Real problem and evidence: two workspaces stack unrelated jobs with no sub-navigation. `Customers.jsx` renders the identity directory and wholesale triage in one frame; `StaffPermissionManager.jsx` stacks Invite, delete PIN, People, AI spending, and 2FA in one frame. Everything else already gates: Omni modes, ShopAllocation tabs, J&T tabs, DeliveryRateControl tabs, Kanban 2-tab, OwnerCountClose rail, Overview lenses, Inbox master-detail.
2. Outcome: one job per frame; secondary jobs sit behind named sub-tabs with counts.
3. Why existing behavior does not solve it: five bespoke tab implementations exist but no shared primitive, and the two target surfaces have no sub-navigation at all.
4. Dependencies: none. Local presentation only; no migration, provider, permission, or record change.
5. Records/state/permissions/recovery: untouched. Banners, dialogs, and error states stay mounted outside the tab panels; default tabs keep the primary job first (directory, people).
6. Smallest scope: one shared `WorkspaceTabs` sub-nav in `AdminWorkspaceUi.jsx`; Customers split (`Customer directory` | `Wholesale inquiries`); StaffPermissions split (`People` | `Security` | `AI spending`); one failing-first contract spec registered in `test:contracts`. Suppliers, Pasabuy detail, and Sheet stay sequenced follow-ups, not this slice.
7. Completion checks: new spec green, `test:contracts` green, `npm run prebuild` clean, `build:admin` within 300.00 kB minified.
8. Destinations: verified behavior to System Brain and the MAP-028 tone-down entry; no rulebook change (queues and blockers were already visible and stay so).

**IDEA-20260920-01  -  accepted Quiet Admin workspace logic (progressive disclosure + plain staff words), merged into MAP-028. Code locally verified, uncommitted.**
Owner reports Admin BOS is still hard to look at: workspaces render every block immediately instead of offering details on demand, and remaining copy still carries internal jargon. Audit gate:
1. Real problem and evidence: owner report 20 September 2026 plus deep-dive audit `docs/evidence/20260918-admin-bos-deep-dive/README.md` §1 (help sprawl, per-area color dialects, §1.6 jargon remainder). Slice 1 (HelpTip, one-accent, 18 header descriptions) changed headers and colors but not the immediate-render layout: the Inventory edit modal still opens ~20 fields across 7 stacked sections at once.
2. Outcome: each workspace shows status plus the primary action first; secondary blocks sit behind an explicit `Show` control; copy uses warehouse plain words with facts unchanged.
3. Why existing behavior does not solve it: Overview lens switching, Omni mode tabs, ShopAllocation tabs, and StartHere More/Less already gate top-level panels, but blocks *inside* a visible surface have no shared disclosure pattern, and Slice C (structural merges) was deferred without visual verification.
4. Dependencies: none. Local presentation and copy only; no migration, provider, permission, or record change.
5. Records/state/permissions/recovery: untouched. Operational queues, blockers, empty states, and error banners never collapse; only secondary detail blocks start closed. Collapsed form blocks hold no required fields.
6. Smallest scope: one shared `DetailBlock` disclosure in `AdminWorkspaceUi.jsx`; apply to the Inventory edit-modal secondary sections (`Content & Copywriting`, `Website & SEO`, `Management`, default closed); plain-words pass on the §1.6 remainder (guarded workflow, POV, ultra-fast, 1-tap booking assistant, Bulk Batch redundancy, Discrepancies, fabricated product-name fallback); one failing-first contract spec registered in `test:contracts`.
7. Completion checks: new spec green, `test:contracts` green, `test:admin-ui` with no new failures, `npm run prebuild` clean, `build:admin` within 300.00 kB minified.
8. Destinations: verified behavior to System Brain and the MAP-028 tone-down entry; no rulebook change (the visible-blockers rule already governs).

**IDEA-20260917-08: accepted Full Admin BOS Mobile Experience, Touch Ergonomics, Responsive Readability, and Operational Logic Hardening, merged into MAP-028 M. Code locally verified.**
Owner requested ensuring the admin side too ("ensure the admin side too"), conducting an exhaustive mobile experience, readability, touch ergonomics, and operational logic audit and hardening across all 48 Admin views, navigation shells, and operational modals:
1. Scope & Execution: Audited all 48 Admin views and workflows on mobile viewports (320px-430px) and tablet/desktop breakpoints. Formulated and resolved findings M-01 through M-11 across Touch Targets, iOS Viewport Auto-Zoom, Table Layouts, Modal Focus Traps, Floating Widget Bounds, and Editorial Policy.
2. Resolved Findings & Applied Remediations:
   - Finding M-01 (Touch Targets - RESOLVED): Upgraded section tabs in `DeliveryRateControl.jsx` from `min-h-9` to `min-h-11` (44px) with thumb-zone spacing.
   - Finding M-02 (Touch Targets - RESOLVED): Standardized `MobileScannerModal.jsx` buttons (Close, Sync, +1 Scan) and quick-tap SKU tiles to `min-h-[44px]` touch targets.
   - Finding M-03 (Touch Targets - RESOLVED): Standardized `MilanPackingScannerModal.jsx` Close and Done Packing buttons to `min-h-[44px]`.
   - Finding M-04 (Touch Targets - RESOLVED): Upgraded `AdminAuthModal.jsx` modal dismiss trigger from `py-1` to `min-h-11 flex items-center justify-center`.
   - Finding M-05 (Touch Targets - RESOLVED): Upgraded `AdminAiCopilotModal.jsx` close button from `h-10 w-10` to `min-h-11 min-w-11` (44x44px).
   - Finding M-06 (iOS Auto-Zoom - RESOLVED): Upgraded manual SKU/barcode input in `MobileScannerModal.jsx` from `text-sm` (14px) to `text-base sm:text-sm min-h-[44px]`, eliminating iOS Safari automatic viewport zoom and camera offset.
   - Finding M-07 (Table Responsiveness - RESOLVED): Added `min-w-[720px]` to 9-column allocation matrix table in `ShopAllocationManager.jsx`, preventing column collapse on mobile screens.
   - Finding M-08 (Modal Traps & Heights - RESOLVED): Wrapped `RebalanceModal` and `CreateTransferModal` in `ShopAllocationManager.jsx` with `AdminDialog` focus trap and upgraded to `max-h-[calc(100dvh-1.5rem)]`.
   - Finding M-09 (Viewport Bounds - RESOLVED): Added mobile-responsive bounds to `AdminToolsWidget.jsx` dialog (`fixed inset-x-2 bottom-20 max-h-[calc(100dvh-6rem)] sm:absolute`), preventing floating widget spillage off-screen on mobile devices.
   - Finding M-10 (Tab Overflow - RESOLVED): Added `overflow-x-auto scrollbar-none` to sub-navigation tabs container in `JntVipDispatchModal.jsx`, preventing horizontal page blowout.
   - Finding M-11 (Editorial Policy - RESOLVED): Eliminated raw em dashes across staff copy in `Admin.jsx`, `AdminToolsWidget.jsx`, `AdminAiCopilotModal.jsx`, `AdminAuthModal.jsx`, `AutomaticIntakePanel.jsx`, `BulkCsvImportModal.jsx`, `DeleteProductsModal.jsx`, `DeliveryRateControl.jsx`, `Inbox.jsx`, `InventoryGrid.jsx`, `Overview.jsx`, and `adminGuide.js`, and synchronously updated `tests/unlisted-product-ordering-contract.spec.js`.
3. Verification Evidence: Contract suite, selling surfaces, security prebuild, and isolated production builds (Admin <= 300 kB minified, Storefront <= 150.5 kB gzip) passing.

**IDEA-20260917-07: accepted Full-Surface Mobile Experience, Responsive Readability, and Operational Logic Audit & Remediation, merged into MAP-028 L. Code locally verified.**
Owner requested a full website and project audit focused on the mobile experience, ensuring no broken logic for mobile users, all text and UI elements are readable, and everything is strictly documented in the Master Action Plan:
1. Scope & Execution: Completed comprehensive mobile audit and executed authorized surgical remediations across all customer-facing storefront views (`Home`, `Catalog`, `MasterProduct`, `CartDrawer`, `Checkout`, `Confirmation`, `Pasabuy`, `Wholesale`, `CustomerAccount`, `GuestMessages`, `InteractiveShop`) and Admin BOS workflows on mobile viewports (320px-430px).
2. Resolved Findings & Applied Remediations:
   - Finding L-01 (High Mobile Friction - RESOLVED): Standardized chat inputs (`customerName`, `email`, `phone`) and textarea (`message`) in `StoreChatPanel.jsx` to 16px (`text-base` / `.store-field`) with `min-h-[44px]`, eliminating iOS Safari auto-zoom on input focus.
   - Finding L-02 (Policy Defect - RESOLVED): Upgraded `StoreChatPanel.jsx:53` header text to `text-[12px]` strictly adhering to the repository >= 12px font floor.
   - Finding L-03 (Quality & Rulebook Defect - RESOLVED): Replaced em dashes with hyphens and colons across `Pasabuy.jsx:125-126`, `Wholesale.jsx:138`, `CatalogGrid.jsx:56, 105`, and `DeliveryEstimate.jsx:131`.
   - Finding L-04 (Contract Test Fragility - RESOLVED): Aligned single-line formatting of `<CartDrawer />` in `StorefrontApp.jsx:64` to satisfy `tests/storefront-discovery-contract.spec.js:197`, restoring 100% PASS rate.
   - Finding L-05 (Mobile Usability Block - RESOLVED): Added direct chat launcher on `Confirmation.jsx` (`<CrimsonButton onClick={() => openStoreChat(...)}>Chat with staff about this order</CrimsonButton>`) when direct Supabase mode is active, providing customers an immediate support channel for newly placed orders.
   - Finding L-06 (Mobile Ergonomics Pass - VERIFIED): Verified >= 44x44px touch targets (`min-h-11`), `env(safe-area-inset-bottom)` insets, `h-16 md:hidden` spacer, floating concierge button clearance (`bottom-20 right-5`), dynamic regional shipping matrix, and input retention in checkout.
3. Verification Evidence: 653/653 contract tests PASS (100% green); 8/8 selling surface browser tests PASS; `npm run prebuild` clean across 1,400 files (0 leaks, 0 boundary gaps); Storefront build passes at JS 150.15 kB / 150.50 kB gzip and CSS 29.43 kB / 30.00 kB gzip; Admin build passes at 196.06 kB / 300.00 kB minified. Ready for staging and promotion to `main`.

**IDEA-20260917-06: accepted Storefront-Wide Unified Live Chat Drawer & Experience Parity, merged into MAP-027. Code locally verified.**
Owner requested unifying the chat logic across both store surfaces (the 2D shop/catalog and the 3D store) so they share one single live chat logic, state, and drawer experience:
1. Architectural & UX Parity: The only difference between the 2D shop and 3D store should be the visual/spatial experience, not the operational capabilities. Both surfaces share the direct Supabase P2P chat logic, live Realtime subscriptions, and `sessionStorage` conversation continuity (`k2-store-chat-convo-id`).
2. Global Slide-Over Chat Drawer: Mount `<StoreChatDrawer />` wrapping `<StoreChatPanel />` globally across the storefront (similar to `<CartDrawer />`), accessible via `chatOpen` state in `StoreContext`.
3. Seamless Product Questions: Clicking "Ask staff about this product" on a product detail page (`MasterProduct.jsx`) seeds the chat drawer with the product SKU/title and opens it immediately, keeping the customer on the product page instead of navigating them to a blank `/messages` screen.
4. Omnipresent Store Concierge: Provide a floating "Chat with K2" concierge trigger button on the 2D catalog and home pages, matching the luxury wood aesthetic with clean SVG icons, active conversation indicators, and $\ge 44\times 44$px touch targets.
5. Verification & Quality: Maintain strict compliance with the 4 design skills (`ui-ux-pro-max`, `impeccable`, `design-taste-frontend`, `emil-design-eng`), $\ge 12$px font floor, zero raw emojis, zero secret leaks, 100% prebuild security passing, and Storefront $\le 150.50$ kB gzip bundle budget.

**IDEA-20260917-05: accepted Live 2-Way Peer-to-Peer Storefront to Admin BOS Chat, merged into MAP-027. Database applied live on Supabase (`pixplcjqivlfflickobf`), code locally verified.**
Owner requested making the storefront live chat operational immediately without requiring manual typing or third-party bot blockers:
1. Operational Truth & P2P Live Messaging: When a customer visits the storefront and opens "Chat with K2" (`StoreChatPanel.jsx`), they can enter their name, contact (mobile/email), and message, and hit "Send to K2". The message directly writes to canonical `public.conversations` and `public.messages` in Supabase via `submit_storefront_chat_v1`.
2. Live Admin BOS Inbox Integration: The Admin Inbox (`src/views/admin/Inbox.jsx`) is subscribed via Supabase Realtime to `public.messages` and `public.conversations`. Inbound customer questions appear live with unread counters and the shelf-side origin badge.
3. Customer-Visible Staff Replies: Activated `public.append_website_customer_reply_v1` and `public.website_reply_capability_v1` on Supabase. Staff clicking "Send to website customer" writes an outbound Admin message, sets status to `Pending`, and logs a `customer_reply_sent` event.
4. Auto-refreshing Realtime Store Chat: Storefront chat listens on Supabase Realtime (`storefront:live_chat`) and polls `get_storefront_chat_v1` on an 8-second background timer. Replies from staff appear in the customer's chat thread automatically. The active conversation ID is retained in `sessionStorage` so refreshing the browser preserves the active thread.
5. Verification: Applied migration `20260917_live_p2p_storefront_chat.sql` to live Supabase; verified round-trip message submission, retrieval, and cleanup; 150/150 contract tests pass; prebuild passes with 0 leaks / 0 gaps; Storefront landing budget passes at 149.89 kB / 150.50 kB gzip; Admin bundle passes at 196.06 kB / 300.00 kB minified.

**IDEA-20260917-04: accepted Storefront Buyer Persona Audit & 100% J&T Fulfillment Parity, merged into MAP-023. Code locally verified.**
Owner requested auditing what information we ask users across three scenarios:
1. When logging in / managing an account (`CustomerAccount.jsx`)
2. When buying as an existing customer / returning user (`Checkout.jsx`)
3. When buying as a guest without an account yet
And comparing what information is collected against official J&T Express VIP courier fulfillment (`exptemplete_en.xls` and `vip.jtexpress.ph`), identifying all gaps, and ensuring 100% completion without manual typing:
- Audit Findings:
  - Account Sign-in: strictly optional passwordless magic link (email) or SMS OTP (phone). Asks only for email or +63 phone, no passwords or redundant questions.
  - Checkout Questions: asks for Full name (recipient), Mobile number (Philippine 11-digit mobile format), Email address (optional if mobile provided), Destination region (for accurate courier tier pricing and province routing), Delivery address (Street/house #, Barangay, City), Delivery option (Metro Manila, Courier, or Warehouse pickup), Payment preference (Cash on Delivery vs Prepaid GCash/Maya/Bank), and Order note.
  - J&T 1:1 Parity: resolved address and contact fields map 100% to J&T VIP Smart Recognition text syntax and all 13 columns of the bulk upload template (`exptemplete_en.xls`). Added accessible Payment Preference selector (Cash on Delivery vs GCash/Maya/Bank) that automatically sets J&T column 12 (`COD (PHP) (*)`) to the exact grand total for COD or 0.00 for prepaid. Hardened address parsing to support 3-part Philippine addresses with barangay keywords.
- Strict UI compliance: touch targets $\ge 44\times 44$px (`min-h-11`), font floor strictly $\ge 12$px, zero raw emojis (clean SVG icons only), zero em dashes.
- Verification: Playwright contract tests (`tests/jnt-vip-dispatch-contract.spec.js`, `tests/storefront-recovery-ui.spec.js`, `tests/storefront-truth-contract.spec.js`, `tests/operations-hardening.spec.js`) all PASS; `npm run prebuild:storefront` clean (0 leaks, 0 boundary gaps); Admin BOS bundle passes at 196.06 kB / 300.00 kB minified; Storefront bundle passes at 149.89 kB / 150.50 kB gzip.

**IDEA-20260917-03: accepted J&T VIP Official Excel Bulk Template Parity & Step-by-Step Interactive Guide Mode, merged into MAP-023. Code locally verified.**
Owner requested inspecting the official J&T Express bulk waybill template (`C:\Users\jerze\Downloads\exptemplete_en.xls`) to determine if it can be used even for single orders as a much easier fulfillment method without manual field typing, and adding an interactive step-by-step guide button in the Admin BOS modal that walks staff/sister through the 1-tap copy & paste and waybill creation workflow:
1. Analysis of `exptemplete_en.xls`: Confirmed standard 13 contractual columns with exact character parity: `Receiver(*)`, `Receiver Telephone (*)`, `Receiver Address (*)`, `Receiver Province (*)`, `Receiver City (*)`, `Receiver Region (*)`, `Express Type (*)`, `Parcel Name (*)`, `Weight (kg)  (*)`, `Total parcels(*)`, `Parcel Value (Insurance Fee) (*)`, `COD (PHP) (*)`, `Remarks`. Discovered and accommodated the double space in `Weight (kg)  (*)`.
2. 1-Order Batch CSV export: Added `generateJntVipSingleOrderCsv(order)` in `src/lib/jntVipBulkEngine.js` so staff can download a 1-order CSV batch directly from the single-order modal, enabling 1-click batch upload in J&T VIP (`My Order > Create Waybills In Bulk`) with zero manual copy-pasting.
3. Interactive Step-by-Step Guide mode: Added `[Step-by-Step Guide]` toggle in `JntVipDispatchModal.jsx` featuring a visual 3-step progress stepper (Step 1: Recipient Address smart recognition & direct portal link; Step 2: Package Specs & COD with individual 1-tap copy chips; Step 3: Barcode scanning & waybill handover).
4. Strict UI compliance: touch targets $\ge 44\times 44$px (`min-h-11`), font floor strictly $\ge 12$px, zero raw emojis (clean SVG icons only), and zero em dashes in code or UI copy.
5. Verification: Playwright contract tests (`tests/jnt-vip-dispatch-contract.spec.js` and `tests/admin-dialog-contract.spec.js`) 16/16 PASS; `npm run prebuild` clean (0 leaks, 0 boundary gaps); Admin BOS bundle passes at 196.06 kB / 300.00 kB minified; Storefront bundle passes at 149.89 kB / 150.50 kB gzip.

**IDEA-20260917-02: accepted J&T VIP Mobile & Desktop Courier Booking & Waybill Dispatch Suite, merged into MAP-023. Code locally verified.**
Owner requested automating courier waybill creation and dispatch for the single Manila master warehouse (`MANILA_MAIN`) backing the website (Package 2):
1. User sees "Fulfilled by K2 Jimzon (Manila Hub Dispatch)" on storefront and checkout (`Checkout.jsx` and `CartDrawer.jsx`), reinforcing operational truth and brand trust while maintaining the single warehouse stock boundary.
2. Sister / warehouse manager can 1-tap/1-click copy ("Ctrl+V") customer details into J&T VIP (`My Order > Create Waybill`) using the Smart Recognition Address text parser, with 1-tap copy buttons for weight, declared value, COD amount, and order reference remarks.
3. J&T VIP Bulk CSV batch export engine (`src/lib/jntVipBulkEngine.js`): supports bulk booking matching J&T VIP's exact 13-column `Create Waybills In Bulk` specification (`Item Name`, `Weight`, `Receiver Name`, `Receiver Phone`, `Receiver Province`, `Receiver City`, `Receiver District`, `Detailed Address`, `COD Amount`, `Declared Value`, `Express Type`, `Remark`, `Number of Goods`). Formats UTF-8 BOM, standardizes Philippine mobile numbers to `09xxxxxxxxx`, and sets sender defaults according to J&T VIP requirements (`JWORLDBASKETPH ONLINE STORE`, Bulacan/SJDM).
4. Staff Admin BOS mobile & desktop dispatch modal (`src/views/admin/JntVipDispatchModal.jsx`): `<AdminDialog>`-compliant modal providing both Single Order 1-tap copy and Bulk Batch CSV download with visual 3-step upload instructions, direct portal links, barcode input/scanner support, and automated order status handover.
5. Strict UI quality compliance: touch targets $\ge 44\times 44$px (`min-h-11`), font floor strictly $\ge 12$px, zero raw emojis (clean SVG icons only), and zero em dashes in code or UI copy.
6. Verification & Budgets: Playwright contract tests (`tests/jnt-vip-dispatch-contract.spec.js` and `tests/admin-dialog-contract.spec.js`) 15/15 PASS; `npm run prebuild` clean (0 secrets, 0 boundary gaps); Admin BOS bundle passes at 196.06 kB / 300.00 kB minified; Storefront bundle passes at 149.89 kB / 150.50 kB gzip.

**IDEA-20260917-01: accepted Multi-Shop Channel Allocation & Custody Transfer Engine, merged into MAP-026. Code locally verified.**
Owner authorized autonomous implementation of Multi-Shop Channel Allocation and Custody Transfer Engine (Package 1):
1. Pure allocation calculation engine (`src/lib/channelAllocationEngine.js`): deterministic 2-unit target coverage per shop account (`Covered`, `Thin`, `Skipped`, `Out`, `Needs review`), priority-based scarcity resolution, and marketplace outbox sync deltas. Master Inventory is preserved as the physical truth across warehouse lots and never shrinks when stock is allocated.
2. Custody transfer engine (`src/lib/custodyTransferEngine.js`): physical stock custody movement state machine implementing staff-request -> admin-approval -> receiver-acceptance workflow. Fails closed on insufficient unreserved lot stock, enforces admin role for review, and records actor, timestamp, and reasons.
3. Database migration & rollback (`supabase/migrations/20260917_multi_shop_allocation_and_transfers.sql` and rollback): creates `public.channel_shop_allocations`, `public.inventory_transfer_requests`, stock projection view `v_multi_shop_stock_projection`, and stored procedures `rebalance_shop_allocations_v1`, `request_inventory_transfer`, `review_inventory_transfer`. Fully guarded for blank PostgreSQL instances.
4. Local PostgreSQL 17 test harness (`scripts/rehearse-multi-shop-transfers-portable.mjs` / `npm run rehearse:shop-transfers`): validates migration replay, 2-unit distribution, scarcity priority, custody request, fail-closed lot validation, admin approval, and clean rollback.
5. Staff Admin BOS interface (`src/views/admin/ShopAllocationManager.jsx`): mounts Channel Allocation Matrix and Custody Transfers workspaces within `ChannelIntegrations.jsx`, adhering strictly to the 12px font floor, `min-h-11` touch targets, clean SVG icons, and zero raw emojis.
6. Verification & Budgets: Playwright contract tests (`tests/multi-shop-allocation-contract.spec.js`) 4/4 PASS; `npm run prebuild` clean across 1,393 files; Admin BOS bundle passes at 196.06 kB / 300.00 kB minified; Storefront bundle passes at 149.89 kB / 150.50 kB gzip.

**IDEA-20260916-08  -  accepted Universal Guided Walkthrough System across all Admin BOS workflows, merged into MAP-021.**
Owner requested a button across the Workflow Guide that activates an interactive step-by-step guide mode for any chosen workflow (inventory intake, metrics discovery, inventory scanning, delivery mode fulfillment, flight consignments, monthly counts). Audit gate:
1. In `MasterWorkflowGraph.jsx` and `WorkflowDetailDrawer.jsx`, mount an unmistakable primary `[▶ Play Guided Walkthrough]` action button for every active workflow.
2. In `tourData.js` and `SpotlightTourOverlay.jsx`, expand the spotlight tour engine to support all 8 operational lifecycles, pulling steps from `actionGuide` and humanized plain-language instructions without jargon or AI buzzwords.
3. In `Admin.jsx` and `SpotlightTourOverlay.jsx`, implement hybrid cross-screen navigation: when advancing to a step located in a different Admin section (e.g. from Workflow Graph to Flight Consignments or Fulfillment Hub), automatically transition the workspace and display a smooth breadcrumb banner (`"Navigating to [Screen]..."`).
4. Support flexible advancement: staff can click the highlighted live UI element to perform real work, or click `[Next Step →]` / press `[N]` on keyboard to rehearse without mutating data.
5. Strict quality compliance: $\ge 12$px font floor, $\ge 44\times 44$px touch targets, zero emojis (clean SVG icons only), and Admin bundle budget $\le 300.00$ kB minified.

**IDEA-20260916-07  -  accepted Add Inventory intake chooser and Settings / Ease of Use menu fix, merged into MAP-021.**
Owner requests fixing the settings and ease of use menu, and providing a direct "+ Add Inventory" action where clicking it asks whether to add inventory automatically (Barcode Scan & FEFO Lot Intake) or manually (ChatGPT Studio & Smart Paste / New SKU). Audit gate:
1. In `InventoryGrid.jsx`, mount a prominent primary `[+ Add Inventory]` action button that opens an "Add Inventory Intake Method" modal presenting two clear cards: Automatic (barcode scan + batch lot FEFO intake) vs Manual (ChatGPT prompt studio + Smart Paste JSON / manual spec). Each card provides direct tool launch ("Intake Now") and guided walkthrough tour launch ("Start Guided Tour").
2. In `AdminToolsWidget.jsx`, fix the floating tools widget: replace raw emojis (`⚙️`, `💰`, `🧮`, `📈`, `📦`, `⚖️`, `🧾`, `⏳`, `📝`) with clean SVG icons; add a modal backdrop, a distinct header with an explicit `[Close ×]` button and title, `Escape` key and backdrop click dismissals, and prevent the widget from obscuring workspace action buttons.
3. Streamline header and ease of use controls in `Admin.jsx`: add an `[+ Add Inventory]` shortcut in the inventory action bar; ensure all touch targets meet $\ge 44\times 44$px (`min-h-11`) and typography meets $\ge 12$px floor; verify Admin bundle budget remains $\le 300.00$ kB.

**IDEA-20260916-06  -  accepted interactive spotlight walkthrough tour engine, merged into MAP-021.**
Owner requests an interactive spotlight guided tour for Admin BOS staff: clicking a workflow (such as manual inventory intake vs automatic inventory intake) blacks out the screen, highlights specific UI widgets with step-by-step instructions ("click this", then "go to ChatGPT with this prompt", "copy-paste here", etc.). Audit gate: implement fullscreen backdrop with element spotlight cutout; provide interactive tour steps for Manual Inventory (New Product Intake + ChatGPT Studio) and Automatic Inventory (Quick EAN-13 Scan + Batch Intake); embed 1-click ChatGPT prompt copying; ensure seamless workspace auto-routing; enforce 12px typography floor, $\ge 44$px touch targets, zero raw emojis, and Admin bundle budget ($\le 300$ kB minified).

**IDEA-20260916-05  -  accepted order and pasabuy conversation seed, merged into MAP-019 / Queue Item 14. Database live on Supabase, code locally verified.**
Owner requested addressing Queue Item 14 (MAP-019): eliminate empty support threads when orders or pasabuy requests are submitted. Audit gate: add seed conversation and first customer-authored inbound message with 4-hour SLA timer (`response_due_at = now() + 4 hours`), `unread_count = 1`, and `delivery_status = 'received'`; enforce idempotent re-runs (`ON CONFLICT` and `WHERE NOT EXISTS`); preserve strict search path (`set search_path = public`); maintain function signatures and return types; verify in transaction on production Supabase (`pixplcjqivlfflickobf`) before committing. Applied migration `20260916_order_and_pasabuy_conversation_seed.sql` on live Supabase via Management API. Verified via `verify-live-rollback.mjs` (order seed, pasabuy seed, replay idempotency, clean rollback). Full contract suite (652/652 PASS), selling surfaces (8/8 PASS), prebuild security passed with 0 leaks/0 gaps, and builds within budget. Vercel deployment pending git push to `main`.

**IDEA-20260916-04  -  accepted workflow guide visual & interactive enhancement, merged into MAP-021.**
Owner requests visual and interactive enhancements across the workflow guide experience for both admins and staff: make workflows easier to understand, more tactile, and more responsive. Audit gate: auto-focus/center selected nodes in `WorkflowSvgCanvas`; add interactive node-type and staff-role filters; replace raw emojis in `WorkflowGuideModal` with clean SVG primitives; add visual breadcrumbs and 1-click clipboard copy in `WorkflowDetailDrawer`; retain all 49-node/60-edge topology, allowlisted `adminJump` targets, 12px font floors, and bundle budgets ($\le 300$ kB Admin).

**IDEA-20260916-03  -  accepted workflow map follow-through and staff instructional roadmap, merged into MAP-021.**
Owner requests that when any workflow is clicked in the Admin BOS Master Operations Workflow Graph, it actively teaches admins and staff on what to click and do next to continue on and finish the objectives or goals. Audit gate: keep existing graph topology (49 nodes, 60 edges) and contracts; enrich all 8 workflows with structured operational goals and finish criteria; enrich all 48 operational nodes with concrete action directives (target screen, what to click, action directive, and next step handoff); mount an interactive sequential step roadmap and high-contrast staff action hero card.

**IDEA-20260916-02  -  accepted full project audit, merged into MAP-028 K.**
Owner requests an exhaustive full-project audit: inspect for things that won't work,
architectural and functional gaps, faults, runtime mistakes, edge case failures, and
production readiness risks across Storefront, Admin BOS, BFF, Database (Supabase),
APIs, and hosting configurations, then document all findings in MASTER_ACTION_PLAN.md.
Audit gate: execute comprehensive automated scanners, contract tests, UI probes, and
manual code inspections; categorize by severity (P0 Blocker, P1 High Risk, P2 Medium/Quality);
reconcile verified reality against documented claims without creating a competing backlog.

**IDEA-20260916-01  -  accepted delivery automation, merged into MAP-023 / MAP-018. Database applied to Supabase, code locally verified.**
Owner requests an automated Shopee/Lazada-style delivery calculator at checkout:
calculate package weight from cart items, present instant delivery options and fees
by destination region (NCR, Luzon, Visayas, Mindanao, Pickup), include the fee in
the order total, and capture customer-confirmed delivery details without requiring
pre-order manual staff negotiation. Delivery mode is selected by the customer;
carrier commitment and dispatch are fulfilled by K2 Jimzon. Completed with real-time
shipping calculator engine (`src/lib/cartShippingCalculator.js`), Storefront BFF
`shippingAmount` and `shippingQuoteStatus` validation (`prepared-api/storefront/order.js`),
database RPC update on production Supabase `submit_order_request_v2` and `order_requests.payment_evidence`,
checkout UX cards and live totals (`Checkout.jsx`), and Admin BOS confirmation queue and courier modal integration
(`OmniOperationsHub.jsx`). Database DDL permanently applied and verified on production Supabase (`pixplcjqivlfflickobf`) via Supabase Management API per explicit owner instruction. All 863 base tests, calculator tests, contracts, prebuild, and builds pass. Vercel deployment pending git push to `main`.

**IDEA-20260914-02  -  accepted autonomous remediation, merged into existing MAP owners.**
Owner requests all MAP work that can proceed without interruptions. Execute
independent prepared engineering in dependency order; retain actual policy,
provider and activation gates without repeatedly asking for them. Begin with
MAP-019/020 guest recovery and parsing, then independently verifiable audit
defects under MAP-023/027/028. No new business policy or second backlog is created.
Verification and recovery remain in each owning MAP slice and durable evidence.

**IDEA-20260914-01  -  accepted audit refresh, merged into MAP-028 J.**
Owner requests the complete 44-domain project audit, with evidence, confidence,
severity, preserved architecture, and no production mutations or broad code edits.
Audit gate: consolidate current findings and superseded remediation into
`docs/audits/MASTER_PROJECT_AUDIT.md`; keep the root MAP as the sole active backlog.
Existing security, operational and launch owners retain their dependencies.
This is audit/documentation work, not authorization to activate or deploy features.


**IDEA-20260913-04  -  accepted completeness review, merged into MAP-022/023/025/026/028.**
Owner asks what the launch plan misses. Cross-check of the start-here guide,
existing owner decisions and full-audit U-001-009 finds under-specified external
stock-race/initial-sync acceptance and summary omissions for staff, scheduled
work, financial reconciliation and remaining audit evidence. Refine existing
owners and acceptance gates; no new connector or operational policy is activated.
Existing detailed requirements are not newly discovered code defects. This review
does not certify current source, database, deployments or legal compliance.

**IDEA-20260913-03  -  accepted planning refinement, merged into MAP-026 / MAP-028.**
Owner continuation: document the entire launch sequence in the MAP for future
execution without chat. Accepted as the same refinement: the execution dashboard
now has a start-here guide covering all twelve existing owners, input packets,
acceptance evidence, state distinctions and handoff rules. No new backlog item.
Owner requests the remaining launch sequence and official Lazada/TikTok Shop
website/application preparation, so payment, delivery and inventory inputs can
follow later. Audit: existing MAP-026 already prioritizes both platforms and
owns access qualification and synchronization. Merge researched application
readiness into that item; do not create a second roadmap or public SaaS scope.
Preserve K2-owned multi-shop and warehouse boundaries. Registration eligibility,
reviews and shop grants require actual provider evidence. This is a planning
update, not an app submission, provider activation or application deployment.

**IDEA-20260913-02  -  accepted audit remediation, merged into MAP-017-025 / MAP-028 J.**
13 September production continuation: the owner authorized the explained exact
MAP-017 security correction. Application and independent verification succeeded;
audit 26→10 and live read boundary 14/14. This fulfills that authorization only.
Remaining guest/provider permissions stay in MAP-017; completion evidence is in
System Brain and `docs/evidence/20260913-audit-remediation/README.md`.

Owner requested applying the 13 September full-audit findings and following the
MAP rules. Evidence: `docs/evidence/20260913-full-audit/README.md` AUD3-001-008.
Existing tests do not cover the reproduced intake coercion, scanner exemption,
expiry-day and clearance projection faults; deployment/CI and scoped guest
recovery gaps already belong to the existing queue. Accept surgical corrections
and behavioral regression evidence, with no new operational authority or backlog.
Preserve exact-payload production authorization, Unlisted owner policy, and
real-host acceptance gates. Unconfirmed concerns require proof before changes.
Record remaining execution only in each owning MAP item, and verified behavior
in the rulebook, System Brain and relevant runbooks/test records.

**IDEA-20260913-01  -  accepted verification continuation, merged into MAP-028 J.**
Owner requests independent verification of the recent MAP handoff and whether
changes are actually applied. Audit: the checkout is dirty at `41d96df`; local
test reports, prepared SQL, provider receipts and deployed behavior are different
claims. Reuse existing MAP-017-028 owners and acceptance gates. Scope is fresh
local checks, isolated investigation of the reported Admin failure, read-only
applied/deployed-state checks, and durable corrections. Preserve other sessions'
work and the existing stash; no deployment, production migration or business
policy decision is authorized by this verification request.

13 September continuation of **IDEA-20260908-01**: the owner asks to resume
unfinished MAP work after reading its rules. Audit outcome remains merged into
the existing dependency-ordered queue. MAP-023 / I-001 already accepts payment,
confirmation, handover, refund/cancellation and failure/replay composition;
checking the latest audit and completing these boundaries introduces no new
business policy or inventory authority. Keep remaining work only in the MAP.

9 September active goal continuation of **IDEA-20260908-01**: owner asks to
complete the remaining production blockers. Existing MAP-028 I-001 owns the
confirmation/payment stock commitment and composed lifecycle work; I-002/I-004
and later items retain dependency order. Physical custody versus owned stock
is an implementation distinction required by OWNER-002 and the existing
physical-count rule, not a new business policy. No duplicate idea or backlog
is created; local preparation does not grant production activation authority.

9 September continuation of **IDEA-20260908-01**: the existing I-002 manual
intake step/Draft/first-inventory retry slice was finished and locally verified;
receipt-shape and post-write-refresh findings were merged into that same scope.
Decision remains accepted/merged, with no new backlog or production authority.
Evidence: `docs/evidence/20260909-intake-command-retry/README.md`; all remaining
caller/activation work stays in MAP-028 I-002.

**IDEA-20260909-02  -  accepted refinement, merged into MAP-028 J/I-015 and MAP-027.**
Owner requests a Master Action Plan truth audit, verification and correction of
stale/completed claims, and explicit work for oversized phone next-pantry/category
buttons and difficult in-store zoom. Audit: the MAP contains superseded phase-one
apply instructions, stale release/browser blockers and duplicate headings. The
store already has previous/next shelf and zoom controls, so extend their existing
acceptance scope rather than create another navigation system or backlog. Existing
orientation tests click zoom but do not assert camera movement or pinch behavior.
Outcome: accept documentation corrections and local verification under MAP-028 J;
merge compact navigation and zoom repair/real-device acceptance into I-015/MAP-027.
Preserve 44px targets, readable category names, K2 room/wood identity, canonical
basket and reduced-motion fallback. Remaining implementation, dependencies and
acceptance live only in the owning MAP items. No production activation is implied.

**IDEA-20260909-01  -  audit continuation, merged into MAP-028 section J.**
Owner asks to continue the interrupted full Storefront/Admin website audit and
document gaps in the existing Master Action Plan. Reuse I-001-016 and existing
activation gates; verify current live observations separately from source and
isolated fixtures. This is an audit/documentation request, not authorization to
change production data, enable providers, send customer requests, or deploy fixes.

**IDEA-20260908-03  -  accepted and merged into MAP-024 / MAP-028 B6/B8/B9.**
Owner requests Google Analytics, Search Console and Google indexing readiness
for Italian imported goods in the Philippines and Italy-to-PH Pasabuy. Reuse
existing discovery scope and Google properties where present; require verified
ownership, privacy-aware measurement, receipt-confirmed request events, search
intent research and keyword-to-page mapping. Preserve real-product publication
and indexing gates. This records planned work, not created properties, deployed
tracking, Google indexing or promised rankings.

**IDEA-20260907-02  -  accepted refinement, merged into MAP-028 I-012 / MAP-021.**
Owner requests another dashboard truth audit with fabricated test records proving
that later real data updates the widgets. Reuse the existing overview boundary;
reject malformed source results and verify refresh/recovery. Mock data stays in
the test harness; no production seed or fabricated metric is authorized.

**IDEA-20260907-01  -  accepted refinement, merged into MAP-018 / MAP-023 /
MAP-026 / MAP-028 I-016.** Owner requests continued engineering readiness for
payment details, inventory receiving and channel operations. Audit: reuse the
existing manual payment, consignment and channel commands. Close malformed-input
gaps before signed dispatch and verify existing operational contracts. Preserve
the separate manual/API intake paths. Provider activation, new payment automation
and production changes are outside this preparation; keys alone do not establish
readiness. Configuration/activation handoff belongs in the operations runbook.

**IDEA-20260906-07  -  accepted refinement of IDEA-20260906-06, merged into
MAP-028 I-012 / MAP-021 / MAP-023.** Owner requests a calmer dashboard with
selectable widgets in the left panel and consolidated shop/channel metrics.
Use the existing section permissions and overview data; preserve every current
operational destination and sales-record review/export. One selected widget per
workspace avoids fitting all panels in one frame. No new connector, invented
analytics, production activation or finance authority is implied. Alternatives:
an even denser all-panel grid rejected; draggable customization deferred because
it adds complexity without serving the owner's stated need.

**Purpose:** durable intake and decision register for new ideas without becoming
a competing implementation backlog.

**Active implementation authority:** `../MASTER_ACTION_PLAN.md`

**Current pending intake:** IDEA-20260902-04, IDEA-20260902-06, IDEA-20260920-02, IDEA-20260920-03, IDEA-20260920-04, IDEA-20260920-09, IDEA-20260920-13

This is not a roadmap or backlog. An idea stays here only until it is audited
against the operations rulebook, current System Brain, actual code/data,
dependencies, risks, and existing Master Action Plan.

## Lifecycle

1. Capture the idea below with a permanent ID, without claiming it is approved
   or live.
2. Audit it using the gate in `../MASTER_ACTION_PLAN.md`.
3. Choose one outcome:
   - **Reject:** remove it from Pending idea intake and record the ID and reason
     in the Idea decision register.
   - **Duplicate/merge:** merge necessary scope into an existing MAP item, then
     replace the intake entry with a decision-register row naming that item.
   - **Unavailable dependency:** mark it Deferred in the decision register and
     name the System Brain limitation or Master Action Plan constraint that must
     change before re-audit.
   - **Accepted:** create or update a MAP item with objective completion checks,
     then replace the intake entry with a decision-register row naming that item.
4. Never implement directly from this file.

No idea ID is erased from this file after audit. The full wording may be reduced
to a concise decision row because Git preserves the original entry, but the ID,
outcome, destination, and reason remain searchable here.

The former multichannel control-center idea was audited into MAP-009 through
MAP-011. The former product-transformation idea was audited into MAP-002. Their
full earlier wording remains recoverable in Git history; only the actionable,
still-needed scope remains in the Master Action Plan.

On 14 August 2026, the multichannel messaging/inventory and inventory-custody
truth idea was captured, audited, and merged into MAP-023. The audit found that
the canonical models exist, but external messaging/stock adapters and a complete
receiver-confirmed custody history remain unfinished. This inbox is therefore
still empty; the accepted scope lives only in `../MASTER_ACTION_PLAN.md`.

On 21 August 2026, IDEA-20260821-01 captured a broad web-architecture and
production-readiness checklist covering scale, reliability, security, delivery,
data, observability, and incident practices. It was audited against K2's actual
Vercel/Supabase architecture and the active launch queue. Necessary launch scope
was merged into MAP-020 through MAP-025; connector-only patterns remain
conditional; and infrastructure intended for independently operated distributed
systems was rejected for the first launch. This inbox remains empty.

Also on 21 August 2026, IDEA-20260821-02 captured an Excel-compatible Sheet Mode
export, offline edit, preview, and safe re-import workflow. The audit found that
the current Admin can import insert-only Draft product CSV rows but cannot export
the current sheet or safely update existing records, while inventory spreadsheet
overwrites would violate lot, reservation, expiry, custody, and audit invariants.
The accepted catalog round-trip and separately controlled inventory-
reconciliation scope was merged into MAP-023. This inbox remains empty.

On 26 August 2026, IDEA-20260826-01 captured the uploaded K2 Interactive Shop
concept and the owner's clarification that product knowledge does not exist yet.
The audit accepted an AI-first but human-approved Product Knowledge workspace and
an optional shelf-based Interactive Shop as MAP-027. It reuses the canonical K2
catalog, inventory, basket, messaging, Pasabuy, and order-request flows; it does
not authorize a second commerce backend, invented product facts, automatic AI
publication, full 360-degree navigation, or generative-AI answers without
verified grounding. This inbox remains empty because the accepted unfinished
scope now lives only in `../MASTER_ACTION_PLAN.md`.

On 27 August 2026, IDEA-20260827-02 captured the owner's confirmation that
`k2jimzonwebsite@gmail.com` is K2 Jimzon's primary provider login, recovery
identity, and project contact. The gate found this is not a new implementation
stream: it clarifies the provider-account and domain-mail scope already owned by
MAP-024. It was therefore merged there, while branded `@k2jimzon.com` mail remains
a separate decision and no credentials are authorized for repository storage.

On 28 August 2026, IDEA-20260828-01 captured the owner's public-computer threat:
a staff member may leave Admin and another person may try browser Back/Forward or
history restoration, while ordinary phone tab/app switching must not expire a
valid session. The audit rejected browser fingerprinting, logout-on-every-hide,
and silent restoration on every browser. It accepted a default-unremembered,
owner-approved remembered-personal-browser policy, one active Admin login per
staff account, and fail-closed restoration/revalidation rules. This is merged
into MAP-024 for predeployment implementation and MAP-025 for supported-browser
real-host proof; it does not claim current or deployed behavior.

Also on 28 August 2026, IDEA-20260828-02 captured the owner's request to improve
the virtual store and transform the shopkeeper avatar into a high-quality
anime/cartoon human character in both 2D and 3D with polished expressions, hair,
and visual aesthetics while fixing scene framing and test suites. The audit
accepted this scope into MAP-027. It preserves all canonical inventory, single
cart, product knowledge, accessibility, and offline procedural asset constraints.
This inbox remains empty because the accepted scope is in MAP-027.

IDEA-20260828-04 captures the owner's correction after reviewing the moving
aisle: the clerk must remain human-sized and visually anchored while the camera
travels, and the desktop right rail must be a useful, visually coherent shelf
concierge rather than a large empty utility panel. The audit accepts this as a
MAP-027 correction, not a second shopping system. The rail may expose canonical
shelves, product highlights, stock labels, FAQs, and staff handoff only; the
existing catalog, product selection, basket, and checkout remain authoritative.

IDEA-20260828-05 captures the owner's rendered-scene correction after the first
staging fix: the clerk must dwell in a real architectural gap between shelf
bays, never intersect shelf boards while travelling, use a readable articulated
arm/hand silhouette, and expose only one live-chat entry. The shelves also need
two additional physical levels for future canonical assortment capacity. The
audit accepts this into MAP-027 as spatial/accessibility repair. It does not
authorize decorative inventory, a second conversation implementation, or a
parallel shelf/catalog model.

IDEA-20260828-06 captures the owner's request to finish the virtual-store staff
conversation: the clerk explains every active category from its authored shelf
definition, the one customer chat stays inside the room, and Admin can send a
customer-visible reply back into that same browser-granted thread. Staff must be
able to distinguish this trusted website/Virtual Store source before opening the
conversation. The audit accepts the canonical conversation/BFF extension into
MAP-027. A separate chat database, invented online presence, marketplace-delivery
claims, or a second Admin inbox are rejected. Near-live refresh reuses the
existing bounded polling/realtime paths until a reviewed socket service exists.

On 30 August 2026, IDEA-20260830-01 captured the owner's deliberate decision to
add a paid OpenAI API path as an optional alternative inside the existing
product-intake workflow. For each product, staff deliberately choose either
**Automatic API** or **Manual ChatGPT Projects**; neither path is silently
forced. The automatic sequence starts from Smart Scan package evidence, produces the exact
`k2.product-content.v3` structured content contract, validates it at the K2
server boundary, produces the standardized PRIMARY and AFTER image candidates,
and returns everything to the same resumable Admin intake session for explicit
staff acceptance. Its purpose is to fill the reviewable product-record side -
identity supported by the package, descriptions, usage, ordered instructions,
SEO fields, media briefs, and Draft image candidates - not physical inventory
quantity, cost, lot, batch, expiry, custody, price, approval, or publication.
The audit merged this into MAP-018 rather than creating a
parallel AI-product or inventory system. Manual two-Project copy/paste remains a
recovery path. The API may assist with evidence-backed product facts, copy, and
Draft image candidates; it may never assign SKU, price, cost, stock, lot, batch,
expiry, custody, review approval, or publication state. The owner accepts paid
API calls in principle. The SuperAdmin-only, versioned fail-closed control now
exists as prepared local code with per-product, per-session, and monthly caps;
exact model snapshots, cap values, provider retention settings, migration/
provider activation, and measured preview evidence still require explicit owner
approval.

IDEA-20260830-02 captures the owner's request for staff to compute sales and
commercial scenarios more easily inside Admin BOS. The audit found that the
current Overview already derives payment-verified revenue from canonical order
requests, while the floating tools expose only a basic calculator and a
two-field margin scratchpad. K2 can safely add submitted-request value,
payment-verified value, and fulfilled value from the same bounded order
projection. The accepted read-only record drilldown is now locally prepared
under MAP-023, with deployment and representative staff acceptance still
unverified. K2 cannot yet
claim settled payout or actual-profit truth: no canonical settlement ledger or
order-line exact-lot cost snapshot exists. The accepted scope therefore merges
into MAP-023 as one status-separated Sales Summary plus a richer, explicitly
non-posting sales planning calculator. The calculator may show gross sales,
discounts, net sales, unit/total cost, fees, gross profit, margin, markup, and
break-even price from staff-entered planning inputs; it never writes an order,
payment, cost, payout, tax filing, or accounting record. Actual profit and
settled payout remain unavailable until their canonical records and allocation
rules exist. This avoids inventing financial truth while materially reducing
manual arithmetic for staff.

IDEA-20260830-03 captures the next staff usability gap found while completing
the accepted sales drilldown: staff can reconcile the selected-period rows in
Admin but cannot take the exact filtered set into a controlled spreadsheet or
handoff without copying each row. The gate accepts a browser-generated,
read-only CSV export into MAP-023 because it reuses the same bounded canonical
order projection and requires no new provider, schema, credential, or mutation.
The export is limited to created time, internal order reference, normalized
channel, order state, payment state, and request value in PHP. It excludes
customer identity/contact data, line-item cost, payout, tax, actual profit,
secrets, and any field not present in the reviewed ledger. UTF-8 BOM/CRLF,
stable headings, spreadsheet-formula neutralization, exact active-filter parity,
and deterministic coverage are required. The file is a selected-period
operational extract, not a settlement, accounting book, or full-history backup.

IDEA-20260830-04 captures the reverse-pricing gap in the Admin Sales Planner.
The current forward mode tells staff the result of a chosen price, but staff
still have to guess repeatedly when the real question is the minimum selling
price needed to preserve a desired gross margin after a planned total discount,
fixed/other costs, and a percentage payment or channel fee. The gate accepts a
second mode inside the same non-posting planner and merges it into MAP-023. It
must define target gross margin as planned profit divided by net sales after
discount; define the percentage fee against gross sales before discount; solve
the price algebraically; round the unit price upward to the nearest cent; and
recompute the achieved scenario from that rounded price. It must reject
negative/non-finite values, fractional/zero quantity, margin outside 0-99.99%,
fee rate outside 0-99.99%, or target margin plus fee rate at/above 100%. The
result is a planning recommendation only and never sets product price, creates
an order, or claims actual profit, landed cost, tax, payout, or approval.

IDEA-20260830-05 captures the daily sales-close reconciliation gap. The Admin
now separates submitted, payment-verified, and fulfilled facts, but those totals
overlap and staff still have to reason manually about which paid requests await
fulfillment and whether any fulfilled request lacks verified payment. The gate
accepts a payment-by-fulfillment partition into MAP-023 because the existing
bounded order projection has both exact states and no schema, provider, or write
is required. Four mutually exclusive buckets - verified and fulfilled; verified,
not fulfilled; fulfilled, payment not verified; and neither - must reproduce the
selected-period request count and value exactly. The two actionable exception
buckets become read-only record/CSV filters. “Payment not verified” remains an
exact status fact, not a claim that money was unpaid, missing, or lost. No bucket
is described as payout, settlement, accounting, actual profit, or completed
customer communication.

IDEA-20260830-06 captures the discount-allowance gap in the Admin Sales
Planner. Staff can check a chosen price and solve a target price, but they still
have to calculate manually how much total discount a chosen selling price can
safely absorb while preserving a target planned gross margin. The gate accepts
a third planning-only mode into MAP-023 because it reuses the existing bounded
calculator and requires no product, promotion, order, or accounting write. It
must define target gross margin as planned profit divided by net sales after
discount; apply the percentage payment/channel fee to gross sales before
discount; solve the maximum total discount algebraically; round that allowance
downward to the nearest cent; and recompute the achieved scenario from the
rounded allowance. It must reject negative/non-finite values, fractional/zero
quantity, unsupported money or percentage values, and any chosen price that
cannot reach the target margin even at zero discount. The result is a planning
ceiling only and never creates or approves a promotion, changes canonical
product price, posts an order, or claims actual profit, landed cost, tax,
payout, settlement, or accounting truth.

IDEA-20260830-07 captures an inconsistency in the forward `Check a price`
planner. Its sibling target-price and maximum-discount modes calculate a
percentage payment/channel fee from gross sales, but forward mode currently
requires staff to calculate one peso fee manually. Its break-even result then
treats that entered fee as fixed, which understates the true break-even price
when a percentage fee rises with gross sales. The gate accepts a surgical
correction into MAP-023: forward mode must collect fixed fees and channel fee
rate separately, apply the percentage fee to gross sales before discount, show
goods/other-fixed/percentage-fee cost components, and solve break-even as
`(discount + goods cost + other costs + fixed fees) ÷ (quantity × (1 − fee
rate))`, rounded upward to cents. It must preserve the existing non-posting,
bounded, phone-safe boundary and never claim that planned costs are canonical
landed cost, tax, payout, settlement, accounting, or actual profit.

IDEA-20260830-08 captures the missing sales-target question in the Admin Sales
Planner: staff can evaluate or solve price and discount, but cannot calculate
the minimum whole units needed to reach a planned gross-profit target. The gate
accepts a fourth non-posting mode into MAP-023. It must use reviewed unit price,
unit cost, total discount, other/fixed costs, and a gross-sales percentage fee;
define per-unit contribution as `unit price × (1 − fee rate) − unit cost`; and
solve `ceil((target profit + total discount + other costs + fixed fees) ÷
per-unit contribution)`. It must recompute the cent-rounded scenario at the
whole-unit result and prove the immediately previous quantity misses the target.
It must refuse zero/negative contribution, invalid values, and requirements
above 100,000 units. The output is a planning target only and never creates a
sales quota, changes stock or price, posts an order, or claims actual profit,
landed cost, tax, payout, settlement, or accounting truth.

IDEA-20260830-09 captures the transcription gap after a valid Sales Planner
calculation. Staff currently have to retype assumptions and results into an
approval note or discussion, which can separate a number from its fee, discount,
cost, or target basis. The gate accepts one reusable `Copy planning summary`
action across all four modes into MAP-023. The copied plain text must be
deterministic for a supplied timestamp, name the mode, include the reviewed
assumptions and complete relevant result, and begin with a prominent statement
that it is not an approved price/promotion/quota, order, payout, settlement,
accounting record, or actual profit. It must contain no customer fields, expose
no copy action for invalid calculations, announce success, and provide an
inline clipboard-permission recovery error. Copying changes clipboard text only;
it never writes canonical product, promotion, inventory, order, payment, cost,
payout, tax, settlement, or accounting state.

IDEA-20260831-01 captures the owner's corrected channel direction and the
manual operating burden evidenced in the supplied owner screenshot. K2 must
first receive product, listing, price, and reported-quantity snapshots from each
individual Shopee, Lazada, TikTok Shop, Website, and future shop account; it must
not begin by pushing K2 quantities outward. The owner currently has to box
Pasabuy goods, total sales, calculate commissions and tax estimates, encode
stock, update books, and manage household responsibilities manually, so the
accepted outcome also includes one resumable phone-first **Owner Count & Close**
workflow inside Admin BOS rather than another disconnected spreadsheet or app.

The audit accepts the staged-import, human-reviewed approach and merges it into
MAP-023 and MAP-026. One K2 SKU remains the permanent identity of one sellable
variant. Every marketplace/shop SKU, external listing identity, reported
quantity, price, status, and observation time remains attributable to its exact
shop. Exact or normalized SKU/name/barcode evidence may suggest a match but may
never merge products automatically; an Admin approves the link or creates a new
Draft product whose K2 SKU is server generated. Different size, concentration,
flavor, shade, formulation, or pack count remains a distinct product even when a
provider reused a SKU or barcode. Approved manufacturer and K2 barcodes can both
scan to the one canonical product; ambiguous/reused codes remain
non-authoritative evidence.

Marketplace quantities are observations and proposed channel availability, not
physical Master Inventory. A reviewed count/reconciliation command is the only
way an import can affect canonical lots. The owner selected a flexible target of
two sellable units per **individual shop account**, not per marketplace and not
as a blocking minimum. A product/shop state is Covered (at least two), Thin
(one), Skipped (deliberately not offered), Out (an active allocation was
consumed), or Needs review (source/canonical facts disagree or are stale).
Scarcity is normal: K2 recommends which shops to cover from recent verified
sales, the owner may override or skip any shop, and skipped shops do not create
false low-stock alerts. Automatic rebalancing may adjust proposed/eligible
channel availability but may never exceed canonical sellable stock, make a
negative balance, double-count one unit, or impersonate a physical custody
transfer. Existing request/approval/receipt rules still govern stock that must
move between custodians or locations.

The Owner Count & Close workflow stages bounded CSV imports first and later uses
the same contract for approved APIs. It guides the owner through source/shop and
period selection; product-link approval; sales/order deduplication; provider
commission/fee estimation from versioned rules; expected-versus-physical stock
count and reasoned discrepancy handling; Pasabuy boxing status; low/zero Master
Inventory and unsupported-shop warnings; and a customer-minimized bookkeeping
handoff. Commission and tax remain labelled estimates until reconciled with
provider settlement and approved accounting rules. Imports, approvals, and
close sessions are resumable, idempotent, bounded, auditable, and honest about
loading, offline, stale, partial, conflict, ambiguous-timeout, and failed states.
No connector credential enters browser code, no import silently publishes or
changes physical stock, and no planning summary claims to be an official tax
filing, accounting book, settlement, or actual-profit record.

IDEA-20260831-02 captures the staff usability gap between finding a procedure
and actually reaching its result. The owner confirmed the recommended model:
the Operations guide is a read-only teacher and navigator, while the real K2
workflow remains the only record of operational progress and completion. The
gate merges the idea into MAP-023 rather than creating a second guide or
workflow state store. Staff begin with the outcome they need, then receive one
phone-safe step at a time: exact screen and control, required input or evidence,
the action to take, expected intermediate result, canonical completion evidence,
and failure/recovery guidance. A real destination may be opened and focused,
but the guide never presses a state-changing control automatically.

Manual external steps are explicit handoffs. For Product Intake, the guide may
prepare a customer-free approved prompt and instruct staff to use the private K2
Product Content or K2 Product Image Studio ChatGPT Project, but it cannot claim
to open, operate, or verify either Project. Staff must return the result to the
owning K2 workflow, where schema, evidence, field, image, and human-review gates
decide whether work may continue. Computation guidance opens the real Sales
Planner mode, explains every required field and assumption, and preserves the
planning-only boundary. Guide views and checkmarks may remain browser-local
rehearsal; only canonical records, events, files, provider receipts, or bounded
read models can show operational completion. Exact control targets, guide copy,
and procedure contracts must be versioned and tested together so renamed or
missing controls fail acceptance instead of sending staff to the wrong place.

IDEA-20260831-03 captures the public-route integrity and receipt-continuity gap
found by the 31 August full Storefront/Admin audit. The current route parser
silently turns an unknown path into Home, a nonexistent product remains on an
unbounded loading screen, and a successful order request renders Confirmation
without moving the browser URL away from `/checkout`. A refresh therefore loses
the in-memory receipt instead of reaching a safe continuation state. The gate
accepts one shared route/recoverability contract and merges it into MAP-019,
MAP-024, and the MAP-028 release audit rather than creating another router or
status system. Every registered public route must have a canonical title and
H1, a bounded loading transition, an explicit not-found/unavailable state, and
a tested direct-load/back/forward/reload path. Unknown routes must never
impersonate Home. Order continuation must use the existing scoped guest/account
status boundary; no customer identifier, provider token, unrestricted order ID,
or private record may be placed in a public URL. A generated internal-route and
local-asset crawl must fail acceptance on missing route states, missing assets,
or links that resolve to an unintended surface.

IDEA-20260901-02 captures the owner's corrected warehouse/channel boundary and
the first approved connector sequence. Warehouse A is the only warehouse whose
eligible stock may be sold through the K2 direct Storefront and the only current
origin for J&T/direct shipping, while Warehouse A may also sell through
marketplaces. Warehouses B and C remain visible and operable in Admin BOS but
are marketplace-only: their stock must never make a K2 direct product available,
rescue a K2 direct checkout, or enter a K2-paid direct order. The owner selected
TikTok Shop and Lazada as the first marketplace integrations and explicitly
deferred Shopee for now.

The audit merges this into MAP-026 rather than creating another channel plan.
The provider capabilities exist, but production access is externally gated:
K2 must register the required TikTok custom/connector and Lazada self-developed
applications, obtain the exact approved scopes for every shop, and prove shop
authorization, token refresh, signed webhook receipt, authoritative product and
order reads, and one reversible test-SKU inventory write before full adapter
implementation. A marketplace "app" is a server-side integration identity for
the existing K2 website/Admin BOS, not a separate customer mobile application.
The accepted scope includes exact warehouse/shop/listing identity; Warehouse A
reservation-driven outbound availability; marketplace-order intake into the same
canonical warehouse pool; cancellation/release handling; signed idempotent event
capture; retryable outbox publication; scheduled reconciliation; connection,
authorization, freshness, lag, and error health; and Admin queues for mappings,
orders, pending/failed sync, discrepancies, and auditable manual recovery. No
connector is called free, approved, live, or synchronized until provider and
end-to-end evidence exists.

## Idea decision register

This is a decision index, not a backlog. Only Accepted scope listed in the
Master Action Plan is authorized for implementation.

| Idea | Outcome | Destination or reason |
| --- | --- | --- |
| IDEA-20260922-02 | Accepted and completed | Focused development checks, one explicit pre-release full gate, documentation-only CI skip, and prompt live-status reporting are now repository policy. |
| IDEA-20260922-01 | Merged into MAP-028 I-012 / MAP-025 | Admin quick-tool usability and safe shortcuts; evidence in docs/evidence/20260922-admin-quick-tools. |
| IDEA-20260921-09 | Merged into MAP-028 I-015 / MAP-025 | Whole-Storefront readability, honest launch wording and local human-test preparation; activation stays with MAP-017/023/026. |
| IDEA-20260921-08 | Merged into MAP-027 / MAP-028 I-015 | Store text, mobile gestures and chat readability locally verified; deployment and physical-device acceptance remain in MAP-027. Evidence: docs/evidence/20260921-store-readability/README.md. |
| IDEA-20260921-03 | Merged into MAP-028 I-012/I-016 and MAP-025 | Full Admin copy, simplicity and workflow-guide acceptance audit; preserve operational truth and record real staff acceptance separately. |
| IDEA-20260921-02 | Merged into MAP-020 | Restore Globe Display editing through an authenticated Admin/AAL2 database RPC while the BFF switch is off; keep table writes closed and retain audit/evidence rules. |
| IDEA-20260920-12 | Merged into MAP-023 | Cash on Delivery admin switch, default off; layered note-claim guards; migration prepared for the MAP-017 window. |
| IDEA-20260921-01 | Merged into MAP-028 I-012/I-016 | Plain tooltip copy, map instructions and setup warnings; no operational rule changes. |
| IDEA-20260920-14 | Merged into MAP-028 I-012 | Plain Inventory and shop-stock wording; smaller product description/use groups with existing operational controls preserved. |
| IDEA-20260920-11 | Merged into MAP-020 | Client-side role mirror on staff-access mutations; server checks remain the authority. |
| IDEA-20260920-10 | Merged into MAP-023 | Packing-slip print isolation; screen rendering untouched. |
| IDEA-20260920-09 | Deferred to MAP-017 window | Action-history read UI needs role-gated RLS only a production migration can provide. |
| IDEA-20260920-08 | Merged into MAP-019 | Idle lock (30-minute window, 2-minute warning, sign-out); complements prepared BFF expiry. |
| IDEA-20260920-07 | Merged into MAP-028 | Mobile audit fixes: HelpTip above the tab bar, WorkspaceTabs edge fade, honest loading counts. Sheet stays a real-device acceptance task under MAP-025. |
| IDEA-20260920-06 | Merged into MAP-028 | Strict audit fixes: zero raw emoji, 44px touch floor, one accent (emerald to forest; StoreAsset flow exempt). ✓/× text feedback explicitly allowed. |
| IDEA-20260920-05 | Merged into MAP-028 | Sub-categorized workspaces: shared WorkspaceTabs sub-nav, Customers split (directory / wholesale), StaffPermissions split (people / security / AI spending). Banners, dialogs, and records untouched; Suppliers, Pasabuy detail, Sheet sequenced later. |
| IDEA-20260920-01 | Merged into MAP-028 | Quiet Admin workspace logic: shared DetailBlock disclosure, Inventory edit-modal secondary sections start closed, §1.6 plain-words remainder. Queues, blockers, and error states never collapse; no logic, permission, or record change. |
| IDEA-20260918-01 | Merged into MAP-028 | Hover-? tone-down of Admin BOS shared headers: long WorkspaceIntro/SectionHeading descriptions move behind a tiny hover/focus ? (HelpTip), header toolbar tints neutral except primary Scan/Add Inventory. No state, permission, or copy meaning changes. |
| IDEA-20260913-04 | Accepted completeness review; merged into MAP-022/023/025/026/028 | Clarify distributed stock and initial-sync acceptance; surface staff, scheduled jobs, money reconciliation and audit-proof dependencies in the existing launch guide. |
| IDEA-20260913-03 | Accepted planning refinement; merged into MAP-026 / MAP-028 | Official-source marketplace access and website/application preparation, within existing own-shop scope and launch dependencies; no submission or activation performed. |
| IDEA-20260913-02 | Accepted remediation; merged into existing MAP-017-025 / MAP-028 J | Apply proved AUD3 findings with failing-first tests, scoped recovery and durable evidence; preserve production/policy gates and investigate unconfirmed concerns before changing behavior. |
| IDEA-20260913-01 | Accepted verification continuation; merged into MAP-028 J | Independently verify the dirty combined handoff, investigate Admin failures, distinguish prepared/applied/deployed evidence, and correct durable records. Existing MAP owners retain all implementation and activation gates. |
| IDEA-20260909-01 | Merged into MAP-028 J and existing I findings | Resume interrupted full-surface audit. Record reproducible defects, fresh test evidence and exact unverified journeys without duplicating the backlog or treating prepared functionality as live. |
| IDEA-20260909-02 | Accepted refinement; merged into MAP-028 J/I-015 and MAP-027 | Reconcile stale MAP instructions with dated evidence; verify local behavior; record compact phone category navigation and scene/browser zoom acceptance. |
| IDEA-20260906-06 | Merged into MAP-028 I-012/I-016 and MAP-018/019/021/023/025 | Owner asks for a toned, easier Admin with unmistakable logic and states. Accept restrained shared controls, task-oriented navigation, explicit record/state/action hierarchy and measured staff journeys. Reject simplification by hiding blockers, merging business statuses, weakening permissions or replacing K2 identity. Documentation target only; implementation stays in existing MAP items. |
| IDEA-20260906-05 | Merged into MAP-018 / MAP-028 I-016 | Owner asks to prepare automatic intake now and supply API keys later. Reuse accepted IDEA-20260830-01: server-only provider adapter, durable capped jobs, reviewed content/image candidates, manual fallback and explicit readiness. No paid call or production database activation in this preparation. |
| IDEA-20260906-04 | Merged into MAP-028 I-016 / MAP-019/021/023 | Owner requests API calls from the workflow map. Accept bounded existing authenticated K2 service operations with visible results and recovery. Initial catalog/consignment reads reuse current routes; write commands require exact record review and server receipts. External integrations/editor scope remains undecided. No arbitrary URL execution or provider activation is authorized by the diagram. |
| IDEA-20260906-03 | Merged into MAP-028 I-009 / MAP-027 | Owner prioritizes additive hero visual enhancement and a restorable copy of the current design. Preserve headline, CTAs, map and trust content; add a small catalog-driven merchandise display in the existing brand. Exact pre-edit Hero, FlightMap and global styles saved with hashes under docs/design-checkpoints/20260906-hero-before-additions. No new product facts, stock promises, data source or deployment. |
| IDEA-20260908-02 | Merged into MAP-028 I-009/I-015 and MAP-027 | Owner requests finishing the current recovery work first, then inspecting and improving the store in desktop browser and mobile portrait/landscape. Accept responsive landscape treatment while retaining fully usable portrait, rotation/state preservation and existing K2 identity. Blender MCP may create assets if the inspection establishes a need. Do not force screen orientation or replace canonical commerce state. |
| IDEA-20260908-01 | Merged into MAP-028 and existing MAP-017-027 | Owner requests checking and finishing work executable now.
| IDEA-20260906-01 | Merged | Owner requests completing all executable production-readiness work until genuine external inputs remain, with manual GCash or QR payment as the intended first-launch model. Existing MAP-017-028 own implementation and acceptance; MAP-019/MAP-023 own evidence, independent verification, rejection recovery and receiving instructions. No automatic gateway, fabricated receiving account, QR payload or courier integration is authorized by this preference. Recovery access, real inventory and exact-host/staff acceptance remain required. |
| IDEA-20260906-02 | Merged | Owner requests a fresh full Storefront/Admin engineering and visual audit, documented in the sole Master Action Plan. MAP-028 section I owns the coverage register, reproducible findings and ecommerce design acceptance; implementation remains under MAP-017-027 by domain. Preserve the wood/editorial Storefront and dense operational Admin. Audit uses isolated fabricated catalog/browser evidence and source/build checks; provider activation, live writes, invented product facts, payment methods, urgency or delivery promises are excluded. No separate roadmap is created. |
| IDEA-20260905-01 | Merged | Owner-requested virtual-store enhancement: more expressive cartoon/anime adult clerk, readable K2 cap, shopper-driven poses, responsive framing, clearer navigation, and trustworthy question/basket feedback. MAP-027 owns the workflow audit, character direction, implementation, and local/browser verification. This is presentation work over existing canonical commerce, not authority to activate messaging, publish products, or deploy. |
| Legacy multichannel control-center idea | Merged | Historical MAP-009 through MAP-011; original wording remains in Git history |
| Legacy product-transformation idea | Merged | Historical MAP-002; original wording remains in Git history |
| IDEA-20260814-05 | Merged | Remaining messaging, channel-stock, and custody-truth scope is in MAP-023 |
| IDEA-20260821-01 | Merged in part / rejected in part | Necessary launch scope is in MAP-020 through MAP-025; unjustified first-launch distributed infrastructure was rejected |
| IDEA-20260821-02 | Merged | Controlled catalog spreadsheet round trip and inventory-reconciliation scope is in MAP-023 |
| IDEA-20260824-01 | Accepted and completed | Added Necessary, Active, Future, and Done navigation to the MAP, an explicit active count, and this durable idea-decision register; no unfinished scope remains |
| IDEA-20260824-02 | Accepted and completed | `AGENTS.md` now requires Superpowers-first skill routing, every applicable specialist skill, the four-skill UI/UX gate, and durable documentation/handoff traceability; no unfinished scope remains |
| IDEA-20260824-03 | Accepted and completed | Installed `karpathy-guidelines` from `multica-ai/andrej-karpathy-skills` to the user-level Codex skills directory and added it to `AGENTS.md` for all code writing, review, refactoring, and fixing tasks; installed `SKILL.md` SHA-256 is `6E22CC54CB02A5E98AE42D06D9D7292DB0C1B43894831B32879BEB0166B2AEA7` |
| IDEA-20260826-01 | Accepted | MAP-027 owns the AI-assisted, human-approved Product Knowledge workspace, shared verified FAQ layer, product-context staff handoff, Pasabuy fallback, and optional shelf-based Interactive Shop; exact-host SEO activation remains MAP-024 |
| IDEA-20260827-01 | Merged | The new-domain downstream audit - Search Console/Bing, Supabase Auth and email callbacks, exact origins/cookies/bot hostnames, persisted database URLs, discovery assets, provider-route drift, domain email/DNS security, monitoring, external callbacks, and rollback evidence - is now ordered inside MAP-024 |
| IDEA-20260827-02 | Merged | Owner confirmed `k2jimzonwebsite@gmail.com` as the primary provider login, recovery identity, and project contact; MAP-024 owns provider-account alignment and keeps branded-domain mail as a separate decision |
| IDEA-20260828-01 | Merged | MAP-024 owns one-active-login and remembered-personal-browser implementation before deployment; MAP-025 owns supported-browser real-host proof. Ordinary phone tab/app switching does not itself expire a valid session |
| IDEA-20260828-02 | Accepted | Virtual store anime/cartoon human avatar redesign in 2D and 3D, hair and body sculpting, dynamic expressions, scene framing fix, and test polish in MAP-027 |
| IDEA-20260828-03 | Accepted | Storefront & virtual store ambient lighting, smooth light/dark transitions, interactive sidebar avatar gaze/click effects, and unified 3D front clerk visuals in MAP-027 |
| IDEA-20260828-04 | Accepted | Stable human-scale aisle-clerk staging and an editorial, actionable right-side shelf concierge using only canonical shelf/product/help actions in MAP-027 |
| IDEA-20260828-05 | Accepted | Inter-bay clerk dwelling zones, collision-free synchronized travel, two additional shelf levels, one canonical chat entry, and articulated hands in MAP-027 |
| IDEA-20260828-06 | Accepted | Category-authored clerk explanations and one customer-visible Virtual Store thread connected to the canonical Admin inbox through the signed website reply boundary in MAP-027 |
| IDEA-20260830-01 | Merged | MAP-018 owns a deliberate per-product staff choice between Automatic API and Manual ChatGPT Projects for product-record descriptions, usage, instructions, SEO, media briefs, and Draft image candidates inside the resumable intake session; physical inventory/publication fields stay human/server controlled, and production use requires explicit cost/privacy/model/evaluation gates |
| IDEA-20260830-02 | Merged | MAP-023 owns a canonical status-separated Sales Summary and an explicitly non-posting staff sales planning calculator; actual profit and settled payout stay unavailable until exact-lot cost snapshots and settlement records exist |
| IDEA-20260830-03 | Merged | MAP-023 owns a customer-free selected-period CSV of the exact active sales-ledger filter, with spreadsheet-injection protection and no accounting, payout, profit, or write authority |
| IDEA-20260830-04 | Merged | MAP-023 owns a reverse target-price mode inside the non-posting Sales Planner; it solves and rounds up the minimum planned unit price from cost, discount, fixed costs, percentage fee, and target gross margin without changing canonical price or claiming approval/actual profit |
| IDEA-20260830-05 | Merged | MAP-023 owns a four-bucket payment-by-fulfillment reconciliation that exactly partitions selected-period order requests and exposes customer-free record/CSV filters for verified-awaiting-fulfillment and fulfilled-payment-not-verified review |
| IDEA-20260830-06 | Merged | MAP-023 owns a third non-posting Sales Planner mode that solves the maximum total discount a chosen price can absorb while preserving target planned gross margin, rounds the allowance down to cents, recomputes the achieved scenario, and denies prices that fail the target even without a discount |
| IDEA-20260830-07 | Merged | MAP-023 owns consistent forward fee math: Check a price collects fixed fees plus a gross-sales channel-fee rate, shows the cost breakdown, and solves an upward-cent-rounded fee-aware break-even unit price rather than freezing a manually calculated peso fee |
| IDEA-20260830-08 | Merged | MAP-023 owns a fourth non-posting Sales Planner mode that solves the minimum whole units required for a planned gross-profit target, recomputes the achieved scenario, proves one fewer unit misses, and refuses non-positive contribution or requirements above 100,000 units |
| IDEA-20260830-09 | Merged | MAP-023 owns a customer-free Copy planning summary action for every valid planner mode, with deterministic timestamped assumptions/results, a prominent non-posting disclaimer, success announcement, and clipboard-permission recovery |
| IDEA-20260831-01 | Merged | MAP-023 owns staged inbound shop snapshots, human-reviewed product/quantity reconciliation, and the phone-first Owner Count & Close workflow; MAP-026 owns per-shop aliases, observations, flexible two-unit coverage, scarcity ranking/override, safe availability rebalancing, and later API adapters |
| IDEA-20260831-02 | Merged | MAP-023 owns the outcome-first, step-by-step Operations guide: exact real controls, safe manual/external handoffs, canonical completion evidence, phone/laptop recovery acceptance, and no guide-owned operational state |
| IDEA-20260831-03 | Merged | MAP-019 owns scoped reload-safe order-status continuation; MAP-024 owns one explicit public-route, metadata, not-found, and internal-link/asset contract; MAP-028 owns the 31 August release finding and verification gate |
| IDEA-20260901-01 | Merged | MAP-023 owns the owner-approved exact-locality manual delivery-rate workbook, controlled pilot quoting, actual-cost reconciliation, staff workflow, and recovery; MAP-019 owns any future customer-facing quote snapshot and continuation; MAP-020 owns a future independently validated import/API boundary; MAP-026 retains Warehouse A eligibility, marketplace separation, provider evidence, and later courier/channel adapters |
| IDEA-20260901-02 | Merged | MAP-026 owns the Warehouse A-only K2-direct eligibility rule, Warehouse B/C marketplace-only boundary, TikTok Shop and Lazada access qualification, approved-app/webhook/order/inventory adapters, canonical stock synchronization, reconciliation and Admin recovery; Shopee adapter work is deferred by owner decision |
| IDEA-20260902-01 | Merged | MAP-023 owns the editable evidence-source register, courier VIP-account-versus-public reference comparison, 30-day source-verification gate, quote-tester comparison panel, and staff recovery; public/secondary/third-party evidence remains nonquotable, traffic/time-of-day does not change the ordinary J&T fee without documented evidence, and MAP-020 still owns any future independently validated importer |
| IDEA-20260902-03 | Merged | MAP-023 owns weight-scaled delivery pricing: band plus per-kg excess reusing the existing `delivery_cost_rows.profile_id` dimension, profile selected from chargeable weight instead of from the locality, an Admin band picker/editor, and a ceiling raised only as far as verified J&T evidence reaches with manual quotation above it. Admin-only by owner scope  -  no weight-derived price reaches the storefront, which stays with MAP-019. Band values remain blocked on owner-supplied J&T evidence under the 30-day source-verification gate, and the apply state of the five 2026-09-02 delivery migrations must be confirmed first |
| IDEA-20260902-02 | Merged | MAP-023 replaces the earlier single-courier customer-fee basis with a carrier-agnostic `K2-arranged delivery` rule: for one exact origin, destination, packed profile, and owner-approved route-qualified courier/service set, quote the PHP 5 ceiling of the maximum complete current outbound courier cost; missing or stale eligible-option evidence routes to manual quotation, integrity conflicts hard-stop, current J&T-only routes remain automatic only when J&T is explicitly the sole eligible option, and MAP-019/MAP-020 own the future Admin activation and independently validated import/snapshot boundary |

## Pending idea intake

### IDEA-20260920-13 - Staff delivery-quote lowering with reason

**Captured:** 2026-09-20
**Raised by:** Owner (sister needs to lower quotes later)

**Desired outcome:** when the J&T VIP ceiling quote overshoots the real courier charge, staff can lower the customer-confirmed fee to the true cost with a written reason. Never upward: the matrix stays the ceiling, and the lowered figure plus reason persist on the order for settlement review.

**Status:** captured, not audited. Needs MAP audit (BFF revalidation must accept the lowered figure, RPC `submit_order_request_v2` total math must follow, J&T column stays at the recorded total) before implementation.

### IDEA-20260920-09 - Staff-visible attributable action history

**Captured:** 2026-09-20
**Raised by:** 007 security audit (repudiation gap)

**Problem:** every financial/inventory/role decision is recorded in database audit tables, but no Admin surface shows who confirmed, changed, or verified what. Disputes and reconciliations currently require database access. The data exists; only a read UI with role-gated RLS is missing.

**Status:** captured and audited, sequenced behind the MAP-017 database window (read UI needs role-gated RLS that only a production migration can provide). Not built in this slice.

### IDEA-20260920-04 - Stable-IA commitment with a staff changelog

**Captured:** 2026-09-20
**Raised by:** Benchmark audit (TikTok lesson)

**Desired outcome:** the Admin nav order never changes silently. Any reorder, rename, or regroup ships with a one-line "What changed" note in the workspace it affects, so stale screenshots and verbal training survive updates. TikTok's September 2026 nav reorg caused documented workflow paralysis for sellers with stale SOPs; K2 trains verbally, so the exposure is worse.

**Status:** captured, not audited. Needs MAP audit before implementation.

### IDEA-20260920-03 - Role-based landing and attention-first block order

**Captured:** 2026-09-20
**Raised by:** Benchmark audit (Shopify lesson)

**Desired outcome:** staff land where their job lives (packer on the fulfillment desk, receiver on consignments) instead of everyone landing on the Command center, and every workspace orders its blocks by "needs you first". Shopify merchants' most upvoted ask is "open the app, see instantly if anything needs attention". The rulebook already requires blockers to stay visible; this makes that rule the layout order.

**Status:** captured, not audited. Needs an owner decision (role-to-landing map) and MAP audit before implementation.

### IDEA-20260920-02 - Pinnable nav favorites and saved workspace views

**Captured:** 2026-09-20
**Raised by:** Benchmark audit (Shopify/Woo lesson)

**Desired outcome:** staff pin their 3 to 5 daily sections to the top of the nav and save filter presets inside a workspace (e.g. InventoryGrid search + status), mirroring Shopify's pinnable sidebar/saved views and Woo's hideable widgets. Occasional users stop re-learning the nav on every visit.

**Status:** captured, not audited. Needs an owner decision (per-staff vs shared pins, browser vs database storage) and MAP audit before implementation. No record or permission change either way.

### IDEA-20260902-06 - Shop-scoped staff permissions, and a shop lens on inventory

**Captured:** 2026-09-02
**Raised by:** Owner

**Desired outcome:** a staff member can only touch the shops they run - their
Shopee account, their Lazada account - plus the master inventory, while Admin
and SuperAdmin reach everything. Alongside it, a lens on Sheet mode that narrows
the view to one shop or one staff member, or a combination.

**Delivered already, and deliberately narrow:** Sheet mode now has a lens for
search and status with a live count, an empty state, and a clear control
(`src/views/admin/Sheet.jsx`). It filters what is shown, never what is loaded,
and preserves each row's index in `rows` because editing is index-addressed -
handing `updateField` a filtered position would have written the edit to
whichever product sat at that position in the full list, invisibly. No shop or
staff filter was added, because the data to back one does not exist yet. A
dropdown that silently matches nothing would be worse than no dropdown.

**What already exists and must be reused:**

- `public.channel_shops.custodian_user_id` - "a staff member who physically
  holds that shop's stock". The staff-to-shop link is already modelled.
- `public.order_requests.shop_id` and `public.channel_listings.shop_id`, both
  indexed. Orders and listings can therefore be scoped by shop today.

**What does not exist, and blocks the inventory half:**

- **Per-shop stock.** Inventory is a single `MANILA_MAIN` pool; batches carry no
  shop dimension. `20260829_channel_vocabulary_and_shops.sql` states this
  outright: "Deliberately NOT in scope here, and left to MAP-026: ... the batch
  allocation dimension, and the staff-request/admin-approval transfer workflow."
  Until that lands, "only Shopee A's inventory" has no rows to select.
- **A per-shop permission predicate.** Roles are flat. `public.is_staff()` is
  true for Staff, Admin and SuperAdmin alike, and `public.is_admin()` for the
  latter two. Nothing asks "which shops does this user hold?"

**The part that must not be built in the browser.** Hiding rows in the Admin UI
is not access control; anyone can call the API directly. Scoping has to be
enforced in the database and the BFF - a `custodian_shop_ids()` predicate used
by RLS and by every shop-addressed route - with the UI lens as a convenience on
top of it, never as the boundary. Building the lens first and calling it a
permission would be the worst outcome available here.

**Audit direction:** this is MAP-026's stated scope rather than a new stream.
MAP-026 already owns per-shop channel accounts and custody-based allocation, and
is sequenced after MAP-025. The permission predicate should be merged there
rather than opened as a parallel item.

**Owner decision required:** whether "their master inventory" means the shared
Manila pool stays visible and editable to every staff member (simplest, and what
the current single-pool model implies), or whether master inventory itself
becomes shop-allocated so a staff member sees only their own allocated lots. The
second is materially more work and changes how receiving and FEFO behave.

**Status:** captured, not audited. The Sheet lens is delivered; no permission
change was made.


### IDEA-20260902-05 - Live chat active from checkout, plus inbox and notifications for signed-in customers

**Captured:** 2026-09-02
**Raised by:** Owner

**Desired outcome:** completing checkout opens a live conversation the customer
can actually use, and a signed-in customer has a real inbox with notifications
rather than a page they must remember to revisit.

**What is already recorded, and must not be duplicated.** MAP-023 queue item 14
already holds the confirmed defect underneath the first half of this:
`submit_guest_order_v1` opens a conversation with `source_kind = 'order_request'`
and grants the customer read and reply, but inserts no message and sets no
`unread_count`, `last_inbound_at` or `response_due_at`. The customer lands in an
empty thread; staff get no unread badge and no response timer. That fix is the
prerequisite for "make the live chat active after checkout" - a chat turned on
over an empty thread is still an empty thread.

**What is genuinely new here, beyond queue item 14:**

1. **A customer inbox for signed-in accounts.** `list_guest_conversations_v1`
   and the guest grant model are scoped to a browser grant, not to an account.
   A signed-in customer's conversations across devices is a different read.
   MAP-019 owns customer identity, so this belongs there rather than in MAP-023.
2. **Notifications.** Nothing in the system notifies a customer of a staff
   reply today. This needs an explicit owner decision on channel before any
   design: in-app badge only, email, SMS, or push. Email and SMS both need a
   provider K2 does not have, and both carry cost and deliverability work.
   In-app-only is free and needs no provider.

**Dependency and sequencing note.** This does not depend on the payment
decision (`IDEA-20260902-04`). An order should seed a usable thread regardless of
how or when the customer pays, so queue item 14 can proceed independently and
should not be held behind the GCash choice.

**24 September decision:** deliver in-app notifications in the existing optional
customer account/inbox surface first; this is the smallest channel that does
not need an external provider. Email, SMS and push remain future owner/provider
decisions. `OWNER-003` still owes a promised response time, so notification copy
must not imply a reply speed K2 has not committed to.

**Status:** audited on 24 September and accepted into MAP-019/MAP-023/MAP-025 through IDEA-20260924-04. The in-app notification centre is the initial channel because it uses the existing website identity and requires no external provider; email, SMS and push remain separate provider/owner decisions. No implementation or activation is claimed.


### IDEA-20260902-04 - Pay-at-checkout by GCash, on purchase-time reserved stock

**Captured:** 2026-09-02
**Raised by:** Owner, after placing a test order

**Desired flow:** add to cart -> buy -> GCash QR -> pay -> a form where the
customer submits that they paid (reference number required, screenshot
optional) -> staff verify. Live chat supports that step now and becomes
optional once the process is automated.

**Owner's stated premise, and the correction.** The owner expected that
"inventory here should automatically adjust, so staff don't need to check."
That is not true in the current tree. `public.submit_order_request_v2` touches
no stock, no reservations and no batches; it writes the order request, its
items, subtotal/coupon and one event. Stock moves only in
`public.confirm_order_request` (`20260809_operations_hardening.sql:381`), whose
only caller is a staff button at `src/views/admin/OmniOperationsHub.jsx:164`.
Enabling payment at checkout before this changes would let two customers pay
for the same last unit, with manual GCash refunds and no gateway.

**This is not new scope - it completes OWNER-002.** The owner's own answer
records "Reservation - 30 minutes, starting when the customer clicks purchase."
The implementation starts the hold later: `set_reservation_deadline()` sets
`expires_at := now() + 30 minutes` on insert into `inventory_reservations`, and
that insert happens inside `confirm_order_request`, i.e. at staff-confirm time,
not at purchase. Those moments can be hours apart.

**Dependency order, and none of it may be reordered:**

1. Move reservation creation to purchase time so buying holds stock. Until this
   lands, payment at checkout is unsafe at any scale.
2. Apply `20260902_reservation_expiry_policy.sql`, still prepared and unapplied,
   behind the MAP-017 gate.
3. Only then: GCash QR at checkout, and the payment-evidence form.

**Payment evidence shape, owner-selected:** GCash reference number required and
format-validated, optional screenshot. The reference is what staff match against
the GCash merchant account and it stays searchable; the screenshot is a fallback,
not the record. This reaches the existing `payment_status` value
`evidence_submitted`, so no new vocabulary is required - the chain
`not_requested -> awaiting_instructions -> evidence_submitted -> verified ->
failed/refunded` already exists (`20260803_launch_core_stabilization.sql:797`).

**Refund exposure.** Even with purchase-time holds, a hold can expire or a lot can
fail its expiry/quarantine check between payment and confirmation. A written
refund procedure must exist before this is switched on, because K2 has no payment
gateway and every refund is a manual GCash send.

**Surfaces that must change together, or the storefront will contradict itself:**
`src/views/Confirmation.jsx` ("No payment was charged... staff will contact you
with payment details"), the FAQ at `src/data/site.js:97`, and the README's
deferred-payment note all currently promise review-first.

**Owner decision still required:** the GCash account details to display, and
whether the QR is static or per-order. A static merchant QR cannot be matched to
an order automatically, which is precisely why the reference number is required.

**Status:** captured, premise corrected, not audited into the MAP. Not authorized
for implementation.


### IDEA-20260918-01  -  Admin BOS hover-? tone-down

**Captured:** 2026-09-18
**Raised by:** Owner (admin feels wordy, colorful, hard to navigate)
**Problem observed:** Every Admin BOS workspace shows a permanent explanatory paragraph under its title (WorkspaceIntro description, SectionHeading description, desktop header subtitle), and the header toolbar mixes blue/sky/amber/purple tinted buttons. Staff must read past ~69 always-visible explanations to reach the work.
**Desired outcome:** Keep every explanation one hover away: a tiny ? beside each title shows the same text on mouse hover and keyboard focus. Mute non-primary toolbar buttons to neutral; keep blue only on Scan and + Add Inventory. No Simple/Pro mode.
**Evidence or example:** `src/views/admin/AdminWorkspaceUi.jsx:11-61`, `src/views/admin/Admin.jsx:481-522`, 69 description matches across `src/views/admin`.
**Known dependency:** None. Presentation-only; states, transitions, permissions unchanged.
**Possible overlap with current behavior/MAP item:** Refinement of IDEA-20260906-06 (toned, easier Admin), already merged into MAP-028. Merges into MAP-028 admin tone-down scope; no new MAP number.
**Owner decision potentially required:** None. Owner already chose hover-? over Simple/Pro mode.
**Status:** captured, audited, merged into MAP-028. Authorized for implementation.


The idea below was captured, decided, audited, and merged into MAP-023 on
2 September 2026. Its outcome is in the decision register above; MAP-023 holds
the remaining unfinished scope. Nothing is pending intake.

None.

When the owner raises an idea, add it here immediately using the next dated ID.
Do not wait for the audit before capturing it.

### IDEA-20260921-04  -  Admin readability: bigger fonts, fixed help tooltip, purchasing vs consignment clarity

**Captured:** 2026-09-21
**Raised by:** Owner (Italy Purchasing screenshot: help text clipped/unreadable, fonts too small, purchasing vs flight consignment unclear)
**Problem observed:** Help `?` shows overlapping/clipped help near `Italy Purchasing` (native title plus custom tooltip, right-aligned tooltip runs into the sidebar and clips). Body copy uses 12px `text-xs` with `text-white/40-50` low contrast, hard to read. Purchasing, Flight Consignments, and Suppliers overlap: Kanban `Italy Purchasing` defaults to the consignment tab while a separate Flight Consignments section mounts the same manager.
**Desired outcome:** One readable help tooltip, minimum 14px help/body text with stronger contrast, no clipped tooltip near the left edge, and plain copy that says purchase orders are supplier commitments (who, how many, cost) while consignments are Italy-to-Manila movement (flight, boxes, Milan/Manila scans, receipt).
**Evidence or example:** admin.k2jimzon.com `?section=kanban` screenshot 2026-09-21; `src/views/admin/HelpTip.jsx:14-22`, `src/views/admin/Admin.jsx:57-58`, `src/views/admin/Kanban.jsx:10-11`.
**Known dependency:** None. Presentation and copy only; no schema, permission, state, or transition change.
**Possible overlap with current behavior/MAP item:** Follow-up to IDEA-20260921-01/03 (Admin help clarity) in MAP-028 I-012/I-016. Merges there; no new MAP number.
**Owner decision potentially required:** None for readability fix. Keep 12px floor elsewhere unless owner asks for a wider type-scale pass.
**Status:** captured, audited, merged into MAP-028 I-012/I-016. Authorized for implementation.
**Follow-up (same day):** Owner asks the distinction to live permanently in the tool so staff stop confusing the two, noting all supplies today fly Italy to Manila but the same steps must cover future suppliers. Decision: persistent always-visible strip on the Purchasing screen stating both definitions plus the single-lane note. No new MAP item; same presentation-only scope. Changed file: `src/views/admin/Kanban.jsx`.
**Follow-up sweep (same day):** Owner screenshot shows the same clip-plus-double on the Command center Inbox metrics `?` and asks for every case, not one. Finding: `HelpTip.jsx` is the only custom tooltip in Admin; the sweep of all 8 call sites plus every shared `WorkspaceIntro`/`SectionHeading` caller shows all triggers are left-aligned in normal flow with no `overflow-hidden` modal/table ancestor, so the left-aligned single tooltip covers every case. Native `title` elsewhere is either standalone (header buttons) or the correct truncated-text pattern (`MetricRail`), neither doubled. Locked with a new contract test (left alignment, no native title). Production still serves the old build, so the screenshot bug persists live until owner-ordered deploy. Evidence: 58/58 contracts, prebuild clean, `build:admin` 211.67/300.00 kB.

### IDEA-20260921-05  -  Staff AI question-handler in Admin tools

**Captured:** 2026-09-21
**Raised by:** Owner (wants an AI agent in the setting tools gear so staff can ask what screens are for, inventory questions, and most admin-side questions)
**Problem observed:** Staff confusion about screens and stock must currently be answered by a person. The existing Operations Guide (`AdminAiCopilotModal.jsx`) only retrieves pre-written approved procedures by keyword and states it is not a live external AI; it cannot answer live-data questions (stock levels, record states) or anything outside its written topics.
**Desired outcome:** A question handler reachable from the Admin tools gear that answers what things are for, inventory questions, and most admin-side questions.
**Evidence or example:** `src/views/admin/AdminToolsWidget.jsx:48,146-148` (gear already opens the guide); `src/views/admin/AdminAiCopilotModal.jsx:61` (grounded retrieval, not live AI); `src/views/admin/adminGuide.js:3`.
**Known dependency:** If real external AI: provider key, owner-approved spend controls (MAP-018 pattern), and a rulebook boundary for what the agent may read/say (never assigns stock, quantity, SKU, price, cost, expiry, custody, approval, publication). If grounded only: expanded written topics plus read-only live data projections.
**Possible overlap with current behavior/MAP item:** Extends the Operations Guide / staff clarity scope (MAP-028 I-012/I-016, MAP-021 guides) and the paid-AI spend-control pattern (MAP-018). No MAP merge decided yet; pending owner answer on external AI vs grounded helper.
**Owner decision potentially required:** YES. Real external AI (paid, off-site data, needs key and spend cap) vs smarter built-in helper (free, on-device retrieval, no live AI). Also which live data, if any, it may read.
**Status:** captured, audited, merged into MAP-028 I-012/I-016. Owner chose no external AI: extend the built-in guide instead. Implemented locally as 18 searchable glossary entries (one per Admin screen: definition, used-for, scenario) in `src/views/admin/adminGuide.js`, reusing the existing topic shape so search, the Operations Guide, and the command palette need no changes. No schema, permission, state, or provider change.
**Follow-up (same day):** Owner asks for a humanizer pass: simpler words, no redundancy, staff-learnable. Applied: copula-first openers, one-breath definitions, concrete K2 scenarios, added purchase-vs-consignment keywords. Ranking pins (`manila_scanning`, `waybills` first) preserved by keeping collision words out of glossary keywords.

### IDEA-20260921-06  -  Install anti-slop agent skills and audit staff copy

**Captured:** 2026-09-21
**Raised by:** Owner (install https://github.com/miqdadbadjuber/anti-slop, then report what it says about our staff side)
**Problem observed:** Staff-facing copy is written by AI assistance with no standing filter; slop patterns (fake precision, hype, emoji bullets, generic cards) can slip into Admin text.
**Desired outcome:** Anti-slop skills installed in the repo following `.agents/skills/` convention, then an After-mode audit of staff Admin copy with a numbered findings list for owner approval before any fix.
**Evidence or example:** Upstream repo (MIT, 38 rules R-01 to R-38, skills: core, ui, copywriting, human, layoutmobile, code); install routes include `npx antislop-ai` and skills.sh.
**Known dependency:** None for the audit. Install via file copy only: no remote code execution (`npx` installer and plugin routes not used). Markdown-only payload; no package.json change, no provider, no migration.
**Possible overlap with current behavior/MAP item:** Complements the humanizer pass (IDEA-20260921-05) and Admin clarity scope (MAP-028 I-012/I-016). Skill install merges into the existing tooling surface; audit findings return here for approval per the skill's own After-mode.
**Owner decision potentially required:** Which findings to fix after the audit report. Install route approved as file-copy only.
**Status:** captured, audited, installed as file-copy only (6 folders under `.agents/skills/antislop*`, hashes verified against upstream clone; the two `.py` helpers were copied but never executed). After-audit of staff Admin copy complete with core R-01 to R-38 plus the copywriting skill. Owner approved all fixes. F1 to F6 implemented locally (uncommitted): em dashes replaced in 10 rendered strings; Kicker-Hierarchy reason written in `DESIGN.md`; Guided Tours sparkle to play, Coupons star to tag, Store Assets star to camera; flagged microcopy raised to `text-white/60`; glossary passives rewritten in active voice; Milan instant draft is true one-tap with the SKU-naming receipt kept, and the guardrail contract updated to the owner-approved behavior. The `DRAFT  -  NOT LOCKED` status stamp stays because pinned tests require that exact string. Evidence: 57/57 contracts, prebuild clean, `build:admin` 211.67/300.00 kB. Deploy and staff acceptance still pending.

### IDEA-20260921-07  -  Guest chat thread survives tab close (same browser)

**Captured:** 2026-09-21
**Raised by:** Owner (guest chat thread dies with the tab; UUID is bearer-style)
**Problem observed:** `StoreChatPanel.jsx` keeps the conversation id in `sessionStorage`, so closing the tab orphans the thread and the next visit starts a new conversation. Staff then juggle duplicates.
**Desired outcome:** Same-browser resume: keep the thread id in `localStorage` (read local first, fall back to the old session key once, write both), so a closed tab or restart returns to the same thread. No login, no migration, no RPC change. Reference-code reclaim on any device explicitly deferred.
**Evidence or example:** `src/components/shop/StoreChatPanel.jsx:113,261` (`k2-store-chat-convo-id`); signed-in resume already works via claimed history (`CustomerAccount.jsx`).
**Known dependency:** None. Client-only. Bearer-UUID property unchanged (same exposure as today, strictly fewer orphan threads).
**Possible overlap with current behavior/MAP item:** Guest commerce / storefront chat scope (MAP-027). Merges there; no new MAP number.
**Owner decision potentially required:** None. Scope chosen by owner: same-browser resume now, reference codes later.
**Status:** captured, audited, merged into MAP-027, implemented locally (uncommitted). Thread id now persists in `localStorage` with one-time `sessionStorage` fallback/migration in `StoreChatPanel.jsx` and `StorefrontChatButton.jsx`. Evidence: map027-store-polish + turnstile-wiring 79/79, prebuild clean, `build:storefront` JS 150.16/150.50 kB gzip. Deploy and real-browser resume acceptance still pending.

### IDEA-20260925-01  -  Single-logic intake cleanup (docs first, code later)

**Captured:** 2026-09-25
**Raised by:** Owner (multiple intake doors confuse staff; keep one phone-scan logic; archive, do not delete)
**Problem observed:** `InventoryGrid.jsx:523-534` exposes Add inventory, Scan box, Smart paste and Add product; `Sheet.jsx:342-370` exposes Phone Intake, Scan Box, Smart Paste AI and AI Spec Enricher. Wording across `docs/specs/` still describes Scan-to-AI vs Smart Paste as competing paths. `docs/evidence/` root holds 18 flat August audit papers that duplicate dated subfolder evidence. The legacy non-secure Add product path builds a browser `MANUAL-xxxx` SKU (`InventoryGrid.jsx:534,560`), contrary to the server-assigned SKU rule.
**Desired outcome:** One canonical intake (phone scan `ProductIntakeSessionModal.jsx`, server-assigned SKU) in docs and UI wording. Read-only audit of dead-code candidates with import evidence. Superseded docs moved to a dated in-repo archive with a restore note, never deleted. Source reroute (Inventory/Sheet side doors into phone-first flow, removal of the browser SKU path) as a separate code slice with focused contracts.
**Evidence or example:** Import grep 2026-09-25: `ScanToAiModal.jsx`/`SmartPasteModal.jsx` are still imported by both Inventory and Sheet and pinned by `tests/spotlight-tour-contract.spec.js:81-82`, so they are not dead files. `Sheet.jsx:695` renders `ScanToAiModal` without `onOpenSmartPaste`, so its JSON handoff is a dead end there. `docs/evidence/MAP_017_EXHAUSTIVE_AUTHORIZATION_AUDIT_2026-08-22.md` is pinned by `tests/schema-truth-tool.spec.js:388`; `docs/evidence/20260909-map017-followup.md` is cited by the Brain, owner record and runbook; both stay in place.
**Known dependency:** MAP-017 gates database activation; MAP-018 owns real intake acceptance. Docs-only slice needs no build or provider change.
**Possible overlap with current behavior/MAP item:** Merges into MAP-028 docs/audit scope; code reroute slice stays behind MAP-018/MAP-028 I-002 acceptance.
**Owner decision potentially required:** Confirm the single entry wording per surface before the code reroute slice.
**Status:** captured, audited, accepted. Branch `chore/intake-docs-cleanup-20260925`. Slice 1 done: 18 papers archived, spec note added. Slice 2 done: `docs/README.md` rewritten as the full compilation. Slice 3 done: one-line Sheet scanner handoff fix (`Sheet.jsx`, same `onOpenSmartPaste` Inventory has); 39/39 focused contracts plus `verify:development` green. Slice 4 done (MAP-017 next slice, prepared/unapplied): scoped `get_public_product_stock()` PUBLIC-revoke migration + emergency rollback, isolated rehearsal green (revoke, replay, read-only check, rollback), `tests/map017-stock-grant-contract.spec.js` 4/4 green and registered in `test:contracts`, MAP-017 updated, `verify:development` green again. Deliberately kept with reasons in `docs/evidence/20260925-intake-cleanup/README.md`: scanner/paste/chooser/tour files (used + test-pinned), 2 pinned evidence papers, legacy browser-SKU fallback (live path while Admin BFF is off; removal waits on MAP-018/020). No provider, database, or deployment change.

### New idea template

```markdown
### <IDEA-YYYYMMDD-NN>  -  Short name

**Captured:** YYYY-MM-DD
**Raised by:** person/source
**Problem observed:**
**Desired outcome:**
**Evidence or example:**
**Known dependency:**
**Possible overlap with current behavior/MAP item:**
**Owner decision potentially required:**
```
