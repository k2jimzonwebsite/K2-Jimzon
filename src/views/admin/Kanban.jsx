import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BoxIcon, CheckIcon, AlertIcon } from '../../components/ui/icons'
import { supabase } from '../../lib/supabaseClient'

// Channel-segregated fulfillment board: packing never mixes across channels.

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
  const [showAudit, setShowAudit] = useState(false)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    const { data, error } = await supabase
      .from('orders')
      .select('*, products(title, retail_price, vip_price)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOrders(data)
    }
    setLoading(false)
  }

  const updateOrderStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'Pending' ? 'Packed' : currentStatus === 'Packed' ? 'Shipped' : null;
    if (!nextStatus) return;

    // Optimistic update
    setOrders(prev => prev.map(o => o.id === id ? { ...o, order_status: nextStatus } : o))

    const { error } = await supabase
      .from('orders')
      .update({ order_status: nextStatus })
      .eq('id', id)

    if (error) {
      console.error("Failed to update status", error)
      fetchOrders() // revert
    }
  }

  // Group orders by channel
  const columns = COLUMNS_DEF.map(def => ({
    ...def,
    orders: orders.filter(o => o.channel_source === def.id)
  }))

  return (
    <div className="space-y-4">
      {/* Sourcing / Receiving Mock */}
      <div className="flex items-center justify-between rounded-lg border border-line bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-navy flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber pulse-dot"></span>
            Incoming Shipment: Flight EK334 (Milan - DXB - MNL)
          </h2>
          <p className="mt-0.5 text-sm text-navy-soft">42 boxes containing 814 items. Arrived in Manila 2 hours ago.</p>
        </div>
        <button
          onClick={() => setShowAudit(true)}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy/90"
        >
          Audit & Receive (Scan)
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 min-h-[500px]">
        {loading && orders.length === 0 ? (
          <div className="w-full text-center py-10 text-sm text-navy-soft">Loading unified fulfillment feed...</div>
        ) : (
          columns.map((col) => (
            <section key={col.id} className="w-72 shrink-0 md:w-[calc(25%-12px)] md:min-w-64">
              <header className="mb-2.5 flex items-start justify-between px-1">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold">
                    <span className="h-2 w-2 rounded-full" style={{ background: col.accent }} />
                    {col.name}
                  </h2>
                  <p className="ml-4 text-xs text-navy-faint">{col.meta}</p>
                </div>
                <span className="rounded bg-navy/8 px-1.5 py-0.5 text-xs font-semibold tabular">
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
                      onClick={() => updateOrderStatus(o.id, o.order_status)}
                      className="cursor-pointer rounded-lg border border-line bg-paper p-3 shadow-card transition-shadow hover:shadow-float"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold tabular truncate pr-2">#{o.id.split('-')[0]}</span>
                        <span className={'shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ' + (STATUS_TONE[o.order_status] ?? '')}>
                          {o.order_status}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium">{o.fulfillment_method || 'Standard Courier'}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-navy-soft">{title} ×{o.quantity}</p>
                      <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                        <span className="text-sm font-bold tabular">
                          ₱{total.toLocaleString('en-PH')}
                        </span>
                        <span className={'text-xs font-semibold uppercase tracking-wide ' + (o.payment_status === 'Paid' ? 'text-forest' : 'text-crimson')}>
                          {o.payment_status}
                        </span>
                      </div>
                    </article>
                  )
                })}
                {col.orders.length > 0 && (
                  <button className="w-full rounded-lg border border-dashed border-navy/20 py-2 text-xs font-medium text-navy-soft hover:border-navy/40 hover:text-navy">
                    Print {col.orders.length} waybills
                  </button>
                )}
              </div>
            </section>
          ))
        )}
      </div>

      <AnimatePresence>
        {showAudit && <AuditModal onClose={() => setShowAudit(false)} />}
      </AnimatePresence>
    </div>
  )
}

function AuditModal({ onClose }) {
  const [scanned, setScanned] = useState(0)
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-float"
      >
        <div className="border-b border-line bg-shell px-6 py-4">
          <h3 className="font-serif text-lg font-semibold text-navy">Audit & Receive</h3>
          <p className="text-sm text-navy-soft">Scan physical barcodes to reconcile digital manifest.</p>
        </div>
        
        <div className="p-6">
          <div className="mb-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-forest bg-forest-wash p-8 text-center">
            <BoxIcon className="text-forest mb-3" size={32} />
            <h4 className="text-base font-bold text-navy">Nutella Biscuits 304g</h4>
            <p className="text-sm text-navy-soft">Expected: 24 units in Box 1</p>
            
            <div className="mt-6 flex items-center gap-6">
              <button 
                onClick={() => setScanned(Math.max(0, scanned - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy shadow-sm transition hover:bg-line active:scale-95"
              >-</button>
              <div className="text-4xl font-bold tabular text-forest">{scanned}</div>
              <button 
                onClick={() => setScanned(scanned + 1)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-forest text-white shadow-sm transition hover:bg-forest/90 active:scale-95"
              >+</button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 rounded bg-amber-wash px-3 py-2 text-xs font-medium text-amber">
            <AlertIcon size={14} /> Only confirmed units will be added to the live Master Inventory.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line bg-shell px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-bold text-navy-soft hover:text-navy">
            Cancel
          </button>
          <button onClick={onClose} className="flex items-center gap-2 rounded-lg bg-navy px-5 py-2 text-sm font-bold text-white transition hover:bg-navy/90">
            <CheckIcon size={16} /> Confirm Batch (Push to DB)
          </button>
        </div>
      </motion.div>
    </div>
  )
}
