import { useStore } from '../context/StoreContext'
import { Wordmark } from './ui/bits'
import { BagIcon, SearchIcon } from './ui/icons'

function SearchBox({ className = '' }) {
  const { query, setQuery, go, view } = useStore()
  return (
    <label className={'relative block ' + className}>
      <SearchIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-faint" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          if (view !== 'home') go('home')
        }}
        placeholder='Try "Lavazza", "Biscoff", "pesto"…'
        className="w-full rounded-full border border-line bg-shell py-2.5 pl-9 pr-4 text-[13px] placeholder:text-navy-faint focus:border-navy/40 focus:bg-white focus:outline-none"
      />
    </label>
  )
}

export default function StoreHeader() {
  const { go, count, setCartOpen, isWholesale, setIsWholesale } = useStore()

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur md:top-10">
      <div className="bg-navy px-4 py-1.5 text-center text-[11px] font-medium text-white/90">
        ✈ Next Milan consignment lands <span className="font-bold text-white">22 July</span> · Free Metro Manila delivery over ₱2,500
      </div>
      {isWholesale && (
        <div className="flex items-center justify-center gap-3 bg-blue px-4 py-1.5 text-[11.5px] font-medium text-white">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-white/70 pulse-dot" />
          Wholesale pricing active — Bella Vita Trading
          <button onClick={() => setIsWholesale(false)} className="underline decoration-white/40 underline-offset-2 hover:decoration-white">
            Sign out
          </button>
        </div>
      )}
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5 md:gap-6">
        <Wordmark onClick={() => go('home')} />

        <SearchBox className="ml-auto hidden max-w-sm flex-1 md:block" />

        <button
          onClick={() => go('wholesale')}
          className="ml-auto whitespace-nowrap rounded-md px-2 py-1 text-[12.5px] font-semibold text-blue transition-colors hover:bg-blue-wash md:ml-0"
        >
          {isWholesale ? 'Wholesale portal' : 'Wholesale login'}
        </button>

        <button
          onClick={() => setCartOpen(true)}
          className="relative rounded-md p-2 text-navy transition-colors hover:bg-shell"
          aria-label={`Open cart, ${count} items`}
        >
          <BagIcon size={21} />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-crimson px-1 text-[10px] font-bold text-white tabular">
              {count}
            </span>
          )}
        </button>
      </div>

      {/* Mobile search */}
      <div className="px-4 pb-3 md:hidden">
        <SearchBox />
      </div>
    </header>
  )
}
