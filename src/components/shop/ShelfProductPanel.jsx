import { useMemo } from 'react'
import { stockState } from './shelfModel'
import { getProductKnowledge, UNAVAILABLE_TEXT } from '../../lib/productKnowledge'
import { useProductKnowledgeVersion } from '../../lib/useProductKnowledgeVersion'
import ProductVisual from '../ProductVisual'
import { StockPill } from '../ui/bits'
import { productStock } from '../../lib/cartInventory'
import { peso } from '../../data/products'

/**
 * MAP-027 / IDEA-20260923-03 Interactive Shop — selected-product panel.
 *
 * Every value here comes from the canonical catalog projection the storefront
 * already renders (inventory > the catalog > the 3d store).
 *
 * It uses the identical ProductVisual asset and StockPill as ProductCard.jsx,
 * sharing the same productKnowledge source, same prices, and same basket truth.
 */
const USAGE_FIELDS = [
  { key: 'uses', label: 'What you can make' },
  { key: 'pairings', label: 'Goes well with' },
  { key: 'preparation', label: 'How to prepare it' },
]

export default function ShelfProductPanel({
  product,
  cartQuantity = 0,
  basketError = '',
  onAddToCart,
  onOpenProduct,
  onAskPasabuy,
  onClose,
}) {
  const knowledgeVersion = useProductKnowledgeVersion()
  const knowledge = useMemo(
    () => getProductKnowledge(product?.sku || product?.id || ''),
    [product, knowledgeVersion],
  )

  if (!product) return null

  const stock = stockState(product)
  const stockCount = productStock(product)
  const price = Number(product?.srp ?? product?.retail)
  const soldOut = stock.tone === 'out' || (stockCount !== null && stockCount <= 0)
  const sku = product?.sku || product?.id

  return (
    <section
      className="k2-store-selected-product"
      aria-live="polite"
      aria-label={`Selected product: ${product?.name || 'product'}`}
    >
      <div className="flex items-start gap-4">
        <div className="product-img-surface relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl border border-[var(--k2-line)] bg-shell/50">
          <ProductVisual product={product} className="h-full w-full object-contain drop-shadow-md" pad="p-2" />
          {product?.tag && (
            <span className="absolute left-1.5 top-1.5 rounded bg-navy/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-cream">
              {product.tag}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-navy-faint">
                {product?.category || 'Italian import'}
              </p>
              <h2 className="font-serif text-lg sm:text-xl font-bold leading-snug text-navy">
                {product?.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] shrink-0 rounded-xl px-2.5 text-sm font-semibold text-navy-soft transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson cursor-pointer"
              aria-label="Close"
            >
              Close
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <span className="text-lg sm:text-xl font-bold tabular text-crimson">
              {Number.isFinite(price) && price > 0 ? peso(price) : 'Not priced yet'}
            </span>
            <StockPill stock={stockCount} />
          </div>

          {sku && (
            <p className="mt-1 font-mono text-xs text-navy-soft">
              SKU: <span className="text-navy">{sku}</span>
            </p>
          )}
        </div>
      </div>

      <p className="mt-3.5 text-sm leading-relaxed text-navy-soft">
        {knowledge.fields.description || product?.short || product?.short_description || UNAVAILABLE_TEXT}
      </p>

      {USAGE_FIELDS.some(field => knowledge.fields[field.key]) && (
        <dl className="mt-4 space-y-2.5 border-t border-line pt-3.5">
          {USAGE_FIELDS.filter(field => knowledge.fields[field.key]).map(field => (
            <div key={field.key}>
              <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-navy-soft">
                {field.label}
              </dt>
              <dd className="mt-0.5 text-sm leading-6 text-navy">{knowledge.fields[field.key]}</dd>
            </div>
          ))}
        </dl>
      )}

      {knowledge.hasFaqs && (
        <div className="mt-4 border-t border-line pt-3.5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-navy-soft">
            People ask
          </p>
          <div className="mt-1.5 divide-y divide-line">
            {knowledge.faqs.slice(0, 3).map(faq => (
              <details key={faq.question} className="group py-1">
                <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-navy focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-crimson">
                  {faq.question}
                  <span aria-hidden="true" className="text-navy-soft transition-transform duration-200 ease-out-quint group-open:rotate-180">▾</span>
                </summary>
                <p className="pb-2 text-sm leading-relaxed text-navy-soft">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      {!knowledge.hasAny && (
        <p className="mt-3 text-xs leading-5 text-navy-soft">
          No usage notes for this one yet. Ask staff and they will answer directly.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        {soldOut ? (
          <button
            type="button"
            onClick={() => onAskPasabuy(product)}
            className="min-h-[44px] rounded-xl bg-crimson px-5 text-sm font-semibold text-white shadow-card transition-transform duration-150 ease-out-quint active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson cursor-pointer"
          >
            Request this through Pasabuy
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              className="min-h-[44px] rounded-xl bg-crimson px-5 text-sm font-semibold text-white shadow-card transition-transform duration-150 ease-out-quint active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson cursor-pointer"
            >
              {cartQuantity > 0 ? 'Add another' : 'Add to basket'}
            </button>
            {cartQuantity > 0 && (
              <span role="status" className="text-xs font-semibold text-forest">
                ✓ {cartQuantity} in basket
              </span>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => onOpenProduct(sku)}
          className="min-h-[44px] rounded-xl border border-line px-4 text-sm font-semibold text-navy transition-colors hover:border-amber focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson cursor-pointer"
        >
          Full product details
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] rounded-xl border border-line bg-shell/40 px-4 text-sm font-semibold text-navy-soft transition-colors hover:text-navy hover:border-navy-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson cursor-pointer"
        >
          Back to shelves
        </button>
      </div>

      {basketError && <p role="alert" className="mt-3 text-sm font-semibold text-crimson">{basketError}</p>}
      <p className="mt-3 text-xs leading-5 text-navy-soft">
        Adding to your basket saves your selection. Review it at checkout, then submit an order request. K2 confirms availability before payment instructions.
      </p>
    </section>
  )
}
