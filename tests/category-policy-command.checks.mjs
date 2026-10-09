import assert from 'node:assert/strict'
import test from 'node:test'
import { validateProductMasterCommand } from '../server/admin-bff/product-master.js'

const categoryId = 'a1000000-0000-4000-8000-000000000001'
const payload = { categoryId, minimumDays: 120, expectedVersion: '0', reason: 'Reviewed shelf life' }
const set = (patch = {}) => ({ action: 'category_policy_set', payload: { ...payload, ...patch } })
const clear = (patch = {}) => ({ action: 'category_policy_clear', payload: { categoryId, expectedVersion: '1', reason: payload.reason, ...patch } })

test('set returns the signed category action and normalized decision', () => {
  assert.deepEqual(validateProductMasterCommand(set({ categoryId: categoryId.toUpperCase(), expectedVersion: 0, reason: `  ${payload.reason}  ` })), {
    action: 'category_policy_set', payload,
  })
})

test('clear omits minimumDays and retains the exact bigint version', () => {
  const command = clear({ expectedVersion: '9223372036854775807' })
  assert.deepEqual(validateProductMasterCommand(command), command)
  assert.equal(Object.hasOwn(validateProductMasterCommand(command).payload, 'minimumDays'), false)
})

for (const minimumDays of [90, 2147483647]) {
  test(`set accepts integer minimum boundary ${minimumDays}`, () => {
    assert.equal(validateProductMasterCommand(set({ minimumDays })).payload.minimumDays, minimumDays)
  })
}
for (const expectedVersion of ['9007199254740993', Number.MAX_SAFE_INTEGER]) {
  test(`version preserves ${expectedVersion} exactly as text`, () => {
    assert.equal(validateProductMasterCommand(set({ expectedVersion })).payload.expectedVersion, String(expectedVersion))
  })
}

for (const [field, values] of Object.entries({
  categoryId: [null, 123, '', 'Food', ` ${categoryId}`, 'a1000000-0000-0000-8000-000000000001'],
  minimumDays: [null, true, '90', '', 89, 90.5, 2147483648, Infinity, NaN],
  expectedVersion: [null, true, -1, 0.5, Number.MAX_SAFE_INTEGER + 1, '01', '-0', '1e3', ' 1', '1.0', '9223372036854775808', ''],
  reason: [null, 12345678, true, {}, '', ' short ', 'x'.repeat(501)],
})) {
  for (const [index, value] of values.entries()) {
    test(`set refuses invalid ${field} case ${index + 1}`, () => {
      assert.throws(() => validateProductMasterCommand(set({ [field]: value })), /^Error: REQUEST_INVALID$/)
    })
  }
}
for (const field of Object.keys(payload)) {
  test(`set refuses missing ${field}`, () => {
    const command = set()
    delete command.payload[field]
    assert.throws(() => validateProductMasterCommand(command), /^Error: REQUEST_INVALID$/)
  })
}
for (const command of [set({ actorId: categoryId }), set({ hierarchyBound: 10 }), clear({ minimumDays: null }), clear({ minimumDays: 90 }), clear({ expectedVersion: '01' }), clear({ reason: 12345678 }), clear({ categoryId: 'Food' }), { ...set(), actorId: categoryId }]) {
  test(`rejects extra or malformed category decision ${JSON.stringify(command)}`, () => {
    assert.throws(() => validateProductMasterCommand(command), /^Error: REQUEST_INVALID$/)
  })
}

test('existing update, status and delete commands keep their signed actions', () => {
  const commands = [
    { action: 'update', payload: { sku: 'K2-1', patch: { name: ' Product ' }, expectedUpdatedAt: '2026-10-04T00:00:00Z', reason: payload.reason } },
    { action: 'status', payload: { skus: ['K2-1'], status: 'Draft', reason: payload.reason } },
    { action: 'delete', payload: { skus: ['K2-1'], pin: '1234', reason: payload.reason } },
  ]
  for (const command of commands) assert.equal(validateProductMasterCommand(command).action, `product_master_${command.action}`)
  assert.equal(validateProductMasterCommand(commands[0]).payload.patch.name, 'Product')
})
