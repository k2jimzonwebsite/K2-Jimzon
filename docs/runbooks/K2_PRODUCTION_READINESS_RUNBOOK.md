# K2 Production Readiness Runbook

**Scope:** the read-only gate every owner-authorized K2 production step must
pass first. **Current state:** the gate exists and runs. It authorizes nothing.

## Why this exists

The Master Action Plan holds several apply-ready packets written as prose
because the writing session had no Supabase or Vercel connector. Capability
changes between sessions, so prose packets silently rot. This runbook makes the
preconditions executable and repeatable so the step after the gate is the only
decision left, not the re-derivation of whether the step is allowed.

## Capability, stated as of 29 September 2026

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
npm run readiness:k2-live
```

It sends only `SELECT` statements with `read_only: true` through the Supabase
management API, refuses a non-`SELECT` string before the request is built, and
exits before any query if the K2 project identity check fails. It writes a
receipt to `.tools/current-production-backups/live-readiness.json` and nothing
else. `tests/k2-live-readiness-contract.test.mjs` asserts those properties
against the script source and runs in `prebuild`.

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
| `anon-execute-surface` | Routed to the owner. Reports the live anonymous execute count for comparison with the 18 expected source grants. A mismatch is a finding, not a pass. |
| `stock-facts` | Routed to the owner. Reports product, live-product and lot counts. These are database projections and never prove physical stock. |
| `backup-freshness` | The newest local encrypted envelope is dated on or after the newest applied migration. |
| `backup-restore-proof` | An isolated restore receipt sits beside that envelope. Local presence only; it is not owner-held custody. |
| `vercel-preview`, `vercel-edge-gate`, `provider-advisor` | Always `CONNECTOR` in this script. The Admin route gate is a Vercel routing rule; browser observations must be recorded separately before a cutover. |
| `release-branch` | Whether the working branch is ahead of its upstream, so a "pushed" claim is checkable. |

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

Uncommitted transaction: `ROLLBACK` inside the rehearsed transaction. After
commit, use the data-preserving scoped forward repair chosen in
`DATABASE_BACKUP_AND_RESTORE_RUNBOOK.md` rather than dropping sessions, lots,
receipts or Storage bytes. Keep both BFF flags off and the Admin edge gate
closed, and keep the previous separate Vercel deployments as the artifact
recovery path. If a gate is ambiguous, stop in the fail-closed state.
