/**
 * Canonical normalization and inference for K2 Admin Inbox conversations and messages.
 *
 * Provides deterministic channel origin detection (Website, Virtual Store, Messenger, WhatsApp,
 * Shopee, etc.) and purpose categorization (Wholesale, Pasabuy, Order & Delivery, Product & Shelf, General).
 */

const HIDDEN_MESSAGES_KEY = 'k2_admin_hidden_messages'

export function getArchivedMessageIds() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(HIDDEN_MESSAGES_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

export function addArchivedMessageId(messageId) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !messageId) return
  try {
    const set = getArchivedMessageIds()
    set.add(messageId)
    localStorage.setItem(HIDDEN_MESSAGES_KEY, JSON.stringify([...set]))
  } catch {
    // ignore
  }
}

export function addArchivedMessageIds(messageIds = []) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !messageIds?.length) return
  try {
    const set = getArchivedMessageIds()
    messageIds.forEach((id) => id && set.add(id))
    localStorage.setItem(HIDDEN_MESSAGES_KEY, JSON.stringify([...set]))
  } catch {
    // ignore
  }
}

export function clearArchivedMessageIds() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(HIDDEN_MESSAGES_KEY)
  } catch {
    // ignore
  }
}

export const INBOX_ORIGINS = {
  all: { id: 'all', label: 'All channels', badge: 'All' },
  website: { id: 'website', label: 'Website Storefront', badge: 'Storefront', color: '#2563EB' },
  virtual_store: { id: 'virtual_store', label: 'Virtual Store Shelf', badge: 'Virtual Shelf', color: '#D97706' },
  messenger: { id: 'messenger', label: 'Facebook Messenger', badge: 'Messenger', color: '#0084FF' },
  whatsapp: { id: 'whatsapp', label: 'WhatsApp', badge: 'WhatsApp', color: '#25D366' },
  shopee: { id: 'shopee', label: 'Shopee', badge: 'Shopee', color: '#EE4D2D' },
  lazada: { id: 'lazada', label: 'Lazada', badge: 'Lazada', color: '#1A00B4' },
  tiktok: { id: 'tiktok', label: 'TikTok', badge: 'TikTok', color: '#111111' },
  viber: { id: 'viber', label: 'Viber', badge: 'Viber', color: '#7360F2' },
  instagram: { id: 'instagram', label: 'Instagram', badge: 'Instagram', color: '#E1306C' },
}

export const INBOX_CATEGORIES = {
  all: { id: 'all', label: 'All inquiries', badge: 'All' },
  wholesale: {
    id: 'wholesale',
    label: 'Wholesale / Bulk',
    badge: 'Wholesale',
    color: '#059669',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    description: 'Volume orders, reseller packs, kilo/bulto requests',
  },
  pasabuy: {
    id: 'pasabuy',
    label: 'Pasabuy / Sourcing',
    badge: 'Pasabuy',
    color: '#D97706',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    description: 'Special requests, overseas sourcing, custom procurement',
  },
  order: {
    id: 'order',
    label: 'Order & Delivery',
    badge: 'Order Support',
    color: '#2563EB',
    bg: 'bg-blue/15',
    text: 'text-blue',
    border: 'border-blue/30',
    description: 'Order status, tracking, payment confirmation, dispatch',
  },
  product: {
    id: 'product',
    label: 'Product & Shelf',
    badge: 'Product Inquiry',
    color: '#8B5CF6',
    bg: 'bg-purple-500/15',
    text: 'text-purple-300',
    border: 'border-purple-500/30',
    description: 'Stock availability, taste/flavor, size, shelf guidance',
  },
  general: {
    id: 'general',
    label: 'General Inquiry',
    badge: 'General',
    color: '#6B7280',
    bg: 'bg-white/10',
    text: 'text-white/70',
    border: 'border-white/15',
    description: 'Store hours, location, general assistance',
  },
}

const WHOLESALE_REGEX = /\b(wholesale|bulto|pakyaw|bulk|resell|reseller|distributor|carton|volume discount|kilo|kilos|maramihan|re-seller)\b/i
const PASABUY_REGEX = /\b(pasabuy|pabili|special order|source|japan|korea|bangkok|thailand|duty free|procure|request item|hanap)\b/i
const ORDER_REGEX = /\b(order|tracking|waybill|delivery|deliver|kailan darating|status|bayad|paid|proof of payment|payment slip|receipt|gcash|lalamove|grab|j&t|courier|dispatch|refund|cancellation)\b/i
const PRODUCT_REGEX = /\b(patikim|taste|sarap|lasa|flavor|flavors|available|availability|stock|in stock|shelf|coffee shelf|shelf life|expir|magkano|price|how much|grams|500g|pack|variant|size|kasing sarap)\b/i

export function inferConversationOrigin(conversation) {
  if (!conversation) return 'website'
  const sourceKind = String(conversation.sourceKind ?? conversation.source_kind ?? '').toLowerCase()
  const channel = String(conversation.platform ?? conversation.channel ?? '').toLowerCase()

  if (sourceKind === 'virtual_store_message' || channel.includes('virtual')) {
    return 'virtual_store'
  }
  if (sourceKind === 'website_message' || channel === 'website' || channel.includes('web')) {
    return 'website'
  }
  if (channel.includes('messenger') || channel.includes('facebook') || channel.includes('fb')) {
    return 'messenger'
  }
  if (channel.includes('whatsapp') || channel.includes('wa')) {
    return 'whatsapp'
  }
  if (channel.includes('shopee')) {
    return 'shopee'
  }
  if (channel.includes('lazada')) {
    return 'lazada'
  }
  if (channel.includes('tiktok')) {
    return 'tiktok'
  }
  if (channel.includes('viber')) {
    return 'viber'
  }
  if (channel.includes('instagram') || channel.includes('ig')) {
    return 'instagram'
  }
  return channel || 'website'
}

export function getChannelPortalUrl(channel, conversation = {}) {
  const norm = String(channel || '').toLowerCase()
  if (norm.includes('messenger') || norm.includes('facebook') || norm.includes('fb')) {
    return {
      label: 'Open Meta Inbox',
      url: 'https://business.facebook.com/latest/inbox',
      instruction: 'Paste copied response in Meta Business Suite Messenger inbox',
      platform: 'Messenger',
    }
  }
  if (norm.includes('whatsapp') || norm.includes('wa')) {
    const phone = conversation.customerPhone || conversation.phone || ''
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    return {
      label: 'Open WhatsApp Web',
      url: cleanPhone ? `https://web.whatsapp.com/send?phone=${cleanPhone}` : 'https://web.whatsapp.com',
      instruction: 'Paste copied response in WhatsApp Web or Desktop application',
      platform: 'WhatsApp',
    }
  }
  if (norm.includes('shopee')) {
    return {
      label: 'Open Shopee Webchat',
      url: 'https://seller.shopee.ph/portal/webchat',
      instruction: 'Paste copied response in Shopee Seller Centre Webchat',
      platform: 'Shopee',
    }
  }
  if (norm.includes('lazada')) {
    return {
      label: 'Open Lazada IM',
      url: 'https://sellercenter.lazada.com.ph/im/im-agent',
      instruction: 'Paste copied response in Lazada Seller Center IM Agent',
      platform: 'Lazada',
    }
  }
  if (norm.includes('tiktok')) {
    return {
      label: 'Open TikTok Shop Chat',
      url: 'https://seller-ph.tiktok.com/chat',
      instruction: 'Paste copied response in TikTok Shop Seller Chat',
      platform: 'TikTok',
    }
  }
  if (norm.includes('instagram') || norm.includes('ig')) {
    return {
      label: 'Open Instagram Direct',
      url: 'https://business.facebook.com/latest/inbox',
      instruction: 'Paste copied response in Meta Business Suite Instagram DM',
      platform: 'Instagram',
    }
  }
  if (norm.includes('viber')) {
    return {
      label: 'Open Viber Desktop',
      url: 'viber://',
      instruction: 'Paste copied response in Viber Desktop or Business Chat',
      platform: 'Viber',
    }
  }
  return null
}

export function inferConversationCategory(conversation) {
  if (!conversation) return 'general'
  const explicit = conversation.category || conversation.metadata?.category || conversation.intent
  if (explicit && INBOX_CATEGORIES[explicit] && explicit !== 'general') {
    return explicit
  }

  const sourceKind = String(conversation.sourceKind ?? conversation.source_kind ?? '').toLowerCase()
  const messages = conversation.messages || []
  const corpus = [
    conversation.subject ?? '',
    ...messages.map((m) => m.content ?? m.text ?? ''),
  ].join(' ')

  if (WHOLESALE_REGEX.test(corpus)) return 'wholesale'
  if (PASABUY_REGEX.test(corpus)) return 'pasabuy'
  if (ORDER_REGEX.test(corpus)) return 'order'
  if (PRODUCT_REGEX.test(corpus) || sourceKind === 'virtual_store_message') return 'product'

  return 'general'
}

function normalizeUnreadCount(value) {
  const count = Number(value ?? 0)
  return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0
}

export function normalizeAdminConversation(conversation) {
  const unreadCount = normalizeUnreadCount(conversation.unreadCount ?? conversation.unread_count)
  const origin = inferConversationOrigin(conversation)
  const category = inferConversationCategory(conversation)
  const archivedMsgIds = getArchivedMessageIds()
  const rawMessages = conversation.messages || []
  const visibleMessages = archivedMsgIds.size > 0
    ? rawMessages.filter((m) => !archivedMsgIds.has(m.id))
    : rawMessages

  return {
    id: conversation.id,
    customer: conversation.customerName ?? conversation.customer_name,
    channel: conversation.platform,
    origin,
    category,
    sourceKind: conversation.sourceKind ?? conversation.source_kind ?? '',
    status: conversation.status || 'Open',
    priority: conversation.priority || 'normal',
    unreadCount,
    unread: unreadCount > 0,
    assignedTo: conversation.assignedTo ?? conversation.assigned_to ?? null,
    assignedName: conversation.assigned_profile?.full_name || conversation.assigned_profile?.email || '',
    responseDueAt: conversation.responseDueAt ?? conversation.response_due_at ?? null,
    lastInboundAt: conversation.lastInboundAt ?? conversation.last_inbound_at ?? null,
    lastReadAt: conversation.lastReadAt ?? conversation.last_read_at ?? null,
    resolvedAt: conversation.resolvedAt ?? conversation.resolved_at ?? null,
    lastMessageAt: conversation.lastMessageAt ?? conversation.last_message_at ?? null,
    // The projection carried only the newest messages for this thread.
    messagesTruncated: Boolean(conversation.messagesTruncated),
    anonymousModerationEligible: conversation.anonymousModeration?.eligible === true,
    anonymousBlockAvailable: conversation.anonymousModeration?.hasPrincipal === true,
    anonymousChatBlocked: conversation.anonymousModeration?.isBlocked === true,
    time: (conversation.lastMessageAt ?? conversation.last_message_at)
      ? new Date(conversation.lastMessageAt ?? conversation.last_message_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'No activity',
    messages: visibleMessages.map((message) => ({
      id: message.id,
      sender: (message.senderType ?? message.sender_type) === 'Customer' ? 'customer' : (message.senderType ?? message.sender_type) === 'AI' ? 'ai' : 'agent',
      senderType: message.senderType ?? message.sender_type,
      text: message.content,
      isDraft: Boolean(message.isDraft ?? message.is_draft),
      deliveryStatus: (message.deliveryStatus ?? message.delivery_status) || ((message.senderType ?? message.sender_type) === 'Customer' ? 'received' : 'internal_only'),
      sentAt: message.sentAt ?? message.sent_at ?? null,
      failureReason: message.failed ? 'External delivery failed.' : '',
      createdAt: message.createdAt ?? message.created_at,
    })).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    intent: category || conversation.intent || 'general',
  }
}
