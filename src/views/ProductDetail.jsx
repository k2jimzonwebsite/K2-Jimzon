import { useEffect, useState } from 'react'
import BeforeAfterSlider from '../components/BeforeAfterSlider'
import ProductVisual from '../components/ProductVisual'
import ProductCard from '../components/ProductCard'
import { RedButton, StockPill, TrustBadge, Kicker, QuantityStepper, TuscanCard } from '../components/ui/bits'
import { StarIcon } from '../components/ui/icons'
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
          <p className="mt-2.5 text-center text-sm text-navy-faint">
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
          <p className="mt-2 flex items-center gap-2 text-sm text-navy-soft">
            <StarIcon className="text-gold" /> 4.9 · 812 sold across our channels · {product.size}
          </p>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-crimson tabular">{peso(price)}</span>
            {isWholesale && (
              <>
                <span className="text-base text-navy-faint line-through tabular">{peso(product.retail)}</span>
                <span className="rounded-full bg-blue-wash px-2 py-0.5 text-xs font-semibold text-blue">
                  Wholesale tier
                </span>
              </>
            )}
          </div>

          {/* The two blueprint questions, answered on every product */}
          <div className="mt-6 space-y-4 rounded-2xl bg-shell p-5">
            <div>
              <Kicker className="text-navy-soft">Why buy this</Kicker>
              <p className="mt-1 text-base leading-relaxed text-navy-soft">{product.whyBuy}</p>
            </div>
            <div className="border-t border-line pt-4">
              <Kicker className="text-navy-soft">Why you won't find it elsewhere</Kicker>
              <p className="mt-1 text-base leading-relaxed text-navy-soft">{product.whyRare}</p>
            </div>
          </div>

          <div className="mt-7 flex items-center gap-3">
            <QuantityStepper value={qty} onChange={setQty} max={remaining} size="md" />
            <span className="text-sm text-navy-soft">
              {canAdd ? product.inside : 'All available stock is already in your cart.'}
            </span>
          </div>

          <RedButton
            className="mt-4 w-full py-4 text-base"
            onClick={() => { addToCart(product.id, qty); setCartOpen(true) }}
            disabled={!canAdd}
          >
            {canAdd ? `Add to cart — ${peso(price * qty)}` : 'Stock limit reached'}
          </RedButton>

          {/* Filipino pairings — the AI-generated context from the blueprint */}
          <div className="mt-6 border-t border-line pt-5">
            <Kicker className="text-navy-faint">
              How Filipinos enjoy it
            </Kicker>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {product.pairings.map((p) => (
                <span key={p} className="rounded-full bg-shell px-3 py-1.5 text-sm font-medium text-navy-soft">
                  {p}
                </span>
              ))}
            </div>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-navy-soft">
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
    <TuscanCard className="mt-16" tricolor>
      <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-10">
        <div>
          <Kicker className="text-navy-soft">
            How we'd serve it
          </Kicker>
          <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight md:text-3xl">
            {guide.title}
          </h2>
          <ol className="mt-6 space-y-4">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest/10 font-serif text-sm font-semibold text-forest">
                  {i + 1}
                </span>
                <p className="pt-1 text-base leading-relaxed text-navy-soft">{step}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl bg-shell p-6 text-center md:w-64">
          <p className="font-serif text-lg font-semibold leading-snug">
            {guide.bundle.label.split(' — ')[1] ?? guide.bundle.label}
          </p>
          <p className="mt-1 text-sm text-navy-soft">Everything in this recipe, one box.</p>
          <p className="mt-3 text-2xl font-bold text-crimson tabular">{peso(guide.bundle.price)}</p>
          <RedButton className="mt-4 w-full" onClick={buyBundle}>
            Buy the bundle
          </RedButton>
        </div>
      </div>
    </TuscanCard>
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
      <h2 className="font-serif text-xl font-semibold tracking-tight">Frequently bought together</h2>
      <div className="shelf mt-4 flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:gap-5">
        {related.map((p) => (
          <div key={p.id} className="w-40 shrink-0 md:w-auto h-[240px] md:h-[300px]">
            <ProductCard product={p} compact />
          </div>
        ))}
      </div>
    </section>
  )
}
