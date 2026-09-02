import { useEffect, useMemo, useState } from 'react'
import { peso } from '../data/products'
import { guestBffEnabled, quoteGuestDelivery } from '../services/guestCommerceService'
import { getSupabaseClient } from '../lib/lazySupabaseClient'

// MAP-023 — the customer-facing delivery charge.
//
// This component shows a number in exactly one situation: the destination is one
// of the owner-approved exact localities, every item in the cart has a measured
// packed weight, and the server resolved a STANDARD_FEE. In every other case it
// renders the existing "Quoted after review" line, unchanged. It never estimates,
// never interpolates, and never falls back to a regional figure — a wrong number
// here is a commercial commitment K2 would have to honour.

const UNPRICED = { label: 'Quoted after review', fee: null }

/**
 * Total packed weight, or null if any line is unweighed. products.net_weight is
 * display text and is deliberately not consulted: it describes the contents, not
 * the parcel, so using it would price an order from a label.
 */
function packedWeightG(lines) {
  let total = 0
  for (const { product, qty } of lines) {
    const each = product?.shipping_weight_g
    if (!Number.isInteger(each) || each <= 0) return null
    total += each * qty
  }
  return total > 0 ? total : null
}

export default function DeliveryEstimate({ lines, subtotalMinor, onQuote }) {
  const [localities, setLocalities] = useState([])
  const [localityId, setLocalityId] = useState('')
  const [quote, setQuote] = useState(null)
  const [checking, setChecking] = useState(false)

  const weightG = useMemo(() => packedWeightG(lines), [lines])
  const quotable = guestBffEnabled() && weightG !== null

  useEffect(() => {
    if (!quotable) return undefined
    let active = true
    ;(async () => {
      const client = await getSupabaseClient()
      if (!client) return
      const { data, error } = await client.rpc('read_delivery_pilot_localities_v1')
      // A destination list we cannot load simply means no picker; checkout keeps
      // working on the request model it has always used.
      if (active && !error && Array.isArray(data)) setLocalities(data)
    })()
    return () => { active = false }
  }, [quotable])

  useEffect(() => {
    if (!localityId) { setQuote(null); onQuote?.(null); return undefined }
    let active = true
    setChecking(true)
    ;(async () => {
      const result = await quoteGuestDelivery({
        channel: 'Website',
        service: 'K2 Standard Delivery',
        localityId,
        parcelCount: 1,
        weightG,
        merchandiseSubtotalMinor: subtotalMinor,
        // The storefront cannot observe these, so it states the ordinary case.
        // Staff review still catches a parcel that turns out to be an exception,
        // and an accepted standard fee is K2's to absorb from that point on.
        oversize: false,
        remoteArea: false,
        specialProtection: false,
      })
      if (!active) return
      const resolved = result.ok && result.quote?.customerVisible ? result.quote : null
      setQuote(resolved)
      onQuote?.(resolved)
      setChecking(false)
    })()
    return () => { active = false }
  }, [localityId, weightG, subtotalMinor, onQuote])

  if (!quotable || localities.length === 0) {
    return (
      <p className="flex justify-between text-navy-soft">
        <span>Courier delivery</span>
        <span>{UNPRICED.label}</span>
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-sm font-semibold">Delivery destination</span>
        <select
          value={localityId}
          onChange={(event) => setLocalityId(event.target.value)}
          className="store-field mt-1.5 min-h-11 w-full px-3 text-base"
        >
          <option value="">Select your barangay for an exact fee…</option>
          {localities.map((place) => (
            <option key={place.localityId} value={place.localityId}>
              {place.cityMunicipality} — {place.barangay}
            </option>
          ))}
        </select>
      </label>
      <p className="flex justify-between text-navy-soft">
        <span>Courier delivery</span>
        <span>
          {checking ? 'Checking…' : quote ? peso(quote.feeMinor / 100) : UNPRICED.label}
        </span>
      </p>
      {localityId && !checking && !quote && (
        <p className="text-xs leading-relaxed text-navy-soft">
          We do not have a confirmed courier rate for this order yet, so we will quote it for your
          approval before anything is sent.
        </p>
      )}
      {quote && (
        <p className="text-xs leading-relaxed text-forest">
          This is your final delivery charge for this address. If the courier later charges us more,
          we absorb the difference.
        </p>
      )}
      {!localityId && (
        <p className="text-xs leading-relaxed text-navy-soft">
          Not listed? We deliver nationwide — your delivery is quoted for your approval before
          anything is sent.
        </p>
      )}
    </div>
  )
}
