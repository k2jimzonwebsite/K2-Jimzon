import { motion, useReducedMotion } from 'motion/react'
import { useStore } from '../../context/StoreContext'
import { BoxIcon, CupIcon, HeartIcon, PlaneIcon, SparkleIcon, StarIcon, ArrowIcon } from '../ui/icons'
import { Kicker } from '../ui/bits'

const CATEGORIES = [
  { cat: 'Seasoning, Staple Foods & Baking Ingredients', label: 'Pantry & baking', note: 'Staples and ingredients', icon: BoxIcon },
  { cat: 'Snack & Sweets', label: 'Snacks & sweets', note: 'Biscuits and treats', icon: StarIcon },
  { cat: 'Beverages', label: 'Coffee & drinks', note: 'Italian café favorites', icon: CupIcon },
  { cat: 'Bath & Body', label: 'Bath & body', note: 'Daily Italian care', icon: HeartIcon },
  { cat: 'Skin Care', label: 'Beauty cabinet', note: 'Skin and fragrance', icon: SparkleIcon },
  { cat: 'Pasabuy', label: 'Request from Italy', note: 'Tell us the exact item', icon: PlaneIcon },
]

export default function CategoryTiles() {
  const { setCategory, setQuery, go } = useStore()
  const reducedMotion = useReducedMotion()

  const open = (category) => {
    if (category === 'Pasabuy') return go('pasabuy')
    setQuery('')
    setCategory(category)
    go('catalog')
  }

  return (
    <section className="store-section py-14 md:py-18">
      <div className="mb-7 flex items-end justify-between gap-5">
        <div>
          <Kicker>Browse the cabinet</Kicker>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-navy md:text-4xl">Find your Italian favorite</h2>
        </div>
        <button onClick={() => go('catalog')} className="hidden min-h-11 items-center gap-2 text-sm font-bold text-navy transition-colors hover:text-crimson sm:flex">View all products <ArrowIcon size={15} /></button>
      </div>

      <motion.div
        initial={reducedMotion ? false : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ visible: { transition: { staggerChildren: 0.045 } } }}
        className="grid border-l border-t border-[var(--store-surface-border)] sm:grid-cols-2 lg:grid-cols-3"
      >
        {CATEGORIES.map(({ cat, label, note, icon: CategoryIcon }) => (
          <motion.button
            key={cat}
            onClick={() => open(cat)}
            variants={{
              hidden: { opacity: 0, transform: 'translateY(8px)' },
              visible: { opacity: 1, transform: 'translateY(0)', transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
            }}
            className="category-tile group relative flex min-h-24 items-center gap-4 overflow-hidden border-b border-r border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] p-4 text-left sm:p-5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--store-surface-border)] bg-[var(--product-img-bg)] text-crimson transition-[transform,border-color,background-color] duration-200 group-hover:border-crimson/25 group-hover:bg-crimson-wash">
              <CategoryIcon size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-base font-semibold text-navy group-hover:text-crimson">{label}</span>
              <span className="mt-0.5 block text-xs text-navy-faint">{note}</span>
            </span>
            <ArrowIcon size={15} className="text-navy-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-crimson" />
          </motion.button>
        ))}
      </motion.div>
    </section>
  )
}
