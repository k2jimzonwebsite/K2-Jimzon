import { useStore } from '../context/StoreContext'
import { Tricolor } from '../components/ui/bits'
import Hero, { TrustRow } from '../components/home/Hero'
import CategoryTiles from '../components/home/CategoryTiles'
import NewArrivals from '../components/home/NewArrivals'
import HomeCatalog from '../components/home/HomeCatalog'
import StorySection from '../components/home/StorySection'
import { PasabuyBanner, WholesaleStrip } from '../components/home/Banners'
import FaqSection from '../components/home/FaqSection'
import Newsletter from '../components/home/Newsletter'

import { Helmet } from 'react-helmet-async'

export default function Home() {
  const { query, category } = useStore()

  return (
    <main className="pb-24 md:pb-12">
      <Helmet>
        <title>K2 Jimzon | Premium Italian Imported Food & Ingredients in the Philippines</title>
        <meta name="description" content="Discover K2 Jimzon, the premier importer of authentic Italian ingredients, espresso, and wholesale food in the Philippines. Shop our exclusive collection today." />
        <meta name="keywords" content="Premium Italian imported food Philippines, Wholesale Italian ingredients Manila, Italian espresso, Authentic Italian groceries" />
      </Helmet>
      <Hero />
      <TrustRow />
      <CategoryTiles />
      
      {/* Minimalist New Arrivals Section */}
      <div className="w-full h-px bg-line max-w-7xl mx-auto mt-6" />
      <NewArrivals />
      
      {/* Removed HomeCatalog as requested */}

      <div className="w-full flex justify-center py-10"><Tricolor className="w-16" /></div>
      
      {/* Brought back the remaining sections */}
      <StorySection />
      <PasabuyBanner />
      <WholesaleStrip />
      <FaqSection />
      <Newsletter />
    </main>
  )
}
