import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '../context/StoreContext'
import { CATEGORIES, products } from '../data/products'
import ProductCard from './ProductCard'
import { CheckIcon } from './ui/icons'

export default function CatalogGrid() {
  const { query, category, setCategory } = useStore()
  const [sortBy, setSortBy] = useState('popular') // popular, latest, price_asc, price_desc

  // Filter products based on search query and category
  const filteredProducts = useMemo(() => {
    let result = products
    if (category !== 'All') {
      // Handle the fact that our category data might not exactly match
      result = result.filter(p => p.category === category || (category === 'Snacks' && p.category.includes('Biscuits')))
    }
    
    if (query.trim().length > 0) {
      const q = query.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.short.toLowerCase().includes(q) || (p.tag && p.tag.toLowerCase().includes(q)))
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'price_asc') return a.retail - b.retail
      if (sortBy === 'price_desc') return b.retail - a.retail
      if (sortBy === 'popular') return (b.tag === 'Bestseller' ? -1 : 0) - (a.tag === 'Bestseller' ? -1 : 0)
      return 0 // latest / default
    })

    return result
  }, [query, category, sortBy])

  return (
    <section className="mx-auto max-w-7xl px-4 py-16" id="catalog">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        
        {/* Left Sidebar: Categories */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-24 bg-cream/90 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-line">
            <h3 className="font-serif text-lg font-semibold tracking-tight text-navy mb-4 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-crimson">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              Categories
            </h3>
            <ul className="flex lg:flex-col gap-2 lg:gap-0 lg:space-y-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 hide-scrollbar">
              {CATEGORIES.map(cat => (
                <li key={cat}>
                  <button
                    onClick={() => setCategory(cat)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between group whitespace-nowrap lg:whitespace-normal ${category === cat ? 'bg-crimson text-white font-semibold shadow-card' : 'text-navy hover:bg-line/50'}`}
                  >
                    {cat}
                    {category === cat && <CheckIcon size={14} className="text-white opacity-80" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Area: Grid and Sorting */}
        <div className="flex-1 min-w-0">
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-cream/90 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-line">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-navy-faint font-medium mr-2">Sort by:</span>
              {['popular', 'latest'].map(type => (
                <button
                  key={type}
                  onClick={() => setSortBy(type)}
                  className={`px-4 py-2 rounded-lg capitalize transition-colors ${sortBy === type ? 'bg-navy text-white shadow-sm' : 'bg-transparent text-navy hover:bg-line/50'}`}
                >
                  {type}
                </button>
              ))}
              <div className="relative">
                <select 
                  className={`appearance-none bg-transparent pl-4 pr-8 py-2 rounded-lg transition-colors cursor-pointer border-none outline-none ${sortBy.includes('price') ? 'bg-navy text-white shadow-sm' : 'text-navy hover:bg-line/50'}`}
                  value={sortBy.includes('price') ? sortBy : 'price'}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="price" disabled hidden>Price</option>
                  <option value="price_asc" className="text-navy bg-white">Low to High</option>
                  <option value="price_desc" className="text-navy bg-white">High to Low</option>
                </select>
                <svg className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 ${sortBy.includes('price') ? 'text-white' : 'text-navy-faint'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            <div className="text-sm text-navy-faint tabular-nums">
              <span className="font-semibold text-navy">{filteredProducts.length}</span> items
            </div>
          </div>

          {/* Product Grid - The Cabinet */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            <AnimatePresence>
              {filteredProducts.map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="h-full flex"
                >
                  <ProductCard product={p} compact={false} />
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-20 text-center text-navy-faint bg-cream/50 rounded-3xl border border-dashed border-line">
                No products found matching your search.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
