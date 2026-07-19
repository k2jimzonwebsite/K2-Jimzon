import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import BeforeAfterSlider from '../components/BeforeAfterSlider'
import CatalogGrid from '../components/CatalogGrid'
import { RedButton, StockPill, TrustBadge, Kicker, QuantityStepper } from '../components/ui/bits'
import { StarIcon, ArrowIcon } from '../components/ui/icons'
import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'

export default function ProductDetail() {
  const { productId, products, getProduct } = useStore()
  
  // Determine which products to show in the carousel
  const slideshowProducts = useMemo(() => {
    const withGuide = products.filter(p => p.guide)
    if (productId && !withGuide.find(p => p.id === productId)) {
      const active = getProduct(productId)
      return active ? [active, ...withGuide] : withGuide
    }
    return withGuide
  }, [productId, products, getProduct])

  const [activeIndex, setActiveIndex] = useState(() => {
    return Math.max(0, slideshowProducts.findIndex(p => p.id === productId))
  })
  
  const [isPaused, setIsPaused] = useState(false)

  // Keep activeIndex in sync if productId changes externally (e.g. from CatalogGrid)
  useEffect(() => {
    const index = slideshowProducts.findIndex(p => p.id === productId)
    if (index !== -1) {
      setActiveIndex(index)
      setIsPaused(true) // Pause auto-play if they explicitly clicked a product
    }
  }, [productId, slideshowProducts])

  // Auto-advance
  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setActiveIndex(current => (current + 1) % slideshowProducts.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [isPaused, slideshowProducts.length])

  const next = () => {
    setIsPaused(true)
    setActiveIndex((prev) => (prev + 1) % slideshowProducts.length)
  }
  const prev = () => {
    setIsPaused(true)
    setActiveIndex((prev) => (prev - 1 + slideshowProducts.length) % slideshowProducts.length)
  }

  const activeProduct = slideshowProducts[activeIndex]

  if (!activeProduct) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-navy border-r-navy border-b-transparent border-l-transparent animate-spin" />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-16 md:pt-10">
      
      {/* Slideshow Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6 border-b border-line pb-6">
        <div>
          <Kicker className="mb-2 text-crimson">Featured Showcase</Kicker>
          <h1 className="text-3xl font-serif font-semibold tracking-tight text-navy md:text-4xl">The Collection</h1>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          {/* Animated Progress Bar */}
          <div className="h-1 w-32 bg-line rounded-full overflow-hidden relative">
            <motion.div 
              key={`${activeIndex}-${isPaused}`}
              initial={{ width: isPaused ? '100%' : '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: isPaused ? 0 : 8, ease: 'linear' }}
              className="absolute left-0 top-0 h-full bg-navy/80" 
            />
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold tabular text-navy-faint">
              <span className="text-navy">{String(activeIndex + 1).padStart(2, '0')}</span> / {String(slideshowProducts.length).padStart(2, '0')}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={prev}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-cream/90 backdrop-blur-sm text-navy transition hover:bg-cream hover:border-line active:scale-95 shadow-sm"
              >
                <ArrowIcon size={16} className="rotate-180" />
              </button>
              <button 
                onClick={next}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-cream/90 backdrop-blur-sm text-navy transition hover:bg-cream hover:border-line active:scale-95 shadow-sm"
              >
                <ArrowIcon size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div 
        className="relative" 
        onMouseEnter={() => setIsPaused(true)} 
        onMouseLeave={() => setIsPaused(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeProduct.id}
            initial={{ opacity: 0, x: 30, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -30, filter: 'blur(4px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
          >
            <ProductSlide product={activeProduct} />
          </motion.div>
        </AnimatePresence>

        {/* Bottom Pointers / Pagination */}
        <div className="mt-8 flex justify-center gap-2 overflow-x-auto pb-4 hide-scrollbar">
          {slideshowProducts.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => {
                setActiveIndex(idx)
                setIsPaused(true)
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === activeIndex 
                  ? 'w-8 bg-navy' 
                  : 'w-2 bg-line hover:bg-navy-faint'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-24 border-t border-line pt-12">
        <div className="mb-10 text-center">
          <Kicker className="mb-3 text-navy-soft">Full Inventory</Kicker>
          <h2 className="font-serif text-3xl font-semibold text-navy">Explore the Catalog</h2>
        </div>
        <CatalogGrid />
      </div>
    </main>
  )
}

const slideVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const detailsContainerVariants = {
  hidden: { opacity: 0, x: 20 },
  show: { 
    opacity: 1, x: 0, 
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
}

function ProductSlide({ product }) {
  const { addToCart, setCartOpen, isWholesale, lines } = useStore()
  const [qty, setQty] = useState(1)
  const [showRecipe, setShowRecipe] = useState(false)
  const price = isWholesale ? product.wholesale : product.retail
  const inCart = lines.find((line) => line.id === product.id)?.qty ?? 0
  const remaining = Math.max(0, product.stock - inCart)
  const canAdd = remaining > 0

  useEffect(() => {
    setQty((current) => Math.min(Math.max(1, current), Math.max(1, remaining)))
  }, [product.id, remaining])

  return (
    <motion.div variants={slideVariants} initial="hidden" animate="show" exit="hidden">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] md:gap-10 lg:gap-16 min-h-[auto] lg:min-h-[500px]">
        
        {/* Image / slider column */}
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center lg:justify-start w-full">
          <div className="relative w-full max-w-[600px] aspect-square">
            {/* Dynamic ambient shadow based on product hue */}
            <div 
              className="absolute inset-4 rounded-full blur-3xl mix-blend-multiply opacity-25 transition-colors duration-1000" 
              style={{ backgroundColor: `hsl(${product.hue} 60% 50%)` }}
              aria-hidden="true" 
            />
            <div className="relative z-10 w-full drop-shadow-2xl shadow-navy/10 rounded-2xl overflow-hidden">
              <BeforeAfterSlider product={product} />
            </div>
          </div>
          
          {product.guide ? (
            <button
              onClick={() => setShowRecipe(!showRecipe)}
              className="mt-4 md:mt-8 w-full max-w-sm rounded-2xl border p-4 text-left transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between shadow-sm"
              style={{ 
                borderColor: `hsl(${product.hue} 50% 85%)`,
                backgroundColor: `hsl(${product.hue} 50% 96%)`
              }}
            >
              <div>
                <p className="font-serif font-bold text-navy text-lg">{showRecipe ? 'Back to details' : 'View Masterclass'}</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: `hsl(${product.hue} 60% 40%)` }}>
                  {showRecipe ? 'Return to product specifications' : 'Cooking instructions & ingredients'}
                </p>
              </div>
              <div 
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300"
                style={{ color: `hsl(${product.hue} 60% 40%)` }}
              >
                <ArrowIcon size={16} className={showRecipe ? 'rotate-180' : ''} />
              </div>
            </button>
          ) : (
            <p className="mt-6 text-center text-sm font-medium tracking-wide text-navy-faint uppercase">
              Drag the handle to reveal inside
            </p>
          )}
        </motion.div>

        {/* Right Column (Dynamic) */}
        <div className="relative min-h-[400px] lg:min-h-0">
          <AnimatePresence mode="wait">
            {!showRecipe ? (
              <motion.div 
                key="details"
                variants={detailsContainerVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="flex flex-col justify-center h-full"
              >
          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2 mt-4 lg:mt-0 shrink-0">
            <TrustBadge>100% authentic · {product.origin}</TrustBadge>
            <StockPill stock={product.stock} />
          </motion.div>
          
          <motion.div variants={itemVariants} className="shrink-0">
            <h2 className="mt-4 font-serif text-2xl font-semibold leading-tight tracking-tight text-navy sm:text-3xl md:text-4xl lg:text-5xl">
              {product.name}
            </h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-navy-soft">
              <StarIcon className="text-gold" /> 4.9 · 812 sold across our channels · {product.size}
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-6 flex items-baseline gap-4 shrink-0">
            <span className="text-2xl sm:text-3xl font-bold text-crimson tabular">{peso(price)}</span>
            {isWholesale && (
              <>
                <span className="text-base text-navy-faint line-through tabular">{peso(product.retail)}</span>
                <span className="rounded-full bg-blue-wash px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue">
                  Wholesale
                </span>
              </>
            )}
          </motion.div>

          {/* Premium Features Grid - Make this scrollable if the screen gets too small */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mt-6">
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
            <div className="relative rounded-xl bg-shell p-5 shadow-sm border border-line/40">
              <div 
                className="absolute top-0 left-0 w-1 h-full rounded-l-xl" 
                style={{ backgroundColor: `hsl(${product.hue} 50% 45%)` }} 
              />
              <Kicker className="text-navy flex items-center gap-2 text-xs">
                <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Why buy this
              </Kicker>
              <p className="mt-2 text-sm leading-relaxed text-navy-soft">{product.whyBuy}</p>
            </div>
            
            <div className="relative rounded-xl bg-shell p-5 shadow-sm border border-line/40">
              <div 
                className="absolute top-0 left-0 w-1 h-full rounded-l-xl" 
                style={{ backgroundColor: `hsl(${(product.hue + 45) % 360} 50% 45%)` }} 
              />
              <Kicker className="text-navy flex items-center gap-2 text-xs">
                <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Why it's rare
              </Kicker>
              <p className="mt-2 text-sm leading-relaxed text-navy-soft">{product.whyRare}</p>
            </div>
          </motion.div>
          </div>

          {/* Sticky Bottom Actions */}
          <div className="shrink-0 pt-4 bg-cream/80 backdrop-blur-sm z-10 border-t border-line/30 mt-2">
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <QuantityStepper value={qty} onChange={setQty} max={remaining} size="md" />
              <span className="text-[13px] font-medium text-navy-soft">
                {canAdd ? product.inside : 'All available stock is already in your cart.'}
              </span>
            </motion.div>

            <motion.div variants={itemVariants}>
              <RedButton
                className="mt-5 w-full py-3.5 text-base font-semibold shadow-md transition-transform hover:-translate-y-0.5 active:translate-y-0"
              onClick={() => { addToCart(product.id, qty); setCartOpen(true) }}
              disabled={!canAdd}
            >
              {canAdd ? `Add to cart — ${peso(price * qty)}` : 'Stock limit reached'}
            </RedButton>
          </motion.div>

          {/* Filipino pairings — styled as premium tags */}
          <motion.div variants={itemVariants} className="mt-6 md:mt-10 border-t border-line/60 pt-6">
            <Kicker className="text-navy-faint mb-4">
              Local Pairings
            </Kicker>
            <div className="flex flex-wrap gap-2.5">
              {product.pairings.map((p) => (
                <span key={p} className="rounded-full bg-shell border border-line/50 px-4 py-2 text-sm font-medium text-navy-soft transition-colors hover:bg-cream">
                  {p}
                </span>
              ))}
            </div>
          </motion.div>
          </div>
          </motion.div>
            ) : (
              <motion.div 
                key="recipe"
                variants={detailsContainerVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="flex flex-col h-full overflow-hidden lg:absolute lg:inset-0"
              >
                <motion.div variants={itemVariants} className="mb-6 mt-4 lg:mt-0 shrink-0">
                  <Kicker style={{ color: `hsl(${product.hue} 60% 30%)` }} className="mb-1 text-xs">
                    Preparation & Cooking
                  </Kicker>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-navy lg:text-3xl">
                    {product.guide.title}
                  </h3>
                </motion.div>

                {/* Steps - Scrollable Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 mb-4 pb-6">
                  <motion.ol variants={itemVariants} className="space-y-6">
                    {product.guide.steps.map((step, i) => (
                      <li key={i} className="flex gap-4 group">
                        <span 
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-serif text-sm font-bold text-white shadow-sm transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `hsl(${product.hue} 50% 45%)` }}
                      >
                        {i + 1}
                      </span>
                      <p className="pt-0.5 text-[15px] leading-relaxed text-navy-soft">{step}</p>
                    </li>
                  ))}
                </motion.ol>
                </div>

                {/* Ingredients & Bundle - Sticky Footer */}
                <motion.div variants={itemVariants} className="mt-auto shrink-0 rounded-2xl bg-shell border border-line/60 p-5 relative overflow-hidden flex flex-col xl:flex-row justify-between xl:items-center gap-5 shadow-card">
                  <div 
                    className="absolute top-0 left-0 w-1.5 h-full" 
                    style={{ backgroundColor: `hsl(${product.hue} 50% 45%)` }} 
                  />
                  
                  <div className="flex-1 ml-3 w-full">
                    <Kicker style={{ color: `hsl(${product.hue} 60% 30%)` }} className="mb-2.5 text-[11px]">
                      Ingredients
                    </Kicker>
                    {product.guide.ingredients && (
                      <ul className="space-y-2">
                        {product.guide.ingredients.map((ing, i) => (
                          <li key={i} className="flex items-start gap-2">
                            {ing.inBundle ? (
                              <>
                                <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: `hsl(${product.hue} 50% 45%)` }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-[13px] font-bold" style={{ color: `hsl(${product.hue} 60% 25%)` }}>{ing.name}</span>
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
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
