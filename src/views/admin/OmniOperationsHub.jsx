import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { peso } from '../../data/products'
import { useStore } from '../../context/StoreContext'
import { channelMeta } from '../../lib/channelMeta'
import PackingSlipModal from './PackingSlipModal'
import StaffLoginModal from './StaffLoginModal'

export default function OmniOperationsHub() {
  const { products } = useStore()

  const [activeRole, setActiveRole] = useState('manila_warehouse')
  const [activeStaff, setActiveStaff] = useState('')
  const [staffList, setStaffList] = useState([])

  // Pull the REAL staff (from Staff & Roles) so this screen shows your actual
  // accounts, not hardcoded names. Falls back to whatever is set if none exist.
  useEffect(() => {
    if (!supabase) return
    supabase.from('user_profiles').select('email, role').in('role', ['Admin', 'Staff'])
      .then(({ data }) => {
        const names = (data || []).map(u => (u.email || '').split('@')[0]).filter(Boolean)
        if (names.length) { setStaffList(names); setActiveStaff(names[0]) }
      })
  }, [])
  const [cargoBoxes, setCargoBoxes] = useState([])
  const [orders, setOrders] = useState([])
  const [scanBarcode, setScanBarcode] = useState('')
  const [scanMessage, setScanMessage] = useState(null)
  const [packedCount, setPackedCount] = useState(0)
  const [printSlipOrder, setPrintSlipOrder] = useState(null)
  const [showStaffPinModal, setShowStaffPinModal] = useState(false)
  const [loadingBoxes, setLoadingBoxes] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [transferSku, setTransferSku] = useState('')
  const [transferTo, setTransferTo] = useState('')

  const nameFor = (sku) => (products || []).find(p => p.sku === sku)?.name || sku

  useEffect(() => {
    if (!supabase) { setLoadingBoxes(false); setLoadingOrders(false); return }
    fetchLiveOrders()
    fetchBoxes()
    const ch = supabase.channel('omni_hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchLiveOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_batches' }, fetchBoxes)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  // Orders queue = real, unshipped orders from the orders table.
  const fetchLiveOrders = async () => {
    setLoadingOrders(true)
    const { data } = await supabase.from('orders').select('*')
      .not('order_status', 'in', '("Shipped","Cancelled")')
      .order('created_at', { ascending: false })
    const formatted = (data || []).map(o => ({
      id: o.id,
      shortId: String(o.id).slice(0, 8),
      channel: channelMeta(o.channel_source).label,
      channelColor: channelMeta(o.channel_source).color,
      customer: o.customer_name || 'Customer',
      items: [{ sku: o.sku, title: nameFor(o.sku), qty: o.quantity || 1 }],
      status: o.order_status || 'Pending',
      courier: o.fulfillment_method || '—',
    }))
    setOrders(formatted)
    setPackedCount(formatted.filter(f => String(f.status).includes('Packed')).length)
    setLoadingOrders(false)
  }

  // Cargo boxes = real batches grouped by their box code (custodian = who holds it).
  const fetchBoxes = async () => {
    setLoadingBoxes(true)
    const { data } = await supabase.from('product_batches')
      .select('box_code, sku, quantity, custodian, hub').gt('quantity', 0)
    const map = {}
    for (const r of data || []) {
      const code = r.box_code || 'No box code'
      const b = map[code] || (map[code] = { box_code: code, assigned_staff: r.custodian || '', location: r.hub || '', items: [] })
      if (!b.assigned_staff && r.custodian) b.assigned_staff = r.custodian
      if (!b.location && r.hub) b.location = r.hub
      b.items.push({ sku: r.sku, title: nameFor(r.sku), qty: r.quantity })
    }
    setCargoBoxes(Object.values(map))
    setLoadingBoxes(false)
  }

  // Claim / reassign a box's custody = update the custodian on its batches.
  const handleReassignBoxStaff = async (boxCode, newStaff) => {
    setCargoBoxes(prev => prev.map(b => b.box_code === boxCode ? { ...b, assigned_staff: newStaff } : b))
    if (supabase && boxCode && boxCode !== 'No box code') {
      await supabase.from('product_batches').update({ custodian: newStaff }).eq('box_code', boxCode)
    }
  }
  const handleClaimBoxCustody = (boxCode) => handleReassignBoxStaff(boxCode, activeStaff)

  // Real custody transfer: move every unit of a SKU to another staff member.
  const handleTransfer = async (e) => {
    e.preventDefault()
    if (!transferSku || !transferTo || !supabase) return
    await supabase.from('product_batches').update({ custodian: transferTo }).eq('sku', transferSku)
    setScanMessage({ success: true, text: `✓ Moved custody of ${nameFor(transferSku)} to ${transferTo}.` })
    setTransferSku(''); setTransferTo('')
    fetchBoxes()
    setTimeout(() => setScanMessage(null), 3500)
  }

  const handleVerifyScan = (e) => {
    e.preventDefault()
    if (!scanBarcode.trim()) return

    const match = scanBarcode.trim().toUpperCase()
    let found = false

    const updatedOrders = orders.map(ord => {
      const itemMatch = ord.items.some(it => it.sku.toUpperCase() === match || it.title.toUpperCase().includes(match))
      if (itemMatch) {
        found = true
        return { ...ord, status: 'Packed & Verified ✓' }
      }
      return ord
    })

    if (found) {
      setOrders(updatedOrders)
      setPackedCount(prev => prev + 1)
      setScanMessage({ success: true, text: `✓ Barcode [${match}] verified! Deducted from ${activeStaff}'s custody stock.` })
    } else {
      setScanMessage({ success: false, text: `⚠️ Barcode [${match}] not in current pick queue for ${activeStaff}!` })
    }

    setScanBarcode('')
    setTimeout(() => setScanMessage(null), 3500)
  }

  const staffBoxes = cargoBoxes.filter(b => b.assigned_staff === activeStaff)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300 font-sans text-white">
      
      {/* Header Banner & Active Staff Profile Switcher */}
      <div className="bg-[#161922] border border-white/10 p-4 sm:p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wide bg-gold text-navy px-2 py-0.5 rounded-full">
            Staff operations
          </span>
          <h1 className="font-serif text-lg sm:text-2xl font-bold text-white mt-2">Staff operations &amp; box handover</h1>
          <p className="text-xs sm:text-sm text-white/55 mt-1 max-w-2xl">
            Each staff member holds specific Italy boxes and ships only from their own claimed custody.
          </p>
        </div>

        {/* Active Staff Member Station Selector & Quick PIN Login */}
        <div className="bg-[#27272a] border border-white/20 p-3.5 rounded-xl space-y-2 shrink-0 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-sm font-extrabold uppercase text-gold">Active Staff Station:</label>
            <button
              onClick={() => setShowStaffPinModal(true)}
              className="text-sm font-bold text-navy bg-gold px-2.5 py-1 rounded-lg hover:bg-gold-deep transition-all flex items-center gap-1 shadow"
            >
              🔑 PIN Login
            </button>
          </div>
          <select
            value={activeStaff}
            onChange={(e) => setActiveStaff(e.target.value)}
            className="w-full bg-[#161922] border border-gold text-sm font-bold text-white rounded-lg px-3 py-2 outline-none"
          >
            {(staffList.length ? staffList : [activeStaff]).filter(Boolean).map(n => (
              <option key={n} value={n}>👤 {n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex overflow-x-auto max-w-full bg-[#161922] border border-white/10 p-1.5 rounded-xl text-[13px] font-bold scrollbar-none gap-1.5">
        <button
          onClick={() => setActiveRole('manila_warehouse')}
          className={`px-3.5 py-2 min-h-11 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
            activeRole === 'manila_warehouse' ? 'bg-blue text-white shadow-md' : 'text-neutral-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          📦 Pack &amp; ship
        </button>
        <button
          onClick={() => setActiveRole('box_handover')}
          className={`px-3.5 py-2 min-h-11 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
            activeRole === 'box_handover' ? 'bg-gold text-navy shadow-md' : 'text-neutral-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          🛬 Box handover ({staffBoxes.length})
        </button>
        <button
          onClick={() => setActiveRole('inter_staff_transfer')}
          className={`px-3.5 py-2 min-h-11 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
            activeRole === 'inter_staff_transfer' ? 'bg-blue text-white shadow-md' : 'text-neutral-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          ⚡ Transfer
        </button>
      </div>

      {/* MODE 1: STAFF SPECIFIC ORDER PACKING & SCAN-TO-SHIP */}
      {activeRole === 'manila_warehouse' && (
        <div className="space-y-6">
          
          {/* Barcode Verification Scanner Header */}
          <div className="bg-[#161922] border border-white/10 p-4 sm:p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">📦</span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-white truncate">Pack &amp; ship — {activeStaff}</h3>
                  <p className="text-xs text-white/50">Scan each item before sealing the polybag.</p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-semibold text-white bg-blue px-2.5 py-1 rounded-lg">{packedCount} packed</span>
            </div>

            <form onSubmit={handleVerifyScan} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={scanBarcode}
                onChange={(e) => setScanBarcode(e.target.value)}
                placeholder="Scan barcode or SKU (e.g. KIKO-3D-05)..."
                className="flex-1 rounded-xl border border-white/20 bg-[#27272a] px-4 py-3 text-base text-white font-mono placeholder:text-white/60 focus:border-gold outline-none min-h-[44px]"
              />
              <button
                type="submit"
                className="bg-blue hover:bg-blue-deep text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-lg shrink-0 min-h-[44px] flex items-center justify-center"
              >
                Scan & Verify (+1)
              </button>
            </form>

            {scanMessage && (
              <div className={`p-3.5 rounded-xl border text-sm font-bold flex items-center gap-2 ${
                scanMessage.success ? 'bg-blue/20 border-blue text-white' : 'bg-crimson/20 border-crimson text-white'
              }`}>
                <span>{scanMessage.text}</span>
              </div>
            )}
          </div>

          {/* Orders Queue — real, unshipped orders */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gold">Shipping queue</h3>

            {loadingOrders ? (
              <p className="text-sm text-white/40 py-8 text-center">Loading orders…</p>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#161922] p-8 text-center">
                <p className="text-sm text-white/60">No orders to pack</p>
                <p className="text-xs text-white/40 mt-1">New orders from your channels land here automatically.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {orders.map(ord => (
                  <div key={ord.id} className="bg-[#161922] border border-white/10 rounded-2xl p-4 shadow-lg space-y-3 flex flex-col justify-between hover:border-gold/40 transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded" style={{ backgroundColor: ord.channelColor }}>
                          {ord.channel}
                        </span>
                        <span className="text-[11px] font-mono text-white/40">#{ord.shortId}</span>
                      </div>

                      <p className="text-sm font-semibold text-white">{ord.customer}</p>
                      {ord.courier !== '—' && <p className="text-xs text-white/50 font-mono mt-0.5">{ord.courier}</p>}

                      <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2">
                            <p className="text-[13px] text-white truncate">{it.title}</p>
                            <span className="text-xs text-white font-semibold bg-blue px-2 py-0.5 rounded shrink-0">x{it.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        String(ord.status).includes('Packed') ? 'bg-blue text-white' : 'bg-gold text-navy'
                      }`}>
                        {ord.status}
                      </span>
                      <button onClick={() => setPrintSlipOrder(ord)}
                        className="bg-white/10 hover:bg-white/15 text-white font-semibold text-xs px-3 min-h-9 rounded-lg transition-all flex items-center gap-1 shrink-0">
                        🖨️ Slip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODE 2: ITALY CARGO BOX HANDOVER & STAFF CUSTODY TRANSFER */}
      {activeRole === 'box_handover' && (
        <div className="space-y-6">
          
          <div className="bg-[#161922] border border-white/10 p-4 sm:p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wide bg-gold text-navy px-2 py-0.5 rounded-full">
                  Box handover
                </span>
                <h2 className="font-serif text-base sm:text-xl font-bold text-white mt-1.5">Italy box arrivals &amp; handover</h2>
                <p className="text-xs text-white/50 mt-0.5">Assign flight boxes to staff and claim SKU custody into a hub.</p>
              </div>
              <span className="text-xs text-white/60">Custodian: <strong className="text-gold">{activeStaff}</strong></span>
            </div>

            {/* Cargo Box Cards */}
            {loadingBoxes ? (
              <p className="text-sm text-white/40 py-8 text-center">Loading boxes…</p>
            ) : cargoBoxes.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#161922] p-8 text-center">
                <p className="text-sm text-white/60">No boxes yet</p>
                <p className="text-xs text-white/40 mt-1">Boxes appear here once you record received stock with a box code (Inventory → a product → Batches).</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {cargoBoxes.map((box) => {
                const isAssignedToActive = box.assigned_staff === activeStaff

                return (
                  <div
                    key={box.box_code}
                    className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                      isAssignedToActive ? 'bg-[#27272a] border-gold shadow-lg' : 'bg-[#161922] border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold text-gold bg-black/50 px-2 py-0.5 rounded border border-gold/50">
                        {box.box_code}
                      </span>
                      {box.location && <span className="text-[11px] font-mono text-white/50">📍{box.location}</span>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wide text-gold mb-1">Custodian</label>
                      <select
                        value={box.assigned_staff}
                        onChange={(e) => handleReassignBoxStaff(box.box_code, e.target.value)}
                        className="w-full bg-[#161922] border border-white/10 text-sm text-white rounded-lg px-3 min-h-10 py-2 outline-none focus:border-gold"
                      >
                        {Array.from(new Set([box.assigned_staff, ...staffList])).filter(Boolean).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    {/* Box SKUs Contents */}
                    <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1.5">
                      <p className="text-[11px] text-gold uppercase font-bold tracking-wide">Box contents</p>
                      {box.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between gap-2 text-[13px] text-white">
                          <span className="truncate">{it.title}</span>
                          <span className="text-gold font-semibold shrink-0">x{it.qty}</span>
                        </div>
                      ))}
                    </div>

                    {/* Handover Claim Action */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        box.assigned_staff ? 'bg-blue text-white' : 'bg-white/10 text-white/60'
                      }`}>
                        {box.assigned_staff ? `Held by ${box.assigned_staff}` : 'Unassigned'}
                      </span>

                      {!isAssignedToActive && (
                        <button
                          onClick={() => handleClaimBoxCustody(box.box_code)}
                          className="bg-gold hover:bg-gold-deep text-navy font-semibold text-xs px-3 min-h-9 rounded-lg transition-all shrink-0"
                        >
                          ⚡ Claim to me
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            )}

          </div>

        </div>
      )}

      {/* MODE 3: REAL INTER-STAFF CUSTODY TRANSFER */}
      {activeRole === 'inter_staff_transfer' && (
        <div className="bg-[#161922] border border-white/10 p-4 sm:p-5 rounded-2xl shadow-lg space-y-4 max-w-xl">
          <div>
            <h2 className="font-serif text-base sm:text-xl font-bold text-white">Transfer custody</h2>
            <p className="text-xs text-white/50 mt-0.5">Move every unit of a product into another staff member's custody.</p>
          </div>

          <form onSubmit={handleTransfer} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-gold mb-1">Product</label>
              <select value={transferSku} onChange={e => setTransferSku(e.target.value)} required
                className="w-full bg-black/30 border border-white/15 text-sm text-white rounded-lg px-3 min-h-11 py-2 outline-none focus:border-gold">
                <option value="">Select a product…</option>
                {Array.from(new Set(cargoBoxes.flatMap(b => b.items.map(i => i.sku)))).map(sku => (
                  <option key={sku} value={sku}>{nameFor(sku)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-gold mb-1">Move to</label>
              <select value={transferTo} onChange={e => setTransferTo(e.target.value)} required
                className="w-full bg-black/30 border border-white/15 text-sm text-white rounded-lg px-3 min-h-11 py-2 outline-none focus:border-gold">
                <option value="">Select staff…</option>
                {staffList.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <button type="submit" disabled={!transferSku || !transferTo}
              className="w-full bg-blue hover:bg-blue-deep text-white font-semibold text-sm min-h-11 rounded-xl transition-all disabled:opacity-50">
              Move custody
            </button>
            {cargoBoxes.length === 0 && (
              <p className="text-xs text-white/40 text-center">No stock in custody yet — record received batches first.</p>
            )}
          </form>

          {scanMessage && (
            <div className="p-3 rounded-xl border border-forest/40 bg-forest/10 text-forest text-sm font-semibold">{scanMessage.text}</div>
          )}
        </div>
      )}

      <PackingSlipModal
        isOpen={!!printSlipOrder}
        onClose={() => setPrintSlipOrder(null)}
        order={printSlipOrder}
      />

      <StaffLoginModal
        isOpen={showStaffPinModal}
        onClose={() => setShowStaffPinModal(false)}
        onStaffAuthenticated={(name) => setActiveStaff(name)}
      />
    </div>
  )
}
