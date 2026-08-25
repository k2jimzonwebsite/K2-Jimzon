const GUEST_ENDPOINTS = Object.freeze({
  'account/claim': '/api/storefront/account/claim',
  'account/history': '/api/storefront/account/history',
  'account/message': '/api/storefront/account/message',
  'account/auth/email': '/api/storefront/account/auth/email',
  'account/auth/phone': '/api/storefront/account/auth/phone',
  'account/auth/verify': '/api/storefront/account/auth/verify',
  conversation: '/api/storefront/conversation',
  coupon: '/api/storefront/coupon',
  message: '/api/storefront/message',
  messages: '/api/storefront/messages',
  order: '/api/storefront/order',
  pasabuy: '/api/storefront/pasabuy',
  wholesale: '/api/storefront/wholesale',
})

export const GUEST_BFF_CLIENT_ROUTES = Object.freeze(Object.keys(GUEST_ENDPOINTS))

export function isGuestBffRoute(path) {
  return Object.hasOwn(GUEST_ENDPOINTS, path)
}

export function guestBffEndpoint(path) {
  return isGuestBffRoute(path) ? GUEST_ENDPOINTS[path] : null
}
