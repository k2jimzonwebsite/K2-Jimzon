import { lazy, Suspense } from 'react'
import { useStore } from '../context/StoreContext'
import { peso } from '../lib/formatMoney'
import ProductVisual from './ProductVisual'
import { StockPill } from './ui/bits'
import { PlusIcon } from './ui/icons'
import { productStock } from '../lib/cartInventory'
import { familyPriceRange } from '../lib/productFamilyPresentation'

const InteractiveReveal = lazy(() => import('./InteractiveReveal'))

export default function ProductCard({ product, compact = false, featured = false }) {
  const { openProduct, addToCart, setCartOpen, isWholesale, requestPasabuyItem, listedProducts } = useStore()
  const price = isWholesale ? product.wholesale_price : product.srp
  const multiple = product.family?.members.length > 1
  const name = multiple ? product.family.name : product.name
  const range = multiple ? familyPriceRange(product, listedProducts || [], isWholesale) : null
  const priceLabel = multiple ? range ? `${range.min === range.max ? '' : 'From '}${peso(range.min)}` : 'Choose an option' : peso(price)
  const optionCount = multiple ? `${product.family.members.length} options` : ''
  const productHref = `/product/${encodeURIComponent(product.sku)}`
  const followProduct = event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    openProduct(product.sku)
  }
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
      <article data-testid="product-card" className="grid h-full grid-cols-1 overflow-hidden rounded-2xl border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] shadow-[var(--store-surface-shadow)] md:grid-cols-[1.18fr_0.82fr]">
        <div className="product-img-surface relative min-h-64 overflow-hidden md:min-h-0">
          {product.afterImage ? (
            <Suspense fallback={<ProductVisual product={product} delivery="large" className="h-full w-full object-contain drop-shadow-xl" pad="p-7 md:p-12" />}>
              <InteractiveReveal beforeImage={product.img} afterImage={product.afterImage} />
            </Suspense>
          ) : (
            <ProductVisual product={product} delivery="large" className="h-full w-full object-contain drop-shadow-xl" pad="p-7 md:p-12" />
          )}
        </div>

        <div className="flex flex-col justify-center border-t border-[var(--store-surface-border)] p-6 md:border-l md:border-t-0 md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-crimson">Featured Import</p>
          <a href={productHref} onClick={followProduct} className="group mt-3 text-left cursor-pointer">
            <h3 className="font-serif text-2xl font-semibold leading-tight text-navy transition-colors duration-150 group-hover:text-crimson md:text-4xl">{name}</h3>
          </a>
          {!multiple && product.short && <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-navy-soft">{product.short}</p>}
          <div className="product-card-stock mt-5">{multiple ? <span className="text-sm font-medium text-navy-soft">{optionCount}</span> : <StockPill stock={stock} />}</div>
          <div className="mt-7 flex items-end justify-between gap-4 border-t border-line pt-5">
            <div>
              <p className="text-xs font-semibold text-navy-faint">Price</p>
              <p className="mt-0.5 text-xl font-bold tabular text-crimson md:text-2xl">{priceLabel}</p>
            </div>
            {multiple ? <button type="button" onClick={() => openProduct(product.sku)} className="min-h-11 rounded-lg bg-crimson px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy">Choose options</button> : stockUnknown ? (
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
      <a href={productHref} onClick={followProduct} aria-label={`View ${name}`} data-testid="product-image-btn" className="product-img-surface relative aspect-[4/5] overflow-hidden text-left cursor-pointer">
        <ProductVisual product={product} delivery="large" className="product-card-visual h-full w-full object-contain drop-shadow-lg" pad="p-4 sm:p-6" />
        {product.tag && <span className="absolute left-2.5 top-2.5 rounded-md bg-navy/90 px-2 py-1 text-xs font-bold uppercase tracking-[0.1em] text-cream">{product.tag}</span>}
      </a>

      <div className="flex flex-1 flex-col border-t border-[var(--store-surface-border)] p-3.5 sm:p-4">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.12em] text-navy-faint">{product.category || 'Italian import'}</p>
        <a href={productHref} onClick={followProduct} className="flex min-h-11 items-start text-left cursor-pointer">
          <h3 className="store-card-title line-clamp-2 min-h-10 font-sans font-bold text-navy transition-colors duration-150 group-hover:text-crimson">{name}</h3>
        </a>
        {!multiple && !compact && product.short && <p className="mt-2 hidden text-sm leading-relaxed text-navy-soft sm:line-clamp-2">{product.short}</p>}

        <div className="mt-auto">
          <div className="product-card-stock mt-3 border-t border-[var(--store-surface-border)] pt-3">{multiple ? <span className="text-sm font-medium text-navy-soft">{optionCount}</span> : <StockPill stock={stock} />}</div>
          <div className={`flex gap-2 pt-3 ${multiple ? 'flex-col items-stretch' : 'items-center justify-between'}`}>
            <div>
              <p className="font-sans text-lg font-bold tabular-nums text-crimson">{priceLabel}</p>
              {!multiple && isWholesale && <p className="font-sans text-xs tabular-nums text-navy-faint line-through">{peso(product.srp)}</p>}
            </div>
            {multiple ? <button type="button" onClick={() => openProduct(product.sku)} className="min-h-11 rounded-lg border border-line px-2 py-2 text-sm font-semibold text-navy hover:border-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy">Choose options</button> : stockUnknown ? (
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
