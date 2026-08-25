# K2 Jimzon — System Brain (Current State)

**Living source of truth. Last updated: 25 August 2026 (rev. 21).**

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
baseline restoration checks passed. It awaits `OWNER-005`. No DDL has been applied.
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
reversibility facts only; production remains unremediated pending `OWNER-005`.
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
`8AF7C69ABFBE6694302AC8AFD30A177EBEEA8461BD7B0963CD3AE23570DFC5F1` and its
planned ledger version is `20260824143000`. It remains unusable until OWNER-005
is recorded as Authorized and the exact project, payload, backup evidence,
finding count, ledger, and recovery gates are supplied. No production apply was
attempted.

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
`api/storefront/index.js`. Their exact catch-all rewrites are declared in the
separate Vercel configurations. Each entrypoint returns a minimal `404` unless
both its matching `K2_DEPLOYMENT_TARGET` and independent server switch
(`K2_ADMIN_BFF_ENABLED` or `K2_STOREFRONT_BFF_ENABLED`) are enabled. Both server
switches and both browser switches remain false. Local routing tests are not
Vercel artifact, deployment, or real-host evidence; each preview must still
prove its function inventory and denial behavior before activation.

---

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
all 179 API/security contracts, the complete security/prebuild gate, and both
separate production builds also pass. This is source-level preparation only:
the migration, limits, official Shopee signing string, retry window, credentials,
deployment, real signed push, durable provider capture, and reconciliation
remain unapplied or unverified, so the channel is not Live.

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
- `error_reports` — client crashes/failed queries logged here.
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
is exactly Admin or Staff, enforced by RLS. A newly created Google/email Auth
identity receives the `Customer` role and cannot enter Admin BOS. Staff access
requires either the hardened invitation flow or an explicit audited Admin role
assignment; merely creating an Auth identity grants no Admin access. The live
aggregate on 15 August 2026 contained four existing authorized Admin profiles.
Their identities were not changed during the security repair. The old localStorage "admin=true" flag,
master passcodes, and `password123` fallback were REMOVED. Accounts are
invite-only (super admin invites → person sets their own password → super admin
sets role in **Staff & Roles**). Admins can enroll TOTP 2FA on their own account.
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
`https://k2-jimzon-admin-seven.vercel.app/admin-portal-k2-secure`. Vercel
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
- **Start-here guide** + floating 🧭 **Guide** button — the daily workflow,
  written so staff can self-onboard without being told.
- **Dashboard Guide (AI)** — honest, grounded Q&A about what each screen is for
  (no fabricated data).
- **Floating ⚙️ tools gear** — draggable; calculator, margin, cargo volumetric
  weight, units, VAT 12%, expiry checker, scratchpad, plus a pinned Milan/Manila
  clock and EUR→PHP rate.
- **Error monitoring** — crashes auto-log to `error_reports`; stale-deploy
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
  staff first obtain the applicable courier rate, communicate it to the customer, and
  record the customer's confirmation. A delivery estimate must remain labeled as an
  estimate until the courier amount is known.
- **Customer exceptions:** cancellation, return, exchange, refund, and failed-delivery
  outcomes are handled case by case through direct communication with the customer.
  The system must record the request, conversation, evidence, proposed resolution,
  authorized decision, stock disposition, and final outcome. It must not automatically
  promise a standard result that K2 has not agreed to.
- **Pasabuy pricing:** there is no standard percentage or automatic final-price rule.
  The owner decides the price for each request using factors such as season, scarcity,
  sourcing difficulty, actual item cost, delivery/logistics cost, and other documented
  circumstances. The system may calculate and display cost components, but the final
  quoted price remains a manual owner decision with a recorded reason. Estimated and
  actual costs must remain separate.

---

## 9. What's done vs what's next

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
is false, supplier receipt is unavailable, canonical location/custodian
tightening and deployed denial tests remain, and no domain was changed.

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
deployed-role, real device permission, real provider failure, interruption/resume,
and production activation evidence are still open.

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
was promoted to `api/admin/index.js` with an exact catch-all rewrite and
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
or promising commercial terms. Two 375px rendered journeys and twelve focused
contracts pass, including dark/landscape/no-overflow checks. On 25 August the
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
access/refresh pair. Five
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
25 August baseline covers 68 Admin and 13 Storefront prepared BFF routes, two
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
Chromium review remains environment-blocked by a pre-launch Windows `EPERM`;
production migration, flags, host, data, and grants remain unchanged behind
`OWNER-005`.

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
