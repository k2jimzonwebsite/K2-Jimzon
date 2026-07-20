import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../context/StoreContext';
import { useGlobeCms } from '../../data/globeCms';
import { CATEGORIES, COLLECTIONS, peso } from '../../data/products';
import { FAQS, LIFESTYLE, REVIEWS } from '../../data/site';
import ProductGlobe from '../globe/ProductGlobe';
import GlobeOverlay from '../globe/GlobeOverlay';
import ProductVisual from '../ProductVisual';
import InteractiveReveal from '../InteractiveReveal';
import { BizBadge, RedButton, StockPill, TrustBadge, Tricolor, GhostButton, Kicker } from '../ui/bits';
import ProductCard from '../ProductCard';
import { ArrowIcon, CheckIcon, PlaneIcon, PlusIcon, StarIcon, MinusIcon } from '../ui/icons';

function HomeCatalog() {
  const { products, category, query } = useStore()
  const [page, setPage] = useState(1)
  const PER_PAGE = 24

  // Filter products based on selected category and query
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = category === 'All' || p.category === category
      const matchQuery = !query || p.title?.toLowerCase().includes(query.toLowerCase())
      return matchCat && matchQuery
    })
  }, [products, category, query])

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1)
  }, [category, query])

  const paginatedProducts = filteredProducts.slice(0, page * PER_PAGE)
  const hasMore = paginatedProducts.length < filteredProducts.length

  return (
    <section id="catalog" className="mx-auto max-w-7xl px-4 py-16 scroll-reveal">
      <div className="flex flex-col items-center justify-center text-center mb-12">
        <Kicker className="mb-2 text-crimson">The Pantry</Kicker>
        <h2 className="font-serif text-3xl font-medium tracking-tight text-navy md:text-4xl">
          {category === 'All' ? 'Curated Italian Imports' : category}
        </h2>
        {query && <p className="mt-2 text-navy-soft">Searching for "{query}"</p>}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="py-20 text-center text-navy-soft">
          <p>No products found matching your criteria.</p>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:gap-8">
            {paginatedProducts.map((p, i) => (
              <li key={p.sku} className="flex h-full">
                <ProductCard product={p} index={i} compact />
              </li>
            ))}
          </ul>
          
          {hasMore && (
            <div className="mt-12 flex justify-center">
              <GhostButton onClick={() => setPage(p => p + 1)} className="px-8 py-3">
                Load More Products
              </GhostButton>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default HomeCatalog
