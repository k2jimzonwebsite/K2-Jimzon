import { useCallback, useEffect, useRef, useState } from 'react'
import TurnstileChallenge from '../security/TurnstileChallenge'
import {
  guestBffEnabled, listGuestConversations, replyToGuestConversation, startGuestConversation,
} from '../../services/guestCommerceService'
import './StoreChatPanel.css'

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

const LEGACY_THREAD_KEY = 'k2-store-chat-convo-id'
const GUEST_REFERENCE_KEY = 'k2-store-chat-guest-reference'

function isGuestConversationReference(value) {
  return /^CV-[0-9A-F]{16}$/.test(String(value || ''))
}

function readStoredGuestConversationReference() {
  try {
    const local = localStorage.getItem(GUEST_REFERENCE_KEY)
    if (isGuestConversationReference(local)) return local
  } catch { /* private-mode storage: fall through to session */ }
  try {
    const session = sessionStorage.getItem(GUEST_REFERENCE_KEY)
    return isGuestConversationReference(session) ? session : null
  } catch { return null }
}

function persistGuestConversationReference(reference) {
  if (!isGuestConversationReference(reference)) return
  try { localStorage.setItem(GUEST_REFERENCE_KEY, reference) } catch { /* private-mode storage */ }
  try { sessionStorage.setItem(GUEST_REFERENCE_KEY, reference) } catch { /* storage fallback */ }
}

function clearGuestConversationReference() {
  try { localStorage.removeItem(GUEST_REFERENCE_KEY) } catch { /* private-mode storage */ }
  try { sessionStorage.removeItem(GUEST_REFERENCE_KEY) } catch { /* storage fallback */ }
}

function discardLegacyStoredConvoId() {
  try { localStorage.removeItem(LEGACY_THREAD_KEY) } catch { /* private-mode storage */ }
  try { sessionStorage.removeItem(LEGACY_THREAD_KEY) } catch { /* storage fallback */ }
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function WebsiteChatHeader({ enabled }) {
  return (
    <div className="k2-store-chat-status flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#B78A45]/35 bg-[#2B2118] px-4 py-3 text-[#FFF8EC]">
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold">Chat with the K2 team</p>
          <p className="text-sm text-[#E9DCC7]">
            {enabled ? 'Our staff will reply here. Replies may take some time.' : 'Messaging is not available yet.'}
          </p>
        </div>
      </div>
      <span className="text-sm leading-5 text-[#E9DCC7]">
        {enabled ? 'New replies appear automatically.' : 'Nothing will be sent'}
      </span>
    </div>
  )
}

/** Honest state when the messaging boundary is not switched on in this build. */
function MessagingOffline({ seededMessage }) {
  return (
    <div className="space-y-4">
      <WebsiteChatHeader enabled={false} />
      <div className="rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-5">
        <p className="text-sm leading-7 text-[var(--k2-ink)]">
          Messaging is not active in this build yet, so this note cannot be sent from here.
        </p>
        <p className="mt-3 text-[13px] leading-6 text-navy-faint">
          Nothing has been sent. You can reach K2 through the contact details on the storefront,
          and your question is kept below so you can copy it.
        </p>
        {seededMessage && (
          <p className="mt-4 whitespace-pre-wrap rounded-xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-3 text-sm leading-6 text-[var(--k2-muted)]">
            {seededMessage}
          </p>
        )}
      </div>
    </div>
  )
}

export default function StoreChatPanel({ seed, onSeedConsumed, active = true }) {
  const bffEnabled = guestBffEnabled()
  const enabled = bffEnabled

  const [form, setForm] = useState({ customerName: '', email: '', phone: '' })
  // An unsent draft survives sheet close, Escape, and remounts within this
  // tab visit. It clears only after a confirmed send.
  const [message, setMessage] = useState(() => {
    try { return sessionStorage.getItem('k2-store-chat-draft') || '' } catch { return '' }
  })
  useEffect(() => {
    try {
      if (message) sessionStorage.setItem('k2-store-chat-draft', message)
      else sessionStorage.removeItem('k2-store-chat-draft')
    } catch { /* private-mode storage: draft simply does not persist */ }
  }, [message])
  const [conversation, setConversation] = useState(null)
  const [botToken, setBotToken] = useState('')
  const [challengeKey, setChallengeKey] = useState(0)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const requestKey = useRef({ fingerprint: '', key: '' })
  const threadRef = useRef(null)
  useEffect(() => { if (!active) setBotToken('') }, [active])

  // Discard test-era UUID pointers. Restore a new opaque reference only after
  // the guest-grant-scoped list confirms this browser still has access.
  useEffect(() => {
    discardLegacyStoredConvoId()
    if (!bffEnabled) return undefined

    const savedReference = readStoredGuestConversationReference()
    if (!savedReference) return undefined

    let cancelled = false
    listGuestConversations().then((result) => {
      if (cancelled || !result.ok || !Array.isArray(result.data)) return
      const match = result.data.find(
        (item) => item.conversation_reference === savedReference,
      )
      if (match) setConversation(match)
      else clearGuestConversationReference()
    }).catch(() => {})

    return () => { cancelled = true }
  }, [bffEnabled])

  // A question asked at the shelf arrives as bounded product context. It seeds
  // the box once and is then the customer's to edit or delete — it is never
  // re-applied underneath them as they type.
  useEffect(() => {
    if (!seed?.message) return
    if (!message || message === seed.message) {
      setMessage(seed.message)
      onSeedConsumed?.()
    }
  }, [seed, onSeedConsumed, message])

  const refresh = useCallback(async () => {
    if (!bffEnabled || !conversation?.conversation_reference) return
    const result = await listGuestConversations()
    if (!result.ok || !Array.isArray(result.data)) return
    const match = result.data.find(
      (item) => item.conversation_reference === conversation.conversation_reference,
    )
    if (match) setConversation(match)
    else {
      clearGuestConversationReference()
      setConversation(null)
    }
  }, [bffEnabled, conversation?.conversation_reference])

  // Poll only while there is a conversation to poll for.
  useEffect(() => {
    if (!active || !(conversation?.id || conversation?.conversation_reference)) return undefined
    const timer = setInterval(refresh, POLL_MS)
    return () => clearInterval(timer)
  }, [active, conversation?.id, conversation?.conversation_reference, refresh])

  // Keep the newest message in view as the thread grows.
  useEffect(() => {
    const node = threadRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [conversation])

  if (!enabled) return <MessagingOffline seededMessage={[message, seed?.message !== message ? seed?.message : ''].filter(Boolean).join('\n\n')} />

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setError('')
  }

  const send = async (event) => {
    event.preventDefault()
    const content = message.trim()
    if (!content || sending) return

    // An existing guest-grant-scoped thread takes the reply; a new one needs
    // identity and a bot check, exactly as the messages page requires.
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
    if (bffEnabled && !botToken) {
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
    persistGuestConversationReference(result.data?.conversation_reference)
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
    <div className="k2-store-chat flex min-h-0 flex-1 flex-col gap-4">
      <WebsiteChatHeader enabled />

      {conversation && (
        <div
          ref={threadRef}
          className="k2-store-chat-thread min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border p-4"
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
                      : 'k2-store-chat-reply rounded-bl-sm border'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{item.content}</p>
                  <p className={`mt-1.5 text-sm ${fromCustomer ? 'text-white' : 'text-[var(--k2-muted)]'}`}>
                    {formatTime(item.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <form onSubmit={send} className="space-y-3">
        {seed?.message && message && seed.message !== message && (
          <div className="rounded-xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-4 text-sm text-[var(--k2-ink)]" role="status">
            <p>You already have an unsent draft. This new shelf question is ready below.</p>
            <p className="mt-2 whitespace-pre-wrap">{seed.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="min-h-[44px] rounded-lg border border-[var(--chat-border)] px-3" onClick={() => { setMessage(seed.message); onSeedConsumed?.() }}>Replace draft with this question</button>
              <button type="button" className="min-h-[44px] rounded-lg border border-[var(--chat-border)] px-3" onClick={() => onSeedConsumed?.()}>Keep current draft</button>
            </div>
          </div>
        )}
        {!conversation && (
          <div className="grid grid-cols-1 gap-3">
            <label htmlFor="store-chat-name" className="block text-base font-semibold text-[var(--k2-ink)]">
              Your name
              <input
                id="store-chat-name"
                type="text"
                value={form.customerName}
                onChange={update('customerName')}
                autoComplete="name"
                className="k2-store-chat-input mt-1.5 min-h-[44px] w-full rounded-xl border px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label htmlFor="store-chat-email" className="block text-base font-semibold text-[var(--k2-ink)]">
                Email
                <input
                  id="store-chat-email"
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  autoComplete="email"
                  className="k2-store-chat-input mt-1.5 min-h-[44px] w-full rounded-xl border px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
                />
              </label>
              <label htmlFor="store-chat-phone" className="block text-base font-semibold text-[var(--k2-ink)]">
                Mobile
                <input
                  id="store-chat-phone"
                  type="tel"
                  value={form.phone}
                  onChange={update('phone')}
                  autoComplete="tel"
                  className="k2-store-chat-input mt-1.5 min-h-[44px] w-full rounded-xl border px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
                />
              </label>
            </div>
            <p className="text-sm leading-6 text-[var(--k2-muted)]">
              Enter either your email or mobile number so we can identify your conversation.
              Use this browser to return to your chat.
            </p>
          </div>
        )}

        <label htmlFor="store-chat-message" className="block text-base font-semibold text-[var(--k2-ink)]">
          {conversation ? 'Reply to K2' : 'Your message'}
          <textarea
            id="store-chat-message"
            value={message}
            onChange={(event) => { setMessage(event.target.value); setError(''); setNotice('') }}
            maxLength={2000}
            rows={conversation ? 3 : 5}
            placeholder="Ask about an item, a size, or when the next shipment lands"
            className="k2-store-chat-input mt-1.5 w-full resize-y rounded-xl border px-4 py-3 text-base leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
            required
          />
        </label>

        {!conversation && active && (
          <TurnstileChallenge key={challengeKey} enabled={bffEnabled} action="guest_start" onTokenChange={setBotToken} />
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

        <p className="text-sm leading-6 text-[var(--k2-muted)]" role="status">
          {notice || 'A real person answers. Messages are reviewed during Manila business hours.'}
        </p>
      </form>
    </div>
  )
}
