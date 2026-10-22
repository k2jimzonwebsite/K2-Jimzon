import { useStore } from '../../context/StoreContext'
import { BoxIcon, PlaneIcon, ArrowIcon } from '../ui/icons'

export default function CategoryTiles() {
  const { setCategory, setQuery, go, storeCategories = [] } = useStore()
  const sections = [...storeCategories.map(({ name, count }) => ({
    cat: name, title: name, count, icon: BoxIcon,
    subtitle: `${count} listed product${count === 1 ? '' : 's'}`,
  })), { title: 'Pasabuy su Misura', subtitle: 'Request something from Italy', icon: PlaneIcon, isPasabuy: true }]

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
            Browse the categories in our current catalog.
          </p>
        </div>
        <button
          onClick={() => go('catalog')}
          className="hidden min-h-11 items-center gap-2 text-sm font-bold text-navy transition-colors hover:text-crimson sm:flex cursor-pointer"
        >
          View all products <ArrowIcon size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const { title, subtitle, count, icon: CategoryIcon, isPasabuy } = section

          return (
            <button
              key={isPasabuy ? 'service:pasabuy' : `category:${title}`}
              onClick={() => open(section)}
              className="group relative flex min-h-[5.5rem] items-center justify-between rounded-xl border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] p-4 text-left shadow-[var(--store-surface-shadow)] transition-[border-color,box-shadow,transform] duration-200 hover:border-crimson/30 hover:shadow-md active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none cursor-pointer sm:p-5"
            >
              {/* Subtle Italian apothecary corner tick-marks */}
              <span className="pointer-events-none absolute top-2 right-2 h-1.5 w-1.5 border-t border-r border-crimson/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100" aria-hidden="true" />
              <span className="pointer-events-none absolute bottom-2 left-2 h-1.5 w-1.5 border-b border-l border-crimson/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100" aria-hidden="true" />
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--store-surface-border)] bg-[var(--product-img-bg)] text-crimson transition-colors duration-150 group-hover:border-crimson/25 group-hover:bg-crimson-wash">
                  <CategoryIcon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="block text-base font-semibold text-navy group-hover:text-crimson break-words">
                      {title}
                    </span>
                    {count !== undefined && count > 0 && (
                      <span className="rounded-full bg-shell px-2 py-0.5 text-xs font-bold tabular text-navy-soft">
                        {count}
                      </span>
                    )}
                    {isPasabuy && (
                      <span className="rounded-full bg-forest/10 px-2 py-0.5 text-xs font-bold text-forest">
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
            </button>
          )
        })}
      </div>
    </section>
  )
}
