import { useState, useEffect } from 'react'
import { peso } from '../../data/products'
import { useStore } from '../../context/StoreContext'
import { channelMeta } from '../../lib/channelMeta'
import PackingSlipModal from './PackingSlipModal'
import StaffLoginModal from './StaffLoginModal'

const INITIAL_CARGO_BOXES = [
  {
    box_code: 'MIL-BOX-092',
    flight_num: 'AZ-772 (Malpensa MXP → MNL)',
    assigned_staff: 'Elena Guerrero',
    location: 'Makati Hub',
    status: 'Arrived at Manila Customs',
    items: [
      { sku: 'KIKO-3D-05', title: 'KIKO Milano 3D Lipgloss Shade 05', qty: 4, expiry: '2026-08-15' },
      { sku: 'MUL-PAN-500', title: 'Mulino Bianco Pan di Stelle 500g', qty: 6, expiry: '2026-10-30' }
    ]
  },
  {
    box_code: 'MIL-BOX-104',
    flight_num: 'AZ-772 (Malpensa MXP → MNL)',
    assigned_staff: 'Juan Dela Cruz',
    location: 'Quezon City Hub',
    status: 'Arrived at Manila Customs',
    items: [
      { sku: 'KIKO-3D-05', title: 'KIKO Milano 3D Lipgloss Shade 05', qty: 2, expiry: '2026-08-15' },
      { sku: 'LAV-ORO-250', title: 'Lavazza Qualità Oro Beans 250g', qty: 10, expiry: '2026-12-31' }
    ]
  },
  {
    box_code: 'MIL-BOX-110',
    flight_num: 'PR-439 (Milan → Manila)',
    assigned_staff: 'Maria Santos',
    location: 'Alabang Hub',
    status: 'In Flight Transit',
    items: [
      { sku: 'URB-TRUF-250', title: 'Urbani White Truffle Oil 250ml', qty: 5, expiry: '2027-02-15' }
    ]
  }
]

const MOCK_PICK_ORDERS = [
  {
    id: 'ORD-SHP-8821',
    channel: 'Shopee',
    channelColor: '#ee4d2d',
    customer: 'Juan Dela Cruz',
    assignedStaff: 'Elena Guerrero',
    items: [
      { sku: 'KIKO-3D-05', title: 'KIKO Milano 3D Lipgloss Shade 05', qty: 2, bin: 'Shelf A-02' },
      { sku: 'MUL-PAN-500', title: 'Mulino Bianco Pan di Stelle 500g', qty: 1, bin: 'Shelf B-11' }
    ],
    status: 'Ready to Pack',
    courier: 'J&T Express',
    tracking: 'JT991024881'
  },
  {
    id: 'ORD-LZD-4412',
    channel: 'Lazada',
    channelColor: '#0f146d',
    customer: 'Maria Santos',
    assignedStaff: 'Elena Guerrero',
    items: [
      { sku: 'MUL-PAN-500', title: 'Mulino Bianco Pan di Stelle 500g', qty: 3, bin: 'Shelf B-11' }
    ],
    status: 'Ready to Pack',
    courier: 'Lazada Logistics',
    tracking: 'LZD00192841'
  },
  {
    id: 'ORD-VIP-9901',
    channel: 'Website VIP',
    channelColor: '#D4AF37',
    customer: 'Boutique Caffe Manila',
    assignedStaff: 'Juan Dela Cruz',
    items: [
      { sku: 'LAV-ORO-250', title: 'Lavazza Qualità Oro Beans 250g', qty: 10, bin: 'Bulk Pallet 4' }
    ],
    status: 'Ready to Pack',
    courier: 'Lalamove Cargo',
    tracking: 'LLM-MNL-552'
  }
]

export default function OmniOperationsHub() {
  const { currentStaff, setStaffPinModalOpen } = useStore()
  
  const [activeRole, setActiveRole] = useState('manila_warehouse')
  const [activeStaff, setActiveStaff] = useState('Elena Guerrero')
  const [cargoBoxes, setCargoBoxes] = useState(() => {
    try {
      const saved = localStorage.getItem('k2_cargo_boxes')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [orders, setOrders] = useState([])
  const [scanBarcode, setScanBarcode] = useState('')
  const [scanMessage, setScanMessage] = useState(null)
  const [packedCount, setPackedCount] = useState(0)
  const [printSlipOrder, setPrintSlipOrder] = useState(null)
  const [showStaffPinModal, setShowStaffPinModal] = useState(false)

  useEffect(() => {
    if (!supabase) return;
    fetchLiveOrders()
  }, [])

  const fetchLiveOrders = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
      if (data && data.length > 0) {
        const formatted = data.map(o => ({
          id: o.id?.split('-')[0] || ('ORD-' + o.sku),
          channel: channelMeta(o.channel_source).label,
          channelColor: channelMeta(o.channel_source).color,
          customer: o.customer_name || 'Customer',
          assignedStaff: activeStaff,
          items: [{ sku: o.sku, title: o.sku, qty: o.quantity || 1, bin: 'Fulfillment Shelf' }],
          status: o.order_status || 'Ready to Pack',
          courier: 'J&T Express / Lalamove',
          tracking: 'TRK-' + String(o.id || Math.floor(Math.random() * 10000))
        }))
        setOrders(formatted)
        setPackedCount(formatted.filter(f => f.status.includes('Packed')).length)
      } else {
        setOrders([])
        setPackedCount(0)
      }
    } catch (e) {
      console.warn("OmniOperationsHub live order fetch warning:", e)
    }
  }

  const handleClaimBoxCustody = (boxCode) => {
    setCargoBoxes(prev => prev.map(b => {
      if (b.box_code === boxCode) {
        return {
          ...b,
          assigned_staff: activeStaff,
          status: `Claimed by ${activeStaff} ✓`
        }
      }
      return b
    }))
    alert(`✓ Box [${boxCode}] custody claimed by ${activeStaff}! SKUs transferred to ${activeStaff}'s local warehouse inventory balance.`)
  }

  const handleReassignBoxStaff = (boxCode, newStaff) => {
    setCargoBoxes(prev => prev.map(b => {
      if (b.box_code === boxCode) {
        return { ...b, assigned_staff: newStaff }
      }
      return b
    }))
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
      <div className="bg-[#18181b] border border-white/20 p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono font-bold uppercase tracking-wider bg-gold text-navy px-3 py-1 rounded-full shadow-sm">
              Staff Operations & Cargo Box Handover Hub
            </span>
            <span className="text-sm text-neutral-300 font-medium">Multi-Staff Custody & Italy Cargo Box Allocation</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-white mt-1">Staff operations & box handover</h1>
          <p className="text-sm text-neutral-300 font-medium mt-1 max-w-2xl">
            Each staff member receives specific Italy shipment boxes containing assigned SKUs. Staff can only ship orders out of their claimed box custody.
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
            className="w-full bg-[#18181b] border border-gold text-sm font-bold text-white rounded-lg px-3 py-2 outline-none"
          >
            <option value="Elena Guerrero">👤 Elena Guerrero (Makati Hub)</option>
            <option value="Juan Dela Cruz">👤 Juan Dela Cruz (Quezon City Hub)</option>
            <option value="Marco Rossi">🇮🇹 Marco Rossi (Milan Sourcing Lead)</option>
          </select>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex overflow-x-auto max-w-full bg-[#18181b] border border-white/20 p-2 rounded-xl text-sm font-bold scrollbar-none gap-2">
        <button
          onClick={() => setActiveRole('manila_warehouse')}
          className={`px-5 py-3 min-h-[44px] rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeRole === 'manila_warehouse' ? 'bg-blue text-white font-bold shadow-md' : 'text-neutral-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          📦 {activeStaff}'s Order Pack & Ship Queue
        </button>
        <button
          onClick={() => setActiveRole('box_handover')}
          className={`px-5 py-3 min-h-[44px] rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeRole === 'box_handover' ? 'bg-gold text-navy font-bold shadow-md' : 'text-neutral-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          🛬 Italy Cargo Box Handover ({staffBoxes.length} Boxes)
        </button>
        <button
          onClick={() => setActiveRole('inter_staff_transfer')}
          className={`px-5 py-3 min-h-[44px] rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeRole === 'inter_staff_transfer' ? 'bg-blue text-white font-bold shadow-md' : 'text-neutral-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          ⚡ 1-Click Inter-Staff Transfer
        </button>
      </div>

      {/* MODE 1: STAFF SPECIFIC ORDER PACKING & SCAN-TO-SHIP */}
      {activeRole === 'manila_warehouse' && (
        <div className="space-y-6">
          
          {/* Barcode Verification Scanner Header */}
          <div className="bg-[#18181b] border border-white/20 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📦</span>
                <div>
                  <h3 className="text-lg font-bold text-white">{activeStaff}'s Pack-to-Ship Verification Station</h3>
                  <p className="text-sm text-neutral-300 font-medium">Point barcode scanner to verify item before sealing polybag</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm font-mono">
                <span className="text-neutral-300 font-bold">Shift Packed:</span>
                <span className="text-white font-bold text-base bg-blue px-3.5 py-1.5 rounded-xl border border-blue/50 shadow">{packedCount} orders</span>
              </div>
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

          {/* Orders Queue for Active Staff Member */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-gold">
              {activeStaff}'s Assigned Shipping Queue
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {orders.map(ord => (
                <div key={ord.id} className="bg-[#18181b] border border-white/20 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between hover:border-gold/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span 
                        className="text-sm font-bold text-white px-3 py-1 rounded-lg shadow"
                        style={{ backgroundColor: ord.channelColor }}
                      >
                        {ord.channel}
                      </span>
                      <span className="text-sm font-mono text-gold font-bold">{ord.id}</span>
                    </div>

                    <p className="text-lg font-bold text-white">{ord.customer}</p>
                    <p className="text-sm text-neutral-300 font-mono mt-1 font-semibold">{ord.courier} · {ord.tracking}</p>

                    <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                      <p className="text-sm font-extrabold uppercase tracking-wider text-gold">Pick Items from {activeStaff}'s Custody Stock:</p>
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/10 text-sm font-bold">
                          <div>
                            <p className="font-bold text-white text-base">{it.title}</p>
                            <p className="text-sm text-gold font-mono">{it.bin}</p>
                          </div>
                          <span className="text-white font-bold bg-blue px-2.5 py-1 rounded-lg shadow">x{it.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className={`text-sm font-bold px-3 py-1 rounded-lg shadow ${
                      ord.status.includes('Packed') ? 'bg-blue text-white border border-blue' : 'bg-gold text-navy border border-gold'
                    }`}>
                      {ord.status}
                    </span>

                    <button
                      onClick={() => setPrintSlipOrder(ord)}
                      className="bg-blue hover:bg-blue-deep text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 min-h-[40px]"
                    >
                      🖨️ Print Shipping Slip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* MODE 2: ITALY CARGO BOX HANDOVER & STAFF CUSTODY TRANSFER */}
      {activeRole === 'box_handover' && (
        <div className="space-y-6">
          
          <div className="bg-[#18181b] border border-white/20 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-sm font-mono font-bold uppercase tracking-wider bg-gold text-navy px-3 py-1 rounded-full shadow-sm">
                  NAIA Cargo Box Handover & Custody Claim
                </span>
                <h2 className="font-serif text-2xl font-bold text-white mt-2">Italy box arrivals & staff handover</h2>
                <p className="text-sm text-neutral-300 font-medium mt-1">Transfer specific flight boxes to staff members and claim SKU custody into local hubs.</p>
              </div>

              <span className="text-sm font-bold text-white">Active Custodian: <strong className="text-gold font-extrabold text-base">{activeStaff}</strong></span>
            </div>

            {/* Cargo Box Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {cargoBoxes.map((box) => {
                const isAssignedToActive = box.assigned_staff === activeStaff
                const isClaimed = box.status.includes('Claimed')

                return (
                  <div
                    key={box.box_code}
                    className={`p-5 rounded-2xl border transition-all space-y-4 ${
                      isAssignedToActive ? 'bg-[#27272a] border-gold shadow-xl' : 'bg-[#18181b] border-white/10 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-bold text-gold bg-black/60 px-3 py-1 rounded-lg border border-gold">
                        {box.box_code}
                      </span>
                      <span className="text-sm font-mono text-neutral-300 font-bold">{box.flight_num}</span>
                    </div>

                    <div>
                      <label className="block text-sm font-extrabold uppercase text-gold mb-1">Assigned Staff Custodian:</label>
                      <select
                        value={box.assigned_staff}
                        onChange={(e) => handleReassignBoxStaff(box.box_code, e.target.value)}
                        className="w-full bg-[#18181b] border border-white/20 text-sm font-bold text-white rounded-lg px-3 py-2 outline-none focus:border-gold"
                      >
                        <option value="Elena Guerrero">Elena Guerrero (Makati Hub)</option>
                        <option value="Juan Dela Cruz">Juan Dela Cruz (Quezon City Hub)</option>
                        <option value="Maria Santos">Maria Santos (Alabang Hub)</option>
                      </select>
                    </div>

                    {/* Box SKUs Contents */}
                    <div className="bg-white/10 border border-white/10 p-3.5 rounded-xl space-y-2 text-sm font-bold">
                      <p className="text-sm text-gold uppercase font-extrabold">Box SKU Breakdown:</p>
                      {box.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-white">
                          <span>{it.title}</span>
                          <span className="text-gold font-bold">x{it.qty} pcs</span>
                        </div>
                      ))}
                    </div>

                    {/* Handover Claim Action */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className={`text-sm font-bold px-3 py-1 rounded-lg shadow ${
                        isClaimed ? 'bg-blue text-white border border-blue' : 'bg-gold text-navy border border-gold'
                      }`}>
                        {box.status}
                      </span>

                      {!isClaimed && isAssignedToActive && (
                        <button
                          onClick={() => handleClaimBoxCustody(box.box_code)}
                          className="bg-gold hover:bg-gold-deep text-navy font-bold text-sm px-4 py-2 rounded-xl shadow-md transition-all"
                        >
                          ⚡ Claim Custody Stock
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

          </div>

        </div>
      )}

      {/* MODE 3: 1-CLICK INTER-STAFF STOCK TRANSFER STATION */}
      {activeRole === 'inter_staff_transfer' && (
        <div className="bg-[#18181b] border border-white/20 p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="text-sm font-mono font-bold uppercase tracking-wider bg-gold text-navy px-3 py-1 rounded-full shadow-sm">
                Inter-Staff Custody Re-allocation
              </span>
              <h2 className="font-serif text-2xl font-bold text-white mt-2">Transfer stock between staff</h2>
              <p className="text-sm text-neutral-300 font-medium mt-1">Transfer SKU inventory between staff members instantly with one click.</p>
            </div>

            <span className="text-sm font-bold text-blue">Audit Trail Logged</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { sku: 'KIKO-3D-05', title: 'KIKO Milano 3D Lipgloss Shade 05', from: 'Juan Dela Cruz (4 units)', to: 'Elena Guerrero (0 units)', defaultQty: 2 },
              { sku: 'MUL-PAN-500', title: 'Mulino Bianco Pan di Stelle 500g', from: 'Elena Guerrero (6 units)', to: 'Maria Santos (0 units)', defaultQty: 3 },
              { sku: 'LAV-ORO-250', title: 'Lavazza Qualità Oro Beans 250g', from: 'Juan Dela Cruz (10 units)', to: 'Elena Guerrero (1 unit)', defaultQty: 5 }
            ].map((trf, idx) => (
              <div key={idx} className="bg-[#27272a] border border-white/20 p-5 rounded-2xl space-y-4 shadow-md">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono font-bold text-gold bg-black/60 px-3 py-1 rounded-lg border border-gold">{trf.sku}</span>
                  <span className="text-sm font-bold text-neutral-300">Instant 1-Click</span>
                </div>

                <h3 className="text-lg font-bold text-white">{trf.title}</h3>
                
                <div className="space-y-1 text-sm font-bold text-neutral-200 bg-white/10 p-3.5 rounded-xl border border-white/10">
                  <p>FROM: <strong className="text-crimson font-bold">{trf.from}</strong></p>
                  <p>TO: <strong className="text-gold font-bold">{trf.to}</strong></p>
                </div>

                <button
                  onClick={() => alert(`⚡ 1-Click Transfer Success! Transferred ${trf.defaultQty} units of ${trf.sku} to ${trf.to.split(' ')[0]}!`)}
                  className="w-full bg-blue hover:bg-blue-deep text-white font-bold text-sm py-3 rounded-xl shadow-lg transition-all"
                >
                  ⚡ Transfer {trf.defaultQty} Units in 1-Click
                </button>
              </div>
            ))}
          </div>
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
