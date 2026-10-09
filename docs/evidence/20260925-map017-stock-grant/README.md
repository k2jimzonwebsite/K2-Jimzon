# MAP-017 public stock grant preparation, 25 September 2026

## Request and observed starting point

The owner asked to proceed with MAP-017's next engineering slice and document
the work. The 24 September read-only production schema export reports an extra
PostgreSQL `PUBLIC` execute grant on `public.get_public_product_stock()` while
explicit `anon` and `authenticated` grants already exist. The stock projection
must remain available to both callers. This slice prepared source and local
rehearsal only; it did not connect to production or apply a provider change.

## Changed artifacts and reason

| Artifact | Change |
| --- | --- |
| `supabase/migrations/20260925_map017_stock_public_execute.sql` | Transactional preflight, narrow `PUBLIC` revoke and postflight; direct caller grants must already exist. |
| `supabase/rollbacks/20260925_map017_stock_public_execute_rollback.sql` | Separate recovery that restores the observed broad grant only when reversing this correction. |
| `supabase/tests/map017_stock_public_grant_rehearsal.sql` | Isolated ACL finding, caller and unrelated-role assertions, stock-view reads and rollback restoration. |
| `scripts/rehearse-map017-portable.mjs` | Runs that SQL within the existing loopback-only PostgreSQL suite and checks two refusal cases. |
| Operations rulebook, System Brain, active MAP, project map and database runbook | Record required behavior, prepared state, ownership, recovery and remaining gate. |

The historical hash-bound MAP-017 migration and postflight were not edited.
The new correction changes no function definition, data, table grant, role
membership or provider default privilege. The rollback lives outside the
ordinary migration directory so a normal forward migration scan cannot apply
it as a new change.

## Local evidence

`node scripts/rehearse-map017-portable.mjs` first failed after the new test was
introduced because the correction file did not yet exist. After the SQL was
added, the isolated PostgreSQL 17.11 run exited 0. It recreated the observed
`PUBLIC` grant on the phase-one fixture; applied the correction; verified the
unrelated `supabase_admin` fixture role lost inherited execute; preserved direct
`anon`, `authenticated` and `service_role` execute; read the stock view under
anonymous and authenticated roles; ran the rollback; and verified the original
grant. A second apply attempt refused the already-absent `PUBLIC` grant, and a
fixture lacking explicit `authenticated` execute refused the correction. The
runner then restored its hardened fixture state and continued to pass all 12
existing authorization groups, function lockdown, encrypted backup and isolated
restore. The portable server stopped after the run.

The first restricted-sandbox run could not start the local PostgreSQL process.
The loopback-only rerun under the approved local process permission produced the
SQL result above. This was an environment startup limit, not a failed database
assertion. After the final code edit, `npm run verify:development` exited 0,
including the source security inventory, secret scan and import check.
`npm run verify:map017-artifacts` exited 0 for the historical hash-bound
phase-one artifacts and fabricated parser fixture; those checks do not prove
this new live ACL correction. `git diff --check` reported no whitespace errors.
`pg_ctl status` returned `no server running` after the portable rehearsal.

## Remaining gate and recovery

Draft PR [#13](https://github.com/k2jimzonwebsite/K2-Jimzon/pull/13) points at
feature commit `88ae0ad37ebb1ffff0c588b05a8fe7fe09fa0eb4`. Its initial
GitHub CI run `36094229418` was still in progress at inspection time. Both
Vercel Preview deployments failed at config compilation, before an app build:
the Storefront and Admin logs each report
`MAP024_VERCEL_CONFIG_REFUSAL: K2_DEPLOYMENT_TARGET is required`. The exact
reviewed project mapping in `vercel.ts` remains intact; the Preview-scoped
target variable was absent. Vercel CLI log inspection was unavailable because
this workstation had no CLI session; the installed Vercel connector supplied
the two build logs. MAP-024 and the deployment runbook own the provider fix and
subsequent Preview verification. The Production deployments were not changed.

**25 September MAP-024 Preview correction (owner-authenticated browser):** Vercel
General settings showed `k2-jimzon` ID `prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL`
and `k2-jimzon-admin` ID `prj_hPWQKCjIQRuKB3LLlbCmlGNHjL3x`, matching the
`vercel.ts` allowlist. Environment Variables showed an existing Production
`K2_DEPLOYMENT_TARGET` in each project and no Preview counterpart. Added a
nonsecret Config entry scoped only to Preview in each project: `storefront` for
Storefront and `admin` for Admin. Vercel confirmed each save and required a new
deployment. Redeployed the failed PR #13 source at exact commit `fde7e20` with
the Preview environment and no existing build cache:

- [Storefront deployment](https://vercel.com/k2-jimzon/k2-jimzon/2N9GPYtJmEGERnLJNiwiSEvKLhSh): Ready; [exact Preview URL](https://k2-jimzon-jkccggjnk-k2-jimzon.vercel.app/) rendered the public home and catalog entrypoint.
- [Admin deployment](https://vercel.com/k2-jimzon/k2-jimzon-admin/Ftn3upkDGgFsZWyuSUi1HLPTq2PE): Ready; [exact Preview URL](https://k2-jimzon-admin-pbycid1ee-k2-jimzon.vercel.app/) rendered the staff sign-in screen.

This is provider-applied Preview configuration plus build and entrypoint
evidence. No authenticated transaction, staff workflow, real customer journey,
production database grant, Production variable or Production deployment was
changed or verified by it. For recovery, remove the two newly added Preview
entries if the mapping must be reversed; the prior failed deployments and
existing Production entries remain available. MAP-024 retains exact-host
discovery and later Preview acceptance; MAP-017 retains live ACL apply/postflight.

No production permission was changed. The 24 September export, not a fresh
apply-time ACL, is the current starting evidence. MAP-017 still owns a fresh
read-only live ACL export, grant-preserving current-schema rehearsal with the
managed-role limits called out, a fresh verified database and Storage recovery
point, controlled authorization for this exact correction, and exact-host
anonymous/authenticated catalog reads after any apply. The separate six
provider-owned `supabase_admin` default-privilege findings await Supabase's
supported answer. Guest BFF, direct-RPC cutover, Auth and browser flags remain
outside this narrow change.

For local recovery, discard this feature branch or revert its source commit;
there is no provider state to undo. For an authorized later production apply,
the named rollback restores the previously observed `PUBLIC` execute grant and
requires a post-rollback ACL and catalog check. Do not run it as an ordinary
forward migration.
