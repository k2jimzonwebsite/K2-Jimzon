import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
const full = ['--product-master-transport', '--customer-tariff-transport', '--category-policy-transport', '--references']
for (const args of [['--storefront-view'], [...full, '--storefront-view']]) {
  const result = spawnSync(process.execPath, ['scripts/prepare-imported-provider-fixture.mjs', '--case=invalid', ...args],
    { windowsHide: true, encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /STOREFRONT_VIEW_REQUIRES_FULL_STOCK_UNION/, 'Missing full base must refuse before filesystem access')
}
for (const args of [[], [...full, '--staff-stock', '--storefront-view']]) {
  const result = spawnSync(process.execPath, ['scripts/prepare-imported-provider-fixture.mjs', '--case=invalid', ...args],
    { windowsHide: true, encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /OWNED_IMPORTED_FIXTURE_NAME_REQUIRED/)
}
console.log(JSON.stringify({ checks: 4, passed: 4, providerWrites: false }))
