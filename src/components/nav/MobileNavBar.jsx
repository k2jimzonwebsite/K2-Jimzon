import { useEffect, useRef } from 'react'
import { useStore } from '../../context/StoreContext'
import { HomeIcon, GridIcon, PlaneIcon, BriefcaseIcon, ChatIcon } from '../ui/icons'
import { ActionElement } from '../ui/bits'
import { STOREFRONT_VIEW_TO_PATH } from '../../lib/storefrontRoutes'

export default function MobileNavBar() {
  const { view, go } = useStore()
  const navRef = useRef(null)
  useEffect(() => {
    const nav = navRef.current
    const root = nav.closest('.storefront-ui')
    const observer = new ResizeObserver(() => root.style.setProperty('--k2-mobile-nav-height', `${nav.offsetHeight}px`))
    observer.observe(nav, { box: 'border-box' })
    return () => { observer.disconnect(); root.style.removeProperty('--k2-mobile-nav-height') }
  }, [])
  const activeKey = view === 'master_product' ? 'catalog' : view
  const navItems = [
    { key: 'home', label: 'Home', icon: HomeIcon },
    { key: 'catalog', label: 'Shop', icon: GridIcon },
    { key: 'pasabuy', label: 'Pasabuy', icon: PlaneIcon },
    { key: 'wholesale', label: 'Wholesale', icon: BriefcaseIcon },
    { key: 'contact', label: 'Contact', icon: ChatIcon },
  ]

  return (
    <nav ref={navRef} style={{ paddingBottom: 'calc(0.35rem + var(--k2-safe-bottom, env(safe-area-inset-bottom, 0px)))' }} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-2 pt-1.5 backdrop-blur-xl lg:hidden" aria-label="Mobile storefront">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeKey === item.key
          const ItemIcon = item.icon
          return (
            <ActionElement
              key={item.key}
              href={STOREFRONT_VIEW_TO_PATH[item.key]}
              onClick={() => go(item.key)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.key === 'catalog' ? 'Inventory & Catalog' : item.label}
              className={`relative flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 transition-[transform,color] duration-150 active:scale-[0.97] ${isActive ? 'text-crimson' : 'text-navy-faint'}`}
            >
              <ItemIcon size={19} />
              <span style={{ overflowWrap: 'anywhere' }} className={`max-w-full text-xs leading-4 ${isActive ? 'font-bold' : 'font-semibold'}`}>{item.label}</span>
              {isActive && <span className="absolute -top-1.5 h-0.5 w-7 rounded-full bg-crimson" />}
            </ActionElement>
          )
        })}
      </div>
    </nav>
  )
}
