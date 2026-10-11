import test from 'node:test'
import assert from 'node:assert/strict'
import { readLotData } from '../server/admin-bff/lots.js'

const instant = '2026-10-11T05:00:00Z'
const snapshot = () => ({
  complete: true, schemaVersion: 'k2.admin-lot-snapshot.v1', asOf: instant,
  lots: [{ id: 'b1', sku: 'S1', quantity: 5, reserved_quantity: 1 }],
  products: [{ sku: 'S1', name: 'Dummy stock' }],
  reservations: [{ id: 'r1', batch_id: 'b1', sku: 'S1', order_request_id: 'o1', quantity: 1, status: 'active' }],
  orders: [{ id: 'o1', status: 'submitted', payment_status: 'pending' }],
})
function client(data, error = null) {
  return {
    rpc: async (name, args) => { assert.equal(name, 'read_admin_lot_snapshot_v1'); assert.deepEqual(args, { p_sku: 'S1' }); return { data, error } },
    // Reproduces the old separate-query handover race: physical before handover,
    // reservations after. Neither coherent state has physical6/reserved1.
    from(table) {
      const old = { product_batches: [{ id: 'b1', sku: 'S1', quantity: 6, reserved_quantity: 2 }], products: data?.products || [], inventory_reservations: data?.reservations || [], order_requests: data?.orders || [] }
      const q = { then: (resolve, reject) => Promise.resolve({ data: old[table], error }).then(resolve, reject) }
      for (const method of ['select', 'order', 'limit', 'eq', 'in']) q[method] = () => q
      return q
    },
  }
}
test('lot read derives physical and allocations from one coherent snapshot', async () => {
  const result = await readLotData(client(snapshot()), 'S1')
  assert.equal(result.derivedStock.S1.physicalQuantity, 5)
  assert.equal(result.derivedStock.S1.reservedQuantity, 1)
  assert.equal(result.asOf, instant)
  assert.equal(result.complete, true)
})
test('complete empty snapshot is a verified empty lot read', async () => {
  const data = { ...snapshot(), lots: [], products: [], reservations: [], orders: [] }
  const result = await readLotData(client(data), 'S1')
  assert.deepEqual(result.lots, [])
  assert.deepEqual(result.derivedStock, {})
})
test('partial, malformed, over-bound and refused snapshots cannot produce healthy totals', async () => {
  const cases = [null, { ...snapshot(), complete: false }, { ...snapshot(), lots: Array(201).fill(snapshot().lots[0]) },
    { ...snapshot(), lots: [{ ...snapshot().lots[0], quantity: null }] },
    { ...snapshot(), lots: [{ ...snapshot().lots[0], reserved_quantity: 6 }] },
    { ...snapshot(), orders: [] }, { ...snapshot(), products: [] },
    { ...snapshot(), reservations: [{ ...snapshot().reservations[0], batch_id: 'missing' }] }]
  for (const data of cases) await assert.rejects(readLotData(client(data), 'S1'), /LOTS_UNAVAILABLE/)
  await assert.rejects(readLotData(client(snapshot(), { code: '42501' }), 'S1'), /LOTS_UNAVAILABLE/)
})
