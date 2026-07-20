import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import ProductVisual from './ProductVisual'
import InteractiveReveal from './InteractiveReveal'
import { TrustBadge, StockPill } from './ui/bits'

export default function ProductCard({ product, index = 0, compact = false, featured = false }) {
  const { openProduct, addToCart, setCartOpen, isWholesale } = useStore()
  const price = isWholesale ? product.wholesale_price : product.srp

  return (
    <article
      className={`group flex w-full h-full overflow-hidden rounded-3xl bg-cream/95 md:bg-cream/90 md:backdrop-blur-md shadow-card transition-all duration-300 hover:shadow-float hover:-translate-y-1 hover:bg-cream ${featured ? 'flex-col md:flex-row' : 'flex-col'}`}
    >
      {featured ? (
        <div className="relative text-left h-[280px] sm:h-[350px] md:h-[400px] md:h-full md:w-[55%] flex-shrink-0">
          <div className="w-full overflow-hidden bg-transparent flex items-center justify-center h-full aspect-auto">
            {product.afterImage ? (
              <InteractiveReveal beforeImage={product.img} afterImage={product.afterImage} />
            ) : (
              <ProductVisual product={product} className="h-full w-full object-contain" pad="p-4 md:p-8" />
            )}
          </div>
        </div>
      ) : (
        <button onClick={() => openProduct(product.sku)} className="relative text-left flex flex-col flex-1">
          <div className="relative w-full overflow-hidden bg-transparent flex items-center justify-center aspect-[4/5] p-6">
            {/* Museum Cabinet Glow */}
            <div 
              className="absolute inset-0 opacity-0 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-30"
              style={{
                background: `radial-gradient(circle at 50% 50%, oklch(0.85 0.08 ${product.hue ?? 40}), transparent 75%)`
              }}
              aria-hidden="true"
            />
            <ProductVisual product={product} className="relative z-10 h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.08] drop-shadow-xl" pad="p-2" />
          </div>
          <div className="absolute left-2 top-2 sm:left-3 sm:top-3 pointer-events-none flex flex-col items-start gap-1.5 z-20">
            {product.tag && (
              <span className="rounded-full bg-crimson px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest text-white shadow-sm">
                {product.tag}
              </span>
            )}
          </div>
        </button>
      )}
      <div className={`flex flex-col ${featured ? 'p-5 sm:p-6 md:p-8 lg:p-12 border-t md:border-t-0 md:border-l border-line md:w-[45%] justify-center' : 'flex-1 p-2 sm:p-4 md:p-6 border-t border-line/50'}`}>
        {featured && product.tag && (
          <div className="flex items-center gap-2 mb-3 md:mb-6">
              <span className="rounded-full bg-crimson px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-white shadow-sm">
                {product.tag}
              </span>
          </div>
        )}
        <button onClick={() => openProduct(product.sku)} className="text-left mb-2 sm:mb-3">
          <h3 className={`font-serif font-medium leading-snug transition-colors group-hover:text-crimson line-clamp-2 ${featured ? 'text-xl sm:text-2xl md:text-3xl lg:text-4xl text-navy' : 'text-sm sm:text-base text-navy'}`}>
            {product.name}
          </h3>
        </button>
        {!compact && (
          <p className={`font-light truncate ${featured ? 'text-sm sm:text-base mb-4 sm:mb-8 text-navy-soft' : 'text-xs mb-3 text-navy-faint'}`}></p>
        )}
        <div className="mb-auto" />
        <div className={`border-t border-line flex items-center justify-between ${featured ? 'mt-4 sm:mt-6 md:mt-8 pt-4 sm:pt-6' : 'mt-auto pt-2.5 sm:pt-4'}`}>
          <div>
            <p className={`font-bold tabular text-crimson ${featured ? 'text-lg sm:text-xl md:text-2xl' : 'text-sm sm:text-base lg:text-lg'}`}>{peso(price)}</p>
            {isWholesale && (
              <p className="text-xs line-through tabular text-navy-faint">{peso(product.srp)}</p>
            )}
          </div>
          <button
            onClick={() => { addToCart(product.sku); setCartOpen(true) }}
            className={`rounded-lg bg-crimson font-semibold text-white transition-all hover:bg-crimson-deep active:scale-95 shadow-card ${featured ? 'px-5 sm:px-8 py-2.5 sm:py-3.5 text-sm' : 'px-3 py-1.5 text-xs sm:text-sm sm:px-4 sm:py-2.5'}`}
          >
            Add
          </button>
        </div>
      </div>
    </article>
  )
}
