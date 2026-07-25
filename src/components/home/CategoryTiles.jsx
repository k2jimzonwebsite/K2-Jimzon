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

const CATEGORY_TILES = [
  { cat: 'Seasoning, Staple Foods & Baking Ingredients', label: 'Pantry & Baking', icon: '🧂', note: 'Pantry essentials' },
  { cat: 'Snack & Sweets', label: 'Snacks & Sweets', icon: '🍫', note: 'Biscuits & treats' },
  { cat: 'Beverages', label: 'Beverages', icon: '☕', note: 'Coffee & drinks' },
  { cat: 'Breakfast Food', label: 'Breakfast', icon: '🥞', note: 'Morning starts' },
  { cat: 'Bath & Body', label: 'Bath & Body', icon: '🛁', note: 'Body wash & soap' },
  { cat: 'Fragrances', label: 'Fragrances', icon: '✨', note: 'Perfumes & scents' },
  { cat: 'Hair Care', label: 'Hair Care', icon: '💇', note: 'Shampoo & treatments' },
  { cat: 'Skin Care', label: 'Skin Care', icon: '🧴', note: 'Lotions & creams' },
  { cat: 'Slimming', label: 'Slimming', icon: '🏃', note: 'Health & wellness' },
  { cat: 'Whitening', label: 'Whitening', icon: '🌟', note: 'Beauty care' },
  { cat: 'Pasabuy', label: 'Pasabuy', icon: '✈️', note: 'Request anything' },
]

function CategoryTiles() {
  const { setCategory, setQuery, go } = useStore()
  return (
    <section className="mx-auto max-w-7xl px-3 pt-6 md:px-4 md:pt-8">
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 sm:gap-2 md:gap-3">
        {CATEGORY_TILES.map(({ cat, label, icon }, i) => {
          return (
            <button
              key={cat}
              title={cat}
              onClick={() => {
                if (cat === 'Pasabuy') {
                  go('pasabuy')
                } else {
                  setQuery(''); setCategory(cat)
                  go('catalog')
                }
              }}
              className="rise group flex flex-col items-center gap-1.5 rounded-lg border border-line bg-cream/90 backdrop-blur-md px-1 py-2.5 md:py-3 text-center shadow-sm transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-float hover:border-crimson/40 hover:bg-cream active:scale-[0.97]"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full bg-shell text-lg md:text-xl transition-colors group-hover:bg-crimson group-hover:text-white shadow-sm">
                {icon}
              </div>
              <p className="w-full px-0.5 text-[11px] md:text-xs font-semibold leading-tight text-navy transition-colors group-hover:text-crimson line-clamp-2">{label}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default CategoryTiles
