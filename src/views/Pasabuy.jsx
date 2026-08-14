import { useState } from 'react'
import { useStore } from '../context/StoreContext'
import { RedButton, TrustBadge, TuscanCard, Kicker } from '../components/ui/bits'
import { CheckIcon, PlaneIcon } from '../components/ui/icons'
import TurnstileChallenge from '../components/security/TurnstileChallenge'
import { guestBffEnabled } from '../services/guestCommerceService'

const EMPTY_FORM = {
  customerName: '', email: '', phone: '', item: '', url: '', budget: '',
  qty: 1, shipping: 'sea', alternatives: false, notes: '',
}

export default function Pasabuy() {
  const { requests, addRequest, go } = useStore()
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [botToken, setBotToken] = useState('')
  const [challengeKey, setChallengeKey] = useState(0)

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm(current => ({ ...current, [key]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setReceipt(null)
    if (!form.email.trim() && !form.phone.trim()) {
      setError('Enter an email address or mobile number so we can send the quote.')
      return
    }
    if (guestBffEnabled() && !botToken) {
      setError('Complete the security check before submitting your Pasabuy request.')
      return
    }
    setSubmitting(true)
    const result = await addRequest({ ...form, botToken })
    setSubmitting(false)
    if (!result?.ok) {
      setError(result?.error || 'The request could not be saved. Please try again.')
      return
    }
    setReceipt(result.request)
    setForm(EMPTY_FORM)
    setBotToken('')
    setChallengeKey(current => current + 1)
  }

  const field = 'store-field w-full px-4 py-3 text-base'

  return (
    <main className="store-section pb-24 pt-10 md:pb-20 md:pt-14">
      <div className="grid gap-10 lg:grid-cols-[1.16fr_0.84fr] lg:gap-16">
        <div>
          <Kicker className="flex items-center gap-2"><PlaneIcon size={14} /> Customer-requested imports</Kicker>
          <h1 className="mt-3 font-serif text-3xl font-semibold leading-[1.06] tracking-tight text-navy sm:text-4xl md:text-5xl">
            Pasabuy,<br /><em className="font-normal text-crimson">with a real request trail.</em>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-navy-soft">
            Tell us what you need from Italy. We research the exact item, record the exchange-rate source and freight assumptions, then send a quote for your approval before buying anything.
          </p>

          <form onSubmit={submit} className="mt-9 store-panel p-5 shadow-sm sm:p-7">
            <div className="mb-6 border-b border-[var(--store-surface-border)] pb-5"><h2 className="font-serif text-xl font-semibold text-navy">Tell us what to find</h2><p className="mt-1 text-sm text-navy-soft">Specific details help staff research the right listing faster.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-navy">Full name
                <input className={`${field} mt-1.5`} value={form.customerName} onChange={update('customerName')} autoComplete="name" required />
              </label>
              <label className="block text-sm font-semibold text-navy">Mobile number
                <input className={`${field} mt-1.5`} type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" />
              </label>
            </div>
            <label className="mt-4 block text-sm font-semibold text-navy">Email
              <input className={`${field} mt-1.5`} type="email" value={form.email} onChange={update('email')} autoComplete="email" />
            </label>
            <label className="mt-4 block text-sm font-semibold text-navy">What exactly are you looking for?
              <textarea className={`${field} mt-1.5 min-h-24 resize-y`} value={form.item} onChange={update('item')} placeholder="Brand, exact variant, size, shade, or other identifying details" required />
            </label>
            <label className="mt-4 block text-sm font-semibold text-navy">Reference link <span className="font-normal text-navy-soft">(optional)</span>
              <input className={`${field} mt-1.5`} type="url" value={form.url} onChange={update('url')} placeholder="Official store or product page" />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-navy">Target budget in PHP <span className="font-normal text-navy-soft">(optional)</span>
                <input className={`${field} mt-1.5`} type="number" min="0" step="1" value={form.budget} onChange={update('budget')} />
              </label>
              <label className="block text-sm font-semibold text-navy">Quantity
                <input className={`${field} mt-1.5`} type="number" min="1" max="999" value={form.qty} onChange={update('qty')} required />
              </label>
            </div>

            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-navy">Shipping preference</legend>
              <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-lg border border-[var(--store-surface-border)] bg-[var(--product-img-bg)] p-1">
                {[
                  ['sea', 'Sea cargo · slower, lower freight'],
                  ['air', 'Air freight · faster, higher freight'],
                ].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setForm(current => ({ ...current, shipping: value }))}
                    className={`min-h-11 rounded-md px-3 text-sm font-medium transition-colors duration-150 ${form.shipping === value ? 'bg-[var(--store-surface-bg)] text-navy shadow-sm border border-[var(--store-surface-border)]' : 'text-navy-soft hover:text-navy'}`}
                    aria-pressed={form.shipping === value}>{label}</button>
                ))}
              </div>
            </fieldset>

            <label className="mt-4 block text-sm font-semibold text-navy">Notes <span className="font-normal text-navy-soft">(optional)</span>
              <textarea className={`${field} mt-1.5 min-h-20 resize-y`} value={form.notes} onChange={update('notes')} placeholder="Receipt, authenticity, packaging, or deadline requirements" />
            </label>
            <label className="mt-4 flex min-h-11 items-start gap-3 rounded-lg border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] p-3 text-sm text-navy-soft">
              <input type="checkbox" checked={form.alternatives} onChange={update('alternatives')} className="mt-1 h-4 w-4 accent-crimson" />
              I allow K2 to suggest a similar premium alternative if the exact item is unavailable.
            </label>

            <p className="mt-4 text-xs leading-relaxed text-navy-soft">
              Photo attachments will be requested by staff through your contact channel when needed. This avoids unsafe anonymous uploads before our protected attachment service is ready.
            </p>
            <TurnstileChallenge key={challengeKey} onTokenChange={setBotToken} />
            {error && <p role="alert" className="mt-4 rounded-xl border border-crimson/25 bg-crimson/5 p-3 text-sm text-crimson">{error}</p>}
            {receipt && (
              <div role="status" className="mt-4 rounded-xl border border-forest/25 bg-forest/5 p-3 text-sm text-forest">
                <div className="flex items-start gap-2">
                  <CheckIcon size={17} className="mt-0.5 shrink-0" />
                  <span>Request saved. Keep reference <strong>{receipt.public_reference}</strong>; staff will review it before sending a quote.</span>
                </div>
                {guestBffEnabled() && (
                  <button type="button" onClick={() => go('messages')} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-forest px-4 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-forest/90 active:scale-[0.98]">
                    Open request chat
                  </button>
                )}
              </div>
            )}
            <RedButton type="submit" className="mt-6 w-full py-4 text-base" disabled={submitting}>
              {submitting ? 'Saving request…' : 'Submit Pasabuy request'}
            </RedButton>
          </form>

          <div className="mt-8 flex flex-wrap gap-2">
            <TrustBadge>Quote before purchase</TrustBadge>
            <TrustBadge>Recorded cost assumptions</TrustBadge>
            <TrustBadge>No payment at submission</TrustBadge>
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
          <TuscanCard tricolor><div className="p-6">
            <h2 className="font-serif text-lg font-semibold">How it works</h2>
            <ol className="mt-4 space-y-4">
              {[
                ['You request', 'Give us the exact product and a reliable way to contact you.'],
                ['We research', 'Staff confirms the item, availability, route, and cost inputs.'],
                ['You approve the quote', 'No purchase happens until you accept the recorded quote.'],
                ['We buy and track', 'The request advances through purchasing, transit, arrival, and delivery.'],
              ].map(([title, body], index) => (
                <li key={title} className="flex gap-3.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest/10 text-sm font-semibold text-forest">{index + 1}</span><div><p className="font-semibold">{title}</p><p className="text-sm leading-relaxed text-navy-soft">{body}</p></div></li>
              ))}
            </ol>
          </div></TuscanCard>

          <TuscanCard className="p-6">
            <h2 className="font-serif text-lg font-semibold">Requests from this visit</h2>
            {requests.length === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-navy-soft">No requests submitted in this browser session yet. For privacy, previous guest requests are not shown without customer sign-in.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {requests.map(request => <li key={request.id} className="py-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{request.item}</p><p className="mt-0.5 text-xs text-navy-soft">{request.id} · {request.eta}</p></div><span className="shrink-0 rounded-full bg-shell px-2.5 py-1 text-xs font-semibold text-navy-soft">{request.status}</span></div></li>)}
              </ul>
            )}
          </TuscanCard>
        </div>
      </div>
    </main>
  )
}
