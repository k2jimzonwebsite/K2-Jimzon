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
    <section className="bg-transparent">
      <div className="flex flex-col lg:flex-row min-h-[400px] md:min-h-[550px] lg:min-h-[650px]">
        {/* Left: Promotions / Deals Carousel */}
        <div className="grain relative flex flex-col justify-center overflow-hidden bg-cream/80 backdrop-blur-xl p-8 lg:w-[40%] xl:w-[35%] lg:p-10 xl:p-14 border-r border-line">
          <Tricolor className="absolute inset-x-0 top-0 z-10" />
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
              hidden: {}
            }}
            className="relative z-20 max-w-md mx-auto w-full"
          >
            <motion.span 
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
              }}
              className="inline-block rounded-full bg-crimson px-3 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-white shadow-card ring-1 ring-crimson/20"
            >
              Flash Sale
            </motion.span>
            <motion.h1 
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
              }}
              className="mt-6 font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-medium leading-[0.95] tracking-tight text-navy"
            >
              The Milano <br/> Consignment.
            </motion.h1>
            <motion.p 
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
              }}
              className="mt-6 max-w-sm text-base leading-relaxed text-navy-soft font-light"
            >
              Fresh stock just landed. Get up to 30% off retail prices on authentic Italian goods flown directly to Manila.
            </motion.p>
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
              }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <RedButton onClick={() => go('pasabuy')} className="px-8 py-4 text-sm">
                Shop the Drop
              </RedButton>
              <GhostButton onClick={() => go('wholesale')}>
                Wholesale Portal
              </GhostButton>
            </motion.div>
          </motion.div>
        </div>

        {/* Right: Featured 3D Product (Globe) */}
        <div className="relative flex flex-col overflow-hidden bg-shell/70 backdrop-blur-xl lg:flex-1 min-h-[300px] md:min-h-[450px]">
          
          {/* Abstract Wood & Terracotta Depth */}
          <div className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] bg-[#9A6A45] rounded-full mix-blend-multiply filter blur-[100px] opacity-20"></div>
          <div className="absolute top-[40%] -left-[20%] w-[50%] h-[80%] bg-[#B84E3A] rounded-[100%] mix-blend-overlay filter blur-[120px] opacity-[0.15] -rotate-45"></div>
          <div className="absolute -bottom-[20%] right-[10%] w-[70%] h-[40%] bg-[#C89B4B] rounded-full mix-blend-multiply filter blur-[140px] opacity-15"></div>

          {/* Light gradient for organic feel */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.6)_0%,transparent_100%)]"></div>
          
          {/* Warm organic ground shadow for the globe */}
          <div className="absolute top-[80%] left-1/2 -translate-x-1/2 w-[500px] h-[60px] bg-[#9A6A45]/20 blur-2xl rounded-full pointer-events-none z-0"></div>
          
          {/* Textures */}
          <div className="absolute inset-0 pointer-events-none grain opacity-40 mix-blend-multiply z-0"></div>

          <div className="absolute top-6 left-6 z-20">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/90 backdrop-blur-md px-3.5 py-2 text-xs font-bold uppercase tracking-[0.15em] text-navy shadow-card">
              <StarIcon size={12} className="text-gold" /> Customer Review
            </span>
          </div>
          {enabledGlobeProducts.length > 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="h-full w-full">
                <ProductGlobe products={enabledGlobeProducts} onSelect={setSelected} />
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-shell/80 via-shell/40 to-transparent p-6 pt-32">
             <p className="text-center text-xs font-bold tracking-[0.2em] uppercase text-navy-faint">Interactive • Drag to view</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && <GlobeOverlay product={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
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
