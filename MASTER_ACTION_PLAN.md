# K2 Jimzon Master Action Plan

**Status:** authoritative queue for all approved, unfinished project work

**Last audited:** 25 August 2026

**Active MAP item count:** 10 unfinished top-level items (`MAP-017` through
`MAP-026`)

**Current next item:** MAP-017 schema/grants/RLS remediation. Read-only and local
rehearsal work may continue; permanent production activation requires the
authorization recorded as `OWNER-005`.

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
| 1 | MAP-017 | Establish live schema, grants, RLS, RBAC, ownership, and RPC truth | OWNER-005 for production activation |
| 2 | MAP-018 | Complete phone-first product intake and publication gates | MAP-017 for activation |
| 3 | MAP-019 | Complete hybrid identity, commerce continuity, wholesale identity, and secure sessions | MAP-017; may overlap MAP-018 where independent |
| 4 | MAP-020 | Secure every API, upload, public form, Admin command, and connector boundary | MAP-017 and MAP-019 decisions |
| 5 | MAP-021 | Harden browser errors, headers, dependencies, and separate production artifacts | MAP-019 and MAP-020 |
| 6 | MAP-022 | Complete security events, alerts, backup/restore, and incident controls | MAP-017 through MAP-021 |
| 7 | MAP-023 | Complete and rehearse canonical storefront and Admin operations | MAP-017 through MAP-022; OWNER-002/003 gate policy activation |
| 8 | MAP-024 | Configure separate production projects, domains, DNS, HTTPS, and Auth callbacks | MAP-023 and OWNER-001 |
| 9 | MAP-025 | Produce final security, staff, customer, and production launch proof | MAP-017 through MAP-024 |
| 10 | MAP-026 | Multi-shop channel accounts and custody-based inventory allocation | MAP-017, MAP-020, MAP-023 |

**Current execution command:** continue MAP-017 read-only audit and reversible
rehearsal work. Do not permanently apply its production migration until
`OWNER-005` is authorized.

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
Remediation is
blocked on `OWNER-005`, which authorizes the prepared public-write-boundary
migration. No DDL has been applied.

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
`8AF7C69ABFBE6694302AC8AFD30A177EBEEA8461BD7B0963CD3AE23570DFC5F1`, writes
the receipt atomically under ledger version `20260824143000`, never retries the
write, and resolves a lost/ambiguous provider response only through a separate
read-only receipt-plus-invariant check. It refuses execution unless OWNER-005 is
durably recorded as Authorized and the operator supplies the exact project,
artifact hash, named backup evidence, ledger version, current 55-finding count,
and roll-forward-recovery acknowledgement. OWNER-005 is still not Authorized,
so production remains unchanged.

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
the vulnerabilities remain live pending `OWNER-005`.

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
outstanding; only `OWNER-005` authorization and application remain.

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
published in `supabase_realtime`. Its retirement is raised as an owner decision
alongside `OWNER-005`.

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
- Choose, record, and implement one of the three options for the
  `v_product_stock_from_batches` HTTP 401 documented above. The view-level `anon`
  SELECT grant is proven insufficient on its own, so this is a decision that must
  be made before the migration is described as closing the storefront stock
  failure. Preferred: move the read behind the Storefront BFF with MAP-020.
- Bound anonymous `error_reports` insertion instead of leaving it open. Anonymous
  `INSERT` is currently ungated, unrated, and unverified, so the table can be
  flooded. Replace it with a rate-limited definer RPC or a Storefront BFF route
  carrying the same HMAC/Turnstile budget as other public writes, and prove the
  bound with a flood test that returns a denial rather than unbounded rows.
  (Was AUD-017; previously only narrative in this plan.)
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
suppressed, interval/listener cleanup is explicit, and a new snapshot replaces
the last known-good catalogue only when both the reviewed product read and the
authoritative batch-stock view succeed. Two focused contracts and the complete
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
inventory records 104 table operations. Chromium visual verification is
environment-blocked because Windows denied the test runner permission to spawn
the browser (`EPERM`) before any page opened. This tier is local/prepared only:
no production data, grant, migration, flag, preview, or host changed, and real
Admin MFA/role denial plus deployed edit/status/delete acceptance remain open
behind `OWNER-005` and the coordinated MAP-017/MAP-019 cutover.

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
- Remove the orphaned second product-detail view. `StorefrontApp.jsx` registers
  both `ProductDetail` (key `product`) and `MasterProduct` (key
  `master_product`), but no `setView` call site reaches `product`, so
  `ProductDetail.jsx` builds an unreachable 13.68 kB chunk. Consolidate on one
  canonical component and delete the other, so a bundle boundary test cannot
  pass while shipping a dead view. (Verified 25 August 2026; was AUD-004.)
- Defer the Three.js globe until it is needed. `GlobeSection` is lazy-loaded but
  `Home.jsx` renders it directly, so its 903.44 kB / 244.43 kB gzip chunk — the
  largest artifact in the storefront build — begins downloading on landing.
  Mount it behind an IntersectionObserver and confirm the landing request set no
  longer fetches it. Bandwidth cost on Philippine mobile connections is the
  operative concern. (Verified 25 August 2026; was AUD-005.)
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
- State the exception path in customer-facing copy. K2 runs no self-service
  cancellation or return; every change is handled directly with staff over
  messaging. Order confirmation and the guest conversation view must say so
  plainly, so the absence of a cancel control reads as a deliberate policy
  rather than a missing feature. Do not promise a response time the operations
  rulebook does not guarantee. (Was AUD-018.)
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
and recover their real daily workflows on phone and laptop; customers can submit,
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

**Status:** Queued; configuration audit may begin after MAP-021; activation
depends on MAP-023 and the exact domain/DNS answer in `OWNER_QUESTIONS.md`

**Prepared runbook evidence (15 August 2026):** `DEPLOYMENT_RUNBOOK.md` now uses
the actual browser-safe publishable-key variable, leaves both BFF flags disabled
until their full boundaries are accepted, distinguishes `VITE_` variables from
approved server-only secrets, and requires the exact DNS records supplied by
Vercel at cutover instead of hard-coded provider targets. This is documentation,
not domain ownership, DNS, HTTPS, Auth callback, real-host, or rollback proof.

**Local activation-environment gate (22 August 2026):** the redacted name-only
environment validator now has an explicit per-artifact activation mode. The
ordinary inactive inventory remains minimal, while Admin activation additionally
requires the server Supabase names, cookie key, signed-command secret, and exact
origin allowlist; Storefront activation additionally requires its server
Supabase names, guest signing secret, exact origin allowlist, and both Turnstile
names. A focused contract and five-fixture self-test pass. This does not inspect
values, install matching database secrets, add a Vercel rewrite, enable either
flag, or prove provider configuration; those remain cutover evidence.

**Deliver:** two genuinely separate Vercel projects and production artifacts;
per-project/per-environment variable matrix; storefront canonical host and apex
redirect; dedicated admin host; DNS preservation; TLS/HTTPS verification; HSTS
only after all hosts are correct; noindex/admin cache policy; CSP/security
headers; Supabase Auth/OAuth/reset allowlists; cookie domain/scope; CORS/Origin
allowlists; sitemap/robots/canonical/social metadata; rollback procedure; and
real-host smoke tests. The storefront ships no `public/robots.txt` and no
`sitemap.xml` today, so this is build work, not configuration.

Two prerequisites inside this item, both verified 25 August 2026:

- Storefront navigation is in-memory React state only. `go()`, `openProduct()`,
  and `setView()` never touch `history.pushState` and no `popstate` listener
  exists, so `/catalog` and `/product/:sku` are not addressable, a refresh on a
  product or checkout view resets to `home`, and links cannot be shared. URL
  synchronization must land before sitemap, canonical, or social metadata can
  reference anything real. (Was AUD-003; the audit action plan mis-scopes this
  as independent P2 work.)
- Product views inject no JSON-LD. `MasterProduct.jsx` renders name, brand, SRP,
  origin, net weight, and ingredients but emits no
  `<script type="application/ld+json">` for Schema.org `Product`/`Offer`.
  Availability must reflect real FEFO stock and never assert stock the catalogue
  cannot honour. (Was AUD-010.)
- Ship share and identity metadata in `index.html`. It currently carries only
  charset, viewport, color-scheme, theme-color, title, and description — no Open
  Graph, no Twitter Card, no canonical link, and no icon. K2's customers arrive
  through Messenger, Viber, and chat, so every link a customer or staff member
  shares today renders as a bare URL with no image, title card, or price. This is
  a direct commercial cost, not a checklist item, and it depends on the same URL
  work as AUD-003 because per-product share cards need per-product URLs.
  (Found by the 25 August independent audit; extends AUD-009/AUD-010.)

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
headers work; no cross-artifact code or secrets ship; and rollback is proven.

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
scope decision recorded 25 August 2026.

**The operating model, from the owner.** K2 runs several seller accounts per
marketplace — two Shopee shops, two TikTok shops, two Lazada shops to start, and
the design must not hardcode two. Every shop is owned and operated by K2; this is
channel utilisation, not a marketplace of third-party sellers. Each shop is run by
a staff member who **physically holds** that shop's stock. Staff move goods
between themselves as needed, so custody changes often. **Master Inventory is the
sum of everything, including all shop stock** — it is the Philippines-wide truth
and never shrinks when stock is allocated to a shop; only the holder changes.
Stock moves on a **staff-request, admin-approval** workflow.

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

**Complete when:** the schema represents an arbitrary number of shops per channel;
two shops on one channel hold distinct allocations of the same SKU without
external-identifier collision; Master Inventory equals the sum of all shop and
unallocated stock at all times and is proven by test against concurrent movement;
a staff transfer request cannot move stock without admin approval; a custodian
cannot read or move another shop's stock; and the Admin views show per-shop and
master positions from real data with honest unavailable states.

**Record in:** the operations rulebook (custody, allocation, and approval rules),
System Brain (live shop and custody state), migrations plus preflight/postflight
and rollback, the connector integration spec, Admin BOS documentation and staff
SOP, and the authorization test suite.

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

## Constraints outside the active queue

These are acknowledged limitations, not current tasks. They enter the plan only
after their dependency becomes available and a fresh audit accepts the work:

- online payment gateway and automatic refunds;
- paid Vercel or Supabase capabilities;
- real Shopee, TikTok Shop, Lazada, Meta, WhatsApp, or other adapters requiring
  approved credentials/scopes;
- Google OAuth credentials;
- paid messaging, monitoring, analytics, email, or SMS services.
