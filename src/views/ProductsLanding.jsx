import { Helmet } from 'react-helmet-async'
import NewArrivals from '../components/home/NewArrivals'
import CatalogGrid from '../components/CatalogGrid'
import { Kicker, Tricolor } from '../components/ui/bits'

export default function ProductsLanding() {
  return (
    <main className="pb-24 md:pb-12 bg-cream">
      <Helmet>
        <title>Products | K2 Jimzon</title>
      </Helmet>
      
      {/* Featured / Top Showcase */}
      <NewArrivals />

      <div className="w-full h-px bg-line max-w-7xl mx-auto my-12" />

      {/* Catalog */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-10 text-center">
          <Kicker className="mb-3 text-navy-soft">Full Collection</Kicker>
          <h2 className="font-serif text-3xl font-semibold text-navy">Explore the Catalog</h2>
        </div>
        <CatalogGrid />
      </div>
      
      <div className="w-full flex justify-center py-16"><Tricolor className="w-16" /></div>
    </main>
  )
}
