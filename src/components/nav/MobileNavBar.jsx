import { useStore } from '../../context/StoreContext'
import { HomeIcon, GridIcon, PlaneIcon, BriefcaseIcon, InboxIcon } from '../ui/icons'
import { guestBffEnabled } from '../../services/guestCommerceService'

export default function MobileNavBar() {
  const { view, go } = useStore()
  const activeKey = view === 'product' || view === 'master_product' ? 'catalog' : view
  const navItems = [
    { key: 'home', label: 'Home', icon: HomeIcon },
    { key: 'catalog', label: 'Shop', icon: GridIcon },
    { key: 'pasabuy', label: 'Pasabuy', icon: PlaneIcon },
    { key: 'wholesale', label: 'Wholesale', icon: BriefcaseIcon },
    ...(guestBffEnabled() ? [{ key: 'messages', label: 'Messages', icon: InboxIcon }] : []),
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-2 pb-[calc(0.35rem+env(safe-area-inset-bottom,0px))] pt-1.5 backdrop-blur-xl md:hidden" aria-label="Mobile storefront">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeKey === item.key
          const ItemIcon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => go(item.key)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.key === 'catalog' ? 'Inventory & Catalog' : item.label}
              className={`relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 px-1 transition-[transform,color] duration-150 active:scale-[0.97] ${isActive ? 'text-crimson' : 'text-navy-faint'}`}
            >
              <ItemIcon size={19} />
              <span className={`text-xs leading-4 ${isActive ? 'font-bold' : 'font-semibold'}`}>{item.label}</span>
              {isActive && <span className="absolute -top-1.5 h-0.5 w-7 rounded-full bg-crimson" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
