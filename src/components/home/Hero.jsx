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

function Hero() {
  const { enabledGlobeProducts } = useGlobeCms()
  const { go } = useStore()
  const [selected, setSelected] = useState(null)

  return (
    <section className="relative overflow-hidden border-b border-line bg-cream/70 backdrop-blur-xl min-h-[100svh] flex flex-col justify-center snap-start md:min-h-0 md:block">
      <Tricolor className="absolute inset-x-0 top-0 z-10" />
      <div className="grain relative mx-auto max-w-6xl px-6 py-14 text-center sm:py-20 md:py-28 md:text-left">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } }, hidden: {} }}
          className="mx-auto w-full max-w-2xl md:mx-0"
        >
          <motion.span
            variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
            className="inline-block rounded-full bg-crimson px-3 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-white shadow-card ring-1 ring-crimson/20"
          >
            Flash Sale
          </motion.span>
          <motion.h1
            variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
            className="mt-6 font-serif text-4xl font-medium leading-[0.98] tracking-tight text-navy sm:text-5xl md:text-6xl xl:text-7xl"
          >
            The Milano <br className="hidden sm:block" /> Consignment.
          </motion.h1>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
            className="mx-auto mt-6 max-w-md text-base font-light leading-relaxed text-navy-soft md:mx-0"
          >
            Fresh stock just landed. Get up to 30% off retail prices on authentic Italian goods flown directly to Manila.
          </motion.p>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
            className="mt-10 flex flex-wrap justify-center gap-3 sm:gap-4 md:justify-start"
          >
            <RedButton onClick={() => go('catalog')} className="px-8 py-4 text-sm">
              Shop the Drop
            </RedButton>
            <GhostButton onClick={() => go('wholesale')}>
              Wholesale Portal
            </GhostButton>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

function TrustRow() {
  return (
    <div className="border-b border-line bg-cream/80 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex max-w-7xl overflow-x-auto whitespace-nowrap items-center gap-4 px-4 py-3 text-sm font-medium md:justify-center md:gap-8">
        <span className="flex items-center gap-2 text-forest"><CheckIcon size={14}/> Sourced in Italy</span>
        <span className="flex items-center gap-2 text-blue"><PlaneIcon size={14}/> Flown to Manila Monthly</span>
        <span className="flex items-center gap-2 text-crimson"><StarIcon size={14}/> 4.9★ Preferred Seller</span>
        <span className="flex items-center gap-2 text-gold"><CheckIcon size={14}/> 100% Authentic Guarantee</span>
      </div>
    </div>
  )
}

export { Hero as default, TrustRow }
