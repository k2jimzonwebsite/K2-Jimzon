# Admin BOS Same-Origin BFF Security Runbook

**Current status:** server foundation, cookie-auth client, fixed overview,
product, fulfillment, inbox, Pasabuy, product-intake, flight-consignment,
lot/expiry, and coupon reads plus their named signed command slices are locally
contract/build-tested behind `VITE_ADMIN_BFF_ENABLED=false`. The customer read
slice is locally contract-tested behind the same flag; its post-change production
build is pending because the current execution quota prevented the build command.
None is deployed or active. The current UI still uses a browser Supabase session and
must not be described as HttpOnly-cookie protected.

While that direct-browser transition remains active, Google OAuth always returns
to the allowlisted public Admin origin
`https://k2-jimzon-admin-seven.vercel.app/admin-portal-k2-secure`; immutable
preview/deployment URLs are not accepted as callbacks. A returned staff session
requiring AAL2 must continue into the visible TOTP challenge. Returning to the
credential form without a role, callback, or MFA explanation is a failed auth
flow, not a successful sign-in.

**Hobby deployment gate (14 August 2026):** the prepared Admin and Storefront
handlers total 50 files, while each current Vercel Hobby deployment accepts at
most 12 Serverless Functions. They therefore live under `prepared-api/`, outside
Vercel's special deployable `api/` directory, while both BFF feature flags remain
off. Before activation, consolidate them behind no more than 12 bounded
functions per artifact or deliberately upgrade the plan; then restore deployable
routes and repeat every real-host denial and session test.

## Purpose

The Admin BOS will authenticate and perform operational data work through the
admin Vercel project's same-origin `/api/admin/*` boundary. Browser JavaScript
will receive minimal identity/status responses, never Supabase access tokens,
refresh tokens, service-role keys, marketplace secrets, or private provider
errors.

The storefront Vercel project may contain the shared source tree, but every
admin function returns `404` in production unless its runtime environment has
`K2_DEPLOYMENT_TARGET=admin`. Missing configuration fails closed. The storefront
bundle boundary separately proves that admin modules are not in customer JS.

## Implemented foundation

| Route | Method | Current server behavior |
| --- | --- | --- |
| `/api/admin/auth/login` | POST | Exact-origin check, bounded JSON, basic IP throttle, Supabase password sign-in with limited anon key, live staff-role check, mandatory MFA decision |
| `/api/admin/auth/mfa` | POST | Ten-minute encrypted pending session, verified TOTP factor, AAL2 check, repeated live staff-role check, active-cookie issuance |
| `/api/admin/session` | GET | Decrypts session, enforces 30-minute inactivity and 8-hour maximum, restores/refreshes with Supabase, rechecks user/role/AAL2, rotates cookies |
| `/api/admin/auth/logout` | POST | Exact-origin and CSRF checks, provider sign-out when possible, unconditional local cookie removal |
| `/api/admin/overview` | GET | Fixed 7/30/90-day query, live session/role/AAL2 recheck, eight allowlisted read projections, safe partial-state labels, inactivity refresh |
| `/api/admin/products` | GET | Fixed 500-row SKU/name/barcode/status/price/image projection plus batch-derived stock, live session/role/AAL2 recheck, safe stock-unavailable state |
| `/api/admin/fulfillment` | GET | Fixed submitted-order, confirmed packing, lot, and staff-display projection; no generic table selection |
| `/api/admin/fulfillment/confirm` | POST | Named stock reservation command with reason and durable idempotency |
| `/api/admin/fulfillment/packing-scan` | POST | Records exactly one required unit; replay-safe operation key prevents retry double-counting |
| `/api/admin/fulfillment/payment` | POST | Records an allowed evidence-state transition; does not process or prove payment |
| `/api/admin/fulfillment/delivery` | POST | Records bounded courier, quote/platform charge, tracking, waybill, confirmation, and communication note |
| `/api/admin/fulfillment/fulfill` | POST | Executes existing full-scan, verified-payment, delivery-ready, exact-lot handover rules |
| `/api/admin/fulfillment/transfer-lot` | POST | Moves an exact unreserved quantity while preserving parent-lot history |
| `/api/admin/fulfillment/assign-box` | POST | Assigns all positive lots in one physical box to a named custodian |
| `/api/admin/inbox` | GET | Bounded fixed projection of up to 200 conversations, recent messages, and staff display identities |
| `/api/admin/inbox/history` | GET | Exact-conversation projection of the latest 20 workflow/internal-note events without raw metadata |
| `/api/admin/inbox/internal-note` | POST | Saves an audited `internal_only` note; never claims external delivery |
| `/api/admin/inbox/mark-read` | POST | Records staff read state through a replay-safe command |
| `/api/admin/inbox/workflow` | POST | Validates and records status, priority, assignee, deadline, and resolve/reopen reason |
| `/api/admin/pasabuy` | GET | Fixed bounded Pasabuy request and immutable quote-version projection; no generic row selection |
| `/api/admin/pasabuy/transition` | POST | Advances only through the existing database transition matrix with a required reason |
| `/api/admin/pasabuy/quote` | POST | Saves one bounded immutable quote version with required owner price rationale; never marks sent or paid |
| `/api/admin/product-intake/session` | GET/POST | Resumes one RLS-scoped active session or creates one replay-safe server session |
| `/api/admin/product-intake/duplicates` | GET | Exact code/SKU and escaped bounded name-candidate search with fixed product projection |
| `/api/admin/product-intake/consignments` | GET | Fixed list of at most 50 open `Packing_Italy` manifests |
| `/api/admin/product-intake/step` | POST | Saves one ordered checklist transition and only allowlisted bounded evidence/review fields |
| `/api/admin/product-intake/evidence` | POST binary | Decodes/re-encodes one private JPEG/PNG/WebP, strips metadata, enforces size/dimensions/pixels, and registers its hash/path |
| `/api/admin/product-intake/draft` | POST | Calls the reviewed, duplicate-gated, server-SKU Draft command idempotently |
| `/api/admin/product-intake/inventory` | POST | Records only a flight manifest line or authorized opening reconciliation; supplier receipt remains unavailable |
| `/api/admin/product-intake/publication` | POST | Performs the existing readiness transition with a required audit reason; does not imply channel publication |
| `/api/admin/consignments` | GET | Fixed projection of at most 100 manifests with bounded lines and 200 recent scan events |
| `/api/admin/consignments/create` | POST | Creates one validated flight manifest through the signed replay-safe command boundary |
| `/api/admin/consignments/add-line` | POST | Adds one bounded SKU, box, batch/expiry, and expected-quantity line to an eligible manifest |
| `/api/admin/consignments/scan` | POST | Verifies the actual scanned code against the selected line's SKU or product barcode before recording one Milan or Manila unit |
| `/api/admin/consignments/advance` | POST | Advances only to the supported shipment state with a required operational reason and audit event |
| `/api/admin/consignments/finalize` | POST | Runs the existing atomic receipt finalizer with a required reconciliation note and durable retry protection |
| `/api/admin/lots` | GET | Fixed bounded lot projection, optionally scoped to one validated SKU; returns physical, reserved, derived available, expiry, disposition, location, custody, and product name only |
| `/api/admin/lots/reconcile` | POST | Reconciles at most 50 complete lots with a specific reason while preserving IDs, reservations, and immutable before/after events |
| `/api/admin/lots/clearance` | POST | Approves or withdraws one eligible 31–89 day clearance decision with reason, actor, durable retry, and recalculated sellable stock |

| `/api/admin/coupons` | GET | Fixed bounded coupon register projection; never uses a generic row selection or exposes creator identity |
| `/api/admin/coupons/create` | POST | Admin-only bounded campaign creation with a specific reason, durable idempotency, and immutable event |
| `/api/admin/coupons/state` | POST | Admin-only reasoned activation or pause; rejects archived, expired, exhausted, or unchanged campaigns |
| `/api/admin/coupons/archive` | POST | Admin-only reasoned non-destructive archive with immutable before/after evidence |
| `/api/admin/customers` | GET | Admin-only fixed customer/contact/account/channel projection with all-or-unavailable operational metrics and a truthful legacy-profile fallback |

Active and pending session cookies are AES-256-GCM encrypted with a dedicated
32-byte server key. Session and pending cookies are `HttpOnly`, `SameSite=Strict`,
and always `Secure` in production. The CSRF cookie is readable by the admin page,
but its SHA-256 binding is inside the encrypted session and every mutation must
send the exact `X-K2-CSRF` value. Cookies contain no plaintext password.

The Admin application now owns `AdminStoreContext`; the storefront owns the
separate commerce `StoreContext`. Admin Auth and inbox runtimes are imported only
by `AdminApp`. The production boundary verifier scans both manifest modules and
compiled JavaScript for cross-artifact route/session/command markers. This is a
build-isolation fact, not evidence that the inactive cookie boundary is deployed.

## Required Admin Vercel environment

| Variable | Scope | Rule |
| --- | --- | --- |
| `K2_DEPLOYMENT_TARGET` | Admin Production/Preview | Exact value `admin`; storefront uses `storefront` |
| `SUPABASE_URL` | Server only | Correct project URL; no `VITE_` prefix |
| `SUPABASE_ANON_KEY` | Server only | Limited public/anon key; never service role for session/data proxy |
| `K2_SESSION_COOKIE_KEY` | Admin server only | Base64 encoding of 32 unique random bytes; rotate through a controlled forced-logout procedure |
| `K2_ADMIN_BFF_REQUEST_SECRET` | Admin server only | Base64 encoding of the same 32-byte secret installed only in `k2_private.admin_bff_secrets`; never expose to browser or logs |
| `K2_ADMIN_ORIGINS` | Admin server only | Comma-separated exact HTTPS admin origins; no wildcard, path, or trailing guess |
| `K2_COOKIE_SECURE` | Local only | May be `false` for local HTTP; production forces Secure regardless |

Do not set the session key or future marketplace/provider secrets in `VITE_*`.
Do not copy production values into `.env.example`, GitHub, screenshots, logs, or
support messages.

## Session behavior

- Login responses use stable error codes and never return provider messages or
  stack traces.
- A valid password without an enrolled verified factor is denied with
  `MFA_ENROLLMENT_REQUIRED`; a required step-up receives only a ten-minute
  encrypted pending cookie.
- Every restored session is checked against Auth, the current `user_profiles`
  role, and AAL2. Removed staff, signed-out users, revoked/expired refresh tokens,
  and downgraded assurance are rejected.
- Inactivity is 30 minutes and absolute lifetime is 8 hours. Session checks
  rotate the encrypted cookie and CSRF binding without extending the absolute
  lifetime.
- Logout clears local cookies even if provider sign-out is unavailable.
- Password change, staff removal, incident response, or suspected theft must
  revoke Supabase sessions as well as relying on local expiry.

## Current limitations and activation gate

- The IP login throttle is per warm function instance. It is an immediate abuse
  brake, not the durable distributed rate limit required by MAP-020.
- Security-event persistence, correlation IDs, alerting, device/session listing,
  explicit remote-session revocation, password reset, invitations, OAuth, and
  durable CSRF/rate-limit tests remain pending.
- Most Admin operational reads/writes still call Supabase from browser code.
  Switching login now would break those operations or force tokens back into
  JavaScript. Migrate each remaining capability to named BFF queries/commands
  before activating BFF login. The prepared overview route is only the first
  reversible slice and remains off by default.
- Email/password, pending MFA, session restore, CSRF logout, and safe client
  errors are wired to the BFF behind the same inactive flag. Google OAuth,
  authenticator enrollment, and staff invitations deliberately report
  unavailable when the flag is enabled because their named BFF routes do not
  exist yet; activation cannot proceed while those staff workflows are pending.
- The BFF must never become a generic table/RPC proxy. Every route gets a fixed
  schema, permission, AAL, reason/idempotency requirement, safe response, rate
  class, and audit event.

## Admin browser-operation inventory

This is a factual migration inventory, not a second backlog. Work order and
acceptance remain exclusively in `MASTER_ACTION_PLAN.md`.

| Capability | Current browser surface | Direct operation class | Named BFF destination | State |
| --- | --- | --- | --- | --- |
| Command-center analytics | `Overview.jsx`, `Admin.jsx` | orders, Pasabuy, lots, products, channels, listings, inbox reads | `/api/admin/overview` plus shell summary | Overview prepared; shell pending |
| Product Master and Sheet | `InventoryGrid.jsx`, `Sheet.jsx`, `SmartPasteModal.jsx`, `BulkCsvImportModal.jsx`, `ScanToAiModal.jsx` | product reads, draft/update/publication, duplicate checks | product queries and server commands | Minimal scan/fulfillment read projection prepared; full reads and commands pending |
| Product intake evidence | `productIntakeService.js`, `ProductIntakeSessionModal.jsx` | intake session, evidence Storage, SKU/lot/publication RPCs | intake session/evidence/commit commands | Prepared behind disabled flag; real decode/re-encode and signed registration rollback-proven; permanent migrations/cutover pending |
| Lots and expiry | `BatchExpiryManagerModal.jsx`, `DailyTaskNotificationDrawer.jsx` | batch reads, reconciliation, clearance approval | lot query/reconcile/approve commands | Prepared behind disabled flag; fixed projection, reservation-safe derivation, expiry/clearance gates, corrected compatibility trigger/views, reasoned UI, behavioral rollback proof, and direct-RPC cutover are complete locally; permanent migration/cutover pending |
| Flight consignments | `ConsignmentManager.jsx` | manifest reads/create, line add, scan, advance, finalize | flight query and explicit scan/state commands | Prepared behind disabled flag; barcode-to-line verification, durable scan retry, reason audit, direct-RPC cutover, and rollback compilation are proven; richer damage/unexpected/wrong/expiry/quarantine dispositions remain MAP-023 work |
| Orders, packing, custody | `OmniOperationsHub.jsx` | order reads/confirm, packing scan, exact custody, payment/delivery/fulfillment state | fulfillment queries and commands | Prepared behind disabled flag; signed migration rollback-proven; permanent cutover pending |
| Pasabuy operations | `PasabuyManager.jsx` | request reads, workflow and quote mutations | Pasabuy query/transition/quote commands | Prepared behind disabled flag; signed migration rollback-proven; current live state matrix preserved; permanent cutover pending |
| Universal inbox | `useAdminInboxRuntime.js`, `Inbox.jsx` | conversation/messages/events/staff reads; internal-note/read/workflow RPCs; Realtime | inbox/history query plus internal-note/read/workflow commands and bounded polling | Prepared behind disabled flag; internal-only truth and combined SQL rollback-proven; provider delivery pending |
| Customers | `Customers.jsx` | customer/profile reads | bounded customer directory query | Prepared behind disabled flag; Admin-only canonical/legacy modes and no-inferred-merge UI pass local contracts; post-change production build and direct provider reinspection pending |
| Coupons | `CouponManager.jsx` | coupon read/create/toggle/archive | coupon query plus create/state/archive commands | Prepared behind disabled flag; Admin-only reason/event boundary and direct-mutation cutover rollback-proven; permanent cutover pending |
| Suppliers and purchases | `Suppliers.jsx`, `PurchaseOrders.jsx` | supplier and purchase-order reads/writes | supplier/purchase queries and commands | Pending |
| Channels | `ChannelIntegrations.jsx`, `connectorRuntime.js` | connection/readiness reads, verification and event writes | connector status and verification commands | Pending; adapters remain disconnected |
| Staff and permissions | `StoreContext.jsx`, `StaffPermissionManager.jsx` | profile reads, role/PIN RPCs, invite function, MFA enrollment | owner-only staff/invite/role/session commands | Pending |
| Product/review media | `ImageUploadDropzone.jsx`, `InventoryGrid.jsx`, `PhotoManagerModal.jsx`, `globeCms.jsx`, `GlobeCms.jsx` | public/private Storage plus product/globe/review CRUD | validated media upload/delete and CMS commands | Pending |
| Diagnostics | `reportError.js`, `SystemDevOpsModal.jsx` | error insert/read, session and launch checks | redacted event intake and restricted diagnostics queries | Pending |

The storefront-only product/catalog reads remain outside this Admin BFF
inventory. They require their own public read policy, cache, and projection; they
must never gain an admin cookie or admin route.

## Activation sequence

1. Complete MAP-016/MAP-017 and prove staff RLS/RPC denial behavior.
2. Inventory all Admin BOS Supabase reads, writes, RPCs, Storage, Realtime, and
   Auth operations; map each to a named server query or command.
3. Implement shared origin, CSRF, session, validation, rate-limit, error, and
   audit middleware for those routes.
4. Migrate one operational area at a time, beginning read-only. Keep a reversible
   feature flag until its positive/negative tests pass.
5. Remove browser auth calls, `getSession`, `onAuthStateChange`, bearer-token
   construction, and direct privileged data calls from the admin artifact.
6. Configure the exact Admin Vercel environment and verify the storefront
   project returns `404` for admin APIs.
7. Test login, MFA, fixation, CSRF, expiration, inactivity, role removal,
   password change, logout, token theft, direct Supabase bypass, safe errors,
   preview-origin denial, and both production artifacts on the real hosts.

For the fulfillment cutover, generate one 32-byte request secret, store its
base64 form only as `K2_ADMIN_BFF_REQUEST_SECRET` on the Admin Vercel project,
and insert the decoded bytes only into `k2_private.admin_bff_secrets` during the
approved migration window. Apply
`supabase/migrations/20260812_admin_fulfillment_bff_boundary.sql`, verify nonce
replay, changed-payload idempotency conflict, duplicate scan retry, rate denial,
nonstaff, AAL1, CSRF, wrong-origin, and storefront-project denial, then enable
`VITE_ADMIN_BFF_ENABLED=true` only in the coordinated release. Never enable the
flag while any required admin view still depends on browser Supabase Auth/data.

Apply `supabase/migrations/20260812_admin_pasabuy_bff_boundary.sql` only after
the foundation and private request secret exist. Denial tests must cover nonstaff,
AAL1, CSRF, wrong origin, storefront deployment, replay, changed-payload
idempotency, numeric/date overflow, unsupported state, blank reason, blank price
rationale, and final price below landed cost. Positive tests must also prove
that saving does not mark a quote sent, accepted, or paid.

Apply `supabase/migrations/20260812_admin_consignments_bff_boundary.sql` only
after the foundation and private request secret exist, and only in the same
coordinated release that enables the prepared flight interface. The migration
revokes authenticated browser execution of all five legacy mutation RPCs, so a
partial cutover is not safe. Denial tests must cover nonstaff, AAL1, CSRF, wrong
origin, storefront deployment, replay, changed-payload idempotency, rate limits,
invalid bounds and states, identifier tampering, and a scanned code that does
not match the selected line. Positive tests must prove that a lost-response
retry counts one physical unit once, a new physical scan counts the next unit
once, Milan and Manila observations remain independent, failed finalization
creates no lot, and an exact finalization retry creates inventory once.

Apply `supabase/migrations/20260812_admin_lots_bff_boundary.sql` only with the
shared foundation and private request secret in the coordinated Admin cutover.
It replaces the live compatibility trigger that currently equates physical and
available quantity, normalizes existing rows, adds the derived-availability
constraint, corrects stock/expiry views, and revokes the two direct browser
mutation RPCs. Denial tests must cover nonstaff, AAL1, CSRF, wrong origin/project,
replay, changed-payload idempotency, rate limits, omitted/duplicate/cross-SKU lot
IDs, quantity below reservations, missing physical-lot identity/custody/expiry,
unsafe disposition, invalid clearance age/status, and blank reasons. Positive
tests must prove reservation changes recalculate sellable quantity, 0–30 day and
unknown-expiry stock remains unavailable, 31–89 day stock requires clearance,
physical counts stay distinct in expiry reporting, retries add no second event,
and fulfillment/custody functions retain their physical-unit behavior.

Apply `supabase/migrations/20260812_admin_coupons_bff_boundary.sql` only with the
shared foundation, matching private/server request secret, prepared routes, and
coupon interface in the coordinated Admin cutover. It creates immutable coupon
change events, requires the live `Admin` role for every mutation, and revokes
direct authenticated insert/update/delete privileges while retaining existing
RLS-scoped reads for the restored staff JWT. Denial tests must cover Staff and
customer roles, AAL1, CSRF, origin/project, replay, changed-payload idempotency,
rate limits, unknown/duplicate IDs, duplicate or malformed codes, percentage/
money/count/date overflow, short reasons, archived/expired/exhausted/unchanged
state transitions, and raw error leakage. Positive tests must prove create,
scheduled activation, pause, archive, one event per accepted change, exact retry
without a second event, server validation/redemption continuity, and mobile/
laptop staff acceptance.

Run `npm run verify:admin-bff` for the local foundation contract. A passing
source contract is not deployment or end-to-end session evidence.
