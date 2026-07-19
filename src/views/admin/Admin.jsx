import { useState, useEffect } from 'react'
import { AlertIcon, BoxIcon, GlobeIcon, GridIcon, SyncIcon, UserIcon, InboxIcon } from '../../components/ui/icons'
import Kanban from './Kanban'
import Sheet from './Sheet'
import InventoryGrid from './InventoryGrid'
import GlobeCms from './GlobeCms'
import AiDrafts from './AiDrafts'
import Inbox from './Inbox'
import Customers from './Customers'
import CommandPalette from './CommandPalette'
import Overview from './Overview'
import Suppliers from './Suppliers'
import PurchaseOrders from './PurchaseOrders'
import OutboundSourcing from './OutboundSourcing'
import BulkCsvImportModal from './BulkCsvImportModal'
import { supabase } from '../../lib/supabaseClient'

const NAV_COMMERCE = [
  { id: 'overview', label: 'Home Dashboard', icon: GridIcon },
  { id: 'kanban', label: 'Global Logistics', icon: BoxIcon },
  { id: 'wholesale', label: 'VIP Customers', icon: UserIcon },
  { id: 'inbox', label: 'Messages', icon: InboxIcon },
]

const NAV_SUPPLY = [
  { id: 'inventory', label: 'All Products', icon: BoxIcon },
  { id: 'suppliers', label: 'Our Suppliers', icon: GlobeIcon },
]

const NAV_INTELLIGENCE = [
  { id: 'sourcing', label: 'Pending AI Products', icon: SyncIcon },
  { id: 'globe', label: '3D Map Settings', icon: GlobeIcon },
]

export default function Admin() {
  const [section, setSection] = useState('overview')
  const [sheetMode, setSheetMode] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  
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
    const { data: prodData } = await supabase.from('products').select('total_stock')
    if (prodData) {
      setActiveSkus(prodData.length)
      setLowStock(prodData.filter(p => p.total_stock <= 5).length)
    }

    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('order_status', 'Pending')
    if (count !== null) setPendingOrders(count)
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
        <div className="border-t border-white/10 px-5 py-4 text-xs text-white/50">
          <p className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-forest pulse-dot" />
            Supabase · live
          </p>
          <p className="mt-1">Shopee sync: Auto</p>
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
                          className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${section === item.id ? 'bg-blue/20 text-white' : 'text-white/55 hover:bg-white/6 hover:text-white'}`}
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
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setSection(item.id); setSheetMode(item.id === 'inventory'); setIsMobileMenuOpen(false); }}
                          className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${section === item.id ? 'bg-blue/20 text-white' : 'text-white/55 hover:bg-white/6 hover:text-white'}`}
                        >
                          <Ico size={16} /> {item.label}
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
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setSection(item.id); setSheetMode(item.id === 'inventory'); setIsMobileMenuOpen(false); }}
                          className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${section === item.id ? 'bg-blue/20 text-white' : 'text-white/55 hover:bg-white/6 hover:text-white'}`}
                        >
                          <Ico size={16} /> {item.label}
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
          <div>
            <h1 className="font-serif text-xl font-semibold tracking-tight text-white">
              {section === 'globe' ? '3D Map Settings' : section === 'wholesale' ? 'VIP Customers' : section === 'sourcing' ? 'Pending AI Products' : section === 'inbox' ? 'Customer Messages' : section === 'inventory' ? 'All Products' : section === 'suppliers' ? 'Supplier Contacts' : section === 'pos' ? 'Incoming Deliveries' : section === 'kanban' ? 'Pack & Ship Orders' : 'Home Dashboard'}
            </h1>
            <p className="text-xs font-mono text-white/50 mt-1">
              {section === 'globe'
                ? 'Manage which products appear on the 3D map.'
                : section === 'wholesale'
                ? 'Approve VIP roles for wholesale buyers.'
                : section === 'sourcing'
                ? 'Review products parsed by the AI before pushing to live inventory.'
                : section === 'inbox'
                ? 'Manage messages from WhatsApp, Facebook, and Viber. AI Copilot is active.'
                : section === 'suppliers'
                ? 'Manage vendor relationships and track lead times.'
                : section === 'pos'
                ? 'Track deliveries and auto-restock inventory.'
                : 'SYSTEM_STATUS: NOMINAL | Last Sync: Just now'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            
            {/* Notification Bell */}
            <button className="relative flex items-center justify-center h-9 w-9 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Fake unread badge */}
              <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-crimson" />
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

        {section !== 'globe' && section !== 'sourcing' && section !== 'inbox' && section !== 'wholesale' && (
          <KpiRow skus={activeSkus} lowStock={lowStock} pending={pendingOrders} />
        )}

        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          {section === 'globe' ? <GlobeCms /> 
           : section === 'inbox' ? <Inbox />
           : section === 'outbound' ? <OutboundSourcing />
           : section === 'sourcing' ? <AiDrafts />
           : section === 'wholesale' ? <Customers />
           : section === 'suppliers' ? <Suppliers />
           : section === 'pos' ? <PurchaseOrders />
           : showSheet ? <Sheet /> 
           : showGrid ? <InventoryGrid />
           : section === 'overview' ? <Overview setSection={setSection} />
           : <Kanban />}
        </div>
      </div>
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
    <div className="grid grid-cols-2 gap-px border-b border-white/10 bg-white/10 lg:grid-cols-4 shrink-0">
      {KPIS.map((k) => (
        <div key={k.label} className={'px-4 py-4 md:px-6 ' + (k.tone === 'danger' ? 'bg-crimson/10' : 'bg-[#05080f]')}>
          <p className="text-[10px] font-mono uppercase tracking-widest text-white/50">{k.label}</p>
          <p
            className={
              'mt-1 text-2xl font-bold tabular tracking-tight ' +
              (k.tone === 'danger' ? 'text-crimson' : k.tone === 'good' ? 'text-forest' : 'text-white')
            }
          >
            {k.value}
          </p>
          <p className="text-xs text-white/30 mt-1">{k.sub}</p>
        </div>
      ))}
    </div>
  )
}
