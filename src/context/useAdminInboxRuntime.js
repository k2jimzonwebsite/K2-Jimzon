import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  adminBffEnabled, getAdminInbox, getAdminInboxHistory, markConversationReadBff,
  saveInternalNoteBff, updateConversationWorkflowBff,
} from '../services/adminBffService'

export function useAdminInboxRuntime({ enabled }) {
  const [conversations, setConversations] = useState([])
  const [inboxStaff, setInboxStaff] = useState([])
  const [inboxState, setInboxState] = useState({ loading: true, error: '', phase2Ready: true })
  const secureInbox = adminBffEnabled()

  const mapConversations = (data) => (data || []).map((conversation) => ({
    id: conversation.id,
    customer: conversation.customerName ?? conversation.customer_name,
    channel: conversation.platform,
    status: conversation.status || 'Open',
    priority: conversation.priority || 'normal',
    unreadCount: Number(conversation.unreadCount ?? conversation.unread_count ?? 0),
    unread: Number(conversation.unreadCount ?? conversation.unread_count ?? 0) > 0,
    assignedTo: conversation.assignedTo ?? conversation.assigned_to ?? null,
    assignedName: conversation.assigned_profile?.full_name || conversation.assigned_profile?.email || '',
    responseDueAt: conversation.responseDueAt ?? conversation.response_due_at ?? null,
    lastInboundAt: conversation.lastInboundAt ?? conversation.last_inbound_at ?? null,
    lastReadAt: conversation.lastReadAt ?? conversation.last_read_at ?? null,
    resolvedAt: conversation.resolvedAt ?? conversation.resolved_at ?? null,
    lastMessageAt: conversation.lastMessageAt ?? conversation.last_message_at ?? null,
    time: (conversation.lastMessageAt ?? conversation.last_message_at)
      ? new Date(conversation.lastMessageAt ?? conversation.last_message_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'No activity',
    messages: (conversation.messages || []).map((message) => ({
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
    intent: 'general',
  }))

  const fetchConversations = async () => {
    if (secureInbox) {
      setInboxState((previous) => ({ ...previous, loading: true, error: '' }))
      const result = await getAdminInbox()
      if (!result.ok) {
        setConversations([]); setInboxStaff([])
        setInboxState({ loading: false, error: result.error, phase2Ready: false })
        return
      }
      setConversations(mapConversations(result.data?.conversations || []))
      setInboxStaff((result.data?.staff || []).map(member => ({
        id: member.id, full_name: member.fullName || member.displayName, email: '', role: member.role,
      })))
      setInboxState({ loading: false, error: '', phase2Ready: true })
      return
    }
    if (!supabase) {
      setConversations([])
      setInboxState({ loading: false, error: 'Database connection is unavailable.', phase2Ready: false })
      return
    }
    setInboxState((previous) => ({ ...previous, loading: true, error: '' }))
    try {
      const phase2Result = await supabase.from('conversations').select(`
        id, customer_name, platform, status, priority, unread_count, assigned_to,
        response_due_at, last_inbound_at, last_read_at, resolved_at, last_message_at,
        assigned_profile:user_profiles!conversations_assigned_to_fkey (id, full_name, email),
        messages (id, sender_type, content, is_draft, delivery_status, sent_at, failure_reason, created_at)
      `).order('last_message_at', { ascending: false })

      let data = phase2Result.data
      let phase2Ready = !phase2Result.error
      let warning = ''
      if (phase2Result.error) {
        const legacyResult = await supabase.from('conversations').select(`
          id, customer_name, platform, status, last_message_at,
          messages (id, sender_type, content, is_draft, created_at)
        `).order('last_message_at', { ascending: false })
        if (legacyResult.error) throw new Error('INBOX_QUERY_FAILED')
        data = legacyResult.data
        warning = 'Phase 2 inbox controls are not active in the database yet. Read-only legacy view is shown.'
      }

      setConversations(mapConversations(data))
      setInboxState({ loading: false, error: warning, phase2Ready })
    } catch {
      setConversations([])
      setInboxState({ loading: false, error: 'Inbox records could not be loaded.', phase2Ready: false })
    }
  }

  useEffect(() => {
    if (!enabled || (!secureInbox && !supabase)) {
      setConversations([])
      setInboxState({ loading: false, error: '', phase2Ready: true })
      return undefined
    }
    fetchConversations()
    if (secureInbox) {
      const timer = window.setInterval(fetchConversations, 15_000)
      return () => window.clearInterval(timer)
    }
    const channel = supabase.channel('admin:conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchConversations)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchConversations)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [enabled, secureInbox])

  const sendMessage = async (conversationId, text, sender) => {
    if (!secureInbox && !supabase) return { ok: false, error: 'Database connection is unavailable.' }
    if (typeof conversationId !== 'string' || !conversationId.includes('-') || conversationId.length <= 10) {
      return { ok: false, error: 'This conversation is not a persisted database record.' }
    }
    if (sender === 'customer') return { ok: false, error: 'Customer messaging is not connected.' }
    if (secureInbox) {
      const result = await saveInternalNoteBff(conversationId, text)
      if (!result.ok) return { ok: false, error: result.error }
      await fetchConversations()
      return { ok: true }
    }
    const { error } = await supabase.rpc('append_internal_message', { p_conversation_id: conversationId, p_content: text })
    if (error) return { ok: false, error: 'The internal reply could not be saved.' }
    await fetchConversations()
    return { ok: true }
  }

  const markConversationRead = async (conversationId) => {
    if (!secureInbox && !supabase) return { ok: false, error: 'Database connection is unavailable.' }
    if (!inboxState.phase2Ready) return { ok: false, error: 'Phase 2 inbox controls are not active yet.' }
    const result = secureInbox
      ? await markConversationReadBff(conversationId)
      : await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })
    const error = secureInbox ? !result.ok : result.error
    if (error) return { ok: false, error: 'The conversation could not be marked as read.' }
    setConversations((previous) => previous.map((conversation) => conversation.id === conversationId
      ? { ...conversation, unread: false, unreadCount: 0, lastReadAt: new Date().toISOString() }
      : conversation))
    return { ok: true }
  }

  const updateConversationWorkflow = async (conversationId, workflow) => {
    if (!secureInbox && !supabase) return { ok: false, error: 'Database connection is unavailable.' }
    if (!inboxState.phase2Ready) return { ok: false, error: 'Phase 2 inbox controls are not active yet.' }
    const result = secureInbox
      ? await updateConversationWorkflowBff({
        conversationId, status: workflow.status, priority: workflow.priority,
        assignedTo: workflow.assignedTo || null, responseDueAt: workflow.responseDueAt || null,
        reason: workflow.reason?.trim() || '',
      })
      : await supabase.rpc('update_conversation_workflow', {
        p_conversation_id: conversationId, p_status: workflow.status, p_priority: workflow.priority,
        p_assigned_to: workflow.assignedTo || null, p_response_due_at: workflow.responseDueAt || null,
        p_reason: workflow.reason?.trim() || null,
      })
    const error = secureInbox ? !result.ok : result.error
    if (error) return { ok: false, error: 'The conversation workflow could not be updated.' }
    await fetchConversations()
    return { ok: true }
  }

  const loadConversationHistory = async (conversationId) => {
    if (!secureInbox) return null
    const result = await getAdminInboxHistory(conversationId)
    return result.ok ? result.events : []
  }

  return {
    conversations, inboxState, inboxStaff, inboxUsesBff: secureInbox,
    loadConversationHistory, sendMessage, markConversationRead, updateConversationWorkflow,
  }
}
