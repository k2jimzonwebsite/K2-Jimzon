import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { useGlobeCms } from '../../data/globeCms'
import ProductGlobe from '../globe/ProductGlobe'
import GlobeOverlay from '../globe/GlobeOverlay'
import { Kicker } from '../ui/bits'
import { StarIcon } from '../ui/icons'

// Dedicated, mobile-first "spin the globe to read reviews" trust section.
export default function GlobeSection() {
  const { enabledGlobeProducts, reviews, isLoading, cmsError } = useGlobeCms()
  const [selected, setSelected] = useState(null)
  const hasProducts = enabledGlobeProducts?.length > 0
  const reviewCount = reviews?.length || 0

  return (
    <section className="store-atmosphere relative overflow-hidden border-y border-line px-4 py-14 md:py-20">

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Heading — framed around trust / reviews */}
        <div className="mx-auto mb-7 max-w-2xl text-center md:mb-9">
          <Kicker className="flex items-center justify-center gap-2">
            <StarIcon size={14} className="text-gold" /> Interactive review globe
          </Kicker>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
            Reviews, mapped to the products.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-navy-soft">
            Spin the product globe and open an item to read its published customer feedback.
          </p>
        </div>

        {/* Globe stage — deliberately large on phones so it's usable */}
        <div className="relative h-[62vh] min-h-[420px] w-full overflow-hidden rounded-2xl border border-line bg-shell/45 sm:h-[500px] md:h-[560px]">
          {/* Warm ground shadow */}
          <div className="pointer-events-none absolute top-[82%] left-1/2 z-0 h-[50px] w-[70%] -translate-x-1/2 rounded-full bg-[#9A6A45]/20 blur-2xl" />

          {hasProducts ? (
            <div className="absolute inset-0 z-10">
              <ProductGlobe products={enabledGlobeProducts} onSelect={setSelected} />
            </div>
          ) : (
            <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center" role="status">
              <div className="max-w-sm">
                {isLoading && <span className="store-loading-mark mx-auto block" aria-hidden />}
                <p className="mt-4 font-sans text-base font-bold text-navy">
                  {isLoading ? 'Preparing the product globe…' : 'The product globe is temporarily unavailable.'}
                </p>
                <p className="mt-2 text-sm leading-6 text-navy-soft">The rest of the storefront remains available while review products reconnect.</p>
              </div>
            </div>
          )}

          {/* Interaction hint */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-shell/80 to-transparent p-5 pt-16">
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-navy-faint">
              {hasProducts ? 'Drag to spin · Tap to read reviews' : 'Review experience status'}
            </p>
          </div>
        </div>
        {hasProducts && (cmsError || reviewCount === 0) && (
          <p className="mt-4 text-center font-sans text-sm font-medium text-navy-soft" role="status">
            The 3D globe is available. Published review details are reconnecting.
          </p>
        )}
      </div>

      <AnimatePresence>
        {selected && <GlobeOverlay product={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  )
}
