/**
 * Human labels and brand colours per sales channel and message platform.
 *
 * MAP-028 D1. This file previously carried two competing vocabularies at once —
 * the canonical `shopee` / `tiktok` alongside the legacy `shopee_account_1` /
 * `website_retail` — which is how the same channel came to be spelled several
 * ways across the system. The canonical set below is the one the database now
 * enforces through `public.channels`; the legacy names are kept only as aliases
 * so historical rows still render a correct label instead of falling through to
 * a raw string.
 *
 * Which K2 shop an order came from is a separate fact from which channel it
 * came from. It lives on `order_requests.shop_id`, not here — two Shopee shops
 * share this label and are distinguished by their shop name.
 */

/** The canonical sales channels, matching `public.channels`. */
const SALES_CHANNELS = {
  website: { label: 'Website', color: '#2563EB' },
  pasabuy: { label: 'Pasabuy', color: '#B91C1C' },
  manual: { label: 'Manual entry', color: '#6B7280' },
  shopee: { label: 'Shopee', color: '#EE4D2D' },
  lazada: { label: 'Lazada', color: '#1A00B4' },
  tiktok: { label: 'TikTok Shop', color: '#111111' },
}

/**
 * Historical spellings, mapped to their canonical channel.
 *
 * Read-only compatibility. Nothing should write these; the database rejects
 * them on `order_requests` and `channel_listings`.
 */
const LEGACY_CHANNEL_ALIASES = {
  shopee_account_1: 'shopee',
  shopee_account_2: 'shopee',
  shopee_shop: 'shopee',
  tiktok_shop: 'tiktok',
  lazada_account_1: 'lazada',
  website_retail: 'website',
  website_vip: 'website',
  direct_b2b: 'manual',
}

/**
 * Message platforms, which are a different vocabulary from sales channels.
 *
 * A conversation platform describes where someone is talking to K2; a sales
 * channel describes where an order was placed. Shopee appears in both because
 * it is both, and they are still separate facts.
 */
const MESSAGE_PLATFORMS = {
  WhatsApp: { label: 'WhatsApp', color: '#25D366' },
  Viber: { label: 'Viber', color: '#7360F2' },
  Messenger: { label: 'Messenger', color: '#0084FF' },
  Instagram: { label: 'Instagram', color: '#E1306C' },
  TikTok: { label: 'TikTok', color: '#111111' },
  Shopee: { label: 'Shopee', color: '#EE4D2D' },
  Lazada: { label: 'Lazada', color: '#1A00B4' },
  Website: { label: 'Website', color: '#2563EB' },
  // The virtual store. Given the storefront's own brass rather than a generic
  // blue, so a shelf-side question is recognisable at a glance in the queue.
  'Virtual Store': { label: 'Virtual Store', color: '#C6A867' },
  Pasabuy: { label: 'Pasabuy', color: '#B91C1C' },
}

const META = { ...SALES_CHANNELS, ...MESSAGE_PLATFORMS }

export function channelMeta(key) {
  if (!key) return { label: 'Storefront', color: '#2563EB' }
  const canonical = LEGACY_CHANNEL_ALIASES[key] || key
  return META[canonical] || { label: String(key), color: '#6B7280' }
}

/** The canonical channel code for a value that may be a historical spelling. */
export function canonicalChannelCode(key) {
  const value = String(key ?? '').trim()
  if (!value) return ''
  const canonical = LEGACY_CHANNEL_ALIASES[value] || value
  return canonical in SALES_CHANNELS ? canonical : ''
}

/** Channels operated through seller shops, so a shop must be named on an order. */
export const MARKETPLACE_CHANNELS = Object.freeze(['shopee', 'lazada', 'tiktok'])

export function isMarketplaceChannel(key) {
  return MARKETPLACE_CHANNELS.includes(canonicalChannelCode(key))
}
