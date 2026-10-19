import { useMemo, useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useStore } from '../context/StoreContext'
import { CATEGORIES } from '../data/products'
import ProductCard from './ProductCard'
import { SearchIcon, XIcon } from './ui/icons'
import { compareCatalogProducts } from '../lib/catalogSort'
import { partitionCatalogSearch } from '../lib/catalogSearch'

export { compareCatalogProducts }

const PAGE_SIZE = 12

export default function CatalogGrid() {
  const {
    query,
    setQuery,
    category,
    setCategory,
    sortBy: storeSortBy,
    setSortBy: setStoreSortBy,
    listedProducts: products,
    requestPasabuyItem,
    loading,
    catalogStale,
    catalogFailed,
    refreshCatalog,
  } = useStore()

  const [localSortBy, setLocalSortBy] = useState('popular')
  const sortBy = storeSortBy ?? localSortBy
  const setSortBy = setStoreSortBy ?? setLocalSortBy
  const reducedMotion = useReducedMotion()

  // Dynamic categories: derives categories from catalog products so new categories appear automatically
  const availableCategories = useMemo(() => {
    const dynamicCats = new Set()
    if (Array.isArray(products)) {
      for (const p of products) {
        if (p.category && p.category !== 'Uncategorised') {
          dynamicCats.add(p.category)
        }
      }
    }
    if (dynamicCats.size === 0) return CATEGORIES
    if (category && category !== 'All' && !dynamicCats.has(category)) {
      dynamicCats.add(category)
    }
    return ['All', ...Array.from(dynamicCats).sort((a, b) => a.localeCompare(b))]
  }, [products, category])

  // Shopee/Lazada style search relevance partitioning
  const { directMatches, recommendedMatches, hasQuery } = useMemo(() => {
    return partitionCatalogSearch(products, query, category, sortBy)
  }, [products, query, category, sortBy])

  // Progressive batching / infinite scroll state
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const loadMoreSentinelRef = useRef(null)

  // Reset pagination on filter or query change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [query, category, sortBy])

  const totalAvailable = directMatches.length + (hasQuery ? recommendedMatches.length : 0)
  const canLoadMore = visibleCount < totalAvailable

  // Slice visible items
  const visibleDirect = useMemo(() => {
    return directMatches.slice(0, visibleCount)
  }, [directMatches, visibleCount])

  const recAllowance = Math.max(0, visibleCount - directMatches.length)
  const visibleRecommended = useMemo(() => {
    if (!hasQuery || recAllowance <= 0) return []
    return recommendedMatches.slice(0, recAllowance)
  }, [hasQuery, recAllowance, recommendedMatches])

  // Infinite scroll observer: triggers loading next batch when user scrolls near sentinel
  useEffect(() => {
    if (!canLoadMore) return
    const el = loadMoreSentinelRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE)
        }
      },
      { rootMargin: '300px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [canLoadMore])

  const handleManualLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE)
  }

  const clear = () => {
    setQuery('')
    setCategory('All')
    setSortBy('popular')
  }

  return (
    <section className="store-section py-8 md:py-12" id="catalog">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[14rem_1fr] lg:gap-10">
        <aside className="min-w-0 lg:border-r lg:border-[var(--store-surface-border)] lg:pr-7">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-navy-faint">Shop by category</p>
          <div className="flex gap-1 overflow-x-auto pb-2 lg:block lg:space-y-0.5 lg:overflow-visible lg:pb-0">
            {availableCategories.map((item) => {
              const selected = category === item
              return (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  aria-pressed={selected}
                  className={`min-h-11 min-w-11 shrink-0 border-b-2 px-3 text-left text-sm transition-colors duration-150 cursor-pointer lg:flex lg:w-full lg:items-center lg:justify-between lg:border-b-0 lg:border-l-2 lg:px-3 ${
                    selected
                      ? 'border-crimson font-bold text-crimson'
                      : 'border-transparent text-navy-soft hover:text-navy'
                  }`}
                >
                  <span>{item}</span>
                  {selected && <span className="hidden h-1.5 w-1.5 rounded-full bg-crimson lg:block" />}
                </button>
              )
            })}
          </div>
        </aside>

        <div className="min-w-0">
          {catalogStale && !catalogFailed && (
            <p role="status" className="mb-4 rounded-lg border border-amber/30 bg-amber/10 px-4 py-2.5 text-sm font-semibold text-navy">
              Showing the last updated list. Stock may differ.
            </p>
          )}

          <div className="mb-7 flex flex-col gap-3 border-b border-[var(--store-surface-border)] pb-5 sm:flex-row sm:items-center">
            <div className="relative block w-full sm:max-w-sm">
              <label htmlFor="catalog-search-input" className="sr-only">
                Search products
              </label>
              <SearchIcon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-faint" />
              <input
                id="catalog-search-input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by product, tag or category"
                className="store-field w-full pl-10 pr-9"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search query"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-navy-faint transition-colors hover:text-navy active:scale-95 cursor-pointer"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 sm:ml-auto sm:justify-end">
              <p className="text-xs font-semibold tabular text-navy-faint" aria-live="polite">
                {hasQuery ? (
                  <>
                    <span className="text-navy">{directMatches.length}</span> {directMatches.length === 1 ? 'match' : 'matches'}
                    {recommendedMatches.length > 0 && (
                      <span className="hidden sm:inline"> · {recommendedMatches.length} related items below</span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-navy">{directMatches.length}</span> products
                  </>
                )}
              </p>
              <label className="flex items-center gap-2 text-xs font-semibold text-navy-soft">
                <span className="sr-only sm:not-sr-only">Sort</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="store-field min-h-11 bg-[var(--store-surface-bg)] px-3 pr-8 text-sm font-semibold cursor-pointer"
                >
                  <option value="popular">Featured first</option>
                  <option value="latest">Newest arrivals</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                </select>
              </label>
            </div>
          </div>

          {/* Primary Product Grid (Direct Matches or full category) */}
          {visibleDirect.length > 0 && (
            <div className="grid grid-cols-1 gap-4 min-[370px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence initial={false}>
                {visibleDirect.map((product, index) => (
                  <motion.div
                    key={product.id || product.sku}
                    layout={reducedMotion ? false : true}
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
                    animate={{ opacity: 1, transform: 'translateY(0)' }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: reducedMotion ? 0.01 : 0.22,
                      delay: reducedMotion ? 0 : Math.min(index, 6) * 0.025,
                      ease: [0.25, 1, 0.5, 1],
                    }}
                    className="flex h-full"
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Shopee/Lazada-style Relevant Recommendations Feed */}
          {hasQuery && visibleRecommended.length > 0 && (
            <div className="mt-12 pt-8 border-t border-[var(--store-surface-border)]">
              <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-crimson">
                    {directMatches.length > 0 ? 'Shopper Discovery' : 'Cabinet Recommendations'}
                  </span>
                  <h3 className="font-serif text-xl font-semibold text-navy">
                    {directMatches.length > 0
                      ? 'More relevant Italian provisions you may like'
                      : 'Popular & related Italian provisions in Manila'}
                  </h3>
                  <p className="text-xs text-navy-soft">
                    {directMatches.length > 0
                      ? 'Related flavors, categories, and provisions matching your search interest.'
                      : `We do not have exact stock for "${query.trim()}" in Manila right now, but these authentic items are ready to dispatch.`}
                  </p>
                </div>
                <p className="text-xs font-semibold text-navy-faint tabular">
                  Showing {visibleRecommended.length} of {recommendedMatches.length} recommendations
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 min-[370px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence initial={false}>
                  {visibleRecommended.map((product, index) => (
                    <motion.div
                      key={`rec-${product.id || product.sku}`}
                      layout={reducedMotion ? false : true}
                      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
                      animate={{ opacity: 1, transform: 'translateY(0)' }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: reducedMotion ? 0.01 : 0.22,
                        delay: reducedMotion ? 0 : Math.min(index, 6) * 0.025,
                        ease: [0.25, 1, 0.5, 1],
                      }}
                      className="flex h-full"
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Zero Direct Match Banner (Pasabuy request + clear option) */}
          {directMatches.length === 0 && (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] px-6 py-8 text-center">
              <SearchIcon size={28} className="text-navy-faint" />
              <h2 className="mt-4 font-serif text-xl font-semibold text-navy">Looking for something specific?</h2>
              <p className="mt-1.5 max-w-md text-sm text-navy-soft">
                {loading
                  ? 'Loading the Manila cabinet…'
                  : catalogFailed
                    ? 'The catalog could not be loaded. Check your connection and try again: nothing here means empty.'
                    : query.trim()
                      ? `We do not have "${query.trim()}" in our Manila stock right now, but we can source it for you from Italy.`
                      : 'No products found matching these filters.'}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {catalogFailed && !loading && (
                  <button
                    onClick={refreshCatalog}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-crimson px-5 text-sm font-bold text-white transition-all duration-150 hover:bg-crimson-deep active:scale-[0.97] cursor-pointer shadow-sm"
                  >
                    Retry loading the catalog
                  </button>
                )}
                {query.trim() && (
                  <button
                    onClick={() =>
                      requestPasabuyItem({
                        item: query.trim(),
                        notes: `Requested item "${query.trim()}" from catalog search.`,
                      })
                    }
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

          {/* Infinite Scroll Sentinel & Accessible Load More Button */}
          {canLoadMore && (
            <div ref={loadMoreSentinelRef} className="mt-10 flex flex-col items-center justify-center py-4">
              <button
                type="button"
                onClick={handleManualLoadMore}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-navy transition-all duration-150 hover:border-crimson hover:text-crimson active:scale-[0.97] cursor-pointer shadow-sm"
              >
                <span>Load more products</span>
                <span className="rounded bg-navy/5 px-2 py-0.5 text-[10px] font-semibold text-navy-faint">
                  {totalAvailable - (visibleDirect.length + visibleRecommended.length)} remaining
                </span>
              </button>
            </div>
          )}

          {/* End of Catalog Indicator */}
          {!canLoadMore && (visibleDirect.length > 0 || visibleRecommended.length > 0) && (
            <div className="mt-10 border-t border-dashed border-[var(--store-surface-border)] pt-8 pb-4 text-center">
              <p className="text-xs font-semibold text-navy-faint tracking-wide">
                ✦ You have explored all matching Italian provisions in Manila stock
              </p>
              {query.trim() && (
                <button
                  type="button"
                  onClick={() =>
                    requestPasabuyItem({
                      item: query.trim(),
                      notes: `Requested item "${query.trim()}" from catalog search end.`,
                    })
                  }
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-crimson px-5 text-xs font-bold uppercase tracking-wider text-white transition-all duration-150 hover:bg-crimson-deep active:scale-[0.97] cursor-pointer shadow-sm"
                >
                  Request &ldquo;{query.trim()}&rdquo; via Pasabuy
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
