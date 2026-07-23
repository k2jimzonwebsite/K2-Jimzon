import { useState } from 'react'
import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import ProductVisual from '../components/ProductVisual'
import { CrimsonButton, GhostButton, TrustBadge, TuscanCard } from '../components/ui/bits'
import { CheckIcon, SyncIcon } from '../components/ui/icons'

const SHIPPING = 85

export default function Checkout() {
  const { lines, subtotal, wholesaleSavings, isWholesale, couponDiscount, finalTotal, appliedCoupon, applyCoupon, removeCoupon, claimedVouchers, coupons, placeOrder, go } = useStore()

  const [promoInput, setPromoInput] = useState('')
  const [promoFeedback, setPromoFeedback] = useState(null)

  if (lines.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-serif text-2xl font-semibold">Nothing to check out yet</h1>
        <p className="mt-2 text-base text-navy-soft">Your cart is empty — the shipment table is full, though.</p>
        <GhostButton className="mt-6" onClick={() => go('home')}>Back to the shop</GhostButton>
      </main>
    )
  }

  const grandTotal = (finalTotal !== undefined ? finalTotal : subtotal) + SHIPPING

  const handleApplyCode = (e) => {
    e.preventDefault()
    if (!promoInput.trim()) return

    const res = applyCoupon(promoInput)
    if (res.success) {
      setPromoFeedback({ type: 'success', message: res.message })
      setPromoInput('')
    } else {
      setPromoFeedback({ type: 'error', message: res.message })
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:pb-16 font-sans">
      <h1 className="rise font-serif text-3xl font-semibold tracking-tight">Checkout</h1>
      <p className="rise mt-1 text-sm text-navy-soft">Payment detects automatically — no screenshots or 'sent na po' needed.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.1fr_1fr] md:gap-10">
        <TuscanCard className="rise p-5 md:p-7 bg-cream/90 backdrop-blur-md" style={{ animationDelay: '80ms' }}>
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

          {/* 🎟️ Promo Code & Voucher Section */}
          <div className="mt-4 pt-4 border-t border-line space-y-3">
            <label className="block font-serif text-xs font-bold uppercase tracking-wider text-navy">
              Promo Code / Voucher Discount
            </label>

            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-forest/10 border border-forest/30 text-forest text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="font-bold">✓ {appliedCoupon.code}</span>
                  <span className="text-[11px] font-sans opacity-80">
                    ({appliedCoupon.type === 'percentage' ? appliedCoupon.value + '%' : '₱' + appliedCoupon.value} OFF)
                  </span>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-crimson hover:underline font-bold text-[11px]"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCode} className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Enter Promo Code (e.g. MILAN10)"
                  className="flex-1 rounded-xl border border-line bg-shell px-3.5 py-2 text-xs text-navy placeholder:text-navy-faint uppercase font-mono font-bold focus:outline-none focus:border-amber"
                />
                <button
                  type="submit"
                  className="bg-amber hover:bg-amber/90 text-navy font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm shrink-0"
                >
                  Apply
                </button>
              </form>
            )}

            {promoFeedback && !appliedCoupon && (
              <p className={`text-[11px] font-mono font-bold ${promoFeedback.type === 'success' ? 'text-forest' : 'text-crimson'}`}>
                {promoFeedback.message}
              </p>
            )}

            {/* Claimed Vouchers Quick Apply Pills */}
            {!appliedCoupon && claimedVouchers.length > 0 && (
              <div className="pt-1 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono scrollbar-none">
                <span className="text-navy-soft shrink-0">Wallet:</span>
                {claimedVouchers.map(vCode => (
                  <button
                    key={vCode}
                    type="button"
                    onClick={() => {
                      const res = applyCoupon(vCode)
                      if (res.success) setPromoFeedback({ type: 'success', message: res.message })
                      else setPromoFeedback({ type: 'error', message: res.message })
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber/15 hover:bg-amber/30 text-navy border border-amber/30 font-bold shrink-0 transition-all"
                  >
                    + {vCode}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            {isWholesale && wholesaleSavings > 0 && (
              <p className="flex justify-between font-semibold text-blue">
                <span className="flex items-center gap-1.5"><CheckIcon size={13} /> Wholesale discount applied</span>
                <span className="tabular">−{peso(wholesaleSavings)}</span>
              </p>
            )}

            <p className="flex justify-between text-navy-soft">
              <span>Subtotal</span><span className="tabular">{peso(subtotal)}</span>
            </p>

            {couponDiscount > 0 && (
              <p className="flex justify-between font-bold text-forest">
                <span className="flex items-center gap-1.5">🎟️ Promo Discount ({appliedCoupon?.code})</span>
                <span className="tabular">−{peso(couponDiscount)}</span>
              </p>
            )}

            <p className="flex justify-between text-navy-soft">
              <span>Metro Manila delivery</span><span className="tabular">{peso(SHIPPING)}</span>
            </p>

            <p className="flex justify-between border-t border-line pt-3 text-lg font-bold">
              <span>Total</span><span className="tabular">{peso(grandTotal)}</span>
            </p>
          </div>
        </TuscanCard>

        {/* Payment */}
        <TuscanCard tricolor className="rise h-fit bg-cream/90 backdrop-blur-md" style={{ animationDelay: '160ms' }}>
          <div className="p-5 md:p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold">Payment</h2>
              <TrustBadge>100% secure checkout</TrustBadge>
            </div>

            <div className="mt-5 rounded-2xl bg-shell p-5 text-center">
              <QrMock />
              <p className="mt-3 text-sm font-semibold">Scan with any QR Ph app</p>
              <p className="text-sm text-navy-soft">GCash · Maya · UnionBank · BPI</p>
            </div>

            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-navy-soft">
              <SyncIcon size={14} className="text-forest" />
              Payment is detected automatically — no screenshot verification, ever.
            </p>

            <p className="mt-5 flex items-baseline justify-between">
              <span className="text-sm text-navy-soft">Amount due</span>
              <span className="text-2xl font-bold text-navy tabular">{peso(total)}</span>
            </p>

            <CrimsonButton className="mt-4 w-full py-4 text-base" onClick={placeOrder}>
              Confirm payment
            </CrimsonButton>
          </div>
        </TuscanCard>
      </div>
    </main>
  )
}

// Deterministic QR-looking SVG — a mock, not a scannable code.
function QrMock() {
  const cells = []
  let seed = 41
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      seed = (seed * 137 + 71) % 251
      const inFinder =
        (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)
      if (!inFinder && seed % 5 < 2) cells.push([x, y])
    }
  }
  const finder = (fx, fy) => (
    <g key={`${fx}-${fy}`}>
      <rect x={fx} y={fy} width="7" height="7" fill="none" stroke="#23262c" strokeWidth="1" />
      <rect x={fx + 2} y={fy + 2} width="3" height="3" fill="#23262c" />
    </g>
  )
  return (
    <svg viewBox="-1 -1 23 23" className="mx-auto h-36 w-36 rounded-md bg-cream/90 backdrop-blur-sm p-1.5 shadow-card" role="img" aria-label="QR Ph payment code (mock)">
      {cells.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x} y={y} width="1" height="1" fill="#23262c" />
      ))}
      {finder(0, 0)}
      {finder(14, 0)}
      {finder(0, 14)}
    </svg>
  )
}
