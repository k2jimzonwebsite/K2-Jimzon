import { useStore } from '../context/StoreContext'
import CatalogGrid from '../components/CatalogGrid'
import { Kicker } from '../components/ui/bits'

export default function Catalog() {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-12 pb-24 md:pt-16">
      <div className="mb-10 text-center">
        <Kicker className="mb-3 text-navy-soft">Complete Collection</Kicker>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
          Explore the Catalog
        </h1>
      </div>
      <CatalogGrid />
    </main>
  )
}
