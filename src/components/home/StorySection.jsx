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

const STORY_STEPS = [
  {
    img: 'market',
    title: 'Bought off real Italian shelves',
    body: 'Our buyers shop the same supermarkets, pharmacies, and wholesalers Italians use — no gray-market middlemen, no repacked goods.',
  },
  {
    img: 'plane',
    title: 'Flown on our monthly consignment',
    body: 'Everything consolidates into one air shipment from Milan — including your pasabuy requests — with batch dates logged before takeoff.',
  },
  {
    img: 'warehouse',
    title: 'Counted into live Manila stock',
    body: 'The moment a box clears customs, it’s scanned into one inventory shared by Shopee, Lazada, this store, and the wholesale portal.',
  },
]

function StorySection() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-12 md:py-24 glow-terracotta">
      <Kicker className="text-crimson">How it gets to you</Kicker>
      <h2 className="mt-2 w-full font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-medium tracking-tight text-navy">
        From an Italian shelf to your door, with nothing lost in between.
      </h2>
      <div className="mt-12 grid gap-5 md:grid-cols-3 md:gap-8">
        {STORY_STEPS.map((step, i) => (
          <figure key={step.title} className="group overflow-hidden rounded-2xl bg-cream/90 backdrop-blur-md shadow-float transition-all hover:shadow-card scroll-reveal">
            <div className="relative h-56 overflow-hidden">
              <img
                src={LIFESTYLE[step.img]}
                alt={step.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05] scroll-parallax origin-center"
              />
              <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-cream font-serif text-lg font-semibold text-crimson shadow-card">
                {i + 1}
              </span>
            </div>
            <figcaption className="p-6 md:p-8">
              <h3 className="font-serif text-lg font-semibold md:text-xl">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-soft">{step.body}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

export default StorySection
