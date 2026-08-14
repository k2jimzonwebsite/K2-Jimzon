import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import {
  BoxIcon, GlobeIcon, GridIcon, UserIcon, InboxIcon,
  PlaneIcon, BagIcon, ShieldIcon, BarcodeIcon, EyeIcon,
  BellIcon, BookIcon, MenuIcon, SearchIcon, StarIcon, UploadIcon, XIcon,
} from '../../components/ui/icons'
import { supabase } from '../../lib/supabaseClient'
import { useAdminStore as useStore } from '../../context/AdminStoreContext'
import CommandPalette from './CommandPalette'
import AdminAuthModal from './AdminAuthModal'
import ErrorBoundary from '../../components/ui/ErrorBoundary'
import DailyTaskNotificationDrawer from './DailyTaskNotificationDrawer'
import AdminAiCopilotModal from './AdminAiCopilotModal'
import SystemDevOpsModal from './SystemDevOpsModal'
import StartHereGuide from './StartHereGuide'
import KeyboardShortcutsModal from './KeyboardShortcutsModal'
import UniversalScanLauncher from './UniversalScanLauncher'
import { GO_TO_SHORTCUTS, isTextEntryTarget } from './adminOperations'

// Lazy loaded heavy components to reduce initial bundle lag
const Kanban = lazy(() => import('./Kanban'))
const Sheet = lazy(() => import('./Sheet'))
const InventoryGrid = lazy(() => import('./InventoryGrid'))
const GlobeCms = lazy(() => import('./GlobeCms'))
const Inbox = lazy(() => import('./Inbox'))
const Customers = lazy(() => import('./Customers'))
const Overview = lazy(() => import('./Overview'))
const Suppliers = lazy(() => import('./Suppliers'))
const ConsignmentManager = lazy(() => import('./ConsignmentManager'))
const BulkCsvImportModal = lazy(() => import('./BulkCsvImportModal'))
const ChannelIntegrations = lazy(() => import('./ChannelIntegrations'))
const PasabuyManager = lazy(() => import('./PasabuyManager'))
const OmniOperationsHub = lazy(() => import('./OmniOperationsHub'))
const StaffPermissionManager = lazy(() => import('./StaffPermissionManager'))
const CouponManager = lazy(() => import('./CouponManager'))

// Single source of truth for every section: nav label, page title, subtitle, icon.
const SECTIONS = {
  overview:          { label: 'Command center',      icon: GridIcon,    title: 'Command center',                desc: 'Verified performance, channel readiness, and priority operations.' },
  kanban:            { label: 'Purchasing',           icon: BagIcon,     title: 'Italy Purchasing',               desc: 'Supplier commitments and purchasing work before consolidation.' },
  consignment:       { label: 'Flight Consignments',  icon: PlaneIcon,   title: 'Italy Flight Consignments',      desc: 'Scan-count every expected unit in Milan, recount it in Manila, then reconcile inventory.' },
  pasabuy_manager:   { label: 'Pasabuy Quotes',      icon: BagIcon,     title: 'Custom Pasabuy Quotes',         desc: 'Process shopper requests and calculate Italy landed costs.' },
  suppliers:         { label: 'Suppliers',           icon: GlobeIcon,   title: 'Suppliers & Purchase Orders',   desc: 'Manage vendor relationships and purchase order deliveries.' },
  inventory:         { label: 'Inventory',           icon: BoxIcon,     title: 'Product Catalog & Stock',       desc: 'Master inventory across all channels.' },
  omni_hub:          { label: 'Fulfillment Hub',     icon: BarcodeIcon, title: 'Fulfillment & Staff Stations',  desc: 'Barcode pack-to-ship and Italy cargo box custody claims.' },
  inbox:             { label: 'Messages',            icon: InboxIcon,   title: 'Conversation Records',          desc: 'Persisted internal records; external messaging connectors are deferred.' },
  wholesale:         { label: 'Customers',           icon: UserIcon,    title: 'Registered Customer Profiles',  desc: 'Database-backed customer identities; wholesale pricing and broadcasts are deferred.' },
  coupons:           { label: 'Coupons',             icon: StarIcon,    title: 'Coupons & Vouchers',             desc: 'Controlled discount codes, schedules, limits, and voucher-hunt campaigns.' },
  staff_permissions: { label: 'Staff & Roles',       icon: ShieldIcon,  title: 'Staff Roles & Permissions',     desc: 'Manage authenticated staff roles and access permissions.' },
  integrations:      { label: 'Channel Readiness',   icon: GlobeIcon,   title: 'Sales Channel Readiness',        desc: 'Catalog preparation and real connector status for Website, Shopee, TikTok, Lazada, and Pasabuy.' },
  globe:             { label: 'Globe Display',        icon: EyeIcon,     title: '3D Globe Map Settings',         desc: 'Control which products appear on the interactive 3D map.' },
}

// Grouped navigation by daily workflow. Home stands alone; settings sink to the bottom.
const NAV_GROUPS = [
  { heading: null,             items: ['overview'] },
  { heading: 'Supply Chain',   items: ['kanban', 'consignment', 'pasabuy_manager', 'suppliers'] },
  { heading: 'Sell & Fulfill', items: ['inventory', 'omni_hub', 'inbox', 'wholesale', 'coupons'] },
  { heading: 'Settings',       items: ['staff_permissions', 'integrations', 'globe'] },
]

function NavList({ section, onSelect, activeSkus, canManageStaff }) {
  return (
    <div className="space-y-5">
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi}>
          {group.heading && (
            <p className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/55">
              {group.heading}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.filter(id => id !== 'staff_permissions' || canManageStaff).map(id => {
              const meta = SECTIONS[id]
              const Ico = meta.icon
              const on = section === id
              return (
                <button
                  key={id}
                  onClick={() => onSelect(id)}
                  aria-current={on ? 'page' : undefined}
                  className={
                    'relative flex min-h-10 w-full items-center gap-2.5 rounded-adm-sm px-2.5 py-2 text-left text-sm transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70 ' +
                    (on
                      ? 'bg-blue/10 text-white font-semibold'
                      : 'text-white/50 hover:text-white hover:bg-white/[0.035]')
                  }
                >
                  {on && <span className="absolute -left-2 h-5 w-0.5 rounded-full bg-blue" />}
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${on ? 'bg-blue/15 text-blue' : 'text-white/45'}`}>
                    <Ico size={15} />
                  </span>
                  <span className="truncate">{meta.label}</span>
                  {id === 'inventory' && activeSkus > 0 && (
                    <span className="ml-auto text-xs font-medium text-white/60">{activeSkus}</span>
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
  const { isAdmin, authReady, logoutAdmin, user } = useStore()
  const [section, setSection] = useState('overview')
  const [sheetMode, setSheetMode] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [showDailyTasks, setShowDailyTasks] = useState(false)
  const [showAiCopilot, setShowAiCopilot] = useState(false)
  const [showDevOpsModal, setShowDevOpsModal] = useState(false)
  const [showStartHere, setShowStartHere] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showScanCenter, setShowScanCenter] = useState(false)
  const [guideQuery, setGuideQuery] = useState('')
  const [inventoryTool, setInventoryTool] = useState(null)
  const goChordRef = useRef(null)

  // KPI states (kept here because the sidebar badge + Overview both read them)
  const [activeSkus, setActiveSkus] = useState(0)
  const [lowStock, setLowStock] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const canManageStaff = user?.role === 'Admin'

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

  useEffect(() => {
    if (!isAdmin) return undefined
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        if (showScanCenter) setShowScanCenter(false)
        else if (showShortcuts) setShowShortcuts(false)
        return
      }
      if (isTextEntryTarget(event.target)) return
      const key = event.key.toLowerCase()
      const hasOpenLayer = paletteOpen || showDailyTasks || showAiCopilot || showDevOpsModal || showStartHere || showShortcuts || showScanCenter || showCsvImport || isMobileMenuOpen

      if (event.key === '?' && !hasOpenLayer) {
        event.preventDefault()
        setShowShortcuts(true)
        return
      }
      if (event.altKey && key === 's' && !hasOpenLayer) {
        event.preventDefault()
        setShowScanCenter(true)
        return
      }
      if (event.altKey && key === 'g' && !hasOpenLayer) {
        event.preventDefault()
        setGuideQuery('')
        setShowAiCopilot(true)
        return
      }
      if (event.altKey && key === 'a' && !hasOpenLayer) {
        event.preventDefault()
        setShowDailyTasks(true)
        return
      }
      if (hasOpenLayer || event.ctrlKey || event.metaKey || event.altKey) return

      if (goChordRef.current === 'g') {
        window.clearTimeout(goChordRef.timeout)
        goChordRef.current = null
        const destination = GO_TO_SHORTCUTS[key]
        if (destination) {
          event.preventDefault()
          selectSection(destination)
        }
        return
      }
      if (key === 'g') {
        goChordRef.current = 'g'
        goChordRef.timeout = window.setTimeout(() => { goChordRef.current = null }, 900)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(goChordRef.timeout)
    }
  }, [isAdmin, paletteOpen, showDailyTasks, showAiCopilot, showDevOpsModal, showStartHere, showShortcuts, showScanCenter, showCsvImport, isMobileMenuOpen, canManageStaff])

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

  if (!authReady) {
    return <div className="admin-ui min-h-screen bg-adm-bg flex items-center justify-center text-sm text-white/60">Checking staff access…</div>
  }

  if (!isAdmin) {
    return <div className="admin-ui"><AdminAuthModal isOpen={true} onClose={() => window.location.assign('/')} /></div>
  }

  const selectSection = (id) => {
    setSection(id === 'staff_permissions' && !canManageStaff ? 'overview' : id)
    // Card grid is the default view. Sheet mode is a power-user opt-in — it was
    // auto-enabling on every Inventory visit, which dropped mobile users
    // straight into a 30-column spreadsheet.
    setSheetMode(false)
    setIsMobileMenuOpen(false)
  }

  const launchInventoryTool = id => {
    selectSection('inventory')
    setInventoryTool({ id, token: Date.now() })
  }

  const showSheet = sheetMode && section === 'inventory'
  const showGrid = !sheetMode && section === 'inventory'
  const meta = SECTIONS[section] || SECTIONS.overview
  const staffLabel = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Staff member'
  const staffInitials = staffLabel.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

  return (
    <div className="admin-ui flex min-h-screen bg-adm-bg pb-20 text-white/80 md:pb-0 font-sans selection:bg-blue/30 selection:text-white">
      <CommandPalette
        isOpen={paletteOpen}
        setIsOpen={setPaletteOpen}
        setSection={selectSection}
        onOpenScan={() => setShowScanCenter(true)}
        onOpenGuide={(query = '') => { setGuideQuery(query); setShowAiCopilot(true) }}
        onOpenShortcuts={() => setShowShortcuts(true)}
      />

      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-adm-line bg-adm-sunken lg:flex">
        <div className="flex min-h-[72px] items-center justify-between border-b border-adm-line px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-adm-sm border border-blue/25 bg-blue/10 text-xs font-bold tracking-tight text-blue">K2</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-white">K2 Jimzon BOS</p>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.12em] text-white/35">Business operations</p>
            </div>
          </div>
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Search dashboard"
            className="flex min-h-10 min-w-10 items-center justify-center rounded-adm-sm text-white/45 transition-[transform,background-color,color] duration-150 hover:bg-white/[0.06] hover:text-white active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70"
            title="Search (Ctrl+K)"
          >
            <SearchIcon size={17} />
          </button>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto px-2 custom-scrollbar">
          <NavList section={section} onSelect={selectSection} activeSkus={activeSkus} canManageStaff={canManageStaff} />
        </div>

        <div className="shrink-0 border-t border-adm-line p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-adm-sm bg-white/[0.025] p-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue/15 text-xs font-bold text-blue">{staffInitials}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white/80">{staffLabel}</p>
              <p className="mt-0.5 truncate text-xs text-white/35">{user?.role || 'Staff'}</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400" title="Authenticated" />
          </div>
          <button
            onClick={() => setShowDevOpsModal(true)}
            className="flex min-h-10 w-full items-center gap-2 rounded-adm-sm px-3 py-2 text-xs text-white/45 transition-[transform,background-color,color] duration-150 hover:bg-white/[0.04] hover:text-white active:scale-[0.98]"
            title="DevOps & System Architecture"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue pulse-dot" />
            DevOps & System
          </button>
          <button
            onClick={logoutAdmin}
            className="flex min-h-10 w-full items-center gap-2 rounded-adm-sm px-3 py-2 text-xs text-white/45 transition-[transform,background-color,color] duration-150 hover:bg-crimson/10 hover:text-crimson active:scale-[0.98]"
          >
            <ShieldIcon size={15} /> Lock / Exit Admin
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        {/* Mobile top bar doubles as the page title, so the section header below
            can drop its own title row instead of stacking two headers. */}
        <div className="flex min-h-[58px] w-full shrink-0 items-center justify-between gap-2 border-b border-adm-line bg-adm-sunken px-3 lg:hidden">
          <p className="text-base font-semibold text-white truncate min-w-0">{meta.title}</p>
          <div className="flex items-center gap-0.5 shrink-0">
            <button aria-label="Open scan center" onClick={() => setShowScanCenter(true)} className="flex min-h-[44px] min-w-[44px] items-center justify-center text-blue transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70">
              <BarcodeIcon size={19} />
            </button>
            <button aria-label="Search dashboard" onClick={() => setPaletteOpen(true)} className="flex min-h-[44px] min-w-[44px] items-center justify-center text-white/50 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70">
              <SearchIcon size={19} />
            </button>
            <button aria-label="Open navigation menu" onClick={() => setIsMobileMenuOpen(true)} className="flex min-h-[44px] min-w-[44px] items-center justify-center text-white/50 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70">
              <MenuIcon size={21} />
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="relative flex w-72 max-w-[88vw] flex-col overflow-y-auto border-r border-adm-line bg-adm-sunken px-2 pb-20 pt-4 shadow-adm-float">
              <div className="flex items-center justify-between px-3 mb-4">
                <div><p className="text-base font-semibold text-white">K2 Jimzon BOS</p><p className="mt-0.5 text-xs uppercase tracking-wider text-white/35">Navigation</p></div>
                <button aria-label="Close navigation menu" onClick={() => setIsMobileMenuOpen(false)} className="flex min-h-[44px] min-w-[44px] items-center justify-center text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70">
                  <XIcon size={20} />
                </button>
              </div>
              <NavList section={section} onSelect={selectSection} activeSkus={activeSkus} canManageStaff={canManageStaff} />
            </div>
          </div>
        )}

        <header className="flex min-h-[72px] items-center gap-2 border-b border-adm-line bg-adm-bg px-3 py-2 lg:gap-4 lg:px-6">
          <div className="hidden lg:block flex-1 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-white truncate">{meta.title}</h1>
            <p className="text-sm text-white/60 mt-0.5 truncate">{meta.desc}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setShowScanCenter(true)}
              className="flex min-h-[40px] items-center gap-1.5 rounded-adm-sm bg-blue px-3 text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-blue-deep active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70"
              title="Open scan center (Alt+S)"
            >
              <BarcodeIcon size={16} />
              <span>Scan</span>
              <kbd className="hidden rounded border border-white/20 bg-black/10 px-1.5 py-0.5 font-mono text-xs text-white/70 xl:inline">Alt S</kbd>
            </button>

            <button
              onClick={() => setShowStartHere(true)}
              className="flex min-h-[40px] items-center gap-1.5 rounded-adm-sm border border-adm-line bg-white/[0.035] px-3 text-sm font-medium text-white/65 transition-[transform,background-color,color,border-color] duration-150 hover:border-adm-line-strong hover:bg-white/[0.06] hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70"
              title="How to use this dashboard — start here"
            >
              <BookIcon size={15} />
              <span className="hidden sm:inline">Start here</span>
            </button>

            <button
              onClick={() => setShowDailyTasks(true)}
              className="relative flex min-h-[40px] items-center gap-1.5 rounded-adm-sm border border-adm-line bg-white/[0.035] px-3 text-sm text-white/65 transition-[transform,background-color,color,border-color] duration-150 hover:border-adm-line-strong hover:bg-white/[0.06] hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70"
              title="Expiry alerts"
            >
              <BellIcon size={15} />
              <span className="hidden sm:inline">Alerts</span>
            </button>

            <button
              onClick={() => setShowAiCopilot(true)}
              className="relative flex min-h-[40px] items-center gap-1.5 rounded-adm-sm border border-adm-line bg-white/[0.035] px-3 text-sm text-white/65 transition-[transform,background-color,color,border-color] duration-150 hover:border-adm-line-strong hover:bg-white/[0.06] hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70"
              title="Open the grounded operations guide (Alt+G)"
            >
              <BookIcon size={14} className="text-blue" />
              <span className="hidden xl:inline">Operations guide</span>
            </button>

            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden min-h-[40px] items-center gap-2 rounded-adm-sm border border-adm-line bg-white/[0.035] px-3 text-sm text-white/60 transition-[transform,background-color,color,border-color] duration-150 hover:border-adm-line-strong hover:bg-white/[0.06] hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70 lg:flex"
            >
              <SearchIcon size={15} /> Search <kbd className="rounded border border-white/15 bg-adm-sunken px-1.5 py-0.5 font-mono text-xs text-white/45">Ctrl K</kbd>
            </button>

            {section === 'inventory' && (
              <div className="flex items-center gap-2 border-l border-adm-line pl-2">
                <button
                  onClick={() => setShowCsvImport(true)}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-adm-sm bg-blue px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 hover:bg-blue-deep active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70"
                >
                  <UploadIcon size={16} />
                  Upload CSV
                </button>

                <div className="flex items-center gap-2 bg-white/[0.04] border border-adm-line px-2.5 py-1.5 rounded-adm-sm">
                  <span className="hidden sm:inline text-sm text-white/70">Sheet mode</span>
                  <span className="sm:hidden text-sm text-white/70">Sheet</span>
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

        <div className="flex-1 overflow-y-auto p-3 pb-24 sm:p-4 sm:pb-24 lg:p-6 lg:pb-6 custom-scrollbar">
          <ErrorBoundary key={section}>
            <Suspense fallback={
              <div className="mx-auto w-full max-w-[1600px] animate-pulse space-y-4" aria-label="Loading workspace">
                <div className="h-16 rounded-adm border border-adm-line bg-adm-surface" />
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-28 rounded-adm border border-adm-line bg-adm-surface" />)}
                </div>
                <div className="grid gap-4 xl:grid-cols-12">
                  <div className="h-72 rounded-adm border border-adm-line bg-adm-surface xl:col-span-8" />
                  <div className="h-72 rounded-adm border border-adm-line bg-adm-surface xl:col-span-4" />
                </div>
              </div>
            }>
              {section === 'staff_permissions' && canManageStaff ? <StaffPermissionManager />
               : section === 'coupons' ? <CouponManager />
               : section === 'omni_hub' ? <OmniOperationsHub />
               : section === 'pasabuy_manager' ? <PasabuyManager />
               : section === 'integrations' ? <ChannelIntegrations />
               : section === 'globe' ? <GlobeCms />
               : section === 'inbox' ? <Inbox />
               : section === 'wholesale' ? <Customers />
               : section === 'suppliers' ? <Suppliers />
               : section === 'consignment' ? <ConsignmentManager />
               : showSheet ? <Sheet />
               : showGrid ? <InventoryGrid launchTool={inventoryTool} onLaunchToolHandled={() => setInventoryTool(null)} />
               : section === 'overview' ? <Overview setSection={selectSection} pending={pendingOrders} />
               : <Kanban />}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* Mobile bottom tab bar — quick jump between the sections you use most */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch border-t border-adm-line bg-adm-sunken/95 backdrop-blur-md" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[
          { id: 'overview', label: 'Home' },
          { id: 'inventory', label: 'Inventory' },
          { id: 'omni_hub', label: 'Fulfil' },
          { id: 'inbox', label: 'Messages' },
        ].map(({ id, label }) => {
          const Ico = SECTIONS[id].icon
          const on = section === id
          return (
            <button key={id} onClick={() => selectSection(id)}
              aria-current={on ? 'page' : undefined}
              className={'relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-[transform,color] duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue/70 ' + (on ? 'text-blue' : 'text-white/45 hover:text-white')}>
              {on && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-blue" />}
              <Ico size={20} className={on ? 'text-blue' : 'text-white/60'} />
              <span className="text-xs font-medium tracking-tight">{label}</span>
            </button>
          )
        })}
        <button onClick={() => setIsMobileMenuOpen(true)}
          className="flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-white/45 transition-[transform,color] duration-150 hover:text-white active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue/70">
          <MenuIcon size={20} />
          <span className="text-xs font-medium tracking-tight">More</span>
        </button>
      </nav>

      {showCsvImport && (
        <Suspense fallback={null}>
          <BulkCsvImportModal onClose={() => setShowCsvImport(false)} />
        </Suspense>
      )}

      <DailyTaskNotificationDrawer
        isOpen={showDailyTasks}
        onClose={() => setShowDailyTasks(false)}
        onNavigate={selectSection}
      />

      <AdminAiCopilotModal
        isOpen={showAiCopilot}
        onClose={() => setShowAiCopilot(false)}
        onNavigate={selectSection}
        currentSection={section}
        initialQuery={guideQuery}
      />

      <SystemDevOpsModal
        isOpen={showDevOpsModal}
        onClose={() => setShowDevOpsModal(false)}
      />

      <StartHereGuide
        isOpen={showStartHere}
        onClose={() => setShowStartHere(false)}
        onNavigate={selectSection}
      />

      <UniversalScanLauncher
        isOpen={showScanCenter}
        onClose={() => setShowScanCenter(false)}
        onNavigate={selectSection}
        onInventoryTool={launchInventoryTool}
      />

      <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

    </div>
  )
}
