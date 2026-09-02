# K2 Jimzon — System Brain (Current State)

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

**The published catalog returns zero rows.** `products` filtered to
`status in ('Live','Active','Unlisted')` and `published = true` returns nothing.
MAP-023 queue item 11 is unchanged and current. The local storefront looks
healthy only because `StoreContext` falls back to the `src/data/products.js`
seed in development; production correctly renders an empty catalog, and a
contract now pins that guard, because the seed ships in the bundle by necessity
and is one deleted line from advertising 36 fabricated products.

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
