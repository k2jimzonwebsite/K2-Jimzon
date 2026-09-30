# Session handoff — channel listings and inventory

- **Updated:** 30 September 2026
- **Owning work:** MAP-017 permission/recovery and signed guest gates first;
  MAP-018 owns Website membership and production listing; MAP-026 owns later
  multi-shop reconciliation.
- **State:** The guest-chat owner decision is recorded and source checks pass
  locally. The isolated chat Preview branch is owner-approved for publication.
  Full production listing and inventory acceptance remain open.

The only active backlog is [`MASTER_ACTION_PLAN.md`](../../../MASTER_ACTION_PLAN.md).
Guest-chat evidence is in the [MAP-017 receipt](../20260930-map017-contract-audit/README.md).
Guest route procedures are in
[`GUEST_COMMERCE_BFF_RUNBOOK.md`](../../runbooks/GUEST_COMMERCE_BFF_RUNBOOK.md).
No database, provider, or production change is authorized by this handoff;
complete MAP-017's current preflight, readiness, backup, and owner-authorization
gates before any production step.

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
at `1e7b818`; the owner authorized pushing this branch for separate Storefront
and Admin Preview builds. The remote push and exact-host Preview proof remain
separate receipts. See the MAP-017 evidence for the exact changed files,
verification, audit identity, and recovery instructions.

## Exact next action

Publish only the authorized `codex/map017-guest-chat-preview` branch, confirm
both Preview builds are ready, and prove fresh signed-chat start, same-browser
reopen, and missing/cross-browser grant denial. Reconcile the separate
`get_storefront_chat_v1` grant and provider-owned defaults; complete MAP-017's
readiness/backup/owner-authorization gates before any cutover. Then proceed in
MAP order to MAP-018: implement and verify protected Website assignment and the
server-side Website order gate, review intended product membership and product
facts/media, reconcile real physical counts, and verify exact-host listing and
purchase behavior. Keep production fail-closed until those gates pass.

To recover the source change, revert commit `1e7b818` from the feature branch.
No database data change or production rollback is needed. `main` remains
unchanged by this handoff.
