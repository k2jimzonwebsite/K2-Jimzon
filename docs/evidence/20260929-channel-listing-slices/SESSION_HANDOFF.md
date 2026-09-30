# Session handoff - channel slices and branch integration

- **Updated:** 30 September 2026
- **Owning work:** IDEA-20260929-06; MAP-017's permission and recovery gates come first, MAP-018 owns Website membership/listing, and MAP-026 owns later multi-shop reconciliation.
- **State:** The original 29 September work is now integrated on local `main` and locally verified. It remains unpushed, unapplied, undeployed, and unaccepted on real hosts.

This file replaces the first branch-only handoff. The durable evidence and the exact ordered next actions are in [`README.md`](README.md), [`MASTER_ACTION_PLAN.md`](../../../MASTER_ACTION_PLAN.md), and [`CHANNEL_SLICES_APPLY_PACKET.md`](../../runbooks/CHANNEL_SLICES_APPLY_PACKET.md). The Master Action Plan remains the only active backlog.

## Owner-confirmed behavior

1. One SKU is one master product and one physical stock pool. Warehouse and expiry lots are sub-SKU rows, not new products. Marketplace aliases point to the canonical SKU.
2. A SKU appears on the Website only when it is explicitly assigned to Website and passes review/publication rules. Website membership is independent of `products.published`. Unlisted remains hidden from browse; its direct link works only when it is Website-assigned. At zero Website stock, show Request rather than treating another channel's stock as Website stock.
3. Website pricing is distinct from marketplace pricing. Lots show expiry, warehouse location plus holder, quantity, and weight where recorded.
4. Shop allocations share the master physical stock and must be capped by available stock. Importing product facts or marketplace listings does not create physical units.

## Integrated local work

- Channel migration `20260929_channel_listing_slices.sql` and paired rollback; six disconnected shop seeds; narrow SKU-only storefront view; lot weight field; allocation serialization and stock-reduction guards.
- Storefront projection gating and shared lot details in Admin Sheet.
- Smart Paste is review-and-copy only; protected phone-first intake remains the only reviewed Draft-creation route.
- Connector handoff branch merged as `cedfc5d`; intake branch's two unique commits were cherry-picked as `09c8b52` and `e662892`. The complete channel snapshot was restored onto `main` after those integrations.
- Focused source/security checks, current-schema/rollback rehearsals, and development verification passed; details and limits are in the evidence README.

The older `codex/map017-stock-grant` ref was excluded because it contains a superseded weaker ACL migration variant. The remote-only `origin/codex/real-inventory-listing-20260928` has eight commits not in `main` by ancestry, but its identity/apply/rehearsal code is represented on `main`; its older Vercel configuration and dated provider notes are superseded. Neither stale branch was merged wholesale. No branch was deleted and no remote branch was changed. MAP-017's 30 September audit is recorded in [`the follow-up receipt`](../20260930-map017-contract-audit/README.md).

## What remains open

- No production Website assignment rows were enumerated in the latest read-only check. Do not assume the 22 published products are assigned, and do not bulk-tag or unpublish them.
- There is no protected Admin Website assignment writer/control, and the server-side Website order-membership check remains missing or unverified.
- The channel migration has not been applied. The Storefront projection consumer must not be deployed before its view exists and the order-side gate is verified.
- MAP-017 permissions and signed-chat Preview proof, staff physical counts, product facts/media rights, owner membership decisions, MAP-020 exact-host/edge checks, and MAP-025 human acceptance remain gates. The owner resolved current UUID-only chats as test data to leave out; that policy choice is no longer pending.
- No live stock, product, publication, channel assignment, flag, provider setting, deployment, or release push occurred.

## Exact next action

Continue MAP-017 first in MASTER_ACTION_PLAN.md: the owner has resolved current UUID-only chats as test data to leave out, and local source now resumes only new signed guest references. Prove new-chat creation, same-browser reopen and missing/cross-browser grant denial on Preview; reconcile the direct-read grant disposition; and follow up the pending Supabase support response for the six provider-owned defaults. Before any cutover, obtain the exact owner authorization named by MAP-019/020, rerun K2 preflight and readiness, require zero failed gates, refresh and verify the backup, and follow the stop sequence in CHANNEL_SLICES_APPLY_PACKET.md. After MAP-017 clears, proceed to MAP-018's protected Website assignment writer and server-side order allow/deny gate, then measure intended Website membership and verify physical stock. Keep production fail-closed until each ordered prerequisite passes.

For the complete local and readiness receipts, commands, branch state, and recovery steps, see [`README.md`](README.md).

## 30 September guest-chat continuity follow-up

The owner confirmed all current UUID-only Storefront conversations are test
data and may be left out. The local feature branch
`codex/map017-guest-chat-test-only` now clears the old UUID browser pointer,
removes direct chat RPC fallback calls, and stores only a new opaque `CV-…`
reference as a lookup hint. Reopen validates that exact reference through the
signed, guest-grant-scoped messages route. The floating chat button no longer
claims “Resume Chat” from a UUID. Existing server rows remain untouched.

The legacy-path contract failed before the behavior change; the opaque-reference
resume contract also failed before its implementation. The focused chat set
then passed 4/4 with `playwright.api.config.js`; guest-commerce BFF and Turnstile
contracts passed 19/19, and `npm run verify:development` passed. Preview
behavior, the live direct-read grant disposition, and provider-owned defaults
remain open.
The full local source branch has not been pushed. Its 23 commits beyond GitHub
`main` made it a poor Preview transport, so a minimal local candidate was
prepared from GitHub `main` `f95e384eefaebf372f5e8037bd8fd1819118dc17`:
`codex/map017-guest-chat-preview` at commit `1e7b818`, containing only the three
chat source/test files. On that baseline, the 4/4 chat contracts, 19/19 guest
BFF/Turnstile contracts, `npm run verify:development`, and `git diff --check`
passed. The candidate has not been published; production source, database
grants, flags, provider settings, deployments and inventory remain unchanged.

Changed files: `src/components/shop/StoreChatPanel.jsx`,
`src/components/shop/StorefrontChatButton.jsx`,
`tests/map027-store-polish.spec.js`, `MASTER_ACTION_PLAN.md`,
`K2 Jimzon - Brain/OWNER_QUESTIONS.md`,
`K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md`,
`K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md`,
`docs/runbooks/GUEST_COMMERCE_BFF_RUNBOOK.md`, this handoff, and
`docs/evidence/20260930-map017-contract-audit/README.md`.
