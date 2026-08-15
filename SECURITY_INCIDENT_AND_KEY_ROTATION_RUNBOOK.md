# K2 Jimzon Security Incident and Key Rotation Runbook

This is an operational runbook and evidence record, not a backlog. Active work
remains exclusively in `MASTER_ACTION_PLAN.md`.

## Incident SEC-20260811-001

**Status:** modern invitation runtime deployed; final legacy-JWT revocation,
old-token rejection, full activity review, and real Admin AAL2 success proof required

**Detected:** 11 August 2026

**Affected credential:** a legacy Supabase service-role credential embedded in
an untracked catalog seed script. Never paste the old or replacement value into
Git, chat, screenshots, tickets, logs, or this file.

**Risk:** service-role credentials bypass Row Level Security. Treat the exposed
value as compromised even though the file was untracked and the Git-history
scan currently passes.

### Local containment evidence

- The unsafe catalog seed was replaced with a disabled guard. It cannot connect
  to Supabase or write products/inventory.
- The concrete-looking encryption value in `.env.example` was replaced with a
  placeholder.
- Environment, private-key, dump, and generated security-report patterns are
  ignored.
- `npm run security:secrets` scans tracked and unignored local files without
  printing matched values (700 files checked, 0 findings).
- `npm run security:history` scans added lines across all Git history without
  printing matched values (0 findings).
- `npm run security:bundle` scans existing build artifacts for storefront (32 files)
  and admin (37 files).
- Public publishable key allowlist configured in `scripts/secret-scan-core.mjs`
  for the project's public anon key.
- The secret scanner evaluates each match independently; line-level skipping was
  eliminated so coexisting placeholder markers (`example`, `placeholder`,
  `[redacted]`, `your-`) cannot mask secrets.
- Encrypted private-key headers are detected. Credentialed database URLs are
  suppressed only when their parsed hostname, username, and password exactly match
  the narrow documentation allowlist; real credentials and hostname lookalikes fail.
- `npm run security:test` verifies detection of fabricated secrets and confirms
  public key allowlisting, placeholder handling, and coexisting marker detection.
- All production build commands (`build`, `build:storefront`, `build:admin`,
  `vercel.storefront.json`, `vercel.admin.json`) automatically execute completed-dist
  bundle secret scanning and fail closed with a non-zero exit code upon any finding.
- Failure gate proven with controlled temporary fixtures; clean local production-mode
  builds pass with 0 findings.
- The repository secret scan is part of `prebuild`.

### Required Supabase owner action

1. In the correct Supabase project, open **Project Settings → API Keys**.
2. Identify the exposed legacy `service_role` key and inspect available API,
   Auth, Edge Function, and database logs from the earliest possible exposure.
3. Create a replacement server secret using Supabase's current secret-key
   mechanism. Store it only in the server runtime that genuinely needs it.
4. Migrate each legitimate server consumer. Browser code may use only the
   publishable/anon key and must remain protected by RLS.
5. Disable the exposed legacy service-role key. If the dashboard requires a
   broader JWT-secret rotation, review its session and function impact before
   confirming the action.
6. Verify the old credential is rejected without sharing it with Codex or
   recording it in a command transcript.
7. Record who performed the action, UTC time, affected consumers, log-review
   window, observations, and verification result in the evidence table below.

Do not restore the legacy catalog seed. Product creation and inventory receipts
must use separate, authorized, audited, idempotent operations.

### Rotation evidence

| Evidence | Status | Owner-safe record |
| --- | --- | --- |
| Local source containment | Verified 14 Aug 2026 | Secret absent; 701 repo files scanned, 0 findings |
| Git-history review | Verified 14 Aug 2026 | Full history scanned, 0 findings |
| Production bundle review | Verified 14 Aug 2026 | Storefront (32 files) and admin (37 files) scanned, 0 findings |
| Public key allowlist | Verified 14 Aug 2026 | Allowlist tested; unallowlisted JWTs fail scan |
| Scanner bypass fix | Verified 14 Aug 2026 | Independent match evaluation; coexisting markers tested |
| Automated bundle build gate | Verified 14 Aug 2026 | Build paths scan dist; contaminated builds fail closed |
| Supabase last-used/log review | Partial — evidence gap | 24h query returned only 9 postgres and 3 pgbouncer events; API/Auth/Edge activity was absent, so elevated use and request volume were not ruled out |
| Replacement server secret installed | Verified for active Edge invite runtime 15 Aug 2026 | `invite-staff` version 5 ACTIVE; modern key maps consumed with no legacy fallback |
| Legacy API-key use disabled | Verified with authorization gap 14 Aug 2026 | Management state is disabled and old `apikey` use returns 401; explicit pre-disable owner confirmation was not recorded |
| Old JWT rejection verified | Blocked — elevated Bearer access remains | Public key alone exposed 26 rows; public key plus old service-role Bearer JWT exposed 30, matching the modern elevated key |
| Invitation operation boundary | Verified 15 Aug 2026 | Production migration permission postflight passed; rollback-only replay/conflict/stale-recovery test passed with no retained test row |
| Edge request boundary | Partial — denial paths verified | Exact-origin preflight 204; foreign/missing origin 403; exact-origin unauthenticated POST 401; real Admin AAL2 invite still required |
| Production consumer inventory | Verified for active static bundles 15 Aug 2026 | Secure connector confirmed separate K2 storefront/Admin projects; both bundles use a modern publishable key and contain no legacy JWT, service-role variable, or secret-key value; prepared BFF environment remains inactive/unproven |
| Vercel CLI authorization incident | Contained and owner-confirmed 15 Aug 2026 | Newly issued refresh credential was accidentally emitted during diagnosis after all CLI calls returned `Not authorized`; immediate CLI logout succeeded, private auth file removal was verified, and owner dashboard evidence confirms every CLI token from the attempts is revoked/removed; no Vercel project was accessed or mutated through the CLI |

### If suspicious activity is found

1. Preserve provider logs and timestamps without copying customer content or
   credentials into ordinary notes.
2. Disable the compromised credential and any unexplained server consumer.
3. Review unexpected database writes, Auth/admin actions, Storage access, Edge
   Function calls, and egress by actor and time.
4. Restore data only from a verified clean backup after impact is understood.
5. Notify affected people when required by applicable law and owner policy.
6. Add the proven failure mode and prevention control to this runbook, while
   keeping remediation work in the Master Action Plan.

References: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys),
[securing the Data API](https://supabase.com/docs/guides/api/securing-your-api), and
[Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
