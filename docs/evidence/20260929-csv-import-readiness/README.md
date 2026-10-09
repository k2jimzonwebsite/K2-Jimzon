# 29 September synthetic CSV importer readiness

**Owners:** MAP-018, MAP-020, MAP-023 and MAP-026; IDEA-20260929-01.
The owner requested dummy data for import verification. All database writes
below were limited to isolated localhost databases or rolled back. No K2
production product, lot, stock, publication, migration or provider setting
changed. The one-line legacy uploader correction is local feature-branch
source, not deployed behavior.

## Checks

- `npm.cmd run rehearse:marketplace-snapshots` exited 0 with isolated
  bootstrap, preflight, migration and replay, behavior assertions,
  postflight, non-destructive rollback and preserved staged evidence.
  The default sandbox initially blocked localhost PostgreSQL startup; the
  permitted rerun passed.
- `npx.cmd playwright test --config=playwright.api.config.js tests/catalog-spreadsheet-contract.spec.js --reporter=line`
  passed 9/9, covering schema, preview classifications, Draft-only new rows,
  signed atomic commit and remote-database refusal.
- `npx.cmd playwright test --config=playwright.api.config.js tests/marketplace-snapshot-contract.spec.js tests/marketplace-order-contract.spec.js --reporter=line`
  passed 14/14 with synthetic Shopee, Lazada and TikTok files, invalid bounds,
  duplicate/conflict behavior, exact variant suggestions and stock isolation.
- `npm.cmd run rehearse:catalog-spreadsheet` passed bootstrap, identity and
  commit migrations, behavior, security-event migration/assertions and
  emergency rollback in freshly created localhost
  `k2_catalog_rehearsal_20260929`. The server was stopped afterward. An
  unconfigured first run correctly refused to start.
- `npx.cmd playwright test --config=.tools/playwright.catalog.reuse.config.mjs tests/catalog-import-recovery-ui.spec.js --reporter=line`
  passed 3/3 using a separately started local Vite fixture server, now
  stopped. Cases covered exact retry after uncertain response, disposal on
  staff actor change and definitive rejection correction. A sandboxed
  Chromium run failed with `spawn EPERM`; the permitted managed-server
  retry hung at fixture load. The separate-server run exited 0.
- `npx.cmd playwright test --config=.tools/playwright.catalog.legacy.config.mjs tests/catalog-import-legacy-ui.spec.js --reporter=line`
  passed 1/1 with a dummy one-row CSV and mocked Supabase responses. The
  browser submitted `Draft`, `published=false`, no warehouse and no
  stock/quantity property, then showed the import refresh. This regression
  is registered in the normal payment/recovery browser suite.
- On the restored 29 September K2 application database, a transaction tried
  a synthetic direct-catalog insert with the legacy `draft` status and
  received `LOWERCASE_STATUS_REJECTED`. The same insert using `Draft`
  received `DRAFT_STATUS_ACCEPTED`; `ROLLBACK` followed. The test script
  was kept in ignored `.tools/check-catalog-insert-20260929.mjs` for
  reproduction. No row survives.
- After the final source edit, `npm.cmd run verify:development` exited 0:
  security tests, K2 project identity tests, sensitive-file/source boundary,
  dependency and surface scans, secret scan and import integrity all passed.
  `git diff --check` also exited 0.

## Change and remaining gate

`src/views/admin/BulkCsvImportModal.jsx` now sends `status: 'Draft'` in
the legacy direct path while retaining `published: false` and no inventory
write. The protected catalog import path already stages only unpublished
Draft metadata. Marketplace snapshot quantities remain observations and
cannot establish physical on-hand.

The Admin BFF, intake schema and marketplace staging are not activated on K2
production. Production's edge rule still returns 404 for Admin API paths,
Preview lacks server BFF variables, and Vercel reports a 300-second function
duration despite the target-specific source exports. Next: complete MAP-017/020
permission, recovery, target-duration and signed Preview gates; then verify a
dummy Draft import through the exact authorized host without publishing or
adding sellable stock. Real product/lot acceptance requires owner label,
photo and physical-count evidence later.

**Recovery:** revert the one-line `Draft` source change if it causes a
regression; the isolated SQL rehearsals have already rolled back or used their
scoped rollback, and the temporary local servers were stopped. Preserve
production BFF flags and the edge gate until the coordinated activation gates
pass.
