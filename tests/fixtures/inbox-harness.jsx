import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { InboxView } from '../../src/views/admin/Inbox'
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

  const store = {
    conversations,
    inboxState: { loading: false, error: '', phase2Ready: true, websiteReplyReady: true },
    user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    sendMessage: async (conversationId, text) => {
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
      <InboxView store={store} database={null} />
    </main>
  )
}

createRoot(document.getElementById('root')).render(<Harness />)
