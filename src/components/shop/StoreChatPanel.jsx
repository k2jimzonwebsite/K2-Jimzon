import { useCallback, useEffect, useRef, useState } from 'react'
import TurnstileChallenge from '../security/TurnstileChallenge'
import {
  guestBffEnabled, listGuestConversations, replyToGuestConversation, startGuestConversation,
} from '../../services/guestCommerceService'

/**
 * MAP-027 — talking to staff without leaving the store.
 *
 * The store used to hand a product question to the messages page, which meant
 * the customer was thrown out of the room mid-shop and had to walk back in.
 * The conversation now happens here, against the same guest commerce boundary
 * the messages page uses — same endpoints, same idempotency, same bot check.
 * There is no store-only inbox and no second conversation store.
 *
 * What this deliberately does not do:
 *
 *   - claim anyone is online, or promise a reply time
 *   - show a typing indicator, which would imply someone is composing
 *   - answer on staff's behalf
 *
 * Replies are fetched, not simulated. When the panel is open it re-reads the
 * conversation on a slow timer so a real answer appears without the customer
 * having to reload; nothing is invented between polls.
 */

/** Inside the guest-read allowance while feeling current in an open chat. */
const POLL_MS = 8000

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function WebsiteChatHeader({ enabled }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#B78A45]/35 bg-[linear-gradient(135deg,#2B2118,#443222)] px-4 py-3 text-[#FFF8EC] shadow-[0_14px_34px_rgba(55,35,18,0.16)]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E0C48A]/45 bg-[#E0C48A]/10" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#E0C48A] shadow-[0_0_0_4px_rgba(224,196,138,0.12)]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Live website conversation</p>
          <p className="text-[12px] text-[#E9DCC7]">
            {enabled ? 'Connected to K2 staff inbox' : 'Preview mode · messaging not active'}
          </p>
        </div>
      </div>
      <span className="shrink-0 text-right text-[11px] leading-4 text-[#E9DCC7]">
        {enabled ? 'Replies refresh automatically' : 'Nothing will be sent'}
      </span>
    </div>
  )
}

/** Honest state when the messaging boundary is not switched on in this build. */
function MessagingOffline({ seededMessage }) {
  return (
    <div className="space-y-4">
      <WebsiteChatHeader enabled={false} />
      <div className="rounded-2xl border border-[#E4DCD1] bg-white p-5">
        <p className="text-sm leading-7 text-[#2B2B2B]">
          Messaging is not active in this build yet, so this note cannot be sent from here.
        </p>
        <p className="mt-3 text-[13px] leading-6 text-navy-faint">
          Nothing has been sent. You can reach K2 through the contact details on the storefront,
          and your question is kept below so you can copy it.
        </p>
        {seededMessage && (
          <p className="mt-4 whitespace-pre-wrap rounded-xl border border-[#E4DCD1] bg-[#FBF9F6] p-3 text-sm leading-6 text-[#5C5449]">
            {seededMessage}
          </p>
        )}
      </div>
    </div>
  )
}

export default function StoreChatPanel({ seed, onSeedConsumed }) {
  const enabled = guestBffEnabled()

  const [form, setForm] = useState({ customerName: '', email: '', phone: '' })
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState(null)
  const [botToken, setBotToken] = useState('')
  const [challengeKey, setChallengeKey] = useState(0)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const requestKey = useRef({ fingerprint: '', key: '' })
  const threadRef = useRef(null)

  // A question asked at the shelf arrives as bounded product context. It seeds
  // the box once and is then the customer's to edit or delete — it is never
  // re-applied underneath them as they type.
  useEffect(() => {
    if (!seed?.message) return
    setMessage((current) => (current ? current : seed.message))
    onSeedConsumed?.()
  }, [seed, onSeedConsumed])

  const refresh = useCallback(async () => {
    if (!enabled || !conversation?.conversation_reference) return
    const result = await listGuestConversations()
    if (!result.ok || !Array.isArray(result.data)) return
    const match = result.data.find(
      (item) => item.conversation_reference === conversation.conversation_reference,
    )
    if (match) setConversation(match)
  }, [enabled, conversation?.conversation_reference])

  // Poll only while there is a conversation to poll for.
  useEffect(() => {
    if (!conversation?.conversation_reference) return undefined
    const timer = setInterval(refresh, POLL_MS)
    return () => clearInterval(timer)
  }, [conversation?.conversation_reference, refresh])

  // Keep the newest message in view as the thread grows.
  useEffect(() => {
    const node = threadRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [conversation])

  if (!enabled) return <MessagingOffline seededMessage={seed?.message || message} />

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setError('')
  }

  const send = async (event) => {
    event.preventDefault()
    const content = message.trim()
    if (!content || sending) return

    // An existing thread just takes the reply; a new one needs identity and a
    // bot check, exactly as the messages page requires.
    if (conversation?.conversation_reference) {
      if (!requestKey.current.key) requestKey.current = { fingerprint: content, key: crypto.randomUUID() }
      setSending(true)
      const result = await replyToGuestConversation(
        conversation.conversation_reference, content, requestKey.current.key,
      )
      setSending(false)
      if (!result.ok) { setError(result.error); return }
      requestKey.current = { fingerprint: '', key: '' }
      setConversation((current) => ({
        ...current,
        messages: [...(current?.messages || []), {
          direction: 'inbound', content, delivery_status: 'received',
          created_at: result.data?.created_at || '',
        }],
      }))
      setMessage('')
      setNotice('Sent. A person answers here during Manila business hours.')
      refresh()
      return
    }

    if (!form.customerName.trim()) {
      setError('Add a name so K2 knows who they are replying to.')
      return
    }
    if (!form.email.trim() && !form.phone.trim()) {
      setError('Enter an email address or mobile number so K2 can identify the conversation.')
      return
    }
    if (!botToken) {
      setError('Complete the security check before sending.')
      return
    }

    const fingerprint = JSON.stringify({ ...form, content })
    if (requestKey.current.fingerprint !== fingerprint) {
      requestKey.current = { fingerprint, key: crypto.randomUUID() }
    }

    setSending(true)
    const result = await startGuestConversation({
      ...form,
      message: content,
      idempotencyKey: requestKey.current.key,
      botToken,
      // Tells the admin inbox this customer was standing at a shelf, which is
      // the context that makes the answer useful.
      origin: 'virtual_store',
    })
    setSending(false)

    if (!result.ok) {
      setError(result.error)
      // A consumed challenge cannot be replayed, so a failed attempt gets a
      // fresh one rather than a token the server will now reject.
      setBotToken('')
      setChallengeKey((current) => current + 1)
      return
    }

    requestKey.current = { fingerprint: '', key: '' }
    setConversation({
      ...result.data,
      messages: [{
        direction: 'inbound', content, delivery_status: 'received',
        created_at: result.data?.created_at || '',
      }],
    })
    setMessage('')
    setBotToken('')
    setChallengeKey((current) => current + 1)
    setNotice('Sent. A person answers here during Manila business hours.')
  }

  const messages = conversation?.messages || []

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <WebsiteChatHeader enabled />

      {conversation && (
        <div
          ref={threadRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-[#E4DCD1] bg-[#FBF9F6] p-4"
          aria-live="polite"
          aria-label="Conversation with K2 staff"
        >
          {messages.length === 0 ? (
            <p className="py-4 text-center text-sm text-navy-faint">
              Your message is with K2. Replies appear here.
            </p>
          ) : messages.map((item, index) => {
            const fromCustomer = item.direction === 'inbound'
            return (
              <div
                key={`${item.created_at || 'msg'}-${index}`}
                className={`flex ${fromCustomer ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    fromCustomer
                      ? 'rounded-br-sm bg-crimson text-white'
                      : 'rounded-bl-sm border border-[#E4DCD1] bg-white text-[#2B2B2B]'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{item.content}</p>
                  <p className={`mt-1.5 text-[12px] ${fromCustomer ? 'text-white/75' : 'text-navy-faint'}`}>
                    {formatTime(item.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <form onSubmit={send} className="space-y-3">
        {!conversation && (
          <div className="grid gap-3">
            <label htmlFor="store-chat-name" className="block text-[13px] font-semibold text-[#5C5449]">
              Your name
              <input
                id="store-chat-name"
                type="text"
                value={form.customerName}
                onChange={update('customerName')}
                autoComplete="name"
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#E4DCD1] bg-white px-4 text-sm text-[#2B2B2B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="store-chat-email" className="block text-[13px] font-semibold text-[#5C5449]">
                Email
                <input
                  id="store-chat-email"
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  autoComplete="email"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#E4DCD1] bg-white px-4 text-sm text-[#2B2B2B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
                />
              </label>
              <label htmlFor="store-chat-phone" className="block text-[13px] font-semibold text-[#5C5449]">
                Mobile
                <input
                  id="store-chat-phone"
                  type="tel"
                  value={form.phone}
                  onChange={update('phone')}
                  autoComplete="tel"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#E4DCD1] bg-white px-4 text-sm text-[#2B2B2B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
                />
              </label>
            </div>
            <p className="text-[12px] leading-5 text-navy-faint">
              One contact method is enough. It identifies the conversation and does not replace
              this browser&rsquo;s private access to it.
            </p>
          </div>
        )}

        <label htmlFor="store-chat-message" className="block text-[13px] font-semibold text-[#5C5449]">
          {conversation ? 'Reply to K2' : 'Your message'}
          <textarea
            id="store-chat-message"
            value={message}
            onChange={(event) => { setMessage(event.target.value); setError(''); setNotice('') }}
            maxLength={2000}
            rows={conversation ? 3 : 5}
            placeholder="Ask about an item, a size, or when the next shipment lands"
            className="mt-1.5 w-full resize-y rounded-xl border border-[#E4DCD1] bg-white px-4 py-3 text-sm leading-6 text-[#2B2B2B] placeholder:text-navy-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
            required
          />
        </label>

        {!conversation && (
          <TurnstileChallenge key={challengeKey} enabled={enabled} onTokenChange={setBotToken} />
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-crimson/25 bg-crimson/5 p-3 text-sm text-crimson">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="min-h-[44px] w-full rounded-xl bg-crimson px-5 text-sm font-semibold text-white transition-transform duration-150 ease-out-quint active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
        >
          {sending ? 'Sending…' : conversation ? 'Send reply' : 'Send to K2'}
        </button>

        <p className="text-[12px] leading-5 text-navy-faint" role="status">
          {notice || 'A real person answers. Messages are reviewed during Manila business hours.'}
        </p>
      </form>
    </div>
  )
}
