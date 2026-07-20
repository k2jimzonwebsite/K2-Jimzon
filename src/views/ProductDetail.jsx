import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import BeforeAfterSlider from '../components/BeforeAfterSlider'
import CatalogGrid from '../components/CatalogGrid'
import { RedButton, StockPill, TrustBadge, Kicker, QuantityStepper, Tricolor } from '../components/ui/bits'
import { StarIcon, ArrowIcon } from '../components/ui/icons'
import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'

export default function ProductDetail() {
  const { productId, getProduct, addToCart, setCartOpen, isWholesale, lines, setView, products, go } = useStore()
  
  const featuredList = useMemo(() => {
    const list = products.filter(p => p.tag === 'Bestseller' || p.collections.includes('trending')).slice(0, 5);
    if (list.length === 0) return products.slice(0, 5);
    return list;
  }, [products]);

  const initialFeaturedList = useMemo(() => {
     const p = getProduct(productId);
     if (!p) return featuredList;
     if (!featuredList.find(f => f.id === p.id)) {
       return [p, ...featuredList].slice(0, 5);
     }
     return featuredList;
  }, [productId, featuredList, getProduct]);

  const [currentIndex, setCurrentIndex] = useState(() => {
     const idx = initialFeaturedList.findIndex(p => p.id === productId);
     return idx >= 0 ? idx : 0;
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Sync if product ID changes externally
    const idx = initialFeaturedList.findIndex(p => p.id === productId);
    if (idx >= 0) {
      setCurrentIndex(idx);
      setIsPlaying(true);
      setProgress(0);
    }
  }, [productId, initialFeaturedList]);

  useEffect(() => {
    if (!isPlaying) return;
    const intervalTime = 50;
    const totalTime = 5000;
    const increment = 100 / (totalTime / intervalTime);
    
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
           setCurrentIndex((idx) => (idx + 1) % initialFeaturedList.length);
           return 0;
        }
        return prev + increment;
      });
    }, intervalTime);
    
    return () => clearInterval(timer);
  }, [isPlaying, initialFeaturedList.length]);

  const handleInteract = () => setIsPlaying(false);

  const nextProduct = () => {
     setIsPlaying(false);
     setProgress(0);
     setCurrentIndex((idx) => (idx + 1) % initialFeaturedList.length);
  };

  const prevProduct = () => {
     setIsPlaying(false);
     setProgress(0);
     setCurrentIndex((idx) => (idx - 1 + initialFeaturedList.length) % initialFeaturedList.length);
  };

  let product = initialFeaturedList[currentIndex];

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

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-16 md:pt-10">
      
      {/* Featured Header */}
      <div className="text-center mb-8">
        <h2 className="font-serif text-3xl font-semibold text-navy">Featured Collection</h2>
        <p className="text-sm text-navy-soft mt-1">Discover our most loved selections</p>
      </div>

      {/* Breadcrumbs / Back */}
      <div className="mb-8 border-b border-line pb-6 flex justify-between items-center">
        <nav className="flex items-center gap-2 text-sm text-navy-faint font-medium">
          <button className="hover:text-navy transition-colors cursor-pointer" onClick={() => (go ? go('home') : setView('home'))}>Home</button>
          <span>/</span>
          <span className="text-navy">{product.name}</span>
        </nav>
        
        {/* Progress bar and controls for featured slideshow */}
        <div className="flex items-center gap-4">
          <div className="w-24 h-1.5 bg-line rounded-full overflow-hidden" title="Slideshow Progress">
            <div className="h-full bg-navy transition-all duration-75 ease-linear" style={{ width: `${isPlaying ? progress : 100}%` }} />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={prevProduct} className="p-1.5 text-navy hover:bg-line/80 rounded-full transition-colors" aria-label="Previous Product">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={nextProduct} className="p-1.5 text-navy hover:bg-line/80 rounded-full transition-colors" aria-label="Next Product">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="relative" onClick={handleInteract}>
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

                {/* Tabs for Uses/Ingredients & Instructions */}
                <ProductTabs product={product} />
              </div>

              {/* Right Column (Dynamic) */}
              <div className="relative min-h-[400px] lg:min-h-0 flex flex-col">
                <div className="flex flex-col justify-start flex-1">
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
                </div> {/* Closes flex-col justify-start */}
              </div> {/* Closes Right Column */}
            </div> {/* Closes Grid */}
          </motion.div>
        </AnimatePresence>
      </div>

      {product.guide && <UsageGuide product={product} />}

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

function ProductTabs({ product }) {
  const [activeTab, setActiveTab] = useState('ingredients');

  useEffect(() => {
    setActiveTab('ingredients')
  }, [product.id])

  if (!product.guide) return null;

  return (
    <div className="mt-8 w-full max-w-[600px]">
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
              <ul className="space-y-3">
                {product.guide.ingredients?.map((ing, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-navy-soft">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${ing.inBundle ? 'bg-crimson/80 dark:bg-rose-400/90' : 'bg-navy/40'}`} />
                    <span className={`font-medium ${ing.inBundle ? 'text-crimson dark:text-rose-400' : 'text-navy'}`}>{ing.name}</span>
                    {ing.inBundle && (
                      <span className="text-[10px] uppercase font-bold text-navy ml-auto border border-navy/20 bg-white dark:bg-shell-deep dark:border-line dark:text-navy rounded px-2 py-0.5 shadow-sm">
                        In Bundle
                      </span>
                    )}
                  </li>
                ))}
              </ul>
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
              <ol className="space-y-5">
                {product.guide.steps?.map((step, i) => (
                  <li key={i} className="flex gap-4 text-sm text-navy-soft">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-cream dark:bg-shell-deep dark:border dark:border-line dark:text-navy font-serif font-bold text-xs shadow-sm">
                      {i + 1}
                    </span>
                    <p className="leading-relaxed pt-0.5">{step}</p>
                  </li>
                ))}
              </ol>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function UsageGuide({ product }) {
  const { guide } = product
  const { addToCart, setCartOpen } = useStore()
  const buyBundle = () => {
    addToCart(product.id)
    if (guide.bundle.partner) addToCart(guide.bundle.partner)
    setCartOpen(true)
  }
  return (
    <section id="usage-guide" className="mt-16 overflow-hidden rounded-lg border border-line bg-paper dark:bg-shell/20 shadow-card">
      <Tricolor />
      <div className="grid gap-8 p-6 lg:grid-cols-[1fr_350px] lg:items-start md:p-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-navy-soft">
            Preparation & Cooking
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight md:text-3xl text-navy">
            {guide.title}
          </h2>
          <ol className="mt-8 space-y-5">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy font-serif text-[13px] font-semibold text-cream dark:bg-shell-deep dark:border dark:border-line dark:text-navy mt-0.5 shadow-sm">
                  {i + 1}
                </span>
                <p className="text-[15px] leading-relaxed text-navy-soft">{step}</p>
              </li>
            ))}
          </ol>
        </div>
        
        <div className="rounded-lg bg-shell/50 dark:bg-shell-deep p-6 border border-line/50 flex flex-col h-full">
          {guide.ingredients && (
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-navy-soft mb-4">
                Ingredients Needed
              </p>
              <ul className="space-y-3">
                {guide.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${ing.inBundle ? 'bg-crimson/80 dark:bg-rose-400/90' : 'bg-navy/40'}`} />
                    <span className={`text-[14px] font-medium ${ing.inBundle ? 'text-crimson dark:text-rose-400' : 'text-navy-soft'}`}>
                      {ing.name} {!ing.inBundle && <span className="text-[12px] text-navy-faint ml-1">(pantry)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-auto pt-5 border-t border-line/50 text-center">
            <p className="font-serif text-lg font-semibold leading-snug text-navy">
              {guide.bundle.label.split(' — ')[1] ?? guide.bundle.label}
            </p>
            <p className="mt-1 text-[13px] text-navy-soft">Everything in this recipe, one box.</p>
            <p className="mt-3 text-2xl font-bold text-crimson tabular">{peso(guide.bundle.price)}</p>
            <RedButton className="mt-5 w-full py-3 shadow-md" onClick={buyBundle}>
              Buy the bundle
            </RedButton>
          </div>
        </div>
      </div>
    </section>
  )
}
