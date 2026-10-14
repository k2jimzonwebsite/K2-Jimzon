import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import Hero, { TrustRow } from '../components/home/Hero'
import CategoryTiles from '../components/home/CategoryTiles'
import NewArrivals from '../components/home/NewArrivals'
import { PasabuyBanner, WholesaleStrip } from '../components/home/Banners'
import ErrorBoundary from '../components/ui/ErrorBoundary'
import { Kicker } from '../components/ui/bits'
import { StarIcon } from '../components/ui/icons'

import { Helmet } from 'react-helmet-async'

const GlobeSection = lazy(() => import('../components/home/GlobeSection'))
const StorySection = lazy(() => import('../components/home/StorySection'))
const FaqSection = lazy(() => import('../components/home/FaqSection'))

function GlobeSectionPlaceholder() {
  return (
    <section className="store-atmosphere relative overflow-hidden border-y border-line px-4 py-14 md:py-20" aria-label="Interactive review globe">
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mx-auto mb-7 max-w-2xl text-center md:mb-9">
          <Kicker className="flex items-center justify-center gap-2">
            <StarIcon size={14} className="text-gold" /> Interactive review globe
          </Kicker>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
            Reviews, mapped to the products.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-navy-soft">
            Spin the product globe and open an item to read its published customer feedback.
          </p>
        </div>

        <div className="relative flex h-[66vh] min-h-[460px] w-full items-center justify-center overflow-hidden rounded-2xl border border-line bg-shell/45 sm:h-[500px] md:h-[560px]">
          <div className="text-center px-6" role="status">
            <span className="store-loading-mark mx-auto block" aria-hidden />
            <p className="mt-4 font-sans text-sm font-semibold text-navy-soft">
              Loading review globe&hellip;
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function GlobeSectionUnavailable() {
  return (
    <section className="store-atmosphere border-y border-line px-4 py-14 md:py-20" role="status">
      <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-[var(--store-surface-bg)] px-6 py-12 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-crimson">Review globe reconnecting</p>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-navy">The shop is still open.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-navy-soft">The interactive 3D review display did not finish loading. Products, Pasabuy, cart, and checkout remain available.</p>
        <button onClick={() => window.location.reload()} className="mt-6 min-h-11 rounded-lg bg-crimson px-5 text-sm font-bold text-white transition-colors hover:bg-crimson-deep">Reload the globe</button>
      </div>
    </section>
  )
}

function DeferredGlobeSection() {
  const [shouldLoad, setShouldLoad] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '300px 0px',
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef}>
      {shouldLoad ? (
        <ErrorBoundary fallback={<GlobeSectionUnavailable />}>
          <Suspense fallback={<GlobeSectionPlaceholder />}>
            <GlobeSection />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <GlobeSectionPlaceholder />
      )}
    </div>
  )
}

function TransitDivider({ label = 'Sourcing Route', from = 'Milano', to = 'Manila', flip = false }) {
  return (
    <div className="relative py-2.5 px-4 overflow-hidden select-none border-y border-line/40 bg-shell/20" aria-hidden="true">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 text-navy-faint">
        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-navy-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-crimson" />
          <span>{flip ? to : from}</span>
        </div>

        <div className="relative flex-1 flex items-center px-2">
          <svg className="w-full h-3 text-line" viewBox="0 0 500 12" fill="none" preserveAspectRatio="none">
            <line x1="0" y1="6" x2="500" y2="6" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" strokeOpacity="0.8" />
            <path
              d={flip ? "M 220 6 Q 250 1 280 6" : "M 220 6 Q 250 11 280 6"}
              stroke="var(--color-crimson, #9E2A2B)"
              strokeWidth="1.5"
              strokeOpacity="0.5"
            />
          </svg>
          {label && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line/60 bg-[var(--store-canvas-bg,#fcfbf9)] px-2.5 py-0.5 font-mono text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-[0.2em] text-navy-faint">
              {label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-navy-soft">
          <span>{flip ? from : to}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-forest" />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <main className="pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-10">
      <Helmet>
        <title>K2 Jimzon | Premium Italian Imported Food & Ingredients in the Philippines</title>
        <meta name="description" content="Browse K2 Jimzon's Italy-sourced catalog in the Philippines or submit a tracked Pasabuy sourcing request for a specific item." />
        <meta name="keywords" content="Italian imported food Philippines, wholesale Italian ingredients Manila, Italian espresso, Italy Pasabuy" />
      </Helmet>
      <Hero />
      <TrustRow />
      <TransitDivider label="Direct Sourcing" from="Milano · 45°N" to="Pantry Selection" />
      <CategoryTiles />
      <TransitDivider label="Monthly Cargo Flights" from="MXP Flight" to="Manila Stock" flip />
      <NewArrivals />
      <TransitDivider label="Verified Reviews" from="Shopee & Direct" to="3D Review Globe" />
      <DeferredGlobeSection />
      <TransitDivider label="Quality Journey" from="Shelf Inspection" to="Manila Warehouse" flip />
      <Suspense fallback={null}>
        <StorySection />
      </Suspense>
      <PasabuyBanner />
      <WholesaleStrip />
      <TransitDivider label="Honest Operations" from="FEFO Tracking" to="Direct Support" />
      <Suspense fallback={null}>
        <FaqSection />
      </Suspense>
    </main>
  )
}
