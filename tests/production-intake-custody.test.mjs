import test from 'node:test'
import assert from 'node:assert/strict'
import { CANONICAL_HUBS, CANONICAL_CUSTODIANS, normalizeHub, normalizeCustodian } from '../src/data/canonicalIdentities.js'
import { validateProductIntakeCommand } from '../server/admin-bff/product-intake.js'

test('staff intake choices and server accept only the verified Warehouse A custody', () => {
  assert.deepEqual(CANONICAL_HUBS.map(({ id, name }) => ({ id, name })), [
    { id: 'HUB-MNL-CENTRAL', name: 'Warehouse A, Bulacan' },
  ])
  assert.deepEqual(CANONICAL_CUSTODIANS.map(({ id, name, hub_id }) => ({ id, name, hub_id })), [
    { id: 'CUST-JENNA-MAE-GUERRA', name: 'Jenna Mae Guerra', hub_id: 'HUB-MNL-CENTRAL' },
  ])
  const body = {
    sessionId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1',
    inventoryRequestId: 'e74a4161-72ca-4d72-8f59-37aa690e1869', source: 'reconciliation',
    inventory: { quantity: 1, boxCode: 'OPENING-WAREHOUSE-A', batchCode: 'OPENING-20280401',
      expiryDate: '2028-04-01', isNonExpiry: false, unitCost: 0, ownerCode: 'K2',
      hubLocation: 'HUB-MNL-CENTRAL', custodian: 'CUST-JENNA-MAE-GUERRA', reason: 'Owner-confirmed opening inventory count.' },
  }
  assert.equal(validateProductIntakeCommand('intake_inventory', body).inventory.custodian, 'CUST-JENNA-MAE-GUERRA')
  for (const custodian of ['CUST-STAFF-ELENA', 'CUST-STAFF-MARCO', 'unknown']) {
    assert.throws(() => validateProductIntakeCommand('intake_inventory', {
      ...body, inventory: { ...body.inventory, custodian },
    }), /REQUEST_INVALID/)
  }
})

test('custody normalization recognizes real names and IDs without inventing locations or people', () => {
  assert.equal(normalizeHub('Warehouse A, Bulacan')?.id, 'HUB-MNL-CENTRAL')
  assert.equal(normalizeCustodian('Jenna Mae Guerra')?.id, 'CUST-JENNA-MAE-GUERRA')
  assert.equal(normalizeCustodian('CUST-JENNA-MAE-GUERRA')?.name, 'Jenna Mae Guerra')
  assert.equal(normalizeHub('Milan'), null)
  assert.equal(normalizeCustodian('Elena Santos'), null)
})
