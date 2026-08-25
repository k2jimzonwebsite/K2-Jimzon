import { useMemo } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useStore } from '../../context/StoreContext'
import { BoxIcon, CupIcon, HeartIcon, PlaneIcon, SparkleIcon, StarIcon, ArrowIcon } from '../ui/icons'

const CABINET_SECTIONS = [
  {
    cat: 'Snack & Sweets',
    title: 'Dolci & Biscotti',
    subtitle: 'Morning biscuits, wafers, and chocolates',
    icon: StarIcon,
    queryMatch: 'Snack',
  },
  {
    cat: 'Beverages',
    title: 'Caffè & Bevande',
    subtitle: 'Italian espresso roasts and drinks',
    icon: CupIcon,
    queryMatch: 'Beverages',
  },
  {
    cat: 'Seasoning, Staple Foods & Baking Ingredients',
    title: 'Pasta & Dispensa',
    subtitle: 'Bronze-die pasta, tomato sauces, and pantry staples',
    icon: BoxIcon,
    queryMatch: 'Seasoning',
  },
  {
    cat: 'Bath & Body',
    title: 'Cura & Benessere',
    subtitle: 'Traditional Italian soaps and body care',
    icon: HeartIcon,
    queryMatch: 'Bath',
  },
  {
    cat: 'Skin Care',
    title: 'Profumeria & Bellezza',
    subtitle: 'Italian fragrances, lotions, and skin care',
    icon: SparkleIcon,
    queryMatch: 'Skin',
  },
  {
    cat: 'Pasabuy',
    title: 'Pasabuy su Misura',
    subtitle: 'Custom sourcing for items not currently in stock',
    icon: PlaneIcon,
    isPasabuy: true,
  },
]

export default function CategoryTiles() {
  const { setCategory, setQuery, go, listedProducts: products } = useStore()
  const reducedMotion = useReducedMotion()

  const counts = useMemo(() => {
    const result = {}
    if (!products) return result
    products.forEach((p) => {
      const cat = p.category || ''
      CABINET_SECTIONS.forEach((section) => {
        if (section.isPasabuy) return
        if (cat === section.cat || cat.includes(section.queryMatch)) {
          result[section.title] = (result[section.title] || 0) + 1
        }
      })
    })
    return result
  }, [products])

  const open = (section) => {
    if (section.isPasabuy) return go('pasabuy')
    setQuery('')
    setCategory(section.cat)
    go('catalog')
  }

  return (
    <section className="store-section py-14 md:py-18" aria-label="The Italian Cabinet">
      <div className="mb-8 flex items-end justify-between gap-5 border-b border-[var(--store-surface-border)] pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-crimson">Browse By Category</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-navy md:text-4xl">
            The Cabinet
          </h2>
          <p className="mt-1.5 text-sm text-navy-soft">
            Browse our Italian grocery shelves and pantry staples.
          </p>
        </div>
        <button
          onClick={() => go('catalog')}
          className="hidden min-h-11 items-center gap-2 text-sm font-bold text-navy transition-colors hover:text-crimson sm:flex cursor-pointer"
        >
          View all products <ArrowIcon size={15} />
        </button>
      </div>

      <motion.div
        initial={reducedMotion ? false : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {CABINET_SECTIONS.map((section) => {
          const { title, subtitle, icon: CategoryIcon, isPasabuy } = section
          const count = counts[title]

          return (
            <motion.button
              key={title}
              onClick={() => open(section)}
              variants={{
                hidden: { opacity: 0, transform: 'translateY(8px)' },
                visible: { opacity: 1, transform: 'translateY(0)', transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="group relative flex min-h-[5.5rem] items-center justify-between rounded-xl border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] p-4 text-left shadow-[var(--store-surface-shadow)] transition-all duration-200 hover:border-crimson/30 hover:shadow-md cursor-pointer sm:p-5"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--store-surface-border)] bg-[var(--product-img-bg)] text-crimson transition-colors duration-150 group-hover:border-crimson/25 group-hover:bg-crimson-wash">
                  <CategoryIcon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="block font-serif text-base font-semibold text-navy group-hover:text-crimson truncate">
                      {title}
                    </span>
                    {count !== undefined && count > 0 && (
                      <span className="rounded-full bg-shell px-2 py-0.5 text-[10px] font-bold tabular text-navy-soft">
                        {count}
                      </span>
                    )}
                    {isPasabuy && (
                      <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-bold text-forest">
                        Custom order
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 block text-xs text-navy-faint truncate">
                    {subtitle}
                  </span>
                </div>
              </div>
              <ArrowIcon
                size={15}
                className="ml-3 shrink-0 text-navy-faint transition-transform duration-150 group-hover:translate-x-1 group-hover:text-crimson"
              />
            </motion.button>
          )
        })}
      </motion.div>
    </section>
  )
}
