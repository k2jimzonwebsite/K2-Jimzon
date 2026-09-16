# Intake command recovery — 9 September 2026

Authority: IDEA-20260908-01 / MAP-028 I-002. Local preparation only.

This continuation finishes the previously dirty modal/service/hook slice for
manual checklist steps, reviewed Draft creation and first inventory. The modal
retains the submitted payload and outer command key, freezes review/dismissal,
and exposes one exact retry outside the disabled fields. A definitive rejection
allows corrected input with a new outer key. Existing inner request IDs remain
separate. Missing/malformed receipts and failed post-write reads preserve
uncertainty. Unmounting disposes the command continuation.

## Evidence

- The initial five-case suite reproduced duplicate Draft retry buttons; four
  cases passed. The sandbox launch had failed with Chromium `spawn EPERM`;
  the approved execution succeeded. No unresolved approval block remains.
- Three failing-first cases reproduced editable packaging-review controls,
  discarded uncertainty after post-write refresh failure, and a malformed Draft
  receipt described as a definitive failure.
- SQL review found that the older step fixture invented a `success` field.
  The corrected fixture uses the actual `sessionId`, `step`, `updatedAt`
  receipt from `20260812_admin_product_intake_bff_boundary.sql`. It failed
  against the success-flag check before the client was corrected. The client
  now verifies matching session/step and a parseable canonical timestamp.
- Final `npm run test:intake-ai-ui`: **9/9 passed**. Covers response loss for
  step/Draft/first inventory, failed refresh, incomplete receipt, pending-field
  freeze, rejection correction/new key, separate inner/outer inventory IDs,
  late Draft receipt after actor replacement, and both prior automatic-intake
  cases. The actor fixture explicitly remounts the modal, as the grid actor
  boundary does; it does not prove every full-workspace navigation path.
- Final `npx playwright test --config=playwright.api.config.js tests/product-intake-contract.spec.js tests/admin-bff-contract.spec.js tests/admin-dialog-contract.spec.js tests/release-ci-contract.spec.js tests/admin-command-retry.spec.js --reporter=dot`:
  **87/87 passed**.
- Final `npm run build:admin`: passed prebuild security/import checks, the
  40-module Admin boundary, secret scan and **188.92/300 kB** application budget.
- `git diff --check`: passed, with existing line-ending notices only.
- `phone.png` (375×812) and `desktop.png` (1440×1000) were inspected. The phone
  recovery panel is focused and has no document horizontal overflow. The retry
  is visible above the scrollable review; the existing dark Admin design remains.

All API replies/product values are isolated intercepted fixtures. No provider,
database migration, paid request, deployment or production data changed. This
does not establish one real signed receipt/event, RLS, physical-device, legacy
or full authenticated navigation acceptance. Full npm test was not run.

## Recovery and exact next action

Compare the pre-edit blobs in
`docs/design-checkpoints/20260909-intake-command-retry/README.md`, then reverse
only the scoped modal/service/hook and intake fixture/spec changes. Remove the
hook only after removing its import. Preserve unrelated dirty work, especially
the independent server evidence-cleanup correction. No database rollback applies.

I-002 remains the only owner of remaining work: adopt retained commands in
session creation, evidence upload, publication and the automatic field-review
callback; cover Sheet actor changes and forced close/reopen/full navigation;
then prove real signed receipt/audit replay after activation. Legacy uncertainty
and inner inventory identity/storage behavior still require their recorded
reconciliation review. MAP-017's exact-payload production authorization remains
a separate dependency; do not repeat phase one or infer activation from this work.
