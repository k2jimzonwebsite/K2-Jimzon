import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { validateConsignmentCommand, handleConsignmentCommand } from '../server/admin-bff/consignments.js'
import { withConsignmentHandler } from './fixtures/consignment-handler-harness.mjs'

const count = (changes = {}) => ({
  operation: 'count', consignmentId: randomUUID(), itemId: null,
  code: '8001234567890', boxCode: 'IT-BOX-07', batchCode: 'LOT-27',
  bestBeforeDate: '2027-10-01', delta: 1, source: 'barcode', ...changes,
})
const validate = body => validateConsignmentCommand('consignment_packing', body, { deferDateWindowToReceipt: true })

test('packing accepts an unknown barcode without catalog descriptions or an expected quantity', () => {
  const body = count()
  assert.deepEqual(validate(body), body)
})

test('Italy box count accepts unknown product lot and date without inventing either', () => {
  const body = count({ batchCode: null, bestBeforeDate: null })
  assert.deepEqual(validate(body), body)
})

test('manual counters bind ±1 to an exact existing line and physical lot', () => {
  const body = count({ itemId: randomUUID(), code: 'K2-SKU-001184', source: 'counter', delta: -1 })
  assert.deepEqual(validate(body), body)
  for (const patch of [{ delta: 0 }, { delta: 2 }, { delta: -0.1 }, { itemId: null }, { source: 'camera-fake' }]) {
    assert.throws(() => validate({ ...body, ...patch }), /REQUEST_INVALID/)
  }
})

test('packing rejects invented fields, missing box and invalid supplied dates', () => {
  for (const patch of [{ srp: 750 }, { is_human_reviewed: true }, { boxCode: '' },
    { bestBeforeDate: '2027-02-30' }, { batchCode: null }, { bestBeforeDate: null },
    { consignmentId: 'another-manifest' }]) {
    assert.throws(() => validate(count(patch)), /REQUEST_INVALID/)
  }
})

test('removal, restoration and shipment decisions bind the reviewed packing revision', () => {
  for (const operation of ['remove', 'restore']) {
    const body = { operation, consignmentId: randomUUID(), itemId: randomUUID(), packingRevision: 7, reason: 'Packing entry correction' }
    assert.deepEqual(validate(body), body)
    assert.throws(() => validate({ ...body, packingRevision: -1 }), /REQUEST_INVALID/)
    assert.throws(() => validate({ ...body, packingRevision: '7' }), /REQUEST_INVALID/)
  }
  for (const operation of ['cancel', 'reopen', 'dispatch']) {
    const body = { operation, consignmentId: randomUUID(), packingRevision: 7, reason: 'Reviewed packing decision',
      ...(operation === 'dispatch' ? { acknowledgeVariance: true } : {}) }
    assert.deepEqual(validate(body), body)
    assert.throws(() => validate({ ...body, deleteProduct: true }), /REQUEST_INVALID/)
  }
})

test('the real staff BFF signs the exact packing command and preserves its retry identity', async () => {
  const handler = (req, res) => handleConsignmentCommand(req, res, 'consignment_packing')
  const body = count(), key = randomUUID()
  await withConsignmentHandler({ handler, command: async args => ({ data: { consignmentId: body.consignmentId,
    operation: 'count', commandKey: args.p_idempotency_key } }) }, async h => {
    for (let i = 0; i < 2; i++) {
      const response = await h.invoke(body, { key })
      assert.equal(response.status, 200)
      assert.equal(response.body.result.commandKey, key)
    }
    const requests = h.commandCalls()
    assert.equal(requests.length, 2)
    assert.equal(requests[0].body.p_action, 'consignment_packing')
    assert.equal(requests[0].body.p_payload_text, JSON.stringify(body))
    assert.equal(requests[1].body.p_payload_text, requests[0].body.p_payload_text)
    assert.equal(requests[1].body.p_idempotency_key, key)
  })
})

test('packing still requires the current staff role, AAL2 and CSRF before the provider command', async () => {
  const handler = (req, res) => handleConsignmentCommand(req, res, 'consignment_packing')
  for (const options of [{ aal: 'aal1' }, { role: 'Customer' }, { sessionActive: false }]) {
    await withConsignmentHandler({ ...options, handler, command: async () => { throw Error('Unauthorized command') } }, async h => {
      const response = await h.invoke(count())
      assert.notEqual(response.status, 200)
      assert.equal(h.commandCalls().length, 0)
    })
  }
  await withConsignmentHandler({ handler, command: async () => { throw Error('No CSRF command') } }, async h => {
    const response = await h.invoke(count(), { headers: { 'x-k2-csrf': '' } })
    assert.equal(response.status, 403)
    assert.equal(h.commandCalls().length, 0)
  })
})
