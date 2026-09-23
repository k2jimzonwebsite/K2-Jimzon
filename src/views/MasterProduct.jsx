import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import BeforeAfterSlider from '../components/BeforeAfterSlider'
import ProductCard from '../components/ProductCard'
import ProductPassport from '../components/ProductPassport'
import ProductKnowledge from '../components/ProductKnowledge'
import { UNAVAILABLE_TEXT } from '../lib/productKnowledge'
import { GhostButton, RedButton, StockPill, TrustBadge, Kicker, QuantityStepper } from '../components/ui/bits'
import { ArrowIcon } from '../components/ui/icons'
import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import { productStock } from '../lib/cartInventory'
import { applyImageFallback } from '../lib/imageFallback'

export default function MasterProduct() {
  const { productId, getProduct, addToCart, setCartOpen, isWholesale, lines, go, requestPasabuyItem, askStaffAboutProduct, loading } = useStore()
  const [qty, setQty] = useState(1)
  const [currentSlide, setCurrentSlide] = useState(0)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    setQty(1)
    setCurrentSlide(0)
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [productId, reducedMotion])

  const product = getProduct(productId)

  if (!product && loading) {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-navy border-r-navy border-b-transparent border-l-transparent animate-spin mb-4" />
        <p className="text-navy-soft font-medium">Loading product details...</p>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="mx-auto flex min-h-[62vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-crimson">Catalog</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight">Product unavailable</h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-navy-soft">
          This product is not in the current published catalog. It may be unavailable, unpublished, or linked from an older page.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <RedButton onClick={() => go('catalog')}>Browse available products</RedButton>
          <GhostButton onClick={() => go('contact')}>Ask K2 staff</GhostButton>
        </div>
      </main>
    )
  }

  const price = isWholesale ? product.wholesale_price : product.srp
  const inCart = lines.find((line) => line.id === product.id)?.qty ?? 0
  const totalStock = productStock(product)
  const availabilityUnknown = totalStock === null
  const remaining = Math.max(0, totalStock - inCart)
  const canAdd = !availabilityUnknown && remaining > 0
  const isOutOfStock = !availabilityUnknown && totalStock <= 0

  // Construct image gallery
  const gallery = (() => {
    const items = []
    
    // Slide: Before/After Slider (or primary image if no afterImage)
    if (product.afterImage && product.img) {
      items.push({ type: 'slider', before: product.img, after: product.afterImage })
    } else if (product.primary_image_url || product.img) {
      items.push({ type: 'image', src: product.primary_image_url || product.img })
    }

    // Additional images
    if (product.gallery && product.gallery.length > 0) {
      product.gallery.forEach(imgSrc => {
        if (imgSrc && !items.some(item => item.src === imgSrc)) items.push({ type: 'image', src: imgSrc })
      })
    } else {
      // No gallery array: make sure the primary and after images appear
      // exactly once even though the primary was already added above.
      for (const imgSrc of [product.img, product.afterImage]) {
        if (imgSrc && items.length > 0 && !items.some(item => item.src === imgSrc)) {
          items.push({ type: 'image', src: imgSrc })
        }
      }
    }
    
    // Fallback if no images
    if (items.length === 0) {
      items.push({ type: 'image', src: '/images/placeholder.svg' })
    }
    return items
  })()

  const activeSlide = Math.min(currentSlide, gallery.length - 1)

  return (
    <main className="store-section max-w-6xl pb-24 pt-6 md:pb-20 md:pt-10">
      
      {/* Breadcrumbs / Back */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-navy-faint font-medium">
          <button className="inline-flex min-h-11 min-w-11 shrink-0 items-center hover:text-navy transition-colors cursor-pointer" onClick={() => go('home')}>Home</button>
          <span>/</span>
          <button className="inline-flex min-h-11 min-w-11 shrink-0 items-center hover:text-navy transition-colors cursor-pointer" onClick={() => go('store')}>3D Store</button>
          <span>/</span>
          <button className="inline-flex min-h-11 min-w-11 shrink-0 items-center hover:text-navy transition-colors cursor-pointer" onClick={() => go('catalog')}>Catalog</button>
          <span>/</span>
          <span className="text-navy">{product.name}</span>
        </nav>
        <button
          type="button"
          onClick={() => go('store')}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-shell/50 px-3.5 py-1.5 text-xs font-semibold text-crimson hover:bg-shell hover:border-crimson/40 transition-colors cursor-pointer"
        >
          <span aria-hidden="true">←</span> Back to 3D Store
        </button>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
        
        {/* Left Column: Image Gallery & Product Tabs */}
        <div className="flex flex-col w-full gap-8">
          {/* Image Gallery */}
          <div className="relative w-full aspect-square">
            <div className="relative z-10 h-full w-full overflow-hidden rounded-2xl border border-line bg-shell/60">
              <AnimatePresence>
                <motion.div
                  key={activeSlide}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0.01 : 0.3 }}
                  className="absolute inset-0 w-full h-full"
                >
                  {gallery[activeSlide].type === 'slider' ? (
                    <BeforeAfterSlider product={product} />
                  ) : gallery[activeSlide].type === 'video' ? (
                    <video 
                      src={gallery[activeSlide].src} 
                      controls 
                      preload="metadata"
                      className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal"
                    />
                  ) : (
                    <img 
                      src={gallery[activeSlide].src} 
                      alt={`${product.name} - View ${activeSlide + 1}`} 
                      onError={applyImageFallback}
                      className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal" 
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          
          {/* Tiny Bubbles (Indicators) */}
          {gallery.length > 1 && (
            <div className="flex justify-center gap-1 py-1">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className="flex h-11 w-11 items-center justify-center rounded-full cursor-pointer"
                  aria-label={`Go to slide ${i + 1}`}
                ><span className={`h-2 w-2 rounded-full transition-[transform,background-color] duration-150 ${i === activeSlide ? 'scale-125 bg-crimson' : 'bg-navy/25'}`} /></button>
              ))}
            </div>
          )}

        </div>

        {/* Right Column: Product Info */}
        <div className="flex min-w-0 flex-col lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:pt-2">
          <div className="flex flex-wrap items-center gap-2 mb-4 shrink-0">
            {(product.country_of_origin || (product.origin && !product.origin.startsWith('Shopee'))) && (
              <TrustBadge>Origin: {product.country_of_origin || product.origin}</TrustBadge>
            )}
            <StockPill stock={product.stock_available ?? product.stock} />
            {(product.subcategory || product.category_id) && (
              <span className="rounded-full bg-shell border border-line/50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-navy-soft">
                {product.subcategory || product.category_id}
              </span>
            )}
          </div>
          
          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-navy sm:text-4xl lg:text-5xl">
            {product.name}
          </h1>

          <div className="mt-4 flex items-baseline gap-4">
            <span className="text-3xl font-bold text-crimson tabular">{peso(price)}</span>
            {isWholesale && (
              <>
                <span className="text-base text-navy-faint line-through tabular">{peso(product.srp || product.retail)}</span>
                <span className="rounded-full bg-blue-wash px-2 py-1 text-xs font-bold uppercase tracking-wider text-blue">
                  Wholesale
                </span>
              </>
            )}
          </div>

          {/* MAP-028 I-006: Keep allergen/variant warnings needed to buy safely visible before cart actions */}
          {product.allergens && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-600/30 bg-amber-50 dark:bg-amber-950/20 px-3.5 py-2.5 text-xs font-medium text-amber-900 dark:text-amber-200" role="alert">
              <span className="shrink-0 font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Allergen Notice:</span>
              <span>Contains {product.allergens}</span>
            </div>
          )}

          {/* Add to Cart Actions - positioned directly after price and safety notices */}
          <div className="z-10 mt-6 shrink-0 rounded-xl border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {!isOutOfStock && !availabilityUnknown && <QuantityStepper value={qty} onChange={setQty} max={remaining} size="md" />}
              <span className="text-[13px] font-medium text-navy-soft">
                {availabilityUnknown
                  ? 'Live availability could not be confirmed. Adding this product is paused until stock is known.'
                  : isOutOfStock
                  ? 'Currently out of stock in Manila. You can request this item via Pasabuy.' 
                  : (canAdd ? (product.inside || 'In stock and ready for Manila delivery.') : 'All available stock is already in your cart.')}
              </span>
            </div>

            <div>
              {availabilityUnknown ? (
                <RedButton className="mt-5 w-full py-3.5 text-base font-bold shadow-sm" disabled>
                  Stock check pending
                </RedButton>
              ) : isOutOfStock ? (
                <button
                  className="mt-5 min-h-12 w-full rounded-lg bg-crimson px-5 text-sm font-bold text-white transition-[transform,opacity] duration-150 hover:bg-crimson-deep active:scale-[0.97] cursor-pointer shadow-sm"
                  onClick={() => requestPasabuyItem({
                    item: product.name,
                    notes: `Requested from out-of-stock product page (SKU: ${product.sku || product.id})`,
                    qty,
                  })}
                >
                  Request via Pasabuy
                </button>
              ) : (
                <RedButton
                  className="mt-5 w-full py-3.5 text-base font-bold shadow-sm"
                  onClick={() => { if (addToCart(product.id, qty).ok) setCartOpen(true) }}
                  disabled={!canAdd}
                >
                  {canAdd ? `Add to cart · ${peso(price * qty)}` : 'Stock limit reached'}
                </RedButton>
              )}
            </div>
          </div>

          {/* MAP-027 honesty rule: an unsupported field publishes no claim. The
              previous generic fallback asserted "Authentic Italian import in our
              Manila inventory" for products that had no description at all. */}
          <p className="mt-6 text-base leading-relaxed text-navy-soft">
            {product.description || product.short_description || product.why_buy || UNAVAILABLE_TEXT}
          </p>

          {product.why_buy && product.why_buy !== product.description && (
            <div className="mt-4 rounded-lg bg-shell/70 border border-line/60 p-3.5 text-sm text-navy-soft">
              <span className="font-semibold text-navy">Why this item: </span>
              {product.why_buy}
            </div>
          )}

          {/* Product Passport Provenance Card */}
          <div className="mt-6">
            <ProductPassport product={product} stock={totalStock} />
          </div>

          {/* Product Specifications */}
          <div className="mt-8 border-t border-line pt-6">
            <Kicker className="mb-4 text-navy">Product specifications</Kicker>
            <div className="overflow-hidden rounded-lg border border-line bg-paper text-sm text-navy-soft divide-y divide-line">
              {product.ingredients && (
                <div className="p-3.5 flex gap-4"><span className="w-1/3 font-semibold text-navy">Ingredients</span><span className="w-2/3">{product.ingredients}</span></div>
              )}
              {product.allergens && (
                <div className="p-3.5 flex gap-4"><span className="w-1/3 font-semibold text-navy">Allergens</span><span className="w-2/3 font-medium text-amber-600">{product.allergens}</span></div>
              )}
              {product.net_weight && (
                <div className="p-3.5 flex gap-4"><span className="w-1/3 font-semibold text-navy">Net Weight</span><span className="w-2/3">{product.net_weight} {product.package_type ? `(${product.package_type})` : ''}</span></div>
              )}
              {product.storage_instructions && (
                <div className="p-3.5 flex gap-4"><span className="w-1/3 font-semibold text-navy">Storage</span><span className="w-2/3">{product.storage_instructions}</span></div>
              )}
              {product.brand_id && (
                <div className="p-3.5 flex gap-4"><span className="w-1/3 font-semibold text-navy">Brand</span><span className="w-2/3">{product.brand_id}</span></div>
              )}
              {product.barcode && (
                <div className="p-3.5 flex gap-4"><span className="w-1/3 font-semibold text-navy">Barcode</span><span className="w-2/3">{product.barcode}</span></div>
              )}
              {!product.ingredients && !product.net_weight && !product.brand_id && (
                <div className="p-3.5 text-center text-navy-faint italic">Product specifications are not available yet.</div>
              )}
            </div>
          </div>

          {/* How Filipinos Enjoy It */}
          {Array.isArray(product.pairings) && product.pairings.length > 0 && (
            <div className="mt-8 border-t border-line/60 pt-6">
              <Kicker className="text-navy-faint mb-4">How Filipinos enjoy it</Kicker>
              <div className="flex flex-wrap gap-2">
                {product.pairings.map((p) => (
                  <span key={p} className="rounded-full bg-shell border border-line/50 px-3 py-1.5 text-[13px] font-medium text-navy-soft">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}





        </div>
        <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-2">
          {/* Product Tabs (Ingredients & Instructions) underneath the image */}
          <ProductTabs product={product} />

          {/* MAP-027: approved product knowledge, shared with the Interactive Shop. */}
          <ProductKnowledge product={product} onAskStaff={askStaffAboutProduct} />
        </div>
      </div>

      {/* Bottom Section: Related Provisions & Direct Catalog Browse */}
      <RelatedProducts currentProduct={product} />
    </main>
  )
}

function ProductTabs({ product }) {
  const { addBundleToCart, getProduct, setCartOpen } = useStore()
  const [activeTab, setActiveTab] = useState('ingredients');
  const [bundleError, setBundleError] = useState('')
  const reducedMotion = useReducedMotion()
  const tabTransition = { duration: reducedMotion ? 0.01 : 0.3 }
  const tabEnter = reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }
  const tabExit = reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }

  useEffect(() => {
    setActiveTab('ingredients')
    setBundleError('')
  }, [product.id])

  return (
    <div className="w-full">
      <div className="flex gap-4 border-b border-line/50 mb-4">
        <button 
          className={`min-h-11 px-2 text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'ingredients' ? 'text-navy border-b-2 border-navy' : 'text-navy-soft hover:text-navy'}`}
          onClick={(e) => { e.stopPropagation(); setActiveTab('ingredients'); }}
        >
          Ingredients
        </button>
        <button 
          className={`min-h-11 px-2 text-sm font-semibold transition-colors cursor-pointer ${activeTab === 'instructions' ? 'text-navy border-b-2 border-navy' : 'text-navy-soft hover:text-navy'}`}
          onClick={(e) => { e.stopPropagation(); setActiveTab('instructions'); }}
        >
          Instructions
        </button>
      </div>

      <div className="bg-shell/50 rounded-xl p-6 border border-line/50 min-h-[250px] max-h-[320px] overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'ingredients' ? (
            <motion.div 
              key="ingredients"
              initial={tabEnter}
              animate={{ opacity: 1, y: 0 }}
              exit={tabExit}
              transition={tabTransition}
            >
              <h4 className="font-serif text-lg text-navy mb-4">What you'll need</h4>
              {product.guide?.ingredients?.length > 0 ? (
                <>
                  <ul className="space-y-3">
                    {product.guide.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-navy-soft">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${ing.inBundle ? 'bg-crimson/80 dark:bg-rose-400/90' : 'bg-navy/40'}`} />
                        <span className={`font-medium ${ing.inBundle ? 'text-crimson dark:text-rose-400' : 'text-navy'}`}>{ing.name}</span>
                      </li>
                    ))}
                  </ul>
                  {product.guide.bundle && (
                    <div className="mt-6 pt-5 border-t border-line/50">
                      <button 
                        onClick={() => {
                          const ids = [product.id, product.guide.bundle.partner].filter(Boolean)
                          const result = addBundleToCart(ids)
                          if (result.ok) {
                            setBundleError('')
                            setCartOpen(true)
                          } else {
                            const partner = getProduct(product.guide.bundle.partner)
                            setBundleError(partner
                              ? 'The complete pairing is not available in the requested quantity.'
                              : 'The pairing product is not in the current catalog.')
                          }
                        }}
                        className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-shell border border-line text-navy shadow-sm transition-colors hover:bg-navy hover:text-cream cursor-pointer"
                      >
                        Get the pairing bundle for {peso(product.guide.bundle.price)}
                      </button>
                      {bundleError && <p role="status" className="mt-2 text-sm text-crimson">{bundleError}</p>}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-navy-soft italic">Ingredient details are not available yet. Check the package or ask K2 staff.</p>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="instructions"
              initial={tabEnter}
              animate={{ opacity: 1, y: 0 }}
              exit={tabExit}
              transition={tabTransition}
            >
              <h4 className="font-serif text-lg text-navy mb-4">How to prepare</h4>
              
              {product.product_video_url && (
                <div className="mb-6 rounded-xl overflow-hidden aspect-video border border-line/50 bg-black">
                  <video 
                    src={product.product_video_url} 
                    controls 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {product.guide?.steps?.length > 0 ? (
                <ol className="space-y-5">
                  {product.guide.steps.map((step, i) => (
                    <li key={i} className="flex gap-4 text-sm text-navy-soft">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-cream font-serif font-bold text-xs shadow-sm">
                        {i + 1}
                      </span>
                      <p className="leading-relaxed pt-0.5">{step}</p>
                    </li>
                  ))}
                </ol>
              ) : product.usage_instructions ? (
                <p className="text-sm leading-relaxed text-navy-soft whitespace-pre-line">{product.usage_instructions}</p>
              ) : (
                <p className="text-sm text-navy-soft italic">Preparation instructions are not available yet. Check the package or ask K2 staff.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function RelatedProducts({ currentProduct }) {
  const { listedProducts, go } = useStore()

  const related = useMemo(() => {
    if (!listedProducts || !currentProduct) return []
    const others = listedProducts.filter(p => (p.sku || p.id) !== (currentProduct.sku || currentProduct.id))
    const sameSubcategory = others.filter(p => currentProduct.subcategory && p.subcategory === currentProduct.subcategory)
    const sameCategory = others.filter(p => p.category === currentProduct.category && !sameSubcategory.includes(p))
    const rest = others.filter(p => !sameSubcategory.includes(p) && !sameCategory.includes(p))

    return [...sameSubcategory, ...sameCategory, ...rest].slice(0, 4)
  }, [listedProducts, currentProduct])

  if (!related.length) return null

  return (
    <section aria-labelledby="related-provisions-heading" className="mt-20 border-t border-line pt-12 md:mt-24 md:pt-16">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end md:mb-10">
        <div>
          <Kicker className="mb-2 text-crimson">Curated Pairing</Kicker>
          <h2 id="related-provisions-heading" className="font-serif text-2xl font-semibold text-navy sm:text-3xl">
            Related Italian Provisions
          </h2>
          <p className="mt-1 text-sm text-navy-soft">
            Handpicked favorites from the same pantry category in our Manila inventory.
          </p>
        </div>
        <button
          onClick={() => go('catalog', { focusSelector: '#catalog-heading' })}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] px-4 py-2 text-sm font-bold text-navy shadow-sm transition-colors hover:border-crimson hover:text-crimson cursor-pointer"
        >
          <span>Browse full catalog</span>
          <ArrowIcon size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[370px]:grid-cols-2 md:grid-cols-4">
        {related.map(item => (
          <ProductCard key={item.sku || item.id} product={item} compact />
        ))}
      </div>
    </section>
  )
}
