import { useState, useEffect, Suspense, lazy } from 'react'
import {
  BoxIcon, GlobeIcon, GridIcon, SyncIcon, UserIcon, InboxIcon,
  PlaneIcon, BagIcon, StarIcon, ShieldIcon, BarcodeIcon, EyeIcon,
} from '../../components/ui/icons'
import { supabase } from '../../lib/supabaseClient'
import { useStore } from '../../context/StoreContext'
import CommandPalette from './CommandPalette'
import AdminAuthModal from './AdminAuthModal'
import ErrorBoundary from '../../components/ui/ErrorBoundary'
import DailyTaskNotificationDrawer from './DailyTaskNotificationDrawer'
import AdminAiCopilotModal from './AdminAiCopilotModal'
import SystemDevOpsModal from './SystemDevOpsModal'
import AdminToolsWidget from './AdminToolsWidget'
import StartHereGuide from './StartHereGuide'

// Lazy loaded heavy components to reduce initial bundle lag
const Kanban = lazy(() => import('./Kanban'))
const Sheet = lazy(() => import('./Sheet'))
const InventoryGrid = lazy(() => import('./InventoryGrid'))
const GlobeCms = lazy(() => import('./GlobeCms'))
const AiDrafts = lazy(() => import('./AiDrafts'))
const Inbox = lazy(() => import('./Inbox'))
const Customers = lazy(() => import('./CustomerCrmBroadcast'))
const Overview = lazy(() => import('./Overview'))
const Suppliers = lazy(() => import('./Suppliers'))
const ConsignmentManager = lazy(() => import('./ConsignmentManager'))
const BulkCsvImportModal = lazy(() => import('./BulkCsvImportModal'))
const ChannelIntegrations = lazy(() => import('./ChannelIntegrations'))
const PasabuyManager = lazy(() => import('./PasabuyManager'))
const OmniOperationsHub = lazy(() => import('./OmniOperationsHub'))
const CouponManager = lazy(() => import('./CouponManager'))
const StaffPermissionManager = lazy(() => import('./StaffPermissionManager'))

// Single source of truth for every section: nav label, page title, subtitle, icon.
const SECTIONS = {
  overview:          { label: 'Home',                icon: GridIcon,    title: 'Home',                          desc: "Today's sales, stock alerts, and cargo status at a glance." },
  kanban:            { label: 'Flight Consignments', icon: PlaneIcon,   title: 'Italy Flight Consignments',     desc: 'Track flight cargo from Malpensa MXP → Manila NAIA.' },
  pasabuy_manager:   { label: 'Pasabuy Quotes',      icon: BagIcon,     title: 'Custom Pasabuy Quotes',         desc: 'Process shopper requests and calculate Italy landed costs.' },
  sourcing:          { label: 'AI Sourcing',         icon: SyncIcon,    title: 'AI Import Suggestions',         desc: 'Review AI-parsed products before publishing to inventory.' },
  suppliers:         { label: 'Suppliers',           icon: GlobeIcon,   title: 'Suppliers & Purchase Orders',   desc: 'Manage vendor relationships and purchase order deliveries.' },
  inventory:         { label: 'Inventory',           icon: BoxIcon,     title: 'Product Catalog & Stock',       desc: 'Master inventory across all channels.' },
  omni_hub:          { label: 'Fulfillment Hub',     icon: BarcodeIcon, title: 'Fulfillment & Staff Stations',  desc: 'Barcode pack-to-ship and Italy cargo box custody claims.' },
  inbox:             { label: 'Messages',            icon: InboxIcon,   title: 'Customer Messages',             desc: 'WhatsApp, Facebook, and Viber, with AI Copilot support.' },
  wholesale:         { label: 'Customers',           icon: UserIcon,    title: 'Customer Directory & VIPs',     desc: 'Order histories, lifetime spend, VIP approvals, and broadcasts.' },
  coupons:           { label: 'Coupons',             icon: StarIcon,    title: 'Coupons & Vouchers',            desc: 'Create and manage discount codes and voucher hunts.' },
  staff_permissions: { label: 'Staff & Roles',       icon: ShieldIcon,  title: 'Staff Roles & Permissions',     desc: 'Manage staff PINs, roles, and access permissions.' },
  integrations:      { label: 'Channels & Keys',     icon: GlobeIcon,   title: 'Marketplace API Keys',          desc: 'API keys, OAuth, and webhooks for Shopee, Lazada, TikTok, Meta.' },
  globe:             { label: 'Globe Display',        icon: EyeIcon,     title: '3D Globe Map Settings',         desc: 'Control which products appear on the interactive 3D map.' },
  consignment:       { label: 'Consignments',        icon: BoxIcon,     title: 'Consignment Manager',           desc: 'Manage consignment stock and settlements.' },
}

// Grouped navigation by daily workflow. Home stands alone; settings sink to the bottom.
const NAV_GROUPS = [
  { heading: null,             items: ['overview'] },
  { heading: 'Supply Chain',   items: ['kanban', 'pasabuy_manager', 'sourcing', 'suppliers'] },
  { heading: 'Sell & Fulfill', items: ['inventory', 'omni_hub', 'inbox', 'wholesale', 'coupons'] },
  { heading: 'Settings',       items: ['staff_permissions', 'integrations', 'globe'] },
]

function NavList({ section, onSelect, activeSkus }) {
  return (
    <div className="space-y-5">
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi}>
          {group.heading && (
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/55">
              {group.heading}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map(id => {
              const meta = SECTIONS[id]
              const Ico = meta.icon
              const on = section === id
              return (
                <button
                  key={id}
                  onClick={() => onSelect(id)}
                  className={
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ' +
                    (on
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-white/55 hover:text-white hover:bg-white/[0.04]')
                  }
                >
                  <Ico size={16} className={on ? 'text-blue' : 'text-white/60'} />
                  <span className="truncate">{meta.label}</span>
                  {id === 'inventory' && activeSkus > 0 && (
                    <span className="ml-auto text-[11px] font-medium text-white/60">{activeSkus}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Admin() {
  const { isAdmin, logoutAdmin, go } = useStore()
  const [section, setSection] = useState('overview')
  const [sheetMode, setSheetMode] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [showDailyTasks, setShowDailyTasks] = useState(false)
  const [showAiCopilot, setShowAiCopilot] = useState(false)
  const [showDevOpsModal, setShowDevOpsModal] = useState(false)
  const [showStartHere, setShowStartHere] = useState(false)

  // KPI states (kept here because the sidebar badge + Overview both read them)
  const [activeSkus, setActiveSkus] = useState(0)
  const [lowStock, setLowStock] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)

  useEffect(() => {
    if (!supabase || !isAdmin) return
    fetchKpis()

    const channel = supabase
      .channel('kpi_tracker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchKpis)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchKpis)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdmin])

  const fetchKpis = async () => {
    if (!supabase) return
    const [
      { count: activeCount },
      { count: lowStockCount },
      { count: pendingCount },
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }).lte('stock_available', 5),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('order_status', 'Pending'),
    ])

    if (activeCount !== null) setActiveSkus(activeCount)
    if (lowStockCount !== null) setLowStock(lowStockCount)
    if (pendingCount !== null) setPendingOrders(pendingCount)
  }

  if (!isAdmin) {
    return <AdminAuthModal isOpen={true} onClose={() => go('home')} />
  }

  const selectSection = (id) => {
    setSection(id)
    setSheetMode(id === 'inventory')
    setIsMobileMenuOpen(false)
  }

  const showSheet = sheetMode && section === 'inventory'
  const showGrid = !sheetMode && section === 'inventory'
  const meta = SECTIONS[section] || SECTIONS.overview

  return (
    <div className="flex min-h-screen bg-[#0B0E14] pb-20 text-white/80 md:pb-0 font-sans selection:bg-blue/30 selection:text-white">
      <CommandPalette isOpen={paletteOpen} setIsOpen={setPaletteOpen} setSection={setSection} />

      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-[#0A0C11] lg:flex">
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div>
            <p className="text-base font-semibold text-white tracking-tight">
              K2 Jimzon <span className="text-white/60 font-normal">BOS</span>
            </p>
          </div>
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center justify-center rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            title="Search (Ctrl+K)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-3 px-2 custom-scrollbar">
          <NavList section={section} onSelect={selectSection} activeSkus={activeSkus} />
        </div>

        <div className="border-t border-white/10 px-3 py-3 space-y-1 shrink-0">
          <button
            onClick={() => setShowDevOpsModal(true)}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors"
            title="DevOps & System Architecture"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue pulse-dot" />
            DevOps & System
          </button>
          <button
            onClick={logoutAdmin}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50 hover:text-crimson hover:bg-crimson/10 transition-colors"
          >
            <ShieldIcon size={15} /> Lock / Exit Admin
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0A0C11] border-b border-white/10 shrink-0 w-full lg:hidden">
          <p className="text-base font-semibold text-white">K2 Jimzon <span className="text-white/60 font-normal">BOS</span></p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPaletteOpen(true)} className="p-2 text-white/50 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-white/50 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-black/60" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="relative flex w-64 flex-col bg-[#0A0C11] border-r border-white/10 overflow-y-auto pt-4 pb-20 px-2">
              <div className="flex items-center justify-between px-3 mb-4">
                <p className="text-base font-semibold text-white">Menu</p>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white/50 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <NavList section={section} onSelect={selectSection} activeSkus={activeSkus} />
            </div>
          </div>
        )}

        <header className="flex flex-wrap items-center gap-4 border-b border-white/10 bg-[#0B0E14] px-4 py-4 md:px-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-white truncate">{meta.title}</h1>
            <p className="text-sm text-white/60 mt-0.5 truncate">{meta.desc}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowStartHere(true)}
              className="flex items-center gap-1.5 min-h-[40px] rounded-lg border border-gold/40 bg-gold/10 text-gold hover:bg-gold/20 text-sm font-medium px-3 transition-colors"
              title="How to use this dashboard — start here"
            >
              <span>📖</span>
              <span className="hidden sm:inline">Start here</span>
            </button>

            <button
              onClick={() => setShowDailyTasks(true)}
              className="relative flex items-center gap-1.5 min-h-[40px] rounded-lg border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10 hover:text-white text-sm px-3 transition-colors"
              title="Daily tasks & expirations"
            >
              <span>🔔</span>
              <span>4 tasks</span>
            </button>

            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden lg:flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              Search <kbd className="rounded border border-white/15 bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-white/50">Ctrl K</kbd>
            </button>

            {section === 'inventory' && (
              <div className="flex items-center gap-2 border-l border-white/10 pl-2">
                <button
                  onClick={() => setShowCsvImport(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-blue hover:bg-blue-deep px-3 py-2 text-sm font-medium text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload CSV
                </button>

                <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 px-2.5 py-1.5 rounded-lg">
                  <span className="text-sm text-white/70">Sheet mode</span>
                  <button
                    role="switch"
                    aria-checked={sheetMode}
                    onClick={() => setSheetMode((s) => !s)}
                    className={'relative h-5 w-9 rounded-full transition-colors ' + (sheetMode ? 'bg-blue' : 'bg-white/20')}
                  >
                    <span className={'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (sheetMode ? 'translate-x-4' : 'translate-x-0.5')} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          <ErrorBoundary key={section}>
            <Suspense fallback={
              <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center text-white/60 space-y-4">
                <div className="w-8 h-8 rounded-full border-2 border-t-blue border-r-blue border-b-transparent border-l-transparent animate-spin" />
                <p className="text-sm">Loading workspace...</p>
              </div>
            }>
              {section === 'staff_permissions' ? <StaffPermissionManager />
               : section === 'coupons' ? <CouponManager />
               : section === 'omni_hub' ? <OmniOperationsHub />
               : section === 'pasabuy_manager' ? <PasabuyManager />
               : section === 'integrations' ? <ChannelIntegrations />
               : section === 'globe' ? <GlobeCms />
               : section === 'inbox' ? <Inbox />
               : section === 'sourcing' ? <AiDrafts />
               : section === 'wholesale' ? <Customers />
               : section === 'suppliers' ? <Suppliers />
               : section === 'consignment' ? <ConsignmentManager />
               : showSheet ? <Sheet />
               : showGrid ? <InventoryGrid />
               : section === 'overview' ? <Overview setSection={setSection} skus={activeSkus} lowStock={lowStock} pending={pendingOrders} />
               : <Kanban />}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {showCsvImport && (
        <Suspense fallback={null}>
          <BulkCsvImportModal onClose={() => setShowCsvImport(false)} />
        </Suspense>
      )}

      <DailyTaskNotificationDrawer
        isOpen={showDailyTasks}
        onClose={() => setShowDailyTasks(false)}
        onNavigate={(targetSec) => setSection(targetSec)}
      />

      <AdminAiCopilotModal
        isOpen={showAiCopilot}
        onClose={() => setShowAiCopilot(false)}
        onNavigate={(targetSec) => setSection(targetSec)}
      />

      <SystemDevOpsModal
        isOpen={showDevOpsModal}
        onClose={() => setShowDevOpsModal(false)}
      />

      <StartHereGuide
        isOpen={showStartHere}
        onClose={() => setShowStartHere(false)}
        onNavigate={(targetSec) => setSection(targetSec)}
      />

      {/* Floating, draggable tools gear (calculator, margin, FX, clock, etc.) */}
      <AdminToolsWidget />

      {/* Floating AI Copilot */}
      <button
        onClick={() => setShowAiCopilot(true)}
        className="fixed bottom-5 right-5 z-40 bg-blue hover:bg-blue-deep text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg transition-colors flex items-center gap-2 min-h-[44px]"
      >
        <span className="text-base leading-none">🧭</span>
        <span>Guide</span>
      </button>
    </div>
  )
}
