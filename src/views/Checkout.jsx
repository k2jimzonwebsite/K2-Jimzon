import { useState } from 'react'
import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import ProductVisual from '../components/ProductVisual'
import { CrimsonButton, GhostButton, TuscanCard } from '../components/ui/bits'
import { ShieldIcon } from '../components/ui/icons'

export default function Checkout() {
  const { lines, placeOrder, go, applyCoupon, removeCoupon, appliedCoupon, couponDiscount } = useStore()
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', note: '' })
  const [couponCode, setCouponCode] = useState('')
  const [couponMessage, setCouponMessage] = useState('')
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (lines.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-serif text-2xl font-semibold">Nothing to request yet</h1>
        <p className="mt-2 text-base text-navy-soft">Your cart is empty.</p>
        <GhostButton className="mt-6" onClick={() => go('home')}>Back to the shop</GhostButton>
      </main>
    )
  }

  const requestSubtotal = lines.reduce((sum, line) => sum + (line.product.retail * line.qty), 0)
  const productsTotal = Math.max(requestSubtotal - couponDiscount, 0)
  const update = (key) => (event) => setForm(current => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!form.email.trim() && !form.phone.trim()) {
      setError('Enter an email address or mobile number so we can confirm the order.')
      return
    }
    setSubmitting(true)
    const result = await placeOrder({ ...form, fulfillmentMethod: 'Metro Manila delivery' })
    setSubmitting(false)
    if (!result?.ok) setError(result?.error || 'The request could not be submitted. Please try again.')
  }

  const fieldClass = 'store-field w-full px-4 py-3 text-base'

  const checkCoupon = async () => {
    setCheckingCoupon(true); setCouponMessage('')
    const result = await applyCoupon(couponCode)
    setCheckingCoupon(false)
    setCouponMessage(result?.message || 'Coupon could not be checked.')
  }

  return (
    <main className="store-section max-w-6xl pb-24 pt-10 font-sans md:pb-20 md:pt-14">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">Final review</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight">Submit an order request</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-soft">
        No online payment is collected yet. We will verify stock, confirm delivery details, and send payment instructions through your chosen contact.
      </p>

      <form onSubmit={submit} className="mt-9 grid gap-6 md:grid-cols-[1fr_0.86fr] md:gap-10">
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

          <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <p className="flex justify-between text-navy-soft"><span>Subtotal</span><span>{peso(requestSubtotal)}</span></p>
            {appliedCoupon && <p className="flex justify-between text-forest"><span>{appliedCoupon.code}</span><span>−{peso(couponDiscount)}</span></p>}
            <p className="flex justify-between text-navy-soft"><span>Courier delivery</span><span>Quoted after review</span></p>
            <p className="flex justify-between border-t border-line pt-3 text-lg font-bold"><span>Products total</span><span>{peso(productsTotal)}</span></p>
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <label className="text-sm font-semibold">Coupon code</label>
            <div className="mt-1.5 flex gap-2"><input value={couponCode} onChange={event => setCouponCode(event.target.value.toUpperCase())} className="store-field min-h-11 min-w-0 flex-1 px-3 font-mono text-base" placeholder="Enter code" /><button type="button" onClick={checkCoupon} disabled={checkingCoupon || !couponCode.trim()} className="min-h-11 rounded-lg border border-line px-3 text-sm font-bold disabled:opacity-40">{checkingCoupon ? 'Checking…' : 'Apply'}</button></div>
            {couponMessage && <p role="status" className="mt-2 text-xs text-navy-soft">{couponMessage}</p>}
            {appliedCoupon && <button type="button" onClick={() => { removeCoupon(); setCouponMessage('Coupon removed.') }} className="mt-2 text-xs font-semibold text-crimson">Remove coupon</button>}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-navy-soft">
            The server validates current prices, coupon rules, and stock when you submit. The actual courier charge is communicated for your approval before fulfillment.
          </p>
        </TuscanCard>

        <TuscanCard tricolor className="h-fit md:order-1">
          <div className="p-5 md:p-7">
            <div className="flex items-start gap-3 rounded-lg border border-forest/25 bg-forest/5 p-4">
              <ShieldIcon size={20} className="mt-0.5 shrink-0 text-forest" />
              <div>
                <h2 className="font-serif text-lg font-semibold">Contact and delivery</h2>
                <p className="mt-1 text-sm text-navy-soft">Submitting this form does not charge you or reserve stock.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold">Full name
                <input className={`${fieldClass} mt-1.5`} value={form.name} onChange={update('name')} autoComplete="name" required />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Email
                  <input className={`${fieldClass} mt-1.5`} type="email" value={form.email} onChange={update('email')} autoComplete="email" />
                </label>
                <label className="block text-sm font-semibold">Mobile number
                  <input className={`${fieldClass} mt-1.5`} type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" />
                </label>
              </div>
              <label className="block text-sm font-semibold">Delivery address
                <textarea className={`${fieldClass} mt-1.5 min-h-24 resize-y`} value={form.address} onChange={update('address')} autoComplete="street-address" required />
              </label>
              <label className="block text-sm font-semibold">Order note <span className="font-normal text-navy-soft">(optional)</span>
                <textarea className={`${fieldClass} mt-1.5 min-h-20 resize-y`} value={form.note} onChange={update('note')} placeholder="Delivery timing, landmark, or product question" />
              </label>
            </div>

            {error && <p role="alert" className="mt-4 rounded-xl border border-crimson/25 bg-crimson/5 p-3 text-sm text-crimson">{error}</p>}

            <CrimsonButton type="submit" className="mt-5 w-full py-4 text-base" disabled={submitting}>
              {submitting ? 'Submitting request…' : 'Submit order request'}
            </CrimsonButton>
            <p className="mt-3 text-center text-xs text-navy-soft">K2 staff will contact you before any payment is requested.</p>
          </div>
        </TuscanCard>
      </form>
    </main>
  )
}
