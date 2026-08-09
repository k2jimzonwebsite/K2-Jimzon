import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import ProductVisual from './ProductVisual'
import InteractiveReveal from './InteractiveReveal'
import { StockPill } from './ui/bits'
import { ArrowIcon, PlusIcon } from './ui/icons'

export default function ProductCard({ product, compact = false, featured = false }) {
  const { openProduct, addToCart, setCartOpen, isWholesale } = useStore()
  const price = isWholesale ? product.wholesale_price : product.srp
  const stock = Number(product.stock ?? product.stock_available ?? 0)
  const soldOut = stock <= 0

  const add = () => {
    if (soldOut) return
    addToCart(product.sku)
    setCartOpen(true)
  }

  if (featured) {
    return (
      <article data-testid="product-card" className="grid h-full overflow-hidden rounded-2xl border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] shadow-[var(--store-surface-shadow)] md:grid-cols-[1.18fr_0.82fr]">
        <div className="product-img-surface relative min-h-64 overflow-hidden md:min-h-0">
          {product.afterImage ? (
            <InteractiveReveal beforeImage={product.img} afterImage={product.afterImage} />
          ) : (
            <ProductVisual product={product} className="h-full w-full object-contain drop-shadow-xl" pad="p-7 md:p-12" />
          )}
          {product.tag && <span className="absolute left-4 top-4 rounded-md bg-navy px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cream">{product.tag}</span>}
        </div>

        <div className="flex flex-col justify-center border-t border-[var(--store-surface-border)] p-6 md:border-l md:border-t-0 md:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">New to the cabinet</p>
          <button onClick={() => openProduct(product.sku)} className="group mt-3 text-left">
            <h3 className="font-serif text-2xl font-semibold leading-tight text-navy transition-colors duration-150 group-hover:text-crimson md:text-4xl">{product.name}</h3>
          </button>
          {product.short && <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-navy-soft">{product.short}</p>}
          <div className="mt-5"><StockPill stock={stock} /></div>
          <div className="mt-7 flex items-end justify-between gap-4 border-t border-line pt-5">
            <div>
              <p className="text-xs font-semibold text-navy-faint">Current price</p>
              <p className="mt-0.5 text-xl font-bold tabular text-crimson md:text-2xl">{peso(price)}</p>
            </div>
            <button onClick={add} disabled={soldOut} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-crimson px-5 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-crimson-deep active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-line disabled:text-navy-faint">
              {soldOut ? 'Sold out' : <>Add to cart <PlusIcon size={15} /></>}
            </button>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article data-testid="product-card" className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] shadow-[var(--store-surface-shadow)] transition-[transform,border-color,box-shadow] duration-200 ease-out-quart hover:-translate-y-0.5 hover:border-navy/20 hover:shadow-card">
      <button onClick={() => openProduct(product.sku)} data-testid="product-image-btn" className="product-img-surface relative aspect-[4/5] overflow-hidden text-left">
        <ProductVisual product={product} className="h-full w-full object-contain drop-shadow-lg transition-transform duration-200 ease-out-quart group-hover:scale-[1.035]" pad="p-4 sm:p-6" />
        {product.tag && <span className="absolute left-2.5 top-2.5 rounded-md bg-navy/90 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-cream">{product.tag}</span>}
      </button>

      <div className="flex flex-1 flex-col border-t border-[var(--store-surface-border)] p-3.5 sm:p-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-navy-faint">{product.category || 'Italian import'}</p>
        <button onClick={() => openProduct(product.sku)} className="text-left">
          <h3 className="line-clamp-2 font-serif text-[15px] font-semibold leading-snug text-navy transition-colors duration-150 group-hover:text-crimson sm:text-base">{product.name}</h3>
        </button>
        {!compact && product.short && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-navy-soft">{product.short}</p>}
        <div className="mt-3"><StockPill stock={stock} /></div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <div>
            <p className="text-base font-bold tabular text-crimson sm:text-lg">{peso(price)}</p>
            {isWholesale && <p className="text-[11px] tabular text-navy-faint line-through">{peso(product.srp)}</p>}
          </div>
          <button
            onClick={add}
            disabled={soldOut}
            aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name} to cart`}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-crimson bg-crimson text-white transition-[transform,background-color] duration-150 hover:bg-crimson-deep active:scale-[0.97] disabled:cursor-not-allowed disabled:border-line disabled:bg-shell disabled:text-navy-faint"
          >
            {soldOut ? <span className="px-2 text-[10px] font-bold uppercase tracking-wide">Out</span> : <PlusIcon size={17} />}
          </button>
        </div>
      </div>
    </article>
  )
}
