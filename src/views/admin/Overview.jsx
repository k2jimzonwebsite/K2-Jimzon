import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { peso } from '../../data/products'
import AdminProcessFlowDiagram from './AdminProcessFlowDiagram'
import AdminVisualWorkflowGraph from './AdminVisualWorkflowGraph'

export default function Overview({ setSection }) {
  const [salesToday, setSalesToday] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [draftsCount, setDraftsCount] = useState(2)
  
  const [recentVipOrders, setRecentVipOrders] = useState([])
  const [topMovers, setTopMovers] = useState([])
  
  const alerts = [
    { id: 1, type: 'CRITICAL', text: 'Lavazza Oro out of stock!' },
    { id: 2, type: 'MEDIUM', text: "Supplier 'Milano Dist' invoice due" }
  ]

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

      const { data: allOrders } = await supabase.from('orders').select('quantity, sku, products(srp, wholesale_price), channel_source')
      
      if (allOrders && Array.isArray(allOrders)) {
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
      }

      const { data: prods } = await supabase.from('products').select('sku, title, stock_available').order('srp', { ascending: false }).limit(3)
      if (prods && Array.isArray(prods)) {
        setTopMovers(prods)
      }
    } catch (err) {
      console.warn("Overview fetchData warning:", err)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      
      {/* Health Monitors */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HealthWidget label="Today's Sales" status="good" />
        <HealthWidget label="Stock Levels" status="warning" />
        <HealthWidget label="Packing Speed" status="good" />
        <HealthWidget label="AI Suggestions Waiting" status="good" />
      </div>

      {/* 🔀 Visual Operational Workflow DAG Graph */}
      <AdminVisualWorkflowGraph onNavigate={setSection} />

      {/* 🗺️ Interactive Process Flow Diagram & System Pipeline */}
      <AdminProcessFlowDiagram onNavigate={setSection} />

      {/* 💰 Master Metrics Financial Landed P&L Summary */}
      <div className="bg-[#0E121E] border border-white/20 rounded-2xl p-6 shadow-xl space-y-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-4">
          <div>
            <span className="text-xs font-mono font-black uppercase tracking-wider bg-gold text-navy px-3 py-1 rounded-full shadow-sm">
              Master Financial P&L Cockpit
            </span>
            <h2 className="font-sans text-2xl font-black text-white mt-2">Today's Landed Margin & Net Profit</h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/80 font-bold uppercase">Net Cash Margin</p>
            <p className="font-mono text-3xl font-black text-gold">31.5% <span className="text-sm font-bold text-white">(₱13,010)</span></p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm font-mono">
          <div className="bg-[#161B29] p-4 rounded-xl border border-white/15">
            <p className="text-gold text-xs uppercase font-extrabold">Gross Revenue</p>
            <p className="text-white text-xl font-black mt-1">₱41,260</p>
            <p className="text-white/80 text-xs mt-1 font-sans">Across all 4 channels</p>
          </div>

          <div className="bg-[#161B29] p-4 rounded-xl border border-white/15">
            <p className="text-gold text-xs uppercase font-extrabold">Italy Sourcing (€ FX)</p>
            <p className="text-crimson text-xl font-black mt-1">-₱21,400</p>
            <p className="text-white/80 text-xs mt-1 font-sans">51.8% Sourcing COGS</p>
          </div>

          <div className="bg-[#161B29] p-4 rounded-xl border border-white/15">
            <p className="text-gold text-xs uppercase font-extrabold">Air Freight & Duty</p>
            <p className="text-crimson text-xl font-black mt-1">-₱6,850</p>
            <p className="text-white/80 text-xs mt-1 font-sans">€14/kg + 12% Duty Tax</p>
          </div>

          <div className="bg-blue/20 p-4 rounded-xl border border-blue text-white shadow-md">
            <p className="text-blue text-xs uppercase font-black">Net Cash Profit</p>
            <p className="text-white text-xl font-black mt-1">+₱13,010</p>
            <p className="text-white/90 text-xs mt-1 font-sans font-bold">Clear Bank Cash Flow</p>
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
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span>🛬</span> Flight Box Arrival & Custody Feed
              </h3>
              <span className="text-xs font-mono text-white bg-blue px-2.5 py-1 rounded-full font-black shadow">Live Updates</span>
            </div>
            <div className="divide-y divide-white/10 font-sans text-xs p-1">
              <div className="p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white text-sm">🛬 Box MIL-BOX-092 Arrived NAIA Customs</span>
                  <span className="text-xs text-gold font-bold">Today, 01:10 AM</span>
                </div>
                <p className="text-white/90 text-xs font-medium">Custody claimed by <span className="text-gold font-black">Elena Guerrero (Makati Hub)</span> · 10 SKUs credited.</p>
              </div>

              <div className="p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white text-sm">✈️ Box MIL-BOX-104 Flight Departed (MXP)</span>
                  <span className="text-xs text-gold font-bold">Yesterday, 18:40 PM</span>
                </div>
                <p className="text-white/90 text-xs font-medium">Manifested by <span className="text-gold font-black">Marco Rossi (Milan)</span> · ETA Manila: 24-Jul-2026.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-[#0E121E] overflow-hidden text-white shadow-xl">
            <div className="border-b border-white/15 px-5 py-4 flex items-center justify-between bg-white/10">
              <h3 className="text-xs font-black uppercase tracking-wider text-gold">Recent VIP Orders</h3>
              <button onClick={() => setSection('wholesale')} className="text-xs font-extrabold text-blue hover:underline">View All</button>
            </div>
            <div className="divide-y divide-white/10">
              {recentVipOrders.length === 0 ? (
                <div className="p-5 text-xs text-white/60 font-semibold italic">No recent VIP orders.</div>
              ) : (
                recentVipOrders.map((vo, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/10 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-white">{vo.user}</p>
                      <p className="text-xs text-gold font-mono font-bold">{vo.id}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-black text-white">{peso(vo.amount)}</span>
                      <button onClick={() => setSection('kanban')} className="rounded-xl bg-blue px-3.5 py-1.5 text-xs font-black text-white hover:bg-blue-deep transition-colors shadow">Pack</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-[#0E121E] overflow-hidden text-white shadow-xl">
            <div className="border-b border-white/15 px-5 py-4 bg-white/10">
              <h3 className="text-xs font-black uppercase tracking-wider text-gold">Best Sellers (Last 24h)</h3>
            </div>
            <div className="divide-y divide-white/10 p-2">
              {topMovers.map((tm, i) => (
                <div key={tm.sku} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold text-navy font-black text-xs shadow">{i + 1}</div>
                  <div className="flex-1 truncate text-sm font-bold text-white">{tm.title}</div>
                  <div className="text-xs font-extrabold text-blue">High Velocity</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Operations */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-crimson/40 bg-[#0E121E] overflow-hidden shadow-xl">
            <div className="border-b border-crimson/30 px-5 py-4 flex items-center justify-between bg-crimson/20">
              <h3 className="text-xs font-black uppercase tracking-wider text-crimson">⚠️ Action Required Alerts</h3>
            </div>
            <div className="divide-y divide-white/10">
              {alerts.map(alert => (
                <div key={alert.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${alert.type === 'CRITICAL' ? 'bg-crimson pulse-dot' : 'bg-gold'}`} />
                  <p className="text-sm font-bold text-white">{alert.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-[#0E121E] overflow-hidden text-white shadow-xl">
            <div className="border-b border-white/15 px-5 py-4 flex items-center justify-between bg-white/10">
              <h3 className="text-xs font-black uppercase tracking-wider text-gold">Pending AI Products</h3>
              <span className="flex h-6 items-center justify-center rounded-full bg-gold px-3 text-xs font-black text-navy shadow">{draftsCount} Pending</span>
            </div>
            <div className="divide-y divide-white/10">
              <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/10 transition-colors">
                <span className="text-sm font-bold text-white">Baci Chocolates 200g</span>
                <button onClick={() => setSection('sourcing')} className="rounded-xl bg-blue hover:bg-blue-deep px-4 py-1.5 text-xs font-black text-white transition-all shadow">Review</button>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/10 transition-colors">
                <span className="text-sm font-bold text-white">Acqua Panna 1L</span>
                <button onClick={() => setSection('sourcing')} className="rounded-xl bg-blue hover:bg-blue-deep px-4 py-1.5 text-xs font-black text-white transition-all shadow">Review</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function HealthWidget({ label, status }) {
  const isGood = status === 'good'
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-[#0E121E] px-4 py-3.5 min-w-0 shadow-lg">
      <span className="text-xs font-bold text-white truncate pr-2 flex-1">{label}</span>
      <div className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-full ${isGood ? 'bg-blue/30' : 'bg-gold/30'}`}>
        <div className={`h-2.5 w-2.5 rounded-full ${isGood ? 'bg-blue shadow' : 'bg-gold shadow'}`} />
      </div>
    </div>
  )
}
