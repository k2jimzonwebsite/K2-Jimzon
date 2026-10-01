# Dedicated K2 provider account access

Verified 1 October 2026, Asia/Singapore. IDEA-20261001-02, owning MAP-022;
separate hosting identity also supports MAP-024. This is a read-only account
and resource receipt, not another work queue.

The owner requested moving/fixing Vercel and Supabase access into the
`k2jimzonwebsite` account because the personal account also serves other
projects. Fresh inspection found the canonical resources already associated
with the dedicated account. No project transfer or duplicate resource was
needed. The user completed the browser authentication; Codex inspected the
resulting sessions and existing connector access.

| Provider | Signed-in account and role | Verified resource |
| --- | --- | --- |
| Vercel | `k2jimzonwebsite@gmail.com`, Owner | K2 Jimzon / `k2-jimzon`, `team_C3Wf3dVUBjUqGQ4rndMTCchz` |
| Vercel Storefront | Listed under the verified K2 team | `k2-jimzon`, `prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL` |
| Vercel Admin | Listed under the verified K2 team | `k2-jimzon-admin`, `prj_hPWQKCjIQRuKB3LLlbCmlGNHjL3x` |
| Supabase | `k2jimzonwebsite@gmail.com`, Owner | K2jimzon organization `dstfobgqgtklmbclhlgb`, project `pixplcjqivlfflickobf`, `ACTIVE_HEALTHY` |

## Fresh evidence

- Vercel `list_teams({})` returned one K2 team with the ID above.
- Vercel `list_projects({teamId: 'team_C3Wf3dVUBjUqGQ4rndMTCchz'})`
  returned the separate Storefront and Admin IDs above.
- Vercel dashboard profile displayed the dedicated email. The Members page at
  `https://vercel.com/k2-jimzon/~/settings/members` displayed one member,
  `k2jimzonwebsite@gmail.com`, with role Owner. The project overview displayed
  both K2 projects and their `k2jimzonwebsite/K2-Jimzon` source links.
- Supabase `list_organizations({})` returned the K2 organization above;
  `list_projects({})` and `get_project({id: 'pixplcjqivlfflickobf'})` returned
  canonical K2 as healthy in that organization.
- Supabase profile displayed the dedicated email. The Team page at
  `https://supabase.com/dashboard/org/dstfobgqgtklmbclhlgb/team` displayed
  the dedicated email as YOU / Owner and one existing Administrator.
- Local `.vercel/project.json` already links to the exact K2 Admin project
  and team IDs. No relink was made.

## Current limits

Supabase's current member table reports MFA Disabled for the owner and the
existing Administrator. The earlier 2 September account/key recovery
attestation remains a distinct historical receipt; it does not establish
current MFA enrollment. No MFA, membership or credential was changed.

Vercel `get_project` returned input validation errors stating `idOrName` was
missing, although the advertised schema requires `projectId`. A bounded retry
including both names returned the same error. This is a tool-interface limit,
not evidence of account denial. Project listing and authenticated dashboard
inspection work; detailed connector inspection was not verified. CLI login,
write-tool scope, whole-service recovery and application end-to-end behavior
were not tested by this slice.

## Changes, recovery and handoff

Only repository documentation changed: Future Ideas, the operations rulebook,
System Brain, MAP-022, Project Map, deployment runbook and this receipt.
The existing uncommitted IDEA-20261001-01 entry and `.backups/` were preserved.
No database, key, environment, flag, domain, project ownership, membership,
deployment or application source was changed by Codex. No production rollback
is needed; revert only this documentation slice to withdraw its receipt.

Account access is verified for the checked session. Remaining work belongs
solely to MAP-022: owner-performed Supabase MFA enrollment with fresh member
readback, and the Vercel project-detail connector correction/fallback.
Before later provider writes, recheck account/role and exact canonical IDs;
follow the owning MAP item and its existing backup/preflight/recovery gate.
No release or application tests are required for this documentation-only slice.
Documentation verification: `git diff --check` exited 0. The resource IDs were
compared against the fresh connector returns and existing local Vercel link.
