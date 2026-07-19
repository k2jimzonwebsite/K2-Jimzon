import { useState, useEffect } from 'react'
import { AlertIcon, BoxIcon, GlobeIcon, GridIcon, SyncIcon, UserIcon, InboxIcon } from '../../components/ui/icons'
import Kanban from './Kanban'
import Sheet from './Sheet'
import GlobeCms from './GlobeCms'
import AiDrafts from './AiDrafts'
import Inbox from './Inbox'
import Customers from './Customers'
import { supabase } from '../../lib/supabaseClient'

const NAV = [
  { id: 'overview', label: 'Overview', icon: GridIcon },
  { id: 'inbox', label: 'Unified Inbox (AI)', icon: InboxIcon },
  { id: 'sourcing', label: 'Sourcing (Drafts)', icon: SyncIcon },
  { id: 'inventory', label: 'Master Inventory', icon: BoxIcon },
  { id: 'wholesale', label: 'Customer CRM', icon: UserIcon },
  { id: 'globe', label: 'Globe & Reviews', icon: GlobeIcon },
]

export default function Admin() {
  const [section, setSection] = useState('overview')
  const [sheetMode, setSheetMode] = useState(false)
  
  // KPI States
  const [activeSkus, setActiveSkus] = useState(0)
  const [lowStock, setLowStock] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)

  useEffect(() => {
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
    const { data: prodData } = await supabase.from('products').select('total_stock')
    if (prodData) {
      setActiveSkus(prodData.length)
      setLowStock(prodData.filter(p => p.total_stock <= 5).length)
    }

    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('order_status', 'Pending')
    if (count !== null) setPendingOrders(count)
  }

  const showSheet = sheetMode || section === 'inventory'

  return (
    <div className="flex min-h-[calc(100vh-40px)] bg-shell pb-20 text-navy md:pb-0">
      {/* Sidebar */}
      <aside className="hidden w-52 shrink-0 flex-col border-r border-line bg-navy text-white lg:flex">
        <div className="px-5 py-5">
          <p className="font-serif text-lg font-semibold text-white">K2 Jimzon</p>
          <p className="text-xs uppercase tracking-[0.22em] text-white/45">Operations</p>
        </div>
        <nav className="mt-2 flex-1 space-y-0.5 px-2.5">
          {NAV.map((item) => {
            const Ico = item.icon
            const on = section === item.id
            return (
              <button
                key={item.id}
                onClick={() => { setSection(item.id); setSheetMode(item.id === 'inventory') }}
                className={
                  'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ' +
                  (on ? 'bg-white/12 text-white' : 'text-white/55 hover:bg-white/6 hover:text-white')
                }
              >
                <Ico size={16} />
                {item.label}
                {item.id === 'inventory' && (
                  <span className="ml-auto rounded bg-white/15 px-1.5 text-xs tabular">{activeSkus}</span>
                )}
              </button>
            )
          })}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-xs text-white/50">
          <p className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-forest pulse-dot" />
            Supabase · live
          </p>
          <p className="mt-1">Shopee sync: Auto</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile advisory */}
        <div className="flex items-center gap-2 border-b border-amber/30 bg-amber-wash px-4 py-2 text-sm text-amber lg:hidden">
          <AlertIcon size={14} />
          Admin is designed for desktop. Mobile view is read-only.
        </div>

        <header className="flex flex-wrap items-center gap-3 border-b border-line bg-paper px-4 py-3.5 md:px-6">
          <div>
            <h1 className="font-serif text-xl font-semibold tracking-tight">
              {section === 'globe' ? 'Globe & Reviews' : section === 'wholesale' ? 'Customer CRM' : section === 'sourcing' ? 'AI Sourcing Queue' : section === 'inbox' ? 'Unified Inbox' : showSheet ? 'Master inventory' : 'Fulfillment overview'}
            </h1>
            <p className="text-sm text-navy-soft">
              {section === 'globe'
                ? 'Manage which products appear on the 3D globe and customer reviews'
                : section === 'wholesale'
                ? 'Approve VIP roles for wholesale buyers'
                : section === 'sourcing'
                ? 'Review product drafts parsed by the vision AI before pushing to live inventory'
                : section === 'inbox'
                ? 'Manage messages from WhatsApp, Facebook, and Viber. AI Copilot is active.'
                : 'Thursday, 10 July · cut-off for today\'s courier pickup: 3:00 pm'}
            </p>
          </div>
          {section !== 'globe' && section !== 'sourcing' && section !== 'inbox' && section !== 'wholesale' && (
            <label className="ml-auto flex cursor-pointer items-center gap-2.5 text-sm font-medium">
              Sheet Mode
              <button
                role="switch"
                aria-checked={sheetMode}
                onClick={() => setSheetMode((s) => !s)}
                className={
                  'relative h-6 w-11 rounded-full transition-colors ' +
                  (sheetMode ? 'bg-forest' : 'bg-navy/20')
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
          )}
        </header>

        {section !== 'globe' && section !== 'sourcing' && section !== 'inbox' && section !== 'wholesale' && (
          <KpiRow skus={activeSkus} lowStock={lowStock} pending={pendingOrders} />
        )}

        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          {section === 'globe' ? <GlobeCms /> 
           : section === 'inbox' ? <Inbox />
           : section === 'sourcing' ? <AiDrafts />
           : section === 'wholesale' ? <Customers />
           : showSheet ? <Sheet /> 
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
    <div className="grid grid-cols-2 gap-px border-b border-line bg-line lg:grid-cols-4 shrink-0">
      {KPIS.map((k) => (
        <div key={k.label} className={'px-4 py-4 md:px-6 ' + (k.tone === 'danger' ? 'bg-crimson-wash' : 'bg-paper')}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-navy-soft">{k.label}</p>
          <p
            className={
              'mt-1 text-2xl font-bold tabular ' +
              (k.tone === 'danger' ? 'text-crimson' : k.tone === 'good' ? 'text-forest' : 'text-navy')
            }
          >
            {k.value}
          </p>
          <p className="text-xs text-navy-faint">{k.sub}</p>
        </div>
      ))}
    </div>
  )
}
