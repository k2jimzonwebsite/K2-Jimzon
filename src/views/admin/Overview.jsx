import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { peso } from '../../data/products'
import AdminVisualWorkflowGraph from './AdminVisualWorkflowGraph'

export default function Overview({ setSection, skus = 0, lowStock = 0, pending = 0 }) {
  const [salesToday, setSalesToday] = useState(0)

  useEffect(() => {
    if (!supabase) return
    fetchData()
    const channel = supabase.channel('overview_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchData = async () => {
    if (!supabase) return
    try {
      const { data: allOrders } = await supabase.from('orders')
        .select('quantity, sku, products(srp, wholesale_price), channel_source')
      if (Array.isArray(allOrders) && allOrders.length > 0) {
        let revenue = 0
        allOrders.forEach(o => {
          const prodObj = Array.isArray(o.products) ? o.products[0] : o.products
          const price = o.channel_source === 'website_vip' ? prodObj?.wholesale_price : prodObj?.srp
          if (price) revenue += price * (o.quantity || 1)
        })
        setSalesToday(revenue)
      } else {
        setSalesToday(0)
      }
    } catch (err) {
      console.warn('Overview fetchData warning:', err)
    }
  }

  const revenue = salesToday > 0 ? peso(salesToday) : '₱0'
  const cogs = salesToday > 0 ? peso(salesToday * 0.5) : '₱0'
  const profit = salesToday > 0 ? peso(salesToday * 0.35) : '₱0'

  const metrics = [
    { label: "Today's sales", value: revenue, tone: 'default' },
    { label: 'Pending fulfillment', value: String(pending), tone: pending > 0 ? 'warn' : 'default' },
    { label: 'Low-stock alerts', value: String(lowStock), tone: lowStock > 0 ? 'danger' : 'default' },
    { label: 'Active SKUs', value: String(skus), tone: 'default' },
  ]

  const actions = [
    { label: 'Inventory', sub: 'Catalog & stock', target: 'inventory' },
    { label: 'Fulfillment', sub: 'Pack & handover', target: 'omni_hub' },
    { label: 'Pasabuy', sub: 'Custom quotes', target: 'pasabuy_manager' },
    { label: 'Staff & roles', sub: 'PINs & access', target: 'staff_permissions' },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans w-full">

      {/* Metrics — single canonical KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="rounded-xl border border-white/10 bg-[#12161F] px-4 py-3.5">
            <p className="text-xs text-white/60">{m.label}</p>
            <p className={
              'mt-1.5 text-2xl font-semibold tabular-nums ' +
              (m.tone === 'danger' ? 'text-crimson' : m.tone === 'warn' ? 'text-amber' : 'text-white')
            }>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Operational workflow map */}
      <AdminVisualWorkflowGraph onNavigate={setSection} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Financial summary */}
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-[#12161F] p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Today's landed P&amp;L</h2>
            <span className="text-xs text-white/60">estimated</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-white/60">Gross revenue</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-white">{revenue}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Sourcing COGS</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-white/70">-{cogs}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Net profit</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-blue">{profit}</p>
            </div>
          </div>
        </div>

        {/* Status + quick actions */}
        <div className="space-y-4">
          {lowStock > 0 ? (
            <button
              onClick={() => setSection && setSection('inventory')}
              className="w-full text-left rounded-xl border border-crimson/30 bg-crimson/10 p-4 hover:bg-crimson/15 transition-colors"
            >
              <p className="text-sm font-medium text-crimson">{lowStock} items low on stock</p>
              <p className="text-xs text-white/50 mt-0.5">Reorder or create a Pasabuy sourcing request →</p>
            </button>
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#12161F] p-4">
              <p className="text-sm text-white/70">Stock levels healthy</p>
              <p className="text-xs text-white/60 mt-0.5">No critical stock warnings.</p>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-[#12161F] p-4">
            <p className="text-sm text-white/70">Flight AZ-772 · MXP → NAIA</p>
            <p className="text-xs text-white/60 mt-0.5">Custody verification active · staff PIN claims enabled.</p>
          </div>
        </div>
      </div>

      {/* Quick jump */}
      <div>
        <p className="text-xs text-white/60 mb-2">Quick jump</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map(a => (
            <button
              key={a.target}
              onClick={() => setSection(a.target)}
              className="text-left rounded-xl border border-white/10 bg-[#12161F] p-4 hover:border-blue/40 hover:bg-blue/[0.06] transition-colors"
            >
              <p className="text-sm font-medium text-white">{a.label}</p>
              <p className="text-xs text-white/60 mt-0.5">{a.sub}</p>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
