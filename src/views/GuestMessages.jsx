import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../context/StoreContext'
import { GhostButton, Kicker, TuscanCard } from '../components/ui/bits'
import { InboxIcon, SyncIcon } from '../components/ui/icons'
import {
  guestBffEnabled, listGuestConversations, replyToGuestConversation,
} from '../services/guestCommerceService'

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function Conversation({ conversation, onReply }) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const requestKey = useRef('')

  const submit = async (event) => {
    event.preventDefault()
    const content = message.trim()
    if (!content || submitting) return
    if (!requestKey.current) requestKey.current = crypto.randomUUID()
    setSubmitting(true)
    setFeedback('')
    const result = await onReply(conversation.conversation_reference, content, requestKey.current)
    setSubmitting(false)
    if (!result.ok) {
      setFeedback(result.error)
      return
    }
    requestKey.current = ''
    setMessage('')
    setFeedback('Message received by K2 staff.')
  }

  return (
    <TuscanCard className="overflow-hidden">
      <div className="border-b border-line px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-mono text-sm font-semibold text-crimson">{conversation.conversation_reference}</p>
            <p className="mt-1 text-sm text-navy-soft">{conversation.channel || 'Website'} conversation</p>
          </div>
          <span className="rounded-full border border-line bg-shell px-3 py-1 text-xs font-bold text-navy-soft">
            {conversation.status || 'Open'}
          </span>
        </div>
      </div>

      <div className="max-h-[26rem] space-y-3 overflow-y-auto bg-[var(--store-surface-bg)] px-4 py-5 sm:px-5" aria-live="polite">
        {(conversation.messages || []).length === 0 ? (
          <p className="py-5 text-center text-sm text-navy-soft">No messages yet. Ask about this request below.</p>
        ) : conversation.messages.map((item, index) => {
          const customer = item.direction === 'inbound'
          return (
            <div key={`${item.created_at || index}-${index}`} className={`flex ${customer ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${customer ? 'rounded-br-sm bg-crimson text-white' : 'rounded-bl-sm border border-line bg-paper text-navy'}`}>
                <p className="whitespace-pre-wrap break-words">{item.content}</p>
                <p className={`mt-1.5 text-xs ${customer ? 'text-white/75' : 'text-navy-faint'}`}>{formatTime(item.created_at)}</p>
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={submit} className="border-t border-line p-4 sm:p-5">
        <label className="block text-sm font-semibold text-navy" htmlFor={`reply-${conversation.conversation_reference}`}>Reply to K2</label>
        <textarea
          id={`reply-${conversation.conversation_reference}`}
          value={message}
          onChange={(event) => { setMessage(event.target.value); setFeedback('') }}
          maxLength={2000}
          rows={3}
          className="store-field mt-2 min-h-24 w-full resize-y px-4 py-3 text-base"
          placeholder="Ask about availability, quote, delivery, or the next step"
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" className={`text-sm ${feedback.includes('received') ? 'text-forest' : 'text-crimson'}`}>{feedback}</p>
          <button type="submit" disabled={submitting || !message.trim()} className="min-h-11 rounded-lg bg-crimson px-5 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45">
            {submitting ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>
    </TuscanCard>
  )
}

export default function GuestMessages() {
  const { go } = useStore()
  const [conversations, setConversations] = useState([])
  const [state, setState] = useState({ loading: true, error: '' })

  const load = useCallback(async () => {
    if (!guestBffEnabled()) {
      setState({ loading: false, error: 'Secure guest messaging is not active on this deployment yet.' })
      return
    }
    setState({ loading: true, error: '' })
    const result = await listGuestConversations()
    if (!result.ok) {
      setConversations([])
      setState({ loading: false, error: result.error })
      return
    }
    setConversations(Array.isArray(result.data) ? result.data : [])
    setState({ loading: false, error: '' })
  }, [])

  useEffect(() => { load() }, [load])

  const reply = async (reference, content, key) => {
    const result = await replyToGuestConversation(reference, content, key)
    if (result.ok) await load()
    return result
  }

  return (
    <main className="store-section max-w-4xl pb-24 pt-10 md:pb-20 md:pt-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Kicker className="flex items-center gap-2"><InboxIcon size={15} /> Secure guest inbox</Kicker>
          <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Your K2 conversations</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-navy-soft">
            No account is required. This browser can open only conversations covered by its private, expiring access grant.
          </p>
        </div>
        <button onClick={load} disabled={state.loading} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-paper px-4 text-sm font-bold text-navy disabled:opacity-45">
          <SyncIcon size={16} className={state.loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="mt-8 space-y-5">
        {state.loading && <TuscanCard className="p-6 text-sm text-navy-soft" role="status">Loading conversations…</TuscanCard>}
        {!state.loading && state.error && (
          <TuscanCard className="p-6">
            <p role="alert" className="text-sm leading-relaxed text-crimson">{state.error}</p>
            <p className="mt-2 text-sm leading-relaxed text-navy-soft">Submitting a new order or Pasabuy request from this browser creates secure access to its conversation.</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row"><GhostButton onClick={() => go('catalog')}>Browse catalog</GhostButton><GhostButton onClick={() => go('pasabuy')}>Start Pasabuy</GhostButton></div>
          </TuscanCard>
        )}
        {!state.loading && !state.error && conversations.length === 0 && (
          <TuscanCard className="p-6 text-center sm:p-8">
            <InboxIcon size={28} className="mx-auto text-navy-faint" />
            <h2 className="mt-3 font-serif text-xl font-semibold">No conversations for this browser</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-navy-soft">Submit an order request or Pasabuy request first. K2 will attach its conversation to this browser without requiring an account.</p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row"><GhostButton onClick={() => go('catalog')}>Browse catalog</GhostButton><GhostButton onClick={() => go('pasabuy')}>Start Pasabuy</GhostButton></div>
          </TuscanCard>
        )}
        {!state.loading && !state.error && conversations.map((conversation) => (
          <Conversation key={conversation.conversation_reference} conversation={conversation} onReply={reply} />
        ))}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-navy-faint">For privacy, clearing this browser’s site data removes its guest access. Never send passwords, payment card details, or one-time codes in a message.</p>
    </main>
  )
}
