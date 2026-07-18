import { useStore } from '../../context/StoreContext'
import { BagIcon, BoxIcon, GridIcon, PlaneIcon, ShieldIcon, UserIcon } from '../ui/icons'

const VIEWS = [
  { id: 'home', label: 'Home', icon: GridIcon },
  { id: 'product', label: 'Product', icon: BoxIcon },
  { id: 'pasabuy', label: 'Pasabuy', icon: PlaneIcon },
  { id: 'checkout', label: 'Checkout', icon: BagIcon },
  { id: 'wholesale', label: 'Wholesale', icon: UserIcon },
  { id: 'admin', label: 'Admin', icon: ShieldIcon },
]

// Prototype view switcher — quiet chrome, distinct from the product UI.
export default function DemoRail() {
  const { view, go, isWholesale } = useStore()
  const active = view === 'confirmation' ? 'checkout' : view

  return (
    <>
      {/* Desktop rail */}
      <div className="sticky top-0 z-50 hidden border-b border-line bg-shell md:block">
        <div className="mx-auto flex h-10 max-w-6xl items-center gap-1 px-4">
          <span className="mr-3 text-xs font-semibold uppercase tracking-[0.24em] text-navy-faint">
            Prototype
          </span>
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => go(v.id)}
              className={
                'relative rounded-md px-3 py-1 text-sm font-medium transition-colors ' +
                (active === v.id
                  ? 'text-navy'
                  : 'text-navy-faint hover:text-navy')
              }
            >
              {v.label}
              {active === v.id && (
                <span className="absolute inset-x-3 -bottom-[5px] h-[2px] rounded-full bg-crimson" />
              )}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-2 text-xs text-navy-faint">
            <span className={'h-1.5 w-1.5 rounded-full pulse-dot ' + (isWholesale ? 'bg-blue' : 'bg-forest')} />
            {isWholesale ? 'Wholesale account' : 'Retail customer'}
          </span>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Prototype views"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-cream/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="grid grid-cols-6">
          {VIEWS.map((v) => {
            const Ico = v.icon
            const on = active === v.id
            return (
              <button
                key={v.id}
                onClick={() => go(v.id)}
                className={
                  'flex flex-col items-center gap-1 pb-2.5 pt-1.5 text-xs font-medium transition-colors ' +
                  (on ? 'text-crimson' : 'text-navy-faint')
                }
              >
                <span className={'h-[2px] w-7 rounded-full ' + (on ? 'bg-crimson' : 'bg-transparent')} />
                <Ico size={18} />
                {v.label}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
