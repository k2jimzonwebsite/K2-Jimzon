# Admin BOS Same-Origin BFF Security Runbook

Dashboard widget preparation (IDEA-20260906-07) reuses the existing overview route
and authorization. List reads request exact counts; known capped results return
`RESULT_INCOMPLETE` in the existing unavailable-source list. The client withholds
dependent totals/export rather than inventing zeros. No additional write route,
secret, provider connection or role is introduced. Staff interpretation and visual
rollback: `docs/runbooks/ADMIN_DASHBOARD_RUNBOOK.md`. Locally verified only.
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

## Coupon recovery — I-002, locally verified 8 September

Create/activate/pause/archive dialogs freeze unresolved commands and retry the
same payload/key through the protected coupon endpoints. Definite rejection
allows correction. Legacy uncertainty allows closing for register reconciliation
and disables receipt retry. Actor/role remounts dispose the old dialog runtime.
Capture the opener before disabling it; AdminDialog's optional returnFocusRef
restores that control. All 20 recovery browser cases, 94 focused contracts and
the Admin build pass. `npm test` now includes the isolated recovery suite.
Commands, fixture limitations and rollback:
`docs/evidence/20260908-coupon-retry/README.md`. No coupon migration, flag or
provider state was activated. Next I-002 action: wholesale review retained
identity/canonical timestamp, followed by media/intake caller acceptance.

## Supplier recovery — I-002, locally verified 8 September

Supplier creation forwards its retained key, freezes unresolved payloads and
uses shared AdminDialog. Actor/role changes remount the workspace; protected
uncertainty retrieves the same receipt, while legacy uncertainty requires
directory reconciliation. The regression first caught editable pending inputs;
the full 13-case dialog browser suite and final Admin build pass (187.09/300 kB
application chunk, 40 manifest modules). Checkpoint/recovery scope:
Final focused payment-recovery, admin-command-retry, admin-bff-contract,
admin-dialog-contract and product-intake-contract selection passes 88/88.
`docs/design-checkpoints/20260908-supplier-retry/`, Suppliers.jsx, the Admin
actor key and shared hook's procurement-unavailable classification. Do not infer
signed provider receipt acceptance from component fixtures; I-002 keeps that
gate and the coupon/wholesale/media/intake caller work open.

## 8 September fulfillment retry transport — MAP-028 I-002

Confirmation, delivery, handover, exact-lot transfer and box assignment wrappers
accept an optional retained key as their last argument. Callers must preserve
the same frozen payload/key after an uncertain write; a changed payload requires
a different operation. Five response-loss regressions failed first, then the
payment-recovery/admin-command-retry/admin-bff-contract selection passed 69/69;
`npm run build:admin` passed. Subsequent UI adoption uses
`useRetainedFulfillmentCommand` and the actor/order-scoped dialogs in
`OmniOperationsHub.jsx`. `npm run test:payment-ui` passes 10/10; final focused
payment-recovery/admin-command-retry/admin-bff-contract/admin-dialog-contract
checks pass 75/75 and the post-UI Admin build passes. Unknown results freeze
details and preserve receipt identity; legacy delivery/handover instead requires
manual reconciliation. Same-page full-workspace/server receipt and exact-host
checks remain in I-002. Recovery is the scoped wrapper/dialog/hook/test diff
and `docs/design-checkpoints/20260908-fulfillment-retry/`; do not revert the
unrelated security boundary or existing payment/packing recovery work.

## Local chunk-load recovery — MAP-028 I-010, 6 September 2026

`src/main.jsx` no longer intercepts/suppresses Vite preload errors or reloads
automatically. A missing lazy module can reject into the existing React error
boundary without discarding pending command identity. The explicit boundary
reload remains available. Do not automatically retry a mutation after any reload;
reconcile its receipt first. Shared boundary wording and rendered failure/retry
acceptance remain open in I-010.

`npx playwright test --config=playwright.api.config.js tests/chunk-recovery.spec.js
tests/browser-error-safety.spec.js tests/request-timeout.spec.js` passes 19/19.
The two new tests first reproduced suppression/reload and blocked-storage failure
using the actual bootstrap before its React mount. They do not claim rendered
browser acceptance. `scripts/audit-readiness-logic.mjs` remains runnable after
listener removal; historical evidence JSON is unchanged. No provider apply or
deployment. Rollback scope is the exact bootstrap/test/script diff, preserving
all unrelated dirty work; do not reintroduce unattended reloads as a remedy.
Both production builds passed after the bootstrap correction, including source
security checks, separate-artifact verification, bundle budgets and secret scan.
Storefront landing JS measured 149.53/150.00 kB gzip. The subsequent FAQ-only
copy correction was checked by importing its data module; those build results
precede that wording edit and are not rendered FAQ acceptance.

## Prepared exact-lot packing — 6 September 2026 (MAP-023 / H-016)

`20260906_exact_packing_lot.sql` adds exact allocation + physical confirmation
to per-unit packing and revokes browser access to both scan RPCs.
`20260906_exact_packing_wrapper.sql` routes the signed receipt boundary to it,
preserving payment version checks. Apply in that order only during coordinated
BFF/browser cutover after recovery and composed inventory gates pass.

Local evidence: `node scripts/rehearse-purchase-time-reservation.mjs` passes
16 properties (the `--baseline-packing` variant reproduces wrong-lot credit).
`node scripts/rehearse-payment-recovery.mjs` passes real signed packing replay,
changed-payload refusal, restricted ACLs, double migration application and
payment guard composition alongside payment review races. Both own disposable
localhost databases only. The packing extension uses
`supabase/tests/packing_signed_{bootstrap,behavior}.sql`.
Focused `packing-lot-proof`, `payment-recovery` and `admin-bff-contract` API
specs pass 59/59, including service-level response-loss retry identity.
`npm run test:payment-ui` passes 6/6 browser cases, including phone lot identity
and confirmation reset. The aggregate lot-overcommitment regression failed
first and passes after the exact scan guard correction; signed composition
was rerun successfully afterward.
The Admin build/security/artifact/budget gates pass locally.
The 6 September aggregate contract phase passes 552/552 after the packing and
handover preparation. Its chained Storefront browser launch failed in the
restricted sandbox and is tracked separately from those contract results.
The permitted isolated rerun `npm run test:selling-surfaces` passes 5/5 (2.4
minutes); this resolves browser execution for this run, not real-host acceptance.

Remaining: physical reassignment, common inventory lock ordering, full
confirmation/payment/handover lifecycle and actual host/staff acceptance.
For recovery, pause packing writes, inspect receipt and packing events, and
reconcile the physical unit before resuming. Do not restore SKU-only lot
selection or mint a new key for an unresolved scan. No production application
or deployment is claimed by these fixture results.

## Prepared payment recovery — 6 September 2026 (MAP-023 / H-015)

Manual GCash/QR is the owner's intended launch model, not an activated receiving
method. The protected payment command now carries `expectedPaymentStatus` and
the unchanged database `expectedUpdatedAt` string. The SQL wrapper locks that
order, rejects stale reviews and retains its signed, actor-bound receipt. The
underlying payment RPC is revoked from browser roles at cutover. Rejected
attempts append corrected evidence rather than erasing events; a different
staff actor must verify against the receiving ledger. Open-order, complete
unexpired reservation, combined lot-counter and shelf-life checks precede
evidence submission and verification. Refund reconciliation is not treated as
reopening a cancelled order.

Files: `20260906_payment_evidence_recovery.sql`, fulfillment BFF/projection,
`adminBffService.js`, `OmniOperationsHub.jsx`, and the payment SQL/API/browser
fixtures. The rehearsal exposed an existing unparenthesized CASE expression
that PostgreSQL rejected in `20260812_admin_fulfillment_bff_boundary.sql`; its
expression is now parenthesized. No provider migration has been applied.

Fresh local evidence: `node scripts/rehearse-payment-recovery.mjs --baseline`
reproduced `Invalid payment-status transition`; the corrected
`npm run rehearse:payment-recovery` passes double application, history,
independent review, cancelled/expired/missing/quarantined/short-life stock,
split-reservation overcommit, real HMAC/receipt replay, changed-payload denial,
stale version and two concurrent reviewers (one commit, one conflict).
The fixture uses only loopback port 55441 and the fixed disposable
`k2_payment_recovery_rehearsal` database; it stops a server it starts.
Windows requires elevated local PostgreSQL/browser execution in this environment.
`npm run test:payment-ui` passes 5/5 at 375×812, 844×390 and 1280×900, including
busy close/Escape, focus return, legacy refusal and preserved uncertain evidence.
All 550 API/contracts pass; Admin build, security, artifact and size gates pass.
The elevated Storefront selling-surface browser rerun passes 5/5; the initial
sandbox browser-start failures were execution failures, not product evidence.

Activation order: complete OWNER-005/MAP-017, apply prerequisite operational,
reservation and signed-BFF migrations, preflight the exact installed wrapper,
then this additive correction; test authenticated denial/allow/replay before
enabling the matching Admin browser release. The wrapper patch refuses an
unexpected source shape. Never enable the new browser payload against an old
wrapper. No QR/account details, real payment, delivery, or provider acceptance
is established by these local fixtures.

Recovery: before apply retain exact prior function definitions/ACLs with the
approved backup. If activation fails, disable the affected browser/server
payment path, preserve receipts and evidence, and reconcile uncertain commands
before retry. Do not restore the old unrestricted payment grant or delete
events. Before apply, removing this prepared migration and reverting only this
payment slice is sufficient; retain unrelated dirty work. Next required work is
H-019/H-020/H-023 composed lifecycle/locking acceptance and real receiving-ledger,
staff and exact-host acceptance in MAP-023/MAP-025.

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

**IDEA-20260907-01 payment boundary:** the prepared fulfillment payment command
only records the existing order-request state transition and bounded
evidence/reconciliation note. It is not a structured payment-evidence store or
instruction-delivery receipt. Owner decisions and the exact activation order
are recorded in `docs/runbooks/PAYMENT_EVIDENCE_AND_INSTRUCTIONS_RUNBOOK.md`;
no payment detail or secret was added by this session. A repository secret scan
is not proof that every ignored/local file contains no credentials. Payment
events already record actor/time; dedicated evidence fields and finance-verifier
separation remain unimplemented.

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
# Local cookie containment evidence — 5 September 2026

## Inbox message retry continuity — 5 September 2026

### Draft isolation and stable workflow controls — local browser evidence

MAP-019 / MAP-028 H-001 and H-009 were reproduced in the isolated Inbox fixture:
Maria's private draft appeared in Elena's reply composer; a delayed save erased
newer text in the same or another thread; typing a workflow reason entered only
its first character. Those four browser assertions failed before correction.

`Inbox.jsx` now keeps drafts per conversation inside an actor-keyed workspace.
Draft entries have identity, so successful completion removes only the exact
submitted entry. A new edit, including retyping the same words, is preserved.
Thread-visit identity and history request sequence reject stale results across
customer changes, return visits and workspace disposal. Copy, read, workflow,
note and reply notices are likewise guarded. `WorkflowControls` is now a stable
module-level component with explicit props and unchanged controls/styles.

Verification: `npx playwright test --config=playwright.inbox.config.js --reporter=dot`
passes **15/15**, including staff-switch with pending save, delayed website
reply, out-of-order history for another customer and a return visit, phone
draft navigation, keyboard focus and existing workflow/note/reply journeys.
The API/security/release-CI suite passes **82/82** using the earlier focused
command plus `tests/release-ci-contract.spec.js`. A fresh `npm run build:admin`
passes all prebuild, artifact, budget (**186.91/300 kB**) and secret gates.
No live messages, provider changes, database writes or deployment were performed
by these fixtures. Staff identities and history are fabricated; this is not
real authentication or real-host delivery evidence.

Harness recovery: sandbox Chromium launch returned EPERM. The exact elevated
retry was accepted in this continuation, superseding the earlier account-limit
block. Its shared-server attempt reached an unrelated project on port 5173 and
timed out before assertions. `playwright.inbox.config.js` now starts K2 on strict
loopback port 5193, refuses server reuse and shuts down its owned server when
finished. Use `npm run test:inbox-ui`; `npm test` includes it, and the base suite
excludes this spec to avoid accidentally using an unrelated server again.

Rollback: reverse this continuation's `Inbox.jsx` diff and isolated harness/test
wiring only; preserve all pre-existing edits. Reconcile drafts before leaving or
reverting the workspace, because draft retention is deliberately memory-only.
That rollback restores the reproduced defects and is not a release remedy.
Remaining work belongs to MAP-019 / MAP-028 H-002/H-008/H-012 and MAP-025:
reload/uncertain-command reconciliation, polling ownership and stale states,
history failure/mobile parity, real staff roles, signed commands and exact-host
acceptance. No MAP item is closed solely by these fixture results.

### Workflow and mark-read continuation — local evidence, 5 September

The remaining two secure Inbox callers now pass the mounted actor's command
session to `markConversationReadBff` and `updateConversationWorkflowBff`.
Missing runtime sessions deny the action; disposed sessions cannot submit or
report late success. Existing direct-service compatibility remains stateless,
so callers must explicitly supply the owning session for retry continuity.

Two new regression tests first failed on different retry keys after a simulated
lost response. The same tests now pass, including success-key retirement and
disposed-session denial. A third verifies concurrent workflow deduplication,
different-payload separation, original-payload replay and late-success denial.
These are local HTTP fixtures, not live database commit or authentication proof.

Verification: the focused command below passes **78/78**. `npm run build:admin`
passes security/import checks, Admin-only artifact/404 checks, the **186.91/300
kB** application budget and output secret scan. Tooling emitted existing
NO_COLOR/FORCE_COLOR and Git ignore-access warnings; no gate failed.

`npx playwright test --config=playwright.api.config.js tests/inbox-command-retry.spec.js tests/admin-client-cookie.spec.js tests/admin-cookie-recovery.spec.js tests/admin-bff-contract.spec.js tests/request-timeout.spec.js --reporter=dot`

Recovery: reverse only this continuation's optional-session wrapper arguments
and the corresponding hook wiring, preserving earlier cookie/message changes.
That removes retry protection: reconcile canonical state before any subsequent
operation. Nothing was deployed or changed in a provider. MAP-019 / MAP-028
H-002 retains reload reconciliation, other command families and authenticated
actor-switch acceptance. Mark-read's optimistic local projection also needs
fresh-state reconciliation when a new inbound message races an older receipt.

MAP-019 / MAP-028 H-002: internal-note and website-reply commands use a
staff-actor-owned in-memory command session. Identical unresolved payloads reuse
an idempotency key and concurrent duplicates share the pending request. Only
success retires its key; different content is a different command. At 100
unresolved operations, new commands stop for reconciliation instead of evicting
unknown outcomes. Disposal clears retained content/keys and rejects future calls
and late success delivery to the old runtime. It does not undo server commits.
Reloads discard the memory: review the canonical conversation before resending.
Workflow/read-mark commands and broader session/polling races remain in MAP.

Verification: `npx playwright test --config=playwright.api.config.js tests/inbox-command-retry.spec.js tests/admin-client-cookie.spec.js tests/admin-cookie-recovery.spec.js tests/admin-bff-contract.spec.js tests/request-timeout.spec.js --reporter=dot`
passed 75/75; `npm run build:admin` passed its prebuild/security, artifact
boundary, bundle budget (186.91/300 kB) and output secret checks. Local only.
Rollback spans the command-session implementation, message callers and actor
prop in AdminStoreContext; retain regression tests. Reverting restores the
unsafe retry behavior, so reconcile pending messages before any resend.

Client follow-through: `adminBffService.js` now safely decodes normal/recovery
CSRF cookies, including semicolon-separated entries without a following space.
Malformed encodings yield empty tokens so the server can deny normally instead
of the client throwing an unhandled URIError. Three new direct-service cases
failed before the fix and pass afterward. Combined command adds
`tests/admin-client-cookie.spec.js` to the cookie/BFF/timeout suites below:
72/72 pass locally. Tests use fabricated cookies and in-memory HTTP responses;
no real credentials or recovery/password requests were sent. Restore the prior
token-reader hunk only for rollback and retain the tests. Exact-host denial
acceptance remains MAP-025.

## Full-response timeout evidence — 5 September 2026

MAP-028 H-004: `src/lib/fetchWithTimeout.js` buffers finite API response bodies
under the same AbortController/deadline as the headers. Commands are not retried;
an ambiguous timeout still requires record/receipt reconciliation. Current
callers are API clients, not streaming download consumers. HTTP status, headers
and payload are retained; callers receive a reconstructed buffered Response,
so future streaming or response-URL-dependent clients need a separate contract.
The stalled-body regression failed before the correction. Command:
`npx playwright test --config=playwright.api.config.js tests/request-timeout.spec.js tests/admin-bff-contract.spec.js tests/admin-cookie-recovery.spec.js --reporter=dot`
passes 69/69 locally, including upstream cancellation and bodyless responses.
No browser or live-host acceptance is implied. Recovery: revert the body-buffer
hunk only and rerun the focused tests; preserve the regression and MAP's pending
real-host acceptance. Never automatically resend a timed-out write.

MAP-028 H-003 / MAP-020–021: malformed percent-encoded cookie values are treated
as empty values by the shared Admin parser. Active, pending and recovery session
reads remain unauthenticated for invalid input; CSRF denial does not throw.
Four regression cases failed with URIError before the correction. Afterward,
`npx playwright test --config=playwright.api.config.js tests/admin-cookie-recovery.spec.js tests/admin-bff-contract.spec.js --reporter=dot`
passed 57/57. This is local evidence only, not deployment or provider activation.
Recovery: revert the parser hunk if necessary and rerun this suite; retain the
regressions and never log raw session cookies while diagnosing failures.

## Inbox polling ownership and canonical unread — 5 September 2026

MAP-019 / MAP-028 H-008 and the remaining H-002 read-state gap. Ownership rules
now live in `src/context/adminInboxPolling.js` as pure functions so the exact
staleness, generation and unread decisions are verifiable without a browser:

- `shouldStartPoll` — the eight-second refresh is skipped while the document is
  hidden or a read is already in flight. Returning to a visible tab refreshes
  immediately, so a paused queue is never both stale and silent.
- `isCurrentGeneration` — every read carries the generation it started in.
  A response from a superseded session, filter or unmounted Inbox is discarded
  instead of repopulating state. Secure reads also abort through an
  `AbortController` on disable and unmount.
- `resolveRefreshFailure` — a failed *background* poll keeps the loaded queue and
  marks it stale; only a first load with nothing to preserve clears the queue and
  reports the underlying error. Staff see one status banner reading
  "Live updates paused. This queue is the last loaded copy — refresh before
  acting on it." A true permission revocation still empties the queue on the
  next initial load, and the banner never claims the data is current.
- `applyReadReceipt` — mark-read stamps the instant the command was issued. A
  conversation whose `lastInboundAt` is newer than that receipt stays unread, so
  a replayed or delayed success cannot visually clear a message that arrived
  after it. Every read now schedules a canonical background refresh instead of
  trusting the optimistic projection alone.

Initial and background loading are separated: `inboxState` carries `loading`,
`refreshing` and `stale`, and the full-screen loading state is still limited to a
genuinely empty first load.

Verification, local only:
`npm run test:inbox-ui` passes **21/21** (six new checks failed first as intended)
and `npx playwright test --config=playwright.api.config.js tests/admin-bff-contract.spec.js tests/inbox-command-retry.spec.js tests/admin-client-cookie.spec.js tests/admin-cookie-recovery.spec.js tests/request-timeout.spec.js --reporter=dot`
passes **78/78**. `npm run build:admin` passes its prebuild/security gates, the
Admin-only artifact/404 boundary, the **186.91/300 kB** budget and the output
secret scan. The obsolete `admin-bff-contract` assertion that pinned the exact
unguarded interval line was replaced by assertions on the guarded poll.

Recovery: revert `src/context/adminInboxPolling.js`, the polling/read hunks of
`useAdminInboxRuntime.js`, the stale banner branch in `Inbox.jsx` and the harness
`staleQueue` option; retain the regression tests. Reverting restores the
queue-clearing poll, so reconcile any conversation acted on from a stale view.

Not covered here and still open in MAP-019 / MAP-028: real offline/reconnect and
provider revocation acceptance, authenticated actor-switch acceptance, H-002
reload reconciliation of ambiguous commands across a page load, and H-012 phone
history parity. No provider change or deployment occurred.

## Inbox event history parity and failure states — 5 September 2026

MAP-019 / MAP-028 H-012, the history half. The audit timeline was previously
rendered only inside the `hidden ... xl:flex` aside and mapped every read failure
to `[]`, so below 1280px staff could not inspect it at all and a denied or failed
read was indistinguishable from a conversation with no events.

- `useAdminInboxRuntime.loadConversationHistory` now returns
  `{ ok, events }` instead of an array, so a failed secure read is reported as a
  failure. The direct-database path reports its own query error the same way.
- `Inbox.jsx` tracks `historyStatus` (`idle` / `loading` / `ready` / `error`) and
  renders one shared `EventHistoryBody` in four distinct states: loading, an
  amber "Event history could not be loaded." with a 44px **Retry event history**
  control, the existing empty line, and the timeline itself. Retry reuses
  `loadHistory`, so it keeps H-001's conversation-visit and request-generation
  guards — a late reply from an abandoned visit still cannot land.
- The same body is rendered in a second `xl:hidden` `<details>` disclosure beside
  the existing "Workflow controls" one, giving phones and tablets the same
  timeline. Both instances share one state; only one is visible per width.

Because the timeline now exists twice in the DOM, the two pre-existing
delayed-history contracts were scoped to the desktop aside
(`getByRole('complementary', { name: 'Conversation workflow' })`). That narrows
the locator, not the assertion.

Verification, local only: `npm run test:inbox-ui` passes **24/24** (three new
checks, written first); the focused boundary suite passes **78/78**; and
`npm run build:admin` passes its security, artifact/404, **186.91/300 kB** budget
and secret-scan gates.

Recovery: revert the `EventHistoryBody` component, the `historyStatus` hunks in
`Inbox.jsx`, the mobile disclosure, and the `loadConversationHistory` return
shape together — the view tolerates a bare array for compatibility, so a partial
revert of the runtime alone is safe but leaves failures shown as empty again.

Still open in H-012: real-device acceptance at 375×812 and 844×390 with the
software keyboard, 200% text zoom, screen-reader review of the disclosure, and a
long-thread pass. Nothing here is live-host or authenticated evidence.

## Ambiguous Inbox command reconciliation — 5 September 2026

MAP-019 / MAP-028 H-002, the reload/uncertainty half. Operation identities are
deliberately memory-only — nothing about a staff command is written to browser
storage — so a reload permanently discards the retry identity of any command
whose outcome this runtime never learned. Two honest behaviors now cover that,
rather than persisting keys where they must not go:

- **Uncertain outcomes are named as such.** `adminBffService` exports
  `UNCERTAIN_COMMAND_CODES` (`REQUEST_TIMEOUT`, `ADMIN_SERVICE_UNAVAILABLE`),
  `commandOutcomeIsUncertain()` and `UNCERTAIN_COMMAND_NOTICE`. A write whose
  response was lost may already have committed, so the runtime returns
  `{ ok: false, uncertain: true }` and triggers a canonical background refresh
  instead of claiming "could not be saved". The Inbox renders that as an amber
  alert — "The Inbox did not confirm this command, so it may already be saved.
  Check the refreshed conversation before sending it again." — separate from the
  crimson failure line, and the unsent draft is preserved for reconciliation.
  Rejections (validation, session, permission) keep their exact prior messages.
- **Leaving with unresolved work is guarded.** The command session exposes
  `unresolvedCount()`, and the runtime registers a `beforeunload` handler that
  warns only while that count is non-zero. The listener is removed with the
  session, so a signed-out or unmounted Inbox never blocks navigation.

Verification, local only: `npm run test:inbox-ui` passes **27/27** and the
focused boundary suite passes **80/80** (three new checks written first; two
failed on the missing helper and count before implementation). `npm run build:admin` passes its
security, artifact/404, **186.91/300 kB** budget and secret-scan gates.

Recovery: revert `commandOutcomeIsUncertain`/`UNCERTAIN_COMMAND_NOTICE`/
`unresolvedCount` in `adminBffService.js`, the `commandFailure` helper and
`beforeunload` effect in `useAdminInboxRuntime.js`, and the `uncertainNotice`
state in `Inbox.jsx`. Reverting restores the misleading "could not be saved"
message for lost responses, so reconcile any conversation acted on during an
outage before trusting it.

Still open in H-002: this covers the Inbox command families only. Other mutation
owners (`ReservationHolds.jsx` and the remaining command groups) keep their
per-invocation keys, and authenticated actor-switch plus real-host command
acceptance remain unproven.

## Retained operation identity beyond the Inbox — 5 September 2026

MAP-019 / MAP-028 H-002 for mutation owners outside the Inbox. The retained-key
session is now a shared primitive rather than Inbox-only code:

- `createRetainedOperationSession(send, messages)` in `adminBffService.js` holds
  the behavior — payload-fingerprinted identity, one shared in-flight request for
  concurrent identical calls, key retirement only on success, a 100-operation
  reconciliation ceiling, `unresolvedCount()`, and disposal that refuses new work
  and late success delivery. `createInboxCommandSession()` is now a thin wrapper
  over it with the Inbox's wording, so Inbox behavior is unchanged.
- `ReservationHolds.jsx` uses that session for both stock-hold commands instead
  of `operationKey()` per invocation. Releasing expired holds and extending a
  hold are real inventory effects, so a retry after a lost response now reaches
  the server as the same logical operation. Unconfirmed outcomes surface as an
  amber `UNCERTAIN_COMMAND_NOTICE` banner and reload the record, rather than a
  crimson failure that invites a second attempt.

Verification, local only: four new checks in `tests/admin-command-retry.spec.js`
(registered in `test:contracts`) failed first and now pass; the combined run of
`admin-command-retry`, `inbox-command-retry`, `admin-bff-contract`,
`purchase-time-reservation`, `reservation-policy-contract`,
`admin-logic-regressions` and `release-ci-contract` passes **112/112**, and
`npm run build:admin` passes its security, artifact/404, **186.91/300 kB** budget
and secret-scan gates.

Recovery: revert `ReservationHolds.jsx` to the per-invocation `operationKey()`
and, if required, restore the inline Inbox session body; keep the regression
spec. Reverting reintroduces double-application risk on a retried hold command.

Both remaining owners were addressed immediately afterwards, below. Real
authenticated and real-host command acceptance remains unproven everywhere.

## Delivery rate command identity — 5 September 2026

MAP-019 / MAP-028 H-002, closing the last per-invocation caller.
`DeliveryRateControl.jsx` published rates and set courier/source states with a
fresh `operationKey()` on every attempt. What a customer is charged is money, so
a retry after a lost response now runs through `createRetainedOperationSession`
and reaches the server as the same logical operation. Unconfirmed outcomes show
the amber `UNCERTAIN_COMMAND_NOTICE` banner and reload the control tables instead
of a crimson failure that invites a second publication. The read-only quote test
is untouched — it is not a mutation.

`ConsignmentManager.jsx` needed no change: it already retains a key per command
slot until the payload fingerprint changes or the operation completes. A contract
now pins that so a later refactor cannot silently reduce it to one key per
attempt. An earlier note in this runbook listing it as per-invocation was wrong.

Verification, local only: two new source contracts in
`tests/admin-command-retry.spec.js` (one failed first), and the combined focused
run of `admin-command-retry`, `delivery-rate-control`, `inbox-command-retry`,
`admin-bff-contract`, `admin-logic-regressions`, `purchase-time-reservation`,
`reservation-policy-contract` and `release-ci-contract` passes **124/124**.
`npm run build:admin` passes its security, artifact/404, **186.91/300 kB** budget
and secret-scan gates.

Recovery: restore the `operationKey()` helper and the three inline command calls
in `DeliveryRateControl.jsx`; keep the contracts. Reverting reintroduces
double-publication risk on a retried rate change.

## One Manila reporting window — 5 September 2026

MAP-028 H-006. The dashboard used browser-local midnight and the overview API
used UTC midnight, so staff in Italy and staff in Manila could see different
buckets for the same data, and the UTC start silently omitted the first eight
hours of the intended prior Manila day.

`src/lib/manilaReportingWindow.js` is now the single definition. It exposes
`manilaReportingWindow(days)` (inclusive `currentStart`, exclusive `currentEnd`
at the next Manila midnight, plus an equal-length non-overlapping prior period),
`manilaDateKey()` and `manilaDayKeys()` for the revenue chart, and
`isSupportedReportingRange()`. Asia/Manila has observed no daylight saving since
1978, so the fixed +08:00 offset is exact and stays exact when the viewer's own
zone changes for summer time. `prepared-api/admin/overview.js` and
`src/views/admin/Overview.jsx` both consume it; neither computes its own
midnight any more.

Rapid range switching is also guarded: `Overview.jsx` stamps each load with a
`rangeRequest` generation and only the newest request may write state, so a
slower 90-day response cannot replace the 7-day view staff just selected.

Current totals select payment-verified orders **by order creation date in
Manila**. They are not cash collected on the verification date; the tile detail
now says so.

## Unknown is not zero — 5 September 2026

MAP-028 H-005, and operations rulebook section 21. `src/lib/overviewAvailability.js`
holds the rules: `overviewDomainsUnavailable()` turns the API's per-domain
`unavailable` list into a set, `showMetric()` reports a figure or the honest
`Unavailable` (a metric spanning several domains is unknown if any of them is),
`countProductStock()` keeps unknown stock separate from zero stock, and
`salesExportBlockReason()` refuses an export whose source is unreadable or stale.

In `Overview.jsx`: a tile whose domain failed shows `Unavailable` and drops its
percentage change, because a comparison against unknown data is a fiction; a
queue built on an unreadable domain is withheld rather than rendered as empty; a
total failure preserves the last successful data and marks it stale instead of
replacing the page with confident zeros; and the sales CSV is disabled with a
stated reason. Null or non-numeric `stock_available` is now counted as unknown
and surfaced in the inventory queue detail, never as out of stock.

In `ReservationHolds.jsx`: a failed read reports `Unavailable` holds and
"Hold status unavailable" rather than deriving "None overdue" from nothing. The
reassuring wording remains correct on a successful read.

Verification for both, local only: `tests/manila-reporting-window.spec.js` (6)
and `tests/overview-availability.spec.js` (6) are new and registered in
`test:contracts`; the combined focused run passes **115/115**, `npm run
test:admin-ui` passes **26/26**, and `npm run build:admin` passes its security,
artifact/404, **186.96/300 kB** budget and secret-scan gates.

Recovery: the two library modules are additive — revert their call sites in
`Overview.jsx`, `ReservationHolds.jsx` and `prepared-api/admin/overview.js` to
restore the previous behavior, and keep the specs. Reverting reintroduces
timezone-dependent buckets and failure-as-zero reporting.

Still open: real staff acceptance across a Manila midnight boundary, an actual
provider outage exercising each domain independently, and H-005's remaining
freshness-per-domain display (a single stale flag currently covers the page).

## Bounded Inbox read, honestly labelled — 5 September 2026

MAP-028 H-007, the completeness half. The secure Inbox read selected the newest
200 conversations and the newest 2,000 messages across that whole set, with no
marker saying so. Two consequences: a busy thread could consume the entire
message allowance and leave other threads empty, and a page could look like the
complete record.

`server/admin-bff/inbox.js` now exports `INBOX_READ_LIMITS`
(`conversations: 200`, `messages: 2000`, `messagesPerConversation: 30`). The
bounds are unchanged in size — an Admin session still may not pull an unbounded
slice of the message table, and nothing eagerly downloads a full thread. What
changed is fairness and honesty:

- Messages arrive newest first and each conversation keeps at most
  `messagesPerConversation`, so one very busy thread can no longer starve the
  others in the returned projection.
- The response carries `completeness.conversations` (`returned`, `limit`,
  `truncated`) and `completeness.messages` (`returned`, `limit`,
  `perConversation`, `truncated`), plus a per-conversation `messagesTruncated`.
- `adminInboxNormalization.js` and `useAdminInboxRuntime.js` carry both through,
  and `Inbox.jsx` shows them: a queue banner naming how many conversations are on
  screen and that older ones exist, and a line above a sampled thread saying the
  newest N messages are shown and older ones are not loaded.

Verification, local only: seven new checks in
`tests/inbox-read-completeness.spec.js` (registered in `test:contracts`) drive
`readAdminInbox` against a fake client and assert the limits are still applied,
not widened. The combined focused run passes **103/103**, `npm run test:inbox-ui`
passes **27/27**, and `npm run build:admin` passes its security, artifact/404,
**186.96/300 kB** budget and secret-scan gates.

Recovery: revert the limits constant, the per-conversation grouping ceiling and
the completeness projection together with their client labels. Reverting restores
silent truncation, so re-check any operational conclusion drawn from a full page.

Still open in H-007: server-filtered and cursor-paginated queues so an old urgent
thread can be *reached* rather than only declared missing, independently paged
messages for a selected thread, and authoritative aggregates (or explicit sample
labels) for the dashboard's seven record sets and its CSV. This entry delivers
the fairness ceiling and the truncation labels only.

## Evidence is classified before it is deleted — 5 September 2026

MAP-028 H-013. The intake evidence route uploaded with `upsert: true`, then sent
*every* registration error into Storage removal before classifying it. Two
source-derived losses follow. A transport failure does not prove the transaction
rolled back, so the object of a committed registration could be deleted. And
because the object path excludes the file name — which does participate in the
registration payload hash — a replay with the same key, image, session and slot
but a changed file name lands on the same path, is rejected as a conflict, and
the cleanup then deletes the object the *original successful* registration
references.

`server/admin-bff/evidence-cleanup-policy.js` now decides this:

- `classifyEvidenceRegistrationFailure()` separates a deterministic refusal
  (`K2_ADMIN_RATE_LIMITED`) from a proven earlier success
  (`K2_ADMIN_IDEMPOTENCY_CONFLICT`) from an unknown outcome (everything else).
- `evidenceCleanupDecision()` removes an object only when the command was
  refused **and** this request created it. A conflict never deletes, because the
  stored object may be the referenced one. An unknown outcome keeps the bytes and
  records a recoverable pending state for reconciliation.
- The route uploads with `upsert: false`; a refused overwrite tells it the object
  already existed, so it is not this request's to delete. The path is
  content-addressed, so an existing object at it holds the same bytes.

A new `INTAKE_EVIDENCE_REGISTRATION_UNRESOLVED` security-event reason records the
retained-object case. The existing `EVIDENCE_CLEANUP_PENDING` /
`EVIDENCE_CLEANUP_UNTRACKED` responses and the phone retry surface are unchanged.

## The final-Admin invariant is serialized — 5 September 2026

MAP-028 H-014. `20260822_admin_staff_access_boundary.sql` locks the target
profile with `for update`, counts Admin rows, then demotes. Two concurrent
demotions of two *different* Admins take two different row locks, so under READ
COMMITTED both observe two Admins and both commit. The invariant belongs to the
Admin set, and no row lock can express it.

Prepared migration `20260905_privileged_membership_serialization.sql` adds
`k2_private.lock_privileged_membership()` — a transaction-scoped advisory lock on
a fixed, documented key, revoked from every client role — and rebuilds both paths
that change privileged membership to take it before counting:
`public.set_user_role` and `public.execute_admin_staff_access_command_v1`. The
staff command's body is otherwise the 20260822 definition: same receipts, rate
limit, audit events, error codes and signature verification. No new writable role
source was introduced, and the lock releases at commit or rollback so a crashed
session cannot wedge role changes.

**Behavioural evidence, not a source claim.** `npm run rehearse:final-admin`
(`scripts/rehearse-final-admin-concurrency.mjs`) runs against the portable
PostgreSQL runtime, isolated from production:

1. It first **reproduces** the defect against the current per-row guard — both
   demotions commit and `0` Admins remain. The runner fails if it cannot
   reproduce it, so the rehearsal cannot pass vacuously.
2. It then installs the repository's own lock function from the migration and
   races the same two demotions: exactly one commits, the other is refused with
   `K2_ADMIN_FINAL_ADMIN`, one recoverable authorized Admin remains, and no
   partial role state is committed.

Verification for both, local only: `tests/evidence-cleanup-policy.spec.js` (7)
and `tests/privileged-membership-serialization.spec.js` (4) are new and
registered in `test:contracts`; the combined focused run passes **89/89**, the
rehearsal passes, and `npm run build:admin` passes its security, artifact/404,
**186.96/300 kB** budget and secret-scan gates.

Recovery: H-013 is reverted by restoring `upsert: true` and the unconditional
`removeUnregisteredEvidence` call — which reinstates the evidence-loss paths, so
prefer fixing forward. H-014's migration is **prepared and unapplied**; it
changes nothing until the MAP-017 apply gate opens, and it must be applied with
the rest of that phase rather than on its own.

Still open: H-013's isolated Storage/RPC fixture coverage for commit-then-lost-
response and failed-cleanup paths against a real provider, and H-014's
application to the live database plus a two-session rehearsal against the applied
functions rather than an extracted copy.

## Receiving row actions address the selected lot — 5 September 2026

MAP-028 H-017. Two boxes of one product are two physical lots with their own
batch code and expiry. The manifest table's `+1 Milan packed` and
`+1 Manila received` handlers called `scan(item.sku, stage)` without the row's
id, so the fallback picked the first incomplete line with that SKU: clicking the
second box incremented the first, and the count was attributed to the wrong lot.
The scanner modal already passed its item id and is unchanged.

`src/views/admin/consignmentScanTarget.js` now owns the decision.
`selectManifestItem()` addresses an exact manifest-item id when one is given and
keeps the SKU fallback only for the scanner, where a barcode genuinely arrives
without a chosen row. `scanRefusalReason()` names the **box** when a line cannot
take another unit — Milan at its expected quantity, Manila at what Milan actually
packed — so a refusal is actionable instead of silently landing elsewhere. The
component re-checks the chosen line against its current quantities before
sending, so a row rendered before another staff member's scan cannot act on stale
numbers. Retained operation keys in this component are unchanged.

The box code is now visible where staff act: a "Box / batch" column on desktop
and an `lg:hidden` card list carrying SKU, box, lot, expiry, all three counts and
the action together. Desktop table density is unchanged.

Verification, local only: nine checks in `tests/consignment-row-targeting.spec.js`
(registered in `test:contracts`), the focused run passing **99/99**, and
`npm run build:admin` green at **186.96/300 kB** with its security, artifact/404
and secret-scan gates.

**Read this evidence with one correction in mind.** The first version of the card
list introduced a JSX syntax error — two sibling elements in a ternary branch
without a fragment — and every source-string contract in that spec still passed
while `npm run build:admin` was failing. The build caught it; the contracts could
not. The spec now transforms the component with esbuild as its last check, and
the same lesson applies to the other source contracts added this session: they
pin intent, not compilability.

Not verified: the 375px and desktop rendering was never opened in a browser. The
responsive structure is asserted by contract only, so H-017's layout validation
at 375×812 and 844×390, and its exhausted-line and retry flows against a rendered
component, remain open.
