import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import ProductVisual from './ProductVisual'
import { CrimsonButton, Tricolor, QuantityStepper } from './ui/bits'
import { XIcon } from './ui/icons'

export default function CartDrawer() {
  const { cartOpen, setCartOpen, lines, subtotal, wholesaleSavings, isWholesale, go, count } = useStore()

  return (
    <AnimatePresence>
      {cartOpen && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Shopping cart">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
            className="absolute inset-0 bg-navy/20 backdrop-blur-md"
          />
          <motion.aside 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col rounded-l-3xl overflow-hidden bg-cream/95 backdrop-blur-xl shadow-float"
          >
            <Tricolor />
            <header className="flex items-center justify-between px-5 py-4">
              <h2 className="font-serif text-xl font-semibold">
                Your cart <span className="text-sm font-normal text-navy-soft">({count})</span>
              </h2>
              <button
                onClick={() => setCartOpen(false)}
                className="rounded-md p-1.5 text-navy-soft hover:bg-navy/5 hover:text-navy"
                aria-label="Close"
              >
                <XIcon />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5">
              {lines.length === 0 && (
                <p className="mt-10 text-center text-sm text-navy-soft">
                  Your pantry is empty. Let's find some Italian treasures.
                </p>
              )}
              {lines.map((line) => (
                <CartLine key={line.id} line={line} />
              ))}
            </div>

            <footer className="border-t border-line px-5 py-4 pb-safe">
              {isWholesale && wholesaleSavings > 0 && (
                <p className="mb-2 flex justify-between text-sm font-medium text-blue">
                  <span>Wholesale discount applied</span>
                  <span className="tabular">−{peso(wholesaleSavings)}</span>
                </p>
              )}
              <p className="mb-3 flex justify-between text-base font-semibold">
                <span>Subtotal</span>
                <span className="tabular">{peso(subtotal)}</span>
              </p>
              <CrimsonButton className="w-full" onClick={() => go('checkout')} disabled={lines.length === 0}>
                Go to checkout
              </CrimsonButton>
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
  const atLimit = qty >= product.stock
  return (
    <div className="flex gap-3 border-b border-line py-4 last:border-0">
      <ProductVisual product={product} className="h-16 w-16 shrink-0 rounded-md border border-line" pad="p-1" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-base font-medium leading-tight">{product.name}</p>
        <p className="mt-0.5 text-xs text-navy-soft">{product.size}</p>
        <div className="mt-2 flex items-center justify-between">
          <QuantityStepper value={qty} onChange={(val) => setQty(product.id, val)} max={product.stock} size="sm" />
          <span className="text-sm font-semibold text-crimson tabular">{peso(unit * qty)}</span>
        </div>
      </div>
    </div>
  )
}
