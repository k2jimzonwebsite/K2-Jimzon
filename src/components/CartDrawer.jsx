import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import ProductVisual from './ProductVisual'
import { CrimsonButton, Tricolor, QuantityStepper } from './ui/bits'
import { BagIcon, XIcon, ShieldCheckIcon } from './ui/icons'

export default function CartDrawer() {
  const { cartOpen, setCartOpen, lines, subtotal, wholesaleSavings, isWholesale, go, count } = useStore()

  useEffect(() => {
    if (cartOpen) {
      document.body.style.overflow = 'hidden'
      const closeOnEscape = (event) => {
        if (event.key === 'Escape') setCartOpen(false)
      }
      window.addEventListener('keydown', closeOnEscape)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', closeOnEscape)
      }
    }
  }, [cartOpen, setCartOpen])

  return (
    <AnimatePresence>
      {cartOpen && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Shopping cart">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
            className="absolute inset-0 bg-navy/35 backdrop-blur-[2px] cursor-pointer"
          />
          <motion.aside
            initial={{ transform: 'translateX(100%)' }}
            animate={{ transform: 'translateX(0)' }}
            exit={{ transform: 'translateX(100%)' }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-0 flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-l border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] shadow-float"
          >
            <Tricolor />
            <header className="flex items-center justify-between px-5 py-4 border-b border-[var(--store-surface-border)]">
              <h2 className="font-serif text-xl font-semibold text-navy">
                Your cart <span className="text-sm font-normal text-navy-soft">({count})</span>
              </h2>
              <button
                onClick={() => setCartOpen(false)}
                className="rounded-md p-2 text-navy-soft hover:bg-navy/5 hover:text-navy min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Close"
              >
                <XIcon />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5">
              {lines.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--product-img-bg)] text-navy-soft">
                    <BagIcon size={21} />
                  </span>
                  <h3 className="mt-4 font-serif text-xl font-semibold text-navy">Your cart is empty</h3>
                  <p className="mt-1 max-w-xs text-sm leading-relaxed text-navy-soft">
                    Browse our Italian catalog and add items to your order request.
                  </p>
                  <button
                    onClick={() => { setCartOpen(false); go('catalog') }}
                    className="mt-5 min-h-11 rounded-lg border border-[var(--store-surface-border)] px-4 text-sm font-bold hover:border-navy/30 text-navy bg-[var(--store-surface-bg)] cursor-pointer"
                  >
                    Browse catalog
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[var(--store-surface-border)]">
                  {lines.map((line) => (
                    <CartLine key={line.id} line={line} />
                  ))}

                  {/* Concierge Flow Reminder */}
                  <div className="py-4 my-2 rounded-lg bg-shell/60 p-3.5 text-xs text-navy-soft border border-line/60">
                    <div className="flex items-center gap-1.5 font-semibold text-navy mb-1.5">
                      <ShieldCheckIcon size={14} className="text-forest" />
                      <span>How order requests work</span>
                    </div>
                    <ol className="space-y-1 pl-4 list-decimal text-[11px] leading-relaxed text-navy-soft">
                      <li>Submit your request with no upfront payment</li>
                      <li>Our staff checks current Manila stock</li>
                      <li>We arrange delivery with a courier</li>
                      <li>Pay when delivered or via bank transfer</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            <footer className="border-t border-[var(--store-surface-border)] px-5 py-4 pb-safe bg-[var(--store-surface-bg)]">
              {isWholesale && wholesaleSavings > 0 && (
                <p className="mb-2 flex justify-between text-sm font-medium text-blue">
                  <span>Wholesale discount applied</span>
                  <span className="tabular">−{peso(wholesaleSavings)}</span>
                </p>
              )}
              <div className="mb-3 flex justify-between text-base font-semibold text-navy">
                <span>Subtotal</span>
                <span className="tabular text-lg font-bold text-crimson">{peso(subtotal)}</span>
              </div>
              <CrimsonButton
                className="w-full py-3.5 text-base font-bold shadow-sm cursor-pointer"
                onClick={() => { setCartOpen(false); go('checkout') }}
                disabled={lines.length === 0}
              >
                Review order request
              </CrimsonButton>
              <p className="mt-2.5 text-center text-xs leading-relaxed text-navy-faint">
                We check stock in Manila before confirming your order.
              </p>
            </footer>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

function CartLine({ line }) {
  const { setQty } = useStore()
  const { product, qty, unit } = line
  return (
    <div className="flex gap-3 py-4">
      <ProductVisual product={product} className="h-16 w-16 shrink-0 rounded-md border border-[var(--store-surface-border)]" pad="p-1" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-base font-medium leading-tight text-navy">{product.name}</p>
        <p className="mt-0.5 text-xs text-navy-soft">{product.size}</p>
        <div className="mt-2 flex items-center justify-between">
          <QuantityStepper value={qty} onChange={(val) => setQty(product.id, val)} max={product.stock} size="sm" />
          <span className="text-sm font-bold text-crimson tabular">{peso(unit * qty)}</span>
        </div>
      </div>
    </div>
  )
}
