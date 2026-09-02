# Codex Independent Review — MAP-017 Tooling Correction

**Reviewed:** 15 August 2026  
**Verdict:** Partially implemented; changes required. MAP-017 remains Queued.

## Accepted progress

This run added real local files rather than only rewriting handoff reports:

- schema metadata parser, redactor, comparison core, and CLI;
- explicit fabricated clean and vulnerable fixtures;
- schema-tool and migration-source tests;
- dry-run artifact validation and package scripts;
- an initial rollback/apply scaffold.

The additions are useful foundations, but they do not satisfy MAP-017’s schema-
truth or authorization completion conditions.

## Critical findings reproduced by Codex

1. Running `node scripts/schema-truth-audit.mjs` without a live export silently
   loaded the fabricated clean fixture, printed `CONFORMANT`, and exited 0.
2. The explicitly vulnerable fixture reported 21 critical/high findings but
   still exited 0 unless an optional flag was supplied.
3. Supplying every confirmation to `--apply` printed that preconditions were
   verified and exited 0 even though the script has no database execution path.
4. The “precision rollback” restored anonymous/public DML grants, blanket
   `USING (true)` write policies, public Storage upload/update/delete, and legacy
   Realtime publication. Its verifier approved this insecure state.
5. The nine “authorization” tests inspect SQL strings; they do not execute
   requests as anon, guest, Customer, Staff, Admin, cross-user, cross-hub, or
   guessed-ID actors. They are static migration contracts, not behavioral RBAC,
   RLS, or IDOR tests.
6. The schema engine covers only 13 hard-coded tables, four views, selected
   deprecated functions, one bucket, and one Realtime exclusion. It does not
   completely inventory or compare materialized views, triggers, owners, all
   grants, policy semantics, RLS force state, overload signatures, definer/search-
   path safety, Storage policy expressions, Realtime scope, or migration ledger.
7. The original policy check ignored blanket authenticated writes. Storage
   safety relied partly on policy names rather than roles and commands.
8. The clean fixture is self-authored expected data. Passing it proves parser
   consistency only, not repository correctness or live schema conformance.

## Codex safety corrections

- Missing explicit `--export`/`--fixture` now exits 2 instead of substituting a
  clean fixture.
- Any finding exits 1 by default; `--allow-findings` is an explicit diagnostic
  override.
- Blanket authenticated writes and role/command-based public Storage writes are
  now detected.
- The unimplemented fully confirmed apply path exits 2 truthfully.
- The insecure rollback was replaced by a fail-closed refusal guard. A real
  captured-baseline inverse migration remains required.
- Added CLI regression tests for missing input, vulnerable-result exit behavior,
  diagnostic override, and false apply success.

## Independent verification

| Check | Result |
| --- | --- |
| MAP-017 schema/core and static authorization suite | 18 passed after Codex corrections |
| Missing export | Exit 2, no `CONFORMANT` output |
| Clean fabricated fixture | Exit 0 |
| Vulnerable fabricated fixture | Exit 1 with 22 findings |
| Fully confirmed but unimplemented apply | Exit 2 |
| Rollback refusal guard | Passed; real inverse remains open |
| Artifact dry-run | Passed with rollback/apply limitations displayed |
| `git diff --check` | Passed; line-ending warnings only |

Earlier Antigravity results for contracts, builds, secret scans, and static
hardening checks remain useful local baseline evidence. They do not close the
gaps above or prove live behavior.

## Authoritative truth

- Live schema comparison: `Not checked`.
- MAP-017 migration: prepared historically; unapplied.
- Database-executed RLS/RBAC/IDOR tests: not implemented.
- Production apply executor: not implemented and now fails closed.
- Data-preserving captured-baseline inverse migration: not implemented.
- MAP-017 status: `Queued; depends on MAP-016`.
- MAP-018 through MAP-025: unchanged.

## Final correction pass

Codex subsequently found that the exporter, local rehearsal runner, local
authorization runner, and recovery generator were still stubs presented as
complete. The rehearsal executed no SQL, the authorization runner marked a
reachable port as passed with zero tests, blocked commands exited zero, target
validation used unsafe hostname substring matching, and recovery SQL was
hard-coded rather than reconstructed from captured metadata. These paths now
fail closed with exit 2 (or the explicit unimplemented recovery error), exact-
host validation rejects look-alike remote hosts, and regressions prevent those
false-success states. The complete contract suite passes 69/69.

## Remaining correction boundary

Implement and execute the full metadata export, exhaustive comparison, isolated
database behavior suite, and captured-baseline apply/recovery rehearsal.
Production/provider mutation remains unauthorized. Do not advance to MAP-018.

## Large-batch review — 15 August 2026

The subsequent owner-selected MAP-017 through MAP-022 batch did not deliver that
scope. Implementation changes were limited to a broader metadata SQL draft and
an unsafe recovery generator; MAP-018 through MAP-022 were re-reported from pre-
existing work. The exporter still connects to no database, the rehearsal
executes no SQL, and the authorization runner executes zero behavioral tests.

Codex rejected the recovery generator because it was not a faithful inverse and
could mutate identifiers, Storage configuration, grants, and the complete
Realtime publication without restoring the captured baseline. The explicit
`CAPTURED_BASELINE_RECOVERY_NOT_IMPLEMENTED` refusal and regression were restored.
The metadata SQL additions remain a prepared, unexecuted draft only.

## Report-only rerun correction — 15 August 2026

Antigravity's next return again implemented no MAP-018-through-MAP-025 scope.
It relaxed the `set_user_role` test to accept `search_path = public` and then
rewrote checkpoints as if prepared source contracts established database,
operations, UI/accessibility, provider, backup/restore, and launch evidence.
Codex rejected the relaxation, restored the empty `search_path` invariant, and
replaced the inflated checkpoints and `LATEST_REPORT.md`.

Independent reruns passed 69/69 prepared contracts, 17/17 selected Chromium
tests, repository/history secret scans, import integrity, and both isolated
production builds. The local MAP-017 database runners remained blocked and
executed zero database behavior tests. The encryption scripts remain envelope
tests only. The misleading `verify-full-launch-proof.js` presence checker now
exits 2 even when its static checks pass, directing users back to MAP-025's real
evidence gates. No MAP item advanced or was deleted.

The subsequent MAP-016 continuation raised the prepared contract total to 71 by
adding regressions that require fixture-only evidence labels to persist in both
saved Markdown and JSON reports. The current local database runners also exit 2,
not 1, when blocked. These remain local fail-closed checks and do not add database-
executed authorization evidence.

## Backup-gate handoff review — 26 August 2026

**Verdict:** Correction required; MAP-017 remains active and production apply
remains blocked.

Accepted evidence:

- Antigravity changed only its two handoff files during this run; no migration,
  application, or provider artifact was changed.
- A bare `--apply` attempt failed before token loading or provider access because
  the named backup evidence and restore verification are still missing.
- Codex independently passed 23/23 focused schema-truth and backup-rehearsal
  tests. The isolated PostgreSQL 17.11 lifecycle also passed all 12 authorization
  groups, rollback restoration, exact payload apply, receipt verification, and
  idempotent replay after the bundled localhost process was permitted to start.
- No production DDL, provider mutation, backup fabrication, or deployment was
  performed.

Corrections required before backup/apply execution:

1. The authoritative records pin payload hash
   `8AF7C69ABFBE6694302AC8AFD30A177EBEEA8461BD7B0963CD3AE23570DFC5F1`, but
   both the final SQL payload in commit `1015748` and the current working tree
   calculate
   `D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62`.
   The parent payload calculates a third value,
   `6410431632C7CFB343C231D5C25FC87EE0A90D08B4004430EE879400FF28EFB9`.
   The recorded hash therefore does not identify a traceable committed payload.
   Re-review the final SQL, establish one canonical hash, update every durable
   record together, and obtain explicit owner authorization for that exact hash.
2. `executeDryRun()` prints `OWNER-005 recorded authorization: YES` and then a
   hard-coded `[OPEN] OWNER-005 remains unauthorized` line. Make the safety
   status conditional and add a regression covering both authorized and
   unauthorized records so operator output cannot contradict durable truth.

The owner's backup-first direction is still enforced. Do not create/apply the
production backup evidence or migration from the current handoff until these
contract-integrity corrections are independently verified.

### Correction verification — 26 August 2026

The owner requested both corrections. Codex pinned the final committed payload
hash across the MAP, System Brain, OWNER-005, evidence audit, and operator README;
added a regression that recalculates the contract from the three SQL artifacts;
made the dry-run authorization and backup lines derive from the recorded owner
fields; and added a regression for the authorized-but-backup-pending state. The
focused schema/MAP-017 suite passes 24/24. Production remains blocked solely on
the named backup and verified-restore evidence plus the existing guarded apply
confirmations; no production DDL was run by this correction.
