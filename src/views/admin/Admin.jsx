import { useState, useEffect, Suspense, lazy } from 'react'
import { AlertIcon, BoxIcon, GlobeIcon, GridIcon, SyncIcon, UserIcon, InboxIcon } from '../../components/ui/icons'
import { supabase } from '../../lib/supabaseClient'
import { useStore } from '../../context/StoreContext'
import CommandPalette from './CommandPalette'
import AdminAuthModal from './AdminAuthModal'
import ErrorBoundary from '../../components/ui/ErrorBoundary'
import DailyTaskNotificationDrawer from './DailyTaskNotificationDrawer'
import AdminAiCopilotModal from './AdminAiCopilotModal'

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

const NAV_COMMERCE = [
  { id: 'overview', label: 'Home & Daily Overview', icon: GridIcon },
  { id: 'omni_hub', label: 'Fulfillment & Staff Stations', icon: BoxIcon },
  { id: 'kanban', label: 'Italy Flight Consignments', icon: BoxIcon },
  { id: 'pasabuy_manager', label: 'Custom Pasabuy Quotes', icon: BoxIcon },
  { id: 'wholesale', label: 'Customer Directory & VIPs', icon: UserIcon },
  { id: 'inbox', label: 'Messages (WhatsApp/Viber)', icon: InboxIcon },
]

const NAV_SUPPLY = [
  { id: 'inventory', label: 'Product Catalog & Stock', icon: BoxIcon },
  { id: 'suppliers', label: 'Supplier Contacts & Orders', icon: GlobeIcon },
]

const NAV_INTELLIGENCE = [
  { id: 'integrations', label: 'Marketplace API Keys', icon: GlobeIcon },
  { id: 'sourcing', label: 'AI Import Suggestions', icon: SyncIcon },
  { id: 'globe', label: '3D Map Display Settings', icon: GlobeIcon },
]

export default function Admin() {
  const { isAdmin, logoutAdmin, go } = useStore()
  const [section, setSection] = useState('overview')
  const [sheetMode, setSheetMode] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [showDailyTasks, setShowDailyTasks] = useState(false)
  const [showAiCopilot, setShowAiCopilot] = useState(false)
  
  if (!isAdmin) {
    return <AdminAuthModal isOpen={true} onClose={() => go('home')} />
  }
  
  // KPI States
  const [activeSkus, setActiveSkus] = useState(0)
  const [lowStock, setLowStock] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)

  useEffect(() => {
    if (!supabase) return;
    fetchKpis()

    // Listen to all changes across products and orders to keep KPIs fresh
    const channel = supabase
      .channel('kpi_tracker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchKpis)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchKpis)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchKpis = async () => {
    if (!supabase) return;
    
    // Use parallel count queries to eliminate transferring large payloads on mobile networks
    const [
      { count: activeCount }, 
      { count: lowStockCount }, 
      { count: pendingCount }
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }).lte('stock_available', 5),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('order_status', 'Pending')
    ])

    if (activeCount !== null) setActiveSkus(activeCount)
    if (lowStockCount !== null) setLowStock(lowStockCount)
    if (pendingCount !== null) setPendingOrders(pendingCount)
  }

  const showSheet = sheetMode && section === 'inventory'
  const showGrid = !sheetMode && section === 'inventory'

  return (
    <div className="flex min-h-[calc(100vh-40px)] bg-[#0A101D] pb-20 text-white/90 md:pb-0 font-sans selection:bg-blue/30 selection:text-white">
      <CommandPalette isOpen={paletteOpen} setIsOpen={setPaletteOpen} setSection={setSection} />
      
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#05080f] text-white lg:flex">
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <p className="font-serif text-lg font-semibold text-white">K2 Jimzon <span className="text-blue ml-1">BOS</span></p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Mission Control</p>
          </div>
          <button 
            onClick={() => setPaletteOpen(true)}
            className="flex items-center justify-center rounded bg-white/5 p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors border border-white/5"
            title="Search (Ctrl+K)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto mt-4 px-2.5 space-y-6">
          
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Sales & Orders</p>
            <div className="space-y-0.5">
              {NAV_COMMERCE.map(item => {
                const Ico = item.icon
                const on = section === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => { setSection(item.id); setSheetMode(item.id === 'inventory') }}
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${on ? 'bg-blue/20 text-white' : 'text-white/55 hover:bg-white/6 hover:text-white'}`}
                  >
                    <Ico size={16} /> {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Stock & Buying</p>
            <div className="space-y-0.5">
              {NAV_SUPPLY.map(item => {
                const Ico = item.icon
                const on = section === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => { setSection(item.id); setSheetMode(item.id === 'inventory') }}
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${on ? 'bg-blue/20 text-white' : 'text-white/55 hover:bg-white/6 hover:text-white'}`}
                  >
                    <Ico size={16} /> {item.label}
                    {item.id === 'inventory' && <span className="ml-auto rounded bg-white/10 px-1.5 text-xs tabular">{activeSkus}</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">AI Tools</p>
            <div className="space-y-0.5">
              {NAV_INTELLIGENCE.map(item => {
                const Ico = item.icon
                const on = section === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => { setSection(item.id); setSheetMode(item.id === 'inventory') }}
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${on ? 'bg-blue/20 text-white' : 'text-white/55 hover:bg-white/6 hover:text-white'}`}
                  >
                    <Ico size={16} /> {item.label}
                  </button>
                )
              })}
            </div>
          </div>

        </div>

        {/* Left Sidebar Operations & Cargo Box Intelligence Widget */}
        <div className="mx-3 my-3 p-3.5 rounded-2xl bg-[#0A101D] border border-white/10 space-y-3 font-mono text-xs shadow-xl shrink-0">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber flex items-center gap-1">
              <span>🇮🇹</span> Italy Box Pulse
            </span>
            <span className="text-[9px] bg-forest/20 text-forest px-1.5 py-0.5 rounded font-bold">LIVE</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-white/70 text-[11px]">
              <span>Arriving Flight Boxes:</span>
              <strong className="text-white font-bold">3 Boxes</strong>
            </div>
            <div className="flex justify-between text-white/70 text-[11px]">
              <span>SKUs Inside Cargo:</span>
              <strong className="text-amber font-bold">12 Items</strong>
            </div>
            <div className="flex justify-between text-white/70 text-[11px]">
              <span>Today Sales (Channels):</span>
              <strong className="text-forest font-bold">₱41,260</strong>
            </div>
          </div>

          <button
            onClick={() => { setSection('omni_hub'); setSheetMode(false); }}
            className="w-full py-2 rounded-xl bg-amber/20 hover:bg-amber/30 text-amber font-bold text-[11px] transition-all border border-amber/30 flex items-center justify-center gap-1 shadow-sm"
          >
            ⚡ Open Staff Box Handover
          </button>
        </div>

        <div className="border-t border-white/10 px-5 py-3 text-xs text-white/50 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-forest" />
              Supabase · Live
            </p>
            <span className="text-[10px] font-mono bg-crimson/20 text-crimson font-bold px-1.5 py-0.5 rounded">ADMIN</span>
          </div>
          <p className="text-[11px] text-white/40">Shopee & Channel sync: Active</p>
          <button 
            onClick={logoutAdmin}
            className="w-full mt-1.5 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-crimson/20 hover:text-crimson text-white/70 text-xs font-semibold transition-all border border-white/10 flex items-center justify-center gap-1.5"
          >
            Lock / Exit Admin
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#05080f] border-b border-white/10 shrink-0 w-full lg:hidden">
          <div>
            <p className="font-serif text-lg font-semibold text-white">K2 Jimzon <span className="text-blue ml-1">BOS</span></p>
          </div>
          <div className="flex items-center gap-2">
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
            <div className="relative flex w-64 flex-col bg-[#05080f] border-r border-white/10 overflow-y-auto pt-4 pb-20">
              <div className="flex items-center justify-between px-5 mb-4">
                <p className="font-serif text-lg font-semibold text-white">Menu</p>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white/50 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="px-2.5 space-y-6">
                <div>
                  <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Sales & Orders</p>
                  <div className="space-y-0.5">
                    {NAV_COMMERCE.map(item => {
                      const Ico = item.icon
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setSection(item.id); setSheetMode(item.id === 'inventory'); setIsMobileMenuOpen(false); }}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 min-h-[44px] text-left text-sm font-medium transition-colors ${section === item.id ? 'bg-blue/20 text-white font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                        >
                          <Ico size={18} /> {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Stock & Buying</p>
                  <div className="space-y-1">
                    {NAV_SUPPLY.map(item => {
                      const Ico = item.icon
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setSection(item.id); setSheetMode(item.id === 'inventory'); setIsMobileMenuOpen(false); }}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 min-h-[44px] text-left text-sm font-medium transition-colors ${section === item.id ? 'bg-blue/20 text-white font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                        >
                          <Ico size={18} /> {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                
                <div>
                  <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">AI Tools</p>
                  <div className="space-y-1">
                    {NAV_INTELLIGENCE.map(item => {
                      const Ico = item.icon
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setSection(item.id); setSheetMode(item.id === 'inventory'); setIsMobileMenuOpen(false); }}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 min-h-[44px] text-left text-sm font-medium transition-colors ${section === item.id ? 'bg-blue/20 text-white font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                        >
                          <Ico size={18} /> {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <header className="flex flex-wrap items-center gap-4 border-b border-white/10 bg-[#0A101D] px-4 py-3.5 md:px-6">
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl font-semibold tracking-tight text-white truncate">
              {section === 'integrations' ? 'Marketplace API Keys & Vault' :
               section === 'globe' ? '3D Globe Map Settings' :
               section === 'wholesale' ? 'Customer Directory & VIP Accounts' :
               section === 'sourcing' ? 'AI Import Product Suggestions' :
               section === 'inbox' ? 'Customer Messages (WhatsApp / Viber)' :
               section === 'inventory' ? 'Product Catalog & Stock Master' :
               section === 'suppliers' ? 'Supplier Contacts & Purchase Orders' :
               section === 'pasabuy_manager' ? 'Custom Pasabuy Customer Quotes' :
               section === 'omni_hub' ? 'Fulfillment & Staff Operations Hub' :
               section === 'kanban' ? 'Italy Flight Consignments & Box Tracker' :
               'Home & Daily Operational Summary'}
            </h1>
            <p className="text-xs font-mono text-white/50 mt-1">
              {section === 'integrations'
                ? 'Manage API keys, OAuth tokens, and webhooks for Shopee, Lazada, TikTok Shop, and Meta.'
                : section === 'globe'
                ? 'Control which products appear on the interactive 3D map.'
                : section === 'wholesale'
                ? 'Customer order histories, lifetime spending, VIP wholesale approvals, and mass marketing.'
                : section === 'sourcing'
                ? 'Review products parsed by AI before publishing to live inventory.'
                : section === 'inbox'
                ? 'Manage messages from WhatsApp, Facebook, and Viber with AI Copilot support.'
                : section === 'suppliers'
                ? 'Manage vendor relationships and purchase order deliveries.'
                : section === 'pasabuy_manager'
                ? 'Process custom Pasabuy shopper requests and calculate Italy landed costs.'
                : section === 'omni_hub'
                ? 'Staff barcode pack-to-ship verification and Italy cargo box custody claims.'
                : section === 'kanban'
                ? 'Track flight cargo consignments from Malpensa MXP → Manila NAIA.'
                : 'Live channel revenue, active cargo boxes, and stock alerts.'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            
            {/* Daily Task & Expiration Notification Bell */}
            <button
              onClick={() => setShowDailyTasks(true)}
              className="relative flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl bg-amber/20 border border-amber/40 text-amber font-mono font-bold text-xs px-3 hover:bg-amber/30 transition-all shadow-md gap-1.5"
              title="Daily Actionable Tasks & Expirations"
            >
              <span>🔔</span>
              <span>4</span>
            </button>

            <button 
              onClick={() => setPaletteOpen(true)}
              className="hidden lg:flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              Search Command <kbd className="ml-1 rounded border border-white/20 bg-black/50 px-1 font-sans text-[10px]">Ctrl K</kbd>
            </button>
            {section === 'inventory' && (
              <div className="flex items-center gap-4 border-l border-white/10 pl-4">
                <button
                  onClick={() => setShowCsvImport(true)}
                  className="flex items-center gap-2 rounded-md bg-forest/10 border border-forest/30 px-3 py-1.5 text-xs font-medium text-forest hover:bg-forest/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload CSV
                </button>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-white/70">
                  Sheet Mode
                <button
                  role="switch"
                  aria-checked={sheetMode}
                  onClick={() => setSheetMode((s) => !s)}
                  className={
                    'relative h-6 w-11 rounded-full transition-colors ' +
                    (sheetMode ? 'bg-blue' : 'bg-white/10')
                  }
                >
                  <span
                    className={
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ' +
                      (sheetMode ? 'left-[22px]' : 'left-0.5')
                    }
                  />
                </button>
              </label>
              </div>
            )}
          </div>
        </header>

        {/* Master KPI Row rendered ONLY on Home & Daily Overview (Master Metrics Page) */}
        {section === 'overview' && (
          <KpiRow skus={activeSkus} lowStock={lowStock} pending={pendingOrders} />
        )}

        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          <ErrorBoundary key={section}>
            <Suspense fallback={
              <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center text-white/50 space-y-4">
                <div className="w-8 h-8 rounded-full border-2 border-t-blue border-r-blue border-b-transparent border-l-transparent animate-spin" />
                <p className="text-sm font-medium animate-pulse">Loading workspace...</p>
              </div>
            }>
              {section === 'omni_hub' ? <OmniOperationsHub />
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
               : section === 'overview' ? <Overview setSection={setSection} />
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

      {/* Floating Instant AI Copilot Button */}
      <button
        onClick={() => setShowAiCopilot(true)}
        className="fixed bottom-5 right-5 z-40 bg-blue hover:bg-blue/90 text-white font-mono font-bold text-xs px-4 py-3 rounded-2xl shadow-2xl transition-all border border-blue/40 flex items-center gap-2 min-h-[44px] hover:scale-105 active:scale-95"
      >
        <span className="text-base leading-none">🤖</span>
        <span>AI Assistant</span>
      </button>
    </div>
  )
}

function KpiRow({ skus, lowStock, pending }) {
  const KPIS = [
    { label: 'Active SKUs', value: String(skus), sub: 'across 4 channels', tone: 'navy' },
    { label: 'Low-stock alerts', value: String(lowStock), sub: 'from master inventory', tone: lowStock > 0 ? 'danger' : 'navy' },
    { label: 'Pending orders', value: String(pending), sub: 'awaiting fulfillment', tone: pending > 0 ? 'danger' : 'navy' },
    { label: 'Today across channels', value: '₱41,260', sub: 'Live estimate', tone: 'good' },
  ]
  return (
    <div className="grid grid-cols-2 gap-px border-b border-white/10 bg-white/10 md:grid-cols-4 shrink-0">
      {KPIS.map((k) => (
        <div key={k.label} className={'px-4 py-4 md:px-6 ' + (k.tone === 'danger' ? 'bg-crimson/10' : 'bg-[#05080f]')}>
          <p className="text-[10px] font-mono uppercase tracking-widest text-white/50 truncate pr-2">{k.label}</p>
          <p
            className={
              'mt-2 text-xl md:text-2xl font-bold tabular tracking-tight ' +
              (k.tone === 'danger' ? 'text-crimson' : k.tone === 'good' ? 'text-forest' : 'text-white')
            }
          >
            {k.value}
          </p>
          <p className="text-xs text-white/30 mt-1 truncate pr-2">{k.sub}</p>
        </div>
      ))}
    </div>
  )
}
