import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import ProductVisual from './ProductVisual'
import InteractiveReveal from './InteractiveReveal'
import { TrustBadge, StockPill } from './ui/bits'

export default function ProductCard({ product, index = 0, compact = false, featured = false }) {
  const { openProduct, addToCart, setCartOpen, isWholesale } = useStore()
  const price = isWholesale ? product.wholesale : product.retail

  return (
    <article
      className={`rise group flex h-full overflow-hidden rounded-3xl bg-cream/90 backdrop-blur-md shadow-card transition-all duration-300 hover:shadow-float hover:-translate-y-1 hover:bg-cream ${featured ? 'flex-col md:flex-row' : 'flex-col'}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {featured ? (
        <div className="relative text-left h-[400px] md:h-full md:w-[55%] flex-shrink-0">
          <div className="w-full overflow-hidden bg-transparent flex items-center justify-center h-full aspect-auto">
            <InteractiveReveal beforeImage={product.img} afterImage={product.afterImage} />
          </div>
        </div>
      ) : (
        <button onClick={() => openProduct(product.id)} className="relative text-left h-full flex flex-col">
          <div className="w-full overflow-hidden bg-transparent flex items-center justify-center aspect-square">
            <ProductVisual product={product} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]" />
          </div>
          <span className="absolute left-3 top-3 pointer-events-none">
            <TrustBadge solid>Authentic</TrustBadge>
          </span>
          {product.tag && (
            <span className="absolute right-3 top-3 rounded-full bg-crimson px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-white shadow-sm">
              {product.tag}
            </span>
          )}
        </button>
      )}
      <div className={`flex flex-col ${featured ? 'p-8 md:p-12 border-t md:border-t-0 md:border-l border-line md:w-[45%] justify-center' : 'flex-1 p-4'}`}>
        {featured && (
          <div className="flex items-center gap-2 mb-6">
            <TrustBadge solid>Authentic</TrustBadge>
            {product.tag && (
              <span className="rounded-full bg-crimson px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-white shadow-sm">
                {product.tag}
              </span>
            )}
          </div>
        )}
        <button onClick={() => openProduct(product.id)} className="text-left mb-3">
          <h3 className={`font-serif font-medium leading-snug transition-colors group-hover:text-crimson ${featured ? 'text-3xl md:text-4xl text-navy' : 'text-base text-navy'}`}>
            {compact ? product.short : product.name}
          </h3>
        </button>
        {!compact && (
          <p className={`font-light ${featured ? 'text-base mb-8 text-navy-soft' : 'text-xs mb-3 text-navy-faint'}`}>{product.size} · {product.origin}</p>
        )}
        <div className="mb-auto">
          <StockPill stock={product.stock} />
        </div>
        <div className="mt-8 pt-6 border-t border-line flex items-center justify-between">
          <div>
            <p className={`font-bold tabular ${featured ? 'text-2xl text-crimson' : 'text-base text-crimson'}`}>{peso(price)}</p>
            {isWholesale && (
              <p className="text-xs line-through tabular text-navy-faint">{peso(product.retail)}</p>
            )}
          </div>
          <button
            onClick={() => { addToCart(product.id); setCartOpen(true) }}
            className={`rounded-lg bg-crimson font-semibold text-white transition-all hover:bg-crimson-deep active:scale-95 shadow-card ${featured ? 'px-8 py-3.5 text-sm' : 'px-4 py-2 text-sm'}`}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  )
}
