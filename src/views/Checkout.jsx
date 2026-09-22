import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import ProductVisual from '../components/ProductVisual'
import { CrimsonButton, GhostButton, TuscanCard } from '../components/ui/bits'
import { CheckIcon, ShieldIcon } from '../components/ui/icons'
import TurnstileChallenge from '../components/security/TurnstileChallenge'
import { guestBffEnabled } from '../services/guestCommerceService'
import {
  calculateCartShipping,
  DEFAULT_REGION_ID,
  PHILIPPINES_REGIONS,
} from '../lib/cartShippingCalculator'

export default function Checkout() {
  const {
    lines, placeOrder, pendingCheckout, resetPendingCheckout,
    go, applyCoupon, removeCoupon, appliedCoupon, couponDiscount,
  } = useStore()

  const [form, setForm] = useState(() => (pendingCheckout
    ? {
        ...pendingCheckout,
        name: pendingCheckout.customerName || '',
        phone: pendingCheckout.phone || '',
        street: pendingCheckout.street || pendingCheckout.address || '',
        barangay: pendingCheckout.barangay || '',
        city: pendingCheckout.city || '',
        address: pendingCheckout.address || '',
        paymentMethod: pendingCheckout.paymentMethod || 'prepaid',
        note: pendingCheckout.note || '',
      }
    : {
        name: '',
        email: '',
        phone: '',
        street: '',
        barangay: '',
        city: '',
        address: '',
        paymentMethod: 'prepaid',
        note: '',
      }))

  const [regionId, setRegionId] = useState(DEFAULT_REGION_ID)
  const [deliveryOptionId, setDeliveryOptionId] = useState('standard')
  const [couponCode, setCouponCode] = useState('')
  const [couponMessage, setCouponMessage] = useState('')
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [botToken, setBotToken] = useState('')
  const [challengeKey, setChallengeKey] = useState(0)
  // Cash on Delivery stays hidden until an Admin switches it on. A missing
  // or unreadable switch row means off, so customers can never be offered
  // a payment method the store has not approved.
  const [codAvailable, setCodAvailable] = useState(false)

  useEffect(() => {
    let active = true
    if (!supabase) return undefined
    supabase
      .from('payment_method_availability')
      .select('cod_available')
      .eq('method', 'cod')
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        const on = data?.cod_available === true
        setCodAvailable(on)
        if (!on) {
          setForm((current) => (current.paymentMethod === 'cod' ? { ...current, paymentMethod: 'prepaid' } : current))
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  // Dynamic package & shipping fee calculation based on cart lines and destination region
  const shippingData = useMemo(() => calculateCartShipping(lines, regionId), [lines, regionId])

  // Ensure selected delivery option exists in current region's options
  const selectedDeliveryOption = useMemo(() => {
    const found = shippingData.options.find((opt) => opt.id === deliveryOptionId)
    return found || shippingData.options[0] || { methodName: 'Standard Courier Delivery', fee: 95 }
  }, [shippingData.options, deliveryOptionId])

  const shippingFee = selectedDeliveryOption.fee
  const isPickup = selectedDeliveryOption.id === 'pickup'

  if (lines.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-serif text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-base text-navy-soft">You have not added any products to request yet.</p>
        <GhostButton className="mt-6" onClick={() => go('home')}>Back to catalog</GhostButton>
      </main>
    )
  }

  const requestSubtotal = lines.reduce((sum, line) => sum + (line.product.retail * line.qty), 0)
  const productsTotal = Math.max(requestSubtotal - couponDiscount, 0)
  const grandTotal = productsTotal + shippingFee

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    if (form.paymentMethod === 'cod' && !codAvailable) {
      setError('Cash on Delivery is not available right now.')
      return
    }

    if (!form.name.trim()) {
      setError('Please enter your full name for the package recipient label.')
      return
    }

    if (!form.email.trim() && !form.phone.trim()) {
      setError('Please enter an email address or mobile number so we can confirm your order.')
      return
    }

    const cleanPhone = form.phone.replace(/\D/g, '')
    if (form.phone.trim() && cleanPhone.length < 10) {
      setError('Please enter a valid 11-digit Philippine mobile number (e.g. 09171234567).')
      return
    }

    if (!isPickup && !form.address.trim()) {
      setError('Please enter your delivery address for door-to-door courier delivery.')
      return
    }

    if (guestBffEnabled() && !botToken) {
      setError('Please complete the security check before submitting.')
      return
    }

    const resolvedAddress = isPickup
      ? 'Warehouse Pickup (K2 Jimzon Manila Hub, Quezon City)'
      : form.address.trim()

    // Prefix payment preference cleanly to customer note
    const paymentLabel = form.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Prepaid (method confirmed by staff)'
    const combinedNote = form.note?.trim()
      ? `[Payment: ${paymentLabel}] ${form.note.trim()}`
      : `[Payment: ${paymentLabel}]`

    setSubmitting(true)
    try {
      const result = await placeOrder({
        ...form,
        address: resolvedAddress,
        paymentMethod: form.paymentMethod,
        note: combinedNote,
        fulfillmentMethod: selectedDeliveryOption.methodName,
        shippingAmount: shippingFee,
        shippingQuoteStatus: 'customer_confirmed',
        botToken,
      })
      if (result?.code === 'ALREADY_SUBMITTING') return
      if (!result?.ok) setError(result?.error || 'The request could not be submitted. Please retry the same request.')
    } catch {
      setError('The result could not be confirmed. Retry the same request before starting another order.')
    } finally {
      setSubmitting(false)
      setBotToken('')
      setChallengeKey((current) => current + 1)
    }
  }

  const fieldClass = 'store-field w-full px-4 py-3 text-base'

  const checkCoupon = async () => {
    setCheckingCoupon(true)
    setCouponMessage('')
    const result = await applyCoupon(couponCode)
    setCheckingCoupon(false)
    setCouponMessage(result?.message || 'Coupon could not be checked.')
  }

  return (
    <main className="store-section max-w-6xl pb-24 pt-10 font-sans md:pb-20 md:pt-14">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-crimson">Final review</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight">Review order request</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-soft">
        No upfront payment is required. We will verify our Manila stock, review order and delivery details, and send payment instructions directly to you.
      </p>

      <form onSubmit={submit} className="mt-9 grid gap-6 md:grid-cols-[1fr_0.86fr] md:gap-10">
        {/* Order Summary Column */}
        <TuscanCard className="p-5 md:order-2 md:sticky md:top-28 md:h-fit md:p-7">
          <h2 className="font-serif text-lg font-semibold">Order summary</h2>
          <div className="mt-4 divide-y divide-line">
            {lines.map(({ product, qty, unit }) => (
              <div key={product.id} className="flex items-center gap-3 py-3.5">
                <ProductVisual product={product} className="h-12 w-12 shrink-0 rounded-md border border-line" pad="p-1" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-base font-medium">{product.name}</p>
                  <p className="text-sm text-navy-soft">Qty {qty} · {peso(unit)} each</p>
                </div>
                <span className="text-base font-semibold tabular">{peso(unit * qty)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
            <p className="flex justify-between text-navy-soft">
              <span>Products total</span>
              <span className="font-mono tabular-nums">{peso(requestSubtotal)}</span>
            </p>
            {appliedCoupon && (
              <p className="flex justify-between text-forest font-medium">
                <span>Voucher ({appliedCoupon.code})</span>
                <span className="font-mono tabular-nums">−{peso(couponDiscount)}</span>
              </p>
            )}
            <div className="flex items-center justify-between border-t border-line/60 pt-2 text-navy-soft">
              <div>
                <span className="font-medium text-navy">Delivery fee</span>
                <p className="text-xs text-navy-soft">{selectedDeliveryOption.methodName}</p>
              </div>
              <span className={`font-mono tabular-nums font-semibold ${shippingFee === 0 ? 'text-forest font-bold' : 'text-navy'}`}>
                {shippingFee === 0 ? 'FREE' : peso(shippingFee)}
              </span>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-lg font-bold text-navy">
              <span>Total amount</span>
              <span className="font-mono text-xl tabular-nums text-crimson">{peso(grandTotal)}</span>
            </div>
          </div>

          <fieldset disabled={submitting || Boolean(pendingCheckout)} className="mt-4 border-t border-line pt-4">
            <label htmlFor="checkout-coupon" className="text-sm font-semibold">Coupon code</label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="checkout-coupon"
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                className="store-field min-h-11 min-w-0 flex-1 px-3 font-mono text-base"
                placeholder="Enter code"
              />
              <button
                type="button"
                onClick={checkCoupon}
                disabled={checkingCoupon || !couponCode.trim()}
                className="min-h-11 rounded-lg border border-line px-3 text-sm font-bold disabled:opacity-40"
              >
                {checkingCoupon ? 'Checking…' : 'Apply'}
              </button>
            </div>
            {couponMessage && <p role="status" className="mt-2 text-xs text-navy-soft">{couponMessage}</p>}
            {appliedCoupon && (
              <button
                type="button"
                onClick={() => { removeCoupon(); setCouponMessage('Coupon removed.') }}
                className="mt-2 inline-flex min-h-11 items-center px-2 text-xs font-semibold text-crimson"
              >
                Remove coupon
              </button>
            )}
          </fieldset>
          <p className="mt-4 text-xs leading-relaxed text-navy-soft">
            Delivery is calculated based on package weight and region. K2 guarantees transparent pricing with no surprise charges.
          </p>
        </TuscanCard>

        {/* Contact and Delivery Details Column */}
        <TuscanCard tricolor className="h-fit md:order-1">
          <div className="p-5 md:p-7">
            <div className="flex items-start gap-3 rounded-lg border border-forest/25 bg-forest/5 p-4">
              <ShieldIcon size={20} className="mt-0.5 shrink-0 text-forest" />
              <div>
                <h2 className="font-serif text-lg font-semibold">Contact and delivery</h2>
                <p className="mt-1 text-sm text-navy-soft">Submitting this form does not charge you or require immediate payment.</p>
              </div>
            </div>

            <fieldset disabled={submitting || Boolean(pendingCheckout)} className="mt-5 space-y-4">
              <label className="block text-sm font-semibold">Full name
                <input className={`${fieldClass} mt-1.5`} value={form.name} onChange={update('name')} autoComplete="name" required />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Email address
                  <input className={`${fieldClass} mt-1.5`} type="email" value={form.email} onChange={update('email')} autoComplete="email" />
                </label>
                <label className="block text-sm font-semibold">Mobile number
                  <input className={`${fieldClass} mt-1.5`} type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" />
                </label>
              </div>

              {/* Destination Region Selector */}
              <div>
                <label htmlFor="checkout-region" className="block text-sm font-semibold">Destination region</label>
                <select
                  id="checkout-region"
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value)}
                  className={`${fieldClass} mt-1.5`}
                >
                  {PHILIPPINES_REGIONS.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name} · {region.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold">Delivery address
                  <textarea
                    className={`${fieldClass} mt-1.5 min-h-20 resize-y`}
                    value={form.address}
                    onChange={update('address')}
                    autoComplete="street-address"
                    placeholder="House/Unit #, Street, Barangay, City, Postal Code"
                    required
                  />
                </label>
                <p className="mt-1.5 text-xs text-navy-soft">
                  Include House/Unit #, Street, Barangay, and City (e.g. <span className="font-medium text-navy">Unit 402 Jade Tower, Brgy. San Antonio, Pasig City</span>) for rapid doorstep waybill recognition.
                </p>
              </div>

                  {/* Delivery Options Selector (Shopee/Lazada style: Metro Manila delivery, Courier delivery, Pickup) */}
                  <fieldset className="block pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <legend className="text-sm font-semibold text-navy">Delivery options</legend>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-forest/20 bg-forest/5 px-2.5 py-0.5 text-xs font-semibold text-forest">
                          <CheckIcon size={12} />
                          <span>Fulfilled by K2 Jimzon (Manila Hub Dispatch)</span>
                        </span>
                        <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-navy-soft">
                          {shippingData.formattedWeight} · {shippingData.parcelCount} pkg
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-2.5">
                      {shippingData.options.map((option) => {
                        const isSelected = selectedDeliveryOption.id === option.id
                        return (
                          <label
                            key={option.id}
                            className={`flex min-h-[4rem] cursor-pointer items-start justify-between rounded-xl border p-3.5 transition-all duration-150 ${
                              isSelected
                                ? 'border-crimson bg-crimson/[0.03] shadow-sm'
                                : 'border-line bg-surface hover:border-line-dark hover:bg-black/[0.01]'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="fulfillment-method"
                                value={option.id}
                                checked={isSelected}
                                onChange={() => setDeliveryOptionId(option.id)}
                                className="mt-1 h-4 w-4 accent-crimson"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-navy">{option.methodName}</span>
                                  {option.badge && (
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                                        option.badge === 'Free'
                                          ? 'bg-forest/10 text-forest'
                                          : option.badge === 'Fastest'
                                            ? 'bg-blue-600/10 text-blue-700'
                                            : 'bg-amber-500/10 text-amber-700'
                                      }`}
                                    >
                                      {option.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs text-navy-soft">{option.courierHint}</p>
                                <p className="mt-0.5 text-xs font-medium text-navy/70">Estimated: {option.eta}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`font-mono text-base font-bold tabular-nums ${option.fee === 0 ? 'text-forest' : 'text-navy'}`}>
                                {option.fee === 0 ? 'FREE' : peso(option.fee)}
                              </span>
                              {isSelected && (
                                <div className="mt-1 flex justify-end">
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-crimson text-white">
                                    <CheckIcon size={12} />
                                  </span>
                                </div>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-navy-soft">
                      <span>Special / out-of-zone cargo:</span>
                      <span className="font-medium text-navy">Quoted after review</span>
                    </div>
                  </fieldset>

              {/* Payment Preference Selector */}
              <fieldset className="block pt-2">
                <legend className="text-sm font-semibold text-navy">Payment preference</legend>
                <p className="mt-0.5 text-xs text-navy-soft">
                  Choose how you want to pay when your package arrives or before dispatch.
                </p>
                <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                  {codAvailable && (<label
                    className={`flex min-h-[4rem] cursor-pointer items-start justify-between rounded-xl border p-3.5 transition-all duration-150 ${
                      form.paymentMethod === 'cod'
                        ? 'border-crimson bg-crimson/[0.03] shadow-sm'
                        : 'border-line bg-surface hover:border-line-dark hover:bg-black/[0.01]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment-preference"
                        value="cod"
                        checked={form.paymentMethod === 'cod'}
                        onChange={() => setForm((curr) => ({ ...curr, paymentMethod: 'cod' }))}
                        className="mt-1 h-4 w-4 accent-crimson"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-navy">Cash on Delivery</span>
                          <span className="rounded bg-forest/10 px-1.5 py-0.5 text-xs font-bold uppercase text-forest">COD</span>
                        </div>
                        <p className="mt-1 text-xs text-navy-soft">Pay cash directly to courier rider upon doorstep arrival.</p>
                      </div>
                    </div>
                    {form.paymentMethod === 'cod' && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-crimson text-white">
                        <CheckIcon size={12} />
                      </span>
                    )}
                  </label>)}

                  <label
                    className={`flex min-h-[4rem] cursor-pointer items-start justify-between rounded-xl border p-3.5 transition-all duration-150 ${
                      form.paymentMethod === 'prepaid'
                        ? 'border-crimson bg-crimson/[0.03] shadow-sm'
                        : 'border-line bg-surface hover:border-line-dark hover:bg-black/[0.01]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment-preference"
                        value="prepaid"
                        checked={form.paymentMethod === 'prepaid'}
                        onChange={() => setForm((curr) => ({ ...curr, paymentMethod: 'prepaid' }))}
                        className="mt-1 h-4 w-4 accent-crimson"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-bold text-navy">Pay after staff confirmation</span>
                        </div>
                        <p className="mt-1 text-base text-navy-soft">Nothing is charged here. Wait for staff to confirm your order total and approved payment instructions.</p>
                      </div>
                    </div>
                    {form.paymentMethod === 'prepaid' && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-crimson text-white">
                        <CheckIcon size={12} />
                      </span>
                    )}
                  </label>
                </div>
              </fieldset>

              <label className="block text-sm font-semibold">Order note <span className="font-normal text-navy-soft">(optional)</span>
                <textarea
                  className={`${fieldClass} mt-1.5 min-h-16 resize-y`}
                  value={form.note}
                  onChange={update('note')}
                  placeholder="Delivery timing, landmark, or specific instructions"
                />
              </label>
            </fieldset>

            {pendingCheckout && (
              <p role="status" className="mt-4 text-sm text-navy-soft">
                Your original request details are held while we confirm its result. Retry this request before starting another order.
              </p>
            )}
            <TurnstileChallenge key={challengeKey} enabled={guestBffEnabled()} action="guest_order" onTokenChange={setBotToken} />

            {error && <p role="alert" className="mt-4 rounded-xl border border-crimson/25 bg-crimson/5 p-3 text-sm text-crimson">{error}</p>}

            <CrimsonButton type="submit" className="mt-5 w-full py-4 text-base font-bold shadow-sm" disabled={submitting}>
              {submitting
                ? 'Submitting request…'
                : pendingCheckout
                  ? 'Retry order request'
                  : 'Submit order request'}
            </CrimsonButton>

            {pendingCheckout && (
              <button
                type="button"
                onClick={() => {
                  resetPendingCheckout()
                  setError('')
                }}
                className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-[var(--store-surface-bg)] px-4 py-2.5 text-sm font-semibold text-navy transition hover:border-crimson hover:text-crimson focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
              >
                Edit order or contact details
              </button>
            )}
            <p className="mt-3 text-center text-xs text-navy-soft">
              Our staff will contact you directly with payment instructions before dispatch. Contact details are protected under our{' '}
              <button type="button" onClick={() => go('privacy')} className="underline hover:text-crimson font-medium">Privacy Policy</button>
              {' '}and{' '}
              <button type="button" onClick={() => go('terms')} className="underline hover:text-crimson font-medium">Terms of Service</button>.
            </p>
          </div>
        </TuscanCard>
      </form>
    </main>
  )
}
