# Prompt: K2 Jimzon Full Local Engineering One-Shot — MAP-016 through MAP-025

Work directly in `C:\Users\jerze\K2 JImzon`.

This is the owner-selected one-shot Antigravity implementation run. Execute the
maximum safe, coherent, dependency-aware **local/prepared** work remaining in
MAP-016 through MAP-025. Use the combined Antigravity `ship-saas-mvp` and
`security-audit-web-app` workflows. Codex will independently inspect, correct,
and verify everything later.

This prompt is an execution envelope, not a second backlog. `MASTER_ACTION_PLAN.md`
alone controls scope, order, dependencies, owner gates, and completion.

## 1. Absolute operating boundary

You may inspect, implement, refactor, test, build, document, and rehearse only in
the repository and an explicitly isolated local/non-production runtime.

You must not:

- push, merge, release, or deploy;
- apply a production migration or mutate production data;
- rotate/revoke keys or change Supabase, Vercel, GitHub, registrar, DNS, Auth,
  OAuth, Storage, Realtime, firewall, billing, or provider configuration;
- purchase/configure domains or change callbacks on a real host;
- delete data, clean/reset the worktree, discard unrelated changes, or delete a
  MAP item;
- invent OWNER-001 through OWNER-004 decisions;
- connect or claim real payment, marketplace, courier, Google OAuth, WhatsApp,
  Viber, email, SMS, or other unavailable external delivery;
- describe a mock, fixture, static string check, local build, rollback-only test,
  prepared migration, or provider setting as live or complete.

If a production/provider/owner gate blocks one result, record the exact blocker
and continue every independent local/prepared task in later phases. Never bypass
the gate, but do not stop the entire batch merely because activation is blocked.

## 2. Mandatory reading and baseline

Read completely, in this order, before editing:

1. `AGENTS.md`
2. `K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md`
3. `K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md`
4. `MASTER_ACTION_PLAN.md`
5. `K2 Jimzon - Brain/FUTURE_IDEAS.md`
6. `K2 Jimzon - Brain/OWNER_QUESTIONS.md`
7. `PRODUCT.md` and `DESIGN.md`
8. `ANTIGRAVITY_GEMINI_MASTER_INSTRUCTION.md`
9. `ANTIGRAVITY_HANDOFF/README.md`
10. `ANTIGRAVITY_HANDOFF/CURRENT_TASK.md`
11. `ANTIGRAVITY_HANDOFF/CODEX_REVIEW.md`
12. `ANTIGRAVITY_HANDOFF/LATEST_REPORT.md`
13. All checkpoints and every migration, handler, service, component, test,
    runbook, contract, and validation record named by MAP-016 through MAP-025.

Before editing, record `git status --short`, branch/HEAD, staged/unstaged/
untracked files, relevant diffs, callers, routes, schemas, RPCs, policies,
grants, Storage, Realtime, build targets, package scripts, tests, and runbooks.
Record exact baseline commands, exits, assertions, and known blockers.

Existing changes belong to the owner/Codex/earlier Antigravity runs. Preserve
them. Never reset, clean, checkout, overwrite, bulk-format, or silently absorb
unrelated work. Do not trust prior claims without rerunning them.

Recent production truth to preserve rather than reimplement: Admin MFA status
and the hardened v2 Delete PIN boundary were deployed by Codex; the legacy PIN
verification and delete RPCs were removed. Verify repository compatibility but
do not mutate the live database or provider.

## 3. Mandatory fail-closed correction gate

Preserve every correction in `CODEX_REVIEW.md`, including:

- missing explicit schema input fails; never substitute a clean fixture;
- findings fail by default;
- fabricated fixtures prove parser behavior only;
- production apply remains unavailable/nonzero;
- unsafe rollback/recovery remains refused;
- target validation uses exact parsed identities, not substring matching;
- missing runtime/database/executor returns nonzero;
- zero executed authorization tests cannot pass;
- hard-coded SQL is not captured-baseline recovery;
- static SQL/string checks are not database behavior evidence;
- encryption-envelope tests are not backup/restore evidence.

Do not add another placeholder, empty runner, report-only phase, fake
`READY_TO_EXECUTE`, or success path that performs zero behavior. Implement and
execute the requirement, or retain an explicit nonzero blocker. Never weaken or
delete tests to make output green.

## 4. Per-phase execution contract

Execute phases sequentially. For every phase:

1. Reconfirm the gap in current code/schema/configuration.
2. Trace all callers and operational records before editing.
3. Define invariants, authorization, validation, idempotency, concurrency,
   timeout, retry, audit, recovery, and rollback behavior.
4. Implement schema/server truth before browser presentation.
5. Exercise actual valid, invalid, duplicate, concurrent, stale, role,
   ownership/IDOR, direct-bypass, partial-failure, timeout, retry, and recovery
   behavior wherever an isolated runtime exists.
6. For UI work, use all four AGENTS-required design skills and test complete
   states, mobile, desktop, keyboard, focus, text zoom, reduced motion, and K2's
   existing identity. If a required skill is unavailable, do not edit visible UI.
7. Review the phase diff line by line and rerun affected baselines.
8. Update the corresponding checkpoint with exact new evidence and blockers.

Each phase must produce actual code/tests/documentation that closes a verified
gap, or a precise no-edit finding proving why no safe local implementation is
possible. Repeating old files or old passing tests is not phase delivery.

Do not ask routine questions already answered by authoritative files. Owner
questions remain in `OWNER_QUESTIONS.md`; dependent behavior stays configurable,
manual, disabled, or blocked.

## 5. Phase 0 — MAP-016 remaining local preparation

Do not perform provider changes. Complete only safe local preparation:

- inventory every elevated-key consumer and prove browser code/builds contain no
  elevated key, refresh token, marketplace secret, or private evidence;
- prepare consumer-by-consumer migration, rollback, legacy signing-key
  revocation, and old-token rejection procedures;
- prepare the real Admin-AAL2 staff-invitation acceptance script/checklist with
  positive, denial, replay, conflict, rate-limit, and recovery evidence fields;
- strengthen provider log-review, correlation, redaction, containment, and
  incident records without copying secrets or customer data;
- reconcile local tests/runbooks with the deployed MFA/Delete PIN work.

Leave provider execution explicitly blocked for Codex/owner control.

## 6. Phase A — MAP-017 executable schema and authorization truth

This is the highest engineering priority. Finish the real behavior the previous
run falsely described as complete:

- implement a metadata-only PostgreSQL exporter that actually connects to an
  explicitly local target and exports all schemas, tables/partitions, columns,
  constraints, indexes, sequences, views/materialized views and definitions,
  triggers, owners, function overloads/definitions, definer/search paths,
  grants, RLS enabled/forced state, policy semantics, exposed schemas, Storage
  buckets/object policies, Realtime publications, and migration ledger;
- export no business rows, credentials, emails, tokens, secrets, or private
  payloads; redact diagnostics and never print connection strings;
- reject incomplete/truncated/ambiguous exports and compare every exported class
  against ordered repository expectations;
- detect migration drift, owner/search-path hazards, unexpected grants, blanket
  writes, unsafe views/RPCs/Storage/Realtime, and missing least privilege;
- use an explicitly isolated local Supabase/Postgres runtime when available and
  implement preflight → migration → postflight → behavior assertions → inverse
  recovery → restored-state verification;
- run database-executed allowance/denial tests for anon, scoped guest, Customer,
  Staff/capabilities, Admin, cross-user, cross-role, cross-hub, guessed IDs,
  direct tables/views/RPC overloads, Storage, Realtime, AAL1/AAL2, final-Admin
  protection, unchanged denied data, and minimal allowed responses;
- generate recovery only from a sufficiently complete captured local baseline.
  Never emit `CASCADE`, `TRUNCATE`, broad public DML, blanket write policies, or
  unrelated destructive SQL.

If no isolated runtime can start, improve independent parser/comparison behavior
and tests, but keep database-executed gates nonzero and MAP-017 Queued.

## 7. Phase B — MAP-018 phone-first product intake and publication

- complete resumable, actor-owned intake from duplicate/variant search through
  private evidence, reviewed AI JSON, server-assigned SKU, atomic Draft, first
  inventory source, and separate publication review;
- keep product, variant, evidence, lot, receiving source, expiry, price approval,
  stock, and publication as separate truths;
- enforce duplicate/ambiguous variants, idempotency, provenance, accepted and
  rejected fields, unknown preservation, timeout/retry, safe errors, and rollback;
- validate actual upload bytes/signatures, MIME, extension, byte/dimension/pixel
  limits, decode success, metadata stripping, hashes, private ownership, and a
  single-image rule; refuse SVG/HTML/scripts/polyglots;
- finish first-inventory paths for flight/box manifest, supplier receipt, and
  Admin-only reasoned opening balance;
- verify camera, hardware scanner, file, and manual fallbacks; app switching;
  no-stock Draft; conflicting edits; and publication denial until all gates pass.

## 8. Phase C — MAP-019 identity, sessions, continuity, wholesale, messaging

- complete canonical guest/account/contact/customer/wholesale/channel identity
  preparation without merging ownership from matching email/phone text;
- make guest order, Pasabuy, status, and conversation continuation reload-safe
  through scoped, expiring, revocable grants absent from URLs, logs, browser
  storage, screenshots, and reports;
- deny guessed IDs, cross-customer claim/link, and overbroad history access;
- complete the Admin BFF/session boundary locally: HttpOnly/Secure/SameSite
  cookies, CSRF, exact Origin, AAL2, OAuth state/callback, expiry, revocation,
  password/reset/invite paths, durable rate limits, and minimal responses;
- finish Contact Us and canonical Website/Pasabuy conversations, internal-note
  separation, delivery truth, and server-backed expiring staff presence;
- prepare wholesale identity, inquiry, approval, price/terms/limit/revocation
  boundaries without inventing OWNER-002/003 values.

## 9. Phase D — MAP-020 API, abuse, upload, bot, and connector security

- inventory every Data API operation, RPC, Edge Function, Auth endpoint, Storage
  operation, Realtime subscription, BFF route, public form, upload, scheduled
  task, connector, and future cost-bearing endpoint;
- apply fixed schemas, unknown-field rejection, normalized bounded inputs,
  content/cardinality limits, idempotency, replay control, actor/IP/global rate
  limits, bot challenges, exact CORS/Origin, CSRF, least privilege, safe errors,
  and correlation IDs;
- harden upload storage and webhook scaffolding with byte verification,
  ownership, non-executable delivery, and signature/timestamp/replay checks,
  while unavailable connectors remain disabled;
- test malformed/oversized/polyglot payloads, injection, guessed IDs, role/hub
  bypass, duplicate/concurrent requests, forgery/replay, timeout ambiguity,
  recovery, and absence of internal/secret/PII leakage.

Exercise actual handlers wherever possible; source strings do not prove behavior.

## 10. Phase E — MAP-021 browser, errors, dependencies, build integrity

- replace raw internal errors with stable safe codes, recovery guidance, and
  server-side redacted correlation evidence;
- implement/test CSP and security headers; keep HSTS disabled until all real
  production hosts are verified HTTPS;
- audit dependencies, remove only proven-unused packages, and make compatible
  fixes only—no blind major upgrades;
- prove storefront/Admin isolation across entries, routes, contexts, sessions,
  modules, environment variables, source maps, assets, caches, compiled bundles,
  localhost/debug markers, and secrets;
- make measured performance/code-splitting changes only when evidence proves a
  real issue and regressions protect navigation and K2 visual behavior.

## 11. Phase F — MAP-022 logging, alerts, incidents, backup/restore

- implement redacted security events and alerts for Auth, MFA, reset, revocation,
  authorization/RLS denial, abuse/bots, uploads, destructive/credential changes,
  connector failure, repeated errors, backup, and restore;
- complete incident procedures and provider ownership/2FA evidence checklists;
- replace envelope-only claims with executable fail-closed procedures for a
  consistent PostgreSQL export and required Storage manifest/export, immediate
  authenticated encryption, hashes, plaintext cleanup, owner-controlled
  destination, retention, and key custody;
- restore only to an explicitly confirmed isolated/non-production target and
  verify target, restoration, integrity/reconciliation, RPO/RTO, and cleanup;
- test command construction, redaction, tamper/wrong-key rejection, target
  guards, partial-failure cleanup, and retention.

Claim a rehearsal only if an actual export and isolated restore ran.

## 12. Phase G — MAP-023 local canonical operations and rehearsal

Implement safe local operational gaps not controlled by providers/owner policy:

- Suppliers, Purchase Orders, supplier receipts, estimated/actual costs,
  evidence, partial receipts, discrepancies, and reconciliation;
- flight/box manifests, scan counts, over/short/damaged/missing states, batches,
  expiry/non-expiry, quarantine, and immutable receiving evidence;
- FEFO, shelf-life eligibility, reservations, availability, channel allocations,
  stock corrections, write-off/return disposition, and no direct quantity edits;
- canonical custodian identities, lot-level custody, sender/receiver acceptance,
  box-wide equivalence, legacy allocation reconciliation, and immutable events;
- one inventory/customer/order/message truth for Website, Pasabuy, and future
  adapters; unavailable external sync/delivery remains disabled;
- order creation, reservation, payment-evidence review, packing scans,
  fulfillment, cancellation, return/refund/exchange, failed delivery, recovery;
- Pasabuy request/quote/purchase/flight/receipt/delivery and wholesale
  organization/buyer/inquiry/approval/manual-terms workflows;
- unified inbox ownership, internal notes, Website conversations, Contact Us,
  coupons, catalog failure/empty states, latest ordering, zero-stock denial;
- deterministic representative non-production fixtures and an executable
  rehearsal covering success, invalid, duplicate, concurrent, partial, failure,
  retry, rollback, and recovery.

Do not activate OWNER-002/003/004 policy or fabricate connector/payment evidence.

## 13. Phase H — MAP-024 production-readiness preparation only

- prepare the storefront/Admin project and environment-variable matrix;
- validate configuration code for canonical storefront host, dedicated Admin
  host, redirects, cookies, Auth/reset/OAuth callbacks, exact CORS/Origin,
  noindex/Admin cache, sitemap/robots/canonical/social metadata, CSP/security
  headers, HTTPS checks, and rollback;
- build domain/DNS input validation and real-host smoke scripts that consume the
  exact Vercel records and owner-approved domains at cutover;
- keep provider values explicit placeholders and fail closed when absent. Do not
  guess DNS, configure domains, or enable HSTS.

OWNER-001 and provider activation remain blocked for Codex/owner control.

## 14. Phase I — MAP-025 launch-proof harness preparation only

- build one executable release-verification harness composing security, schema,
  ownership, session, abuse, upload, build, backup, operations, domain,
  mobile/desktop, accessibility, and rollback checks without hiding failures;
- prepare staff/customer acceptance scripts for real devices, keyboard,
  mobile/desktop, failure/recovery, and representative operations;
- generate a requirement-to-command-to-evidence matrix with owner, provider,
  real-host, and manual-acceptance gates;
- fail closed while MAP-016 through MAP-024 or owner/provider evidence remains
  incomplete. Never print launch-ready based on local checks.

## 15. Required verification

Run applicable checks separately so failures stay visible. At minimum:

- schema-tool regressions and `npm run verify:map017`;
- real isolated database behavior/recovery if a runtime exists;
- API/command contracts, Admin BFF, guest BFF, product intake,
  consignment/database, inbox, storefront smoke, and Admin browser suites;
- representative MAP-023 operational rehearsal;
- upload, abuse, IDOR/RBAC/RLS, session/CSRF, safe-error, header/CSP, dependency,
  and backup/restore tests;
- import/static integrity, dependency audit, repository/history secret scans;
- separate storefront/Admin production-mode builds, compiled boundaries, bundle
  secret/source-map/localhost/debug checks;
- mobile/desktop/keyboard/accessibility/reduced-motion checks where changed;
- `git diff --check`, final dirty inventory, and line-by-line changed-file review.

Record commands, exits, assertion counts, failures, retries, skips, and reasons.
Do not combine commands in a way that hides failures.

## 16. Checkpoints, documentation, and handback

- Update checkpoints `01` through `09`, preserving prior verified evidence and
  separating evidence produced in this run.
- Add only concise factual evidence inside existing MAP items. Do not create a
  roadmap, TODO, status dashboard, or second backlog.
- Update rulebook, System Brain, design, migrations, types, tests, and runbooks
  only to the evidence level actually proven.
- Do not delete MAP entries. Maximum status is `Ready for independent
  verification`; otherwise use `Partially implemented` or
  `Blocked — evidence required`.
- Replace `ANTIGRAVITY_HANDOFF/LATEST_REPORT.md` with the exact 14-heading report
  required by `ANTIGRAVITY_GEMINI_MASTER_INSTRUCTION.md`.
- Add a MAP-016-through-MAP-025 matrix: requirement, files, commands/tests,
  evidence, blocker, rollback/recovery, and exact Codex rerun command.
- Separate pre-existing changes from this run, list every file, and disclose all
  failures and unexecuted checks.

Use only these evidence levels:

- `Not checked`
- `Prepared locally`
- `Validated in rollback-only production transaction`
- `Applied permanently`
- `Configured in provider`
- `Deployed`
- `Verified on real production host`

Never promote evidence levels. End exactly:

`No claim above exceeds its evidence.`

Then stop for Codex review. Do not push, merge, deploy, mutate providers, apply
production SQL, change DNS/domains/keys, delete data, or delete a MAP item.
