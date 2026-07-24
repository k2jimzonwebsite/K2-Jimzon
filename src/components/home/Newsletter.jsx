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

function Newsletter() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (email.trim()) setDone(true)
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-14">
      <div className="relative overflow-hidden rounded-3xl bg-shell px-6 py-12 text-center text-navy md:py-16 shadow-card border border-line">
        
        {/* Abstract Ambient Glows */}
        <div className="absolute -top-[50%] left-[20%] w-[60%] h-[200%] bg-cream rounded-full mix-blend-screen filter blur-[120px] opacity-60"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[40%] h-[100%] bg-crimson-wash rounded-full mix-blend-multiply filter blur-[100px] opacity-40"></div>

        <div className="absolute inset-0 grain opacity-40 mix-blend-multiply pointer-events-none z-0"></div>

        <Tricolor className="absolute inset-x-0 top-0 z-10" />
        <div className="relative z-20">
          <Kicker className="text-crimson">The manifest</Kicker>
          <h2 className="mx-auto mt-2 max-w-md font-serif text-2xl font-semibold tracking-tight md:text-3xl">
            Know what's on the next flight before it lands.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-navy-soft font-light">
            One email per shipment — the new arrivals, restocks, and what's trending in Italy.
          </p>
          {done ? (
            <p className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full bg-forest-wash text-forest px-5 py-2.5 text-sm font-semibold border border-forest/10">
              <CheckIcon size={15} /> You're on the manifest — see you on the 22nd.
            </p>
          ) : (
            <form onSubmit={submit} className="mx-auto mt-8 flex max-w-sm gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
              className="min-w-0 flex-1 rounded-xl border border-line bg-cream/50 backdrop-blur-sm px-4 py-3 text-base md:text-sm text-navy placeholder:text-navy-faint focus:border-navy focus:outline-none shadow-sm min-h-[44px]"
            />
            <RedButton type="submit">Subscribe</RedButton>
          </form>
          )}
        </div>
      </div>
    </section>
  )
}

export default Newsletter
