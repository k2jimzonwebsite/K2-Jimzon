// K2 Jimzon Shopee webhook intake.
//
// A Shopee push is signed evidence of an event, but it is not a complete
// order. This function stores the raw event idempotently. A later detail-sync
// worker must retrieve the real order lines, buyer, totals, delivery charge,
// and waybill before writing to the canonical order workflow.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getServiceRoleKey } from '../_shared/service-role.ts'
import { buildShopeeEventEnvelope, readShopeePushBody } from './validation.js'

const SHOPEE_PARTNER_KEY = Deno.env.get('SHOPEE_PARTNER_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = getServiceRoleKey()
const SHOPEE_PUSH_MAX_AGE_SECONDS = Number(Deno.env.get('SHOPEE_PUSH_MAX_AGE_SECONDS') ?? '')
const SHOPEE_BODY_READ_TIMEOUT_MS = Number(Deno.env.get('SHOPEE_BODY_READ_TIMEOUT_MS') ?? '')

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
})

async function verifyShopeeSignature(url: string, rawBytes: Uint8Array, header: string) {
  if (!SHOPEE_PARTNER_KEY) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SHOPEE_PARTNER_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const prefix = new TextEncoder().encode(`${url}|`)
  const signedBytes = new Uint8Array(prefix.byteLength + rawBytes.byteLength)
  signedBytes.set(prefix, 0)
  signedBytes.set(rawBytes, prefix.byteLength)
  const mac = await crypto.subtle.sign('HMAC', key, signedBytes)
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

  let rawBody: string
  let rawBytes: Uint8Array
  try {
    const boundedBody = await readShopeePushBody(request, { timeoutMs: SHOPEE_BODY_READ_TIMEOUT_MS })
    rawBody = boundedBody.rawBody
    rawBytes = boundedBody.rawBytes
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    if (code === 'SHOPEE_CONTENT_TYPE_INVALID') return new Response('unsupported content type', { status: 415 })
    if (code === 'SHOPEE_PAYLOAD_TOO_LARGE') return new Response('payload too large', { status: 413 })
    if (code === 'SHOPEE_BODY_READ_TIMEOUT' || code === 'SHOPEE_BODY_TIMEOUT_INVALID') {
      return new Response('webhook unavailable', { status: 503, headers: { 'retry-after': '30' } })
    }
    return new Response('invalid request', { status: 400 })
  }
  const url = new URL(request.url)
  const signedUrl = `${url.origin}${url.pathname}`
  const signature = request.headers.get('authorization') ?? ''
  if (!await verifyShopeeSignature(signedUrl, rawBytes, signature)) {
    return new Response('invalid signature', { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('bad json', { status: 400 })
  }

  let event: ReturnType<typeof buildShopeeEventEnvelope>
  try {
    event = buildShopeeEventEnvelope(payload, { maxAgeSeconds: SHOPEE_PUSH_MAX_AGE_SECONDS })
  } catch (error) {
    if (error instanceof Error && error.message === 'SHOPEE_REPLAY_WINDOW_INVALID') {
      return new Response('webhook unavailable', { status: 503, headers: { 'retry-after': '60' } })
    }
    return new Response('invalid event', { status: 400 })
  }

  const { data, error } = await db.rpc('capture_shopee_event_v1', {
    p_shop_id: event.payload.shop_id,
    p_external_event_id: event.externalEventId,
    p_event_type: event.eventType,
    p_payload: event.payload,
  })

  if (error) {
    await setShopeeState('error', 'Signed event could not be stored; retry is required.')
    return new Response(JSON.stringify({ received: false, error: 'event persistence failed' }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'retry-after': '30' },
    })
  }

  const result = data as { status?: string; retryAfter?: number } | null
  if (!result || result.status === 'unavailable') {
    await setShopeeState('error', 'Signed event capture is unavailable; retry is required.')
    return new Response(JSON.stringify({ received: false, error: 'event persistence unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'retry-after': '60' },
    })
  }
  if (result.status === 'rate_limited') {
    const retryAfter = Number.isInteger(result.retryAfter) && Number(result.retryAfter) > 0
      ? String(result.retryAfter)
      : '60'
    return new Response(JSON.stringify({ received: false, error: 'rate limited' }), {
      status: 429,
      headers: { 'content-type': 'application/json', 'retry-after': retryAfter },
    })
  }
  if (result.status === 'conflict') {
    await setShopeeState('error', 'A signed event identity conflicted with stored evidence.')
    return new Response(JSON.stringify({ received: false, error: 'event identity conflict' }), {
      status: 409,
      headers: { 'content-type': 'application/json' },
    })
  }
  if (result.status !== 'captured' && result.status !== 'replayed') {
    await setShopeeState('error', 'Signed event capture returned an unknown result; retry is required.')
    return new Response(JSON.stringify({ received: false, error: 'event persistence failed' }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'retry-after': '30' },
    })
  }

  await setShopeeState('degraded', 'Signed events are captured; full order-detail sync is not enabled yet.')
  return new Response(JSON.stringify({
    received: true,
    queued: result.status === 'captured',
    replayed: result.status === 'replayed',
  }), {
    status: 202,
    headers: { 'content-type': 'application/json' },
  })
})
