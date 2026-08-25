# MAP-016 Recovery Evidence Snapshot

## Credential gate closure — 22 August 2026

All four remaining blockers are closed with direct production evidence.

- **Defect found:** deployed `invite-staff` could never succeed for any caller.
  `auth.mfa.getAuthenticatorAssuranceLevel()` was called with no argument, so
  `@supabase/auth-js` fell back to `getSession()`. The caller client has
  `persistSession: false` and carries the session only as a request header, so
  `currentLevel` was always `null` and every caller received `AAL2_REQUIRED`.
  This is the true cause of the previously recorded zero-completed-receipt state.
  The contract suite missed it because its mock returned `currentLevel: 'aal2'`
  unconditionally.
- **Correction deployed:** assurance is now derived from the caller's own access
  token, which `auth.getUser(accessToken)` validates first; the `aal` claim and
  the library result must both agree or the request fails closed. Deployed as
  `invite-staff` version 6, ACTIVE. A regression test asserting that a genuine
  AAL2 caller is accepted was confirmed to fail against the pre-fix handler.
- **Real Admin AAL2 invitation:** 12/12 checks passed against production using a
  throwaway Admin with a real enrolled TOTP factor — AAL1 refused, AAL2 accepted
  (`invited:true, roleAssigned:true`), replay idempotent, changed payload 409,
  invitee persisted as `Staff`, receipt table unreadable through PostgREST. Both
  test identities were deleted; zero residual test records remain.
- **Legacy signing key revoked:** HS256 `413f135b-f7fa-46ae-a630-4a9d5308d85f`
  moved from `previously_used` to `revoked` after confirming the `in_use` key is
  ES256 `2e97dfb3-4510-4e7f-80cf-92f3d1edc005`.
- **Old-token rejection proven:** before revocation the exposed service-role JWT
  elevated 27 rows to 30; after revocation the identical request returns HTTP 401.
- **Post-change regression:** invite-staff 12/12 after revocation, anonymous
  storefront reads HTTP 200, Admin host HTTP 200, 118 contract tests pass, and
  `npm run verify:map016-local` passes with both isolated production builds.
- **Build defect repaired:** `src/views/admin/SystemDevOpsModal.jsx` had been
  deleted in the working tree while still imported by `Admin.jsx`, breaking the
  Admin build and the whole local gate. It was restored and rewritten to meet the
  diagnostic boundary contract. `supabase/functions/_shared/response.ts` remains
  deleted on purpose — wildcard CORS, no importers.
- **Vercel environment inventory closed:** after the owner re-authenticated the
  CLI to team `K2 Jimzon`, a name-only capture failed the contract with five
  findings — `K2_DEPLOYMENT_TARGET` missing on both targets, the two BFF flags
  missing, and a stale `VITE_SUPABASE_ANON_KEY` on admin. No forbidden provider
  secret and no secret-shaped `VITE_` name existed on either target. The four
  variables were added to Production and the stale anon-key variable was removed;
  it held the already-disabled legacy anon JWT and no application, server, or API
  file reads it. Re-run result: contract passed for both targets. Captured
  inventory is at `scripts/map016-evidence/vercel-env-inventory.json`.
  Known gap: the additions are Production-only because Vercel CLI 54.14.0 rejects
  every non-interactive `env add ... preview` form, including the one it prints
  itself. Behaviourally inert today; finish from the dashboard during MAP-021/024.
- **Handling note:** a Management API `/api-keys` response returned the legacy
  service-role JWT in plaintext into a task transcript during inspection. The
  probe now redacts credential fields, and that credential is the same legacy
  token the revocation above has rendered unusable.

## Current local containment addendum — 21 August 2026

- Repository `main` and the current Admin/storefront production deployments were
  confirmed on commit `9a9dfad8e76bb472c0cd48fe5ccf1bac39cc9231` before the
  current uncommitted containment improvements. The changes below are local and
  must not be described as deployed.
- Secret detection now covers the original credential classes plus AWS,
  Google/Gemini and Google OAuth, Slack, SendGrid, Stripe, npm, GitLab, Shopify,
  Twilio, Mailgun, and Meta/WhatsApp formats using fabricated regression values.
- A tracked-sensitive-file policy rejects non-example environment files,
  credential-bearing package/provider files, private key/certificate formats,
  and database exports.
- A source-boundary verifier allowlists actual browser environment expressions
  and rejects dynamic browser environment access, Node environment access in
  browser source, and browser environment APIs in server/API/Edge source.
- `npm run verify:map016-local` is the reproducible local containment command. It
  runs the combined security/history/environment/file gates and both isolated
  production builds with artifact-boundary and bundle-secret checks.
- This addendum records the local state as it stood on 21 August. The four
  provider blockers listed here were subsequently closed on 22 August as
  recorded in **Credential gate closure** above.

## Production cutover update — 15 August 2026

- Owner-authorized migration applied to production and permission postflight passed.
- Exact Admin origin installed and `invite-staff` version 5 deployed ACTIVE using
  modern hosted publishable/secret key maps with no legacy fallback.
- Live boundary results: approved preflight 204; foreign/missing origin 403;
  approved-origin unauthenticated POST 401 with redacted correlation ID.
- Rollback-only database postflight returned `MAP016_POSTFLIGHT_PASSED` for claim,
  replay lock, completed replay, conflict, and stale recovery; no test receipt retained.
- Repository shared Edge Auth plus Admin/storefront BFF helpers require the modern
  publishable key and their security contracts pass.
- The stale CLI link was bypassed with the existing secure Vercel connector. It
  verified the K2 team, separate storefront/Admin projects, READY production builds,
  exact build-target markers, and no 24-hour runtime-error clusters. Active bundles
  contain the modern publishable key and no legacy JWT/service-role/secret value.
  This was the 15 August state; version 6, the real Admin AAL2 invite, signing-key
  revocation, and old-token rejection were completed on 22 August as recorded above.

## Independent Codex verification — 22 August 2026

- Reviewed the real `invite-staff` handler and regression contract. The same
  bearer token is passed to server-side `getUser()`, its validated `aal` claim is
  required to equal `aal2`, and the Auth library assurance result must not
  disagree. Role authorization remains an exact live `Admin` profile check.
- Re-ran the complete local containment gate. Repository/history/current-build
  secret scans, source/environment boundaries, dependency and security-surface
  policies, import integrity, and both isolated production builds passed.
- Re-ran the complete API/security contract suite: 119/119 tests passed.
- Re-ran the captured name-only Vercel inventory contract: both Admin and
  Storefront inventories passed.
- Re-ran the read-only production legacy-token probe. Anonymous catalog access
  returned HTTP 206 for 27 rows; the old HS256 service-role token returned HTTP
  401 both as a bearer token and as `apikey`, confirming revocation remains
  effective. No credential values were printed or recorded.
- `git diff --check` reported no whitespace errors. The existing classified
  working tree was preserved.

**Independent verdict:** MAP-016 satisfies its completion gate. It was removed
from the active Master Action Plan in the same change. Provider activation and
schema work beyond credential containment remain governed by MAP-017 onward.
- Public JWKS metadata confirms an active ES256 key. No secret or user content is
  recorded in this evidence file; provider originals remain owner-retained.
- Post-change verification: 11 handler contracts passed; Edge/Admin BFF/guest BFF
  guards passed; fabricated-secret tests passed; 745 repository files scanned clean.
- Vercel device authorization repeatedly returned `Not authorized`. A newly issued
  refresh credential was accidentally emitted during diagnosis, immediately logged
  out, and its private local auth file confirmed removed. No K2 Vercel resource was
  accessed or changed. Owner dashboard evidence then confirmed every CLI token from
  these attempts revoked/removed; the credential value is not reproduced in any
  project record.

**Captured:** 11 August 2026

This file is a continuity/evidence snapshot, not a plan or competing backlog.
The active queue remains only in `MASTER_ACTION_PLAN.md`.

## Repository truth at capture

- Branch: `codex/step-1-launch-core`
- Local HEAD and `origin/main` were both `61a5929` at audit time.
- The launch/security/intake work below was modified or untracked locally and
  therefore was not proven deployed by Git or Vercel.
- Filename checks, string checks, local SQL files, seed output, and Vercel JSON
  files do not prove live schema, provider configuration, data, or behavior.

## Local-change classification

| Classification | Files or groups | Evidence judgment |
| --- | --- | --- |
| Verified local control | `.gitignore`, `.env.example`, `package.json`, `scripts/scan-secrets.mjs`, `scripts/scan-git-history-secrets.mjs`, `scripts/secret-scan-core.mjs`, disabled `scripts/seed-full-catalog.mjs` | Secret removed locally; repository, history, and existing-bundle scans pass |
| Authoritative working records | `MASTER_ACTION_PLAN.md`, operations rulebook, System Brain, Owner Questions, Future Ideas, this snapshot, incident runbook | Records corrected launch truth and accepted hybrid/BFF target; not deployment proof |
| Incomplete and requires MAP-017/MAP-018 audit | `src/services/`, `src/types/`, `ProductIntakeSessionModal.jsx`, product research contracts/prompts, intake/SKU migration, pilot seed and related verification scripts | Compile/schema/auth/idempotency/publication problems found; do not treat as ready |
| Incomplete and requires later MAP audit | admin assistance/UI changes, connector runtime, canonical identities, shelf-life gate, storefront context/client changes, tests, Vercel configs, remaining migrations and verification scripts | Preserve as user work; verify against each accepted MAP completion gate before integration |
| Unsafe or obsolete | former catalog seed behavior; filename/string-only launch proof; prior empty-backlog/completion claims | Catalog seed retired; proof and claims are explicitly non-authoritative |
| Unrelated local support artifacts | `AGENTS.md` and installed local skill/config directories excluded by Git ignore | Preserve; not product launch evidence |

No unclassified deletion or reset was performed. Every listed local change must
remain preserved until its owning MAP item verifies, repairs, replaces, or
explicitly retires it.

## Reproducible checks

```text
npm run security:secrets
npm run security:history
npm run security:bundle
```

The checks report only file/line/rule metadata and never print a matched secret.
Passing them proves only that their current patterns found no matching value; it
does not prove provider variables, logs, deployments, or live database state.

## Provider-side evidence (14 August 2026)

- **Consumer Inventory:** Repository and provider inspection found one active Edge
  Function, `invite-staff` version 3. Its repository implementation still read the
  legacy service-role environment. A modern-secret correction is prepared locally
  but is not deployed or live-tested.
- **Log Review:** Supabase unified logs reviewed via ClickHouse query across 24h window
  (`2026-08-13T11:04:10Z` to `2026-08-14T11:04:10Z`). 12 routine system events recorded (9 postgres,
  3 pgbouncer). No suspicious event appeared in those sources. API, Auth, and Edge
  request logs were absent, so elevated-key use, destructive API actions, and
  abnormal request volume were not proven absent.
- **Replacement Secret Key:** The modern `default` secret key was verified active
  through a bounded PostgREST read. Installation in every active runtime is not proven.
- **Legacy Key Disablement:** Management API call `PUT /v1/projects/pixplcjqivlfflickobf/api-keys/legacy?enabled=false`
  executed at `2026-08-14T11:05:07Z` and confirmed (`{"enabled":false}`).
- **Independent State Check:** After propagation, the old credential returned 401
  when used as `apikey`. It still granted elevated Bearer authorization when paired
  with the public key: 30 rows versus 26 through the public key alone.
- **Authorization Record:** Explicit owner confirmation immediately before the
  provider disable operation was not documented.
- **Current Status:** `Blocked — evidence required` pending deployment and testing
  of the modern-secret Edge Function correction, fuller provider-log evidence, and
  owner-approved JWT signing-key migration/revocation.
