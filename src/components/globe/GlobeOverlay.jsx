import { useState } from 'react'
import { motion } from 'motion/react'
import { useStore } from '../../context/StoreContext'
import { useGlobeCms } from '../../data/globeCms'
import { peso } from '../../data/products'
import ProductVisual from '../ProductVisual'
import { RedButton, TrustBadge, GhostButton, StockPill } from '../ui/bits'
import { StarIcon, XIcon, CheckIcon } from '../ui/icons'
import { productStock } from '../../lib/cartInventory'

export default function GlobeOverlay({ product, onClose }) {
  const { openProduct, addToCart, setCartOpen, isWholesale, requestPasabuyItem } = useStore()
  const { getProductReviews } = useGlobeCms()

  if (!product) return null

  const price = isWholesale ? (product.wholesale_price || product.wholesale) : (product.srp || product.retail)
  const stock = productStock(product)
  const stockUnknown = stock === null
  const soldOut = !stockUnknown && stock <= 0
  const reviews = getProductReviews(product.id || product.sku)

  const handleAddToCart = () => {
    if (stockUnknown) return
    if (soldOut) {
      requestPasabuyItem({
        item: product.name,
        notes: `Requested from review globe item: ${product.sku || product.id}`,
        qty: 1,
      })
      onClose()
      return
    }
    if (addToCart(product.sku || product.id, 1).ok) {
      setCartOpen(true)
      onClose()
    }
  }

  const handleViewDetails = () => {
    openProduct(product.sku || product.id)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-6"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy/50 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        initial={{ y: '100%', opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0.8 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative z-10 flex max-h-[85dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border-t border-line bg-[var(--store-surface-bg)] shadow-float md:max-h-[90dvh] md:flex-row md:rounded-3xl md:border"
      >
        {/* Mobile Drag Pill */}
        <div className="flex w-full justify-center pt-2 pb-1 md:hidden">
          <div className="h-1 w-10 rounded-full bg-navy/20" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] text-navy-soft shadow-sm transition-colors hover:bg-shell hover:text-navy cursor-pointer md:right-5 md:top-5"
          aria-label="Close review card"
        >
          <XIcon size={16} />
        </button>

        {/* Product Details Left Column */}
        <div className="flex flex-col border-b border-[var(--store-surface-border)] bg-shell/40 p-5 md:w-[42%] md:border-b-0 md:border-r md:p-8">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[var(--store-surface-border)] bg-[var(--product-img-bg)] p-6">
            <ProductVisual product={product} className="h-full w-full object-contain drop-shadow-md" />
          </div>

          <div className="mt-4 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <TrustBadge>Italy Direct</TrustBadge>
              <StockPill stock={stock} />
            </div>
            <h3 className="font-serif text-xl font-semibold text-navy leading-snug">
              {product.name}
            </h3>
            <p className="mt-1 text-lg font-bold text-crimson tabular">
              {peso(price)}
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <RedButton className="w-full py-3 text-sm font-bold shadow-sm" onClick={handleAddToCart} disabled={stockUnknown}>
                {stockUnknown ? 'Stock check pending' : soldOut ? 'Request on Pasabuy' : `Add to cart · ${peso(price)}`}
              </RedButton>
              <GhostButton className="w-full py-2.5 text-xs font-semibold" onClick={handleViewDetails}>
                View product details & specs
              </GhostButton>
            </div>
          </div>
        </div>

        {/* Customer Reviews Right Column */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-crimson mb-1.5">
              Verified Feedback
            </p>
            <h2 className="font-serif text-2xl font-semibold text-navy tracking-tight md:text-3xl">
              Customer reviews
            </h2>
            <p className="mt-1 text-xs text-navy-soft">
              Real notes from Manila buyers and Italian provisions enthusiasts.
            </p>
          </div>

          {reviews && reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((r, i) => (
                <blockquote
                  key={r.id || i}
                  className="rounded-xl border border-[var(--store-surface-border)] bg-paper p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-1 text-gold" aria-label={`${r.stars || 5} out of 5 stars`}>
                      {Array.from({ length: r.stars || 5 }).map((_, idx) => (
                        <StarIcon key={idx} size={13} />
                      ))}
                    </div>
                    {r.verified && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-forest">
                        <CheckIcon size={12} /> Verified purchase
                      </span>
                    )}
                  </div>
                  <p className="font-serif text-sm leading-relaxed text-navy italic">
                    &ldquo;{r.comment || r.body}&rdquo;
                  </p>
                  <p className="mt-2 text-[11px] font-semibold text-navy-faint">
                    by {r.author || 'Verified Manila Customer'} {r.location ? `(${r.location})` : ''}
                  </p>
                </blockquote>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--store-surface-border)] p-6 text-center text-xs text-navy-soft">
              <p className="font-semibold text-navy">New arrival in catalog</p>
              <p className="mt-1">
                Be the first to share feedback for this item after receiving your delivery.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
