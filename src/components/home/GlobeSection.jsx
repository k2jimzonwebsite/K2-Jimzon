import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { useGlobeCms } from '../../data/globeCms'
import ProductGlobe from '../globe/ProductGlobe'
import GlobeOverlay from '../globe/GlobeOverlay'
import { Kicker } from '../ui/bits'
import { StarIcon } from '../ui/icons'

// Dedicated, mobile-first "spin the globe to read reviews" trust section.
export default function GlobeSection() {
  const { enabledGlobeProducts } = useGlobeCms()
  const [selected, setSelected] = useState(null)

  if (!enabledGlobeProducts || enabledGlobeProducts.length === 0) return null

  return (
    <section className="relative overflow-hidden border-y border-line bg-shell/60 px-4 py-12 md:py-20">
      {/* Warm depth blobs */}
      <div className="pointer-events-none absolute -top-[10%] -right-[10%] h-[60%] w-[60%] rounded-full bg-[#9A6A45] opacity-15 mix-blend-multiply blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-[20%] -left-[10%] h-[60%] w-[60%] rounded-full bg-[#B84E3A] opacity-[0.12] mix-blend-overlay blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Heading — framed around trust / reviews */}
        <div className="mx-auto mb-6 max-w-xl text-center md:mb-8">
          <Kicker className="flex items-center justify-center gap-2">
            <StarIcon size={14} className="text-gold" /> Real customer reviews
          </Kicker>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
            Spin the globe. Tap a product.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-navy-soft">
            Every item is loved by real buyers across the Philippines. Give it a spin and tap
            any product to read their reviews.
          </p>
        </div>

        {/* Globe stage — deliberately large on phones so it's usable */}
        <div className="relative h-[68vh] min-h-[440px] w-full overflow-hidden rounded-3xl border border-line bg-cream/40 shadow-card sm:h-[520px] md:h-[580px]">
          {/* Warm ground shadow */}
          <div className="pointer-events-none absolute top-[82%] left-1/2 z-0 h-[50px] w-[70%] -translate-x-1/2 rounded-full bg-[#9A6A45]/20 blur-2xl" />

          <div className="absolute inset-0 z-10">
            <ProductGlobe products={enabledGlobeProducts} onSelect={setSelected} />
          </div>

          {/* Interaction hint */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-shell/80 to-transparent p-5 pt-16">
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-navy-faint">
              Drag to spin · Tap to read reviews
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && <GlobeOverlay product={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  )
}
