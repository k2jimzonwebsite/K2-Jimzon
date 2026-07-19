import { useState, useEffect } from 'react'
import { BoxIcon, SyncIcon } from '../../components/ui/icons'
import { supabase } from '../../lib/supabaseClient'
import CustomerPackModal from './CustomerPackModal'
import OutboundSourcing from './OutboundSourcing'
import PurchaseOrders from './PurchaseOrders'

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
  const [activeTab, setActiveTab] = useState('kanban') // 'kanban' | 'inbound' | 'outbound'
  
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
      .select('*, products(title, retail_price, vip_price)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOrders(data)
    }
    setLoading(false)
  }

  const handleConfirmPacked = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'Pending' ? 'Packed' : currentStatus === 'Packed' ? 'Shipped' : null;
    if (!nextStatus || !supabase) return;

    // Optimistic update
    setOrders(prev => prev.map(o => o.id === id ? { ...o, order_status: nextStatus } : o))
    setPackingOrder(null)

    const { error } = await supabase
      .from('orders')
      .update({ order_status: nextStatus })
      .eq('id', id)

    if (error) {
      console.error("Failed to update status", error)
      fetchOrders() // revert
    }
  }

  const columns = COLUMNS_DEF.map(def => ({
    ...def,
    orders: orders.filter(o => o.channel_source === def.id)
  }))

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500">
      
      {/* Global Logistics Unified Header Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 border-b border-white/10 pb-4 shrink-0">
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-bold text-white mb-2">Global Logistics</h1>
          <p className="text-sm text-white/50">Command center for scanning and shipping physical boxes.</p>
        </div>
        
        <div className="flex bg-[#05080f] rounded-lg p-1 border border-white/10">
          <button 
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-all ${
              activeTab === 'kanban' ? 'bg-blue text-white shadow-lg' : 'text-white/40 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <BoxIcon size={16} /> Customer Orders (PH)
          </button>
          
          <button 
            onClick={() => setActiveTab('outbound')}
            className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-all ${
              activeTab === 'outbound' ? 'bg-forest text-navy shadow-lg' : 'text-white/40 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <BoxIcon size={16} /> Pack Supply (Italy)
          </button>

          <button 
            onClick={() => setActiveTab('inbound')}
            className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-all ${
              activeTab === 'inbound' ? 'bg-forest text-navy shadow-lg' : 'text-white/40 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <SyncIcon size={16} /> Receive Supply (PH)
          </button>
        </div>
      </div>

      {/* Global Logistics Sub-Views */}
      <div className="mt-4">
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
                <div className="w-full text-center py-10 text-sm text-white/40">Loading customer orders...</div>
              ) : (
                columns.map((col) => (
                  <section key={col.id} className="w-72 shrink-0 md:w-[calc(25%-12px)] md:min-w-64">
                    <header className="mb-2.5 flex items-start justify-between px-1">
                      <div>
                        <h2 className="flex items-center gap-2 text-sm font-bold text-white/90">
                          <span className="h-2 w-2 rounded-full" style={{ background: col.accent }} />
                          {col.name}
                        </h2>
                        <p className="ml-4 text-xs text-white/40">{col.meta}</p>
                      </div>
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-xs font-semibold tabular text-white/60">
                        {col.orders.length}
                      </span>
                    </header>
                    <div className="space-y-2.5">
                      {col.orders.map((o) => {
                        const title = o.products?.title || o.sku
                        const price = o.channel_source === 'website_vip' ? o.products?.vip_price : o.products?.retail_price
                        const total = (price || 0) * o.quantity

                        return (
                          <article
                            key={o.id}
                            onClick={() => {
                              if (o.order_status === 'Pending') {
                                setPackingOrder(o)
                              } else {
                                handleConfirmPacked(o.id, o.order_status)
                              }
                            }}
                            className="cursor-pointer rounded-lg border border-white/10 bg-[#05080f] p-3 shadow-lg transition-transform hover:-translate-y-1 hover:border-white/20 hover:shadow-xl"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold tabular truncate pr-2 text-white/90">#{o.id.split('-')[0]}</span>
                              <span className={'shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ' + (STATUS_TONE[o.order_status] ?? '')}>
                                {o.order_status}
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm font-medium text-white">{o.fulfillment_method || 'Standard Courier'}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-white/50">{title} ×{o.quantity}</p>
                            <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                              <span className="text-sm font-bold tabular text-white/90">
                                ₱{total.toLocaleString('en-PH')}
                              </span>
                              <span className={'text-xs font-bold uppercase tracking-wider ' + (o.payment_status === 'Paid' ? 'text-forest' : 'text-crimson')}>
                                {o.payment_status}
                              </span>
                            </div>
                          </article>
                        )
                      })}
                      {col.orders.length > 0 && (
                        <button className="w-full rounded-lg border border-dashed border-white/20 bg-white/5 py-2 text-xs font-medium text-white/60 hover:border-white/40 hover:text-white transition-colors">
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
