import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
for (const args of [['--storefront-view'], ['--references', '--storefront-view']]) {
  const result = spawnSync(process.execPath, ['scripts/prepare-product-master-recovery-fixture.mjs', 'invalid', ...args],
    { windowsHide: true, encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /STOREFRONT_VIEW_RECOVERY_REQUIRES_FULL_STOCK_UNION/,
    'Incomplete prerequisite must refuse before any fixture access or preparation')
}
console.log(JSON.stringify({ checks: 2, passed: 2, providerWrites: false }))
