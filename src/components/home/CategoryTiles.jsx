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
  { cat: 'Seasoning, Staple Foods & Baking Ingredients', icon: '🧂', note: 'Pantry essentials' },
  { cat: 'Snack & Sweets', icon: '🍫', note: 'Biscuits & treats' },
  { cat: 'Beverages', icon: '☕', note: 'Coffee & drinks' },
  { cat: 'Breakfast Food', icon: '🥞', note: 'Morning starts' },
  { cat: 'Bath & Body', icon: '🛁', note: 'Body wash & soap' },
  { cat: 'Fragrances', icon: '✨', note: 'Perfumes & scents' },
  { cat: 'Hair Care', icon: '💇', note: 'Shampoo & treatments' },
  { cat: 'Skin Care', icon: '🧴', note: 'Lotions & creams' },
  { cat: 'Slimming', icon: '🏃', note: 'Health & wellness' },
  { cat: 'Whitening', icon: '🌟', note: 'Beauty care' },
  { cat: 'Pasabuy', icon: '✈️', note: 'Request anything' },
]

function CategoryTiles() {
  const { setCategory, setQuery, go } = useStore()
  return (
    <section className="mx-auto max-w-7xl px-4 pt-8">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 md:gap-4">
        {CATEGORY_TILES.map(({ cat, icon, note }, i) => {
          return (
            <button
              key={cat}
              onClick={() => { 
                if (cat === 'Pasabuy') {
                  go('pasabuy')
                } else {
                  setQuery(''); setCategory(cat) 
                  go('catalog')
                }
              }}
              className="rise group flex flex-col items-center gap-2 rounded-xl bg-cream/90 backdrop-blur-md p-3 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-float hover:bg-cream"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-shell text-2xl transition-colors group-hover:bg-crimson group-hover:text-white shadow-sm">
                {icon}
              </div>
              <div>
                <p className="font-serif text-xs sm:text-sm font-semibold leading-tight text-navy transition-colors group-hover:text-crimson">{cat}</p>
                <p className="hidden text-xs text-navy-faint md:block">{note}</p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default CategoryTiles
