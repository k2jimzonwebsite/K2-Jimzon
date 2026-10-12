import fs from 'node:fs'
import assert from 'node:assert/strict'
const modulePath = new URL('./storefront-view-catalog-contract.mjs', import.meta.url)
assert.ok(fs.existsSync(modulePath), 'Exact Website catalog delta validation is not implemented')
const { assertStorefrontViewCatalogDelta } = await import(modulePath.href)
const read = file => JSON.parse(fs.readFileSync(file))
const before = read(process.argv[2]), after = read(process.argv[3])
const contract = read('supabase/prepared/storefront_view_catalog_delta.json')
const migration = fs.readFileSync(contract.source.file, 'utf8')
assertStorefrontViewCatalogDelta(before, after, contract, migration)
let refused = 0
const reject = (name, change, prior = false) => {
  const b = structuredClone(before), a = structuredClone(after)
  change(prior ? b : a)
  assert.throws(() => assertStorefrontViewCatalogDelta(b, a, contract, migration), name)
  refused++
}
const view = c => c.relations.find(r => r.name === 'public.v_storefront_visible_skus')
reject('changed existing function', c => { c.functions[0].definition += '\n-- changed' })
reject('changed existing relation', c => { c.relations[0].owner = 'authenticated' })
reject('changed defaults', c => { c.defaults.push({ unexpected: true }) })
reject('changed schema', c => { c.schemas[0].owner = 'authenticated' })
reject('missing view', c => { c.relations = c.relations.filter(r => r.name !== view(c).name) })
reject('extra view', c => { c.relations.push({ ...view(c), name: 'public.unapproved_view' }) })
reject('duplicate view', c => { c.relations.push(view(c)) })
reject('extra column', c => { view(c).columns.push({ ...view(c).columns[0], name: 'price' }) })
for (const field of ['acl', 'options', 'view', 'owner', 'kind', 'policies', 'rules', 'triggers']) {
  reject('changed view ' + field, c => { view(c)[field] = null })
}
reject('missing row type', c => { c.types = c.types.filter(t => t.name !== 'public.v_storefront_visible_skus') })
reject('missing array type', c => { c.types = c.types.filter(t => t.name !== 'public._v_storefront_visible_skus') })
reject('changed array element', c => { c.types.find(t => t.name === 'public._v_storefront_visible_skus').element = 'public.products' })
reject('extra type', c => { c.types.push({ ...c.types[0], name: 'public.unapproved_type' }) })
reject('duplicate type', c => { c.types.push(c.types[0]) })
reject('unapproved starting catalog', c => { c.schemas[0].owner = 'authenticated' }, true)
assert.throws(() => assertStorefrontViewCatalogDelta(before, after, contract, migration.replace('p.published is true', 'true')))
refused++
console.log(JSON.stringify({ checks: refused + 1, passed: refused + 1, refused, providerWrites: false,
  scope: 'Exact native view metadata plus unsafe-delta refusals; complete installation acceptance remains separate' }))
