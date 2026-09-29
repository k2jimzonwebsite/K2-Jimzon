# Harness capability and K2 live readiness receipt, 29 September 2026

**Scope:** what this session could actually reach, and the current live
precondition state for the owner-authorized production sequence. **Nothing was
applied, migrated, flagged or deployed. No production row was written.**

**Idea:** IDEA-20260928-03, continued. **Owning item:** MAP-017, with MAP-018,
MAP-020, MAP-022 and MAP-026 reading the same receipt.

## What prompted this

Earlier MAP-017 and MAP-018 entries were written as "this session has no
Supabase or Vercel connector, so every step below is staged for a later
connected session". That was true for the writing session. It is not a
property of the repository, and treating it as one left the ordered packets as
prose that no gate could check. This session re-tested capability instead of
re-reading the packet.

## Capability, tested not assumed

| Surface | Result | Evidence |
| --- | --- | --- |
| Supabase project list | available | HTTP 200, exactly one project: `pixplcjqivlfflickobf` (`K2jimzon`) |
| Supabase production SQL (read) | available | `select count(*) from public.products` returned HTTP 201, `30` |
| Supabase production SQL (write) | **technically available, deliberately unused** | The same endpoint accepts arbitrary SQL. This session sent only `SELECT` with `read_only: true`. Capability is not authorization. |
| GitHub | available | `gh auth status`: account `EdgerzXc`, scopes `repo`, `workflow` |
| Vercel | **not available** | `VERCEL_OIDC_TOKEN` is a 1231-char OIDC JWT; `GET /v2/user` returns `403 {"error":"Not authorized","invalidToken":true}`. No CLI, no MCP. |
| Cloudflare | **not available** | No connector, CLI or MCP in this harness. |
| Supabase security advisor | **not available** | Requires a signed-in dashboard session. |
| Local PostgreSQL 17.11 | available | `.tools/postgresql-17.11/runtime/pgsql/bin/{pg_ctl,psql}.exe` |

The K2/ScoutIT distinction holds: the installed token sees K2 only, and the
ScoutIT ref `yyixsuaimdzyiocswcgc` is not present. The `read_only` guard and the
identity preflight are asserted in `prebuild`, not merely documented.

## Gate receipt

`npm run readiness:k2-live`, `scripts/k2-live-readiness.mjs`:

```
PASS       project-identity                   K2 pixplcjqivlfflickobf
PASS       migration-ledger                   10 entries, latest 20260928092634
PASS       intake-chain-unapplied             intake tables absent, prepared apply is a first apply
PASS       channel-chain-unapplied            channel tables absent
OWNER      anon-execute-surface               10 anon-executable public functions; source expects 18
OWNER      stock-facts                        30 products (22 live), 21 lots; physical count unproven
PASS       backup-freshness                   current-20260929-pre-intake.k2backup (20260929) vs ledger 20260928
PASS       backup-restore-proof               isolated restore receipt present locally
CONNECTOR  vercel-preview                     no Vercel API token or CLI in this harness
CONNECTOR  cloudflare-gate                    Admin edge gate state not readable from here
CONNECTOR  provider-advisor                   Supabase security advisor findings need a signed-in session
PASS       release-branch                     ## main...origin/main [ahead 1]

verified 7 | owner 2 | connector 3 | blocked 0
```

### Reading the two `OWNER` rows

`anon-execute-surface` reports **10** live anonymous-executable public functions
against **18** expected anonymous grants in the repository source inventory.
This is an unexplained discrepancy, not a pass and not a regression: the source
inventory counts source-level expectations while the gate counts live
`has_function_privilege` results, and the two have not been reconciled. It is
recorded as a finding for MAP-017 and must be classified against actual grants
and function guards before any revocation is proposed.

`stock-facts` reports 30 products, 22 live, 21 lots. These are database
projections. They are not a verified physical count, not a receiving record and
not an approved listing, so the gate routes them to the owner rather than
reporting readiness.

### The `CONNECTOR` rows are the real remaining limit

Vercel, Cloudflare and the Supabase advisor are unreachable from this harness
and are reported as such. The MAP-020 Build Output candidate therefore still
cannot be proved: one function per project, 180/10-second Resources values,
own-route and wrong-target behavior, and the Admin Turnstile hostname all need
either a connector-equipped model or owner browser action. No receipt in this
repository may claim otherwise.

## What is now ready

1. `npm run preflight:k2-project` confirms K2 identity with no query.
2. `npm run readiness:k2-live` re-proves every precondition in one command and
   fails closed on any broken gate.
3. A fresh encrypted backup exists and is newer than the newest applied
   migration, with an isolated restore receipt beside it locally.
4. The prepared MAP-018 intake chain is confirmed to be a first apply, not a
   re-apply.

## What still needs a decision, not more preparation

1. Owner authorization naming the exact chain to apply. Capability exists; the
   permission does not, and this session did not assume it.
2. Classification of the 10-versus-18 anonymous execute discrepancy.
3. A connector-equipped session or owner action for every `CONNECTOR` row.
4. Verified physical counts, product facts and media rights before any real
   listing or payment cycle.

## Recovery

Nothing changed, so nothing needs recovery from this session. The standing
recovery position is unchanged: both BFF flags off, the Admin edge gate closed,
the previous separate Vercel deployments retained, and the 29 September
envelope available for an isolated restore.

## Commands

```bash
npm run preflight:k2-project
npm run readiness:k2-live
npm run security:test-live-readiness
npm run verify:development
```
