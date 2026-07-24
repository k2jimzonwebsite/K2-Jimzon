import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../context/StoreContext';
import { useGlobeCms } from '../../data/globeCms';
import { CATEGORIES, COLLECTIONS, peso } from '../../data/products';
import { FAQS, LIFESTYLE, REVIEWS } from '../../data/site';
import ProductGlobe from '../globe/ProductGlobe';
import GlobeOverlay from '../globe/GlobeOverlay';
import ProductVisual from '../ProductVisual';
import InteractiveReveal from '../InteractiveReveal';
import { BizBadge, RedButton, StockPill, TrustBadge, Tricolor, GhostButton, Kicker } from '../ui/bits';
import ProductCard from '../ProductCard';
import { ArrowIcon, CheckIcon, PlaneIcon, PlusIcon, StarIcon, MinusIcon } from '../ui/icons';
import { useDominantColor } from '../../lib/useDominantColor';
import { vividTint } from '../../lib/color';

function NewArrivals() {
  const { products } = useStore()
  const arrivals = useMemo(() => (products || []).slice(0, 5), [products])
  const [activeIndex, setActiveIndex] = useState(0)

  const next = () => setActiveIndex((prev) => (arrivals.length > 0 ? (prev + 1) % arrivals.length : 0))
  const prev = () => setActiveIndex((prev) => (arrivals.length > 0 ? (prev - 1 + arrivals.length) % arrivals.length : 0))

  const activeProduct = arrivals[activeIndex]

  // Chameleon: sample the active photo's dominant colour, fall back to the
  // product's curated hue if the image can't be read (e.g. cross-origin).
  const dominant = useDominantColor(activeProduct?.img)
  const hue = activeProduct?.hue ?? 40
  const tint = vividTint(dominant, hue)                 // vivid "r,g,b" from the photo (or hue)
  const wash = (a) => `rgba(${tint}, ${a})`

  return (
    <section className="bg-shell/60 backdrop-blur-sm px-4 py-12 md:py-24 relative overflow-hidden min-h-[100svh] flex flex-col justify-center snap-start md:min-h-0 md:block">

      {/* Chameleon background — adapts to the active product's photo colour. */}
      {/* Flat tint: the whole frame takes on the colour. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: wash(0.16), transition: 'background-color 900ms ease' }}
      />
      {/* Slowly drifting colour field (oversized so its edges never show). */}
      <div
        aria-hidden="true"
        className="chameleon-drift absolute -inset-[15%] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 45% 30%, ${wash(0.50)} 0%, transparent 66%),
                       radial-gradient(circle at 15% 85%, ${wash(0.40)} 0%, transparent 55%),
                       radial-gradient(circle at 85% 80%, ${wash(0.36)} 0%, transparent 55%)`,
          transition: 'background 900ms ease',
        }}
      />
      {/* Breathing spotlight halo, centred behind the featured product. */}
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[62%] w-[80%] max-w-3xl -translate-x-1/2 -translate-y-1/2">
        <div
          className="chameleon-breathe h-full w-full rounded-full blur-[100px]"
          style={{ backgroundColor: `rgba(${tint}, 0.5)`, transition: 'background-color 900ms ease' }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Kicker className="mb-3">
            The Drop
          </Kicker>
          <h2 className="font-serif text-3xl font-semibold tracking-[-0.025em] text-navy md:text-4xl">
            New Arrivals
          </h2>
          <p className="mt-3 text-base text-navy-soft max-w-md leading-relaxed font-light">
            Our newest Italian imports. Hover to explore.
          </p>
        </motion.div>

        {/* Carousel Controls */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="flex items-center gap-4"
        >
          <span className="text-sm font-bold tabular text-navy-faint">
            <span className="text-navy">0{arrivals.length > 0 ? activeIndex + 1 : 0}</span> / 0{arrivals.length}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={prev}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-cream/90 backdrop-blur-sm text-navy transition hover:bg-cream hover:border-line active:scale-95 shadow-sm"
            >
              <ArrowIcon size={16} className="rotate-180" />
            </button>
            <button 
              onClick={next}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-cream/90 backdrop-blur-sm text-navy transition hover:bg-cream hover:border-line active:scale-95 shadow-sm"
            >
              <ArrowIcon size={16} />
            </button>
          </div>
        </motion.div>
      </div>

      <div className="relative h-[500px] md:h-[500px] w-full">
        {activeProduct ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeProduct.sku || activeProduct.id || activeIndex}
              initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 h-full w-full"
            >
              <ProductCard product={activeProduct} index={0} featured={true} />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-navy-soft">Loading New Arrivals...</div>
        )}
      </div>
      </div>
    </section>
  )
}

export default NewArrivals
