import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '../../context/StoreContext'
import ProductCard from '../ProductCard'
import { ArrowIcon } from '../ui/icons'
import { Kicker } from '../ui/bits'

export default function NewArrivals() {
  const { listedProducts: products, loading } = useStore()
  const arrivals = useMemo(() => (products || []).slice(0, 5), [products])
  const [activeIndex, setActiveIndex] = useState(0)
  const activeProduct = arrivals[activeIndex]
  const change = (direction) => setActiveIndex((current) => arrivals.length ? (current + direction + arrivals.length) % arrivals.length : 0)

  return (
    <section className="store-atmosphere-soft border-y border-line py-14 md:py-20">
      <div className="store-section">
        <div className="mb-8 flex items-end justify-between gap-5">
          <div>
            <Kicker>Just arrived</Kicker>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-navy md:text-4xl">The latest consignment</h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-navy-soft">A closer look at the newest products currently published in the K2 catalog.</p>
          </div>

          {arrivals.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="mr-2 hidden text-xs font-semibold tabular text-navy-faint sm:inline">{activeIndex + 1} / {arrivals.length}</span>
              <button onClick={() => change(-1)} aria-label="Previous arrival" className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] text-navy transition-[transform,border-color] duration-150 hover:border-navy/30 active:scale-[0.97]"><ArrowIcon size={16} className="rotate-180" /></button>
              <button onClick={() => change(1)} aria-label="Next arrival" className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] text-navy transition-[transform,border-color] duration-150 hover:border-navy/30 active:scale-[0.97]"><ArrowIcon size={16} /></button>
            </div>
          )}
        </div>

        <div className="min-h-[28rem] md:h-[31rem]">
          {activeProduct ? (
            <AnimatePresence mode="wait">
              <motion.div key={activeProduct.sku || activeProduct.id} initial={{ opacity: 0, transform: 'translateY(6px)' }} animate={{ opacity: 1, transform: 'translateY(0)' }} exit={{ opacity: 0, transform: 'translateY(-4px)' }} transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }} className="h-full">
                <ProductCard product={activeProduct} featured />
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="store-panel flex h-72 items-center justify-center px-6 text-center text-sm text-navy-soft">{loading ? 'Loading current arrivals…' : 'No live arrivals are published yet.'}</div>
          )}
        </div>
      </div>
    </section>
  )
}
