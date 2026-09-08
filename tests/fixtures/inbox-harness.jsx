import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { InboxView } from '../../src/views/admin/Inbox'
import { STALE_QUEUE_NOTICE } from '../../src/context/adminInboxPolling'
import { UNCERTAIN_COMMAND_NOTICE } from '../../src/services/adminBffService'
import '../../src/index.css'

const now = Date.now()

const INITIAL_CONVERSATIONS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    customer: 'Maria Santos',
    channel: 'WhatsApp',
    status: 'Open',
    priority: 'urgent',
    unreadCount: 2,
    unread: true,
    assignedTo: null,
    assignedName: '',
    responseDueAt: new Date(now - 30 * 60 * 1000).toISOString(),
    lastMessageAt: new Date(now - 45 * 60 * 1000).toISOString(),
    time: 'Today, 9:15 AM',
    messages: [
      {
        id: 'm-1',
        sender: 'customer',
        text: 'Do you have the 500g pack available for two pieces?',
        deliveryStatus: 'received',
        createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
      },
      {
        id: 'm-2',
        sender: 'customer',
        text: 'I need delivery in Quezon City this Friday.',
        deliveryStatus: 'received',
        createdAt: new Date(now - 42 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    customer: 'Paolo Reyes',
    channel: 'Shopee',
    status: 'Pending',
    priority: 'normal',
    unreadCount: 0,
    unread: false,
    assignedTo: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    assignedName: 'K2 Operator',
    responseDueAt: null,
    lastMessageAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    time: 'Today, 8:00 AM',
    messages: [
      {
        id: 'm-3',
        sender: 'agent',
        text: 'Price and availability still need staff verification.',
        deliveryStatus: 'internal_only',
        createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    customer: 'Elena Website',
    channel: 'Virtual Store',
    sourceKind: 'virtual_store_message',
    status: 'Open',
    priority: 'high',
    unreadCount: 1,
    unread: true,
    assignedTo: null,
    assignedName: '',
    responseDueAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    lastMessageAt: new Date(now - 3 * 60 * 1000).toISOString(),
    time: 'Just now',
    messages: [
      {
        id: 'm-4',
        sender: 'customer',
        text: 'Can you explain what is on the coffee shelf?',
        deliveryStatus: 'received',
        createdAt: new Date(now - 3 * 60 * 1000).toISOString(),
      },
    ],
  },
]

function Harness() {
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS)
  const [actorId, setActorId] = useState('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  const [historyReleased, setHistoryReleased] = useState(false)
  const historySequence = useRef(0)
  const releaseHistory = useRef(null)
  const options = new URLSearchParams(window.location.search)
  const historyFailed = useRef(false)
  const historyFixture = options.has('delayHistory') || options.has('historyError') || options.has('history')

  const store = {
    conversations,
    inboxState: {
      loading: false,
      refreshing: false,
      stale: options.has('staleQueue'),
      error: options.has('staleQueue') ? STALE_QUEUE_NOTICE : '',
      phase2Ready: true,
      websiteReplyReady: true,
    },
    user: { id: actorId },
    inboxUsesBff: historyFixture,
    inboxStaff: [],
    loadConversationHistory: async (conversationId) => {
      const request = ++historySequence.current
      if (options.has('historyError')) {
        if (!historyFailed.current) {
          historyFailed.current = true
          return { ok: false, events: [] }
        }
        return {
          ok: true,
          events: [{
            id: `fixture-event-${request}`, event_type: 'fixture_history',
            reason: 'Recovered Maria history', created_at: new Date().toISOString(),
          }],
        }
      }
      const delayed = options.has('delayHistory') && request === 1
      if (delayed) {
        await new Promise(resolve => { releaseHistory.current = resolve })
        setHistoryReleased(true)
      }
      return {
        ok: true,
        events: [{
          id: `fixture-event-${request}`, event_type: 'fixture_history',
          reason: delayed ? 'Older Maria history' : conversationId === INITIAL_CONVERSATIONS[0].id ? 'Latest Maria history' : 'Elena history',
          created_at: new Date().toISOString(),
        }],
      }
    },
    sendMessage: async (conversationId, text) => {
      if (options.has('uncertainSave')) {
        return { ok: false, uncertain: true, error: UNCERTAIN_COMMAND_NOTICE }
      }
      if (new URLSearchParams(window.location.search).has('delaySave')) {
        await new Promise(resolve => setTimeout(resolve, 800))
      }
      setConversations(current => current.map(conversation => conversation.id === conversationId
        ? {
            ...conversation,
            messages: [...conversation.messages, {
              id: `note-${Date.now()}`,
              sender: 'agent',
              text,
              deliveryStatus: 'internal_only',
              createdAt: new Date().toISOString(),
            }],
          }
        : conversation))
      return { ok: true }
    },
    sendCustomerReply: async (conversationId, text) => {
      if (options.has('delaySave')) await new Promise(resolve => setTimeout(resolve, 800))
      setConversations(current => current.map(conversation => conversation.id === conversationId
        ? {
            ...conversation,
            status: 'Pending',
            messages: [...conversation.messages, {
              id: `reply-${Date.now()}`,
              sender: 'agent',
              text,
              deliveryStatus: 'sent',
              createdAt: new Date().toISOString(),
            }],
          }
        : conversation))
      return { ok: true }
    },
    markConversationRead: async (conversationId) => {
      setConversations(current => current.map(conversation => conversation.id === conversationId
        ? { ...conversation, unread: false, unreadCount: 0 }
        : conversation))
      return { ok: true }
    },
    updateConversationWorkflow: async (conversationId, workflow) => {
      setConversations(current => current.map(conversation => conversation.id === conversationId
        ? {
            ...conversation,
            status: workflow.status,
            priority: workflow.priority,
            assignedTo: workflow.assignedTo || null,
            responseDueAt: workflow.responseDueAt,
          }
        : conversation))
      return { ok: true }
    },
  }

  return (
    <main className="admin-ui min-h-screen bg-adm-bg p-3 sm:p-5">
      {options.has('switchActor') && <button type="button" onClick={() => setActorId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')}>Switch fixture staff</button>}
      {historyFixture && <button type="button" onClick={() => releaseHistory.current?.()}>{historyReleased ? 'Old history released' : 'Release old history'}</button>}
      <InboxView store={store} database={null} />
    </main>
  )
}

createRoot(document.getElementById('root')).render(<Harness />)
