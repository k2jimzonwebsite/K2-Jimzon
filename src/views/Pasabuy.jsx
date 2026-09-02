import { useState, useEffect } from 'react'
import { useStore } from '../context/StoreContext'
import { RedButton, TrustBadge, TuscanCard, Kicker } from '../components/ui/bits'
import { CheckIcon, PlaneIcon } from '../components/ui/icons'
import TurnstileChallenge from '../components/security/TurnstileChallenge'
import { guestBffEnabled } from '../services/guestCommerceService'
import HeroVideo from '../components/HeroVideo'

const EMPTY_FORM = {
  customerName: '', email: '', phone: '', item: '', url: '', budget: '',
  qty: 1, shipping: 'sea', alternatives: false, notes: '',
}

export default function Pasabuy() {
  const { requests, addRequest, go, pasabuyPrefill, clearPasabuyPrefill } = useStore()
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [botToken, setBotToken] = useState('')
  const [challengeKey, setChallengeKey] = useState(0)

  useEffect(() => {
    if (pasabuyPrefill) {
      setForm(current => ({
        ...current,
        item: pasabuyPrefill.item || current.item,
        url: pasabuyPrefill.url || current.url,
        notes: pasabuyPrefill.notes || current.notes,
        qty: pasabuyPrefill.qty || current.qty || 1,
      }))
      clearPasabuyPrefill()
    }
  }, [pasabuyPrefill, clearPasabuyPrefill])

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm(current => ({ ...current, [key]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setReceipt(null)
    if (!form.email.trim() && !form.phone.trim()) {
      setError('Please enter your email address or mobile number so we can send your quote.')
      return
    }
    if (guestBffEnabled() && !botToken) {
      setError('Please complete the quick security check before submitting.')
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
    <main className="pb-24 md:pb-20">
      <HeroVideo name="pasabuy" label="Shelves of Italian goods in a Milan shop" />
      <div className="store-section -mt-6 grid gap-10 pt-4 md:pt-6 lg:grid-cols-[1.16fr_0.84fr] lg:gap-16">
        <div>
          <Kicker className="flex items-center gap-2"><PlaneIcon size={14} /> Personal Shopping from Italy</Kicker>
          <h1 className="mt-3 font-serif text-3xl font-semibold leading-[1.06] tracking-tight text-navy sm:text-4xl md:text-5xl">
            Pasabuy,<br /><em className="font-normal text-crimson">straight from Italy.</em>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-navy-soft">
            Tell us the Italian goods you are looking for. We check availability across Italian shops and send you a clear, itemized quote to approve before we buy anything.
          </p>

          <form onSubmit={submit} className="mt-9 store-panel p-5 shadow-sm sm:p-7">
            <div className="mb-6 border-b border-[var(--store-surface-border)] pb-5">
              <h2 className="font-serif text-xl font-semibold text-navy">What would you like us to find?</h2>
              <p className="mt-1 text-sm text-navy-soft">The brand, product name, and size help us locate the exact item in Italy.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-navy">Full name
                <input className={`${field} mt-1.5`} value={form.customerName} onChange={update('customerName')} autoComplete="name" required />
              </label>
              <label className="block text-sm font-semibold text-navy">Email address
                <input type="email" className={`${field} mt-1.5`} value={form.email} onChange={update('email')} autoComplete="email" placeholder="you@example.com" />
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-navy">Mobile number
                <input type="tel" className={`${field} mt-1.5`} value={form.phone} onChange={update('phone')} autoComplete="tel" placeholder="09xx xxx xxxx" />
              </label>
              <label className="block text-sm font-semibold text-navy">Quantity
                <input type="number" min="1" className={`${field} mt-1.5`} value={form.qty} onChange={update('qty')} />
              </label>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-navy">Item name, brand, and exact size
                <input className={`${field} mt-1.5`} value={form.item} onChange={update('item')} placeholder="e.g. Mulino Bianco Baiocchi 260g (Pack of 3)" required />
              </label>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-navy">Product link or reference photo URL (optional)
                <input type="url" className={`${field} mt-1.5`} value={form.url} onChange={update('url')} placeholder="https://..." />
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-navy">Target budget (PHP total, optional)
                <input type="number" className={`${field} mt-1.5`} value={form.budget} onChange={update('budget')} placeholder="₱" />
              </label>
              <label className="block text-sm font-semibold text-navy">Shipping preference
                <select className={`${field} mt-1.5`} value={form.shipping} onChange={update('shipping')}>
                  <option value="sea">Sea freight (Economical, ~4-6 weeks)</option>
                  <option value="air">Air cargo (Faster, ~1-2 weeks)</option>
                </select>
              </label>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-navy">Notes or specific requests
                <textarea className={`${field} mt-1.5`} rows={3} value={form.notes} onChange={update('notes')} placeholder="Special packaging requests, preferred expiry window, or extra notes..." />
              </label>
            </div>
            <div className="mt-4 flex items-center gap-2.5">
              <input type="checkbox" id="alternatives" className="h-4 w-4 rounded border-line text-crimson focus:ring-crimson" checked={form.alternatives} onChange={update('alternatives')} />
              <label htmlFor="alternatives" className="text-sm font-medium text-navy cursor-pointer">Allow us to suggest comparable authentic Italian alternatives if this exact variant is out of stock</label>
            </div>

            {guestBffEnabled() && (
              <div className="mt-6">
                <TurnstileChallenge key={challengeKey} onVerify={setBotToken} />
              </div>
            )}

            {error && <p role="alert" className="mt-4 rounded-xl border border-crimson/25 bg-crimson/5 p-3 text-sm text-crimson">{error}</p>}
            {receipt && (
              <div role="status" className="mt-4 rounded-xl border border-forest/25 bg-forest/5 p-3 text-sm text-forest">
                <div className="flex items-start gap-2">
                  <CheckIcon size={17} className="mt-0.5 shrink-0" />
                  <span>Your request has been received. Reference number: <strong>{receipt.public_reference}</strong>. We will review it and send your quote shortly.</span>
                </div>
                {guestBffEnabled() && (
                  <button type="button" onClick={() => go('messages')} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-forest px-4 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-forest/90 active:scale-[0.98]">
                    Open request chat
                  </button>
                )}
              </div>
            )}
            <RedButton type="submit" className="mt-6 w-full py-4 text-base font-bold shadow-sm" disabled={submitting}>
              {submitting ? 'Submitting request…' : 'Submit Pasabuy request'}
            </RedButton>
          </form>

          <div className="mt-8 flex flex-wrap gap-2">
            <TrustBadge>Quote before purchase</TrustBadge>
            <TrustBadge>Flown on scheduled cargo</TrustBadge>
            <TrustBadge>No upfront fee to request</TrustBadge>
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
          <TuscanCard tricolor><div className="p-6">
            <h2 className="font-serif text-lg font-semibold">How Pasabuy works</h2>
            <ol className="mt-4 space-y-4">
              {[
                ['You submit a request', 'Tell us the product name, size, and your contact details.'],
                ['We check Italian stores', 'Our team checks availability, pricing, and freight schedules.'],
                ['You approve the quote', 'Nothing is purchased until you review and confirm the quote.'],
                ['We purchase and deliver', 'Your items are packed in Italy, flown to Manila, and shipped to you.'],
              ].map(([title, body], index) => (
                <li key={title} className="flex gap-3.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest/10 text-sm font-semibold text-forest">{index + 1}</span><div><p className="font-semibold">{title}</p><p className="text-sm leading-relaxed text-navy-soft">{body}</p></div></li>
              ))}
            </ol>
          </div></TuscanCard>

          <TuscanCard className="p-6">
            <h2 className="font-serif text-lg font-semibold">Recent requests in this visit</h2>
            {requests.length === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-navy-soft">No requests submitted in this browser session yet.</p>
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
