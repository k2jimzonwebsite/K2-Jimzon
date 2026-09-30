# MAP-017/019/020 backend proposal for review

**Current direction after owner feedback:** The extra-project approach is
withdrawn. Prepare the exact guest dependency, backup and recovery payload
against existing canonical K2 `pixplcjqivlfflickobf`. No resource retry or paid
upgrade will proceed. The capacity-choice question is superseded. The sections
below preserve the earlier review and failed attempt; they are not current
provisioning instructions. Shared-K2 SQL/Preview connection remain unapplied
and require their exact payload review/approval. The historical-reference
backfill must preserve the owner's excluded UUID-only test-history decision.
Current unfinished actions live only in MAP-017/019/020.

Creation scope approved; provider rejected the attempt for free-project quota.
No new resource exists on readback. Schema/hosting scope remains prepared only.
This record is not an executable migration bundle or another backlog. Remaining
actions and decisions live in the owning MAP items.

## Verified baseline

- Feature source: `23ef44228a2c0d570c77ea9c588dcd1099668245`; later receipt-only
  commit `ee705f1aa71440a37d43271efd9ad87a8667363f` is pushed and synced.
- Existing production backend: `pixplcjqivlfflickobf`, Singapore region.
  Only this project is exposed; its branch list is empty. K2jimzon organization
  `dstfobgqgtklmbclhlgb` reports `free` / `tier_free` on current readback.
- Storefront Vercel project: `prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL`, team
  `team_C3Wf3dVUBjUqGQ4rndMTCchz`. Admin is a separate project/artifact.
- Provider metadata verified the stable feature alias:
  `k2-jimzon-git-codex-map017-guest-chat-preview-k2-jimzon.vercel.app`.
  Its root loaded the Storefront in the signed Chrome browser. GET
  `/api/storefront/messages` displayed Vercel `404 NOT_FOUND`; no chat was
  submitted. Protected connector fetch only returned an authentication redirect
  and does not prove application behavior.
- Signed-in Vercel CDN Routing shows active rule
  `2a20bd66-2ecc-4893-98c4-2b5c3f3c5cfd`, named
  `K2 Storefront BFF disabled gate`. Its only condition is
  `/api/storefront/:path*`, action status 404. The security-header rule is
  separate (`4bae5048-dbb7-453c-964a-f5fba1ec6275`).
- SU-483740 still contains the automatic acknowledgment and the owner-authorized
  sent follow-up, with no human guidance on this turn's readback.

## Quoted resource proposal

The owner selected K2jimzon (`dstfobgqgtklmbclhlgb`) for a resource quote only.
At 09:18:43 UTC on 30 September, the authenticated cost tool returned:

| Resource | Account-specific quote | Proposed disposition |
| --- | --- | --- |
| Separate project | $0 per month | Recommended for an empty isolated test backend |
| Development branch | $0.01344 per hour | Requires Pro per current docs; K2jimzon is Free, no upgrade/branch approval |

The exact proposed creation is one empty separate project named
`k2-guest-preview-20260930`, in K2jimzon, Singapore (`ap-southeast-1`), using
the $0/month quote. It copies no production database rows, Storage objects,
Auth users, private keys, provider settings or integrations. No resource has
been created. Its eventual reference cannot be filled in before provisioning.
`resource-quotes.json` preserves the original tool inputs/results and scope.
The owner subsequently answered "Authorize empty project at $0/month" for
this exact name, organization and region. Cost confirmation succeeded, then
`create_project` returned `BadRequestException`: an organization owner/admin
has reached the two-active-free-project limit. It returned no new reference.
Fresh project inventory exposes only original K2 as `ACTIVE_HEALTHY`, with no
candidate project; the organization remains Free. The attempt changed no K2
SQL, rows, settings, flags, plan, routing or resource status. Detailed outcome:
`resource-provisioning-receipt.json`.

[Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase#free-plan)
counts two active free projects across organizations in which each member is
Owner/Administrator; paused projects do not count. The connector does not expose
the other counted project. Do not pause production K2 or infer that another
project is unused. The extra-project approach is now withdrawn after owner feedback; do not retry
it or upgrade a plan under current steering. [Deployment documentation](https://supabase.com/docs/guides/deployment)
places branching on Pro; the hourly quote alone is not eligibility and does
not authorize upgrading K2jimzon.

Creation approval covers only this empty resource. It does not authorize the
still-unprepared schema bootstrap, Vercel variables/routing, Turnstile settings,
feature flags, production changes or test rows. Those exact dependent payloads
must be prepared and reviewed after the resource baseline is available. A
schema-only bootstrap remains necessary; provisioning alone proves no K2 route.

[Supabase branching](https://supabase.com/docs/guides/deployment/branching)
provides separate instances/API credentials and excludes production data and
Storage objects by default. Creation still needs exact authorization. The
documented [branch billing](https://supabase.com/docs/guides/platform/manage-your-usage/branching)
starts Micro compute at $0.01344/hour plus other usage, without Spend Cap coverage
or compute credits. The account-specific results above now replace an assumed
price; neither quote authorizes a paid plan or establishes unlimited usage.

Do not include production data or transplant database/Vault/provider signing
keys. If the branch alternative is selected later, review automatically cloned
configuration/Edge Function secret handling first. Keep outbound integrations
inactive. A branch
must prove schema replay; a separate project needs a reviewed schema-only
bootstrap. Neither mechanism is assumed to reproduce K2's manual/ledger drift.
If the owner chooses shared K2 instead, this proposal must be replaced by a
reviewed production apply/backup/recovery payload before any connection.

## Exact known hosting candidate

The local `preview-routing-rule-current.json` is the existing UI View Code
export. The proposed export adds a missing/negated Host condition matching only
the verified feature alias. It preserves status 404 for other hosts. It does
not alter path, rule order, security headers, Admin routes or deployment
protection. The unsaved UI form supported Host + Does not have + Equals and
exported the anchored/escaped host regex in
`preview-routing-rule-proposed.json`. The local form was discarded with Cancel;
Save and Publish were never clicked.

[Vercel project routing](https://vercel.com/docs/routing/project-routing-rules)
runs before deployment routes and supports negated Host matches. Saving stages
a provider change; publishing applies it immediately. Later approved execution
must update this existing rule, not add a duplicate or copy its export into
runtime `vercel.ts`. Provider Test Rules and exact-host verification remain
unperformed. Local predicate checks establish only the proposed hostname scope.

| Hosting input | Proposed exact scope/value |
| --- | --- |
| Environment scope | Preview, branch `codex/map017-guest-chat-preview` only |
| Server/backend pair | `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` from the approved isolated resource; resource ref is pending |
| Browser/backend pair | `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` must identify that same resource |
| Signing key | Fresh 32-byte `K2_GUEST_BFF_SECRET`, matching only the isolated database request key; new separate contact-HMAC key stays private |
| Origin allowlist | `K2_STOREFRONT_ORIGINS=https://k2-jimzon-git-codex-map017-guest-chat-preview-k2-jimzon.vercel.app` |
| Artifact target | `K2_DEPLOYMENT_TARGET=storefront` and provider project identity must match |
| Bot protection | Real `K2_TURNSTILE_SECRET_KEY` / `VITE_TURNSTILE_SITE_KEY` with that exact hostname/action; values and hostname approval remain pending |
| Server activation | `K2_STOREFRONT_BFF_ENABLED=true` only after approved schema/configuration and denied-route proof |
| Browser activation | `VITE_GUEST_BFF_ENABLED=true` last, on the same branch scope |
| Account activation | Remains off until its separate provider/contact/claim acceptance gates pass |

No key value is generated or included here. No service-role key belongs in this
BFF or browser. If branch-specific Vercel environment scope is unavailable,
stop and review an isolated hosting target; do not broaden Preview settings to
unrelated branches. Production values and the production API gate retain their
existing scope under this candidate. Admin BFF activation is separate.

## Database payload boundary

`backend-source-manifest.json` records current candidate source bytes/hashes,
not an approved application order or a complete new-project bootstrap.
The actual rollback evidence covers the historical application-schema chain
plus the corrected base, origin replacement, and optional final moderation
wrapper. That assembly is not a production or new-provider install bundle.

The initial chat dependency review needs identity preflight/migration/postflight,
guest preflight/boundary/postflight, and the corrected origin replacement.
Moderation must wrap the final origin version, with its Admin foundation and
coordinated direct-writer cutover; it cannot be applied alone. Global guest
activation also needs the account/wholesale/order-status/delivery/order-seeding
dependencies required by the complete prepared route inventory. Existing proof
does not establish that full set on a new provider.

Material effects require review: the base boundary adds and backfills
`guest_reference` on existing conversations; identity adds customer/commerce
links. The owner excluded old UUID-only test history from ownership migration.
Do not treat a new reference as a guest claim. On an isolated data-less target
there should be no old business rows; any shared-K2 proposal must reconcile the
backfill against the historical-row preservation decision explicitly.

The current live server is PostgreSQL 17.6. The new
[17.11 changelog](https://supabase.com/changelog) warns about custom-operator
recreation and certain extension changes. Read-only metadata found zero
non-extension custom operator estimators, zero ltree index opclasses, only
pgcrypto among the three relevant extensions, and zero public/private K2
functions calling PGP encryption. This removes those detected application
metadata blockers; it is not provider clone, encrypted-row, Vault or upgrade
proof. No database upgrade or reindex was requested or performed.

## Verification and recovery requirement

Local preparation verification passed eight hostname cases: only the exact
feature alias fails the proposed 404 gate's negated-Host predicate; production
names, the separate Admin name, immutable/unrelated Preview aliases and
prefix/suffix near-matches retain it. The path/status and single-rule shape
are preserved. All 52 manifest entries matched recorded byte counts and
SHA-256. `backend-preparation-receipt.json` records this local evidence and the
fresh browser readback: original path-only condition, status 404 and Save
disabled after Cancel. It is not Vercel Test Rules or host-response evidence.

The manifest can be rechecked without running application suites:

```powershell
$manifest = Get-Content docs/evidence/20260930-guest-continuity-rehearsal/backend-source-manifest.json -Raw | ConvertFrom-Json
foreach ($entry in $manifest.entries) {
  if ((Get-FileHash -LiteralPath $entry.path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw "Source drift: $($entry.path)" }
  if ((Get-Item -LiteralPath $entry.path).Length -ne $entry.bytes) { throw "Size drift: $($entry.path)" }
}
```

Use the exactly one authorized conversation only after the owner approves the
resource/payload/configuration and the prerequisites pass. Prove start and
same-browser reopen through the real host; deny history with missing/different
grant. Raw cookies, private signing/contact keys and challenge tokens must not
appear in evidence. Only the single conversation and its necessary canonical
identity/message/grant/nonce/rate artifacts are within that business test scope;
it does not authorize extra conversation rows.

For the edge rule, recovery restores the original path-only status-404 payload
on the same rule, then verifies the feature alias is blocked again. Restore
captured branch-scoped environment values and the prior feature deployment if
activation fails. Preserve test data until the owner approves any deletion;
record and clean up an approved temporary resource through its normal recovery
procedure. Empty-resource provisioning cannot alter production; if creation
fails, inspect the returned resource reference before retrying to prevent a
duplicate. Keep an initialized resource isolated and unused while its payload
is prepared. Do not delete it or enroll it in a paid plan under creation-only
approval. Production apply still requires fresh backup/preflight and its own
reviewed migration-specific recovery. Free-slot capacity/resource ref, final full
dependency/recovery payload, Turnstile configuration, provider Test Rules,
real-host behavior and independent review stay in MAP-017/019/020.
