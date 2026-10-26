import test from 'node:test'
import assert from 'node:assert/strict'
import { validateProductMasterCommand } from '../server/admin-bff/product-master.js'

const payload = () => ({ groupId: 'borella-prosciutto', expectedStateHash: 'a'.repeat(64), reason: 'Owner-confirmed duplicate listing' })

test('only the three approved groups enter the signed Product Master merge command', () => {
  for (const groupId of ['one-fragrance', 'borella-carne', 'borella-prosciutto']) {
    const body = { action: 'merge', payload: { ...payload(), groupId } }
    assert.deepEqual(validateProductMasterCommand(body), { action: 'product_sku_merge', payload: body.payload })
  }
})

test('merge refuses arbitrary groups, missing snapshots and extra stock or SKU authority', () => {
  for (const change of [{ groupId: 'other' }, { expectedStateHash: '' }, { expectedStateHash: 'a'.repeat(63) },
    { expectedStateHash: null }, { sourceSku: 'K2-SKU-999999' }, { quantity: 22 }, { reason: '' }]) {
    assert.throws(() => validateProductMasterCommand({ action: 'merge', payload: { ...payload(), ...change } }), /REQUEST_INVALID/)
  }
})
