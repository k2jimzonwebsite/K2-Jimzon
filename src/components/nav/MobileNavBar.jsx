import { useStore } from '../../context/StoreContext'

export default function MobileNavBar() {
  const { view, setView, cart, setCartOpen } = useStore()

  const cartItemCount = cart ? cart.reduce((sum, item) => sum + (item.qty || 1), 0) : 0

  const navItems = [
    { key: 'home', label: 'Home', icon: '🏠' },
    { key: 'catalog', label: 'Catalog', icon: '🛍️' },
    { key: 'pasabuy', label: 'Pasabuy', icon: '✈️' },
    { key: 'cart', label: 'Cart', icon: '🛒', isCart: true, badge: cartItemCount },
  ]

  return (
    <nav className="block md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B132B]/95 backdrop-blur-md border-t border-white/10 px-3 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] shadow-2xl">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = view === item.key

          if (item.isCart) {
            return (
              <button
                key={item.key}
                onClick={() => setCartOpen(true)}
                className="relative flex flex-col items-center justify-center min-h-[44px] min-w-[56px] px-2 py-1 text-white/70 hover:text-white transition-all active:scale-95"
              >
                <div className="relative">
                  <span className="text-lg leading-none">{item.icon}</span>
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-crimson text-white font-mono font-bold text-[10px] h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center animate-bounce shadow-md">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono font-semibold mt-0.5">{item.label}</span>
              </button>
            )
          }

          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[56px] px-2 py-1 transition-all active:scale-95 ${
                isActive ? 'text-amber font-bold' : 'text-white/60 hover:text-white'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className={`text-[10px] font-mono ${isActive ? 'font-bold text-amber' : 'font-medium'}`}>
                {item.label}
              </span>
              {isActive && <span className="h-1 w-1 rounded-full bg-amber mt-0.5" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
