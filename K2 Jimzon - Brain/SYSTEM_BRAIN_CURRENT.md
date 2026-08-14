# K2 Jimzon — System Brain (Current State)

**Living source of truth. Last updated: 10 August 2026 (rev. 5).**

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
- **Secret Isolation:** `.env.example` strictly partitions client keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) from server-only secrets (all `VITE_` secret prefixes removed).
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

### Historical SQL run order

Run these in the Supabase SQL editor in this order. If a fresh database, run
the numbered migrations `0001`–`0018` and the `20260722/23` RLS files first.

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
is Admin or Staff, enforced by RLS. The old localStorage "admin=true" flag,
master passcodes, and `password123` fallback were REMOVED. Accounts are
invite-only (super admin invites → person sets their own password → super admin
sets role in **Staff & Roles**). Admins can enroll TOTP 2FA on their own account.
Backend Edge Function `invite-staff` performs invites (admin-verified).
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

---

## 7. Other things built into the admin

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
with the public key. The only active Edge Function, `invite-staff` version 3,
still needs the locally prepared modern-secret correction deployed and tested.
The 24-hour provider query contained only 12 database/pooler events and did not
prove API/Auth/Edge activity safe. Full containment remains blocked on runtime
cutover, fuller evidence, and owner-approved JWT signing-key revocation.

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
negative tests require MAP-017/MAP-020. Only three migrations are recorded live.
No corrective DDL was applied during that audit.

The prepared MAP-017 phase-1 hardening migration subsequently passed its full
postflight in a live rollback-only transaction on 12 August. A separate query
proved the vulnerable policies, grants, Storage null limits, and legacy Realtime
membership were restored by rollback. This is strong compatibility/reversibility
evidence but is not deployment; the public write and upload vulnerabilities
remain live pending permanent application after credential disablement.

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

### Admin BFF foundation (local, inactive, 12 August 2026)

The repository now contains a fail-closed same-origin Admin BFF authentication
foundation. It uses the limited Supabase anon key server-side, exact admin-origin
checks, bounded JSON, mandatory live role and AAL2 checks, AES-256-GCM encrypted
HttpOnly cookies, ten-minute MFA pending state, 30-minute inactivity, eight-hour
maximum lifetime, CSRF binding, logout, and safe error codes. Production admin
routes return `404` unless `K2_DEPLOYMENT_TARGET=admin`. The local security
contract passes. This is not the active authentication path: Admin BOS still
uses the Supabase browser session because its operational data calls have not
yet moved to named BFF routes. The per-instance login throttle is not a durable
distributed limit. Exact status, environment requirements, and migration order
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
re-encoded server-side with Sharp, restricted to JPEG/PNG/WebP, 10 MB, one page,
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
and the repository exposes 50 prepared BFF handler files. GitHub CI still passed
both isolated builds and all smoke flows; no new Vercel artifact was published.
An initial `.vercelignore` attempt did not affect Git-based function discovery.
Because both BFF flags remain false, the handlers now live under `prepared-api/`,
outside Vercel's deployable `api/` directory, preserving every handler and
contract locally. Storefront Contact uses its explicit email-draft fallback and
Admin continues its existing browser Supabase Auth. Future BFF activation
requires consolidating handlers behind the plan limit (or an owner-approved
upgrade), restoring deployable routes, and repeating real-host security proof.
The definitive correction passed both Vercel previews, merged through PR #2 as
`e9ff7a0`, and both separate production deployments completed successfully on
14 August 2026; main CI also passed. The Vercel aliases currently redirect
unauthenticated checks to Vercel SSO, so customer-visible content and Admin
sign-in still require authenticated owner acceptance. The prepared BFF handlers
are not part of those artifacts and remain inactive.

The following list records what the rejected completion draft claimed; it does
not describe verified live behavior:

1. **MAP-000 — Supabase Source-of-Truth & Environment Integrity**: Configured Supabase CLI (`project_id = pixplcjqivlfflickobf`), isolated client keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) from server secrets in `.env.example`, added fail-fast production guards in `supabaseClient.js`, and generated machine-readable `database.types.js`.
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
