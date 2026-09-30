# Session handoff — channel listings and inventory

**30 September continuation:** Remote main was revalidated as `f95e384` through
GitHub. The owner authorized the exact Supabase follow-up; message
`1a0f16f4e8f70d9f` was sent/read back at 08:29:58 UTC in SU-483740; guidance is
pending and support access/project changes remain unauthorized. Three local
guest prerequisites were corrected and behaviorally verified: cookie-grant
propagation, identity provenance in both function versions, and canonical
Website enum compatibility. Base/origin/origin-then-moderation rollback
witnesses and the 30 focused contracts passed, as did the final development
gate. Independent agent review could not run. Evidence/limits/recovery and
the next MAP-017/019/020 gate are in
`docs/evidence/20260930-guest-continuity-rehearsal/README.md`.
The one authorized K2 test conversation remains unused; no provider, production,
stock or listing change occurred. The inventory export/physical-count input
still has no new owner answer. This update preserves the full release and
inventory goal and the original dated receipts below.

- **Updated:** 30 September 2026
- **Owning work:** MAP-017 permission/recovery and signed guest gates first;
  MAP-018 owns Website membership and production listing; MAP-026 owns later
  multi-shop reconciliation.
- **State:** The guest-chat owner decisions are recorded and source checks pass
  locally. The isolated chat Preview branch is pushed and both builds are Ready.
  The owner authorized one K2 test conversation, but the exact-host write is
  blocked: Preview has no server-side Supabase settings, and the live signed-chat
  start function is unapplied. No test row was created. Full production listing
  and inventory acceptance remain open.
- **Branch/promotion state:** `origin/main` is `f95e384`; local `main` is
  `4e03016`, 23 commits ahead and not pushed. The separate remote
  `origin/codex/real-inventory-listing-20260928` is eight commits ahead of
  `origin/main`, while the owner-authorized chat Preview branch is synced at
  `8ec65c8`. No feature branches were integrated into or pushed to production
  `main`; MAP release gates remain open.
- The 30 September read-only follow-up found existing Supabase ticket
  `SU-483740`; its 24 September message is an automatic acknowledgment with no
  human reply. The current K2 Security Advisor shows 0 errors, 56 warnings, and
  7 suggestions; individual linter findings still need classification. No
  support reply or remediation was sent or applied.
- Fresh targeted read-only K2 SQL confirmed ten direct anonymous RPC grants,
  six public `supabase_admin` default-privilege groups, and two authenticated-
  only receipt readers. A complete metadata-only export was captured through
  the authenticated Supabase SQL connector on 30 September; after adding
  explicit staff/AAL2 contracts for the two receipt readers, its schema-truth
  audit reports 15 critical and 0 high (nine anonymous grant findings and six
  provider-default findings remain).
  The prior 11/0 and 8/2/3 readiness claims are unverified on this branch: the
  local readiness receipt names a different branch, and its npm commands are
  absent from the current manifest. See the MAP-017 evidence for details.

The only active backlog is [`MASTER_ACTION_PLAN.md`](../../../MASTER_ACTION_PLAN.md).
Guest-chat evidence is in the [MAP-017 receipt](../20260930-map017-contract-audit/README.md).
Guest route procedures are in
[`GUEST_COMMERCE_BFF_RUNBOOK.md`](../../runbooks/GUEST_COMMERCE_BFF_RUNBOOK.md).
The owner authorized exactly one new K2 test conversation record after its
required gates pass. No other database write, schema/grant change, provider
setting, Preview-to-production connection, or production release is authorized
by that decision. Current check results and blockers are recorded in the
MAP-017 receipt; complete the remaining MAP-017/019/020 dependencies first.

## 30 September recovery and source-file recheck

The 29 September backup/rehearsal receipt was preserved on local branch
`codex/channel-slices-20260929` at commit
`dd33ce174c005d607a23826548ea01abe39a3b4c`; its relevant evidence is
summarized here because its former path,
`docs/evidence/20260929-inventory-readiness/README.md`, is not present in this
checkout. The ignored local encrypted envelope is
`.tools/current-production-backups/current-20260929-pre-intake.k2backup`,
backup ID
`current-pixplcjqivlfflickobf-2026-09-29T034842871Z-ade8520855d3`, size
847,770 bytes, SHA-256
`ADE8520855D32206EF0A1C414BCB8EF50B1BB753337084380C092570C029304F`. Its
redacted restore receipt says the isolated restore had 51 public relations,
latest migration `20260928092634`, and ten excluded managed Vault entries.
The restore does not cover Storage bytes or provider configuration; owner
retrieval/decryption of this exact envelope has not been exercised.

The signed-in Drive profile was rechecked as `k2jimzonwebsite@gmail.com` at
`2026-09-30 07:29 UTC`. Metadata-only reads confirmed all three known backup
files remain `shared: false` under the existing owner-only folder
`1mQuU8Jj6eWhDr-lpZV3YJDtaEwfAh8yo`: envelope
`1XBBjX6mLSb87VxkdO33wlvL3o8NlD7eH` (847,770 bytes), redacted manifest
`13zZxeA8c_K135_aPBV7RaQPnpLqEDFcC` (686 bytes), and restore receipt
`1LPKIeJnM4xSotlYtGB65OijQuvVcBUoY` (395 bytes). The earlier receipt on
`dd33ce1` records an independent download/hash match for the envelope and
readback of both companion files; this 30 September check refreshed metadata,
not file contents.

That prior receipt also records rollback-only rehearsals on the isolated
restore: MAP-018 intake plus cleanup, ordered MAP-019/020 guest/account
cutover, and the combined chain. The three preserved SQL assemblies still
match their recorded hashes: MAP-018
`13A0B9EB3D12F5402C54071C1ABE536F7CA20F83FBBC33B82E23048D79186EA0`, guest
cutover
`18F9D58BA00797461FA19FE0BC0C0DF4AF0B9F2B3506023BAC8E1485DC7F741B`, and
combined
`A68B6CCD83F1F601CFE08851D12941498CD55A1A5FB739681BFCCE2EC9E5E65F`. Those
results establish local application-schema compatibility only; managed role,
Vault, Storage, provider, live-apply, exact-host behavior, real physical count,
and owner/staff acceptance remain open.

Both the Drive and Gmail profiles returned `k2jimzonwebsite@gmail.com`. The
Drive document searches for `inventory`, `stock count`, `physical inventory`,
`product batch`, and `SKU stock reconciliation` returned no results. Gmail
searches for stock-count/physical-count attachments in the last 90 days,
`inventory` in the last year, `"channel stock"`, and `SKU` in the last year
also returned no results. No channel export surfaced in those searches; they
do not prove that no source exists elsewhere or outside search indexing.
**Next owner input:** provide the channel export or its exact Drive location
and confirm the physical quantities/discrepancies. Codex will then compare
SKU/barcode/shop/lot balances and prepare the proposed reconciliation; no
stock or publication write is authorized by this search.

The latest audit-contract update is pushed on
`codex/map017-guest-chat-preview` at
`2fc1645b3f809d8dfdd0457dcb4ab116e9204c8c`. It changed
`scripts/schema-truth-core.mjs`, `tests/schema-truth-tool.spec.js`,
`MASTER_ACTION_PLAN.md`, `K2 Jimzon - Brain/OWNER_QUESTIONS.md`,
`K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md`, and the two 29/30 September
evidence records. The focused test passed 1/1, `npm run verify:development`
exited 0, and `git diff --check` passed. No production or `main` change
occurred.

## Owner-confirmed listing behavior

1. One SKU is one master product and one physical stock pool. Warehouse and
   expiry lots are sub-SKU records; marketplace aliases point to the canonical
   SKU.
2. A product is eligible for Website display and Website orders only when it
   has explicit Website assignment and passes review/publication rules.
   Publication alone does not prove Website membership. An unlisted product
   stays hidden, including by direct link.
3. Website price is distinct from marketplace price. Lot details include
   expiry, warehouse location/holder, quantity, and recorded weight.
4. Channel allocations share canonical physical stock and must not exceed
   available units. Importing product or marketplace listing facts creates no
   physical inventory.

## Verified and unverified state

- A fresh production Storefront read showed 22 published products. That is not
  evidence that all 22 have Website assignment or verified physical stock.
- The latest read-only inventory audit did not enumerate production Website
  assignments. Do not auto-tag or bulk-unpublish the 22 existing products.
- A protected Admin Website-assignment control and server-side Website order
  membership check remain missing or unverified.
- MAP-018's channel migration and projection must stay unapplied/unreleased
  until the ordered permission, assignment, and order gates pass.
- Product facts, media rights, physical counts, owner membership decisions,
  exact-host acceptance, and staff/customer acceptance remain open.
- No stock, product, publication, channel-assignment, provider, flag, or
  production deployment change was made in this work.
- Fresh exact-project SQL on 30 September confirmed ten migration rows, latest
  `20260928092634`, and absence of signed start/reply functions. The saved
  readiness receipt's 8/2/3 result is not current-branch evidence: it names
  `codex/map017-guest-chat-test-only`, and its npm commands are absent from the
  current manifest. Backup freshness and local restore evidence are summarized
  below; the older branch referenced an inventory-readiness receipt that was
  absent from this checkout.
- The compiled Storefront Preview client identifies K2. Vercel Preview
  environment settings have the `VITE_` Supabase variables; the signed server
  BFF requires `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, which are
  configured only for Production. Live K2 SQL confirms
  `start_guest_conversation_v1` and `append_guest_message_v1` are absent. The
  one test row is authorized but cannot be created through this Preview yet.
  No Vercel setting, chat request,
  or database row was changed.

## Guest-chat source slice

The owner confirmed current UUID-only Storefront conversations are test data
and may be left out. Their historical server rows were not migrated or deleted.
The prepared source removes direct browser chat RPC calls and the old UUID
pointer; a new opaque reference reopens only after the signed messages route
returns it under the current HttpOnly guest grant. The reference itself grants
no access.

The focused chat contracts passed 4/4, guest-commerce BFF and Turnstile
contracts passed 19/19, and `npm run verify:development` passed on the isolated
GitHub `main` baseline. The code candidate is `codex/map017-guest-chat-preview`
at `1e7b818`; it was pushed with handoff records at `31ffbb4`. Separate
Storefront and Admin Preview builds reached Ready, and signed-browser reads
loaded the Storefront catalog and Admin sign-in screen. The chat button was
visible, but browser-control clicks did not change page state; chat-open and
signed-route behavior remain unverified. No login or chat was submitted. See
the MAP-017 evidence for deployment IDs, exact URLs, verification limits, and
recovery instructions.

## Exact next action

Resolve the nine anonymous SECURITY DEFINER findings and six provider-owned
default-privilege groups recorded by MAP-017 before continuing through the
signed guest prerequisites in MAP order. The full export is complete, while
the old readiness receipt remains branch-mismatched and local exporter access
still hits network `EACCES`. Reply only in
existing ticket `SU-483740` after the owner explicitly authorizes the specific
message; do not create a duplicate request or change provider defaults. When
`start_guest_conversation_v1` is ready, obtain the separate owner decision to
connect Preview's server BFF to shared K2 or name the approved isolated backend.
Then create exactly one authorized test conversation and prove same-browser
reopen and missing/cross-browser grant denial. After MAP-017 clears, proceed in
MAP order to MAP-018: implement and verify protected Website assignment and the
server-side Website order gate, review intended product membership and product
facts/media, reconcile real physical counts, and verify exact-host listing and
purchase behavior. Keep production fail-closed until those gates pass.

To recover the source change, revert commit `1e7b818` from the feature branch.
No database data change or production rollback is needed. `main` remains
unchanged by this handoff.
