import CatalogGrid from '../components/CatalogGrid'
import { Kicker } from '../components/ui/bits'
import { useStore } from '../context/StoreContext'

export default function Catalog() {
  const { go } = useStore()

  return (
    <main className="pb-24 md:pb-16">
      <header className="store-atmosphere border-b border-line">
        <div className="store-section py-10 md:py-14">
          <Kicker>Current Manila catalog</Kicker>
          <div className="mt-3 grid gap-4 md:grid-cols-[1fr_0.7fr] md:items-end">
            <h1 id="catalog-heading" tabIndex={-1} className="max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-tight text-navy outline-none sm:text-5xl">Explore the Italian cabinet.</h1>
            <p className="max-w-lg text-sm leading-7 text-navy-soft md:justify-self-end">Search current published products and send your cart as an order request. Availability is verified before payment instructions are provided.</p>
          </div>
          {/* MAP-027: an explicit choice, never a replacement for this list. The
              shelf view loads only once the customer asks for it. */}
          <div className="mt-6">
            <button
              type="button"
              data-k2-store-entry
              onClick={() => go('store')}
              className="min-h-[44px] rounded-xl border border-line px-5 text-sm font-semibold text-navy transition-colors hover:border-amber focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
            >
              Enter the store
            </button>
          </div>
        </div>
      </header>
      <CatalogGrid />
    </main>
  )
}
