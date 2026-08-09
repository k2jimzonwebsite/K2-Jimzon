import { lazy, Suspense } from 'react'
import Hero, { TrustRow } from '../components/home/Hero'
import CategoryTiles from '../components/home/CategoryTiles'
import NewArrivals from '../components/home/NewArrivals'
import StorySection from '../components/home/StorySection'
import { PasabuyBanner, WholesaleStrip } from '../components/home/Banners'
import FaqSection from '../components/home/FaqSection'

import { Helmet } from 'react-helmet-async'

const GlobeSection = lazy(() => import('../components/home/GlobeSection'))

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
      <Suspense fallback={<section className="store-atmosphere flex min-h-[28rem] items-center justify-center border-y border-line text-sm font-semibold text-navy-soft"><span className="store-loading-mark" aria-hidden />Loading review globe&hellip;</section>}>
        <GlobeSection />
      </Suspense>
      <StorySection />
      <PasabuyBanner />
      <WholesaleStrip />
      <FaqSection />
    </main>
  )
}
