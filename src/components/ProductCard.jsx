import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import ProductVisual from './ProductVisual'
import InteractiveReveal from './InteractiveReveal'
import { StockPill } from './ui/bits'
import { PlusIcon } from './ui/icons'
import { productStock } from '../lib/cartInventory'

export default function ProductCard({ product, compact = false, featured = false }) {
  const { openProduct, addToCart, setCartOpen, isWholesale, requestPasabuyItem } = useStore()
  const price = isWholesale ? product.wholesale_price : product.srp
  const stock = productStock(product)
  const stockUnknown = stock === null
  const soldOut = !stockUnknown && stock <= 0

  const add = () => {
    if (soldOut || stockUnknown) return
    if (addToCart(product.sku).ok) setCartOpen(true)
  }

  const handlePasabuyRequest = () => {
    requestPasabuyItem({
      item: product.name,
      notes: `Requested from catalog item (SKU: ${product.sku || product.id})`,
      qty: 1,
    })
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
        </div>

        <div className="flex flex-col justify-center border-t border-[var(--store-surface-border)] p-6 md:border-l md:border-t-0 md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-crimson">Featured Import</p>
          <button onClick={() => openProduct(product.sku)} className="group mt-3 text-left cursor-pointer">
            <h3 className="font-serif text-2xl font-semibold leading-tight text-navy transition-colors duration-150 group-hover:text-crimson md:text-4xl">{product.name}</h3>
          </button>
          {product.short && <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-navy-soft">{product.short}</p>}
          <div className="product-card-stock mt-5"><StockPill stock={stock} /></div>
          <div className="mt-7 flex items-end justify-between gap-4 border-t border-line pt-5">
            <div>
              <p className="text-xs font-semibold text-navy-faint">Price</p>
              <p className="mt-0.5 text-xl font-bold tabular text-crimson md:text-2xl">{peso(price)}</p>
            </div>
            {stockUnknown ? (
              <button disabled className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-shell px-4 text-sm font-bold text-navy-soft opacity-70">
                Stock check pending
              </button>
            ) : soldOut ? (
              <button
                onClick={handlePasabuyRequest}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-crimson px-5 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-crimson-deep active:scale-[0.97] cursor-pointer shadow-sm"
              >
                Request via Pasabuy
              </button>
            ) : (
              <button
                onClick={add}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-crimson px-5 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-crimson-deep active:scale-[0.97] cursor-pointer"
              >
                Add to cart <PlusIcon size={15} />
              </button>
            )}
          </div>
        </div>
      </article>
    )
  }

  return (
    <article data-testid="product-card" className="product-card group flex h-full w-full flex-col overflow-hidden rounded-xl border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] shadow-[var(--store-surface-shadow)]">
      <button onClick={() => openProduct(product.sku)} aria-label={`View ${product.name}`} data-testid="product-image-btn" className="product-img-surface relative aspect-[4/5] overflow-hidden text-left cursor-pointer">
        <ProductVisual product={product} className="product-card-visual h-full w-full object-contain drop-shadow-lg" pad="p-4 sm:p-6" />
        {product.tag && <span className="absolute left-2.5 top-2.5 rounded-md bg-navy/90 px-2 py-1 text-xs font-bold uppercase tracking-[0.1em] text-cream">{product.tag}</span>}
      </button>

      <div className="flex flex-1 flex-col border-t border-[var(--store-surface-border)] p-3.5 sm:p-4">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.12em] text-navy-faint">{product.category || 'Italian import'}</p>
        <button onClick={() => openProduct(product.sku)} className="flex min-h-11 items-start text-left cursor-pointer">
          <h3 className="store-card-title line-clamp-2 min-h-10 font-sans font-bold text-navy transition-colors duration-150 group-hover:text-crimson">{product.name}</h3>
        </button>
        {!compact && product.short && <p className="mt-2 hidden text-sm leading-relaxed text-navy-soft sm:line-clamp-2">{product.short}</p>}

        <div className="mt-auto">
          <div className="product-card-stock mt-3 border-t border-[var(--store-surface-border)] pt-3"><StockPill stock={stock} /></div>
          <div className="flex items-center justify-between gap-2 pt-3">
            <div>
              <p className="font-sans text-lg font-bold tabular-nums text-crimson">{peso(price)}</p>
              {isWholesale && <p className="font-sans text-xs tabular-nums text-navy-faint line-through">{peso(product.srp)}</p>}
            </div>
            {stockUnknown ? (
              <button
                disabled
                aria-label={`Stock check pending for ${product.name}`}
                className="product-add-button flex min-h-11 items-center justify-center rounded-lg border border-line bg-shell/80 px-2.5 text-xs font-bold text-navy-soft opacity-70"
              >
                Pending
              </button>
            ) : soldOut ? (
              <button
                onClick={handlePasabuyRequest}
                aria-label={`Request ${product.name} on Pasabuy`}
                className="product-add-button flex min-h-11 items-center justify-center rounded-lg border border-line bg-shell/80 px-2.5 text-xs font-bold text-navy-soft transition-[transform,background-color,color] duration-150 hover:border-crimson hover:bg-crimson/5 hover:text-crimson active:scale-[0.97] cursor-pointer"
              >
                Request
              </button>
            ) : (
              <button
                onClick={add}
                aria-label={`Add ${product.name} to cart`}
                className="product-add-button flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] text-navy transition-[transform,background-color,color] duration-150 hover:border-crimson hover:bg-crimson hover:text-white active:scale-[0.97] cursor-pointer"
              >
                <PlusIcon size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
