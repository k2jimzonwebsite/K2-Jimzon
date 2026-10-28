import { useEffect, useState } from 'react'
import { peso } from '../data/products'
import { guestBffEnabled, quoteGuestDelivery } from '../services/guestCommerceService'
import { useDeliveryArea } from '../hooks/useDeliveryArea'
import DeliveryAreaFields from './DeliveryAreaFields'

const SOURCE = 'psgc-2026-06-30'
// The parent invalidates review synchronously using baseKey; effects ignore late replies.
export default function DeliveryEstimate({ items, service, baseKey, onReview, paused, initialDestination = null, selectionKey = '', onAreaTouched }) {
  const area = useDeliveryArea({ initialDestination, selectionKey, enabled: !paused && service !== 'pickup' && guestBffEnabled() })
  const { path } = area
  const [retry, setRetry] = useState(0)
  const [quoteState, setQuoteState] = useState(null)
  const [accepted, setAccepted] = useState(false)
  const leaf = path.at(-1)
  const pathKey = path.map(place => place.code).join('/')
  const complete = service === 'pickup' || leaf?.level === 'Bgy'
  const requestKey = `${baseKey}/${pathKey}/${retry}`
  const currentQuote = quoteState?.key === requestKey ? quoteState.quote : null

  useEffect(() => {
    if (paused) return undefined
    onReview(null)
    setAccepted(false)
    if (!complete || !guestBffEnabled()) return undefined
    let active = true
    setQuoteState({ key: requestKey, loading: true })
    const destination = service === 'pickup' ? null : { sourceVersion: SOURCE, path: path.map(place => place.code) }
    const timer = setTimeout(() => quoteGuestDelivery({ service, items, destination }).then(result => {
      if (!active) return
      const quote = result.ok && result.quote?.service === service ? result.quote : null
      setQuoteState({ key: requestKey, quote, error: quote ? '' : result.error || 'We could not check delivery. Retry the delivery check.' })
      if (quote) onReview({ baseKey, quote, ready: service === 'express', delivery: {
        service, destination, acceptance: service === 'express' ? null
          : { inputFingerprint: quote.inputFingerprint, rateVersion: quote.rateVersion },
      } })
    }), 350)
    return () => { active = false; clearTimeout(timer) }
    // items/path are represented by the request key. A held view starts no
    // requests; definitive rejection unpauses lookup and requires new review.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, complete, service, onReview, paused])

  const choose = (index, code) => {
    onReview(null)
    setAccepted(false)
    onAreaTouched?.()
    area.choose(index, code)
  }

  if (!guestBffEnabled()) return <p role="status" className="text-sm text-navy-soft">Order requests are not active yet. Contact K2 for help.</p>
  return <div className="space-y-3">
    {service !== 'pickup' && <DeliveryAreaFields area={area} disabled={paused} onChoose={choose} showRetry={false} />}
    <div aria-live="polite" className="text-sm leading-relaxed text-navy-soft">
      {quoteState?.key === requestKey && quoteState.loading ? 'Checking delivery…'
        : currentQuote ? service === 'express' ? 'Express delivery needs a staff quote and your approval. No final total or payment is due yet.'
          : `Delivery charge: ${peso(currentQuote.feeMinor / 100)}.`
            + (currentQuote.weightBasis === 'estimated' ? ' Package weight is estimated.' : '')
          : 'Choose your complete delivery area to check the charge.'}
    </div>
    {quoteState?.key === requestKey && quoteState.error && <p role="alert" className="text-sm text-crimson">{quoteState.error}</p>}
    {(area.error || quoteState?.error) && <button type="button" onClick={() => { onReview(null); area.retry(); setRetry(value => value + 1) }}
      className="min-h-11 rounded-lg border border-line px-3 text-sm font-semibold">Retry delivery check</button>}
    {currentQuote && service !== 'express' && <label className="flex min-h-11 items-start gap-3 text-sm leading-relaxed">
      <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-crimson" checked={accepted} onChange={event => {
        const checked = event.target.checked
        setAccepted(checked)
        onReview({ baseKey, quote: currentQuote, ready: checked, delivery: {
          service, destination: service === 'pickup' ? null : { sourceVersion: SOURCE, path: path.map(place => place.code) },
          acceptance: { inputFingerprint: currentQuote.inputFingerprint, rateVersion: currentQuote.rateVersion },
        } })
      }} />
      <span>I accept the {peso(currentQuote.feeMinor / 100)} delivery charge for this order{service === 'pickup' ? ' with warehouse pickup' : ' and selected area'}.</span>
    </label>}
  </div>
}
