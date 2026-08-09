import CatalogGrid from '../components/CatalogGrid'
import { Kicker } from '../components/ui/bits'

export default function Catalog() {
  return (
    <main className="pb-24 md:pb-16">
      <header className="store-atmosphere border-b border-line">
        <div className="store-section py-10 md:py-14">
          <Kicker>Current Manila catalog</Kicker>
          <div className="mt-3 grid gap-4 md:grid-cols-[1fr_0.7fr] md:items-end">
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-tight text-navy sm:text-5xl">Explore the Italian cabinet.</h1>
            <p className="max-w-lg text-sm leading-7 text-navy-soft md:justify-self-end">Search current published products and send your cart as an order request. Availability is verified before payment instructions are provided.</p>
          </div>
        </div>
      </header>
      <CatalogGrid />
    </main>
  )
}
