# Channel listing slices: local integration receipt

- **Updated:** 30 September 2026
- **Owning work:** IDEA-20260929-06, MAP-018 (Website membership and listing), with MAP-026 (shared channel inventory)
- **State:** Integrated on local `main`; locally rehearsed; not pushed, applied, deployed, or accepted on real hosts.

This receipt continues [`SESSION_HANDOFF.md`](SESSION_HANDOFF.md), which records the original 29 September request and owner-confirmed operating rules. The channel-slice snapshot and the applicable connector/intake branch work are now present on local `main`. The active queue remains `MASTER_ACTION_PLAN.md`; MAP-018 is still open.

## Result and operational boundary

- One canonical K2 product/SKU and physical inventory remains the source for Website and marketplace channels. Lot rows describe the same stock; they do not create extra SKUs or units.
- The prepared migration adds six disconnected shop records, a SKU-only `v_storefront_visible_skus` projection, lot `net_weight_g`, serialized per-SKU allocation writes, and guards against reductions/deletes that would leave shop offers above physical stock. It grants public roles access only to the projection, not `channel_listings`.
- The Storefront source now requires the Website projection for browse and direct SKU lookup. The view carries an Unlisted SKU only when it is published and Website-assigned; Unlisted stays hidden from browse. The Sheet can expand one SKU row into shared lot details using `getAdminLots`.
- The Smart Paste surface now reviews and copies JSON only. Product creation remains on the protected phone-first intake path; with its feature flag off, it creates no Draft. Browser-side product inserts were removed from the reviewed intake surfaces.
- No Website assignment rows are created by this migration. The protected Admin Website assignment writer/control and server-side order membership guard are still missing or unverified. Do not deploy the Storefront consumer until the view is applied and the order-side gate is verified.
- Production Website assignment rows were not enumerated by the 30 September read-only readiness run. Do not treat the 22 published products as Website members or automatically assign/unpublish them. Review intended membership before any visibility change.
- No live SQL, stock, listing, publication, provider setting, flag, deployment, or push changed in this work. Local rehearsal is not live behavior or physical-count evidence.

## Source and branch integration

The local `main` integration includes:

- Connector handoff corrections via merge commit `cedfc5d`.
- The two unique intake commits from `codex/intake-cleanup`, cherry-picked as `09c8b52` and `e662892`. The original branch ref remains; its two commits are not ancestry-merged, but their changes are integrated.
- The channel-slice snapshot from the `codex/channel-slices-20260929` working state, including its source, SQL, rehearsals, tests, apply packet, and operational records.

The remaining non-ancestor branch, `codex/map017-stock-grant`, was not merged wholesale. All 11 branch-only commits and their 14 file deltas were audited. The migration/rehearsal commit prepares the older/weaker `20260925_map017_stock_public_execute.sql` variant; the stricter reviewed and applied lineage is already on `main`. The other commits are 25 September status, backup, intake and Preview receipts that are superseded by the current 29 September readiness/production evidence and MAP state. Its `OWNER_QUESTIONS.md` edits would also remove newer pending 29 September owner decisions from `main`. No current authorization, recovery requirement or actionable MAP item was found in those deltas that is missing from the later records. Keep the branch ref for audit; do not replay the migration or merge its stale docs wholesale. Other old refs were not deleted, and remote branches were not changed.

The integrated local artifact set includes `src/context/StoreContext.jsx`,
`src/views/admin/Sheet.jsx`, `src/views/admin/SmartPasteModal.jsx`,
`server/admin-bff/lots.js`, `package.json`, the paired channel-slice migration
and rollback, the two SQL rehearsal fixtures, the two rehearsal scripts, and
`tests/single-master-inventory-contract.spec.js` plus the updated Admin logic
regression. Durable rules and handoff records are in the Brain, Master Action
Plan, Project Map, intake/apply runbooks, this receipt and the harness branch
follow-up. The intake cherry-picks also include the archived pre-change UI
copies and restore notes required by the intake decision register.

## Verification evidence

All commands below ran locally on the integrated source unless labeled read-only K2. The final Website-membership refinement received focused contract and rehearsal checks; later record edits were documentation-only.

| Check | Result |
| --- | --- |
| `npx playwright test --config=playwright.api.config.js tests/single-master-inventory-contract.spec.js tests/unlisted-product-ordering-contract.spec.js --reporter=dot` (final Website-membership change) | 15 passed |
| `npx playwright test --config=playwright.api.config.js tests/single-master-inventory-contract.spec.js tests/admin-logic-regressions.spec.js tests/spotlight-tour-contract.spec.js --reporter=dot` | 40 passed before the final Unlisted direct-link refinement |
| `npx playwright test --config=playwright.api.config.js tests/product-intake-contract.spec.js tests/admin-dialog-contract.spec.js --reporter=dot` | 16 passed |
| `npm run verify:development` | Exit 0 |
| `npm run rehearse:channel-listing-slices` | Exit 0 after the final Website-membership change; 11 SQL assertions passed, including Website-assigned and unassigned Unlisted cases; guarded writes refused invalid allocation/stock changes; rollback preserved an operationalized shop |
| `npm run rehearse:channel-chain-current` | Exit 0; baseline ledger stayed at `10|20260928092634`; channel objects were absent after rollback |
| Read-only K2 project preflight | Passed with `node --env-file=.env.local scripts/verify-k2-supabase-project.mjs` after the sandboxed request could not reach the management API; confirmed project `pixplcjqivlfflickobf` |
| Read-only K2 readiness | `node --env-file=.env.local scripts/k2-live-readiness.mjs` reported 8 verified, 2 owner, 3 connector, 0 failed; applies nothing |

The npm preflight wrapper did not load `.env.local` in this Windows harness and refused before the request with “management token missing”; the explicit Node `--env-file` invocation was used for the passing identity/readiness checks. The readiness receipt is written under ignored `.tools/current-production-backups/live-readiness.json`.

The readiness snapshot reports migration ledger latest `20260928092634`, channel chain unapplied, 30 products (22 live), 21 lots, and physical counts unproven. It classifies the public execute surface for owner review and reports the Vercel Preview, Cloudflare edge gate, and provider advisor as connector checks. These figures do not prove Website assignments, physical quantities, provider state beyond the named read, or end-to-end listing behavior.

## Ordered follow-through

1. Continue MAP-017/MAP-018 in dependency order. Before any provider/database change, run the exact K2 preflight and `readiness:k2-live`, require zero failed gates, obtain the explicit owner authorization naming the reviewed chain, and follow the current backup/recovery procedure.
2. Read existing Website assignment rows and review each candidate, including the 22 already-published products. Never infer assignment from publication.
3. Complete the protected Admin per-SKU Website writer and server-side Website order allow/deny check against the existing channel model. Do not create a parallel tag or use ad hoc SQL to assign products.
4. Only after the view, writer, and order gate are reviewed and the prerequisites pass, apply the exact chain in [`CHANNEL_SLICES_APPLY_PACKET.md`](../../runbooks/CHANNEL_SLICES_APPLY_PACKET.md), one migration at a time. Run the documented postflight and retain the rollback path.
5. Rehearse the Storefront allow/deny paths and verify both exact hosts. Keep assignment, reviewed product facts/media, staff physical counts, and real order acceptance distinct.
6. Continue MAP-026 shop identity/allocation reconciliation only from real exports and verified physical counts. No adapter or offer quantity is live from these rehearsals.

Recovery: if local source or SQL behavior fails, revert the local code/migration change and rerun the isolated current-schema rehearsal. For an authorized apply failure, use the apply packet's reverse-order rollback and backup recovery; export and preserve any entered `net_weight_g` values before rollback because the rollback drops that column. Do not improvise production SQL. The two preservation stashes remain available until the owner decides they are no longer needed.
