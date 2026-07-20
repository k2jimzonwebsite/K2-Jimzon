import { useStore } from '../context/StoreContext'
import { Wordmark } from './ui/bits'
import { BagIcon, SearchIcon, MoonIcon, SunIcon } from './ui/icons'

function SearchBox({ className = '' }) {
  const { query, setQuery, go, view } = useStore()
  return (
    <label className={'relative block ' + className}>
      <SearchIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-faint" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          const val = e.target.value
          setQuery(val)
          
          if (val.trim().length > 0) {
            if (view !== 'catalog') go('catalog')
          } else {
            // Optional: If they clear the search while on the catalog page, they stay there.
            // But if they were not on catalog when they started typing, maybe return them?
            // For now, if they clear it, they just stay on the catalog seeing all items.
          }
        }}
        placeholder='Try "Lavazza", "Biscoff", "pesto"…'
        className="w-full rounded-full border border-line bg-shell py-2.5 pl-9 pr-4 text-sm placeholder:text-navy-faint focus:border-navy/40 focus:bg-paper focus:outline-none"
      />
    </label>
  )
}

export default function StoreHeader() {
  const { go, count, setCartOpen, isWholesale, setIsWholesale, isDark, toggleDarkMode } = useStore()

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/95 md:bg-cream/85 md:backdrop-blur-xl md:top-10">
      <div className="bg-shell/95 md:bg-shell/50 md:backdrop-blur-sm border-b border-line px-4 py-1.5 text-center text-xs font-medium text-navy-soft">
        ✈ Next Milan consignment lands <span className="font-bold text-navy">22 July</span><span className="hidden sm:inline"> · Free Metro Manila delivery over ₱2,500</span>
      </div>
      {isWholesale && (
        <div className="flex items-center justify-center gap-3 bg-forest-wash border-b border-line px-4 py-1.5 text-xs font-medium text-forest">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-forest/70 pulse-dot" />
          Wholesale pricing active — Bella Vita Trading
          <button onClick={() => setIsWholesale(false)} className="px-2 py-1 -mx-2 underline decoration-forest/40 underline-offset-2 hover:decoration-forest">
            Sign out
          </button>
        </div>
      )}
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5 md:gap-6">
        <Wordmark onClick={() => go('home')} />

        <SearchBox className="ml-auto hidden max-w-sm flex-1 md:block" />

        <button
          onClick={() => go('wholesale')}
          className="ml-auto whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold text-blue transition-colors hover:bg-blue-wash md:ml-0"
        >
          {isWholesale ? 'Wholesale portal' : 'Wholesale login'}
        </button>

        <button
          onClick={() => setCartOpen(true)}
          className="relative rounded-md p-2.5 text-navy transition-colors hover:bg-shell"
          aria-label={`Open cart, ${count} items`}
        >
          <BagIcon size={21} />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-crimson px-1 text-xs font-bold text-white tabular">
              {count}
            </span>
          )}
        </button>

        <button
          onClick={toggleDarkMode}
          className="relative rounded-md p-2.5 text-navy transition-colors hover:bg-shell"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
        </button>
      </div>

      {/* Mobile search */}
      <div className="px-4 pb-3 md:hidden">
        <SearchBox />
      </div>
    </header>
  )
}
