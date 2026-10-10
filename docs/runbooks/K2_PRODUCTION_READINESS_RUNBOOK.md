# K2 Production Readiness Runbook

10 October local Auth identity qualified (MAP-018 / IDEA-20261009-11): final06 genuine Auth v2.196.0/SDK2.117.2 runs confirmed synthetic creation, wrong-password refusal, login, HMAC-signed authenticated AAL1/AAL2 JWTs, server user lookup, real TOTP enroll/challenge/verify, global logout with server refresh_token_not_found refusal, and hard deletion. Native session41018 terminal0; PID24136 independently absent and both loopback ports stopped. Original88/two-sequence and complete schema/defaultACL hashes unchanged; global/managed authority twice. Local default role configuration corrected after retained03 jwt_role failure;01/02 failures and two prelaunch preparation refusals retained.04 valid MFA/conservation;05 refresh witness limited and superseded by06 nonempty-token/server-error proof. Final development86305 exit0 and independent review pass. No production Auth-version, BFF, PostgREST, staff registry/CSRF or hosted acceptance claim. Exact next: genuine local PostgREST plus BFF fresh-browser flow/reference reproduction, then remaining MAP gates. Commands, hashes, failure scope and recovery: docs/acceptance/LOCAL_AUTH_IDENTITY_20261010.json. Publishing approval remains pending. Rehearsal command: node .tools/prepare-auth-identity-probe.mjs uses unique immutable case paths; retained06 already exists and must not be rerun/overwritten. Recovery is stopped conserved RAM, no provider rollback. Select a new owned case for next transport scope; run provider identity/readiness gates before any separately authorized production step.

**10 October local migration continuation resolved:** Same automatic review path passed after usageAllowed readback; all4owned migration PIDs independently absent. Local04 connection-only auth routing qualifies embedded zero-migration/startup conservation, with no captured role/grant/default change. Historical01/02/03 failures remain. LOCAL_AUTH_MIGRATION_20261010.json records exact pins; no production authorization or real-host/JWT/MFA/BFF acceptance follows. Publishing remains separately approval-blocked.

**10 October local Auth migration refusal:** LOCAL_AUTH_MIGRATION_20261010.json records an unqualified-public-table CREATE refusal42501, preserved rows/schema/authority and stopped execution handles. Independent host PID absence remains unverified after account usage prevented approval review. No migration compatibility, provider authorization or new grant follows from offline version coverage. Resume exact MAP-018 session-resolution test only after review availability and stopped-guest checks.

**10 October local Auth probe:** LOCAL_AUTH_STARTUP_20261010.json records stopped networknone RAM Auth serve/health and captured-authority conservation. It is not a production readiness gate receipt, migration approval or provider/deployed identity evidence. Preserve immutable oci-auth-startup01; do not run the default Auth command against K2 on the strength of local health. MAP-018 owns migration/identity/host qualification.

**Scope:** the read-only gate every owner-authorized K2 production step must
pass first. **Current state (30 September 2026):** the gate exists and runs. It
authorizes nothing.

## Why this exists

The Master Action Plan holds several apply-ready packets written as prose
because the writing session had no Supabase or Vercel connector. Capability
changes between sessions, so prose packets silently rot. This runbook makes the
preconditions executable and repeatable so the step after the gate is the only
decision left, not the re-derivation of whether the step is allowed.

## Capability, stated as of 30 September 2026

| Surface | This harness | Notes |
| --- | --- | --- |
| Supabase management API, read | available | `SUPABASE_ACCESS_TOKEN` in the owner-controlled `.env.local` |
| Supabase management API, production SQL write | **technically available, not authorized** | The token can execute arbitrary SQL against K2. Capability is not permission. |
| GitHub | available | `gh` is authenticated to `EdgerzXc` with `repo` and `workflow` |
| Vercel | available in signed-in browser; not in this script | REST API token is invalid; Admin and Storefront dashboards can be inspected in the browser. |
| Cloudflare | available in signed-in browser; not in this script | K2 Turnstile widget can be inspected; the account has no managed K2 domain zone. |
| Supabase security advisor | available in signed-in browser; not in this script | K2 Security Advisor displayed 0 errors, 56 warnings and 7 suggestions on 29 September; findings need MAP-017/018 classification. |
| Local PostgreSQL 17.11 | available | `.tools/postgresql-17.11/runtime/pgsql/bin` for isolated restore and rehearsal |

The K2/ScoutIT distinction still holds: the installed token lists only
`pixplcjqivlfflickobf`. Never use a ScoutIT-only connector for K2 work.

## The gate

```bash
npm run preflight:k2-project
npm run readiness:k2-live
```

Both package commands load the owner-controlled `.env.local` directly. The
preflight confirms project identity without a query; the readiness script then
uses only bounded `SELECT` statements with `read_only: true`. A credential in
that file is capability, never write authorization.

The readiness script sends only `SELECT` statements with `read_only: true`
through the Supabase management API, refuses a non-`SELECT` string before the
request is built, and exits before any query if the K2 project identity check
fails. It writes a receipt to
`.tools/current-production-backups/live-readiness.json` and nothing else.
`tests/k2-live-readiness-contract.test.mjs` asserts those properties against
the script source and runs in `prebuild`.

### Gate states

- `PASS` — the precondition holds. Not evidence that the work is done.
- `OWNER` — requires a human decision or a fact only the owner has, such as a
  verified physical count.
- `CONNECTOR` — requires a surface this harness cannot reach. Reported, never
  assumed or simulated.
- `FAIL` — a precondition does not hold. Stop and resolve it.

A single `FAIL` means no production step may start.

### Gates and what they mean

| Gate | Meaning when `PASS` |
| --- | --- |
| `project-identity` | The URL is exactly K2 and the token can list `pixplcjqivlfflickobf`. A ScoutIT URL or token refuses before any query. |
| `migration-ledger` | Latest applied version, for comparing against a fresh backup. |
| `intake-chain-unapplied` | `product_intake_sessions` and `k2_sku_seq` are still absent, so the prepared MAP-018 migration is a first apply and not a re-apply. |
| `channel-chain-unapplied` | `channels` and `channel_shops` are absent, so the MAP-026 chain is still separable from the intake chain. |
| `anon-execute-surface` | Classifies live anon EXECUTE as expected and live, legacy transitional, or expected but unapplied; it does not treat a raw count as sufficient authorization evidence. |
| `stock-facts` | Routed to the owner. Reports product, live-product and lot counts. These are database projections and never prove physical stock. |
| `backup-freshness` | The newest local encrypted envelope is dated on or after the newest applied migration. |
| `backup-restore-proof` | An isolated restore receipt sits beside that envelope. Local presence only; it is not owner-held custody. |
| `vercel-preview`, `vercel-edge-gate`, `provider-advisor` | Always `CONNECTOR` in this script. The Admin route gate is a Vercel routing rule; browser observations must be recorded separately before a cutover. |
| `release-branch` | Whether the working branch is ahead of its upstream, so a "pushed" claim is checkable. |

### MAP-017 metadata baseline, 30 September 2026

The fresh read-only schema export audit reports **11 critical, 0 high**:
five live legacy anonymous RPC grants and six `supabase_admin` future-object
default-privilege groups. The five legacy functions are
`submit_order_request`, `submit_order_request_v2`, `submit_pasabuy_request`,
`submit_storefront_chat_v1`, and `validate_coupon`. Four expected guest
capabilities and two authenticated AAL2 receipt readers now have explicit
live-checked contracts. The readiness receipt separately classifies five
expected and five legacy anon-executable functions as live, with 13 expected
signed-guest grants prepared but unapplied. These checks narrow the inventory;
they do not close the five legacy grants, the six provider defaults, or
authorize a write. See
`docs/evidence/20260930-map017-contract-audit/README.md` for the receipt and
hashes.

## Ordered production step, once the owner authorizes

1. `npm run preflight:k2-project` — identity only, no query.
2. `npm run readiness:k2-live` — all gates. Any `FAIL` stops here.
3. Fresh encrypted backup plus owner-only Drive upload and independent hash
   readback. A local envelope is not an offsite backup.
4. Isolated restore of that exact envelope into a local cluster, then a
   rollback-only rehearsal of the reviewed chain with its preflight, postflight
   and baseline-unchanged assertions.
5. Owner authorization naming the exact chain, then the apply.
6. Postflight on the live database: grants, tables, ledger, and the named
   behavioral read.
7. Update the rulebook, System Brain, this runbook, the MAP item and the
   evidence README with the receipt, keeping prepared, applied, deployed and
   human-accepted as separate states.

## Recovery

Local HTTP runtime acquisition/version evidence: preserve private http-runtime01 and http-version-probe01/02/03 under the explicit owned recovery root. All guests are RAM-only/networknone and stopped; exact source/layer/config hashes and executed-source/guest/launch/log/result copies permit replay into a fresh case. Never overwrite prior cases. Current version-only candidates are not deployed K2 versions or Auth/BFF acceptance. Before any DB connection, qualify startup/migration compatibility on a fresh captured-authority fixture and retain complete schema/role/ACL maps; unexpected migrations remain a diagnostic, not an accepted provider change. Next gateway/JWT/MFA/BFF action stays MAP-018; receipt LOCAL_HTTP_RUNTIME_20261010.json and DUMMY_PRODUCTION_ACCEPTANCE_20261009.md.

For BFF/reference identity qualification, require fresh browser storage and actual restored Auth/PostgREST session behavior. Existing QEMU evidence has networking disabled and tests SQL only; mocked Product Master responses are insufficient. The scoped native anonymous extension remains rollback-only in fresh oci-taxonomy02; retain its sources/results separately from01. Keep provider tokens server-held and do not grant anonymous mutations to compensate for browser session gaps. Setup/reproduction and exact remaining action: MAP-018; source pins/native hashes: DUMMY_PRODUCTION_ACCEPTANCE_20261009.md and BFF_TAXONOMY_IDENTITY_AUDIT_20261010.json.

Scoped captured-taxonomy witness: run `node scripts/rehearse-captured-taxonomy.mjs --case=oci-taxonomyNN` only with a fresh owned case and retained verified oci-imported02. Synthetic auth/profile/taxonomy writes share one rolled-back transaction; native complete metadata, original row/sequence and global/managed comparisons must pass. Preserve preparation, executed SQL/orchestrator/runner, serial and terminal result; stop confirmation is required. RAM-only fixture needs no production cleanup. Native permission acceptance does not replace actual Auth/BFF, provider authorization or host gates. Final01 receipt and next action remain in MAP-018 and DUMMY_PRODUCTION_ACCEPTANCE_20261009.md.

MAP-018 captured-authority imported fixture: preparation and execution use the two `scripts/*-imported-provider-fixture.mjs` commands with a fresh `--case=oci-importedNN` in the explicit private owned D: root. Never overwrite an existing execution or reuse its RAM database as production. Keep its immutable preparer, runner, source pins, SQL package, serial, transferred catalogs and result beside all earlier backups. The original captured archive and exact cold restore remain recovery authority; rollback is not an inverse imported merge. A local native success does not satisfy provider identity/authorization, management transport or actual-host gates. Exact executed case, hashes, terminal result and next action: docs/acceptance/DUMMY_PRODUCTION_ACCEPTANCE_20261009.md; unresolved work stays MAP-018.

Uncommitted transaction: `ROLLBACK` inside the rehearsed transaction. After
commit, use the data-preserving scoped forward repair chosen in
`DATABASE_BACKUP_AND_RESTORE_RUNBOOK.md` rather than dropping sessions, lots,
receipts or Storage bytes. Keep both BFF flags off and the Admin edge gate
closed, and keep the previous separate Vercel deployments as the artifact
recovery path. If a gate is ambiguous, stop in the fail-closed state.
