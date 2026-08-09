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
    <section className="store-atmosphere relative overflow-hidden border-y border-line px-4 py-14 md:py-20">

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Heading — framed around trust / reviews */}
        <div className="mx-auto mb-7 max-w-2xl text-center md:mb-9">
          <Kicker className="flex items-center justify-center gap-2">
            <StarIcon size={14} className="text-gold" /> Real customer reviews
          </Kicker>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
            Reviews, mapped to the products.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-navy-soft">
            Explore published customer feedback attached to the items in our reviewed catalog.
          </p>
        </div>

        {/* Globe stage — deliberately large on phones so it's usable */}
        <div className="relative h-[62vh] min-h-[420px] w-full overflow-hidden rounded-2xl border border-line bg-shell/45 sm:h-[500px] md:h-[560px]">
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
