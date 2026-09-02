import ShelfProductPanel from './ShelfProductPanel'
import { stockState } from './shelfModel'
import { applyImageFallback } from '../../lib/imageFallback'

const productImage = product => product?.img || product?.primary_image_url || ''

/**
 * The store's editorial rail: orientation first, product detail second.
 * It only presents the canonical shelves and products handed to it.
 */
export default function StoreSidePanel({
  shelves,
  activeShelf,
  activeIndex,
  product,
  cartQuantity,
  onShelfChange,
  onSelect,
  onFaq,
  onAddToCart,
  onOpenProduct,
  onAskPasabuy,
  onCloseProduct,
}) {
  const shelfProducts = activeShelf?.products || []
  const categoryShelves = shelves.filter(shelf => !shelf.isCounter)

  return (
    <div className="k2-store-side-console">
      <header className="k2-store-side-intro">
        <p className="k2-store-side-eyebrow">Shelf concierge</p>
        <p className="k2-store-side-location">Now browsing</p>
        <h2>{activeShelf?.name || 'The store'}</h2>
        <p>{activeShelf?.blurb || 'Choose a shelf to begin.'}</p>
        {!activeShelf?.isCounter && (
          <span className="k2-store-side-count">
            {shelfProducts.length} {shelfProducts.length === 1 ? 'item' : 'items'} on this shelf
          </span>
        )}
      </header>

      {product ? (
        <ShelfProductPanel
          product={product}
          cartQuantity={cartQuantity}
          onAddToCart={onAddToCart}
          onOpenProduct={onOpenProduct}
          onAskPasabuy={onAskPasabuy}
          onClose={onCloseProduct}
        />
      ) : activeShelf?.isCounter ? (
        <nav className="k2-store-side-section" aria-label="Choose a store shelf">
          <div className="k2-store-side-section-heading">
            <p>Choose a shelf</p>
            <span>{categoryShelves.length} departments</span>
          </div>
          <div className="k2-store-side-shelves">
            {shelves.map((shelf, index) => shelf.isCounter ? null : (
              <button
                key={shelf.id}
                type="button"
                className="k2-store-side-shelf"
                onClick={() => onShelfChange(index)}
              >
                <span>
                  <strong>{shelf.name}</strong>
                  <small>{shelf.products.length} items</small>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </nav>
      ) : (
        <section className="k2-store-side-section" aria-labelledby="shelf-highlights-heading">
          <div className="k2-store-side-section-heading">
            <p id="shelf-highlights-heading">Shelf highlights</p>
            <span>Choose to inspect</span>
          </div>
          <div className="k2-store-side-products">
            {shelfProducts.slice(0, 4).map(product => {
              const id = product?.sku || product?.id
              const stock = stockState(product)
              const image = productImage(product)
              return (
                <button
                  key={id}
                  type="button"
                  className="k2-store-side-product"
                  onClick={() => onSelect(product)}
                >
                  <span className="k2-store-side-product-image" aria-hidden="true">
                    {image
                      ? <img src={image} alt="" loading="lazy" onError={applyImageFallback} />
                      : <span>{String(product?.name || 'K2').slice(0, 1)}</span>}
                  </span>
                  <span className="k2-store-side-product-copy">
                    <strong>{product?.name}</strong>
                    <small data-tone={stock.tone}>{stock.label}</small>
                  </span>
                  <span aria-hidden="true" className="k2-store-side-product-arrow">→</span>
                </button>
              )
            })}
          </div>
          {shelfProducts.length > 4 && (
            <p className="k2-store-side-more">More items are available on the shelf and in the product strip below the room.</p>
          )}
        </section>
      )}

      <div className="k2-store-side-service" aria-label="Store help">
        <button type="button" onClick={onFaq} className="k2-store-side-service-button">
          <span aria-hidden="true">?</span>
          <span><strong>Ordering questions</strong><small>Read the store FAQs</small></span>
        </button>
      </div>

      <p className="k2-store-side-note">
        Your basket creates an order request. K2 confirms stock before sending payment instructions.
      </p>
    </div>
  )
}
