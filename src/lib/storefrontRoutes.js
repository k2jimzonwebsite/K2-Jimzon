export const STOREFRONT_PATH_TO_VIEW = Object.freeze({
  '/': 'home',
  '/catalog': 'catalog',
  '/cabinet': 'catalog',
  '/shop': 'catalog',
  '/store': 'store',
  '/pasabuy': 'pasabuy',
  '/trade': 'wholesale',
  '/wholesale': 'wholesale',
  '/contact': 'contact',
  '/account': 'account',
  '/messages': 'messages',
  '/checkout': 'checkout',
  '/confirmation': 'confirmation',
})

export const STOREFRONT_VIEW_TO_PATH = Object.freeze({
  home: '/',
  catalog: '/catalog',
  store: '/store',
  pasabuy: '/pasabuy',
  wholesale: '/trade',
  contact: '/contact',
  account: '/account',
  messages: '/messages',
  checkout: '/checkout',
  confirmation: '/confirmation',
})

// Root resolves to the emitted index file without a rewrite. Every other
// client route must be explicit at the host so an unknown path can keep 404.
export const STOREFRONT_SPA_PATHS = Object.freeze(
  Object.keys(STOREFRONT_PATH_TO_VIEW).filter(path => path !== '/'),
)
