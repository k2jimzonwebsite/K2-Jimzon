import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAdminStore as useStore } from '../../context/AdminStoreContext'
import { channelMeta } from '../../lib/channelMeta'
import { AlertIcon, CheckIcon, InboxIcon, SearchIcon } from '../../components/ui/icons'
import { MetricRail, StateBanner, WorkspaceIntro } from './AdminWorkspaceUi'

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

export function InboxView({ store, database = supabase }) {
  const {
    conversations,
    inboxState,
    sendMessage,
    markConversationRead,
    updateConversationWorkflow,
    inboxStaff,
    inboxUsesBff,
    loadConversationHistory,
    user,
  } = store
  const [activeId, setActiveId] = useState(() => conversations[0]?.id || null)
  const [mobileView, setMobileView] = useState('list')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [replyText, setReplyText] = useState('')
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [savingWorkflow, setSavingWorkflow] = useState(false)
  const [directStaff, setDirectStaff] = useState([])
  const [history, setHistory] = useState([])
  const [workflow, setWorkflow] = useState({
    status: 'Open',
    priority: 'normal',
    assignedTo: '',
    responseDueAt: '',
    reason: '',
  })
  const messageEndRef = useRef(null)

  const filteredConversations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return conversations
      .filter(conversation => {
        const matchesStatus = statusFilter === 'all'
          || (statusFilter === 'active' && conversation.status !== 'Resolved')
          || conversation.status === statusFilter
        const matchesOwner = ownerFilter === 'all'
          || (ownerFilter === 'unassigned' && !conversation.assignedTo)
          || (ownerFilter === 'mine' && conversation.assignedTo === user?.id)
        const lastText = conversation.messages.at(-1)?.text || ''
        const matchesSearch = !normalizedSearch
          || conversation.customer.toLowerCase().includes(normalizedSearch)
          || conversation.channel.toLowerCase().includes(normalizedSearch)
          || lastText.toLowerCase().includes(normalizedSearch)
        return matchesStatus && matchesOwner && matchesSearch
      })
      .sort((a, b) => queueRank(b) - queueRank(a)
        || new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
  }, [conversations, ownerFilter, search, statusFilter, user?.id])

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

  const loadHistory = async (conversationId) => {
    if (inboxUsesBff) {
      setHistory(await loadConversationHistory(conversationId))
      return
    }
    if (!database || !inboxState.phase2Ready || !conversationId) {
      setHistory([])
      return
    }
    const { data, error } = await database
      .from('conversation_events')
      .select('id,event_type,reason,metadata,created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(20)
    setHistory(error ? [] : (data || []))
  }

  useEffect(() => {
    if (inboxUsesBff) return
    if (!database || !inboxState.phase2Ready) return
    let active = true
    database
      .from('user_profiles')
      .select('id,full_name,email,role')
      .in('role', ['Admin', 'Staff'])
      .order('full_name')
      .then(({ data, error }) => {
        if (active && !error) setDirectStaff(data || [])
      })
    return () => { active = false }
  }, [database, inboxState.phase2Ready, inboxUsesBff])

  const staff = inboxUsesBff ? inboxStaff : directStaff

  useEffect(() => {
    if (!chat) return
    setWorkflow({
      status: chat.status,
      priority: chat.priority,
      assignedTo: chat.assignedTo || '',
      responseDueAt: toLocalDateTime(chat.responseDueAt),
      reason: '',
    })
    setSaveError('')
    setNotice('')
    loadHistory(chat.id)
    if (chat.unreadCount > 0 && inboxState.phase2Ready) {
      markConversationRead(chat.id).then(result => {
        if (!result?.ok) setSaveError(result?.error || 'Could not mark the conversation as read.')
      })
    }
  }, [activeId, inboxState.phase2Ready])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: 'end' })
  }, [activeId, chat?.messages.length])

  const openChat = (id) => {
    setActiveId(id)
    setMobileView('chat')
  }

  const handleTemplate = () => {
    setReplyText('Thanks for your message. Please share the exact item, quantity, preferred delivery area, and required date so K2 staff can review the request.')
    setNotice('A neutral template was prepared. Verify it before copying to the external channel.')
    setSaveError('')
  }

  const copyResponse = async () => {
    if (!replyText.trim()) return
    try {
      await navigator.clipboard.writeText(replyText.trim())
      setNotice('Response copied. Send it through the customer’s verified external channel.')
      setSaveError('')
    } catch {
      setSaveError('Clipboard access was blocked. Select and copy the response manually.')
    }
  }

  const handleSaveNote = async () => {
    if (!replyText.trim() || !chat || savingNote) return
    setSavingNote(true)
    setSaveError('')
    setNotice('')
    const result = await sendMessage(chat.id, replyText, 'agent')
    setSavingNote(false)
    if (!result?.ok) {
      setSaveError(result?.error || 'The internal note could not be saved.')
      return
    }
    setReplyText('')
    setNotice('Internal note saved. It was not sent externally.')
    loadHistory(chat.id)
  }

  const handleWorkflowSave = async () => {
    if (!chat || savingWorkflow) return
    setSavingWorkflow(true)
    setSaveError('')
    setNotice('')
    const result = await updateConversationWorkflow(chat.id, {
      ...workflow,
      responseDueAt: workflow.responseDueAt
        ? new Date(workflow.responseDueAt).toISOString()
        : null,
    })
    setSavingWorkflow(false)
    if (!result?.ok) {
      setSaveError(result?.error || 'Workflow changes could not be saved.')
      return
    }
    setWorkflow(current => ({ ...current, reason: '' }))
    setNotice('Workflow updated and added to the immutable event history.')
    loadHistory(chat.id)
  }

  const activeCount = conversations.filter(conversation => conversation.status !== 'Resolved').length
  const unreadCount = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0)
  const overdueCount = conversations.filter(conversation => deadlineState(conversation.responseDueAt, conversation.status)?.overdue).length
  const unassignedCount = conversations.filter(conversation => conversation.status !== 'Resolved' && !conversation.assignedTo).length
  const urgentCount = conversations.filter(conversation => conversation.status !== 'Resolved' && conversation.priority === 'urgent').length

  const WorkflowControls = ({ compact = false }) => {
    if (!chat) return null
    const changingResolution = workflow.status !== chat.status
      && (workflow.status === 'Resolved' || chat.status === 'Resolved')
    return (
      <div className={compact ? 'space-y-3' : 'space-y-4'}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
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

  if (inboxState.loading && conversations.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center rounded-adm border border-adm-line bg-adm-bg text-sm text-white/55" role="status">
        Loading persisted conversations…
      </div>
    )
  }

  if (!chat) {
    return (
      <section className="rounded-adm border border-adm-line bg-adm-bg p-6 text-center">
        {inboxState.error && <p role="alert" className="mb-4 rounded-adm-sm border border-amber/40 bg-amber/10 p-3 text-sm text-amber">{inboxState.error}</p>}
        <InboxIcon size={30} className="mx-auto text-white/40" />
        <h2 className="mt-3 text-base font-semibold text-white">No persisted conversations</h2>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-white/50">
          This queue stays empty until a real conversation row reaches Supabase. External channel connectors are not configured.
        </p>
      </section>
    )
  }

  const chatDeadline = deadlineState(chat.responseDueAt, chat.status)

  return (
    <section aria-label="Unified message control" className="mx-auto max-w-[1600px] space-y-4 pb-12">
      <WorkspaceIntro
        eyebrow="Customer workload"
        title="Unified message control"
        description="Persisted conversations, owner assignments, deadlines, and internal notes across channels; external sending is not connected, so copied replies must be sent through the verified source channel."
        status="External delivery disconnected"
        statusTone="warning"
      />
      <MetricRail columns="lg:grid-cols-5" items={[
        { label: 'Active', value: activeCount, detail: 'Open or waiting on customer' },
        { label: 'Unread', value: unreadCount, detail: 'Persisted unread messages', tone: unreadCount ? 'text-blue' : 'text-white' },
        { label: 'Overdue', value: overdueCount, detail: 'Response deadline passed', tone: overdueCount ? 'text-crimson' : 'text-white' },
        { label: 'Unassigned', value: unassignedCount, detail: 'Active without an owner', tone: unassignedCount ? 'text-amber' : 'text-white' },
        { label: 'Urgent', value: urgentCount, detail: 'Active urgent priority', tone: urgentCount ? 'text-crimson' : 'text-white' },
      ]} />

      {inboxState.error && <StateBanner tone="warning">{inboxState.error}</StateBanner>}

      <div className="flex h-[calc(100dvh-390px)] min-h-[560px] overflow-hidden rounded-adm border border-adm-line bg-adm-bg">
        <div className={`${mobileView === 'chat' ? 'hidden' : 'flex'} w-full shrink-0 flex-col border-r border-adm-line bg-adm-bg lg:flex lg:w-80 xl:w-[22rem]`}>
          <div className="space-y-2 border-b border-adm-line p-3">
            <label className="relative block">
              <span className="sr-only">Search conversations</span>
              <SearchIcon size={16} className="pointer-events-none absolute left-3 top-3.5 text-white/40" />
              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search customer or message"
                className="adm-input min-h-11 w-full pl-9 text-base sm:text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="sr-only">Filter by status</span>
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="adm-input min-h-11 w-full text-base sm:text-xs">
                  <option value="active">Active</option>
                  <option value="all">All statuses</option>
                  {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
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
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => openChat(conversation.id)}
                  aria-current={activeId === conversation.id ? 'true' : undefined}
                  className={`min-h-[76px] w-full rounded-adm-sm border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 ${
                    activeId === conversation.id ? 'border-blue/45 bg-blue/10' : 'border-transparent hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`truncate text-sm font-semibold ${conversation.unreadCount ? 'text-white' : 'text-white/75'}`}>{conversation.customer}</span>
                    <span className="shrink-0 text-xs text-white/40">{conversation.time}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    {conversation.unreadCount > 0 && <span className="rounded-full bg-crimson px-1.5 py-0.5 text-xs font-bold text-white">{conversation.unreadCount}</span>}
                    <span className="rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide" style={{ color: meta.color, backgroundColor: `${meta.color}22` }}>{meta.label}</span>
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
          <div className="flex shrink-0 items-center gap-2 border-b border-adm-line bg-white/5 px-3 py-2.5 sm:px-4">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className="-ml-1 flex min-h-11 min-w-11 items-center justify-center rounded-adm-sm text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 lg:hidden"
              aria-label="Back to conversation list"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-[15px] font-semibold text-white">{chat.customer}</h3>
                <span className="rounded bg-forest/15 px-1.5 py-0.5 text-xs font-medium text-forest">via {chat.channel}</span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/65">{statusLabel(chat.status)}</span>
              </div>
              <p className="mt-0.5 text-xs text-white/40">
                {chat.assignedName ? `Owned by ${chat.assignedName}` : 'Unassigned'}
                {chatDeadline ? ` · ${chatDeadline.label}` : ''}
              </p>
            </div>
          </div>

          <details className="shrink-0 border-b border-adm-line bg-adm-bg p-3 xl:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-white">Workflow controls</summary>
            <div className="mt-3"><WorkflowControls compact /></div>
          </details>

          <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4" aria-live="polite">
            {chat.messages.length === 0 && <p className="py-8 text-center text-sm text-white/45">No message content has been recorded.</p>}
            {chat.messages.map(message => (
              <div key={message.id} className={`flex ${message.sender === 'customer' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[88%] rounded-adm px-3.5 py-2 text-[14px] leading-relaxed sm:max-w-[75%] ${
                  message.sender === 'customer'
                    ? 'rounded-tl-sm bg-white/10 text-neutral-200'
                    : 'rounded-tr-sm border border-blue/30 bg-blue/15 text-white'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-white/45">
                    <span>{formatMessageTime(message.createdAt)}</span>
                    {message.deliveryStatus === 'internal_only' && <span>· Internal only, not sent</span>}
                    {message.deliveryStatus === 'failed' && <span className="text-crimson">· Delivery failed</span>}
                    {message.deliveryStatus === 'sent' && <span className="text-forest">· Sent externally</span>}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messageEndRef} />
          </div>

          <div className="shrink-0 space-y-2 border-t border-adm-line bg-white/5 p-3">
            {saveError && <p role="alert" className="rounded-adm-sm border border-crimson/40 bg-crimson/10 p-2.5 text-xs text-crimson">{saveError}</p>}
            {notice && <p role="status" className="flex items-start gap-2 rounded-adm-sm border border-forest/40 bg-forest/10 p-2.5 text-xs text-forest"><CheckIcon size={14} className="mt-0.5 shrink-0" />{notice}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="inbox-internal-note" className="text-xs font-semibold text-white/65">Internal note or response draft</label>
              <span className="text-xs text-amber">Not sent externally</span>
            </div>
            <textarea
              id="inbox-internal-note"
              value={replyText}
              onChange={event => setReplyText(event.target.value)}
              placeholder="Record an internal note or prepare text to copy…"
              rows={2}
              maxLength={5000}
              className="adm-input min-h-[72px] w-full resize-y text-base sm:text-sm"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button type="button" onClick={handleTemplate} className="adm-btn min-h-11 border border-blue/40 bg-blue/10 text-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80">Create safe template</button>
              <button type="button" onClick={copyResponse} disabled={!replyText.trim()} className="adm-btn min-h-11 border border-adm-line bg-adm-raised text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 disabled:cursor-not-allowed">Copy for external reply</button>
              <button type="button" onClick={handleSaveNote} disabled={!replyText.trim() || savingNote} className="adm-btn min-h-11 bg-blue text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/80 disabled:cursor-not-allowed">{savingNote ? 'Saving…' : 'Save internal note'}</button>
            </div>
          </div>
        </div>

        <aside className="hidden w-80 shrink-0 flex-col border-l border-adm-line bg-adm-bg xl:flex" aria-label="Conversation workflow">
          <div className="border-b border-adm-line px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Workflow</h3>
            <p className="mt-0.5 text-xs text-white/45">Owner, deadline and next state</p>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {!inboxState.phase2Ready && (
              <div className="flex gap-2 rounded-adm-sm border border-amber/40 bg-amber/10 p-3 text-xs leading-relaxed text-amber">
                <AlertIcon size={16} className="shrink-0" />Activate the verified Phase 2 migration to use workflow controls.
              </div>
            )}
            <WorkflowControls />
            <div className="border-t border-adm-line pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/45">Event history</h4>
              <div className="mt-3 space-y-3">
                {history.length === 0 && <p className="text-xs leading-relaxed text-white/40">No Phase 2 workflow events recorded yet.</p>}
                {history.map(event => (
                  <div key={event.id} className="border-l border-adm-line pl-3">
                    <p className="text-xs font-semibold text-white/75">{event.event_type === 'internal_note_added' ? 'Internal note saved' : 'Workflow updated'}</p>
                    {event.reason && <p className="mt-0.5 text-xs leading-relaxed text-white/55">{event.reason}</p>}
                    <time className="mt-1 block text-xs text-white/35">{formatMessageTime(event.created_at)}</time>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default function Inbox() {
  return <InboxView store={useStore()} />
}
