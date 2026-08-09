import { useStore } from '../context/StoreContext'
import { Wordmark } from './ui/bits'
import { BagIcon, SearchIcon, MoonIcon, SunIcon } from './ui/icons'

function SearchBox({ className = '' }) {
  const { query, setQuery, go, view } = useStore()

  return (
    <label className={'relative block ' + className}>
      <span className="sr-only">Search the catalog</span>
      <SearchIcon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-faint" />
      <input
        type="search"
        value={query}
        onChange={(event) => {
          const value = event.target.value
          setQuery(value)
          if (value.trim() && view !== 'catalog') go('catalog')
        }}
        placeholder="Search products"
        className="store-field h-11 w-full pl-10 pr-4"
      />
    </label>
  )
}

export default function StoreHeader() {
  const { go, view, count, setCartOpen, isDark, toggleDarkMode } = useStore()
  const active = view === 'product' || view === 'master_product' ? 'catalog' : view
  const nav = [
    ['home', 'Home'],
    ['catalog', 'Inventory & Catalog'],
    ['pasabuy', 'Pasabuy Sourcing'],
    ['wholesale', 'Wholesale inquiry'],
  ]

  return (
    <header className="store-nav-surface sticky top-0 z-40 border-b border-line backdrop-blur-xl">
      <div className="border-b border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] px-4 py-2 text-center text-xs font-semibold leading-5 tracking-wide text-navy-soft">
        Italy-sourced goods, fulfilled in Manila <span className="mx-2 text-crimson">·</span> Final stock and delivery are confirmed by K2 staff
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:px-6">
        <Wordmark onClick={() => go('home')} size="text-[1.55rem]" />

        <nav className="ml-6 hidden min-w-0 flex-1 items-stretch lg:flex" aria-label="Storefront">
          {nav.map(([key, label]) => {
            const isActive = active === key
            return (
              <button
                key={key}
                onClick={() => go(key)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative min-h-11 whitespace-nowrap px-3 text-sm font-semibold transition-colors duration-150 ${isActive ? 'text-crimson' : 'text-navy-soft hover:text-navy'}`}
              >
                {label}
                <span className={`absolute inset-x-3 -bottom-3 h-0.5 origin-left bg-crimson transition-transform duration-200 ease-out-quart ${isActive ? 'scale-x-100' : 'scale-x-0'}`} />
              </button>
            )
          })}
        </nav>

        <SearchBox className="ml-auto hidden w-full max-w-[17rem] md:block lg:ml-2" />

        <button
          onClick={() => setCartOpen(true)}
          className="relative flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] text-navy transition-[transform,border-color,background-color] duration-150 hover:border-navy/25 active:scale-[0.97]"
          aria-label={`Open cart, ${count} items`}
        >
          <BagIcon size={20} />
          {count > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-crimson px-1 text-[10px] font-bold text-white">{count}</span>}
        </button>

        <button
          onClick={toggleDarkMode}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] text-navy transition-[transform,border-color,background-color] duration-150 hover:border-navy/25 active:scale-[0.97]"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <SunIcon size={19} className="text-gold" /> : <MoonIcon size={19} />}
        </button>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <SearchBox />
      </div>
    </header>
  )
}
