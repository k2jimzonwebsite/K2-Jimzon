# MAP-024 provider cutover evidence — 27–28 August 2026

## Scope and authority

The owner selected `k2jimzon.com`, authorized continued connector work, and used
`k2jimzonwebsite@gmail.com` for the Vercel account flow. Authenticated Hostinger,
Vercel, and Supabase CLI sessions were available. No credential value is stored
in this evidence.

## Permanently applied provider state

- Hostinger: domain active, privacy protected, transfer locked, expiry
  27 August 2027. Nameservers remain Hostinger-managed. Before cutover the zone
  had only apex A `2.57.91.91` and `www` CNAME `k2jimzon.com`; no MX/TXT records
  were returned.
- Hostinger DNS: apex A `216.198.79.1` and `64.29.17.1`; `www` CNAME
  `f683b7ff3d09cb06.vercel-dns-017.com.`; `admin` CNAME
  `be6a2ad6b5b189c6.vercel-dns-017.com.`; TTL 300.
- Vercel Storefront: project `k2-jimzon` owns apex and `www`, builds with
  `npm run build:storefront`, outputs `dist`, and redirects apex to canonical
  `www` with status 308.
- Vercel Admin: project `k2-jimzon-admin` owns `admin`, builds with
  `npm run build:admin`, and outputs `dist`.
- Each project has a separated, name-verified production environment matrix.
  Both BFFs and Admin password recovery remain disabled. Generated guest/cookie
  secrets were installed as Vercel secrets; no secret value was printed or
  committed.
- Project-level routes provide production security headers and fail-closed 404
  gates for the disabled API prefixes. The Admin route includes noindex and
  private/no-store.

Read-only Hostinger refresh on 28 August 2026 still reports the domain Active,
privacy-protected, transfer-locked, and expiring 27 August 2027. Nameservers
remain `cosmos.dns-parking.com` and `nova.dns-parking.com`; apex A remains
`216.198.79.1` and `64.29.17.1`, `www` CNAME remains
`f683b7ff3d09cb06.vercel-dns-017.com.`, and `admin` CNAME remains
`be6a2ad6b5b189c6.vercel-dns-017.com.`, all with TTL 300. This confirms
provider-held DNS state only; no DNS mutation occurred in this refresh.
Hostinger also exposes rollback snapshot `175986373` (27 August 2026
12:30:37Z), preserving the pre-cutover apex A `2.57.91.91` and `www` CNAME
`k2jimzon.com.` at TTL 300. This is a recovery anchor, not evidence that a DNS
restore or rollback rehearsal has been executed.

## Verification evidence

- Vercel verified all three custom domains after public DNS propagation.
- `https://k2jimzon.com/` returned 308 to
  `https://www.k2jimzon.com/`.
- Storefront and Admin returned HTTPS 200 with HSTS, anti-framing, MIME,
  permissions, referrer, report-only CSP, and no-store headers.
- Admin additionally returned `X-Robots-Tag: noindex, nofollow` and
  `Cache-Control: private, no-store`.
- `/api/storefront/status` and `/api/admin/status` returned 404 with the expected
  security headers; incomplete functions were not executed.
- Storefront referenced `/assets/index-CQhx62vZ.js`; Admin referenced
  `/assets/index-CSIJwC09.js`. The Admin route marker was absent from the
  Storefront bundle and present in the Admin bundle.

## Prepared but not applied

On 28 August, the repository added a non-recognized pure selector engine at
`scripts/map024-evidence/select-vercel-deployment-config.mjs`. It requires an
explicit target, project identity, reviewed mapping, and target configs; it has
no fallback and refuses missing, invalid, unmapped, mismatched, or absent-config
input. Four isolated-process contracts use synthetic project IDs and verify exact
selection/refusal without claiming provider identity. A refreshed authenticated
connector then returned both real K2 project IDs. Two additional failing-first
contracts bind them to their exact artifact configs and reject a swapped pair;
root `vercel.ts` now exports the selected config through Vercel's supported
programmatic configuration entrypoint and generic `vercel.json` is removed
locally. The current focused file passes 15/15. The final full API/source suite
passes 234/234; the rendered selling-surface
suite passes 2/2; prebuild passes; and approved-workspace Storefront/Admin builds
pass their 17-module and 21-module boundary scans plus artifact secret scans.
The first restricted local Storefront build attempt was denied access to the workspace
Vite config; its approved-workspace rerun passed. Both target configs remain
unchanged. No provider setting, deployment, BFF flag, DNS, Supabase state, or
real-host behavior changed. Preview function inventory and rollback remain open.

The same read-only Vercel refresh found the Admin latest production deployment
`READY` and Storefront latest production deployment `ERROR`. The Storefront
errors-only log records that the tracked-sensitive-file preflight could not
enumerate Git files because the Vercel checkout has no `.git` repository. The
gate was not bypassed. The Storefront project response also omitted the earlier
apex/`www` custom domains, while Admin still returned `admin.k2jimzon.com`; this
requires provider reconciliation before any promotion.

`supabase/config.toml` now records the production Site URL and exact K2/localhost
redirect targets; its broad `*.vercel.app` wildcard has been removed. It was not
pushed. The available CLI command applies the complete Auth config,
which risks changing unrelated production settings. A narrow Supabase Dashboard
or Management API update and real OAuth/password-reset callback tests remain the
exact next provider action.

Turnstile values, the Admin signed-command secret and matching database secrets,
BFF activation, revoke migrations, analytics, domain mail, SEO assets, complete
real-host customer/staff journeys, and rollback execution remain unverified.

## Connector-account boundary found during continuation

The Vercel connector session available after this evidence was captured lists
only the unrelated team `edgerzxcs-projects` and projects `scout-it`, `scoutit`,
`mission-control`, and `receipt-auditor-app`; it cannot read the K2 projects.
This does not invalidate the earlier owner-authenticated K2 evidence above, but
it means this session must not be used for K2 deployment, environment-variable,
domain, or project-setting changes. Obtain the owner-authenticated K2 Vercel
session before continuing MAP-024 provider reconciliation.

A read-only connector refresh on 28 August 2026 returned the same unrelated
Vercel team and Supabase `ScoutIT` project; the K2 projects remain unavailable
through this session. No provider or database write was attempted.

The same connector context's Supabase session lists only the unrelated `ScoutIT`
project and denies access to K2 ref `pixplcjqivlfflickobf`. No K2 SQL, migration,
or provider setting was changed through that session. Use the owner-authenticated
K2 Supabase session or the approved local production connection boundary for all
future K2 reads and writes.

## Prepared sitemap generator — not deployed

The local MAP-024 generator at
`scripts/map024-evidence/generate-sitemap.mjs` is pinned to the canonical
`https://www.k2jimzon.com` origin and accepts only a caller-supplied,
read-only catalog projection. It filters to customer-visible `Live`/`Active`
rows, requires a valid SKU and HTTPS primary image, validates optional
modification dates, emits deterministic home/catalog/product XML, and rejects
non-canonical origins, duplicate SKUs, unsafe/legacy-host images, and incomplete
rows.
`tests/map024-sitemap.spec.js` passes 3/3. This is prepared local code, not a
production catalog read or deployed `sitemap.xml`; do not run it with fallback
products or fixtures. Generation remains dependent on an owner-authenticated,
network-enabled K2 read after the persisted-hostname inventory gate. The
focused MAP-017/MAP-024/security suite passed 42/42, and the contract half of
`npm.cmd run test:contracts` passed 228/228. The chained selling-surface
browser step could not launch Chromium in the restricted runner (`spawn EPERM`)
and remains unverified; it did not exercise the sitemap generator. A fresh
`npm.cmd run build:storefront` retry passed all security, environment,
dependency, surface, import, and secret preflight gates, but Vite/esbuild could
not read the workspace config in the restricted Windows runner (`Access is
denied`), so no new build artifact or boundary scan was produced.

The same prepared discovery slice now pins home `canonical`, `og:url`,
`og:image`, and `twitter:image` tags in `index.html` to the exact canonical
`https://www.k2jimzon.com/` origin. The pure
`src/lib/storefrontMetadataOrigin.js` resolver preserves localhost and
unrelated staging origins for local verification and normalizes apex/Vercel
preview hosts to the canonical storefront origin. These values are local
artifact content only; product-specific initial-response fields, `sitemap.xml`,
and a real share-card fetch remain unverified and undeployed.

The prepared exact-host verifier at
`scripts/map024-evidence/verify-live-discovery.mjs` now checks the public home,
robots, sitemap, and optional product responses for exact status/content type,
canonical/share metadata, Admin exclusion, and canonical sitemap locations. It
returns only redacted summaries and its six fixture/CLI contracts pass. A
27 August attempt against `https://www.k2jimzon.com` failed closed before
writing an evidence file because the restricted runner could not open the
outbound public request (`MAP024_DISCOVERY_REFUSAL: GET / failed
(network-error)`). This is a local execution-environment result, not live-host
validation; rerun it from an owner-authenticated, network-enabled K2 session.
No provider, database, or deployment state changed. A 28 August elevated retry
was rejected by the host usage limit before the command could run, so no
live-host result or evidence file exists yet.

## Current-host reconciliation — 28 August 2026

The active Admin OAuth redirect default in `src/lib/adminAuthRedirect.js` now
targets `https://admin.k2jimzon.com/admin-portal-k2-secure`. The current Admin
security runbook, Operations Logic, README, Known Issues register, and System
Brain were updated to the same canonical Admin host, and the focused Admin
contract asserts it. Historical audit/evidence documents retain their old
Vercel host as historical target evidence; the current MAP-016 provider probe
now sends the canonical Admin origin, while the sitemap rejection fixture
retains the old host deliberately as an unsafe legacy-host case. Applying the
Supabase Auth allowlist, proving the callback end to end, and rehearsing rollback
remain open provider/real-host gates.

## Rollback and recovery

- Application: promote the prior known-good deployment separately in each
  Vercel project, then repeat host and bundle-boundary checks.
- Routing: disable the named Vercel project routes individually if a route
  transform is the cause; never enable a BFF by merely removing its 404 gate.
- DNS: revert only the web records to the captured pre-cutover values. Preserve
  any mail or verification records added after this evidence. TTL is 300.

Owning backlog item: MAP-024 in `MASTER_ACTION_PLAN.md`.
