import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useStore } from '../context/StoreContext'
import { CATEGORIES } from '../data/products'
import ProductCard from './ProductCard'
import { SearchIcon, XIcon } from './ui/icons'

export default function CatalogGrid() {
  const { query, setQuery, category, setCategory, listedProducts: products, requestPasabuyItem } = useStore()
  const [sortBy, setSortBy] = useState('popular')
  const reducedMotion = useReducedMotion()

  const filteredProducts = useMemo(() => {
    let result = products || []
    if (category !== 'All') result = result.filter((product) => product.category === category || (category === 'Snacks' && product.category?.includes('Biscuits')))
    if (query.trim()) {
      const needle = query.trim().toLowerCase()
      result = result.filter((product) => [product.name, product.short, product.tag, product.category].some((value) => value?.toLowerCase().includes(needle)))
    }
    return [...result].sort((a, b) => {
      if (sortBy === 'price_asc') return Number(a.srp || 0) - Number(b.srp || 0)
      if (sortBy === 'price_desc') return Number(b.srp || 0) - Number(a.srp || 0)
      if (sortBy === 'popular') return Number(b.tag === 'Bestseller') - Number(a.tag === 'Bestseller')
      return 0
    })
  }, [products, query, category, sortBy])

  const clear = () => {
    setQuery('')
    setCategory('All')
  }

  return (
    <section className="store-section py-8 md:py-12" id="catalog">
      <div className="grid gap-8 lg:grid-cols-[14rem_1fr] lg:gap-10">
        <aside className="min-w-0 lg:border-r lg:border-[var(--store-surface-border)] lg:pr-7">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-navy-faint">Shop by category</p>
          <div className="flex gap-1 overflow-x-auto pb-2 lg:block lg:space-y-0.5 lg:overflow-visible lg:pb-0">
            {CATEGORIES.map((item) => {
              const selected = category === item
              return (
                <button key={item} onClick={() => setCategory(item)} aria-pressed={selected} className={`min-h-11 shrink-0 border-b-2 px-3 text-left text-sm transition-colors duration-150 cursor-pointer lg:flex lg:w-full lg:items-center lg:justify-between lg:border-b-0 lg:border-l-2 lg:px-3 ${selected ? 'border-crimson font-bold text-crimson' : 'border-transparent text-navy-soft hover:text-navy'}`}>
                  <span>{item}</span>
                  {selected && <span className="hidden h-1.5 w-1.5 rounded-full bg-crimson lg:block" />}
                </button>
              )
            })}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-7 flex flex-col gap-3 border-b border-[var(--store-surface-border)] pb-5 sm:flex-row sm:items-center">
            <label className="relative block w-full sm:max-w-sm">
              <span className="sr-only">Search products</span>
              <SearchIcon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-faint" />
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by product, tag or category" className="store-field w-full pl-10 pr-4" />
            </label>
            <div className="flex items-center justify-between gap-4 sm:ml-auto sm:justify-end">
              <p className="text-xs font-semibold tabular text-navy-faint"><span className="text-navy">{filteredProducts.length}</span> products</p>
              <label className="flex items-center gap-2 text-xs font-semibold text-navy-soft">
                <span className="sr-only sm:not-sr-only">Sort</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="store-field min-h-11 bg-[var(--store-surface-bg)] px-3 pr-8 text-sm font-semibold">
                  <option value="popular">Featured first</option>
                  <option value="latest">Latest</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                </select>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence initial={false}>
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id || product.sku}
                  layout
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
                  animate={{ opacity: 1, transform: 'translateY(0)' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0.01 : 0.22, delay: reducedMotion ? 0 : Math.min(index, 6) * 0.025, ease: [0.25, 1, 0.5, 1] }}
                  className="flex h-full"
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredProducts.length === 0 && (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] px-6 py-8 text-center">
              <SearchIcon size={28} className="text-navy-faint" />
              <h2 className="mt-4 font-serif text-xl font-semibold text-navy">Looking for something specific?</h2>
              <p className="mt-1.5 max-w-md text-sm text-navy-soft">
                {query.trim()
                  ? `We do not have "${query.trim()}" in our Manila stock right now, but we can source it for you from Italy.`
                  : 'No products found matching these filters.'}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {query.trim() && (
                  <button
                    onClick={() => requestPasabuyItem({ item: query.trim(), notes: `Requested item "${query.trim()}" from catalog search.` })}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-crimson px-5 text-sm font-bold text-white transition-all duration-150 hover:bg-crimson-deep active:scale-[0.97] cursor-pointer shadow-sm"
                  >
                    Request &ldquo;{query.trim()}&rdquo; via Pasabuy
                  </button>
                )}
                <button
                  onClick={clear}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--store-surface-border)] bg-shell/50 px-4 text-sm font-bold text-navy hover:bg-shell active:scale-[0.97] cursor-pointer"
                >
                  <XIcon size={14} /> Clear search & filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
