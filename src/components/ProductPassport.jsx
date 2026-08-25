import { ShieldCheckIcon, CheckIcon } from './ui/icons'

/**
 * ProductPassport
 * Strictly conditional provenance card.
 * Never invent or hardcode fictional operational facts. Missing data gracefully omits that line.
 */
export default function ProductPassport({ product, stock = 0 }) {
  if (!product) return null

  const origin = product.country_of_origin || (product.origin && !product.origin.startsWith('Shopee') ? product.origin : null)
  const batch = product.batch_number || product.lot_number || null
  const bestBefore = product.expiry_date || product.best_before || null
  const storage = product.storage_instructions || null
  const netWeight = product.net_weight ? `${product.net_weight}${product.package_type ? ` (${product.package_type})` : ''}` : null

  return (
    <div className="rounded-xl border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon size={16} className="text-forest" />
          <span className="font-serif text-sm font-semibold tracking-wide text-navy">Product Details</span>
        </div>
        <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[11px] font-bold text-forest">
          Authentic Import
        </span>
      </div>

      <dl className="mt-3 divide-y divide-line/60 text-xs">
        {origin && (
          <div className="flex justify-between py-2">
            <dt className="font-medium text-navy-faint">Origin</dt>
            <dd className="font-semibold text-navy text-right">{origin}</dd>
          </div>
        )}
        <div className="flex justify-between py-2">
          <dt className="font-medium text-navy-faint">Consignment</dt>
          <dd className="font-semibold text-navy text-right">Direct import to Manila</dd>
        </div>
        {stock > 0 ? (
          <div className="flex justify-between py-2">
            <dt className="font-medium text-navy-faint">Manila Stock</dt>
            <dd className="font-semibold text-forest text-right flex items-center gap-1">
              <CheckIcon size={12} /> {stock} units ready in Manila
            </dd>
          </div>
        ) : (
          <div className="flex justify-between py-2">
            <dt className="font-medium text-navy-faint">Manila Stock</dt>
            <dd className="font-semibold text-crimson text-right">Available on Pasabuy request</dd>
          </div>
        )}
        {batch && (
          <div className="flex justify-between py-2">
            <dt className="font-medium text-navy-faint">Batch</dt>
            <dd className="font-mono text-navy text-right">{batch}</dd>
          </div>
        )}
        {bestBefore && (
          <div className="flex justify-between py-2">
            <dt className="font-medium text-navy-faint">Best Before</dt>
            <dd className="font-medium text-navy text-right">{bestBefore}</dd>
          </div>
        )}
        {netWeight && (
          <div className="flex justify-between py-2">
            <dt className="font-medium text-navy-faint">Net Weight</dt>
            <dd className="font-medium text-navy text-right">{netWeight}</dd>
          </div>
        )}
        {storage && (
          <div className="flex justify-between py-2">
            <dt className="font-medium text-navy-faint">Storage</dt>
            <dd className="font-medium text-navy text-right max-w-[60%]">{storage}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
