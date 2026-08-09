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
  const { getProductReviews, cmsError } = useGlobeCms()

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
        className="relative z-10 flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-y-auto rounded-3xl bg-cream/95 shadow-float backdrop-blur-xl md:flex-row md:overflow-hidden"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper/95 shadow-card transition-colors hover:bg-shell md:right-4 md:top-4"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        {/* Product Visual Column */}
        <div className="w-full md:w-[40%] bg-shell flex-shrink-0 relative overflow-hidden flex flex-col">
          <div className="relative min-h-[220px] flex-1 sm:min-h-[280px] md:min-h-[300px]">
            <ProductVisual product={product} className="absolute inset-0 h-full w-full" pad="p-8 sm:p-12" />
          </div>
          <div className="p-6 bg-shell/80 border-t border-line/50 backdrop-blur-md relative z-10 flex flex-col items-center text-center">
            <TrustBadge className="mb-3">Recorded origin · {product.origin || 'Imported'}</TrustBadge>
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
        <div className="flex-1 bg-[var(--store-surface-bg)]/60 p-6 md:overflow-y-auto md:p-12">
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
              <p className="font-sans text-lg font-bold text-navy-soft">{cmsError ? 'Review details are reconnecting.' : 'No published reviews yet.'}</p>
              <p className="mt-1 max-w-xs text-sm leading-6 text-navy-faint">{cmsError ? 'The product remains available to browse while the review service reconnects.' : 'Published customer feedback will appear here after verification.'}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
