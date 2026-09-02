# Admin BOS Same-Origin BFF Security Runbook

**Current status:** server foundation, cookie-auth client, fixed overview,
product, product-master, fulfillment, inbox, Pasabuy, product-intake, flight-consignment,
lot/expiry, and coupon reads plus their named signed command slices are locally
contract/build-tested behind `VITE_ADMIN_BFF_ENABLED=false`. The customer read
slice is also locally contract-tested and included in the passing sequential
Admin production build behind the same flag. The consolidated deployable
entrypoint now exists at `api/admin/index.js`, but independently requires
`K2_DEPLOYMENT_TARGET=admin` and `K2_ADMIN_BFF_ENABLED=true`; its default is a
minimal `404` even if the browser flag is changed accidentally.
None is deployed or active. The current UI still uses a browser Supabase session and
must not be described as HttpOnly-cookie protected.

The prepared encrypted session payload is versioned and validated field by
field before use. Every completed authentication receives a new opaque UUID
session identity and fresh CSRF token; subsequent inactivity refreshes preserve
that identity and the original eight-hour absolute-lifetime anchor while
rotating the encrypted cookie and provider tokens. Invalid roles, identities,
hashes, timestamps, token shapes, altered ciphertext, expired idle windows, and
expired hard windows fail closed. An additive private registry migration and
signed session-command boundary are now prepared locally: cookies are issued
only after durable registration, protected requests validate/touch the owned
row, and bounded own-session listing plus one/all revocation routes exist. None
of that registry behavior is deployed; coordinated migration and live Auth
tests remain required before activation.

Every registry row is additionally bound to the provider JWT `session_id` and
matching actor-owned `auth.sessions` row. Registration fails without it. Each
validation rechecks it and revokes the K2 row with
`provider_session_inactive` when password change, global sign-out, or another
provider security action removes the provider row. This closes the access-JWT
grace period locally without paid Supabase lifetime controls; it stores no
provider token. PostgreSQL rehearsal proves the active-to-removed lifecycle,
but preview/production Auth behavior is still unverified.

The prepared private session-event ledger stores only actor/session identifiers,
an allowlisted event type, an allowlisted outcome/reason code, and timestamp for
registration, validation denial, and revocation. It has no browser-role table
grant and no token, IP, user-agent, provider-error, or free-form payload column.
This is the first MAP-022 event slice, not a complete correlation, retention,
review, or alerting system.

While the explicit flag-off direct-browser transition remains active, Google OAuth always returns
to the allowlisted public Admin origin
`https://admin.k2jimzon.com/admin-portal-k2-secure`; immutable
preview/deployment URLs are not accepted as callbacks. A returned staff session
requiring AAL2 must continue into the visible TOTP challenge. Returning to the
credential form without a role, callback, or MFA explanation is a failed auth
flow, not a successful sign-in.
The temporary direct-browser flow uses PKCE, sanitizes callback credentials from
the URL, and defers role/MFA verification outside the Supabase auth-state
callback lock. The modern browser-safe publishable key is compiled as a reviewed
fallback until the same value is present in the Admin Vercel environment; this
does not authorize service-role access or activate the prepared BFF. Secure
Admin mode rejects Google sign-in before a provider call and hides the OAuth
option; provider credentials and a future server flow remain separately gated.

**Hobby deployment gate (14 August 2026; current inventory 1 September):** the
prepared Admin and Storefront route handlers total 95 files, while each current
Vercel Hobby deployment accepts at most 12 Serverless Functions. The leaf
handlers remain under `prepared-api/`, outside Vercel's special deployable
`api/` directory. Only the two consolidated guarded entrypoints have been
promoted locally. Both server and browser BFF switches remain off.

**Prepared consolidation (21 August 2026; expanded through 31 August):** all 81 Admin endpoint modules now
sit behind one exact allowlist in `server/admin-bff/router.js`, with
81 exact method-aware routes and `prepared-api/admin-router.js` as the shared
router adapter. The single deployable entrypoint is `api/admin/index.js`. The
Admin verifier enumerates the endpoint directory and fails if any prepared
handler is missing from—or duplicated in—the router. Unknown and traversal-like
paths return the same minimal `404`. `vercel.admin.json` now declares the exact
catch-all rewrite into that entrypoint. This removes the local routing-design
and empty-`api/` blocker, but it is not deployment evidence. Vercel discovers
functions from source independently of the `functions` tuning map, so preview
function inventory must prove that the Admin project contains only its intended
entrypoint. Real-host origin/session/CSRF/method/unknown-route tests must pass,
then the server switch may be enabled for preview before the browser
`VITE_ADMIN_BFF_ENABLED` switch is enabled last.

The Storefront side has the equivalent ten-route allowlist and one prepared
entrypoint. Together the prepared design targets one function in each of the two
separate artifacts, rather than restoring the 52 leaf modules as deployable
functions. A real preview inventory must still prove that target independently.

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
| `/api/admin/auth/login` | POST | Exact-origin, bounded credential schema, process-local IP brake, and signed durable HMAC-only IP/contact/global database budgets; durable denial returns safe `429` plus `Retry-After` before the limited server client can call password Auth, then allowed requests require live staff role and mandatory MFA |
| `/api/admin/auth/mfa` | POST | Exact challenge, enrollment-start, or enrollment-verify schema under the ten-minute encrypted pending session; process-local IP brake plus signed durable HMAC-only IP/pending-session/global budgets deny before provider-session restoration; stale unverified TOTP cleanup is actor-scoped, active-cookie issuance requires exact factor verification, repeated live staff-role check, and provider AAL2 |
| `/api/admin/auth/password-recovery/request` | POST | Exact-origin, exact-email, bounded JSON, process-local brake, and signed durable HMAC-only IP/contact/global database budgets; a durable denial returns generic `429` plus `Retry-After` before any provider call, while an allowed request uses the limited server client and returns one generic accepted state |
| `/api/admin/auth/password-recovery/verify` | GET | Email callback with no Origin assumption; accepts only an exact 64-hex token hash and `recovery` type, consumes a signed durable HMAC-only IP/token/global budget before provider verification, rechecks verified email and current staff role, then redirects with no provider token after setting ten-minute encrypted recovery/CSRF cookies |
| `/api/admin/auth/password-recovery/complete` | POST | Exact-origin and recovery-CSRF protected; consumes a signed durable HMAC-only IP/recovery-session/global budget before provider restoration, then rechecks the single-use recovery session and current staff role, accepts one matching 12–128 character password, changes it, globally signs out provider sessions, and clears recovery cookies |
| `/api/admin/staff-access/mfa-replacement` | POST | Separately gated Admin/AAL2/CSRF/idempotency boundary; exact start/complete schemas, private signed reason receipts, one-active-factor precondition, bounded replacement QR/key, exact new-factor verification, old-factor retirement only after success, and rotated provider tokens kept in the encrypted cookie |
| `/api/admin/session` | GET | Decrypts session, enforces 30-minute inactivity and 8-hour maximum, restores/refreshes with Supabase, rechecks user/role/AAL2, rotates cookies |
| `/api/admin/sessions` | GET | Lists at most 20 unexpired, unrevoked sessions owned by the current AAL2 staff identity; exposes only session ID, current marker, and lifecycle timestamps |
| `/api/admin/sessions/revoke` | POST | CSRF-protected, reasoned, payload-bound idempotent revocation of one owned session or all sessions owned by the current staff identity |
| `/api/admin/auth/logout` | POST | Exact-origin and CSRF checks, durable current-session revocation attempt before provider sign-out, unconditional local cookie removal, and explicit uncertainty on registry failure |
| `/api/admin/overview` | GET | Fixed 7/30/90-day query, live session/role/AAL2 recheck, eight allowlisted read projections, safe partial-state labels, inactivity refresh |
| `/api/admin/products` | GET | Fixed 500-row SKU/name/barcode/status/price/image projection plus batch-derived stock, live session/role/AAL2 recheck, safe stock-unavailable state |
| `/api/admin/product-master` | GET/POST | Admin/AAL2-only fixed one-SKU detail projection plus exact reasoned optimistic update, five-state lifecycle, and PIN deletion commands; signed, CSRF-protected, database-rate-limited, idempotent, and private-event audited |
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
| `/api/admin/product-intake/session` | GET/POST | Resumes one RLS-scoped active session or creates one CSRF-protected, idempotent, database-rate-limited server session; consolidated routing preserves both methods |
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
| `/api/admin/globe-cms` | GET/POST | Admin/AAL2-only fixed Globe/review projection plus signed, versioned, reasoned visibility and review draft/correction/publication/withdrawal commands |
| `/api/admin/procurement` | GET/POST | Fixed staff supplier/PO projection plus Admin-only reasoned supplier creation; PO creation and receiving remain unavailable |
| `/api/admin/channels` | GET/POST | Fixed staff five-channel readiness aggregate plus Admin-only signed Website/Pasabuy real-reference verification; external connectors remain inactive |
| `/api/admin/staff-access` | GET/POST | Fixed Admin/SuperAdmin profile/PIN-state projection plus signed, reasoned role and delete-PIN changes; the separate `ai_spend_controls_update` action is AAL2/SuperAdmin-only and reports versioned paid-AI caps only when its server gate is active |
| `/api/admin/staff-access/invite` | POST | Admin/AAL2-only exact email/role/reason command; forwards the restored provider token server-side to the reason-bound Edge receipt and returns only email, role, and invite/existing-account outcome |
| `/api/admin/system-readiness` | GET | Admin/AAL2-only boolean projection of protected request, session, database, and named-boundary presence; exposes no raw diagnostics or provider/deployment claims |

| `/api/admin/coupons` | GET | Fixed bounded coupon register projection; never uses a generic row selection or exposes creator identity |
| `/api/admin/coupons/create` | POST | Admin-only bounded campaign creation with a specific reason, durable idempotency, and immutable event |
| `/api/admin/coupons/state` | POST | Admin-only reasoned activation or pause; rejects archived, expired, exhausted, or unchanged campaigns |
| `/api/admin/coupons/archive` | POST | Admin-only reasoned non-destructive archive with immutable before/after evidence |
| `/api/admin/customers` | GET | Admin-only fixed customer/contact/account/channel projection with all-or-unavailable operational metrics and a truthful legacy-profile fallback |
| `/api/admin/wholesale-inquiries` | GET | Admin-only staff/AAL2 fixed projection of at most 200 inquiry/contact/need records through public references; no raw relational IDs or commercial authority |
| `/api/admin/wholesale-inquiries/review` | POST | Admin-only signed, CSRF-protected, reasoned, payload-idempotent triage transition among submitted, under-review, and closed; it cannot approve commercial terms |

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
| `SUPABASE_PUBLISHABLE_KEY` | Server only | Modern limited publishable key; never secret/service-role key for session/data proxy |
| `K2_SESSION_COOKIE_KEY` | Admin server only | Base64 encoding of 32 unique random bytes; rotate through a controlled forced-logout procedure |
| `K2_ADMIN_BFF_REQUEST_SECRET` | Admin server only | Base64 encoding of the same 32-byte secret installed only in `k2_private.admin_bff_secrets`; never expose to browser or logs |
| `K2_ADMIN_ORIGINS` | Admin server only | Comma-separated exact HTTPS admin origins; no wildcard, path, or trailing guess |
| `VITE_TURNSTILE_SITE_KEY` | Admin browser | Public site key for the exact Admin preview/production host; never a secret |
| `K2_TURNSTILE_SECRET_KEY` | Admin server only | Private key paired to the Admin site key; never use a `VITE_` prefix or share its value with Storefront |
| `K2_STAFF_INVITATIONS_ENABLED` | Admin server only | Keep unset/`false` until the reason migration is applied and invite-staff v7 is deployed and verified; exact `true` enables BFF forwarding |
| `K2_MFA_REPLACEMENT_ENABLED` | Admin server only | Keep unset/`false` until `20260824_admin_mfa_replacement_boundary.sql`, exact route, provider-role test, retry rehearsal, and staff acceptance pass; exact `true` enables active-factor replacement only |
| `K2_AI_SPEND_CONTROLS_ENABLED` | Admin server only | Keep unset/`false` until `20260830_paid_ai_spend_controls.sql`, owner-controlled SuperAdmin assignment, provider/model/retention decisions, cap/confirmation tests, and production activation evidence pass; exact `true` only exposes the prepared control read/write boundary and never supplies a provider key |
| `K2_ADMIN_PASSWORD_RECOVERY_ENABLED` | Admin server only | Keep unset/`false` until `20260825_admin_preauth_rate_boundary.sql`, `map020_admin_preauth_rate_postflight.sql`, the exact callback allowlist, custom recovery template, real mail/link, role denial, replay, expiry, global revocation, provider-suppression, prefetch, and email-tracking checks pass; exact `true` enables the three recovery routes |
| `K2_ADMIN_PASSWORD_RECOVERY_CALLBACK_URL` | Admin server only | One exact HTTPS Admin URL ending `/api/admin/auth/password-recovery/verify`; its origin must also appear exactly in `K2_ADMIN_ORIGINS` |
| `K2_COOKIE_SECURE` | Local only | May be `false` for local HTTP; production forces Secure regardless |

Do not set the session key or future marketplace/provider secrets in `VITE_*`.
Do not copy production values into `.env.example`, GitHub, screenshots, logs, or
support messages.

## Session behavior

- Login responses use stable error codes and never return provider messages or
  stack traces.
- Credential login and recovery-email issuance require an `admin_auth`
  Turnstile token after their durable budget decision and before password Auth
  or provider mail. Budget denial performs no remote challenge work; challenge
  denial performs no provider work. MFA, recovery-link verification, and
  password completion retain their dedicated budgets without another challenge.
- A valid password without an enrolled verified factor receives
  `MFA_ENROLLMENT_REQUIRED` plus only a ten-minute encrypted pending cookie. That
  cookie can start one bounded TOTP setup and verify its exact factor; it never
  becomes an active Admin cookie before a repeated staff check and provider AAL2.
  A required step-up uses the same pending-cookie boundary with the existing
  verified factor. Every MFA command consumes durable limits of 10/IP/15 minutes,
  5/pending session/15 minutes, and 300/global/minute before restoring provider
  tokens; storage contains only domain-separated server-HMAC subjects.
- Every restored session is checked against Auth, the current `user_profiles`
  role, and AAL2. Removed staff, signed-out users, revoked/expired refresh tokens,
  and downgraded assurance are rejected.
- Inactivity is 30 minutes and absolute lifetime is 8 hours. Session checks
  rotate the encrypted cookie and CSRF binding without extending the absolute
  lifetime.
- Logout clears local cookies even if durable revocation or provider sign-out is
  unavailable, but returns `SESSION_REVOCATION_UNAVAILABLE` rather than claiming
  remote revocation when the registry call is uncertain.
- Password change, staff removal, incident response, or suspected theft must
  revoke Supabase sessions as well as relying on local expiry.
- A recovery request never confirms whether an email is registered or has a
  staff role. A verified link creates only a ten-minute encrypted recovery
  session. Completion requires its separate readable CSRF cookie/header,
  verified email, unchanged staff identity/role, and a matching 12–128 character
  password. Success globally signs out Supabase sessions and clears the recovery
  cookies. Supabase access JWTs can remain cryptographically valid until their
  encoded expiry; K2's provider-session registry therefore rechecks the matching
  `auth.sessions` row on every Admin request and denies the removed session.
- Correctly signed AAL2 requests also consume durable one-minute database
  budgets: 360 requests per actor across all actions and 6,000 requests across
  the Admin boundary. Existing command-specific limits remain stricter where
  configured. A budget denial is `429 RATE_LIMITED` with `Retry-After: 60`.

## Local Product Master rendered evidence — 27 August 2026

A dedicated secure-flag Chromium journey now exercises the real Inventory Grid
with fixed mocked BFF responses at 375×812. It verifies the named product editor,
required immutable-change reason, reasoned Draft → Under Review decision,
delete-PIN initial focus, history-based permanent-deletion refusal, 44px actions,
and zero horizontal overflow. The editor and lifecycle decision use the shared
Admin dialog primitive; phone edit fields stack into one column.

The focused journey, all 16 Admin UI journeys, 213 API/security contracts plus
both selling-surface behaviors, the zero-gap security gate, and the isolated
Admin production build pass. These are local source/rendered/compiled-artifact
checks only. Before activation, repeat edit, conflict, lifecycle denial,
permission denial, PIN lockout, history refusal, and valid unused-draft deletion
against the deployed Admin host with real staff/AAL2 sessions after MAP-017 and
MAP-019 gates pass.

## Current limitations and activation gate

- Login and pending-session MFA now have prepared private distributed IP/subject/
  global budgets before password Auth or provider-session restoration, but the
  migration and Admin BFF remain inactive. Recovery request, token verification,
  and completion have their own durable subjects and thresholds under the same
  migration.
  The prepared actor/global command budgets begin only after a valid signed AAL2
  identity reaches the verifier.
- The private durable session registry, provider-session binding, listing, and
  revocation boundary are prepared but inactive. Provider-wide live behavior
  and real-host stolen-cookie denial still require the coordinated migration,
  secrets, flags, and deployed Auth tests.
- Password-reset correlation IDs, best-effort allowlisted reset events, and a
  private distributed reset budget are prepared. The budget migration is
  inactive; production application, durable denial-event review/alerting, OAuth,
  and deployed CSRF/rate-limit/provider evidence remain pending.
- Explicit flag-off compatibility paths still call Supabase from browser code
  while the coordinated cutover is inactive. Secure Admin mode must never run
  those paths in parallel with its named BFF query/command. The shared Globe
  provider is now inert in secure mode, so it cannot start legacy browser Auth
  listeners or Globe/review reads beside the protected CMS boundary. Shared
  product navigation now also evaluates the secure transport before browser-
  client availability, uses the fixed product projection plus visible-page
  polling, and reserves browser queries/Realtime for flag-off compatibility.
  The inbox audit found its secure projection/history/command/polling branches
  already precede every legacy query/RPC/Realtime path. Repeat this reachability
  check across the remaining mapped capabilities before activation.
- Email/password, pending MFA, session restore, CSRF logout, and safe client
  errors are wired to the BFF behind the same inactive flag. Secure invitations
  now have a named reason-bound route, but remain unavailable unless
  `K2_STAFF_INVITATIONS_ENABLED=true`; apply the additive reason migration,
  deploy the matching Edge version, verify one real AAL2 invitation and replay,
  then enable this switch. First-factor TOTP enrollment for an invited staff
  account is now prepared through the pending-session route. Active-session
  one-factor replacement is also prepared behind
  `K2_MFA_REPLACEMENT_ENABLED=true`: apply its private reason-receipt migration,
  verify one real provider replacement plus ambiguous retry, and record staff
  acceptance before enabling it. Lost-factor recovery and Google OAuth remain
  unavailable in secure mode and require separate accepted recovery policy.
- Password recovery is prepared behind
  `K2_ADMIN_PASSWORD_RECOVERY_ENABLED=true`; it is not active. Before enabling,
  add the exact callback to the Supabase redirect allowlist and replace the
  recovery email link with:

  ```html
  <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery">Reset staff password</a>
  ```

  The provider `redirectTo` is the exact configured callback. Disable external
  email link tracking, verify the mail provider does not rewrite the URL, and
  test whether mailbox security prefetch consumes the one-use link. If prefetch
  cannot be prevented, do not activate this link flow; use a separately reviewed
  manual-OTP confirmation step. Run real unknown-email, non-staff, unverified,
  expired, replayed, wrong-host, wrong-origin, password-policy, global-sign-out,
  and fresh password-plus-MFA tests. Supabase documents the server-side token-hash
  template pattern at `https://supabase.com/docs/guides/auth/auth-email-templates`
  and global sign-out scopes at
  `https://supabase.com/docs/guides/auth/signout`.
  Token verification uses the separate `password_recovery_verify` action at
  10/IP/15 minutes, 3/token/15 minutes, and 120/global/minute before `verifyOtp`.
  Password completion uses the separate `password_recovery_complete` action at
  10/IP/15 minutes, 5/recovery-session/15 minutes, and 120/global/minute before
  any provider restoration or mutation. Keep the feature flag false if the
  migration, postflight, or a deployed denial check fails; because this is an
  additive prepared boundary, recovery is to leave the routes inactive and use
  the reviewed migration roll-forward process rather than deleting rate evidence.
- The BFF must never become a generic table/RPC proxy. Every route gets a fixed
  schema, permission, AAL, reason/idempotency requirement, safe response, rate
  class, and audit event.

## Admin browser-operation inventory

This is a factual migration inventory, not a second backlog. Work order and
acceptance remain exclusively in `MASTER_ACTION_PLAN.md`.

| Capability | Current browser surface | Direct operation class | Named BFF destination | State |
| --- | --- | --- | --- | --- |
| Command-center analytics | `Overview.jsx`, `Admin.jsx` | orders, Pasabuy, lots, products, channels, listings, inbox reads | `/api/admin/overview` plus shell summary | Prepared behind the disabled flag; Overview and the shared shell use authorized projections and bounded visible-page polling without depending on the browser Supabase client; permanent cutover pending |
| Product Master and Sheet | `InventoryGrid.jsx`, `Sheet.jsx`, `SmartPasteModal.jsx`, `BulkCsvImportModal.jsx`, `ScanToAiModal.jsx` | product reads, draft/update/publication, duplicate checks | product queries and server commands | Product reads, reasoned optimistic master commands, lifecycle/deletion, reviewed CSV preview/commit, media assignment, and phone-first intake are prepared behind the disabled flag; secure Sheet and Smart Paste remain intentional review/handoff paths; permanent cutover pending |
| Product intake evidence | `productIntakeService.js`, `ProductIntakeSessionModal.jsx` | intake session, evidence Storage, SKU/lot/publication RPCs | intake session/evidence/commit commands | Prepared behind disabled flag; real decode/re-encode and signed registration rollback-proven; permanent migrations/cutover pending |
| Owner Count & Close | `OwnerCountClose.jsx` | exact-shop listing/order evidence, product decisions, fee estimates, physical reviews, coverage, Pasabuy readiness, customer-free handoff | `/marketplace-snapshots/*`, `/marketplace-orders/*`, `/owner-close/{session,fees,stock,coverage,pasabuy,bookkeeping}` | Prepared behind disabled flag; Admin/AAL2 signed mutations, forced-RLS evidence, latest-import order/fee reconciliation, exact-lot composition, proposal-only coverage, customer-minimized Pasabuy/handoff, sealed close event, and non-destructive rollback pass locally; real exports/policies/counts, deployment, and staff acceptance remain pending |
| Lots and expiry | `BatchExpiryManagerModal.jsx`, `DailyTaskNotificationDrawer.jsx` | batch reads, reconciliation, clearance approval | lot query/reconcile/approve commands | Prepared behind disabled flag; fixed projection, reservation-safe derivation, expiry/clearance gates, corrected compatibility trigger/views, reasoned UI, behavioral rollback proof, and direct-RPC cutover are complete locally; permanent migration/cutover pending |
| Flight consignments | `ConsignmentManager.jsx` | manifest reads/create, line add, scan, advance, finalize | flight query and explicit scan/state commands | Prepared behind disabled flag; barcode-to-line verification, durable scan retry, reason audit, direct-RPC cutover, and rollback compilation are proven; richer damage/unexpected/wrong/expiry/quarantine dispositions remain MAP-023 work |
| Orders, packing, custody | `OmniOperationsHub.jsx` | order reads/confirm, packing scan, exact custody, payment/delivery/fulfillment state | fulfillment queries and commands | Prepared behind disabled flag; signed migration rollback-proven; permanent cutover pending |
| Pasabuy operations | `PasabuyManager.jsx` | request reads, workflow and quote mutations | Pasabuy query/transition/quote commands | Prepared behind disabled flag; signed migration rollback-proven; current live state matrix preserved; permanent cutover pending |
| Universal inbox | `useAdminInboxRuntime.js`, `Inbox.jsx` | conversation/messages/events/staff reads; internal-note/read/workflow RPCs; Realtime | inbox/history query plus internal-note/read/workflow commands and bounded polling | Prepared behind disabled flag; internal-only truth and combined SQL rollback-proven; provider delivery pending |
| Customers | `Customers.jsx` | customer/profile reads | bounded customer directory query | Prepared behind the disabled flag; Admin-only canonical/legacy modes, no-inferred-merge contracts, and the isolated Admin production build pass locally; direct provider reinspection and permanent cutover pending |
| Coupons | `CouponManager.jsx` | coupon read/create/toggle/archive | coupon query plus create/state/archive commands | Prepared behind disabled flag; Admin-only reason/event boundary and direct-mutation cutover rollback-proven; permanent cutover pending |
| Suppliers and purchases | `Suppliers.jsx`, `PurchaseOrders.jsx` | supplier and purchase-order reads/writes | supplier/purchase queries and commands | Fixed staff read and Admin-only supplier-create command prepared; PO creation/approval/receipt/settlement remain MAP-023 |
| Channels | `ChannelIntegrations.jsx`, `connectorRuntime.js` | connection/readiness reads, verification and event writes | connector status and verification commands | Fixed readiness projection and attributable internal Website/Pasabuy verification are prepared behind the disabled flag; external adapters remain disconnected and permanent cutover is pending |
| Staff and permissions | `AdminStoreContext.jsx`, `StaffPermissionManager.jsx`, `AdminAuthModal.jsx` | profile reads, role/PIN RPCs, invite function, MFA enrollment, paid-AI control review | owner-only staff/invite/role/session commands plus the SuperAdmin-only paid-AI control action | Role/PIN, reason-bound invitation, pending-session TOTP enrollment, active-factor replacement, and versioned fail-closed paid-AI spend controls prepared; SuperAdmin assignment, owner/model/cap decisions, provider activation, lost-factor recovery, and permanent cutover pending |
| Product/review media | `ImageUploadDropzone.jsx`, `InventoryGrid.jsx`, `PhotoManagerModal.jsx`, `ProductMediaCleanupModal.jsx`, `globeCms.jsx`, `GlobeCms.jsx` | public/private Storage plus product/globe/review CRUD | validated media upload/delete and CMS commands | Public upload, receipt-bound assignment/unassignment, retry-safe deletion, Admin-only orphan reconciliation, Globe visibility, and review draft/correction/publication/withdrawal are prepared; permanent migration/cutover and deployed denial evidence pending |
| Diagnostics | `reportError.js`, `SystemDevOpsModal.jsx` | fixed Admin event classification, session and launch checks; no direct browser `error_reports` access | redacted event intake plus boolean-only readiness and restricted review queries | Redacted browser-event intake, signed private recording/aggregation, bounded Admin review, readiness projection, and retention command are prepared locally; the separate direct-insert revoke passes local replay/flood denial but remains unapplied; permanent activation, operator-review rehearsal, alert delivery, and scheduled-retention evidence remain pending |

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
7. Test login and recovery-mail valid/missing/expired/replayed/wrong-action bot
   challenges, budget-before-challenge ordering, challenge-before-provider
   denial, browser reset, MFA, fixation, CSRF, expiration, inactivity, role removal,
   password change, logout, token theft, direct Supabase bypass, safe errors,
   preview-origin denial, and both production artifacts on the real hosts.

The Hobby-plan cutover must deploy only the consolidated Admin router, never the
50 Admin leaf modules as separate functions. Verify the deployed function inventory
before changing the feature flag; if Vercel reports more than the accepted plan
limit, abort and roll back the route/configuration change.

For the fulfillment cutover, generate one 32-byte request secret, store its
base64 form only as `K2_ADMIN_BFF_REQUEST_SECRET` on the Admin Vercel project,
and insert the decoded bytes only into `k2_private.admin_bff_secrets` during the
approved migration window. Apply
`supabase/migrations/20260812_admin_fulfillment_bff_boundary.sql`, verify nonce
replay, changed-payload idempotency conflict, duplicate scan retry, rate denial,
nonstaff, AAL1, CSRF, wrong-origin, and storefront-project denial, then enable
`VITE_ADMIN_BFF_ENABLED=true` only in the coordinated release. Never enable the
flag while any required admin view still depends on browser Supabase Auth/data.

Local pre-cutover concurrency evidence is available through
`npm.cmd run rehearse:map023-last-unit`. The runner uses the ignored portable
PostgreSQL 17.11 runtime, extracts the actual `confirm_order_request` definition
from `20260809_operations_hardening.sql`, and races two submitted orders for one
eligible unit. Acceptance requires one confirmed order, one insufficient-stock
refusal after lock wait, physical/reserved `1/1`, and exactly one reservation,
canonical order, and inventory event. It then retries the already-confirmed
order as though the first response were lost. Acceptance also requires the same
order ID/status and an unchanged full invariant, proving no duplicate reservation,
canonical order, inventory event, or reserved quantity. This covers only the
repository SQL function's ambiguous confirmation-response path; it is not proof
of inbound connector-event idempotency or general timeout reconciliation. This
is a source rehearsal only; repeat
the race through the deployed signed BFF and verify live function identity before
claiming production or multi-channel oversell protection.

For retry-only recovery, remove the ambiguous-confirmation focused contract and
restore the runner before its retry phase; do not delete the established
last-unit concurrency rehearsal. The next local MAP-023 evidence step is the
prepared Shopee capture boundary: same-event/same-payload replay must return one
durable result, changed-payload reuse must fail closed, and an ambiguous outcome
must be recoverable before any provider credential or channel activation is
considered.

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

Apply `supabase/migrations/20260830_paid_ai_spend_controls.sql` only after the
owner has assigned the exact SuperAdmin identity, approved the provider/model,
retention and budget values, and the signed boundary/rollback tests are in the
same coordinated release. The migration starts disabled and stores no provider
secret. The Staff & Roles control requires AAL2, a reason, optimistic version,
idempotency, and typed enable confirmation; Admin/Staff requests are denied.
Its signer replacement preserves the existing action allow-list, catalog body
ceiling, actor/global rate buckets, MFA replacement, website reply, and Product
Knowledge actions while adding only the spend-control action. Run one
disabled/read-only check before any provider activation and retain the manual
two-Project workflow as the recovery path.

Apply `supabase/migrations/20260822_admin_globe_review_boundary.sql` only after
the Admin session registry/request-secret migration, the fixed
`/api/admin/globe-cms` route, and the Admin interface are included in the same
coordinated release. This migration revokes direct authenticated Globe/review
mutation and limits anonymous review reads to published public columns, so
partial activation is not safe. Denial tests must cover non-Admin, AAL1, wrong
origin/project, CSRF, replay, changed-payload idempotency, stale version,
invalid/future date, unknown product/review, missing evidence, private-column
access, and unregistered hero media. Positive tests must prove draft-only
creation, evidence-gated publication, published-copy correction back to draft,
republish, withdrawal without deletion, Globe visibility update, one immutable
event per accepted command, and exact retry without a duplicate event. Verify
the storefront shows only the intended published copy before enabling the
browser switch; a seeded string or local UI render is not publication proof.

Run `npm run verify:admin-bff` for the local foundation contract. A passing
source contract is not deployment or end-to-end session evidence.
