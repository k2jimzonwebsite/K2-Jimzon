// Human labels + brand colours per sales / message channel, so marketplace
// orders and messages are instantly recognisable in the admin — ready for the
// day connectors start writing marketplace rows into orders / conversations.
const META = {
  // order channels (orders.channel_source)
  shopee: { label: 'Shopee', color: '#EE4D2D' },
  shopee_account_1: { label: 'Shopee', color: '#EE4D2D' },
  shopee_account_2: { label: 'Shopee', color: '#EE4D2D' },
  lazada: { label: 'Lazada', color: '#1A00B4' },
  tiktok: { label: 'TikTok Shop', color: '#111111' },
  website_retail: { label: 'Website', color: '#2563EB' },
  website_vip: { label: 'Website VIP', color: '#D4AF37' },

  // message platforms (conversations.platform)
  WhatsApp: { label: 'WhatsApp', color: '#25D366' },
  Viber: { label: 'Viber', color: '#7360F2' },
  Messenger: { label: 'Messenger', color: '#0084FF' },
  Instagram: { label: 'Instagram', color: '#E1306C' },
  TikTok: { label: 'TikTok', color: '#111111' },
  Shopee: { label: 'Shopee', color: '#EE4D2D' },
  Lazada: { label: 'Lazada', color: '#1A00B4' },
  Website: { label: 'Website', color: '#2563EB' },
  Pasabuy: { label: 'Pasabuy', color: '#B91C1C' },
}

export function channelMeta(key) {
  if (!key) return { label: 'Storefront', color: '#2563EB' }
  return META[key] || { label: String(key), color: '#6B7280' }
}
