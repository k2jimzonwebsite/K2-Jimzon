# Authoritative delivery design and source review — 1 October 2026

IDEA-20260925-06, owning MAP-023; installation/activation dependencies MAP-017/020.
This is design evidence, not a backlog or implementation/release receipt.

The owner confirmed preserving the current region/weight prices and retaining
NCR express as separate Lalamove/Grab alongside J&T standard. Candidate and
decision log: `docs/specs/SHIPPING_AND_COURIER_LOGIC_SPEC.md`, current reconciliation.
No shipping source, schema, provider configuration, flag or fee changed.

The required process/design skills were applied to the existing checkout and
staff dialog: using-superpowers, brainstorming, multi-agent-brainstorming,
Karpathy, ui-ux-pro-max, impeccable, design-taste-frontend and emil-design-eng.
PRODUCT.md/DESIGN.md and the existing K2 surfaces govern identity. Impeccable's
context script ran once for `src/views/Checkout.jsx` and its brand register was
read; this produced context, not rendered acceptance or a runtime change.

## Current source and provider evidence

Checkout chooses a region/service but sends only browser amount/status through
StoreContext and the signed BFF. The latest SQL trusts those fields. Unknown
region currently falls through to Mindanao. Current actual Luzon increment is
₱35/kg, not the earlier shorthand ₱30. Weight estimation uses canonical display
quantity plus tare or 500 g fallback; it is not a measured package.

Read-only SQL on canonical project `pixplcjqivlfflickobf` returned 30 products,
22 published, no `products.shipping_%` columns, no delivery-locality table, and
the existing seven-argument staff delivery RPC. No business/contact rows were
read and no provider write occurred. The prepared shipping-dimensions migration
therefore must not be described as installed or populated.

## Official destination source

[PSA's publication page](https://psa.gov.ph/classification/psgc/regions) advertises
the 30 June 2026 publication. Direct shell retrieval encountered its managed
verification page; the browser's automatic verification completed and the
observed Publication link downloaded the official workbook. No CAPTCHA was
solved or security control bypassed. Source:
[PSGC 2Q 2026 publication](https://psa.gov.ph/system/files/scd/PSGC-2Q-2026-Publication-Datafile.xlsx).

The workbook is 3,250,889 bytes, SHA-256
`31892bc2bdde3ea0682562d9412b5bab4d45a0be5e5a5b4f6c9d7714b94bca5d`.
Metadata identifies PSA, publication date 30 June 2026, no access constraint and
required PSA attribution. Read-only openpyxl inspection of the PSGC sheet finds
43,768 unique ten-digit codes: 18 regions, 82 provinces, 149 cities, 1,493
municipalities, 42,010 barangays, 14 Manila submunicipal units and two grouping
rows without a geographic level. The national summary matches the main counts.
The grouping rows name Isabela (not a province) and the Special Geographic Area;
do not silently drop their descendants or invent a province.

A further read-only source check confirms Manila, Angeles, Zamboanga and Davao
are HUC rows without a matching real province prefix, and Isabela is a component
city under its non-province group. The 18 region records include NIR with code
`1800000000`. These are source observations, not a completed hierarchy
transformation/validation. The workbook's `Coding Structure` sheet has no cell
values; the final parent construction still requires the full orphan/cycle and
special-case acceptance described in the candidate.

Original download remains in Downloads; review copy is ignored under
`.tools/delivery-source-review-20261001/`. No transformed dataset or runtime
lookup is implemented yet. Source labels elsewhere on the site still say July
2025; do not use those page labels as the workbook version.

## Platform documentation review

Supabase's current [function documentation](https://supabase.com/docs/guides/database/functions)
requires explicit function privilege handling and a fixed search path when a
definer is necessary. New quote helpers must remain private; existing signed
public entries retain their authentication/rate/nonce controls.

The current changelog was downloaded as markdown to the ignored review folder.
The relevant [Postgres minor-release notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
covers legacy PGP ciphers, affected extension indexes and custom operator
recreation. It does not itself prove K2 is affected or authorize an upgrade.
The proposed tariff calculation adds none of those features. Full provider
recovery/version evidence remains in MAP-017/020/022.

## Structured design review

Sequential review under the installed multi-agent-brainstorming skill; reviewers
read source/design only and do not implement or call providers. Owner approach
acceptance remains pending; completed dispositions below are peer-design evidence.

Skeptic disposition: **REVISE**, for three material ambiguities; no architecture
rejection or YAGNI objection. Primary responses are incorporated in the candidate:

| Objection | Evidence / consequence | Resolution and rationale |
| --- | --- | --- |
| S1 / D2 — stale refusal versus uncertain commit | StoreContext retains the original payload/key; its fixed denial classification does not yet include a new stale result | Specify a distinct no-business-commit stale refusal that releases only the retained quote/key, preserves fields and requires a reviewed fresh preview. Uncertain outcomes retain the original payload/key; exact retry resolves saved ownership/order before any current rate/weight calculation. Input identity rejects older preview responses. Prevents stale retry loops and duplicate accepted orders. |
| S2 / D5 — historical acceptance classification | Legacy staff RPC changes statuses/timestamps; packing also recognizes waived | Use private immutable acceptance evidence and an all-writer order guard; same-amount metadata edits preserve original indicators. Define confirmed/platform-charged/zero-waived, status-only, timestamp-only, contradictory and unaccepted histories. Unresolved ambiguity refuses installation/activation; preserve legacy amounts without fabricating verified dates/rates/receipts. |
| S3 / D3 — unknown versus invalid quantity grammar | Shelf parser reads negative quantities as positive, treats ambiguous comma thousands as decimal and can overflow a multipack | Separate strict shipping grammar/version with explicit field precedence, supported units/decimals/multipacks, descriptive unknown fallback and malformed-number refusal. Bound unit/cart/fee arithmetic; prove parity only for valid canonical facts. Keeps the current estimate policy without treating malformed text as credible evidence. |

Constraint Guardian disposition: **REVISE**, for two bounded security/reliability
clarifications. No other material constraint blocker; performance remains an
implementation measurement gate. Primary responses are incorporated:

| Objection | Evidence / consequence | Resolution and rationale |
| --- | --- | --- |
| C1 / D5 — accepted writer can omit evidence | An existing-row-only guard is bypassed when initial manual confirmation creates accepted status without a ledger row | Require exactly one matching immutable acceptance row for every newly accepted insert/transition at transaction commit. Preserve initial staff-reported confirmation, serialize on the order, roll back both records on late failure, refuse omission/erasure/reconfirmation fee changes and keep evidence single on replay. Recovery suspends new intake while preserving accepted charges. |
| C2 / D2 — preview eligibility and disclosure | Public preview reads canonical facts; the existing order helper also initializes balances and takes write locks | Use a read-only version of the established reviewed Website offer predicate, with approved Unlisted support. Generic refusal leaks no canonical facts. Explicit buyer-response allowlist excludes costs/lots/private evidence; successful preview makes no business writes, while existing nonce/rate controls remain. |

These proposed resolutions were then reviewed by User Advocate and Arbiter;
they are not passing implementation tests. No owner approach acceptance is claimed.

User Advocate disposition: **REVISE**, for three bounded flow/copy clarifications;
U1's uncertainty principle is resolved in the revised design but unimplemented.
Primary responses are incorporated:

| Objection | Evidence / consequence | Resolution and rationale |
| --- | --- | --- |
| U1 / D2 — unresolved-attempt edit/reset and display | Existing edit button discards the key; region/service initialize apart from pending payload | Preserve original payload/key/items/locality/service/fee across remount/catalog refresh/pre-RPC refusals; no edit/reset until canonical resolution. A classified no-commit outcome permits correction and visibly reviewed fresh fee. No second request is silently started. |
| U2 / D4 — province-less/special-locality and pickup traps | Generic dependent selectors can demand an invented province; current textarea is required for pickup | Require only real hierarchy levels, reachable HUC/NCR/Manila/Isabela/SGA/NIR paths and explicit reset of incompatible express. Preserve saved free-text reference. Pickup bypasses all locality/street validation; server supplies the approved pickup address. |
| U3 / D1–D3/D6 — fee certainty versus service promises | Current unlabeled weight, calculated package count and fixed ETA/air-sea hints exceed evidence | Distinguish fixed accepted customer fee from estimated packed weight; no inferred actual parcel count or unsupported timing/transport claim. Staff confirms route/dispatch. Failed preview removes payable totals and names retry/correction/staff next action without private evidence. |
| U4 / D5 — editable staff acceptance and invented provenance | Existing modal misses waived acceptance and synthesizes checkout confirmation | Accepted charge/indicators are read-only, with neutral known provenance; metadata edits preserve original status/time and the note policy. Conflict keeps typed details and explains the restriction. Initial unaccepted manual confirmation remains available. |

All three reviewers have completed read-only review; primary accepted every
material objection above and revised its design. No runtime test evidence is
claimed.

Integrator/Arbiter disposition: **APPROVED**, peer-reviewed design acceptable for
the owner approach-acceptance gate. The Arbiter freshly read the final candidate,
complete decision/resolution log, relevant foundations and current calculator;
the tariff matches the current source. Accepted objections: S1/S2/S3, C1/C2 and
U1/U2/U3/U4, with each resolution above incorporated. Rejected objections: none.
No material design criterion remains unresolved. D1/D6 retain owner-confirmed
policy; D2–D5 remain proposed implementation details requiring owner acceptance.
The sequential review loop ends. This disposition does not authorize code/schema,
provider changes, flags or release and proves no runtime, performance, real-host,
carrier or physical acceptance.

S1 follow-up source review: StoreContext's pre-existing denial list also resets
pending state for bot/rate refusals on a retry, while the order handler validates
the challenge before SQL. That proves no write by this attempt, not no earlier
commit. The candidate now explicitly retains unresolved original payload/key
and displayed fee through pre-RPC denials, with fresh transport challenges and
no edit affordance that silently starts a second order. This tightens proposed
recovery behavior; current source and the older rulebook edit affordance remain
unchanged until design acceptance and implementation.

## Recovery and next action

Only design/source review is prepared. Withdraw this candidate by reverting its
documentation while retaining source provenance; no production rollback exists
or is needed for this slice. Exact outstanding review, implementation and
activation actions live in MAP-023 and its named dependencies.

The concrete owner approach question has been issued: recompute on submission
and lock the accepted fee (recommended), or persist expiring pre-order quotes.
The response is still pending; elapsed time is not acceptance. Local shipping
implementation has not started. The broader production-listing goal remains
active for engineering/provider and real stock/product/payment acceptance.

## Documentation handoff

Changed records: shipping specification and this source/reviewer receipt;
MAP-023; the existing IDEA-20260925-06 decision/register; System Brain; Project
Map/Architecture; and DESIGN.md's candidate-only interaction note. The owner's
unrelated IDEA-20261001-01 edit and `.backups/` are preserved and excluded from
this commit. No application, SQL, dataset or provider setting changed.

Verification for this documentation-only batch uses whitespace/index review,
tracked-sensitive-file policy and a secret scan. Application/database/browser
tests and the development/release gate are not repeated for documentation.
These checks do not verify the proposed runtime behavior. The next required
action is the pending owner approach acceptance in MAP-023, followed by its
failing-first local implementation and dependency-bound rehearsal. Candidate
recovery is a scoped documentation revert retaining this evidence.

Passing results before appending this verification receipt:

- `git diff --cached --check`: exit 0, only the eight named documentation files.
- `node scripts/verify-tracked-sensitive-files.mjs`: exit 0, git mode, 1,715 files.
- `node scripts/scan-secrets.mjs`: exit 0, 1,716 files; no secret values printed.
- The indexed Future Ideas content excludes exactly the owner's unrelated
  IDEA-20261001-01 row, and the working file remains byte-identical during staging.

Final whitespace/index review is repeated after this receipt only; no unchanged
application test suite or production run is required or claimed.
