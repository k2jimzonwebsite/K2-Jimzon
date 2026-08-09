import { lazy, Suspense } from 'react'
import Hero, { TrustRow } from '../components/home/Hero'
import CategoryTiles from '../components/home/CategoryTiles'
import NewArrivals from '../components/home/NewArrivals'
import StorySection from '../components/home/StorySection'
import { PasabuyBanner, WholesaleStrip } from '../components/home/Banners'
import FaqSection from '../components/home/FaqSection'
import ErrorBoundary from '../components/ui/ErrorBoundary'

import { Helmet } from 'react-helmet-async'

const GlobeSection = lazy(() => import('../components/home/GlobeSection'))

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
      <CategoryTiles />
      <NewArrivals />
      <ErrorBoundary fallback={<GlobeSectionUnavailable />}>
        <Suspense fallback={<section className="store-atmosphere flex min-h-[28rem] items-center justify-center border-y border-line text-sm font-semibold text-navy-soft"><span className="store-loading-mark" aria-hidden />Loading review globe&hellip;</section>}>
          <GlobeSection />
        </Suspense>
      </ErrorBoundary>
      <StorySection />
      <PasabuyBanner />
      <WholesaleStrip />
      <FaqSection />
    </main>
  )
}
