import accountClaim from '../../prepared-api/storefront/account/claim.js'
import accountHistory from '../../prepared-api/storefront/account/history.js'
import accountMessage from '../../prepared-api/storefront/account/message.js'
import accountSettings from '../../prepared-api/storefront/account/settings.js'
import accountNotifications from '../../prepared-api/storefront/account/notifications.js'
import accountAuthEmail from '../../prepared-api/storefront/account/auth/email.js'
import accountAuthPhone from '../../prepared-api/storefront/account/auth/phone.js'
import accountAuthVerify from '../../prepared-api/storefront/account/auth/verify.js'
import conversation from '../../prepared-api/storefront/conversation.js'
import coupon from '../../prepared-api/storefront/coupon.js'
import deliveryQuote from '../../prepared-api/storefront/delivery/quote.js'
import message from '../../prepared-api/storefront/message.js'
import messages from '../../prepared-api/storefront/messages.js'
import order from '../../prepared-api/storefront/order.js'
import orderStatus from '../../prepared-api/storefront/order/status.js'
import pasabuy from '../../prepared-api/storefront/pasabuy.js'
import wholesale from '../../prepared-api/storefront/wholesale.js'
import { safeJson } from './security.js'
import { requestIp } from './security.js'
import { STOREFRONT_RATE_SHIELD, shieldKey } from '../rate-shield.js'

const ROUTES = new Map([
  ['account/claim', accountClaim],
  ['account/history', accountHistory],
  ['account/message', accountMessage],
  ['account/settings', accountSettings],
  ['account/notifications', accountNotifications],
  ['account/auth/email', accountAuthEmail],
  ['account/auth/phone', accountAuthPhone],
  ['account/auth/verify', accountAuthVerify],
  ['conversation', conversation],
  ['coupon', coupon],
  ['delivery/quote', deliveryQuote],
  ['message', message],
  ['messages', messages],
  ['order', order],
  ['order/status', orderStatus],
  ['pasabuy', pasabuy],
  ['wholesale', wholesale],
])

export const STOREFRONT_BFF_ROUTES = Object.freeze([...ROUTES.keys()])
export const STOREFRONT_BFF_ROUTE_CONTROLS = Object.freeze({
  'account/claim': Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: false, guestGrant: 'required', accountAuth: 'required', idempotency: true }),
  'account/history': Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: false, guestGrant: 'none', accountAuth: 'required', idempotency: false }),
  'account/message': Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: false, guestGrant: 'none', accountAuth: 'required', idempotency: true }),
  'account/settings': Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: false, guestGrant: 'none', accountAuth: 'required', idempotency: true }),
  'account/notifications': Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: false, guestGrant: 'none', accountAuth: 'required', idempotency: true }),
  'account/auth/email': Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: true, guestGrant: 'none', accountAuth: 'preauth', idempotency: false }),
  'account/auth/phone': Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: true, guestGrant: 'none', accountAuth: 'preauth', idempotency: false }),
  'account/auth/verify': Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: false, guestGrant: 'none', accountAuth: 'preauth', idempotency: false }),
  conversation: Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: true, guestGrant: 'issued', idempotency: true }),
  coupon: Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: false, guestGrant: 'none', idempotency: false }),
  'delivery/quote': Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: false, guestGrant: 'none', idempotency: false }),
  message: Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: false, guestGrant: 'required', idempotency: true }),
  messages: Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: false, guestGrant: 'required', idempotency: false }),
  order: Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: true, guestGrant: 'issued', idempotency: true }),
  'order/status': Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: false, guestGrant: 'required', idempotency: false }),
  pasabuy: Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: true, guestGrant: 'issued', idempotency: true }),
  wholesale: Object.freeze({ method: 'POST', origin: true, signed: true, databaseRateLimit: true, bot: true, guestGrant: 'issued', idempotency: true }),
})

export function extractStorefrontRoute(req) {
  const supplied = req.query?.route
  if (supplied !== undefined) {
    const joined = Array.isArray(supplied) ? supplied.join('/') : String(supplied)
    try { return decodeURIComponent(joined).replace(/^\/+|\/+$/g, '') } catch { return '' }
  }
  try {
    const pathname = new URL(String(req.url || ''), 'https://storefront.invalid').pathname
    return decodeURIComponent(pathname).replace(/^\/api\/storefront\/?/, '').replace(/\/+$/g, '')
  } catch {
    return ''
  }
}

export default async function storefrontBffRouter(req, res) {
  const route = extractStorefrontRoute(req)
  const handler = ROUTES.get(route)
  if (!handler) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  const control = STOREFRONT_BFF_ROUTE_CONTROLS[route]
  if (req.method !== control.method) {
    return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: control.method })
  }
  // In-memory cost shield ahead of the durable budgets: obvious floods get an
  // early 429 before they reach provider delivery, RPC cost, or the database.
  const shield = STOREFRONT_RATE_SHIELD.consume(shieldKey(route, requestIp(req)))
  if (!shield.allowed) {
    return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': String(shield.retryAfter) })
  }
  return handler(req, res)
}
