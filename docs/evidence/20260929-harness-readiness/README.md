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

## Branch ownership, 29 September 2026

Multiple branches and worktrees had accumulated, which is how the same logical
change ended up under two names and two lineages. `main` is now the single
authority for this session's work. Recorded so a later session does not
re-derive this or re-apply a superseded variant.

**Verified: `main` contains everything this session produced.** Commits
`e805747` (Vercel Build Output packaging, K2 project identity preflight, CSV
`Draft` fix) and `3e17ff2` (readiness gate, runbook, records). Nothing is
pushed; `main` is ahead of `origin/main` by two.

**Removed as pure duplicates, safe because the content is provably on `main`:**

| Branch | Why it was a duplicate |
| --- | --- |
| `codex/csv-import-readiness-20260929` | Its single commit is an ancestor of `main`; `git branch -d` confirmed full merge. |
| `codex/real-inventory-listing-20260928` | `git diff --diff-filter=A main <branch>` returned **zero** files present in the branch and absent from `main`. Its nine commits restate work `main` already holds under a different SHA lineage. Worktree removed; the worktree was clean first. |

**Deliberately kept, each with a distinct reason:**

| Branch | Why it is not a duplicate |
| --- | --- |
| `codex/intake-cleanup` | Real unmerged refactor: routes product intake through scan, archives the legacy Admin UI, and carries `archive/2026-09-25-intake-and-unused-ui/` originals. Has a worktree and an open PR. Needs an owner decision, not deletion. |
| `codex/map017-stock-grant` | Holds the **older naming and weaker variant** of a change `main` already has in a better form. The branch has `20260925_map017_stock_public_execute.sql` (checks `PUBLIC` via `aclexplode`); `main` has `20260925_map017_stock_public_grant_revocation.sql`, which additionally asserts `anon` and `authenticated` still hold EXECUTE before revoking. Same function, same intent, stricter checks, and `main`'s is the deployed lineage (`20260925111537`). Superseded, not unique. |
| `codex/human-testing-release`, `codex/listing-release`, `codex/staff-session-seven-days`, `codex/automatic-intake-release`, `codex/automatic-intake-preparation` | Each is pinned to a live worktree and cannot be deleted until that worktree is removed. All are already merged into `main`. |

**Also merged into `main` and safe to delete, 9 branches:**
`chore/intake-docs-cleanup-20260925`, `codex/cashout-qr-polish-20260927`,
`codex/count-close-activation-readiness`, `codex/hero-additive-release`,
`codex/manual-qr-payments`, `codex/proportionate-release-checks`,
`codex/step-1-launch-core`, `feature/pim-schema`,
`fix/inbox-viewport-and-archiving`.

**Remote branches were not touched.** Deleting on `origin` is an outward-facing
push and is not implied by having the work on `main`. `origin/main` still points
at `f95e384`, so the public repository does not yet carry this work.

**The 75 modified tracked evidence PNGs were left as found.** They are not part
of this session's work, the Master Action Plan explicitly excludes pre-existing
modified evidence PNGs from commits, and they are byte-different from the index
rather than timestamp noise. A dirty `main` on those paths is therefore the
documented expected state, not lost work.
