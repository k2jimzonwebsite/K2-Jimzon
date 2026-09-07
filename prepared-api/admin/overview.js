import { authorizeAdminRequest } from '../../server/admin-bff/authorize.js'
import { requireAdminProject, safeJson } from '../../server/admin-bff/security.js'
import { overviewUnavailable } from '../../src/lib/overviewAvailability.js'
import { overviewPeriodStart } from '../../src/lib/overviewPeriod.js'

const ALLOWED_RANGES = new Set([7, 30, 90])

function periodStart(days) {
  return overviewPeriodStart(days, 1).toISOString()
}

export async function readOverviewData(client, range) {
  const priorStart = periodStart(range)
  const results = await Promise.all([
    client.from('order_requests').select('id,channel_source,status,payment_status,total_amount,created_at', { count: 'exact' }).gte('created_at', priorStart),
    client.from('order_requests').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
    client.from('pasabuy_requests').select('id,status,target_budget_php,assigned_to,created_at', { count: 'exact' }),
    client.from('product_batches').select('id,quantity,quantity_available,expiry_date,best_before_date', { count: 'exact' }),
    client.from('channel_connections').select('channel,display_name,status,last_event_at,note', { count: 'exact' }),
    client.from('channel_listings').select('channel_source,publication_status,validation_errors,last_synced_at,sync_error', { count: 'exact' }),
    client.from('products').select('sku,status,stock_available', { count: 'exact' }),
    client.from('conversations').select('id,status,priority,unread_count,response_due_at,assigned_to,last_message_at', { count: 'exact' }),
  ])
  const keys = ['orders', 'orderBacklog', 'pasabuy', 'batches', 'connections', 'listings', 'products', 'conversations']
  const unavailable = overviewUnavailable(results, keys)
  return {
    data: {
      orders: Array.isArray(results[0].data) ? results[0].data.filter(row => row && typeof row === 'object') : [],
      orderBacklog: results[1].error ? 0 : (results[1].count || 0),
      pasabuy: Array.isArray(results[2].data) ? results[2].data.filter(row => row && typeof row === 'object') : [],
      batches: Array.isArray(results[3].data) ? results[3].data.filter(row => row && typeof row === 'object') : [],
      connections: Array.isArray(results[4].data) ? results[4].data.filter(row => row && typeof row === 'object') : [],
      listings: Array.isArray(results[5].data) ? results[5].data.filter(row => row && typeof row === 'object') : [],
      products: Array.isArray(results[6].data) ? results[6].data.filter(row => row && typeof row === 'object') : [],
      conversations: Array.isArray(results[7].data) ? results[7].data.filter(row => row && typeof row === 'object') : [],
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
