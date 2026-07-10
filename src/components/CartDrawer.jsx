import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import ProductVisual from './ProductVisual'
import { CrimsonButton, Tricolor } from './ui/bits'
import { MinusIcon, PlusIcon, XIcon } from './ui/icons'

export default function CartDrawer() {
  const { cartOpen, setCartOpen, lines, subtotal, wholesaleSavings, isWholesale, go, count } = useStore()

  if (!cartOpen) return null

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Shopping cart">
      <button
        aria-label="Close cart"
        onClick={() => setCartOpen(false)}
        className="absolute inset-0 bg-navy/40 backdrop-blur-[2px]"
      />
      <aside className="rise absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-paper shadow-float">
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
              Your cart is empty — add something from the shop.
            </p>
          )}
          {lines.map((line) => (
            <CartLine key={line.id} line={line} />
          ))}
        </div>

        <footer className="border-t border-line px-5 py-4">
          {isWholesale && wholesaleSavings > 0 && (
            <p className="mb-2 flex justify-between text-[13px] font-medium text-blue">
              <span>Wholesale discount applied</span>
              <span className="tabular">−{peso(wholesaleSavings)}</span>
            </p>
          )}
          <p className="mb-3 flex justify-between text-[15px] font-semibold">
            <span>Subtotal</span>
            <span className="tabular">{peso(subtotal)}</span>
          </p>
          <CrimsonButton className="w-full" onClick={() => go('checkout')} disabled={lines.length === 0}>
            Go to checkout
          </CrimsonButton>
        </footer>
      </aside>
    </div>
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
        <p className="truncate font-serif text-[15px] font-medium leading-tight">{product.name}</p>
        <p className="mt-0.5 text-[12px] text-navy-soft">{product.size}</p>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center rounded-md border border-navy/15">
            <button onClick={() => setQty(product.id, qty - 1)} className="p-1.5 text-navy-soft hover:text-navy" aria-label="Decrease quantity">
              <MinusIcon size={13} />
            </button>
            <span className="w-7 text-center text-[13px] font-semibold tabular">{qty}</span>
            <button
              onClick={() => setQty(product.id, qty + 1)}
              disabled={atLimit}
              className="p-1.5 text-navy-soft hover:text-navy disabled:cursor-not-allowed disabled:opacity-35"
              aria-label={atLimit ? 'Maximum available stock reached' : 'Increase quantity'}
            >
              <PlusIcon size={13} />
            </button>
          </div>
          <span className="text-[14px] font-semibold text-crimson tabular">{peso(unit * qty)}</span>
        </div>
      </div>
    </div>
  )
}
