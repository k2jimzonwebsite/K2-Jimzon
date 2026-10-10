// MAP-018 / IDEA-20261010-08. Prepared native qualification; no product writer.
// Adapters must use genuine routed HTTP and the fixture's protected SQL observer.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

export const fixture = Object.freeze({
  sku: 'MAP018-TARIFF-ORDER-01',
  orderA: '76000000-0000-4000-8000-000000000001',
  stale: '76000000-0000-4000-8000-000000000002',
  orderB: '76000000-0000-4000-8000-000000000003',
  publishB: '76000000-0000-4000-8000-000000000004',
})
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const keys = [fixture.orderA, fixture.stale, fixture.orderB]
const observerContract = 'MAP018_TARIFF_BUSINESS_OBSERVER_V1'
const money = value => {
  assert.ok(typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)))
  const result = Number(value)
  assert.ok(Number.isFinite(result) && result >= 0)
  return result
}

function completeState(state) {
  assert.equal(state.contract, observerContract)
  assert.equal(state.fixtureSku, fixture.sku)
  assert.deepEqual(state.keys, keys)
  assert.deepEqual(state.orphanCounts, { snapshots: 0, items: 0, reservations: 0, conversations: 0, messages: 0 })
  assert.ok(Number.isInteger(state.stock.onHand) && state.stock.onHand >= 0)
  assert.ok(Number.isInteger(state.stock.reserved) && state.stock.reserved >= 0)
  assert.ok(state.stock.batches.length > 0, 'canonical fixture lot must be observed')
  const counts = { orders: state.orders.length, snapshots: 0, items: 0,
    reservations: 0, events: 0, conversations: 0, messages: 0,
    batches: state.stock.batches.length, inventoryEvents: state.stock.events.length }
  const ids = Object.fromEntries(Object.keys(counts).map(name => [name, new Set()]))
  const unique = (kind, row) => {
    assert.match(row.id, /^[a-f0-9-]{36}$/i)
    assert.ok(!ids[kind].has(row.id), 'duplicate ' + kind + ' row')
    ids[kind].add(row.id)
  }
  for (const batch of state.stock.batches) {
    unique('batches', batch)
    assert.equal(batch.sku, fixture.sku)
    assert.ok(Number.isInteger(batch.quantity) && batch.quantity >= 0)
    assert.ok(Number.isInteger(batch.reservedQuantity) && batch.reservedQuantity >= 0)
    assert.ok(batch.reservedQuantity <= batch.quantity)
  }
  for (const event of state.stock.events) {
    unique('inventoryEvents', event)
    assert.equal(event.sku, fixture.sku)
  }
  for (const order of state.orders) {
    unique('orders', order)
    assert.ok(keys.includes(order.idempotencyKey))
    assert.equal(order.snapshot.order_id, order.id)
    assert.equal(order.snapshot.idempotency_key, order.idempotencyKey)
    assert.deepEqual(order.snapshot.quote, order.quote)
    assert.equal(money(order.snapshot.total_amount), money(order.totalAmount))
    assert.equal(order.snapshot.accepted_at, order.acceptedAt)
    counts.snapshots++
    for (const kind of ['items', 'reservations', 'events', 'conversations', 'messages']) {
      counts[kind] += order[kind].length
      for (const row of order[kind]) {
        unique(kind, row)
        if (kind === 'messages') assert.ok(order.conversations.some(c => c.id === row.conversation_id))
        else if (kind === 'conversations') {
          assert.equal(row.source_kind, 'order_request')
          assert.equal(row.source_id, order.id)
        } else assert.equal(row.order_request_id, order.id)
        if (kind === 'items' || kind === 'reservations') assert.equal(row.sku, fixture.sku)
        if (kind === 'reservations') {
          assert.ok(Number.isInteger(row.quantity) && row.quantity > 0)
          assert.ok(order.items.some(item => item.id === row.order_request_item_id))
          assert.ok(state.stock.batches.some(batch => batch.id === row.batch_id))
        }
      }
    }
  }
  // SQL must compute these counts independently over the full owned selection,
  // without pagination/LIMIT. A truncated array cannot supply its own count.
  assert.deepEqual(state.relationCounts, counts)
  assert.equal(state.stock.onHand, state.stock.batches.reduce((sum, batch) => sum + batch.quantity, 0))
  const held = state.orders.flatMap(order => order.reservations).filter(row => row.status === 'active')
  assert.equal(state.stock.reserved, held.reduce((sum, row) => sum + row.quantity, 0))
  for (const batch of state.stock.batches) assert.equal(batch.reservedQuantity,
    held.filter(row => row.batch_id === batch.id).reduce((sum, row) => sum + row.quantity, 0))
  return state
}

function receiptMatches(receipt, order) {
  assert.ok(typeof receipt.public_reference === 'string' && receipt.public_reference.length > 0)
  assert.ok(typeof receipt.status === 'string' && receipt.status.length > 0)
  assert.ok(typeof receipt.created_at === 'string' && Number.isFinite(Date.parse(receipt.created_at)))
  assert.equal(receipt.public_reference, order.publicReference)
  assert.equal(receipt.status, order.status)
  assert.equal(receipt.created_at, order.createdAt)
  assert.equal(money(receipt.total_amount), money(order.totalAmount))
}

function acceptedOrder(state, key, version, feeMinor) {
  const rows = state.orders.filter(order => order.idempotencyKey === key)
  assert.equal(rows.length, 1, 'exactly one accepted order for the key')
  const order = rows[0]
  assert.equal(order.quote.rateVersion, version)
  assert.equal(order.quote.feeMinor, feeMinor)
  assert.equal(money(order.shippingAmount), feeMinor / 100)
  assert.equal(order.shippingQuoteStatus, 'customer_confirmed')
  assert.equal(order.deliveryStatus, 'ready_to_pack')
  assert.ok(order.acceptedAt)
  assert.equal(order.items.length, 1)
  assert.equal(order.items[0].sku, fixture.sku)
  assert.equal(order.items[0].quantity, 1)
  assert.equal(order.reservations.length, 1)
  assert.equal(order.reservations[0].quantity, 1)
  assert.equal(order.reservations[0].status, 'active')
  assert.equal(order.conversations.length, 1)
  assert.ok(order.messages.length > 0)
  assert.ok(order.events.some(event => event.metadata?.event === 'delivery_contract_recorded'))
  return order
}

export async function connectedOrderProbe({ guestRequest, adminRequest, observe, destination, report }) {
  // observe returns deterministic, complete synthetic business rows, excluding
  // signing nonces, rate counters, guest secrets and unrelated captured data.
  const state = async () => completeState(await observe(keys, fixture.sku))
  const before = await state()
  assert.deepEqual(before.orders, [])
  assert.equal(before.stock.reserved, 0)
  assert.ok(before.stock.onHand >= 2)
  const items = [{ sku: fixture.sku, quantity: 1 }]
  const quoteRequest = { service: 'standard', items, destination }
  let response = await guestRequest('delivery/quote', quoteRequest)
  assert.equal(response.status, 200)
  const quoteA = response.data.quote
  assert.equal(quoteA.rateVersion, 1)
  assert.equal(quoteA.feeMinor, 15000)
  const body = (key, quote, name) => ({
    customerName: name, email: name.toLowerCase() + '@example.test', phone: '',
    address: 'Synthetic local qualification address only',
    fulfillmentMethod: 'Standard Courier Delivery', note: '', items,
    idempotencyKey: key, botToken: 'local-unconfigured-fixture-token',
    delivery: { service: 'standard', destination, acceptance: {
      inputFingerprint: quote.inputFingerprint, rateVersion: quote.rateVersion,
    } },
  })
  const bodyA = body(fixture.orderA, quoteA, 'TariffA')
  response = await guestRequest('order', bodyA)
  assert.equal(response.status, 201)
  const receiptA = response.data.receipt
  const acceptedA = await state()
  const orderA = acceptedOrder(acceptedA, fixture.orderA, 1, 15000)
  assert.equal(acceptedA.orders.length, 1)
  assert.equal(acceptedA.stock.onHand, before.stock.onHand)
  assert.equal(acceptedA.stock.reserved, 1)
  receiptMatches(receiptA, orderA)

  const rates = Object.fromEntries(['NCR', 'Greater Luzon', 'Visayas', 'Mindanao'].map(area =>
    [area, { baseMinor: 20000, includedWeightG: 5000, extraKgMinor: 4000, roundMinor: 100 }]))
  response = await adminRequest('delivery/customer-rates', 'POST', {
    expectedVersion: 1, reason: 'Synthetic connected quote/order qualification',
    evidenceRef: 'MAP018 disposable native fixture only', rates,
  }, { key: fixture.publishB })
  assert.equal(response.status, 200)
  assert.equal(response.data.result.version, 2)
  response = await adminRequest('delivery/customer-rates')
  assert.equal(response.status, 200)
  assert.equal(response.data.result.current.version, 2)
  assert.deepEqual(response.data.result.current.rates, rates)
  assert.deepEqual(await state(), acceptedA,
    'publication preserves every retained synthetic business row')

  response = await guestRequest('order', bodyA)
  assert.equal(response.status, 201)
  assert.deepEqual(response.data.receipt, receiptA, 'exact accepted receipt replay after publication')
  assert.deepEqual(await state(), acceptedA,
    'receipt replay creates no extra stock hold, snapshot or message')
  response = await guestRequest('order', body(fixture.stale, quoteA, 'TariffB'))
  assert.equal(response.status, 409)
  assert.equal(response.data.error.code, 'DELIVERY_QUOTE_CHANGED')
  assert.deepEqual(await state(), acceptedA,
    'fresh outdated acceptance creates no order or business effects')

  response = await guestRequest('delivery/quote', quoteRequest)
  assert.equal(response.status, 200)
  const quoteB = response.data.quote
  assert.equal(quoteB.rateVersion, 2)
  assert.equal(quoteB.feeMinor, 20000)
  assert.equal(quoteB.inputFingerprint, quoteA.inputFingerprint)
  response = await guestRequest('order', body(fixture.orderB, quoteB, 'TariffB'))
  assert.equal(response.status, 201)
  const final = await state()
  assert.equal(final.orders.length, 2)
  assert.deepEqual(acceptedOrder(final, fixture.orderA, 1, 15000), orderA)
  const orderB = acceptedOrder(final, fixture.orderB, 2, 20000)
  receiptMatches(response.data.receipt, orderB)
  assert.equal(final.stock.onHand, before.stock.onHand)
  assert.equal(final.stock.reserved, 2)
  assert.equal(final.stock.batches.reduce((sum, batch) => sum + batch.reservedQuantity, 0), 2)
  report.connectedTariff = {
    versions: [1, 2], feesMinor: [15000, 20000], acceptedOrders: 2,
    acceptedAStateSha256: hash(acceptedA), finalStateSha256: hash(final),
    exactReceiptReplay: true, publicationAndReplayConserved: true,
    freshStaleAcceptance409: true, oldChargeRetained: true,
    scope: 'Sequential genuine local routes and protected complete synthetic business rows; no concurrent, provider, hosted or populated recovery claim',
  }
  report.checks.push('connected_tariff_orderA_publishB_replayA_refuse_stale_acceptB_retainA')
}
