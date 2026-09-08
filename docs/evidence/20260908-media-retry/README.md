# Wholesale and media recovery evidence — 8 September 2026

Request: continue active MAP work, then prioritize the store's desktop and mobile
orientation experience. Recovery scope: IDEA-20260908-01 / MAP-028 I-002.

Wholesale transport test reproduced changed keys; pending-status browser test
failed before correction. Five final wholesale cases cover loss, service 503,
incomplete receipt, correction and actor disposal. Only matching reference/status,
valid server timestamp and explicit no-commercial-authority receipts update the
register. A label-text lookup failed despite the disabled textarea appearing in
the accessibility snapshot; the final test uses its textbox role/name.

Four original media cases failed for editable pending fields, upload/save racing
and old callbacks closing a replacement form. The final five cases also cover
correction. Media assignment reuses the shared operation hook; cleanupPending
keeps the original assignment key. A disabled fieldset freezes images/reason.
ImageUploadDropzone signals activity, synchronously guards duplicate upload and
ignores disposed responses; InventoryGrid's actor/role key resets its workspace.
Published-primary validation and explicit discard confirmation remain intact.

## Verification

- `npx playwright test --config=node_modules/.cache/coupon-verification/playwright.config.mjs`
  — 30/30 pass, 3.0 minutes. Ignored adapter imports the checked-in payment config
  and uses exclusive port 5297 instead of occupied 5195, explicit repository test
  and web-server paths, and local output directory. Reproduce normally with
  `npm run test:payment-ui` when 5195 is free. Config is now a protected-mode fixture.
- `npx playwright test --config=playwright.api.config.js tests/payment-recovery.spec.js tests/admin-command-retry.spec.js tests/admin-bff-contract.spec.js tests/admin-dialog-contract.spec.js tests/product-intake-contract.spec.js tests/release-ci-contract.spec.js`
  — 95/95 pass, 6.3 seconds.
- `npm run build:admin` — pass, prebuild security/import checks, 40-module Admin
  boundary, 187.36/300 kB application budget and 75-file emitted secret scan.
- Scoped `git diff --check` passes. PNGs here and in the wholesale-retry sibling
  show phone recovery. Cleanup and missing-receipt screenshots were inspected.

All catalog, media URLs and replies are fabricated/intercepted. These checks do
not prove committed assignments, physical file deletion, signed provider receipts,
deployed authorization or real staff acceptance. No provider, database, secret,
flag or deployment was changed. Aggregate npm test and remote CI were not run.

## Recovery and next action

Use the two pre-edit checkpoints under docs/design-checkpoints/20260908-wholesale-retry
and 20260908-media-retry. Reverse only Customers triage, media/dropzone lifecycle,
related hook categories, review key forwarding, actor keys and fixture routing.
Preserve all other dirty-tree work. Never delete media to undo a client fix.

I-002 retains intake/CSV lifetime audits, full authenticated navigation, legacy
reconciliation and real signed receipt acceptance. Owner prioritized store
desktop/portrait/landscape inspection next under IDEA-20260908-02 / I-009, then
return to intake/CSV. The MAP remains the only active backlog.
