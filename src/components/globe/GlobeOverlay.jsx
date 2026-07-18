import { useState } from 'react'
import { motion } from 'motion/react'
import { useStore } from '../../context/StoreContext'
import { useGlobeCms } from '../../data/globeCms'
import { peso } from '../../data/products'
import ProductVisual from '../ProductVisual'
import { RedButton, TrustBadge, GhostButton } from '../ui/bits'
import { StarIcon } from '../ui/icons'

export default function GlobeOverlay({ product, onClose }) {
  const { openProduct, addToCart, setCartOpen, isWholesale } = useStore()
  const { getProductReviews } = useGlobeCms()

  if (!product) return null

  const price = isWholesale ? product.wholesale : product.retail
  const reviews = getProductReviews(product.id)

  const handleAddToCart = () => {
    addToCart(product.id, 1)
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
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-md" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl bg-cream/95 backdrop-blur-xl shadow-float flex flex-col md:flex-row"
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

        {/* Product Visual Column */}
        <div className="w-full md:w-[40%] bg-shell flex-shrink-0 relative overflow-hidden flex flex-col">
          <div className="flex-1 min-h-[300px] relative">
            <ProductVisual product={product} className="absolute inset-0 h-full w-full" pad="p-12" />
          </div>
          <div className="p-6 bg-shell/80 border-t border-line/50 backdrop-blur-md relative z-10 flex flex-col items-center text-center">
            <TrustBadge className="mb-3">100% authentic · {product.origin}</TrustBadge>
            <h3 className="font-serif text-xl font-semibold text-navy">{product.name}</h3>
            <div className="mt-4 flex flex-col w-full gap-2">
              <RedButton className="w-full py-3" onClick={handleAddToCart}>
                Add to cart — {peso(price)}
              </RedButton>
              <GhostButton className="w-full py-3" onClick={handleViewDetails}>
                View full details
              </GhostButton>
            </div>
          </div>
        </div>

        {/* Reviews Column */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-white/50">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-crimson mb-2">Customer Feedback</p>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-navy tracking-tight">
              What people are saying about {product.name}
            </h2>
          </div>

          {reviews.length > 0 ? (
            <div className="space-y-6">
              {reviews.map((r, i) => (
                <blockquote 
                  key={r.id} 
                  className={`relative rounded-2xl bg-cream p-6 md:p-8 shadow-sm border border-line transition-all hover:shadow-card ${i === 0 ? 'border-l-4 border-l-crimson' : ''}`}
                >
                  <div className="flex gap-1 text-gold mb-4" aria-label={`${r.stars} out of 5 stars`}>
                    {Array.from({ length: r.stars }).map((_, idx) => (
                      <StarIcon key={idx} size={16} />
                    ))}
                  </div>
                  <p className="font-serif text-lg md:text-xl leading-relaxed text-navy mb-6">
                    “{r.text}”
                  </p>
                  <footer className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-shell border border-line flex items-center justify-center font-serif font-bold text-navy-soft">
                      {r.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">{r.name}</p>
                      <p className="text-xs text-navy-faint">{r.channel}</p>
                    </div>
                  </footer>
                </blockquote>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center rounded-2xl border border-dashed border-line/80 bg-shell/30">
              <StarIcon size={32} className="text-line mb-4" />
              <p className="font-serif text-xl text-navy-soft">No reviews yet.</p>
              <p className="text-sm text-navy-faint mt-1 max-w-xs">Be the first to leave a review for this product after purchasing.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
