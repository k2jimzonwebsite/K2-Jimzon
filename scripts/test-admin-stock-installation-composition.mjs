// MAP-018 / IDEA-20261011-01. Real owned preparation; no native/provider write.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const name = process.argv[2]
assert.match(name || '', /^oci-imported\d{2}$/)
assert.ok(!fs.existsSync(path.join(root, name)), 'Fresh owned fixture required')
const prepared = spawnSync(process.execPath, ['scripts/prepare-imported-provider-fixture.mjs', '--case=' + name,
  '--product-master-transport', '--customer-tariff-transport', '--category-policy-transport', '--references', '--staff-stock'],
{ windowsHide: true, encoding: 'utf8', maxBuffer: 1024 * 1024 })
assert.equal(prepared.status, 0, prepared.stderr)
const dir = path.join(root, name), record = JSON.parse(fs.readFileSync(path.join(dir, 'imported-composition.json')))
const contract = JSON.parse(fs.readFileSync('supabase/prepared/admin_stock_catalog_delta.json'))
assert.equal(record.stockReads?.expectedCanonicalSha256, contract.afterCanonicalSha256, 'Both reads must be composed into the exact calibrated target')
assert.equal(record.stockReads?.fragmentCount, 13)
assert.equal(record.stockReads?.sourceSha256, contract.source.sha256)
const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'guarded-package.json')))
assert.equal(createHash('sha256').update(pkg.sql).digest('hex'), pkg.sqlSha256)
assert.equal(pkg.protectedPlatformTables.length, 7)
assert.equal(pkg.expectedConnectorProject, 'pixplcjqivlfflickobf')
for (const name of ['read_admin_product_stock_v1', 'read_admin_lot_snapshot_v1']) assert.ok(pkg.sql.includes('create function public.' + name + '('))
assert.equal(record.providerWrites, false)
assert.equal(record.stockReads.nativeQualified, false)
console.log(JSON.stringify({ case: name, prepared: true, fragmentCount: 13, sqlSha256: pkg.sqlSha256, nativeQualified: false, providerWrites: false }))
