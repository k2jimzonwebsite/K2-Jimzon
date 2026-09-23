import ShelfProductPanel from './ShelfProductPanel'
import StoreSeoPanel from './StoreSeoPanel'

/**
 * IDEA-20260923-02 — Selected-product bottom popup.
 *
 * Renders product details in a toggleable bottom pop-up card when a product is selected.
 * When no product is selected, returns null so the 3D room remains un-occluded,
 * relying on the bottom rail (.k2-store-rail) for cabinet inventory.
 */
export default function StoreSidePanel({
  product,
  cartQuantity = 0,
  basketError = '',
  onAddToCart,
  onOpenProduct,
  onAskPasabuy,
  onCloseProduct,
}) {
  if (!product) return null

  return (
    <div
      className="k2-store-product-popup"
      role="region"
      aria-label={`Product details: ${product.name}`}
    >
      <ShelfProductPanel
        product={product}
        basketError={basketError}
        cartQuantity={cartQuantity}
        onAddToCart={onAddToCart}
        onOpenProduct={onOpenProduct}
        onAskPasabuy={onAskPasabuy}
        onClose={onCloseProduct}
      />
      <StoreSeoPanel product={product} />
    </div>
  )
}
