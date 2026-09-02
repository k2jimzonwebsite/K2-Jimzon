import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useStore } from '../../context/StoreContext'
import ProductCard from '../ProductCard'
import ProductVisual from '../ProductVisual'
import { ArrowIcon } from '../ui/icons'
import { peso } from '../../data/products'

export default function NewArrivals() {
  const { listedProducts: products, loading, openProduct, isWholesale, go } = useStore()
  const arrivals = useMemo(() => (products || []).slice(0, 4), [products])
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const reducedMotion = useReducedMotion()

  const featured = arrivals[featuredIndex] || arrivals[0]

  return (
    <section className="store-atmosphere-soft border-y border-line py-14 md:py-20" aria-label="New arrivals">
      <div className="store-section">
        <div className="mb-8 flex items-end justify-between gap-5 border-b border-[var(--store-surface-border)] pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-crimson">Fresh Consignment</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-navy md:text-4xl">
              New Arrivals
            </h2>
            <p className="mt-1.5 text-sm text-navy-soft">
              Recently landed Italian favorites, checked in Manila and ready to deliver.
            </p>
          </div>

          <button
            onClick={() => go('catalog', { focusSelector: '#catalog-heading' })}
            className="hidden min-h-11 items-center gap-2 text-sm font-bold text-navy transition-colors hover:text-crimson sm:flex cursor-pointer"
          >
            Explore all arrivals <ArrowIcon size={15} />
          </button>
        </div>

        {arrivals.length === 0 ? (
          <div className="store-panel flex h-72 items-center justify-center px-6 text-center text-sm text-navy-soft">
            {loading ? 'Loading arrivals…' : 'No arrivals published yet.'}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            {/* Main Featured Arrival */}
            <div className="min-h-[28rem]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={featured.sku || featured.id}
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
                  animate={{ opacity: 1, transform: 'translateY(0)' }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-8px)' }}
                  transition={{ duration: reducedMotion ? 0.01 : 0.25, ease: [0.25, 1, 0.5, 1] }}
                  className="h-full"
                >
                  <ProductCard product={featured} featured />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Side Arrival Highlights */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-navy-faint">
                More recent arrivals
              </p>
              {arrivals.map((item, idx) => {
                const isSelected = idx === featuredIndex
                const price = isWholesale ? item.wholesale_price : item.srp
                const stock = Number(item.stock ?? item.stock_available ?? 0)

                return (
                  <div
                    key={item.sku || item.id}
                    onClick={() => setFeaturedIndex(idx)}
                    className={`group flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'border-crimson bg-[var(--store-surface-bg)] shadow-sm'
                        : 'border-[var(--store-surface-border)] bg-[var(--store-surface-bg)]/70 hover:border-line hover:bg-[var(--store-surface-bg)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--store-surface-border)] bg-[var(--product-img-bg)] p-1">
                        <ProductVisual product={item} className="h-full w-full object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-navy-faint truncate">
                          {item.category || 'Import'}
                        </p>
                        <h4 className="font-serif text-sm font-semibold text-navy group-hover:text-crimson truncate">
                          {item.name}
                        </h4>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-bold text-xs text-crimson tabular">{peso(price)}</span>
                          <span className="text-[10px] text-navy-faint">·</span>
                          <span className={`text-[10px] font-semibold ${stock > 0 ? 'text-forest' : 'text-navy-faint'}`}>
                            {stock > 0 ? `${stock} in Manila` : 'Pasabuy order'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openProduct(item.sku)
                      }}
                      className="shrink-0 rounded-lg border border-[var(--store-surface-border)] p-2 text-navy-soft transition-colors hover:border-crimson hover:bg-crimson/5 hover:text-crimson"
                      aria-label={`View ${item.name} details`}
                    >
                      <ArrowIcon size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
