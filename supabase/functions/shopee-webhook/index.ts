// K2 Jimzon Shopee webhook intake.
//
// A Shopee push is signed evidence of an event, but it is not a complete
// order. This function stores the raw event idempotently. A later detail-sync
// worker must retrieve the real order lines, buyer, totals, delivery charge,
// and waybill before writing to the canonical order workflow.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SHOPEE_PARTNER_KEY = Deno.env.get('SHOPEE_PARTNER_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
})

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
  const expected = [...new Uint8Array(mac)].map(byte => byte.toString(16).padStart(2, '0')).join('')
  const received = header.trim().toLowerCase()
  if (expected.length !== received.length) return false
  let difference = 0
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ received.charCodeAt(index)
  }
  return difference === 0
}

async function setShopeeState(status: 'degraded' | 'error', note: string) {
  await db.from('channel_connections').update({
    status,
    last_event_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    note,
  }).eq('channel', 'shopee')
}

Deno.serve(async request => {
  if (request.method === 'GET') return new Response('ok', { status: 200 })
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const rawBody = await request.text()
  const url = new URL(request.url)
  const signedUrl = `${url.origin}${url.pathname}`
  const signature = request.headers.get('authorization') ?? ''
  if (!await verifyShopeeSignature(signedUrl, rawBody, signature)) {
    return new Response('invalid signature', { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('bad json', { status: 400 })
  }

  const code = payload.code
  const data = (payload.data ?? {}) as Record<string, unknown>
  const externalId = data.ordersn
    ? `${String(data.ordersn)}:${String(data.status ?? 'unknown')}`
    : String(payload.event_id ?? `${String(code ?? 'unknown')}:${String(payload.timestamp ?? Date.now())}`)

  const { error } = await db.from('channel_event_inbox').upsert({
    channel: 'shopee',
    external_event_id: externalId,
    event_type: code === 3 ? 'order_status' : `push_${String(code ?? 'unknown')}`,
    payload,
    status: 'received',
    last_error: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'channel,external_event_id' })

  if (error) {
    await setShopeeState('error', `Signed event could not be stored: ${error.message}`)
    return new Response(JSON.stringify({ received: false, error: 'event persistence failed' }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'retry-after': '30' },
    })
  }

  await setShopeeState('degraded', 'Signed events are captured; full order-detail sync is not enabled yet.')
  return new Response(JSON.stringify({ received: true, queued: true }), {
    status: 202,
    headers: { 'content-type': 'application/json' },
  })
})
