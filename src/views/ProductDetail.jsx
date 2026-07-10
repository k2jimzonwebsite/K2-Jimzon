import { useEffect, useState } from 'react'
import BeforeAfterSlider from '../components/BeforeAfterSlider'
import ProductVisual from '../components/ProductVisual'
import { RedButton, StockPill, TrustBadge, Tricolor } from '../components/ui/bits'
import { MinusIcon, PlusIcon, StarIcon } from '../components/ui/icons'
import { useStore } from '../context/StoreContext'
import { getProduct, peso, products } from '../data/products'

export default function ProductDetail() {
  const { productId, addToCart, setCartOpen, isWholesale, lines } = useStore()
  const product = getProduct(productId)
  const [qty, setQty] = useState(1)
  const price = isWholesale ? product.wholesale : product.retail
  const inCart = lines.find((line) => line.id === product.id)?.qty ?? 0
  const remaining = Math.max(0, product.stock - inCart)
  const canAdd = remaining > 0

  useEffect(() => {
    setQty((current) => Math.min(Math.max(1, current), Math.max(1, remaining)))
  }, [product.id, remaining])

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-16 md:pt-10">
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        {/* Image / slider column */}
        <div className="rise">
          <BeforeAfterSlider product={product} />
          <p className="mt-2.5 text-center text-[12px] text-navy-faint">
            Drag the handle — see exactly what arrives in the box.
          </p>
        </div>

        {/* Details column */}
        <div className="rise" style={{ animationDelay: '90ms' }}>
          <div className="flex flex-wrap items-center gap-2">
            <TrustBadge>100% authentic · {product.origin} import</TrustBadge>
            <StockPill stock={product.stock} />
          </div>
          <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            {product.name}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-[13px] text-navy-soft">
            <StarIcon className="text-gold" /> 4.9 · 812 sold across our channels · {product.size}
          </p>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-crimson tabular">{peso(price)}</span>
            {isWholesale && (
              <>
                <span className="text-[15px] text-navy-faint line-through tabular">{peso(product.retail)}</span>
                <span className="rounded-full bg-blue-wash px-2 py-0.5 text-[11px] font-semibold text-blue">
                  Wholesale tier
                </span>
              </>
            )}
          </div>

          {/* The two blueprint questions, answered on every product */}
          <div className="mt-6 space-y-3 border-l-2 border-crimson pl-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-faint">Why buy this</p>
              <p className="mt-0.5 text-[14px] leading-relaxed text-navy-soft">{product.whyBuy}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-faint">Why you won't find it elsewhere</p>
              <p className="mt-0.5 text-[14px] leading-relaxed text-navy-soft">{product.whyRare}</p>
            </div>
          </div>

          <div className="mt-7 flex items-center gap-3">
            <div className="flex items-center rounded-md border border-navy/20">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-3 text-navy-soft hover:text-navy" aria-label="Decrease quantity">
                <MinusIcon size={15} />
              </button>
              <span className="w-9 text-center text-[15px] font-semibold tabular">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(remaining, q + 1))}
                disabled={!canAdd || qty >= remaining}
                className="p-3 text-navy-soft hover:text-navy disabled:cursor-not-allowed disabled:opacity-35"
                aria-label={qty >= remaining ? 'Maximum available stock reached' : 'Increase quantity'}
              >
                <PlusIcon size={15} />
              </button>
            </div>
            <span className="text-[12.5px] text-navy-soft">
              {canAdd ? product.inside : 'All available stock is already in your cart.'}
            </span>
          </div>

          <RedButton
            className="mt-4 w-full py-4 text-[15px]"
            onClick={() => { addToCart(product.id, qty); setCartOpen(true) }}
            disabled={!canAdd}
          >
            {canAdd ? `Add to cart — ${peso(price * qty)}` : 'Stock limit reached'}
          </RedButton>

          {/* Filipino pairings — the AI-generated context from the blueprint */}
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-faint">
              How Filipinos enjoy it
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {product.pairings.map((p) => (
                <span key={p} className="rounded-full bg-shell px-3 py-1.5 text-[12px] font-medium text-navy-soft">
                  {p}
                </span>
              ))}
            </div>
          </div>

          <ul className="mt-5 space-y-2 text-[13px] text-navy-soft">
            <li>· Ships from our Manila warehouse in 24 hours</li>
            <li>· Batch and best-before printed on every listing</li>
            <li>· Same live stock across Shopee, Lazada, and this store</li>
          </ul>
        </div>
      </div>

      {product.guide && <UsageGuide product={product} />}
      <RelatedShelf current={product} />
    </main>
  )
}

function UsageGuide({ product }) {
  const { guide } = product
  const { addToCart, setCartOpen } = useStore()
  const buyBundle = () => {
    addToCart(product.id)
    if (guide.bundle.partner) addToCart(guide.bundle.partner)
    setCartOpen(true)
  }
  return (
    <section className="mt-16 overflow-hidden rounded-lg border border-line bg-white shadow-card">
      <Tricolor />
      <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-navy-soft">
            How we'd serve it
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight md:text-3xl">
            {guide.title}
          </h2>
          <ol className="mt-6 space-y-4">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy font-serif text-[13px] font-semibold text-white">
                  {i + 1}
                </span>
                <p className="pt-1 text-[14px] leading-relaxed text-navy-soft">{step}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-lg bg-shell p-5 text-center md:w-64">
          <p className="font-serif text-lg font-semibold leading-snug">
            {guide.bundle.label.split(' — ')[1] ?? guide.bundle.label}
          </p>
          <p className="mt-1 text-[12px] text-navy-soft">Everything in this recipe, one box.</p>
          <p className="mt-3 text-2xl font-bold text-crimson tabular">{peso(guide.bundle.price)}</p>
          <RedButton className="mt-4 w-full" onClick={buyBundle}>
            Buy the bundle
          </RedButton>
        </div>
      </div>
    </section>
  )
}

function RelatedShelf({ current }) {
  const { openProduct } = useStore()
  const related = products
    .filter((p) => p.id !== current.id)
    .filter((p) => p.category === current.category || p.collections.some((c) => current.collections.includes(c)))
    .slice(0, 4)
  if (related.length === 0) return null
  return (
    <section className="mt-14">
      <h2 className="font-serif text-xl font-semibold tracking-tight">Usually bought together with this</h2>
      <div className="shelf mt-4 flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:gap-5">
        {related.map((p) => (
          <button
            key={p.id}
            onClick={() => openProduct(p.id)}
            className="group w-36 shrink-0 overflow-hidden rounded-lg border border-line bg-white text-left shadow-card transition-shadow hover:shadow-float md:w-auto"
          >
            <ProductVisual product={p} className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.02]" />
            <div className="p-3">
              <p className="font-serif text-[13.5px] font-medium leading-snug">{p.short}</p>
              <p className="mt-1 text-[13px] font-bold text-crimson tabular">{peso(p.retail)}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
