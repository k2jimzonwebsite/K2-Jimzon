import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import BeforeAfterSlider from '../components/BeforeAfterSlider'
import CatalogGrid from '../components/CatalogGrid'
import { RedButton, StockPill, TrustBadge, Kicker, QuantityStepper } from '../components/ui/bits'
import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'

export default function MasterProduct() {
  const { productId, getProduct, addToCart, setCartOpen, isWholesale, lines, go, addRequest } = useStore()
  const [qty, setQty] = useState(1)
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    setQty(1)
    setCurrentSlide(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [productId])

  const product = getProduct(productId)

  if (!product) {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-navy border-r-navy border-b-transparent border-l-transparent animate-spin mb-4" />
        <p className="text-navy-soft font-medium">Loading product details...</p>
      </main>
    )
  }

  const price = isWholesale ? product.wholesale_price : product.srp
  const inCart = lines.find((line) => line.id === product.id)?.qty ?? 0
  const totalStock = product.stock_available ?? product.stock ?? 999
  const remaining = Math.max(0, totalStock - inCart)
  const canAdd = remaining > 0
  const isOutOfStock = totalStock <= 0

  // Construct image gallery
  const gallery = useMemo(() => {
    const items = []
    
    // Slide: Before/After Slider (or primary image if no afterImage)
    if (product.afterImage && product.img) {
      items.push({ type: 'slider', before: product.img, after: product.afterImage })
    } else if (product.primary_image_url || product.img) {
      items.push({ type: 'image', src: product.primary_image_url || product.img })
    }

    // Additional images (mocking additional images to show "other tiny bubbles")
    if (product.gallery && product.gallery.length > 0) {
      product.gallery.forEach(imgSrc => {
         items.push({ type: 'image', src: imgSrc })
      })
    } else {
      if (product.img && items.length > 0) items.push({ type: 'image', src: product.img })
      if (product.afterImage && items.length > 0) items.push({ type: 'image', src: product.afterImage })
    }
    
    // Fallback if no images
    if (items.length === 0) {
      items.push({ type: 'image', src: '/images/placeholder.jpg' })
    }
    return items
  }, [product])

  return (
    <main className="store-section max-w-6xl pb-24 pt-6 md:pb-20 md:pt-10">
      
      {/* Breadcrumbs / Back */}
      <div className="mb-8 flex items-center justify-between border-b border-line pb-5">
        <nav className="flex items-center gap-2 text-sm text-navy-faint font-medium">
          <button className="hover:text-navy transition-colors cursor-pointer" onClick={() => go('home')}>Home</button>
          <span>/</span>
          <span className="text-navy">{product.name}</span>
        </nav>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
        
        {/* Left Column: Image Gallery & Product Tabs */}
        <div className="flex flex-col w-full gap-8">
          {/* Image Gallery */}
          <div className="relative w-full aspect-square">
            <div className="relative z-10 h-full w-full overflow-hidden rounded-2xl border border-line bg-shell/60">
              <AnimatePresence>
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 w-full h-full"
                >
                  {gallery[currentSlide].type === 'slider' ? (
                    <BeforeAfterSlider product={product} />
                  ) : gallery[currentSlide].type === 'video' ? (
                    <video 
                      src={gallery[currentSlide].src} 
                      controls 
                      preload="metadata"
                      className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal"
                    />
                  ) : (
                    <img 
                      src={gallery[currentSlide].src} 
                      alt={`${product.name} - View ${currentSlide + 1}`} 
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
                  className="flex h-11 w-11 items-center justify-center rounded-full"
                  aria-label={`Go to slide ${i + 1}`}
                ><span className={`h-2 w-2 rounded-full transition-[transform,background-color] duration-150 ${i === currentSlide ? 'scale-125 bg-crimson' : 'bg-navy/25'}`} /></button>
              ))}
            </div>
          )}

          {/* Product Tabs (Ingredients & Instructions) underneath the image */}
          <ProductTabs product={product} />
        </div>

        {/* Right Column: Product Info */}
        <div className="flex flex-col lg:pt-2">
          <div className="flex flex-wrap items-center gap-2 mb-4 shrink-0">
            <TrustBadge>Recorded origin · {product.country_of_origin || product.origin || 'Imported'}</TrustBadge>
            <StockPill stock={product.stock_available || product.stock} />
            {(product.subcategory || product.category_id) && (
              <span className="rounded-full bg-shell border border-line/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-soft">
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
                <span className="rounded-full bg-blue-wash px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue">
                  Wholesale
                </span>
              </>
            )}
          </div>

          <p className="mt-6 text-base leading-relaxed text-navy-soft">
            {product.description || product.short_description || product.why_buy || 'Product details are being reviewed before publication.'}
          </p>

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
              {/* Fallback if no specs available to ensure section isn't empty */}
              {!product.ingredients && !product.net_weight && !product.brand_id && (
                <div className="p-3.5 text-center text-navy-faint italic">Specifications unavailable</div>
              )}
            </div>
          </div>

          {/* How Filipinos Enjoy It */}
          {(product.pairings?.length > 0 || product.seo_keywords?.length > 0) && (
            <div className="mt-8 border-t border-line/60 pt-6">
              <Kicker className="text-navy-faint mb-4">How Filipinos enjoy it</Kicker>
              <div className="flex flex-wrap gap-2">
                {(product.pairings?.length > 0 ? product.pairings : product.seo_keywords).map((p) => (
                  <span key={p} className="rounded-full bg-shell border border-line/50 px-3 py-1.5 text-[13px] font-medium text-navy-soft">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1" />

          {/* Add to Cart Actions */}
          <div className="z-10 mt-9 shrink-0 rounded-xl border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {!isOutOfStock && <QuantityStepper value={qty} onChange={setQty} max={remaining} size="md" />}
              <span className="text-[13px] font-medium text-navy-soft">
                {isOutOfStock 
                  ? 'Currently out of stock. Add to Pasabuy to request this item.' 
                  : (canAdd ? (product.inside || 'In stock and ready to ship.') : 'All available stock is already in your cart.')}
              </span>
            </div>

            <div>
              {isOutOfStock ? (
                <button
                  className="mt-5 min-h-12 w-full rounded-lg bg-crimson px-5 text-sm font-bold text-white transition-[transform,opacity] duration-150 hover:bg-crimson-deep active:scale-[0.97]"
                  onClick={() => { addRequest(product.name); go('pasabuy'); }}
                >
                  Add to Pasabuy
                </button>
              ) : (
                <RedButton
                  className="mt-5 w-full py-3.5 text-base"
                  onClick={() => { addToCart(product.id, qty); setCartOpen(true) }}
                  disabled={!canAdd}
                >
                  {canAdd ? `Add to cart — ${peso(price * qty)}` : 'Stock limit reached'}
                </RedButton>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Section: Explore the Catalog */}
      <div className="mt-24 border-t border-line pt-12">
        <div className="mb-10 text-center">
          <Kicker className="mb-3 text-navy-soft">More to Discover</Kicker>
          <h2 className="font-serif text-3xl font-semibold text-navy">Explore the Catalog</h2>
        </div>
        <CatalogGrid />
      </div>
    </main>
  )
}

function ProductTabs({ product }) {
  const { addToCart, setCartOpen } = useStore()
  const [activeTab, setActiveTab] = useState('ingredients');

  useEffect(() => {
    setActiveTab('ingredients')
  }, [product.id])

  return (
    <div className="w-full">
      <div className="flex gap-4 border-b border-line/50 mb-4">
        <button 
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'ingredients' ? 'text-navy border-b-2 border-navy' : 'text-navy-soft hover:text-navy'}`}
          onClick={(e) => { e.stopPropagation(); setActiveTab('ingredients'); }}
        >
          Ingredients
        </button>
        <button 
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'instructions' ? 'text-navy border-b-2 border-navy' : 'text-navy-soft hover:text-navy'}`}
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
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
                          addToCart(product.id)
                          if (product.guide.bundle.partner) addToCart(product.guide.bundle.partner)
                          setCartOpen(true)
                        }}
                        className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-shell border border-line text-navy shadow-sm transition-colors hover:bg-navy hover:text-cream"
                      >
                        Buy the bundle — {peso(product.guide.bundle.price)}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-navy-soft italic">Not available</p>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="instructions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
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
                <p className="text-sm text-navy-soft italic">Not available</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
