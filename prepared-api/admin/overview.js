import { authorizeAdminRequest } from '../../server/admin-bff/authorize.js'
import { requireAdminProject, safeJson } from '../../server/admin-bff/security.js'

const ALLOWED_RANGES = new Set([7, 30, 90])

function periodStart(days) {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - ((days * 2) - 1))
  return date.toISOString()
}

export async function readOverviewData(client, range) {
  const priorStart = periodStart(range)
  const results = await Promise.all([
    client.from('order_requests').select('id,channel_source,status,payment_status,total_amount,created_at').gte('created_at', priorStart),
    client.from('order_requests').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
    client.from('pasabuy_requests').select('id,status,target_budget_php,assigned_to,created_at'),
    client.from('product_batches').select('id,quantity,quantity_available,expiry_date,best_before_date'),
    client.from('channel_connections').select('channel,display_name,status,last_event_at,note'),
    client.from('channel_listings').select('channel_source,publication_status,validation_errors,last_synced_at,sync_error'),
    client.from('products').select('sku,status,stock_available'),
    client.from('conversations').select('id,status,priority,unread_count,response_due_at,assigned_to,last_message_at'),
  ])
  const keys = ['orders', 'orderBacklog', 'pasabuy', 'batches', 'connections', 'listings', 'products', 'conversations']
  const unavailable = keys.filter((key, index) => Boolean(results[index].error)).map((key) => ({ key, code: 'QUERY_UNAVAILABLE' }))
  return {
    data: {
      orders: results[0].data || [],
      orderBacklog: results[1].error ? 0 : (results[1].count || 0),
      pasabuy: results[2].data || [],
      batches: results[3].data || [],
      connections: results[4].data || [],
      listings: results[5].data || [],
      products: results[6].data || [],
      conversations: results[7].data || [],
    },
    unavailable,
  }
}

export default async function handler(req, res) {
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'GET') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  const rawRange = Array.isArray(req.query?.range) ? req.query.range[0] : req.query?.range
  const range = Number(rawRange || 30)
  if (!ALLOWED_RANGES.has(range)) return safeJson(res, 400, { error: { code: 'INVALID_RANGE' } })

  const authorized = await authorizeAdminRequest(req, res)
  if (!authorized) return undefined
  try {
    const result = await readOverviewData(authorized.client, range)
    return safeJson(res, 200, { ok: true, ...result })
  } catch {
    return safeJson(res, 503, { error: { code: 'OVERVIEW_UNAVAILABLE' } })
  }
}
