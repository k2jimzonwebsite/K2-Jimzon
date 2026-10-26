# Product SKU merge — verified feature source, 26 October 2026

Owner: MAP-023 / IDEA-20261025-04. This receipt supersedes the earlier local completion claims below. Owner commit37f33f59 was present on codex/sku-merge-completion; its worktree was clean. Verification found important gaps and corrected them before the requested source push. No production schema or business-data write has occurred.

## What changed and why

The existing Admin Inventory Grid now has Combine approved duplicates. The existing AdminDialog presents the retained listing, all approved product identities and lots, quantities and eligibility refusals, then requires explicit review before combining. The three fixed groups remain One Fragrance001145<-001146/47/48, Carne001017<-001016/18, Prosciutto001020<-001019/21; there is no arbitrary merge or product-family workaround.

The existing Product Master recovery namespace, Web Lock, actor/current-session checks, CSRF, signed RPC and literal request/key are reused. Merge receipts validate their actual shape; stale reconciliation rereads the group rather than an undefined SKU. Lost reply/reload preserves the exact body/key; explicit canonical version refusal plus fresh complete group read is needed before replacing a decision. Existing update recovery remains verified. No stock edit, history deletion, lot recreation or new credential authority is introduced.

SQL now requires the real canonical public-listing prerequisites (human review, name/image/price, lifecycle and active shop-null Website ready/published assignment without validation errors), refuses unknown lifecycle states and asserts discontinued/unpublished source outcomes. Deterministic actual dependency-writer contention proves the NOWAIT merge refuses without partial application and sees the committed reservation. Before/after snapshots and one-group receipt retain lineage and every original lot ID/quantity/metadata; original product/history rows remain. Clearance-dependent eligibility changes refuse rather than inventing replacement approval.

Read-only captured schema and the exact installed permission profile now live in tracked docs/acceptance files. Previously they were ignored docs/evidence files, leaving clean clones unable to rehearse or run readiness. Readiness recognizes only the already-approved family reader; no grants changed.

## Verification and practical limits

Evidence directory: product-sku-merge-20261026/ (relative to this receipt).

| Evidence | Result |
| --- | --- |
| npm run test:product-sku-merge | 32/32 Node checks, exit0; actor/allowlist/persistence/literal transport/readiness |
| SQL rehearsal final sql-confirm.log + sql-receipt.json | 23 checks, exit0; synthetic64units/two preserved lots, signed real captured verifier/triggers, stale/dependency/role/refusal, exact replay, real concurrent reservation insertion; own PostgreSQL stopped |
| Existing Product Master recovery browser suite | 21 passing; combined initial run23pass/1newnoticefailure retained in ui-final.log |
| Final merge browser suite ui-confirm2.log | 3/3 exit0; mobile375/desktop1440, lost reply/reload/exact retry, stale reconciliation, active reservation disabled |
| npm run verify:development | exit0 after final production edit; source/security/import checks |
| Separate Admin production build | exit0; boundary/secrets pass,227.44/300.00kBminified; no budget change |
| K2 preflight/readiness | correctpixplcjqivlfflickobf;8verified/2owner/3connector/0failed; no provider write |
| Independent initial/follow-up review | Five important gaps corrected; no remaining Critical/Important blockers to feature-branch push |

Browser images are synthetic fixture captures, not production observations. Only the Prosciutto-shaped synthetic stock example was executed in SQL; the three groups share the same fixed operation and all validator groups are tested. This is not full production/physical-stock acceptance or populated-provider rollback proof. Initial localhost-restricted transport failure, missing initiating UI red tests, missing publication-gate red, fixture-only permission cleanup failure, and stale-notice browser failure are retained locally; passing successor receipts do not rewrite those outcomes.

## UI review

| Before | After | Why |
| --- | --- | --- |
| Recovery-only dialog; no initiating workflow | Existing Inventory Grid opens a protected group/lot preview | Staff can review exactly which listing and stock remain |
| Update-only receipt shape and undefined-SKU reconciliation | Merge-aware original-body retry and current group read | Unknown outcomes remain recoverable across reloads |
| No rendered refusal or explicit confirmation | Textual refusal, disabled save, review checkbox, current preview refresh | Preserve operational clarity and mobile/keyboard use |

The four required design skills preserve the existing dense Admin palette, type, buttons and accessible dialog. No decorative motion or design-system replacement was introduced. One batched375/1440 inspection and confirmation were performed.

## Current state and recovery

Locally qualified feature source only. Full release gate/exact-head CI, reviewed current provider packet, backup/restore safeguards, migration installation, and the actual approved one-group Admin application/readback remain owned by MAP-023. No claim that duplicates are already combined on the live store. Source rollback is a scoped revert; preserve existing recovery.git snapshot-11 and the detached old sku-merge checkout. Once any real merge applies, do not blindly revert data or replay SQL: use reviewed per-group lot/history recovery and preserve later operations.

---

Historical receipt (superseded where noted above):

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
