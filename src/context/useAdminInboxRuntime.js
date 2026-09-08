import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  adminBffEnabled, getAdminInbox, getAdminInboxHistory, markConversationReadBff,
  createInboxCommandSession, updateConversationWorkflowBff,
  commandOutcomeIsUncertain, UNCERTAIN_COMMAND_NOTICE,
} from '../services/adminBffService'
import { normalizeAdminConversation } from '../lib/adminInboxNormalization'
import {
  applyReadReceipt, isCurrentGeneration, resolveRefreshFailure, shouldStartPoll,
} from './adminInboxPolling'

const POLL_INTERVAL_MS = 8_000

export function useAdminInboxRuntime({ enabled, actorId }) {
  const commandSession = useRef(null)
  useEffect(() => {
    if (!enabled || !actorId) return undefined
    const session = createInboxCommandSession()
    commandSession.current = session
    // Operation identities live only in this runtime, so a reload turns an
    // unresolved command into an unreconcilable one. Warn before that happens.
    const warnOnUnresolved = (event) => {
      if (session.unresolvedCount() === 0) return undefined
      event.preventDefault()
      event.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', warnOnUnresolved)
    return () => {
      window.removeEventListener('beforeunload', warnOnUnresolved)
      session.dispose()
      if (commandSession.current === session) commandSession.current = null
    }
  }, [enabled, actorId])

  const messageCommand = (path, body) => commandSession.current?.run(path, body)
    || Promise.resolve({ ok: false, error: 'Sign in again before sending.' })
  const [conversations, setConversations] = useState([])
  const [inboxStaff, setInboxStaff] = useState([])
  const [inboxState, setInboxState] = useState({
    loading: true, refreshing: false, stale: false, error: '', phase2Ready: true,
    websiteReplyReady: false, completeness: null,
  })
  const secureInbox = adminBffEnabled()

  // One owner per mounted Inbox. Superseded reads are discarded rather than
  // allowed to repopulate state after a disable, sign-out, or newer refresh.
  const generation = useRef(0)
  const inFlight = useRef(false)
  const latestRequest = useRef(0)
  const readAbort = useRef(null)
  const queueSize = useRef(0)

  const mapConversations = (data) => (data || []).map(normalizeAdminConversation)

  // A command whose response was lost may already have committed. Report that
  // distinctly and refresh, so staff reconcile instead of resending blindly.
  const commandFailure = (result, message) => {
    if (!commandOutcomeIsUncertain(result)) return { ok: false, error: message }
    fetchConversations({ background: true })
    return { ok: false, uncertain: true, error: UNCERTAIN_COMMAND_NOTICE }
  }

  const commitConversations = (next) => {
    queueSize.current = next.length
    setConversations(next)
  }

  const fetchConversations = async ({ background = false } = {}) => {
    const requestGeneration = generation.current
    const requestId = ++latestRequest.current
    inFlight.current = true
    setInboxState((previous) => (background
      ? { ...previous, refreshing: true }
      : { ...previous, loading: true, refreshing: true, error: '', stale: false }))

    const failed = (error) => {
      const outcome = resolveRefreshFailure({ background, hasExistingQueue: queueSize.current > 0, error })
      if (!outcome.keepQueue) { commitConversations([]); setInboxStaff([]) }
      setInboxState((previous) => ({
        ...previous,
        loading: false,
        refreshing: false,
        stale: outcome.stale,
        error: outcome.error,
        phase2Ready: outcome.keepQueue ? previous.phase2Ready : false,
        websiteReplyReady: outcome.keepQueue ? previous.websiteReplyReady : false,
      }))
    }

    try {
      if (secureInbox) {
        readAbort.current?.abort()
        const controller = new AbortController()
        readAbort.current = controller
        const result = await getAdminInbox(controller.signal)
        if (!isCurrentGeneration(requestGeneration, generation.current) || result.aborted) return
        if (!result.ok) { failed(result.error); return }
        commitConversations(mapConversations(result.data?.conversations || []))
        setInboxStaff((result.data?.staff || []).map(member => ({
          id: member.id, full_name: member.fullName || member.displayName, email: '', role: member.role,
        })))
        setInboxState({
          loading: false, refreshing: false, stale: false, error: '', phase2Ready: true,
          websiteReplyReady: result.data?.websiteReplyReady === true,
          // What this page of the queue left out, so the view can say so.
          completeness: result.data?.completeness || null,
        })
        return
      }

      if (!supabase) {
        failed('Database connection is unavailable.')
        return
      }

      const phase2Result = await supabase.from('conversations').select(`
        id, customer_name, platform, source_kind, status, priority, unread_count, assigned_to,
        response_due_at, last_inbound_at, last_read_at, resolved_at, last_message_at,
        assigned_profile:user_profiles!conversations_assigned_to_fkey (id, full_name, email),
        messages (id, sender_type, content, is_draft, delivery_status, sent_at, failure_reason, created_at)
      `).order('last_message_at', { ascending: false })

      let data = phase2Result.data
      const phase2Ready = !phase2Result.error
      let warning = ''
      if (phase2Result.error) {
        const legacyResult = await supabase.from('conversations').select(`
          id, customer_name, platform, source_kind, status, last_message_at,
          messages (id, sender_type, content, is_draft, created_at)
        `).order('last_message_at', { ascending: false })
        if (legacyResult.error) throw new Error('INBOX_QUERY_FAILED')
        data = legacyResult.data
        warning = 'Phase 2 inbox controls are not active in the database yet. Read-only legacy view is shown.'
      }

      const websiteCapability = await supabase.rpc('website_reply_capability_v1')
      if (!isCurrentGeneration(requestGeneration, generation.current)) return
      commitConversations(mapConversations(data))
      setInboxState({
        loading: false, refreshing: false, stale: false, error: warning, phase2Ready,
        websiteReplyReady: !websiteCapability.error && websiteCapability.data === true,
        completeness: null,
      })
    } catch {
      if (!isCurrentGeneration(requestGeneration, generation.current)) return
      failed('Inbox records could not be loaded.')
    } finally {
      // Only the newest read clears the gate: a superseded one finishing later
      // must not advertise a free slot while that newer read is still running.
      if (requestId === latestRequest.current && isCurrentGeneration(requestGeneration, generation.current)) {
        inFlight.current = false
      }
    }
  }

  useEffect(() => {
    generation.current += 1
    inFlight.current = false
    if (!enabled || (!secureInbox && !supabase)) {
      readAbort.current?.abort()
      commitConversations([])
      setInboxState({ loading: false, refreshing: false, stale: false, error: '', phase2Ready: true, websiteReplyReady: false })
      return undefined
    }
    fetchConversations()

    if (secureInbox) {
      const poll = () => {
        if (!shouldStartPoll({ enabled: true, hidden: document.hidden, inFlight: inFlight.current })) return
        fetchConversations({ background: true })
      }
      const timer = window.setInterval(poll, POLL_INTERVAL_MS)
      // A hidden tab stops polling; returning to it refreshes immediately so the
      // queue is never both stale and silent.
      const onVisibility = () => { if (!document.hidden) poll() }
      document.addEventListener('visibilitychange', onVisibility)
      return () => {
        window.clearInterval(timer)
        document.removeEventListener('visibilitychange', onVisibility)
        generation.current += 1
        readAbort.current?.abort()
      }
    }

    const channel = supabase.channel('admin:conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchConversations({ background: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchConversations({ background: true }))
      .subscribe()
    return () => {
      generation.current += 1
      supabase.removeChannel(channel)
    }
  }, [enabled, secureInbox])

  const sendMessage = async (conversationId, text, sender) => {
    if (!secureInbox && !supabase) return { ok: false, error: 'Database connection is unavailable.' }
    if (typeof conversationId !== 'string' || !conversationId.includes('-') || conversationId.length <= 10) {
      return { ok: false, error: 'This conversation is not a persisted database record.' }
    }
    if (sender === 'customer') return { ok: false, error: 'Customer messaging is not connected.' }
    if (secureInbox) {
      const result = await messageCommand('internal-note', { conversationId, content: text })
      if (!result.ok) return commandFailure(result, result.error)
      await fetchConversations({ background: true })
      return { ok: true }
    }
    const { error } = await supabase.rpc('append_internal_message', { p_conversation_id: conversationId, p_content: text })
    if (error) return { ok: false, error: 'The internal reply could not be saved.' }
    await fetchConversations({ background: true })
    return { ok: true }
  }

  const sendCustomerReply = async (conversationId, text) => {
    if (!secureInbox && !supabase) return { ok: false, error: 'Database connection is unavailable.' }
    if (!inboxState.websiteReplyReady) return { ok: false, error: 'The website reply migration is not active yet.' }
    if (typeof conversationId !== 'string' || !conversationId.includes('-') || conversationId.length <= 10) {
      return { ok: false, error: 'This conversation is not a persisted database record.' }
    }
    const result = secureInbox
      ? await messageCommand('send-reply', { conversationId, content: text })
      : await supabase.rpc('append_website_customer_reply_v1', {
        p_conversation_id: conversationId, p_content: text,
      })
    const error = secureInbox ? !result.ok : result.error
    if (error) return commandFailure(secureInbox ? result : null, 'The website reply could not be sent.')
    await fetchConversations({ background: true })
    return { ok: true }
  }

  const markConversationRead = async (conversationId) => {
    if (secureInbox && !commandSession.current) return { ok: false, error: 'Sign in again before updating the conversation.' }
    if (!secureInbox && !supabase) return { ok: false, error: 'Database connection is unavailable.' }
    if (!inboxState.phase2Ready) return { ok: false, error: 'Phase 2 inbox controls are not active yet.' }
    // The receipt describes the state at the moment the command was issued, so a
    // replayed or delayed success cannot clear a message that arrived later.
    const readAt = new Date().toISOString()
    const result = secureInbox
      ? await markConversationReadBff(conversationId, commandSession.current)
      : await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })
    const error = secureInbox ? !result.ok : result.error
    if (error) return commandFailure(secureInbox ? result : null, 'The conversation could not be marked as read.')
    setConversations((previous) => previous.map((conversation) => (conversation.id === conversationId
      ? applyReadReceipt(conversation, readAt)
      : conversation)))
    fetchConversations({ background: true })
    return { ok: true }
  }

  const updateConversationWorkflow = async (conversationId, workflow) => {
    if (secureInbox && !commandSession.current) return { ok: false, error: 'Sign in again before updating the conversation.' }
    if (!secureInbox && !supabase) return { ok: false, error: 'Database connection is unavailable.' }
    if (!inboxState.phase2Ready) return { ok: false, error: 'Phase 2 inbox controls are not active yet.' }
    const result = secureInbox
      ? await updateConversationWorkflowBff({
        conversationId, status: workflow.status, priority: workflow.priority,
        assignedTo: workflow.assignedTo || null, responseDueAt: workflow.responseDueAt || null,
        reason: workflow.reason?.trim() || '',
      }, commandSession.current)
      : await supabase.rpc('update_conversation_workflow', {
        p_conversation_id: conversationId, p_status: workflow.status, p_priority: workflow.priority,
        p_assigned_to: workflow.assignedTo || null, p_response_due_at: workflow.responseDueAt || null,
        p_reason: workflow.reason?.trim() || null,
      })
    const error = secureInbox ? !result.ok : result.error
    if (error) return commandFailure(secureInbox ? result : null, 'The conversation workflow could not be updated.')
    await fetchConversations({ background: true })
    return { ok: true }
  }

  const loadConversationHistory = async (conversationId) => {
    if (!secureInbox) return null
    const result = await getAdminInboxHistory(conversationId)
    // A failed read is reported as a failure, never as an empty timeline.
    return { ok: result.ok, events: result.ok ? result.events : [] }
  }

  return {
    conversations, inboxState, inboxStaff, inboxUsesBff: secureInbox,
    loadConversationHistory, sendMessage, sendCustomerReply,
    markConversationRead, updateConversationWorkflow,
  }
}
