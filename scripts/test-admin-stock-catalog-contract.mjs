import fs from 'node:fs'
import assert from 'node:assert/strict'
import { assertAdminStockCatalogDelta } from './admin-stock-catalog-contract.mjs'
const read = file => JSON.parse(fs.readFileSync(file))
const before = read(process.argv[2]), after = read(process.argv[3])
const contract = read('supabase/prepared/admin_stock_catalog_delta.json')
const source = fs.readFileSync(contract.source.file, 'utf8')
assertAdminStockCatalogDelta(before, after, contract, source)
let refused = 0
const reject = (name, change, previous = false) => {
  const b = structuredClone(before), a = structuredClone(after)
  change(previous ? b : a)
  assert.throws(() => assertAdminStockCatalogDelta(b, a, contract, source), name)
  refused++
}
const added = c => c.functions.find(f => f.catalog.proname === 'read_admin_lot_snapshot_v1')
reject('unexpected existing body change', c => { c.functions[0].definition += '\n-- altered' })
reject('unexpected relation change', c => { c.relations[0].owner = 'authenticated' })
reject('unexpected defaults', c => { c.defaults.push({ unexpected: true }) })
reject('missing stock read', c => { c.functions = c.functions.filter(f => f.catalog.proname !== 'read_admin_product_stock_v1') })
reject('unexpected third read', c => { c.functions.push({ ...added(c), identity: 'public.unapproved_read()' }) })
reject('duplicate function identity', c => { c.functions.push(added(c)) })
reject('changed protected body', c => { added(c).definition += '\n-- altered' })
reject('changed owner', c => { added(c).owner = 'authenticated' })
for (const field of ['proacl', 'prosecdef', 'proconfig', 'provolatile', 'proparallel']) {
  reject('changed function ' + field, c => { added(c).catalog[field] = null })
}
reject('unapproved starting catalog', c => { c.schemas[0].owner = 'authenticated' }, true)
assert.throws(() => assertAdminStockCatalogDelta(before, after, contract, source + '\n-- changed')); refused++
console.log(JSON.stringify({ checks: refused + 1, passed: refused + 1, refused, providerWrites: false, scope: 'Exact captured calibration and unsafe-mutation refusals; native installer acceptance separate' }))
