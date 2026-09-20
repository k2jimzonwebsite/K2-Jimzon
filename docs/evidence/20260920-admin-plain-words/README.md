# Admin plain-word refinement, 20 September 2026

Owner request: continue simplifying Admin words and subcategories without losing
operational logic. Permanent decision: IDEA-20260920-14. Owner: MAP-028 I-012;
real staff and target-host acceptance remain under I-012 / MAP-025.

## Scope and decisions

Continue the already accepted calm-Admin design, using humanizer in its plain
technical voice. Keep Source Sans, existing tokens, HelpTip and DetailBlock.
Assumptions: staff use phones and desktops for repeated daily tasks; existing
performance, scale, access controls and canonical records stay authoritative.
No new dependencies, routes, database changes or provider writes.

| Before | After | Why |
| --- | --- | --- |
| Inventory exception board / Product master | Inventory & stock checks / Products | Name what staff can find and check. |
| Product Identity | Product basics | Use familiar words for the first fields. |
| Content & Copywriting combines nine fields | Product description (three fields) and Use & ingredients (six fields) | Open the relevant group; both use existing instant disclosures. |
| Website & SEO / Management | Website settings / Status & staff notes | Make each group's contents clear. |
| Shop allocation matrix / Custody transfers | Stock by shop / Stock transfers | Use task names in the existing two views. |
| Rebalance / Apply rebalance | Review stock split / Save stock split | Distinguish reviewing a proposal from saving it. |

All field keys, values, validation, handlers, queries, permissions, status enums,
approval steps and save boundaries remain unchanged. The shortage explanation
keeps exact available/required quantities, the two-unit target and priority order.
The reason field and separate photo/publication/batch-save explanation stay visible.
Alternatives rejected: another page-level navigation layer, hiding warnings, and
combining product status with physical stock. Those add work or lose meaning.

## Verification

- Updated existing disclosure expectations failed first: 2 failed / 15 passed.
- Focused quiet-workspace, stock/transfer, guardrail and logic contracts: 43/43.
- Full contract phase: 692/692; selling-surface browser sub-suite: 8/8.
- Admin browser suite: 35/35, including navigation, phone bounds and access checks.
- Product editor browser run: 2/2, including keyboard disclosure activation,
  phone/desktop widths (375/1440), retained description and usage drafts after
  collapse/tab changes, delete refusal and exact-identity retry.
- Admin build and prebuild pass; application budget 201.20/300.00 kB minified.
- Test expectations changed only where visible text changed; recovery assertions
  remain. The fixture now uses the real admin-ui wrapper for relevant styling.

The first browser launch was blocked by sandbox EPERM. The authorized run outside
the sandbox passed. A later themed-fixture rerun timed out during module loading
while other suites were running (product-ui-timeout.log); its deletion test passed.
The isolated final rerun passed 2/2 (product-ui.log); its themed phone screenshot
was inspected. Source checkpoints were captured before implementation; a
before screenshot was not captured because that initial browser run was blocked.
Screenshots are local synthetic editor evidence, not production or measured staff
comprehension. Shop wording was checked against source behavior and engine tests;
real shop transfer/provider acceptance is not established by these checks.

## Changed files and recovery

Application: src/views/admin/InventoryGrid.jsx and ShopAllocationManager.jsx.
Tests: admin-product-master-ui.spec.js, admin-quiet-workspace-contract.spec.js,
admin-dashboard-redesign.spec.js and admin-logic-regressions.spec.js.
Records: FUTURE_IDEAS, operations rulebook, System Brain, DESIGN, and MAP-028.

Pre-edit files are in docs/design-checkpoints/20260920-admin-plain-words/. They
include the owner's pre-existing local edits. To undo this slice, compare those
copies with the current two components and reverse only this slice's labels and
extra DetailBlock boundary; align the four affected test expectations. Preserve
subsequent edits, security fixes and the decision/evidence records. Do not reset
the whole working tree.

Next action: complete representative staff comprehension, physical-device and
exact-preview acceptance through MAP-028 I-012 / MAP-025 before promotion. No
deployment or provider mutation was performed in this task.
