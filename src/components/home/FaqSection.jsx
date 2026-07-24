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

function FaqSection() {
  const [open, setOpen] = useState(0)
  return (
    <section className="relative mx-auto max-w-3xl px-4 py-16 glow-olive scroll-reveal min-h-[100svh] flex flex-col justify-center snap-start md:min-h-0 md:block">
      <h2 className="text-center font-serif text-2xl font-semibold tracking-tight md:text-3xl">
        Questions, answered honestly
      </h2>
      <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-cream/90 backdrop-blur-md shadow-card">
        {FAQS.map((faq, i) => {
          const isOpen = open === i
          return (
            <div key={faq.q}>
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-serif text-base font-semibold">{faq.q}</span>
                <span className={'shrink-0 text-navy-faint transition-transform ' + (isOpen ? 'rotate-45' : '')}>
                  <PlusIcon size={16} />
                </span>
              </button>
              {isOpen && (
                <p className="px-5 pb-5 text-sm leading-relaxed text-navy-soft">{faq.a}</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default FaqSection
