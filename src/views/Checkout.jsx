import { useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useStore } from '../context/StoreContext'
import { CustomerAccountContext } from '../context/customerAccountContextValue'
import { peso } from '../data/products'
import ProductVisual from '../components/ProductVisual'
import { CrimsonButton, GhostButton, TuscanCard } from '../components/ui/bits'
import { CheckIcon, ShieldIcon } from '../components/ui/icons'
import TurnstileChallenge from '../components/security/TurnstileChallenge'
import { guestBffEnabled } from '../services/guestCommerceService'
import DeliveryEstimate from '../components/DeliveryEstimate'

const DELIVERY_OPTIONS = [
  { id: 'standard', methodName: 'Standard Courier Delivery', hint: 'Delivery charge calculated for your basket and area.' },
  { id: 'express', methodName: 'Metro Manila Express Dispatch', hint: 'NCR only. Staff quote the route and package; you approve before payment.' },
  { id: 'pickup', methodName: 'K2 Warehouse Pickup', hint: 'No delivery charge. Arrange collection with K2 staff.' },
]

export default function Checkout() {
  const account = useContext(CustomerAccountContext)
  const {
    lines, placeOrder, pendingCheckout,
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
        paymentMethod: pendingCheckout.paymentMethod || 'gcash',
        note: (pendingCheckout.note || '').replace(/^\[Payment: [^\]]+\]\s*/, ''),
      }
    : {
        name: '',
        email: '',
        phone: '',
        street: '',
        barangay: '',
        city: '',
        address: '',
        paymentMethod: 'gcash',
        note: '',
      }))

  const [deliveryReview, setDeliveryReview] = useState(null)
  const [quoteRevision, setQuoteRevision] = useState(0)
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
    const settings = account?.settingsState?.settings
    if (!settings || pendingCheckout) return
    setForm(current => ({
      ...current,
      name: current.name || settings.displayName || '',
      address: current.address || settings.deliveryAddress || '',
      email: current.email || account.session?.user?.email || '',
      phone: current.phone || account.session?.user?.phone || '',
    }))
  }, [account?.settingsState?.settings, account?.session?.user?.email, account?.session?.user?.phone, pendingCheckout])

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
          setForm((current) => (current.paymentMethod === 'cod' ? { ...current, paymentMethod: 'gcash' } : current))
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const selectedDeliveryOption = DELIVERY_OPTIONS.find(option => option.id === deliveryOptionId)
  const deliveryItems = useMemo(() => lines.map(line => ({ sku: line.id || line.product.id, quantity: line.qty })), [lines])
  const deliveryKey = JSON.stringify([deliveryOptionId, deliveryItems, form.address, quoteRevision])
  const currentReview = deliveryReview?.baseKey === deliveryKey ? deliveryReview : null
  const displayQuote = pendingCheckout?.deliveryPreview || currentReview?.quote
  const shippingFee = displayQuote?.feeMinor == null ? null : displayQuote.feeMinor / 100
  const isPickup = (pendingCheckout?.delivery?.service || deliveryOptionId) === 'pickup'

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
  const grandTotal = shippingFee === null ? null : productsTotal + shippingFee

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    if (!pendingCheckout && (!guestBffEnabled() || !currentReview?.ready)) {
      setError('Please check delivery and accept the current charge before submitting.')
      return
    }

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
    const paymentLabel = form.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : form.paymentMethod === 'maribank' ? 'MariBank QR transfer' : 'GCash QR transfer'
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
        delivery: currentReview?.delivery,
        deliveryPreview: currentReview?.quote,
        botToken,
      })
      if (result?.code === 'ALREADY_SUBMITTING') return
      if (!result?.ok) {
        setError(result?.error || 'The request could not be submitted. Please retry the same request.')
        if (['DELIVERY_QUOTE_CHANGED', 'DELIVERY_REVIEW_REQUIRED', 'DELIVERY_ACCEPTANCE_REQUIRED'].includes(result?.code)) {
          setDeliveryReview(null)
          setQuoteRevision(value => value + 1)
        }
      }
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
      {/* Return-to-store navigation */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4 text-sm font-medium">
        <button
          type="button"
          onClick={() => go('store')}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-shell/50 px-4 py-2 font-semibold text-crimson hover:bg-shell hover:border-crimson/40 transition-colors cursor-pointer"
        >
          <span aria-hidden="true">←</span> Back to 3D Store
        </button>
        <button
          type="button"
          onClick={() => go('catalog')}
          className="inline-flex min-h-11 items-center gap-1.5 text-navy-soft hover:text-navy transition-colors cursor-pointer"
        >
          Continue browsing catalog
        </button>
      </div>

      <p className="text-xs font-bold uppercase tracking-[0.2em] text-crimson">Final review</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight">Review order request</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-soft">
        No upfront payment is required. We will verify our Manila stock, review order and delivery details, and send payment instructions directly to you.
      </p>

      <form onSubmit={submit} className="mt-9 grid grid-cols-1 gap-6 md:grid-cols-[1fr_0.86fr] md:gap-10">
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
                <p className="text-xs text-navy-soft">{pendingCheckout?.fulfillmentMethod || selectedDeliveryOption.methodName}</p>
              </div>
              <span className={`font-mono tabular-nums font-semibold ${shippingFee === 0 ? 'text-forest font-bold' : 'text-navy'}`}>
                {shippingFee === null ? 'Awaiting quote' : shippingFee === 0 ? 'No charge' : peso(shippingFee)}
              </span>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-lg font-bold text-navy">
              <span>Total amount</span>
              <span className="font-mono text-xl tabular-nums text-crimson">{grandTotal === null ? 'Not final yet' : peso(grandTotal)}</span>
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
            Standard delivery uses the current basket and selected area. Express needs a separate quote and your approval before payment.
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Email address
                  <input className={`${fieldClass} mt-1.5`} type="email" value={form.email} onChange={update('email')} autoComplete="email" />
                </label>
                <label className="block text-sm font-semibold">Mobile number
                  <input className={`${fieldClass} mt-1.5`} type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" />
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold">Delivery address
                  <textarea
                    className={`${fieldClass} mt-1.5 min-h-20 resize-y`}
                    value={form.address}
                    onChange={update('address')}
                    autoComplete="street-address"
                    placeholder="House/Unit #, Street, Barangay, City, Postal Code"
                    required={!isPickup}
                    disabled={isPickup}
                  />
                </label>
                <p className="mt-1.5 text-xs text-navy-soft">
                  Include House/Unit #, Street, Barangay, and City (e.g. <span className="font-medium text-navy">Unit 402 Jade Tower, Brgy. San Antonio, Pasig City</span>) for rapid doorstep waybill recognition.
                </p>
              </div>

              <fieldset className="space-y-3 pt-2">
                <legend className="text-sm font-semibold">Delivery option</legend>
                {DELIVERY_OPTIONS.map(option => <label key={option.id} className="flex min-h-11 items-start gap-3 rounded-xl border border-line p-3.5">
                  <input type="radio" name="fulfillment-method" value={option.id} checked={deliveryOptionId === option.id}
                    onChange={() => { setDeliveryReview(null); setDeliveryOptionId(option.id) }} className="mt-1 h-4 w-4 shrink-0 accent-crimson" />
                  <span><span className="block text-sm font-semibold">{option.methodName}</span>
                    <span className="block text-sm leading-relaxed text-navy-soft">{option.hint}</span></span>
                </label>)}
              </fieldset>
              {pendingCheckout && <p role="status" className="text-sm text-navy-soft">Your original delivery terms are held for this retry.</p>}
              <div hidden={Boolean(pendingCheckout)}>
                <DeliveryEstimate items={deliveryItems} service={deliveryOptionId} baseKey={deliveryKey} onReview={setDeliveryReview} paused={Boolean(pendingCheckout)} />
              </div>

              {/* Payment Preference Selector */}
              <fieldset className="block pt-2">
                <legend className="text-sm font-semibold text-navy">Payment preference</legend>
                <p className="mt-0.5 text-xs text-navy-soft">
                  Select a preferred method. K2 staff will confirm the order and tell you when to pay.
                </p>
                <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
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

                  {[
                    ['gcash', 'GCash', 'Pay by scanning the GCash QR after staff confirms your order.'],
                    ['maribank', 'MariBank', 'Pay by scanning the MariBank QR after staff confirms your order.'],
                  ].map(([method, name, description]) => <label
                    key={method}
                    className={`flex min-h-[4rem] cursor-pointer items-start justify-between rounded-xl border p-3.5 transition-colors duration-150 ${
                      form.paymentMethod === method
                        ? 'border-crimson bg-crimson/[0.03] shadow-sm'
                        : 'border-line bg-surface hover:border-line-dark hover:bg-black/[0.01]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment-preference"
                        value={method}
                        checked={form.paymentMethod === method}
                        onChange={() => setForm((curr) => ({ ...curr, paymentMethod: method }))}
                        className="mt-1 h-4 w-4 accent-crimson"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-bold text-navy">{name}</span>
                        </div>
                        <p className="mt-1 text-base text-navy-soft">{description}</p>
                      </div>
                    </div>
                    {form.paymentMethod === method && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-crimson text-white">
                        <CheckIcon size={12} />
                      </span>
                    )}
                  </label>)}
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
                Your original request details are held while we confirm its result. Retry this request before starting another order. Basket and coupon changes are paused to prevent a duplicate order.
              </p>
            )}
            <TurnstileChallenge key={challengeKey} enabled={guestBffEnabled()} action="guest_order" onTokenChange={setBotToken} />

            {error && <p role="alert" className="mt-4 rounded-xl border border-crimson/25 bg-crimson/5 p-3 text-sm text-crimson">{error}</p>}

            <CrimsonButton type="submit" className="mt-5 w-full py-4 text-base font-bold shadow-sm" disabled={submitting || (!pendingCheckout && !currentReview?.ready)}>
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
                  go('messages')
                }}
                className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-[var(--store-surface-bg)] px-4 py-2.5 text-sm font-semibold text-navy transition hover:border-crimson hover:text-crimson focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
              >
                Contact K2 about this request
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
