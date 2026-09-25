# K2 Jimzon Master Action Plan

Updated 24 September 2026. This is the only active backlog. The older plan is preserved in `K2 Jimzon - Brain/MASTER_ACTION_PLAN_HISTORY_2026-09-24.md` for dated findings and receipts. Its old pending lines are historical context, not current instructions. Required behavior lives in the operations rulebook. Verified current behavior lives in the System Brain.

## Working rhythm

Work in short, reviewable slices. Take the highest priority item whose dependencies are ready. Define the behavior and evidence, implement or rehearse it, verify the changed paths, then update the rulebook, System Brain, runbooks and this plan. Keep one major item in progress unless work is independent. A local fix, prepared migration, provider apply, deployment and real-host acceptance are separate states.

An item is ready when it has an idea ID, a clear outcome, known dependencies and a test that does not invent stock, payment or provider access. A slice is finished when valid, invalid, duplicate, permission, failure and recovery paths pass; phone and desktop are checked where relevant; and its evidence is recorded. Remove a completed slice from this plan after those records are updated. Remove a MAP item only when its full outcome is verified. Git history and the Brain retain the completion record.

## Current iteration

1. Reconcile MAP-017's 13 current critical permission findings and the MAP-019/020 signed guest and account migrations with the current production schema. Rehearse apply and rollback. Do not repeat the two applied MAP-017 corrections.
2. Prepare real product and stock acceptance under MAP-018/023. The owner must verify physical counts, product facts, media rights and receiving accounts before a real payment cycle can pass.
3. Check raw and hydrated search signals on the exact Storefront host under MAP-024. Run the MAP-025 customer and staff phone journeys after account and order paths are active.

Independent local fixes may continue while an owner or provider gate is open. This iteration does not by itself authorize a production database write, flag change or deployment.

## Priority and dependencies

| Order | Item | Outcome | Gate |
| --- | --- | --- | --- |
| 1 | MAP-017 | Database permissions and ownership match the approved model | Current live schema and controlled provider change |
| 2 | MAP-018 | Staff intake and publish only verified products and stock | MAP-017 for database activation |
| 3 | MAP-019 | Guests and customers can recover their own commerce history | MAP-017; independent UI may overlap MAP-018 |
| 4 | MAP-020 | Public and staff commands have enforced server boundaries | MAP-017 and MAP-019 decisions |
| 5 | MAP-021 | Browsers and separate builds handle errors and security safely | MAP-019/020 |
| 6 | MAP-022 | Alerts and restores work with real operational evidence | MAP-017 through MAP-021 |
| 7 | MAP-023 | Staff can complete and reconcile real operating cycles | MAP-017 through MAP-022 and owner policy |
| 8 | MAP-024 | Both production hosts and public discovery behave as intended | MAP-023 and domain authority |
| 9 | MAP-025 | Owner, staff and customers accept the exact live release | MAP-017 through MAP-024 |
| Parallel after gates | MAP-026 | K2 shops share canonical stock and order truth | MAP-017/020/023 |
| Parallel preparation | MAP-027 | Product knowledge and optional Store use verified facts | MAP-018/019/020/021/023 |
| Cross-cutting | MAP-028 | Audit findings close with evidence or an accepted limit | Owning items above |

## Active backlog

### MAP-017: Finish database permission truth

**Status:** Active. Phase one and the approved `20260909023000` follow-up are applied and independently verified. A read-only production metadata export on 24 September produced 18 audit findings (13 critical, 5 high). Five authenticated functions had their existing Staff or Admin/AAL2 guards and grants classified in the repository contract. A new full live export on 25 September audits to 13 critical and 0 high. No live grant changed. The earlier ten-critical count is dated evidence.

**25 September prepared slice:** The narrow stock-function `PUBLIC` execute revoke, exact preflight/postflight and recovery SQL are in source only. The portable PostgreSQL rehearsal passes apply, caller preservation, unrelated-role denial, rollback and two fail-closed preflight cases. The historical hash-bound phase-one files are unchanged. Evidence and recovery: `docs/evidence/20260925-map017-stock-grant/README.md`.

**25 September live check and recovery point:** Owner-authenticated, read-only Supabase SQL confirmed the stock function still has `PUBLIC` execute plus explicit `anon`/`authenticated` grants. A new encrypted application database backup restored to isolated local PostgreSQL databases (51 public relations; 10 managed entries excluded); one restore replayed archived ACLs. A new encrypted Storage backup restored 36 product-image files with matching fingerprints. Eight encrypted/redacted artifacts were uploaded to the owner-only Drive folder; all eight passed independent retrieval, length and SHA-256 checks, and the two downloaded Storage parts reassembled to the original encrypted hash. Provider settings, Vault, and real managed-role membership remain unverified. No production SQL was applied. Evidence and IDs: `docs/evidence/20260925-inventory-readiness/README.md`.

**Next slice:** review the 25 September full live metadata export (13 critical, 0 high) against managed-role/provider behavior and wait for the exact stock-SQL authorization requested under OWNER-005 before production apply. All eight new offsite recovery files passed independent retrieval/hash. OWNER-005 already records `Owner recovery access: Verified` from the 2 September owner attestation; do not ask for it again. The exact stock correction and recovery passed on the 25 September grant-preserving application-schema restore, including caller reads and baseline restoration; local placeholder roles do not prove Supabase memberships or defaults. Production still has the broad grant according to the 25 September live read. Prepare the signed guest replacement before revoking the six transitional anonymous RPC grants. Follow up the Supabase support request for the six `supabase_admin` default-privilege findings. Prove signed preview continuity and managed-role behavior before a live cutover. Evidence: `docs/evidence/20260925-inventory-readiness/README.md` and `docs/evidence/20260924-account-migration-rehearsal/`.

**Accept when:** live audit, anonymous allow and deny checks, ownership, backup and restore evidence, and an exact-host no-outage catalog read pass. Preserve the permanent receipt. Stop on an ambiguous result.

**Block:** the guest cutover needs MAP-019/020. Supabase support has logged a request from the K2 account for the supported correction of provider-owned defaults, with project support access off; its answer is pending. On 24 September, an ordered MAP-019/020 rollback-only SQL chain passed on the current schema both without and with archived ACLs; named direct-RPC denials and signed guest grants passed, then the baseline returned. The 25 September database/Storage backups, local restores and all eight independent offsite retrieval checks passed. The local grant-preserving restore needed non-login placeholders for missing managed roles and still excluded Vault, so provider role behavior is not fully reproduced. OWNER-005 records owner recovery access as Verified by attestation. Provider recovery, signed preview continuity, the exact stock-correction authorization and production postflight remain open. Evidence: `docs/evidence/20260913-audit-remediation/`, `docs/evidence/20260924-account-migration-rehearsal/`, `docs/evidence/20260925-inventory-readiness/README.md` and the database recovery runbook.

### MAP-018: Verify products, intake and inventory

**24 September live content finding:** The Barilla Spaghetti product page shows “Contains Contains Wheat / Gluten.” Review the label-derived allergen field and display prefix before treating this listing as approved. The buyer browser evidence is in `docs/evidence/20260924-live-buyer-journey/README.md`; the physical package was not checked.

**25 September live intake finding:** Read-only production SQL confirmed `product_intake_sessions` and the draft, first-inventory and publication server functions are absent. The prepared MAP-018 migration has not been applied. The production Admin Google sign-in reached the owner's authenticator challenge; staff intake and real product/stock actions are unverified until the owner completes it in the browser. The exact next sequence is MAP-017's controlled permission/recovery gate, MAP-018 preflight plus intake/cleanup migration and postflight, then real phone listing with physical label, photos, quantities, cost and owner approval. Do not use direct SQL rows as an intake shortcut. Evidence: `docs/evidence/20260925-inventory-readiness/README.md`.

**25 September current-schema rehearsal:** On an isolated restore of the fresh production application backup, MAP-018's preflight, full intake migration, full cleanup-boundary migration, and postflight exited 0 in order. The local clone contains the rehearsal changes; production remains unchanged. The browser service retains a direct authenticated path while the Admin BFF switch is off. Its signed wrapper needs the separate MAP-020 foundation, and production BFF cutover also needs the later session registry; neither was included in this current-schema rehearsal. Provider Storage behavior, Admin MFA, exact-host staff actions, real product facts and publication approval still need live proof. Evidence: `docs/evidence/20260925-inventory-readiness/README.md`.

**Status:** Active preparation; real stock and publication acceptance remain open. IDEA-20260924-08's public grocery barcode lookup and IDEA-20260924-09's Gemini public-only SEO draft are locally prepared. Staff's own storefront photo uploads already exist in Product Photos; intake now points staff there after Draft, with AI images clearly optional. Private intake evidence remains separate. The review step now refuses a fresh public SEO suggestion when its name, brand or size differs from what staff confirmed. A real public-only Gemini probe found an invalid JSON-format enum (HTTP 400); the request was corrected. Gemini 3.1 Flash-Lite then returned HTTP 503 twice; Gemini 3.5 Flash-Lite returned all four expected SEO fields from the local key, so the prepared model now uses 3.5. This is local provider evidence, not exact-host behavior or a staff-approved listing. Review removed an Antigravity Gemini deep-intake path that sent private package photos to the free tier, contrary to the owner's choice. The Admin Vercel project now has a Production `GEMINI_API_KEY` Secret and the owner reports a redeploy, but the Admin BFF remains off and no Gemini listing request is verified on the host. Focused contracts pass 30/30 after the privacy correction and the catalog-change browser case passes locally; final development verification is recorded in the evidence file. The paid photo-grounded path remains off under OWNER-007.

**Next slice:** finish protected phone intake, supplier receipt, field review, distinct variants and opening balances against the live schema. Reconcile actual SKU, box, lot, expiry, condition, location, custodian, cost and variance. One public Open Food Facts barcode returned a matching local lookup; validate coverage on representative K2 stock barcodes, confirm Gemini free-tier quota and staff phone review, and use a real Draft to verify staff upload, assignment, reload and storefront display of an owner-approved product photo. Enable the protected public-only suggestion only with the Admin BFF cutover under MAP-020. Select and price photo-grounded text/image models under OWNER-007 before any paid AI activation. GPT-6 Luna is a candidate, not an active setting.

**Accept when:** staff can resume or correct intake without a browser-generated SKU, direct lot write or skipped approval. Roles and failures are enforced. Staff review actual label, allergen, storage, price and media rights before publication, then complete real phone and desktop tasks.

**Block:** MAP-017 gates database activation. The owner supplies physical counts and publication approval. Paid AI intake remains off until OWNER-007 approves its provider, limits and retention.

**24 September local listing check:** Manual `k2.product-content.v3` paste and the simulated paid automatic content result each reached staff field review and a single server-assigned Draft in phone browser tests. The manual path made no generation request. The confirmed-barcode public Gemini suggestion appeared as unsaved review text; it did not create a product. Staff photo upload kept assignment disabled until upload completed. Intake chooser copy now sends protected Admin users to phone intake for a new product and labels the separate JSON preview honestly. Focused API/contract checks passed 31/31 and 14/14; targeted browser checks passed 2/2, 1/1 and 1/1; `npm run verify:development` and `npm run build:admin` exited 0. These were local fixture journeys, not a real K2 SKU, production API call, live upload or published listing. Keep MAP-018 active for the real phone, label, photo, stock and publication acceptance after MAP-017/020.

### MAP-019: Complete optional customer identity and continuity

**Status:** Active preparation. Live account and guest BFF switches remain off. The 24 September profile and in-app notification code and SQL are locally prepared only. Guest checkout remains available. The isolated account migration apply/rollback, behavior and replay rehearsal passed on 24 September; read-only production metadata confirmed the prerequisite starting shape, not full production compatibility.

**Next slice:** reconcile identity, guest grant, order status, account claim and settings migrations against production in runbook order. Verify first-use and returning passwordless sign-in, guest linking, profile edit, empty-field checkout prefill, scoped order/Pasabuy/message history, notifications, sign-out and recovery. Create a usable order conversation from canonical records.

**Accept when:** the buyer resumes after reload and on a verified second device; another buyer cannot read or claim the records; expired and revoked grants fail; settings and notifications stay private; provider errors do not imply a saved order or sent message. Verify exact-host behavior after controlled activation.

**Block:** MAP-017 permissions, MAP-020 signed BFF setup, `docs/runbooks/CUSTOMER_DATA_RETENTION_AND_DELETION_RUNBOOK.md`, and OWNER-006 retention/deletion policy. The ordered migration chain and named ACL denials passed a rollback-only transaction on a restored current application schema. Managed role membership and Vault/provider state were not reproduced, and preview continuity remains to prove. Supabase currently has new-user sign-up off; coordinate its controlled activation only after the reviewed customer flow and authorization boundary are ready. `20260924_customer_account_settings_notifications.sql` is not production state. Evidence: `docs/evidence/20260924-storefront-audit-fixes/README.md`, `docs/evidence/20260924-account-migration-rehearsal/README.md` and `docs/evidence/20260924-provider-readiness-browser/README.md`.

### MAP-020: Enforce API, upload and connector boundaries

**Status:** Active preparation. Production lacks the signed guest start/reply prerequisites used by prepared moderation. The direct chat writer remains live. The isolated eleven-argument order-signature preflight, moderation rollback, customer Auth rate boundary and BFF source inventory passed on 24 September; no production guest migration or flag change followed. A cutover review found that the prepared revoke targeted only the old nine-argument order function. The unapplied cutover now revokes every live `submit_order_request_v2` overload inside its transaction; this remains local until the coordinated release.

**Next slice:** reconcile route inventory with the passed restored-schema grant-denial rehearsal and prove the signed paths on preview. The isolated cutover covers both order overloads. Verify origin, bot, rate, payload, idempotency, ownership and replay controls before server flags and then browser flags change. Design a verified continuity or recovery path for existing direct-chat threads before revoking `get_storefront_chat_v1` and `submit_storefront_chat_v1`. Finish protected uploads and Admin commands, including Admin/SuperAdmin anonymous-chat delete, block and manual unblock without raw IP disclosure or deletion of account-linked records.

**Accept when:** deny, allow, duplicate and failure tests pass at each route; preview proves chat and order continuity before old grants are revoked; Staff and Admin get only allowed commands. Any marketplace adapter proves signed events and canonical stock, order and payout reconciliation before enablement.

**Block:** do not apply the moderation migration alone. MAP-017/019, matching private signing secrets, Turnstile, target-correct preview and coordinated rollback are prerequisites. Existing chat UUIDs do not prove buyer ownership; no migration may silently claim or expose those threads.

### MAP-021: Harden browser and build behavior

**Status:** Active verification and remaining remediation.

**Next slice:** resolve current dependency or security gate failures against the exact lockfile and build. Check safe errors, CSP, security headers, Auth callbacks, no source maps or secrets, and separate Storefront/Admin artifacts. Measure mobile load rather than infer it.

**Accept when:** focused security checks, the complete release gate for an owner-requested promotion, both target builds, exact-host headers and errors, and representative device performance pass. Record any accepted budget limit with measurements.

**Block:** provider and exact-host checks follow MAP-019/020. Historical bundle and dependency numbers in the Brain archive are not current results.

### MAP-022: Prove monitoring and recovery

**Status:** Active preparation. On 24 September, fresh production database and Storage object backups passed isolated local restores and were uploaded to the owner-only Drive folder. The new database envelope passed independent Drive download and SHA-256 comparison. Storage-part retrieval, provider configuration recovery, schedule, alerts and owner recovery access remain open.

**Next slice:** configure content-safe security events, alerts and incident ownership. Verify production database and Storage backup retrieval, isolated restore, schedule, key custody and a failure alert.

**Accept when:** a designated owner retrieves and restores both data classes, compares records and privileges, and measures the recovery targets in a timed rehearsal. Preserve runbook and alert receipts.

**Block:** provider controls and owner recovery access must be exercised on the current artifacts. The local restores do not prove an independent Drive retrieval, Supabase managed configuration or live service recovery. See `docs/runbooks/DATABASE_BACKUP_AND_RESTORE_RUNBOOK.md`.

**24 September browser check:** Supabase reports this production project Healthy, but the signed-in backup page says the Free plan has no scheduled project backups and that point-in-time recovery requires a paid Pro add-on. Choose an owner-controlled backup path, include Storage, and obtain a timed restore receipt before claiming recovery readiness or applying the pending migration chain. The browser check is recorded in `docs/evidence/20260924-provider-readiness-browser/README.md`.

### MAP-023: Finish real order, payment and fulfillment cycles

**24 September live browser rehearsal:** At 390px and 1280px, one stocked Barilla listing moved from catalog to product, basket and checkout. Regional fees and totals changed for Metro Manila standard/express, pickup and Visayas; GCash/MariBank could be selected; Cash on Delivery was absent. Missing-contact submit showed an inline error with zero write requests. No real order, payment or courier booking was made. Exact observations and screenshot: `docs/evidence/20260924-live-buyer-journey/README.md`. Before real acceptance, clarify the QR payment preference wording and check the shown delivery promises against actual carrier booking and staff communication.

**Status:** Active. GCash and MariBank QR choices are deployed, but no real transfer has been independently verified. The feature branch locally fixes the receipt method switch and stale payment wording. Delivery rate automation is applied; booking and cost reconciliation remain unproven.

**Next slice:** the owner scans both exact QRs on a second device and checks their recipients against receiving accounts. With counted stock, submit one real order, confirm stock and total, make one small transfer, record evidence, and have a different authorized reviewer confirm the funds. Rehearse packing, dispatch, courier cost, exceptions, refunds and customer status. Keep Cash on Delivery off until its prepared availability boundary is applied and accepted.

**Accept when:** order and receipt show one canonical method; a QR view or buyer receipt never marks paid; amount and account reconciliation are recorded; independent review gates fulfillment. Prove representative Pasabuy, wholesale, reservations, custody, delivery and returns with real staff and approved policy. Preserve failed and uncertain outcomes.

**Block:** physical stock, named staff roles, recipient check, OWNER-003 wholesale terms and remaining policy choices. OWNER-002 reservations and OWNER-004 contact channels are answered. Evidence: `docs/evidence/20260924-manual-qr-payment/README.md`.

### MAP-024: Verify hosts, discovery and measurement

**Status:** Active. Separate Storefront/Admin Vercel projects and the 24 September QR, SEO and Admin release are deployed. Product indexing is gated. On 24 September, Hostinger's four web DNS records matched the deployment runbook and Vercel marked the apex redirect, `www`, and `admin` domains Valid Configuration. The exact-host sitemap served HTTP 200 XML with Home, Catalog, Pasabuy and Trade; robots referenced it, all four routes returned 200, and sample product/account/Admin headers remained noindex. Search Console submission and actual indexing are still unverified.

**25 September preview finding:** Draft PR #13 for the prepared MAP-017 SQL triggered both separate Vercel Preview projects. Both deployments failed before build because `vercel.ts` received no `K2_DEPLOYMENT_TARGET`; its exact-target guard refused to select a config. This is a Preview environment configuration gap, not evidence that the stock SQL or local application build failed. Verify the two project identities, set the nonsecret Preview target to `storefront` and `admin` in their respective projects, then obtain successful exact-SHA Preview receipts before using preview for MAP-017/019/020 acceptance. Production deployments remain separate and unchanged. See `docs/evidence/20260925-map017-stock-grant/README.md`.

**25 September preview resolution:** The owner-authenticated Vercel browser confirmed both project IDs against `vercel.ts`, added Preview-only `K2_DEPLOYMENT_TARGET=storefront` to `k2-jimzon` and `K2_DEPLOYMENT_TARGET=admin` to `k2-jimzon-admin`, and redeployed PR #13 at `fde7e20`. Both new Preview deployments report Ready; their exact URLs render the Storefront home and Admin sign-in respectively. This closes the target-variable blocker only. No authenticated staff/customer flow, database apply, Production variable, or Production deployment was verified or changed by this correction. Receipts and recovery are in `docs/evidence/20260925-map017-stock-grant/README.md` and the deployment runbook.

**Next slice:** complete exact-host hydrated metadata, canonical and structured-data checks, then inspect the owner-controlled Search Console, Analytics and Google Cloud properties once Google-service access is explicitly authorized (IDEA-20260924-06). Submit the already-live four-route XML sitemap to the verified Search Console property if absent or stale. Confirm the OAuth client and consent settings without exposing secrets. Add GA4 only after a measurement property and owner-approved consent boundary are verified; count request receipts separately from paid purchases and send no customer details to analytics. Keep product noindex in raw and hydrated views until content passes MAP-018.

**Accept when:** artifacts remain separate; private and unknown routes respond correctly; public search signals agree; product URLs enter the sitemap only after reviewed facts and media; Google properties use actual query and ownership evidence. Record DNS and callback recovery.

**Block:** OWNER-001 domain authority is resolved. Supabase Auth Site URL and redirect patterns are configured, but real callback tests remain. Signed-in Search Console access was denied by automatic browser review pending explicit Google-service authorization; GA4 and Google Cloud state therefore remain unverified. The Hostinger zone showed no mail or webmaster verification records; obtain exact approved values before adding them. Product data review and Google query/indexing evidence remain open. Browser evidence: `docs/evidence/20260924-provider-readiness-browser/README.md`.

### MAP-025: Run final human and release acceptance

**24 September rehearsal limit:** The live browser path reached checkout on mobile and desktop with no horizontal overflow, but did not create an order or verify a delivery. The native desktop browser controller was unavailable; an isolated Chromium browser visited the exact production host. See `docs/evidence/20260924-live-buyer-journey/README.md`. Keep the real buyer, staff, payment and dispatch cycle open.

**Status:** Queued final gate. Local builds and synthetic journeys do not replace real buyer, staff or owner acceptance.

**Next slice:** on representative phones and desktops, run guest and first-time/returning account journeys from discovery through order, staff confirmation, GCash or MariBank transfer, independent review, status, messages, notifications, profile and recovery. Run staff intake, count, fulfillment, payment exception and role-denial tasks. Include keyboard, screen reader, zoom, contrast, offline and error states.

**Accept when:** the exact release commit has a complete release gate, green CI, correct separate deployments, authenticated real-host evidence, rollback rehearsal and owner sign-off. Record build, host, role, method, receipt and failures. A sampled 390px page or synthetic payment is insufficient.

**Block:** MAP-017 through MAP-024, real stock and transfer, staff enrollment and open owner decisions.

### MAP-026: Connect K2 shop accounts without splitting stock truth

**Status:** Queued, with some allocation and custody work prepared. K2 operates multiple accounts on Shopee, TikTok Shop and Lazada; the count must not be hardcoded.

**Next slice:** finish shop eligibility over physical lot, location and custodian truth. Master Inventory remains the full physical total. Rehearse staff request, Admin approval, receiver acceptance, oversell refusal, reconciliation and rollback. Owner-controlled Lazada and TikTok Shop app applications, seller authorization planning and exact scope checks may start in parallel; an application is not a live connector. Build an adapter only after approved scopes, fees, signing rules and sandbox access exist, then pilot one authorized shop before adding the rest.

**Accept when:** shop eligibility does not create or subtract physical units; exact lot movement has custody evidence; events, orders, fees and settlements reconcile to canonical records; disabling an adapter leaves a safe manual path.

**Block:** MAP-017/020/023 and provider access. The owner must decide whether full multi-shop operations are required for first launch. Until then MAP-025 remains that launch gate.

### MAP-027: Verify product knowledge and the optional Interactive Shop

**Status:** Active preparation. Store and mobile controls have deployed slices; source-of-truth, real-device and clerk acceptance remain open.

**Next slice:** use one reviewed Admin product knowledge source for catalog and Store text. Keep the Store optional over the same cart, stock and messages. Finish the owner-requested clerk character and bounded shopper reactions without overwriting its fallback. Test phone landscape, reduced motion, asset failure, cart and chat continuity.

**Accept when:** identity, stock, price and description match canonical records; AI text invents no product or payment facts; real shoppers can navigate and recover; the Storefront build stays within budget.

**Block:** MAP-018/019/020/021/023 and reviewed source content. Media rights and publication stay with MAP-018; exact-host SEO stays with MAP-024.

### MAP-028: Close the cross-surface audit

**Status:** Active. The 24 September Storefront audit found account, notification, continuity, receipt, payment copy, robots and allergen issues. The `f625381` source release deploys receipt/copy/robots/allergen repairs and prepares account/profile/notification behavior behind inactive gates. It also merges the guided intake and optional dashboard Help pilots into current Admin navigation. Provider activation and human proof remain open.

**25 September release receipt:** The isolated `codex/human-testing-release` candidate passed `npm run verify:release`, including all browser suites, both target builds and security/budget checks. GitHub `main` points at `f625381`; Storefront deployment `6642848306` and Admin deployment `6642833359` both report success for that SHA, and the canonical host target markers returned HTTP 200 with the correct separate targets. GitHub CI run `36027662677` was still in progress at receipt time. The account and guest BFF switches remain off; no account, moderation or guest cutover migration was applied by this push. Continue MAP-017/019/020 provider sequencing before real account testing. Earlier interrupted gates and recovery are recorded in `docs/evidence/20260925-human-testing-release/README.md`. Human acceptance remains pending.

**Next slice:** track each finding through its owning item above: `vercel.json` headers and Content-Security-Policy-Report-Only observability; canonical `sitemap` and robots signals; channel vocabulary and oversell protection; guest and linked-account recovery on the exact host; complete Admin phone navigation and readability with staff; and collection of role, device, accessibility, performance and rollback evidence. Retest the exact release candidate before another owner-requested promotion.

**Accept when:** every archived finding is verified closed in its owning MAP item or has an owner-accepted limit and recovery path. A source check, mock, QR display, deployment receipt or message is not live operational proof.

**Block:** MAP-017 through MAP-025. Current source release SHA `f625381ccd25dba84a1e2279bc6b9a72f0eac742` has separate Vercel receipts; broader launch remains unaccepted. See the deployment runbook and `docs/evidence/20260925-human-testing-release/README.md`.

**24 September provider finding:** GitHub shows `main` is not protected. A narrow active ruleset targeting only the default branch, with deletion and force pushes blocked, was prepared in GitHub but creation stopped at GitHub's `Confirm access` email verification prompt; no rule was applied. The owner must complete GitHub's identity check in the signed-in account, then create and verify that scoped rule. Before the next live promotion, define applicable CI requirements that keep the owner's release path workable, and verify them safely before enforcement. Provider evidence is in `docs/evidence/20260924-provider-readiness-browser/README.md`.

## Owner decisions and recovery

The owner register is `K2 Jimzon - Brain/OWNER_QUESTIONS.md`. OWNER-001, OWNER-002 and OWNER-004 are answered. OWNER-005 authorized two specific applied MAP-017 payloads, not later guest or provider-default changes. OWNER-003, OWNER-006 and OWNER-007 still gate their named paths. The owner must confirm both receiving QRs and name separate payment evidence and account verifiers. Gateway, automatic refunds, paid services and marketplace adapters have no live claim until approved and verified.

Before provider or database changes, follow the owning runbook's backup, preflight, rollback and exact-host checks. A failed slice stays in its MAP item with the last safe state, blocker and next action. The Brain archive is historical reference; this file alone assigns current work.
