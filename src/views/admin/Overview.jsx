import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { peso } from '../../data/products'

export default function Overview({ setSection }) {
  const [salesToday, setSalesToday] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [draftsCount, setDraftsCount] = useState(2) // Mocking AI drafts queue
  
  const [recentVipOrders, setRecentVipOrders] = useState([])
  const [topMovers, setTopMovers] = useState([])
  
  // Fake alerts for the wireframe effect
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
    // 1. Pending Orders
    const { count: pCount } = await supabase.from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('order_status', 'Pending')
    if (pCount !== null) setPendingOrders(pCount)

    // 2. Low Stock Count
    const { count: lCount } = await supabase.from('products')
      .select('*', { count: 'exact', head: true })
      .lte('stock_available', 5)
    if (lCount !== null) setLowStockCount(lCount)

    // 3. Fake "Today's Sales" (calculating real revenue requires join, we'll mock a calculation for the demo based on orders)
    const { data: allOrders } = await supabase.from('orders').select('quantity, sku, products(retail_price, vip_price), channel_source')
    
    if (allOrders) {
      let revenue = 0
      let vipRecents = []
      
      allOrders.forEach(o => {
        const price = o.channel_source === 'website_vip' ? o.products?.vip_price : o.products?.retail_price
        if (price) revenue += (price * o.quantity)

        if (o.channel_source === 'website_vip') {
          vipRecents.push({
            id: o.sku,
            user: 'VIP Customer', // Ideally join with user_profiles
            amount: price * o.quantity
          })
        }
      })
      setSalesToday(revenue)
      setRecentVipOrders(vipRecents.slice(0, 5))
    }

    // 4. Top Movers (Mocked logic for speed: just show products with highest retail price for now, ideally group by orders)
    const { data: prods } = await supabase.from('products').select('sku, title, total_stock').order('srp', { ascending: false }).limit(3)
    if (prods) {
      setTopMovers(prods)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Health Monitors */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HealthWidget label="Today's Sales" status="good" />
        <HealthWidget label="Stock Levels" status="warning" />
        <HealthWidget label="Packing Speed" status="good" />
        <HealthWidget label="AI Suggestions Waiting" status="good" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* Left Column - Commerce */}
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-[#05080f] overflow-hidden">
            <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between bg-white/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Recent VIP Orders</h3>
              <button onClick={() => setSection('wholesale')} className="text-xs text-blue hover:text-blue/80 transition-colors">View All</button>
            </div>
            <div className="divide-y divide-white/5">
              {recentVipOrders.length === 0 ? (
                <div className="p-5 text-sm text-white/30 italic">No recent VIP orders.</div>
              ) : (
                recentVipOrders.map((vo, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white/90">{vo.user}</p>
                      <p className="text-xs text-white/40">{vo.id}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm text-forest">{peso}{vo.amount.toLocaleString()}</span>
                      <button onClick={() => setSection('overview')} className="rounded bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20 transition-colors">Pack</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#05080f] overflow-hidden">
            <div className="border-b border-white/10 px-5 py-3 bg-white/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Best Sellers (Last 24h)</h3>
            </div>
            <div className="divide-y divide-white/5 p-2">
              {topMovers.map((tm, i) => (
                <div key={tm.sku} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-xs font-bold text-white/50">{i + 1}</div>
                  <div className="flex-1 truncate text-sm font-medium text-white/80">{tm.title}</div>
                  <div className="text-xs text-forest">High velocity</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Operations */}
        <div className="space-y-6">
          <div className="rounded-xl border border-crimson/20 bg-crimson/5 overflow-hidden">
            <div className="border-b border-crimson/20 px-5 py-3 flex items-center justify-between bg-crimson/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-crimson">Needs Attention!</h3>
            </div>
            <div className="divide-y divide-crimson/10">
              {alerts.map(alert => (
                <div key={alert.id} className="flex items-start gap-3 px-5 py-3">
                  <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${alert.type === 'CRITICAL' ? 'bg-crimson pulse-dot' : 'bg-amber'}`} />
                  <p className="text-sm text-white/80">{alert.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#05080f] overflow-hidden">
            <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between bg-white/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Pending AI Products</h3>
              <span className="flex h-5 items-center justify-center rounded bg-blue/20 px-2 text-[10px] font-bold text-blue">{draftsCount} Pending</span>
            </div>
            <div className="divide-y divide-white/5">
              <div className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors">
                <span className="text-sm text-white/80">Baci Chocolates 200g</span>
                <button onClick={() => setSection('sourcing')} className="rounded bg-blue/20 px-3 py-1 text-xs font-medium text-blue hover:bg-blue/30 transition-colors">Review</button>
              </div>
              <div className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors">
                <span className="text-sm text-white/80">Acqua Panna 1L</span>
                <button onClick={() => setSection('sourcing')} className="rounded bg-blue/20 px-3 py-1 text-xs font-medium text-blue hover:bg-blue/30 transition-colors">Review</button>
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
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#05080f] px-4 py-3 min-w-0">
      <span className="text-xs font-medium text-white/60 truncate pr-2 flex-1">{label}</span>
      <div className={`shrink-0 flex h-4 w-4 items-center justify-center rounded-full ${isGood ? 'bg-forest/20' : 'bg-amber/20'}`}>
        <div className={`h-2 w-2 rounded-full ${isGood ? 'bg-forest' : 'bg-amber'}`} />
      </div>
    </div>
  )
}
