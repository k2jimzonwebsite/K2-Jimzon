# Product SKU Merge — Local Implementation & Rehearsal Verification, 25-26 October 2026

Owner: MAP-023 / IDEA-20261025-04. The owner confirmed that repeated cards for One Fragrance, Borella Carne, and Borella Prosciutto are identical sellable items rather than variants, directed consolidation in Admin, and authorized implementation, source release, and exact data merges.

## 1. Scope & Constraints

- Canonical SKU groups:
  - **One Fragrance:** `K2-SKU-001145` <- `K2-SKU-001146`, `K2-SKU-001147`, `K2-SKU-001148`
  - **Borella Carne:** `K2-SKU-001017` <- `K2-SKU-001016`, `K2-SKU-001018`
  - **Borella Prosciutto:** `K2-SKU-001020` <- `K2-SKU-001019`, `K2-SKU-001021`
- Guarantees & Constraints:
  - Every source product row and historical reference is preserved; source rows are discontinued with website assignments cleared.
  - All lot IDs, barcodes, lot quantities, package identity, and metadata are conserved.
  - Zero arbitrary SKU merges; strictly restricted to the 3 allowlisted groups.
  - Never uses product families for these groups.
  - Signed, idempotent, actor-bound command through existing Admin AAL2 Product Master RPC.
  - Atomic refusal on active reservations, stock allocations, family memberships, active orders, or package identity mismatches.
  - Ineligible groups fail immediately with `K2_SKU_MERGE_BLOCKED` before state-hash checks.
  - Signed command argument stays compact (`groupId`, `expectedStateHash`, `reason`) under the 16KB `verify_admin_bff_request` ceiling; full before/after snapshots are captured directly in `k2_private.product_sku_merge_events`.

## 2. Changed Files

- `supabase/migrations/20261025_product_sku_merge.sql`: Signed Product Master merge RPCs (`read_admin_product_sku_merge_v1`, `execute_product_sku_merge_v1`, state hash, audit table).
- `scripts/rehearse-product-sku-merge.mjs`: Isolated PostgreSQL 17 rehearsal test suite verifying all 19 positive, negative, idempotency, and lot-conservation invariants.
- `server/admin-bff/product-master.js`: Admin BFF validation, error mapping, and GET `group` preview handler.
- `src/lib/productSkuMerge.js`: Shared SKU group definitions and compact payload validator.
- `src/services/adminBffService.js`: `getAdminProductSkuMergeBff(group, signal)`.
- `src/lib/productMasterCommandRecovery.js`: Admitted `action === 'merge'` in payload text validator.
- `src/views/admin/ProductMasterRecovery.jsx`: Supported pending merge recovery decisions without payload mismatch.
- `scripts/k2-installed-readiness.mjs` & `scripts/k2-live-readiness.mjs`: Profile updated for 29th approved function (`read_storefront_product_families_v1`).
- `tests/admin-product-sku-merge.test.mjs`: Bounded merge payload and group allowlist tests.
- `tests/admin-product-master-actor.test.mjs`: Actor binding, signed RPC dispatch, and preview tests.
- `tests/product-master-command-recovery.test.mjs`: Recovery storage and replay tests for merge commands.
- `tests/k2-installed-readiness.test.mjs`: Permission classification and drift refusal tests.
- `MASTER_ACTION_PLAN.md`: Active MAP-023 continuation tracking.

## 3. Verification Evidence

| Command | Status | Result / Details |
|---|---|---|
| `node tests/admin-product-sku-merge.test.mjs` | PASS | 2/2 pass (allowlisted groups verified, arbitrary groups refused) |
| `node tests/admin-product-master-actor.test.mjs` | PASS | 6/6 pass (actor binding, signed RPC, preview RPC) |
| `node tests/product-master-command-recovery.test.mjs` | PASS | 7/7 pass (merge commands held and reloaded cleanly) |
| `node tests/admin-product-master-recovery-client.test.mjs` | PASS | 2/2 pass (browser recovery client contract verified) |
| `node tests/k2-installed-readiness.test.mjs` | PASS | 15/15 pass (family reader profile verified, drift refused) |
| `node scripts/rehearse-product-sku-merge.mjs` | PASS | 19/19 checks pass on isolated PostgreSQL 17 (exit 0) |
| `npm run preflight:k2-project` | PASS | Confirmed project `pixplcjqivlfflickobf` and exact K2 Supabase URL |
| `npm run readiness:k2-live` | PASS | 8 verified, 2 owner, 3 connector, 0 blocked |
| `npm run verify:development` | PASS | Full development gate clean (exit 0; linters, security, git guardrails, contracts) |

## 4. Current State & Next Steps

- All local source, migration, rehearsals, and tests are verified clean on branch `codex/sku-merge-completion`.
- No live database writes or schema modifications have been performed.
- Recovery: Revert this continuation's source slice; `.tools/branch-cleanup-recovery-20261025/recovery.git` snapshot-11 remains intact.
- Next action: Commit verified work to `codex/sku-merge-completion` and push to remote.
