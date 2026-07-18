import { useState } from 'react'
import { motion } from 'motion/react'
import { useStore } from '../../context/StoreContext'
import { useGlobeCms } from '../../data/globeCms'
import { peso } from '../../data/products'
import ProductVisual from '../ProductVisual'
import { RedButton, StockPill, TrustBadge } from '../ui/bits'
import { StarIcon } from '../ui/icons'

export default function GlobeOverlay({ product, onClose }) {
  const { openProduct, addToCart, setCartOpen, isWholesale } = useStore()
  const { getProductReviews } = useGlobeCms()
  const [qty, setQty] = useState(1)

  if (!product) return null

  const price = isWholesale ? product.wholesale : product.retail
  const reviews = getProductReviews(product.id)

  const handleAddToCart = () => {
    addToCart(product.id, qty)
    setCartOpen(true)
    onClose()
  }

  const handleViewDetails = () => {
    openProduct(product.id)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy/30 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 24 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-cream/95 backdrop-blur-xl shadow-float flex flex-col md:flex-row"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-card border border-line hover:bg-shell transition-colors"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        {/* Image column */}
        <div className="w-full md:w-[45%] bg-shell flex-shrink-0 relative overflow-hidden">
          <div className="aspect-square md:aspect-auto md:h-full">
            <ProductVisual product={product} className="h-full w-full" pad="p-8" />
          </div>
          {/* Tricolor accent */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-crimson" />
        </div>

        {/* Info column */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          {/* Trust + Stock */}
          <div className="flex flex-wrap items-center gap-2">
            <TrustBadge>100% authentic · {product.origin}</TrustBadge>
            <StockPill stock={product.stock} />
          </div>

          {/* Product name */}
          <h2 className="mt-3 font-serif text-2xl font-semibold leading-tight tracking-tight md:text-3xl text-navy">
            {product.name}
          </h2>
          <p className="mt-1.5 text-sm text-navy-soft">
            {product.size} · {product.origin}
          </p>

          {/* Price */}
          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-crimson tabular">{peso(price)}</span>
            {isWholesale && (
              <span className="text-base text-navy-faint line-through tabular">{peso(product.retail)}</span>
            )}
          </div>

          {/* Why buy / Why rare */}
          {(product.whyBuy || product.whyRare) && (
            <div className="mt-5 space-y-3 rounded-lg bg-shell/60 p-4">
              {product.whyBuy && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-soft">Why buy this</p>
                  <p className="mt-1 text-sm leading-relaxed text-navy-soft">{product.whyBuy}</p>
                </div>
              )}
              {product.whyRare && (
                <div className="border-t border-line pt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-soft">Why rare</p>
                  <p className="mt-1 text-sm leading-relaxed text-navy-soft">{product.whyRare}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <RedButton className="flex-1 py-3.5 text-base" onClick={handleAddToCart}>
              Add to cart — {peso(price * qty)}
            </RedButton>
            <button
              onClick={handleViewDetails}
              className="flex-1 rounded-lg border border-navy/20 py-3.5 text-base font-semibold text-navy transition-colors hover:bg-shell"
            >
              View full details
            </button>
          </div>

          {/* Reviews section */}
          {reviews.length > 0 && (
            <div className="mt-8 border-t border-line pt-6">
              <div className="flex items-center gap-2 mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-crimson">Customer reviews</p>
                <span className="text-sm text-navy-faint">({reviews.length})</span>
              </div>
              <div className="space-y-4">
                {reviews.slice(0, 3).map((r) => (
                  <blockquote key={r.id} className="rounded-xl bg-shell/50 p-4">
                    <div className="flex gap-0.5 text-gold">
                      {Array.from({ length: r.stars }).map((_, i) => (
                        <StarIcon key={i} size={12} />
                      ))}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-navy-soft">"{r.text}"</p>
                    <footer className="mt-3 flex items-center gap-2">
                      <p className="text-sm font-semibold text-navy">{r.name}</p>
                      <span className="text-xs text-navy-faint">· {r.channel}</span>
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          )}

          {/* Filipino pairings */}
          {product.pairings && product.pairings.length > 0 && (
            <div className="mt-6 border-t border-line pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-faint">
                How Filipinos enjoy it
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.pairings.map((p) => (
                  <span key={p} className="rounded-full bg-shell px-3 py-1.5 text-xs font-medium text-navy-soft">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
