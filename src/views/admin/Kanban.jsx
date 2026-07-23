import { useState, useEffect } from 'react'
import { BoxIcon, SyncIcon, GlobeIcon, PlaneIcon } from '../../components/ui/icons'
import { supabase } from '../../lib/supabaseClient'
import CustomerPackModal from './CustomerPackModal'
import OutboundSourcing from './OutboundSourcing'
import PurchaseOrders from './PurchaseOrders'
import ConsignmentManager from './ConsignmentManager'

const COLUMNS_DEF = [
  { id: 'shopee_account_1', name: 'Shopee A — Pasabuy Europe', meta: 'Preferred seller · 4.9★', accent: '#ee4d2d' },
  { id: 'shopee_account_2', name: 'Shopee B — K2 Jimzon', meta: 'Retail overflow', accent: '#f36f21' },
  { id: 'website_retail', name: 'Website — Retail', meta: 'Standard shipping', accent: '#c8102e' },
  { id: 'website_vip', name: 'Website — VIP Bulk', meta: 'Lalamove / Freight', accent: '#0d47a1' },
]

const STATUS_TONE = {
  'Pending': 'bg-crimson-wash text-crimson',
  'Packed': 'bg-amber-wash text-amber',
  'Shipped': 'bg-forest-wash text-forest',
  'Cancelled': 'bg-navy/8 text-navy-soft',
}

export default function Kanban() {
  const [activeTab, setActiveTab] = useState('consignment') // 'consignment' | 'kanban' | 'inbound' | 'outbound'
  
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [packingOrder, setPackingOrder] = useState(null)

  useEffect(() => {
    if (!supabase) return;
    fetchOrders()

    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        fetchOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchOrders = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('orders')
      .select('*, products(title, srp, wholesale_price)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      const grouped = {}
      for (const row of data) {
        const groupId = `${row.created_at}_${row.channel_source}`
        if (!grouped[groupId]) {
          grouped[groupId] = {
            id: groupId,
            channel_source: row.channel_source,
            order_status: row.order_status,
            payment_status: row.payment_status,
            created_at: row.created_at,
            items: []
          }
        }
        grouped[groupId].items.push({
          row_id: row.id,
          sku: row.sku,
          quantity: row.quantity,
          product: row.products
        })
        if (row.order_status === 'Pending') grouped[groupId].order_status = 'Pending'
      }
      setOrders(Object.values(grouped).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)))
    }
    setLoading(false)
  }

  const handleConfirmPacked = async (groupId, currentStatus, items) => {
    const nextStatus = currentStatus === 'Pending' ? 'Packed' : currentStatus === 'Packed' ? 'Shipped' : null;
    if (!nextStatus || !supabase) return;

    setOrders(prev => prev.map(o => o.id === groupId ? { ...o, order_status: nextStatus } : o))
    setPackingOrder(null)

    const rowIds = items.map(i => i.row_id)
    const { error } = await supabase
      .from('orders')
      .update({ order_status: nextStatus })
      .in('id', rowIds)

    if (error) {
      console.error("Failed to update status", error)
      fetchOrders()
    }
  }

  const columns = COLUMNS_DEF.map(def => ({
    ...def,
    orders: orders.filter(o => o.channel_source === def.id)
  }))

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500">
      
      {/* Global Logistics Unified Header Tabs */}
      <div className="flex flex-col xl:flex-row gap-4 border-b border-white/10 pb-4 shrink-0">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-widest bg-forest/20 text-forest px-2 py-0.5 rounded">
              Unified Supply Chain Hub
            </span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-white">Global Logistics & Manifest Command</h1>
          <p className="text-base text-white/50">Manage Milan flight consignments, box scanning receiving (+1), supplier POs, and PH customer order fulfillment in one place.</p>
        </div>
        
        <div className="flex bg-[#18181b] rounded-xl p-2 border border-white/20 overflow-x-auto whitespace-nowrap hide-scrollbar items-center gap-2">
          <button 
            onClick={() => setActiveTab('consignment')}
            className={`px-4 py-2.5 text-sm font-black rounded-lg flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'consignment' ? 'bg-crimson text-white shadow-lg' : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <PlaneIcon size={16} /> Italy ✈ Manila Manifests (+1 Scanner)
          </button>

          <button 
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2.5 text-sm font-black rounded-lg flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'kanban' ? 'bg-blue text-white shadow-lg' : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <BoxIcon size={16} /> Customer Orders (PH)
          </button>

          <button 
            onClick={() => setActiveTab('inbound')}
            className={`px-4 py-2.5 text-sm font-black rounded-lg flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'inbound' ? 'bg-gold text-navy shadow-lg' : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <GlobeIcon size={16} /> Purchase Orders
          </button>
          
          <button 
            onClick={() => setActiveTab('outbound')}
            className={`px-4 py-2.5 text-sm font-black rounded-lg flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'outbound' ? 'bg-blue text-white shadow-lg' : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <SyncIcon size={16} /> AI Outbound Sourcing
          </button>
        </div>
      </div>

      {/* Global Logistics Sub-Views */}
      <div className="mt-2 flex-1">
        {activeTab === 'consignment' && (
          <div className="w-full">
            <ConsignmentManager />
          </div>
        )}

        {activeTab === 'outbound' && (
          <div className="w-full">
            <OutboundSourcing />
          </div>
        )}

        {activeTab === 'inbound' && (
          <div className="w-full">
            <PurchaseOrders />
          </div>
        )}

        {activeTab === 'kanban' && (
          <div className="w-full">
            <div className="flex gap-4 overflow-x-auto min-h-[500px]">
              {loading && orders.length === 0 ? (
                <div className="w-full text-center py-10 text-base font-extrabold text-white animate-pulse">Loading customer orders...</div>
              ) : (
                columns.map((col) => (
                  <section key={col.id} className="w-72 shrink-0 md:w-[calc(25%-12px)] md:min-w-64">
                    <header className="mb-2.5 flex items-start justify-between px-1">
                      <div>
                        <h2 className="flex items-center gap-2 text-base font-black text-white">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.accent }} />
                          {col.name}
                        </h2>
                        <p className="ml-4 text-sm font-bold text-gold">{col.meta}</p>
                      </div>
                      <span className="rounded-full bg-gold text-navy px-2.5 py-0.5 text-sm font-black tabular shadow">
                        {col.orders.length}
                      </span>
                    </header>
                    <div className="space-y-2.5">
                      {col.orders.map(o => (
                        <button
                          key={o.id}
                          onClick={() => setPackingOrder(o)}
                          className="w-full text-left bg-[#101623] hover:bg-[#151c2b] border border-white/5 rounded-md p-3 mb-2 shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-white/20 relative group overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: col.accent }}></div>
                          <div className="pl-3">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-mono text-sm text-white/50">{new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} · {o.items.length} items</p>
                              <span className={`text-xs px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${STATUS_TONE[o.order_status]}`}>
                                {o.order_status}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {o.items.slice(0, 3).map((item, i) => (
                                <div key={i} className="flex justify-between text-base">
                                  <span className="text-neutral-200 truncate mr-2">{item.product?.title || item.sku}</span>
                                  <span className="text-white/40 font-mono shrink-0">x{item.quantity}</span>
                                </div>
                              ))}
                              {o.items.length > 3 && (
                                <p className="text-sm text-white/40 italic pt-1">+ {o.items.length - 3} more items...</p>
                              )}
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                              <span className="text-sm text-white/40">{o.payment_status}</span>
                              <span className="text-sm font-semibold text-blue group-hover:text-blue-light transition-colors">Pack & Verify →</span>
                            </div>
                          </div>
                        </button>
                      ))}
                      {col.orders.length > 0 && (
                        <button className="w-full rounded-lg border border-dashed border-white/20 bg-white/5 py-2 text-sm font-medium text-white/60 hover:border-white/40 hover:text-white transition-colors">
                          Print {col.orders.length} waybills
                        </button>
                      )}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {packingOrder && (
        <CustomerPackModal 
          order={packingOrder} 
          onClose={() => setPackingOrder(null)} 
          onConfirmPacked={() => handleConfirmPacked(packingOrder.id, packingOrder.order_status)}
        />
      )}
    </div>
  )
}
