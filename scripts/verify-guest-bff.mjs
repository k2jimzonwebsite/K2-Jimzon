import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import { readFile } from 'node:fs/promises'

process.env.NODE_ENV = 'production'
process.env.K2_DEPLOYMENT_TARGET = 'storefront'
process.env.K2_STOREFRONT_ORIGINS = 'https://shop.example.test'
process.env.K2_GUEST_BFF_SECRET = Buffer.alloc(32, 17).toString('base64')

const security = await import('../server/storefront-bff/security.js')
const req = {
  headers: { origin: 'https://shop.example.test', 'x-forwarded-for': '203.0.113.4' },
  socket: { remoteAddress: '127.0.0.1' },
}
assert.equal(security.requireStorefrontProject(), true)
assert.equal(security.requireAllowedOrigin(req), true)
assert.equal(security.requireAllowedOrigin({ ...req, headers: { origin: 'https://evil.example' } }), false)
process.env.K2_DEPLOYMENT_TARGET = 'admin'
assert.equal(security.requireStorefrontProject(), false)
process.env.K2_DEPLOYMENT_TARGET = 'storefront'

const payload = { z: 1, a: { y: 2, x: 3 }, items: [{ sku: 'SKU-1', quantity: 1 }] }
assert.equal(security.stableStringify(payload), '{"a":{"x":3,"y":2},"items":[{"quantity":1,"sku":"SKU-1"}],"z":1}')
const args = security.signedRpcArguments(req, 'coupon', payload)
const payloadHash = createHash('sha256').update(args.p_payload_text).digest('hex')
const expected = createHmac('sha256', Buffer.alloc(32, 17))
  .update(`coupon\n${args.p_timestamp}\n${args.p_nonce}\n${payloadHash}\n${args.p_ip_hash}`).digest('hex')
assert.equal(args.p_signature, expected)
assert.equal(args.p_guest_grant_hash, undefined)

const files = [
  'prepared-api/storefront/order.js', 'prepared-api/storefront/pasabuy.js', 'prepared-api/storefront/coupon.js',
  'prepared-api/storefront/conversation.js', 'prepared-api/storefront/messages.js', 'prepared-api/storefront/message.js',
  'server/storefront-bff/security.js', 'server/storefront-bff/supabase.js',
]
for (const path of files) {
  const content = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
  assert.doesNotMatch(content, /SUPABASE_SERVICE_ROLE|SUPABASE_SECRET_KEY/, `${path} must use the limited key`)
  assert.doesNotMatch(content, /SUPABASE_ANON_KEY/, `${path} must use the modern publishable key`)
  assert.doesNotMatch(content, /Access-Control-Allow-Origin['"\s:,]+\*/, `${path} must not use wildcard CORS`)
  assert.doesNotMatch(content, /error\.stack|error\.message\s*\|\|/, `${path} must not return provider internals`)
}
const storefrontSupabase = await readFile(new URL('../server/storefront-bff/supabase.js', import.meta.url), 'utf8')
assert.match(storefrontSupabase, /SUPABASE_PUBLISHABLE_KEY/)

const migration = await readFile(new URL('../supabase/migrations/20260812_guest_submission_boundary.sql', import.meta.url), 'utf8')
const cutover = await readFile(new URL('../supabase/migrations/20260812_guest_submission_cutover.sql', import.meta.url), 'utf8')
const postflight = await readFile(new URL('../supabase/map020_guest_boundary_postflight.sql', import.meta.url), 'utf8')
assert.match(migration, /k2_private\.verify_guest_bff_request/)
assert.match(migration, /guest_request_nonces/)
assert.match(migration, /guest_rate_buckets/)
assert.match(migration, /guest_access_grant_scopes/)
assert.match(migration, /list_guest_conversations_v1/)
assert.match(migration, /append_guest_message_v1/)
assert.match(migration, /start_guest_conversation_v1/)
assert.match(migration, /guest_conversation_receipts/)
assert.match(migration, /'guest_start'/)
assert.match(cutover, /grant execute on function public\.start_guest_conversation_v1/)
assert.match(postflight, /start_guest_conversation_v1/)
assert.match(postflight, /guest_conversation_receipts/)
assert.match(migration, /returns table\([\s\S]*guest_grant_token text/)
assert.doesNotMatch(migration, /insert into k2_private\.guest_bff_secrets[\s\S]*values/i)

const pasabuyUi = await readFile(new URL('../src/views/Pasabuy.jsx', import.meta.url), 'utf8')
const guestInboxUi = await readFile(new URL('../src/views/GuestMessages.jsx', import.meta.url), 'utf8')
assert.match(pasabuyUi, /guestBffEnabled\(\)[\s\S]*Open request chat/)
assert.match(guestInboxUi, /document\.visibilityState === 'visible'/)
assert.match(guestInboxUi, /setInterval\(refreshVisible, 15000\)/)
assert.match(guestInboxUi, /existing conversation is still available/)
assert.match(guestInboxUi, /No purchase or account is required/)
assert.match(guestInboxUi, /startGuestConversation/)

console.log('Guest commerce BFF contract passed (production cutover remains gated).')
