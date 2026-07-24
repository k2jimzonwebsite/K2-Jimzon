import { useStore } from '../../context/StoreContext'

// Storefront bottom tab bar (mobile only). Quick-jump between the shopper pages.
// Cart lives in the header, so it's not repeated here.
export default function MobileNavBar() {
  const { view, go } = useStore()

  const navItems = [
    { key: 'home', label: 'Home', icon: '🏠' },
    { key: 'catalog', label: 'Shop', icon: '🛍️' },
    { key: 'pasabuy', label: 'Pasabuy', icon: '✈️' },
    { key: 'wholesale', label: 'Wholesale', icon: '🏷️' },
  ]

  // Treat product pages as part of "Shop" so the tab stays highlighted.
  const activeKey = (view === 'product' || view === 'master_product') ? 'catalog' : view

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B132B]/95 backdrop-blur-md border-t border-white/10 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] shadow-2xl">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeKey === item.key
          return (
            <button
              key={item.key}
              onClick={() => go(item.key)}
              className={`flex flex-col items-center justify-center min-h-[46px] flex-1 px-1 py-1 transition-all active:scale-95 ${
                isActive ? 'text-amber' : 'text-white/60 hover:text-white'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold text-amber' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
