// ============================================================================
// K2 Jimzon — Shopee webhook connector (Supabase Edge Function)
// ============================================================================
// What it does, end to end:
//   1. Shopee Seller Center pushes an event (e.g. new/updated order) to this URL.
//   2. We verify the push signature so only real Shopee traffic is accepted.
//   3. We write the order into `public.orders` using the service-role key
//      (backend only — bypasses RLS, never exposes the key to the browser).
//   4. We flip `channel_connections.shopee` to 'live' so the admin board shows 🟢.
//
// Secrets this function needs (set in Supabase → Edge Functions → Secrets):
//   SHOPEE_PARTNER_KEY          — used to verify Shopee's push signature
//   SUPABASE_URL                — your project URL (auto-injected by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY   — service role (auto-injected by Supabase)
//
// Deploy:
//   supabase functions deploy shopee-webhook --no-verify-jwt
//   (then paste the function URL as the webhook in Shopee's push settings)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SHOPEE_PARTNER_KEY = Deno.env.get('SHOPEE_PARTNER_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
})

// Shopee signs each push as HMAC-SHA256(partner_key, `${url}|${raw_body}`),
// delivered in the `Authorization` header. We recompute and compare.
async function verifyShopeeSignature(url: string, rawBody: string, header: string) {
  if (!SHOPEE_PARTNER_KEY) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SHOPEE_PARTNER_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${url}|${rawBody}`))
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
  // constant-time-ish compare
  const a = hex
  const b = (header || '').trim().toLowerCase()
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function markShopeeLive(note: string | null = null) {
  await db.from('channel_connections')
    .update({ status: 'live', last_event_at: new Date().toISOString(), updated_at: new Date().toISOString(), note })
    .eq('channel', 'shopee')
}

Deno.serve(async (req) => {
  // Shopee sometimes verifies the endpoint with a GET/challenge — answer 200.
  if (req.method === 'GET') return new Response('ok', { status: 200 })
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const rawBody = await req.text()
  const url = new URL(req.url)
  const fullUrl = `${url.origin}${url.pathname}`
  const signature = req.headers.get('authorization') ?? ''

  // 1) Reject anything that isn't genuinely from Shopee.
  const ok = await verifyShopeeSignature(fullUrl, rawBody, signature)
  if (!ok) return new Response('invalid signature', { status: 401 })

  let payload: any
  try { payload = JSON.parse(rawBody) } catch { return new Response('bad json', { status: 400 }) }

  // A valid, signed push means the channel is alive.
  await markShopeeLive()

  // 2) Shopee push `code` 3 = order status update. Other codes (chat, etc.)
  //    can be handled later; we ack them so Shopee stops retrying.
  const code = payload?.code
  const data = payload?.data ?? {}

  if (code === 3 && data?.ordersn) {
    const ordersn: string = data.ordersn
    const status: string = data.status ?? 'Pending'

    // Map Shopee's status text to our order_status enum values.
    const statusMap: Record<string, string> = {
      UNPAID: 'Pending', READY_TO_SHIP: 'Pending', PROCESSED: 'Packed',
      SHIPPED: 'Shipped', COMPLETED: 'Shipped', CANCELLED: 'Cancelled',
      TO_CONFIRM_RECEIVE: 'Shipped', IN_CANCEL: 'Pending',
    }
    const orderStatus = statusMap[status] ?? 'Pending'

    // NOTE: the push only carries the order serial + status. Full line items
    // (SKU, qty, buyer) require a follow-up call to Shopee's get_order_detail
    // API with your access token — do that here, then fill the fields below.
    // For now we upsert what the push guarantees so nothing is lost, keyed by
    // the Shopee order serial stored in fulfillment_method for traceability.
    const { error } = await db.from('orders')
      .insert([{
        sku: data.sku ?? null,                    // filled once get_order_detail runs
        quantity: data.quantity ?? 1,
        channel_source: 'shopee',
        fulfillment_method: `SHOPEE:${ordersn}`,   // traceable back to Shopee
        order_status: orderStatus,
        payment_status: status === 'UNPAID' ? 'Unpaid' : 'Paid',
        customer_name: data.buyer_username ?? 'Shopee Buyer',
        total_amount: data.total_amount ?? null,
      }])

    if (error) {
      await markShopeeLive(`order insert error: ${error.message}`)
      // Still 200 so Shopee doesn't hammer retries; the note surfaces the issue.
      return new Response(JSON.stringify({ received: true, warning: error.message }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    }
  }

  // Always ack quickly so Shopee marks the push delivered.
  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { 'content-type': 'application/json' },
  })
})
