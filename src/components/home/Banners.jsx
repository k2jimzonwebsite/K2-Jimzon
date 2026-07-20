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

function PasabuyBanner() {
  const { go } = useStore()
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14 scroll-reveal">
      <div className="relative overflow-hidden rounded-3xl bg-cream/80 backdrop-blur-md text-navy shadow-card border border-line">
        
        {/* Soft terracotta gradient in background */}
        <div className="absolute top-0 right-0 w-[50%] h-[100%] bg-gradient-to-l from-crimson-wash to-transparent opacity-80"></div>
        <div className="absolute inset-0 grain opacity-40 mix-blend-multiply pointer-events-none z-0"></div>

        <Tricolor className="relative z-10" />
        <div className="relative z-10 grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-12">
          <div>
            <Kicker className="text-crimson">Pasabuy service</Kicker>
            <h2 className="mt-2 max-w-lg font-serif text-2xl font-semibold tracking-tight md:text-3xl">
              If it's on a shelf in Italy, we can put it on yours.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-navy-soft font-light">
              Request any product we don't stock. We buy it in Italy ourselves,
              consolidate it with our monthly shipment, and deliver it to your door —
              quoted upfront, no surprises.
            </p>
          </div>
          <RedButton onClick={() => go('pasabuy')} className="md:px-8">
            Make a request
          </RedButton>
        </div>
      </div>
    </section>
  )
}

function WholesaleStrip() {
  const { go } = useStore()
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-blue-wash p-6 md:flex-row md:items-center md:p-8">
        <div>
          <BizBadge solid>For business</BizBadge>
          <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight md:text-3xl">
            Coffee shops, restos, resellers — buy at wholesale.
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-navy-soft">
            Live stock, your tier pricing, self-serve ordering. No more waiting for
            a Viber reply to close an order.
          </p>
        </div>
        <button
          onClick={() => go('wholesale')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue/90"
        >
          Wholesale portal <ArrowIcon size={15} />
        </button>
      </div>
    </section>
  )
}

export { PasabuyBanner, WholesaleStrip }
