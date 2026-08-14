# K2 Jimzon Master Action Plan

**Status:** authoritative queue for all approved, unfinished project work

**Last audited:** 14 August 2026

**Current next item:** MAP-016 — emergency credential containment and truthful
launch-state recovery

This is the only active project backlog. If work is not listed here, it is not an
approved implementation task. Other audits, roadmaps, blueprints, and idea files
may explain context, but they must not maintain competing task lists.

The goal is to make this file empty. Completed items are not kept here.

## Product mission

K2 Jimzon must ship as two user-ready products with one controlled operating
truth:

- **Storefront:** a trustworthy, mobile-first direct buying and Pasabuy
  experience for customers.
- **Admin BOS:** the central operating system used by all authorized staff for
  products, lots, flights, custody, orders, fulfillment, customers, Pasabuy,
  channel preparation, communication, evidence, reconciliation, and decisions.
- **Channel-ready core:** Shopee, TikTok Shop, Lazada, and future channels attach
  through audited backend adapters to the same canonical records. A connector
  never creates a second inventory, order, customer, or reporting truth.

## Source-of-truth hierarchy

1. `K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md` defines required behavior.
2. `K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md` records verified live behavior.
3. This file contains approved work that is still unfinished.
4. `K2 Jimzon - Brain/FUTURE_IDEAS.md` is an unaudited intake inbox only.
5. `K2 Jimzon - Brain/OWNER_QUESTIONS.md` contains only decisions that truly
   require the owner.

## Mandatory work lifecycle

```text
New idea
  -> Future Ideas intake
  -> audit against the rulebook, System Brain, code, data, constraints, and duplicates
  -> reject / merge / defer outside the active queue / accept into this plan
  -> implement in dependency order
  -> verify valid, invalid, duplicate, permission, failure, recovery, desktop, and mobile paths
  -> update the appropriate logic, current-state, design, migration, test, and runbook files
  -> remove the completed item from this file
```

Git history is the completion archive. This file must never acquire a `Done`
section or preserve completed checkboxes.

## Audit gate for new work

An idea enters this plan only when its audit records:

- the real problem and evidence that it still exists;
- the user or operational outcome;
- why existing behavior does not already solve it;
- dependencies and whether they are available now;
- affected records, state transitions, permissions, audit evidence, and recovery;
- the smallest safe implementation scope;
- objective completion checks; and
- the files that will receive the verified final logic.

Reject cosmetic duplication, fabricated integrations, speculative metrics,
client-side secrets, unsafe stock shortcuts, and work that only a missing paid
service or unapproved API can unlock.

## Execution rules

- Work from the lowest MAP number whose dependencies are satisfied.
- Keep at most one major MAP item in implementation at a time unless work is
  explicitly independent.
- Do not add scope silently. New scope returns to the idea audit.
- Database changes are additive, preflighted, rollback-validated, and applied once.
- Admin and storefront remain separate production builds and deployments.
- A UI is not complete until its data, permissions, failure states, mobile use,
  tests, and operational documentation are complete.
- If implementation reveals an owner-policy decision, add only that decision to
  `OWNER_QUESTIONS.md`; continue all work that does not depend on it.
- After verification, update every listed record destination and then delete the
  MAP entry in the same commit.

## Delegated implementation and independent verification

- **Implementer:** Antigravity/Gemini performs the coding, migrations, tests,
  documentation, and permitted configuration work.
- **Independent verifier:** Codex reviews the implementation and evidence later.
  Antigravity must not delete a MAP item or call it complete; it sets the item to
  `Ready for independent verification` and returns the required evidence report.
- **Owner:** approves business-policy answers, credentials, provider controls,
  destructive actions, production migrations, deployments, DNS, and other
  external changes when authorization is required.
- Antigravity follows `ANTIGRAVITY_GEMINI_MASTER_INSTRUCTION.md` for every run.
  That file is an execution protocol, not a second backlog; this MAP remains the
  only source of implementation scope and order.
- Default to one MAP item per implementation run. Do not advance past an unmet
  dependency, unresolved owner decision, failed test, or unverified production
  condition. Independent work inside the same item may be parallelized only when
  it cannot bypass the dependency chain.
- Allowed item states are `Queued`, `Active`, `Blocked — evidence required`, and
  `Ready for independent verification`. `Complete` and `Done` never remain in
  this file.
- Progress evidence belongs inside the active MAP item. It must distinguish
  local code, rollback-only provider validation, permanently applied migration,
  configured provider state, deployment, and real-host proof.

## Execution dashboard

| Order | Item | Purpose | Dependency gate |
| --- | --- | --- | --- |
| 1 | MAP-016 | Contain exposed credentials and restore truthful project state | Blocks every later launch item |
| 2 | MAP-017 | Establish live schema, grants, RLS, RBAC, ownership, and RPC truth | MAP-016 |
| 3 | MAP-018 | Complete phone-first product intake and publication gates | MAP-017 for activation |
| 4 | MAP-019 | Complete hybrid identity, commerce continuity, wholesale identity, and secure sessions | MAP-017; may overlap MAP-018 where independent |
| 5 | MAP-020 | Secure every API, upload, public form, Admin command, and connector boundary | MAP-017 and MAP-019 decisions |
| 6 | MAP-021 | Harden browser errors, headers, dependencies, and separate production artifacts | MAP-019 and MAP-020 |
| 7 | MAP-022 | Complete security events, alerts, backup/restore, and incident controls | MAP-016 through MAP-021 |
| 8 | MAP-023 | Complete and rehearse canonical storefront and Admin operations | MAP-017 through MAP-022; OWNER-002/003 gate policy activation |
| 9 | MAP-024 | Configure separate production projects, domains, DNS, HTTPS, and Auth callbacks | MAP-023 and OWNER-001 |
| 10 | MAP-025 | Produce final security, staff, customer, and production launch proof | MAP-016 through MAP-024 |

**Current execution command:** work only on MAP-016 until its remaining
provider-side credential disablement, log review, replacement, and old-key
rejection evidence is obtained and independently verified.

## Mandatory four-skill design rule

Whenever accepted work creates, changes, reviews, or fixes any visible UI,
interaction, responsive behavior, typography, color, motion, navigation, form,
table, chart, loading state, empty state, or error state, use all four installed
design skills together:

1. `ui-ux-pro-max`
2. `impeccable`
3. `design-taste-frontend` (Taste Skill)
4. `emil-design-eng` (Emil Kowalski Design Engineering)

The combination is not permission to replace K2's existing design logic. Start
with `PRODUCT.md`, `DESIGN.md`, the operations rulebook, the current UI, and the
staff/customer task. Use UI/UX Pro Max for accessibility, responsive structure,
forms, navigation, and data visualization; Impeccable for register, hierarchy,
brand cohesion, states, and production quality; Taste for anti-generic
composition and complete interaction states; and Emil for purposeful,
interruptible, high-craft motion and feedback.

Resolve conflicts in this order: user requirements and operational truth →
security and data integrity → accessibility → existing K2 brand/design rules →
mobile usability and performance → optional skill aesthetics. Storefront work
preserves the editorial luxury/wood atmosphere. Admin work favors readable,
dense, fast operational clarity. Never add perpetual or decorative motion to a
frequent staff action; never animate keyboard-driven actions; always support
reduced motion.

## Active work, in required order

The 11 August audit rejected the prior claim that MAP-000 through MAP-015 were
complete. Their local evidence consisted partly of uncommitted files,
filename/string checks, placeholder behavior, incompatible or unapplied SQL, and
unverified provider state. Necessary unfinished scope is consolidated below;
historical MAP numbers are not reopened as competing entries.

### MAP-016 — Emergency credential containment and truthful launch-state recovery

**Status:** Blocked — evidence required (local containment independently verified;
legacy API-key use is disabled, but the old service-role JWT still grants elevated
access when paired with a public API key; the active `invite-staff` function still
needs the prepared modern-secret migration deployed and tested; complete API/Auth/
Edge log evidence plus owner-approved JWT signing-key revocation remain pending)

**Audit decision:** Accepted from IDEA-20260811-01. A plaintext Supabase
service-role JWT exists in an untracked catalog seed script. Local launch work is
not on `origin/main`, the supposed release proof does not exercise end-to-end
behavior, and current-state documents overstate completion.

**Deliver:**

- Revoke/disable and replace the exposed legacy service-role credential in the
  Supabase dashboard; review its last-used activity and treat it as compromised.
- Remove every hardcoded secret from scripts and source. Use server-only
  Supabase/Vercel secrets for elevated keys and a publishable/anon key only in
  browser configuration.
- Scan the working tree, Git history, build artifacts, deployment variables,
  logs, documentation, and generated files for credentials, tokens, private
  customer data, payment data, and connection strings. Rotate anything exposed.
- Prevent recurrence with secret scanning before commit/build/deploy and a
  repository allowlist for intentionally public publishable keys.
- Inventory every local uncommitted/untracked change, preserve legitimate user
  work, and classify it as verified, incomplete, unsafe, obsolete, or unrelated.
- Replace filename/string-only “proof” with truthful status. Mark migrations,
  provider settings, data seeds, domains, and deployments unverified until
  direct evidence exists.
- Repair the false empty-backlog/current-state claims. Keep
  `MASTER_ACTION_PLAN_DOCUMENTATION.md` non-authoritative or remove it after its
  useful evidence is reconciled into the rulebook/System Brain/Git history.

**Complete when:** the exposed credential is disabled; repository/history/bundle
secret scans pass; no elevated key is present in browser code or tracked files;
all local changes are classified; and the System Brain plus this plan report the
same evidence-backed current state.

**Record in:** `.gitignore`, `.env.example`, secret-scan configuration and tests,
`SYSTEM_BRAIN_CURRENT.md`, security incident/rotation runbook, and Git history.

**Progress evidence (14 August 2026):** the exposed value was removed without
reuse or disclosure; the unsafe mixed catalog/inventory seed is disabled; the
concrete-looking example encryption value was replaced; repository (701 files),
Git-history (all commits), and local production-mode build bundle (32 storefront
files, 37 admin files) secret scans pass; secret-scanner whole-line placeholder
skipping bypass in `scripts/secret-scan-core.mjs` was fixed so each credential match
is evaluated independently; regression tests in `scripts/test-secret-scan.mjs` prove
`sb_secret_`, JWT, private keys, and credentialed database URLs are detected even
when coexisting on the same line with placeholder markers (`example`, `placeholder`,
`[redacted]`, `your-`, etc.); encrypted private-key headers are detected; database
URL suppression requires an exact documentation host plus exact placeholder username
and password, while real credentials and hostname lookalikes fail; automated
completed-dist secret scanning was added to
all build paths (`build`, `build:storefront`, `build:admin`, `vercel.storefront.json`,
`vercel.admin.json`); failure gate was proven with temporary controlled fixtures
(contaminated builds failed with exit code 1 and clean builds passed); all local
work is classified in `MAP_016_RECOVERY_EVIDENCE.md`; and build boundary verification
passes for both separate local production-mode artifacts.
Provider-side evidence observed on 14 August 2026:
1. Consumer inspection found that the active deployed `invite-staff` Edge Function
   (version 3) still corresponds to repository code that reads the legacy
   `SUPABASE_SERVICE_ROLE_KEY`. A local correction now reads the modern
   `SUPABASE_SECRET_KEYS` JSON, but it is not deployed or live-tested. The inactive
   Shopee function was corrected at the same boundary.
2. A 24-hour query returned only 12 database/pooler events (9 `postgres_logs`,
   3 `pgbouncer_logs`). No suspicious event appeared in that limited sample, but
   API, Auth, and Edge request activity was absent, so elevated-key use, destructive
   API actions, and abnormal request volume were not proven absent.
3. A modern provider secret key was verified operational through a bounded read-only
   request. Deployment-secret installation for every runtime was not proven.
4. The legacy API-key flag was changed to disabled through the Management API at
   2026-08-14T11:05:07Z. The required explicit pre-disable owner confirmation was
   not recorded. Later independent verification returned `enabled: false`; the old
   key as `apikey` returned 401.
5. The old HS256 service-role JWT remains an authorization credential: a public-key
   request exposed 26 eligible rows, while the same public key plus the old Bearer
   JWT exposed 30, matching the modern elevated-key count. JWT signing-key migration
   and revocation therefore remain required after every active consumer is migrated.
6. Local storefront/Admin builds now prefer the modern browser-safe publishable
   key over the disabled legacy anon JWT. The publishable key returned HTTP 200
   from the read-only Auth settings endpoint, both isolated builds and the 701-file
   secret scan pass, and staff role/password/MFA enforcement remains unchanged.
MAP-016 remains `Blocked — evidence required`; MAP-017 must not start.

### MAP-017 — Supabase schema truth, grants, RLS, RBAC, ownership, and RPC boundary

**Status:** Queued; depends on MAP-016

**Why needed:** repository migrations contain legacy blanket `USING (true)` and
public policies; the live schema/policy state is not proven; new intake SQL
targets columns that conflict with established compatibility fields; and some
`SECURITY DEFINER`/authenticated operations lack least-privilege proof.

**Deliver:**

- Export a reviewable live schema inventory covering every table, view,
  materialized view, function/RPC, sequence, trigger, grant, policy, publication,
  Storage bucket/object policy, and exposed schema. Diff it against ordered
  migrations without copying secrets or customer data.
- Create additive, preflighted, rollback-validated migrations. Enable RLS on
  every exposed table and use `security_invoker` views or revoke direct view
  access. Revoke broad/default grants and grant only required operations.
- Define one authorization matrix for `anon`, guest-token, authenticated
  customer, support, warehouse/receiving, catalog, finance, operations, admin,
  Edge Function, and service roles.
- Customers may access only their own account-linked records. Guest records use
  scoped, expiring, high-entropy access grants—not email, sequential IDs, or URL
  IDs alone. Staff access shared business records only by approved role, hub,
  assignment, state, and operation. Admin remains audited and cannot expose
  secrets through the browser.
- Replace all blanket staff policies with `is_staff`, `is_admin`, role/hub/
  assignment checks as appropriate. Require AAL2 for sensitive administrative,
  role, credential, finance, deletion, and publication actions.
- Audit every RPC/function for authorization, ownership, valid state transition,
  parameter constraints, idempotency, fixed `search_path`, explicit grants, and
  safe failure. Revoke executable access from roles that do not need it.
- Expose public catalog data through a minimal reviewed-products contract/view
  or safe RPC. Do not expose private prices, stock lots, custodians, suppliers,
  channel credentials, scans, customer records, or internal notes.
- Add automated positive and negative database tests for anon, guest, customer,
  each staff role, admin, cross-user ID changes, cross-hub access, guessed UUIDs,
  direct table calls, RPC calls, views, Realtime, and Storage.

**Complete when:** live preflight proves every exposed object has intentional
grants/RLS; cross-user and cross-role access is denied at the database even when
the UI is bypassed; all allowed workflows still pass; migrations apply once and
rollback safely; and Security Advisor findings are reviewed with evidence.

**Record in:** dated migrations, generated database types, authorization matrix,
RLS/RPC tests, operations rulebook, System Brain, and database runbook.

**Read-only audit evidence (11 August 2026):** the connected live project has 42
public tables, all with RLS; two RLS tables have no policies, six tables carry
anon DML grants, two operational views are anon-selectable, and 44
`SECURITY DEFINER` functions include four guest-callable and 32
authenticated-callable functions. Confirmed public write paths include blanket
policies on brands, categories, warehouses, and `products_old`; all-authenticated
draft management exists on `product_drafts`. No DDL was applied. Exact evidence
and migration preconditions are in `LIVE_SUPABASE_SECURITY_AUDIT_2026-08-11.md`.
The phase-1 public-write-boundary preflight now returns ready against the live
schema, and an idempotent migration plus postflight assertions are prepared but
intentionally unapplied pending MAP-016 provider-key disablement evidence.
The full object inventory additionally found public upload/update/delete
policies on the `product-images` bucket, no bucket MIME/size limits, and the
legacy `products_old` table in Realtime; the prepared phase-1 migration now
contains those exact remediations and postflight assertions.
On 12 August the exact migration plus postflight passed inside a live explicit
transaction, after which `ROLLBACK` restored every sampled original vulnerable
state. This proves syntax, live object compatibility, postflight behavior, and
transactional reversibility without claiming deployment. Evidence is in
`MAP_017_ROLLBACK_VALIDATION_2026-08-12.md`.

### MAP-018 — Repair phone-first product intake, inventory, and publication gates

**Status:** In progress locally; permanent database activation depends on MAP-017

**Why needed:** the uncommitted intake imports a missing dependency and a missing
prompt export; uses placeholder uploads; permits step skipping; does not apply
field accept/reject state; falls back to browser/random/mock SKUs; writes lots
directly; ignores some server errors; and can publish without a proven checklist.

**Implementation evidence (12 August 2026):** the duplicate component paste and
missing icon/prompt imports were repaired, and the admin production build now
passes its separate-artifact boundary check. The browser service no longer
creates random/mock SKUs, falls back to direct product/lot writes, or converts
database errors into success. Draft, first-inventory, and publication requests
now fail closed behind named server commands. The modal uses real phone
camera/file selection instead of placeholder URLs, prevents generic step
skipping, and records explicit accepted/rejected ChatGPT fields. Live read-only
schema inspection proved that `product_intake_sessions` is not deployed and the
old draft migration targeted nonexistent product/audit columns and wrong status
casing. That migration has now been replaced. Its exact preflight,
migration+postflight, and rollback restoration checks pass against production
without persisting changes. The aligned UI uses private evidence paths, real
open-flight selection, written distinct-variant resolution, idempotent server
commands, and administrator-only opening balances with owner/cost/location/
custodian/reason. The supplier-receipt record, authenticated runtime and phone
negative tests, MAP-016/MAP-017 activation gate, and permanent deployment remain
in this item.
The exact read-only comparison is recorded in
`MAP_018_LIVE_SCHEMA_AUDIT_2026-08-12.md`.
The staff procedure and activation order are in `PRODUCT_INTAKE_RUNBOOK.md`.

**Deliver:**

- Make both production builds compile without undeclared packages or missing
  exports, while preserving the approved two-Project manual ChatGPT workflow.
- Persist one resumable, user-owned/staff-authorized intake session on the server.
  Local storage may cache non-sensitive presentation state only and may never
  fabricate a successful product or inventory transaction.
- Real phone camera/device/hardware-scanner/manual fallbacks; verified package
  evidence uploads; duplicate resolution that opens the actual existing record;
  and no forward progress past required gates.
- Server-only stable SKU creation with uniqueness/idempotency. Remove direct
  insert, random SKU, mock success, and silent offline fallbacks.
- Apply accepted/rejected content fields and provenance exactly; retain unknowns,
  sources, actor, schema/prompt version, timestamps, and review decisions.
- Create first inventory only through the selected truthful server workflow:
  Italy flight/box manifest, supplier receipt, or authorized opening-balance
  reconciliation. Never convert a failed write into success.
- Enforce publication readiness and permission on the server. Draft creation,
  physical inventory, human review, pricing, and publication remain separate.
- Verify valid, invalid, duplicate, interrupted, offline, retry, concurrent,
  partial, permission, camera-denied, upload-failed, and 375px mobile flows.

**Complete when:** a real exact-variant product can be captured on a phone,
resumed after app switching, reviewed, assigned one server SKU, optionally added
through one controlled inventory source, and published only after server-side
readiness; every failure is recoverable and cannot create duplicate truth.

**Record in:** product intake service/UI, migrations/RPCs, Product Master and
Sheet Mode runbooks, tests, operations rulebook, System Brain, and design record.

### MAP-019 — Hybrid guest/account commerce, universal messaging, and secure sessions

**Status:** Queued; depends on MAP-017; may progress with MAP-018 where independent

**Approved architecture:** customers may submit and buy without creating an
account. Accounts remain optional for saved history, identity continuity, and
universal messaging. Staff Admin BOS sessions move behind a small server/BFF
boundary using `HttpOnly`, `Secure`, `SameSite` cookies.

**14 August scope audit:** IDEA-20260814-02, IDEA-20260814-03, and the public
Contact-us/live-availability idea are merged here
instead of creating new queue items. The approved hybrid identity boundary also
needs attributable wholesale organizations/buyers and durable customer
continuation after refresh; neither a mailto link nor in-memory confirmation is
the target operating model. Contact remains a permanent fifth storefront
destination even while secure messaging is inactive; a real staff-online claim
requires server-backed staff presence with an expiry, not a decorative status.

**Confirmed launch sequence:** retain this hybrid model, complete and verify the
security and operational boundaries first, then activate the separate storefront
and Admin domains through MAP-024. Domain availability is not a prerequisite for
local hardening and must not be used to bypass unfinished security gates.

**Implementation evidence (12 August 2026):** an inactive-by-default Admin BFF
foundation now provides exact-origin login, mandatory TOTP/AAL2 step-up,
encrypted ten-minute pending and active HttpOnly cookies, a 30-minute inactivity
limit, an eight-hour absolute lifetime, live Auth/role/AAL rechecks, CSRF-bound
logout, safe errors, and an admin-project runtime guard using only the limited
anon key. Its local contract passes. It is deliberately not connected to the UI:
admin reads/writes still use browser Supabase sessions, the rate limit is only a
per-instance brake, and named data routes, durable limits/logs, revocation/
device controls, reset/invite/OAuth, direct-bypass tests, and real-host evidence
remain. Activation order is recorded in `ADMIN_BFF_SECURITY_RUNBOOK.md`.
The hybrid identity migration now also passes its live preflight and full
postflight in a rollback-only production transaction. It separates customer,
verified contact, optional account, deliberate channel identity, hashed guest
grant/scope, one-time claim, and conversation ownership with forced RLS and
server-only mutation. A separate query proved the original live state was fully
restored. Evidence is in `MAP_019_ROLLBACK_VALIDATION_2026-08-12.md`; no identity
object is live yet.

The owner/build decision is final: guest order, Pasabuy, and website messaging
must work without registration; optional accounts add verified history and
cross-device/universal-message continuity. A feature-gated Storefront BFF and
signed database submission boundary are now prepared. They use exact origins,
limited keys, bounded schemas, safe errors, five-minute HMAC requests, nonce
replay protection, durable IP/contact limits, payload-bound idempotency, minimal
receipts, canonical guest identity, and scoped HttpOnly grants. The exact
identity + boundary + cutover sequence and real order/Pasabuy continuity passed
in a production rollback-only transaction; both production builds and 14 local
contracts pass. Scoped guest conversation list/reply and cross-guest denial now
also pass in rollback-only production testing. Permanent activation, real
Turnstile configuration/host tests, verification/account claim, Admin data
routes, and real-host tests remain. The accessible Turnstile component and a
phone-ready guest inbox are prepared behind the inactive feature flag. The
inbox lists only conversations scoped to the HttpOnly guest grant, supports
idempotent replies, distinguishes loading/empty/expired/error states, and does
not require registration or expose the grant to JavaScript.
Successful Pasabuy receipts now expose one immediate `Open request chat` action
only behind that same flag. The inbox performs a visible-tab 15-second refresh,
preserves existing messages on background-refresh failure, and makes no instant
delivery or staff-response claim. A 375px scripted UI flow passed with mocked
same-origin BFF responses; permanent activation and real-host proof remain gated.
The prepared inbox now also supports starting the first Website conversation
without an order or Pasabuy request. A new exact-schema endpoint and signed
database command add Turnstile, IP/contact rate limits, payload-bound
idempotency, canonical customer/conversation/message creation, and a scoped
HttpOnly grant. The no-purchase 375px start-to-chat flow and four endpoint-denial
contracts pass locally. The changed SQL still requires a fresh rollback-only
provider rehearsal before any permanent activation.
The local storefront now also exposes an always-visible `Contact us` destination
on desktop, mobile, and footer navigation. It publishes only the confirmed K2
email, Messenger and Shopee handles, uses an explicitly unsent email-draft
fallback while the guest BFF is inactive, and switches to the prepared secure
conversation form when active. No staff-online status is claimed; public
phone/Viber/WhatsApp details await OWNER-004 confirmation. The storefront
production build and six smoke flows pass, including 1024px and 375px Contact
navigation/overflow checks.

The first Admin data slice is also prepared behind
`VITE_ADMIN_BFF_ENABLED=false`: `/api/admin/overview` replaces eight direct
command-center reads with fixed projections, rechecks the encrypted session,
current staff role, and AAL2, refreshes inactivity without exposing tokens, and
returns safe partial-state codes. The client uses 30-second visible-tab polling
only when the boundary flag is active; the legacy Realtime path remains while
inactive. Fifteen local contracts and the separate admin production build
boundary pass. This is not deployed and does not make the remaining browser
operations BFF-protected. A second fixed `/api/admin/products` read projection
now supplies SKU, name, barcode, status, price, image, and batch-derived stock to
the Admin context without returning full product rows; stock-query failure stays
explicit instead of fabricating availability. Their factual inventory is in
`ADMIN_BFF_SECURITY_RUNBOOK.md`.

Admin and storefront state are now split at the application boundary:
`AdminApp` uses `AdminStoreContext` with admin-only Auth/inbox runtimes, while
`StorefrontApp` uses the commerce `StoreContext`. The verifier now scans compiled
JavaScript as well as manifest paths. A storefront build contains no admin API,
CSRF, MFA-enrollment, staff-invite, or internal-inbox command markers; an admin
build contains no guest-commerce API, cookie, submission, Turnstile, or voucher
markers. Cookie login/MFA/session/logout client calls and two bounded read routes
are prepared behind the
inactive flag, while OAuth, enrollment, invitations, and remaining operational
data routes stay explicitly unavailable/pending. Eighteen contracts and both
content-isolated production builds pass.
Evidence and ordered activation are in
`MAP_020_GUEST_BOUNDARY_ROLLBACK_VALIDATION_2026-08-12.md` and
`GUEST_COMMERCE_BFF_RUNBOOK.md`.

**Vercel Hobby correction (14 August 2026):** preview and production deployments
for `909d769` were rejected because 50 prepared `api/` handlers exceed the Hobby
limit of 12 Serverless Functions. GitHub CI passed both artifacts and smoke
flows, but nothing new was published. An initial `.vercelignore` correction did
not affect Git-based function discovery. Since both BFF flags are deliberately
off, the handlers now live under `prepared-api/`, outside Vercel's deployable
`api/` directory, so the storefront Contact/email fallback and legacy Admin Auth
can deploy without misrepresenting the BFF as live. Before BFF activation,
consolidate handlers behind no more than the plan limit per artifact (preferred)
or obtain owner approval for an upgrade, restore deployable routes, and repeat
deployed security/ownership tests.
The correction passed both Vercel previews and main CI, then PR #2 deployed
separate storefront and Admin production artifacts successfully as `e9ff7a0` on
14 August 2026. Vercel SSO still prevents unauthenticated content/sign-in proof;
owner acceptance remains required. The prepared BFF endpoints are absent and
must not be described as live.

**Deliver:**

- Define canonical customer, contact point, verified identity, guest access
  grant, order/request, conversation, channel identity, and merge/link records.
  Never use email/phone alone as proof of ownership.
- Guest checkout/order requests collect only necessary contact/delivery data and
  return a scoped, expiring, revocable access mechanism for that order and its
  conversation. URL ID changes never reveal another customer’s data.
- Optional accounts can claim guest orders/conversations only after contact
  verification and conflict checks. Preserve original identities and provenance;
  ambiguous cross-channel merges require staff confirmation and are reversible.
- Give the scoped guest or verified account a bounded customer-facing record for
  each order/Pasabuy request: current truthful state, accepted quote/version,
  delivery estimate/confirmation, payment-request or evidence state, tracking
  only after real courier/channel evidence, linked messages, expiry/revocation,
  and recovery after refresh or app switching. Never expose staff notes, lot
  detail, other customers, provider payloads, or unsupported response-time claims.
- Model wholesale organizations, authorized buyers, contacts, approval state,
  negotiated price-list/quote versions, terms, limits, delivery requirements,
  and links to canonical orders/conversations without silently turning a retail
  contact match into a business account. Commercial policies remain configurable
  and owner-approved; the browser cannot grant wholesale pricing to itself.
- Universal messaging normalizes website, Pasabuy, Shopee, TikTok Shop, Lazada,
  and future messages into the canonical conversation model without claiming a
  connector delivered or received anything until provider confirmation exists.
- Keep Contact us visible independently of messaging activation. Publish only
  owner-confirmed channel details. If staff availability is added, derive it
  from an authorized staff heartbeat with a short server-enforced expiry;
  absent, stale, signed-out, or unverifiable presence is unavailable, never
  `online`.
- Add a same-origin BFF for the Admin BOS. Store staff sessions in `HttpOnly`,
  `Secure`, appropriately scoped `SameSite` cookies; rotate sessions; prevent
  fixation; validate Origin/Referer and CSRF tokens for state changes; never send
  refresh tokens to browser JavaScript.
- Define inactivity, maximum lifetime, device/session listing, revocation, logout,
  password-change, and stolen-session behavior possible on the current free plan.
  Do not claim paid Supabase session controls that are unavailable.
- Require invite-only staff Auth, verified email, password policy, protected
  reset/callback allowlists, single-use reset behavior, and enforced MFA/AAL2 for
  staff. Supabase/Vercel/GitHub/registrar/primary-email accounts require 2FA and
  protected recovery codes.
- Add protected-route tests, direct API bypass tests, session/CSRF/revocation
  tests, guest/account ownership tests, and customer-data retention/deletion
  behavior.

**Complete when:** a guest can safely submit, reload, and continue one order or
Pasabuy record and conversation; an account customer sees only deliberately
linked records; an approved wholesale buyer receives only server-authorized
commercial terms; a staff member receives only their authorized operational
scope through the BFF; stolen/expired/revoked sessions fail; and no browser
bundle/storage contains an elevated key or refresh token.

**Record in:** identity/session schema, BFF/API code, RLS and Auth configuration,
checkout/account/inbox runbooks, privacy/retention record, tests, operations
rulebook, System Brain, and design record.

**Guest-boundary audit evidence (12 August 2026):** the storefront uses order
v2, Pasabuy submission, and coupon validation; legacy order v1 is unused and
contradicts the approved delivery rule with a fixed PHP 85 charge. Order v2
returns the entire internal row (including PII/internal fields), Pasabuy lacks
idempotency, coupon preview exposes internal configuration, and all three lack a
rate-limited server boundary. The approved minimal receipts, BFF validation,
scoped guest grant, account-claim, and channel-identity rules are recorded in
`GUEST_COMMERCE_SECURITY_CONTRACT.md`.

### MAP-020 — API abuse, validation, uploads, bot defense, and connector security

**Status:** Queued; depends on MAP-017 and MAP-019 session decisions

**Deliver:**

- Inventory and classify every Supabase Data API operation, RPC, Edge Function,
  Auth endpoint, Storage operation, Realtime subscription, BFF/API route, public
  form, scheduled job, connector, and future cost-bearing endpoint.
- Add layered rate limits by IP/fingerprint, authenticated user, account, action,
  and global budget. Apply strict limits to sign-in, signup, password reset,
  invitations, order/Pasabuy submission, coupons, messages, uploads, search,
  email/SMS, AI, exports, and future payments. Return safe `429` responses with
  retry guidance and prevent retries from duplicating writes.
- Use current-plan protections first: Supabase Auth limits/CAPTCHA, Cloudflare
  Turnstile or hCaptcha on public/Auth forms, the available Vercel WAF rule per
  production project, and server/database limits for direct Supabase surfaces.
  Record cost/availability before adding any paid dependency.
- Replace wildcard CORS with explicit production/preview/local allowlists. Treat
  CORS and Origin checks as defense-in-depth, never authentication. Authenticate,
  authorize, validate, and rate-limit every request independently.
- Define server validation schemas with allowlisted enums, normalized text,
  maximum lengths/counts, numeric bounds, payload/content-type limits, and safe
  plain-text output. Fix string-interpolated PostgREST filters; use structured
  query methods or validated escaping. Parameterize dynamic SQL.
- Accept only required upload formats. Verify actual file signatures/magic
  bytes, MIME, extension, byte size, image dimensions, decode success, filename,
  and ownership on the server; disallow SVG/HTML/scripts/executables; randomize
  object names; set bucket-specific size/MIME limits; and make uploaded content
  non-executable. Separate public product media from private evidence.
- Lock down admin/debug/test/invite/export endpoints and remove them from
  production when unnecessary. Sensitive mutations require Auth, role, AAL2,
  reason, idempotency, audit evidence, and confirmation where appropriate.
- Future payment and marketplace webhooks must verify the provider’s signature
  over the exact raw body, timestamp/replay window, event/account identity, and
  idempotency before durable capture. Redirects/screenshots never prove payment.
- Future AI endpoints may retrieve only records the requesting principal is
  authorized to see, must not mix customers/tenants, must redact unnecessary PII,
  and must have per-user/global cost budgets. Manual product Projects remain
  product-only and never receive customer, credential, payment, or private-price
  data.

**Complete when:** automated tests prove limits, bot challenges, CORS behavior,
authorization, validation, injection resistance, upload rejection, endpoint
lockdown, idempotency, webhook forgery/replay rejection, and safe degradation.

**Record in:** Edge/BFF shared middleware, validation schemas, migrations,
Storage configuration, connector/payment specifications, security tests,
operations rulebook, System Brain, and incident runbook.

**Public-RPC audit evidence (12 August 2026):** live bodies confirm server-side
product pricing and pending courier quotation in order v2, but input bounds,
request fingerprinting, safe error mapping, rate limiting, bot defense, and
minimal response contracts are incomplete. Direct RPC exposure is transitional;
the accepted BFF contract is in `GUEST_COMMERCE_SECURITY_CONTRACT.md`.

**Prepared boundary evidence (12 August 2026):** the signed Storefront BFF,
database replay/rate boundary, minimal receipt projections, scoped guest cookie,
feature-gated client, pre/postflights, and coordinated legacy-RPC cutover compile
and pass rollback-only production behavior tests. The feature remains off and
the cutover unapplied until MAP-016/MAP-017, Turnstile form integration, matching
server/private secrets, and same-release smoke tests are ready.

**Prepared Admin fulfillment evidence (12 August 2026):** live read-only
inspection confirmed the exact production order, item, reservation, lot, staff,
and seven fulfillment RPC contracts. The inactive Admin BFF now has one fixed
fulfillment read projection and seven named mutation routes for confirmation,
unit packing scan, payment evidence state, delivery/waybill details, fulfillment,
exact-lot transfer, and whole-box assignment. Mutations require the admin
production target, exact origin, encrypted active session, live staff role,
AAL2, CSRF, bounded allowlisted JSON, a unique operation key, and a server HMAC.
The prepared database wrapper adds nonce replay denial, payload-bound durable
idempotency, per-actor/action database limits, and minimal results. It compiled
against production inside a transaction and a separate query proved every new
object rolled back. Twenty local contracts and both isolated production builds
pass. This is not live: the migration and private/server secret are unconfigured,
the feature flag remains false, capability-level finance authorization is still
pending, and the existing browser path remains until coordinated cutover.
Exact proof is recorded in
`MAP_020_ADMIN_FULFILLMENT_ROLLBACK_VALIDATION_2026-08-12.md`.

**Prepared Admin universal-inbox evidence (12 August 2026):** the live
conversation, message, event, staff, and three workflow RPC contracts were
inspected directly. The inactive Admin BFF now has fixed inbox and 20-event
history projections plus named internal-note, mark-read, and workflow commands.
The existing Inbox interface uses those routes only behind the disabled Admin
BFF flag and polls the server instead of subscribing directly when enabled.
Every mutation uses the same target/origin/session/AAL2/CSRF/HMAC/nonce/
idempotency/rate boundary as fulfillment. Internal notes remain explicitly
`internal_only`; external channel replies remain copy/open-provider fallback and
are never reported as sent. The combined migrations compiled in a production
rollback-only transaction, all staged objects were proven absent afterward,
22 contracts and both isolated builds pass, and the secret scan passes. This is
prepared code, not a connected marketplace inbox or active cookie boundary.
Exact proof is in `MAP_020_ADMIN_INBOX_ROLLBACK_VALIDATION_2026-08-12.md`.

**Prepared Admin Pasabuy evidence (12 August 2026):** the live request, quote,
event, transition, and immutable quote-version contracts were inspected
directly. The inactive Admin BFF now has a fixed bounded request/quote projection
plus named transition and quote commands. Both server and database boundaries
enforce exact payloads, bounded money/rate/weight/percentage/date values, a
future quote expiry, a final price at or above computed landed cost, an explicit
transition reason, and a required owner price rationale. The computed suggestion
remains advisory and the owner-selected price remains authoritative; saving a
version explicitly returns `sent=false` and `paid=false`. The existing screen
uses this boundary only behind the disabled Admin BFF flag and retains the
current live state machine rather than pretending the richer target workflow is
implemented. The foundation plus Pasabuy migration compiled against production
inside a rollback-only transaction, staged objects were absent afterward, 24
contracts and both isolated production builds pass, and the secret scan passes.
This is prepared code, not an active cookie boundary or deployed domain.
Exact proof is in `MAP_020_ADMIN_PASABUY_ROLLBACK_VALIDATION_2026-08-12.md`.

**Prepared Admin product-intake evidence (12 August 2026):** the inactive Admin
BFF now has named duplicate search, active-session resume/create, checklist-step,
open Italy-flight, Draft creation, first-inventory, publication, and private
evidence-upload routes. Mutations use the shared target/origin/session/AAL2/
CSRF/HMAC/nonce/idempotency/rate boundary and the database wrapper enforces
ordered checklist progression, exact payloads, bounded JSON/quantity/cost/text,
and a required publication reason. Evidence accepts only JPEG/PNG/WebP up to
10 MB, verifies the decoder-selected format against declared MIME, limits
dimensions/pages/pixels, fully decodes and re-encodes the image to remove
metadata and executable/polyglot content, then registers a SHA-256-bound private
object path through the signed command. The phone UI preserves the established
Admin design while using single-column small-screen controls, 44px category
targets, explicit checking/verified upload states, and truthful storefront-only
publication copy. The MAP-018 foundation and wrapper each compile in production
rollback validation and all staged objects remain absent; 27 contracts, both
isolated builds, a 672-file secret scan, and a zero-finding production dependency
audit pass. This remains prepared: neither intake migration is live, the Admin
BFF flag is false, supplier-receipt intake is unavailable, canonical hub/
custodian tightening and deployed denial tests remain, and no domain is active.
Exact proof is in
`MAP_020_ADMIN_PRODUCT_INTAKE_ROLLBACK_VALIDATION_2026-08-12.md`.

**Prepared Admin flight-consignment evidence (12 August 2026):** read-only live
inspection confirmed the exact consignment, manifest-line, scan-event, and five
legacy mutation RPC contracts and grants. The inactive Admin BFF now has a fixed
bounded flight projection plus named create-manifest, add-line, scan, advance,
and finalize commands. The scan command carries the actual code and selected
line; the database proves it matches that line's SKU or product barcode before
recording one unit. The client preserves the same operation key across a failed-
response retry and creates a new key for the next physical unit. State movement
requires a specific reason, variance finalization requires reconciliation notes,
and authenticated execution of the five direct mutation RPCs is revoked only in
the coordinated cutover migration. The foundation and wrapper each compiled in
rollback-only production validation; all staged objects remained absent and the
existing direct scan RPC remained available afterward. Twenty-nine contracts
and the isolated Admin production build pass. This remains prepared: the
migration is unapplied, the feature flag is false, the current browser RPC path
is still live, and damage, unexpected/wrong-item, unknown-expiry, insufficient-
shelf-life, and quarantine dispositions remain MAP-023 work. Exact proof is in
`MAP_020_ADMIN_CONSIGNMENTS_ROLLBACK_VALIDATION_2026-08-12.md`.

**Prepared Admin lots/expiry evidence (12 August 2026):** read-only production
inspection found 21 currently consistent lots but identified a live compatibility
trigger that overwrites available quantity with physical quantity on updates.
The inactive Admin BFF now has a fixed bounded lot projection and named reconcile
and clearance commands. Both layers require exact bounded payloads and specific
reasons; the database preserves existing IDs and reservations, rejects omitted
or duplicate lots and counts below reservations, derives availability from
physical minus reserved plus disposition/shelf life, and writes immutable before/
after events. The coordinated migration replaces the faulty trigger, normalizes
rows, adds the availability invariant, corrects sellable-stock and physical-
expiry views, and revokes the two direct mutation RPCs. The four-skill Admin UI
separates physical/reserved/sellable quantities, requires complete positive-lot
identity/custody, uses 44px mobile controls and inline recovery, removes emoji,
raw provider errors, generic reasons, and browser prompts, and locks unsafe
legacy reconciliation when reservations exist. A rollback-only production
rehearsal proved reservation subtraction, below-reservation denial, one audit
event, replay-safe retries, eligible 31–89 day clearance with reserved stock,
physical expiry reporting, and sellable stock totals. A post-rollback query
proved 21 live lots, zero batch events, unchanged legacy trigger/grants, and no
staged wrapper/constraint. Thirty-two contracts, the 21-module isolated Admin
build, Admin BFF verifier, and 688-file secret scan pass. This remains prepared:
the migration/secret/flag are inactive, direct RPCs remain live, and deployed
denial plus fulfillment/custody regressions and staff acceptance remain MAP-023.
Exact proof is in `MAP_020_ADMIN_LOTS_ROLLBACK_VALIDATION_2026-08-12.md`.

**Prepared Admin coupon evidence (12 August 2026):** read-only production
inspection found an empty live coupon table with RLS staff policies and direct
authenticated select/insert/update grants. The current audit trigger records row
changes without an operator reason, and no signed coupon command or dedicated
change-event table is live. The inactive Admin BFF now has a fixed bounded coupon
projection and Admin-only create, activate/pause, and archive commands with exact
schemas, bounded value/window/limit inputs, safe errors, required reasons,
HMAC/nonce/idempotency/rate controls, and immutable before/after events. Its
coordinated migration revokes direct authenticated coupon mutations. The
four-skill interface preserves the Admin BOS design while adding phone cards,
44px actions, readable financial facts, reasoned confirmation, and explicit
loading/empty/permission/validation/duplicate/conflict/retry states without raw
provider errors or browser confirmation prompts. A production rollback-only
rehearsal proved create, replay-safe retry, changed-payload denial, activation,
archive, archived-state denial, non-Admin denial, and complete restoration to
zero coupons/original grants with no staged objects. Thirty-five contracts, the
21-module Admin build, Admin BFF verifier, and 696-file secret scan pass. This is
prepared, not live; permanent migration/secret/flag cutover, deployed denials,
storefront validation/redemption continuity, and staff acceptance remain.
Exact proof is in `MAP_020_ADMIN_COUPONS_ROLLBACK_VALIDATION_2026-08-12.md`.

**Prepared Admin customer-directory evidence (12 August 2026):** the existing
MAP-019 production proof shows canonical customer/contact/account/channel/guest
identity objects are not live and conversations still use direct Auth-user
ownership. The current browser directory reads full `user_profiles` rows and can
represent only registered Customer/VIP accounts. An inactive Admin-only BFF read
now returns one fixed bounded canonical identity projection when MAP-019 exists,
or an explicitly labeled registered-profile fallback while it does not. It never
merges by name/contact, and order/Pasabuy/conversation/value/unread metrics become
unavailable rather than zero if any supporting query fails. The four-skill UI
uses the established Admin system, 44px refresh, desktop register plus phone
cards, and complete loading/empty/permission/partial/error states without raw
provider errors or invented customer actions. Thirty-six contracts and a
699-file secret scan pass. A fresh provider query and the post-change production
build could not run because the connected execution quota was exhausted; they
remain explicitly pending, so this is not live or build-verified. Account claim,
customer detail commands, support capabilities, permanent identity activation,
deployed ownership/IDOR tests, and staff acceptance remain.
Exact proof is in `MAP_020_ADMIN_CUSTOMERS_PREPARED_VALIDATION_2026-08-12.md`.

### MAP-021 — Browser security, safe errors, dependencies, and separate build integrity

**Status:** Queued; depends on MAP-019 and MAP-020

**Prepared build-integrity evidence (12 August 2026):** target-specific app
entries now use distinct Storefront and Admin contexts. The production verifier
rejects both forbidden manifest modules and compiled cross-artifact runtime
markers. Current separate builds pass this stronger check. This proves local
artifact isolation only; CSP/headers, dependency remediation, deployed bundle
inspection, source-map checks, and real-host evidence remain.

**Deliver:**

- Keep React’s escaped plain-text rendering; prohibit unreviewed HTML. Where
  rich content is explicitly required, use a reviewed allowlist sanitizer plus
  context-appropriate output encoding.
- Replace raw database/provider/stack messages with stable user-safe error codes,
  recovery guidance, and correlation IDs. Detailed errors stay server-side and
  are redacted before logging.
- Add Content Security Policy in report-only mode, resolve violations, then
  enforce it. Add frame, content-type, referrer, permissions, cache, and
  cross-origin headers intentionally; enable HSTS only after every production
  host and subdomain is verified HTTPS.
- Audit dependencies and lockfile with current vulnerability data; remove unused
  packages; apply compatible patched versions; configure automated dependency
  alerts/updates; and retest rather than blindly upgrading major versions.
- Enforce storefront/admin module, route, environment, asset, source-map, and
  secret boundaries. The storefront artifact must contain no admin code; the
  admin artifact must contain no storefront/customer route assumptions.
- Test production bundles for secrets, service-role/secret keys, source maps,
  debug flags, localhost URLs, stack leakage, mixed content, and wrong target.

**Complete when:** security header/CSP tests pass on real builds; user errors leak
no internals; dependency audit has no unresolved launch-severity issue; and both
separate artifacts pass boundary and secret scans.

**Record in:** Vercel configs, error/log utilities, dependency configuration,
build/bundle checks, security test report, design record, and System Brain.

### MAP-022 — Security logging, incident response, alerts, backups, and provider controls

**Status:** Queued; depends on MAP-016 through MAP-021

**Deliver:**

- Define security events for authentication, MFA, reset, session/revocation,
  authorization denial, RLS denial, rate limiting, bot challenge, suspicious
  uploads, webhook failure, credential/admin changes, destructive operations,
  exports, and repeated errors. Include actor/session/correlation/time/action/
  outcome without logging secrets, raw tokens, passwords, card data, or excess PII.
- Protect logs from public writes/reads, injection, tampering, and storage abuse.
  Aggregate/sample attack noise and establish retention appropriate to the free
  plan. Create actionable alerts and a daily review surface without fabricating
  “real-time monitoring.”
- Configure and record available Supabase and Vercel usage/billing/firewall/Auth/
  database alerts. Verify ownership and 2FA for Supabase, Vercel, GitHub, domain
  registrar, primary email, and any future payment/channel provider.
- Because Supabase Free does not include automatic backups, implement a no-paid-
  plan backup procedure for database and required Storage objects using
  encrypted, access-controlled, owner-controlled storage. Never place database
  credentials or plaintext backups in GitHub artifacts/source.
- Define backup frequency, retention, integrity checks, recovery point/recovery
  time expectations, key custody, restore environment, and deletion. Execute a
  documented restoration rehearsal using non-production or safely isolated data.
- Create incident procedures for exposed key, account takeover, malicious upload,
  credential stuffing, webhook abuse, customer-data exposure, database damage,
  and provider outage, including containment, rotation, evidence, notification,
  recovery, and post-incident review.

**Complete when:** provider-control evidence exists; alerts produce tested
signals; attack activity is attributable without secret leakage; encrypted
backups run and pass integrity checks; and a restore rehearsal meets the recorded
recovery expectations.

**Record in:** security event schema/dashboard, provider configuration matrix,
backup/restore scripts and runbook, incident-response runbook, tests, operations
rulebook, and System Brain.

### MAP-023 — Operational completion and representative launch-data rehearsal

**Status:** Queued; depends on MAP-017 through MAP-022

**Why needed:** the prior MAP-003 through MAP-012 completion evidence largely
proved files or strings rather than live schema, permissions, transactions,
failure recovery, and representative data. Seed claims cannot substitute for a
reconciled production rehearsal.

**14 August scope audit:** IDEA-20260814-01 through IDEA-20260814-04 were audited
against the rulebook, System Brain, Admin audit, current storefront/Admin code,
and this queue. They are accepted by merge here (with identity/session portions
in MAP-019), because they close named product and operational loops and require
no new external connector. Evidence includes the partial Suppliers/Purchase
Orders/Globe CMS capabilities, mailto-only wholesale handoff, split website and
legacy order storage, incomplete exception recovery, in-memory confirmation,
catalog failure/empty ambiguity, unimplemented latest-sort ordering, misleading
zero-stock cart behavior, and an unapproved hard-coded Pasabuy response promise.

**Lots/expiry audit and prepared-correction evidence (12 August 2026):** read-only production inspection
found 21 lots, all currently `available`, with no negative, over-reserved,
availability-mismatch, missing positive-stock expiry/hub/custodian, unsafe
0–30-day available, or unapproved 31–89-day clearance rows. No batch-change
events exist yet. RLS is enabled and direct mutation RPC execution is denied to
anonymous but still granted to authenticated staff. The browser editor still
selects full lot rows, exposes provider errors, uses a browser prompt for
clearance, and applies the generic reason `Batch editor reconciliation`. More
importantly, the current reconcile RPC writes `quantity_available = quantity`
on update rather than `quantity - reserved_quantity`; its stock view sums total
physical quantity rather than eligible sellable availability, and the expiry
view uses the greater of physical and available quantity. These are verified
future-corruption/reporting risks even though current rows are clean. The fixed
projection, signed reasoned commands, trigger/view correction, mobile interface,
and rollback rehearsal are now prepared as recorded under MAP-020. Permanent
cutover, deployed denial testing, fulfillment/custody regressions, richer
disposition evidence, and representative staff acceptance remain required here.

**Deliver:**

- Converge website, direct, wholesale, Pasabuy-derived, marketplace, and future
  demand through one canonical order/reservation/fulfillment contract. Migrate or
  adapt legacy `orders` and `order_requests` deliberately; never maintain two
  stock, customer, payment, settlement, or reporting truths.
- Give every reservation an owner, exact lot/quantity, reason, created time,
  hold deadline or documented non-expiring basis, extension history, and one
  idempotent release/consume path. Cancellation, quote/order expiry, payment
  rejection/timeout, failed confirmation, partial fulfillment, failed delivery,
  return, exchange, and refund must release, retain, transfer, quarantine,
  restock, or write off the exact units with an immutable reason. The production
  hold-duration policy requires the owner decision; no duration is invented.
- Complete suppliers and purchasing from approved supplier and purchase order
  through actual purchase, currency/FX, flight or supplier receipt, shortage/
  damage variance, lot creation, payable/settlement, and landed-cost allocation.
  The Product Intake supplier-receipt option remains visibly unavailable until
  this canonical record and command exist.
- Complete wholesale as a first-class but secondary path: secure inquiry,
  organization/buyer approval, immutable quote or approved price list, minimums/
  terms/limits, shared-stock revalidation, canonical order, delivery/payment,
  reorder, exception, and account revocation. No retail browser flag or matching
  contact value may unlock wholesale prices.
- Complete payment evidence and separation of duties; delivery quote/customer
  confirmation; order-first packing/K2 QR/real waybill; marketplace payout and
  direct/Pasabuy settlement; partial refund/full refund; return, exchange,
  cancellation, failed-delivery, partial-fulfillment, and stock-disposition case
  workflows. Money, inventory, and customer communication must reconcile.
- Complete exact-lot custody offer/accept/reject/cancel, partial transfer,
  independent receipt, cycle count/recount, damage, unexpected/wrong item,
  unknown expiry, insufficient shelf life, quarantine, supplier return, and
  write-off evidence. Receiver acceptance—not sender action alone—changes final
  custody.
- Rehearse Product Master/Sheet Mode, resumable intake, bulk catalog import with
  preview/row validation/import identity/idempotent retry, reviewed public
  media/usage, and review/globe CMS moderation, publication, provenance,
  correction, withdrawal, and rights evidence. A file/string check or seeded
  testimonial is not publication proof.
- Make the production storefront catalog use only the reviewed public contract
  and canonical eligible sellable stock. Distinguish loading, genuine empty,
  partial, stale, permission, and query failure; prove lot changes refresh stock;
  define every sort/filter result (including latest); prevent zero/insufficient
  stock from entering a misleading cart; and revalidate price, coupon, quantity,
  shelf life, delivery, and identity on confirmation.
- Rehearse guest/account order and Pasabuy submission through reload-safe status,
  scoped messages, account claim, payment/delivery facts, cancellation/expiry,
  and recovery on phone and laptop. Customer-facing SLA, freshness, authenticity,
  ratings, stock, delivery, payment, and connector claims require attributable
  evidence or explicit unavailable/estimate wording.
- Complete the Admin action center around canonical next action, blocker, owner,
  deadline/freshness, permission, failure, and recovery. Exercise universal
  inbox/attachments/evidence, actionable alerts, KPI formulas and record-level
  drilldowns, channel capability readiness, and mobile warehouse/staff work
  without treating query failure as zero or manual copy as delivered.
- Run evidence-backed end-to-end rehearsals for Italy flight/box/manifest scans,
  Manila independent receipt/reconciliation, lots/FEFO, coupons, Pasabuy,
  permissions, retries, concurrency, and every workflow above using reviewed
  representative records—not fake success data.

**Complete when:** purchase, inventory, reservation, order, wholesale, payment,
delivery, settlement, exception, and custody quantities/money/states reconcile;
failures, expiry, cancellation, concurrency, and retries neither strand stock nor
duplicate/corrupt truth; storefront failure cannot masquerade as empty/sold out;
every KPI and action-center item drills to canonical records; staff can complete
and recover their real daily workflows on phone and laptop; customers can submit,
reload, and follow guest/account/approved-wholesale requests; public proof is
attributable; and unresolved external adapters remain truthfully manual/
unconnected.

**Record in:** acceptance fixtures and results, relevant workflow runbooks,
operations rulebook, System Brain, and production-data health report.

### MAP-024 — Separate Vercel production projects, HTTPS, domains, DNS, and Auth callbacks

**Status:** Queued; configuration audit may begin after MAP-021; activation
depends on MAP-023 and the exact domain/DNS answer in `OWNER_QUESTIONS.md`

**Deliver:** two genuinely separate Vercel projects and production artifacts;
per-project/per-environment variable matrix; storefront canonical host and apex
redirect; dedicated admin host; DNS preservation; TLS/HTTPS verification; HSTS
only after all hosts are correct; noindex/admin cache policy; CSP/security
headers; Supabase Auth/OAuth/reset allowlists; cookie domain/scope; CORS/Origin
allowlists; sitemap/robots/canonical/social metadata; rollback procedure; and
real-host smoke tests. Never rely on hostname guessing or paid deployment
protection that is unavailable.

**Complete when:** the owner-approved storefront/admin domains resolve only to
their intended projects; HTTPS/certificates/redirects/cookies/Auth callbacks/
headers work; no cross-artifact code or secrets ship; and rollback is proven.

**Record in:** Vercel/DNS/Auth configuration matrix, deployment runbook, build
checks, domain smoke tests, System Brain, and owner decision record.

### MAP-025 — Full security, staff, customer, and production launch proof

**Status:** Queued; final active item; depends on MAP-016 through MAP-024

**Deliver:** real automated and manual evidence for secret containment; schema
drift; grants/RLS/RPC/Storage; IDOR; RBAC/AAL2; guest/account ownership; BFF
cookies/CSRF/session expiry/revocation; injection/XSS; upload safety; rate limits;
bot protection; CORS; webhook forgery/replay; error/log redaction; headers/CSP/
HTTPS; dependency and bundle audits; backup/restore; both production builds;
both real domains; mobile/desktop accessibility and workflow acceptance;
representative storefront/admin operations; and rollback/incident response.

**Complete when:** every release check exercises behavior and expected denial,
not filenames or UI text; production configuration is directly verified; no
launch-severity finding remains; external payment/marketplace limitations are
displayed honestly; owner/staff acceptance is recorded; final behavior is moved
to the rulebook/System Brain/runbooks; and MAP-025 is deleted so this plan is
truthfully empty.

**Record in:** automated tests, signed acceptance report, deployment/security/
backup/incident runbooks, operations rulebook, System Brain, and Git history.


## Constraints outside the active queue

These are acknowledged limitations, not current tasks. They enter the plan only
after their dependency becomes available and a fresh audit accepts the work:

- online payment gateway and automatic refunds;
- paid Vercel or Supabase capabilities;
- real Shopee, TikTok Shop, Lazada, Meta, WhatsApp, or other adapters requiring
  approved credentials/scopes;
- Google OAuth credentials;
- paid messaging, monitoring, analytics, email, or SMS services.
