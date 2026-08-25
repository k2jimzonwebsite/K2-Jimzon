import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../context/StoreContext'
import { useCustomerAccount } from '../hooks/useCustomerAccount'
import {
  requestCustomerEmailLink, requestCustomerPhoneCode, verifyCustomerPhoneCode,
} from '../services/customerAccountService'
import TurnstileChallenge from '../components/security/TurnstileChallenge'
import { ArrowIcon, ChatIcon, CheckIcon, ShieldIcon, SyncIcon, UserIcon } from '../components/ui/icons'

const field = 'store-field mt-2 min-h-12 w-full px-4 text-base'
const primary = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-crimson px-5 text-sm font-bold text-paper transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-paper px-4 text-sm font-bold text-navy transition-[transform,border-color] duration-150 hover:border-navy/25 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50'

function formatDate(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(date)
}

function peso(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(Number(value || 0))
}

function AccountLoading() {
  return <main className="store-atmosphere min-h-[70vh] px-4 py-10" aria-busy="true" aria-label="Checking customer account">
    <div className="mx-auto max-w-5xl animate-pulse space-y-5">
      <div className="h-5 w-36 rounded bg-shell" /><div className="h-12 max-w-xl rounded bg-shell" />
      <div className="grid gap-8 border-t border-line pt-8 md:grid-cols-[0.9fr_1.1fr]"><div className="h-40 rounded-xl bg-shell" /><div className="h-72 rounded-xl bg-shell" /></div>
    </div>
  </main>
}

function SignInForm({ offline }) {
  const [method, setMethod] = useState('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('+63')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState('entry')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [botToken, setBotToken] = useState('')
  const [challengeKey, setChallengeKey] = useState(0)

  const resetChallenge = () => {
    setBotToken('')
    setChallengeKey(value => value + 1)
  }

  const submit = async (event) => {
    event.preventDefault(); setError('')
    if (offline) return setError('Reconnect to request a sign-in code.')
    let result
    if (method === 'email') {
      const clean = email.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setError('Enter a valid email address.')
      if (!botToken) return setError('Complete the security check before requesting a sign-in link.')
      setPending(true)
      result = await requestCustomerEmailLink(clean, botToken)
      resetChallenge()
      if (result.ok) setStage('email-sent')
    } else if (stage === 'phone-code') {
      if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from the text message.')
      setPending(true)
      result = await verifyCustomerPhoneCode(phone.trim(), code)
    } else {
      const clean = phone.replace(/[\s()-]/g, '')
      if (!/^\+[1-9]\d{7,14}$/.test(clean)) return setError('Use the full mobile number with country code, such as +63.')
      if (!botToken) return setError('Complete the security check before requesting a text code.')
      setPending(true)
      result = await requestCustomerPhoneCode(clean, botToken)
      resetChallenge()
      if (result.ok) { setPhone(clean); setStage('phone-code') }
    }
    if (!result?.ok) setError(result?.error || 'The sign-in request could not be completed.')
    setPending(false)
  }

  return <section aria-labelledby="account-sign-in-title" className="rounded-2xl border border-line bg-paper p-5 sm:p-7">
    <h2 id="account-sign-in-title" className="font-serif text-2xl font-semibold text-navy">Sign in without a password</h2>
    <p className="mt-2 max-w-[58ch] text-sm leading-6 text-navy-soft">Use a verified email link or mobile code. Signing in does not grant wholesale pricing or change an order.</p>
    <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-shell p-1" role="tablist" aria-label="Sign-in method">
      {['email','phone'].map(item => <button key={item} type="button" role="tab" aria-selected={method === item} onClick={() => { setMethod(item); setStage('entry'); setError(''); resetChallenge() }} className={`min-h-11 rounded-lg px-3 text-sm font-bold transition-colors duration-150 ${method === item ? 'bg-paper text-crimson' : 'text-navy-soft hover:text-navy'}`}>{item === 'email' ? 'Email link' : 'Text code'}</button>)}
    </div>
    {stage === 'email-sent' ? <div className="mt-6 rounded-xl border border-forest/30 bg-forest/10 p-4" role="status">
      <div className="flex gap-3"><CheckIcon size={20} className="mt-0.5 shrink-0 text-forest" /><div><p className="font-bold text-navy">Check your email</p><p className="mt-1 text-sm leading-6 text-navy-soft">Open the K2 sign-in link in this browser. The link verifies the address; it does not link guest records automatically.</p></div></div>
      <button type="button" className={`${secondary} mt-4`} onClick={() => setStage('entry')}>Use another address</button>
    </div> : <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
      {method === 'email' ? <label className="block text-sm font-bold text-navy" htmlFor="customer-account-email">Email address<input id="customer-account-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className={field} aria-describedby="account-email-help" required /><span id="account-email-help" className="mt-2 block text-sm font-normal leading-5 text-navy-soft">We send one secure sign-in link. No password is created.</span></label> : stage === 'phone-code' ? <label className="block text-sm font-bold text-navy" htmlFor="customer-account-code">6-digit text code<input id="customer-account-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className={`${field} font-mono tracking-[0.2em]`} aria-describedby="account-code-help" required /><span id="account-code-help" className="mt-2 block text-sm font-normal leading-5 text-navy-soft">Sent to {phone}. Codes expire; request another if it no longer works.</span></label> : <label className="block text-sm font-bold text-navy" htmlFor="customer-account-phone">Mobile number<input id="customer-account-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} className={field} aria-describedby="account-phone-help" required /><span id="account-phone-help" className="mt-2 block text-sm font-normal leading-5 text-navy-soft">Include the country code. Philippine numbers begin with +63.</span></label>}
      {stage !== 'phone-code' && <TurnstileChallenge
        key={challengeKey}
        action="customer_auth"
        onTokenChange={setBotToken}
        description="Complete this check before K2 asks the sign-in provider to send a link or text code."
      />}
      {error && <p className="rounded-xl border border-crimson/30 bg-crimson/10 p-3 text-sm font-semibold leading-5 text-crimson" role="alert">{error}</p>}
      <button className={`${primary} w-full`} disabled={pending || offline}>{pending ? 'Checking…' : method === 'email' ? 'Send sign-in link' : stage === 'phone-code' ? 'Verify code' : 'Send text code'}<ArrowIcon size={17} /></button>
      {method === 'phone' && stage === 'phone-code' && <button type="button" className={`${secondary} w-full`} onClick={() => { setStage('entry'); setCode(''); setError('') }}>Change number or resend</button>}
    </form>}
  </section>
}

function Conversation({ conversation, onReply, pending, offline }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const keyRef = useRef('')
  const submit = async (event) => {
    event.preventDefault(); setError('')
    const clean = message.trim()
    if (!clean) return setError('Write a message before sending.')
    if (offline) return setError('Reconnect before sending this message.')
    if (!keyRef.current) keyRef.current = crypto.randomUUID()
    const result = await onReply(conversation.conversation_reference, clean, keyRef.current)
    if (result.ok) { setMessage(''); keyRef.current = '' } else setError(result.error || 'The message was not recorded. Retry the same message.')
  }
  return <article className="border-t border-line py-6 first:border-t-0 first:pt-0">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-serif text-xl font-semibold text-navy">{conversation.channel || 'Website'} conversation</h3><p className="mt-1 font-mono text-xs text-navy-soft">{conversation.conversation_reference}</p></div><div className="text-right text-xs text-navy-soft"><p className="font-bold text-navy">{conversation.status}</p><p className="mt-1">Updated {formatDate(conversation.last_message_at)}</p></div></div>
    <div className="mt-5 space-y-3">{(conversation.messages || []).map((item, index) => <div key={`${item.created_at}-${index}`} className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-6 ${item.direction === 'inbound' ? 'ml-auto bg-crimson text-paper' : 'border border-line bg-shell text-navy'}`}><p className="whitespace-pre-wrap break-words">{item.content}</p><p className={`mt-1 text-xs ${item.direction === 'inbound' ? 'text-paper/75' : 'text-navy-soft'}`}>{formatDate(item.created_at)} · {item.delivery_status === 'sent' ? 'Sent by K2' : item.delivery_status === 'received' ? 'Recorded by K2' : 'Delivery pending'}</p></div>)}</div>
    <form onSubmit={submit} className="mt-5"><label htmlFor={`reply-${conversation.conversation_reference}`} className="text-sm font-bold text-navy">Reply<textarea id={`reply-${conversation.conversation_reference}`} value={message} onChange={event => { setMessage(event.target.value.slice(0, 2000)); if (keyRef.current) keyRef.current = '' }} className={`${field} min-h-24 resize-y`} maxLength={2000} /></label><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-navy-soft">Recorded in K2’s Website conversation. External-channel delivery is not implied.</p><button className={primary} disabled={pending || offline}>{pending ? 'Recording…' : 'Record reply'}<ArrowIcon size={16} /></button></div>{error && <p role="alert" className="mt-3 rounded-xl border border-crimson/30 bg-crimson/10 p-3 text-sm font-semibold text-crimson">{error}</p>}</form>
  </article>
}

function LinkedAccount({ account, offline }) {
  const { history, historyState, error, refreshHistory, reply, signOut } = account
  const [replyPending, setReplyPending] = useState(false)
  const handleReply = async (...args) => { setReplyPending(true); const result = await reply(...args); setReplyPending(false); return result }
  return <main className="store-atmosphere min-h-[70vh] px-4 py-10 sm:py-14">
    <div className="mx-auto max-w-6xl"><div className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold text-crimson">Verified customer account</p><h1 className="mt-2 max-w-2xl text-balance font-serif text-4xl font-semibold leading-tight text-navy sm:text-5xl">Your K2 records, in one place.</h1><p className="mt-3 max-w-[65ch] leading-7 text-navy-soft">Only deliberately linked orders, Pasabuy requests, and customer-visible Website messages appear here.</p></div><div className="flex flex-wrap gap-2"><button className={secondary} onClick={() => refreshHistory()} disabled={historyState === 'loading' || offline}><SyncIcon size={16} />{historyState === 'loading' ? 'Refreshing…' : 'Refresh'}</button><button className={secondary} onClick={signOut}>Sign out</button></div></div>
      {error && <div className="mt-6 rounded-xl border border-crimson/30 bg-crimson/10 p-4" role="alert"><p className="font-bold text-crimson">Account records are unavailable</p><p className="mt-1 text-sm leading-6 text-navy-soft">{error}</p><button className={`${secondary} mt-3`} onClick={() => refreshHistory()} disabled={offline}>Try again</button></div>}
      {history && <div className="grid gap-10 py-10 lg:grid-cols-[0.85fr_1.15fr]"><div className="space-y-10"><section aria-labelledby="orders-title"><div className="flex items-end justify-between gap-3"><h2 id="orders-title" className="font-serif text-2xl font-semibold text-navy">Order requests</h2><span className="text-sm font-bold text-navy-soft">{history.orders.length}</span></div><div className="mt-4 divide-y divide-line border-y border-line">{history.orders.length ? history.orders.map(order => <div key={order.public_reference} className="py-4"><div className="flex flex-wrap justify-between gap-3"><p className="font-mono text-sm font-bold text-navy">{order.public_reference}</p><p className="font-bold text-navy">{peso(order.total_amount)}</p></div><p className="mt-2 text-sm text-navy-soft">{order.status} · Payment {order.payment_status.replaceAll('_',' ')} · {formatDate(order.created_at)}</p></div>) : <p className="py-6 text-sm leading-6 text-navy-soft">No linked order requests yet. Guest checkout still works without signing in.</p>}</div></section>
        <section aria-labelledby="pasabuy-title"><div className="flex items-end justify-between gap-3"><h2 id="pasabuy-title" className="font-serif text-2xl font-semibold text-navy">Pasabuy requests</h2><span className="text-sm font-bold text-navy-soft">{history.pasabuy_requests.length}</span></div><div className="mt-4 divide-y divide-line border-y border-line">{history.pasabuy_requests.length ? history.pasabuy_requests.map(request => <div key={request.public_reference} className="py-4"><p className="font-mono text-sm font-bold text-navy">{request.public_reference}</p><p className="mt-1 font-semibold text-navy">{request.item_title} · Qty {request.quantity}</p><p className="mt-1 text-sm text-navy-soft">{request.status} · {formatDate(request.created_at)}</p></div>) : <p className="py-6 text-sm leading-6 text-navy-soft">No linked Pasabuy requests yet.</p>}</div></section></div>
        <section aria-labelledby="account-messages-title"><div className="flex items-center gap-3"><ChatIcon size={22} className="text-crimson" /><h2 id="account-messages-title" className="font-serif text-2xl font-semibold text-navy">Website messages</h2></div><div className="mt-5 rounded-2xl border border-line bg-paper p-5 sm:p-7">{history.conversations.length ? history.conversations.map(conversation => <Conversation key={conversation.conversation_reference} conversation={conversation} onReply={handleReply} pending={replyPending} offline={offline} />) : <div className="py-8 text-center"><ChatIcon size={28} className="mx-auto text-navy-soft" /><p className="mt-3 font-bold text-navy">No linked conversations yet</p><p className="mt-1 text-sm leading-6 text-navy-soft">Message K2 from Contact us. An account is never required to start.</p></div>}</div></section></div>}
    </div>
  </main>
}

export default function CustomerAccount() {
  const { go } = useStore()
  const account = useCustomerAccount()
  const [offline, setOffline] = useState(() => !navigator.onLine)
  const [claimPending, setClaimPending] = useState(false)
  const [claimError, setClaimError] = useState('')
  const claimKeyRef = useRef('')
  const contactKinds = useMemo(() => {
    const user = account.session?.user
    return [user?.email_confirmed_at && 'email', user?.phone_confirmed_at && 'phone'].filter(Boolean)
  }, [account.session])
  const [contactKind, setContactKind] = useState('email')

  useEffect(() => { const online=()=>setOffline(false); const off=()=>setOffline(true); window.addEventListener('online',online); window.addEventListener('offline',off); return()=>{ window.removeEventListener('online',online); window.removeEventListener('offline',off) } }, [])
  useEffect(() => { if (contactKinds.length && !contactKinds.includes(contactKind)) setContactKind(contactKinds[0]) }, [contactKind, contactKinds])
  useEffect(() => { if (!account.ready) return; const url=new URL(window.location.href); if (url.searchParams.has('account') || url.searchParams.has('code')) { url.searchParams.delete('account'); url.searchParams.delete('code'); window.history.replaceState({},'',`${url.pathname}${url.search}${url.hash}`) } }, [account.ready])

  if (!account.enabled) return <main className="store-atmosphere min-h-[70vh] px-4 py-16"><div className="mx-auto max-w-3xl border-y border-line py-12 text-center"><ShieldIcon size={30} className="mx-auto text-navy-soft" /><h1 className="mt-4 font-serif text-4xl font-semibold text-navy">Customer accounts are not active yet.</h1><p className="mx-auto mt-3 max-w-[58ch] leading-7 text-navy-soft">You can still shop, submit Pasabuy requests, and message K2 without registering.</p><button className={`${primary} mt-6`} onClick={() => go('contact')}>Contact K2</button></div></main>
  if (!account.ready) return <AccountLoading />
  if (account.session && account.historyState === 'ready') return <LinkedAccount account={account} offline={offline} />

  const doClaim = async () => {
    setClaimError(''); if (offline) return setClaimError('Reconnect before linking records.')
    if (!claimKeyRef.current) claimKeyRef.current = crypto.randomUUID()
    setClaimPending(true); const result = await account.claim(contactKind, claimKeyRef.current); setClaimPending(false)
    if (result.ok) claimKeyRef.current = ''; else setClaimError(result.error || 'The records could not be linked.')
  }

  return <main className="store-atmosphere min-h-[70vh] px-4 py-10 sm:py-16"><div className="mx-auto max-w-5xl"><div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-start"><section className="md:sticky md:top-36"><p className="text-sm font-bold text-crimson">Optional customer account</p><h1 className="mt-3 text-balance font-serif text-4xl font-semibold leading-tight text-navy sm:text-5xl">Keep verified K2 history across devices.</h1><p className="mt-5 max-w-[58ch] text-base leading-7 text-navy-soft">Guest checkout and messaging remain available. An account adds continuity only after K2 verifies that the guest records belong to the same contact.</p><ul className="mt-7 space-y-4 text-sm leading-6 text-navy-soft">{['No password to remember.','No automatic identity merge from matching text.','No VIP or wholesale pricing promise.'].map(item => <li key={item} className="flex gap-3"><CheckIcon size={18} className="mt-1 shrink-0 text-forest" /><span>{item}</span></li>)}</ul></section>
      {!account.session ? <SignInForm offline={offline} /> : <section className="rounded-2xl border border-line bg-paper p-5 sm:p-7" aria-labelledby="claim-title"><div className="flex items-start gap-3"><UserIcon size={24} className="mt-1 shrink-0 text-crimson" /><div><p className="text-sm font-bold text-forest">Verified sign-in</p><h2 id="claim-title" className="mt-1 font-serif text-2xl font-semibold text-navy">Link this browser’s guest records</h2><p className="mt-2 break-all text-sm text-navy-soft">{account.session.user.email || account.session.user.phone || 'Verified customer session'}</p></div></div><p className="mt-6 text-sm leading-6 text-navy-soft">K2 will match only the confirmed contact inside this account with the customer owned by this browser’s private guest grant. Conflicts stop for staff review.</p>{contactKinds.length > 1 && <fieldset className="mt-5"><legend className="text-sm font-bold text-navy">Confirmed contact to match</legend><div className="mt-2 flex gap-2">{contactKinds.map(kind => <label key={kind} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-bold ${contactKind === kind ? 'border-crimson bg-crimson/10 text-crimson' : 'border-line text-navy-soft'}`}><input type="radio" name="claim-contact-kind" value={kind} checked={contactKind === kind} onChange={() => setContactKind(kind)} />{kind === 'email' ? 'Email' : 'Phone'}</label>)}</div></fieldset>}{account.historyState === 'loading' && <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-navy-soft" role="status"><SyncIcon size={17} />Checking linked records…</p>}{account.historyState === 'error' && account.code !== 'ACCOUNT_NOT_LINKED' && <p className="mt-5 rounded-xl border border-crimson/30 bg-crimson/10 p-3 text-sm font-semibold text-crimson" role="alert">{account.error}</p>}{claimError && <p className="mt-5 rounded-xl border border-crimson/30 bg-crimson/10 p-3 text-sm font-semibold text-crimson" role="alert">{claimError}</p>}<button className={`${primary} mt-6 w-full`} onClick={doClaim} disabled={claimPending || offline || !contactKinds.length || account.historyState === 'loading'}>{claimPending ? 'Linking verified records…' : 'Link verified guest records'}<ArrowIcon size={17} /></button><div className="mt-3 flex flex-wrap justify-between gap-2"><button className={secondary} onClick={() => account.refreshHistory()} disabled={offline}>Check existing link</button><button className={secondary} onClick={account.signOut}>Sign out</button></div></section>}
    </div>{offline && <p className="mt-8 rounded-xl border border-amber/35 bg-amber/10 p-4 text-sm font-semibold text-navy" role="status">You are offline. Existing information stays visible, but sign-in, linking, refresh, and replies wait for reconnection.</p>}</div></main>
}
