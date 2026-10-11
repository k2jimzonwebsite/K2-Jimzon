import test from 'node:test'
import assert from 'node:assert/strict'

const module = await import('../server/admin-bff/references.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {}
  throw error
})
const { validateReferenceCreate, readAdminReferences } = module
const id = '11111111-1111-4111-8111-111111111111'
const body = { kind: 'brand', name: '  Caffè\u00a0Italia  ', parentId: null, reason: 'New catalog brand' }

test('creation preserves raw command strings and property order for saved retry identity', () => {
  assert.equal(typeof validateReferenceCreate, 'function', 'protected reference validator is missing')
  const original = { reason: body.reason, parentId: null, name: body.name, kind: body.kind }
  assert.equal(JSON.stringify(validateReferenceCreate(original)), JSON.stringify(original))
})

test('name bound counts Unicode characters after printable whitespace cleanup', () => {
  assert.equal(typeof validateReferenceCreate, 'function', 'protected reference validator is missing')
  assert.doesNotThrow(() => validateReferenceCreate({ ...body, name: ` ${'🪵'.repeat(120)}\u3000` }))
  assert.throws(() => validateReferenceCreate({ ...body, name: '🪵'.repeat(121) }), /REQUEST_INVALID/)
  assert.doesNotThrow(() => validateReferenceCreate({ ...body, name: 'Bottega\u00a0\u2002Italia' }))
  assert.throws(() => validateReferenceCreate({ ...body, name: '\u00a0\u3000' }), /REQUEST_INVALID/)
  assert.doesNotThrow(() => validateReferenceCreate({ ...body, name: '\ufeff' }))
  assert.throws(() => validateReferenceCreate({ ...body, name: `${'x'.repeat(120)}\ufeff` }), /REQUEST_INVALID/)
})

function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value },
    end(text) { this.body = JSON.parse(text) } }
}

test('endpoint refuses unsupported methods and missing command keys before dispatch', async () => {
  assert.equal(typeof module.default, 'function', 'protected endpoint is missing')
  const method = response()
  await module.default({ method: 'DELETE', headers: {} }, method)
  assert.equal(method.statusCode, 405)
  assert.equal(method.headers.Allow, 'GET, POST')
  const key = response()
  await module.default({ method: 'POST', headers: {} }, key)
  assert.equal(key.statusCode, 400)
  assert.equal(key.body.error.code, 'IDEMPOTENCY_KEY_REQUIRED')
})

test('endpoint cannot be used on the storefront deployment', async () => {
  assert.equal(typeof module.default, 'function', 'protected endpoint is missing')
  const previous = process.env.K2_DEPLOYMENT_TARGET
  const previousMode = process.env.NODE_ENV
  try {
    process.env.K2_DEPLOYMENT_TARGET = 'storefront'
    process.env.NODE_ENV = 'production'
    const res = response()
    await module.default({ method: 'GET', headers: {} }, res)
    assert.equal(res.statusCode, 404)
    assert.equal(res.body.error.code, 'NOT_FOUND')
  } finally {
    if (previous === undefined) delete process.env.K2_DEPLOYMENT_TARGET
    else process.env.K2_DEPLOYMENT_TARGET = previous
    if (previousMode === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousMode
  }
})

test('reference route advertises protected POST and a read-only GET', async () => {
  const { ADMIN_BFF_ROUTES, ADMIN_BFF_ROUTE_CONTROLS } = await import('../server/admin-bff/router.js')
  assert.ok(ADMIN_BFF_ROUTES.includes('references'), 'reference endpoint must be routed')
  const control = ADMIN_BFF_ROUTE_CONTROLS.references
  assert.equal(control.method, 'POST')
  assert.equal(control.csrf, true)
  assert.equal(control.idempotency, true)
  assert.deepEqual(control.additionalMethods.GET, { csrf: false, idempotency: false, rateLimit: 'database' })
})

test('controls are refused before cleanup and malformed strings never reach SQL', () => {
  assert.equal(typeof validateReferenceCreate, 'function', 'protected reference validator is missing')
  for (const value of ['Brand\nName', 'Brand\tName', 'Brand\u0085Name', 'Brand\u0000Name', '\ud800']) {
    assert.throws(() => validateReferenceCreate({ ...body, name: value }), /REQUEST_INVALID/)
  }
})

test('creation rejects extra fields, coerced values and ambiguous category parent', () => {
  assert.equal(typeof validateReferenceCreate, 'function', 'protected reference validator is missing')
  for (const value of [null, [], { ...body, role: 'SuperAdmin' }, { ...body, name: 123 },
    { ...body, parentId: id }, { ...body, kind: 'supplier' }, { ...body, reason: 'short' },
    { ...body, reason: 'x'.repeat(501) }, { ...body, kind: 'category', parentId: '' },
    { ...body, kind: 'category', parentId: 12 }]) {
    assert.throws(() => validateReferenceCreate(value), /REQUEST_INVALID/)
  }
  assert.doesNotThrow(() => validateReferenceCreate({ ...body, kind: 'category', parentId: id }))
  assert.doesNotThrow(() => validateReferenceCreate({ ...body, kind: 'category', parentId: null }))
})

// Isolate the transport, exercise the actual reader's completeness validation.
function client(results) {
  return { from(table) {
    const query = {
      select() { return query }, order() { return query },
      async limit() { return results[table] },
    }
    return query
  } }
}
const brand = { id, name: 'Existing brand' }
const category = { id, name: 'Existing category', parent_id: null }
const complete = {
  brands: { data: [brand], count: 1, error: null },
  categories: { data: [category], count: 1, error: null },
}

test('protected options retain category hierarchy and permit an empty catalog', async () => {
  assert.equal(typeof readAdminReferences, 'function', 'protected reference reader is missing')
  assert.deepEqual(await readAdminReferences(client(complete)), { brands: [brand], categories: [category] })
  const empty = { data: [], count: 0, error: null }
  assert.deepEqual(await readAdminReferences(client({ brands: empty, categories: empty })), { brands: [], categories: [] })
  const preserved = { ...brand, name: '\ufeff' }
  assert.deepEqual((await readAdminReferences(client({ ...complete, brands: {
    data: [preserved], count: 1, error: null,
  } }))).brands, [preserved])
})

test('partial, unavailable, over-limit or malformed options fail closed', async () => {
  assert.equal(typeof readAdminReferences, 'function', 'protected reference reader is missing')
  for (const result of [{ data: [], count: 1, error: null }, { data: [brand], count: 501, error: null },
    { data: [brand], count: null, error: null }, { data: null, count: 0, error: { message: 'private provider detail' } },
    { data: [{ id: 'bad', name: 'Bad' }], count: 1, error: null }]) {
    await assert.rejects(readAdminReferences(client({ ...complete, brands: result })), /REFERENCES_UNAVAILABLE/)
  }
  await assert.rejects(readAdminReferences(client({ ...complete, categories: {
    data: [{ ...category, parent_id: 'bad' }], count: 1, error: null,
  } })), /REFERENCES_UNAVAILABLE/)
})
