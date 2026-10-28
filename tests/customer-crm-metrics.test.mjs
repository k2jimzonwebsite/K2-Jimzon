import test from 'node:test'
import assert from 'node:assert/strict'
import { readAdminCustomers } from '../server/admin-bff/customers.js'

test('customer totals distinguish unfinished charges from zero', async () => {
  const rows = {
    customers: [{ id: 'one', display_name: 'Buyer', status: 'active', customer_accounts: [], customer_contact_points: [], channel_identities: [] }],
    order_requests: [{ customer_id: 'one', total_amount: 100, shipping_quote_status: 'waived' }, { customer_id: 'one', total_amount: 500, shipping_quote_status: 'pending' }],
    pasabuy_requests: [], conversations: [],
  }
  const client = { from(table) { const chain = { select: () => chain, order: () => chain, in: () => chain, limit: async () => ({ data: rows[table], count: rows[table].length }) }; return chain } }
  const { customers } = await readAdminCustomers(client)
  assert.equal(customers[0].metrics.orderValue, null)
  assert.equal(customers[0].metrics.knownOrderValue, 100)
  assert.equal(customers[0].metrics.unknownOrderCount, 1)
})
