import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import {
  BoxIcon, GlobeIcon, GridIcon, UserIcon, InboxIcon,
  PlaneIcon, BagIcon, ShieldIcon, BarcodeIcon, EyeIcon,
  BellIcon, BookIcon, MenuIcon, SearchIcon, TagIcon, UploadIcon, XIcon, MapIcon, ClockIcon, PlayIcon, CameraIcon,
  PlusIcon,
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
import AdminToolsWidget from './AdminToolsWidget'
import HelpTip from './HelpTip'
import { AdminDialog } from '../../components/ui/AdminDialog'
import { useIdleLock } from './useIdleLock'
import { GO_TO_SHORTCUTS, isTextEntryTarget } from './adminOperations'
import { adminBffEnabled, getAdminOverview } from '../../services/adminBffService'
import { DASHBOARD_WIDGETS } from './dashboardWidgets'

// Lazy loaded heavy components to reduce initial bundle lag
const Kanban = lazy(() => import('./Kanban'))
const Sheet = lazy(() => import('./Sheet'))
const InventoryGrid = lazy(() => import('./InventoryGrid'))
const GlobeCms = lazy(() => import('./GlobeCms'))
const Inbox = lazy(() => import('./Inbox'))
const Customers = lazy(() => import('./Customers'))
const Overview = lazy(() => import('./Overview'))
const Suppliers = lazy(() => import('./Suppliers'))
const StoreAssetStudio = lazy(() => import('./StoreAssetStudio'))
const ConsignmentManager = lazy(() => import('./ConsignmentManager'))
const BulkCsvImportModal = lazy(() => import('./BulkCsvImportModal'))
const ChannelIntegrations = lazy(() => import('./ChannelIntegrations'))
const PasabuyManager = lazy(() => import('./PasabuyManager'))
const OmniOperationsHub = lazy(() => import('./OmniOperationsHub'))
const StaffPermissionManager = lazy(() => import('./StaffPermissionManager'))
const CouponManager = lazy(() => import('./CouponManager'))
const DeliveryRateControl = lazy(() => import('./DeliveryRateControl'))
const ReservationHolds = lazy(() => import('./ReservationHolds'))
const MasterWorkflowGraph = lazy(() => import('../../components/admin/master-workflow-graph/MasterWorkflowGraph'))
const OwnerCountClose = lazy(() => import('./OwnerCountClose'))
const WorkflowGuideModal = lazy(() => import('../../components/admin/guides/WorkflowGuideModal'))
const SpotlightTourOverlay = lazy(() => import('../../components/admin/tour/SpotlightTourOverlay'))
const TourSelectionModal = lazy(() => import('../../components/admin/tour/TourSelectionModal'))

// Single source of truth for every section: nav label, page title, subtitle, icon.
const SECTIONS = {
  overview:          { label: 'Command center',      icon: GridIcon,    title: 'Command center',                desc: 'Website activity, channel status, and the jobs that need you first.' },
  owner_close:       { label: 'Count & Close',       icon: BookIcon,    title: 'Owner Count & Close',           desc: 'Pick up a shop import where you left off: review products, count stock, finish the close.', adminOnly: true },
  workflow_graph:    { label: 'Workflow map',        icon: MapIcon,     title: 'Workflow map', desc: 'Picture guides for every shift, with checklists, safety checks, and prompts you can copy.' },
  kanban:            { label: 'Purchasing',           icon: BagIcon,     title: 'Italy Purchasing',               desc: 'Purchase orders are supplier commitments. Consignments are the Italy flight, boxes, and Milan and Manila scans.' },
  consignment:       { label: 'Flight Consignments',  icon: PlaneIcon,   title: 'Italy Flight Consignments',      desc: 'Scan and count every expected unit in Milan, count it again in Manila, then settle the differences.' },
  pasabuy_manager:   { label: 'Pasabuy Quotes',      icon: BagIcon,     title: 'Custom Pasabuy Quotes',         desc: 'Handle shopper requests and price each one with its full cost from Italy.' },
  suppliers:         { label: 'Suppliers',           icon: GlobeIcon,   title: 'Suppliers & Purchase Orders',   desc: 'The suppliers you buy from and the purchase orders you placed.' },
  inventory:         { label: 'Inventory',           icon: BoxIcon,     title: 'Product Catalog & Stock',       desc: 'Every product and the Manila stock behind it, in one place.' },
  omni_hub:          { label: 'Fulfillment Hub',     icon: BarcodeIcon, title: 'Fulfillment & Staff Stations',  desc: 'Pack website orders with the scanner and record who holds each Italy box.' },
  inbox:             { label: 'Messages',            icon: InboxIcon,   title: 'Conversation Records',          desc: 'Saved conversations and notes. Links to Shopee, Lazada, and the chat apps are not connected yet.' },
  wholesale:         { label: 'Customers',           icon: UserIcon,    title: 'Registered Customer Profiles',  desc: 'Saved customer profiles. Special wholesale prices and bulk messages are still switched off.' },
  reservations:      { label: 'Stock Holds',         icon: ClockIcon,   title: 'Stock Holds',                   desc: 'Stock held for a customer, time left on each hold, and holds that already expired.' },
  delivery:          { label: 'Delivery Rates',      icon: PlaneIcon,   title: 'Delivery Rates & Couriers',     desc: 'The owner-approved delivery test: which places have fixed rates, and a tester to try a quote.', adminOnly: true },
  coupons:           { label: 'Coupons',             icon: TagIcon,     title: 'Coupons & Vouchers',             desc: 'Discount codes you control: start dates, spending limits, and promo campaigns.' },
  staff_permissions: { label: 'Staff & Roles',       icon: ShieldIcon,  title: 'Staff Roles & Permissions',     desc: 'Who may sign in, and what each role is allowed to do.' },
  integrations:      { label: 'Channel Readiness',   icon: GlobeIcon,   title: 'Sales Channel Readiness',        desc: 'Get the catalog ready and see the true connection status of each sales channel.' },
  store_assets:      { label: 'Store Assets',        icon: CameraIcon,  title: 'Virtual Store Assets',           desc: 'Products still missing shelf content, and draft text waiting for your approval.' },
  globe:             { label: 'Globe Display',        icon: EyeIcon,     title: '3D Globe Map Settings',         desc: 'Choose which products show on the 3D globe.' },
}

const SECTION_ALIASES = {
  consignments: 'consignment',
  fulfillment: 'omni_hub',
  staff: 'staff_permissions',
  channels: 'integrations',
  messages: 'inbox',
  customers: 'wholesale',
}

function resolveAdminSection(rawSection, canManageStaff) {
  const key = String(rawSection || '').trim().toLowerCase()
  const resolved = SECTION_ALIASES[key] || key
  if (!resolved || !SECTIONS[resolved]) return 'overview'
  if (SECTIONS[resolved].adminOnly && !canManageStaff) return 'overview'
  return resolved
}

function readInitialSection(canManageStaff) {
  if (typeof window === 'undefined') return 'overview'
  try {
    const params = new URLSearchParams(window.location.search)
    return resolveAdminSection(params.get('section'), canManageStaff)
  } catch {
    return 'overview'
  }
}

// Grouped navigation by daily workflow. Home stands alone; settings sink to the bottom.
const NAV_GROUPS = [
  { heading: null,             items: ['overview', 'owner_close', 'workflow_graph'] },
  { heading: 'Supply Chain',   items: ['kanban', 'consignment', 'pasabuy_manager', 'suppliers'] },
  { heading: 'Sell & Fulfill', items: ['inventory', 'store_assets', 'omni_hub', 'reservations', 'inbox', 'wholesale', 'coupons'] },
  { heading: 'Settings',       items: ['delivery', 'staff_permissions', 'integrations', 'globe'] },
]

function NavList({ section, onSelect, activeSkus, canManageStaff, widget, onWidget }) {
  return (
    <div className="space-y-5">
      <nav aria-label="Dashboard widgets" className="space-y-0.5 border-b border-adm-line pb-3">
        <p className="px-3 pb-2 text-xs font-medium text-white/65">Dashboard widgets</p>
        {DASHBOARD_WIDGETS.map(item => <button key={item.id} type="button"
          onClick={() => onWidget(item.id)} aria-current={section === 'overview' && widget === item.id ? 'page' : undefined}
          className={`min-h-11 w-full rounded-adm-sm px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue ${section === 'overview' && widget === item.id ? 'bg-white/[0.08] text-white font-semibold' : 'text-white/65 hover:bg-white/[0.04] hover:text-white'}`}>
          {item.label}
        </button>)}
      </nav>
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi}>
          {group.heading && (
            <p className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/55">
              {group.heading}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.filter(id => !SECTIONS[id].adminOnly || canManageStaff).map(id => {
              const meta = SECTIONS[id]
              const Ico = meta.icon
              const on = section === id
              return (
                <button
                  key={id}
                  onClick={() => onSelect(id)}
                  aria-label={meta.label}
                  aria-current={on ? 'page' : undefined}
                  className={
                    'relative flex min-h-11 w-full items-center gap-2.5 rounded-adm-sm px-2.5 py-2 text-left text-sm transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70 ' +
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
  const { isAdmin, authReady, logoutAdmin, user, products = [] } = useStore()
  const secure = adminBffEnabled()
  const canManageStaff = user?.role === 'Admin' || user?.role === 'SuperAdmin'
  const [section, setSection] = useState(() => readInitialSection(canManageStaff))
  const [widget, setWidget] = useState('metrics')
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
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false)
  const [showTourChooser, setShowTourChooser] = useState(false)
  const [activeTourId, setActiveTourId] = useState(null)
  const [guideQuery, setGuideQuery] = useState('')
  const [inventoryTool, setInventoryTool] = useState(null)
  const { idleWarning, staySignedIn } = useIdleLock({
    enabled: isAdmin && authReady,
    onIdle: () => { logoutAdmin() },
  })
  const goChordRef = useRef(null)
  const desktopHeadingRef = useRef(null)
  const mobileHeadingRef = useRef(null)

  // KPI states (kept here because the sidebar badge + Overview both read them)
  const [activeSkus, setActiveSkus] = useState(0)
  const [lowStock, setLowStock] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(null)

  useEffect(() => {
    if (!isAdmin) return
    if (secure) {
      setActiveSkus(products.length)
      setLowStock(products.filter(product => product.stock_available != null && Number(product.stock_available) <= 5).length)
      const controller = new AbortController()
      setPendingOrders(null)
      getAdminOverview(30, controller.signal).then((result) => {
        if (controller.signal.aborted) return
        const backlogUnavailable = (result.unavailable || []).some((entry) => entry.key === 'orderBacklog')
        setPendingOrders(result.ok && !backlogUnavailable && Number.isFinite(Number(result.data?.orderBacklog))
          ? Number(result.data.orderBacklog) : null)
      })
      return () => controller.abort()
    }
    if (!supabase) return
    fetchKpis()

    const channel = supabase
      .channel('kpi_tracker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchKpis)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchKpis)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdmin, products, secure])

  useEffect(() => {
    if (!isAdmin) return undefined
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        if (showTourChooser) setShowTourChooser(false)
        else if (activeTourId) setActiveTourId(null)
        else if (showScanCenter) setShowScanCenter(false)
        else if (showShortcuts) setShowShortcuts(false)
        return
      }
      if (isTextEntryTarget(event.target)) return
      const key = event.key.toLowerCase()
      const hasOpenLayer = paletteOpen || showDailyTasks || showAiCopilot || showDevOpsModal || showStartHere || showShortcuts || showScanCenter || showCsvImport || isMobileMenuOpen || showTourChooser || Boolean(activeTourId)

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

  const selectSection = (id, options = {}) => {
    const { pushState = true, focusHeading = true } = options
    const target = resolveAdminSection(id, canManageStaff)
    setSection(target)
    // Card grid is the default view. Sheet mode is a power-user opt-in — it was
    // auto-enabling on every Inventory visit, which dropped mobile users
    // straight into a 30-column spreadsheet.
    setSheetMode(false)
    setIsMobileMenuOpen(false)

    if (pushState && typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href)
        if (target === 'overview') {
          url.searchParams.delete('section')
        } else {
          url.searchParams.set('section', target)
        }
        if (url.href !== window.location.href) {
          window.history.pushState({ section: target }, '', url)
        }
      } catch {
        // Ignore URL manipulation failures in restricted environments
      }
    }

    if (focusHeading && typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        const heading = window.innerWidth >= 1024 ? desktopHeadingRef.current : mobileHeadingRef.current
        heading?.focus({ preventScroll: true })
      })
    }
  }

  useEffect(() => {
    if (!authReady) return
    const currentParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('section') : null
    if (currentParam) {
      const resolved = resolveAdminSection(currentParam, canManageStaff)
      if (resolved !== section) {
        setSection(resolved)
      }
    }
  }, [authReady, canManageStaff])

  useEffect(() => {
    if (SECTIONS[section]?.adminOnly && !canManageStaff) {
      selectSection('overview', { pushState: true, focusHeading: false })
    }
  }, [canManageStaff, section])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onPopState = () => {
      const target = readInitialSection(canManageStaff)
      selectSection(target, { pushState: false, focusHeading: true })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [canManageStaff])

  if (!authReady) {
    return <div className="admin-ui min-h-screen bg-adm-bg flex items-center justify-center text-sm text-white/60">Checking staff access…</div>
  }

  if (!isAdmin) {
    return <div className="admin-ui"><AdminAuthModal isOpen={true} onClose={() => window.location.assign('/')} /></div>
  }

  const launchInventoryTool = id => {
    selectSection('inventory')
    setInventoryTool({ id, token: Date.now() })
  }

  const handleStartTour = (tourId) => {
    setShowTourChooser(false)
    setShowWorkflowGuide(false)
    setActiveTourId(tourId)
  }

  const handleCloseTour = () => {
    setActiveTourId(null)
  }

  const showSheet = sheetMode && section === 'inventory'
  const showGrid = !sheetMode && section === 'inventory'
  const meta = SECTIONS[section] || SECTIONS.overview
  const staffLabel = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Staff member'
  const staffInitials = staffLabel.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

  return (
    <div className="admin-ui flex min-h-screen bg-adm-bg pb-20 text-white/80 md:pb-0 font-sans selection:bg-blue/30 selection:text-white">
      {idleWarning && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/70 p-4 sm:items-center" role="presentation">
          <AdminDialog onClose={staySignedIn} labelledBy="idle-lock-title">
            <div className="w-full max-w-sm rounded-adm border border-adm-line bg-adm-surface p-5">
              <h2 id="idle-lock-title" className="text-lg font-semibold text-white">Still there?</h2>
              <p className="mt-1 text-sm leading-relaxed text-white/60">Nothing has moved for a while. Sign-in ends in about 2 minutes to protect the store.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => { logoutAdmin() }} className="min-h-11 rounded-adm-sm border border-adm-line px-4 text-sm font-semibold text-white/70">Sign out now</button>
                <button type="button" onClick={staySignedIn} className="min-h-11 rounded-adm-sm bg-blue px-4 text-sm font-bold text-white">Stay signed in</button>
              </div>
            </div>
          </AdminDialog>
        </div>
      )}
      <CommandPalette
        isOpen={paletteOpen}
        setIsOpen={setPaletteOpen}
        setSection={selectSection}
        canManageStaff={canManageStaff}
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
            className="flex min-h-11 min-w-11 items-center justify-center rounded-adm-sm text-white/45 transition-[transform,background-color,color] duration-150 hover:bg-white/[0.06] hover:text-white active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70"
            title="Search (Ctrl+K)"
          >
            <SearchIcon size={17} />
          </button>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto px-2 custom-scrollbar">
          <NavList widget={widget} onWidget={id => { setWidget(id); selectSection('overview') }} section={section} onSelect={selectSection} activeSkus={activeSkus} canManageStaff={canManageStaff} />
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
            className="flex min-h-11 w-full items-center gap-2 rounded-adm-sm px-3 py-2 text-xs text-white/45 transition-[transform,background-color,color] duration-150 hover:bg-white/[0.04] hover:text-white active:scale-[0.98]"
            title="DevOps & System Architecture"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue pulse-dot" />
            DevOps & System
          </button>
          <button
            onClick={logoutAdmin}
            className="flex min-h-11 w-full items-center gap-2 rounded-adm-sm px-3 py-2 text-xs text-white/45 transition-[transform,background-color,color] duration-150 hover:bg-crimson/10 hover:text-crimson active:scale-[0.98]"
          >
            <ShieldIcon size={15} /> Lock / Exit Admin
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        {/* Mobile top bar doubles as the page title, so the section header below
            can drop its own title row instead of stacking two headers. */}
        <div className="flex min-h-[58px] w-full shrink-0 items-center justify-between gap-2 border-b border-adm-line bg-adm-sunken px-3 lg:hidden">
          <h1 ref={mobileHeadingRef} tabIndex={-1} className="text-base font-semibold text-white truncate min-w-0 focus:outline-none">{meta.title}</h1>
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
              <NavList widget={widget} onWidget={id => { setWidget(id); selectSection('overview') }} section={section} onSelect={selectSection} activeSkus={activeSkus} canManageStaff={canManageStaff} />
            </div>
          </div>
        )}

        <header className="flex min-h-[72px] items-center gap-2 border-b border-adm-line bg-adm-bg px-3 py-2 lg:gap-4 lg:px-6">
          <div className="hidden lg:block shrink-0 min-w-[220px]">
            <div className="flex items-center gap-2">
              <h1 ref={desktopHeadingRef} tabIndex={-1} className="text-lg font-semibold tracking-tight text-white truncate focus:outline-none">{meta.title}</h1>
              <HelpTip label={meta.title} text={meta.desc} />
            </div>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setShowScanCenter(true)}
              className="flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-adm-sm bg-blue px-3 text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-blue-deep active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70"
              title="Open scan center (Alt+S)"
            >
              <BarcodeIcon size={16} />
              <span>Scan</span>
              <kbd className="hidden rounded border border-white/20 bg-black/10 px-1.5 py-0.5 font-mono text-xs text-white/70 xl:inline">Alt S</kbd>
            </button>

            <button
              onClick={() => setShowWorkflowGuide(true)}
              className="flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-adm-sm border border-adm-line bg-white/[0.035] px-3 text-sm font-medium text-white/65 transition-[transform,background-color,color,border-color] duration-150 hover:border-adm-line-strong hover:bg-white/[0.06] hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70"
              title="View visual workflow maps for all shifts"
            >
              <MapIcon size={16} />
              <span className="hidden sm:inline">Workflow Map</span>
            </button>

            <button
              onClick={() => setShowTourChooser(true)}
              className="flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-adm-sm border border-adm-line bg-white/[0.035] px-3 text-sm font-medium text-white/65 transition-[transform,background-color,color,border-color] duration-150 hover:border-adm-line-strong hover:bg-white/[0.06] hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70"
              title="Launch interactive guided walkthrough tour (Manual vs Auto Intake)"
            >
              <PlayIcon size={15} />
              <span className="hidden sm:inline">Guided Tours</span>
            </button>

            <button
              onClick={() => setShowStartHere(true)}
              className="flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-adm-sm border border-adm-line bg-white/[0.035] px-3 text-sm font-medium text-white/65 transition-[transform,background-color,color,border-color] duration-150 hover:border-adm-line-strong hover:bg-white/[0.06] hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70"
              title="How to use this dashboard: start here"
            >
              <BookIcon size={15} />
              <span className="hidden sm:inline">Start here</span>
            </button>

            <button
              onClick={() => setShowDailyTasks(true)}
              className="relative flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-adm-sm border border-adm-line bg-white/[0.035] px-3 text-sm text-white/65 transition-[transform,background-color,color,border-color] duration-150 hover:border-adm-line-strong hover:bg-white/[0.06] hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70"
              title="Expiry alerts"
            >
              <BellIcon size={15} />
              <span className="hidden sm:inline">Alerts</span>
            </button>

            <button
              onClick={() => setShowAiCopilot(true)}
              className="relative flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-adm-sm border border-adm-line bg-white/[0.035] px-3 text-sm text-white/65 transition-[transform,background-color,color,border-color] duration-150 hover:border-adm-line-strong hover:bg-white/[0.06] hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70"
              title="Open the grounded operations guide (Alt+G)"
            >
              <BookIcon size={14} className="text-blue" />
              <span className="hidden xl:inline">Operations guide</span>
            </button>

            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden min-h-[44px] items-center gap-2 rounded-adm-sm border border-adm-line bg-white/[0.035] px-3 text-sm text-white/60 transition-[transform,background-color,color,border-color] duration-150 hover:border-adm-line-strong hover:bg-white/[0.06] hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70 lg:flex"
            >
              <SearchIcon size={15} /> Search <kbd className="rounded border border-white/15 bg-adm-sunken px-1.5 py-0.5 font-mono text-xs text-white/45">Ctrl K</kbd>
            </button>

            {section === 'inventory' && (
              <div className="flex items-center gap-2 border-l border-adm-line pl-2">
                <button
                  onClick={() => launchInventoryTool('add-inventory')}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-adm-sm bg-blue px-3 py-2 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-blue-deep active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70 cursor-pointer shadow-sm shadow-blue/20"
                  title="Add Inventory (Automatic Barcode Scan vs Manual ChatGPT Intake)"
                >
                  <PlusIcon size={16} />
                  <span>+ Add Inventory</span>
                </button>

                <button
                  onClick={() => setShowCsvImport(true)}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-adm-sm border border-adm-line bg-white/[0.035] px-3 py-2 text-sm font-medium text-white/80 transition-[transform,background-color] duration-150 hover:bg-white/[0.08] hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70"
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
                    aria-label="Sheet mode"
                    onClick={() => setSheetMode((s) => !s)}
                    className="flex min-h-11 min-w-11 items-center justify-center"
                  >
                    <span className={'relative inline-block h-5 w-9 rounded-full transition-colors ' + (sheetMode ? 'bg-blue' : 'bg-white/20')}>
                      <span className={'absolute left-0 top-0.5 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (sheetMode ? 'translate-x-4' : 'translate-x-0.5')} />
                    </span>
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
               : section === 'owner_close' && canManageStaff ? <OwnerCountClose />
               : section === 'workflow_graph' ? <MasterWorkflowGraph onNavigate={selectSection} onStartTour={handleStartTour} />
               : section === 'reservations' ? <ReservationHolds />
               : section === 'delivery' && canManageStaff ? <DeliveryRateControl />
               : section === 'coupons' ? <CouponManager key={`${user?.id || 'signed-out'}:${user?.role || ''}`} />
               : section === 'omni_hub' ? <OmniOperationsHub />
               : section === 'pasabuy_manager' ? <PasabuyManager />
               : section === 'integrations' ? <ChannelIntegrations />
               : section === 'store_assets' ? <StoreAssetStudio />
               : section === 'globe' ? <GlobeCms canManagePublicClaims={canManageStaff} />
               : section === 'inbox' ? <Inbox />
               : section === 'wholesale' ? <Customers key={`${user?.id || 'signed-out'}:${user?.role || ''}`} />
               : section === 'suppliers' ? <Suppliers key={`${user?.id || 'signed-out'}:${user?.role || ''}`} canCreateSupplier={canManageStaff} />
               : section === 'consignment' ? <ConsignmentManager />
               : showSheet ? <Sheet key={`${user?.id || 'signed-out'}:${user?.role || ''}`} canManageProducts={canManageStaff} />
               : showGrid ? <InventoryGrid key={`${user?.id || 'signed-out'}:${user?.role || ''}`} launchTool={inventoryTool} onLaunchToolHandled={() => setInventoryTool(null)} canManageMediaCleanup={canManageStaff} canManageProducts={canManageStaff} onStartTour={handleStartTour} />
               : section === 'overview' ? <Overview widget={widget} onWidget={setWidget} setSection={selectSection} pending={pendingOrders} />
               : <Kanban />}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

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
        onOpenOperationsGuide={() => setShowAiCopilot(true)}
      />

      {showWorkflowGuide && <Suspense fallback={null}>
        <WorkflowGuideModal
          isOpen
          onClose={() => setShowWorkflowGuide(false)}
          defaultTab={
            section === 'consignment' ? 'flights' :
            section === 'inventory' ? 'fefo' :
            section === 'omni_hub' ? 'fulfillment' :
            section === 'pasabuy_manager' ? 'pasabuy' : 'flights'
          }
          onNavigate={selectSection}
          onStartTour={handleStartTour}
        />
      </Suspense>}

      <UniversalScanLauncher
        isOpen={showScanCenter}
        onClose={() => setShowScanCenter(false)}
        onNavigate={selectSection}
        onInventoryTool={launchInventoryTool}
      />

      <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      <AdminToolsWidget onOpenGuide={() => setShowAiCopilot(true)} />

      {showTourChooser && (
        <Suspense fallback={null}>
          <TourSelectionModal
            isOpen={showTourChooser}
            onClose={() => setShowTourChooser(false)}
            onSelectTour={handleStartTour}
          />
        </Suspense>
      )}

      {activeTourId && (
        <Suspense fallback={null}>
          <SpotlightTourOverlay
            isOpen={Boolean(activeTourId)}
            tourId={activeTourId}
            currentSection={section}
            onClose={handleCloseTour}
            onNavigate={(targetSection) => {
              selectSection(targetSection)
            }}
          />
        </Suspense>
      )}

    </div>
  )
}
