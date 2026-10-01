# Website assignment and order eligibility — 1 October 2026

IDEA-20261001-03; owning work MAP-018, with MAP-017/020 activation and
MAP-023 inventory integration dependencies. Branch: `codex/map017-guest-chat-preview`.
This is local preparation, not an applied migration, deployment or real-host acceptance.

The full production-listing goal requires a reviewed Website offer independent
of global publication. Read-only production evidence on 30 September found 30
products, 22 published and zero Website assignments; these records remain unchanged.

The existing protected Admin channels POST now accepts `website_listing_set`.
Its exact body contains action, SKU, boolean assignment, reason and the prior
`updatedAt` (NULL only for an absent row). It signs a distinct action and calls
`execute_admin_website_listing_command_v1`. The unapplied Admin channel boundary
requires canonical channels first, extends the installed signing allowlist with
a guarded single-marker change, rejects missing signing inputs explicitly,
serializes the product and listing, and records durable receipts/private audit.
Table and column browser mutation grants are revoked. Assignment changes neither
global publication nor inventory. Later unapplied paid-AI, marketplace and
moderation verifier definitions preserve the new action.

The latest unapplied signed-order replacement checks canonical `website`, NULL
shop, Active assignment, ready/published publication status and empty validation
errors before resolving identity or writing an order. Products must be reviewed,
have a name, image and positive price, and be Live/Active with `published=true`
or approved Unlisted. Unlisted with `published=false` remains purchasable through
its direct link. `K2WEB` becomes a safe HTTP 409 `PRODUCT_NOT_AVAILABLE` without
database details. Existing stock ownership and order-price calculation remain
with the canonical writers.

## Verification

| Command or evidence | Result and scope |
| --- | --- |
| Focused Website validator before implementation | Failed because the validator was absent. |
| First restored-schema SQL witness | Failed at `WEBSITE_ASSIGNMENT_BOUNDARY_MISSING`. |
| `node scripts/rehearse-website-listings.mjs` | Passed actual signed Admin allow, Staff/AAL1/anon deny, NULL/forged signature deny, strict payload/missing SKU, replay/conflict/stale version, assignment/pause/reassignment, direct browser write denial, missing/paused/draft/invalid listing and ineligible product denial, reviewed Unlisted with publication false, signed-order denial before records, signed-order success and full rollback. |
| Two relevant Playwright API suites | 87/87 passed: `tests/admin-bff-contract.spec.js`, `tests/guest-commerce-bff-contract.spec.js`. |
| Final focused Website/channel API cases | 3/3 passed after the final static-RPC source edit. |
| `node scripts/rehearse-map019-account-claim.mjs` | Passed affected synthetic bootstrap, rollback, apply, behavior, postflight and replay after adding the canonical channel prerequisite and fixture field. Its fixture server stopped. |
| `npm run security:surfaces` | Passed after replacing the unclassified conditional RPC name with two explicit literal calls. Zero dynamic operation gaps; source inventory only. |
| Final `npm run verify:development` | Exit 0. The first attempt failed at the conditional-RPC inventory gap; the focused fix passed before this successful final run. No release gate/build/deployment was requested. |
| Independent code review | Read-only reviewer found the NULL-signature bypass, later verifier compatibility and account rehearsal dependency regression; corrected and locally verified. It did not rerun SQL or provider checks. |

`local-receipt.json` contains the passing timestamp and exact ordered source
hashes. The witness installs 20 sources in one rollback-only transaction against
the exact loopback restored application database at `127.0.0.1:54388`. It also
executes the exact verifier bodies extracted from two later unapplied Admin
migrations sequentially; behavioral assertions exercise the final marketplace
definition. The paid-AI definition was installed, not independently behavior-tested.
This does not prove either full migration. Fake keys and fixture
identities remain local. Product/listing/order baseline counts are restored and
the new functions/audit table are absent after rollback. Both local servers are
stopped. Managed provider role membership, Vault, PostgREST, cookies and Turnstile
were not reproduced.

## Review limits and required recovery

The existing shared Admin verifier has source-level NULL handling weaknesses.
The new RPC denies these inputs explicitly, but no global verifier repair or
live exploit test is claimed. IDEA-20261001-04 / MAP-017/020 owns the broader fix.

The helper takes product locks before later stock work. Prepared purchase-hold
cancel/expiry/reconcile paths lock balances/lots before updating products.
Those hold RPCs are absent from the restored baseline; concurrent integration
remains a MAP-023 gate. Reconcile one lock order and prove all writers together
before activating those prepared paths with this helper. Sequential local
success is not a concurrency claim.

The 30 September frozen 18-source installer and its recovery captures are stale
after these source edits. Before any provider approval, recompose canonical
channel/assignment prerequisites, changed grants/functions/audit tables, exact
hashes and data-retaining deactivation. Refresh same-target backup/preflight;
complete off-site retrieval, real bot bindings, branch-only configuration and
all-route/exact-host evidence. The single authorized live conversation is unused.

Staff assignment UI, reviewed actual membership/facts/media/physical counts,
public projection cutover and server-authoritative shipping remain unfinished
in MAP-018/023. No live product, assignment, stock, order, schema, key, flag,
routing, setting, membership or deployment changed. Local recovery is a scoped
source revert preserving these receipts; production recovery is not prepared.

## Design-hook classification

`#8b1e2d` at the existing intake-image decoding test is a fabricated upload
fixture, not product UI styling. The hook finding is a false positive; the
fixture and detector/ignore rules were not changed.

The requested Impeccable document sidecar refresh used all four mandated design
skills and existing PRODUCT/DESIGN/CSS context. Only the ignored local
`.impeccable/design.json` cache was refreshed; DESIGN.md and product UI were
preserved. Its source hash, gray canvas metadata and current reading paragraph
now match the authoritative records. No new palette, font or motion was chosen.

| Before | After | Why |
| --- | --- | --- |
| Cached cream metadata and 125% root-size narrative predated current records. | Cache reads the approved gray canvas and browser-default root-size records, with a DESIGN.md hash. | Keep tool previews from reintroducing superseded assumptions. |

Exact next action: address MAP-017/020's shared signing input guards, then the
MAP-023 lock-order/fee controls and refreshed installation recovery; keep the
remaining staff/catalog/real-host work in their owning MAP items.
