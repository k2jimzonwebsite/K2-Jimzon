import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import ProductVisual from '../components/ProductVisual'
import { CrimsonButton, GhostButton, TrustBadge, Tricolor } from '../components/ui/bits'
import { CheckIcon, SyncIcon } from '../components/ui/icons'

const SHIPPING = 85

export default function Checkout() {
  const { lines, subtotal, wholesaleSavings, isWholesale, placeOrder, go } = useStore()

  if (lines.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-serif text-2xl font-semibold">Nothing to check out yet</h1>
        <p className="mt-2 text-[14px] text-navy-soft">Your cart is empty — the shipment table is full, though.</p>
        <GhostButton className="mt-6" onClick={() => go('home')}>Back to the shop</GhostButton>
      </main>
    )
  }

  const total = subtotal + SHIPPING

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:pb-16">
      <h1 className="rise font-serif text-3xl font-semibold tracking-tight">Checkout</h1>
      <p className="rise mt-1 text-[13px] text-navy-soft">No screenshots, no "sent na po" — payment confirms itself.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.1fr_1fr] md:gap-10">
        {/* Order summary */}
        <section className="rise rounded-lg border border-line bg-paper p-5 shadow-card md:p-7" style={{ animationDelay: '80ms' }}>
          <h2 className="font-serif text-lg font-semibold">Order summary</h2>
          <div className="mt-4 divide-y divide-line">
            {lines.map(({ product, qty, unit }) => (
              <div key={product.id} className="flex items-center gap-3 py-3.5">
                <ProductVisual product={product} className="h-12 w-12 shrink-0 rounded-md border border-line" pad="p-1" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-[14.5px] font-medium">{product.name}</p>
                  <p className="text-[12px] text-navy-soft">Qty {qty} · {peso(unit)} each</p>
                </div>
                <span className="text-[14px] font-semibold tabular">{peso(unit * qty)}</span>
              </div>
            ))}
          </div>

          <div className="mt-2 space-y-2 border-t border-line pt-4 text-[13.5px]">
            {isWholesale && wholesaleSavings > 0 && (
              <p className="flex justify-between font-semibold text-blue">
                <span className="flex items-center gap-1.5"><CheckIcon size={13} /> Wholesale discount applied</span>
                <span className="tabular">−{peso(wholesaleSavings)}</span>
              </p>
            )}
            <p className="flex justify-between text-navy-soft">
              <span>Subtotal</span><span className="tabular">{peso(subtotal)}</span>
            </p>
            <p className="flex justify-between text-navy-soft">
              <span>Metro Manila delivery</span><span className="tabular">{peso(SHIPPING)}</span>
            </p>
            <p className="flex justify-between border-t border-line pt-3 text-[16px] font-bold">
              <span>Total</span><span className="tabular">{peso(total)}</span>
            </p>
          </div>
        </section>

        {/* Payment */}
        <section className="rise h-fit rounded-lg border border-line bg-paper shadow-card" style={{ animationDelay: '160ms' }}>
          <Tricolor />
          <div className="p-5 md:p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold">Payment</h2>
              <TrustBadge>100% secure checkout</TrustBadge>
            </div>

            <div className="mt-5 rounded-lg bg-shell p-5 text-center">
              <QrMock />
              <p className="mt-3 text-[13px] font-semibold">Scan with any QR Ph app</p>
              <p className="text-[12px] text-navy-soft">GCash · Maya · UnionBank · BPI</p>
            </div>

            <p className="mt-4 flex items-center justify-center gap-2 text-[12px] text-navy-soft">
              <SyncIcon size={14} className="text-forest" />
              Payment is detected automatically — no screenshot verification, ever.
            </p>

            <p className="mt-5 flex items-baseline justify-between">
              <span className="text-[13px] text-navy-soft">Amount due</span>
              <span className="text-2xl font-bold text-navy tabular">{peso(total)}</span>
            </p>

            <CrimsonButton className="mt-4 w-full py-4 text-[15px]" onClick={placeOrder}>
              Confirm payment
            </CrimsonButton>
          </div>
        </section>
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
    <svg viewBox="-1 -1 23 23" className="mx-auto h-36 w-36 rounded-md bg-white p-1.5 shadow-card" role="img" aria-label="QR Ph payment code (mock)">
      {cells.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x} y={y} width="1" height="1" fill="#23262c" />
      ))}
      {finder(0, 0)}
      {finder(14, 0)}
      {finder(0, 14)}
    </svg>
  )
}
