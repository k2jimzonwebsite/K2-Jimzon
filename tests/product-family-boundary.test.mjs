import test from 'node:test'
import assert from 'node:assert/strict'
const mod = await import('../server/admin-bff/product-families.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {}
  throw error
})
const res = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v }, end(text) { this.body = JSON.parse(text) } })

test('family endpoint refuses unsupported verbs and unsigned-key writes', async () => {
  assert.equal(typeof mod.default, 'function', 'family endpoint missing')
  const method = res(), unsigned = res()
  await mod.default({ method: 'DELETE', headers: {} }, method)
  assert.equal(method.statusCode, 405)
  await mod.default({ method: 'POST', headers: {} }, unsigned)
  assert.equal(unsigned.statusCode, 400)
  assert.equal(unsigned.body.error.code, 'IDEMPOTENCY_KEY_REQUIRED')
})

test('family endpoint cannot operate on the storefront deployment', async () => {
  assert.equal(typeof mod.default, 'function', 'family endpoint missing')
  const oldTarget = process.env.K2_DEPLOYMENT_TARGET, oldMode = process.env.NODE_ENV
  try {
    process.env.K2_DEPLOYMENT_TARGET = 'storefront'; process.env.NODE_ENV = 'production'
    const response = res()
    await mod.default({ method: 'GET', headers: {} }, response)
    assert.equal(response.statusCode, 404)
  } finally {
    if (oldTarget === undefined) delete process.env.K2_DEPLOYMENT_TARGET; else process.env.K2_DEPLOYMENT_TARGET = oldTarget
    if (oldMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldMode
  }
})

test('family route declares protected POST and read-only GET in the sole router', async () => {
  const { ADMIN_BFF_ROUTE_CONTROLS } = await import('../server/admin-bff/router.js')
  const control = ADMIN_BFF_ROUTE_CONTROLS['product-families']
  assert.ok(control, 'family route missing')
  assert.equal(control.method, 'POST')
  assert.equal(control.csrf, true)
  assert.equal(control.idempotency, true)
  assert.deepEqual(control.additionalMethods.GET, { csrf: false, idempotency: false, rateLimit: 'database' })
})

test('family pending recovery binds literal payload and original actor without losing unknown outcomes', async () => {
  const recovery = await import('../src/lib/productFamilyRecovery.js').catch(() => ({}))
  assert.ok(recovery.productFamilyRecovery, 'family recovery missing')
  const storage = new Map(), io = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
  const actor = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222'
  const payload = JSON.stringify({ familyId: actor, expectedVersion: 0, name: 'Coffee', axes: ['Weight'], members: [{ sku: 'coffee', options: { Weight: '250 g' } }] })
  const held = recovery.productFamilyRecovery.hold(actor, actor, payload, io)
  assert.equal(recovery.productFamilyRecovery.read(actor, io).payloadText, payload)
  assert.equal(recovery.productFamilyRecovery.read(other, io), null)
  assert.throws(() => recovery.productFamilyRecovery.hold(actor, other, payload, io), /pending/)
  assert.equal(recovery.productFamilyRecovery.clear(actor, other, io), false)
  assert.deepEqual(recovery.productFamilyRecovery.read(actor, io), held)
})

test('fresh grouping reads require complete, well-formed family members and selected SKUs', async () => {
  const api = await import('../src/lib/productFamilyRecovery.js')
  assert.equal(typeof api.validFamilyRead, 'function', 'family read validator missing')
  const id = '11111111-1111-4111-8111-111111111111'
  const read = { ok: true, family: { id, name: 'Coffee', version: 1, axes: ['Weight'], taxonomyConsistent: true, members: [{ sku: 'a', name: 'Coffee a', status: 'Live', websiteStatus: 'Assigned · published', options: { Weight: '250 g' } }] }, products: [{ sku: 'a', name: 'Coffee a', status: 'Live', websiteStatus: 'Assigned · published' }] }
  assert.equal(api.validFamilyRead(read, ['a']), true)
  assert.equal(api.validFamilyRead({ ...read, products: [] }, ['a']), false)
  assert.equal(api.validFamilyRead({ ...read, family: { ...read.family, members: [{ sku: 'a', options: {} }] } }, ['a']), false)
  assert.equal(api.validFamilyRead(read, [], '22222222-2222-4222-8222-222222222222'), false)
  const empty = { ok: true, family: { ...read.family, axes: [], members: [] }, products: [] }
  assert.equal(api.validFamilyRead(empty, [], id), true)
})

test('admin family reads include current per-SKU lifecycle and Website assignment state', async () => {
  const reads = await import('../server/admin-bff/product-families.js')
  const data = {
    family: { id: '11111111-1111-4111-8111-111111111111', members: [{ sku: 'a', name: 'Coffee a', options: { Weight: '250 g' } }, { sku: 'b', name: 'Coffee b', options: { Weight: '500 g' } }] },
    products: [{ sku: 'a', name: 'Coffee a' }, { sku: 'b', name: 'Coffee b' }],
  }
  const resultByTable = {
    products: { data: [{ sku: 'a', status: 'Live' }, { sku: 'b', status: 'Draft' }] },
    channel_listings: { data: [{ sku: 'a', status: 'Active', publication_status: 'published' }] },
  }
  const client = { from(table) {
    const query = { select() { return query }, eq() { return query }, is() { return query }, in() { return query }, then(resolve, reject) { return Promise.resolve(resultByTable[table]).then(resolve, reject) } }
    return query
  } }
  const enriched = await reads.enrichAdminProductFamilyRead(client, data, ['a'])
  assert.deepEqual(enriched.family.members.map(member => [member.sku, member.status, member.websiteStatus]), [
    ['a', 'Live', 'Assigned · published'], ['b', 'Draft', 'Not assigned'],
  ])
  assert.deepEqual(enriched.products.map(product => [product.sku, product.status]), [['a', 'Live'], ['b', 'Draft']])
  await assert.rejects(reads.enrichAdminProductFamilyRead(client, data, ['a', 'missing']))
})

test('admin family reads can return an identified empty family snapshot without SKU queries', async () => {
  const reads = await import('../server/admin-bff/product-families.js')
  const family = { id: '11111111-1111-4111-8111-111111111111', name: 'Coffee Blend', version: 3, axes: [], taxonomyConsistent: true, members: [] }
  const data = { family, products: [] }
  const client = { from() { throw Error('empty membership must not issue an empty SKU lookup') } }
  assert.deepEqual(await reads.enrichAdminProductFamilyRead(client, data, []), data)
})

test('migration source declares no PUBLIC execution and exactly one bounded anonymous reader', async () => {
  const fs = await import('node:fs')
  const { scanSqlSecuritySurfaceText, deriveSqlEffectiveFunctionAccess, evaluateSqlFunctionAccessPolicy } = await import('../scripts/security-surface-inventory-core.mjs')
  const { EXPECTED_ANON_FUNCTIONS } = await import('../scripts/security-surface-policy.mjs')
  const source = fs.readFileSync(new URL('../supabase/migrations/20261021_product_families.sql', import.meta.url), 'utf8')
  const effective = deriveSqlEffectiveFunctionAccess(scanSqlSecuritySurfaceText(source, 'family.sql'))
  const report = evaluateSqlFunctionAccessPolicy(effective, ['public.read_storefront_product_families_v1(text[])'])
  assert.deepEqual(report.publicFunctions, [])
  assert.deepEqual(report.unexpectedAnonFunctions, [])
  assert.deepEqual(report.missingExpectedAnonFunctions, [])
  assert.ok(EXPECTED_ANON_FUNCTIONS.includes('public.read_storefront_product_families_v1(text[])'))
})
