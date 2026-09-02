const peso = value => `₱${Number(value || 0).toLocaleString('en-PH')}`

/**
 * A scene-side view of the canonical basket. It receives the StoreContext
 * projection and never stores quantities, prices, or product identity itself.
 */
export default function StoreBasketDock({
  lines = [],
  basketCount = 0,
  subtotal = 0,
  pulse = 0,
  onCheckout,
}) {
  const parcelCount = Math.min(5, basketCount)

  return (
    <section
      className="k2-store-basket-dock"
      data-filled={basketCount > 0 ? 'true' : 'false'}
      data-pulse={pulse}
      aria-label="Your basket"
    >
      <div className="k2-store-basket-visual" aria-hidden="true">
        <span className="k2-store-basket-handle" />
        <span className="k2-store-basket-box">
          {Array.from({ length: parcelCount }, (_, index) => (
            <span
              className="k2-store-parcel"
              key={`${pulse}-${index}`}
              style={{ '--parcel-index': index }}
            />
          ))}
          {basketCount > parcelCount && <span className="k2-store-parcel-more">+{basketCount - parcelCount}</span>}
        </span>
      </div>

      <div className="k2-store-basket-copy">
        <span className="k2-store-basket-eyebrow">Your basket</span>
        <strong>{basketCount ? `${basketCount} ${basketCount === 1 ? 'item' : 'items'}` : 'Ready when you are'}</strong>
        <span>{basketCount ? `${peso(subtotal)} subtotal` : 'Add something from a shelf'}</span>
      </div>

      {basketCount > 0 && (
        <button type="button" onClick={onCheckout} className="k2-store-basket-checkout">
          Send order request <span aria-hidden="true">→</span>
        </button>
      )}

      {basketCount > 0 && (
        <span className="k2-store-basket-note">
          K2 confirms stock and delivery before any payment details.
        </span>
      )}

      <span className="sr-only" aria-live="polite">
        {pulse ? `${basketCount} ${basketCount === 1 ? 'item' : 'items'} in your basket, subtotal ${peso(subtotal)}.` : ''}
      </span>

      {/* The names are useful to assistive technology without turning the dock
          into a second editable cart. Checkout owns quantity changes. */}
      {basketCount > 0 && (
        <span className="sr-only">
          {lines.slice(0, 4).map(line => `${line.product?.name || line.id}, quantity ${line.qty}`).join('; ')}
        </span>
      )}
    </section>
  )
}
