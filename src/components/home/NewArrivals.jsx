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

function NewArrivals() {
  const { products } = useStore()
  const arrivals = useMemo(() => (products || []).slice(0, 5), [products])
  const [activeIndex, setActiveIndex] = useState(0)

  const next = () => setActiveIndex((prev) => (arrivals.length > 0 ? (prev + 1) % arrivals.length : 0))
  const prev = () => setActiveIndex((prev) => (arrivals.length > 0 ? (prev - 1 + arrivals.length) % arrivals.length : 0))

  const activeProduct = arrivals[activeIndex]

  return (
    <section className="bg-shell/60 backdrop-blur-sm px-4 py-12 md:py-24 relative overflow-hidden">
      
      {/* Abstract Wood/Amber Background Sweeps */}
      <div className="absolute top-0 left-[10%] w-[40%] h-[100%] bg-[#9A6A45] rounded-[100%] mix-blend-multiply filter blur-[140px] opacity-[0.08] -rotate-12 pointer-events-none"></div>
      <div className="absolute bottom-0 right-[5%] w-[50%] h-[120%] bg-[#B84E3A] rounded-full mix-blend-overlay filter blur-[160px] opacity-[0.05] pointer-events-none"></div>

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
