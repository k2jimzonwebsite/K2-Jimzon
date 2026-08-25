import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

process.env.NODE_ENV = 'production'
process.env.K2_DEPLOYMENT_TARGET = 'storefront'
process.env.K2_STOREFRONT_ORIGINS = 'https://shop.example.test'
process.env.K2_GUEST_BFF_SECRET = Buffer.alloc(32, 17).toString('base64')

const security = await import('../server/storefront-bff/security.js')
const router = await import('../server/storefront-bff/router.js')
assert.equal(router.STOREFRONT_BFF_ROUTES.length, 13)
assert.equal(new Set(router.STOREFRONT_BFF_ROUTES).size, 13)
const preparedStorefrontRoot = fileURLToPath(new URL('../prepared-api/storefront', import.meta.url))
async function preparedRoutes(directory = preparedStorefrontRoot) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return preparedRoutes(target)
    if (!entry.isFile() || !entry.name.endsWith('.js')) return []
    return [path.relative(preparedStorefrontRoot, target).replaceAll('\\', '/').replace(/\.js$/, '')]
  }))
  return nested.flat()
}
assert.deepEqual(
  [...router.STOREFRONT_BFF_ROUTES].sort(),
  (await preparedRoutes()).sort(),
  'The single-function router must explicitly cover every prepared Storefront endpoint',
)
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
  'prepared-api/storefront/account/claim.js',
  'prepared-api/storefront/account/history.js',
  'prepared-api/storefront/account/message.js',
  'prepared-api/storefront/account/auth/email.js',
  'prepared-api/storefront/account/auth/phone.js',
  'prepared-api/storefront/account/auth/verify.js',
  'prepared-api/storefront/order.js', 'prepared-api/storefront/pasabuy.js', 'prepared-api/storefront/coupon.js',
  'prepared-api/storefront/conversation.js', 'prepared-api/storefront/messages.js', 'prepared-api/storefront/message.js',
  'prepared-api/storefront/wholesale.js',
  'server/storefront-bff/security.js', 'server/storefront-bff/supabase.js',
  'server/storefront-bff/customer-auth.js', 'server/storefront-bff/preauth-rate.js',
  'server/storefront-bff/router.js', 'prepared-api/storefront-router.js',
  'api/storefront/index.js',
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
const storefrontEntrypoint = await readFile(new URL('../api/storefront/index.js', import.meta.url), 'utf8')
assert.match(storefrontEntrypoint, /K2_STOREFRONT_BFF_ENABLED\s*===\s*'true'/)

const migration = await readFile(new URL('../supabase/migrations/20260812_guest_submission_boundary.sql', import.meta.url), 'utf8')
const accountClaim = await readFile(new URL('../supabase/migrations/20260822_guest_account_claim_boundary.sql', import.meta.url), 'utf8')
const wholesaleInquiry = await readFile(new URL('../supabase/migrations/20260822_wholesale_inquiry_boundary.sql', import.meta.url), 'utf8')
const customerAuthRate = await readFile(new URL('../supabase/migrations/20260825_storefront_customer_auth_boundary.sql', import.meta.url), 'utf8')
const customerAuthPostflight = await readFile(new URL('../supabase/map020_storefront_auth_rate_postflight.sql', import.meta.url), 'utf8')
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
assert.match(accountClaim, /'wholesale_inquiry'/)
assert.match(wholesaleInquiry, /submit_wholesale_inquiry_v1/)
assert.match(wholesaleInquiry, /wholesale_inquiry_receipts/)
assert.doesNotMatch(wholesaleInquiry, /price_list_id|credit_limit|pricing_approved|terms_approved/)
assert.match(cutover, /grant execute on function public\.start_guest_conversation_v1/)
assert.match(postflight, /start_guest_conversation_v1/)
assert.match(postflight, /guest_conversation_receipts/)
assert.match(migration, /returns table\([\s\S]*guest_grant_token text/)
assert.doesNotMatch(migration, /insert into k2_private\.guest_bff_secrets[\s\S]*values/i)
assert.match(accountClaim, /claim_guest_customer_account_v1/)
assert.match(accountClaim, /email_confirmed_at is not null/)
assert.match(accountClaim, /phone_confirmed_at is not null/)
assert.match(accountClaim, /claimed_by_verified_account/)
assert.match(accountClaim, /guest_account_claim_events/)
assert.match(accountClaim, /list_customer_account_history_v1/)
assert.match(accountClaim, /append_customer_account_message_v1/)
assert.match(accountClaim, /where customer_id=v_account\.customer_id/)
assert.match(accountClaim, /delivery_status<>'internal_only'/)
assert.match(accountClaim, /'account_read'/)
assert.match(accountClaim, /'account_reply'/)
assert.match(customerAuthRate, /consume_storefront_customer_auth_rate_v1/)
assert.match(customerAuthRate, /storefront_auth_rate_nonces/)
assert.match(customerAuthRate, /storefront_auth_rate_buckets/)
assert.match(customerAuthRate, /force row level security/)
assert.doesNotMatch(customerAuthRate, /insert into k2_private\.guest_bff_secrets[\s\S]*values/i)
assert.match(customerAuthPostflight, /consume_storefront_customer_auth_rate_v1/)
assert.match(customerAuthPostflight, /storefront_auth_rate_nonces/)

const pasabuyUi = await readFile(new URL('../src/views/Pasabuy.jsx', import.meta.url), 'utf8')
const guestInboxUi = await readFile(new URL('../src/views/GuestMessages.jsx', import.meta.url), 'utf8')
assert.match(pasabuyUi, /guestBffEnabled\(\)[\s\S]*Open request chat/)
assert.match(guestInboxUi, /document\.visibilityState === 'visible'/)
assert.match(guestInboxUi, /setInterval\(refreshVisible, 15000\)/)
assert.match(guestInboxUi, /existing conversation is still available/)
assert.match(guestInboxUi, /No purchase or account is required/)
assert.match(guestInboxUi, /startGuestConversation/)

console.log('Guest commerce BFF contract passed (production cutover remains gated).')
