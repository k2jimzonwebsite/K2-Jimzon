# MAP-016 Recovery Evidence Snapshot

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
