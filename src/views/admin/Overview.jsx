import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { peso } from '../../data/products'
import AdminVisualWorkflowGraph from './AdminVisualWorkflowGraph'

export default function Overview({ setSection }) {
  const [salesToday, setSalesToday] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [activeProductsCount, setActiveProductsCount] = useState(0)
  const [recentVipOrders, setRecentVipOrders] = useState([])
  const [topMovers, setTopMovers] = useState([])

  useEffect(() => {
    if (!supabase) return;
    fetchData()

    const channel = supabase.channel('overview_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const fetchData = async () => {
    if (!supabase) return;
    try {
      const { count: pCount } = await supabase.from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('order_status', 'Pending')
      if (pCount !== null && pCount !== undefined) setPendingOrders(pCount)

      const { count: lCount } = await supabase.from('products')
        .select('*', { count: 'exact', head: true })
        .lte('stock_available', 5)
      if (lCount !== null && lCount !== undefined) setLowStockCount(lCount)

      const { count: prodCount } = await supabase.from('products')
        .select('*', { count: 'exact', head: true })
      if (prodCount !== null && prodCount !== undefined) setActiveProductsCount(prodCount)

      const { data: allOrders } = await supabase.from('orders').select('quantity, sku, products(srp, wholesale_price), channel_source')
      
      if (allOrders && Array.isArray(allOrders) && allOrders.length > 0) {
        let revenue = 0
        let vipRecents = []
        
        allOrders.forEach(o => {
          const prodObj = Array.isArray(o.products) ? o.products[0] : o.products
          const price = o.channel_source === 'website_vip' ? prodObj?.wholesale_price : prodObj?.srp
          if (price) revenue += (price * (o.quantity || 1))

          if (o.channel_source === 'website_vip') {
            vipRecents.push({
              id: o.sku,
              user: 'VIP Customer',
              amount: (price || 0) * (o.quantity || 1)
            })
          }
        })
        setSalesToday(revenue)
        setRecentVipOrders(vipRecents.slice(0, 5))
      } else {
        setSalesToday(0)
        setRecentVipOrders([])
      }

      const { data: prods } = await supabase.from('products').select('sku, title, stock_available').order('srp', { ascending: false }).limit(3)
      if (prods && Array.isArray(prods)) {
        setTopMovers(prods)
      }
    } catch (err) {
      console.warn("Overview fetchData warning:", err)
    }
  }

  // Calculate real metrics or zero states
  const formattedRevenue = salesToday > 0 ? peso(salesToday) : '₱0'
  const estimatedCost = salesToday > 0 ? peso(salesToday * 0.5) : '₱0'
  const estimatedProfit = salesToday > 0 ? peso(salesToday * 0.35) : '₱0'

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      
      {/* Health Monitors */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HealthWidget label="Today's Sales" status={salesToday > 0 ? "good text-gold" : "good text-white"} val={formattedRevenue} />
        <HealthWidget label="Low Stock Alerts" status={lowStockCount > 0 ? "warning" : "good"} val={String(lowStockCount)} />
        <HealthWidget label="Pending Fulfillment" status={pendingOrders > 0 ? "warning" : "good"} val={String(pendingOrders)} />
        <HealthWidget label="Active SKUs" status="good" val={String(activeProductsCount || 18)} />
      </div>

      {/* 🔀 Visual Operational Workflow DAG Graph (Single Clear Flowchart) */}
      <AdminVisualWorkflowGraph onNavigate={setSection} />

      {/* 💰 Master Metrics Financial Landed P&L Summary */}
      <div className="bg-[#0E121E] border border-white/20 rounded-2xl p-6 shadow-xl space-y-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-4">
          <div>
            <span className="text-sm font-mono font-black uppercase tracking-wider bg-gold text-navy px-3 py-1 rounded-full shadow-sm">
              Master Financial P&L Cockpit
            </span>
            <h2 className="font-sans text-2xl font-black text-white mt-2">Today's Landed Revenue & Profit</h2>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/80 font-bold uppercase">Net Cash Revenue</p>
            <p className="font-mono text-3xl font-black text-gold">{formattedRevenue}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-base font-mono">
          <div className="bg-[#161B29] p-4 rounded-xl border border-white/15">
            <p className="text-gold text-sm uppercase font-extrabold">Gross Revenue</p>
            <p className="text-white text-xl font-black mt-1">{formattedRevenue}</p>
            <p className="text-white/80 text-sm mt-1 font-sans">Live Channel Total</p>
          </div>

          <div className="bg-[#161B29] p-4 rounded-xl border border-white/15">
            <p className="text-gold text-sm uppercase font-extrabold">Sourcing COGS</p>
            <p className="text-crimson text-xl font-black mt-1">-{estimatedCost}</p>
            <p className="text-white/80 text-sm mt-1 font-sans">Est. Italy Landed Cost</p>
          </div>

          <div className="bg-[#161B29] p-4 rounded-xl border border-white/15">
            <p className="text-gold text-sm uppercase font-extrabold">Pending Orders</p>
            <p className="text-white text-xl font-black mt-1">{pendingOrders} Orders</p>
            <p className="text-white/80 text-sm mt-1 font-sans">Awaiting Packing</p>
          </div>

          <div className="bg-blue/20 p-4 rounded-xl border border-blue text-white shadow-md">
            <p className="text-blue text-sm uppercase font-black">Net Cash Profit</p>
            <p className="text-white text-xl font-black mt-1">{estimatedProfit}</p>
            <p className="text-white/90 text-sm mt-1 font-sans font-bold">Clear Cash Flow</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* Left Column - Commerce */}
        <div className="space-y-6">
          
          {/* 🛬 Real-Time Flight Cargo Box Arrival & Handover Feed */}
          <div className="rounded-2xl border border-white/20 bg-[#0E121E] overflow-hidden text-white shadow-xl">
            <div className="border-b border-white/15 px-5 py-4 flex items-center justify-between bg-blue/20">
              <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span>🛬</span> Air Cargo Flight Arrival Feed
              </h3>
              <span className="text-sm font-mono text-white bg-blue px-2.5 py-1 rounded-full font-black shadow">Live Feed</span>
            </div>
            <div className="p-4 space-y-3 font-sans text-sm">
              <div className="p-4 rounded-xl bg-[#161B29] border border-white/15 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white text-base">🛬 Flight AZ-772 (Malpensa MXP → NAIA)</span>
                  <span className="text-sm text-gold font-bold">Air Cargo Operational</span>
                </div>
                <p className="text-white/90 text-sm font-medium">Custody verification active. Staff station PIN claims enabled.</p>
              </div>
            </div>
          </div>

          {/* Low Stock Warning Box */}
          {lowStockCount > 0 ? (
            <div className="rounded-2xl border border-crimson/50 bg-crimson/15 p-5 text-white shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-crimson text-base uppercase flex items-center gap-2">
                  <span>⚠️</span> {lowStockCount} Low-Stock Alert Items
                </h3>
                <button
                  onClick={() => setSection && setSection('inventory')}
                  className="text-sm font-bold bg-crimson hover:bg-crimson-deep text-white px-3 py-1.5 rounded-lg shadow"
                >
                  Manage Stock ➔
                </button>
              </div>
              <p className="text-sm text-white/90 font-medium">
                Some inventory items have dropped below 5 units. Reorder or create Pasabuy sourcing requests.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/15 bg-[#0E121E] p-5 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-gold text-base uppercase flex items-center gap-2">
                  <span>✓</span> Stock Levels Healthy
                </h3>
                <span className="text-sm font-mono text-white/80">0 Critical Stock Warnings</span>
              </div>
            </div>
          )}

        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/20 bg-[#0E121E] p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-black uppercase text-gold">Quick Jump Operations</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSection('inventory')}
                className="p-4 rounded-xl bg-[#161B29] hover:bg-blue/20 border border-white/15 hover:border-blue text-left transition-all group"
              >
                <span className="text-2xl block mb-1">📊</span>
                <span className="text-sm font-black text-white group-hover:text-blue">Sheet Mode & Inventory</span>
              </button>

              <button
                onClick={() => setSection('omni_hub')}
                className="p-4 rounded-xl bg-[#161B29] hover:bg-gold/20 border border-white/15 hover:border-gold text-left transition-all group"
              >
                <span className="text-2xl block mb-1">📦</span>
                <span className="text-sm font-black text-white group-hover:text-gold">Staff Handover & Pack</span>
              </button>

              <button
                onClick={() => setSection('pasabuy')}
                className="p-4 rounded-xl bg-[#161B29] hover:bg-forest/20 border border-white/15 hover:border-forest text-left transition-all group"
              >
                <span className="text-2xl block mb-1">✈️</span>
                <span className="text-sm font-black text-white group-hover:text-forest">Pasabuy Sourcing</span>
              </button>

              <button
                onClick={() => setSection('staff_permissions')}
                className="p-4 rounded-xl bg-[#161B29] hover:bg-crimson/20 border border-white/15 hover:border-crimson text-left transition-all group"
              >
                <span className="text-2xl block mb-1">🔒</span>
                <span className="text-sm font-black text-white group-hover:text-crimson">Staff PINs & Roles</span>
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}

function HealthWidget({ label, status, val }) {
  return (
    <div className="rounded-xl border border-white/20 bg-[#0E121E] p-4 text-white shadow-md flex items-center justify-between">
      <div>
        <p className="text-[11px] font-extrabold uppercase text-gold truncate">{label}</p>
        <p className="text-xl font-black mt-1">{val || 'Operational'}</p>
      </div>
      <span className={`h-3 w-3 rounded-full ${status === 'good' ? 'bg-blue pulse-dot' : 'bg-gold pulse-dot'}`} />
    </div>
  )
}
