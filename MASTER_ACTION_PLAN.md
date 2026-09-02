# K2 Jimzon Master Action Plan

**Status:** authoritative queue for all approved, unfinished project work

**Last audited:** 1 September 2026

**Active MAP item count:** 12 unfinished top-level items (`MAP-017` through
`MAP-028`)

**Current next item:** MAP-017 schema/grants/RLS remediation. Read-only and local
rehearsal work may continue; permanent production activation requires the
authorization recorded as `OWNER-005`. Authorization and a named production
application-database backup/loopback restore and a complete Storage object-byte
backup/local restore exist and are verified. As of 28 August 2026 all eight
encrypted/redacted artifacts in the owner-only Drive folder pass independent
retrieval/SHA-256 checks, and the Drive-retrieved 64 MiB chunk reassembles with
its counterpart into the exact original archive digest. **The only remaining
activation gate is owner recovery-access proof.**

This is the only active project backlog. If work is not listed here, it is not an
approved implementation task. Other audits, roadmaps, blueprints, and idea files
may explain context, but they must not maintain competing task lists.

The goal is to make this file empty. Completed items are not kept here.

## Four-bucket planning navigation

Every project thought or piece of work has exactly one home. These labels are
navigation buckets, not four competing backlogs:

| Bucket | What belongs here | Authoritative location |
| --- | --- | --- |
| **Necessary** | Non-negotiable mission, security, data-integrity, dependency, verification, and documentation rules that govern all work | This file's Product mission, source-of-truth, lifecycle, audit-gate, execution-rule, and design-rule sections, plus the operations rulebook |
| **Active** | Approved work that is still unfinished, whether its item state is Queued, Active, Blocked, or Ready for independent verification | This file's Execution dashboard and Active work sections only |
| **Future** | Every newly raised idea while it is awaiting the MAP audit gate | `K2 Jimzon - Brain/FUTURE_IDEAS.md` Pending idea intake |
| **Done** | Verified behavior and the evidence showing what changed; never remaining work or unchecked promises | System Brain, the applicable rulebook/runbook/test/migration records, the Future Ideas decision register, and Git history |

Every Active MAP item is necessary for launch unless its own wording explicitly
marks some scope as conditional. Necessary is therefore a governing category,
not a second list of unfinished tasks.

An idea is captured in Future first, with an ID. Its audit then records a durable
decision in the Future Ideas decision register: rejected, merged, deferred, or
accepted. Accepted unfinished scope moves into Active. Verified work updates the
required truth/evidence records and is deleted from Active. This preserves the
idea and its decision without allowing Future or Done items to inflate the active
queue.

## Next dependency sequence

1. **Database security truth:** implement and execute MAP-017 metadata export,
   exhaustive schema comparison, isolated migration/recovery rehearsal, and real
   authorization denial/allowance tests before any permanent schema activation.
2. **Core customer and staff boundaries:** finish MAP-018 and MAP-019, including
   database activation, guest/account ownership, secure sessions, messaging, and
   real mobile/desktop recovery behavior.
3. **Application hardening:** complete MAP-020, MAP-021, and MAP-022 in order:
   abuse/upload/connector defenses; browser/build security; then logs, alerts,
   incident response, encrypted backups, and a real isolated restore rehearsal.
4. **Operational acceptance:** complete MAP-023 with representative reconciled
   inventory, order, custody, payment, Pasabuy, wholesale, messaging, and failure
   recovery. `OWNER-002`, `OWNER-003`, and `OWNER-004` must be resolved before
   their respective production workflows or public claims are activated.
5. **Production hosts and launch:** resolve `OWNER-001`, complete MAP-024 for the
   separate storefront/admin domains, then execute MAP-025 as the final release
   and owner/staff acceptance gate.
6. **Multi-shop channel operations:** MAP-026 adds per-shop channel accounts and
   custody-based allocation on top of MAP-017 schema/RLS, MAP-020 connector
   security, and MAP-023 operational acceptance. It does not depend on MAP-024 or
   MAP-025 and may proceed in parallel with them once its gates are met.

   **Open owner decision — launch timing.** MAP-025 is written as the final launch
   gate. Whether the first launch must already include multi-shop channel
   operations, or whether MAP-026 lands after an initial storefront launch, is a
   scope decision only the owner can make. It matters because no marketplace
   connector exists yet: Shopee captures signed events only and its database entry
   point is unapplied, while TikTok Shop and Lazada have no connector at all.
   Requiring MAP-026 before launch therefore pulls a substantial unbuilt
   connector programme onto the critical path. Until this is answered, MAP-025
   remains the launch gate and MAP-026 is sequenced after it.
7. **Verified product knowledge and optional Interactive Shop:** MAP-027 follows
   the canonical product, messaging, Pasabuy, security, and operational work. It
   adds one Admin-authored knowledge source and an optional shelf interface over
   the same commerce system. Domain purchase and exact-host SEO activation stay
   in MAP-024 and may remain deferred while platform-neutral MAP-027 preparation
   proceeds.

Owner decisions may be answered early in parallel, but implementation and
activation remain subject to the dependency order above.

**Delegated local batch (15 August 2026):** the owner selected the Antigravity
large-goal envelope for maximum safe local/prepared MAP-017 through MAP-022 work.
This does not waive dependencies or authorize MAP-016 provider changes,
production migrations, deployments, key changes, MAP-023 through MAP-025,
external connectors, completion claims, or MAP deletion. Antigravity must return
phase checkpoints and one evidence-complete handback for Codex correction and
independent verification.

**Delegated-batch result (15 August 2026):** Antigravity returned without
implementing the requested MAP-017 through MAP-022 scope. The only new
engineering retained is an expanded, unexecuted MAP-017 metadata SQL draft.
Codex rejected the unsafe claimed recovery generator; MAP-018 through MAP-022
received no new implementation in that batch. No status or dependency advanced.

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
4. `K2 Jimzon - Brain/FUTURE_IDEAS.md` is the unaudited intake inbox and durable
   idea-decision index; it is never implementation authority.
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
| 1 | MAP-017 | Establish live schema, grants, RLS, RBAC, ownership, and RPC truth | OWNER-005 authorized; named backup, both isolated restores, and the full off-site copy all verified 28 Aug; **only owner recovery-access proof remains** |
| 2 | MAP-018 | Complete phone-first product intake and publication gates | MAP-017 for activation |
| 3 | MAP-019 | Complete hybrid identity, commerce continuity, wholesale identity, and secure sessions | MAP-017; may overlap MAP-018 where independent |
| 4 | MAP-020 | Secure every API, upload, public form, Admin command, and connector boundary | MAP-017 and MAP-019 decisions |
| 5 | MAP-021 | Harden browser errors, headers, dependencies, and separate production artifacts | MAP-019 and MAP-020 |
| 6 | MAP-022 | Complete security events, alerts, backup/restore, and incident controls | MAP-017 through MAP-021 |
| 7 | MAP-023 | Complete and rehearse canonical storefront and Admin operations | MAP-017 through MAP-022; OWNER-002/003 gate policy activation |
| 8 | MAP-024 | Configure separate production projects, domains, DNS, HTTPS, and Auth callbacks | MAP-023 and OWNER-001 |
| 9 | MAP-025 | Produce final security, staff, customer, and production launch proof | MAP-017 through MAP-024 |
| 10 | MAP-026 | Multi-shop channel accounts and custody-based inventory allocation | MAP-017, MAP-020, MAP-023 |
| 11 | MAP-027 | AI-assisted verified product knowledge and optional Interactive Shop | MAP-018, MAP-019, MAP-020, MAP-021, MAP-023; exact-host SEO remains MAP-024 |

**Current execution command:** prepare and independently verify a named
production backup/restore point for MAP-017. `OWNER-005` authorizes the exact
phase-one migration, but the guarded executor must not run until its backup ID,
restore verification, project/payload/ledger gates, and recovery acknowledgement
all pass.

**15 August independent handoff closeout:** Codex reviewed Antigravity's large
MAP-016-through-MAP-025 handoff and rejected it as completion or launch proof.
All ten items remain active in this dependency order; no item was deleted. Codex
restored weakened consignment/database contract assertions, corrected the
deployment runbook's environment-variable, BFF-activation, DNS, and secret-
boundary guidance, and reclassified the submitted encryption scripts as
cryptographic-envelope checks only—not database backup or restore evidence. The
independent local rerun passed 48 API/command contracts, 5 Unified Inbox tests,
4 Admin browser tests, 6 storefront smoke tests, 6 consignment/database source
contracts, both isolated production builds with boundary and bundle-secret
checks, and an npm audit reporting zero vulnerabilities. These results preserve
useful prepared work but do not satisfy provider deployment, live schema/RLS/
RBAC, real backup restoration, representative operations, real-domain, or owner/
staff acceptance requirements. The authoritative verdict is recorded in
`ANTIGRAVITY_HANDOFF/CODEX_REVIEW.md`.

**15 August report-only rerun:** Antigravity subsequently changed only one
MAP-017 test and handoff reports, while presenting pre-existing source/fixture
checks as broad MAP-016-through-MAP-025 engineering evidence. Codex restored the
strict empty `search_path` invariant, rewrote the overstated checkpoints, and
made the static `verify-full-launch-proof.js` presence checker fail closed with
exit 2. Independent reruns passed 69 prepared contracts, 17 selected Chromium
tests, both isolated builds, secret/history scans, and import integrity. No
database authorization behavior, real backup/restore, domain cutover, live
connector, representative operations, or launch acceptance was established;
the dependency queue and statuses remain unchanged.

**21 August architecture-capability audit (IDEA-20260821-01):** the submitted
enterprise web-architecture checklist was audited against the current
Vercel/Supabase deployment, operational rulebook, System Brain, and this queue.
The audit does not create another MAP item or alter dependency order:

- **Required for launch and merged into existing scope:** provider/server rate
  limits; explicit timeouts; bounded retries with exponential backoff and jitter;
  idempotent writes; cache/CDN policy and invalidation; database indexing, query
  plans, N+1 avoidance, concurrency and lock testing; connection-budget checks;
  CI/CD release gates; feature flags; immutable deployments and rollback; health
  checks; logs, metrics, alerts, incident ownership and post-incident review;
  secret/IAM/JWT rotation; TLS and encryption; WAF/bot defense; CORS/CSRF and
  injection/XSS/SSRF defenses; versioned migrations and API/contract compatibility;
  encrypted backups and restore; provider limits/costs; and representative
  latency/throughput/tail-latency evidence. MAP-020 through MAP-025 own these
  checks, with the added explicit completion clauses below.
- **Conditional, not a launch platform requirement:** durable connector inboxes,
  pub/sub, event-driven processing, dead-letter handling, scheduled jobs,
  WebSockets/SSE/polling, and circuit breakers are used only for a proven
  connector, expiry/retry, or real-time workflow. PostgreSQL transactions and
  compensating exception workflows remain the default; do not introduce a
  general message broker, distributed transaction coordinator, or Saga platform.
- **Rejected for the first launch as provider-managed or unjustified:** custom
  load balancers, reverse proxies or API-gateway products beyond the accepted
  BFF/Edge boundary; Docker/Kubernetes/service discovery; read replicas,
  sharding, partitioning, replication control, leader election, distributed
  locks, or multi-region orchestration; custom autoscaling; blue-green/canary/
  rolling systems beyond Vercel previews and immutable rollback; gRPC; Terraform,
  Helm, and chaos engineering. Re-audit only after measured traffic, availability,
  team, compliance, or provider evidence establishes a concrete need.

**22 August 2026 session summary — MAP-016 closed out, MAP-017 given real
evidence for the first time.** Full detail is inside each MAP item; this is the
index.

*MAP-016 — all four remaining blockers closed, now `Ready for independent
verification`:*

- **Root cause of the long stall found.** Deployed `invite-staff` could never
  succeed for any caller. It requested the assurance level without passing the
  access token, so the auth library fell back to a session lookup that a
  header-only client never has, and every caller — including a genuine AAL2
  Admin — was refused. This is why the receipt table had stood at zero. The
  contract suite passed throughout because its mock returned `aal2`
  unconditionally. Fixed, regression-tested against the pre-fix handler, and
  deployed as version 6.
- **Real Admin AAL2 invitation** completed in production, 12/12 checks, zero
  residual test records. First completed staff invitation this system has made.
- **Legacy HS256 signing key revoked**, and the exposed service-role token
  confirmed to move from elevated access to HTTP 401.
- **Vercel environment contract passing** after a first capture failed with five
  real findings, including a stale `VITE_SUPABASE_ANON_KEY` holding the disabled
  legacy anon JWT.
- **Repository defect repaired:** `SystemDevOpsModal.jsx` had been deleted while
  still imported, breaking the Admin build and therefore the entire local gate.
  Restored, then rewritten to satisfy the diagnostic boundary contract.

*MAP-017 — moved from Queued to Active:*

- The recorded blocker "`psql`, Supabase CLI, and Docker are unavailable" was
  stale; a read-only Management API SQL path exists and the CLI is linked.
- The repository's export SQL had **never been executed**. Running it exposed six
  defects, the worst of which silently returned zero grants, zero constraints and
  zero triggers, producing an export that audits clean while proving nothing.
- Two comparator defects were manufacturing false findings, including 17 false
  `RLS_DISABLED` reports; RLS was independently confirmed enabled on every
  affected table.
- The first true live audit is `NON_CONFORMANT_CRITICAL`, 21 findings, captured
  in `MAP_017_LIVE_SCHEMA_AUDIT_2026-08-22.md`. Anonymous write access to catalog
  tables and the product image bucket is real and confirmed against the catalog.
- The migration ledger is reconciled: only
  `20260812_map017_public_write_boundary_hardening` is genuinely unapplied, and
  it is the prepared remediation for most of these findings.

- A read-only behavioural anon boundary test was added and run against the live
  database: 12/14 pass. Customer and staff data is confirmed **not** anonymously
  readable. Two real failures: `products_old` exposes all 14 rows to anonymous
  callers, and anonymous callers cannot read `v_product_stock_from_batches`,
  which is throwing HTTP 401 on the live storefront right now.

*Deployment hazards — two, both recorded in full below:*

1. The uncommitted `src/context/StoreContext.jsx` would render an empty
   production catalogue while the `v_product_stock_from_batches` anon grant is
   missing. Restore the grant before deploying that file. Detail is in MAP-017.
2. `20260822_catalog_spreadsheet_commit.sql` revokes staff write access to
   `public.products` while four Admin screens still write it directly and the
   replacement route is unpromoted. Do not apply it yet. The companion
   `20260822_admin_product_master_boundary.sql` carries the same hazard for
   product deletion. Detail is in the uncommitted-work inventory.

*Working tree documented:* the previously unrecorded 79 modified / 52 untracked /
1 deleted files are now classified in "Uncommitted working-tree inventory", using
two independent review agents plus direct verification. That inventory also
records which untracked files are already live in production, which are enforced
CI gates, and which are inert.

*Owner:* `OWNER-005` raised in `K2 Jimzon - Brain/OWNER_QUESTIONS.md` to
authorize that one production migration. No DDL was applied in this session.

*Independent agent review (22 August 2026).* The session's changes were reviewed
by separate code-review and security-review agents. Both returned **zero critical
and zero high findings**. The security review verified the AAL2 gate line by line
against the actual `@supabase/auth-js` source rather than the code's own comments,
and confirmed it fails closed: the same `accessToken` is threaded through
`getUser()`, `readAssuranceClaim()`, and `getAuthenticatorAssuranceLevel()` with
no token-substitution path, and forged, `alg:none`, expired, or mutated tokens are
rejected by the server-side `getUser()` check before any claim is trusted. Four
lower-severity items were raised and all four were acted on:

1. **Migration matcher was untested in its real shape** (MEDIUM). Every fixture
   stored `version` as the literal slug, which satisfied the exact-match branch
   before slug normalization was reached, so the new logic had no coverage. A test
   now exercises the real `{version: "20260809163606", name: "operations_hardening_20260809"}`
   shape and asserts a true positive, a true negative, a near-miss decoy, and both
   superset and truncated slugs. Confirmed to fail when the matcher is changed
   from exact-after-normalization to substring matching — the regression that
   would let an unapplied security migration read as applied.
2. **`.gitignore` did not cover generated schema evidence** (LOW). A stray
   `live-schema-metadata.json` describes the full authorization model — RLS
   predicates, grants, function signatures and search_path config — and could be
   swept into a commit. Now ignored, while the name-only
   `scripts/map016-evidence/vercel-env-inventory.json` stays deliberately tracked.
3. **Windows `shell:true` argument handling** (LOW). Shell-invoking a `.cmd`
   concatenates rather than escapes arguments. Every argument is now validated
   against a strict identifier allowlist and the script refuses anything else;
   verified by rejecting an injected `k2 & calc` project name.
4. **`hasSafeFixedSearchPath` leniency** (MEDIUM, audit quality). Raised as
   possibly giving false assurance for SECURITY DEFINER functions. Investigated
   rather than patched, because the obvious "fix" would have been wrong: naming
   `pg_temp` last is the PostgreSQL-documented hardening, not a defect, and
   `public.process_audit_log()` uses that correct form. The live check that
   matters is whether an untrusted role can create shadowing objects in `public`.
   Measured: only `pg_database_owner` holds CREATE on `public`, so `anon` and
   `authenticated` cannot. The 38 `search_path=public` functions are therefore not
   shadowable today. The assumption is now documented at the check itself, with
   the condition that would invalidate it.

*Verification for the whole session:* `verify:map016-local` exit 0, security gate
exit 0, 118 contract tests passing, 817-file secret scan clean, both isolated
production builds passing, `invite-staff` 12/12 after key revocation, and both
production hosts returning HTTP 200.

## Independent verification — 25 August 2026

This section is a verification record, not a second backlog. It records what an
independent rerun proved, and where the Antigravity audit
(`docs/PROJECT_AUDIT.md`, `docs/AUDIT_FINDINGS.md`, `docs/AUDIT_ACTION_PLAN.md`)
was confirmed, corrected, or found incomplete. All implementation scope stays in
the MAP items below.

**Suites rerun independently — 13/13 pass.** `prebuild` (secret scan 915 files,
0 unexpected anon/PUBLIC function grants, 0 wildcard CORS); `build:storefront`
(19 manifest modules); `build:admin` (21 manifest modules); `test:contracts`
(179/179); `test:smoke` (8/8); `test:customer-account-ui` (3/3); and all seven
portable PostgreSQL rehearsals for MAP-017, MAP-018 cleanup, MAP-019 staff
invite, MAP-019 MFA replacement, and the three MAP-020 rate/ingress suites.

**Correction to the audit's own evidence block:** it reports "PORTABLE
REHEARSALS: PASS (6/6)". There are seven portable suites and all seven pass.
The audit undercounts its own coverage.

**Live-database findings independently reconfirmed** against
`live-schema-metadata.json` (exported 24 August 2026) and one read-only
unauthenticated REST probe:

- Anonymous `INSERT/UPDATE/DELETE/TRUNCATE` is present on `brands`,
  `categories`, `warehouses`, `product_drafts`, and `products_old` — 29 public
  anonymous write grants across 8 objects.
- **The audit's exposed-object list is incomplete**, though less severely than
  the raw grants suggest. `v_channel_catalog_readiness` and `v_expiring_batches`
  also carry full anonymous write grants, so MAP-017 remediation should cover
  all eight objects — but both are `security_invoker` views over base tables
  `anon` cannot touch, and both return HTTP 401 live. They are grant hygiene,
  not active exposure. Detail and the correction to this plan's earlier
  "anon-selectable" wording are recorded in MAP-017.
- `v_product_stock_from_batches` has **zero grants to any role**, not merely a
  missing `anon` grant. An unauthenticated read returns HTTP 401 while the
  control read of `products` returns HTTP 200.
- The mechanism behind that 401: the view is `security_invoker=true` over
  `product_batches`, which grants SELECT to `authenticated` only. The sibling
  view `v_expiring_batches` already holds the `anon` SELECT grant and still
  returns HTTP 401 — an empirical control in the same database proving a bare
  view grant cannot work. **A first pass concluded from this that the prepared
  migration was insufficient. That conclusion was wrong and is retracted.**
  Reading the migration shows it already routes the projection through a
  fixed-search-path `SECURITY DEFINER` function precisely because of this
  constraint. AUD-002's one-line description of the remedy understates the
  migration; the migration itself is correct. Detail in MAP-017.

**Findings the audit under-reported:**

- `PhotoManagerModal.jsx` (line 81) is a fourth shipped browser-authenticated
  direct writer to `public.products`, and `DeleteProductsModal.jsx` (line 115)
  calls `delete_products_with_pin_v2` directly against a second revoke
  migration. Both are now recorded in the uncommitted-work inventory.
- The audit assessed only committed code. It therefore did not report the
  uncommitted `src/context/StoreContext.jsx` deployment hazard already recorded
  in this plan: the committed file tolerates the 401 by falling back to
  `p.stock_available`, but the modified file publishes a snapshot only when both
  reads succeed, so deploying it while the grant is missing renders an **empty
  production catalogue**.
- `npm run test:smoke` cannot detect that condition. It runs against
  `npm run dev:storefront`, and the catalogue memo returns local mockups when
  `import.meta.env.DEV` is true and `[]` only in a production build. The green
  smoke suite is not evidence that the live catalogue renders.

**Findings corrected or rejected:**

- **AUD-012 is not reproduced and its evidence does not match the code.** It
  cites a 5-second timeout at `tests/smoke.spec.js` lines 35–44; the consignment
  test is at line 44 and uses 15-second timeouts. All 8 smoke tests passed on
  the first attempt with 0 retries. Do not schedule work for it.
- **AUD-011's line counts are stale.** `ProductIntakeSessionModal.jsx` is 1,217
  lines (not 1,147) and `InventoryGrid.jsx` is 976 lines (not 907).
- **AUD-016 cites a file that does not exist.** The wholesale intake leaf is
  `prepared-api/storefront/wholesale.js`, not `wholesale-inquiry.js`.
- **AUD-004's stated bundle cost is overstated.** `ProductDetail.jsx` builds to
  its own 13.68 kB lazy chunk that is never requested, because no `setView`
  call site reaches the `product` key. The real cost is maintenance ambiguity,
  not download weight.

**Reconciliation against this backlog.** No new MAP item is created; every
finding is folded into MAP-017 through MAP-024 as scope. A first pass treated
AUD-006 and AUD-017 as already covered. Re-checking showed both appeared only as
narrative and evidence caveats with no task anyone could execute, so both now
carry explicit deliverables.

| Finding | Disposition |
| --- | --- |
| AUD-001 | MAP-017 (`20260812_..._public_write_boundary_hardening.sql`, `OWNER-005`). Deliverable widened from 5 to all 8 exposed objects |
| AUD-002 | MAP-017. Confirmed live (HTTP 401); the prepared migration already fixes it correctly via a definer function. AUD-002's one-line remedy description understates it. Gated only on `OWNER-005` |
| AUD-006 | **Was narrative only.** New ordered BFF cutover procedure in MAP-024, steps 1–2 |
| AUD-007 | Hold retained in the uncommitted-work inventory, corrected to four surfaces plus the delete RPC. Execution order is MAP-024 steps 3–5 |
| AUD-008 | Already MAP-017 ledger reconciliation. No change needed |
| AUD-009 | Already MAP-024 (`sitemap/robots/canonical/social metadata`); noted that no `robots.txt` or `sitemap.xml` exists yet, so it is build work |
| AUD-013 | Already MAP-024 and `OWNER-001`. No change needed |
| AUD-015 | Already MAP-022 backup/restore. No change needed |
| AUD-017 | **Was narrative only.** New MAP-017 deliverable to bound anonymous `error_reports` insertion and prove it with a flood test |
| AUD-003, AUD-010 | New scope in MAP-024, with AUD-003 recorded as a prerequisite for AUD-009/AUD-010 |
| AUD-004, AUD-005 | New scope in MAP-021 |
| AUD-014, AUD-018 | New scope in MAP-023 |
| AUD-012 | Rejected — not reproduced, evidence does not match the code |
| AUD-011, AUD-016 | Not admitted. AUD-011 is unaudited refactor scope; AUD-016 depends on a provider credential the audit gate excludes. Both belong in `FUTURE_IDEAS.md` intake |

**Clarified dependency.** AUD-009's sitemap and AUD-010's canonical/structured
metadata cannot function while the storefront has no URL paths. AUD-003 URL
synchronization is therefore a prerequisite *within* MAP-024, not independent
P2 work as the audit action plan states.

### Codex worktree merge — 25 August 2026

A second git worktree existed at `C:/Users/jerze/.codex/worktrees/86a3/K2 JImzon`,
detached at `26291bc`, two commits behind `main`, with 24 modified and 42
untracked files last touched 15 August 2026. It is the working copy from the
15 August delegated batch this plan records as rejected. Every file in it was
compared against `main` before anything was taken.

**Most of it was superseded, as expected.** `main` is a strict superset for the
planning documents and the MAP-017 tooling — `schema-truth-core.mjs` 971 lines
against 447, `apply-map017-migration.mjs` 457 against 176 — and all four apply
gates (`--confirm-project`, `--confirm-authorization`, `--confirm-backup-verified`,
`--confirm-ledger-aligned`) plus `--dry-run` were verified still present in
`main`. Seven files differed only by line endings. Nothing there needed merging.

**One real regression was found and is now restored.** `scripts/schema-truth-audit.mjs`
had lost its evidence-level banner, and `tests/schema-truth-tool.spec.js` had lost
the two tests that guard it. Every audit report now opens with either
`FABRICATED_FIXTURE_PARSER_CHECK_ONLY` — "not database drift or authorization
evidence" — or `EXPLICIT_SCHEMA_EXPORT_AUDIT` — "verify the export provenance and
capture time before treating it as database evidence" — in both console output and
saved Markdown/JSON artifacts. Without it a fabricated fixture run and a live
export audit produced visually identical reports, which is precisely how a
self-authored fixture gets quoted as proof about the live database. This is the
same overclaiming failure this plan keeps having to correct, and the guard against
it had been silently dropped. Contract suite is now **181 passing**, up from 179.

**The handoff record is restored.** `ANTIGRAVITY_GEMINI_MASTER_INSTRUCTION.md`,
which this plan references in its delegated-implementation section and which had
been deleted from the working tree, is back — resolving a dangling reference.
`ANTIGRAVITY_HANDOFF/` and its nine MAP checkpoints are back as well. Four of
those files carried later uncommitted Codex refinements than `main`'s committed
copies, including the `CODEX_REVIEW.md` paragraph describing the very
evidence-label regression above; the worktree versions were taken for those. The
folder states its own scope: it is an evidence relay, not a backlog, and this file
remains the only source of scope and order.

*Verified after the merge:* `npm run prebuild`, `npm run build:storefront`,
`npm run build:admin` all pass, and `npm run test:contracts` passes 181/181.

The worktree itself is now redundant and still sits on a detached HEAD, where any
commit would land on no branch. Removing it is an owner decision and has not been
done.

### Independent full audit — 25 August 2026

A second pass audited the project and website directly rather than checking
another report. Four new findings were raised and filed as scope in MAP-021,
MAP-023, and MAP-024: the Admin manifest leaking into the public storefront
artifact through a hole in the build-boundary verifier; admin modal accessibility
never propagating past MAP-018; `MasterProduct.jsx` and `GuestMessages.jsx`
carrying no test coverage; and `index.html` shipping no share or icon metadata.

One correction to this plan's own text: the Admin delete PIN is **4 digits**, not
the 6 that AUD-014 and an earlier revision of this section stated. UI and
database agree on 4, paired with hashing and a 5-attempt / 10-minute lockout.

**Audited and clean — do not re-open without new evidence.** `npm audit` and the
dependency policy gate both report 0 vulnerabilities at every severity. All 42
public tables have RLS enabled and none are policy-free by accident; the only two
with zero policies, `staff_allocations` and `channel_credentials`, are
deliberately deny-all and are never read from the browser. Production hygiene is
genuinely good: 2 `console` calls and 1 `TODO` across 124 source files, with
`ErrorBoundary` correctly placed at both app roots and around the globe section.
The delete-PIN RPC is sound — hashed PIN, bounded attempts, advisory lock against
concurrent deletion. The storefront production host is a documented
`www.<owner-domain>` placeholder, which is `OWNER-001`/MAP-024 work already
tracked, not a separate gap.

**Scope note.** This audit was static plus live read-only: source, live schema
export, built artifacts, dependency data, and unauthenticated REST probes. It did
not cover authenticated Admin runtime behaviour, real-device mobile testing,
colour-contrast measurement, or Lighthouse performance scoring on a deployed
host. Those need a running deployment and remain open.

**First-principles sequencing pass.** A separate reviewer audited the same repo
for unearned complexity. Two of its findings were verified and are filed above:
the three-convention migration directory (MAP-017) and the total absence of
product measurement (MAP-023).

*One of its claims is false and is recorded here so it is not raised again.* It
reported that the BFF endpoints live in `prepared-api/`, which Vercel does not
auto-scan, and therefore need an unplanned rewiring step before they can deploy.
They do not. `api/admin/index.js` and `api/storefront/index.js` exist in the
scanned `api/` directory, and both target configs declare explicit `functions`
and `rewrites` blocks — `vercel.storefront.json` and `vercel.admin.json`, not the
root `vercel.json` the reviewer inspected. `prepared-api/` holds the route leaves
the consolidated entrypoint imports, and a contract test already asserts that
each artifact declares exactly one entrypoint and rewrite. The BFF is wired; only
the fail-closed flags and the ordered cutover in MAP-024 stand between it and
production.

*Its sequencing argument is an owner decision, not an engineering finding, and
this plan does not act on it unilaterally.* The argument is that MAP-020,
MAP-022, MAP-024, and MAP-025 are being built ahead of demonstrated need for a
product with no production traffic, and that the shortest credible path is:
close anonymous write access, ship URL routing, then watch real users before
writing more hardening. That conflicts with this plan's stated dependency order
and with the owner's launch-proof requirement, and the reviewer itself flagged
that it read section headers rather than the full item specs and had not read
`SECURITY_INCIDENT_AND_KEY_ROTATION_RUNBOOK.md`, whose existence suggests a real
incident rather than a hypothetical one. Raise it as an explicit scope question
in `OWNER_QUESTIONS.md` — "may pre-launch hardening depth be reduced in exchange
for earlier real-user signal?" — and keep the current order until the owner
answers. Do not reorder the execution dashboard on the strength of this pass.

## Uncommitted working-tree inventory — 22 August 2026

The working tree holds **79 modified, 52 untracked, and 1 deleted** file. Almost
none of it was recorded here, which is the same condition MAP-016 was raised to
correct. It is classified below so no work is silently lost or silently trusted.
Nothing in this section is deployed unless explicitly marked live.

**Changed by the 22 August session** (everything else predates it):
`MASTER_ACTION_PLAN.md`, `MAP_016_RECOVERY_EVIDENCE.md`, `OWNER_QUESTIONS.md`,
`SYSTEM_BRAIN_CURRENT.md`, `package.json`, `.gitignore`,
`supabase/functions/invite-staff/handler.ts`, `supabase/export-schema-metadata.sql`,
`scripts/schema-truth-core.mjs`, `src/views/admin/SystemDevOpsModal.jsx`,
`tests/edge-function-invite-staff.spec.js`, `tests/schema-truth-tool.spec.js`,
plus new `scripts/map016-evidence/`, `scripts/map017-evidence/`, and
`MAP_017_LIVE_SCHEMA_AUDIT_2026-08-22.md`.

**Live in production today, unconditional — not gated by any flag.** These are
untracked files that already affect real users, so they carry deployment risk
despite never having been committed or recorded:

| File | Effect | MAP |
| --- | --- | --- |
| `src/lib/fetchWithTimeout.js` | Abortable deadlines plus bounded retry with backoff/jitter; imported by 21+ files including ordinary Supabase calls | MAP-021 |
| `src/lib/safeUiError.js` | Allowlisted error-code to safe-message mapper used across admin views | MAP-021 |
| `public/theme-init.js` | Same-origin pre-render theme bootstrap replacing an inline script, enabling CSP without `'unsafe-inline'` | MAP-021 |

**Enforced build/CI gates — active, though much of what they audit is not.**
`scripts/audit-security-surfaces.mjs` (+ inventory/policy cores),
`scripts/verify-dependency-policy.mjs`, the `sensitive-file-policy` family, and
the `deployment-environment-contract` / `environment-source-boundary` families all
run in `prebuild` and `.github/workflows/ci.yml`.
`scripts/rehearse-catalog-spreadsheet.mjs` runs in CI against a provisioned
PostgreSQL 17 service; locally it correctly reports
`BLOCKED_LOCAL_DATABASE_UNAVAILABLE` and exits 2 rather than passing vacuously.

**Prepared and locally deployable, but inactive and unproven on Vercel.** The Admin/storefront BFF surface —
`prepared-api/admin-router.js`, `prepared-api/storefront-router.js`,
`server/admin-bff/router.js` (56 Admin routes), `server/storefront-bff/router.js`
(10 routes), the catalog spreadsheet export/import handlers, `security-events`,
and the session registry/revocation handlers — is referenced only by tests and the
surface auditor from browser code while both browser flags remain false. Two
guarded deployable entrypoints now exist at `api/admin/index.js` and
`api/storefront/index.js`; each also requires its matching deployment target and
independent server-only BFF switch.

**The empty-`api/` structural blocker is removed locally, not activated.** Each
Vercel configuration declares one exact consolidated entrypoint and catch-all
rewrite. `K2_ADMIN_BFF_ENABLED=false` and
`K2_STOREFRONT_BFF_ENABLED=false` are the fail-closed server defaults; changing
only a browser `VITE_*` flag still yields a minimal `404`. Official Vercel
function discovery means the configuration's `functions` map is not proof that
the other source entrypoint is absent from an artifact. A real preview function
inventory must therefore prove one intended function per separate project,
followed by real-host route/origin/session/CSRF denial tests. No provider
environment, feature flag, deployment, or database boundary changed in this
local promotion.

**Documentation-only evidence.** `CATALOG_SPREADSHEET_RUNBOOK.md` (MAP-023),
`DATABASE_BACKUP_AND_RESTORE_RUNBOOK.md` (MAP-022),
`PROVIDER_LIMITS_AND_CAPACITY_RUNBOOK.md` (MAP-021), and `.github/dependabot.yml`
(MAP-021, configured but never yet executed remotely).
`scripts/rehearse-database-backup-restore.mjs` exists and performs a real
`pg_dump` → AES-256-GCM → `pg_restore` round trip, but it is **not referenced in
CI** and no production backup destination or schedule exists. MAP-022 must not
treat it as backup coverage.

**Five untracked, unapplied migrations (~1,120 lines of SQL).** Independently
reviewed 22 August. They are additive apart from one deliberate revoke, introduce
no policy at all (access is `revoke all` plus SECURITY DEFINER functions, so there
is no blanket `USING (true)` risk), and every SECURITY DEFINER function in the
batch pins `search_path = ''`. Grants are narrow: the four staff RPCs are
`authenticated`-only with internal `is_staff`/`is_admin` + AAL2 checks, and
`prune_security_events_v1` is `service_role`-only.

> **DO NOT apply `20260822_catalog_spreadsheet_commit.sql` yet.** Its line 398
> runs `revoke insert,update,delete on table public.products from authenticated`.
> That is a hard cutover, and four shipped Admin surfaces still write
> `public.products` directly with the browser's authenticated session —
> `InventoryGrid.jsx` (lines 316, 319, 350), `Sheet.jsx` (line 148),
> `SmartPasteModal.jsx` (line 138), and `PhotoManagerModal.jsx` (line 81).
> All six call sites were confirmed present on 25 August 2026.
>
> `PhotoManagerModal.jsx` was added to this inventory by the 25 August
> independent verification. It is imported by both `InventoryGrid.jsx` and
> `Sheet.jsx`, so applying the migration also breaks product photo saving —
> a surface no previous hazard note listed.
>
> A second, separate revoke carries the same hazard: `20260822_admin_product_
> master_boundary.sql` (line 22) revokes execute on
> `delete_products_with_pin_v2` from `authenticated`, while
> `DeleteProductsModal.jsx` (line 115) still calls that RPC directly from the
> browser. Applying it before Admin BFF cutover breaks product deletion.
> The replacement leaf path exists under `prepared-api/admin/catalog-import/*`
> behind the new inactive consolidated `api/admin/index.js` entrypoint. It has
> not been deployed, server-enabled, browser-enabled, or proven on a preview.
> Applying this migration alone still breaks product
> creation, inline spreadsheet editing, bulk status change, and bulk paste in
> production. The migration's own preflight checks only that the BFF foundation
> and identity columns exist; it does not and cannot detect that the application
> has not cut over. A rollback exists (`supabase/catalog_spreadsheet_rollback.sql`,
> which correctly re-grants `insert,update` while deliberately withholding
> `delete`), but it is a manual out-of-band step, not an automatic guard.

**Filename order is not dependency order.** `catalog_spreadsheet_commit` sorts
before `catalog_spreadsheet_identity` alphabetically, but commit's preflight hard
requires identity's `catalog_id` / `catalog_record_version` columns. Applying in
filename order raises an exception and aborts — it fails closed transactionally
with no partial damage, but it proves filename order cannot be trusted. Verified
safe order:

1. `20260821_function_execute_lockdown.sql` — pure privilege tightening; revokes
   EXECUTE on seven trigger functions (trigger firing does not need EXECUTE) and
   two legacy `receive_po*` RPCs with zero callers. Safe now.
2. `20260822_admin_session_registry.sql` — independent; see the RLS gap below.
3. `20260822_catalog_spreadsheet_identity.sql` — additive and idempotent, with a
   one-time `gen_random_uuid()` backfill before `set not null`. Safe now.
4. `20260822_security_event_boundary.sql` — independent. Safe now.
5. `20260822_catalog_spreadsheet_commit.sql` — **hold** until the app-side cutover
   above is deployed.

None of the five depends on `20260812_map017_public_write_boundary_hardening`, and
none of them touches the tables carrying the live anonymous-DML exposure, so they
neither conflict with nor resolve `OWNER-005`. Applying them also does not repair
the ledger drift; it adds five more entries in a naming convention the ledger does
not track consistently, so they must be applied deliberately in the order above
rather than through `supabase db push`.

**RLS gap closed in the unapplied migration.** `20260822_admin_session_registry.sql`
created `k2_private.admin_sessions` and `k2_private.admin_session_events` with
`revoke all` but without enabling RLS, while every other new `k2_private` table in
the same day's batch enabled *and* forced it. Not exploitable today, because the
revoke denies `anon`/`authenticated` at the privilege layer and access is mediated
only by SECURITY DEFINER functions — but a future grant such as a "my active
sessions" view would have exposed every staff member's session rows with no row
filter. Both tables now `enable` and `force` row level security, matching
`20260822_security_event_boundary.sql`. All seven new `k2_private` tables across
the three migrations are now consistent at 7 enable / 7 force. Safe to change
because the migration is unapplied.

**Corrected before recording:** `20260812_map017_public_write_boundary_hardening`
is **not** applied. One review pass described it as already applied; the live
ledger and the schema audit both show it absent, and the measured audit findings
are consistent with its absence.

**Intentional deletion.** `supabase/functions/_shared/response.ts` is deleted and
must stay deleted: it declares wildcard CORS and has zero importers, and the
security-surface audit asserts zero wildcard-CORS production sources.

**Smoke-test flakiness (undocumented until now).** `tests/smoke.spec.js` passes,
but two launch-critical storefront tests — "home and catalog render without unsafe
payment claims" and "latest consignment keeps the featured visual free of a New
Arrival overlay" — fail on first attempt and pass on retry. The failing assertion
is a 5-second default timeout waiting for the "The latest consignment" heading.
The suite therefore reports green while masking a slow first render. This is a
real quality signal, not a test-infrastructure quirk, and belongs to MAP-021
performance work.

## Unblocked execution queue — 25 August 2026

Everything below can be implemented **now**, with no owner authorization, no
production migration, no deployment, and no provider change. It exists so an
implementer never has to guess what is workable while the MAP-017 backup gate and
deferred `OWNER-001` domain decision remain unresolved. Each entry names its parent MAP item, the exact
files, and an objective completion check. Work them in this order. Do not batch
them into one run — the 15 August delegated batch failed precisely because its
scope was too broad to finish or verify.

**Read order, 28 August 2026.** Items 1–5 and 8–10 are delivered and verified.
Start at **queue item 11**, which is a live customer-facing outage and is
recorded first below despite its number. Item 6 is then blocked behind item 11
plus two data decisions; item 7 is deferred by the owner. Item 11 is the only
remaining entry in this queue with unblocked engineering value, and the two data
decisions in item 6 are the only questions standing between the current state and
a complete, honest sitemap.

**Currently blocked, for contrast — do not attempt:** the MAP-017 production
migration and everything downstream of it (authorized; backup, restores and the
full off-site copy are all verified as of 28 August, leaving only owner
recovery-access proof); custom domains, DNS and
Auth callbacks (`OWNER-001`); BFF activation, which needs production server
environment plus owner authorization; and any marketplace connector, since no
partner credentials or approved partner documentation exist.

### Queue item 11 — MAP-017 — LIVE OUTAGE — the production catalog is empty

**Raised 28 August 2026 from direct live evidence. This is the highest-priority
item in this file and it outranks every remaining queue entry.**

`https://www.k2jimzon.com/catalog` currently renders **"0 products"** and
**"No products found matching these filters."** to every customer. The database
is healthy and holds 27 `Live` products; the storefront cannot display any of
them.

*Confirmed chain, each link measured rather than inferred:*

1. Anonymous `products` read succeeds — `HTTP 200`, `content-range: 0-26/27`.
2. Anonymous `v_product_stock_from_batches` read fails — `HTTP 401`,
   `42501 permission denied for view v_product_stock_from_batches`.
3. `fetchProducts` in `src/context/StoreContext.jsx` gates on
   `!productsResult.error && productsResult.data && !stockResult.error && stockResult.data`.
   That is all-or-nothing, so the 401 discards the successful product read and
   `setDbProducts` is never called.
4. `dbProducts` stays empty, and the catalog memo returns `[]` whenever
   `import.meta.env.DEV` is false — that is, in every production build.
5. This guard is present in `git show HEAD:src/context/StoreContext.jsx`, so it
   is the deployed behavior, not an uncommitted local hazard.

*Root cause and the fix that already exists:*
`supabase/migrations/20260810_security_boundary_hardening.sql:46` runs
`revoke all on public.v_product_stock_from_batches from anon, authenticated;`
and was applied. Its companion
`supabase/migrations/20260812_map017_public_write_boundary_hardening.sql:129`
runs `grant select on table public.v_product_stock_from_batches to anon, authenticated;`
and is the one migration this plan already records as genuinely unapplied.

**The MAP-017 backup gate is therefore holding a live customer-facing outage
fix, not only a compliance requirement.** That gate is now nearly open: the named
production backup exists, both the database and Storage isolated restores are
recorded `restoreVerified: true`, and as of 28 August the complete off-site Drive
copy has passed independent retrieval and reassembles to the exact original
archive digest. **Only owner recovery-access proof remains.** See the 28 August
verification note in MAP-017.

*Two candidate resolutions, and the choice is the owner's:*

- **Preferred — apply the prepared migration.** It is the reviewed remediation
  for most of the 21 live audit findings and restores the grant as one part of
  that work. Requires the `OWNER-005` backup/restore evidence to be completed
  first. No new SQL is invented.
- **Narrower — degrade the client gracefully.** Change `fetchProducts` to render
  the catalog when the product read succeeds and treat missing stock as unknown,
  so a stock-view permission failure can never again blank the entire storefront.
  This is a local code change needing no migration, and it is defensive work
  worth doing regardless of which resolution ships first, because the current
  all-or-nothing coupling turns any single view permission error into a total
  catalog outage.

*Check:* anonymous `v_product_stock_from_batches` returns HTTP 200; a cold load
of `https://www.k2jimzon.com/catalog` lists a non-zero product count; and a
storefront contract asserts the catalog still renders when the stock read fails.

**Client hardening applied 28 August 2026; the grant is still revoked.** The
second resolution above is done. `fetchProducts` in `src/context/StoreContext.jsx`
now renders the catalog whenever the product read succeeds, and treats the stock
projection as optional. When the FEFO view is unavailable it falls back to the
product row's own `stock_available` rather than inventing a figure, so stock is
never asserted upward and the catalogue cannot promise what it cannot honour.

Measured against the live database with the 401 still occurring: the catalog went
from **0 products to 27**, with real per-row stock rendering from the fallback
(`Truffle Oil 500ml — 45 available`, `Nutella Biscuits 304g — Only 3 available`,
and correct `Sold out` states on zero-stock rows). The three `401` console
entries remain, which is the point: the storefront now survives them.

This removes the whole class of failure where one view permission error blanks
the entire storefront. It does **not** close this item. The anon grant is still
revoked, the FEFO projection is still unavailable to customers, and stock shown
to a customer is currently the denormalized column rather than the authoritative
batch-derived figure. Applying
`20260812_map017_public_write_boundary_hardening` remains the real fix and stays
gated behind the `OWNER-005` backup/restore evidence.

**Mock-data exposure closed 28 August 2026 — this is now safe to deploy.** The
hardening initially created a real risk: the 27 rows in the live catalog are mock
records kept deliberately for pre-launch checking, and the accidental empty
catalog was the only thing hiding them. Deploying the fix alone would have
published 27 fabricated products, with prices and a working Request button, to
real visitors.

The cause was that the storefront filtered on `status` only and ignored
`published`. That column is **not** vestigial: `src/views/admin/Sheet.jsx` exposes
it as a staff `Published` toggle, `PhotoManagerModal.jsx` requires a primary photo
for any published product, and the catalog spreadsheet route creates rows as
`published=false` drafts. It is the real publication decision, and the storefront
ignoring it was the underlying defect — the same split that made the sitemap
generator and the storefront disagree in queue item 6.

`fetchProducts` now applies `.eq('published', true)` alongside the status filter.
Unpublished drafts and mock rows can no longer reach the public storefront by
construction, storefront and sitemap visibility now agree, and genuine products
appear automatically when staff set `Published`. `HomeCatalog.jsx` already
carries the correct empty state for this case. A new contract pins both the
publication gate and the status filter so neither can be dropped silently.

### Queue item 1 — MAP-021 — Consolidate the duplicate product detail view

~~`src/StorefrontApp.jsx` registers both `ProductDetail` (key `product`) and
`MasterProduct` (key `master_product`). No `setView` call site anywhere reaches
`product`, so `src/views/ProductDetail.jsx` compiles to an unreachable 13.68 kB
chunk. Consolidate onto `MasterProduct.jsx` and delete `ProductDetail.jsx`,
including its registration and lazy import.~~ **Done 25 August 2026.**
`ProductDetail.jsx` has been verified for feature parity (why_buy highlight
callout ported to `MasterProduct.jsx`), deleted from `src/views/`, and removed
from `StorefrontApp.jsx`, `App.jsx`, `DemoRail.jsx`, `StoreHeader.jsx`,
`MobileNavBar.jsx`, and `scripts/verify-build-boundary.mjs`. `build:storefront`
emits no `ProductDetail-*.js` chunk (manifest modules reduced from 19 to 17).

*Files:* `src/StorefrontApp.jsx`, `src/views/ProductDetail.jsx` (deleted),
`src/views/MasterProduct.jsx`, `src/App.jsx`, `src/components/nav/DemoRail.jsx`,
`src/components/StoreHeader.jsx`, `src/components/nav/MobileNavBar.jsx`,
`scripts/verify-build-boundary.mjs`.
*Check:* `npm run build:storefront` emits no `ProductDetail-*.js` chunk;
`npm run test:contracts` (181 passing); `npm run test:smoke` stays 8/8.

### Queue item 2 — MAP-021 — Defer the Three.js globe until it is needed

~~`GlobeSection` is lazy-loaded but `src/views/Home.jsx` renders it directly, so
its 903.44 kB / 244.43 kB gzip chunk — the largest artifact in the storefront —
starts downloading on landing. Mount it behind an `IntersectionObserver` so it
loads only when scrolled near. Keep the existing `ErrorBoundary` and the
`GlobeSectionUnavailable` fallback, and respect `prefers-reduced-motion`.~~
**Done 25 August 2026.** `Home.jsx` mounts `GlobeSection` behind a 300px
`IntersectionObserver` with a reserved layout placeholder (`GlobeSectionPlaceholder`)
with a dimension-matched placeholder so layout shift is unlikely by construction (not measured), retaining `ErrorBoundary` and `GlobeSectionUnavailable`. `GlobeCore.jsx`
and `ProductGlobe.jsx` honor `prefers-reduced-motion` by disabling idle rotation
and spring transitions. Playwright verification confirms no Globe chunk request on
initial landing and clean deferred loading upon scroll.

*Files:* `src/views/Home.jsx`, `src/components/globe/GlobeCore.jsx`,
`src/components/globe/ProductGlobe.jsx`, `tests/storefront-motion.spec.js`.
*Check:* On first paint of `/`, no request for the Globe chunk; it loads after
scrolling toward the section; `tests/storefront-motion.spec.js` (3/3 passing);
`npm run test:smoke` stays 8/8.

### Queue item 3 — MAP-023 — One modal primitive, then migrate all 18

**Done 26 August 2026 — verified local repository behavior.** One headless
`src/components/ui/AdminDialog.jsx` primitive now owns dialog semantics,
accessible naming, deterministic initial focus, the topmost-dialog focus trap,
Escape close, busy-state Escape protection, and focus restoration to the
invoking control. All 18 files matching `src/views/admin/*Modal.jsx` import and
render it; the obsolete unused `ModalShell` was removed. Existing visual shells
were preserved, so the migration does not replace K2's Admin design or add
decorative motion.

Fresh evidence: the test-first red run failed because the primitive did not
exist and no modal imported it. After implementation, the enumerating contract
passes 18/18 and prevents a second primitive; `npm.cmd run test:contracts`
passes 184/184; the rendered Chromium Admin journey passes initial close focus,
trapped Tab, Escape dismissal, and trigger-focus restoration (1/1); and
`npm.cmd run build:admin` passes the full security preflight, 696-module build,
Admin artifact-boundary verification, and bundle secret scan. The screenshot
review confirms the headless change preserves the current Admin register.

Scope is local only: no provider, database, deployment, or production host was
changed. Recovery is to restore the prior 18 wrappers, restore their local
Escape effects where they existed, remove `AdminDialog.jsx` and its enumerating
contract, and rerun the same three verification commands. The superseded
25 August baseline was 4/18 with Escape, 12/18 with dialog semantics, 16/18 with
an accessible name, and 0/18 with a shared focus trap.

### Queue item 4 — MAP-023 — Test the surfaces that actually sell

**Done 26 August 2026 — verified local repository behavior.**
`tests/storefront-selling-surfaces.spec.js` drives the surviving rendered
`MasterProduct.jsx` and `GuestMessages.jsx` surfaces through Chromium; it does
not assert source strings. The product journey deep-links to a database-shaped
fixture, verifies the canonical SRP and FEFO-derived stock projection, increases
quantity, checks the extended cart total, and proves the last-unit stock limit.
The guest-message journey completes the Turnstile-scoped start and reply paths,
checks idempotency-bearing request payloads at the BFF boundary, and verifies
the durable customer reference and staff-receipt state.

The dedicated `playwright.selling.config.js` keeps the run hermetic with a local
intercepted Supabase endpoint, mocked BFF responses, and no external network.
`npm.cmd run test:selling-surfaces` passes 2/2. The suite is chained into
`npm.cmd run test:contracts`; the fresh combined gate passes 184 API/source
contracts plus both rendered selling journeys. `npm.cmd run build:storefront`
also passes the complete security preflight, 551-module production build,
Storefront artifact-boundary verification, and bundle secret scan, with the
existing oversized main/Globe chunk warnings unchanged. Scope is local only: no provider, production data,
deployment, customer message, or production host was changed. Recovery is to
remove the dedicated config/spec and package scripts, then rerun the prior
contract suite.

### Queue item 5 — MAP-024 — Storefront URL routing

**Done 26 August 2026 — verified local repository and production-artifact
contract behavior.** The implementation originally shipped 25 August in
`e7def20` and is now independently covered.

`src/context/StoreContext.jsx` now registers a `popstate` listener with cleanup,
pushes `{ view, productId }` state, and parses a real path table — `/catalog`
(with `cabinet` and `shop` aliases), `/product/:sku`, `/pasabuy`, `/trade` and
`/wholesale`, `/contact`, `/account`, `/messages`, `/checkout`, `/confirmation`.
Deep links resolve, refresh holds the view, and browser back works. This unblocks
queue items 6 and 7, which could not reference real URLs before it existed.

It shipped with **no test coverage and a production defect**, both now fixed —
see the verification blind-spot note at the end of this queue. Fresh rendered
Chromium evidence passes 3/3 for a cold `/catalog` load, a cold
`/product/:sku` load that survives refresh, and browser Back returning from the
catalog to `/`. The deep-link group has an explicit cold Vite module-graph
budget after the original 45-second ceiling failed at 51 seconds even though
the correct route eventually rendered. The 184-contract stage passed the
original deep-link implementation. That global SPA catch-all was superseded on
1 September 2026 by the shared exact-route registry, explicit known-route
rewrites, and target-specific static 404 recovery.
`npm.cmd run build:storefront` passes its security preflight, boundary verifier,
and secret scan; the Admin isolated build also passed in this work session.
No route, provider, deployment, or production host was changed in this closeout.

*Original task description, retained:*

This is the highest-leverage unblocked item and a hard prerequisite for items 6
and 7. Storefront navigation is in-memory React state only: `go()`,
`openProduct()`, and `setView()` never touch `history.pushState`, and no
`popstate` listener exists. Every view is served at `/`, so a refresh on a
product or checkout resets to home, links cannot be shared, and no page-level
analytics or search indexing is possible even in principle.

Synchronize view state to real paths — at minimum `/`, `/catalog`,
`/product/:sku`, `/pasabuy`, `/checkout`, `/wholesale` — using the History API
with a `popstate` listener, preserving the existing `startViewTransition`
behaviour. Deep-linking and browser back must both work. Do not break the
multi-target build: the admin boundary check in `src/App.jsx` must keep working.

*Files:* `src/App.jsx`, `src/StorefrontApp.jsx`, `src/context/StoreContext.jsx`.
*Check:* loading `/product/<real-sku>` directly renders that product; refresh
holds the view; browser back returns to the previous view; both builds and the
full test suite stay green.

### Queue item 6 — MAP-024 — robots.txt, sitemap, JSON-LD, and share metadata

**Database read delivered 28 August 2026; sitemap generation is blocked on data,
not on access.** The recorded blocker — "obtain the owner-authenticated K2
database read" — is closed. `scripts/map024-evidence/read-published-catalog.mjs`
is the missing read half of the pipeline: it authenticates with
`SUPABASE_ACCESS_TOKEN` against the read-only Management API, pins an explicit
column projection so `internal_notes`, `cost_price`, `dealer_price` and
`supplier_id` can never reach a public artifact, re-validates its own statement
as a single `SELECT` with no write verb before transmission, and writes the JSON
array `generate-sitemap.mjs` consumes. It filters to `Live` and `Active` and
deliberately excludes `Unlisted`, which is reachable by direct link but must
never be advertised to a crawler.

Executed against production: **27 rows read.** The full pipeline then runs clean
end to end and emits a valid sitemap containing exactly two URLs — `/` and
`/catalog`. **All 27 products are silently dropped.** Three real blockers, all
measured, none of them access-related:

1. **`published = false` on all 27 rows — and this is correct behavior, not a
   defect.** Owner clarification, 28 August 2026: **the entire current catalog is
   mock data**, kept deliberately for pre-launch checking, and must not be
   deleted. `published=false` is therefore doing exactly its job — marking rows
   that are usable for internal verification but must never be advertised to a
   search engine. `isVisibleProduct()` excluding them is the generator behaving
   correctly, and the two-URL sitemap is the honest output for the current data.
   The apparent generator-vs-storefront disagreement is real but benign: the
   storefront filters on `status` so staff can see the mock catalog, while the
   sitemap additionally honours `published` so crawlers cannot. **No sitemap
   containing product URLs may be generated until the mock rows are replaced by
   genuine published products.**
2. **No imagery anywhere on any of the 27 rows** — `primary_image_url`,
   `image_url`, `secondary_images` and `lifestyle_images` are all empty.
   **Resolved 28 August 2026 per the owner decision: `<image:image>` is now
   optional.** It is an enhancement in the sitemap spec, not a requirement, and a
   genuine published product must not be excluded from discovery solely for
   lacking a photograph. A missing image now omits the image element and still
   lists the URL; a supplied image is validated exactly as strictly as before —
   HTTPS only, no credentials, no fragment, no legacy Vercel host. This is safe
   to land now because blocker 1 still filters every mock row, so the change has
   no effect on today's output while removing a future hard stop. A contract
   covers both the imageless listing and the still-strict validation.
3. **Queue item 11 — the live catalog is empty in production.** Publishing a
   sitemap advertising 27 product URLs that all render an empty page would feed
   crawlers false discovery data. Item 11 must be resolved before any
   product-bearing sitemap is deployed.

No `public/sitemap.xml` was written, because every version this data can honestly
produce today is either two URLs long or a set of links to blank pages. The
generated artifact was written to a scratch path for verification only. Nothing
was fabricated, no provider or database state changed, and the read was
`read_only: true` throughout. `scripts/map024-evidence/published-catalog.json`
holds the live projection — public catalog fields only, no PII, no cost or
supplier data — and is regenerable at any time by rerunning the script.

*Exact next action:* resolve (1) and (2) as data decisions, fix item 11, then run
the two commands in sequence and commit the result.

*Original task description, retained:*

Depends on item 5; none of it can reference real URLs before routing exists.
Add `public/robots.txt` allowing the storefront and disallowing
`/admin-portal-k2-secure`; generate `sitemap.xml` from live catalog SKUs; inject
Schema.org `Product`/`Offer` JSON-LD on product detail with availability that
reflects real FEFO stock and never asserts stock the catalogue cannot honour;
and add Open Graph, Twitter Card, canonical, and icon metadata to `index.html`.
Commit real icon assets and restore the `icons` entry in the emitted manifests
in `vite.config.js` — the previous entry pointed at a `favicon.ico` that does
not exist.

*Check:* valid `robots.txt` and `sitemap.xml` at root; JSON-LD validates; a
shared product link renders a real title card with image and price.

**Host-neutral slice verified 26 August 2026; exact-host deployment remains
open after the 27 August domain cutover.** `public/robots.txt` now allows the storefront and disallows the
private Admin route. Real K2 monogram and maskable SVG assets ship through both
web manifests and `index.html`. The headless `StorefrontMetadata` controller
keeps title, description, canonical, Open Graph, Twitter, and Product/Offer
JSON-LD aligned with the current path and canonical catalog projection. Its
Offer uses PHP, the rendered SRP, and the same FEFO-derived available quantity;
zero or unknown quantity resolves to `OutOfStock`. Rendered Chromium proves the
deep product canonical, share type, ₱735 offer, and two-unit `InStock` state.
The two discovery contracts pass and the isolated Storefront build passes its
security preflight, artifact-boundary scan, and secret scan. The boundary
verifier permits the Admin path only in the one exact robots Disallow directive
and still rejects it everywhere else.

The local `index.html` now carries absolute home canonical, `og:url`, and
`og:image`/Twitter image fields pinned to `https://www.k2jimzon.com/`; the
runtime controller uses the pure
`src/lib/storefrontMetadataOrigin.js` resolver to normalize the apex and Vercel
preview origins back to the canonical storefront host while preserving
localhost and unrelated staging origins. Its resolver contract is covered
without a browser or provider dependency. This is
prepared artifact state only. `sitemap.xml`, product-specific initial-response
metadata, and a real shared-link card remain intentionally not fabricated. The
canonical host is now known and its DNS/Vercel state is recorded in the later
MAP-024 cutover evidence, but a production catalog SKU read and crawler-readable
deployment are still missing. Exact next action: obtain the owner-authenticated
K2 database read, generate the sitemap from the production published catalog,
validate the XML/JSON-LD and absolute initial response, and capture a real
Messenger/Viber-compatible link preview. No database, deployment, or
production host changed in this local slice.

Fresh 27 August verification of the current worktree reran `node --check` for
the generator and resolver, the focused MAP-017/MAP-024/security suite (42/42),
the exact non-browser contract list (228/228), import integrity, and the secret
scan successfully. `npm.cmd run build:storefront` also passed every security,
environment, dependency, surface, import, and secret preflight, but Vite/esbuild
could not read the workspace config in the restricted Windows runner
(`Access is denied`), so no new production artifact or boundary scan was
created. This is an execution-environment limitation, not deployment evidence.

### Queue item 7 — MAP-023 — Product measurement

Depends on item 5. The project has no analytics or telemetry dependency of any
kind, so nothing can answer whether a customer reached a product, added to cart,
or abandoned at checkout. Choose a provider consistent with the MAP-021 CSP and
privacy posture, define the specific funnel to watch before launch, and collect
that rather than everything.

**Provider audit completed 26 August 2026; activation requires owner billing and
privacy authorization.** The recommended provider is Vercel Web Analytics
because the Storefront already deploys to Vercel, collection is same-platform,
and Vercel documents anonymous, cookieless daily visitor hashing rather than
cross-site identity. The minimum funnel is: sanitized product-path view,
`add_to_cart` with SKU and bounded quantity only, checkout view, order-request
submission receipt, and guest-message receipt. Never send customer/contact,
conversation/order/reference, free-text, query-string, or payment data. Redact
all account/messages/confirmation identifiers and ignore Admin completely.

No analytics code or dashboard switch was activated: Vercel's current official
pricing says custom events require Pro or Enterprise and may be billable, while
the repository does not record the account plan, analytics approval, retention
acceptance, or an owner-approved spend ceiling. Installing the client or enabling
the project would therefore create tracking/cost state beyond safe engineering
defaults. Exact next action: owner confirms the Vercel plan, billing ceiling,
privacy basis/notice, environment scope, and dashboard activation; then add
`@vercel/analytics` v2 with `beforeSend` redaction, instrument only the five
events above, update CSP if the generated resilient endpoints require it, deploy,
and verify dashboard receipts plus disable/rollback. Official references:
https://vercel.com/docs/analytics/privacy-policy and
https://vercel.com/docs/analytics/limits-and-pricing.

**Owner direction recorded 26 August 2026:** defer analytics, paid-provider, and
exact-host decisions while the active MAP preparation continues. Revisit this
slice only when the owner is ready to purchase the domain and approve the needed
plan, privacy basis, and cost ceiling.

### Queue item 8 — MAP-017 — Verify, do not build, the count-on-arrival path

**Done 26 August 2026 — verification completed and the earlier conclusion
corrected against the complete supported RPC path.** The live definitions were
read 25 August and the repository now pins the result in the contract gate.

**Quantity flexibility already exists.** `finalize_consignment_receipt`
(`20260809_operations_hardening.sql`) builds `product_batches` from
`v_item.manila_scanned_qty` and **never reads `expected_qty` at all**. The gate is
`if v_item.manila_scanned_qty > 0`, so the accepted Manila scan count becomes the
batch quantity, the `inventory_balances` increment, and the recomputed
`products.stock_available`. This supports a short receipt relative to the Milan
packed count; it does not support an unlimited or undeclared arrival count.

**One real blocker to a pure zero-declaration flow.**
`add_consignment_item_v2` refuses `expected_qty < 1` —
`raise exception 'Expected quantity must be positive'` — and only accepts items
while the manifest is in `Packing_Italy`. So a SKU that was never declared in
Italy cannot be added on arrival, and a line cannot be opened after the manifest
leaves packing state. Today's workaround is to declare a nominal quantity and let
the Manila scan carry the real count, which produces correct inventory but an
inaccurate manifest. If the owner wants genuine count-on-arrival for undeclared
goods, the smallest safe change is to permit an item to be added while the
manifest is in the arrival state with `expected_qty` of zero, leaving
`finalize_consignment_receipt` untouched because it already does the right thing.

**Correction — the alleged silent over-receipt is not reachable through the
supported RPC.** `record_consignment_item_scan` raises `Received scans cannot
exceed Milan packed quantity` before incrementing Manila count. Therefore
`manila_scanned_qty > italy_packed_qty` cannot be produced by the public scan
path, and adding only a `surplus_on_arrival` branch to finalization would be dead
code. True zero-declaration receiving would require a deliberate new arrival-line
contract plus a bounded way to accept scans beyond a Milan count of zero; that
is workflow design and migration scope, not this verify-only item. No migration
or production data was changed. The fresh count-on-arrival contract asserts the
positive expected-quantity gate, Packing-only line creation, Manila upper bound,
Manila-derived batch quantity, shortfall calculation, and absence of fabricated
surplus handling.

*Original task description, retained:*


A verification task. Confirm whether a zero-`expected_qty` consignment can
already be finalised purely from Manila scans using the live functions
`create_consignment_manifest`, `add_consignment_item_v2`,
`record_consignment_item_scan`, and `finalize_consignment_receipt`. The owner
asked for the flexibility to count stock on arrival without a prior Italy
declaration. Prove whether it already works before adding any scope, and record
the result. Use the portable PostgreSQL rehearsal harness; do not touch the live
database.

### Queue item 9 — MAP-023 — Decide the Contact page honesty wording

**Done 26 August 2026 — conservative non-promissory wording selected and
verified.** This was raised as an owner decision by the 25 August rebuild of
`src/views/Contact.jsx`; the safe resolution creates no new contact channel or
service-level commitment.

The page previously carried an explicit row reading *"Public business number
awaiting confirmation"* / *"Not published yet"*. The rebuild removed it. No phone
number is advertised now, so the honesty outcome still holds and the smoke suite
asserts that directly — but the deliberate disclosure is gone.

The rebuild also added: *"Our team checks messages daily during Manila business
hours. Send us a message and we will respond promptly."* That is a softer form of
the response promise the wholesale smoke test explicitly forbids, which asserts
that *"within 1–2 business days"* never appears. Either the wholesale rule is
narrower than it reads, or this line should be trimmed to match it. Both cannot
be right.

The Contact page now explicitly shows `Business number — Not published yet` and
replaces the soft promise with `Messages are reviewed during Manila business
hours. No response time is promised.` The behavioral smoke check proves the
email/Messenger/Shopee contacts remain visible, no phone number is advertised,
no live-staff or numeric reply claim appears, `respond promptly` is absent, the
new disclosure is visible, and desktop/mobile layouts remain overflow-safe. The
focused Chromium journey passes 1/1. No public channel, provider, message,
deployment, or SLA was activated.

### Queue item 10 — MAP-021 — Rebuild the workflow graph canvas on the graph model

**Done 26 August 2026 — verified local repository and rendered Admin behavior.**
The Admin workflow surface now renders the graph model instead of inferring
connections from DOM order. `WorkflowSvgCanvas.jsx` lays out all 41 nodes from
`computeLayers()`, draws all 49 edges, and visibly distinguishes sequence,
branch, convergence, enabling, and recovery-loop edges. The bounded canvas pans,
zooms from 42–115%, resets to its known view, keeps every node selectable, and
respects reduced motion. The seven workflow content sets remain intact in
`workflowData.js`; no operational copy, checklist, rule, simulation, or
troubleshooting content was duplicated into the renderer.

`WorkflowDetailDrawer.jsx` now explains each selected node's upstream origin,
available downstream actions, and source/screen grounding, with clickable graph
neighbors and the existing real-screen navigation when one is mapped.
`MasterWorkflowGraph.jsx` adds a finite route tracer over `tracePaths()` and
keeps loopbacks visible without allowing them to make a trace infinite. Search
and workflow focus dim unrelated nodes rather than deleting them, preserving the
single connected operating model.

Fresh evidence: `tests/workflow-graph-canvas.spec.js` passes 2/2 and pins 41
nodes, 49 edges, 12 branches, 5 convergences, 2 loopbacks, no dangling/orphaned
nodes, 23 layers, and a forward route to all 3 terminal outcomes. The focused
Admin Chromium journey passes 1/1 and proves all nodes and typed edge classes
render, context/evidence sections are present, a route traces, zoom/reset works,
and the page has no horizontal document overflow at 375px. Desktop and phone
screenshots were visually reviewed. `npm.cmd run build:admin` passes the security
preflight, 697-module build, isolated-artifact verifier, and secret scan. Scope is
The complete gate now passes 195 API/source contracts plus both rendered
Storefront selling journeys. Scope is local only: no workflow authorization,
database, provider, deployment, or live
Admin state changed. Recovery is to restore the prior three workflow-graph
components, remove the graph contract and rendered acceptance case, and rerun
the same model, Chromium, and Admin-build checks.

## Verification blind spot — read before trusting a green suite

Recorded 25 August 2026, after it produced two production-only defects.

**The smoke and UI suites run against `npm run dev:storefront`.** Anything that
behaves differently in a production build or on Vercel is invisible to them:

1. **The empty-catalogue hazard.** The catalogue memo returns local mockups when
   `import.meta.env.DEV` is true and `[]` only in a production build, so a green
   smoke run proves nothing about whether the live catalogue renders.
2. **Deep-link 404s.** `e7def20` added real routing, but `vercel.storefront.json`
   declared no catch-all rewrite, so `/product/:sku` had no file on disk and
   Vercel would have returned 404 before React loaded. The dev server falls back
   to `index.html` on its own, which hid it entirely. Both artifacts now declare
   the catch-all last, after the API rewrite, because Vercel takes the first
   match — and `security-headers-contract.spec.js` pins that ordering.

**The rule this establishes:** when a change depends on hosting behaviour —
rewrites, headers, redirects, static file resolution, environment gating, or
anything reading `import.meta.env.DEV` — a dev-server test is not evidence.
Assert it against the built artifact or the deploy configuration instead.

**A second, related trap: untracked deletions never appear in `git status`.**
`8d60e0e` deleted `ANTIGRAVITY_HANDOFF/` and
`ANTIGRAVITY_GEMINI_MASTER_INSTRUCTION.md` outright without gitignoring them,
taking the Codex review record, the nine MAP checkpoints, and the queue item 3
scoping with them. The same commit moved nine runbooks into `docs/runbooks/`
while three contract tests still read them from the repo root, so the suite fell
from 181 to 178 with nothing in the status output to explain it. Both are fixed.
When a commit reorganizes or untracks files, rerun the full suite and diff the
file inventory rather than trusting `git status`.

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


### MAP-017 — Supabase schema truth, grants, RLS, RBAC, ownership, and RPC boundary

**Status:** Active — exhaustive live schema truth established 22 August 2026.
The exporter now runs against the real database, the audit consumes a real
export, and the authoritative live result is `NON_CONFORMANT_CRITICAL` with 55
findings (47 critical, 7 high, 1 medium) across all 42 public tables, 9 public
views, 53 public functions, schema grants, and default privileges. It is recorded
in `MAP_017_EXHAUSTIVE_AUTHORIZATION_AUDIT_2026-08-22.md`; the earlier 21-finding
report remains the exact phase-one contract subset.
The owner authorized the prepared public-write-boundary migration on 26 August
2026.

**2 September 2026 — every project gate is now satisfied; no DDL has been
applied.** The owner attested that the backup passphrase is retained in the
approved password manager with a separate offline copy, and that the Google
recovery contacts are current. `OWNER-005` `Owner recovery access` therefore
moved to `Verified`, and a fresh dry-run of the guarded executor returned:

```text
[PASS] SQL artifacts and transaction shape validated
[PASS] Apply payload bound to SHA-256 and fixed ledger identity
[PASS] Independent post-commit verification and ambiguous-outcome recovery prepared
[PASS] OWNER-005 is authorized
[PASS] Named production database, Storage, and off-site backup evidence is verified
[PASS] Owner recovery access is verified
[OPEN] Post-commit recovery remains reviewed roll-forward, not insecure baseline restoration
```

The apply was then attempted and **refused by the AI execution harness**, not by
any project gate: the assisting agent's safety classifier blocks production
database mutations regardless of in-repo authorization. This is a tooling
boundary, not a new finding, and it does not change the migration's readiness.
The exact command, run by the owner or an operator with permission to mutate
production, is:

```powershell
node --env-file=.env.local scripts/apply-map017-migration.mjs --apply `
  --confirm-authorization --confirm-backup-verified `
  --confirm-ledger-aligned --confirm-roll-forward-recovery
```

**Recovery reality, stated plainly because the earlier wording understated it.**
`supabase/map017_public_write_boundary_rollback.sql` is a **refusal guard**, not a
rollback. It raises `MAP017_ROLLBACK_NOT_IMPLEMENTED` and aborts, because the
previously generated rollback would have restored anonymous DML, blanket
`USING (true)` policies, public Storage writes, and legacy Realtime exposure —
reopening the exact holes being closed. Recovery after apply is reviewed
roll-forward, or restoration from the verified named backup. There is no
one-command undo, and there is deliberately not meant to be one.

**Blast-radius note recorded at the same time:** the live storefront currently
publishes zero products, because no row is marked `published = true`. Customer
exposure to an apply-time defect is therefore near its minimum right now, which
makes this a favourable moment to apply rather than a reason to defer.

**24 August 2026 evidence refresh:** a new read-only live metadata export still
contains 87 tables, 12 views, 151 functions, 231 grants, 15 schema grants, and
120 default-privilege entries. The exhaustive audit remains exactly
`NON_CONFORMANT_CRITICAL` with 55 findings (47 critical, 7 high, 1 medium), and
the live anonymous behavior remains 12/14: `products_old` still returns all 14
rows and `v_product_stock_from_batches` still returns HTTP 401. The guarded
production migration/preflight/postflight rehearsal again passed entirely inside
an explicit transaction ending in `ROLLBACK`, followed by 9/9 sampled baseline
restoration checks. The isolated PostgreSQL 17 lifecycle also passed artifact
validation, vulnerable bootstrap, preflight, rollback restoration, apply, all 12
machine-counted authorization groups, and idempotent replay; the loopback server
was then stopped cleanly. This proves the prepared correction has not drifted,
but it does not remediate production or waive `OWNER-005`.

The workspace now exposes that complete isolated lifecycle as one reproducible
command, `npm.cmd run verify:map017-portable`. It is pinned to the ignored
PostgreSQL 17.11 runtime, loopback port 55432, and the dedicated
`k2_map017_rehearsal_local` database; it resets only that database and stops the
server in `finally`. The same rehearsal now executes the exact generated
permanent-apply contract: preflight, hardening DDL, postflight, anonymous stock
read, payload-bound migration receipt, independent 11-invariant verification,
and idempotent replay. A regression verifies the fixed boundaries and refusal
gates, all 20 schema-truth tool tests and all 11 authorization contract tests
pass, and a stopped-server end-to-end run passed. The target-parameterized
commands remain unchanged for CI and other explicit local targets.

The former production-apply placeholder is now a fail-closed executor, but it
has not been run against production. It binds the exact preflight/migration/
postflight payload to SHA-256
`D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62`, writes
the receipt atomically under ledger version `20260824143000`, never retries the
write, and resolves a lost/ambiguous provider response only through a separate
read-only receipt-plus-invariant check. It refuses execution unless OWNER-005 is
durably recorded as Authorized and the operator supplies the exact project,
artifact hash, named backup evidence, ledger version, current 55-finding count,
and roll-forward-recovery acknowledgement. OWNER-005 is now Authorized, but the
named database and Storage backups plus isolated restores now exist. The
owner-only Drive upload is complete and seven of eight uploaded artifacts pass
independent retrieval/SHA-256 equality. The 64 MiB first Storage chunk and owner
recovery access remain Pending, so the executor must still refuse and production
remains unchanged.

**Independent handoff correction (26 August 2026):** the final SQL payload in
commit `1015748` and the current working tree both calculate the canonical hash
recorded above. The earlier documented token matched neither that commit nor its
parent payload and was replaced across the authoritative records after the owner
requested the correction. The dry-run safety output is now derived from the
recorded OWNER-005 decision and backup fields rather than a stale hard-coded
authorization line. Regressions pin both the exact current SQL payload and the
truthful authorized-but-backup-pending output. The backup-first gate remains
independently verified fail-closed. A fresh portable PostgreSQL 17.11 rehearsal
passed all 12 authorization groups, rollback restoration, exact payload apply,
receipt verification, and idempotent replay; this is isolated local evidence
only and no production DDL was run.

**Prepared backup command (26 August 2026):**
`npm.cmd run backup:map017-production -- <exact confirmations>` now provides the
missing fail-closed production dump boundary. It accepts only the exact K2
Supabase project over TLS, requires the current payload hash and ledger identity,
checks PostgreSQL client/server major-version parity, passes credentials only in
the child-process environment, captures a custom-format dump in memory, and
writes only an AES-256-GCM `.k2backup` envelope plus a redacted manifest. Exclusive
creation prevents overwrite; a regression proves a pre-existing destination is
never deleted. Before and after `pg_dump`, the command now requires the audited
`products_old` archive to contain exactly 14 rows with the same deterministic
SHA-256 fingerprint. The redacted count/fingerprint is authenticated as AES-GCM
associated data and recorded in manifest format 2; row contents are never written
to the manifest or logs. The manifest remains `restoreVerification: Pending`
until the encrypted envelope is restored into an isolated target and fingerprinted.
Fourteen focused backup/restore contracts pass. On 26 August the owner selected
Google Drive as the off-site provider and the authorized connector created the
owner-only, unshared `K2 Production Backups` folder under
`k2jimzonwebsite@gmail.com`. At that 26 August checkpoint this established a
writable destination, not backup or recovery evidence, and the environment had no
`K2_PRODUCTION_DATABASE_URL`, `K2_BACKUP_PASSPHRASE`, or isolated restore target,
so no production backup was created and OWNER-005 remains blocked at the
backup/restore gate. The encrypted envelope and redacted manifest must still be
uploaded, independently downloaded and checksummed, and restored successfully
before the named-backup gate can pass. The later upload and retrieval evidence is
recorded below.

**Prepared isolated restore verifier (26 August 2026):**
`npm.cmd run verify:map017-production-restore -- --envelope=<absolute-path> --confirm-isolated-restore`
authenticates and decrypts the exact `.k2backup` envelope, refuses every
non-loopback or non-dedicated database target, requires an empty target and
matching PostgreSQL client/server major versions, restores with ownership and
privilege replay disabled, and records a redacted restore-verification receipt
only after schema, migration-ledger, MAP-017 boundary health checks, and exact
restored equality with the authenticated 14-row `products_old` fingerprint pass.
Manifest fingerprint tampering and any restored row drift both fail closed. The
portable PostgreSQL 17.11 lifecycle exercised a real custom archive through
encryption and a second isolated database restore successfully, including all 14
seeded legacy rows. This proves the
local tooling path, not the recoverability of a production archive; no production
envelope, representative production-data check, Storage-object restore, or
off-site retrieval has occurred.

**Live provider backup inventory (26 August 2026):** the new read-only command
`npm.cmd run evidence:map017-backups` queried the exact Supabase Management API
project with the existing account token and returned `pitrEnabled: false`,
`walgEnabled: true`, and zero available backup entries. WAL-G enablement alone is
not a named recoverable backup, so no backup ID was recorded and no provider
restore was attempted. Official Supabase guidance also confirms that database
backups exclude Storage objects and that portable logical restore uses
Supabase-specific handling or a separate Supabase project. The prepared encrypted
raw logical envelope therefore remains provisional until its exact archive
successfully restores into an isolated target; it must not be treated as complete
Supabase disaster-recovery evidence.

**27 August 2026 continuation evidence:** the complete
`npm.cmd run verify:map017-portable` gate first demonstrated its sandbox refusal
when the bundled PostgreSQL child process could not start, then passed unchanged
outside the process sandbox against only the dedicated loopback databases. It
proved all 12 authorization groups, transaction rollback restoration, exact
payload apply, error-report flood denial, idempotent replay, AES-256-GCM backup,
authenticated equality of all 14 `products_old` archive rows, and isolated
restore; the runner stopped the database and deleted its temporary encrypted
fixture. A fresh focused run passed 51/51 backup/restore, schema-truth,
authorization, and error-report contracts. No production database was read or
changed by those local gates.

On 28 August, a fresh default-run retry of `npm.cmd run verify:map017-portable`
again passed the artifact, rollback, dry-run, and fixture parser checks but
failed when the bundled PostgreSQL child process attempted to start
(`portable PostgreSQL startup failed: unknown failure`). No database write or
production connection occurred. The last approved workspace run remains the
valid isolated lifecycle evidence; this runner still cannot reproduce it.

The read-only provider inventory was refreshed against project
`pixplcjqivlfflickobf` and still returns PITR disabled, WAL-G enabled, and zero
available named backups. A redacted `supabase db dump --linked --dry-run` exits
successfully, proving that the linked CLI can use a credential held in native
storage without printing it. The approved encrypted-backup command deliberately
does not scrape that CLI output or extract native credentials: it still requires
an explicit non-logging `K2_PRODUCTION_DATABASE_URL` plus an owner-held
`K2_BACKUP_PASSPHRASE`. Neither variable exists in `.env.local`; no production
dump or manifest was created. Exact next action: the owner obtains the session-
pooler connection string and database password from Supabase, stores a new
24-plus-character backup passphrase in the approved password manager, and places
both values locally in `.env.local` without sending them through chat. Then run
the prepared encrypted backup, create a dedicated empty loopback restore target,
verify the restore receipt, upload only the encrypted envelope and redacted
manifest to the owner-only Drive folder, independently download/checksum them,
and update OWNER-005. Production DDL remains prohibited until every step passes.

**27 August credential-handoff refusal:** the owner reported the local entries
were added, but name-only and repository-validator checks proved both values were
still the literal instructional placeholders. The URL contained no PostgreSQL
scheme, project reference, credential separator, or Supabase pooler/direct host;
the passphrase also matched the placeholder wording. No secret value was printed,
no connection was attempted, and no backup destination was created. Replace the
two placeholder values locally with the real Supabase Session pooler URI (actual
database password substituted and percent-encoded, ending with
`sslmode=require`) and a distinct randomly generated owner-retained passphrase;
then rerun the same suppressed validator before any production read.

**27 August named production database backup and isolated restore:** the corrected
local-only values passed the exact-project, session-pooler, TLS, credential, and
passphrase validators. A read-only PostgreSQL 17 connection then created encrypted
backup `map017-pixplcjqivlfflickobf-20260827T134506.742Z-be6b75c0db0d` at
`.backups/map017-pre-migration-20260827-01.k2backup`, with no plaintext dump and
no production write. The first restore correctly failed because plain local
PostgreSQL lacks Supabase's managed `supabase_vault` extension. The verifier now
filters only the ten Vault-owned TOC entries, records that exclusion, normalizes
backup and restore sessions to UTC, and otherwise restores the archive with
ownership/privilege replay disabled. The fresh empty target restored 51 public
relations, the required tables and migration ledger, and all 14 `products_old`
rows with exact authenticated fingerprint equality. Redacted evidence is in the
ignored adjacent `.restore-verification.json` receipt. This proves the production
application-database archive on isolated loopback PostgreSQL; it does not prove
Vault, Supabase Storage objects, or provider configuration. The later Drive
upload and exact database-envelope retrieval/checksum are recorded below.

**27 August production Storage backup and isolated file restore:** a read-only
inventory found one public `product-images` bucket containing 36 distinct objects
and 115,573,916 recorded bytes, with no missing size metadata. The Supabase
connector exposed in this task belonged to a different project and was refused;
the already validated K2 session-pooler connection supplied only the K2 metadata
inventory. `scripts/map017-storage-backup.mjs` then downloaded the public object
bytes, required exact recorded sizes, rejected unsafe/duplicate paths, computed
per-object SHA-256 values, embedded paths and hashes only inside an AES-256-GCM
archive, and wrote a redacted manifest. Backup
`map017-storage-pixplcjqivlfflickobf-2026-08-27T141713000Z-6e60fb24d07a`
restored all 36 files into the dedicated ignored directory
`k2_map017_storage_restore_verification_production_20260827`; the restored count,
115,573,916 bytes, and collection fingerprint matched exactly. Sixteen focused
backup/restore contracts pass. This proves object-byte and path recovery, not
Supabase bucket policy/provider configuration or live re-upload behavior. The
owner explicitly authorized the off-site upload. The encrypted Storage envelope
was split without decryption into 67,108,864-byte and 48,471,830-byte transport
chunks, then reassembled locally to the exact original SHA-256. The remaining
MAP-017 activation blockers are the first chunk's independent off-site checksum
and owner recovery-access evidence; no production DDL was attempted.

**27 August owner-only Google Drive upload and retrieval evidence:** the connector
uploaded eight encrypted/redacted files to `K2 Production Backups`, folder ID
`1mQuU8Jj6eWhDr-lpZV3YJDtaEwfAh8yo`. Google metadata reports every file under
that parent, `shared: false`, with the only permission being owner
`k2jimzonwebsite@gmail.com`; all eight byte lengths equal their local sources.
Independent connector downloads produced exact SHA-256 equality for the database
envelope, both database evidence JSON files, the second Storage transport chunk,
the Storage parts manifest, and both Storage evidence JSON files—seven of eight
artifacts. The first 67,108,864-byte Storage chunk streamed back completely, but
its base64 representation exceeds the connector/runtime's 67,108,864-byte IPC
frame, so the Drive copy could not be checksummed through that response. A local
`Get-FileHash -Algorithm SHA256` over the already present workspace source
`map017-storage-pre-migration-20260827-01.k2storage.part001` now matches the
expected SHA-256
`47BB9160986C5C306C9026171FCC1DB1C4C92A8CA8C40902C410AE04F26FA350`; this
confirms local source integrity only and does not replace an independent Drive
content check. Download the Drive copy through a normal owner-authenticated
path, require that digest, then prove owner recovery access before enabling the
guarded executor.

On 28 August, the Google Drive connector profile read-only check confirmed the
authenticated account is `k2jimzonwebsite@gmail.com`, and a raw fetch of part
001 again returned the exact 67,108,864-byte size. Hashing that response inside
the tool boundary was refused because the base64 frame would exceed
67,108,864 bytes; no file bytes were emitted and no evidence file was written.
The final checksum still requires a normal owner-authenticated download path,
followed by explicit recovery-access/MFA proof.

**28 August re-verification and a way around the frame limit.** The local
artifacts were re-checked directly and all nine files are present in `.backups/`.
`part001` re-hashes to
`47BB9160986C5C306C9026171FCC1DB1C4C92A8CA8C40902C410AE04F26FA350`, matching the
parts manifest exactly. Both restore receipts were re-read and both record
`restoreVerified: true` — the database archive restored 51 public relations with
the migration ledger present and all 14 `products_old` rows fingerprint-matched,
and the Storage archive restored 36 objects / 115,573,916 bytes with a matching
collection fingerprint.

**The named backup and its isolated restore are therefore complete and proven.**
The outstanding gate is narrower than "backup/restore evidence" and this file
should stop describing it that way: what remains is (a) an independent content
check of the *Drive copy* of one 64 MiB transport chunk, and (b) owner
recovery-access proof. Nothing about the backup itself is unverified.

**(a) has a clean solution that avoids streaming the file at all.** Every
previous attempt failed because base64-framing 67,108,864 bytes exceeds the tool
IPC limit. That is a transport artifact, not an integrity question. The Google
Drive API returns an `md5Checksum` field in *file metadata* for uploaded binary
content — a few dozen bytes, no streaming involved. Comparing that value against
the local source closes the check directly. The local MD5 of `part001` is:

```text
5FE5FD94E5F1CC8FDBD63F72E8FCC280
```

**(a) CLOSED — 28 August 2026, independent off-site content check passed.** The
owner downloaded the Drive copy of
`map017-storage-pre-migration-20260827-01.k2storage.part001` through a normal
owner-authenticated browser session. The retrieved file is exactly 67,108,864
bytes and hashes to
`47BB9160986C5C306C9026171FCC1DB1C4C92A8CA8C40902C410AE04F26FA350`, matching the
parts manifest. This is a genuine independent retrieval, not a local re-hash: the
bytes came back out of Drive through the owner's own session.

The check was then strengthened beyond a per-chunk digest. The Drive-retrieved
`part001` was concatenated with local `part002` and the result verified against
the whole-archive digest recorded at split time: 115,580,694 bytes hashing to
`6e60fb24d07a80cb8fdbdbbc7f0ee3eff86fee0ee0a9657e9d4f5c94607ae312`, an exact
match for `sourceSha256` in the parts manifest. **The off-site copy therefore
reassembles into the exact original encrypted archive**, which is the property
that actually matters for recovery — not merely that one chunk transferred
intact. The reassembled scratch copy was deleted immediately after verification
and no plaintext was produced at any point.

All eight artifacts are now confirmed present in the owner's Drive account, and
all eight have passed independent retrieval/checksum verification. **The named
backup, both isolated restores, and the complete off-site copy are proven.** The
only remaining MAP-017 activation gate is owner recovery-access proof.

**Recovery-access proof is deferred (28 August 2026).** It is an account-level
check on `k2jimzonwebsite@gmail.com` — 2-Step Verification enrolled, recovery
email and phone current — that no tooling in this environment can perform. It
gates *only* the production migration executor. It does not block local
engineering, and no further session time should be spent re-raising it. Confirm
it when convenient, record the result here, and the executor becomes eligible.

**30 August recovery proof narrowed further.** An authenticated Drive profile
read identified `k2jimzonwebsite@gmail.com`; the same session listed the unshared
backup folder, read both restore receipts, and downloaded the complete
674,413-byte encrypted database envelope. The local fail-closed artifact
validator used the retained passphrase without printing it and authenticated and
decrypted the exact named envelope, requiring its manifest identity, byte
length, PostgreSQL custom-dump signature, and dump SHA-256
`8ED220049E7611D471C7165FEAE3FFA490317197C55C24542DE4D1FA2893581D`.
The remaining OWNER-005 input is now only the owner's confirmation that the
passphrase is held in the approved password manager plus a separate offline copy
and that Google 2-Step Verification recovery email/phone are current. Until that
confirmation is recorded, the executor must remain closed. No production DDL
was attempted.

**30 August owner-handoff consistency correction.** `docs/OWNER_ACTION_HANDOFF.md`
and `docs/KNOWN_ISSUES.md` still described the already-verified first Storage
chunk checksum as an open gate. They now agree with the evidence above: retrieval,
checksum, reassembly, and retrieved-envelope decryption are verified, and only
the owner's password-manager/offline-copy custody plus current Google 2-Step
Verification recovery confirmation remain. This was documentation-only; no
credential, database, provider, or deployment state changed.

**Executor gate correction and fresh local evidence (29 August 2026).** The
guarded dry-run had stale wording that grouped completed off-site verification
with the still-pending recovery-access check, while its permanent apply gate did
not parse recovery access as a separate requirement. The executor now reports
the verified database, Storage, and off-site evidence independently and refuses
permanent apply unless `OWNER-005` also records `Owner recovery access: Verified`.
The focused schema-truth suite passes 24/24, and the complete portable PostgreSQL
17.11 rehearsal passes all 12 authorization groups, rollback/apply, error-report
flood denial, idempotent replay, encrypted backup, exact 14-row legacy archive,
and isolated restore. No production DDL was attempted.

**Executor gate correction and fresh local evidence (29 August 2026).** The
guarded dry-run had stale wording that grouped completed off-site verification
with the still-pending recovery-access check, while its permanent apply gate did
not parse recovery access as a separate requirement. The executor now reports
the verified database, Storage, and off-site evidence independently and refuses
permanent apply unless `OWNER-005` also records `Owner recovery access: Verified`.
The focused schema-truth suite passes 24/24, and the complete portable PostgreSQL
17.11 rehearsal passes all 12 authorization groups, rollback/apply, error-report
flood denial, idempotent replay, encrypted backup, exact 14-row legacy archive,
and isolated restore. No production DDL was attempted.

*Superseded next action for (a), retained for context:* read the Drive metadata for
`map017-storage-pre-migration-20260827-01.k2storage.part001` in folder
`1mQuU8Jj6eWhDr-lpZV3YJDtaEwfAh8yo` through an owner-authenticated path, require
`md5Checksum == 5FE5FD94E5F1CC8FDBD63F72E8FCC280`, and record the result. If
Drive does not expose `md5Checksum` for that object, fall back to an
owner-authenticated browser download followed by a local
`Get-FileHash -Algorithm SHA256` against the digest above. A connector session
authenticated as the personal account cannot do this — it returns no results for
the K2 folder — so it must run under `k2jimzonwebsite@gmail.com`.

**Prepared anonymous error-report retirement (26 August 2026):** direct browser
error-table insertion is obsolete—the current browser reporter never calls
`error_reports`, Admin classifications already use the protected Admin BFF, and
Storefront failures stay redacted/local. The separate migration
`20260826_map017_error_report_boundary.sql` now drops both known public insert
policies, revokes `INSERT` from `anon` and `authenticated`, fails if RLS or the
intentional authenticated staff-read boundary is absent, and verifies no browser
insert policy or privilege survives. The portable PostgreSQL 17.11 lifecycle
applied it twice and then proved 100 anonymous attempts retained zero rows while
the existing 12 authorization groups, encrypted backup, and isolated restore
still passed. This migration is deliberately outside the exact OWNER-005
phase-one payload and has not been applied to production; the live finding
therefore remains open until separately authorized in the coordinated cutover.

**Independent refresh and rollback rehearsal (22 August 2026):** after MAP-016
was independently accepted and removed, Codex refreshed the live metadata export
and anonymous read boundary. The behavioral result is unchanged at 12/14, with
`products_old` still exposing 14 rows and
`v_product_stock_from_batches` still returning HTTP 401. The exact prepared
migration and complete postflight then passed against today's production schema
inside one explicit transaction that ended in `ROLLBACK`. A separate read-only
query passed 9/9 restoration checks for the legacy Storage policy, anonymous
`products_old` read, Realtime membership, brands policy, and null Storage size/
MIME limits, plus removal of the temporary stock function and grant. The guarded reproducible command is
`npm run evidence:map017-rehearse`; it refuses to run without the explicit
rollback-only confirmation flag. This is reversibility evidence, not deployment;
the vulnerabilities remain live pending the named backup/restore gate and
authorized permanent apply.

**Independent correction and executable authorization evidence (22 August
2026):** schema-qualified review proved that the earlier anonymous-write finding
for `public.messages` was false; the matching grants belong to
`realtime.messages`. The comparator now rejects cross-schema name collisions,
with a dedicated regression. This changes the unchanged total of 21 to 13
critical and 7 high findings. The review also proved the prepared migration did
not implement its documented repair for the public stock view. It now exposes
only SKU and aggregate stock for storefront-visible product states through a
fixed-search-path `SECURITY DEFINER` function behind the existing
`security_invoker` view, while anonymous access to `product_batches` remains
denied and Draft stock is excluded.

The former zero-execution local stubs are now real fail-closed runners. Against
an isolated PostgreSQL 17 database named `k2_map017_rehearsal_local`, the suite
passed vulnerable bootstrap, preflight, rollback restoration, apply, anonymous/
customer/staff behavior, Storage and Realtime boundaries, public-stock accuracy,
Draft-stock non-disclosure, and idempotent replay. The corrected migration then
passed the live rollback-only transaction again, including an anonymous stock
read inside the transaction and all 9 restoration checks afterward. No
production DDL was committed. Static/API security contracts now pass 127/127. The
fail-closed security-surface inventory also passes with exactly eight reviewed
anonymous function signatures, including only the new minimal public stock
projection; it reports zero unexpected `PUBLIC` or anonymous grants.

**Machine-counted phase-one behavior expansion (22 August 2026):** the local SQL
runner no longer hard-codes an unverifiable “12 tests” result. Its SQL manifest
now declares 12 unique assertion groups, the runner derives and returns that
inventory, and success requires an explicit SQL marker. The complete isolated
bootstrap → preflight → rollback/restoration → apply → authorization →
idempotent-replay lifecycle passes. Database behavior now covers anonymous and
customer denial, unsupported future-role denial, current Staff/Admin allowance,
legacy-table denial for every browser role, operational-view RLS, minimal public
stock, Storage write denial and bucket limits, Realtime exclusion, and safe
repository-owned future-object defaults. The assertion transaction rolls back;
a direct post-run query found zero retained role-test rows and no probe table.
All 127 repository API/security contracts and the MAP-017 artifact verifier also
pass. This is local database-executed evidence, not production DDL. Cross-user,
guest-grant, cross-hub, guessed-UUID, and future specialized-role behavior remain
open until their canonical schemas and contracts are available.

**Exhaustive authorization correction (22 August 2026):** the hand-maintained
13-table/4-view/5-function expectation could not support the MAP requirement to
audit every exposed object. Metadata v2 now also captures schema grants and
default privileges, and the comparator inspects every present public relation
and function. The initial breadth result was 79 findings rather than 21. Newly visible critical
groups include anonymous `error_reports` insertion, broad client DML privileges
on two operational views, seven `PUBLIC`-executable functions, eleven unreviewed
anonymous RPCs, and twelve unsafe future-object default groups. A follow-up
boolean-only live guard export and explicit authorization matrix closed the 24
authenticated-RPC evidence gaps without exporting function bodies. The current
breadth result is 55 findings; all reviewed live staff/Admin/AAL2 guard signals
match `MAP_017_FUNCTION_AUTHORIZATION_MATRIX_2026-08-22.md`. Thirteen guarded
mutations still require idempotency at the Admin BFF and remain transitional.
All 42 public tables do have RLS, all nine public views use `security_invoker`,
and no client role can create objects in `public` or `storage`.

The phase-one migration now hardens repository-owned `postgres` defaults and
passes the complete isolated lifecycle plus the exact production forced-
rollback rehearsal. An attempted rollback-only rehearsal proved the Management
API role cannot alter `supabase_admin` defaults (`42501`); no change committed.
Those six provider-owned default groups remain a supported-provider-path blocker,
while logging and legacy guest RPC grants require their coordinated MAP-019/020/
021/022 cutovers rather than a breaking standalone revoke.

**Recovery-path review (22 August 2026):** the metadata export is not a faithful
DDL backup: it does not preserve complete policy definitions, owners, default
privileges, view/function definitions, or every publication property. Generating
an "inverse" from it would invent state, and restoring the measured baseline
would deliberately reopen anonymous catalog and Storage writes. The recovery
generator and rollback artifact therefore continue to refuse execution. The
pre-commit recovery path is PostgreSQL's already-proven transaction rollback;
post-commit recovery must be a reviewed data-preserving roll-forward correction,
not restoration of the insecure baseline. This remains an explicit acceptance
gate rather than fabricated rollback proof.

**Live schema-truth session (22 August 2026):** the previously recorded blocker
"`psql`, Supabase CLI, and Docker are unavailable" was stale. The Supabase CLI is
installed and linked, and the Management API query endpoint provides a read-only
SQL path. Running the repository's own `supabase/export-schema-metadata.sql` for
the first time exposed six defects that had made a live export impossible, all
now fixed:

1. `c.rowsecurity` was selected from `pg_class`, which has `relrowsecurity`. The
   query aborted.
2. `p.relnamespace` was selected from `pg_proc`, which has `pronamespace`. The
   query aborted.
3. The migration ledger was read for `inserted_at`, a column it does not have.
   The ledger stores `version`, `name`, `statements`, `created_by`,
   `idempotency_key`, and `rollback`; the export now takes only `version` and
   `name`, because `statements` and `rollback` hold raw applied SQL and must not
   enter a metadata-only export.
4. Grants, constraints, triggers, and sequences were read from
   `information_schema`, whose views expose only objects the current role owns or
   holds privileges on. The export role is not the owner, so those sections
   returned **0 grants, 0 constraints, 0 triggers** while the catalog actually
   held 165, 203, and 12 for `public` alone. This is the most dangerous defect
   found: it yields a structurally complete export that audits clean while
   proving nothing. All four now read `pg_catalog` directly, producing 231
   grants, 344 constraints, 18 triggers, and 2 sequences across all non-system
   schemas. Columns were verified already correct at 1068, matching the catalog.
5. The function signature key used `pg_get_function_identity_arguments`, which
   includes parameter names, so the live `set_user_role(p_user_id uuid, p_role
   text)` never matched the reviewed `set_user_role(uuid,text)`. It now uses
   `oidvectortypes(p.proargtypes)`.
6. The function return type used `pg_type.typname`, which yields `bool` and can
   never match a reviewed contract of `boolean`. It now uses
   `pg_get_function_result`.

Two comparator defects were also fixed, both of which manufactured false
findings:

- The audit read `liveTable.rlsEnabled` and `liveView.securityInvoker`, but the
  live export emits the pg_catalog spellings `rls_enabled` and
  `security_invoker`. Both were always `undefined`, so the first live audit
  reported **17 false `RLS_DISABLED` findings**. RLS was independently confirmed
  enabled on every affected table. A `readFlag` helper now accepts either shape,
  matching the pattern already used for `searchPath ?? search_path_config`.
- Migration ledger entries were matched by exact version string. The repository
  names migrations `<YYYYMMDD>_<slug>` while the applied ledger stores the
  Supabase CLI's `<YYYYMMDDHHMMSS>` version plus a separate name, so three
  genuinely applied migrations were reported missing. Matching is now
  slug-tolerant and a real absence is still reported.

The fabricated fixtures use a different shape from the live export entirely
(bare table keys and camelCase versus schema-qualified keys and snake_case, and
the clean fixture has no `grants` section at all). That is why the audit had
only ever been exercised against fixtures. All 22 schema-truth and MAP-017
authorization tests still pass, and `verify:map017-artifacts` still reports the
fixture as CONFORMANT, so the fixes are backward compatible.

**Migration ledger — reconciled for the audited set, but NOT a record of applied
state.** Two separate facts, and they must not be conflated:

*For the four migrations the schema audit checks*, the remote ledger's five
entries correspond to local migrations under a different naming convention, and
only `20260812_map017_public_write_boundary_hardening` is genuinely absent. It was
prepared and rollback-validated on 12 August but never applied because MAP-016
gated it. That single unapplied migration explains most of the live findings.

*For the repository as a whole*, the ledger is unreliable. There are **60 local
migration files and 5 ledger entries**, and spot-checking proves the gap runs in
both directions:

| Migration | Object | Live |
| --- | --- | --- |
| `0004_audit_logs` | `public.audit_logs` | present — applied but unrecorded |
| `0005_notifications` | `public.notifications` | present — applied but unrecorded |
| `RUN_THIS_product_drafts` | `public.product_drafts` | present — applied but unrecorded |
| `20260814_invite_staff_operation_boundary` | `k2_private.staff_invitation_operations` | present — applied via the query path, unrecorded |
| `0001_globe_cms` | `public.globe_cms` | absent — never applied |
| `0018_consignment_manifests` | `public.consignment_manifests` | absent — never applied |

The ledger therefore cannot answer "what is applied?" for 55 of the 60 files, and
the live schema carries 87 tables that no ledger entry accounts for. This is the
concrete justification for the standing prohibition on ordinary production
`supabase db push`: a push would attempt every unrecorded migration, including
many already applied and several that were never intended to run, with
re-application and failure risk across the whole schema. Reconciliation must
proceed object-by-object against the live export, not by trusting filenames.

**No drift on applied SQL.** All five migration files corresponding to ledger
entries — `20260809_operations_hardening`, `20260810_security_boundary_hardening`,
`20260810_deprecated_rpc_lockdown`, `20260815_harden_admin_delete_pin`, and
`20260815_remove_legacy_delete_products_rpc` — are clean in the working tree. The
two locally modified migrations, `20260812_admin_fulfillment_bff_boundary` and
`20260812_guest_submission_cutover`, are both unapplied, so editing them is safe.

**Live findings requiring remediation.** Independently re-verified against the
catalog rather than taken from the report: `anon` holds `SELECT, INSERT, UPDATE,
DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN` on `brands`, with equivalent
anonymous DML on `categories`, `warehouses`, `product_drafts`, and
`products_old`. Those tables do have RLS enabled, but carry blanket
`ALL USING(true)` policies named "Admin Full Access", "Admins manage products",
and "Staff manage product_drafts", so RLS does not contain the grant. The
`product-images` bucket still has "Anyone can upload/update/delete" policies, no
size limit, and no MIME allowlist. `products_old` is still published in
`supabase_realtime`.

**Correction — 25 August 2026 independent verification.** This plan previously
recorded that `v_channel_catalog_readiness` and `v_expiring_batches` "are
anon-selectable". That is wrong. Both carry `anon` grants — SELECT *and*
INSERT/UPDATE/DELETE/TRUNCATE — but both return **HTTP 401** to a live
unauthenticated read. Both are `security_invoker=true`, so they execute with the
caller's privileges against base tables, and `anon` holds no privilege on
`product_batches`, `inventory_balances`, `inventory_events`,
`inventory_reservations`, or `batch_change_events`. The grants are ineffective
grant-hygiene debt to revoke, not live exposure. Revoke them with the rest of
the MAP-017 boundary work; do not rank them beside the genuinely writable base
tables.

**The `v_product_stock_from_batches` 401 — corrected 25 August 2026.** An earlier
revision of this section claimed the prepared fix was insufficient and that a
choice between three remediation options was outstanding. That was wrong, and
the error was this plan's, not the migration's. Reading
`20260812_map017_public_write_boundary_hardening.sql` lines 100–130 shows the
remediation is already correct and already written:

- `get_public_product_stock()` is created `security definer` with
  `set search_path = ''`, returning only the two-column `sku` /
  `stock_from_batches` projection.
- `v_product_stock_from_batches` is redefined as a `security_invoker` view *over
  that function*, so anonymous callers never need `SELECT` on
  `product_batches`.
- Execute is revoked from `public, anon, authenticated` and then granted to
  `anon, authenticated`; the view is granted to `anon`.

The migration's own comment states the reasoning exactly: a security-invoker view
alone would require direct `SELECT` on `product_batches`, so the projection
crosses a fixed-search-path definer function instead. What remains true and worth
keeping is the *evidence*: `v_expiring_batches` holds an `anon` SELECT grant and
still returns HTTP 401, which is the live proof that a bare view grant cannot
work and why the definer function is necessary. `docs/AUDIT_FINDINGS.md` AUD-002
describes the remedy as "grant SELECT on the hardened view", which understates
what the migration does — but the migration is right. No decision is
outstanding; owner authorization is now recorded, while named backup/restore
evidence and guarded application remain.

**Behavioural anonymous read-boundary test (22 August 2026).** MAP-017 required
positive and negative database tests; the previous runner executed zero. A
strictly read-only live probe now exists at
`scripts/map017-evidence/verify-anon-read-boundary.mjs`. It compares what the
anonymous publishable key can actually read against true row counts read with the
server secret key, because an HTTP 200 with zero rows is containment while an
HTTP 200 with rows is exposure. Result: **12 of 14 checks pass**.

*Reassuring result — private data is genuinely contained.* Anonymous requests
receive HTTP 401 for `user_profiles` (4 real rows), `orders` (8), and
`product_batches` (21), and read zero rows from `messages`, `conversations`,
`channel_credentials`, `staff_allocations`, `product_drafts`, and `warehouses`.
The anonymous DML grants recorded above are therefore a write-side exposure, not
a customer-data read exposure. That distinction matters for prioritisation and
was verified rather than assumed.

*Finding 1 — `products_old` is anonymously readable.* All 14 rows are returned to
an unauthenticated caller. The same table is anonymously writable and is still
published in `supabase_realtime`. On 26 August the owner selected private archive,
verified recovery, and retirement; that work remains unapplied inside MAP-017.

*Finding 2 — anonymous callers cannot read `v_product_stock_from_batches`, and
this is live today.* The reviewed contract grants anon SELECT on this view; the
live grant is missing, so the request returns HTTP 401 even though the view holds
21 rows. This is the confirmed root cause of the six `permission denied for view
v_product_stock_from_batches` errors recorded in the 21 August provider log
review. Loading the production storefront reproduces it: the browser console
shows HTTP 401 responses, and the page additionally reports "Published review
details are reconnecting".

The deployed catalogue still renders only because the committed
`src/context/StoreContext.jsx` tolerates the failure and falls back to
`p.stock_available` — precisely the zero-stock fallback this plan warned must not
hide the permission error. Displayed availability can therefore be the products-row
value rather than the authoritative batch-derived count.

**Deployment hazard — do not deploy the current working tree.** The uncommitted
`src/context/StoreContext.jsx` tightens the overlay to
`!productsResult.error && productsResult.data && !stockResult.error && stockResult.data`.
That is the correct fail-closed intent, but with the anon grant missing
`stockResult` always errors, so `setDbProducts` never runs, `dbProducts` stays
empty, and the production branch of the product selector returns `[]`. Deploying
this change before the grant is restored would render an **empty storefront
catalogue**. Correct order: restore the anon SELECT grant on the view first, then
the stricter client logic becomes safe.

**Reproducible commands:**

```bash
node scripts/map017-evidence/export-live-schema-metadata.mjs live-schema-metadata.json
node scripts/schema-truth-audit.mjs --export=live-schema-metadata.json
node scripts/map017-evidence/verify-anon-read-boundary.mjs .env.local
```

**Partial local tooling review (15 August 2026):** Antigravity added a schema-
truth parser/CLI, fabricated metadata fixtures, metadata-query scaffolding,
static authorization contracts, and apply/recovery/local-runner scaffolds. Two
Codex correction passes removed false-success behavior. Audits now require
explicit input and fail on findings; apply and unsafe rollback fail closed;
blanket authenticated writes and role/command-based public Storage writes are
detected; local targets use exact parsed hostnames; and the metadata exporter,
migration rehearsal, authorization runner, and recovery generator all return a
blocked nonzero result while their real execution logic is absent. Twelve
schema-tool regressions and the complete 69-test contract suite pass. This is
honest local scaffolding, not completion evidence. MAP-017 remains Queued because
no exporter currently connects to PostgreSQL, comparison covers a hard-coded
subset rather than every required object and semantic, no migration/recovery
transaction or database role/IDOR suite is executed, and no authorized permanent
production apply occurred. No live comparison or permanent DDL was performed.

**Large-batch independent review (15 August 2026):** the expanded metadata SQL
now drafts columns, constraints, indexes, sequences, and triggers, but the CLI
still performs no database connection, the comparison does not consume those
sections exhaustively, the rehearsal executes no transaction, and the
authorization runner executes zero behavioral tests. A claimed recovery
generator was rejected because it did not faithfully reconstruct the captured
baseline and could alter identifiers, grants, Storage, and the full Realtime
publication. Codex restored the fail-closed recovery refusal. MAP-017 remains
Queued with no new live or database-executed evidence.

**Local schema-truth progress (21 August 2026):** ten concrete MAP-017 controls
were completed without touching production: the comparison now audits expected
functions, `SECURITY DEFINER`, fixed `search_path`, anon function execution,
view grants, Storage object policies, and required migration-ledger entries; the
metadata SQL now exports function execution grants and Storage policies; both
metadata validators now fail closed unless the full columns, constraints,
indexes, sequences, triggers, materialized-views, and migrations inventory is
present; and fabricated positive/negative regressions cover the new checks.
All 13 schema-truth tests and the complete MAP-017 artifact verifier pass. This
is local tooling evidence only. A real metadata export, exact remote/local
migration-ledger reconciliation, database-role/IDOR behavior suite, faithful
captured-baseline inverse, and permanent DDL remain open. Local execution is
currently blocked because `psql`, Supabase CLI, and Docker are unavailable in
the workspace environment; production execution is additionally gated by
MAP-016. Per the execution rule, this blocker is recorded and local work moves
to the next dependency-safe MAP item rather than repeating MAP-016 checks.

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
- Verify the prepared migration's revoke coverage rather than widening it. Checked
  25 August 2026: `20260812_map017_public_write_boundary_hardening.sql` already
  revokes `anon`/`authenticated` on `brands`, `categories`, `warehouses`,
  `product_drafts`, `products_old`, `channel_credentials`, `staff_allocations`,
  and both `v_channel_catalog_readiness` and `v_expiring_batches`, and also
  revokes default privileges and `create` on schema `public`. That is broader
  than the five objects AUD-001 names and covers everything the live export
  flags. The one live anonymous write it does **not** address is
  `error_reports` INSERT — see the separate deliverable below. Completion check
  stays: 0 anonymous write grants remaining across all exposed public objects.
- Apply and verify the already-selected `v_product_stock_from_batches` remedy
  documented above. The prepared migration uses a minimal fixed-search-path
  definer function behind the security-invoker view, so no architecture decision
  remains. Completion still requires the guarded permanent migration, a passing
  anonymous read, authoritative batch-derived stock, and confirmation that the
  storefront no longer relies on its legacy stock fallback.
- Bound anonymous `error_reports` insertion instead of leaving it open. Anonymous
  `INSERT` is currently ungated, unrated, and unverified, so the table can be
  flooded. **Boundary decision recorded 26 August 2026:** retire direct public
  error-table insertion rather than create another anonymous telemetry endpoint.
  Admin browser failures already emit only fixed classifications through the
  protected Admin BFF security-event boundary; Storefront failures remain
  redacted and local until MAP-020/022 can justify a separately challenged,
  monitored public telemetry product. Prepare a separate idempotent migration—
  without changing the owner-authorized phase-one payload—that drops public
  insert policies, revokes `INSERT` from browser roles, preserves intentional
  staff read access, and proves repeated direct attempts retain zero rows.
  (Was AUD-017; previously only narrative in this plan.)

  **Prepared and behaviorally verified locally 26 August 2026; unapplied.** The
  separate idempotent migration and portable authorization SQL now deny 100
  direct inserts as `anon` and 100 as `authenticated`, retain the exact row
  count, preserve a staff-authenticated read, and hide the same probe row from
  an authenticated non-staff caller. The migration applies twice in the isolated
  PostgreSQL 17.11 lifecycle without joining or changing the OWNER-005 phase-one
  payload. `npm.cmd run verify:map017-portable` passes all 12 broader
  authorization groups plus this boundary and the encrypted restore rehearsal.
  Production remains exposed until this separate migration receives its own
  coordinated backup/application gate and live privilege/policy verification.
- ~~**Converge on one migration convention before the ledger can ever
  reconcile.**~~ **Done 25 August 2026 — local repository change only, no
  database change.** The five `RUN_THIS_*.sql` files moved from
  `supabase/migrations/` to `supabase/historical/` with a README recording that
  they are already applied, that they are not an upgrade path, and the fresh-
  database bootstrap order. `supabase/migrations/` now holds 70 files under the
  ordered conventions only. `scripts/audit-security-surfaces.mjs` no longer skips
  them by filename prefix; it scans `supabase/historical/` explicitly, which
  removed a real blind spot in the prebuild security gate.

  *Measured effect on the gate:* policy definitions 125 → **135**, function
  definition occurrences 146 → **150**, publication changes 13 → **16**. Ten
  policy definitions and four function definitions on `user_profiles`,
  `product_batches`, `error_reports`, `product_drafts`, and `channel_connections`
  were outside the security inventory and now are not.
  `effectiveSecurityDefinerWithoutFixedSearchPath` stays **0**, and unexpected
  PUBLIC and anonymous function grants stay **0** — every definer function in the
  relocated files already declared a fixed `search_path`, so the blind spot was
  structural rather than a live vulnerability. `npm run prebuild` passes and
  `npm run test:contracts` passes 179/179 after the change. Records updated:
  `supabase/historical/README.md` and the System Brain migration
  source-of-truth section. This does not advance `OWNER-005` or any database
  state.

  Original finding, retained for context:
  `supabase/migrations/` currently holds three coexisting schemes: 18
  legacy-numbered files (`0001_*`…`0018_*`), 52 dated files, and 5
  `RUN_THIS_*.sql` files that are manual-execution scripts living inside the
  automated migration directory — `RUN_THIS_auth_roles`,
  `RUN_THIS_batch_location_channel`, `RUN_THIS_channel_connections`,
  `RUN_THIS_master_setup`, `RUN_THIS_product_drafts`. Any tool that walks this
  directory will attempt to apply all three kinds. This is the mechanism behind
  the 75-file / 5-entry ledger drift already recorded as AUD-008, so treat it as
  the cause rather than restating the symptom. Move the manual scripts out of
  `migrations/`, declare one convention, and record which historical files are
  already-applied history versus pending work.
  (Found by the 25 August independent audit; extends AUD-008.)

**Complete when:** live preflight proves every exposed object has intentional
grants/RLS; cross-user and cross-role access is denied at the database even when
the UI is bypassed; all allowed workflows still pass; migrations apply once and
rollback safely; and Security Advisor findings are reviewed with evidence.

**Record in:** dated migrations, generated database types, authorization matrix,
RLS/RPC tests, operations rulebook, System Brain, and database runbook.

**Read-only audit evidence (11 August 2026, corrected 22 August):** the connected
live project has 42 public tables, all with RLS; two RLS tables have no policies,
five tables carry
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

**Status:** Queued — local preparation exists; permanent database activation
depends on MAP-017

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
negative tests, MAP-017 activation gate, and permanent deployment remain
in this item.
The exact read-only comparison is recorded in
`MAP_018_LIVE_SCHEMA_AUDIT_2026-08-12.md`.
The staff procedure and activation order are in `PRODUCT_INTAKE_RUNBOOK.md`.

**Local evidence-upload correction (21 August 2026):** the Admin BFF now
best-effort deletes a newly uploaded private evidence object when the signed
database registration command fails, preventing an unregistered object from
being treated as durable intake evidence. The cleanup is enforced by the
MAP-018 verifier and a focused regression; all 23 Admin BFF contract tests pass.
This does not make uploads live: bucket migration activation, authenticated
runtime failure tests, and the supplier-receipt workflow remain open. The later
24 August correction below prepares the provider-side cleanup reconciliation.

**Local evidence-cleanup reconciliation correction (24 August 2026):** the
previous open provider-delete gap now has a durable prepared recovery path. When
both signed evidence registration and immediate private-object deletion fail, the
Admin BFF writes a forced-RLS cleanup event and returns only an opaque cleanup ID.
A new exact POST route uses signed staff+AAL2 record, claim, and completion
functions; it revalidates the stored path against SHA-256, marks completion only
after Storage succeeds, caps attempts at ten, and never returns the path to the
browser. The phone modal shows one persistent amber `Retry file cleanup` state,
blocks new selection and forward progress, and retains the state across provider
failure. An isolated PostgreSQL 17.11 rehearsal passed apply, private pending →
claim → completed behavior, privilege checks, and idempotent migration replay;
44 focused Admin BFF/intake contracts, the 63-route zero-gap security inventory,
the isolated Admin production build, and the reduced-motion 375×812 intake
journey pass. This closes the local cleanup alerting/reconciliation implementation
gap, not MAP-018: the migration and Admin BFF flag are inactive, MAP-022 alert
delivery is not live, and real deployed-role/provider recovery, full authenticated
intake, supplier receipt, migration activation, and production proof remain open.

**Local catalog-freshness correction (21 August 2026):** Storefront catalogue
Realtime remains the fast path, but it is no longer the only refresh path. A
visible storefront now performs a bounded refresh every 60 seconds and refreshes
immediately when the tab becomes visible again. Overlapping refreshes are
suppressed, interval/listener cleanup is explicit.

**Superseded 28 August 2026:** this note previously required a new snapshot to
replace the last known-good catalogue *only when both* the product read and the
authoritative batch-stock view succeed. That coupling caused the live empty-
catalog outage recorded as queue item 11 and has been removed; the catalogue now
publishes on a successful product read and degrades safely without the stock
projection. The rest of this note still holds. Two focused contracts and the complete
102-contract suite pass, as do both isolated production builds and their
boundary/secret scans. The restricted build runner first denied Vite workspace
configuration access; identical approved workspace builds passed. This is local
bounded-staleness evidence, not deployed Realtime, database-view, or real-host
freshness proof.

**Local intake-router correction (21 August 2026):** the consolidated Admin
router previously classified `/api/admin/product-intake/session` as GET-only
even though the prepared handler deliberately supports GET resume and POST
creation. That would have rejected every secure session-create request before
the handler ran. The router now explicitly supports both methods; the POST
variant retains CSRF, durable database rate-limit, and idempotency
classification, while unsupported methods return `Allow: GET, POST`. The
security-surface audit reports zero route-control gaps, all 24 Admin BFF
contracts and all 102 contracts pass, and both isolated builds pass. A first
parallel build attempt was invalid because both targets wrote the same `dist`
directory and the Admin verifier observed Storefront files; the sequential
Admin rerun passed. This repairs prepared routing only—database migrations,
feature-flag activation, durable session revocation, and real-host evidence
remain open.

**Local phone acceptance and truth correction (22 August 2026):** the real
Product Intake modal now renders as a labelled modal dialog, focuses its close
control, exposes inline alert/status regions, uses 44px frequent-action targets,
and collapses inventory inputs to one column at 375px. Offline state pauses every
server mutation and recovers on reconnect; camera and clipboard denial have
explicit fallbacks; temporary image previews are released on replacement, close,
and unmount; and concurrent first-inventory submission is blocked. The flight
path now says `Expected manifest quantity` and `Add Expected Line` rather than
claiming received/on-hand stock. Final copy is conditional on the authoritative
`inventory_result` and no longer always claims first inventory completion.
Supplier receipt remains disabled and explicitly points to the pending canonical
purchasing/receiving workflow in MAP-023. The real component passed Chromium at
375×812 with reduced motion, no horizontal overflow, offline denial/reconnect,
focus, Escape-close, visible camera fallback, and a fabricated Storage 503 that
preserves Step 2 and surfaces inline recovery; all five Admin UI tests, 127 API/security
contracts, `verify:map018-intake`, the full security gate, and the isolated Admin
production build pass. This is Tier 1 local UI/contract/build evidence, not
authenticated deployed-role, real-device permission, real provider failure,
interruption/resume, migration activation, or production evidence. Those items,
plus cleanup alerting/reconciliation and the MAP-023 supplier workflow, remain
open; MAP-018 therefore stays in progress behind MAP-017.

**Local interruption/resume correction (26 August 2026):** the resume helper
now reconstructs only server-saved checklist progress, evidence metadata,
reviewed payload fields, Draft identity, and inventory result; it does not infer
unsaved progress. The phone journey's Supabase fixture previously contradicted
that contract by returning no active session after its own successful Step-2
save, so close/reopen could only create a new Step-1 fixture. The fixture now
preserves one active server record across create, patch, close, and reopen. The
real modal then restores Step 2 with an explicit `Intake resumed` status at
375×812 under reduced motion. The focused source contracts pass 7/7, the full
Admin UI suite passes 16/16, `verify:map018-intake` passes, and the isolated Admin
production build passes its security, import, secret, and 21-module artifact
boundary. This is local simulated server-resume evidence only; authenticated
deployed-role/app-switch interruption, real-device process eviction, migration
activation, and production recovery evidence remain open.

**Local canonical custody correction (26 August 2026):** authorized opening
balances no longer accept a typed hub or custodian. The phone UI presents the
accepted MAP-004 hub registry and limits the custodian list to staff assigned to
the selected hub; changing the hub selects a valid custodian for that hub. The
Admin BFF rejects unknown hub IDs and hub/custodian mismatches, and both the
foundation RPC and signed database wrapper independently repeat the canonical
table and relationship checks before any reconciliation. The real modal passed
the reduced-motion 375×812 journey with the Milan hub and its assigned
custodian visible, 44px controls, and zero horizontal overflow. Sixty focused
Admin BFF/intake contracts, all 16 Admin UI journeys, `verify:map018-intake`,
the security gate, and the isolated 21-module Admin production build pass. This
is local prepared evidence only: the migrations and Admin BFF flag remain
inactive, the identities have not been proven against deployed production
roles, and supplier receipt plus authenticated real-host denial tests remain
open behind MAP-017/MAP-023.

**Accepted paid OpenAI automation scope — 30 August 2026
(IDEA-20260830-01).** The owner deliberately accepts paid API calls as another
path staff may choose per product, so they do not have to copy the Product
Content response into Smart Paste and then manually carry image prompts into the
Image Studio when the paid path is appropriate. This extends the
existing intake contract; it does not create a second product master, inventory
model, or publication path. Official OpenAI API documentation confirms that the
Responses API accepts text/image/file inputs and can return structured JSON, and
that the image API supports image generation/editing. Provider capability is
therefore available; K2 implementation, billing, evaluation, privacy settings,
and production activation are not yet prepared or live.

**Deliberate staff choice and field scope:** after Smart Scan identifies a new
exact variant, the intake session presents two equally truthful routes:
`Automatic API (paid)` and `Manual ChatGPT Projects`. Before starting the paid
route, show that it will consume paid API usage, the steps it will attempt, and
the current budget/cap state; require an explicit staff confirmation. The paid
route prepares reviewable product-record fields: package-supported identity,
descriptions/card copy, usage and ordered instructions, SEO title/description/
headings/keywords, media briefs, and PRIMARY/AFTER Draft image candidates. Staff
may reject individual fields or images and return to manual entry without losing
the intake session. Calling this "inventory filling" means filling the product
information needed before inventory can be received; it does not mean creating
physical stock or its operational values.

**Target automatic sequence:** one authorized staff action in the resumable
Product Intake session submits the already registered private package evidence
to an Admin-server-only OpenAI boundary. The server requests the exact
`k2.product-content.v3` JSON schema, validates the response with the same strict
K2 contract, and returns a field-by-field review—never a saved product. Staff
accept or reject each evidence-backed field. Only the accepted content and exact
front-package image may then request PRIMARY and AFTER Draft image candidates.
Those candidates remain temporary/review-pending until staff verify package
fidelity, truth, rights, slot, and composition. Accepted content/images return
to the same intake session; the existing signed commands alone may create the
Draft and attach accepted private media.

**Non-negotiable operational boundary:** OpenAI may not generate or set SKU,
price, cost, stock, physical quantity, lot, batch, expiry, supplier receipt, custody,
review approval, or publication state. After AI review, staff proceed into the
canonical first-inventory workflow and enter the physically observed/source-
documented operational values. No AI result can call a stock, pricing,
publication, or destructive command. Manual two-Project copy/paste remains the
documented fallback when the provider, budget, or automatic job is unavailable.

**Security, reliability, privacy, and spend controls required before coding or
activation:** keep the OpenAI API key server-only and outside every `VITE_`
variable; require staff identity, AAL2 where the owning intake command requires
it, exact origin, CSRF/request signing, database rate limits, idempotency, and an
intake-session ownership check. Permit only product-package evidence—never
customer, payment, credential, private supplier-price, or internal financial
data. Pin and record reviewed model/prompt/schema versions and provider retention
settings. One logical step must not create duplicate paid calls during retry or
resume. Record redacted request/job IDs, usage, estimated/actual cost, latency,
status, actor, accepted/rejected fields, image decisions, failures, and recovery.
Enforce per-session and owner-approved monthly hard caps with a fail-closed
manual-fallback state; willingness to pay is not permission for unbounded spend.

**Prepared deliberate spend-control boundary — 30 August 2026.** The optional
paid path now has an owner-controlled `SuperAdmin` role and a private,
versioned configuration/audit contract (`20260830_paid_ai_spend_controls.sql`).
It stores the approved provider/model snapshot plus per-product, per-session,
and monthly caps as integer USD micros; null or incomplete caps keep the path
fail-closed. Changes require AAL2, a signed idempotent command, an attributable
reason, an optimistic version, and typed `ENABLE_PAID_AI` confirmation. The
server rejects Admin/Staff changes and the browser never receives a provider
key. This is prepared local behavior only: the migration, SuperAdmin assignment,
provider/model, retention, and `K2_AI_SPEND_CONTROLS_ENABLED` activation remain
unapplied/unverified, with the manual two-Project workflow as fallback.

The prepared signer extension was re-audited on 30 August: it preserves the
existing Admin action allow-list, catalog payload ceiling, actor/global rate
buckets, MFA replacement, website-reply, and Product Knowledge actions while
adding only `ai_spend_controls_update`. The focused paid-control and invitation
contracts pass after this correction; no provider call or production migration
is claimed.

**Evaluation and completion evidence:** create a versioned, non-production
fixture set covering every active K2 category, exact-variant/barcode conflicts,
poor/missing package evidence, unsupported facts, prohibited operational fields,
provider timeout/rate limit/refusal, malformed structured output, image fidelity
rejection, duplicate click/retry, interruption/resume, cap exhaustion, and manual
fallback. Every content result must pass the real server schema or fail closed;
no unsupported fact may be silently accepted. Every image requires human
approval and a preserved original. Prove cost attribution and hard-stop behavior
with provider test/preview calls, then run a complete phone workflow that resumes
after app switching and produces one reviewed Draft plus rejected/accepted image
evidence without creating inventory. Production activation additionally needs
the exact owner-approved model snapshots, retention decision, per-product and
monthly budget caps, server environment inventory, monitoring/alert thresholds,
rollback/kill switch, and real-host staff acceptance.

**Deliver:**

- Make both production builds compile without undeclared packages or missing
  exports, while preserving the approved two-Project manual ChatGPT workflow as
  the fail-closed fallback for the paid automatic sequence.
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

**Complete when:** a real exact-variant product can be captured on a phone;
processed through either the evaluated paid automatic sequence or its manual
fallback; resumed after app switching; reviewed field-by-field with accepted
content and images traceable to evidence/model/prompt versions; assigned one
server SKU; optionally added through one controlled inventory source; and
published only after server-side readiness. Every provider, budget, validation,
permission, interruption, and write failure is recoverable and cannot create
duplicate cost, Draft, inventory, or publication truth.

**Record in:** product intake service/UI, migrations/RPCs, Product Master and
Sheet Mode runbooks, tests, operations rulebook, System Brain, and design record.

### MAP-019 — Hybrid guest/account commerce, universal messaging, and secure sessions

**Status:** Queued — local preparation exists; production activation depends on
MAP-017

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

**31 August route/receipt audit (`IDEA-20260831-03`):** the exact current
failure is now pinned. `finishOrder()` stores the receipt only in React memory,
clears the cart, and calls `setView('confirmation')` without synchronizing the
browser location. A successful request can therefore still display
`/checkout`; refresh/back loses the receipt and a cold `/confirmation` has no
scoped lookup or H1. MAP-019 owns the secure continuation: resolve the receipt
through the existing bounded guest grant or authenticated account boundary,
keep identifiers/tokens/customer data out of public URLs, and prove submit →
confirmation → reload/back/forward on the real host.

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
Turnstile configuration/host tests, deployed customer Auth/account continuity, Admin data
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

**Local Admin routing consolidation (21 August 2026; deployable guard added 22 August):** the 50 prepared Admin
leaf handlers now have one explicit, fail-closed router and one consolidated
serverless entrypoint exposing 51 exact method-aware routes. Its verifier derives every route from the filesystem and
fails on omissions or duplicates; focused tests prove exact routing and minimal
`404` denial for unknown/traversal-like paths. This resolves the local handler-
consolidation design work behind the Vercel Hobby limit. The guarded
`api/admin/index.js` entrypoint and exact `/api/admin/*` rewrite now exist
locally. Deployment remains blocked on MAP-017, exact
server environment and private secret configuration, direct-browser removal,
and real-host session/CSRF/origin/route denial evidence. No deployable `api/`
leaf handlers, server/browser feature flags, Vercel project, or live route were
changed. The entrypoint returns
`404` unless both the target and `K2_ADMIN_BFF_ENABLED=true` match.

The same consolidation now covers all ten prepared Storefront handlers with a
separate exact allowlist and single guarded `api/storefront/index.js` entrypoint.
Both verifiers compare
their router manifests to the filesystem, and both focused route-denial suites
pass. The prepared design therefore targets one function per artifact instead
of 52 leaf functions while preserving separate production artifacts. Exact
rewrites and independent default-off server switches now exist locally;
provider environments, flags, and real-host tests remain deliberately inactive.
A Vercel preview inventory must still prove artifact packaging.
All 127 API/security contracts, the complete security gate, and both sequential
isolated production builds pass after this promotion. Those are local gates,
not preview or production evidence.

**Local Admin session hardening (21 August 2026):** active and pending encrypted
cookies now use versioned, exact payload contracts. Each authentication rotates
to a new opaque session UUID and CSRF token; refresh preserves the UUID and
original absolute-lifetime anchor while rotating encrypted provider material.
Tampered ciphertext and malformed role/identity/hash/token/timestamp/lifetime
fields fail closed. Focused verifier coverage passes. The durable registry below
now prepares per-device revocation, session/device listing, provider-session
invalidation, and logout-all; live Auth behavior tests remain an activation gate.

**Prepared durable Admin session boundary (22 August 2026):** a new additive,
unapplied migration creates a private session registry with no table grants to
browser roles. Login and MFA now prepare a new opaque session but issue its
cookie only after an AAL2-, staff-, actor-, signature-, and nonce-bound database
registration succeeds. Every protected Admin route and `/api/admin/session`
validates and touches the same actor-owned, unexpired, unrevoked registry row
before refreshing the cookie. Logout attempts durable current-session revocation
before provider sign-out and always clears the local cookie; registry uncertainty
returns a stable failure instead of pretending remote revocation succeeded.
Two prepared endpoints provide a bounded current-user session list and reasoned,
CSRF-protected, payload-bound idempotent revocation of one or all owned sessions.
The same private migration records only bounded registration, validation-denial,
and revocation outcomes; it stores no tokens, IP addresses, user-agent strings,
provider errors, or free-form event payloads.
Each K2 registry row is now bound to the UUID in the provider JWT `session_id`
claim and to the matching actor-owned `auth.sessions` row. Registration rejects
a missing provider session. Validation checks that row on every protected
request; password change, global sign-out, or another provider security action
that removes it immediately revokes the K2 row with the bounded
`provider_session_inactive` reason instead of accepting the still-unexpired JWT.
The isolated PostgreSQL lifecycle proves registration, active validation,
provider-row removal, K2 revocation, denial evidence, rollback, and replay.
The consolidated Admin router now covers 56 exact routes with zero security-
control classification gaps, and all 139 contracts pass. This is prepared local
behavior only: the migration, shared server/private signing secret, route
rewrite, feature flag, live provider behavior, broader security-event
correlation/retention/alerting, and real-host stolen-cookie denial remain unfinished.

**Production Storefront prototype-auth removal (22 August 2026):** the isolated
Storefront entry previously imported `DemoRail`, so any production visitor could
append `#demo` and expose a prototype password form labelled `VIP Login` with the
unsupported promise `Authenticate to unlock tier pricing.` The form called
Supabase Auth directly in browser code and bypassed the approved optional-account,
verified-contact, and server-authorized wholesale model. `StorefrontApp` no
longer imports or renders that rail; the rail remains available only in the
combined workstation entry. The production boundary verifier now rejects its
distinctive VIP/prototype markers, Playwright proves `#demo` exposes no rail in
Storefront mode, the seven guest-boundary contracts and all 128 API/security
contracts pass, and the isolated Storefront build/boundary/secret scans pass.
This is Tier 1 local source, browser, and compiled-artifact evidence—not account
verification/claim completion or deployed-host proof. Optional customer account
Auth, verified claim consumption, server-authorized wholesale terms, and the
MAP-017-gated BFF activation remain open, so MAP-019 stays in progress locally.

**Prepared verified guest-to-account claim boundary (22 August 2026):** the
seventh fixed Storefront route, `POST /api/storefront/account/claim`, accepts
only a customer Supabase bearer session, the active scoped HttpOnly guest grant,
and an exact contact-kind/idempotency payload. Its additive signed database
command derives identity only from a confirmed Auth email or phone, matches the
private contact HMAC inside the grant's customer, rejects cross-customer and
existing-account conflicts, consumes one payload-bound claim, links the account,
revokes the guest grant, and records one bounded private audit event. Transaction-
scoped actor/contact locks make concurrent claims deterministic; successful
idempotent retries do not multiply audit events. An isolated PostgreSQL 17.11
rehearsal proved rollback restoration, apply/postflight privileges, verified
link/revocation, exact nonce replay denial, changed-payload idempotency conflict,
unauthenticated denial, and safe migration replay. Nine focused Storefront
contracts, all 130 API/security contracts, and the static BFF verifier pass.
This is Tier 1 local source plus database-executed evidence only. No migration,
secret, server/browser flag, Auth UI, preview, or production route was activated;
real-host verification and the MAP-017-coordinated cutover remain open.

**Prepared customer account continuity (22 August 2026):** two additional fixed
Storefront routes now restore the approved value of an optional account after
claim. One signed authenticated projection returns at most 20 deliberately
linked order requests, Pasabuy requests, and conversations with at most 100
customer-visible messages each; it excludes contact PII, delivery addresses,
staff-only notes, raw provider data, and every other customer. One signed reply
command binds `auth.uid()` to the active account/customer and exact conversation,
uses durable actor rate limiting and payload-bound idempotency, and accepts no
customer or user identifier. The PostgreSQL rehearsal proved linked history,
cross-customer exclusion, internal-note exclusion, authenticated reply, duplicate
retry, and cross-customer reply denial after the guest grant was revoked.

The Storefront now has a separate client flag, default false, for a passwordless
email-link or phone-code account surface. Account is a secondary header utility,
so the established five-item mobile navigation remains unchanged. The flow has
explicit checking, sent, code, offline, unlinked, conflict, empty, refresh, reply,
and signed-out states; it never promises VIP/wholesale terms and never makes an
account a checkout or messaging prerequisite. Two 375px Chromium journeys pass,
including offline mutation blocking, no horizontal overflow, dark mode and
landscape checks, verified claim, scoped history, and bearer-authenticated reply.
Thirteen focused Storefront contracts, all 134 API/security contracts and the
security gate, both isolated production builds and their artifact-boundary/secret
checks, and all eight default-flag Storefront smoke journeys pass. The customer
flag is explicitly allowlisted only in the Storefront browser-environment
contract. This remains Tier 1 local source, rendered-browser, database-executed,
and compiled-artifact evidence: Supabase customer Auth redirect/
SMS settings, provider abuse limits, migrations, secrets, server/browser flags,
preview and production hosts are not activated or proven.

**Prepared customer passwordless Auth server boundary (25 August 2026):** the
default-off account client no longer calls provider `signInWithOtp` or
`verifyOtp` methods directly. Three fixed same-origin Storefront routes now own
email-link request, SMS-code request, and SMS-code verification. Before any
provider operation, each route consumes a signed, nonce-protected durable budget
whose IP, normalized-contact, and verification subjects are domain-separated
server HMACs; raw email, phone, code, and IP values never enter the database.
Email allows 5/IP/15 minutes, 3/contact/hour, and 120/global/minute; SMS send
allows 5/IP/15 minutes, 3/contact/hour, and 60/global/minute; SMS verification
allows 10/IP/15 minutes, 5/phone/15 minutes, and 120/global/minute. Denials
persist and return generic `429` plus `Retry-After` before email, SMS, or token
verification. Successful SMS verification returns only the bounded customer
access/refresh pair used by `setSession`; claim and commerce authority stay
separate. Email-link and SMS-code issuance now also require an exact bounded
Turnstile token with the `customer_auth` action. Each route consumes its durable
budget before challenge verification, returns safe `403 BOT_CHALLENGE_REQUIRED`
on challenge denial, and makes no provider delivery call; SMS-code verification
keeps its strict durable attempt budget without a redundant second challenge.
The existing passwordless account card renders the reusable accessible security
check, sends the token only with issuance, and resets it after each request
attempt, including an ambiguous request failure. Five focused contracts, the
PostgreSQL 17.11 threshold/privilege/
denial/replay/privacy/cleanup/migration-replay rehearsal, all 174 API/security
contracts, three rendered customer/Wholesale journeys (including the exact
browser token body and 375px no-overflow capture), both BFF verifiers, the
zero-gap security audit, import integrity, and a fresh Storefront production
build pass. This is prepared Tier 1 local evidence. No migration, secret,
provider email/SMS, Turnstile secret/site policy, redirect policy, WAF limit,
feature flag, preview, alert,
or production host was changed; deployed delivery, expiry, replay, denial, and
real-customer session proof remain in this MAP-019/MAP-020 item.

**Wholesale inquiry truth correction (22 August 2026):** the Storefront form
previously generated a random `WA-*` reference, stored it only in localStorage,
called the result submitted/recorded, and promised review within 1–2 business
days. No server had received the inquiry and OWNER-003 has not approved an SLA.
The default-off surface now prepares an explicitly unsent email draft, stores no
application in browser storage, collects only a delivery city/area instead of a
full address, withholds tax/registration evidence until staff requests it, and
states that pricing, stock, credit, delivery, approval, and response time remain
unconfirmed. Every field now has a programmatic label. A focused source contract
and a 375px rendered journey pass with no overflow; visual review uses K2's blue
business context rather than a green success state. This is a truthful fallback,
not the completed canonical organization/buyer authorization boundary.

The default-off secure path now has a tenth fixed Storefront route and an
additive inquiry-only migration. Exact Origin, Turnstile, bounded schema, signed
request, durable IP/contact rate limits, payload idempotency, canonical customer,
Website conversation, scoped guest grant, private receipt, forced RLS, and a
minimal `WI-*`/`CV-*` response are prepared. The schema has no price-list,
pricing-approval, credit-limit, terms-approval, stock, or delivery-approval
field, and unknown authority input is rejected. The expanded PostgreSQL 17.11
rehearsal passes rollback restoration, apply/postflight privileges, successful
capture, duplicate retry, changed-payload denial, authority-field denial, and
migration replay. A feature-enabled 375px journey proves the server receipt and
absence of authority fields. Both isolated production builds and boundary/secret
scans, the complete security gate, and all eight default-off smoke journeys also
pass. This is Tier 1 local database/browser/compiled-artifact evidence;
migration/flag/Turnstile/provider/preview/production activation remains blocked
by MAP-017, and commercial authorization remains blocked by OWNER-003.

The Admin side now has a fixed, Admin-only, staff/AAL2 inquiry projection and a
separate signed triage command. Staff can move an inquiry only among
`submitted`, `under_review`, and `closed`; every non-no-op transition requires a
3–500 character reason, records actor/from/to evidence in a private ledger, and
is payload-idempotent, rate-bounded, replay-protected, and recoverable by moving
a closed inquiry back under review. The command returns public references and
explicitly reports `commercialAuthorityAvailable=false`; neither its schema nor
the responsive Admin UI can approve a buyer, price list, quote, credit, terms,
stock, or delivery. The 375px reason dialog has 44px controls, reduced-motion
coverage, no horizontal overflow, and passed rendered visual review. The
expanded PostgreSQL rehearsal passes rollback, apply, staff/AAL2 read denial,
fixed projection, transition evidence, duplicate retry, changed-payload denial,
and migration replay. All 135 API/security contracts, the complete security
gate, the 56-route Admin verifier, and both sequential isolated production
build/boundary/secret checks pass. This remains Tier 1 local evidence only;
MAP-017 still blocks activation and OWNER-003 still blocks all commercial policy.

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
- If the owner later activates K2 Standard Delivery in customer checkout, derive
  it only from independently imported approved delivery rows, revalidate the
  complete eligibility decision on the server, and freeze the accepted customer
  charge plus workbook release, rate-version, rate-rule, and exact-location-rule
  identifiers onto the order. A later rate revision must never recalculate or
  change an accepted order. Manual-pilot workbook preparation is not checkout
  activation and does not change the current `Quoted after review` surface.
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

**Customer retention/deletion audit (22 August 2026):** no approved retention
periods, legal/finance hold rules, anonymization map, request owner, approval
role, or backup propagation rule currently exists. A generic delete endpoint
would be unsafe: customer contacts, accounts, channel identities, guest grants,
claims, orders, Pasabuy requests, Wholesale inquiries, and conversations all
preserve canonical/operational links. `CUSTOMER_DATA_RETENTION_AND_DELETION_RUNBOOK.md`
now records the data-class matrix, verified-request and dry-run requirements,
access revocation, immutable counts, retained-truth rules, and the explicit ban
on cascading customer deletion. `OWNER-006` captures the decisions that
engineering cannot invent. A new contract scans every ordered migration and
fails if a `customers` foreign key becomes cascading, any migration directly
deletes canonical customers, or a premature `account/delete` route appears.
This is Tier 0 documented/source-guarded evidence and is BLOCKED on OWNER-006;
it is not a deletion workflow or a claim that any request can be recorded.

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

**Status:** Queued — local preparation exists; production activation/evidence
depends on MAP-017 and MAP-019

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
- A future delivery-rate workbook importer must treat the file as untrusted input,
  ignore cached formula/QC/approval results, allowlist source-table columns, and
  independently validate stable identifiers, reference integrity, Philippine-peso
  numeric bounds, exact-locality scope, inclusive-start/exclusive-end effective
  dates in Asia/Manila, duplicates/overlaps, and an approval receipt held outside
  the workbook. It must never evaluate spreadsheet formulas, macros, links, or
  embedded content, and it must persist the accepted source-row snapshot rather
  than depend on a mutable workbook at runtime.
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

**Source security-surface inventory (21 August 2026; refreshed 25 August):** a new fail-closed scanner
inventories the prepared BFF and Edge entrypoints plus literal browser/server
Data API, RPC, Auth, Storage, Realtime, and same-origin API operations with
file/line evidence. The current source pass records 68 Admin routes, 13
Storefront routes, two Edge Functions, 43 API requests, 39 Auth operations, 12
Realtime subscriptions, 77 RPC calls, 14 Storage operations, and 104 table
operations. Variable BFF routes are now exact allowlists, the generic Admin
image bucket is fixed to `product-images`, the command-center channel name is
static, literal constants are resolved, and the scanner reports zero unreviewed
dynamic operations. Its regression is part of the contract suite and the
fail-on-gap audit is part of every prebuild. The inventory now also parses the
ordered repository migration target (excluding historical `RUN_THIS_*` scripts):
146 function-definition occurrences resolving to 123 signatures, 118 grant and
163 revoke events, six function `search_path` hardenings, 13 publication changes,
125 policies including 15 Storage policies, and zero scheduled jobs. It reports
zero effective `SECURITY DEFINER` functions without a fixed `search_path` and,
after the prepared `20260821_function_execute_lockdown.sql`, zero functions with
default PostgreSQL `PUBLIC` execute. The two unused legacy purchase-receiving
RPCs are prepared as service-role-only; seven trigger helpers lose client
execution. The coordinated cutover now uses four explicit legacy-function
revokes instead of opaque dynamic SQL, leaving an exact allowlist of 11
anonymous boundary functions including the signed pre-auth recovery budget and
Wholesale inquiry, plus two authenticated-only account
continuity functions. CI fails on any unexpected/missing anonymous
grant or restored `PUBLIC` grant. PostgreSQL `int` and `integer` identity aliases
have regression coverage so one deprecated function is not falsely counted
twice. All 68 Admin and 13 Storefront router entries now publish exact method
and boundary-control metadata; routers enforce methods before dispatch, and the
prebuild fails if an Admin mutation lacks its required origin/session/CSRF/
idempotency classification or a Storefront route lacks origin/signature/durable
database-rate classification. The current route-control gap count is zero. This
is source and migration-target evidence—not deployment, authorization, real
rate-limit, CORS/provider, or end-to-end behavior proof—and production endpoint
comparison plus live denial testing remain required.

**29 August route-inventory refresh:** two intentional signed commands added by
existing MAP-019/MAP-027 work—`inbox/send-reply` and
`product-knowledge/save`—bring the prepared Admin router to 70 exact routes. The
standalone verifier had remained hard-coded at 68 and now enforces the same
70-route prepared-module equality already covered by the router contract. The
Admin verifier passes, the fail-closed security inventory reports 70 Admin and
13 Storefront routes with zero control-classification gaps, and the broader
source/API contract run passes 366/366. No production BFF flag or provider state
was changed.

**Tier — customer Auth issuance bot gate complete locally (25 August 2026):**
the prepared `account/auth/email` and `account/auth/phone` routes now require an
exact bounded Turnstile token for the `customer_auth` action. Durable HMAC-only
IP/contact/global budget consumption happens first; a budget denial performs no
bot or provider work, while a challenge denial returns safe `403
BOT_CHALLENGE_REQUIRED` and performs no email/SMS delivery. The existing account
surface reuses the accessible challenge component, sends the token only for
email/SMS issuance, and resets it after each request attempt, including an
ambiguous request failure. Six-digit SMS
verification remains challenge-free and protected by its separate stricter
IP/phone/global attempt budget. Focused RED failures proved the missing payload,
route metadata, denial ordering, and browser body before implementation. Five
focused tests, all 174 API/security contracts, three Chromium account/Wholesale
journeys, both BFF verifiers, the zero-gap security inventory, import integrity,
and the Storefront production prebuild/build/boundary/secret scans pass. The
375px account capture has no horizontal overflow and preserves the established
Storefront identity. This is prepared/local evidence only: flags remain off and
no provider, Turnstile, migration, preview, WAF, alert, or production state was
changed. Recovery is to keep both Storefront BFF/customer-account flags false;
if the coherent slice must be removed, revert the issuance route controls,
payload contract, and account challenge together before rebuilding.

**Tier — durable staff login/MFA/recovery pre-auth budgets complete locally (25
August 2026):** the prepared login, pending-session MFA, recovery-mail request,
token-verification, and recovery-completion routes now sign one anonymous
database call before password Auth, provider-session restoration, provider mail,
token verification, password mutation, or global sign-out. The server
domain-separates HMAC-SHA256 IP, normalized-email, pending-session-ID,
recovery-token, and recovery-session-ID subjects by action with the existing
32-byte Admin request secret, so the database receives and stores only lowercase
64-hex identifiers and cannot correlate raw contacts or pending sessions across
actions. Private forced-RLS buckets enforce login limits of 20/IP/15 minutes,
10/contact/hour, and 300/global/minute; MFA limits of 10/IP/15 minutes,
5/pending-session/15 minutes, and 300/global/minute; recovery-mail limits of
5/IP/15 minutes, 3/contact/hour, and 120/global/minute; verification limits of
10/IP/15 minutes, 3/token/15 minutes, and 120/global/minute; plus completion limits
of 10/IP/15 minutes, 5/recovery-session/15 minutes, and 120/global/minute. Every allowed or denied
attempt persists, stale rows are bounded, and a private ten-minute nonce ledger
rejects replay.
The public function has fixed `search_path`, grants only `anon`, and verifies the
action, timestamp, nonce, subject hashes, and HMAC before touching counters. A
denial returns generic `429 RATE_LIMITED` with the database `Retry-After`, and
behavioral handler tests prove zero password-Auth, provider-session restoration,
provider-email, token-verification, password-update, and global-sign-out calls
after the relevant denial.
Credential login and recovery-mail issuance now also require an exact bounded
Turnstile token for `admin_auth` after durable budget consumption. Budget denial
performs no challenge/provider work; challenge denial returns safe `403
BOT_CHALLENGE_REQUIRED` before password Auth or provider mail. The existing
compact Admin auth surface sends the token only in secure Admin mode and resets
it after success, denial, timeout, or ambiguous failure. Pending MFA, recovery
verification, and completion keep their dedicated durable limits without a
redundant challenge. The shared challenge engine is artifact-neutral; an initial
Admin build caught and rejected its Storefront service import, and the corrected
Admin and Storefront boundary builds both pass. Recovery is to keep the Admin BFF
flag false; if this coherent slice must be removed, revert both route bot
controls, exact token payloads, Admin form challenge state, and activation
environment requirements together before rebuilding either artifact.
Boundary errors fail closed as `AUTH_UNAVAILABLE` or
`PASSWORD_RECOVERY_UNAVAILABLE`. The PostgreSQL 17.11 rehearsal proves anonymous
execution, authenticated/table denial, forced RLS, all five actions' fifteen IP/
contact-or-session/global thresholds, denial persistence, signature/replay
rejection, cleanup, HMAC-only schema, the reusable read-only postflight, and
migration replay. All
53 Admin BFF contracts, all 179 API/security contracts, two focused 375px Admin
auth journeys, the 68-route Admin
verifier, and the zero-gap source audit pass. This is prepared/local evidence
only: no production migration, Turnstile site/secret key, provider setting,
feature flag, preview,
or host changed;
provider/WAF limits, real mail/prefetch behavior, deployed denials and alerts
remain open.

**Tier — distributed Admin request budgets complete locally (22 August
2026):** the latest prepared Admin session migration now adds a private,
forced-RLS one-minute bucket boundary above the existing per-action command
limits. Every correctly signed AAL2 staff request consumes a cross-action actor
budget (360/minute) and a shared Admin budget (6,000/minute) before nonce
acceptance; buckets contain only scope, actor UUID or the fixed global subject,
minute, and count, and stale rows are bounded to one day. The BFF preserves the
specific database denial and returns a safe `429 RATE_LIMITED` with
`Retry-After: 60` instead of collapsing it into a `503`. Focused contracts pass,
and isolated PostgreSQL behavior proves the 361st actor request and 6,001st
global request are denied while rollback, apply, postflight, and migration replay
still pass. This is prepared/local evidence only: the migration and BFF flags
remain inactive, and live-host/WAF/provider limits remain open.

**Tier — Shopee ingress bounds and deterministic replay identity complete
locally (25 August 2026):** the prepared Events-only Edge intake now accepts
only JSON, reads at most 256 KiB, rejects invalid UTF-8 and declared/actual byte
mismatches, and requires an explicit 1–30,000 ms absolute body-read deadline.
A stalled stream is cancelled and returns retryable `503`; missing or invalid
deadline configuration also fails closed rather than inheriting the Edge
platform's 150-second idle ceiling. The intake carries the untouched request bytes into the existing signature
check while parsing a separate strict UTF-8 view. A signed payload must contain a positive shop ID, bounded event code,
provider timestamp, object data, and either a deterministic event ID or exact
order number/status identity. Event keys are shop-scoped; the former
`Date.now()` fallback is removed. A required 60–86,400-second environment value
sets the replay window from the approved provider contract, and stale or
future-skewed events fail before durable capture. Database persistence failures
retain stable internal guidance without copying raw provider diagnostics. Four
focused behavioral contracts and all 179 API/security contracts pass, together
with the zero-gap security inventory and environment-source boundary. This is local source evidence only: publicly
available official pages did not expose the exact signing contract, so the
existing signature formula remains explicitly unverified; no credential,
function deployment, body-deadline/replay-window value, real signed push, provider capture,
normalization, stock reservation, or channel status changed. Recovery is to
leave the function undeployed/Events-only until the exact partner documentation
is approved and the configured window plus real retry behavior pass end to end.

**Live confirmation of the Events-only state (25 August 2026 verification).** The
live migration ledger holds exactly five entries, the newest
`remove_legacy_delete_products_rpc` at version `20260815082633`. **Nothing dated
after 15 August 2026 is applied to production.** `capture_shopee_event_v1` is
therefore absent from the live database — it is confirmed missing from the
24 August schema export and its migration
(`20260825_shopee_webhook_ingress_boundary.sql`) is dated 25 August. So is
`get_public_product_stock`, consistent with MAP-017 being unapplied. This
independently corroborates the assessment below rather than contradicting it:
channel ingress is not merely un-activated, its database entry point does not
exist yet, so the Events-only posture is enforced by absence. Keep the Edge
function undeployed until the coordinated migration is authorized and applied.

**Tier — Shopee atomic capture and distributed ingress budgets complete locally
(25 August 2026):** direct inbox `upsert` has been replaced in the prepared Edge
path by service-role-only `capture_shopee_event_v1`. The coordinated migration
creates private forced-RLS configuration and rate-bucket tables, consumes a
per-shop and connector-global budget inside the same database command that
captures the event, persists denied counts, preserves terminal inbox state on
an exact replay, and refuses changed type/payload under an existing event key.
No default production limits are inserted: missing approved configuration
returns safe unavailable state, while rate denial returns `429` plus
`Retry-After`, identity conflict returns safe `409`, and database ambiguity
returns retryable `503`. The isolated PostgreSQL 17.11 rehearsal proves
fail-closed configuration, service-role-only execution, forced RLS, shop/global
thresholds and denial persistence, replay preservation, conflict safety,
cleanup, read-only postflight, and migration replay. The focused Shopee suite,
all 179 contracts, the complete security/prebuild gate, and both separate
production builds pass; the first restricted-sandbox Storefront build could not
read Vite configuration, and the identical approved workspace run passed. This
remains prepared/local evidence: no database migration, provider-owned limits,
Edge deployment, credential, signed push, connector state, normalization,
reservation, or channel-status change was applied. Recovery is to keep the
prepared function undeployed; after an authorized apply, remove/disable the
Edge route or revoke `service_role` execute on the capture command if its
budget/capture behavior cannot be reconciled.

**Tier — public product-media upload transport complete locally (22 August
2026):** one fixed Admin BFF route now accepts only authenticated, AAL2,
same-origin, CSRF-protected binary uploads with a UUID idempotency key. It
accepts JPEG, PNG, or WebP up to 4 MB; decodes and re-encodes the image; enforces
100–12,000px axes and a 40-megapixel ceiling; strips metadata; derives the
actor/product-media/idempotency/content-hash object path; and registers the
verified Storage object through a signed, receipt-backed database command with
a 20/minute per-action limit. Identical retries return the same result and a
changed payload conflicts. The shared Admin uploader now preserves partial
success, announces checking/uploading/failure state, retries only unfinished
files with stable operation keys, has 44px touch actions, and removes the raw
URL/SVG bypass. A reduced-motion 375px Chromium check proves rejection copy and
no horizontal overflow. The database rehearsal, focused contracts, security
surface audit, Admin BFF verifier, and isolated Admin build pass. This tier is
local and inactive: the legacy direct-browser path remains while the BFF flag is
off; public-object deletion/orphan reconciliation and other CMS/review-media
commands are still open; the migration, flag, and host are not activated; and hostile-file,
authenticated provider, and real-host denial evidence remains required.

**Tier — product-media assignment and removal complete locally (22 August
2026):** a second exact Admin route now binds product photo changes to the
verified upload receipts instead of accepting arbitrary new URLs. The command
requires the live AAL2 staff session, exact origin, CSRF, UUID idempotency,
allowlisted SKU/media arrays, and a 3–500 character reason; verifies every new
object belongs to the actor and still exists in `product-images`; permits a
legacy URL only when it is already assigned to that same product; locks the
canonical product; updates primary compatibility, lifestyle, and supporting
arrays atomically; records private forced-RLS before/after audit evidence; and
limits assignment to 30/minute. Draft removal is supported, while a published/
Live product cannot lose its primary photo. A read-only production schema check
confirmed the canonical columns (`primary_image_url`, `image_url`,
`lifestyle_images`, `secondary_images`) and 30 product rows without changing
production. `InventoryGrid` no longer embeds upload controls or includes image
fields in its broad direct-save payload; both Admin product editors route photos
through the dedicated workflow. PostgreSQL rollback/apply/postflight/replay and
behavior, all 139 contracts, the zero-gap security inventory, Admin verifier,
isolated Admin build, and all seven Admin Chromium tests pass. This is inactive
local evidence: the migration and BFF flags remain off, Globe/review media remain
open, and no authenticated provider
or real-host assignment was performed.

**Tier — product-media object cleanup and orphan reconciliation complete locally
(22 August 2026):** assignment now computes deletion candidates only after the
canonical product update, and only for removed URLs backed by completed upload
receipts and no longer referenced by any product primary, compatibility,
lifestyle, or supporting field. Storage deletion is a separate signed phase:
assignment remains truthful and successful during an ambiguous provider failure,
the private forced-RLS event stays `pending`, and an identical retry uses the
same operation key until Storage absence is re-verified and completion is
recorded. An Admin/AAL2-only orphan review lists at most 100 receipt-backed,
unreferenced uploads after a minimum one-hour safety window; its reasoned cleanup
command rechecks every reference immediately before removing at most 25 files.
Inventory exposes this as an Admin-only “Unused uploads” maintenance dialog with
selection, byte/type/time evidence, stable retry, inline pending/error/success
states, 44px actions, mobile bottom-sheet behavior, and reduced-motion loading.
PostgreSQL rollback/apply/postflight/replay and behavior, all 139 contracts, the
56-route verifier, the zero-gap security inventory, the isolated Admin build,
and all seven Admin Chromium tests pass. This tier is local and inactive: no
production object was deleted, the migration/BFF flag/host remain unchanged,
and Globe CMS, review media, authenticated provider, preview, and real-host
denial evidence remain open.

**Tier — Globe configuration and review-claim lifecycle complete locally (22
August 2026):** one fixed Admin-only GET/POST boundary now owns Globe visibility
and review moderation. Signed commands require a live AAL2 Admin session, same
origin, CSRF, UUID idempotency, exact bounded schemas, optimistic versions, a
30/minute per-action limit, and a specific reason. Review creation is draft-only
and records source kind/reference, rights basis, and rights confirmation;
publication fails without that evidence. Editing published copy returns it to
draft and records withdrawal time, while withdrawal preserves the claim instead
of deleting history. Private forced-RLS events retain actor/reason/before/after
evidence. The coordinated migration revokes direct authenticated Globe/review
mutation, and anonymous review reads receive only public columns from
`published` records; private provenance and rights evidence are not granted. A
read-only live check confirmed 17 Globe rows, zero review rows, and the exact
legacy columns without changing production. The Admin UI provides permission,
loading, empty, error, success, attributable-draft, publish, withdrawal, and
correction states with 44px controls, reduced motion, and a mobile bottom sheet.
PostgreSQL rollback/apply/postflight/replay and behavior, all 140 contracts, the
57-route verifier, zero-gap security inventory, isolated Admin build, and all
eight Admin Chromium journeys pass; the rendered 375px confirmation state was
visually reviewed. This is local prepared evidence only: no migration,
server/browser flag, provider object, preview, or production host changed, and
no review is claimed published. Authenticated-provider and real-host denial
evidence remain open behind OWNER-005/MAP-017/MAP-019.

**Secure Admin shared-provider isolation correction (25 August 2026):** the
Admin artifact previously mounted `RemoteGlobeCmsProvider` whenever browser
Supabase was configured, even with the Admin BFF selected. That unused provider
started direct Globe/review Data API reads plus browser Auth session/listener
work in parallel with the secure Globe BFF workspace. `AdminApp` now selects an
inert legacy Globe context before the remote provider can mount in secure mode.
Storefront public Globe reads and the explicit flag-off Admin compatibility path
remain unchanged. The contract completed RED→GREEN; all 173 API/security
contracts, the zero-gap source inventory, Admin verifier, import check, 15 Admin
Chromium journeys, and a fresh Admin production build/boundary/secret scan pass.
This is prepared local evidence only; no flag, migration, provider configuration,
preview, or production host changed. The separate audit also confirmed Google
OAuth returns unavailable before its provider call in secure mode; credentials
remain outside the active queue and no OAuth feature was invented.

**Secure Admin shared-shell transport reachability correction (25 August
2026):** the follow-on audit cleared `useAdminInboxRuntime`: when secure mode is
selected, every inbox projection, history read, mutation, and polling effect
branches before its legacy browser query/RPC/Realtime path. It found one product-
shell defect: `AdminStoreContext` rejected loading and refresh whenever the
browser Supabase client was absent before checking the Admin BFF. That made a
valid cookie-bound product projection depend on the transport it is intended to
replace. The guard now evaluates the secure transport first, uses
`getAdminProducts` plus bounded visible-page polling without a browser client,
and preserves the flag-off browser query and product/lot Realtime compatibility
path. The contract completed RED→GREEN; all 173 API/security contracts, zero-gap
source audit, Admin verifier, import integrity, 15 Admin Chromium journeys, and
a fresh Admin build/boundary/secret scan pass. This is prepared local evidence;
no server/browser flag, migration, provider, preview, or production host changed.

**Tier — supplier directory and procurement read boundary complete locally (22
August 2026):** live read-only inspection confirmed the exact `suppliers`,
`purchase_orders`, and `po_lines` contracts, current staff policies/grants, and
zero rows in all three tables. One fixed staff/AAL2 GET now returns bounded
supplier and purchase-order projections and explicitly reports purchase-order
creation and receiving unavailable. One Admin-only supplier-create command
requires exact bounded name/email/lead-time fields, a reason, origin, CSRF,
signature, UUID idempotency, a 20/minute action limit, normalized duplicate-name
denial, and a private forced-RLS event. The coordinated migration revokes direct
authenticated mutation on all three procurement tables. The Admin surface uses
desktop registers and phone cards, safe complete states, a 44px evidence form,
focused mobile bottom sheet, and truthful copy that adding a supplier neither
approves pricing nor creates a purchase order. PostgreSQL rollback/apply/
postflight/replay, create/idempotency behavior, all 141 contracts, the 58-route
verifier, zero-gap security inventory, isolated Admin build, and the nine-test
Admin suite (eight unchanged journeys plus the corrected supplier journey) pass;
the 375px supplier dialog was visually reviewed. This is prepared/local only:
production data/grants remain unchanged, the migration/flags/hosts are inactive,
and purchase-order creation, approval, FX, actual purchase, receipt, payable,
settlement, landed cost, and supplier-return workflows remain MAP-023 work.

**Tier — channel-readiness read and internal-event verification complete locally
(22 August 2026):** read-only production inspection confirmed the exact
`channel_connections`, `channel_listings`, and readiness-view columns, eight
connection rows, zero listing rows, 120 derived readiness rows, and the legacy
authenticated execution grant on `verify_internal_channel_event`; production
was not changed. One fixed staff/AAL2 GET now reduces that catalog expansion to
five exact channel records and per-channel aggregate counts. One Admin-only
Website/Pasabuy command requires a matching canonical public request reference,
an attributable reason, exact origin, CSRF, signature, UUID idempotency, and a
20/minute action limit, then records immutable forced-RLS before/after evidence.
The coordinated migration revokes browser execution of the legacy status RPC.
The Admin surface uses the signed boundary in secure mode, bounded visible-page
polling instead of Realtime, complete loading/error/truth states, 44px controls,
focused Escape-close bottom sheets, and explicit copy that Shopee, TikTok Shop,
and Lazada are not connected. PostgreSQL rollback/apply/postflight/replay, all
142 contracts, the 59-route verifier, zero-gap security inventory, isolated
Admin build, and all ten Admin Chromium journeys pass; the 375px channel surface
was visually reviewed. This remains prepared/local only: live grants/data,
migration, flags, preview, and production hosts are unchanged; no external
connector, marketplace event, stock sync, or publication was proven.

**Tier — staff-access read, role change, and delete-PIN boundary complete
locally (22 August 2026):** read-only production inspection confirmed the exact
`user_profiles` columns, four current profiles (all Admin), the table grants,
and authenticated execution of `set_user_role`, `set_delete_pin`, and
`has_delete_pin`; no identities, roles, or credentials were changed. One fixed
Admin/AAL2 GET returns at most 200 minimal profiles, the actor's delete-PIN
configured flag, and explicit capability availability. Signed role and PIN
commands require exact schemas, a 3–500 character reason, origin, CSRF, UUID
idempotency, a 10/minute action limit, final-Admin protection, and immutable
forced-RLS before/after evidence; PIN values/hashes never enter that event.
The coordinated migration revokes browser execution of all three legacy RPCs.
The Admin surface uses a focused reason bottom sheet with initial close focus,
Escape recovery, 44px actions, and reasoned PIN/invitation forms. The next local
slice adds an exact Admin/AAL2 invitation BFF, server-only provider-token
forwarding, an additive v2 durable claim that binds and retains the 3–500
character reason, and the separate fail-closed
`K2_STAFF_INVITATIONS_ENABLED` activation switch. Fifty focused Admin/Edge
contracts, the 64-route verifier, zero-gap inventory, portable PostgreSQL
reason/replay/privilege/re-migration rehearsal, isolated Admin build, and the
focused 375px Chromium journey pass; the phone state was visually reviewed.
Production grants/data, migration, Edge version, switch, preview, and hosts
remain unchanged. One deployed AAL2 invitation/replay, real-provider active-factor
replacement, lost-factor recovery policy, deployed role-denial tests, and
owner/staff acceptance remain open.

**Pending-session TOTP enrollment slice prepared locally (24 August 2026):** a
correct invited Admin/Staff password with no verified factor now receives only
the existing ten-minute encrypted pending cookie. The exact MFA route validates
challenge/start/verify schemas, removes at most five stale unverified TOTP
factors belonging to that actor, bounds the provider SVG QR/manual key, verifies
the selected factor, repeats the staff-role and provider-AAL2 checks, registers
the durable session, and only then issues active/CSRF cookies. Provider tokens
never enter browser responses. The 375px auth step has labeled inputs, 44px
actions, restart/error recovery, and reduced-motion behavior. Fifty-one focused
API/security contracts, the 64-route zero-gap inventory, both isolated builds,
two focused staff/auth Chromium journeys, and four existing MFA/PIN journeys
pass; the phone state was visually reviewed. No BFF flag, provider factor,
production session, preview, or host changed. Active factor recovery/replacement,
real-provider enrollment, deployed denial/expiry evidence, and owner/staff
acceptance remain required.

**Active-factor TOTP replacement slice prepared locally (25 August 2026):** one
exact `/api/admin/staff-access/mfa-replacement` route now requires an active
Admin/AAL2 session, exact origin, CSRF, UUID operation key, and a 3–500 character
reason. Start fails unless exactly one verified factor exists, writes a signed
private requested receipt before provider mutation, cleans at most five stale
unverified setups, and returns one bounded replacement QR/manual key. Completion
verifies the exact new factor before retiring the exact previous factor, keeps
rotated provider tokens inside the encrypted cookie, and writes the linked
private completion receipt with reason plus hashed factor identifiers. An
ambiguous completion can retry under the same operation ID; multiple active
factors and lost-factor recovery fail closed. The separate
`K2_MFA_REPLACEMENT_ENABLED` switch stays off until migration/provider/role/host
proof. PostgreSQL 17 apply/behavior/replay/re-migration, the focused helper/route
contract, the 65-route verifier, zero-gap surface inventory, both isolated
production builds, and the reduced-motion 375×812 journey pass locally; the
phone dialog was visually reviewed. Production schema, factors, sessions,
flags, preview, and hosts were not changed. Lost-factor identity recovery, one
real provider replacement plus ambiguous retry, deployed denials, and owner/staff
acceptance remain required, so MAP-019 stays active.

**Staff password-recovery slice prepared locally (25 August 2026):** three exact
inactive Admin routes now request recovery mail without account enumeration,
verify only a bounded one-use provider token hash on the server, and complete a
password change through ten-minute encrypted recovery/CSRF cookies. The callback
must be one exact HTTPS Admin URL on the configured origin allowlist. Verification
requires a confirmed current Admin/Staff identity; completion rechecks that
identity and role, enforces a matching 12–128 character password, globally
signs out provider sessions, clears recovery cookies, and sends staff back to a
fresh password-plus-authenticator sign-in. Provider access/refresh tokens never
enter the browser response or URL. The 375px surface has generic request copy,
complete labeled states, 44px actions, reduced motion, and no horizontal
overflow. Fifty-one Admin BFF contracts, the 68-route zero-gap inventory, and
the isolated PostgreSQL five-action/fifteen-threshold rehearsal now pass; the
previous isolated production builds and focused Chromium journey passed, and the
phone success state was visually reviewed. Durable request, token-verification,
and completion denials now occur before their provider calls. The provider
template, redirect allowlist, permanent migration/secret, real mail,
link-tracking/prefetch, deployed replay/expiry/role denial, provider/WAF limits,
alerts, and real global-revocation behavior remain unverified,
so the independent feature flag stays off and no production/provider setting
changed. Lost-factor identity recovery is still separate and open; MAP-019
remains active.

**Tier — shared Admin navigation/search secure-data cleanup complete locally
(22 August 2026):** the secure Admin shell and command palette now reuse the
authorized product projection already owned by the Admin store instead of
issuing separate browser table reads. The palette no longer queries staff
profiles or presents those identities as customers, and its copy truthfully
limits search to products and commands. Secure shell badges derive active-SKU
and low-stock counts from the same projection, do not invent an order count,
and replace direct product/order Realtime subscriptions with bounded
30-second visible-page refresh. The disabled legacy path remains available only
while the Admin BFF feature flag is off. The previously unavailable secure
fulfillment badge now reads the fixed overview `orderBacklog` projection, aborts
stale requests, and renders unavailable instead of zero when that supporting
query fails. All 149 contracts, the 62-route Admin
verifier, the zero-gap security inventory, and the isolated production Admin
build pass; the source inventory is 104 table operations at this
checkpoint. This is
local code evidence only: the migration, server/browser flags, preview, and
production hosts remain unchanged; deployed badge truth is still unproven.

**Tier — procurement/inventory helper secure-cutover guards complete locally
(22 August 2026):** the Kanban purchase-order register now reads the existing
fixed procurement projection in secure mode, and the barcode helper uses the
protected product-intake duplicate search rather than a component-level product
query. Inventory Grid now reads the fixed product projection, uses bounded
visible-page polling instead of direct product/batch Realtime, routes Add Product
to phone-first intake, and fails closed on generic product edits and bulk status
changes until a reviewed, attributable command exists. Smart Paste remains a
content-review and image-handoff tool but refuses its legacy direct insert in
secure mode. Permanent product deletion reuses the protected staff-access read
for PIN-configuration state but refuses the legacy direct deletion RPC until a
dedicated signed command exists. The flag-off compatibility paths remain intact. All 148 contracts,
the 61-route verifier, zero-gap surface audit, and isolated Admin production
build pass; the current source inventory is 103 table operations. This is local
cutover preparation only: no migration, flag, provider environment, preview, or
production host changed, and generic product-detail/status/deletion commands
remain open instead of being simulated.

**Tier — product-master detail, lifecycle, and deletion command boundary complete
locally (22 August 2026):** the prior fail-closed gap is now replaced by one
Admin/AAL2-only `/api/admin/product-master` GET/POST boundary. The fixed GET
returns only reviewed editable fields for one validated SKU. Exact signed update
commands require an optimistic `updated_at` version, an 8–500 character reason,
origin, CSRF, UUID idempotency, and a 10/minute action limit, then write private
forced-RLS before/after evidence. Lifecycle commands expose all five canonical
states and enforce the legal transition matrix; Live additionally requires name,
brand, category, positive price, primary photo, and human review. Permanent
deletion wraps the existing Admin+AAL2 PIN/lockout/history safeguard and the
coordinated migration revokes the legacy function from `PUBLIC`, `anon`, and
`authenticated`, as well as direct authenticated product DML. Inventory Grid
uses reasoned 44px mobile actions, explicit permission-disabled states, safe
conflict/retry copy, numeric weight validation, and retains the flag-off legacy
path only for coordinated cutover. Isolated PostgreSQL rollback/apply/signed
behavior/postflight/replay, all 149 contracts, the 62-route verifier, zero-gap
security inventory, and the isolated Admin production build pass; the source
inventory records 104 table operations.

**Rendered Product Master acceptance correction (27 August 2026):** the former
Windows `EPERM` evidence gap is closed with a dedicated secure-flag Chromium
journey against the real `InventoryGrid` and mocked same-origin BFF receipts.
The first run correctly failed because the product editor had no accessible
dialog identity. The editor and lifecycle decision now use the shared
`AdminDialog` focus/Escape/restore contract, the editor has a stable accessible
name, busy close protection, and its four two-column field groups stack into one
column at 375px. The rendered journey verifies editor reason state, a reasoned
Draft → Under Review decision, delete-PIN initial focus, and an inline
`PRODUCT_HAS_HISTORY` refusal with no horizontal overflow. The focused journey,
all 16 Admin UI journeys, 213 API/security contracts plus both selling-surface
behaviors, the zero-gap security gate, and the isolated 21-module Admin build
pass. This tier remains local/prepared only: no production data, grant,
migration, flag, preview, or host changed, and real Admin MFA/role denial plus
deployed edit/status/delete acceptance remain open behind `OWNER-005` and the
coordinated MAP-017/MAP-019 cutover.

The 21 August dual-method audit also found and corrected a consolidated-router
denial of the prepared product-intake session POST. Route metadata now models
the GET read and POST CSRF/idempotency/database-rate controls separately, and
tests prove POST reaches the secure handler while DELETE receives the exact
`GET, POST` allowance. This is local routing evidence, not a deployed endpoint.

**Wildcard-CORS recurrence correction (21 August 2026):** an unused shared Edge
response template still advertised `Access-Control-Allow-Origin: *`, five broad
methods, and arbitrary error details even though neither active function
imported it. The unsafe template was removed. The production security-surface
audit now detects literal wildcard CORS across browser/server/prepared API/Edge
source and fails prebuild on recurrence; the current count is zero. Its focused
regression and all 102 contracts pass, as do both sequential isolated builds.
Deleting the tracked helper also exposed a local scanner defect: Git still
listed a working-tree-deleted path and the scanner crashed before inspecting
current bytes. It now skips only paths that genuinely no longer exist while
unreadable existing files still fail. Fabricated scanner regressions and the
783-file current-tree scan pass. Deployed CORS, preview-origin, WAF, and real-host
denial behavior remain unverified.

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
4 MB (below Vercel Functions' documented 4.5 MB payload ceiling), verifies the decoder-selected format against declared MIME, limits
dimensions/pages/pixels, fully decodes and re-encodes the image to remove
metadata and executable/polyglot content, then registers a SHA-256-bound private
object path through the signed command. The phone UI preserves the established
Admin design while using single-column small-screen controls, 44px category
targets, explicit checking/verified upload states, and truthful storefront-only
publication copy. The MAP-018 foundation and wrapper each compile in production
rollback validation and all staged objects remain absent; 27 contracts, both
isolated builds, a 672-file secret scan, and a zero-finding production dependency
audit pass. This remains prepared: neither intake migration is live, the Admin
BFF flag is false, supplier-receipt intake is unavailable, deployed canonical-
identity and denial tests remain, and no domain is active.
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

**Bundle measurement and vendor split (28 August 2026).** The storefront entry
was one 634 kB / 191 kB-gzip chunk with no `manualChunks` configuration at all.
Vendor code is now split so an app-code deploy stops invalidating unchanged
framework bytes in returning visitors' caches. Measured storefront first load:

| Chunk | gzip | Note |
| --- | --- | --- |
| `vendor-react` | 60.58 kB | React 19 + react-dom; irreducible |
| `vendor-supabase` | 55.86 kB | full client: auth, realtime, storage, functions, postgrest |
| `vendor-motion` | 42.38 kB | `motion` v12 |
| `index` (app) | 32.17 kB | |
| `Home` | 7.86 kB | |
| CSS | 25.52 kB | within the 30 kB budget |

**This is a caching improvement, not a size reduction, and it does not meet the
budget.** First-load JS is ~199 kB gzip against the 150 kB landing budget in the
web performance rules — over by roughly 49 kB, essentially unchanged from before
the split, which is expected: splitting moves bytes between files without
removing any. Recording it honestly rather than claiming a win.

**31 August measurement refresh:** the fresh Storefront build remains over the
recorded landing budgets at approximately 192.68 kB first-load JS gzip and
31.36 kB CSS gzip (30 kB CSS budget). The fresh Admin build emits an Admin chunk
of 325.01 kB minified / 89.97 kB gzip, so the prior 231 kB/within-300 kB claim is
no longer current. Vite still reports `MasterWorkflowGraph.jsx` as both static
and dynamic, preventing that import from creating a split chunk. Treat these as
budget regressions until a measured fix passes both artifact builds; the lazy
~240 kB-gzip Three.js chunk remains correctly outside the core Storefront path.

The chunking is deliberately narrow. Only the three eagerly loaded vendors are
named; `three`, `@react-three/*` and `html5-qrcode` are left to Rollup's natural
splitting. Naming `three` would have folded the 904 kB Globe into an eager chunk
and silently undone queue item 2's `IntersectionObserver` deferral. Verified
after the change: `GlobeSection` remains a separate 904 kB chunk and
`html5-qrcode-scanner` a separate 334 kB chunk, both still lazy. The Admin entry
also benefited — its `Admin` chunk fell from 359 kB to 231 kB (106.76 → 64.39 kB
gzip) as shared vendors moved out — and Admin stays within its 300 kB budget.

*The remaining path to the budget is a dependency decision, not more chunking.*
`vendor-supabase` at 55.86 kB is the full client while the landing page needs
only postgrest reads and realtime, and `vendor-motion` at 42.38 kB could fall to
roughly half via `LazyMotion` with a feature subset. Both are invasive — the
motion change touches every animated component and is governed by the four-skill
design rule — so neither was attempted here. React at 60.58 kB is irreducible.

**Dead and misplaced dependencies removed (28 August 2026).** `@svg-maps/world`
was a production dependency with **zero references anywhere in the repository**
and has been removed. `dotenv` was a production dependency used only by
`tests/admin-dashboard-redesign.spec.js` and is now a devDependency, so it no
longer implies a runtime requirement it never had. `sharp` was audited and kept:
it is genuinely required by `server/admin-bff/product-intake.js` and never
reaches a browser bundle. Direct dependencies fell 20 → 19, locked packages
274 → 273. Dependency policy, both isolated builds with their boundary and secret
scans, and 235 contracts plus both selling journeys all pass after the change.

**Vite resolved-environment debug boundary closed locally (28 August 2026).**
An isolated Storefront alias audit found that `vite.config.js` called
`loadEnv(mode, projectRoot, '')`. The empty prefix imported every local server
environment value into Vite's resolved configuration; `vite --debug` then
printed those values even though the production `define` block exposed only a
publishable key. The configuration now has exact `VITE_CONFIG_ENV_KEYS` and
`BROWSER_ENV_KEYS` lists, uses the former for `loadEnv`, and uses the latter as
`envPrefix`, so unrelated or secret-shaped `VITE_` mistakes are not eligible for
browser/debug exposure. A failing source contract was written first and now
passes; the 269-file environment-source audit, five-fixture environment-contract
self-test, full Storefront prebuild security gate, 1,102-module isolated build,
artifact-boundary verifier, and bundle secret scan pass.

This is repository/local-build containment, not credential recovery. The audit
debug run printed existing local credentials before the boundary was corrected.
No value is copied into this plan, no provider configuration was changed, and
rotation remains an owner-authorized recovery action. Exact next action: review
the affected local/server credential inventory without printing values, rotate
each credential whose disclosure lifetime is not explicitly accepted, remove
any secret-shaped `VITE_` local name, rerun both isolated builds/security gates,
and record provider-side rotation evidence under MAP-021/MAP-025. Recovery for
this code change is to restore the prior Vite env-loading lines and rerun the
focused contract plus isolated build; doing so intentionally reopens the debug
exposure and is therefore not a safe operational rollback.

**Status:** Queued — local preparation exists; final activation/evidence depends
on MAP-019 and MAP-020

**Prepared build-integrity evidence (12 August 2026):** target-specific app
entries now use distinct Storefront and Admin contexts. The production verifier
rejects both forbidden manifest modules and compiled cross-artifact runtime
markers. Current separate builds pass this stronger check. This proves local
artifact isolation only; CSP/headers, dependency remediation, deployed bundle
inspection, source-map checks, and real-host evidence remain.

**Independent local recheck (15 August 2026):** both target-specific production
builds, compiled artifact boundaries, and bundle secret scans pass. The current
npm audit reports zero vulnerabilities. This advances local evidence only;
production headers/CSP, deployed bundles, source-map policy, automated dependency
controls, and real-host behavior remain required.

**Dependency and CI hardening (21 August 2026):** the current npm advisory audit
reports zero vulnerabilities across the lockfile. `puppeteer` had no repository
caller and was removed, reducing the lock from 298 to 274 packages and removing
24 unused transitive packages plus its install script. A fail-closed policy now
requires package/lock agreement, npm-registry HTTPS sources, integrity hashes,
reviewed license identities, the verified MIT exception for
`webgl-constants`, and exactly three reviewed esbuild/fsevents install-script
entries. It reports 20 direct dependencies and passes. CI now runs the live
low-severity npm audit, the deterministic dependency policy, and all 102 API/
security contracts in addition to both isolated builds and smoke tests.
Dependabot is configured for bounded weekly npm updates. This is local and
configuration evidence; the first remote workflow/Dependabot run, production
headers/CSP, deployed bundle/source-map inspection, cache behavior, and real-host
tests remain required.

**Safe browser-error and compiled-bundle evidence (21 August 2026):** the global
browser reporter no longer writes raw messages, stacks, full URLs, user-agent
strings, or arbitrary component context directly to `error_reports`. Production
events are restricted to a stable code, allowlisted failure kind, and pathname;
the Admin error boundary exposes only the stable code and recovery actions. A
central allowlisted UI-error mapper now covers the remaining operational browser
surfaces, including fulfillment/custody, staff permissions, image upload,
product-intake parsing, consignment receipt recovery, Demo Rail sign-in, and
connector retry state in addition to the first ten migrated surfaces. The System
Readiness modal no longer reads or renders raw `error_reports` rows or URLs; it
truthfully withholds diagnostic details until MAP-022 supplies the protected,
redacted server route. Five focused contracts and the full 102-contract suite
pass. Both separate production
builds now explicitly disable source maps and pass compiled checks for target
leakage, source-map references, Vite development markers, the removed console
greeting, unexpected localhost/loopback URLs, and bundle secrets. The verifier
records one exact inert `http://localhost:9999` marker inside the Supabase Auth
library as a reviewed vendor exception. The first browser smoke attempt timed
out waiting for the full cold-start `load` event while the next five behavior
checks passed; navigation now waits for `domcontentloaded` and asserts the real
surface. On 22 August the expanded seven-journey suite exposed the same readiness
race after `domcontentloaded`: a lazy view could still be showing the Suspense
fallback. The shared helper now waits up to 30 seconds for the initial cold
`<main>` surface, view-specific lazy assertions use a 15-second bound, and the
complete eight-test suite passes, including the Wholesale fallback truth check.
This is local build evidence only:
a protected bounded server logging/correlation route belongs to MAP-022, and deployed bundles,
headers/CSP, caching, mixed-content behavior, and real-host tests remain pending.

**Explicit request-deadline evidence (21 August 2026):** a shared browser fetch
boundary now distinguishes caller cancellation from a stable `REQUEST_TIMEOUT`
failure and always releases timers/listeners. Admin reads use a 10-second
deadline; guest-commerce commands, Admin commands, and staff invitations use 15
seconds; private evidence uploads use 30 seconds. The existing server-side
Turnstile verification remains bounded at 5 seconds. Commands are not
automatically retried, and an ambiguous staff-invitation timeout tells the user
that final state is uncertain while preserving the same idempotency operation
key for recovery. Admin GET/HEAD reads now use at most three total attempts for
transient network failures and the explicit 408/425/429/500/502/503/504 status
allowlist. Backoff starts at 200 ms, doubles with jitter, caps at 2 seconds, and
stops immediately on caller cancellation. Ordinary client errors do not retry;
a `Retry-After` above the cap returns control for explicit user recovery instead
of hiding a long wait. POST commands, uploads, invitations, and guest submissions
remain single-attempt. Eight focused timeout/retry contracts and the full
102-contract suite pass; both isolated production builds, import integrity,
compiled-boundary scans, and bundle secret scans also pass. This is local code
and artifact evidence. Account-specific provider/server limit evidence, server-truth
checks for every ambiguous command, deployed behavior, and real-host evidence
remain unfinished.

**Prepared header, CSP, cache, and mixed-content evidence (21 August 2026):**
both separate Vercel project configurations now declare anti-framing, MIME,
referrer, and permissions headers plus a report-only CSP suited to the current
font, Turnstile, media, and Supabase boundaries. The synchronous theme bootstrap
is now a same-origin head script, preserving pre-render theme selection while
removing `'unsafe-inline'` from `script-src`. The report-only policy still allows
inline style while violations are measured; it is not represented as enforced
CSP. Storefront HTML is `no-store`, Admin HTML is `private,
no-store`, both BFF JSON boundaries remain `no-store`, and fingerprinted assets
use a one-year immutable cache. The known HTTP catalog-video fixture now uses
HTTPS. HSTS is deliberately absent until every production host and subdomain has
real HTTPS evidence. Five focused header/cache contracts, the complete
102-contract suite, both isolated builds, and all eight Storefront smoke behaviors
pass. The first smoke launch in the restricted sandbox could not read Vite's
workspace config; the identical approved workspace run passed, so that denial is
recorded as a test-environment constraint rather than product evidence. These are
configuration/source contracts, not proof that
Vercel currently serves the headers or cache behavior; preview/production header
inspection, CSP violation review and enforcement, asset invalidation behavior,
and HSTS eligibility remain unfinished.

**Provider-limit and capacity evidence (21 August 2026):**
`PROVIDER_LIMITS_AND_CAPACITY_RUNBOOK.md` records repository-enforced request,
upload, browser-deadline, retry, and configured function-duration limits
separately from current official Vercel/Supabase ceilings and account facts. The
audit found that Vercel Functions currently document a 4.5 MB request/response
payload maximum while the prepared evidence flow promised 10 MB. Product-intake
evidence is now capped consistently at 4 MiB across browser guidance, shared
validation, BFF body handling, normalized output, and contracts; declared and
actual buffered lengths must match. JPEG/PNG/WebP and existing decoder,
dimension, page, pixel, metadata-removal, and private-registration controls are
preserved. Four capacity contracts and all 102 contracts pass, as do both isolated
production builds and security scans. Vercel plan/Fluid Compute/memory/usage and
Supabase plan/compute/pool/spend-cap/Realtime/Storage/usage remain explicitly
blocked on authenticated redacted dashboard evidence; no tier or headroom is
inferred from source code or provider maximums.

**Current dependency and database-CI evidence (22 August 2026):** a fresh npm
registry advisory query reports zero findings at every severity across 274
locked packages, while the deterministic policy still passes for 20 direct
dependencies, reviewed licenses, integrity hashes, registry origins, and
exactly three reviewed install scripts. CI now provisions an isolated
PostgreSQL 17 service and runs the catalog identity/commit migrations,
behavioral assertions, emergency rollback, and post-rollback privilege/evidence
assertions through a runner that refuses non-loopback hosts and database names
outside `k2_catalog_rehearsal*`. The workflow YAML parses, the runner passes
against the workspace PostgreSQL 17.11 runtime, all 114 contracts pass, and
both separate production builds pass artifact/source-map/dev-marker/secret
checks. The first Storefront build attempt was blocked by the Windows sandbox
denying esbuild access to the workspace Vite config; the identical approved
workspace run passed, so this is an execution-environment constraint rather
than product evidence. A remote GitHub Actions run, Dependabot result, deployed
bundles, real headers/CSP/cache behavior, and real-host tests remain unverified.

**Release-harness correction (29 August 2026):** the three package build scripts
now pass Vite `--configLoader runner`, matching the repository's working
Playwright launchers. This changes only how the JavaScript config is loaded; it
does not change target selection or bundle contents. In the managed Windows
workspace the exact `npm.cmd run build:storefront` and `npm.cmd run build:admin`
commands now complete with their full prebuild, sitemap (Storefront), boundary,
and bundle-secret gates. The browser-backed suites remain unverified here
because Chromium cannot spawn (`spawn EPERM`); no test was weakened or skipped.

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
- ~~**Remove the orphaned second product-detail view.**~~ **Done 25 August
  2026 — local repository change only, no deployment.** `ProductDetail.jsx` has
  been audited for feature parity (why_buy highlight ported to `MasterProduct.jsx`),
  deleted from `src/views/`, and removed from `StorefrontApp.jsx`, `App.jsx`,
  `DemoRail.jsx`, `StoreHeader.jsx`, `MobileNavBar.jsx`, and `scripts/verify-build-boundary.mjs`.
  `npm run build:storefront` emits no `ProductDetail-*.js` chunk (manifest modules
  reduced from 19 to 17).
- ~~**Defer the Three.js globe until it is needed.**~~ **Done 25 August 2026 — local
  repository change only, no deployment.** `Home.jsx` mounts `GlobeSection` behind a
  300px `IntersectionObserver` with a reserved layout placeholder (`GlobeSectionPlaceholder`)
  with a dimension-matched placeholder so layout shift is unlikely by construction (not measured), retaining `ErrorBoundary` and `GlobeSectionUnavailable`. `GlobeCore.jsx`
  and `ProductGlobe.jsx` honor `prefers-reduced-motion` by disabling idle auto-rotation
  and spring transitions. Playwright verification confirms no Globe chunk request on
  initial landing and clean deferred loading upon scroll.
- ~~**Close the static-asset hole in the build boundary.**~~ **Done 25 August
  2026 — local repository change only, no deployment.** `verify-build-boundary.mjs`
  now walks every emitted static text asset (`.json`, `.webmanifest`, `.txt`,
  `.xml`, `.svg`, `.html`), skipping `assets/` and `.vite/` which the module
  manifest already covers, and fails the storefront build on
  `/admin-portal-k2-secure`, `Business Operating System`, or `K2 Jimzon BOS`.
  The check was written before the fix and confirmed to **fail** on the shipped
  state — `manifest.json matches /admin-portal-k2-secure/i` — so the gate is
  proven to detect the leak rather than merely passing afterwards.

  The leak itself is closed by construction: `public/manifest.json` is deleted,
  and `deploymentBoundaryPlugin` in `vite.config.js` emits a per-target
  `manifest.json` alongside the existing `k2-build-target.json`. The storefront
  now ships its own public identity and `start_url: '/'`; the admin artifact
  keeps the BOS identity and its portal start URL. Neither can inherit the
  other's, because there is no shared file left to copy. `index.html` now links
  `/manifest.json`, which nothing did before, so the manifest is finally read.
  No `icons` entry is declared, because the old one pointed at a `/favicon.ico`
  that does not exist in the repository — referencing a missing icon is worse
  than declaring none, and this is the honesty rule applied to metadata. Commit
  real icon assets and add the entry when they exist.

  *Verified after the change:* `npm run build:storefront` and
  `npm run build:admin` pass with 19 and 21 manifest modules, `admin-portal-k2-secure`
  appears 0 times anywhere in the storefront `dist/`, `npm run prebuild` passes,
  `npm run test:contracts` passes 179/179, and `npm run test:smoke` passes 8/8.

  Original finding, retained for context: `public/manifest.json`
  is the Admin BOS manifest — `"K2 Jimzon Business Operating System"`, with
  `start_url: /admin-portal-k2-secure` — and it ships verbatim into the **public
  storefront** artifact as `dist/manifest.json`. The internal portal path appears
  0 times in the storefront JS and exactly once in this file, so the JS boundary
  holds and the static passthrough is the whole leak. `verify-build-boundary.mjs`
  reads only `.vite/manifest.json` and the JS module list, so it prints
  "Verified storefront production boundary" while this ships. Give each target
  its own manifest, and extend the verifier to walk every emitted `public/`
  asset for the other target's markers. A gate that cannot see a file cannot
  vouch for it. (Found by the 25 August independent audit; no prior finding.)
- ~~Fix the two defects the same file exposes.~~ **Done 25 August 2026** as part
  of the work above: the manifest is now linked from `index.html`, and the
  missing-`favicon.ico` reference is dropped rather than left dangling. The
  remaining open piece is committing real icon assets and restoring an `icons`
  entry — carry that with the share-metadata work in MAP-024, which also needs
  an image.
- Define and test cache behavior for HTML, static assets, public catalog reads,
  authenticated/guest responses, and Admin data. CDN/edge caching may serve only
  intentionally public content; customer, session, operational, and error data
  must not be shared-cacheable. Product publication, price, coupon, and eligible-
  stock changes require a tested invalidation or bounded-staleness path.
- Set explicit browser/server-function/provider timeouts and cancellation
  behavior. Retry only safe reads or payload-bound idempotent commands, with
  bounded attempts, exponential backoff plus jitter, and a server-truth check
  after ambiguous timeouts. Record current Vercel/Supabase execution, connection,
  payload, bandwidth, and build limits rather than assuming unlimited capacity.

**Complete when:** security header/CSP tests pass on real builds; user errors leak
no internals; dependency audit has no unresolved launch-severity issue; and both
separate artifacts pass boundary and secret scans.

**Record in:** Vercel configs, error/log utilities, dependency configuration,
build/bundle checks, security test report, design record, and System Brain.

### MAP-022 — Security logging, incident response, alerts, backups, and provider controls

**Status:** Queued; depends on MAP-016 through MAP-021

**Evidence guard (15 August 2026):** the submitted AES-256-GCM scripts pass byte-
fidelity, wrong-passphrase, and tamper-rejection checks, but they only encrypt and
decrypt a supplied in-memory payload. They do not export Supabase/Postgres or
Storage data, store an owner-controlled off-site backup, restore into an isolated
database, or measure RPO/RTO. They are retained as encryption-envelope building
blocks and cannot be cited as MAP-022 backup/restore proof.

**Isolated encrypted database restore evidence (22 August 2026):** the new
fail-closed rehearsal accepts only distinct loopback databases with explicit
`k2_catalog_rehearsal*` source and `k2_restore_rehearsal*` target names. It takes
a real PostgreSQL custom-format dump into memory, encrypts it with AES-256-GCM,
decrypts without a plaintext file, restores with `pg_restore --exit-on-error`,
and compares exact catalog data, operation/evidence rows, and sensitive function
privilege fingerprints. PostgreSQL 17.11 backed up 38,005 dump bytes into a
38,069-byte envelope in 337 ms and restored it in 277 ms with a matching
fingerprint. Target-name/remote-host contract coverage and all 115 contracts
pass. `DATABASE_BACKUP_AND_RESTORE_RUNBOOK.md` now defines provisional 24-hour
RPO/8-hour RTO targets, retention, key custody, pre-change backups, isolated
monthly rehearsal, failure stops, and truthful blockers. This is representative
local database evidence only: no production or Storage export, owner-controlled
off-site destination, production-sized RPO/RTO, schedule/alert, or owner recovery
access is proven.

**Tier — protected boolean-only System Readiness complete locally (22 August
2026):** one Admin/AAL2 GET now replaces direct browser Auth, channel-table, and
order-table probes. The database returns only fixed booleans for database access
and the presence of the order, channel, staff, session-registry, and security-
event boundaries; the BFF adds only the already-verified server/session facts.
It explicitly returns false for raw-diagnostic exposure, provider-health proof,
and deployment-latency proof. The phone bottom sheet has initial close focus,
Escape recovery, 44px actions, no horizontal overflow, and plain text that these
checks do not prove deployment, WAF, encryption, connector health, latency, or
throughput. PostgreSQL rollback/apply/postflight/replay, all 144 contracts, the
61-route verifier, zero-gap inventory, isolated Admin build, and the focused
375px journey pass; the rendered state was visually reviewed. This is a local
MAP-022 prerequisite only: the migration/route/flag/preview/production host are
inactive, no provider or deployment status was verified, and correlation,
alerting, retention, production backup/restore, and operator review remain open.

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
- Inventory every scheduled task needed for reservation expiry, retry/dead-letter
  recovery, alert review, and backups. Each enabled schedule must authenticate,
  be idempotent, use a bounded overlap/concurrency policy, expose last success and
  failure, and alert on missed or repeated execution. Keep a truthful manual
  procedure where the free plan cannot support a reliable schedule.

**Complete when:** provider-control evidence exists; alerts produce tested
signals; attack activity is attributable without secret leakage; encrypted
backups run and pass integrity checks; and a restore rehearsal meets the recorded
recovery expectations.

**Record in:** security event schema/dashboard, provider configuration matrix,
backup/restore scripts and runbook, incident-response runbook, tests, operations
rulebook, and System Brain.

### MAP-023 — Operational completion and representative launch-data rehearsal

**Status:** Active — the reservation policy gate is resolved and its local
implementation has landed; production activation still depends on MAP-017.

**2 September 2026 — `OWNER-002` answered, and the reservation policy is
implemented locally.** The owner's answer separated two things the original
question had conflated: a permanent Shopee-style cart that holds no stock, and a
30-minute hold that begins at purchase. Pasabuy and wholesale were found to need
no hold at all — they are conversation-led and become durable history records.
The full decision is in `OWNER_QUESTIONS.md` and the required behavior is now in
the operations rulebook section 12.

*Local implementation, this state is `local code` only:*

- `src/lib/reservationPolicy.js` — one place the rest of the system asks about
  deadlines, extension bounds, and what each lifecycle event does to stock. An
  unrecognised event returns `none` rather than a guess.
- `supabase/migrations/20260902_reservation_expiry_policy.sql` — **prepared, not
  applied.** Additive only. Adds `expires_at`, extension attribution, and release
  cause to the existing `inventory_reservations` table, which has carried
  active/released/fulfilled since 20260809 but has never had a deadline. Adds
  `release_expired_reservations_v1()`, idempotent and `FOR UPDATE SKIP LOCKED` so
  two concurrent sweeps cannot double-release one hold, plus a
  `v_reservations_due` staff view.
- `tests/reservation-policy-contract.spec.js` — 15 contracts covering the
  boundary cases that silently oversell or strand stock: cart age never reserving,
  exclusive expiry at the deadline instant, refusal to revive an expired hold,
  extension bounds, and unknown-deadline safety.

*Verification:* 528/528 local contracts green; security surface inventory reports
zero unexpected grants and zero route-control gaps.

*Staff surface and commands completed the same day, still `local code`:*

- `extend_reservation_v1()` enforces the 30-minute/7-day bound and the reason
  requirement **in the database**, not only in the application, because the
  application is replaceable and the bound is a promise to a customer. It refuses
  an expired hold rather than reviving one, since those units have already
  returned to the sellable pool and may belong to someone else.
- `server/admin-bff/reservations.js` plus three routes: a GET read, and two
  idempotent CSRF-protected commands at AAL2.
- `src/views/admin/ReservationHolds.jsx`, registered under Sell & Fulfill.
  Density over decoration, no motion on the rows, one overdue count, and the two
  actions staff actually take.

**Scheduled release: decided, and the limitation is stated in the UI.** K2 has no
scheduled-job infrastructure. Rather than imply automation that does not exist,
the sweep is **staff-initiated** and the screen says so in a standing banner:
expired holds are not released automatically, and until a scheduler exists someone
must run the release or those units stay counted as held. A button a person presses
is visible and attributable; a cron job K2 does not have would be a promise the
system cannot keep.

*Upgrade path, not yet scoped into this item:* Supabase `pg_cron` calling
`release_expired_reservations_v1()` on a short interval. It needs owner provider
approval and its own MAP scope, and the function is already idempotent and
concurrency-safe, so adopting it later is a configuration change rather than a
rewrite.

*Verification:* 533/533 local contracts green, including 20 reservation contracts
covering policy bounds, route controls, BFF refusal before the database, and
migration assertions that the bounds and the additive shape have not drifted. Both
production builds pass their artifact-boundary, budget, and secret checks. The
security surface inventory reports zero unexpected grants and zero route-control
gaps.

*Remaining before this item can move to `Ready for independent verification`:*
applying `20260902_reservation_expiry_policy.sql` after MAP-017, wiring the
30-minute deadline at order submission so new reservations are created with an
`expires_at`, and preview acceptance of the staff surface with an authorized
account.

**Previous status, retained for dependency reading:** Queued; depends on MAP-017
through MAP-022

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

**31 August exact logic confirmation:** these two defects remain in the current
tree. `addToCart()` clamps with `Math.max(1, Math.min(qty, product.stock))`, so
zero stock becomes quantity one; the Product Knowledge pairing-bundle action
calls it for both SKUs without the product-page sold-out guard. The storefront
also stores `Quote review within 24 hours` for both Pasabuy submission paths.
MAP-023 must enforce availability inside the cart command itself, make the
two-SKU bundle atomic against both products' current sellable stock, and remove
the unapproved response-time promise from stored and visible state. Add negative
tests for zero, unknown, stale, and insufficient partner stock.

**1 September delivery-logic audit — accepted by merge
(`IDEA-20260901-01`).** The owner delegated the commercial decision and selected
an exact-locality manual pilot instead of a live J&T rate dependency or an
unsupported nationwide extrapolation. MAP-023 owns the controlled Excel quoting
aid, staff definitions, version/source identifiers, fail-closed exception and
data-conflict outcomes, accepted-fee snapshot handoff, PHP actual-cost
reconciliation, loss-review triggers, recovery, and representative workbook
acceptance. Only eight exact observed city/municipality-plus-barangay rows may be
pilot-quotable initially; the four regional amounts are planning floors labelled
`NOT QUOTABLE`. K2 absorbs ordinary carrier-cost variance after an eligible
standard fee is accepted; it never adds a surprise post-acceptance charge.
Unapproved/unmapped, remote/ODZ, multi-parcel, over-3 kg, oversize, special-
protection, over-PHP-2,000, contradictory, or incomplete cases do not receive a
standard fee. The workbook is an owner-approved manual aid only: the current
website, database, provider portal, waybill, tracking, and deployment remain
unchanged. MAP-019 owns any later customer-facing quote snapshot, MAP-020 owns
the untrusted-file/import boundary, and MAP-026 retains Warehouse A/provider and
marketplace separation.

**Locally prepared delivery-workbook evidence (1 September 2026):**
`outputs/01a05d7c-4c45-7902-892f-ef2c1990cbde/K2_DELIVERY_LOGIC_CONTROL.xlsx`
now contains the approved eight-sheet manual control: start/runbook, owner controls
and decision record, provider/service registry, versioned rate matrix, PSGC
administrative reference plus eight exact pilot location rows, quote tester,
actual-cost reconciliation, and change/source/extension register. The sample exact
Muzon East case calculates `STANDARD_FEE` / PHP 85 and exposes the release, rate
version, rate rule, location rule, and evidence reference required for an external
accepted-order snapshot. Programmatic behavior checks also passed for overweight
to manual quote, pickup to numeric zero, marketplace/platform external charge,
region-reference to manual quote, missing input to input error, restored standard
quote, and a final PHP 90 carrier actual against an accepted PHP 85 fee producing
PHP 5 absorbed loss. Formula inspection found no `#REF!`, `#DIV/0!`, `#VALUE!`,
`#NAME?`, or `#N/A` results, and all eight rendered sheets received a visual pass.
This is locally prepared evidence only: no customer quote was accepted, no staff
pilot was rehearsed in Excel, no workbook row was imported, and no website,
database, provider, waybill, tracking, or deployed behavior changed. Exact next
action is owner/staff Excel acceptance using one eligible exact-locality case and
one forced manual-quote case, followed by recording the acceptance evidence and
keeping the per-order manual J&T inquiry as recovery. If the workbook is withdrawn
or its data conflicts, archive the release and return all direct/Pasabuy orders to
the existing manual courier-quote workflow; never guess or fall back to a planning
floor.

**2 September source/comparison extension audit — accepted by merge
(`IDEA-20260902-01`).** The owner confirmed a formula-driven comparison between
the K2 J&T VIP account observations and public-rate evidence, plus an editable
source-of-truth area. MAP-023 owns one evidence register with stable source IDs,
separate owner-approval/VIP/public roles, sanitized locators, per-observation
dates, deterministic source QC, and a 30-calendar-day review gate. Rate and
comparison rows reference source IDs instead of treating repeated URLs or cached
formula values as authority. An active VIP evidence source is valid through day
29 after verification and stale beginning day 30; an otherwise eligible quote
then routes to `MANUAL_COURIER_QUOTE` with an instruction not to reuse the old
workbook amount. Public-source staleness suppresses only the comparison. The
comparison is PHP total-to-total only for aligned origin, city/locality, EZ
service, weight, dimensions state, pouch, declared value, and fee components;
because the public calculator is city-level while the VIP observation is
barangay-level, the result is an observed reference difference, never an exact
contract discount or customer-fee input. Secondary published tables corroborate
only; third-party rate cards remain context only. No traffic/time-of-day price is
modeled because neither reviewed J&T calculator exposes a documented input or
observed surcharge; evidence age, tariff notices, and actual-bill reconciliation
are the applicable time controls, while ETA stays manual. Owner/design review
selected a separate courier-comparison sheet plus a compact Quote Tester panel;
sequential Challenger, Constraint Guardian, User Advocate, and Arbiter review
resolved date, recalculation, source-role, component-basis, geographic-scope,
security, recovery, and wording objections, with final disposition `APPROVED`
and no blockers. The workbook remains an owner/Admin manual aid and does not
authorize a provider call, checkout rate, database import, booking, waybill,
tracking event, or deployment.

**2 September carrier-agnostic safe-fee correction — accepted by merge
(`IDEA-20260902-02`).** The owner clarified that customers buy K2-arranged
delivery and do not select or know the courier before K2 fulfills the parcel.
The commercial rule therefore no longer treats one named courier observation as
the long-term customer-fee basis and explicitly rejects averaging because an
average can still produce a loss. MAP-023 owns the controlled workbook model in
which one exact origin, destination, final or explicitly conservative packed
profile, and route-qualified courier/service set resolves to a customer charge
equal to the PHP 5 ceiling of the maximum complete, current, owner-approved
outbound courier cost. Only options explicitly approved as
`AUTO_QUOTE_ELIGIBLE` for that route/profile enter the maximum; globally
available but disabled or ineligible options do not. Every eligible option must
have exactly one active PHP cost row with a complete provider-total or itemized
component basis and current evidence. Missing, stale, non-PHP, or unknown but
structurally valid evidence routes to `MANUAL_COURIER_QUOTE`; duplicate,
overlapping, malformed, implausible, tampered, or source-role-conflicting data
routes to `DATA_CONFLICT_STOP` and cannot be bypassed through the manual path.
Current evidence covers J&T only, so a route may quote automatically only while
J&T is explicitly the sole eligible option; the workbook must not fabricate a
second courier rate. Public-versus-account J&T evidence remains display-only and
never sets the customer fee.

The workbook is a small-staff, procedurally versioned manual aid rather than a
tamper-proof runtime. It must expose editable courier options, complete cost
rows, source IDs, approval state, stop reasons, and recovery. It computes in PHP
centavos, takes the maximum complete eligible cost, and rounds upward to the next
500 centavos so Excel and a future Admin implementation can share deterministic
conformance tests. A designated Admin may edit a draft but not approve their own
change; the owner may edit and approve in the explicit owner role for continuity.
Acceptance revalidates the same release, option set, evidence, profile, and fee,
then freezes the customer charge and all supporting IDs. This is a conservative
base outbound-delivery loss guard under the recorded approved option set, not an
absolute guarantee against unannounced tariff changes, return-to-sender,
redelivery, or provider invoice adjustments; none of those caveats authorizes a
surprise customer rebill. MAP-019 owns any future Admin activation and accepted-
quote snapshot, MAP-020 owns sanitized typed import that rejects macros,
formula/DDE/external-link injection and requires external approval/content
digest, and MAP-026 retains provider/account/warehouse eligibility. Sequential
Skeptic, Constraint Guardian, User Advocate, and Arbiter review accepted and
resolved every objection; final disposition was `APPROVED` with no blockers.

**21 August catalog spreadsheet round-trip audit:** IDEA-20260821-02 was
accepted by merge here after reviewing the operations rulebook, Product/Design
registers, current Sheet Mode, CSV importer, database boundaries, and the four
required design skills. Current Sheet Mode has no export action and saves allowed
cell edits directly to `products`; the CSV importer accepts only `.csv`, inserts
new Draft product rows, cannot update an existing SKU, exposes raw provider
errors, and deliberately ignores stock. The accepted outcome is an Excel-
compatible controlled bulk editor for approved catalog fields plus a separate
reasoned inventory-reconciliation workbook—not a downloadable database mirror,
backup substitute, or unrestricted last-write-wins upload.

**Prepared catalog export and diff-preview evidence (22 August 2026):** the
inactive Admin BFF now has a fixed `k2-catalog-v1` projection and two protected
routes: an Excel-compatible CSV download and a bounded server-side upload
preview. The template carries export operation/time plus immutable catalog ID,
stable SKU, monotonic record version, and `updated_at`; it allowlists fourteen
metadata fields and excludes prices, publication, stock, reservations, lots,
expiry, custody, customers, payment, secrets, private evidence, and audit data.
CSV output uses a UTF-8 BOM, CRLF, quoting, and formula-injection
neutralization. Preview rejects unknown/missing/duplicate headers, formula-like
input, files above 512 KiB, more than 1,000 rows, and cells above 4,000
characters; it classifies every row as New, Changed, Unchanged, Invalid,
Protected/Ignored, Duplicate, or Stale/Conflict with exact metadata diffs. A
prepared additive migration supplies immutable `catalog_id` and optimistic
`catalog_record_version`; its trigger function has no `PUBLIC`, anonymous, or
authenticated execute grant. Under the disabled BFF flag, Sheet Mode reads the
bounded server projection, blocks direct cell mutations, offers CSV download,
and uses a keyboard-focusable phone-readable review surface with 44px controls.
Thirty-five focused API/security contracts and all 109 contracts, import integrity, the zero-gap
security-surface audit, the 21-module Admin production build, artifact boundary,
and secret scan pass. This is not a completed round trip: signed/reasoned commit,
durable per-row receipts, selected-row approval, resumable chunks, redacted
result download, direct-write revocation, Excel/alternate-editor rehearsal,
production migration/flag/deployed denials, rollback, and staff acceptance
remain. Exact field and activation boundaries are in
`CATALOG_SPREADSHEET_RUNBOOK.md`.

**Prepared signed catalog commit and recovery evidence (22 August 2026):** the
inactive boundary now adds a signed `catalog_import_chunk` command and protected
durable-status read, bringing the exact Admin router to 50 routes with zero
control gaps. Staff must explicitly select only New/Changed rows, enter a
10–500 character reason, and acknowledge that updates affect allowlisted
metadata only and new rows become unpublished Drafts. The server re-hashes and
re-previews the original CSV immediately before commit. It signs at most 50
selected rows per atomic chunk; the database revalidates AAL2 staff, request
signature/replay, file/operation identity, sequential chunk index, exact
catalog ID/SKU/version/timestamp under row locks, and allowlisted values. New
rows receive `generate_k2_sku_internal()` output rather than a spreadsheet SKU.
Private operation records and immutable per-row before/after events support
same-key ambiguous retry and status recovery; the UI exposes progress, recovery
ID/status, and a redacted row/SKU/outcome/version/timestamp result CSV. The
coordinated migration revokes authenticated product insert/update/delete, and a
non-destructive emergency rollback restores only legacy insert/update while
preserving audit evidence. The missing-runtime blocker was cleared with an
official portable PostgreSQL 17.11 archive in ignored workspace `.tools`
(SHA-256 `6EABDF00D2893713B75DB4336A23C3FDF505F056E217EC6E2E95D901750CFEA3`).
An isolated localhost database compiled both migrations and passed executable
new-Draft/server-SKU, successful versioned update, numeric-weight, idempotent
replay, changed-payload conflict, durable-status, stale-conflict atomic rollback,
out-of-order chunk and AAL1 denial, event preservation, and direct authenticated
write-denial assertions. The emergency rollback also passed: commit/status
execute became false, legacy insert/update became true, and evidence tables
remained. Rehearsal exposed and fixed two launch blockers before deployment:
the shared signed-command verifier did not allow `catalog_import_chunk`, and
the commit treated production's numeric `net_weight` as text. Thirty-four
focused catalog/Admin contracts and all 113 contracts now pass, as do import
integrity, the zero-gap security inventory, the 21-module Admin build, artifact
boundary, and secret scans. Excel and an alternate-editor round trip,
production migration/flag, deployed denials, and staff acceptance remain
unclaimed; production Supabase was inspected read-only and was not mutated.

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

**Multichannel messaging, inventory, and custody audit (14 August 2026):**
IDEA-20260814-05 was accepted by merge here after review of the rulebook,
System Brain, Admin runtime, migrations, and current MAP. One canonical
conversation/message model, staff assignment, internal notes, product/lot stock,
channel readiness, current lot owner/custodian/hub/box, exact partial custody
transfer, and `from_custodian`/`to_custodian` inventory events already exist.
They do not complete the operational loop: external Shopee/TikTok/Lazada/other
message delivery and marketplace stock synchronization remain unconnected;
box-wide reassignment does not preserve equivalent per-lot transfer evidence;
`product_batches.custodian` remains free text instead of a required canonical
custodian identity; legacy `staff_allocations` can disagree with lot custody;
and sender action can change recorded custody without independent receiver
acceptance. This is accepted into MAP-023 because it closes existing canonical
operations and does not authorize unavailable marketplace credentials or APIs.

**Inbound-first shop inventory and Owner Count & Close decision — accepted 31
August 2026 (`IDEA-20260831-01`).** The owner corrected the integration
direction: K2 must first receive product, listing, price, and reported-quantity
snapshots from every individual marketplace shop; outbound publication is not
the next slice. The supplied owner screenshot is operational evidence that one
person is manually combining Pasabuy boxing, sales totals, commission and tax
estimates, stock encoding, bookkeeping updates, and household work. The accepted
solution is one resumable phone-first workflow inside Admin BOS, backed by a
staged provider-neutral import/reconciliation boundary—not a second spreadsheet
truth, direct provider-to-`products` upsert, or separate accounting app.

The approved architecture is:

1. **Stage before canonical write.** A bounded CSV import is the first transport;
   approved APIs later write the identical normalized snapshot contract. Every
   batch records provider, exact shop account, source/export identity and hash,
   observation period/time, received time, schema version, actor, row outcome,
   and idempotency/recovery identity. Replays return prior outcomes; changed data
   under one identity conflicts; partial, stale, rejected, and ambiguous results
   never look complete.
2. **Keep identity separate from listings.** One server-generated K2 SKU remains
   the permanent identity for one exact sellable variant. Per-shop marketplace
   SKU, external item/variant IDs, title, price, listing state, reported
   available quantity, and observation time are aliases/observations linked to
   that product—not replacements for its K2 SKU. Approved manufacturer and K2
   barcodes may both scan to one product; shared or unreliable codes remain
   non-authoritative evidence.
3. **Require a human product decision.** Exact SKU plus normalized name/barcode
   evidence produces a suggestion only. Admin review must choose Link existing,
   Create new Draft, or Leave unresolved. Different size, concentration, flavor,
   shade, formulation, or pack count cannot merge merely because the provider
   reused a SKU or name. A new product receives its K2 SKU from the existing
   server generator. K2 Product Master remains authoritative; imported catalog
   values appear as field-level suggestions and cannot silently overwrite it.
4. **Separate reported quantity from physical truth.** A shop snapshot says what
   that shop reported or displayed. It never creates a lot, changes custody, or
   becomes Master Inventory automatically. Staff review expected versus
   canonical/physical quantity and apply any accepted correction only through
   the reasoned lot reconciliation boundary with reservation, version, and
   before/after checks.
5. **Guide one owner close.** A resumable close session selects the period and
   source shops, imports/deduplicates sales and listing observations, resolves
   product links, separates order/payment/fulfillment facts, calculates
   versioned provider commission/fee estimates, compares expected and physical
   inventory, records discrepancy reasons, tracks Pasabuy boxing readiness, and
   produces a customer-minimized bookkeeping handoff. Tax and commission remain
   estimates until reconciled to provider settlement and approved accounting
   policy. The output is not an official tax filing, books of account, payout,
   settlement, or actual-profit claim.
6. **Design for interrupted phone work.** Save progress after every confirmed
   step; allow safe resume on another session; keep one decision visible at a
   time; use 44px controls, Source Sans, explicit counts and consequences, and no
   decorative motion. Loading, empty, offline, stale source, partial import,
   permission, unresolved match, duplicate, conflict, ambiguous timeout,
   reconciliation denial, and recovery states are distinct and retain the
   original evidence.

**Decision log.** The owner accepted staged import and reconciliation inside
Admin BOS. Directly extending `channel_listings` as the write target was rejected
because it would mix publication, provider observations, physical stock, and
reconciliation state. A standalone workbook was rejected as the canonical tool
because it would create another truth and preserve the owner's manual workload;
controlled CSV remains only an initial transport and bookkeeping handoff. The
accepted cost is more initial schema/command work in exchange for auditability,
safe retries, provider neutrality, and one future API path.

Security and scale defaults for the first implementation are Admin/AAL2 plus
signed server commands for every canonical mutation; service-only provider
credentials; fixed schemas; 512 KiB/1,000-row CSV ceilings unless measured
evidence justifies another reviewed bound; at most 50 approved rows per atomic
chunk; formula-injection defense; no unnecessary customer contact fields in
exports; Asia/Manila close periods; and one durable event/receipt for every
approval or correction. These are implementation defaults, not provider limits.
The exact provider CSV dictionaries, commission rules, settlement fields, and
API signature/retry contracts must be verified from owner exports or approved
provider documentation before activation.

**Source-fixture dependency recorded 31 August 2026.** No real or redacted
Shopee, Lazada, or TikTok Shop export is present in the repository or supplied
with IDEA-20260831-01. Backend contract work therefore uses explicitly synthetic,
customer-free `k2.marketplace-snapshot.v1` fixtures for those three provider
names. They test only K2's normalized bounds and invariants and are not evidence
of provider-column, fee, settlement, timestamp, or API parity. Activation still
requires a redacted representative export from each real shop or approved
current provider documentation, followed by a versioned provider dictionary and
mapping rehearsal. Recovery is to remove the synthetic fixture directory and
its focused contract test; no production/provider state is involved.

**Prepared private snapshot backend evidence — 31 August 2026.** The first
MAP-023/MAP-026 backend slice is locally prepared behind the inactive Admin BFF.
The fixed `k2.marketplace-snapshot.v1` parser accepts at most 512 KiB/1,000 rows,
retains exact duplicates and changed-payload conflicts, ranks SKU/barcode/name
matches as suggestions only, and rejects formula-leading or out-of-bound input.
Eleven classified routes now stage/recover exact-shop listing and order evidence,
record an Admin product decision, start/resume/read an Asia/Manila Owner Count &
Close session, and save/read fee, stock, coverage, Pasabuy-readiness, and
bookkeeping-handoff evidence. The additive private migration uses forced RLS, revoked direct client
table access, signed AAL2 commands, durable idempotency receipts, immutable
events, exact source replay, changed-source conflict, server-generated K2 SKU for
new unpublished Drafts, and observation-only reported quantity. A
non-destructive rollback revokes all new entry points while retaining evidence.

The focused contracts pass. `npm.cmd run rehearse:marketplace-snapshots` passed
bootstrap, preflight, actual migration, idempotent migration replay, signed
behavior assertions, postflight, rollback, and evidence-preservation checks on
an isolated PostgreSQL 17.11 database. The assertions proved duplicate/conflict
retention, Staff approval denial, Admin link/create/unresolved decisions, Draft
server SKU, exact-shop close progress, stale-version denial, forced RLS, and an
unchanged `product_batches` sentinel. `check:imports`, `verify:admin-bff` at 81
routes, and the fail-closed security-surface inventory also pass. This is local
prepared-source evidence only: no production/provider mutation, credential,
feature flag, deployment, real export, quantity reconciliation, or staff
acceptance occurred. The exact recovery/activation contract is in
`MARKETPLACE_SNAPSHOT_STAGING_RUNBOOK.md`.

**Prepared phone composition evidence — 31 August 2026.** The Admin-only Owner
Count & Close workspace now composes the private boundary for exact-shop source
selection, resumable period saves, bounded listing/order CSV stage/recovery,
one-at-a-time human Link/Create Draft/Unresolved decisions, cross-import order
deduplication, and one named versioned fee estimate per selected exact shop. A
header-only order export is explicit zero-sales evidence; absence is not zero.
It preserves the observation-only quantity warning, recovery IDs, explicit
offline/error retry and accounting disclaimer. This paragraph's first-five-step
checkpoint is superseded by the full close evidence below. A mocked secure-BFF
Chromium journey passes at 375×812 and reduced-motion
812×375 with no horizontal overflow and 44px active controls; the portrait render
was visually reviewed. This is locally prepared UI evidence only—not real export,
provider fee-policy/settlement parity, physical-device, real screen-reader,
deployed-host, accounting, or staff acceptance.

**Prepared customer-free sales and fee-estimate boundary — 31 August 2026.**
`k2.marketplace-orders.v1` fixes ten customer-free columns, a 512 KiB/5,000-row
ceiling, exact close-period/shop scope, formula defense, immutable row outcomes,
and exact shop/order/line replay/conflict identity. SQL repeats cross-import
deduplication, preserves alias-link status independently, and recomputes stored
import totals after reclassification. `marketplace_fee_estimate_save` accepts a
named reviewed policy plus basis-point/fixed-minor inputs but recomputes gross,
commission, payment, withholding, fixed, fee, and net minor units from accepted
linked facts. Conflict/unresolved facts and missing order-import evidence block;
zero-sales imports produce zero; every response denies settlement, official
books, tax filing, payout, and actual-profit authority. Private forced-RLS fee
versions and immutable session events retain actor/reason evidence. The pure fee
contracts, signed SQL arithmetic/blocking assertions, exact replay, and
non-destructive rollback pass locally. No real fee schedule or settlement was
used or inferred.

**Prepared complete local Owner Count & Close slice — 31 August 2026.** The
coverage model and `owner-close/coverage` boundary derive Covered, Thin,
Skipped, Out, or Needs review per exact shop, rank scarcity by verified sales,
honor reasoned include/thin/skip overrides, and state proposal-only/no provider
write/no custody transfer. `owner-close/stock` keeps canonical physical,
reserved, sellable, accepted-sales, and shop observations separate; a discrepancy
first uses the existing complete exact-lot reconciliation command, and this
migration contains no `product_batches` DML. `owner-close/pasabuy` returns only
public reference/item/quantity/status/date fields and stores reasoned
ready/not-ready/not-applicable evidence without changing canonical Pasabuy state.
`owner-close/bookkeeping` derives missing/conflict blockers from each exact
shop's latest immutable order import and fee estimate, every linked-product
count, and every open Pasabuy review. Its signed completion seals a private
customer-minimized artifact and immutable event, marks only the session
Completed, and exposes a fixed-schema formula-safe CSV that remains explicitly
estimate-only, not books/tax/payout/settlement/profit.

The 21-test focused combined slice, dedicated all-rail phone journey, 81-route
verifier, zero-gap security inventory, Admin production build, and isolated
PostgreSQL migration/replay/behavior/postflight/rollback rehearsal are the
objective local gates for this prepared slice. The journey passes at 375×812 and
812×375 with reduced motion, no horizontal overflow, and 44px active controls;
the full portrait render was visually reviewed. SQL proves a latest clean import
can supersede older retained conflict evidence without deletion, both selected
shops have fee versions, matched/reconciled and zero-lot products are reviewed,
Pasabuy readiness is customer-minimized, handoff blockers clear, completion is
durable, rollback revokes entry points, and the stock sentinel is unchanged.
No migration, flag, credential, provider, deployment, real export/count, or
production state changed.

The active next action is now external-evidence and acceptance work: obtain and
redact one current representative export from every real shop, publish/review
provider dictionaries and current fee policies, rehearse their mappings and
representative physical counts, then perform interrupted/offline/conflict/
ambiguous-timeout staff acceptance on phone and laptop before any apply/enable/
deploy decision. Later provider APIs remain MAP-026 work. Recovery is the
supplied entry-point revocation rollback; retained evidence must not be deleted.

Implement this accepted scope in dependency order:

1. collect redacted representative exports from each real shop and publish the
   versioned provider-neutral source dictionary without storing customer data;
2. add private staged import/row/observation/match-decision/close-session records,
   access policy, signed commands, events, preflight/postflight, and rollback;
3. prove pure normalization, exact replay, changed-payload conflict, duplicate
   order/row handling, match suggestion, Admin approval, new server-SKU creation,
   unresolved variant, and no-canonical-write denial cases;
4. add the phone product-match and quantity-reconciliation steps, then the
   flexible per-shop coverage proposal/override and low/zero alert projection;
5. compose the resumable Owner Count & Close workflow from the existing Sales
   Summary, planner, inventory/lot reconciliation, Pasabuy, and new staged-source
   boundaries without duplicating their canonical writes;
6. rehearse representative interrupted/offline/conflict/ambiguous-timeout close
   sessions and staff acceptance on phone and laptop; and only afterward
7. adapt approved marketplace APIs to the same capture contract one shop at a
   time, preserving CSV/manual recovery until live evidence proves parity.

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
- Rehearse the exact-locality K2 Standard Delivery manual pilot from eligible
  inputs through one frozen accepted-fee/version/rule snapshot, real J&T manual
  booking/waybill evidence, provisional then final component-level carrier-cost
  reconciliation, late adjustment, loss flag, new-rate-version recovery, and an
  unapproved-location/manual-quote path. Unknown monetary components remain blank
  and block finalization; explicit zero means confirmed none. Positive variance
  means K2 absorbed a loss. A workbook data conflict is a stop/escalate outcome,
  never an ordinary manual courier quote.
- Complete exact-lot custody offer/accept/reject/cancel, partial transfer,
  independent receipt, cycle count/recount, damage, unexpected/wrong item,
  unknown expiry, insufficient shelf life, quarantine, supplier return, and
  write-off evidence. Receiver acceptance—not sender action alone—changes final
  custody.
- Make `product_batches` and its immutable inventory events the canonical
  physical-custody truth. Reconcile or retire independent writable
  `staff_allocations`; use stable canonical owner, custodian, hub, lot, and box
  identifiers while retaining historical display snapshots. Every exact-lot and
  box operation must record offered/accepted/rejected/cancelled state, quantity,
  source/destination custodian and location, actor, receiver, reason, time,
  before/after balances, and idempotency key. Provide current-holder, custody
  history, unassigned, disputed, in-transfer, and allocation-variance views.
- Normalize website, guest/account, Pasabuy, and future marketplace messages
  through one conversation model with channel identity, external message ID,
  direction, delivery state, assignment, unread/read state, internal-note
  separation, idempotent ingestion, retry/dead-letter handling, and immutable
  events. Never report an internal note or copied provider reply as externally
  sent. Activate external send/receive only per channel after credentials,
  scopes, signature/replay checks, provider receipts, failure recovery, and
  real end-to-end evidence exist.
- Keep one canonical sellable-stock and reservation truth for website and every
  channel. Channel listings and allocation/readiness may project that truth but
  cannot maintain independent stock counts. Before any connector is called
  Live, prove idempotent inbound orders/events, concurrent last-unit reservation,
  bounded outbound stock publication, retry/reconciliation after timeouts,
  stale/failed sync visibility, and recovery without overselling.

  **Local last-unit concurrency and ambiguous-response retry evidence — 31 August 2026.**
  `npm.cmd run rehearse:map023-last-unit` now extracts and executes the repository's
  actual `confirm_order_request` function against isolated PostgreSQL 17.11. Two
  submitted website orders raced for one eligible physical unit. The winning
  transaction held the exact-lot row lock; the final competing-order rerun waited 2,027 ms,
  then failed with `Insufficient sellable lot stock`. Final state was one
  confirmed order, one still-submitted order, physical/reserved `1/1`, one active
  reservation, one canonical order, one reservation event, and inventory balance
  `1/1`. The runner then treated the successful response as ambiguous and called
  the actual function again for the same order. The retry returned the same
  confirmed order while the complete database invariant remained unchanged:
  no second reservation, canonical order, inventory event, or reserved quantity
  was created. The wiring contracts and executable rehearsal pass. This proves
  the current repository function's local row-lock and already-confirmed retry
  behavior only. It does not prove
  live database parity, idempotent marketplace ingestion, outbound publication,
  general timeout reconciliation, connector
  credentials, or the still-required owner
  stock-pool/oversell policy. Fresh closeout evidence also passes the complete
  consignment/receiving file 9/9, API/security/source contracts 386/386, and all
  three rendered Storefront selling journeys. Retry-only recovery is to remove
  the second focused contract and restore the runner before its ambiguous-response
  retry phase; full rehearsal recovery is to remove the package command, runner,
  and both focused contracts. Its ignored `.tools/map023-last-unit-pg-data`
  directory is disposable rehearsal state and is never a backup or production
  record.

  **Local idempotent inbound-event and ambiguous-response recovery evidence —
  31 August 2026.** MAP-023 now reuses the existing authoritative
  `npm.cmd run verify:map020-shopee-ingress-portable` lifecycle instead of adding
  a competing rehearsal. The isolated PostgreSQL 17.11 run applies the actual
  prepared `20260825_shopee_webhook_ingress_boundary.sql`, proves missing limits
  fail closed, verifies service-role-only execution and forced-RLS private
  budgets, and exercises the complete capture path. After the first event was
  durably captured, the test treated its response as lost: the identical retry
  returned `replayed`, preserved the row's terminal `processed` state and attempt
  count, and did not create another inbox row. Reusing the same event identity
  with changed payload returned `conflict` and retained the original evidence.
  The strengthened invariant requires exactly one event row and shop/global
  budget counts of `3`, proving that capture, replay, and conflict were all
  durably rate-accounted. The same lifecycle also passes per-shop/global denial
  persistence, cleanup, postflight, and migration replay. The focused Shopee
  boundary passes 5/5; fresh API/security/source contracts pass 386/386 and all
  three rendered Storefront selling journeys pass. This is local prepared-source
  evidence only: the migration is absent from production, no provider limits or
  secrets were configured, no signed Shopee request was received, and no event
  was normalized into an order or reservation. Recovery is to remove the
  MAP-023 invariant from `map020_shopee_ingress_behavior.sql`, remove its runner
  summary line and focused wiring contract, then rerun the unchanged MAP-020
  lifecycle. The prior outbound-publication next action was superseded by the
  owner's 31 August inbound-first decision. The exact next dependency-safe action
  is now to inventory real Shopee/Lazada/TikTok export formats and existing Admin
  import boundaries, then specify and test the provider-neutral staged snapshot,
  product-match review, quantity-reconciliation, and resumable close-session
  contracts without making a provider call or changing production data.
- Rehearse Product Master/Sheet Mode, resumable intake, and the complete catalog
  spreadsheet round trip. Export an authorized, fixed, minimal projection as an
  Excel-compatible CSV for launch; native `.xlsx` is optional only if it adds no
  macro/formula execution path or unsafe dependency. Include immutable internal
  product identity, stable SKU, schema/template version, record version,
  `updated_at`, export time, and export operation ID as protected columns. Do not
  present this export as a database backup.
- Publish a versioned field dictionary and template. Default exports exclude
  customer/payment data, credentials, audit internals, private evidence, and
  fields outside the operator's role. Allowlist editable catalog metadata;
  identity/barcode remapping, price/cost, publication, and archival changes use
  narrower capabilities and explicit consequences. Stock, reservations,
  sellable quantity, lots, expiry clearance, custody, order/payment states, and
  immutable events are never ordinary product-sheet cells.
- Import new Draft products and authorized updates to existing products through
  a server command—not direct browser table writes. Require current staff role,
  AAL2 for sensitive fields, exact origin/CSRF, bounded file/row/cell sizes,
  strict headers and types, normalized currency/date/boolean handling, CSV
  formula-injection neutralization, unique stable identities, file-hash plus
  operation-key idempotency, an operator reason, and safe error codes. Never
  evaluate spreadsheet formulas, macros, links, or embedded content.
- Before commit, show one accessible diff review grouped as New, Changed,
  Unchanged, Invalid, Protected/Ignored, Duplicate, and Stale/Conflict. Display
  exact before/after values and consequences; support filtering and keyboard
  review; require explicit selection/approval; and provide a downloadable
  redacted result report. A record-version or `updated_at` mismatch blocks that
  row for refresh/review instead of silently overwriting another staff edit.
- Define transaction and recovery truth for large files: deterministic per-row
  outcomes or bounded atomic chunks, no hidden partial success, payload-bound
  retry, resumable status, and safe concurrency with online Sheet Mode edits.
  Parsing, validation, permission, conflict, server failure, ambiguous timeout,
  partial completion, retry, and final success remain distinct states.
- Provide inventory export for authorized analysis, but route every accepted
  inventory re-import through the canonical lot reconciliation/adjustment
  commands. Require exact lot/SKU/batch/expiry/hub/owner/custodian identity,
  record version, physical count, active reservation context, disposition,
  specific reason, before/after evidence, and any required approval. The server
  derives sellable availability, rejects counts below reservations, and never
  lets a workbook overwrite stock, reservations, events, or custody directly.
- Keep the workflow inside the established dense Admin BOS Source Sans/tokens.
  Desktop may use a compact diff table; phones use one readable review unit at a
  time with no horizontal dependency. Controls retain visible labels/focus and
  44px touch targets; frequent and keyboard actions are immediate; motion is
  limited to brief progress/state feedback and respects reduced motion. Loading,
  empty, permission, parsing, validation, conflict, partial, retry, cancelled,
  and completed states all preserve the uploaded file and recoverable context.
- Test round trips through Excel and other common CSV editors for leading-zero
  SKUs/barcodes, long identifiers, Unicode, commas/newlines/quotes, formula-like
  text, Philippine/European date and decimal formats, currencies, blank/null
  values, reordered/duplicate/unknown columns, old template versions, duplicates,
  stale versions, concurrent edits, timeout/retry, large bounded files, partial
  failure, permissions, and redacted exports. Prove that no test can create stock
  through product import, reduce a lot below reservations, change custody, publish
  without approval, duplicate a row on retry, or erase history.
- Rehearse the remaining bulk catalog intake requirements with preview/row
  validation/import identity/idempotent retry, reviewed public media/usage, and
  review/globe CMS moderation, publication, provenance, correction, withdrawal,
  and rights evidence. A file/string check or seeded testimonial is not
  publication proof.
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
- **Sales computation workbench — accepted 30 August 2026
  (`IDEA-20260830-02`).** Extend the existing bounded Overview order projection
  into one status-separated Sales Summary: submitted-request value,
  payment-verified value, and fulfilled value must be calculated from canonical
  order rows for the selected period and must remain visibly different facts.
  Settled payout and actual profit must render as unavailable—not zero—until K2
  has a canonical settlement ledger and order-line exact-lot cost snapshots.
  Upgrade the floating Margin scratchpad into an explicitly non-posting staff
  sales planner that computes gross sales, discount, net sales, unit/total cost,
  fees, gross profit, gross margin, markup, and break-even price from bounded
  manual inputs. It must reject negative/non-finite inputs, avoid NaN/Infinity,
  state that it writes no order/payment/cost/payout/accounting record, work at
  phone width with 44px controls, and have deterministic calculation plus
  rendered Admin coverage. This improves daily arithmetic without fabricating
  accounting or settlement truth.

  **Local implementation and verification — 30 August 2026.** Overview now
  renders the three canonical period totals and two explicit `Unavailable`
  states from one pure calculation contract. The existing tools file was found
  orphaned and is now mounted in the authenticated Admin shell; its new Sales
  planner uses bounded inputs, exact currency math, 44px controls, planning-only
  copy, and a viewport-bounded internally scrolling phone panel. The versioned
  staff registry is draft.12 and includes the complete sales-computation
  procedure. Pure calculation/invalid-input/target/discount/quantity/summary/reconciliation/filter/export/mount coverage passes 14/14, the
  desktop canonical-total and 375×812 planner journeys pass, the complete Admin
  UI suite passes 26/26, and `build:admin` passes the security preflight,
  artifact-boundary verifier, and bundle secret scan. This closes the local
  arithmetic/tool-access slice only. Production/staff acceptance, settlement
  truth, and actual-profit cost allocation remain unfinished MAP-023 work.

  **Read-only record drilldown evidence — 30 August 2026.** The Sales Summary
  now expands into the exact bounded order-request rows behind the selected
  period. Staff can filter all requests, exact payment-verified records, or
  exact fulfilled records; each view recomputes its own labelled subtotal,
  remains newest-first, renders at most 25 rows with explicit truncation copy,
  exposes no customer contact details, and performs no write. Payment and
  fulfillment filters remain independent facts, so one row may correctly appear
  in both. Pure summary/planner/target/discount/quantity/handoff/reconciliation/filter/export/mount coverage passes 14/14, and focused
  desktop plus 375px rendered drilldown journeys pass without horizontal
  overflow. The final complete Admin UI suite passes 26/26, and `build:admin`
  passes security preflight, the 26-module Admin artifact boundary, and the
  built-output secret scan. This closes the local record-traceability slice.
  Production/staff acceptance, full-history reporting/export, settlements,
  exact-lot cost allocation, and actual profit remain unfinished.

- **Selected-period sales export — accepted 30 August 2026
  (`IDEA-20260830-03`).** Add one read-only CSV download to the expanded Sales
  Summary. It must export every row in the current 7/30/90-day period that
  matches the active All requests, Payment verified, or Fulfilled filter—not
  merely the 25 newest rows rendered on screen. The fixed columns are created
  time, internal order reference, normalized channel, order state, payment
  state, and request value PHP. Exclude customer names/contact data, product or
  line detail, cost, payout, tax, profit, secrets, and unrelated order fields.
  Use UTF-8 BOM, CRLF, stable headings, CSV quoting, formula-injection
  neutralization, and a filter/period-labelled filename. The action must stay
  44px and phone-safe, generate no network/database write, and state that the
  file is an operational extract rather than accounting, settlement, or backup
  truth. Verify deterministic byte content, exact filter parity, suggested
  filename/download behavior, and 375px overflow.

  **Local implementation and verification — 30 August 2026.** The expanded
  Sales Summary now offers one 44px `Download CSV (n)` action beside the exact-
  fact filters. It exports every matching selected-period row, including rows
  beyond the 25 newest rendered records, through the fixed six-column projection
  and no customer fields. The pure generator emits UTF-8 BOM/CRLF, quotes every
  cell, neutralizes formula prefixes, normalizes channel values, formats PHP to
  two decimals, and creates a period/filter/date-labelled filename. Pure sales
  coverage passes 14/14; focused Chromium verifies the real fulfilled-filter
  download byte content and filename plus the 375px 44px control/no-overflow
  journey (2/2). The final full Admin UI suite passes 26/26. `build:admin`
  passes the security preflight, import integrity, 707-module compilation,
  26-module Admin artifact boundary, and built-output secret scan. This is
  locally prepared only; no deployment, accounting, settlement, or backup claim
  is made.
- **Reverse target-price planning — accepted 30 August 2026
  (`IDEA-20260830-04`).** Add a second mode to the existing non-posting Sales
  Planner that answers the inverse pricing question: the minimum planned unit
  selling price needed to reach a staff-entered target gross margin after total
  discount, unit cost, other/fixed costs, and a percentage payment/channel fee.
  Target gross margin is planned gross profit divided by net sales after
  discount; the percentage fee is applied to gross sales before discount. Solve
  algebraically, round the recommended unit price upward to the nearest cent,
  then recompute and show the achieved gross/net sales, fee, profit, and margin
  from that rounded price. Reject negative/non-finite inputs, non-whole quantity,
  out-of-range percentages, and target-margin-plus-fee combinations at or above
  100%. Use labelled 44px mode/actions/fields at 375px. State explicitly that
  the result neither changes canonical product price nor proves approval,
  landed cost, tax, payout, accounting, settlement, or actual profit. Require
  pure equation/rounding/denial tests and a rendered phone workflow without
  horizontal overflow.

  **Local implementation and verification — 30 August 2026.** The existing
  Sales Planner now has 44px `Check a price` and `Find target price` modes. The
  reverse mode uses the documented net-sales gross-margin and gross-sales fee
  definitions, solves the minimum price, rounds upward to cents, recomputes
  gross/net sales, percentage fees, total planned cost, planned gross profit,
  and achieved margin, and directs real price approval back to Product Master.
  It rejects invalid money/quantity/percentage values, percentage sums at or
  above 100%, unsupported prices, and any cent-rounded result that cannot prove
  the requested margin. Pure sales coverage passes 14/14, including exact algebra,
  upward rounding, and denial cases. The complete 375px forward-and-reverse
  browser journey passes with the expected ₱225.00 recommendation and no
  horizontal overflow; visual evidence is
  `C:/tmp/k2-admin-target-price-mobile.png`. The final complete Admin UI suite
  passes 26/26. `build:admin` passes security preflight, import integrity,
  707-module compilation, the 26-module Admin artifact boundary, and the built-
  output secret scan. This remains locally prepared, non-posting planning
  behavior only.
- **Payment × fulfillment reconciliation — accepted 30 August 2026
  (`IDEA-20260830-05`).** Partition every selected-period order request into
  exactly one of four buckets: payment verified and fulfilled; payment verified
  but not fulfilled; fulfilled while payment is not verified; or neither exact
  state. Show count and request value for each bucket and prove that their sums
  reproduce the selected-period submitted count/value. “Payment not verified”
  means only that `payment_status !== verified`; it must not be relabelled
  unpaid, missing, failed, or lost. Add record filters for verified-awaiting-
  fulfillment and fulfilled-payment-not-verified; their visible subtotal and
  customer-free CSV must use the same exact rows. Keep the row read-only,
  phone-safe, and explicit that this is operational state reconciliation—not
  payout, settlement, accounting, profit, or proof of customer communication.
  Require pure partition/invariant/filter tests, deterministic fixture values,
  rendered exception drilldown/export behavior, and 375px no-overflow coverage.

  **Local implementation and verification — 30 August 2026.** Overview now
  renders the four mutually exclusive reconciliation buckets from one pure
  function and opens each bucket through the same ledger/export boundary. The
  30-day deterministic fixture reconciles ₱20,055 across 5 verified+fulfilled
  rows, ₱18,830 across 2 verified-not-fulfilled rows, ₱0 across 0 fulfilled-
  payment-not-verified rows, and ₱7,115 across 2 neither-state rows back to
  ₱46,000 across all 9 requests. The verified-not-fulfilled drilldown and dated
  CSV both contain exactly two rows and ₱18,830. Pure sales coverage passes 14/14,
  including count/value partition and all special filters; focused desktop and
  375px journeys pass 2/2 with 44px controls and no horizontal overflow. Visual
  evidence is `C:/tmp/k2-admin-command-center-mobile.png`. The final complete
  Admin UI suite passes 26/26. `build:admin` passes security preflight, import
  integrity, 707-module compilation, the 26-module Admin artifact boundary, and
  the built-output secret scan. This is local operational-state reconciliation
  only, not deployment, payout, settlement, accounting, profit, or
  communication proof.
- **Maximum safe-discount planning — accepted 30 August 2026
  (`IDEA-20260830-06`).** Add a third mode to the existing non-posting Sales
  Planner that answers how much total discount a staff-entered unit selling
  price can absorb while preserving a target planned gross margin after unit
  cost, other/fixed costs, and a percentage payment/channel fee. Target gross
  margin is planned gross profit divided by net sales after discount; the
  percentage fee is applied to gross sales before discount. Solve the maximum
  total discount algebraically, round the safe allowance downward to the
  nearest cent, then recompute and show the achieved gross/net sales, per-unit
  allowance, allowance percentage, fee, total planned costs, gross profit, and
  margin from the rounded result. Reject negative/non-finite inputs, non-whole
  quantity, unsupported money/percentage values, and any chosen price that
  cannot reach the target even at zero discount. Use labelled 44px mode and
  fields at 375px. State explicitly that this is a planning ceiling and neither
  creates/approves a promotion nor changes canonical price, writes an order, or
  proves landed cost, tax, payout, settlement, accounting, or actual profit.
  Require pure equation/downward-rounding/denial tests and a rendered phone
  workflow without horizontal overflow.

  **Local implementation and verification — 30 August 2026.** The Sales
  Planner now exposes a third 44px `Find max discount` mode. From the chosen
  quantity/unit price, reviewed unit/other/fixed costs, gross-sales fee rate,
  and target margin, it solves the total allowance, rounds it downward to cents,
  recomputes net sales/cost/profit/margin, and refuses a result when the price
  cannot reach the target at zero discount. The example fixture returns a safe
  ₱321.42 total ceiling (₱32.14 displayed per unit), ₱2,178.58 net sales,
  ₱1,525.00 total planned costs, ₱653.58 planned gross profit, and at least 30%
  achieved margin. Pure sales coverage passes 14/14; the combined sales and
  draft.12 workflow-guide contract gate passes 23/23. The complete 375px four-
  mode browser journey passes with no document overflow; visual evidence is
  `C:/tmp/k2-admin-max-discount-mobile.png`. The final full Admin suite passes
  26/26. `build:admin` passes security preflight, import integrity, 707-module
  compilation, the 26-module Admin artifact boundary, and built-output secret
  scan. This is locally prepared non-posting planning behavior only; no
  promotion, product price, order, deployment, actual-profit, payout,
  settlement, tax, or accounting state was changed or verified.
- **Forward automatic-fee and true break-even planning — accepted 30 August
  2026 (`IDEA-20260830-07`).** Replace the ambiguous manually entered
  `Payment / channel fees (₱)` in `Check a price` with separate fixed-fee and
  percentage channel-fee inputs consistent with the other two planner modes.
  Apply the percentage fee to gross sales before discount. Show goods cost,
  other/fixed costs, percentage fees, and total planned costs separately. Solve
  break-even unit price as `(discount + goods cost + other costs + fixed fees)
  ÷ (quantity × (1 − fee rate))` and round the minimum upward to cents; do not
  freeze the percentage fee from the staff-entered price. Reject invalid money,
  quantity, discount, and percentage inputs. Preserve the 44px 375px workflow,
  planning-only copy, and no-write boundary. Require pure fee/break-even/denial
  contracts, the complete rendered three-mode phone journey, full Admin
  regression, and production-build security/boundary evidence.

  **Local implementation and verification — 30 August 2026.** `Check a price`
  now accepts fixed peso fees and a 0–99.99% channel fee rate separately,
  computes percentage fees from gross sales, and exposes goods, other/fixed,
  percentage-fee, and total planned costs before profit. Its break-even solves
  the variable fee algebraically and rounds upward: the deterministic fixture
  shows ₱1,200 goods, ₱125 other/fixed, ₱200 percentage fees, ₱1,525 total
  planned costs, ₱875 planned gross profit, and a ₱154.90 break-even. Pure
  coverage proves ₱154.90 is non-loss while ₱154.89 remains loss and rejects an
  invalid 100% fee. Sales tests pass 14/14; the sales plus draft.12 guide gate
  passes 23/23. The 375px complete four-mode journey passes with 44px controls
  and no document overflow; visual evidence is
  `C:/tmp/k2-admin-forward-fee-mobile.png`. The final full Admin suite passes
  26/26. `build:admin` passes security preflight, import integrity, 707-module
  compilation, the 26-module Admin artifact boundary, and built-output secret
  scan. This is verified local planning behavior only. No canonical cost,
  price, promotion, order, payout, settlement, tax, accounting, deployment, or
  actual-profit state changes.
- **Whole-unit planned-profit target — accepted 30 August 2026
  (`IDEA-20260830-08`).** Add a fourth Sales Planner mode that answers the
  minimum quantity required to reach a staff-entered planned gross-profit
  target from reviewed unit price/cost, total discount, other/fixed costs, and
  gross-sales channel-fee rate. Define unit contribution as `unit price × (1 −
  fee rate) − unit cost`; solve the quantity upward to a whole unit; recompute
  the achieved gross/net sales, cost breakdown, profit, margin, and amount above
  target; and prove one fewer unit misses the target. Refuse non-positive unit
  contribution, invalid inputs, and results above 100,000 units. Use a phone-
  safe 2×2 mode selector and 44px controls. State that the result is a planning
  target, not a quota/order/inventory write or actual-profit/accounting claim.
  Require pure equation/minimality/bounds tests, the complete rendered 375px
  four-mode journey, full Admin regression, and production-build security and
  artifact-boundary evidence.

  **Local implementation and verification — 30 August 2026.** The planner now
  exposes `Find units needed` in a 2×2 44px mode selector. It solves whole-unit
  quantity from positive post-fee unit contribution, recomputes the full
  scenario, shows profit above target, and displays the immediately previous
  quantity and profit as minimality proof. The deterministic fixture recommends
  12 units for a ₱1,000 planned-profit target, yielding ₱3,000 gross, ₱2,900 net,
  ₱1,805 total planned costs, ₱1,095 planned gross profit, and ₱95 above target;
  11 units yield ₱985 and therefore miss. Non-positive contribution, zero/unsafe
  targets, a 100% fee, and requirements above 100,000 units fail closed. Pure
  sales coverage passes 14/14 and the sales plus draft.12 guide gate passes
  23/23. The complete 375px four-mode journey passes without document overflow;
  visual evidence is `C:/tmp/k2-admin-target-units-mobile.png`. The final Admin
  suite passes 26/26. `build:admin` passes security preflight, import integrity,
  707-module compilation, the 26-module Admin artifact boundary, and built-
  output secret scan. This is verified local planning behavior only; it does
  not create a quota, price, promotion, inventory reservation, order, canonical
  cost, payout, settlement, tax, accounting, deployment, or actual-profit state.
- **Copyable planning handoff — locally delivered 30 August and independently
  closed out 31 August 2026 (`IDEA-20260830-09`).** Every valid Sales Planner
  mode now exposes one reusable `Copy planning summary` action. Its deterministic
  customer-free plain text keeps the ISO timestamp, mode, reviewed assumptions,
  complete relevant result, and opening non-posting warning together; invalid
  calculations expose no action. The 44px phone-safe control announces success,
  and clipboard denial leaves an inline permission/retry path. Clipboard is the
  only state changed. Pure four-mode formatting/denial plus workflow-guide
  contracts pass 23/23; the rendered 375px success/denial journey passes with
  no overflow and a verified 12px-or-larger explanatory line; visual evidence is
  `C:/tmp/k2-admin-copy-summary-success-mobile.png`. The complete Admin suite
  passes 26/26. `build:admin` passes security preflight, import integrity,
  707-module compilation, the 26-module Admin artifact boundary, and built-output
  secret scanning. The interrupted session's post-copy screenshot locator was
  corrected after a witnessed timeout: it had tried to re-resolve the old button
  name after success changed that accessible name. This remains local prepared
  behavior, not deployment or canonical financial state. Recovery is to remove
  `PlanningSummaryCopy`, `createSalesPlanningSummary`, their focused contracts,
  and the draft.12 guide additions, then rerun the same 23-contract, 26-browser,
  and Admin-build gates.
- Run evidence-backed end-to-end rehearsals for Italy flight/box/manifest scans,
  Manila independent receipt/reconciliation, lots/FEFO, coupons, Pasabuy,
  permissions, retries, concurrency, and every workflow above using reviewed
  representative records—not fake success data.
- Document the Admin Delete PIN prerequisite in the staff SOP.
  `delete_products_with_pin_v2` is deployed and fails closed, and
  `k2_private.staff_delete_credentials` currently holds zero PINs, so every
  deletion attempt fails until an Admin sets a **4-digit** PIN in Staff & Roles.
  AUD-014 says 6-digit; the UI (`maxLength={4}`) and the database check
  (`^[0-9]{4}$`) both say 4. Four digits is acceptable here only because the RPC
  hashes the PIN and locks the account after 5 failed attempts in a 10-minute
  window — state that pairing in the SOP so nobody "hardens" one half of it.
  Staff must not read that fail-closed denial as a broken system. Note that the
  browser RPC path this SOP describes is itself revoked by
  `20260822_admin_product_master_boundary.sql`, so the SOP is rewritten once
  Admin BFF cutover lands. (Verified 25 August 2026; was AUD-014.)
  **Staff SOP prepared 29 August 2026:**
  `docs/runbooks/STAFF_PRODUCT_DELETION_SOP.md` now records the exact four-digit
  prerequisite, zero-PIN fail-closed interpretation, five-attempt/ten-minute
  threshold and fifteen-minute lock, eligible-product/history refusal, evidence,
  incident recovery, and the direct-RPC-to-signed-BFF cutover distinction. This
  closes the documentation requirement; real staff acceptance remains part of
  MAP-023 operational rehearsal.
- State the exception path in customer-facing copy. K2 runs no self-service
  cancellation or return; every change is handled directly with staff over
  messaging. Order confirmation and the guest conversation view must say so
  plainly, so the absence of a cancel control reads as a deliberate policy
  rather than a missing feature. Do not promise a response time the operations
  rulebook does not guarantee. (Was AUD-018.)
  **Locally resolved 29 August 2026:** both `Confirmation.jsx` and
  `GuestMessages.jsx` now state that cancellation and return have no
  self-service path, direct customers to staff messaging, and say each request
  is reviewed case by case without an SLA promise. The hermetic rendered test
  submits a real local order request at 375×812, verifies the confirmation copy
  and no horizontal overflow, and verifies the same policy on guest messaging;
  `npm.cmd run test:selling-surfaces` passes 3/3. Production-host/customer
  acceptance remains part of MAP-023 launch rehearsal.
- **Propagate the modal accessibility standard this plan already set.** MAP-018
  gave the Product Intake modal a labelled dialog role, focused close control,
  and Escape-close. That standard never reached the rest of Admin. Measured 25
  August 2026 across the 18 `src/views/admin/*Modal.jsx` files: only 4 handle
  `Escape`, 6 declare neither `role="dialog"` nor `aria-modal`, and 2 expose no
  accessible name. `DeleteProductsModal.jsx` — the most destructive surface in
  the product — has none of the three. There is no shared modal primitive and no
  focus trap anywhere, so each modal re-implements the shell and drifts. Extract
  one reviewed modal primitive carrying dialog role, accessible name, initial
  focus, focus trap, Escape-close, and focus restore, then migrate all 18. The
  completion check is 18/18 on each property, not a spot fix.
  (Found by the 25 August independent audit; `docs/PROJECT_AUDIT.md` section 12
  reports accessibility as a strength and did not measure this.)
- **Test the primary conversion surface.** `MasterProduct.jsx` is the canonical
  product detail view every `openProduct()` call reaches, and no file under
  `tests/` references it; `GuestMessages.jsx` — the customer support surface — is
  equally unreferenced. The suite has 35 spec files weighted heavily toward
  security and API contracts, so the boundary is well covered while the page that
  actually sells is not. Add behavioural coverage for product detail render,
  stock/price truth, and the guest message path. Sequence this after the
  MAP-021 product-view consolidation so the tests are written once against the
  surviving component. (Found by the 25 August independent audit.)
- **Lock the staff workflow guide to verified operational outcomes.** The guide
  is not accepted because a diagram or paragraph exists; each current procedure
  must state its authorized role, prerequisite records/evidence, exact Admin
  entry point, ordered actions, validations and blockers, canonical record/state
  expected at completion, forbidden shortcuts, failure/retry/recovery path,
  version/effective date, and authoritative rulebook/runbook citation. Cover at
  minimum: create/edit/archive product metadata; manual and paid-API product
  intake plus fallback; add first inventory through each allowed source; receive,
  recount, reconcile, transfer, quarantine, clear, write off, and edit inventory
  only through canonical lot commands; publish/unpublish; order/payment/packing/
  delivery exceptions; Pasabuy/wholesale; customer messages; staff/security;
  channel readiness; backup/incident/rollback; and every unavailable integration.
  Unbuilt or permission-denied tasks must say so and point to the exact blocker,
  never invent a workaround. Representative staff must complete and recover each
  enabled procedure on phone and laptop using the guide alone; compare the final
  database/event/provider state with the procedure's promised result. Any mismatch
  blocks guide approval and corrects the rulebook, implementation, or guide at its
  authoritative source. Keep approved guide versions read-only to ordinary staff;
  only the owner/authorized administrator approves a replacement version. Guide
  retrieval itself remains advisory and cannot execute a state-changing command.

  **Accepted outcome-first guide design — 31 August 2026 (IDEA-20260831-02;
  not yet implemented).** Keep one `staffProcedureRegistry.js` authority and
  make the Operations guide a teacher/navigator, never a second operational
  state store. Implement in this dependency order:

  1. Extend each procedure with plain-language outcomes/search aliases and
     replace unstructured step strings with versioned step contracts for exact
     screen, stable guide-target ID, visible control label, required input or
     evidence, action kind, staff instruction, expected intermediate result,
     canonical completion evidence, and recovery. Action kinds must distinguish
     navigate, enter/upload, copy approved prompt, manual external handoff,
     review, wait/read back, and finish; none may execute a mutation.
  2. Create one audited guide-target registry shared by procedure contracts and
     real Admin controls. `Open this workspace` must navigate, restore/focus the
     exact labelled control, and fail visibly when the target is absent or the
     role lacks access. Do not silently fall back to a broad section or press the
     control on behalf of staff.
  3. Render an outcome-first finder and one-step-at-a-time walkthrough using the
     established Admin BOS product register. On phone, emphasize the current
     step and keep other steps compact; on phone and laptop preserve full
     procedure/source access, 44px actions, keyboard operation, focus recovery,
     non-color status, reduced motion, and honest loading/empty/denied/offline/
     stale/conflict/ambiguous-timeout/blocked/unavailable states.
  4. Derive `Verified by workflow` only from the owning workflow's bounded
     canonical record/event/file/provider-receipt read model. Guide searches,
     opened workspaces, copied prompts, pasted answers, viewed steps, and local
     rehearsal marks never establish operational progress. Where no safe read
     model exists, show the exact manual evidence staff must review and do not
     claim automatic verification.
  5. Add a generic manual-external-step contract: approved private tool/Project,
     allowed evidence, prohibited data, versioned customer-free prompt/payload,
     expected return format, exact K2 return field, validation, human review,
     and manual fallback. Implement Product Intake first: PRODUCT_JSON request →
     K2 Product Content → Smart Paste field review → separate PRIMARY and AFTER
     K2 Product Image Studio requests. K2 may copy the approved payload but must
     not claim it opened, controlled, monitored, or verified ChatGPT.
  6. Add the Sales Planner guide second: open the exact Check a price, Find
     target price, Find max discount, or Find units needed mode; identify every
     field and assumption; explain the complete result and recovery; preserve
     the planning-only warning and never imply price/promotion/quota approval,
     tax, settlement, accounting, payout, or actual-profit authority.
  7. Convert the remaining MAP-023 procedures and later MAP-026 shop/import/count
     procedures only after their real controls and canonical evidence exist.
     Prepared or unavailable work remains readable with its blocker and valid
     manual boundary; it never receives a pretend target or completion state.
  8. Drive implementation test-first: fail contracts for incomplete step data,
     duplicate/missing target IDs, control-label drift, mutation-capable guide
     actions, unsafe external payloads, and local-state completion; then add
     focused rendered journeys for Product Intake and Sales Planner at 375px and
     laptop widths. Final acceptance requires representative staff to reach and
     recover every enabled outcome using the guide alone, while canonical
     database/event/file/provider evidence matches the promised result.

  **Draft truth-correction evidence — 30 August 2026.** The connected graph is
  now explicitly versioned `2026-08-30-draft.1` and labelled
  `DRAFT — NOT LOCKED`, with the operations rulebook named as authority. Browser
  checkmarks, route tracing, and training examples now say they are rehearsal
  only and cannot write or verify inventory, money, customer communication,
  publication, or provider state; the old fake barcode response no longer
  auto-completes a step. All guide jumps target real Admin sections. The audited
  copy no longer claims automatic customer alerts, Shopee/Lazada stock sync,
  Redis cache controls, automatic final pricing, a technical cycle-count zone
  lock, biometric custody approval, packing-camera evidence, fabricated courier
  waybills or SMS, fixed order deadlines, or universal Pasabuy deposit/refund/
  discount rules. The new-product branch now follows the actual two-Project
  manual sequence—K2 Product Content, Smart Paste field review, then separate
  PRIMARY/AFTER requests in K2 Product Image Studio—and preserves the AI ban on
  SKU, price, cost, stock, lot, expiry, custody, approval, and publication.
  `tests/workflow-guide-truth.spec.js`, the graph/channel suites, all 383
  source/API contracts, all 3 rendered Storefront selling journeys, all 24
  rendered Admin journeys plus the strengthened focused workflow rerun, and the
  Admin production build pass locally (13
  focused workflow contracts; prebuild security surface inventory reports zero
  control gaps). Chromium required the approved out-of-sandbox browser launch
  after the sandbox returned `spawn EPERM`; the rerun passed. This does **not** approve or lock the
  guide. Remaining acceptance is the full procedure inventory named above,
  per-procedure role/prerequisite/outcome/runbook coverage, ordinary-staff
  read-only version enforcement, and representative phone/laptop execution plus
  failure recovery with canonical server/provider state comparison after the
  owning migrations and deployment gates are active.

  **Structured procedure-inventory evidence — 30 August 2026.** The searchable
  Operations guide now uses `staffProcedureRegistry.js`, version
  `2026-08-30-draft.12`, with 18 structured contracts that machine-cover every
  minimum operation listed in this item. Each contract exposes status,
  authorized role, prerequisites, exact Admin/manual entry point, ordered
  actions, validations/blockers, expected canonical state, forbidden shortcuts,
  failure/retry/recovery, version/effective date, and rulebook/runbook sources.
  Prepared and unavailable tasks remain readable and name their exact blocker;
  they do not invent a workaround. In particular, paid API descriptions, SEO,
  usage/instructions, media briefs, and image candidates are a separate
  deliberate path but remain `UNAVAILABLE — BLOCKED` pending OWNER-007's
  confirmation sequence, spend ceiling, provider/model, retention policy,
  server-side secret boundary, and production activation. The working fallback
  remains the manual K2 Product Content → Smart Paste → K2 Product Image Studio
  sequence. The new SuperAdmin spend-control procedure documents the versioned
  hard-cap/model change and fixed safeguards; it does not claim the provider is
  enabled. The existing guide UI now shows the contract fields and draft label,
  removes “approved procedure” wording, and keeps key actions at 44px. The
  focused guide/retrieval/graph/channel contract group passes 25/25, as does the dedicated
  rendered 375px paid-API-blocker/fallback journey (approved out-of-sandbox
  Chromium was required after sandbox `spawn EPERM`). This closes the local
  procedure inventory/field-coverage gap only. Guide locking is still blocked
  by ordinary-staff read-only version enforcement and representative enabled-
  workflow phone/laptop execution, recovery, and canonical database/event/
  provider comparison after MAP-017 through MAP-022 and deployment gates.
- **Add product measurement, because there is currently none at all.** The
  project has no analytics or telemetry dependency of any kind — no Google
  Analytics, Plausible, PostHog, Vercel Analytics, or session instrumentation in
  `src/` or `index.html`. `error_reports` captures client errors and is not
  product measurement. The consequence is concrete: MAP-023 asks for operational
  acceptance and MAP-025 asks for launch proof, but nothing in the system can
  answer whether a customer reached a product, added to cart, or abandoned at
  checkout. Contract tests prove endpoints behave as specified; they say nothing
  about whether a Filipino buyer completes a purchase.
  This is blocked by the AUD-003 URL work in MAP-024 — with every view served at
  `/`, no page-level funnel can exist even if a provider were added tomorrow, so
  sequence it after routing. Choose a provider consistent with the privacy and
  CSP posture in MAP-021, and define the specific funnel to watch before launch
  rather than collecting everything. (Found by the 25 August independent audit.)

**Complete when:** purchase, inventory, reservation, order, wholesale, payment,
delivery, settlement, exception, and custody quantities/money/states reconcile;
failures, expiry, cancellation, concurrency, and retries neither strand stock nor
duplicate/corrupt truth; storefront failure cannot masquerade as empty/sold out;
every KPI and action-center item drills to canonical records; staff can complete
and recover their real daily workflows on phone and laptop by following the
approved versioned guide without developer interpretation; customers can submit,
reload, and follow guest/account/approved-wholesale requests; public proof is
attributable; and unresolved external adapters remain truthfully manual/
unconnected. For every tested unit, staff can identify the current owner,
custodian, location, lot/box, reservation state, and complete accepted custody
history; no parallel allocation record disagrees. Unified Inbox delivery and
channel stock status match provider evidence, and two channels competing for the
last unit cannot oversell or produce divergent inventory truth.

**Record in:** acceptance fixtures and results, relevant workflow runbooks,
operations rulebook, System Brain, and production-data health report.

### MAP-024 — Separate Vercel production projects, HTTPS, domains, DNS, and Auth callbacks

**Status:** In progress. Hostinger DNS, the two Vercel production projects,
custom hosts, TLS, deployment-target environment matrices, fail-closed API
gates, and provider-level security headers were applied and verified on
27 August 2026. Supabase Auth URL configuration, BFF activation, migrations,
email delivery/DNS, SEO assets, complete real-host journeys, and rollback proof
remain open. The exact domain is `k2jimzon.com`.

**31 August public-route gate (`IDEA-20260831-03`):** the current parser maps
every unknown path to Home, and a nonexistent `/product/:sku` stays on
`Loading product details...` indefinitely. MAP-024 now owns one generated public
route/metadata contract across direct load, internal navigation, refresh,
back/forward, crawler metadata, and an explicit not-found/unavailable state.
Every route needs the correct canonical/title/H1/landmark and every referenced
local asset must exist. The gate includes an internal-route and local-asset crawl
and must reject silent Home fallbacks. This is coordinated with MAP-019's scoped
receipt continuation; it must not introduce a second order-status authority.

**Current connector-account boundary (27 August 2026):** the Vercel connector
session available during this continuation lists only the unrelated team
`edgerzxcs-projects` and projects `scout-it`, `scoutit`, `mission-control`, and
`receipt-auditor-app`; it cannot read the K2 projects. The Supabase connector
session likewise lists only the unrelated `ScoutIT` project and denies access to
K2 ref `pixplcjqivlfflickobf`. This is not evidence that the K2 deployments or
database disappeared, and no deployment, database, or setting was changed. Use
the owner-authenticated K2 Vercel/Supabase sessions for future MAP-024 provider
reads or writes; never deploy K2 source or run K2 SQL through these unrelated
accounts.

**Connector refresh (28 August 2026):** read-only Vercel still exposes only team
`edgerzxcs-projects`; read-only Supabase still exposes only organization
`ScoutIT` and project ref `yyixsuaimdzyiocswcgc`. The K2 Vercel projects and
Supabase ref `pixplcjqivlfflickobf` remain unavailable in this connector session.
No provider or database write was attempted.

**Connector boundary corrected — the CLI path was never blocked (28 August
2026).** The two notes above are accurate about the *MCP connector* sessions and
inaccurate as a description of this machine's capability. The locally installed
CLIs hold owner K2 credentials and always did: `vercel whoami` returns
`k2jimzonwebsite`, and `supabase projects list` returns exactly one project —
`pixplcjqivlfflickobf` / `K2jimzon`, organization `dstfobgqgtklmbclhlgb`,
`ACTIVE_HEALTHY`, `linked: true`. `.vercel/project.json` is bound to
`k2-jimzon-admin` under team `team_C3Wf3dVUBjUqGQ4rndMTCchz`, and
`supabase/.temp/project-ref` pins the same K2 ref.

The consequence is that the owner-authenticated K2 database read recorded as the
blocker for queue item 6 has been available the whole time through
`SUPABASE_ACCESS_TOKEN` and the read-only Management API path already used by
`scripts/map017-evidence/export-live-schema-metadata.mjs`. Future sessions must
not re-derive the connector dead end: **use the local CLI/Management API path for
K2 provider reads, and never route K2 source or SQL through the unrelated
personal-account connector session.**

**Prepared runbook evidence (15 August 2026):** `DEPLOYMENT_RUNBOOK.md` now uses
the actual browser-safe publishable-key variable, leaves both BFF flags disabled
until their full boundaries are accepted, distinguishes `VITE_` variables from
approved server-only secrets, and requires the exact DNS records supplied by
Vercel at cutover instead of hard-coded provider targets. This is documentation,
not domain ownership, DNS, HTTPS, Auth callback, real-host, or rollback proof.

**Superseded pre-cutover registrar tooling evidence (27 August 2026):** the owner selected
Hostinger as the intended place to obtain the K2 domain, and the user-level Codex
configuration now contains an enabled `hostinger` stdio MCP entry with command
`npx -y hostinger-api-mcp`. `codex mcp get hostinger` verified the saved command
and arguments. This is local tooling registration only: the package has not been
treated as authenticated provider evidence, no API credential was recorded, no
domain was searched for or purchased, and no DNS, Vercel, Supabase Auth, HTTPS,
email, or production state changed at that earlier checkpoint. The later
authenticated cutover evidence below supersedes its pending-authority state.

**Superseded pre-cutover public-domain evidence (27 August 2026):** Verisign RDAP confirms
`k2jimzon.com` is registered through Hostinger from 27 August 2026 to
27 August 2027 with transfer lock enabled. Public DNS currently uses Hostinger's
`cosmos.dns-parking.com` and `nova.dns-parking.com`; the apex resolves to
`2.57.91.91`, `www` aliases to the apex, and both HTTPS hosts return `200` with
Hostinger's parked-domain page. `admin.k2jimzon.com` does not resolve, and the
apex exposes no MX or TXT record in the current check. No DNS, deployment, Auth,
email, or provider configuration was changed by this audit. Before cutover, the
owner still had to confirm account/DNS authority and preservation at that
checkpoint. The authenticated zone inventory and applied-provider state below
resolved those questions later the same day.

**Applied provider state (27 August 2026):** authenticated Hostinger connector
access proved DNS-edit authority. The existing zone contained only the parked
apex A record and `www` CNAME; no MX or TXT records were present to preserve.
Hostinger DNS now points the apex to Vercel A records `216.198.79.1` and
`64.29.17.1`, `www` to
`f683b7ff3d09cb06.vercel-dns-017.com.`, and `admin` to
`be6a2ad6b5b189c6.vercel-dns-017.com.`, all at TTL 300. Vercel verified
`k2jimzon.com` and `www.k2jimzon.com` against project `k2-jimzon`, verified
`admin.k2jimzon.com` against project `k2-jimzon-admin`, and applies a 308 apex
redirect to `https://www.k2jimzon.com`. Both HTTPS hosts return 200.

The production projects build with `npm run build:storefront` and
`npm run build:admin` respectively. Live HTML references different hashed
bundles; the Admin route marker is absent from the Storefront bundle and present
in the Admin bundle. Safe browser/server variable names and generated cookie or
guest signing secrets are installed per project, while both BFF flags and Admin
password recovery remain false. Missing signed-command/Turnstile/database-secret
alignment is deliberately not invented. Provider-level routes add report-only
CSP and security/no-store headers; Admin also emits `X-Robots-Tag: noindex,
nofollow` and `Cache-Control: private, no-store`. Start-position routes return
404 for `/api/storefront/:path*` and `/api/admin/:path*` while the prepared BFFs
remain disabled. These 404 routes must be removed or disabled immediately before
a separately accepted BFF activation.

**Measured live Auth state (28 August 2026) — the domain cutover did not reach
Auth, and every emailed link still points at the retired preview host.** A
read-only `GET /v1/projects/pixplcjqivlfflickobf/config/auth` returns:

```text
SITE_URL       : https://k2-jimzon-vert.vercel.app
URI_ALLOW_LIST : https://k2-jimzon-vert.vercel.app,       https://k2-jimzon-vert.vercel.app/**,
                 https://k2-jimzon-admin-seven.vercel.app, https://k2-jimzon-admin-seven.vercel.app/**
```

No `k2jimzon.com` host appears anywhere in the live Auth configuration. Every
flow that emails a link — password reset, magic link, email confirmation, and
the `invite-staff` path that MAP-016 just proved working — builds that link
against `k2-jimzon-vert.vercel.app`, and a redirect back to a real
`https://www.k2jimzon.com/...` callback is not in the allow list and would be
rejected. **Auth on the production domain is broken in both directions.** The
DNS, TLS and routing layers verified on 27 August are genuinely correct and are
not the problem; the cutover simply stopped short of this setting.

**Applied and verified 28 August 2026 — Auth now resolves on the real domain.**
`scripts/map024-evidence/patch-auth-redirect-urls.mjs --apply` patched exactly
two fields through the Management API and read the result back:

```text
site_url       : https://www.k2jimzon.com
uri_allow_list : https://www.k2jimzon.com/**,https://k2jimzon.com/**,https://admin.k2jimzon.com/**
```

Readback verification PASS. `supabase config push` was not used and no other
Auth setting was touched. The prior values are captured verbatim in
`scripts/map024-evidence/auth-config-rollback.json`, and re-running the script
without `--apply` is a safe dry run that re-captures current state.

`localhost` was deliberately **not** added to the production allow list: a
redirect entry pointing at an operator's own machine is a loosening this cutover
does not need. Add it explicitly only if local development is ever pointed at the
production Auth project.

This closes the Auth half of the cutover. Email delivery/DNS, BFF activation,
migrations, SEO assets, real-host journeys, and rollback proof remain open.

The prepared local values are correct and complete. The narrow remedy is a
targeted Management API `PATCH` of `site_url` and `uri_allow_list` only — the
"narrow dashboard change or fresh local Management API credential" this item
already names — and it is now available through the local CLI credential path.
It must not be done with `supabase config push`, which would apply the entire
config file. Rollback values are recorded verbatim in the block above.

`jwt_exp` is already `3600`, matching the prepared file, and `disable_signup` is
`true`, consistent with the invitation-only staff model. Neither needs changing.

The exact Supabase Auth target is prepared locally in `supabase/config.toml`
(`https://www.k2jimzon.com` plus apex, `www`, Admin, and localhost exact-host
redirects), but it was not pushed: the available CLI operation would
apply the entire config file, not only URL settings, and was rejected as an
unsafe broad production mutation. A narrow dashboard change or fresh local
Management API credential is the remaining provider action. This must not be
described as applied or live.

**IDEA-20260827-01 domain-downstream audit and MAP gate (27 August 2026):** the
owner requested that every consequence created or unblocked by the new domain be
captured durably. The idea is merged here rather than becoming a parallel
roadmap. Read-only live checks found that `/robots.txt` and `/sitemap.xml`
currently return the Storefront SPA HTML with status 200 and `text/html`, not
crawler files; the live HTML has no absolute canonical, Google verification, or
Bing verification marker; and public DNS has no Search Console/Webmaster TXT
verification record. The host-neutral robots, metadata, routing, icons, and
Product/Offer work described in queue items 5 and 6 is local/repository evidence,
not deployed exact-host proof.

Complete the following **domain downstream closure register in order**. Each
gate stays in MAP-024 until its own provider and real-host evidence passes:

1. **Reconcile deployment configuration and provider drift.** Capture the two
   project settings, domains, environment-name inventory, named Vercel routes,
   and deployment IDs in redacted evidence. Move the intended artifact-specific
   rewrites and headers into the reviewed deployment path so a future Git deploy
   cannot silently replace them with generic root `vercel.json` behavior. Keep
   the start-position `/api/storefront/:path*` and `/api/admin/:path*` 404 gates
   until the ordered BFF activation below reaches its enable step. Replace the
   temporary all-path Storefront `no-store` transform with a verified policy in
   which HTML remains non-stale while content-hashed static assets can use safe
   immutable caching; Admin HTML/data remains `private, no-store`. Pass when a
   clean reviewed commit deploy reproduces the separate bundles, redirects,
   rewrites, headers, cache classes, and disabled API behavior without dashboard-
   only repair. The currently available connector account cannot perform this
   reconciliation because it is not the K2 Vercel team; obtain the
   owner-authenticated K2 session first. Roll back by promoting the recorded prior deployment and
   restoring only the named routes.

   **Approved repository-selector design (28 August 2026; prepared-only):** the
   owner retained the two-project Storefront/Admin boundary rather than joining
   both surfaces. The accepted design keeps `vercel.storefront.json` and
   `vercel.admin.json` as the readable artifact contracts and prepares one small,
   identity-independent selector engine under `scripts/map024-evidence/`. The
   engine accepts an explicit target, current Vercel project ID, reviewed
   target-to-project mapping, and target configs; it refuses missing, invalid,
   unmapped, or mismatched identity instead of choosing a fallback. Synthetic
   project IDs may prove selector behavior only and are never provider evidence.
   A refreshed owner-authenticated connector then exposed the correct K2 team
   and both authoritative project IDs. Two additional failing-first contracts
   bound those real identities, after which root `vercel.ts` became the
   provider-supported programmatic adapter and the weaker generic `vercel.json`
   was removed locally.
   This is repository-prepared configuration, not a deployment. The `functions`
   property remains tuning, not an exclusion
   manifest: preview evidence must still record each project function inventory,
   the opposite boundary's guarded `404`, disabled BFF switches, separate
   bundles, routes, headers, and cache classes before production promotion.

   **Selector decision log:** dynamic project-bound selection was chosen over a
   two-directory monorepo restructure because it is the smallest change that
   preserves the established deployment boundary. A single combined deployment
   was rejected because it increases exposed code, shared configuration, and
   blast radius while Admin server-session/MFA activation remains unfinished.
   Structured review accepted the risks of swapped valid targets, unavailable
   system variables, opposite-function packaging, module caching, and provider
   drift. The staged resolution is an isolated-process contract around a pure
   selector followed by a separately tested provider-bound root adapter after
   both real identities were verified.

   **Prepared selector implementation evidence (28 August 2026):**
   `scripts/map024-evidence/select-vercel-deployment-config.mjs` now implements
   the approved pure engine, while root `vercel.ts` supplies the reviewed real
   project mapping and exports the selected config.
   Four witnessed TDD cycles proved exact selection, specific missing/invalid/
   mismatch refusals, missing-mapping refusal, and missing-config refusal in
   isolated Node processes. A fifth RED/GREEN cycle then proved both real K2
   project pairs and opposite-project refusal through the root adapter. The
   focused deployment/security file passes 13/13. The final full API/source
   contract suite passes 234/234 and the rendered Storefront selling journeys pass
   2/2, and the full prebuild gate passes. The restricted Storefront build first
   failed at Vite config access; the approved-workspace rerun passed its
   17-module boundary and artifact secret scan. The approved Admin build passed
   its 21-module boundary and artifact secret scan. Both target configs, provider
   settings, deployments, BFF flags, DNS, Supabase, and real hosts were unchanged.

   **Fresh provider drift found read-only (28 August 2026):** the connector now
   lists the correct team `k2-jimzon` and both projects, resolving the earlier
   account/identity blocker without a provider write. The Admin project's latest
   production deployment is `READY`; the Storefront project's latest production
   deployment is `ERROR`. Its errors-only build log shows
   `verify-tracked-sensitive-files.mjs` failed because Vercel's source checkout
   contains no `.git` repository, so the existing sensitive-file gate could not
   enumerate tracked files. Do not weaken or bypass that gate; diagnose and add
   a separately tested safe Vercel-source inventory path before deployment. The
   current Storefront project response also omitted the previously recorded apex
   and `www` custom domains, while the Admin response still listed
   `admin.k2jimzon.com`; reconcile domains and aliases read-only before any
   **Inventory refusal fixed 28 August 2026.** The gate used `git ls-files`
   exclusively, so a Vercel build workspace — which has no `.git` — could not be
   enumerated at all and the check refused outright. It now has two explicit
   modes and always prints which one ran: `git` (what the repository tracks,
   still the default whenever a repository is present) and `source` (what is
   physically present in a deployment checkout).

   The gate was **not** weakened. `source` is strictly stronger than `git`: it
   reports anything that would actually ship, including untracked files that
   reached the upload, and it never silently substitutes for `git` when a
   repository is available. Only `node_modules` and `.git` are skipped —
   `node_modules` is vendor code governed by the dependency policy and `.git` is
   history; a build output directory stays in scope because it can carry a
   leaked credential. An unreadable directory is recorded as a finding rather
   than passed over, and a run that can enumerate nothing still fails closed.

   Verified against a fixture: untracked `.env.local` and `deploy.pem` are both
   caught, `node_modules/pkg/vendor.pem` is correctly excluded, and paths are
   normalised so both modes feed the policy identically shaped input. Run in
   this repository, `--mode=source` reports `.env.local` and vendored CA bundles
   under the local `.tools/` PostgreSQL install — correct, since those would be
   findings if they shipped, and none of them exist in a deployment checkout. No
   project-specific skip list was added to quieten that, because that is exactly
   the weakening this item warns against.

   Remaining: create the previews and record function inventory, routes,
   headers, cache, domains, disabled API behavior, and rollback. Also reconcile
   the domain/alias drift noted above read-only before any promotion.

   *Superseded next action:* fix the Vercel checkout inventory refusal under
   its owning security gate, rerun all contracts/builds, then create previews and
   record function inventory, routes, headers, cache, domains, disabled API
   behavior, and rollback before production.
2. **Apply Supabase Auth URL configuration narrowly.** Set Site URL to exact
   `https://www.k2jimzon.com`; allow only the exact production destinations used
   by Storefront and Admin Auth/recovery flows, retaining bounded localhost and
   Vercel preview patterns separately. Do not use a production `/**` wildcard
   where an exact callback path suffices. Audit every Supabase Auth template for
   `.SiteURL`, `.RedirectTo`, confirmation, invite, magic-link, change-email, and
   recovery behavior; disable email click tracking where it can rewrite signed
   links. Prove one real customer email/OTP callback and, only after its separate
   security gates, one Admin recovery callback on the custom hosts. The Supabase
   API/project URL remains `https://pixplcjqivlfflickobf.supabase.co`; never
   replace a database/API endpoint with the storefront domain. Official provider
   reference: https://supabase.com/docs/guides/auth/redirect-urls.
3. **Close exact-origin, cookie, OAuth, and bot-host dependencies.** Reinspect
   Vercel production values for `K2_STOREFRONT_ORIGINS`, `K2_ADMIN_ORIGINS`,
   recovery callback, Storefront URL, and Secure cookie settings without printing
   values. Use host-only cookies unless a reviewed cross-subdomain flow actually
   requires a wider domain, and prove Storefront cookies are not sent to Admin or
   vice versa. Before enabling Turnstile, authorize only the exact Storefront and
   Admin hostnames in Cloudflare and install separately scoped site/secret keys.
   Audit Google/social OAuth consoles, Supabase provider callbacks, webhook
   subscriptions, Meta/business domains, marketplace return URLs, and any
   allowlisted CSP/reporting origins; update only providers that actually use an
   old Vercel host. Pass with success plus wrong-origin, old-host, preview-host,
   cookie-scope, and replay/expiry denial evidence.
4. **Audit production database and object storage for persisted hostnames before
   any rewrite.** Using read-only SQL, inventory text/JSON/URL columns, database
   config rows, notification/template content, product media references, stored
   webhook/callback endpoints, and Storage object metadata for
   `k2-jimzon*.vercel.app`, localhost, or other absolute application URLs.
   Classify each match as current configuration, customer/business data,
   immutable audit history, or generated cache. Never run a blanket string
   replacement and never rewrite Supabase Storage/API URLs merely because they
   use `supabase.co`. Prepare per-table backup, row counts, preflight, bounded
   mutation, postflight, and rollback only for proven stale operational values.
   Separately align any future database-held BFF signing secrets with Vercel
   server-only secrets before enabling a BFF; migrations remain in their existing
   dependency order.

   A redacted read-only harness now exists at
   `scripts/map024-evidence/inventory-persisted-hostnames.mjs` with
   `npm.cmd run evidence:map024-hostnames`. It scans text/JSON columns, emits
   only schema/column names and counts for absolute URLs, legacy K2 Vercel hosts,
   localhost, and loopback values, and refuses non-K2 targets. Its three safety
   contracts pass. The first live run correctly failed closed because this
   sandbox forbids outbound sockets to the K2 Supabase pooler; the elevated retry
   was unavailable due the host usage limit, so no inventory evidence was written
   and no production query completed. Re-run from an approved network-enabled
   owner session before any hostname rewrite.
5. **Deploy exact-host discovery assets from canonical catalog truth.** Merge and
   deploy the prepared History API routing, `robots.txt`, icons/manifest,
   canonical/Open Graph/Twitter metadata, and Product/Offer JSON-LD. Generate
   root `sitemap.xml` from published, customer-visible products only, using
   absolute `https://www.k2jimzon.com/...` canonical URLs and truthful price,
   FEFO-derived availability, image, and modification dates. Add the absolute
   sitemap line to `robots.txt`. Because social crawlers may not execute the
   React metadata controller, prove the initial response or an approved rendering
   strategy exposes the required absolute share fields. Keep Admin excluded by
   `X-Robots-Tag`, noindex, private caching, and absence from the sitemap. Pass
   content type/XML validation, Rich Results Test, URL Inspection rendered HTML,
   deep-link refresh/back, and real Messenger/Viber-style share preview; never
   claim a rich result is guaranteed.

   **Prepared exact-host sitemap generator (27 August 2026):**
   `scripts/map024-evidence/generate-sitemap.mjs` now accepts only a caller-
   supplied, read-only catalog projection and emits deterministic XML for the
   exact canonical origin `https://www.k2jimzon.com`. It includes home,
   catalog, and only `Live`/`Active` customer-visible SKUs; every included row
   must have a valid SKU and HTTPS primary image, with an optional validated
   modification date. It rejects non-canonical hosts, duplicate visible SKUs,
   unsafe/legacy-host images, and incomplete visible rows, and never reads `.env` files,
   connects to Supabase, or emits product descriptions, prices, stock, private
   fields, or secrets. `tests/map024-sitemap.spec.js` covers XML escaping,
   visibility filtering, canonical-host refusal, duplicate detection, and
   incomplete/unsafe rows. This is prepared code only: no production catalog
   projection was read, no `public/sitemap.xml` was generated from fixtures,
   and no provider or deployment state changed. The next action is to run it
   from an owner-authenticated, network-enabled K2 session against a reviewed
   production projection after the read-only persisted-hostname audit and
   real catalog publication/FEFO checks pass. Verification on 27 August:
    `node --check` passed; the focused MAP-017/MAP-024/security suite passed
   42/42; and the contract half of `npm.cmd run test:contracts` passed 228/228.
   Its chained selling-surface browser step was not evidence for this change:
   Chromium could not spawn in the restricted runner (`spawn EPERM`), with
    details retained under `test-results/`; no sitemap code ran in that step.

    **Prepared exact-host live validator (27 August 2026):**
    `scripts/map024-evidence/verify-live-discovery.mjs` performs public GETs for
    the canonical home, `robots.txt`, and `sitemap.xml`, with optional caller-
    supplied product paths. It requires the exact host, HTML/XML/plain-text
    content types, canonical home and product share tags, exact Admin exclusion
    and sitemap directives, canonical sitemap URLs, and no SPA HTML at crawler
    paths. It emits only redacted status/content-type/check summaries and can
    write an exclusive evidence JSON via `npm.cmd run evidence:map024-discovery`.
    The six fixture/CLI contracts pass. A 27 August run against
    `https://www.k2jimzon.com` failed closed before writing evidence because the
    restricted runner could not open the outbound public request
    (`MAP024_DISCOVERY_REFUSAL: GET / failed (network-error)`). This is a local
    execution-environment result, not a live-host pass or failure claim; rerun
    from an owner-authenticated, network-enabled session and review the redacted
    output before any deployment conclusion. The validator never changes
    provider or database state.
    A 28 August elevated retry was rejected by the host usage limit before the
    command could run, so no live-host result or evidence file exists yet.
6. **Establish Google Search Console ownership and indexing evidence.** Under
   `k2jimzonwebsite@gmail.com`, create a Domain property for `k2jimzon.com` so
   apex, `www`, and Admin subdomains are visible together; use the exact Google-
   supplied DNS TXT at Hostinger and preserve it during later DNS/email changes.
   After the real sitemap is live, submit
   `https://www.k2jimzon.com/sitemap.xml`, inspect the canonical home/catalog/
   representative-product URLs, and record sitemap processing, indexing/page
   exclusions, HTTPS, Core Web Vitals, rich-result, manual-action, and security-
   issue reports. Confirm Admin URLs remain excluded/noindex rather than asking
   Google to index them. DNS verification proves property ownership only; sitemap
   submission is a crawl hint, not indexing proof. Official references:
   https://support.google.com/webmasters/answer/34592 and
   https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap.
7. **Add Bing Webmaster coverage without duplicating truth.** After Google
   ownership works, import the verified property into Bing Webmaster Tools or
   use its exact DNS verification record, preserve that record, submit the same
   canonical sitemap, and record crawl/index errors for the Storefront while
   keeping Admin excluded. Treat IndexNow as optional later work: authorize and
   protect a key only if product URL update/delete latency demonstrates a need;
   do not create another catalog or indexing source of truth. Official reference:
   https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b.
8. **Decide domain mail separately from account identity.** The owner confirmed
   `k2jimzonwebsite@gmail.com` on 27 August 2026 as K2 Jimzon's primary
   owner/provider login, recovery identity, and project contact for Hostinger,
   Vercel, Supabase, Search Console, and related services; it is not a
   `@k2jimzon.com` mailbox. If branded or
   transactional mail is accepted, choose the provider first, then add and verify
   its exact MX, SPF, DKIM, and DMARC records without deleting Search Console,
   Bing, or other TXT records. Start DMARC in an observed policy and advance
   enforcement only after SPF/DKIM alignment, bounce/reply handling, Supabase
   custom SMTP, deliverability, abuse, and recovery tests pass. Otherwise record
   the explicit decision to keep Gmail and do not publish fake mail records.
9. **Review commerce/search entity surfaces after technical discovery works.**
   Add truthful `OnlineStore`/Organization, BreadcrumbList, Product/Offer, contact,
   shipping, and return-policy structured data only where the corresponding
   customer-visible policy and canonical database truth exist. Evaluate Google
   Merchant Center/free listings, Business Profile, Meta domain verification,
   and AI-crawler access as separate owner/provider decisions; do not publish a
   merchant feed, ratings, availability, address, policy, or third-party profile
   that K2 cannot prove and operationally honor. Record crawler policy explicitly
   in `robots.txt`; do not assume all AI training/citation bots should be allowed.
10. **Add domain operations and post-cutover monitoring.** Record registrar and
    Vercel ownership, 2FA/recovery custody, renewal/expiry, nameservers, DNS TTL,
    and the approved DNSSEC/CAA decision without changing DNS security during an
    unstable cutover. Monitor apex redirect, `www`, Admin, TLS expiry, DNS drift,
    security headers, actual crawler files, representative deep links, Auth logs,
    Vercel function/build logs, and Supabase logs. Run synthetic customer and
    staff journeys without real writes unless separately authorized; monitor
    Search Console/Bing over the first crawl window and record expected lag versus
    actionable errors. Alerts must name an owner and a tested recovery path.
11. **Remove old-host dependencies and close with rollback proof.** Search code,
    environment names, Auth settings, email templates, runbooks, tests, provider
    consoles, and current-state docs for old Vercel URLs. Preserve historical
    evidence as historical; update only current instructions and operational
    configuration. Exercise application rollback independently for Storefront
    and Admin and rehearse DNS rollback using the captured pre-cutover records
    without removing verification/mail TXT or MX records. MAP-024 remains open
    until the final evidence matrix distinguishes locally prepared, deployed,
    provider-applied, database-applied, and verified real-host behavior.

   **Current-host reconciliation (28 August 2026):** the active Admin OAuth
   redirect default in `src/lib/adminAuthRedirect.js` now points to
   `https://admin.k2jimzon.com/admin-portal-k2-secure`, and the current Admin
   security runbook, Operations Logic, README, Known Issues register, and
   System Brain use the canonical Admin host. The focused Admin contract now
   asserts that exact origin. Historical audit/evidence documents retain their
   old Vercel host as historical target evidence; the current MAP-016 provider
   probe now sends the canonical Admin origin, while sitemap rejection fixtures
   retain the old host deliberately as an unsafe legacy-host case. Supabase Auth
   allowlist application, real OAuth callback proof, and rollback rehearsal
   remain provider/real-host gates.

   **Hostinger provider refresh (28 August 2026):** a read-only connector check
   confirms `k2jimzon.com` remains Active, privacy-protected, transfer-locked,
   and expires 27 August 2027. Hostinger nameservers remain
   `cosmos.dns-parking.com` and `nova.dns-parking.com`; apex A remains
   `216.198.79.1` plus `64.29.17.1`, `www` CNAME remains
   `f683b7ff3d09cb06.vercel-dns-017.com.`, and `admin` CNAME remains
   `be6a2ad6b5b189c6.vercel-dns-017.com.`, all TTL 300. This is provider-held
   configuration evidence only; no DNS mutation occurred, and public
   propagation/real-host behavior remains unverified in the restricted runner.
   Hostinger also exposes rollback snapshot `175986373` (27 August 2026
   12:30:37Z), preserving the pre-cutover apex A `2.57.91.91` and `www` CNAME
   `k2jimzon.com.` at TTL 300. The snapshot is a recovery anchor only; no DNS
   restore or rollback rehearsal was performed.

**Local activation-environment gate (22 August 2026):** the redacted name-only
environment validator now has an explicit per-artifact activation mode. The
ordinary inactive inventory remains minimal, while Admin activation additionally
requires the server Supabase names, cookie key, signed-command secret, and exact
origin allowlist; Storefront activation additionally requires its server
Supabase names, guest signing secret, exact origin allowlist, and both Turnstile
names. A focused contract and five-fixture self-test pass. This does not inspect
values, install matching database secrets, add a Vercel rewrite, enable either
flag, or prove provider configuration; those remain cutover evidence.

**IDEA-20260828-01 — one active login and remembered-personal-browser gate
(accepted 28 August 2026; not implemented):** before Admin BFF production
activation, protect the public/shared-computer history-restoration path without
breaking ordinary staff phone use. Every browser starts unremembered. After AAL2,
a staff member may explicitly request `Remember this personal browser`; an owner
or Admin must approve it before the remembered policy activates. The decision
point must say that this means the current browser profile, not a physical phone,
does not create a 30-day login, does not cross private mode/other browsers, and
must never be selected on a public/shared computer. Pending, approved, denied,
expired, and revoked states must not block ordinary login or phone tab switching.

Implement the remembered-browser credential as opaque high-entropy material in
a host-only `__Host-` cookie with `Secure`, `HttpOnly`, `SameSite=Strict`,
`Path=/`, and no `Domain`. Store only its hash, staff binding, approval,
creation, absolute 30-day expiry, revocation, and security-generation metadata;
never log the raw value. It is a risk-policy signal only and can never
authenticate, authorize, extend the 30-minute idle/eight-hour hard session, or
silently survive a security-generation mismatch. Reapproval replaces that
browser's prior token; password/MFA reset, role change, staff disablement, owner
security reset, and explicit remembered-browser revocation invalidate the
relevant credentials and Admin sessions through authoritative commands.

Enforce one active Admin login per staff identity with a database-serialized
AAL2 registration command: lock per actor, revoke the prior active registry row,
then create the new row so simultaneous logins leave only the later login active.
Multiple tabs sharing its cookie are one login. Every protected request must
continue to validate provider session, encrypted K2 session, AAL2, role, active
registry row, and current private security generation; no lifecycle event,
remembered token, client mask, or cross-tab broadcast substitutes for server
authorization.

On an unremembered browser, verified browser-history/back-forward-cache or
restored-document entry must begin with a blank locked shell and require full
login plus MFA before protected fetch/render. A remembered browser may resume a
still-valid session only after server revalidation. Ordinary `visibilitychange`,
phone app switching, or tab switching alone must never expire or revoke either
class; privacy-mask protected UI while hidden/checking and distinguish checking,
offline, expired, revoked, and `another login replaced this session` with exact
recovery actions. Only bounded real user interaction advances idle time; polling
does not. Logout must distinguish `end current login` from `end and forget this
browser`, revoke server state, clear all sensitive browser stores, and broadcast
a prompt lock to other tabs while remaining secure if broadcast fails.

**Decision log and rejected alternatives:** structured Skeptic, Constraint, User
Advocate, and Arbiter review returned APPROVED after resolving browser-profile
truth, bearer-token residual risk, concurrent-login serialization, exact cookie
scope, authoritative invalidation, mobile lifecycle ambiguity, cross-tab/logout
behavior, recovery copy, and browser/OS limits. Browser fingerprinting was
rejected as private and unreliable; logout on every visibility hide was rejected
because it breaks phone use; silent restoration on every browser was rejected
because it preserves the public-PC risk; hardware-bound passkeys were deferred as
larger scope. A copied valid remembered-browser bearer token, browser/OS history
thumbnail, or already-visible unattended screen remains residual risk; public-PC
SOP therefore still requires explicit K2 and Google logout and must not be
described as universally solved by application code.

**Implementation and acceptance gate:** use failing-first contracts for the
serialized single-login invariant, remembered-browser issuance/approval/expiry/
revocation, cross-account binding, security-generation invalidation, exact cookie
flags, no persistent Admin cache/storage, and fail-closed API behavior. Exercise
desktop and mobile internal navigation, Back/Forward, bfcache, refresh, tab/app
switch, OS eviction/restoration, concurrent login, cross-tab logout, offline and
server-error cases. Keep MAP-024 open until locally prepared behavior passes and
is safe to include in the ordered Admin BFF preview. MAP-025 must then record
supported-browser real-host evidence and the public-computer SOP; browser tests
do not prove every browser/OS thumbnail behavior. Roll back by disabling the
remembered-browser policy, revoking all remembered credentials, and retaining
the authoritative one-login/session-registry checks and explicit login path.

**Deliver:** two genuinely separate Vercel projects and production artifacts;
per-project/per-environment variable matrix; storefront canonical host and apex
redirect; dedicated admin host; DNS preservation; TLS/HTTPS verification; HSTS
only after all hosts are correct; noindex/admin cache policy; CSP/security
headers; Supabase Auth/OAuth/reset allowlists; cookie domain/scope; CORS/Origin
allowlists; sitemap/robots/canonical/social metadata; rollback procedure; and
real-host smoke tests. The live artifact ships neither a crawler-readable
`robots.txt` nor `sitemap.xml`: both paths currently return SPA HTML. A
host-neutral `public/robots.txt` and runtime metadata controller are locally
prepared. The exact sitemap, absolute initial-response share metadata, provider
ownership, and crawler evidence remain build, deployment, and acceptance
work—not configuration-file completion.

**Prerequisite closure and exact-host gap:** queue item 5 records verified URL
routing, deep links, refresh, and browser Back. Queue item 6 records locally
prepared robots, icons/manifest, canonical/share metadata, and Product/Offer
JSON-LD whose availability uses canonical FEFO truth. Those earlier defects are
not current repository descriptions. They are not exact-host completion either:
the prepared discovery files are uncommitted in the current worktree, are absent
from the live artifact, and still lack generated `sitemap.xml`, absolute
initial-response share fields, Search Console/Bing verification, crawler/rendered
validation, and real shared-link proof. The downstream register above owns that
remaining work.

**Ordered BFF cutover — the sequence nothing in this plan previously stated.**
The 68 Admin and 13 Storefront BFF routes exist and pass all 179 contracts, but
`K2_ADMIN_BFF_ENABLED` and `K2_STOREFRONT_BFF_ENABLED` are fail-closed `false`,
so production still runs direct-client mode without server-side CSRF, rate
limiting, Turnstile, or cookie session isolation. Two revoke migrations are held
behind this cutover, and applying either one early breaks live staff work. Run
these steps in order and record evidence at each one; do not batch them:

1. Deploy the complete server environment for each target — server Supabase
   names, cookie key, signed-command secret, exact origin allowlist, and for the
   storefront the guest signing secret and both Turnstile names. Activation is
   name-complete or it fails closed.
2. Set `K2_STOREFRONT_BFF_ENABLED=true`, then `K2_ADMIN_BFF_ENABLED=true`, and
   prove both routers answer signed requests and return `403`/`404`/`405` on
   invalid target, origin, and method — on a preview host before production.
3. Promote the Admin BOS write paths to the BFF and verify each of the four
   direct writers no longer touches `public.products` from the browser:
   `InventoryGrid.jsx`, `Sheet.jsx`, `SmartPasteModal.jsx`, and
   `PhotoManagerModal.jsx`. Verify product creation, inline spreadsheet edit,
   bulk status change, bulk paste, and photo save all still work.
4. Promote product deletion to the BFF and verify `DeleteProductsModal.jsx` no
   longer calls `delete_products_with_pin_v2` directly.
5. Only then apply `20260822_catalog_spreadsheet_commit.sql` and
   `20260822_admin_product_master_boundary.sql`, one at a time, each with its
   rollback validated.

Steps 3 and 4 are the checks the migrations' own preflights cannot perform: they
verify database objects, not which application code still writes them.
(Was AUD-006 and AUD-007; both previously carried in this plan only as hazard
notes and evidence caveats, with no ordered task.)

Never rely on hostname guessing or paid deployment protection that is
unavailable.

**Complete when:** the owner-approved storefront/admin domains resolve only to
their intended projects; HTTPS/certificates/redirects/cookies/Auth callbacks/
headers work; no cross-artifact code or secrets ship; the database contains no
unclassified stale operational hostname; live crawler files, canonical/schema/
share output, Search Console and Bing ownership/sitemap evidence, Admin exclusion,
monitoring, and any accepted mail/external callbacks pass; and application plus
DNS rollback is proven without deleting verification or mail records.

**Record in:** Vercel/DNS/Auth configuration matrix, deployment runbook, build
checks, domain smoke tests, System Brain, and owner decision record.

### MAP-025 — Full security, staff, customer, and production launch proof

**Status:** Queued; final launch gate; depends on MAP-016 through MAP-024.
MAP-026 is sequenced separately and does not gate this item — see the launch-timing
decision in the dependency sequence.

**Local bundle-budget observation (21 August 2026):** the isolated builds pass,
but Vite still reports two Storefront chunks above its 500 kB warning threshold:
the main Storefront bundle is about 629 kB and the Globe section about 903 kB
before gzip. The Admin build has no equivalent threshold warning. This is not a
measured user-performance result; MAP-025 still requires route/chunk profiling,
real-device load evidence, p50/p95/p99 latency, cold-start, throughput, and an
owner-approved launch budget before these sizes can be accepted or remediated.

**15 August gate confirmation:** the local test matrix is useful regression
evidence but MAP-025 is not ready for independent verification. It cannot advance
until MAP-016 through MAP-024 are each independently accepted with their required
provider, operational, recovery, domain, staff, customer, and owner evidence.

**Deliver:** real automated and manual evidence for secret containment; schema
drift; grants/RLS/RPC/Storage; IDOR; RBAC/AAL2; guest/account ownership; BFF
cookies/CSRF/session expiry/revocation; injection/XSS; upload safety; rate limits;
bot protection; CORS; webhook forgery/replay; error/log redaction; headers/CSP/
HTTPS; dependency and bundle audits; backup/restore; both production builds;
both real domains; mobile/desktop accessibility and workflow acceptance;
representative storefront/admin operations; and rollback/incident response.

- Make CI/CD fail closed on contract/UI tests, both target builds, artifact
  isolation, dependency and secret scans, migration preflight, and required
  environment validation. Production promotion must identify the exact commit,
  migration state, configuration set, acceptance result, and rollback target.
- Profile representative public catalog, checkout/Pasabuy, Admin overview,
  inventory, inbox, and fulfillment database calls. Review query plans and indexes,
  prevent N+1 access, verify the Supabase connection budget, and run bounded safe
  concurrency/load tests. Record p50/p95/p99 latency, error rate, throughput,
  cold-start behavior, payload/bundle size, and provider-limit/cost observations;
  set a launch budget from measured evidence and resolve launch-severity misses.
- Verify real-host health checks for storefront HTML/assets, Admin shell, Auth,
  required BFF/Edge routes, and critical database dependencies. Health output must
  be minimal and must not expose secrets, schema detail, customer data, or internal
  stack errors; alerts must route to a named owner with a documented response.
- Prove IDEA-20260828-01 on the supported desktop and mobile browser matrix:
  one-active-login replacement, remembered-browser approval and revocation,
  unremembered Back/Forward and bfcache lock-before-data, remembered restoration
  only after server revalidation, ordinary phone tab/app switching without false
  expiry, cross-tab logout, offline denial, and exact recovery messages. Record
  browser/OS limitations and rehearse the public/shared-computer logout SOP.

**Complete when:** every release check exercises behavior and expected denial,
not filenames or UI text; production configuration is directly verified; no
launch-severity finding remains; external payment/marketplace limitations are
displayed honestly; owner/staff acceptance is recorded; final behavior is moved
to the rulebook/System Brain/runbooks; and MAP-025 is deleted so this plan is
truthfully empty.

**Record in:** automated tests, signed acceptance report, deployment/security/
backup/incident runbooks, operations rulebook, System Brain, and Git history.


### MAP-026 — Multi-shop channel accounts and custody-based inventory allocation

**Status:** Queued; depends on MAP-017 for schema/RLS activation, MAP-020 for
connector and command security, and MAP-023 for operational acceptance. Owner
scope decisions recorded 25 August, 31 August, and 1 September 2026.

**The operating model, from the owner.** K2 runs several seller accounts per
marketplace — two Shopee shops, two TikTok shops, two Lazada shops to start, and
the design must not hardcode two. Every shop is owned and operated by K2; this is
channel utilisation, not a marketplace of third-party sellers. The owner's
1 September correction makes warehouse/lot/location the physical boundary and
shop allocation a sellable-availability projection over that stock; a shop name
does not by itself prove who physically holds a unit. Staff still move exact lots
between locations/custodians as needed, so custody changes often. **Master
Inventory is the sum of everything, including all shop-eligible stock** — it is
the Philippines-wide truth and never shrinks when stock is allocated to a shop;
only eligibility, reservation, location, or holder changes. Physical stock moves
on a **staff-request, admin-approval, receiver-acceptance** workflow.

**Why existing behaviour does not already solve it.** The custody half largely
exists and is live: `product_batches` already carries `custodian`, `hub`,
`channel`, `quantity_available`, and `reserved_quantity`, and
`transfer_inventory_custody(text,text,text,text)` and
`transfer_inventory_custody_exact(uuid,integer,text,text,text)` are both live
security-definer functions. `v_stock_by_hub`, `v_stock_by_channel`, and
`v_batch_allocations` are live views. The model is a good fit for physical
custody, which is why this item extends it rather than replacing it.

The shop half does not exist at all. Verified against the live schema export:

- `channel_connections` has columns `channel, display_name, status, note,
  last_event_at, updated_at` — **keyed by channel, one row per channel.** There is
  no shop identity, so two Shopee shops are unrepresentable today.
- `channel_credentials` is keyed by `channel_code` — one credential set per
  channel, not per shop.
- `channel_listings` carries `channel_source`, `external_item_id`, and
  `external_sku_id` with no shop dimension, so two shops listing the same SKU
  would collide on external identifiers.
- `product_batches.channel` is a channel string, not a shop reference, so two
  Shopee shops cannot hold distinct allocations of the same SKU.
- `staff_allocations` exists (`staff_user_id, staff_name, sku, stock, location,
  bin`) with RLS enabled and **zero policies**, so it is deny-all and unusable
  from any staff or admin session.
- `v_stock_by_holder` is defined in the historical bootstrap but is **absent from
  the live database**, so the per-custodian view this model depends on is missing.
- No transfer request or approval workflow exists. The custody functions execute
  immediately, which does not satisfy staff-request/admin-approve.

**Owner-confirmed product/listing/allocation model — 31 August 2026
(`IDEA-20260831-01`).** One product may be sold on every K2 shop without becoming
one product per channel. The K2 SKU identifies the exact variant; every shop
listing has its own marketplace SKU/external IDs, reported quantity, selected
availability allocation, price/status, and freshness/error evidence. Linking or
creating a product requires Admin approval even when SKU and normalized name
match, because providers can reuse identifiers across sizes, flavors, shades,
formulations, and pack counts.

The owner selected **two sellable units per individual shop account** as the
default coverage target. It is a planning target, never a minimum that blocks
the product or forces it into every shop. Each product/shop relationship has one
explicit state:

- `Covered` — selected for sale with at least two eligible units;
- `Thin` — selected with one eligible unit;
- `Skipped` — intentionally not offered in that shop;
- `Out` — it was active there and accepted demand consumed its allocation; or
- `Needs review` — provider observation, allocation, custody, reservation, or
  physical truth is stale, incomplete, or inconsistent.

Scarcity is expected because sea replenishment commonly takes two to three
months and may take longer. K2 ranks candidate shops using recent verified,
deduplicated sales for that exact product/shop and proposes the best coverage;
the owner may override, reorder, thin, or skip shops before approval. Skipped
shops do not create false low-stock alerts. A warning appears when canonical
sellable Master Inventory cannot support two units for every currently selected
shop, names the affected shops, and distinguishes Thin from Out. Zero Master
Inventory is critical. Products with insufficient trustworthy sales history say
so and use explicit owner priority rather than fabricated demand.

Automatic rebalancing is allowed only for **availability allocation** over
already eligible canonical stock. It must use a locked/versioned snapshot,
preserve active reservations, never exceed Master sellable quantity, never make
a negative balance, and never double-count one unit across allocations. It does
not itself move a physical unit or change its custodian/location. If supporting
another shop requires physical movement, the existing exact-lot transfer
request, approval, receiver acceptance, and audit rules still apply. Accepted
orders consume the originating shop allocation and the same canonical
reservation pool atomically; concurrency tests must prove that a burst of orders
cannot oversell the last unit.

**Owner-confirmed warehouse eligibility and first connector sequence —
1 September 2026 (`IDEA-20260901-02`).**

- **Warehouse A is the only K2-direct warehouse.** Only eligible Warehouse A
  stock contributes to Storefront availability, K2 checkout, K2-owned payment,
  or J&T/direct fulfillment. Warehouse A may simultaneously supply its own
  TikTok Shop, Lazada, Shopee, and future marketplace listings from the same
  canonical physical pool.
- **Warehouses B and C are marketplace-only.** Admin BOS still owns their product,
  lot, custody, order, fulfillment, count, and reporting truth, but their stock
  must never make a K2-direct product available, rescue an unavailable K2 cart,
  or enter a K2-paid direct order. Their marketplace orders consume only the
  exact originating warehouse pool. A marketplace listing/redirect is not a K2
  direct checkout and does not make K2 the payment or fulfillment owner.
- **Warehouse A J&T sender and rate evidence — owner-confirmed/read-only on
  1 September 2026.** The sender is Blk 48 Lot 2, Phase 1, San Jose Heights,
  Barangay Muzon East, San Jose del Monte City, Bulacan (Guerra Pharmacy
  landmark/business), represented in J&T as
  `BULACAN / SAN-JOSE-DEL-MONTE-CITY / MUZON EAST`. The authenticated VIP
  Shipping Fee Inquiry produced representative ordinary EZ, pouch, J&T Super,
  and valuation-fee observations now preserved in
  `docs/JNT_VIP_SAFE_AUTOMATION_INVESTIGATION.md`. No provider mutation or live
  K2 checkout behavior or provider mutation was created. The owner-approved
  manual-pilot workbook under MAP-023 may convert only the eight exact observed
  locality pairs into pilot-quotable K2 rows; regional values remain nonquotable
  planning floors. It preserves effective dates and evidence, freezes accepted
  K2 charges, and reconciles them against actual J&T bills. The private VIP
  calculator must not become a live checkout dependency, and no workbook row
  makes a marketplace order K2-rated.
- **TikTok Shop and Lazada are first. Shopee adapter work is deferred by owner
  decision.** Keep the provider-neutral schema and the existing prepared Shopee
  ingress evidence intact, but do not spend current connector implementation or
  approval effort on Shopee and do not represent it as connected.

**Access qualification must pass before a full adapter is built or enabled.**

1. Record every TikTok Shop and Lazada shop, its legal/seller owner, exact
   warehouse, market, external shop ID, operating custodian(s), and authorization
   contact. Resolve whether shops under different seller owners can authorize one
   connector application or require separate applications/authorization paths.
2. Register K2 in TikTok Shop Partner Center using the eligible seller-developer,
   custom-app, connector, or system-integrator category. Record the provider's
   actual decision on registration review, connector review/beta requirements,
   shop-count/ownership limits, available Philippines scopes, rate limits,
   webhook signing contract, token lifetime, and reauthorization behavior.
3. Register K2 in Lazada Open Platform as the eligible self-developed application,
   complete application review, configure the internal/designated-seller
   whitelist, and record the actual Philippines permissions, shop limit, rate
   limits, push signing/retry contract, token lifetime, and reauthorization
   behavior.
4. Prepare the existing K2 website/Admin service as the integration application;
   no separate customer mobile app is required. Provide reviewed HTTPS OAuth
   callback and webhook URLs, privacy policy, terms/contact pages, business and
   identity documents, application/data-flow description, and least-privilege
   scope justifications. Store app secrets, access tokens, and refresh tokens only
   in the server/private secret boundary; never in React, browser storage, public
   logs, screenshots, chat, or `VITE_` variables.
5. In each provider sandbox/test path, and then in a tightly bounded authorized
   shop test when required, prove: authorization and revocation; token refresh;
   shop identity; product/variant/listing read; current inventory read; one
   reversible absolute-quantity write to a designated test SKU; signed order and
   cancellation webhook receipt; authoritative order-detail retrieval; replay
   deduplication; invalid-signature denial; retry/rate-limit handling; and clean
   disconnect/recovery. Preserve redacted receipts and exact documentation
   versions. Failure or missing scope keeps that provider manual/unavailable and
   does not block provider-neutral local hardening.

**Canonical synchronization behavior after access qualification.**

1. Map each exact K2 variant to warehouse + provider + shop + listing + external
   product/variant/SKU IDs. A mapping is Admin-reviewed, versioned, attributable,
   and cannot silently merge products from name, SKU, or barcode similarity.
2. A K2 direct order immediately reserves eligible Warehouse A lots under the
   existing 30-minute/payment-verification rule. The resulting canonical
   Warehouse A sellable value, minus any approved safety buffer or deliberate
   per-shop allocation, is published as an **absolute quantity** to eligible
   Warehouse A TikTok/Lazada listings. Proof submission protects the reservation;
   expiry, rejection, or cancellation releases it and republishes availability;
   verified payment converts the same reservation to sold without a second
   deduction.
3. A TikTok/Lazada order event is durably captured and acknowledged before
   processing, then authoritative order details are fetched and normalized. The
   accepted order atomically reserves/commits the exact mapped warehouse stock
   once and republishes the resulting availability to the K2 Storefront only when
   that warehouse is A and to other eligible listings for that same warehouse.
   Warehouse B/C events never change Warehouse A or K2-direct availability.
4. Provider cancellation, failed/unpaid expiry, approved return-to-sellable, and
   fulfillment transitions release or dispose stock only through explicit
   mapped state transitions. Refund, return, payment, order, and inventory states
   remain separate; a webhook, listing quantity, redirect, or platform status is
   never treated as physical proof by itself.
5. Every outbound stock update uses an idempotent outbox, bounded retries with
   provider-aware backoff, an absolute desired quantity and version, stale-write
   protection, per-shop/provider limits, and a durable success/failure receipt.
   Webhooks are hints, not the only truth: scheduled reconciliation reads current
   provider listing/order state, compares it with the canonical ledger, and
   creates a discrepancy/recovery queue without silently rewriting physical lots.
6. Connection health is capability-specific per shop: authorization, webhook
   capture, order retrieval, inventory read, inventory write, reconciliation,
   fulfillment, returns, and finance are tracked separately with freshness and
   last-error evidence. One successful webhook cannot label the whole shop Live.

**Admin BOS connector and recovery scope.** Add server-backed, role-scoped views
for shop authorization/expiry and capability health; exact warehouse/shop/SKU
listing mappings; canonical, reserved, allocated, provider-reported, desired,
and last-confirmed quantities; unified TikTok/Lazada orders with original shop
and warehouse attribution; pending/running/failed/dead-letter stock jobs;
reconciliation discrepancies; cancellations/returns; rate-limit and stale-data
warnings; and immutable audit history. Admins may retry, reconcile, disconnect,
reauthorize, correct a mapping, or make a reasoned canonical stock adjustment
through existing protected commands. They may not type/edit secrets, mark a
failed call successful, overwrite raw provider evidence, or change physical
stock merely to match a marketplace screen. Staff see only authorized shops and
safe operational fields.

**Deliver:**

- Introduce a first-class shop entity — channel plus shop account, with a stable
  internal code, external marketplace shop id, display name, assigned custodian,
  and lifecycle status. N shops per channel with no fixed limit; two per channel
  is today's data, not a constraint in the schema, UI, or contracts.
- Re-key `channel_connections` and `channel_credentials` from channel to shop, so
  status and credentials are per shop. Preserve the existing rule that secrets
  never enter the dashboard and that connection status is written only by the
  backend connector. Credentials stay in `k2_private`/Edge secrets with
  service-role-only access.
- Add a shop reference to `channel_listings` and make external identifier
  uniqueness per shop, so the same SKU can be listed by two shops without
  collision, with per-shop publication, price, and sync error state.
- Give `product_batches` a shop allocation dimension alongside `custodian`, so a
  batch is attributable to one shop while custody stays the unit-level owner of
  record. A shop may have several custodians; a unit may not be ambiguously held.
  Derive Master Inventory as the sum across all shops plus unallocated stock,
  reporting landed and in-transit positions distinctly. Master must never
  double-count a unit and must never shrink because stock was allocated. Allocate
  only after consignment receipt, so unconfirmed arrivals cannot be assigned to a
  shop. Restore `v_stock_by_holder` and add a per-shop equivalent.
- Build the transfer request workflow: a custodian raises a request naming exact
  batch, quantity, destination shop or custodian, and reason; an admin approves or
  refuses with a recorded actor, timestamp, and reason. Approval — not the request
  — is what calls the existing custody functions, which keeps one movement path
  and one audit trail. Requests must be idempotent, must fail closed on
  insufficient quantity, and must survive concurrent approval attempts.
- Write RLS so a staff custodian reads and acts on their own shops only, admins
  see and move everything, and `staff_allocations` gets real policies instead of
  its current deny-all. Cross-shop and cross-custodian access must be denied by
  test, not by convention.
- Surface it in Admin BOS: per-shop inventory alongside Master Inventory, who
  holds what, pending transfer requests for approval, and per-shop channel status.
  Never present a shop as connected or synced on the strength of configuration
  alone — keep the existing honesty rule that status reflects real connector
  evidence.
- Add the staged inbound inventory contract shared with MAP-023: per-shop import
  batches/rows, marketplace aliases, immutable reported-quantity observations,
  Admin product-link decisions, freshness/conflict/error evidence, and approved
  availability-allocation proposals. CSV/manual export intake comes first; real
  APIs reuse the same contract only after credential, signature, scope, retry,
  provider-limit, and end-to-end evidence gates pass.
- Add the flexible coverage engine and alerts: target two units per selected
  individual shop; retain Covered/Thin/Skipped/Out/Needs-review state; recommend
  scarce-product priority from verified sales; allow attributable owner override;
  and surface low/zero Master Inventory plus shops that can no longer be safely
  supported. Do not notify an external destination until that notification path
  has confirmed delivery evidence.
- Qualify and implement the TikTok Shop and Lazada adapters in that order only
  after their access gates pass. Reuse the shared signed-capture, normalization,
  reservation, outbox, reconciliation, health, audit, and Admin-recovery
  contracts; keep provider-specific authorization, signatures, event identities,
  scopes, limits, payload adapters, and receipts isolated. Leave Shopee disabled
  and deferred until the owner returns it to the idea/MAP gate.

**Complete when:** the schema represents an arbitrary number of shops per channel;
two shops on one channel hold distinct allocations of the same SKU without
external-identifier collision; Master Inventory equals the sum of all shop and
unallocated stock at all times and is proven by test against concurrent movement;
a provider snapshot cannot alter K2 identity or physical stock without the
required human/reconciliation decisions; two-unit per-shop coverage remains
flexible under scarcity; skipped shops stay intentionally quiet; accepted orders
consume one canonical pool without overselling; low/zero alerts identify the
unsupported shops from fresh evidence;
a staff transfer request cannot move stock without admin approval; a custodian
cannot read or move another shop's stock; and the Admin views show per-shop and
master positions from real data with honest unavailable states. The Storefront
derives sellable inventory exclusively from eligible Warehouse A lots; a B/C
unit cannot satisfy or alter a K2-direct checkout; a Warehouse A K2 reservation
updates the authorized TikTok/Lazada test listings and releases correctly; a
TikTok/Lazada order or cancellation changes the exact mapped warehouse once and
reconciles all other eligible surfaces; invalid/replayed/out-of-order events,
expired authorization, provider outage, rate limiting, and stale outbound jobs
cannot oversell or silently corrupt physical truth; scheduled reconciliation and
Admin recovery are proven; and each enabled provider has redacted approval,
scope, sandbox/test, preview, exact-host, and staff-acceptance evidence. Shopee
remains explicitly deferred and not connected.

**Record in:** the operations rulebook (warehouse eligibility, custody,
allocation, reservation, provider-state, and approval rules), System Brain (live
shop, warehouse, connector-capability, and custody state), migrations plus
preflight/postflight and rollback, the connector integration spec, provider
access/authorization evidence, Admin BOS documentation and staff SOP, incident
and token-rotation recovery, reconciliation runbook, and the authorization,
idempotency, concurrency, provider-failure, and exact-host acceptance suites.

**Owner answers recorded 25 August 2026 — these are decided, not open.**

1. **A shop may have more than one custodian.** The requirement is not to
   restrict it but to keep a precise, queryable answer to *who holds what*.
   Ownership attribution is therefore per batch and custodian, not per shop:
   a shop is an operating account, and custody is the unit-level truth. Two
   custodians on one shop must never make a unit ambiguously owned.

2. **In-transit stock reuses the consignment flow that already exists.** Do not
   build a second path. Verified live: `consignments` carries `manifest_code`,
   `flight_number`, `departure_city`, `destination_city`, `packed_at`,
   `arrived_at`, and `status`; `consignment_items` carries **`expected_qty`,
   `italy_packed_qty`, and `manila_scanned_qty`**, which is exactly the
   pack-in-Italy then confirm-in-Manila reconciliation the owner described; and
   `inventory_balances` already has an `in_transit` column. The live function set
   — `create_consignment_manifest`, `add_consignment_item_v2`,
   `record_packing_scan`, `record_consignment_item_scan`,
   `record_consignment_scan`, `finalize_consignment_receipt`,
   `advance_consignment`, `reconcile_product_batches` — covers the whole journey.

   What MAP-026 must do is narrower than it first appeared: Master Inventory must
   report landed Philippine stock and **in-transit stock distinctly**, never
   silently merging them, and shop allocation must happen *after* consignment
   receipt so a unit is not allocated to a shop while its arrival is still
   unconfirmed. The owner also asked for flexibility to count stock on arrival
   without a prior Italy declaration; verify whether the existing functions
   already permit a zero-`expected_qty` consignment finalised purely from Manila
   scans, and only add scope if they do not. Prove it before building.

3. **A refused transfer request is simply re-raised.** No appeal path, no escalation
   state. Staff resolve it in conversation. Keep the refusal reason on the record
   for audit, and let the requester raise a new request.

### MAP-027 — AI-assisted verified product knowledge and optional Interactive Shop

**Status:** Queued last in the active preparation sequence. Accepted from
`IDEA-20260826-01` on 26 August 2026 after review of
`K2_INTERACTIVE_SHOP_CONCEPT.md` and owner clarification. Depends on canonical
product intake/publication (MAP-018), customer messaging and ownership (MAP-019),
AI/upload/API security (MAP-020), browser/build performance (MAP-021), and
representative operational acceptance (MAP-023). Exact-domain sitemap,
canonical/share metadata, and live SEO proof remain MAP-024 work and are not
silently pulled forward.

**Interactive Shop V1 presentation layer delivered 28 August 2026 — owner
directed this forward as the customer hook. Sequencing exception recorded
below.**

*Sequencing note, stated rather than buried.* This item is written to run last,
and its own audit-gate warns that building a rich presentation before real
products would create "a polished fixture rather than a working shop". That risk
is real and unchanged: the live catalog is 27 mock rows with `published=false`
and zero photography. The owner asked for the shelf experience now, so the slice
built is deliberately the half that survives the gap — presentation over the
canonical projection, with honest empty states — and no Product Knowledge
workspace, AI drafting, FAQ layer, or database change was attempted, because
those genuinely do depend on MAP-018/019/020 and on real evidence existing.

*Delivered:*

- `src/views/InteractiveShop.jsx` with `src/components/shop/{shelfModel.js,
  ShelfUnit.jsx,ShelfProductPanel.jsx}`. Route `/store`, registered in **both**
  `StorefrontApp.jsx` and `App.jsx` — the combined entry keeps its own view
  registry, and a route missing from either silently falls back to Home, which
  is exactly how the first attempt failed.
- **Bounded shelves, no 3D.** Depth is CSS perspective plus a lit plank face and
  darker front edge — two gradients, no scene library, no camera, no walking, no
  physics, matching the V1 decision log. Previous/Next shelf plus direct shelf
  buttons; products are grouped from the canonical `category` projection and an
  unmapped category falls into an overflow shelf rather than vanishing.
- **One basket, proven.** Verified in a live browser: adding from a shelf writes
  to the canonical `k2_cart_v1` key (`[{"id":"caffe-milano-gold","qty":1}]`).
  Two real integration defects were found only by driving the UI — `addToCart`
  takes an id, not a product object, and `requestPasabuyItem` expects
  `{item,notes}`, not `{sku,name}`. Both silently no-opped before the fix.
- **Honest states.** Unknown stock renders `Checking stock`, never `Sold out`,
  so an unavailable FEFO projection cannot assert availability. Missing product
  copy renders `Information not available yet`. An empty catalog renders one
  empty-shop message with a Pasabuy route, not four empty rooms.
- **No payload on ordinary paths.** `InteractiveShop` builds as its own
  13.12 kB / 3.83 kB-gzip lazy chunk; the storefront entry grew 0.08 kB gzip.
- **Accessibility structural, not bolted on.** Planks are `aria-hidden`
  decoration; every product is a real `<button>` in a real list, so the catalog
  is reachable when the scene, images, or scripting are unavailable. Measured at
  375×812: no horizontal document overflow, zero offending elements. All actions
  are 44px minimum.
- **Design-system gap closed.** DESIGN.md documented Amber Wood `#9A6A45` as the
  structural material colour but it had never been tokenised, so shelf furniture
  would have scattered one-off browns. A named `--color-wood{,-lit,-edge,-deep,
  -contact}` ramp now exists and the plank rules use it.

*Verification:* 243 contracts (8 new MAP-027 cases) plus both selling journeys,
11/11 smoke, both isolated builds with boundary and secret scans, and import
integrity all pass. A smoke failure during this work was traced to a leftover
`npm run dev` server on port 5173 being reused by Playwright instead of
`dev:storefront`, not to a code defect.

**Shared product-knowledge layer delivered 28 August 2026 — the approval gate
now exists in code, driven by mock data and ready for the real source.**

`src/lib/productKnowledge.js` is the single knowledge source MAP-027 requires.
Every field and FAQ carries a status and **only `approved` is ever public**, so
the rule that AI drafting is not a publication authority is enforced by the code
path rather than by convention. A draft, a failed generation, a skipped field,
and an approved-but-empty value all resolve to `Information not available yet`.

*Ready for real data.* `readKnowledgeSource` is the single swap point: replace it
with the Admin-approved database projection and nothing else changes, because
callers already handle unavailable fields and the gate already refuses anything
unapproved. `selectPublicKnowledge` is exported as a pure function precisely so
that gate can be tested against the real projection shape when it arrives,
independent of environment or source. Until then the module **fails closed**: a
production build has no fixture and no database projection, so every SKU reports
unavailable rather than inventing content. The sample knowledge is
development-only and cannot reach a production bundle.

*Delivered on the product page and the shelf:*

- `ProductKnowledge.jsx` renders Product details, Common questions, and Ask K2
  Staff. Native `<details>` carries the accordions, so keyboard use, screen
  readers, and in-page find work without custom ARIA and the content is never
  gated behind a transition that a headless render would skip.
- **One source, proven across both surfaces.** With the same SKU selected, the
  product page and the Interactive Shop panel render the identical approved
  description. The shelf carries no shop-only copy.
- **Verified exclusion.** With mock knowledge live, the approved fields and FAQs
  render while the `DRAFT` field and the draft FAQ do not appear anywhere in the
  rendered output.
- **Staff handoff with bounded context.** `askStaffAboutProduct` prefills the
  canonical guest conversation with SKU, public product name, originating
  surface, and the customer's own question — no history, no identity, no private
  evidence. Verified navigating to `/messages`; the composer itself cannot be
  exercised locally because guest messaging is correctly reported as *not active
  on this deployment*, which is a BFF activation gate, not a defect.
- **No promise is made.** The surface states review hours as fact and explicitly
  promises no response time; a contract asserts no presence or reply-time claim
  can be reintroduced.

*Honesty defect fixed.* `MasterProduct.jsx` fell back to **"Authentic Italian
import in our Manila inventory."** for any product with no description — an
authenticity and stock-location claim asserted for products the catalog knew
nothing about. It now renders the honest unavailable state, and a contract
prevents the string returning.

*Two real defects were caught by writing the tests and driving the UI, not by
review:* `publicFields(fields = {})` threw on an explicit `null` record, because
a default parameter only covers `undefined`; and `ShelfProductPanel` called
`useMemo` after an early return, violating the Rules of Hooks. Both fixed.

**The shelf leads with usage, not specification (28 August 2026).** Owner
direction: the Interactive Shop must not simply repeat the list view. Its reason
to exist is the question a customer asks standing in front of a shelf — *what do
I actually do with this?* — which a price grid cannot answer.

The knowledge model therefore carries `uses` ("What you can make with it") and
`pairings` ("Goes well with") alongside `preparation`, and the shelf panel
surfaces those three first, followed by up to three approved `People ask`
questions. This is emphasis, not duplication: they are the same approved fields
from the same source the product page renders, so the two surfaces still cannot
describe an item differently. A product with no approved usage says so rather
than inventing ideas. Verified rendered: selecting the coffee shows What you can
make, Goes well with, How to prepare it, and two approved questions, while the
draft field and draft question remain absent.

**WebGL shelf added 28 August 2026 — with an explicit revision to the V1
decision.**

Owner direction: the shop should feel like an actual sari-sari store. The
original V1 decision rejected 3D on cost and accessibility grounds. Those
concerns are addressed rather than waived:

- **Cost.** `three` and `@react-three/fiber` already ship for the storefront
  globe, so this adds no dependency. Building it split three/fiber into a
  *shared* 891.69 kB / 240.23 kB-gzip chunk used by both the globe and the shop
  instead of one copy inside the globe. `ShelfScene3D` itself is 21.94 kB /
  7.23 kB gzip, lazy inside the already-lazy `/store` chunk. The storefront entry
  is unchanged at 32.43 kB gzip, so landing, catalog and product paths download
  none of it.
- **Camera.** Still not a free world. It travels laterally along a bounded run,
  clamps travel to the first/last bay, and always faces the shelving. Pointer
  drag can select a neighbouring bay but cannot pan vertically, orbit behind the
  cabinet, or enter a free-walking space.
- **Accessibility.** Two visual tiers plus one semantic interface are
  contract-enforced: WebGL when allowed, a calm flat shelf guide when reduced
  motion/WebGL detection disables the scene, and the semantic product rail
  rendered unconditionally in both cases. A WebGL render error is contained by
  the scene boundary; `prefers-reduced-motion` and missing WebGL never load the
  3D bundle. Direct shelf and Previous/Next controls do not depend on dragging.

The earlier CSS-3D cabinet/toggle description was superseded by the full-frame
lateral aisle rebuild and is not current behavior. `ShelfUnit.jsx` may remain as
unreferenced prepared history in the dirty worktree, but `/store` does not render
it and this plan does not claim otherwise.

*Former verification gap closed locally 28 August 2026.* The earlier hidden
browser pane fired no animation frames and could not prove React Three Fiber
rendering. Playwright Chromium now opens `/store` in a visible rendering state,
creates a non-lost WebGL context, captures a non-blank canvas larger than
500×300, travels from Counter to Coffee, and saves the reviewed desktop frame.
This is real local browser evidence, not deployment, real-product photography,
or owner production-host acceptance.

*Verification that did pass:* 255 contracts (21 MAP-027 cases) plus both selling
journeys, 11/11 smoke, both isolated builds with boundary and secret scans, and
import integrity. The Interactive Shop chunk is 18.25 kB / 5.34 kB gzip and the
3D scene a further 7.23 kB gzip, both lazy.

**Concept source recovered and the store rebuilt to it (28 August 2026).**
`K2_INTERACTIVE_SHOP_CONCEPT.md` was referenced by this item but had never been
committed; it now lives in `K2 Jimzon - Brain/`. Working from the source rather
than this file's summary exposed real gaps, since closed: Previous/Next Shelf
controls (§1, §18) had been dropped in favour of dragging alone; the
Counter/Overview scene (§18) did not exist; New Arrivals (§18) was missing and is
now data-gated so it appears only when the catalog actually flags products; the
basket now reads as a counter with `Send order request` (§16) rather than a
checkout; and K2 acknowledges a basket addition (§3).

The store is now a separate full-frame room rather than a panel inside the
catalog page, in the white-luxury register the owner selected: an aisle of
marble bays the camera travels laterally, procedurally generated marble and
signage (no external texture, font, or HDR — the production CSP forbids external
asset hosts), per-item faces from the product photograph or a drawn label, and a
K2 shopkeeper at the side.

*Two deliberate divergences from the concept, both recorded rather than silently
taken.* §24 warns against "sterile luxury" and a "generic 3D showroom"; the
owner asked for white luxury, so the wall was warmed and the counter built in
wood, but this remains the live risk in the visual direction and needs an eye on
it. §9 asks for a `K2 staff is online` indicator; it is **not** implemented,
because no authorized presence signal exists and MAP-027 forbids labelling staff
online without one — claiming unverifiable presence is exactly the fabrication
§7 rules out. Implement it when a real signal exists.

**Rendered-browser audit and correction pass (28 August 2026).** The first real
frame exposed four defects that source contracts missed: the fixed white shell
masked K2's mandatory wood canvas; the shelf sign was cropped behind the top
edge; the 375px header compressed shelf navigation to 68px and reduced motion
left a blank stage; and a failed external mock photo stayed black because its
asynchronous loader retried without ever selecting `labelTexture`. Each received
a failing acceptance/contract condition before its smallest correction.

- The room now layers translucent warm paper over `wood-bg.jpg`; the side panel
  is translucent rather than an opaque white replacement.
- The camera frames the bay midpoint. The desktop crop regression measured 546
  dark sign pixels touching the top eight canvas rows before the fix and zero
  after it; the complete Coffee & Drinks sign is visible in the reviewed frame.
- At 640px and below, brand/exit occupy row one and the scrollable shelf nav owns
  the full row two. At 375×812 reduced motion creates no canvas, shows a calm
  canonical shelf guide, keeps the product rail/Previous/Next/Leave controls,
  and has no horizontal document overflow.
- A real `webglcontextlost` browser event now unmounts the failed canvas and
  reveals that same flat shelf guide; render exceptions notify the parent through
  the scene boundary instead of leaving a blank visual stage.
- Failed photo URLs are remembered for the scene lifetime, trigger one render
  refresh, and return `null` thereafter so the existing generated label is used.
  A contract proves one attempt then fallback; the reviewed WebGL frame shows
  the previously black Lavazza Dek package as a generated label.

**Keyboard, mobile transaction, and technical-audit pass (28 August 2026).** A
second rendered pass exercised the room as a complete shopping path instead of
only as a scene.

- Keyboard entry now moves focus to the room heading. Leave and Escape return
  to Catalog and restore focus to the original `Enter the store` control. Focus
  restoration is committed inside the same route update, including browsers
  that use `startViewTransition`; an earlier caller-side animation frame was
  proven too early and was removed.
- At 375×812 with ordinary motion, a customer can enter the WebGL room, move
  directly to Coffee, select Caffè Milano, read approved usage while draft text
  stays absent, add the canonical SKU, observe `1 in basket` beside `Add
  another`, open the same basket, and reach `/checkout`. The persisted basket is
  exactly `[{ id: 'caffe-milano-gold', qty: 1 }]`; the page does not overflow.
  The inline count is derived from canonical cart lines rather than a second
  counter.
- The fixed light room now owns local semantic tokens and `color-scheme: light`,
  so a dark operating-system/site preference cannot turn its warm-paper panels
  dark. Small labels and placeholders now use `#696159`, measuring at least
  5.78:1 on the room surface instead of the previous 2.70–3.55:1 failures.
- The standalone production Storefront shell no longer mounts its ordinary
  header, cart drawer, footer, mobile spacer, or mobile navigation behind
  `/store`. A two-frame screenshot diff found 675,801 pixels painted by the live
  footer through the reduced-motion room before this correction. The flat room
  also owns its wood background, so it remains complete without underlying
  chrome.
- At 812×375 and 125% root text, reduced motion still provides shelf navigation,
  a selectable semantic product, selected-product detail, Leave, and no document
  overflow. The first reviewed frame exposed real overlap: the fallback card
  ended at y=320.92 while shelf steps began at y=182.80. A short-landscape
  layout now keeps the verified shelf blurb in a compact two-column card and
  reserves separate vertical bands for that card, the 44px shelf steps, and the
  canonical product rail. The bounding-box regression and corrected screenshot
  pass.
- `playwright.map027.config.js` now owns a strict, self-starting port-5192
  Storefront harness. `npm run test:map027-smoke` therefore cannot silently reuse
  a stale combined-app server.

*28 August localhost repair and current evidence:* the Antigravity 2D avatar
referenced `headTilt` without defining it. A populated development catalog
mounted `StoreKeeperAvatar`, threw `ReferenceError: headTilt is not defined`,
and sent `/store` to `UI_SECTION_UNAVAILABLE`; the empty production-catalog
branch did not exercise the avatar and therefore masked the break. The repair
derives `headTilt` from the existing delighted/listening expression state and
adds runtime-error capture to the populated-catalog browser regression. That
regression passes 1/1; all 82/82 MAP-027 source contracts pass; and
`npm.cmd run build:storefront` passes the complete security preflight,
1,113-module production build, artifact boundary, and bundle secret scan. A
fresh localhost screenshot records a live 1120×826 non-lost WebGL context.

**Interactive guide, aisle clerk, ambient room, and physical basket enhancement
prepared and locally verified 28 August 2026.** Owner selected the synchronized
hybrid direction: one derived store moment now coordinates a functional 2D
pop-out guide, the single 3D clerk, scene accent, and basket acknowledgement.
The guide can be opened or tucked away, follows welcome/explore/inspect/added
states, and retains the bounded canonical staff handoff. The 3D clerk is no
longer stranded inside the Counter bay: one aisle-level instance moves between
authored bay positions and changes wave/point/present/celebrate gestures from
that same state. Shelf speech stays in the accessible 2D guide so a duplicate
3D cloud does not compete with product controls.

`StoreBasketDock.jsx` is a persistent physical-looking basket presentation fed
only by StoreContext `lines`, `subtotal`, and canonical quantity. Parcel drops
are keyed to a confirmed canonical add; it owns no editable quantities or
second storage. Its action keeps the truthful `Send order request` language and
warms the already-lazy Checkout chunk only after a basket exists. CSS ambient
light/grain, active-moment warmth, shelf-edge clerk staging, dark tokens, and
responsive compact states add depth without an external asset or post-processing
dependency. Reduced motion suppresses guide arrival, ambient drift, avatar wave,
and parcel motion and still never loads WebGL.

The four previously recorded browser failures are closed: dark placeholder
contrast, canvas/shelf-step interception, 375px shelf-nav collapse, and the
812×375 enlarged-text shelf-step/product-rail overlap all pass. The current
isolated MAP-027 browser group is **8/8 passed**, including the new guide-state
and cart synchronization case, the WebGL phone order journey, live non-lost
canvas/fallback, dark contrast, portrait reduced motion, and 125% landscape
text. The MAP-027 source suites pass **84/84**. Reviewed local screenshots cover
desktop WebGL, phone shopping, dark reduced motion, and enlarged-text landscape.
These are local Chromium artifacts, not a physical-device, real screen-reader,
deployed-host, real catalog, or customer-order claim.

**Owner-reviewed clerk/right-rail correction prepared locally 28 August 2026
(IDEA-20260828-04).** The shelf scene had explicitly changed the one clerk from
scale `1` at Counter to `0.52` on every product shelf while adding a second X
offset beyond the camera's bay movement. That is the reproduced cause of the
tiny, visually drifting figure. `ShelfScene3D.jsx` now holds one `0.92` scale
and one fixed bay-relative X offset, so clerk and camera cover the same distance.
The empty right rail is replaced by `StoreSidePanel.jsx`: a wood/brass shelf
masthead, canonical department navigation at Counter, canonical shelf-product
highlights and stock labels before selection, the existing product detail after
selection, and integrated FAQ/staff actions. It owns no product, stock, basket,
or conversation state.

The two regression tests failed before the correction and pass after it. The
focused Interactive Shop plus polish rerun passes **78/78**, and localhost Vite
returns HTTP 200 transformed modules for `StoreSidePanel.jsx`,
`ShelfProductPanel.jsx`, `ShelfScene3D.jsx`, and `InteractiveShop.jsx`. The full
prebuild security gates passed, but the final Vite production-build process and
rendered Chromium suite could not launch under the current managed Windows
sandbox (`Access is denied` / `spawn EPERM`); an escalation attempt was rejected
because the host usage limit was reached. Therefore the visual desktop result,
mobile panel fit, and production bundle remain explicitly unverified this turn.
Exact next action: refresh the already-running localhost `/store`, review
Counter and one product shelf, then rerun `npm.cmd run build:storefront` and the
isolated MAP-027 browser group when process launch is available. Recovery is to
revert this correction in `ShelfScene3D.jsx`, `StoreSidePanel.jsx`,
`ShelfProductPanel.jsx`, `InteractiveShop.jsx`, `index.css`, and the two added
contracts; no provider, database, or deployment state changed.

**Owner-rendered follow-up accepted as IDEA-20260828-05.** The refreshed shelf
frame proves the prior target is still inside the shelf: bay furniture extends
to ±8.25 scene units while the clerk target is only +3.4. The inter-bay clear
space is 3.5 units, her arm width nearly consumes it, the camera and clerk use
different interpolation formulas, and the current hand meshes are literal
spheres. The right rail also exposes `Ask K2` beside the guide's existing shelf
question form, creating two entrances to the same conversation sheet. Prepared
correction: widen and model the physical inter-bay dwelling zone, keep clerk and
camera travel synchronized in the clear aisle, add two real shelf levels, keep
only the guide's canonical staff handoff, and replace sphere hands with an
articulated arm/palm silhouette. Verification and remaining evidence stay in
this MAP item until the rendered behavior is reviewed.

**IDEA-20260828-05 locally prepared and source-verified.** Shelf spacing is now
ten scene units, putting the clerk at the 12.5-unit midpoint between adjacent
bay centres and at aisle depth `z=3.2`, outside the shelf plane. Camera and clerk
share travel rate `4`. Low-assortment bays render five physical levels and the
packer can grow to seven. `StoreKeeper3D.jsx` replaces sphere hands with upper
sleeves, forearms, oval palms, and thumbs. A rendered follow-up exposed the wave
ref on scene `+X`—her anatomical left—which swept across the torso. The ref now
belongs to scene `-X`, her anatomical right, so the hand lifts outward. The
duplicate right-rail `Ask K2`
action is removed; the contextual guide question form is the room's one staff-
handoff entrance.

The five new regressions failed before their respective corrections and pass
after them. The combined MAP-027 source suites pass **91/91**, import integrity passes, and the
already-running localhost Vite server returns HTTP 200 for `keeperRig.js`,
`StoreKeeper3D.jsx`, `ShelfScene3D.jsx`, `StoreSidePanel.jsx`,
`InteractiveShop.jsx`, and `index.css`. The complete Storefront prebuild gates
pass. Final production bundling is still blocked by the managed Windows sandbox
while Vite resolves `vite.config.js` (`Cannot read directory "..": Access is
denied`), and no fresh rendered-browser evidence has been captured for this
geometry. Exact next action: refresh localhost `/store`, review Counter plus two
adjacent shelves at desktop and phone widths, then rerun the production build
and isolated MAP-027 browser group when process launch is permitted. Recovery is
to revert the IDEA-20260828-05 changes in `keeperRig.js`, `ShelfScene3D.jsx`,
`StoreKeeper3D.jsx`, `StoreSidePanel.jsx`, `InteractiveShop.jsx`, `index.css`,
and the four regression contracts; no provider, database, deployment, message,
or live-host state changed.

**Owner-directed live website conversation accepted as IDEA-20260828-06.** The
existing implementation already creates a canonical conversation through the
Storefront BFF, tags it `Virtual Store`, grants the originating browser scoped
read/reply access, and shows it in the Admin inbox. The remaining break is at the
staff composer: Admin currently saves only `internal_only` notes, so no reply can
appear in the customer's in-store thread. The accepted correction extends the
signed, idempotent Admin BFF command boundary with a website-only customer reply;
it does not create another chat store or claim marketplace delivery. The Admin
queue and thread receive a source-kind-backed `LIVE WEBSITE CHAT` treatment and
explicit customer-visible composer. The store chat uses bounded automatic
refresh without claiming that staff is online. The clerk's shelf moment uses the
authored category blurb and canonical item count rather than a generic repeated
line. Prepared database changes remain unapplied until the migration is rehearsed
and explicitly run against the intended provider project.

*Scope and recovery:* local source, tests, and build artifacts only; no database,
provider, deployment, public catalog, customer message, or live host changed.
Recovery is to revert the MAP-027-specific changes in
`Catalog.jsx`, `InteractiveShop.jsx`, `StoreContext.jsx`, `ShelfProductPanel.jsx`,
`StoreKeeper.jsx`, `StoreKeeperAvatar.jsx`, `StoreKeeper3D.jsx`, `keeperTextures.js`,
`StorefrontApp.jsx`, `ShelfScene3D.jsx`, `StoreBasketDock.jsx`,
`storeGuideState.js`, `packageTexture.js`, `index.css`, the MAP-027 contracts and
their isolated config, then rerun the test suite and builds. The
active next work remains the dependency-gated Admin Product
Knowledge/database/AI/provenance scope and real published product photography;
do not fabricate those to make the room look finished.

**Owner intent and problem.** K2 does not yet have the real product catalog or a
verified per-product knowledge base. When products arrive, staff should not have
to author every description, FAQ, preparation note, and searchable product fact
from an empty form. The Admin BOS needs a dedicated **Product Knowledge**
workspace in the left navigation. AI should do most of the drafting work, while
staff retains complete editability and explicit publication authority. Products
without adequate evidence must be allowed to say `Information not available
yet`; neither the system nor staff should be forced to publish filler.

The customer-facing opportunity is an optional shelf-based **Interactive Shop**:
a tactile way to browse the same K2 products, ask common questions, hand an
unanswered product-specific question to staff, add to the same basket, or request
an unavailable item through the same Pasabuy flow. The normal Storefront remains
the fastest and primary shopping/SEO surface. The Interactive Shop is a new
presentation layer, never a second inventory, catalog, customer, conversation,
checkout, or reporting system.

**Audit-gate result.** The concept is accepted because it strengthens K2's
existing verified-product, human-service, and Pasabuy positioning and can reuse
canonical systems already owned by MAP-018/MAP-019/MAP-023. It is sequenced last
because building a rich presentation before real products, secure product
commands, messaging ownership, and operational data would create a polished
fixture rather than a working shop. The full-360/metaverse interpretation is
rejected for V1 due to mobile navigation, accessibility, asset, performance, and
maintenance cost. Generative AI answering customers directly from unsupported
knowledge is rejected. A provider-neutral AI draft boundary may be prepared;
paid-provider activation still requires owner approval and a cost/privacy gate.

**Understanding and fixed decisions:**

- Real products and their evidence will arrive later; the system must begin with
  honest empty/unavailable states rather than fabricated sample knowledge.
- AI-first drafting is the default after a product and its source evidence are
  saved. Staff can edit, reject, regenerate, skip, or replace any field.
- Every AI-authored public claim remains a Draft until an authorized human
  explicitly approves it. Editing does not itself imply approval.
- A skipped or unsupported field publishes no claim. The public surface may say
  `Information not available yet` or omit the field according to context.
- Static knowledge and live operational truth stay separate. Price, stock,
  batch, best-before, current arrival, and availability always come from the
  canonical current database projection, never permanent FAQ prose.
- The same approved knowledge serves ordinary product pages, the Interactive
  Shop, staff tools, and later SEO. There is one FAQ/knowledge source.
- AI may reduce authoring effort but is not a publication authority or a runtime
  dependency for shopping. Provider failure leaves an editable manual draft and
  cannot block product intake, inventory truth, basket, checkout, or Pasabuy.

**Deliver — Admin Product Knowledge workspace:**

- Add one labeled left-navigation workspace with a dense product queue showing
  `No evidence`, `AI drafting`, `Review required`, `Approved`, `Needs update`,
  `Information unavailable`, and `Generation failed` as distinct states.
- On creation of a real product plus evidence, enqueue one idempotent AI draft
  operation automatically. Do not generate before a canonical product ID exists.
  Provide reasoned `Regenerate`, `Skip`, and manual-entry paths; repeated requests
  cannot create competing active drafts or duplicate public FAQs.
- Let staff attach or select bounded evidence already accepted by the secure
  product-intake/media boundaries: packaging images, barcode/label facts,
  supplier/manufacturer material, receipts, owner/staff notes, and reviewed source
  links. Private evidence paths and provider secrets never enter public output.
- Store field-level provenance: source type/reference, extraction or generation
  operation, model/provider version where available, author/editor, reviewer,
  created/edited/approved timestamps, evidence freshness, and superseded version.
  Do not expose internal provenance or private documents to customers.
- Draft concise product-specific description, origin, ingredients, allergens,
  preparation, taste/intensity, storage, packaging, certifications, pairings,
  and 4–8 genuinely useful FAQs only where evidence supports them. Ban generic
  `premium quality`, repetitive SEO filler, duplicate questions across products,
  unverifiable health/safety claims, and copied live values.
- Make every generated field independently editable and independently markable
  `Unavailable`. Staff can approve a complete product set or an explicit subset;
  unapproved fields never leak through APIs, previews, JSON-LD, search, or cached
  output. Approval and withdrawal require an attributable actor and reason.
- Provide a diff-first review showing evidence beside the draft, warnings for
  unsupported/conflicting claims, a public preview, and exact consequences of
  Approve, Return to draft, Withdraw, and Regenerate. AI confidence never replaces
  evidence or human judgment.
- Turn resolved customer questions into FAQ **draft candidates** only. Staff may
  edit, approve, merge with an existing FAQ, or ignore them. Never auto-publish a
  chat answer. Count repeated normalized questions without storing unnecessary
  customer text or identity in analytics.

**Deliver — shared public knowledge and staff handoff:**

- Add the approved knowledge to the standard product page under Product Details,
  Product Passport, Common Questions, and Ask K2 Staff. Accessible accordions,
  deep links, keyboard use, and readable mobile layouts are required.
- Preserve product context in the canonical guest/customer conversation boundary:
  product ID/SKU, public name, originating page/shelf, and the customer's actual
  question. Do not label staff online without a fresh authorized presence signal,
  and make no response-time promise while offline.
- When a product, search, or FAQ answer is unavailable, offer the existing
  Pasabuy flow with bounded product/search/SKU/URL/quantity context. Do not turn
  `Information not available` into a false `Sold out`, and do not claim K2 can
  source an item before staff accepts the request.
- Add valid FAQ structured data only for approved, visibly rendered FAQs and only
  after exact-host MAP-024 rules are satisfied. Standard product pages remain the
  canonical SEO surface; the shelf experience does not generate duplicate URLs
  or competing product entities.

**Deliver — optional Interactive Shop:**

- Add an explicit `Enter the Store` choice without replacing Catalog/The Cabinet.
  Lazy-load the experience only after the customer chooses it; initial Storefront
  navigation and product pages must not download its scene/animation payload.
- V1 uses bounded 2.5D shelf scenes—Counter/Overview, Coffee & Drinks, Pantry,
  Snacks & Sweets, Beauty/Personal Care, with New Arrivals only when real data
  supports it. Previous/Next Shelf and direct category controls are always
  available; no free camera, walking, 360-degree world, VR, multiplayer, physics,
  lip-sync, or generative voice NPC.
- A lightweight K2 shopkeeper may orient to the selected shelf, acknowledge a
  basket addition, and open FAQs/staff messaging. It must never simulate staff
  presence, invent an answer, or delay frequent actions. Reduced motion removes
  spatial movement while preserving direct controls and content.
- Selecting a product exposes its canonical image/name/SRP/stock state plus Add
  to Basket, Common Questions, Ask K2 Staff, and Full Product Details. The same
  cart and order-request confirmation remain authoritative; a decorative basket
  cannot maintain separate quantities or claim payment/order completion.
- Mobile uses one readable shelf scene and ordinary product controls rather than
  shrinking desktop spatial complexity. Every product remains reachable through
  semantic lists/buttons when the scene is unavailable, images fail, scripting is
  reduced, or assistive technology does not use the visual shelf.

**Non-functional and safety contract:**

- Target the real catalog scale without a hard-coded product count. Bound each AI
  job and evidence payload; queue/retry with stable operation IDs; never retry an
  ambiguous write blindly; expose generation failure without losing staff edits.
- Keep AI/provider calls server-side behind the Admin BFF, AAL2/role checks,
  CSRF, idempotency, rate/cost budgets, fixed schemas, safe errors, audit receipts,
  and explicit enablement. No model key, prompt evidence, private URL, or raw
  provider response enters browser bundles or `VITE_` variables.
- Meet K2's established Storefront and Admin design registers. Admin prioritizes
  dense review, source comparison, complete states, and 44px actions. Storefront
  preserves the wood/editorial identity, product imagery, mobile reading, visible
  focus, sufficient contrast, and no decorative perpetual motion.
- Establish performance budgets before scene implementation: no Interactive Shop
  request on ordinary landing/catalog/product paths; reserved image dimensions;
  optimized responsive assets; bounded scene memory/DOM; no document-level phone
  overflow; no regression to Storefront interaction readiness or core web vitals.
- If AI, imagery, knowledge, presence, messaging, or the interactive scene is
  unavailable, normal product browsing, basket, order request, and Pasabuy remain
  usable. Recovery never depends on re-entering verified staff edits.

**Decision log:**

1. Optional shelf-based mode over the existing Storefront was selected; replacing
   normal commerce or building full 360/VR was rejected for speed, accessibility,
   mobile usability, and maintenance.
2. AI-first automatic drafts with human editability were selected over manual-only
   entry; staff may skip and publish an honest unavailable state.
3. Mandatory human approval was selected over automatic AI publication to prevent
   unsupported facts and AI-slop answers.
4. One approved knowledge source shared by product pages, Interactive Shop,
   Admin, and SEO was selected over duplicate FAQ systems.
5. Live inventory facts remain database-derived; copying them into permanent FAQ
   prose was rejected because it would drift.
6. Exact-host SEO and analytics remain deferred to their existing owner/provider
   gates; the concept does not justify buying a domain or enabling paid tracking
   early.

**Complete when:** a real product with bounded evidence automatically receives
one editable AI draft; no AI output becomes public before an attributable human
approval; skipped/unsupported fields render honestly; approved knowledge is
identical across the normal product page and optional shelf mode; live stock,
price, batch, and best-before always match canonical projections; an unknown
question reaches staff with product context and can return only as a reviewed FAQ
draft; unavailable products preserve Pasabuy context; normal shopping works with
AI and the scene disabled; desktop, keyboard, screen-reader, reduced-motion,
375px, failure/retry, permission, concurrency, cache withdrawal, and isolated
Storefront/Admin build tests pass; and real-host SEO evidence is recorded later
under MAP-024 rather than inferred locally.

**Record in:** operations rulebook (knowledge approval, staff handoff, and truth
rules), System Brain (verified current behavior only), Product/Design registers,
database migration/preflight/postflight/rollback records, AI/provider threat and
cost model, API/authorization contracts, Admin staff SOP, product/FAQ/SEO test
records, deployment runbooks, and Git history. Delete MAP-027 only after those
records contain the verified behavior and evidence.

### MAP-028 — Production readiness audit: deployment, discovery, security posture, and channel intake

**Status:** Active release gate. The working-tree audit was refreshed on
30 August 2026 across Storefront, Admin BOS, deployment configuration, CI,
security, discovery, accessibility, performance, and exact public hosts; the
complete safely executable local remediation and evidence pass was refreshed on
1 September 2026. No additional safe local implementation is currently hidden
behind the remaining rows: each open action now requires the recorded owner
recovery proof, provider application, target preview/live access, approved
production media, or manual release acceptance. The release decision is **NOT
READY FOR DEPLOYMENT/PROMOTION** until those external gates are closed. This
section records findings and required work; it performs no provider, database,
DNS, or deployment change.

**Method and its limits.** The original 28 August audit read deployment
artifacts, built both targets, inspected `dist/`, read the SQL migration set,
and ran contract, smoke, and UI suites. The 30 August continuation additionally
ran fresh security/build/browser evidence and read the exact public Storefront
and Admin hosts. No owner-authenticated Vercel or Supabase provider session was
available, so environment values, preview function inventories, database state,
and rollback controls remain unverified unless named as prior durable evidence.
Public HTTP evidence proves only what the exact host served at the observation
time; it does not substitute for provider inventory or an authenticated
staff/customer end-to-end transaction.

---

#### A. Deployment configuration — one launch-blocking defect

**A1 — BLOCKING. The audited repository had no deployment configuration Vercel
would read.** `vercel.json` was deleted in the working tree and replaced by
`vercel.mjs`, which imported `selectVercelDeploymentConfig` and exported the
selected object. Vercel supports static `vercel.json` and programmatic
`vercel.ts`; a root `vercel.mjs` is not a documented configuration source.
`DEPLOYMENT_RUNBOOK.md`
is already explicit that the adapter is "locally prepared evidence only" and
must not be promoted, so the intent is understood — but the deletion of
`vercel.json` is in the working tree now, and committing and deploying this
state would ship a storefront with:

- **no SPA rewrite**, so every deep link (`/catalog`, `/product/:sku`, `/store`)
  returns 404 on a cold load or refresh — the exact journeys `smoke.spec.js`
  covers locally would fail in production;
- **no security headers at all** — no `X-Frame-Options`, no `nosniff`, no
  `Referrer-Policy`, no `Permissions-Policy`, no CSP;
- **no `maxDuration`** on the BFF function, so the 10s bound the timeout
  contracts assume is not enforced by the platform.

**Local correction prepared 29 August 2026.** The existing fail-closed selector
now enters through root `vercel.ts`, Vercel's documented programmatic
configuration filename. It still binds each real K2 project ID to one exact
target artifact and refuses missing, invalid, or opposite-project identity. The
focused deployment/security contract passed 15/15 after a witnessed failing
test for the absent supported entrypoint. The obsolete `vercel.mjs` is removed.
Fresh Storefront and Admin production builds both pass their security preflight,
artifact-boundary verifier, and secret scan. This is local artifact evidence;
it does not prove that a Vercel preview loaded the programmatic config.

**Required before any deploy:** prove a preview actually consumes `vercel.ts`
with evidence of rewrites, headers, and function limits. The local correction
removes the known unsupported-filename defect; its passing suite does not itself
exercise provider loading or prove a deployed configuration.

**A1 superseding blocker verified 30 August 2026.** Root `vercel.ts` and root
`vercel.json` now coexist. Vercel's current programmatic-configuration
documentation says to use only one configuration file (`vercel.ts` or
`vercel.json`). The generic JSON includes both Admin and Storefront functions,
both API rewrites, and a shared SPA/header policy, while `vercel.ts` selects one
target-specific configuration by exact project ID. Which boundary a promotion
will consume is therefore ambiguous, and the repository contradicts the
provider-cutover evidence that says generic `vercel.json` was removed. Do not
promote either project until one reviewed configuration authority remains and a
preview proves the selected target's rewrites, headers, function inventory, and
opposite-artifact exclusion. The earlier claim that `vercel.mjs` itself is
unsupported is also documentation drift: Vercel now documents `vercel.mjs`, but
that does not make two simultaneous root configuration files valid.

**A1 repository conflict resolved locally 30 August 2026; provider proof still
open.** A RED contract first reproduced the ambiguity by successfully reading
root `vercel.json` beside root `vercel.ts`. The obsolete generic JSON was then
removed, leaving the project-ID-bound `vercel.ts` as the only root Vercel
configuration authority while preserving both reviewed target artifact configs.
The focused contract turned GREEN and the complete config/security file passes
16/16, including exact Storefront/Admin selection, opposite-project refusal,
headers, rewrites, function boundaries, environment names, and the new
single-authority assertion. This is repository evidence only. A preview must
Both full prebuild/security gates and the fresh Storefront and Admin production
builds also pass after removal, including target boundary and secret scans; the
Storefront empty-catalog build correctly emits only two stable sitemap routes
and no product pages. A preview must still prove Vercel consumed `vercel.ts`,
built the correct single artifact, and
excluded the opposite functions/routes before either production promotion.

**A2 — Two projects, two configs, one selector with no fallback.**
`selectVercelDeploymentConfig` refuses unless `K2_DEPLOYMENT_TARGET` matches the
mapped `VERCEL_PROJECT_ID`. That is the correct fail-closed shape, but it means
a missing or renamed project ID stops the build rather than degrading. Record
both project IDs, their environment variable sets, and a rollback deployment ID
before the first promotion.

---

#### B. Search discovery — the storefront is not currently findable

**B1 — No `sitemap.xml` is deployed, and `robots.txt` says so.** The built
output contains `robots.txt`, `manifest.json`, `index.html` and assets, and no
sitemap. `robots.txt` carries a comment stating the sitemap "remains deferred".
`scripts/map024-evidence/generate-sitemap.mjs` exists, is tested, and refuses
any origin other than `https://www.k2jimzon.com` — but it is a manual evidence
script (`npm run evidence:map024-sitemap`), is not part of `npm run build`, and
its output is not written into `public/` or `dist/`. **Consequence:** search
engines have no crawl manifest for the catalog. Every product page must be
discovered by link-following through a JavaScript-rendered SPA.

**B2 — `robots.txt` has no `Sitemap:` line.** Even once a sitemap is generated,
nothing points crawlers at it until this line is added.

**B3 — SECURITY + SEO. `robots.txt` publicly advertises the admin path.** The
line `Disallow: /admin-portal-k2-secure` is served publicly at the storefront
origin, so the "secure" admin path is disclosed to anyone who reads it, scanners
included. The admin is a **separate Vercel project on its own host** with its
own `X-Robots-Tag: noindex, nofollow`, so the storefront's robots file has no
legitimate reason to name it. Remove the line; it buys nothing and leaks the
path. Obscurity is not the control here — AAL2 and the BFF identity gate are —
but there is no reason to hand the path out.

**B4 — Audit finding; resolved locally, real-platform proof remains.** The audit
found that `index.html` set `og:image` and
`twitter:image` to `https://www.k2jimzon.com/icon.svg`, and declares
`twitter:card: summary_large_image`. Facebook, Instagram, Messenger, LinkedIn,
and X do not render SVG for link previews, and `summary_large_image` expects a
large raster. Every shared K2 link — including anything staff post to the social
channels this plan intends to connect — will show a blank or fallback card.
**Required:** a 1200×630 PNG or JPG at a stable path, referenced absolutely.

**B4 local resolution verified 29 August 2026.** `public/og-card.png` is a
reviewed 1200×630 PNG using the established K2 monogram, warm paper, crimson,
gold, Fraunces/Source Sans identity, and the existing honest import proposition.
The home HTML references it absolutely for Open Graph and Twitter, declares its
dimensions/type/alt text, and the runtime plus build-time product metadata use
the same raster whenever a reviewed product photograph is unavailable. The
fresh Storefront production build copied the exact asset into `dist/` and passed
the discovery/config contracts 26/26, build-boundary verification, and artifact
secret scan. This is local artifact proof only; representative real-platform
share previews remain MAP-024/MAP-025 acceptance evidence.

**B5 — Client-rendered canonical and metadata.** `StorefrontMetadata.jsx`
correctly rewrites `<title>`, canonical, and OG tags per route, but only in the
browser. The **served** HTML always declares `canonical: https://www.k2jimzon.com/`
for every URL. Googlebot renders JavaScript and will usually pick up the
corrected tag; the social crawlers in B4 do not render JavaScript at all and
will read the static tags for every product URL. **Consequence:** every product
link shared anywhere gets the homepage title, homepage description, and a
canonical pointing at `/`. This is the single largest SEO defect in the build.
**Options, in order of preference:** prerender the product routes at build time
from the same published-catalog projection the sitemap generator uses; or serve
per-route static metadata through the platform; or accept it and record the
limitation explicitly. Do not treat client-side metadata as sufficient.

**B5 preferred strategy prepared locally 29 August 2026.** The Storefront build
now uses the sitemap generator's exact reviewed visibility/validation projection
to prerender `dist/product/<encoded-sku>/index.html` for every published product.
Each raw page carries its self-canonical URL, product title/description, absolute
Open Graph and Twitter fields, Product/Offer JSON-LD, and breadcrumb JSON-LD;
the existing SPA scripts remain intact for hydration. The Storefront config
serves that static file through a product rewrite placed before the general SPA
fallback. No database or environment secret is read, unpublished rows generate
nothing, and malformed visible rows fail the build through the same sitemap
refusal boundary. A witnessed RED/GREEN cycle and the focused discovery/config
suite pass 26/26. The fresh Storefront production build passed security
preflight, boundary verification, and artifact secret scan. Current reviewed
production truth is still 0 published products, so the build honestly emitted
0 product URLs and 0 product pages; real initial-response/share proof remains
blocked until staff publish photographed products and a preview/real host is
available.

**B6 — No Search Console or Bing verification, and no analytics.** No
verification file exists in `public/`, no `google-site-verification` meta tag is
present, and no analytics or Core Web Vitals collection is wired into the
storefront. Nothing is measuring what production does. Verification by DNS TXT
is preferable here because it survives host changes and does not add a public
file; record which method was used.

**B7 — Audit finding; resolved locally, real-device proof remains.** The audit
found that the manifest declared `icon.svg` with
`sizes: "any"` for both `any` and `maskable` purposes, and `index.html` points
`apple-touch-icon` at the same SVG. **iOS does not support SVG for
`apple-touch-icon`**, and several Android installers still expect concrete
192×192 and 512×512 raster icons. Add PNG icons at both sizes plus an
`apple-touch-icon` PNG. This shares a root cause with B4 — the project has no
raster brand asset at all.

**B7 local resolution verified 29 August 2026.** The established SVG monogram
now has deterministic 192×192 and 512×512 PNG renditions plus a 180×180 Apple
touch icon. Vite emits a target-specific `manifest.json` at build time rather
than copying one shared public manifest across Storefront and Admin; its
Storefront identity lists the two raster icons first and retains the SVG and
maskable SVG as progressive formats. `index.html` names the 180×180 PNG for iOS.
The fresh Storefront build emitted all assets at the exact dimensions, and its
manifest contains `/` as the start URL with no Admin route or BOS identity.
Installed-device icon appearance remains a real-device launch check.

---

#### B8 — Nothing is published, so there is nothing to index

Read from `scripts/map024-evidence/published-catalog.json`, the real
owner-authenticated projection of the live K2 database taken 28 August 2026:

- **27 products**, every one `status: Live`
- **0 with `published = true`**
- **0 with any image** — no `primary_image_url`, no `image_url`

`StoreContext.jsx` filters the catalog on `.eq('published', true)`. So as of that
read, **the production storefront renders an empty catalog**: nothing is
listed, nothing is buyable, and the Interactive Shop has no products to place on
its shelves. The generated sitemap is correspondingly empty of product URLs, and
correctly so — advertising URLs for products the storefront will not display
would send crawlers to pages that render nothing.

This is not an engineering defect. `published` is the staff-controlled
publication flag, set from the Published toggle and gated by the primary-photo
requirement — and no product has a photo, which is very likely why none has been
published. It is recorded here because it changes what "launch" means: the SEO
work below is worth nothing until products are published with images, and no
amount of discovery configuration compensates for an empty catalog.

**Required:** load product photography, publish the catalog, then re-run
`npm run evidence:map024-catalog` and rebuild so the sitemap carries the product
URLs. The Store Asset Studio (MAP-027) is the screen that surfaces which
products are missing assets, ranked by whether a customer is currently looking
at an empty panel.

**Confirmed live 29 August 2026.** Re-read directly from the K2 project with
`npm run evidence:map024-catalog`, which uses the owner-held read-only
Management API token in the git-ignored `.env.local`. The figures are unchanged:
27 products, 0 published, 0 with an image. This is current production truth, not
a stale snapshot.

**B8 owner decision — 30 August 2026.** A non-zero public assortment is no
longer a deployment-readiness requirement. The owner accepts an intentionally
empty production catalog while K2 proves that product intake, evidence review,
images, inventory, and publication controls are ready for later real stock. The
27 existing mock rows are capability fixtures, not launch merchandise. After
the complete manual and paid-API intake workflows are locked and evidenced,
delete those exact production mock rows only through a reviewed dependency/
cascade dry run, verified backup/recovery boundary, explicit row manifest, and
post-delete readback. Preserve representative mock data only in local/test
fixtures. Until that controlled deletion, keep every mock row unpublished and
unbuyable. The empty catalog, two stable sitemap routes, and zero product
prerenders are then honest accepted launch behavior rather than a blocker.

#### B9 — Exact-host discovery is currently broken, and its verifier is stale

Read-only probes on 30 August 2026 found that `https://www.k2jimzon.com/`
returns an older 1,268-byte SPA shell with no canonical, Open Graph, or Twitter
metadata. `/robots.txt` and `/sitemap.xml` both return that HTML shell with
`Content-Type: text/html` rather than crawler artifacts. The exact-host command
`npm run evidence:map024-discovery` correctly stopped at the missing home
canonical and wrote no success evidence. The live Storefront therefore does not
contain the locally prepared discovery work in B1–B7.

The verifier itself also contains a second, independent launch-evidence defect:
`verify-live-discovery.mjs` and `map024-live-discovery.spec.js` still require
`icon.svg` as the share image and require the public robots file to disclose the
Admin route. The current Storefront contract, HTML, robots file, design decision,
and B3/B4 resolution require `/og-card.png` and forbid naming the Admin route.
This leaves two green, mutually incompatible test families. Update the live
verifier and its fixtures before using it as launch acceptance; a passing result
from the stale contract would be false evidence.

**B9 verifier drift resolved locally 30 August 2026; live host still broken.**
The updated fixture first drove the stale validator RED: the current
`/og-card.png` home metadata was rejected and the private Admin path was still
required in robots. The validator now requires the reviewed absolute 1200×630
PNG share image, requires only the public user-agent/allow/sitemap directives,
and explicitly refuses any robots response that names
`admin-portal-k2-secure`. The focused file passes 7/7 and the adjacent live,
sitemap, Storefront discovery, and deployment-config group passes 34/34. This
repairs local acceptance truth only. The 30 August production responses remain
the older SPA shell/HTML crawler fallbacks until a verified Storefront preview
and deployment supplies the prepared artifacts.

**Fresh live/provider reconciliation 30 August 2026:** an unrestricted,
read-only HTTPS check again returned the same 1,268-byte `text/html` shell with
HTTP 200 from Storefront `/`, `/robots.txt`, and `/sitemap.xml`. Structural
inspection found no canonical, Open Graph image, Twitter image, robots
`User-agent`, or sitemap `urlset` marker in any of those responses. Storefront
`/api/storefront/conversation` and Admin `/api/admin/session` both returned 404,
while both host roots returned 200 with the same 1,268-byte shell. The currently
authenticated Vercel connector belongs to team
`team_hWRb9j8WjUJshQqZuBkAOTFz` and lists only `scout-it`, `mission-control`, and
`receipt-auditor-app`; neither recorded K2 project ID is accessible. It was
therefore refused as K2 project/deployment evidence and no provider mutation was
attempted. Exact next provider action: authenticate the connector or CLI to the
K2 Vercel owner/team, re-list both recorded project IDs, then inspect or create
separate previews and capture config/function/header/environment/rollback
evidence before promotion.

#### C. Security posture — deliberate deferrals, and one that cannot complete

**C1 — CSP is Report-Only on both targets, and reports go nowhere.** Both
`vercel.storefront.json` and `vercel.admin.json` set
`Content-Security-Policy-Report-Only` and no enforcing
`Content-Security-Policy`. `security-headers-contract.spec.js` asserts this
deliberately, so the report-only phase is an intentional stage, not an
oversight. **However, neither policy contains a `report-uri` or `report-to`
directive.** A report-only policy with no reporting endpoint collects nothing:
the browser evaluates the policy, finds violations, and discards them. The
staged rollout therefore cannot produce the evidence it exists to gather, and
could sit in this state indefinitely while appearing to make progress.
**Required:** add a reporting endpoint, collect real violations from real
sessions, then enforce. The policy content itself is sound — `object-src 'none'`,
`frame-ancestors 'none'`, no `unsafe-inline` on scripts.

**C2 — Live HSTS is partial, not absent.** Exact-host responses on 30 August
2026 include `Strict-Transport-Security: max-age=63072000` on both Storefront and
Admin, superseding the older local-only statement that neither target has HSTS.
The live value omits `includeSubDomains`; the target configuration and contract
still do not declare HSTS, so its provider source and persistence are not
reproducible from the repository. Inventory every production subdomain and
record the provider source before deciding whether to add `includeSubDomains`.
Do not request preload until that irreversible choice is explicitly approved.

**C3 — Production DDL remains gated.** The dependency-ordered migrations named
in MAP-017/MAP-019/MAP-027/MAP-028 remain prepared and unapplied, including the
conversation-origin, virtual-store chat, product-knowledge, error-report, and
channel-vocabulary/shop boundaries. Their owning items record isolated
PostgreSQL rehearsal evidence. Named database/Storage backups, isolated restores,
and the complete off-site copy are verified; the remaining OWNER-005 gate is
owner recovery-access proof. Both dependent surfaces fail closed and say so in
the UI, which is correct — but none of that prepared behavior is production DDL.

**C4 — The live BFF function routes are unavailable.** Read-only `OPTIONS`
probes to `/api/storefront/conversation` and `/api/admin/session` on the exact
hosts returned platform-level `404 text/plain` responses with
`X-Vercel-Error: NOT_FOUND`, not the application router's JSON `405` response.
This is stronger than an unknown browser flag: the currently served deployments
do not expose those function routes. The name-only Vercel environment inventory
passes the base contract but intentionally omits every activation-required
server variable, so it is evidence of a disabled deployment, not readiness.
Inventory preview functions and activation-variable names, prove fail-closed
denial, then enable server switches before browser switches in the runbook order.
Do not claim connected Admin commands, customer identity/chat, or guest commerce
until authenticated real-host journeys pass.

---

#### D. Channel intake readiness — the structure exists, the vocabulary does not agree

This is the section that matters most for "ready to receive inventory". The
receiving tables are real and well shaped. The **naming is not consistent across
them**, and an adapter written against one spelling will silently fail against
another.

**D1 — BLOCKING FOR CONNECTORS. Three competing channel vocabularies coexist.**

| Surface | Values it accepts or uses |
| :--- | :--- |
| `order_requests.channel_source` (CHECK constraint) | `website`, `shopee`, `tiktok`, `lazada`, `pasabuy`, `manual` |
| `channel_type` ENUM (legacy, `0002_omnichannel_schema.sql`) | `shopee_account_1`, `shopee_account_2`, `website_retail`, `website_vip`, `direct_b2b` |
| `channel_listings.channel_source` (free text) | documented in-comment as `'shopee_account_1', 'lazada', 'tiktok_shop', 'website_retail'` |
| `channel_connections.channel` (seeded rows) | `website`, `pasabuy`, `shopee`, `lazada`, `tiktok` |
| `src/lib/channelMeta.js` | **both** vocabularies, plus `TikTok`/`tiktok` case variants |

`tiktok` and `tiktok_shop` are the same channel spelled two ways. `shopee` and
`shopee_account_1` are the same marketplace at two different levels of
granularity. `channel_listings.channel_source` has **no constraint at all**, so
a connector can write any of them and nothing will object until a join silently
returns nothing. **Required before the first connector writes a row:** one
canonical channel vocabulary, enforced by constraint on every table that carries
it, with the legacy `channel_type` ENUM either mapped or retired. This is
cheaper to fix now, with zero marketplace rows in the tables, than after.

**D1 local resolution prepared 29 August 2026; not applied.** Migration
`20260829_channel_vocabulary_and_shops.sql` introduces one six-code `channels`
table and one internal `channel_shops` row per seller account, maps the known
legacy listing spellings, replaces free-text/CHECK drift with foreign keys, and
requires marketplace orders to name a shop from the same channel. Website,
Pasabuy, and manual orders are forbidden from carrying shop identity. Listing
uniqueness is now per shop, while external item identity remains unique within a
shop. Client roles receive public vocabulary reads only; shop writes have no
browser policy. Dedicated indexes cover each new foreign-key lookup/cascade,
including custodian and listing shop references. A witnessed RED/GREEN check
caught the two missing foreign-key indexes; the complete isolated PostgreSQL
17.11 rehearsal now passes migration, replay, legacy mapping, denial/allowance,
multi-shop uniqueness, privilege, and index checks 12/12. Production schema and
connector state are unchanged pending the coordinated OWNER-005 gate.

**D2 — Multi-shop identity is unrepresentable in orders.** MAP-026 already
records that `channel_connections`, `channel_credentials`, `channel_listings`,
and `product_batches.channel` have no shop dimension. This audit adds one point
that section does not make explicitly: `order_requests.channel_source` is a
**CHECK constraint listing exactly six values**, so an order arriving from the
second Shopee shop has nowhere to record which shop it came from. Whatever shape
MAP-026 settles on must land before order ingestion, not after, because
backfilling shop identity onto orders that never carried it is guesswork.

**D3 — Only Shopee has an ingress path, and it deliberately creates nothing.**
`supabase/functions/shopee-webhook/` is genuinely well built: signature
verification, a 256 KiB bounded body, an absolute read deadline, deterministic
event IDs, a replay window, and an atomic service-role capture command with
private forced-RLS budgets. Its README is honest that it does **not** create an
order, because a Shopee status push does not contain a complete order. So today
the webhook records that something happened; it does not bring an order or a
stock change into K2. **There is no Lazada ingress and no TikTok Shop ingress at
all.** Both are listed in `ChannelIntegrations.jsx` with their portals and
required secret names, which is the right preparation, but no function, no
validation module, and no capture command exists for either.

**D3 resolution, 29 August 2026 — shared hardening extracted; signatures left
unwritten, deliberately.** The marketplace-agnostic half of the Shopee reader —
the content-type gate, the 256 KiB ceiling checked against both the declared
length and the bytes received, the absolute read deadline with stalled-stream
cancellation, strict UTF-8 decoding, bounded event-identity values, and the
replay window — now lives in `supabase/functions/_shared/marketplace-push.js`.
Shopee consumes it and its published error vocabulary is unchanged; its contract
suite passes untouched, and 11 new contracts cover the shared module directly.

Lazada and TikTok ingress functions were **not** written. Both would require
signature verification against signing strings that cannot be confirmed without
their approved developer applications, and the Shopee README already warns that
its own signing string must be checked against approved documentation before
deployment. Writing two unverifiable signature checks would produce code that
looks verified while verifying the wrong string — worse than having none,
because it invites deployment. When those seller apps are approved, each
marketplace needs only its own signature check and event-identity builder; the
reviewed intake hardening is already there to inherit.

**D4 — No social or messaging ingestion exists.** `channelMeta` carries
WhatsApp, Viber, Messenger, Instagram, and TikTok as conversation platforms, and
the admin inbox will render them correctly if rows appear. **No webhook,
adapter, or capture command exists for any of them.** A message sent to K2 on
Instagram today reaches no K2 system. The unified inbox is genuinely unified in
schema and genuinely empty of these sources in practice.

**D5 — Overselling is the first real risk once two channels are live.**
`inventory_reservations` exists and the fulfillment flow consumes it, and
`v_product_stock_from_batches` is the FEFO projection the storefront reads. What
does not exist is a rule that a marketplace order **decrements the same pool**
the storefront sells from, or any reconciliation for a sale that happens on
Shopee while the website shows the item available. With one channel live this is
invisible. With two it is the defining failure mode of multi-channel retail, and
it damages marketplace seller metrics, which are expensive to recover.
**Required before the second channel goes live:** a single authoritative stock
pool with per-channel allocation, and a defined behaviour for the race — decide
deliberately whether K2 oversells and apologises, or under-lists and protects
the account.

**D6 — Inbound is prepared; outbound does not exist.** `channel_listings`
carries `publication_status`, `validation_errors`, `last_synced_at`, and
`sync_error`, so the schema anticipates pushing listings **out** to
marketplaces. No publisher exists. This is correct sequencing — receive before
you send — but the plan should say so rather than leave the columns looking
implemented.

---

#### E. Admin guidance — what this item delivers

The admin already carries a Master Workflow Graph with five sections
(Italy & Cross-Border, Manila Intake & Catalog, Warehouse & Custody, Orders &
Fulfillment) and a searchable guide register in `adminGuide.js`. Neither covers
how an external channel becomes connected, what has to be true before it can
receive inventory, or what is deliberately not connected yet.

MAP-028 adds:

1. a **Channel Intake & Integrations** section to the Master Workflow Graph,
   drawn from the same authored data as every other section, showing the real
   path from marketplace credential to captured event to K2 inventory — with
   the unbuilt steps marked as unbuilt rather than drawn as if they work;
2. guide entries for connecting Shopee, Lazada, TikTok Shop, and the social
   messaging channels, each stating what exists today, what the operator must
   obtain from the provider, and what must not be claimed until an adapter
   confirms it.

Both are documentation surfaces inside the product. Neither connects anything,
and neither may imply a connector exists.

---

#### F. Full-surface refresh — 30 August 2026

**Release decision: NOT READY.** Local implementation quality is materially
stronger than the public deployments, but passing local evidence cannot promote
the stale host, execute the controlled mock-data cleanup, apply database
migrations, activate server boundaries, or prove rollback. The release owner
must preserve those states as separate claims.

**F1 — Fresh local evidence passed.** The following commands were run against
the current dirty working tree; unrelated owner changes were not modified:

- `npm run prebuild` passed secret fixtures, five environment-contract fixtures,
  tracked-sensitive-file policy (617 files), browser/server environment boundary
  (162 browser and 130 server/Edge sources), dependency policy (19 direct and
  273 locked packages), security-surface inventory (70 Admin routes, 13
  Storefront routes, two Edge functions, zero dynamic gaps, zero public execute,
  zero unexpected anon/public grants, zero wildcard CORS), working-tree secret
  scan (707 files), and import integrity;
- `npm audit --audit-level=low` passed with zero vulnerabilities;
- `npm run build:storefront` passed its target boundary and artifact secret scan;
  it emitted two stable sitemap routes, zero product URLs, and zero prerendered
  product pages because verified published catalog truth is still empty;
- `npm run build:admin` passed its target boundary and artifact secret scan;
- API/security/source contracts passed 383/383 on the 30 August continuation;
  the approved-workspace run then passed `test:selling-surfaces` 3/3. Storefront
  UI passed 29/29. The refreshed Admin UI run passed 24/25; its only failure was
  a strict locator resolving the same truthful paid-API blocker in two visible
  guide locations. The assertion was scoped to the first visible blocker and
  that exact journey then passed 1/1. Admin Product Master passed 1/1, and
  customer account/Wholesale passed 3/3.

These are local artifact and mocked/local-browser results. They do not prove a
remote GitHub Actions run, Vercel preview, provider variables, production
database writes, staff authentication, customer messaging, checkout handoff, or
rollback. The repository does contain a substantive GitHub Actions pipeline and
Dependabot policy; capture a green run for the exact release commit instead of
relying on this workstation alone.

**F2 — Storefront usability and accessibility.** At 390×844 and 1440×900, `/`,
`/catalog`, `/cart`, and `/account` had one H1, no horizontal overflow, no
visible image missing `alt`, and no visible unlabeled form control. **Local
correction verified 30 August 2026:** every catalog product-image button now has
an explicit product-specific accessible name, and product-title and footer
actions meet the existing 44px minimum without changing K2's editorial layout.
The focused rendered 390×844 Chromium suite passed 2/2 outside the restricted
runner after the in-sandbox launch correctly failed with `spawn EPERM`; the
fresh Storefront production build also passed security preflight, target
boundary verification, and artifact secret scanning. The narrow selected `All`
category remains 44px high and is usable, but an automated accessibility
engine/complete contrast gate is still required; these focused assertions do
not establish WCAG conformance or real-device acceptance.

**F3 — Admin BOS usability and accessibility.** Authenticated Admin browser
coverage passed desktop/mobile auth boundary, dashboard, navigation, workflow,
channel, and staff-auth journeys. Static design review still found widespread
10–11px operational copy in legacy workflow diagrams, Product Intake, Start Here,
and Inbox surfaces, below `DESIGN.md`'s 12px Admin minimum. Several legacy
workflow/channel components also use undocumented colors; the fulfillment graph
uses a purple AI-style signal outside the product register, and Inventory Grid
uses a decorative left-border accent. Normalize these through the product
tokens, preserve readable density, and recheck zoom, keyboard traversal, empty,
loading, error, permission-denied, offline, and stale-data states. The unauthenticated
local Admin shell remained at its loading state without configured provider
identity, so local manual inspection is not a substitute for an exact-preview
staff login.

**F4 — Performance and observability.** **Local correction 1 September 2026:**
hard build budgets now hold the Storefront landing graph to 150 kB JS gzip and
30 kB CSS gzip, and the Admin entry to 300 kB minified. The current verified
values are 149.43 kB, 26.73 kB, and 186.19 kB respectively. Cart, interactive-
store CSS/JS, Supabase, Three.js, and the Admin master workflow graph now remain
outside their initial route graphs; the graph split warning is gone. The
optional `react-three-fiber` graph remains approximately 892 kB minified / 240
kB gzip and must stay deliberate/lazy. Optional Google brand fonts no longer
block application bootstrap. No production RUM, Core Web Vitals, analytics,
CSP reporting endpoint, alert receipt, or error-budget evidence exists. Capture
mobile real-host Lighthouse/Web Vitals after the correct artifact is deployed;
do not declare production performance ready from budgets or Playwright alone.

**F5 — Documentation and contract drift.** The provider-cutover record says
generic `vercel.json` was removed, but the audit found it present.
`docs/DEPLOYMENT.md` and `docs/INTEGRATIONS.md` also named obsolete guest and
Turnstile secrets while the enforced activation contract requires
`K2_GUEST_BFF_SECRET` and `K2_TURNSTILE_SECRET_KEY` and forbids service-role keys
in Vercel. **Local correction 30 August 2026:** the generic root JSON is removed,
the overview now points to `vercel.ts`, real build commands, separate
server/browser switches, and the complete constrained-client activation names;
the integration register uses the enforced secret names, and the owner handoff
no longer instructs staff to recreate `vercel.json`. **Local correction 1
September 2026:** `docs/AUDIT_ACTION_PLAN.md`, `docs/AUDIT_FINDINGS.md`, and
`docs/PROJECT_AUDIT.md` now carry explicit historical/not-authoritative banners,
so they cannot be mistaken for the active MAP or current System Brain.

**F6 — Recovery boundary.** No rollback was executed during this audit. The
documented recovery path remains: promote the previous known-good deployment in
each Vercel project separately; if routing caused the fault, disable the named
route without enabling a BFF by removing its gate; for DNS, restore only the
captured web records from snapshot `175986373` while preserving later mail/TXT
records. Before launch, record exact known-good deployment IDs and rehearse one
preview rollback plus post-rollback Storefront/Admin boundary, discovery, header,
and function checks. Database/Storage activation stays blocked behind the final
OWNER-005 owner recovery-access proof even though the named backups and isolated
restores are already verified.

#### G. Independent full Storefront + Admin audit refresh — 31 August 2026; local remediation evidence refreshed 1 September 2026

**Release decision: NOT READY.** This refresh audited the current dirty working
tree without modifying unrelated owner work. It reviewed the authoritative
rulebook/System Brain/architecture/active MAP, mapped both production entries,
followed public routes and Admin workspaces, inspected browser/data/API/storage
boundaries, scanned dependencies and history, built each artifact, ran contract
and rendered-browser suites, and executed only read-only live probes. No
database, Storage, DNS, Vercel, Auth, connector, or production application state
was changed. The audit does not claim a penetration test, WCAG conformance, real
payment/courier/channel integration, or an authenticated real-host staff/customer
acceptance run.

**Fresh evidence ledger:**

| Evidence | Result | Meaning and limit |
| --- | --- | --- |
| `npm.cmd run prebuild` | PASS, refreshed 1 September after the customer-account containment delta | Secret fixtures, environment/file/source/dependency policies, 81 Admin routes, 14 Storefront routes, two Edge functions, 52 API requests, 37 Auth operations, 105 RPC calls, 14 Storage calls, 108 table calls, 174 SQL-function occurrences/145 signatures, zero route-control gaps, zero wildcard CORS, zero unexpected `PUBLIC` execute, 773-file secret scan, 18 direct/272 locked dependency inventory, and import integrity passed locally. |
| `npm.cmd run preflight:map017` | PASS safety validation; apply correctly refused | The exact 6,881-byte phase-one payload remains bound to SHA-256 `D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62` and ledger `20260824143000`; authorization plus database, Storage, and off-site backup evidence pass. The current dry run reports only `Owner recovery access` and reviewed roll-forward recovery as open and confirms that no database change was attempted. |
| `npm.cmd audit --audit-level=low` | PASS, zero reported vulnerabilities | Registry audit of the current lockfile only; it does not prove application authorization or provider safety. |
| `npm.cmd run security:history` | PASS | The repository scanner found no secret value in Git history; values are never printed. |
| Fresh isolated Storefront build + boundary/budget/secret verifiers | PASS after the customer-account lifecycle fix | The target boundary contains 29 manifest modules with no source maps/dev markers; the landing graph is 149.43 kB/150.00 kB JS gzip and 26.73 kB/30.00 kB CSS gzip. The build emits a script-free noindex Storefront `404.html`, and the boundary verifier rejects a missing, invalid, or Admin-contaminated recovery document. The 240.23 kB-gzip Three.js graph, 15.18 kB-gzip Interactive Shop, 5.44 kB-gzip shop CSS, and 1.99 kB-gzip cart remain lazy. The empty reviewed production catalog still emits no product URLs/prerenders; that is data-state truth, not a build defect. |
| Fresh isolated Admin build + boundary/budget/secret verifiers | PASS | The Admin entry is 186.19 kB minified/300.00 kB. `MasterWorkflowGraph` is a separate 104.97 kB chunk and the prior static/dynamic split warning is gone. The build emits a script-free noindex Admin recovery document with only its protected entrance; the boundary verifier rejects missing or cross-target content. The Admin-only Supabase alias prevents the Storefront deferred boundary from duplicating the Admin client. |
| API/source contract sweep | PASS 442/442 after the final CI/routing/404 deltas | The BFF route registry remains authoritative at 81 Admin and 14 Storefront routes. A separate shared view-path registry drives client parsing and the 12 non-root host rewrites. Generated product HTML retains filesystem priority while `/product/:sku` falls back to the client only for an unpublished/missing SKU. The release contract requires complete CI suite coverage, prevents protected Admin fixture skips and accidental `.only` acceptance, keeps CI servers isolated, and rejects Windows-only Playwright server commands. The first current aggregate correctly exposed that the Interactive Shop negative build fixture lacked the newly mandatory static 404 and therefore failed at the wrong boundary (441 pass/1 fail); after adding only a valid recovery fixture, the intended eager-payload rejection passed and the complete aggregate passed 442/442. This is fresh non-rendered source/API evidence, not a browser, provider, preview, or remote-CI claim. |
| Active route-document consistency | PASS | Machine comparison found exactly 81 documented/registered Admin routes and 14 documented/registered Storefront routes with no missing or extra names; the active route map also names the 12 Storefront view states and current components. |
| Storefront selling-surface browser suite | PASS 5/5 | Canonical price/stock/cart limit (including the lazy cart chunk), scoped guest conversation receipts, reload-safe confirmation, expired-grant recovery, and unknown-route/product recovery pass locally. Chromium required the approved out-of-sandbox launch; the earlier `spawn EPERM` was a sandbox restriction, not an application failure. |
| Complete local `npm.cmd test` aggregate | PASS, current tree 550/550 across all seven stages after the final customer-fixture containment change | One uninterrupted complete command passed base 484/484, Storefront 30/30, Admin 26/26, Product Master 1/1, Owner Count & Close 1/1, customer-account/secure Wholesale 3/3, and selling surfaces 5/5. The earlier account run exposed a real unresolved-promise `.auth` crash after the SDK lazy-load change; the hook now awaits the client, owns cancellation/subscription cleanup, and the two previously failing customer journeys pass. The final harness gives the account fixture its own synthetic publishable key and intercepts every request to its fabricated provider origin; that exact contained harness is included in the current 550/550 aggregate. These remain hermetic local fixture/browser results, not provider/live truth or WCAG conformance. |
| `npm.cmd run test:base` | PASS 484/484 | Owner Count & Close is excluded from the combined base runner and remains owned by its dedicated Admin configuration. CI cannot reuse an unrelated process on the base port, eliminating the prior Storefront/Admin cross-runner false failure. |
| Prior 390×844 rendered-route findings | Locally remediated and superseded by focused suites | The route, landmark, missing-resource, false-state, keyboard, reduced-motion, accessible-name, unique-ID, and 200% reflow findings are now covered by the green Storefront 30/30 and Admin 26/26 focused suites. This remains sampled local Chromium evidence, not a real-device or WCAG claim. |
| CI workflow acceptance boundary | Locally proven; remote execution pending | `.github/workflows/ci.yml` runs the same current-tree `npm test` command that passed locally at 550/550 across the base, Storefront, Admin, Product Master, Owner Count & Close, customer-account/Wholesale, and selling stages. Fabricated provider origins and synthetic public keys are scoped inside the dedicated Admin and customer-account harnesses, every matching provider request is intercepted, and the workflow exports no provider URL or credential globally; Storefront fallback suites therefore keep their intended environment. Failure traces/results are retained, every runner rejects `.only` in CI, and Playwright server commands are cross-platform. No green remote run for an exact commit has yet been captured. |
| Owner Count & Close after cross-platform runner edit | PASS 1/1 standalone and 1/1 inside `npm test` | The exact phone journey reaches a sealed customer-free handoff under the Ubuntu-compatible `npx vite` server command. This closes the local portability rerun only; GitHub CI and preview/provider behavior remain separate evidence gates. |
| `npm.cmd run evidence:map017-anon` | **FAIL: 12/14** | Live read-only evidence: anonymous users can read all 14 `products_old` rows; `v_product_stock_from_batches` returns 401. Private user/order/message/conversation/credential/staff/batch rows stayed unreadable in this bounded probe. |
| `npm.cmd run evidence:map024-discovery` | **FAIL** | The exact public host fails immediately because `/` lacks the absolute canonical home tag. This does not supersede the already recorded robots/sitemap SPA fallbacks; it confirms the live artifact remains stale. |

**Severity standard:** P0 means unsafe to expose or activate; P1 blocks a core
journey or trustworthy release acceptance; P2 materially degrades recovery,
accessibility, performance, or maintainability; P3 is a non-blocking improvement.

| ID | Severity | Verified gap and impact | Owning action |
| --- | --- | --- | --- |
| G-001 | **P0** | The latest exhaustive live authorization audit remains `NON_CONFORMANT_CRITICAL` (47 critical, 7 high, 1 medium), and the fresh behavioral probe still exposes 14 archived `products_old` rows anonymously. Existing anonymous DML/blanket policies and public Storage mutation remain governed by the unapplied MAP-017 hardening migration. | MAP-017/OWNER-005. Complete the remaining recovery-access proof, apply the exact payload once, capture its receipt, rerun exhaustive schema truth and behavioral denial checks, and verify no customer catalog outage. |
| G-002 | **P0 activation gate** | Secure customer/Admin BFFs, product knowledge, channel vocabulary, security events, and other prepared migrations/routes are mostly local and disabled; the deployed consolidated BFF routes remain unproven/404 in the authoritative record. Activating browser switches first would create broken or bypassable flows. | MAP-019 through MAP-024. Apply migrations in dependency order, configure server-only secrets and server switches, prove deny/allow/error/replay behavior, then enable browser switches. |
| G-003 | **P1 — locally resolved** | The stale 70-route expectation has been removed. The contract compares the router to the authoritative prepared registry and derives POST/idempotency security assertions from route metadata; the latest complete local source/API aggregate is green at 442/442, and the latest rendered selling-surface evidence remains 5/5. This is local acceptance evidence, not deployment evidence. | No remaining local implementation action. Preserve the derived contract as the regression gate and rerun it after subsequent remediation batches. |
| G-004 | **P1 — locally prepared, deployment-gated** | Checkout now synchronizes `/confirmation`; the receipt reloads through a scoped HttpOnly guest grant and a safe status-only BFF response. Submit/reload/back/forward, expired-grant recovery, and unavailable-receipt journeys pass locally. Migration `20260831_guest_order_status_boundary.sql` and the route are prepared only, not applied or deployed. | MAP-019 + IDEA-20260831-03. After G-001/G-002, apply the exact migration, deploy the Storefront BFF, enable it server-first, and repeat the same journeys on the target-correct preview and exact host. |
| G-005 | **P1 — locally resolved** | Central cart commands now reject zero or unknown stock, cap repeated adds at the known available quantity, validate stale carts before submit, and add bundles atomically only when every line is available. Last-unit, repeated-click, stale-cart, and bundle contracts pass locally. | MAP-023. Preserve the central invariant and repeat it against the applied stock projection during preview acceptance. |
| G-006 | **P1 — client and host configuration locally resolved; preview/live status pending** | Unknown paths render an explicit recoverable client surface, and missing products leave bounded loading for an H1 product-unavailable surface with noindex metadata. A shared route registry now drives client parsing and the 12 exact non-root Storefront rewrites; generated product HTML retains filesystem priority while `/product/:sku` falls back to the client only for a missing/unpublished SKU. Both target configs reject a global SPA catch-all and both isolated builds emit verified script-free noindex `404.html` recovery documents. Direct-load/history browser acceptance and focused route/discovery contracts pass locally. Vercel preview/live HTTP status and recovery-body behavior are still unproven. | MAP-024 + IDEA-20260831-03. Prove the exact target preview serves every registered deep link through the intended artifact, generated product HTML wins for a published SKU, and an unrelated unknown path returns the target-specific recovery body with a real not-found status; then repeat history, crawler, and metadata acceptance. |
| G-007 | **P1 truth defect — locally resolved** | The false `Multi-channel stock sync` claim is removed and replaced with `Availability checked before payment`; the capability-copy contract passes locally. | MAP-023/MAP-026. Do not restore a sync claim until a real connector reconciles against canonical inventory end to end. |
| G-008 | **P1 — safe local degradation prepared; provider work pending** | Missing/failed authoritative stock now remains unknown and blocks purchase instead of becoming false zero. Product-knowledge absence degrades to unavailable UI. The production 401/404 noise cannot be closed locally because the required views/tables/routes remain unapplied. | MAP-017/MAP-027. After OWNER-005, apply and verify the exact stock/knowledge migrations and routes, then prove a cold exact-host load has zero unexpected 4xx responses. |
| G-009 | **P1 — locally resolved** | Unknown stock is preserved separately from numeric zero through catalog hydration, product cards/details, virtual store, cart quantity controls, and pre-submit validation. Customer UI says `Stock check pending`/`Availability changed` and refuses unsupported quantities. | MAP-023/MAP-027. Repeat against the applied projection in preview; never regress unknown evidence to `Sold out`. |
| G-010 | **P1 truth defect — locally resolved** | Both Pasabuy paths now store/render `Staff review required`; the unapproved 24-hour promise is absent from the focused contract. | MAP-023. Keep response-time claims out until an approved, measured service commitment exists. |
| G-011 | **P1 deployment** | The exact live discovery check fails at the missing canonical home tag; earlier exact-host evidence also shows SPA HTML at `robots.txt`/`sitemap.xml`. Local metadata/sitemap work plus explicit registered-path rewrites and target-specific static 404 recovery are prepared and build-verified, but none is the live artifact. | MAP-024 B1–B9. Prove a target-correct preview first, including unknown-path status/body and crawler assets, then deploy separately and capture content type/body/canonical/share/structured-data/search evidence on exact hosts. |
| G-012 | **P1 release evidence — local CI parity proven; remote proof pending** | The exact current-tree `npm test` command is green locally at 550/550 across all seven stages, including the post-portability Owner Count & Close runner and the final hermetic Admin/customer fixtures. The customer fixture uses a synthetic key plus catch-all fabricated-origin interception inside that same complete run. CI retains failure evidence, rejects accidental focused tests, avoids cross-runner port reuse, and uses Ubuntu-compatible server commands; the workflow exports no provider URL, and the harnesses do not name K2's real Supabase project. There is still no green remote CI run for an exact release commit, target-correct preview acceptance, authenticated live Admin/customer journey, rollback rehearsal, CSP collection, production RUM, or alert receipt. | MAP-022/MAP-024/MAP-025. Push/review the exact candidate commit through the normal owner release process and capture the remote `npm test` result and Playwright evidence artifact; then complete the provider/live gates without treating the local run as deployment proof. |
| G-013 | **P1 capability boundary** | Automatic payment/refund, courier booking/labels, Lazada/TikTok ingress, marketplace outbound publication/stock sync, and social-message ingestion do not exist. Shopee ingress captures an event but deliberately cannot create an order. | Existing Constraints plus MAP-020/MAP-026/MAP-028. Manual staff-confirmed order/payment/courier/channel work can be the launch model only when every UI names it as manual; do not block an honest request-based launch on optional paid automation. |
| G-014 | **P2 — locally resolved; approved production media pending** | A brand-safe local SVG fallback now exists, referenced media uses shared error recovery, dead development URLs were removed in favor of generated product art, and the build verifier fails on missing local asset references. The focused asset contract, both target builds, artifact boundaries, budgets, and bundle-secret scans pass locally. | MAP-018/MAP-027. Production publication still requires owner-approved real primary media and preview/exact-host image acceptance; do not relabel generated/fallback art as product photography. |
| G-015 | **P2 accessibility — local automated scope resolved; manual release acceptance pending** | Confirmation has an H1, the virtual store owns a semantic `<main>`, Admin owns one accessible H1 and a main workspace landmark, and all 54 Admin 10–11px operational text classes were raised to the 12px product-register floor. Static and browser landmark/type/name/reflow contracts pass locally. | MAP-021/MAP-023/MAP-027. Finish the G-018 manual contrast, screen-reader, real-device, and preview acceptance before release. |
| G-016 | **P2 recovery/interaction — locally resolved** | Inventory and Smart Paste errors now remain in their active form, and courier handover uses the shared focus-managed dialog with required inline audit-reference validation and truthful `record, not book` copy. The complete Admin dialog/landmark suite passes 6/6 locally; the BFF remains authoritative. | MAP-019/MAP-021/MAP-023. Repeat the fulfillment action with an authorized staff account on preview after G-001/G-002; retain the inline retry state on any provider failure. |
| G-017 | **P2 — local bundle budgets resolved; real-user evidence pending** | Storefront now passes its enforced landing budgets at 149.43/150.00 kB JS gzip and 26.73/30.00 kB CSS gzip. Admin is 186.19/300.00 kB minified; the workflow graph is split into its own 104.97 kB chunk with no split warning. Cart, Interactive Shop CSS/JS, Supabase, and Three.js load through explicit lazy boundaries, and optional Google brand fonts no longer block bootstrap. | MAP-021/MAP-025. Preserve the hard build budgets. Validate the exact preview/live hosts on a real mid-range mobile/network and capture LCP/INP/CLS plus route-failure evidence; bundle size alone is not production performance proof. |
| G-018 | **P2 — automated local baseline added; manual/live gate remains** | Storefront and authenticated Admin browser acceptance now checks semantic main/H1 structure, missing image alternatives, duplicate IDs, unnamed interactive accessibility nodes, keyboard focus, reduced motion, and horizontal reflow at 200% root text. Current Storefront 30/30 and Admin 26/26 suites are green. This is regression support, not a complete contrast audit or WCAG claim. | MAP-021/MAP-025. Owner/QA must still complete a contrast audit, real screen-reader journeys, real-device/browser matrix, all critical preview surfaces at 200%/400% zoom where applicable, and production RUM/Web Vitals. |
| G-019 | **P3 — locally resolved** | `NewArrivals` now routes through the shared history/view-transition API and moves focus to the Catalog H1 without a full reload. The discovery route contract passes locally. | MAP-024. Preserve the shared navigation/focus path and repeat it in target-preview history acceptance. |

**Broken-link/resource conclusion — refreshed 1 September 2026:** explicit
unknown-route and missing-product recovery now pass direct-load browser
acceptance, New Arrivals uses the shared history/focus path, a shipped fallback
asset covers runtime image failures, and the production boundary verifier fails
on missing named local references. A shared exact-route registry now prevents
client/host path drift; neither target has a global SPA catch-all, and both builds
emit boundary-verified, script-free noindex recovery documents. The current
Storefront 30/30 suite reports no internal navigation regression. This remains
local evidence: exact-host HTTP status/recovery body, crawler content types,
reviewed production product media, and a deployed catalog/link crawl remain
G-006/G-011/G-014 gates.

**UI/UX audit score after local remediation (0–4 each; 16/20):**

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Accessibility | 3 | Landmark/H1, named-control AX-tree, keyboard focus, reduced-motion, unique-ID/image-alt, and 200% reflow checks pass locally; contrast, real screen-reader/device, and preview/live proof remain. |
| Performance | 3 | Enforced Storefront/Admin route budgets and the intended lazy boundaries pass; real-host RUM/Web Vitals still do not exist. |
| Theming | 3 | Light/dark and reduced-motion Storefront journeys pass, including the virtual store; exact deployed/assistive-tech evidence remains. |
| Responsive behavior | 3 | Storefront 30/30 and Admin 26/26 cover phone/desktop/landscape/125% paths with no sampled 390px overflow and an automated 200% text-reflow baseline; real devices and complete manual zoom acceptance remain. |
| Anti-pattern avoidance | 4 | Silent Home fallback, permanent missing-product loading, legacy browser dialogs, sub-floor Admin text, false sync copy, blocking brand fonts, and missing recovery states are resolved locally with contracts. |

**Positive findings worth preserving:** separate Storefront/Admin entrypoints and
artifact scans; no `dangerouslySetInnerHTML`/`eval` finding in the reviewed
source; no wildcard CORS or route-control inventory gap; fixed-schema and
idempotency-oriented BFF contracts; publication/photo gating; accessible names
on sampled product controls; 44px-focused mobile coverage; reduced-motion and
WebGL fallback behavior; honest account/payment/manual-channel blockers in most
tested surfaces; and a genuinely shared canonical cart/inventory direction.

**Before / target after / why (design gate):**

| Before | Target after | Why |
| --- | --- | --- |
| Unknown URL displays Home | Branded not-found page with Catalog, Contact, and Back recovery | Prevents false success and makes broken links diagnosable. |
| Missing SKU spins forever | Bounded loading followed by `Product unavailable` with alternatives/contact | Distinguishes loading from absence and supports keyboard/screen-reader users. |
| Order receipt exists only in memory at `/checkout` | Scoped, reload-safe confirmation/status route with expired/unavailable recovery | Preserves the customer's proof without exposing customer/order secrets. |
| Unknown stock becomes `Sold out` | `Stock being checked` plus staff-confirmed request behavior | Zero and unknown are different operational facts. |
| Bundle can add unavailable units | One atomic availability result for both products before cart mutation | Prevents impossible promises and split bundle state. |
| Admin uses browser alert/prompt | Shared labelled dialog/inline form with reason, error, retry, cancel, and focus return | Makes state-changing staff work reviewable and recoverable. |
| Missing images yield broken requests | Approved local fallback plus build/runtime image-error handling | Protects trust while retaining the publication requirement for real media. |
| Public strip claims stock sync | Copy describes staff confirmation/manual channel truth until sync is proven | Aligns customer language with the actual operating model. |

**Recovery for this remediation:** no runtime provider, database, Storage, DNS,
Vercel, Auth, payment, courier, marketplace, or social state was changed. The
guest order-status SQL and BFF remain prepared/unapplied and disabled. Local
recovery is file-level reversal of the MAP-028 remediation hunks only—never a
blanket reset of this dirty owner worktree—followed by both isolated builds,
the complete contract command, the five selling journeys, and the affected UI suites. If a
future preview activation fails, disable the browser switch first, then the
matching server switch; preserve requests, grants, audit rows, and evidence for
reconciliation. Provider recovery remains the owning MAP/runbook path below.

---

#### Required order of work

1. **Local P1/P2 remediation (green 1 September 2026)** — preserve the derived
   81-Admin/14-Storefront route contracts, reload-safe receipt, explicit
   route/product recovery, unknown/zero/bundle stock invariant, truthful copy,
   media fallback, dialog/landmark/accessibility checks, lazy boundaries, and
   enforced bundle budgets. Do not deploy while any aggregate gate is red.
2. **OWNER-005/C3 (start immediately in parallel with local work)** — complete
   the remaining owner recovery-access proof for the already verified production
   database/Storage backups and isolated restores. Apply the exact MAP-017
   boundary payload once, preserve its receipt, and prove the P0 anonymous
   exposure is gone without breaking catalog reads.
3. **A1** — prove both exact project previews consume `vercel.ts` and only their
   target config. Nothing may be promoted from a mismatched or unidentified
   project/artifact pair.
4. **B9/G-006/G-011** — capture the known failing live baseline, then prove a
   target-correct preview with explicit route/not-found behavior, canonical and
   share metadata, `/og-card.png`, no Admin-path disclosure, real crawler content
   types, and the correct empty-catalog sitemap.
5. **Dependency-ordered migrations and C4** — apply/verify product knowledge,
   identity/messaging, BFF, security-event, channel, and operational migrations
   only after MAP-017. Configure server variables by name, prove function
   inventories and denial paths, enable server switches before browser switches,
   and run authenticated customer/staff preview journeys.
6. **B8/MAP-018** — prove the complete manual and paid-API intake workflows
   against representative fixtures, then review the exact dependency/cascade
   manifest and delete only owner-approved production mock rows after the
   recovery gate. Re-read production and retain the owner-accepted empty public
   catalog until verified real inventory is deliberately published.
7. **G-014 through G-018 preview/manual remainder** — local fallback media,
   landmark/H1, Admin dialog/type, automated accessibility, and measured bundle
   gaps are green. At the exact preview, verify every loading, empty, not-found,
   error, permission, offline, stale, conflict, and retry state; complete
   contrast/screen-reader/real-device acceptance, approved real media, and
   real-network performance/RUM evidence.
8. **Deploy the exact green commit separately** to Storefront and Admin; capture
   the remote CI run, artifact markers, bundle-boundary checks, deep links,
   crawler assets, metadata/share fetches, PWA icons, headers, BFF responses, and
   no cross-artifact leakage on both exact hosts.
9. **C1/C2/B6/G-012** — wire CSP reporting and observability, collect real
   violations and route failures, decide CSP enforcement, reconcile HSTS
   ownership/includeSubDomains, and register search verification/analytics only
   with owner approval. Capture real mobile Web Vitals.
10. **F6** — record known-good deployment IDs, execute the rollback rehearsal,
    and repeat exact-host Storefront/Admin acceptance after rollback.
11. **D1/D5 and adapters** — apply the rehearsed vocabulary/shop migration in
    dependency order and define the authoritative stock/oversell rule before any
    second sales channel or external connector writes production rows. Keep
    payment, courier, marketplace, and social capabilities explicitly manual or
    unavailable until each real adapter is reconciled end to end.

#### Externally gated remainder: owner action, recovery, and acceptance

| Gate | Exact authorized action | Recovery path | Acceptance evidence |
| --- | --- | --- | --- |
| G-001 / MAP-017 / OWNER-005 | Owner proves access to both encrypted database/Storage recovery artifacts, authorizes the payload-bound apply once, captures the permanent receipt, then reruns the exhaustive read/DML/RPC/view/Storage audit. | Stop on any ambiguous receipt; do not retry blindly. Restore only through the verified isolated restore procedure and MAP-017 rollback artifacts; preserve the failed receipt and audit evidence. | `npm run evidence:map017-anon`, `npm run audit:schema-truth`, `npm run verify:map017-production-restore`, Storage restore evidence, and an exact-host catalog no-outage read all pass. |
| G-002/G-004/G-008 dependency migrations and BFF activation | After G-001, apply the recorded migrations in runbook order, configure only the named server variables, prove server-disabled/deny/allow/replay/error behavior, enable server switches on preview, then enable matching browser switches last. Include `20260831_guest_order_status_boundary.sql` and the 14-route Storefront registry. | Disable the browser switch, then the matching server switch. Roll back only the explicitly documented grants/config change; never delete request, grant, nonce, rate, conversation, security-event, or audit evidence. | `npm run prebuild`, `npm run test:contracts`, BFF verifiers, cross-guest/cross-customer denial, submit→reload/back/forward/expired-grant journeys, and target-correct preview function inventory pass. |
| G-006/G-011/G-019 / MAP-024 host and discovery | Deploy target-correct previews from the exact green commit, verify identity markers, route fallbacks/status, canonical/share/structured data, raster assets, robots and sitemap content types, then promote Storefront and Admin separately. | Promote each project's recorded known-good deployment independently. For a route-only defect, remove/disable the failing route without enabling a BFF. Preserve later DNS mail/TXT records. | `npm run evidence:map024-discovery`, direct `curl`/browser probes for every registered route and crawler asset, product/unknown-route HTTP behavior, back/forward focus, and no cross-artifact markers all pass on exact hosts. |
| G-012/G-017/G-018 / MAP-021/MAP-022/MAP-025 release evidence | Owner/QA runs remote CI for the exact commit, authenticated Staff and customer preview journeys, real-device/browser + screen-reader/contrast/zoom matrix, CSP report collection, alert receipt, mobile Web Vitals/RUM, and one preview rollback rehearsal. | Promote the known-good deployment and disable only the affected report/feature switch; retain telemetry and test evidence. Reset test accounts/preferences without deleting operational/audit records. | Green remote CI; target build markers; zero unexpected CSP/route failures; documented screen-reader/device/contrast results; accepted LCP/INP/CLS; alert receipt; and post-rollback Storefront/Admin acceptance. |
| G-013 / future channel adapters | Owner supplies approved provider account/scopes, fees, rate limits, webhook/signature rules, sandbox inventory/order reconciliation, and an oversell policy before any adapter is enabled. Until then the UI remains explicit manual/unavailable. | Disable the connector and return to documented Seller Center/manual courier/payment work. Reconcile captured events before retry; never invent a success, order, payment, booking, or stock sync. | Provider sandbox deny/allow/replay tests, canonical inventory/order reconciliation, fee/payout truth, idempotent retry, alerting, and exact-host staff acceptance pass end to end. |
| G-014 approved media | Owner approves rights/accuracy for real primary media and staff publishes it through the protected media workflow. | Unpublish/revert the affected media reference through the protected workflow; the local neutral fallback remains available. | Preview/exact-host image load and fallback tests pass; the byte/type/dimension/metadata receipt and rights record exist; no generated/fallback art is described as real product photography. |

#### Persistent goal prompt

Use this exact continuation prompt when resuming the audit in a new AI task:

> Continue MAP-028 in the recorded Required order of work until every safely
> executable Storefront and Admin BOS remediation is implemented and verified.
> Read the repository authority files and applicable skills first. Use
> failing-first tests, preserve the dirty owner worktree, the separate
> Storefront/Admin production artifacts, and canonical inventory/order/customer
> truth. Treat local, prepared, provider-applied, deployed, and live as distinct
> states. Do not mutate production database, Storage, DNS, Vercel, Auth,
> payment, courier, marketplace, or social systems without the exact owning MAP
> dependency, owner authority, recovery evidence, and preflight gate. Keep
> `MASTER_ACTION_PLAN.md` as the only active backlog, update all affected
> authoritative records, remove no MAP scope before durable evidence exists,
> and leave every external block with an exact owner action, recovery path, and
> acceptance command.

**Verification for this item:** the local factual claims are re-checkable with
`npm run prebuild`, `npm audit --audit-level=low`, `npm run security:history`,
both target builds, `npm run test:contracts`, the named UI suites, the generated
route/local-asset crawl, inspection of the root Vercel authority and both target
contracts, and the D1 migration rehearsal. Live claims require
`npm run evidence:map017-anon`, the exact-host discovery command, plus explicit
home/robots/sitemap/header/function probes. Final acceptance additionally requires owner-authenticated provider
inventory, the owner-approved mock-row deletion/readback or an explicit retained-
unpublished exception, authenticated real-host customer/staff journeys, a green
remote CI run for the release commit, and a
rollback rehearsal. The admin additions remain covered by workflow-graph and
guide contracts.

**Record in:** deployment runbook (A1, A2, C4, F6), SEO/discovery records
(B1–B9 and G-006/G-011/G-019), security runbook (C1, C2 and G-001/G-002),
MAP-019 (G-004), MAP-021 (G-003/G-015 through G-018), MAP-023
(G-005/G-007/G-009/G-010), MAP-027 (G-008/G-014/G-015), System Brain after
permanent/live behavior changes, and MAP-026 (D2/G-007/G-013 cross-reference).
Delete MAP-028 only after each finding is fixed and evidenced, or re-recorded as
an accepted limitation with the owner decision that accepted it.

## Constraints outside the active queue

These are acknowledged limitations, not current tasks. They enter the plan only
after their dependency becomes available and a fresh audit accepts the work:

- online payment gateway and automatic refunds;
- paid Vercel or Supabase capabilities;
- real Shopee, TikTok Shop, Lazada, Meta, WhatsApp, or other adapters requiring
  approved credentials/scopes;
- Google OAuth credentials;
- paid messaging, monitoring, analytics, email, or SMS services.
