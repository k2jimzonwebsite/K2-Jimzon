import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAdminStore as useStore } from '../../context/AdminStoreContext'
import { channelMeta } from '../../lib/channelMeta'
import {
  INBOX_CATEGORIES,
  INBOX_ORIGINS,
  getChannelPortalUrl,
  inferConversationCategory,
  inferConversationOrigin,
} from '../../lib/adminInboxNormalization'
import { AlertIcon, CheckIcon, InboxIcon, SearchIcon, ShieldIcon } from '../../components/ui/icons'
import { MetricRail, StateBanner, WorkspaceIntro } from './AdminWorkspaceUi'
import { STALE_QUEUE_NOTICE } from '../../context/adminInboxPolling'
import { UNCERTAIN_COMMAND_NOTICE } from '../../services/adminBffService'
import { AdminDialog } from '../../components/ui/AdminDialog'

/**
 * Conversations started at a shelf in the virtual store.
 *
 * These get their own treatment in the queue because they carry context nothing
 * else does: the customer was standing in front of a specific product when they
 * asked. Staff answering a store question should know that before they open it,
 * not after — so it is marked on the row itself, not buried in the thread.
 */
const VIRTUAL_STORE_PLATFORM = 'Virtual Store'
const WEBSITE_SOURCE_KINDS = new Set(['website_message', 'virtual_store_message'])

const isFromVirtualStore = (conversation) =>
  conversation?.sourceKind === 'virtual_store_message'
    || conversation?.channel === VIRTUAL_STORE_PLATFORM

const isWebsiteConversation = (conversation) =>
  WEBSITE_SOURCE_KINDS.has(conversation?.sourceKind)
    || conversation?.channel === 'Website'
    || conversation?.channel === VIRTUAL_STORE_PLATFORM

/** The shelf mark. A drawn glyph, so it needs no icon font or image request. */
function ShelfMark({ className = '' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true" fill="none">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 6.5h13M1.5 10.5h13" stroke="currentColor" strokeWidth="1.3" />
      <rect x="3.5" y="3.6" width="2" height="2.9" rx="0.4" fill="currentColor" />
      <rect x="6.6" y="3.6" width="2" height="2.9" rx="0.4" fill="currentColor" opacity="0.55" />
      <rect x="3.5" y="7.6" width="2" height="2.9" rx="0.4" fill="currentColor" opacity="0.55" />
      <rect x="9.7" y="7.6" width="2" height="2.9" rx="0.4" fill="currentColor" />
    </svg>
  )
}

const STATUS_OPTIONS = [
  { value: 'Open', label: 'Needs action' },
  { value: 'Pending', label: 'Waiting on customer' },
  { value: 'Resolved', label: 'Resolved' },
]

const PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

function statusLabel(status) {
  return STATUS_OPTIONS.find(option => option.value === status)?.label || status
}

function toLocalDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function formatMessageTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function deadlineState(value, status) {
  if (!value || status === 'Resolved') return null
  const due = new Date(value)
  const delta = due.getTime() - Date.now()
  const absoluteMinutes = Math.max(1, Math.round(Math.abs(delta) / 60000))
  const hours = Math.floor(absoluteMinutes / 60)
  const minutes = absoluteMinutes % 60
  const duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  return delta < 0
    ? { overdue: true, label: `${duration} overdue` }
    : { overdue: false, label: `${duration} remaining` }
}

function queueRank(conversation) {
  const deadline = deadlineState(conversation.responseDueAt, conversation.status)
  const priority = conversation.priority === 'urgent' ? 300 : conversation.priority === 'high' ? 200 : 100
  const overdue = deadline?.overdue ? 1000 : 0
  const unread = conversation.unreadCount > 0 ? 500 : 0
  return overdue + unread + priority
}

// One timeline, rendered in the desktop aside and the phone/tablet disclosure so
// the same audit trail is reachable at every width (MAP-028 H-012).
function EventHistoryBody({ status, history, onRetry, staff = [] }) {
  if (status === 'loading') {
    return <p role="status" className="text-xs leading-relaxed text-white/40">Loading event history…</p>
  }
  if (status === 'error') {
    return (
      <div className="space-y-2">
        <p className="flex gap-2 text-xs leading-relaxed text-amber">
          <AlertIcon size={14} className="mt-0.5 shrink-0" />Event history could not be loaded.
        </p>
        <button type="button" onClick={onRetry} className="adm-btn min-h-11 w-full border border-adm-line text-xs text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80">
          Retry event history
        </button>
      </div>
    )
  }
  if (history.length === 0) {
    return <p className="text-xs leading-relaxed text-white/40">No workflow events recorded yet.</p>
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/35">Showing the newest {history.length} events.</p>
      {history.map(event => {
        // The actor is shown only when it resolves to a known staff identity;
        // nothing is invented for automated events or removed accounts.
        const actorName = staff.find(member => member?.id === event.actor_id)?.full_name || ''
        return (
          <div key={event.id} className="border-l border-adm-line pl-3">
            <p className="text-xs font-semibold text-white/75">{event.event_type === 'internal_note_added' ? 'Internal note saved' : 'Workflow updated'}</p>
            {actorName && <p className="mt-0.5 text-xs text-white/45">by {actorName}</p>}
            {event.reason && <p className="mt-0.5 text-xs leading-relaxed text-white/55">{event.reason}</p>}
            <time className="mt-1 block text-xs text-white/35">{formatMessageTime(event.created_at)}</time>
          </div>
        )
      })}
    </div>
  )
}

function WorkflowControls({
  compact = false,
  chat,
  workflow,
  setWorkflow,
  inboxState,
  staff,
  savingWorkflow,
  handleWorkflowSave,
  onCategoryChange,
}) {
  if (!chat) return null
  const changingResolution = workflow.status !== chat.status
    && (workflow.status === 'Resolved' || chat.status === 'Resolved')
  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <label className="space-y-1.5 text-xs font-semibold text-white/65">
          <span>Inquiry category</span>
          <select
            value={workflow.category || chat.category || 'general'}
            onChange={event => {
              const next = event.target.value
              setWorkflow(current => ({ ...current, category: next }))
              if (onCategoryChange) onCategoryChange(chat.id, next)
            }}
            disabled={!inboxState.phase2Ready}
            className="adm-input min-h-11 w-full text-base sm:text-sm"
          >
            {Object.values(INBOX_CATEGORIES).filter(c => c.id !== 'all').map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-white/65">
          <span>Status</span>
          <select
            value={workflow.status}
            onChange={event => setWorkflow(current => ({ ...current, status: event.target.value }))}
            disabled={!inboxState.phase2Ready}
            className="adm-input min-h-11 w-full text-base sm:text-sm"
          >
            {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-white/65">
          <span>Priority</span>
          <select
            value={workflow.priority}
            onChange={event => setWorkflow(current => ({ ...current, priority: event.target.value }))}
            disabled={!inboxState.phase2Ready}
            className="adm-input min-h-11 w-full text-base sm:text-sm"
          >
            {PRIORITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-white/65">
          <span>Owner</span>
          <select
            value={workflow.assignedTo}
            onChange={event => setWorkflow(current => ({ ...current, assignedTo: event.target.value }))}
            disabled={!inboxState.phase2Ready}
            className="adm-input min-h-11 w-full text-base sm:text-sm"
          >
            <option value="">Unassigned</option>
            {staff.map(member => (
              <option key={member.id} value={member.id}>
                {member.full_name || member.email} · {member.role}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-white/65">
          <span>Response deadline</span>
          <input
            type="datetime-local"
            value={workflow.responseDueAt}
            onChange={event => setWorkflow(current => ({ ...current, responseDueAt: event.target.value }))}
            disabled={!inboxState.phase2Ready}
            className="adm-input min-h-11 w-full text-base sm:text-sm"
          />
        </label>
      </div>
      <label className="block space-y-1.5 text-xs font-semibold text-white/65">
        <span>{changingResolution ? 'Reason (required)' : 'Workflow note (optional)'}</span>
        <textarea
          value={workflow.reason}
          onChange={event => setWorkflow(current => ({ ...current, reason: event.target.value }))}
          rows={2}
          maxLength={500}
          placeholder={changingResolution ? 'Why is this being resolved or reopened?' : 'Record why ownership, priority, or deadline changed.'}
          disabled={!inboxState.phase2Ready}
          className="adm-input min-h-20 w-full resize-y text-base sm:text-sm"
        />
      </label>
      <button
        type="button"
        onClick={handleWorkflowSave}
        disabled={!inboxState.phase2Ready || savingWorkflow || (changingResolution && !workflow.reason.trim())}
        className="adm-btn min-h-11 w-full bg-blue text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 disabled:cursor-not-allowed"
      >
        {savingWorkflow ? 'Saving workflow…' : 'Save workflow'}
      </button>
    </div>
  )
}

export function InboxView({ store, database = supabase }) {
  return <InboxWorkspace key={store.user?.id || 'signed-out'} store={store} database={database} />
}

function InboxWorkspace({ store, database }) {
  const {
    conversations,
    inboxState,
    sendMessage,
    sendCustomerReply,
    markConversationRead,
    updateConversationWorkflow,
    inboxStaff,
    inboxUsesBff,
    loadConversationHistory,
    deleteMessage: storeDeleteMessage,
    archiveConversation: storeArchiveConversation,
    deleteAllMessagesInConversation: storeDeleteAllMessages,
    deleteAnonymousConversation,
    blockAnonymousChat,
    unblockAnonymousChat,
    user,
  } = store
  const [activeId, setActiveId] = useState(() => conversations[0]?.id || null)
  const [mobileView, setMobileView] = useState('list')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [originFilter, setOriginFilter] = useState('all')
  const [isMaximized, setIsMaximized] = useState(false)
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(true)
  const [customCategories, setCustomCategories] = useState({})
  const [deletionGuideOpen, setDeletionGuideOpen] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [archiveNotice, setArchiveNotice] = useState('')
  const [archiveReason, setArchiveReason] = useState('Resolved / Customer assisted')
  const [archiving, setArchiving] = useState(false)
  const [clearMessagesOnArchive, setClearMessagesOnArchive] = useState(false)
  const [selectedMessageForRetract, setSelectedMessageForRetract] = useState(null)
  const [copiedSql, setCopiedSql] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState(null)
  const [deletingMessage, setDeletingMessage] = useState(false)
  const [deleteMessageReason, setDeleteMessageReason] = useState('Spam or trolling inquiry')

  const [drafts, setDrafts] = useState({})
  const draft = drafts[activeId]
  const replyText = draft?.text || ''
  const setReplyText = (text) => setDrafts(current => ({ ...current, [activeId]: { text } }))
  const clearSubmittedDraft = (conversationId, submittedDraft) => setDrafts(current => {
    if (current[conversationId] !== submittedDraft) return current
    const next = { ...current }
    delete next[conversationId]
    return next
  })
  const [saveError, setSaveError] = useState('')
  // An unconfirmed command is not a failure: it is an unknown outcome that must
  // be reconciled against the refreshed record (MAP-028 H-002).
  const [uncertainNotice, setUncertainNotice] = useState('')
  // The frozen command behind the uncertainty notice, so its retry reuses the
  // same retained operation identity instead of minting a second command.
  const [uncertainCommand, setUncertainCommand] = useState(null)
  const [templateArmed, setTemplateArmed] = useState(false)
  const [notice, setNotice] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)
  const [savingWorkflow, setSavingWorkflow] = useState(false)
  const [moderationDialog, setModerationDialog] = useState(null)
  const [moderationReason, setModerationReason] = useState('')
  const [moderating, setModerating] = useState(false)
  const [directStaff, setDirectStaff] = useState([])
  const [history, setHistory] = useState([])
  // 'idle' | 'loading' | 'ready' | 'error' — an unreadable timeline must never
  // be presented as an empty one.
  const [historyStatus, setHistoryStatus] = useState('idle')
  const [workflow, setWorkflow] = useState({
    status: 'Open',
    priority: 'normal',
    assignedTo: '',
    responseDueAt: '',
    reason: '',
    category: 'general',
  })
  const messageEndRef = useRef(null)
  const activeRequestContext = useRef(null)
  const historyRequest = useRef(0)

  const getConversationCategory = (c) => customCategories[c?.id] || c?.category || inferConversationCategory(c)
  const getConversationOrigin = (c) => c?.origin || inferConversationOrigin(c)

  useLayoutEffect(() => {
    const context = { conversationId: activeId }
    activeRequestContext.current = context
    setHistory([])
    setHistoryStatus('idle')
    setSaveError('')
    setUncertainNotice('')
    setUncertainCommand(null)
    setTemplateArmed(false)
    setNotice('')
    setSelectedMessageForRetract(null)
    setMessageToDelete(null)
    return () => { activeRequestContext.current = null }
  }, [activeId])

  const filteredConversations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return conversations
      .filter(conversation => {
        const category = getConversationCategory(conversation)
        const origin = getConversationOrigin(conversation)

        const matchesCategory = categoryFilter === 'all' || category === categoryFilter
        const matchesOrigin = originFilter === 'all' || origin === originFilter
        const matchesStatus = statusFilter === 'all'
          || (statusFilter === 'active' && conversation.status !== 'Resolved')
          || conversation.status === statusFilter
        const matchesOwner = ownerFilter === 'all'
          || (ownerFilter === 'unassigned' && !conversation.assignedTo)
          || (ownerFilter === 'mine' && conversation.assignedTo === user?.id)
        const lastText = conversation.messages.at(-1)?.text || ''
        const categoryMeta = INBOX_CATEGORIES[category] || INBOX_CATEGORIES.general
        const originMeta = INBOX_ORIGINS[origin] || channelMeta(conversation.channel)
        const matchesSearch = !normalizedSearch
          || conversation.customer.toLowerCase().includes(normalizedSearch)
          || conversation.channel.toLowerCase().includes(normalizedSearch)
          || lastText.toLowerCase().includes(normalizedSearch)
          || categoryMeta.label.toLowerCase().includes(normalizedSearch)
          || (originMeta.label || '').toLowerCase().includes(normalizedSearch)
        return matchesCategory && matchesOrigin && matchesStatus && matchesOwner && matchesSearch
      })
      .sort((a, b) => queueRank(b) - queueRank(a)
        || new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
  }, [conversations, categoryFilter, originFilter, ownerFilter, search, statusFilter, user?.id, customCategories])

  const categoryCounts = useMemo(() => {
    const counts = { all: conversations.length, wholesale: 0, pasabuy: 0, order: 0, product: 0, general: 0 }
    conversations.forEach(c => {
      const cat = getConversationCategory(c)
      if (counts[cat] !== undefined) counts[cat]++
      else counts.general++
    })
    return counts
  }, [conversations, customCategories])

  useEffect(() => {
    if (!conversations.length) {
      setActiveId(null)
      return
    }
    if (!conversations.some(conversation => conversation.id === activeId)) {
      setActiveId(conversations[0].id)
    }
  }, [activeId, conversations])

  const chat = conversations.find(conversation => conversation.id === activeId) || null
  const portal = chat && !isWebsiteConversation(chat) ? getChannelPortalUrl(chat.channel, chat) : null

  const loadHistory = async (conversationId) => {
    const context = activeRequestContext.current
    if (!context || context.conversationId !== conversationId) return
    const request = ++historyRequest.current
    const owned = () => activeRequestContext.current === context && historyRequest.current === request
    const applyHistory = (ok, events) => {
      if (!owned()) return
      setHistoryStatus(ok ? 'ready' : 'error')
      setHistory(ok ? (events || []) : [])
    }
    if (owned()) setHistoryStatus('loading')
    if (inboxUsesBff) {
      const result = await loadConversationHistory(conversationId)
      // Older callers and fixtures may still return a bare array.
      applyHistory(Array.isArray(result) ? true : result?.ok !== false, Array.isArray(result) ? result : result?.events)
      return
    }
    if (!database || !inboxState.phase2Ready || !conversationId) {
      applyHistory(true, [])
      return
    }
    const { data, error } = await database
      .from('conversation_events')
      .select('id,event_type,actor_id,reason,metadata,created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(20)
    applyHistory(!error, data || [])
  }

  useEffect(() => {
    if (inboxUsesBff) return
    if (!database || !inboxState.phase2Ready) return
    let active = true
    database
      .from('user_profiles')
      .select('id,full_name,email,role')
      .in('role', ['Admin', 'Staff', 'SuperAdmin'])
      .order('full_name')
      .then(({ data, error }) => {
        if (active && !error) setDirectStaff(data || [])
      })
    return () => { active = false }
  }, [database, inboxState.phase2Ready, inboxUsesBff])

  const staff = inboxUsesBff ? inboxStaff : directStaff

  useEffect(() => {
    if (!chat) return
    const currentCategory = getConversationCategory(chat)
    setWorkflow({
      status: chat.status,
      priority: chat.priority,
      assignedTo: chat.assignedTo || '',
      responseDueAt: toLocalDateTime(chat.responseDueAt),
      reason: '',
      category: currentCategory,
    })
    setSaveError('')
    setNotice('')
    loadHistory(chat.id)
    if (chat.unreadCount > 0 && inboxState.phase2Ready) {
      const context = activeRequestContext.current
      markConversationRead(chat.id).then(result => {
        if (activeRequestContext.current !== context) return
        if (!result?.ok) reportCommandFailure(result, 'Could not mark the conversation as read.')
      })
    }
  }, [activeId, inboxState.phase2Ready])

  const lastThreadId = useRef(null)
  useEffect(() => {
    // Background polls must not yank staff away from the message they are
    // reading: a new conversation always starts at the latest message, but
    // growth from a poll only follows when already near the bottom.
    const opened = lastThreadId.current !== activeId
    lastThreadId.current = activeId
    const node = messageEndRef.current?.parentElement
    if (!node) return
    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 120
    if (opened || nearBottom) messageEndRef.current?.scrollIntoView({ block: 'end' })
  }, [activeId, chat?.messages.length])

  const openChat = (id) => {
    setActiveId(id)
    setMobileView('chat')
  }

  const TEMPLATE_TEXT = 'Thanks for your message. Please share the exact item, quantity, preferred delivery area, and required date so K2 staff can review the request.'

  const handleTemplate = () => {
    // A typed draft is staff work. The first click arms the replacement and
    // says so; only the second click overwrites.
    if (replyText.trim() && !templateArmed) {
      setTemplateArmed(true)
      setNotice('Your draft is kept. Click the template action again to replace it.')
      setSaveError('')
      return
    }
    setTemplateArmed(false)
    setReplyText(TEMPLATE_TEXT)
    setNotice(chat && isWebsiteConversation(chat)
      ? 'A neutral template was prepared. Verify it before sending to the website customer.'
      : 'A neutral template was prepared. Verify it before copying to the external channel.')
    setSaveError('')
  }

  const copyResponse = async () => {
    if (!replyText.trim()) return
    const context = activeRequestContext.current
    try {
      await navigator.clipboard.writeText(replyText.trim())
      if (activeRequestContext.current !== context) return
      setNotice(portal?.instruction
        ? `Response copied. ${portal.instruction}.`
        : 'Response copied. Send it through the customer’s verified external channel.')
      setSaveError('')
    } catch {
      if (activeRequestContext.current !== context) return
      setSaveError('Clipboard access was blocked. Select and copy the response manually.')
    }
  }

  const reportCommandFailure = (result, fallback) => {
    if (result?.uncertain) {
      setUncertainNotice(result.error || UNCERTAIN_COMMAND_NOTICE)
      return
    }
    setSaveError(result?.error || fallback)
  }

  const handleSaveNote = async (frozenText) => {
    const text = typeof frozenText === 'string' ? frozenText : replyText
    if (!text.trim() || !chat || savingNote) return
    const context = activeRequestContext.current
    const submittedDraft = draft
    setSavingNote(true)
    setSaveError('')
    setUncertainNotice('')
    setNotice('')
    const result = await sendMessage(chat.id, text, 'agent')
    setSavingNote(false)
    if (result?.ok) clearSubmittedDraft(chat.id, submittedDraft)
    if (activeRequestContext.current !== context) return
    if (!result?.ok) {
      setUncertainCommand(result?.uncertain ? { kind: 'note', conversationId: chat.id, text } : null)
      reportCommandFailure(result, 'The internal note could not be saved.')
      return
    }
    setUncertainCommand(null)
    setNotice('Internal note saved. It was not sent externally.')
    loadHistory(chat.id)
  }

  const handleSendReply = async (frozenText) => {
    const text = typeof frozenText === 'string' ? frozenText : replyText
    if (!text.trim() || !chat || sendingReply || !isWebsiteConversation(chat)) return
    const context = activeRequestContext.current
    const submittedDraft = draft
    setSendingReply(true)
    setSaveError('')
    setUncertainNotice('')
    setNotice('')
    const result = await sendCustomerReply(chat.id, text.trim())
    setSendingReply(false)
    if (result?.ok) clearSubmittedDraft(chat.id, submittedDraft)
    if (activeRequestContext.current !== context) return
    if (!result?.ok) {
      setUncertainCommand(result?.uncertain ? { kind: 'reply', conversationId: chat.id, text } : null)
      reportCommandFailure(result, 'The website reply could not be sent.')
      return
    }
    setUncertainCommand(null)
    setNotice('Sent. The reply is now visible in the customer’s website chat.')
    loadHistory(chat.id)
  }

  const handleWorkflowSave = async (frozenWorkflow) => {
    if (!chat || savingWorkflow) return
    const context = activeRequestContext.current
    // Direct onClick callers pass the click event, not a workflow: only accept
    // a genuine frozen workflow shape, otherwise use live state.
    const submittedWorkflow = frozenWorkflow && typeof frozenWorkflow.status === 'string'
      ? frozenWorkflow
      : workflow
    setSavingWorkflow(true)
    setSaveError('')
    setUncertainNotice('')
    setNotice('')
    if (submittedWorkflow.category) {
      setCustomCategories(current => ({ ...current, [chat.id]: submittedWorkflow.category }))
    }
    const result = await updateConversationWorkflow(chat.id, {
      ...submittedWorkflow,
      responseDueAt: submittedWorkflow.responseDueAt
        ? new Date(submittedWorkflow.responseDueAt).toISOString()
        : null,
    })
    setSavingWorkflow(false)
    if (activeRequestContext.current !== context) return
    if (!result?.ok) {
      setUncertainCommand(result?.uncertain ? { kind: 'workflow', conversationId: chat.id, workflow: submittedWorkflow } : null)
      reportCommandFailure(result, 'Workflow changes could not be saved.')
      return
    }
    setUncertainCommand(null)
    setWorkflow(current => current === submittedWorkflow ? { ...current, reason: '' } : current)
    setNotice('Workflow updated and added to the permanent activity history.')
    loadHistory(chat.id)
  }

  // Retry dispatches the frozen uncertain payload again. The runtime session
  // keys operations by payload, so this resolves the same logical command
  // instead of minting a second one.
  const retryUncertainCommand = () => {
    if (!uncertainCommand || uncertainCommand.conversationId !== activeId) return
    if (uncertainCommand.kind === 'note') handleSaveNote(uncertainCommand.text)
    else if (uncertainCommand.kind === 'reply') handleSendReply(uncertainCommand.text)
    else handleWorkflowSave(uncertainCommand.workflow)
  }

  const handleConfirmDeleteMessage = async () => {
    if (!messageToDelete || deletingMessage) return
    const target = messageToDelete
    setDeletingMessage(true)
    setSaveError('')
    setNotice('')
    let result
    if (typeof storeDeleteMessage === 'function') {
      result = await storeDeleteMessage(target.id, activeId)
    } else if (database) {
      try {
        const { error } = await database
          .from('messages')
          .delete()
          .eq('id', target.id)
        if (error) {
          result = { ok: false, error: error.message }
        } else {
          result = { ok: true }
        }
      } catch (err) {
        result = { ok: false, error: err?.message || 'Database error during message deletion.' }
      }
    } else {
      result = { ok: true }
    }
    setDeletingMessage(false)
    if (!result?.ok) {
      setSaveError(result?.error || 'The message could not be deleted.')
      return
    }
    if (chat?.messages) {
      chat.messages = chat.messages.filter(m => m.id !== target.id)
    }
    setMessageToDelete(null)
    setNotice('Message permanently deleted.')
    loadHistory(activeId)
  }

  const handleArchiveConversation = async () => {
    if (!chat || archiving) return
    const targetId = chat.id
    setArchiving(true)
    setSaveError('')
    setNotice('')

    let result
    if (typeof storeArchiveConversation === 'function') {
      result = await storeArchiveConversation(targetId, archiveReason)
    } else if (database) {
      try {
        const { error } = await database
          .from('conversations')
          .update({
            status: 'Resolved',
            resolved_at: new Date().toISOString(),
          })
          .eq('id', targetId)
        if (error) {
          result = { ok: false, error: error.message }
        } else {
          result = { ok: true }
        }
      } catch (err) {
        result = { ok: false, error: err?.message || 'Database error during conversation archiving.' }
      }
    } else {
      result = { ok: true }
    }

    if (clearMessagesOnArchive) {
      if (typeof storeDeleteAllMessages === 'function') {
        await storeDeleteAllMessages(targetId)
      } else if (database) {
        try {
          await database.from('messages').delete().eq('conversation_id', targetId)
        } catch (err) {
          console.warn('Failed clearing messages:', err)
        }
      }
    }

    setArchiving(false)
    if (!result?.ok) {
      setSaveError(result?.error || 'Conversation could not be archived.')
      return
    }

    setArchiveDialogOpen(false)
    setDeletionGuideOpen(false)
    setArchiveNotice('Conversation marked Resolved and archived from active view.')
    setNotice('Conversation marked Resolved and archived from active view.')
    setMobileView('list')
    const remaining = conversations.filter(c => c.id !== targetId && c.status !== 'Resolved')
    if (remaining.length > 0) {
      setActiveId(remaining[0].id)
    }
  }

  const canModerateAnonymous = ['Admin', 'SuperAdmin'].includes(user?.role)
  const openModeration = (kind, target) => {
    setModerationReason('')
    setSaveError('')
    setModerationDialog({ kind, target })
  }
  const submitModeration = async (event) => {
    event.preventDefault()
    if (!moderationDialog || moderationReason.trim().length < 3 || moderating) return
    setModerating(true)
    const { kind, target } = moderationDialog
    const result = kind === 'delete'
      ? await deleteAnonymousConversation(target, moderationReason.trim())
      : kind === 'block'
        ? await blockAnonymousChat(target, moderationReason.trim())
        : await unblockAnonymousChat(target, moderationReason.trim())
    setModerating(false)
    if (!result?.ok) { setSaveError(result?.error || 'The moderation action could not be completed.'); return }
    setModerationDialog(null)
    setModerationReason('')
    setNotice(kind === 'delete' ? 'Anonymous conversation deleted from both views.' : kind === 'block' ? 'Anonymous chat source blocked.' : 'Anonymous chat source unblocked.')
    if (kind === 'delete') setMobileView('list')
  }

  const activeCount = conversations.filter(conversation => conversation.status !== 'Resolved').length
  const unreadCount = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0)
  const overdueCount = conversations.filter(conversation => deadlineState(conversation.responseDueAt, conversation.status)?.overdue).length
  const unassignedCount = conversations.filter(conversation => conversation.status !== 'Resolved' && !conversation.assignedTo).length
  const urgentCount = conversations.filter(conversation => conversation.status !== 'Resolved' && conversation.priority === 'urgent').length
  const liveWebsiteCount = conversations.filter(conversation =>
    conversation.status !== 'Resolved' && isWebsiteConversation(conversation)).length

  if (inboxState.loading && conversations.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center rounded-adm border border-adm-line bg-adm-bg text-sm text-white/55" role="status">
        Loading saved conversations…
      </div>
    )
  }

  if (!chat) {
    return (
      <section className="rounded-adm border border-adm-line bg-adm-bg p-6 text-center">
        {inboxState.error && <p role="alert" className="mb-4 rounded-adm-sm border border-amber/40 bg-amber/10 p-3 text-sm text-amber">{inboxState.error}</p>}
        <InboxIcon size={30} className="mx-auto text-white/40" />
        <h2 className="mt-3 text-base font-semibold text-white">No saved conversations</h2>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-white/50">
          This queue stays empty until a real conversation row reaches Supabase. External channel connectors are not configured.
        </p>
      </section>
    )
  }

  // The read is bounded on purpose (MAP-028 H-007). Say what is not on screen
  // rather than letting a page look like the whole record.
  const queueTruncated = Boolean(inboxState.completeness?.conversations?.truncated)
  // Counts come from the loaded window, which may be a truncated page of a
  // larger queue. Say so wherever the counts appear.
  const windowNote = queueTruncated ? ' · this page' : ''
  const chatDeadline = deadlineState(chat.responseDueAt, chat.status)
  const chatIsWebsite = isWebsiteConversation(chat)
  const chatCategory = getConversationCategory(chat)
  const chatCategoryMeta = INBOX_CATEGORIES[chatCategory] || INBOX_CATEGORIES.general

  return (
    <section aria-label="Unified message control" className="flex flex-1 min-h-0 flex-col w-full max-w-[1600px] mx-auto space-y-2">
      <WorkspaceIntro
        eyebrow="Customer workload"
        title="Unified message control"
        description="Website live chat appears here and customers see your replies. Shopee, Lazada, and TikTok still need copied replies from their Seller Centers."
        status={inboxState.websiteReplyReady ? 'Website chat connected' : 'Website reply migration pending'}
        statusTone={inboxState.websiteReplyReady ? 'success' : 'warning'}
        actions={
          <button
            type="button"
            onClick={() => setIsMaximized(current => !current)}
            className="adm-btn min-h-11 border border-blue/40 bg-blue/10 px-3.5 text-xs font-semibold text-blue hover:bg-blue/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80"
            aria-label={isMaximized ? 'Restore standard view' : 'Enlarge workspace (More messages)'}
          >
            {isMaximized ? '⇱ Standard overview' : '⛶ Enlarge workspace'}
          </button>
        }
      />

      {!isMaximized ? (
        <MetricRail columns="lg:grid-cols-6" items={[
          { label: 'Active', value: activeCount, detail: `Open or waiting on customer${windowNote}` },
          { label: 'Live web', value: liveWebsiteCount, detail: `Customer-visible website threads${windowNote}`, tone: liveWebsiteCount ? 'text-forest' : 'text-white' },
          { label: 'Unread', value: unreadCount, detail: `Saved unread messages${windowNote}`, tone: unreadCount ? 'text-blue' : 'text-white' },
          { label: 'Overdue', value: overdueCount, detail: `Response deadline passed${windowNote}`, tone: overdueCount ? 'text-crimson' : 'text-white' },
          { label: 'Unassigned', value: unassignedCount, detail: `Active without an owner${windowNote}`, tone: unassignedCount ? 'text-amber' : 'text-white' },
          { label: 'Urgent', value: urgentCount, detail: `Active urgent priority${windowNote}`, tone: urgentCount ? 'text-crimson' : 'text-white' },
        ]} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-adm border border-adm-line bg-adm-surface px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-white">Queue status:</span>
            <span className="text-white/70">Active: <strong className="text-white font-mono">{activeCount}</strong></span>
            <span className="text-white/30">·</span>
            <span className="text-forest">Live web: <strong className="text-white font-mono">{liveWebsiteCount}</strong></span>
            <span className="text-white/30">·</span>
            <span className="text-blue">Unread: <strong className="text-white font-mono">{unreadCount}</strong></span>
            <span className="text-white/30">·</span>
            <span className="text-crimson">Overdue: <strong className="text-white font-mono">{overdueCount}</strong></span>
            <span className="text-white/30">·</span>
            <span className="text-emerald-400">Wholesale: <strong className="text-white font-mono">{categoryCounts.wholesale}</strong></span>
            <span className="text-white/30">·</span>
            <span className="text-amber-400">Pasabuy: <strong className="text-white font-mono">{categoryCounts.pasabuy}</strong></span>
          </div>
          <span className="text-xs text-blue/90 font-medium">Maximized reading mode active (+200px viewport)</span>
        </div>
      )}

      {inboxState.stale
        ? <StateBanner tone="warning" role="status">{inboxState.error || STALE_QUEUE_NOTICE}</StateBanner>
        : inboxState.error && <StateBanner tone="warning">{inboxState.error}</StateBanner>}

      {queueTruncated && (
        <StateBanner tone="neutral" role="status">
          Showing the {inboxState.completeness.conversations.returned} most recently active conversations.
          Older ones exist beyond this page: search or resolve threads to bring them into view.
        </StateBanner>
      )}

      {archiveNotice && (
        <StateBanner tone="success" role="status">
          {archiveNotice}
        </StateBanner>
      )}

      {canModerateAnonymous && inboxState.moderationReady && inboxState.activeBlocks?.length > 0 && (
        <section className="rounded-adm border border-adm-line bg-adm-bg p-4" aria-labelledby="blocked-chat-title">
          <h2 id="blocked-chat-title" className="text-sm font-semibold text-white">Blocked anonymous chats</h2>
          <p className="mt-1 text-xs text-white/50">Only non-reversible IP hashes are stored. Unblocking is always manual.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {inboxState.activeBlocks.map(block => (
              <button key={block.id} type="button" onClick={() => openModeration('unblock', block.id)} className="adm-btn min-h-11 border border-adm-line bg-adm-raised px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80">
                Unblock anonymous chat{block.lastConversationReference ? ` · ${block.lastConversationReference}` : ''}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden rounded-adm border border-adm-line bg-adm-bg transition-all duration-200">
        <div className={`${mobileView === 'chat' ? 'hidden' : 'flex'} w-full shrink-0 flex-col border-r border-adm-line bg-adm-bg lg:flex lg:w-80 xl:w-[22rem]`}>
          <div className="space-y-2 border-b border-adm-line p-3">
            <label className="relative block">
              <span className="sr-only">Search conversations</span>
              <SearchIcon size={16} className="pointer-events-none absolute left-3 top-3.5 text-white/40" />
              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search customer, message or category"
                className="adm-input min-h-11 w-full pl-9 text-base sm:text-sm"
              />
            </label>

            {/* Quick Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin" role="tablist" aria-label="Inquiry purpose categories">
              {[
                { id: 'all', label: 'All', count: categoryCounts.all },
                { id: 'wholesale', label: 'Wholesale', count: categoryCounts.wholesale },
                { id: 'pasabuy', label: 'Pasabuy', count: categoryCounts.pasabuy },
                { id: 'order', label: 'Orders', count: categoryCounts.order },
                { id: 'product', label: 'Shelf', count: categoryCounts.product },
                { id: 'general', label: 'General', count: categoryCounts.general },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === tab.id}
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 ${
                    categoryFilter === tab.id
                      ? 'bg-blue text-white shadow-sm'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                      categoryFilter === tab.id ? 'bg-white/25 text-white' : 'bg-white/10 text-white/60'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label>
                <span className="sr-only">Filter by status</span>
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="adm-input min-h-11 w-full text-base sm:text-xs">
                  <option value="active">Active</option>
                  <option value="all">All statuses</option>
                  {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Filter by channel origin</span>
                <select value={originFilter} onChange={event => setOriginFilter(event.target.value)} className="adm-input min-h-11 w-full text-base sm:text-xs">
                  <option value="all">All channels</option>
                  <option value="website">Website Storefront</option>
                  <option value="virtual_store">Virtual Store Shelf</option>
                  <option value="messenger">Messenger</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="shopee">Shopee</option>
                  <option value="lazada">Lazada</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Filter by owner</span>
                <select value={ownerFilter} onChange={event => setOwnerFilter(event.target.value)} className="adm-input min-h-11 w-full text-base sm:text-xs">
                  <option value="all">All owners</option>
                  <option value="mine">Assigned to me</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </label>
            </div>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-2" aria-label="Conversation queue">
            {filteredConversations.length === 0 && (
              <div className="p-6 text-center text-sm text-white/45">No conversations match these filters.</div>
            )}
            {filteredConversations.map(conversation => {
              const meta = channelMeta(conversation.channel)
              const deadline = deadlineState(conversation.responseDueAt, conversation.status)
              const lastMessage = conversation.messages.at(-1)
              const fromStore = isFromVirtualStore(conversation)
              const fromWebsite = isWebsiteConversation(conversation)
              const category = getConversationCategory(conversation)
              const categoryMeta = INBOX_CATEGORIES[category] || INBOX_CATEGORIES.general
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => openChat(conversation.id)}
                  aria-current={activeId === conversation.id ? 'true' : undefined}
                  className={`relative min-h-[76px] w-full overflow-hidden rounded-adm-sm border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 ${
                    activeId === conversation.id ? 'border-blue/45 bg-blue/10' : 'border-transparent hover:bg-white/5'
                  } ${fromWebsite && activeId !== conversation.id ? 'bg-blue/[0.06]' : ''}`}
                >
                  {/* A brass edge down the side of the row. Colour alone would
                      not survive a monochrome display or a colour-blind reader,
                      so it is paired with the mark and the label below. */}
                  {fromWebsite && (
                    <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-blue" />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <span className={`truncate text-sm font-semibold ${conversation.unreadCount ? 'text-white' : 'text-white/75'}`}>{conversation.customer}</span>
                    <span className="shrink-0 text-xs text-white/40">{conversation.time}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {conversation.unreadCount > 0 && <span className="rounded-full bg-crimson px-1.5 py-0.5 text-xs font-bold text-white">{conversation.unreadCount}</span>}
                    <span
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide"
                      style={{ color: meta.color, backgroundColor: `${meta.color}22` }}
                    >
                      {fromStore && <ShelfMark className="h-3 w-3" />}
                      {meta.label}
                    </span>
                    {fromWebsite && (
                      <span className="inline-flex items-center gap-1 rounded border border-blue/35 bg-blue/10 px-1.5 py-0.5 text-xs font-bold uppercase tracking-[0.14em] text-blue">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue" aria-hidden="true" />
                        {fromStore ? 'Live web · Asked at the shelf' : 'Live web'}
                      </span>
                    )}
                    {categoryMeta && (
                      <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-semibold tracking-wide ${categoryMeta.bg} ${categoryMeta.text} ${categoryMeta.border}`}>
                        {categoryMeta.badge}
                      </span>
                    )}
                    <span className="truncate text-xs text-white/45">{statusLabel(conversation.status)}</span>
                    {conversation.priority !== 'normal' && <span className={conversation.priority === 'urgent' ? 'text-xs font-bold uppercase text-crimson' : 'text-xs font-bold uppercase text-amber'}>{conversation.priority}</span>}
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-white/45">{lastMessage?.text || 'No messages recorded'}</p>
                  {deadline && <p className={deadline.overdue ? 'mt-1 text-xs font-semibold text-crimson' : 'mt-1 text-xs text-white/40'}>{deadline.label}</p>}
                </button>
              )
            })}
          </div>
        </div>

        <div className={`${mobileView === 'list' ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col bg-adm-surface lg:flex`}>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-adm-line bg-white/5 px-3 py-2 sm:flex-nowrap sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className="-ml-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-adm-sm text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 lg:hidden"
                aria-label="Back to conversation list"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-[15px] font-semibold text-white">{chat.customer}</h3>
                  {chatIsWebsite ? (
                    <span className="inline-flex items-center gap-1.5 rounded border border-blue/45 bg-blue/15 px-2 py-0.5 text-xs font-bold tracking-wide text-blue">
                      {isFromVirtualStore(chat) ? <ShelfMark className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-blue" aria-hidden="true" />}
                      LIVE WEBSITE CHAT{isFromVirtualStore(chat) ? ' · VIRTUAL STORE' : ''}
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-forest/15 px-1.5 py-0.5 text-xs font-medium text-forest">via {chat.channel}</span>
                      {portal && (
                        <a
                          href={portal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-1 rounded border border-adm-line bg-adm-raised px-2.5 text-xs font-medium text-white/80 hover:border-blue/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80"
                          title={portal.instruction}
                        >
                          <span>{portal.label}</span>
                          <span aria-hidden="true">↗</span>
                        </a>
                      )}
                    </div>
                  )}
                  {chatCategoryMeta && (
                    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${chatCategoryMeta.bg} ${chatCategoryMeta.text} ${chatCategoryMeta.border}`}>
                      {chatCategoryMeta.label}
                    </span>
                  )}
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/65">{statusLabel(chat.status)}</span>
                </div>
                <p className="mt-0.5 text-xs text-white/40">
                  {chat.assignedName ? `Owned by ${chat.assignedName}` : 'Unassigned'}
                  {chatDeadline ? ` · ${chatDeadline.label}` : ''}
                </p>
                {chatIsWebsite ? (
                  <p className="mt-1 text-xs font-medium text-blue">
                    Replies appear in the customer’s website chat
                  </p>
                ) : portal ? (
                  <p className="mt-1 text-xs text-white/60">
                    {portal.instruction}
                  </p>
                ) : null}
                {canModerateAnonymous && inboxState.moderationReady && chat.anonymousModerationEligible && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => openModeration('delete', chat.id)} className="min-h-11 rounded-adm-sm border border-crimson/45 bg-crimson/10 px-3 text-xs font-semibold text-crimson focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80">Delete anonymous conversation</button>
                    <button type="button" onClick={() => openModeration('block', chat.id)} disabled={!chat.anonymousBlockAvailable || chat.anonymousChatBlocked} className="min-h-11 rounded-adm-sm border border-amber/45 bg-amber/10 px-3 text-xs font-semibold text-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 disabled:cursor-not-allowed disabled:opacity-45">Block anonymous chat</button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Header Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setArchiveDialogOpen(true)}
                className="adm-btn min-h-11 border border-forest/40 bg-forest/10 px-3 text-xs font-semibold text-forest hover:bg-forest/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/80"
                title="Archive conversation as Resolved and remove from active staff view"
              >
                <CheckIcon size={14} className="mr-1.5 inline text-forest" />
                Archive / Remove Thread
              </button>
              <button
                type="button"
                onClick={() => setDeletionGuideOpen(true)}
                className="adm-btn min-h-11 border border-adm-line bg-adm-raised px-3 text-xs font-semibold text-white/80 hover:border-blue/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80"
                title="Message retraction guidance and conversation moderation"
              >
                <ShieldIcon size={14} className="mr-1.5 inline text-amber" />
                Message Actions & Deletion
              </button>
              <button
                type="button"
                onClick={() => setIsWorkflowOpen(current => !current)}
                className="adm-btn hidden min-h-11 border border-adm-line bg-adm-raised px-3 text-xs font-semibold text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 xl:inline-flex xl:items-center xl:gap-1.5"
                title="Toggle workflow panel to expand reading area"
              >
                <span>{isWorkflowOpen ? 'Hide workflow' : 'Show workflow'}</span>
                <span className="text-xs text-white/40">{isWorkflowOpen ? '⇸' : '⇷'}</span>
              </button>
            </div>
          </div>

          <details className="shrink-0 border-b border-adm-line bg-adm-bg p-3 xl:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-white">Workflow controls</summary>
            <div className="mt-3">
              <WorkflowControls
                compact
                chat={chat}
                workflow={workflow}
                setWorkflow={setWorkflow}
                inboxState={inboxState}
                staff={staff}
                savingWorkflow={savingWorkflow}
                handleWorkflowSave={handleWorkflowSave}
                onCategoryChange={(cid, cat) => setCustomCategories(c => ({ ...c, [cid]: cat }))}
              />
            </div>
          </details>

          <details className="shrink-0 border-b border-adm-line bg-adm-bg p-3 xl:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-white">Event history</summary>
            <div className="mt-3">
              <EventHistoryBody status={historyStatus} history={history} onRetry={() => loadHistory(chat.id)} staff={staff} />
            </div>
          </details>

          <div className="flex-1 space-y-2 overflow-y-auto p-3 sm:p-4" aria-live="polite">
            {chat.messagesTruncated && (
              <p role="status" className="rounded-adm-sm border border-adm-line bg-adm-sunken px-3 py-2 text-center text-xs leading-relaxed text-white/55">
                Showing the newest {chat.messages.length} messages. This conversation has older messages that are not loaded here.
              </p>
            )}
            {chat.messages.length === 0 && <p className="py-8 text-center text-sm text-white/45">No message content has been recorded.</p>}
            {chat.messages.map(message => (
              <div key={message.id} className={`flex ${message.sender === 'customer' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[88%] rounded-adm px-3.5 py-2 text-[14px] leading-relaxed sm:max-w-[75%] ${
                  message.sender === 'customer'
                    ? 'rounded-tl-sm bg-white/10 text-neutral-200'
                    : 'rounded-tr-sm border border-blue/30 bg-blue/15 text-white'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5 text-xs text-white/45">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>{formatMessageTime(message.createdAt)}</span>
                      {message.deliveryStatus === 'internal_only' && <span>· Internal only, not sent</span>}
                      {message.deliveryStatus === 'failed' && <span className="text-crimson">· Delivery failed</span>}
                      {message.deliveryStatus === 'sent' && <span className="text-forest">· {chatIsWebsite ? 'Visible in website chat' : 'Sent externally'}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMessageToDelete(message)
                          setDeleteMessageReason('Spam or trolling inquiry')
                        }}
                        className="text-xs text-white/40 hover:text-crimson underline decoration-dotted transition-colors"
                        title="Delete this message directly"
                      >
                        Delete
                      </button>
                      {message.sender !== 'customer' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMessageForRetract(message)
                            setDeletionGuideOpen(true)
                          }}
                          className="text-xs text-white/40 hover:text-amber underline decoration-dotted"
                          title="How to redact or delete this message"
                        >
                          Retract
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messageEndRef} />
          </div>

          <div className="shrink-0 space-y-2 border-t border-adm-line bg-white/5 p-3">
            {saveError && <p role="alert" className="rounded-adm-sm border border-crimson/40 bg-crimson/10 p-2.5 text-xs text-crimson">{saveError}</p>}
            {uncertainNotice && (
              <div className="space-y-2">
                <p role="alert" className="flex gap-2 rounded-adm-sm border border-amber/40 bg-amber/10 p-2.5 text-xs leading-relaxed text-amber"><AlertIcon size={14} className="mt-0.5 shrink-0" />{uncertainNotice}</p>
                {uncertainCommand && uncertainCommand.conversationId === activeId && (
                  <button type="button" onClick={retryUncertainCommand} disabled={savingNote || sendingReply || savingWorkflow} className="adm-btn min-h-11 w-full border border-amber/40 bg-amber/10 text-xs font-semibold text-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 disabled:cursor-not-allowed disabled:opacity-45">
                    Retry the same command
                  </button>
                )}
              </div>
            )}
            {notice && <p role="status" className="flex items-start gap-2 rounded-adm-sm border border-forest/40 bg-forest/10 p-2.5 text-xs text-forest"><CheckIcon size={14} className="mt-0.5 shrink-0" />{notice}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="inbox-internal-note" className="text-xs font-semibold text-white/65">
                {chatIsWebsite ? 'Customer-visible website reply' : 'Internal note or response draft'}
              </label>
              <span className={`text-xs ${chatIsWebsite ? 'text-forest' : 'text-amber'}`}>
                {chatIsWebsite
                  ? (inboxState.websiteReplyReady ? 'Connected to this website thread' : 'Migration required before sending')
                  : 'Not sent externally'}
              </span>
            </div>
            <textarea
              id="inbox-internal-note"
              value={replyText}
              onChange={event => setReplyText(event.target.value)}
              placeholder={chatIsWebsite ? 'Write the reply the customer will see in the store…' : 'Record an internal note or prepare text to copy…'}
              rows={2}
              maxLength={5000}
              className="adm-input min-h-[64px] w-full resize-y text-base sm:text-sm"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button type="button" onClick={handleTemplate} className="adm-btn min-h-11 border border-blue/40 bg-blue/10 text-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80">{templateArmed ? 'Replace draft with template' : 'Create safe template'}</button>
              {chatIsWebsite ? (
                <>
                  <button type="button" onClick={handleSaveNote} disabled={!replyText.trim() || savingNote || sendingReply} className="adm-btn min-h-11 border border-adm-line bg-adm-raised text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 disabled:cursor-not-allowed">{savingNote ? 'Saving…' : 'Save as internal note'}</button>
                  <button type="button" onClick={handleSendReply} disabled={!inboxState.websiteReplyReady || !replyText.trim() || savingNote || sendingReply} className="adm-btn min-h-11 bg-blue text-white shadow-[0_0_0_1px_rgba(74,144,226,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 disabled:cursor-not-allowed">{sendingReply ? 'Sending…' : 'Send to website customer'}</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={copyResponse} disabled={!replyText.trim()} className="adm-btn min-h-11 border border-adm-line bg-adm-raised text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 disabled:cursor-not-allowed">Copy for external reply</button>
                  <button type="button" onClick={handleSaveNote} disabled={!replyText.trim() || savingNote} className="adm-btn min-h-11 bg-blue text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 disabled:cursor-not-allowed">{savingNote ? 'Saving…' : 'Save internal note'}</button>
                </>
              )}
            </div>
          </div>
        </div>

        <aside className={`${isWorkflowOpen ? 'xl:flex' : 'xl:hidden'} hidden w-80 shrink-0 flex-col border-l border-adm-line bg-adm-bg`} aria-label="Conversation workflow">
          <div className="flex items-center justify-between border-b border-adm-line px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Workflow</h3>
              <p className="mt-0.5 text-xs text-white/45">Owner, category, deadline & audit</p>
            </div>
            <button
              type="button"
              onClick={() => setIsWorkflowOpen(false)}
              className="rounded-adm-sm p-1 text-white/40 hover:bg-white/10 hover:text-white"
              title="Collapse workflow panel to widen messages"
              aria-label="Collapse workflow panel"
            >
              ⇸
            </button>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {!inboxState.phase2Ready && (
              <div className="flex gap-2 rounded-adm-sm border border-amber/40 bg-amber/10 p-3 text-xs leading-relaxed text-amber">
                <AlertIcon size={16} className="shrink-0" />Activate the verified Phase 2 migration to use workflow controls.
              </div>
            )}
            <WorkflowControls
              chat={chat}
              workflow={workflow}
              setWorkflow={setWorkflow}
              inboxState={inboxState}
              staff={staff}
              savingWorkflow={savingWorkflow}
              handleWorkflowSave={handleWorkflowSave}
              onCategoryChange={(cid, cat) => setCustomCategories(c => ({ ...c, [cid]: cat }))}
            />
            <div className="border-t border-adm-line pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/45">Event history</h4>
              <div className="mt-3">
                <EventHistoryBody status={historyStatus} history={history} onRetry={() => loadHistory(chat.id)} staff={staff} />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {deletionGuideOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/80 backdrop-blur-sm sm:place-items-center sm:p-6" role="presentation" onMouseDown={e => e.target === e.currentTarget && setDeletionGuideOpen(false)}>
          <AdminDialog onClose={() => setDeletionGuideOpen(false)} labelledBy="deletion-guide-title">
            <section className="w-full max-w-2xl rounded-t-adm border border-adm-line bg-adm-surface p-6 shadow-2xl sm:rounded-adm max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4 border-b border-adm-line pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-amber/15 px-2 py-0.5 text-xs font-bold text-amber uppercase tracking-wider">Audit Security & Moderation</span>
                    <span className="text-xs text-white/40">Thread #{chat.id.slice(0, 8)}</span>
                  </div>
                  <h2 id="deletion-guide-title" className="mt-1 text-xl font-bold text-white">Message Retraction & Moderation Control</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDeletionGuideOpen(false)}
                  className="rounded-adm-sm p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
                  aria-label="Close dialog"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div className="mt-5 space-y-6 text-sm">
                {/* 1-Click Archive & Remove from Inbox (Staff Recommended) */}
                <div className="rounded-adm border border-forest/40 bg-forest/[0.08] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-forest flex items-center gap-2">
                        <CheckIcon size={16} className="shrink-0" />
                        1-Click Archive &amp; Remove from Active Inbox
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-white/80">
                        The easiest way to remove this thread from staff space. Marks status as <strong>Resolved</strong> so it instantly disappears from your active queue. The conversation remains safely recorded in Supabase for audit, financial, or dispute compliance.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDeletionGuideOpen(false)
                        setArchiveDialogOpen(true)
                      }}
                      className="adm-btn min-h-11 border border-forest/50 bg-forest px-4 text-xs font-semibold text-white hover:bg-forest/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/80"
                    >
                      Archive &amp; Remove This Thread
                    </button>
                  </div>
                </div>

                {/* Single Message Deletion Guidance */}
                <div className="rounded-adm border border-adm-line bg-adm-bg p-4">
                  <h3 className="font-semibold text-white">Delete Individual Messages (1-Click)</h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/70">
                    To delete an errant, offensive, or accidental message: simply hover (or tap) the message bubble in the conversation stream and click the red trash icon. You can choose a deletion reason and confirm removal directly without SQL.
                  </p>
                </div>

                {/* Emergency Message Retraction */}
                <div className="rounded-adm border border-crimson/30 bg-crimson/[0.06] p-4">
                  <h3 className="font-semibold text-crimson flex items-center gap-2">
                    <AlertIcon size={16} className="shrink-0" />
                    How to Delete or Retract an Errant Message
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/75">
                    Under K2 Jimzon data integrity rules, message tables maintain an <strong>immutable audit trail</strong> with Row-Level Security (RLS) to prevent unauthorized tampering.
                    If staff sent an accidental, inappropriate, or errant message (e.g. offensive text or internal slip-up), an authorized Admin must delete it directly via the <strong>Supabase SQL Editor</strong>.
                  </p>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>Prefilled SQL for this active thread:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const targetText = selectedMessageForRetract?.text || 'tirahin kita eh'
                          const sql = `-- K2 Emergency Message Deletion
-- Conversation: ${chat.customer} (${chat.id})

-- 1. Inspect messages in this thread:
SELECT id, sender_type, content, created_at 
FROM public.messages 
WHERE conversation_id = '${chat.id}' 
ORDER BY created_at DESC;

-- 2. Delete the errant message:
DELETE FROM public.messages 
WHERE conversation_id = '${chat.id}' 
  AND content = '${targetText.replace(/'/g, "''")}';`
                          navigator.clipboard.writeText(sql)
                          setCopiedSql(true)
                          setTimeout(() => setCopiedSql(false), 2500)
                        }}
                        className="rounded bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80"
                      >
                        {copiedSql ? 'Copied SQL to clipboard' : 'Copy SQL snippet'}
                      </button>
                    </div>
                    <pre className="rounded bg-black/60 p-3 font-mono text-xs text-amber-200/90 overflow-x-auto whitespace-pre">
{`-- 1. Inspect recent messages in this conversation:
SELECT id, sender_type, content, created_at 
FROM public.messages 
WHERE conversation_id = '${chat.id}' 
ORDER BY created_at DESC;

-- 2. Delete the errant message directly:
DELETE FROM public.messages 
WHERE conversation_id = '${chat.id}' 
  AND content = '${(selectedMessageForRetract?.text || 'tirahin kita eh').replace(/'/g, "''")}';`}
                    </pre>
                  </div>
                </div>

                {/* Conversation Moderation */}
                <div className="rounded-adm border border-adm-line bg-adm-bg p-4">
                  <h3 className="font-semibold text-white">Full Anonymous Conversation Moderation</h3>
                  <p className="mt-1 text-xs text-white/60">
                    Spam, abuse, or anonymous visitor chats can be deleted in full via Admin moderation, recording an immutable deletion receipt.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-white/45">Moderation Status: </span>
                      {canModerateAnonymous && inboxState.moderationReady && chat.anonymousModerationEligible ? (
                        <span className="text-forest font-semibold">Active & Eligible</span>
                      ) : (
                        <span className="text-amber font-semibold">Direct Mode (Moderation BFF API unapplied)</span>
                      )}
                    </div>
                    {canModerateAnonymous && inboxState.moderationReady && chat.anonymousModerationEligible ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDeletionGuideOpen(false)
                          openModeration('delete', chat.id)
                        }}
                        className="rounded-adm-sm border border-crimson/45 bg-crimson/15 px-3 py-1.5 font-semibold text-crimson hover:bg-crimson/25"
                      >
                        Delete entire anonymous thread
                      </button>
                    ) : (
                      <span className="text-xs text-white/40">Gated behind MAP-020 BFF activation</span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-white/50 space-y-1">
                  <p><strong>Compliance Notice:</strong> Account-linked customer conversations cannot be deleted in bulk to safeguard financial dispute history and customer trust. Only anonymous/guest sessions or specific errant rows via authorized SQL can be pruned.</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDeletionGuideOpen(false)}
                  className="adm-btn min-h-11 bg-blue px-5 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80"
                >
                  Done
                </button>
              </div>
            </section>
          </AdminDialog>
        </div>
      )}

      {archiveDialogOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-black/75 sm:place-items-center sm:p-6"
          role="presentation"
          onMouseDown={event => event.target === event.currentTarget && !archiving && setArchiveDialogOpen(false)}
        >
          <AdminDialog
            onClose={() => setArchiveDialogOpen(false)}
            closeDisabled={archiving}
            labelledBy="archive-conversation-title"
          >
            <section className="w-full max-w-lg rounded-t-adm border border-adm-line bg-adm-surface p-5 shadow-2xl sm:rounded-adm">
              <h2 id="archive-conversation-title" className="text-xl font-bold text-white">
                Archive &amp; Remove Thread
              </h2>
              <p className="mt-2 text-xs leading-5 text-white/60">
                Mark this conversation as <strong>Resolved</strong> and remove it from the active staff queue.
                The thread history remains safely preserved in Supabase for audit and reference.
              </p>

              <div className="mt-4 rounded-adm-sm border border-adm-line bg-adm-bg p-3">
                <div className="text-xs text-white/50">Conversation:</div>
                <div className="mt-1 font-semibold text-white">{chat.customer} ({chat.channel})</div>
                <div className="mt-0.5 text-xs text-white/40">Status will update to <span className="text-forest font-semibold">Resolved</span></div>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block text-xs font-semibold text-white/70">
                  Reason for archiving:
                  <select
                    value={archiveReason}
                    onChange={e => setArchiveReason(e.target.value)}
                    disabled={archiving}
                    className="adm-input mt-1.5 min-h-11 w-full text-base sm:text-xs"
                  >
                    <option value="Resolved / Customer assisted">Resolved / Customer assisted</option>
                    <option value="Spam / Trolling / Fooling inquiry">Spam / Trolling / Fooling inquiry</option>
                    <option value="Errant or accidental test thread">Errant or accidental test thread</option>
                    <option value="No response from customer">No response from customer</option>
                    <option value="Other staff action">Other staff action</option>
                  </select>
                </label>

                <label className="flex items-start gap-2.5 rounded-adm-sm border border-adm-line bg-adm-bg/60 p-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearMessagesOnArchive}
                    onChange={e => setClearMessagesOnArchive(e.target.checked)}
                    disabled={archiving}
                    className="mt-0.5 h-4 w-4 rounded border-adm-line bg-adm-surface text-blue focus:ring-blue"
                  />
                  <span className="text-xs text-white/70">
                    <strong>Also clear all messages in this thread</strong> (useful if caller was fooling/trolling with offensive text)
                  </span>
                </label>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setArchiveDialogOpen(false)}
                  disabled={archiving}
                  className="adm-btn min-h-11 border border-adm-line px-4 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleArchiveConversation}
                  disabled={archiving}
                  className="adm-btn min-h-11 border border-forest/40 bg-forest px-5 text-xs font-semibold text-white hover:bg-forest/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/80 disabled:opacity-45"
                >
                  {archiving ? 'Archiving…' : 'Archive & Remove from Active'}
                </button>
              </div>
            </section>
          </AdminDialog>
        </div>
      )}

      {messageToDelete && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-black/75 sm:place-items-center sm:p-6"
          role="presentation"
          onMouseDown={event => event.target === event.currentTarget && !deletingMessage && setMessageToDelete(null)}
        >
          <AdminDialog
            onClose={() => setMessageToDelete(null)}
            closeDisabled={deletingMessage}
            labelledBy="delete-message-title"
          >
            <section className="w-full max-w-lg rounded-t-adm border border-adm-line bg-adm-surface p-5 shadow-2xl sm:rounded-adm">
              <h2 id="delete-message-title" className="text-xl font-bold text-white">
                Delete Message
              </h2>
              <p className="mt-2 text-xs leading-5 text-white/60">
                Permanently delete this individual message from the conversation and database. This action cannot be undone.
              </p>

              <div className="mt-4 rounded-adm-sm border border-adm-line bg-adm-bg p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/45">Message preview:</div>
                <p className="mt-1 line-clamp-3 text-sm italic text-neutral-200">
                  &ldquo;{messageToDelete.text}&rdquo;
                </p>
                <div className="mt-2 text-xs text-white/40">
                  Sender: <span className="font-semibold text-white/70">{messageToDelete.sender === 'customer' ? 'Customer' : 'Staff'}</span> · {formatMessageTime(messageToDelete.createdAt)}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <label htmlFor="delete-message-reason" className="block text-xs font-semibold text-white/70">
                  Reason for deletion:
                </label>
                <select
                  id="delete-message-reason"
                  value={deleteMessageReason}
                  onChange={e => setDeleteMessageReason(e.target.value)}
                  disabled={deletingMessage}
                  className="adm-input min-h-11 w-full text-base sm:text-xs"
                >
                  <option value="Spam or trolling inquiry">Spam or trolling inquiry</option>
                  <option value="Inappropriate or abusive language">Inappropriate or abusive language</option>
                  <option value="Errant or accidental message">Errant or accidental message</option>
                  <option value="Sensitive or confidential data">Sensitive or confidential data</option>
                  <option value="Customer requested removal">Customer requested removal</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setMessageToDelete(null)}
                  disabled={deletingMessage}
                  className="adm-btn min-h-11 border border-adm-line px-4 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteMessage}
                  disabled={deletingMessage}
                  className="adm-btn min-h-11 border border-crimson/40 bg-crimson px-5 text-xs font-semibold text-white hover:bg-crimson/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson/80 disabled:opacity-45"
                >
                  {deletingMessage ? 'Deleting…' : 'Delete message'}
                </button>
              </div>
            </section>
          </AdminDialog>
        </div>
      )}

      {moderationDialog && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/75 sm:place-items-center sm:p-6" role="presentation" onMouseDown={event => event.target === event.currentTarget && !moderating && setModerationDialog(null)}>
          <AdminDialog onClose={() => setModerationDialog(null)} closeDisabled={moderating} labelledBy="chat-moderation-title">
            <section className="w-full max-w-lg rounded-t-adm border border-adm-line bg-adm-surface p-5 shadow-2xl sm:rounded-adm">
              <h2 id="chat-moderation-title" className="text-xl font-bold text-white">{moderationDialog.kind === 'delete' ? 'Delete anonymous conversation' : moderationDialog.kind === 'block' ? 'Block anonymous chat' : 'Unblock anonymous chat'}</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">{moderationDialog.kind === 'delete' ? 'This permanently removes the anonymous thread for staff and the guest. Account-linked threads are protected.' : 'This changes chat access only. Store browsing and checkout are not blocked.'}</p>
              <form className="mt-5 space-y-4" onSubmit={submitModeration}>
                <label className="block text-sm font-semibold text-white" htmlFor="chat-moderation-reason">Reason
                  <textarea id="chat-moderation-reason" required minLength={3} maxLength={500} rows={4} value={moderationReason} onChange={event => setModerationReason(event.target.value)} disabled={moderating} className="adm-input mt-2 w-full resize-y text-base sm:text-sm" placeholder="Record the abuse, scam, or reason for this action" />
                </label>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setModerationDialog(null)} disabled={moderating} className="adm-btn min-h-11 border border-adm-line px-4 text-white">Cancel</button>
                  <button type="submit" disabled={moderating || moderationReason.trim().length < 3} className="adm-btn min-h-11 bg-blue px-4 font-semibold text-white disabled:opacity-45">{moderating ? 'Recording…' : 'Confirm action'}</button>
                </div>
              </form>
            </section>
          </AdminDialog>
        </div>
      )}
    </section>
  )
}

export default function Inbox() {
  return <InboxView store={useStore()} />
}
