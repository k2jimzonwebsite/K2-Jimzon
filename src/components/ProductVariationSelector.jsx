import { fixedVariantDetails, variantDimensions } from '../lib/productVariantOptions'
import { variantSummary } from '../lib/productFamilyPresentation'

export default function ProductVariationSelector({ product, onSelect }) {
  const dimensions = variantDimensions(product)
  const fixedDetails = fixedVariantDetails(product)
  if (!dimensions.length && !fixedDetails.length) return null
  return <>
    {dimensions.length > 0 && <section aria-label="Product options" className="mt-6 space-y-4">
      {dimensions.map(axis => <fieldset key={axis.label} aria-label={axis.label} className="min-w-0">
        <legend className="mb-2 text-sm font-semibold text-navy">{axis.label}</legend>
        {axis.choices.length > 5 ? <select aria-label={axis.label} value={product.variantOptions[axis.label]}
          className="min-h-11 w-full rounded-lg border border-line bg-paper px-3 text-base text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          onChange={event => onSelect(axis.choices.find(choice => choice.value === event.target.value).sku)}>
          {axis.choices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
        </select> : <div className="flex flex-wrap gap-2">
          {axis.choices.map(choice => {
            const selected = product.variantOptions[axis.label] === choice.value
            return <button key={choice.value} type="button" aria-pressed={selected} onClick={() => onSelect(choice.sku)}
              className={`min-h-11 min-w-11 max-w-full break-words rounded-lg border px-3.5 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${selected ? 'border-navy bg-navy font-semibold text-cream' : 'border-line bg-paper text-navy hover:border-navy'}`}>
              {choice.label}
            </button>
          })}
        </div>}
      </fieldset>)}
      <p role="status" aria-live="polite" className="sr-only">Selected: {variantSummary(product)}. SKU {product.sku}.</p>
    </section>}
    {fixedDetails.length > 0 && <dl aria-label="Shared product details" className="mt-4 grid grid-cols-1 gap-1 text-sm text-navy-soft sm:grid-cols-2">
      {fixedDetails.map(detail => <div key={detail.label} className="flex flex-wrap gap-x-2">
        <dt className="font-semibold text-navy">{detail.label}</dt><dd>{detail.value}</dd>
      </div>)}
    </dl>}
  </>
}
