import { useMemo } from 'react'
import { stockState } from './shelfModel'
import { getProductKnowledge, UNAVAILABLE_TEXT } from '../../lib/productKnowledge'
import { useProductKnowledgeVersion } from '../../lib/useProductKnowledgeVersion'

/**
 * MAP-027 Interactive Shop — selected-product panel.
 *
 * Every value here comes from the canonical catalog projection the storefront
 * already renders. The panel adds no knowledge of its own: there is no shop-only
 * description, no shop-only price, and no shop-only basket. Add to Basket calls
 * the same `addToCart` the catalog uses, so quantities can never diverge.
 *
 * Approved product knowledge comes from the same `productKnowledge` source the
 * product page uses, so the two surfaces can never describe an item differently.
 * Nothing unapproved is shown; `Information not available yet` is the honest
 * state until a human has approved a description.
 */
/**
 * The usage-first fields, in the order someone standing at a shelf actually
 * wants them. Labels and content come from the shared knowledge source; this
 * only decides emphasis for the shop surface.
 */
const USAGE_FIELDS = [
  { key: 'uses', label: 'What you can make' },
  { key: 'pairings', label: 'Goes well with' },
  { key: 'preparation', label: 'How to prepare it' },
]

export default function ShelfProductPanel({ product, cartQuantity = 0, onAddToCart, onOpenProduct, onAskPasabuy, onClose }) {
  // Hooks run before any early return: an empty selection is a normal state, not
  // a reason to change the hook order.
  const knowledgeVersion = useProductKnowledgeVersion()
  const knowledge = useMemo(
    () => getProductKnowledge(product?.sku || product?.id || ''),
    [product, knowledgeVersion],
  )

  if (!product) return null

  const stock = stockState(product)
  const price = Number(product?.srp ?? product?.retail)
  const soldOut = stock.tone === 'out'
  const sku = product?.sku || product?.id

  return (
    <section
      className="k2-store-selected-product"
      aria-live="polite"
      aria-label={`Selected product: ${product?.name || 'product'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-serif text-2xl font-semibold leading-tight text-navy">{product?.name}</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] shrink-0 rounded-xl px-3 text-sm font-semibold text-navy-soft transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
        >
          Close
        </button>
      </div>

      <dl className="mt-4 grid gap-3 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="font-semibold text-navy-soft">Price</dt>
          <dd className="text-lg font-bold text-crimson">
            {Number.isFinite(price) && price > 0 ? `₱${price.toLocaleString('en-PH')}` : 'Not priced yet'}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="font-semibold text-navy-soft">Stock</dt>
          <dd className={`font-semibold ${stock.tone === 'in' ? 'text-forest' : stock.tone === 'low' ? 'text-crimson' : 'text-navy-soft'}`}>
            {stock.label}
          </dd>
        </div>
        {sku && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="font-semibold text-navy-soft">SKU</dt>
            <dd className="font-mono text-[13px] text-navy">{sku}</dd>
          </div>
        )}
      </dl>

      {/* MAP-027: one knowledge source. The shelf shows the same approved
          content as the product page and the same honest unavailable state —
          it never carries shop-only copy. */}
      <p className="mt-4 text-sm leading-7 text-navy-soft">
        {knowledge.fields.description || product?.short || product?.short_description || UNAVAILABLE_TEXT}
      </p>

      {/* What the shelf is actually for. A list view can show a price; standing
          in front of the shelf is where you ask what to do with the thing. These
          are the same approved fields the product page renders — surfaced first
          here because usage, not specification, is why someone browses a shop. */}
      {USAGE_FIELDS.some(field => knowledge.fields[field.key]) && (
        <dl className="mt-5 space-y-3 border-t border-line pt-4">
          {USAGE_FIELDS.filter(field => knowledge.fields[field.key]).map(field => (
            <div key={field.key}>
              <dt className="text-[13px] font-semibold uppercase tracking-[0.1em] text-navy-soft">
                {field.label}
              </dt>
              <dd className="mt-1 text-sm leading-7 text-navy">{knowledge.fields[field.key]}</dd>
            </div>
          ))}
        </dl>
      )}

      {knowledge.hasFaqs && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-navy-soft">
            People ask
          </p>
          <div className="mt-2 divide-y divide-line">
            {knowledge.faqs.slice(0, 3).map(faq => (
              <details key={faq.question} className="group py-1">
                <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-navy focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-crimson">
                  {faq.question}
                  <span aria-hidden="true" className="text-navy-soft transition-transform duration-200 ease-out-quint group-open:rotate-180">▾</span>
                </summary>
                <p className="pb-3 text-sm leading-7 text-navy-soft">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      {!knowledge.hasAny && (
        <p className="mt-4 text-[13px] leading-6 text-navy-soft">
          No usage notes for this one yet. Ask staff and they will answer directly.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {soldOut ? (
          <button
            type="button"
            onClick={() => onAskPasabuy(product)}
            className="min-h-[44px] rounded-xl bg-crimson px-5 text-sm font-semibold text-white shadow-card transition-transform duration-150 ease-out-quint active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
          >
            Request this through Pasabuy
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              className="min-h-[44px] rounded-xl bg-crimson px-5 text-sm font-semibold text-white shadow-card transition-transform duration-150 ease-out-quint active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
            >
              {cartQuantity > 0 ? 'Add another' : 'Add to basket'}
            </button>
            {cartQuantity > 0 && (
              <span role="status" className="text-[13px] font-semibold text-forest">
                {cartQuantity} in basket
              </span>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => onOpenProduct(sku)}
          className="min-h-[44px] rounded-xl border border-line px-5 text-sm font-semibold text-navy transition-colors hover:border-amber focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
        >
          Full product details
        </button>
      </div>

      <p className="mt-4 text-[13px] leading-6 text-navy-soft">
        Adding to the basket sends an order request. K2 staff confirm availability before any payment instructions.
      </p>
    </section>
  )
}
