# K2 Jimzon Security Incident and Key Rotation Runbook

This is an operational runbook and evidence record, not a backlog. Active work
remains exclusively in `MASTER_ACTION_PLAN.md`.

## Browser diagnostic boundary

Never restore or create direct browser `INSERT` access to `public.error_reports`.
Admin browser failures may send only fixed classifications through the protected
Admin BFF security-event route; Storefront failures remain redacted and local
unless a separately approved public telemetry intake has origin, challenge,
distributed rate, retention, alerting, and real-host denial evidence. Do not
collect raw messages, stacks, full URLs, user agents, customer data, tokens, or
arbitrary context. The MAP-017 revoke migration is locally rehearsed only until
its permanent production receipt and postflight exist.

## Public review-claim incident response

If a review claim is disputed, lacks rights, exposes private evidence, or shows
incorrect attribution, preserve the claim and use the reasoned Admin withdrawal
command immediately; do not delete the row or edit production data directly.
Confirm that the storefront no longer returns it through the published-only
projection, record the claim UUID, actor, UTC time, reason, and affected hosts,
and preserve the immutable Globe/review event. If private source or rights fields
were exposed publicly, treat it as a data-exposure incident: capture minimal
evidence, disable the affected route/flag if required, inspect grants and
deployed artifacts, notify the owner, and follow the applicable legal and
customer-notification decision. Correction starts from the withdrawn/draft
record and requires fresh evidence review plus a separate publication action.
Never describe withdrawal as deletion or claim remediation complete until the
real storefront and direct anonymous-column denial are verified.

## Channel verification incident response

If an internal channel is marked operational from the wrong Website/Pasabuy
reference, preserve the channel verification event and command receipt, capture
the channel, public reference, actor, UTC time, reason, and affected host, and
notify the owner. Do not delete or rewrite the private evidence. Disable the
affected Admin command or browser BFF flag if false verification can continue,
recheck the canonical request and connection row, and correct status only through
an attributable database remediation approved for the incident. A marketplace
channel shown as operational without provider event, durable capture, and
reconciliation evidence is a separate connector-integrity incident: stop sync,
preserve raw provider events and signatures, inspect credentials and replay
keys, and do not resume or describe it as live until real-host evidence passes.
For oversized, malformed, identity-less, future-skewed, or stale Shopee pushes,
retain only bounded metadata needed for investigation; do not copy the raw body
or authorization header into broad logs. Confirm the configured replay window
against the approved partner contract, reconcile the deterministic shop-scoped
event key in `channel_event_inbox`, rotate the partner key if forgery is
plausible, and keep the connector Events-only until one real signed push and
provider retry pass without duplicate capture.
Repeated slow-body timeout responses are webhook-abuse/provider-path evidence:
record bounded timing and event-source metadata, confirm the explicit body-read
deadline, and do not raise it toward the platform idle ceiling merely to hide
the symptom. A timed-out stream must be cancelled and must create no inbox row.
For unexpected Shopee `429`, `409`, or capture-unavailable responses, preserve
only the shop-scoped event identity, response class, UTC time, and correlation
evidence; never log the authorization header or raw payload broadly. Confirm
the private reviewed rate configuration before changing it. Reconcile shop and
global bucket counts with the inbox row: an exact replay must not reset
`processing`, `processed`, or `failed` state, while changed evidence under the
same identity remains a conflict. Do not bypass the command with a direct inbox
write. If capture integrity is uncertain, disable/withdraw the Edge route or
revoke its command execution, retain the private evidence, and keep Shopee
Events-only until an authorized migration/configuration check and real signed
retry pass.

## Staff-access incident response

For an unauthorized or mistaken role change, preserve the staff-access event,
command receipt, target profile ID, actor, UTC time, reason, old/new role, and
affected host. Revoke the affected provider and K2 sessions when elevated access
may have been used, restore the minimum correct role through an approved
reasoned command, and verify the final-Admin invariant. Never delete the event or
copy account emails into broad incident notes. For suspected delete-PIN exposure,
rotate the actor's PIN through the signed command, preserve only configured-state
evidence, review deletion attempts and audit records, and never record the PIN or
hash. Disable the staff-access BFF flag if privilege changes cannot be trusted;
do not describe remediation complete until deployed role denial, session
revocation, and affected-record review are verified.

## Product-master command incident response

For an unexpected detail, lifecycle, or deletion result, stop the affected
product-master command and preserve the command receipt, private product event,
SKU, actor, UTC time, reason, idempotency key, and affected host. Do not retry
with a new key until the original receipt is reconciled. For stale-version or
transition denial, reload canonical state rather than bypassing the guard. For a
mistaken Live state, use a legal reasoned transition and verify storefront
visibility separately. For suspected unauthorized deletion, preserve the
`product_deletions` snapshot and related stock/listing/history evidence, rotate
the delete PIN if exposure is plausible, revoke affected sessions, and do not
recreate or edit rows directly before impact is understood. Disable the browser
BFF flag or server route if command integrity cannot be trusted; remediation is
not complete until deployed grants, receipts, affected records, and real-host
role/AAL2 denial are verified.

If System Readiness shows an available check that contradicts deployed behavior,
treat the boolean as a diagnostic inconsistency, not proof that the provider or
production system is healthy. Record the affected host, UTC time, correlation
ID, displayed boolean, expected boundary, and the independent failing request;
do not copy provider errors or customer data into the report. Disable the
readiness route/flag if it can mislead operators, verify the named database
object and deployed artifact separately, and correct the probe contract before
restoring it. Never infer uptime, WAF, encryption, latency, throughput, connector
health, or migration completion from this surface.

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
  printing matched values (783 current files checked on 21 August 2026, 0 findings).
  Git-cached paths deleted from the working tree are skipped because no current
  bytes exist; unreadable paths that still exist continue to fail the scan.
- `npm run security:history` scans added lines across all Git history without
  printing matched values (0 findings).
- `npm run security:bundle` scans existing build artifacts for storefront (35 files)
  and admin (38 files).
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
- Detection now includes AWS access keys, Google/Gemini API keys, Slack tokens,
  SendGrid API keys, and Stripe live/test secret or restricted keys in addition
  to the original Supabase, JWT, private-key, GitHub, OpenAI, and database rules.
- A second detector expansion covers Google OAuth client secrets and refresh
  tokens, npm and GitLab access tokens, Shopify access tokens, Twilio and Mailgun
  API keys, and Meta/WhatsApp-style access tokens.
- `npm run security:files` rejects tracked non-example environment files,
  credential-bearing package/provider files, private key/certificate formats,
  and database exports. Its fixtures prove 13 unsafe paths are rejected while
  four legitimate documentation/schema paths remain allowed.
- `npm run security:env-source` checks actual environment expressions in browser
  and server/API/Edge source. Browser usage is allowlisted; dynamic browser access,
  Node environment access from browser source, secret-shaped/unknown public names,
  and browser environment APIs in server source fail closed. Eight fixtures pass.
- All production build commands (`build`, `build:storefront`, `build:admin`,
  `vercel.storefront.json`, `vercel.admin.json`) automatically execute completed-dist
  bundle secret scanning and fail closed with a non-zero exit code upon any finding.
- Failure gate proven with controlled temporary fixtures; clean local production-mode
  builds pass with 0 findings.
- Storefront and Admin prebuild lifecycles run the scanner regressions, value-free
  deployment-environment contract fixtures, repository scan, and import check.
- GitHub CI checks out full history and fails closed on the scanner regressions,
  environment-contract fixtures, tracked-sensitive-file policy, working-tree
  scan, and full-history scan before either production artifact is built.
- `npm run verify:map016-local` reproduces the complete local containment gate,
  then builds and boundary-scans both isolated production artifacts.

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
| Supabase last-used/log review | Partial — fresh multi-service evidence 21 Aug 2026 | Authenticated connector reviewed API (100-event sample), Auth (4), Edge (0), Postgres (40), Storage (3), and Realtime (37). No Auth error appeared; Edge had no observed execution. Six stock-view permission denials and two failed `supabase_admin` password attempts require follow-up. The bounded 24-hour samples do not prove all historic elevated-key use absent. |
| Replacement server secret installed | Verified for active Edge invite runtime 15 Aug 2026 | `invite-staff` version 5 ACTIVE; modern key maps consumed with no legacy fallback |
| Legacy API-key use disabled | Verified with authorization gap 14 Aug 2026 | Management state is disabled and old `apikey` use returns 401; explicit pre-disable owner confirmation was not recorded |
| Old JWT rejection verified | Blocked — elevated Bearer access remains | Public key alone exposed 26 rows; public key plus old service-role Bearer JWT exposed 30, matching the modern elevated key |
| Invitation operation boundary | Verified 15 Aug 2026 | Production migration permission postflight passed; rollback-only replay/conflict/stale-recovery test passed with no retained test row |
| Edge request boundary | Partial — denial paths verified | Exact-origin preflight 204; foreign/missing origin 403; exact-origin unauthenticated POST 401. Fresh 21 Aug receipt inspection found zero completed invitations; real Admin AAL2 invite still required. |
| Production consumer inventory | Verified for active static bundles; private env inventory open | Secure connector reconfirmed separate READY K2 storefront/Admin projects on 21 Aug, exact build-target markers, and no 24-hour runtime-error cluster. The connector cannot enumerate environment variable names; prepared BFF/private environment remains inactive/unproven. |
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

For an Admin `RATE_LIMITED` cluster, preserve correlation IDs and bounded
security-event evidence, determine whether the actor budget (360/minute) or
shared budget (6,000/minute) was reached, and revoke the affected provider/K2
sessions if compromise is suspected. Do not raise or bypass a limit during an
incident without first identifying the caller and downstream capacity risk.
The prepared budgets are not production controls until their migration and BFF
activation have permanent evidence.

For suspected staff-login stuffing, preserve only bucket action/scope/window/
count plus correlation IDs and safe reason codes; do not export HMAC subjects or
add raw IP/email evidence. Keep the prepared 20/IP/15-minute,
10/contact/hour, and 300/global/minute thresholds fixed during investigation
unless the incident owner documents the caller and provider-capacity impact.

For suspected pending-session MFA stuffing, preserve only the MFA bucket
action/scope/window/count, correlation IDs, and safe reason codes. Never export
the pending-session HMAC subject and never record the raw pending ID, cookie,
provider token, factor/challenge ID, authenticator code, or IP. Keep the prepared
10/IP/15-minute, 5/pending-session/15-minute, and 300/global/minute thresholds
fixed during investigation unless the incident owner documents the caller and
provider-capacity impact. The prepared boundary is not a production control
until its migration, BFF activation, and real-host denial/provider-suppression
behavior have permanent evidence.

For a suspected staff-password or recovery-link compromise, revoke all provider
and K2 sessions, preserve only correlation IDs and allowlisted reset/session
events, and verify the affected staff role and MFA factors through the approved
owner/provider process. Do not copy the recovery URL, token hash, password,
cookie, or provider session into incident notes. A password reset does not
replace or bypass a lost authenticator. The prepared recovery boundary is not an
incident control until its feature flag, exact provider template/callback,
durable pre-auth migration, single-use replay, global revocation, and real-host
denial behavior are proven. For suspected reset abuse, preserve bucket scope,
window, count, correlation IDs, and safe reason codes only; never export or try
to reverse the HMAC subject hashes, and never add raw email or IP columns to the
rate evidence.

For suspected malicious product-media upload, preserve the stable request
correlation, actor, receipt key, object path, content hash, declared MIME, byte
size, and dimensions without downloading or opening the object on a staff
workstation. Revoke the affected provider/K2 sessions when account compromise
is plausible; unassign the object from product records before removing it from
the public bucket; record whether registration completed or the Admin/AAL2
receipt-backed orphan cleanup
failed; and review adjacent actor/global rate events. Never copy raw file bytes,
tokens, provider errors, or unrestricted object metadata into incident notes.
The prepared upload boundary is inactive, so this procedure requires deployed
receipt/provider evidence before it can be described as rehearsed.

References: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys),
[securing the Data API](https://supabase.com/docs/guides/api/securing-your-api), and
[Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
