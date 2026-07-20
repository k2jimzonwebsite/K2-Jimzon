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

export default function Home() {
  const { query, category } = useStore()

  return (
    <main className="pb-24 md:pb-12">
      <Hero />
      <TrustRow />
      <CategoryTiles />
      
      {/* Minimalist New Arrivals Section */}
      <div className="w-full h-px bg-line max-w-7xl mx-auto mt-6" />
      <NewArrivals />
      
      {/* SEO-Friendly Full Catalog */}
      <HomeCatalog />

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
