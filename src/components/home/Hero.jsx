import { useEffect, useRef, useState } from 'react'
import * as motion from 'motion/react-m'
import { useReducedMotion } from 'motion/react'
import { useStore } from '../../context/StoreContext'
import { RedButton, GhostButton, Kicker } from '../ui/bits'
import { ArrowIcon, CheckIcon, PlaneIcon, ShieldIcon, GridIcon, ChatIcon } from '../ui/icons'
import FlightMap from './FlightMap'
import { peso } from '../../data/products'
import { groupFamilyResults, familyPriceRange } from '../../lib/productFamilyPresentation'
import './Hero.css'

const reveal = {
  hidden: { opacity: 0, transform: 'translateY(10px)' },
  visible: { opacity: 1, transform: 'translateY(0)', transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
}

function Hero() {
  const { go, listedProducts, loading, openProduct, isWholesale, openStoreChat } = useStore()
  const reducedMotion = useReducedMotion()
  const railRef = useRef(null)
  const [canPrevious, setCanPrevious] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const updateRail = () => {
    const rail = railRef.current
    if (!rail) return
    setCanPrevious(rail.scrollLeft > 1)
    setCanNext(rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 1)
  }
  useEffect(() => {
    const observer = new ResizeObserver(updateRail)
    observer.observe(railRef.current)
    updateRail()
    return () => observer.disconnect()
  }, [loading, listedProducts])
  const moveRail = direction => railRef.current?.scrollBy({
    left: direction * railRef.current.clientWidth,
    behavior: reducedMotion ? 'instant' : 'smooth',
  })

  return (
    <section className="store-atmosphere relative overflow-hidden border-b border-line">
      <div className="hero-layout store-section grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <motion.div initial={reducedMotion ? false : "hidden"} animate="visible" variants={{ visible: { transition: { staggerChildren: 0.06 } } }} className="min-w-0 max-w-2xl">
          <motion.div variants={reveal}>
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-shell/60 px-3 py-1 font-mono text-[10px] sm:text-[11px] font-semibold text-navy-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-crimson animate-pulse" />
                <span className="md:hidden">Italy to Manila</span>
                <span className="hidden md:inline">MIL 45°28′ N ➔ MNL 14°35′ N · Scheduled Cargo</span>
              </span>
            </div>
            <Kicker className="hidden items-center gap-2 md:flex">
              <PlaneIcon size={14} /> Direct Italian sourcing, fulfilled in Manila
            </Kicker>
          </motion.div>
          <motion.h1 variants={reveal} className="hero-headline max-w-3xl font-serif font-semibold tracking-[-0.04em] text-navy">
            Italy, chosen well.<br /><em className="font-normal text-crimson">Delivered to Manila.</em>
          </motion.h1>
          <motion.p variants={reveal} className="mt-4 max-w-xl text-base leading-relaxed text-navy-soft sm:text-lg">
            Shop Italian favorites from our Manila stock, or request a specific item through Pasabuy.
          </motion.p>
          <motion.div variants={reveal} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <RedButton onClick={() => go('catalog')} className="px-7 py-3.5 text-base font-bold shadow-sm">
              Shop the Collection <ArrowIcon size={16} />
            </RedButton>
            <GhostButton onClick={() => go('pasabuy')} className="px-7 py-3.5 text-base font-bold">
              Request from Italy
            </GhostButton>
          </motion.div>
          <motion.p variants={reveal} className="mt-4 flex items-start gap-2 text-xs font-semibold text-navy-faint">
            <ShieldIcon size={15} className="mt-0.5 shrink-0 text-forest" />
            <span className="flex-1">No payment required at checkout. We verify stock first.</span>
            <button type="button" aria-label="Chat with K2 staff" onClick={() => openStoreChat({ origin: 'storefront_button' })} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-navy lg:hidden">
              <ChatIcon size={18} />
            </button>
          </motion.p>
        </motion.div>

        <motion.div initial={reducedMotion ? false : { opacity: 0, transform: 'translateX(14px)' }} animate={{ opacity: 1, transform: 'translateX(0)' }} transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }} className="relative min-w-0">
          <div className="hero-collection" aria-label="Explore the collection" aria-busy={loading}>
            <p className="hero-collection-heading">A little Italy, for your everyday.</p>
            <div id="hero-collection-rail" ref={railRef} onScroll={updateRail} className="hero-collection-shelf">
              {!loading && groupFamilyResults(listedProducts).slice(0, 3).map(product => {
                const multiple = product.family?.members.length > 1
                const range = multiple ? familyPriceRange(product, listedProducts, isWholesale) : null
                const priceLabel = multiple ? range ? `${range.min === range.max ? '' : 'From '}${peso(range.min)}` : 'Choose an option' : peso(isWholesale ? product.wholesale_price : product.srp)
                return (
                <button key={product.sku} className="hero-collection-item hover:border-crimson hover:bg-shell/50" onClick={() => openProduct(product.sku)}>
                  <img className="hero-collection-image" src={product.img || '/images/placeholder.svg'} alt="" onError={event => { if (!event.currentTarget.src.endsWith('/images/placeholder.svg')) event.currentTarget.src = '/images/placeholder.svg' }} />
                  <span className="hero-collection-name">{multiple ? product.family.name : product.name}</span>
                  <span className="mt-auto flex w-full items-center justify-between gap-1 pt-2 text-sm font-bold tabular-nums">{priceLabel} <ArrowIcon size={14} /></span>
                </button>
              )})}
              {(loading || !listedProducts.length) && <p className="hero-collection-empty">{loading ? 'Loading the collection…' : 'Explore the collection or request a favorite from Italy.'}</p>}
            </div>
            {(canPrevious || canNext) && <div className="mt-2 flex justify-end gap-2 lg:hidden">
              <button type="button" aria-label="Previous featured products" aria-controls="hero-collection-rail" disabled={!canPrevious} onClick={() => moveRail(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-navy disabled:opacity-40">
                <ArrowIcon size={18} className="rotate-180" />
              </button>
              <button type="button" aria-label="Next featured products" aria-controls="hero-collection-rail" disabled={!canNext} onClick={() => moveRail(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-navy disabled:opacity-40">
                <ArrowIcon size={18} />
              </button>
            </div>}
          </div>
          <div className="store-panel overflow-hidden p-5 sm:p-7">
            <div className="mb-2 flex flex-col items-start gap-3 border-b border-[var(--store-surface-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-navy-faint">Sourcing route</p>
                <p className="mt-1 font-serif text-lg font-semibold text-navy">Milano to Manila</p>
              </div>
              <span className="rounded-md border border-gold/30 bg-gold-wash px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-gold-deep">
                Direct shipment
              </span>
            </div>
            <FlightMap />
            <div className="grid grid-cols-2 gap-3 border-t border-[var(--store-surface-border)] pt-4 text-xs">
              <p><span className="block font-bold text-navy">Genuine catalog</span><span className="text-navy-faint">Checked items in Manila</span></p>
              <p><span className="block font-bold text-navy">Personal confirmation</span><span className="text-navy-faint">Staff checks before you pay</span></p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function TrustRow() {
  const items = [
    [CheckIcon, 'Authentic Italian imports'],
    [PlaneIcon, 'Direct flights from Milan'],
    [GridIcon, 'Availability checked before payment'],
    [ShieldIcon, 'Checked by staff before payment'],
  ]

  return (
    <div className="store-atmosphere-soft border-b border-line">
      <div className="store-section grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
        {items.map(([ItemIcon, label]) => (
          <div key={label} className="flex min-h-16 items-center justify-center gap-2.5 px-3 py-3 text-center text-xs font-semibold leading-tight text-navy-soft sm:text-xs">
            <ItemIcon size={16} className="shrink-0 text-crimson" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export { Hero as default, TrustRow }
