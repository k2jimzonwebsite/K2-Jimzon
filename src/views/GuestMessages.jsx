import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../context/StoreContext'
import { GhostButton, Kicker, TuscanCard } from '../components/ui/bits'
import { InboxIcon, SyncIcon } from '../components/ui/icons'
import TurnstileChallenge from '../components/security/TurnstileChallenge'
import {
  guestBffEnabled, listGuestConversations, replyToGuestConversation, startGuestConversation,
} from '../services/guestCommerceService'

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function StartConversationForm({ onCreated }) {
  const [form, setForm] = useState({ customerName: '', email: '', phone: '', message: '' })
  const [botToken, setBotToken] = useState('')
  const [challengeKey, setChallengeKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const requestKey = useRef({ fingerprint: '', key: '' })

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    if (!form.email.trim() && !form.phone.trim()) {
      setError('Enter an email address or mobile number so K2 can identify the conversation.')
      return
    }
    if (!botToken) {
      setError('Complete the security check before sending your message.')
      return
    }
    const fingerprint = JSON.stringify(form)
    if (requestKey.current.fingerprint !== fingerprint) {
      requestKey.current = { fingerprint, key: crypto.randomUUID() }
    }
    setSubmitting(true)
    setError('')
    const result = await startGuestConversation({
      ...form,
      idempotencyKey: requestKey.current.key,
      botToken,
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    requestKey.current = { fingerprint: '', key: '' }
    setForm({ customerName: '', email: '', phone: '', message: '' })
    setBotToken('')
    setChallengeKey((current) => current + 1)
    await onCreated(result.data)
  }

  return (
    <TuscanCard className="overflow-hidden">
      <div className="border-b border-line p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-crimson/10 text-crimson"><InboxIcon size={20} /></span>
          <div>
            <h2 className="font-serif text-xl font-semibold text-navy">Message K2</h2>
            <p className="mt-1 text-sm leading-relaxed text-navy-soft">Ask about products, sourcing, an order, wholesale, or anything else. No purchase or account is required.</p>
          </div>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        <label htmlFor="message-name" className="block text-sm font-semibold text-navy">Full name
          <input id="message-name" className="store-field mt-1.5 w-full px-4 py-3 text-base" value={form.customerName} onChange={update('customerName')} autoComplete="name" required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor="message-email" className="block text-sm font-semibold text-navy">Email
            <input id="message-email" className="store-field mt-1.5 w-full px-4 py-3 text-base" type="email" value={form.email} onChange={update('email')} autoComplete="email" />
          </label>
          <label htmlFor="message-phone" className="block text-sm font-semibold text-navy">Mobile number
            <input id="message-phone" className="store-field mt-1.5 w-full px-4 py-3 text-base" type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" />
          </label>
        </div>
        <p className="text-xs leading-relaxed text-navy-soft">Enter at least one contact method. It identifies this conversation but does not replace this browser's private access.</p>
        <label htmlFor="message-body" className="block text-sm font-semibold text-navy">How can we help?
          <textarea id="message-body" className="store-field mt-1.5 min-h-32 w-full resize-y px-4 py-3 text-base" value={form.message} onChange={update('message')} maxLength={2000} placeholder="Write your question or the details K2 should review" required />
        </label>
        <TurnstileChallenge key={challengeKey} enabled={guestBffEnabled()} onTokenChange={setBotToken} />
        {error && <p role="alert" className="rounded-xl border border-crimson/25 bg-crimson/5 p-3 text-sm text-crimson">{error}</p>}
        <button type="submit" disabled={submitting || !form.customerName.trim() || !form.message.trim()} className="flex min-h-12 w-full items-center justify-center rounded-lg bg-crimson px-5 text-sm font-bold text-white transition-transform duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45">
          {submitting ? 'Starting conversation…' : 'Send message'}
        </button>
      </form>
    </TuscanCard>
  )
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
  const [state, setState] = useState({ loading: true, refreshing: false, error: '', errorCode: '', refreshError: '', notice: '' })

  const load = useCallback(async ({ background = false } = {}) => {
    if (!guestBffEnabled()) {
      setState({ loading: false, refreshing: false, error: 'Secure guest messaging is not active on this deployment yet.', errorCode: 'INACTIVE', refreshError: '', notice: '' })
      return
    }
    setState((current) => ({
      ...current,
      loading: background ? current.loading : true,
      refreshing: background,
      error: background ? current.error : '',
      errorCode: background ? current.errorCode : '',
      refreshError: '',
      notice: current.notice,
    }))
    const result = await listGuestConversations()
    if (!result.ok) {
      if (!background && ['GUEST_ACCESS_REQUIRED', 'GUEST_ACCESS_EXPIRED'].includes(result.code)) {
        setConversations([])
        setState({
          loading: false, refreshing: false, error: '', errorCode: '', refreshError: '',
          notice: result.code === 'GUEST_ACCESS_EXPIRED' ? 'Your previous browser access expired. Start a new conversation below.' : '',
        })
        return
      }
      if (!background) setConversations([])
      setState((current) => ({
        loading: false,
        refreshing: false,
        error: background ? current.error : result.error,
        errorCode: background ? current.errorCode : result.code,
        refreshError: background ? result.error : '',
        notice: current.notice,
      }))
      return
    }
    setConversations(Array.isArray(result.data) ? result.data : [])
    setState({ loading: false, refreshing: false, error: '', errorCode: '', refreshError: '', notice: '' })
  }, [])

  useEffect(() => {
    load()
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') load({ background: true })
    }
    const interval = window.setInterval(refreshVisible, 15000)
    document.addEventListener('visibilitychange', refreshVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshVisible)
    }
  }, [load])

  const reply = async (reference, content, key) => {
    const result = await replyToGuestConversation(reference, content, key)
    if (result.ok) await load({ background: true })
    return result
  }

  const created = async () => {
    await load({ background: true })
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
        <button onClick={() => load({ background: true })} disabled={state.loading || state.refreshing} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-paper px-4 text-sm font-bold text-navy disabled:opacity-45">
          <SyncIcon size={16} className={state.loading || state.refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <p className="mt-3 text-sm text-navy-soft">K2 replies refresh automatically while this page is open.</p>
      {state.refreshError && <p role="status" className="mt-2 text-sm text-crimson">Could not refresh messages. Your existing conversation is still available; try Refresh again.</p>}
      {state.notice && <p role="status" className="mt-2 rounded-xl border border-amber/25 bg-amber/5 p-3 text-sm text-amber">{state.notice}</p>}

      <div className="mt-8 space-y-5">
        {state.loading && <TuscanCard className="p-6 text-sm text-navy-soft" role="status">Loading conversations…</TuscanCard>}
        {!state.loading && state.error && (
          <TuscanCard className="p-6">
            <p role="alert" className="text-sm leading-relaxed text-crimson">{state.error}</p>
            <p className="mt-2 text-sm leading-relaxed text-navy-soft">Refresh to retry. Orders and Pasabuy requests remain available separately.</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row"><GhostButton onClick={() => go('catalog')}>Browse catalog</GhostButton><GhostButton onClick={() => go('pasabuy')}>Start Pasabuy</GhostButton></div>
          </TuscanCard>
        )}
        {!state.loading && !state.error && conversations.length === 0 && (
          <StartConversationForm onCreated={created} />
        )}
        {!state.loading && !state.error && conversations.map((conversation) => (
          <Conversation key={conversation.conversation_reference} conversation={conversation} onReply={reply} />
        ))}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-navy-faint">For privacy, clearing this browser’s site data removes its guest access. Never send passwords, payment card details, or one-time codes in a message.</p>
    </main>
  )
}
