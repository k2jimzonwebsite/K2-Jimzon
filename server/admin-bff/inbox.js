import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STATUS = new Set(['Open', 'Pending', 'Resolved'])
const PRIORITY = new Set(['normal', 'high', 'urgent'])

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('REQUEST_INVALID')
  const allowed = new Set(keys)
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('REQUEST_INVALID')
}

function boundedText(value, { required = false, max = 5000 } = {}) {
  const result = String(value ?? '').trim()
  if ((required && !result) || result.length > max) throw new Error('REQUEST_INVALID')
  return result
}

function uuid(value, { nullable = false } = {}) {
  if (nullable && (value === null || value === '')) return null
  const result = boundedText(value, { required: true, max: 36 })
  if (!UUID.test(result)) throw new Error('REQUEST_INVALID')
  return result
}

export function validateInboxCommand(action, body) {
  if (action === 'inbox_internal_note' || action === 'inbox_send_reply') {
    exactObject(body, ['conversationId', 'content'])
    return { conversationId: uuid(body.conversationId), content: boundedText(body.content, { required: true }) }
  }
  if (action === 'inbox_mark_read') {
    exactObject(body, ['conversationId'])
    return { conversationId: uuid(body.conversationId) }
  }
  if (action === 'inbox_workflow') {
    exactObject(body, ['conversationId', 'status', 'priority', 'assignedTo', 'responseDueAt', 'reason'])
    const status = boundedText(body.status, { required: true, max: 20 })
    const priority = boundedText(body.priority, { required: true, max: 20 }).toLowerCase()
    if (!STATUS.has(status) || !PRIORITY.has(priority)) throw new Error('REQUEST_INVALID')
    let responseDueAt = null
    if (body.responseDueAt !== null && body.responseDueAt !== '') {
      const parsed = new Date(body.responseDueAt)
      if (Number.isNaN(parsed.getTime())) throw new Error('REQUEST_INVALID')
      responseDueAt = parsed.toISOString()
    }
    return {
      conversationId: uuid(body.conversationId), status, priority,
      assignedTo: uuid(body.assignedTo, { nullable: true }), responseDueAt,
      reason: boundedText(body.reason, { max: 500 }),
    }
  }
  throw new Error('REQUEST_INVALID')
}

function mapMessage(message) {
  return {
    id: message.id, senderType: message.sender_type, content: message.content,
    isDraft: Boolean(message.is_draft), deliveryStatus: message.delivery_status,
    sentAt: message.sent_at, failed: Boolean(message.failure_reason), createdAt: message.created_at,
  }
}

export async function readAdminInbox(client) {
  const conversationsResult = await client.from('conversations')
    .select('id,customer_name,platform,source_kind,status,priority,unread_count,assigned_to,response_due_at,last_inbound_at,last_read_at,resolved_at,last_message_at')
    .order('last_message_at', { ascending: false }).limit(200)
  if (conversationsResult.error) throw new Error('INBOX_UNAVAILABLE')
  const conversations = conversationsResult.data || []
  const ids = conversations.map((item) => item.id)
  const [messagesResult, staffResult, websiteReplyResult] = await Promise.all([
    ids.length
      ? client.from('messages').select('id,conversation_id,sender_type,content,is_draft,delivery_status,sent_at,failure_reason,created_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(2000)
      : Promise.resolve({ data: [], error: null }),
    client.from('user_profiles').select('id,full_name,email,role').in('role', ['Admin', 'Staff', 'SuperAdmin']).order('full_name'),
    client.rpc('website_reply_capability_v1'),
  ])
  if (messagesResult.error || staffResult.error) throw new Error('INBOX_UNAVAILABLE')
  const messagesByConversation = new Map()
  for (const message of messagesResult.data || []) {
    const list = messagesByConversation.get(message.conversation_id) || []
    list.push(mapMessage(message))
    messagesByConversation.set(message.conversation_id, list)
  }
  return {
    conversations: conversations.map((conversation) => ({
      id: conversation.id, customerName: conversation.customer_name,
      platform: conversation.platform, sourceKind: conversation.source_kind,
      status: conversation.status, priority: conversation.priority,
      unreadCount: Number(conversation.unread_count || 0), assignedTo: conversation.assigned_to,
      responseDueAt: conversation.response_due_at, lastInboundAt: conversation.last_inbound_at,
      lastReadAt: conversation.last_read_at, resolvedAt: conversation.resolved_at,
      lastMessageAt: conversation.last_message_at,
      messages: messagesByConversation.get(conversation.id) || [],
    })),
    staff: (staffResult.data || []).map((profile) => ({
      id: profile.id, fullName: profile.full_name,
      displayName: profile.full_name || String(profile.email || '').split('@')[0] || 'Staff member',
      role: profile.role,
    })),
    websiteReplyReady: !websiteReplyResult.error && websiteReplyResult.data === true,
  }
}

export async function readConversationHistory(client, conversationId) {
  if (!UUID.test(conversationId)) throw new Error('REQUEST_INVALID')
  const { data, error } = await client.from('conversation_events')
    .select('id,event_type,reason,created_at').eq('conversation_id', conversationId)
    .order('created_at', { ascending: false }).limit(20)
  if (error) throw new Error('INBOX_HISTORY_UNAVAILABLE')
  return data || []
}

export async function handleInboxCommand(req, res, action) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const payload = validateInboxCommand(action, await readJson(req))
    const signed = signedAdminCommandArguments(action, authorized.identity.userId, idempotencyKey, payload)
    // Both database functions are named literally at the call site. A computed
    // name would read the same here but would disappear from the security
    // surface inventory, which can only classify a call it can see statically.
    const { data, error } = action === 'inbox_send_reply'
      ? await authorized.client.rpc('execute_admin_website_reply_v1', signed)
      : await authorized.client.rpc('execute_admin_inbox_command_v1', signed)
    if (error) {
      const providerCode = String(error.message || '')
      if (providerCode.includes('K2_ADMIN_RATE_LIMITED')) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
      if (providerCode.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
      if (providerCode.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
      return safeJson(res, 503, { error: { code: 'INBOX_COMMAND_UNAVAILABLE' } })
    }
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: 'INBOX_COMMAND_UNAVAILABLE' } })
  }
}
