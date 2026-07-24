import { useState } from 'react'
import { useStore } from '../context/StoreContext'
import { Wordmark } from './ui/bits'
import { BagIcon, SearchIcon, MoonIcon, SunIcon } from './ui/icons'
import VoucherHuntCenterModal from './VoucherHuntCenterModal'
import CustomerProfileModal from './CustomerProfileModal'

function SearchBox({ className = '' }) {
  const { query, setQuery, go, view } = useStore()
  return (
    <label className={'relative block ' + className}>
      <SearchIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-faint" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          const val = e.target.value
          setQuery(val)
          if (val.trim().length > 0) {
            if (view !== 'catalog') go('catalog')
          }
        }}
        placeholder='Try "Lavazza", "Biscoff", "pesto"…'
        className="w-full rounded-full border border-line bg-shell py-2.5 pl-9 pr-4 text-sm placeholder:text-navy-faint focus:border-navy/40 focus:bg-paper focus:outline-none"
      />
    </label>
  )
}

export default function StoreHeader() {
  const { go, view, count, setCartOpen, isWholesale, setIsWholesale, isDark, toggleDarkMode } = useStore()
  const [showVoucherHunt, setShowVoucherHunt] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur-xl transition-colors">
      {/* Announcement Banner */}
      <div className="bg-shell/80 border-b border-line px-4 py-1.5 text-center text-xs font-semibold text-navy-soft flex items-center justify-center gap-2">
        <span>✈ Next Milan consignment lands <span className="font-extrabold text-gold">22 July</span></span>
        <span className="hidden sm:inline">· Free Metro Manila delivery over ₱2,500</span>
        <button
          onClick={() => setShowVoucherHunt(true)}
          className="ml-2 bg-gold/20 hover:bg-gold/30 text-gold font-bold px-2 py-0.5 rounded border border-gold/40 transition-all text-xs"
        >
          🎁 Voucher Hunt
        </button>
      </div>

      {isWholesale && (
        <div className="flex items-center justify-center gap-3 bg-blue/15 border-b border-line px-4 py-1.5 text-xs font-semibold text-blue">
          <span className="inline-flex h-2 w-2 rounded-full bg-blue pulse-dot" />
          Wholesale pricing active — Bella Vita Trading
          <button onClick={() => setIsWholesale(false)} className="px-2 py-1 -mx-2 underline decoration-blue/40 underline-offset-2 hover:decoration-blue font-bold">
            Sign out
          </button>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5 md:gap-6">
        <Wordmark onClick={() => go('home')} />

        <SearchBox className="ml-auto hidden max-w-sm flex-1 md:block" />

        <button
          onClick={() => setShowVoucherHunt(true)}
          className="ml-auto hidden sm:flex items-center gap-1.5 bg-gold/15 hover:bg-gold/25 text-gold font-bold text-xs px-3.5 py-2 rounded-full border border-gold/30 transition-all active:scale-95 shadow-sm"
        >
          <span>🎁</span>
          <span>Voucher Hunt</span>
        </button>

        <button
          onClick={() => setShowProfileModal(true)}
          className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold text-navy hover:bg-shell border border-line flex items-center gap-1.5 transition-colors"
          title="Account Profile & Delivery Settings"
        >
          <span>👤</span>
          <span className="hidden sm:inline">My Account</span>
        </button>

        <button
          onClick={() => go('wholesale')}
          className="whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold text-blue transition-colors hover:bg-blue/10 border border-blue/20"
        >
          {isWholesale ? 'Wholesale Portal' : 'Wholesale Login'}
        </button>

        <button
          onClick={() => setCartOpen(true)}
          className="relative rounded-lg p-2.5 text-navy transition-colors hover:bg-shell border border-line"
          aria-label={`Open cart, ${count} items`}
        >
          <BagIcon size={21} />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-crimson px-1.5 text-xs font-extrabold text-white shadow-md">
              {count}
            </span>
          )}
        </button>

        <button
          onClick={toggleDarkMode}
          className="relative rounded-lg p-2.5 text-navy transition-colors hover:bg-shell border border-line flex items-center justify-center"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <SunIcon size={20} className="text-gold" /> : <MoonIcon size={20} className="text-navy" />}
        </button>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="border-t border-line bg-shell/40 px-4 py-2">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => go('home')}
              className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all flex items-center gap-1.5 ${
                view === 'home'
                  ? 'bg-navy border-navy text-cream shadow-md'
                  : 'bg-cream border-line text-navy hover:border-crimson/50 hover:text-crimson hover:-translate-y-0.5 hover:shadow-card'
              }`}
            >
              <span>🏠</span> Home
            </button>

            <button
              onClick={() => go('catalog')}
              className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all flex items-center gap-1.5 ${
                view === 'catalog'
                  ? 'bg-navy border-navy text-cream shadow-md'
                  : 'bg-cream border-line text-navy hover:border-crimson/50 hover:text-crimson hover:-translate-y-0.5 hover:shadow-card'
              }`}
            >
              <span>📦</span> Inventory & Catalog
            </button>

            <button
              onClick={() => go('pasabuy')}
              className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all flex items-center gap-1.5 ${
                view === 'pasabuy'
                  ? 'bg-navy border-navy text-cream shadow-md'
                  : 'bg-cream border-line text-navy hover:border-crimson/50 hover:text-crimson hover:-translate-y-0.5 hover:shadow-card'
              }`}
            >
              <span>✈️</span> Pasabuy Sourcing
            </button>

            <button
              onClick={() => go('wholesale')}
              className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all flex items-center gap-1.5 ${
                view === 'wholesale'
                  ? 'bg-navy border-navy text-cream shadow-md'
                  : 'bg-cream border-line text-navy hover:border-crimson/50 hover:text-crimson hover:-translate-y-0.5 hover:shadow-card'
              }`}
            >
              <span>💼</span> Wholesale Portal
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs font-semibold text-navy-faint">
            <span>🇮🇹 Direct Milan Imports</span>
            <span>•</span>
            <span>⚡ 24h Pasabuy Quotes</span>
          </div>
        </div>
      </div>

      {/* Mobile search */}
      <div className="px-4 pb-3 pt-2 md:hidden">
        <SearchBox />
      </div>

      <VoucherHuntCenterModal
        isOpen={showVoucherHunt}
        onClose={() => setShowVoucherHunt(false)}
      />

      <CustomerProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </header>
  )
}
