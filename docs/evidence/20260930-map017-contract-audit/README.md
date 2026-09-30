# MAP-017 live contract and branch reconciliation

- **Captured:** 30 September 2026 (Asia/Singapore)
- **Owning item:** MAP-017, before MAP-018 database activation
- **State:** Local audit tooling and records updated; K2 read-only metadata verified; no production writes, provider changes, deployments, or pushes.

## Current K2 evidence

The documented identity command, `npm run preflight:k2-project`, confirmed project `pixplcjqivlfflickobf`. Its package script now loads the owner-controlled `.env.local`, fixing the earlier invocation that stopped before the request with `management token missing`.

After preflight, `node scripts/map017-evidence/export-live-schema-metadata.mjs .tools/current-production-backups/live-schema-metadata-20260930-contracts.json` ran the repository export SQL with `read_only: true`. The export contains schema/catalog metadata and boolean-only function authorization signals. It includes no business rows or raw function bodies. Its `exported_at` value is `2026-09-29T17:04:07.280841` (the field has no timezone suffix). The ignored local export SHA-256 is `52DE2F3D6F4A8C02C815ECE331CEC411751C738013D025395625781868AEB484`; the full export remains under ignored `.tools/current-production-backups/` and is not committed.

The explicit schema export audit reported **11 critical, 0 high** and remains `NON_CONFORMANT_CRITICAL`:

| Finding group | Count | Current disposition |
| --- | ---: | --- |
| Legacy anonymous RPC grants | 5 | Keep open until the signed guest replacement and preview continuity pass, then follow the MAP-019/020 owner-authorized cutover. |
| `supabase_admin` future-object defaults | 6 | Keep open pending the provider-support response and the exact owner-authorized correction path. |
| Other schema/function authorization findings | 0 | The reviewed contracts below now carry explicit live evidence. |

The five live legacy grants are `submit_order_request`, `submit_order_request_v2`, `submit_pasabuy_request`, `submit_storefront_chat_v1`, and `validate_coupon`. The six defaults are `anon` and `authenticated` for each of `FUNCTION`, `TABLE`, and `SEQUENCE` in `public`. No ACL was changed.

The auditor now distinguishes four expected anonymous guest capabilities from unreviewed grants: `get_storefront_chat_v1`, `get_order_conversation_v1`, `submit_order_message_v1`, and `submit_order_payment_receipt_v1`. Live booleans verify the server-generated conversation UUID scope and internal-message filter, or the order ID plus 32–100 character checkout-key scope, request replay checks, private receipt storage, and absence of receipt bytes from the guest response as appropriate. `get_order_payment_receipt_v1` and `list_order_payment_receipts_v1` are explicitly contracted as authenticated staff/AAL2 reads; live metadata confirms `auth.uid()`, `is_staff()`, and AAL2 signals. These contracts classify only the existing functions; they do not activate a BFF, guest migration, or new grant.

The ignored audit JSON is `.tools/current-production-backups/map017-schema-truth-audit-20260930-contracts.json`, SHA-256 `9FDF0C75A3CE088B6EFE47B183F4E5767E849451C81AF744A4C176223EA2A251`.

The documented `npm run readiness:k2-live` gate passed with **8 verified, 2 owner, 3 connector, 0 failed**. It reconfirmed the migration ledger at 10 entries, latest `20260928092634`; channel tables absent; no implicit `PUBLIC` execute; five expected and five legacy anonymous grants live; 13 signed-guest grants prepared but unapplied; and 30 products (22 live), 21 lots, with physical count unproven. The gate applies nothing and writes no rows.

## Local changes and verification

- `supabase/export-schema-metadata.sql` exports additional boolean-only live signals for the reviewed guest access scopes and receipt behavior.
- `scripts/schema-truth-core.mjs` records the six function contracts, checks expected role grants, fixed search paths, staff/AAL2 guards, and required live signals. A missing signal stays a high finding; a false guard stays critical.
- `package.json` makes both documented K2 gates load `.env.local`; `tests/k2-live-readiness-contract.test.mjs` protects that invocation.
- `docs/runbooks/K2_PRODUCTION_READINESS_RUNBOOK.md` records the current anonymous-execute classification, audit baseline, and package command behavior.
- `tests/schema-truth-tool.spec.js` verifies the guest and staff contracts and confirms `validate_coupon` remains an unreviewed critical grant.

| Verification | Result |
| --- | --- |
| `npx playwright test --config=playwright.api.config.js tests/schema-truth-tool.spec.js tests/map017-authorization.spec.js` | 36 passed |
| `node --test tests/k2-live-readiness-contract.test.mjs` | 6 passed |
| `npm run verify:development` | Exit 0 |
| `npm run preflight:k2-project` | K2 identity confirmed |
| `npm run readiness:k2-live` | 8 verified / 2 owner / 3 connector / 0 failed |

The complete release gate was not run because no live promotion was requested. The code and evidence are local on `main`; this receipt does not claim a push, provider apply, deployment, Website assignment, or physical stock verification.

## Branch reconciliation

At the start of this follow-up, local `main` was `ad46365`, clean, and 21 commits ahead of `origin/main` (`f95e384`). Branches were inspected read-only; no branch ref or remote was changed.

- `codex/channel-slices-20260929` is an ancestor of `main`; its working-tree slice was already committed as part of the local integration.
- The two unique `codex/intake-cleanup` changes are present on `main` as `09c8b52` and `e662892`; the original local/remote refs remain.
- `codex/map017-stock-grant` and `origin/codex/map017-stock-grant` retain 11 branch-only commits with the weaker stock-grant migration and superseded records. Keep them excluded; do not replay the migration.
- `origin/codex/real-inventory-listing-20260928` is a remote-only historical ref with eight commits not in `main` by ancestry. Its K2 identity preflight, apply gate, rehearsal, and identity tests match the current `main` files. Its Vercel configs instead use the earlier legacy `builds`/target-command candidate; local `main` has the newer Build Output candidate, while the old Preview receipt showed three functions at 300 seconds. Its dated provider notes are superseded by newer `MASTER_ACTION_PLAN.md` and System Brain receipts. Do not merge the stale branch tree wholesale.
- The other local work branches either point to `main` ancestors or have no unique patch requiring integration. Dependabot refs are separate dependency work and were not changed.

No GitHub push, remote branch change, K2 SQL write, provider setting change, or deployment occurred. Recovery is available through the preserved refs and Git history. The newly committed local changes can be reverted as one commit if the owner rejects the classification update; the live database remains unchanged.

## Exact next action

Keep MAP-017 active. Obtain the pending Supabase support response for the six provider-owned defaults, prepare the signed guest replacement and continuity proof for the five legacy grants, and obtain the specific owner authorization named by MAP-019/020 before any apply. Re-run the documented preflight and readiness gate, require zero failed gates, refresh and verify the required backup, and follow the ordered rollback packet. MAP-018 Website assignment and production inventory listing remain downstream: live Website membership was not enumerated, the channel chain is unapplied, and the 30 product/21 lot projections do not establish physical quantities. Do not auto-assign the 22 published products.
