import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import BeforeAfterSlider from '../components/BeforeAfterSlider'
import CatalogGrid from '../components/CatalogGrid'
import { RedButton, StockPill, TrustBadge, Kicker, QuantityStepper, Tricolor } from '../components/ui/bits'
import { StarIcon, ArrowIcon } from '../components/ui/icons'
import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'

export default function ProductDetail() {
  const { productId, getProduct, addToCart, setCartOpen, isWholesale, lines, setView, products } = useStore()
  const [qty, setQty] = useState(1)
  const [showRecipe, setShowRecipe] = useState(false)

  useEffect(() => {
    setQty(1)
    setShowRecipe(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [productId])

  let product = getProduct(productId)

  if (!product && products.length > 0) {
    product = products[0]
  }

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

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-16 md:pt-10">
      
      {/* Breadcrumbs / Back */}
      <div className="mb-8 border-b border-line pb-6">
        <nav className="flex items-center gap-2 text-sm text-navy-faint font-medium">
          <button className="hover:text-navy transition-colors cursor-pointer" onClick={() => go('home')}>Home</button>
          <span>/</span>
          <span className="text-navy">{product.name}</span>
        </nav>
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
          >
            <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] md:gap-10 lg:gap-16 min-h-[auto] lg:min-h-[500px]">
              
              {/* Image Column */}
              <div className="flex flex-col items-center justify-center lg:justify-start w-full">
                <div className="relative w-full max-w-[600px] aspect-square">
                  <div 
                    className="absolute inset-4 rounded-full blur-3xl mix-blend-multiply opacity-25 transition-colors duration-1000" 
                    style={{ backgroundColor: `hsl(${product.hue || 220} 60% 50%)` }}
                    aria-hidden="true" 
                  />
                  <div className="relative z-10 w-full drop-shadow-2xl shadow-navy/10 rounded-2xl overflow-hidden bg-shell border border-line/40">
                    {product.primary_image_url ? (
                      <img src={product.primary_image_url} alt={product.name} className="w-full h-full object-cover mix-blend-multiply" />
                    ) : (
                      <BeforeAfterSlider product={product} />
                    )}
                  </div>
                </div>
                
                {product.guide ? (
                  <button
                    onClick={() => setShowRecipe(!showRecipe)}
                    className="mt-4 md:mt-8 w-full max-w-[600px] rounded-2xl border p-4 text-left transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between shadow-sm"
                    style={{ 
                      borderColor: `hsl(${product.hue || 220} 50% 85%)`,
                      backgroundColor: `hsl(${product.hue || 220} 50% 96%)`
                    }}
                  >
                    <div>
                      <p className="font-serif font-bold text-navy text-lg">{showRecipe ? 'Back to details' : 'View Masterclass'}</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: `hsl(${product.hue || 220} 60% 40%)` }}>
                        {showRecipe ? 'Return to product specifications' : 'Cooking instructions & ingredients'}
                      </p>
                    </div>
                    <div 
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300"
                      style={{ color: `hsl(${product.hue || 220} 60% 40%)` }}
                    >
                      <ArrowIcon size={16} className={showRecipe ? 'rotate-180' : ''} />
                    </div>
                  </button>
                ) : (
                  <p className="mt-6 text-center text-sm font-medium tracking-wide text-navy-faint uppercase">
                    Drag the handle to reveal inside
                  </p>
                )}
              </div>

              {/* Right Column (Dynamic) */}
              <div className="relative min-h-[400px] lg:min-h-0 flex flex-col">
                <AnimatePresence mode="wait">
                  {!showRecipe ? (
                    <motion.div 
                      key="details"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col justify-start flex-1"
                    >
                      <div className="flex flex-wrap items-center gap-2 mt-4 lg:mt-0 shrink-0 mb-4">
                    <TrustBadge>100% authentic · {product.country_of_origin || product.origin || 'Imported'}</TrustBadge>
                    <StockPill stock={product.stock_available || product.stock} />
                    {(product.subcategory || product.category_id) && (
                      <span className="rounded-full bg-shell border border-line/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-soft">
                        {product.subcategory || product.category_id}
                      </span>
                    )}
                  </div>
                  
                  <div className="shrink-0">
                    <h1 className="font-serif text-2xl font-semibold leading-tight tracking-tight text-navy sm:text-3xl md:text-4xl lg:text-5xl">
                      {product.name}
                    </h1>
                  </div>

                  <div className="mt-4 flex items-baseline gap-4 shrink-0">
                    <span className="text-2xl sm:text-3xl font-bold text-crimson tabular">{peso(price)}</span>
                    {isWholesale && (
                      <>
                        <span className="text-base text-navy-faint line-through tabular">{peso(product.srp || product.retail)}</span>
                        <span className="rounded-full bg-blue-wash px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue">
                          Wholesale
                        </span>
                      </>
                    )}
                  </div>

                  <div className="mt-6">
                    <p className="text-base leading-relaxed text-navy-soft mb-6">
                      {product.description || product.short_description || "A premium imported selection from K2 Jimzon, crafted for authentic culinary experiences."}
                    </p>

                    {(product.why_buy || product.usage_instructions) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                        {product.why_buy && (
                          <div className="relative rounded-xl bg-shell p-5 shadow-sm border border-line/40">
                            <div 
                              className="absolute top-0 left-0 w-1 h-full rounded-l-xl" 
                              style={{ backgroundColor: `hsl(${product.hue || 220} 50% 45%)` }} 
                            />
                            <Kicker className="text-navy flex items-center gap-2 text-xs">
                              <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Why buy this
                            </Kicker>
                            <p className="mt-2 text-sm leading-relaxed text-navy-soft">{product.why_buy}</p>
                          </div>
                        )}
                        
                        {product.usage_instructions && (
                          <div className="relative rounded-xl bg-shell p-5 shadow-sm border border-line/40">
                            <div 
                              className="absolute top-0 left-0 w-1 h-full rounded-l-xl" 
                              style={{ backgroundColor: `hsl(${(product.hue || 220 + 45) % 360} 50% 45%)` }} 
                            />
                            <Kicker className="text-navy flex items-center gap-2 text-xs">
                              <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              Usage & Info
                            </Kicker>
                            <p className="mt-2 text-sm leading-relaxed text-navy-soft">{product.usage_instructions}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                      {/* Sticky Bottom Actions */}
                      <div className="shrink-0 pt-4 bg-cream/80 backdrop-blur-sm z-10 border-t border-line/30 mt-2">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          <QuantityStepper value={qty} onChange={setQty} max={remaining} size="md" />
                          <span className="text-[13px] font-medium text-navy-soft">
                            {canAdd ? (product.inside || 'In stock and ready to ship.') : 'All available stock is already in your cart.'}
                          </span>
                        </div>

                        <div>
                          {isOutOfStock ? (
                            <RedButton
                              className="mt-5 w-full py-3.5 text-base font-semibold shadow-md transition-transform hover:-translate-y-0.5 active:translate-y-0"
                              onClick={() => setView('pasabuy')}
                            >
                              Request via Pasabuy Chat
                            </RedButton>
                          ) : (
                            <RedButton
                              className="mt-5 w-full py-3.5 text-base font-semibold shadow-md transition-transform hover:-translate-y-0.5 active:translate-y-0"
                              onClick={() => { addToCart(product.id, qty); setCartOpen(true) }}
                              disabled={!canAdd}
                            >
                              {canAdd ? `Add to cart — ${peso(price * qty)}` : 'Stock limit reached'}
                            </RedButton>
                          )}
                        </div>

                        {/* SEO Keywords / Pairings */}
                        {(product.pairings?.length > 0 || product.seo_keywords?.length > 0) && (
                          <div className="mt-6 md:mt-10 border-t border-line/60 pt-6">
                            <Kicker className="text-navy-faint mb-4">
                              How Filipinos enjoy it
                            </Kicker>
                            <div className="flex flex-wrap gap-2.5">
                              {(product.pairings?.length > 0 ? product.pairings : product.seo_keywords).map((p) => (
                                <span key={p} className="rounded-full bg-shell border border-line/50 px-4 py-2 text-sm font-medium text-navy-soft transition-colors hover:bg-cream">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div> {/* Closes Sticky Bottom Actions */}

                      {/* Product Specifications Section */}
                      <div className="mt-10 border-t border-line pt-8">
                        <Kicker className="text-navy mb-6 text-sm">Product Specifications</Kicker>
                        <div className="bg-shell/50 rounded-2xl border border-line/50 overflow-hidden divide-y divide-line/50">
                          {product.ingredients && (
                            <div className="p-5 flex flex-col sm:flex-row gap-2 sm:gap-6">
                              <div className="sm:w-1/3 text-sm font-semibold text-navy">Ingredients</div>
                              <div className="sm:w-2/3 text-sm text-navy-soft leading-relaxed">{product.ingredients}</div>
                            </div>
                          )}
                          {product.allergens && (
                            <div className="p-5 flex flex-col sm:flex-row gap-2 sm:gap-6">
                              <div className="sm:w-1/3 text-sm font-semibold text-navy">Allergens</div>
                              <div className="sm:w-2/3 text-sm text-navy-soft leading-relaxed font-medium text-amber-600">{product.allergens}</div>
                            </div>
                          )}
                          {product.net_weight && (
                            <div className="p-5 flex flex-col sm:flex-row gap-2 sm:gap-6">
                              <div className="sm:w-1/3 text-sm font-semibold text-navy">Net Weight</div>
                              <div className="sm:w-2/3 text-sm text-navy-soft leading-relaxed">{product.net_weight} {product.package_type ? `(${product.package_type})` : ''}</div>
                            </div>
                          )}
                          {product.storage_instructions && (
                            <div className="p-5 flex flex-col sm:flex-row gap-2 sm:gap-6">
                              <div className="sm:w-1/3 text-sm font-semibold text-navy">Storage</div>
                              <div className="sm:w-2/3 text-sm text-navy-soft leading-relaxed">{product.storage_instructions}</div>
                            </div>
                          )}
                          {product.finished_product_details && (
                            <div className="p-5 flex flex-col sm:flex-row gap-2 sm:gap-6">
                              <div className="sm:w-1/3 text-sm font-semibold text-navy">Finished Product</div>
                              <div className="sm:w-2/3 text-sm text-navy-soft leading-relaxed">{product.finished_product_details}</div>
                            </div>
                          )}
                          {product.brand_id && (
                            <div className="p-5 flex flex-col sm:flex-row gap-2 sm:gap-6">
                              <div className="sm:w-1/3 text-sm font-semibold text-navy">Brand</div>
                              <div className="sm:w-2/3 text-sm text-navy-soft leading-relaxed">{product.brand_id}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="recipe"
                      variants={itemVariants}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      className="flex flex-col h-full overflow-hidden lg:absolute lg:inset-0 w-full"
                    >
                      <div className="mb-6 mt-4 lg:mt-0 shrink-0">
                        <Kicker style={{ color: `hsl(${product.hue || 220} 60% 30%)` }} className="mb-1 text-xs">
                          Preparation & Cooking
                        </Kicker>
                        <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-navy lg:text-3xl">
                          {product.guide.title}
                        </h3>
                      </div>

                      {/* Steps - Scrollable Container */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 mb-4 pb-6">
                        <ol className="space-y-6">
                          {product.guide.steps.map((step, i) => (
                            <li key={i} className="flex gap-4 group">
                              <span 
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-serif text-sm font-bold text-white shadow-sm transition-transform group-hover:scale-110"
                                style={{ backgroundColor: `hsl(${product.hue || 220} 50% 45%)` }}
                              >
                                {i + 1}
                              </span>
                              <p className="pt-0.5 text-[15px] leading-relaxed text-navy-soft">{step}</p>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Ingredients & Bundle - Sticky Footer */}
                      <div className="mt-auto shrink-0 rounded-2xl bg-shell border border-line/60 p-5 relative overflow-hidden flex flex-col xl:flex-row justify-between xl:items-center gap-5 shadow-card">
                        <div 
                          className="absolute top-0 left-0 w-1.5 h-full" 
                          style={{ backgroundColor: `hsl(${product.hue || 220} 50% 45%)` }} 
                        />
                        
                        <div className="flex-1 ml-3 w-full">
                          <Kicker style={{ color: `hsl(${product.hue || 220} 60% 30%)` }} className="mb-2.5 text-[11px]">
                            Ingredients
                          </Kicker>
                          {product.guide.ingredients && (
                            <ul className="space-y-2">
                              {product.guide.ingredients.map((ing, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  {ing.inBundle ? (
                                    <>
                                      <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: `hsl(${product.hue || 220} 50% 45%)` }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span className="text-[13px] font-bold" style={{ color: `hsl(${product.hue || 220} 60% 25%)` }}>{ing.name}</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4 shrink-0 mt-0.5 text-navy-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                      </svg>
                                      <span className="text-[13px] text-navy-soft">
                                        {ing.name} <span className="text-[11px] text-navy-faint ml-1">(pantry)</span>
                                      </span>
                                    </>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="pl-3 xl:border-l border-line/50 flex flex-col items-start xl:items-end xl:text-right shrink-0 w-full xl:w-auto mt-2 xl:mt-0 pt-4 xl:pt-0 border-t xl:border-t-0">
                          <p className="font-serif text-sm font-bold text-navy">{product.guide.bundle.label.split(' — ')[1] ?? product.guide.bundle.label}</p>
                          <p className="text-xl font-bold text-navy tabular">{peso(product.guide.bundle.price)}</p>
                          <RedButton 
                            className="px-6 py-2.5 text-sm font-semibold shadow-sm mt-3 w-full sm:w-auto" 
                            onClick={() => {
                              addToCart(product.id)
                              if (product.guide.bundle.partner) addToCart(product.guide.bundle.partner)
                              setCartOpen(true)
                            }}
                          >
                            Buy bundle
                          </RedButton>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div> {/* Closes Right Column */}
            </div> {/* Closes Grid */}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-24 border-t border-line pt-12">
        <div className="mb-10 text-center">
          <Kicker className="mb-3 text-navy-soft">Also Available</Kicker>
          <h2 className="font-serif text-3xl font-semibold text-navy">Explore the Catalog</h2>
        </div>
        <CatalogGrid />
      </div>
    </main>
  )
}
