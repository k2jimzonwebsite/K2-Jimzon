import { useState, useEffect } from 'react'
import { peso } from '../../data/products'
import { useStore } from '../../context/StoreContext'
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
      { sku: 'MUL-PAN-500', title: 'Mulino Bianco Pan di Stelle 500g', qty: 1, bin: 'Shelf B-14' }
    ],
    status: 'Ready to Pick',
    courier: 'J&T Express',
    tracking: 'JT9921400291'
  },
  {
    id: 'ORD-LAZ-4920',
    channel: 'Lazada',
    channelColor: '#0f146d',
    customer: 'Sofia Gonzalez',
    assignedStaff: 'Juan Dela Cruz',
    items: [
      { sku: 'LAV-ORO-250', title: 'Lavazza Qualità Oro Beans 250g', qty: 3, bin: 'Shelf C-05' }
    ],
    status: 'Ready to Pick',
    courier: 'Lazada Express (LEX)',
    tracking: 'LEXPH8829104'
  }
]

export default function OmniOperationsHub() {
  const [activeRole, setActiveRole] = useState('manila_warehouse') // 'manila_warehouse' | 'box_handover' | 'milan_buyer'
  const [activeStaff, setActiveStaff] = useState('Elena Guerrero')
  const [cargoBoxes, setCargoBoxes] = useState(() => {
    const saved = localStorage.getItem('k2_cargo_boxes')
    return saved ? JSON.parse(saved) : INITIAL_CARGO_BOXES
  })
  const [orders, setOrders] = useState(MOCK_PICK_ORDERS)
  const [scanBarcode, setScanBarcode] = useState('')
  const [scanMessage, setScanMessage] = useState(null)
  const [printSlipOrder, setPrintSlipOrder] = useState(null)
  const [showStaffPinModal, setShowStaffPinModal] = useState(false)
  const [packedCount, setPackedCount] = useState(14)

  useEffect(() => {
    localStorage.setItem('k2_cargo_boxes', JSON.stringify(cargoBoxes))
  }, [cargoBoxes])

  // Handle Box Re-assignment to another staff member
  const handleReassignBoxStaff = (boxCode, newStaffName) => {
    setCargoBoxes(prev => prev.map(b => b.box_code === boxCode ? { ...b, assigned_staff: newStaffName } : b))
  }

  // Handle Unpacking Cargo Box & Claiming Custody
  const handleClaimBoxCustody = (boxCode) => {
    setCargoBoxes(prev => prev.map(b => {
      if (b.box_code === boxCode) {
        return { ...b, status: `Unpacked & Claimed by ${b.assigned_staff} ✓` }
      }
      return b
    }))
    setScanMessage({
      success: true,
      text: `✓ Box ${boxCode} unpacked! SKU items officially credited into ${activeStaff}'s personal custody stock.`
    })
    setTimeout(() => setScanMessage(null), 4000)
  }

  // Barcode Verification Simulator
  const handleVerifyScan = (e) => {
    e.preventDefault()
    if (!scanBarcode) return

    const match = scanBarcode.trim().toUpperCase()
    let found = false

    const updatedOrders = orders.map(ord => {
      const itemMatch = ord.items.find(i => i.sku.toUpperCase() === match || match.includes(i.sku.toUpperCase()))
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* Header Banner & Active Staff Profile Switcher */}
      <div className="bg-[#05080f] border border-white/10 p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-forest/20 text-forest px-2 py-0.5 rounded border border-forest/30">
              Staff Operations & Cargo Box Handover Hub
            </span>
            <span className="text-xs text-white/50">Multi-Staff Custody & Italy Cargo Box Allocation</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-white">Staff Operations & Italy Box Handover Station</h1>
          <p className="text-xs text-white/60 mt-1 max-w-2xl">
            Each staff member receives specific Italy shipment boxes containing assigned SKUs. Staff can only ship orders out of their claimed box custody.
          </p>
        </div>

        {/* Active Staff Member Station Selector & Quick PIN Login */}
        <div className="bg-[#0A101D] border border-white/10 p-3 rounded-xl space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-[10px] font-mono uppercase text-white/40 font-bold">Active Staff Station:</label>
            <button
              onClick={() => setShowStaffPinModal(true)}
              className="text-[10px] font-mono font-bold text-forest bg-forest/20 px-2 py-0.5 rounded border border-forest/40 hover:bg-forest/30 transition-all flex items-center gap-1"
            >
              🔑 PIN Login
            </button>
          </div>
          <select
            value={activeStaff}
            onChange={(e) => setActiveStaff(e.target.value)}
            className="w-full bg-[#05080f] border border-forest/40 text-xs font-mono font-bold text-forest rounded-lg px-3 py-2 outline-none"
          >
            <option value="Elena Guerrero">👤 Elena Guerrero (Makati Hub)</option>
            <option value="Juan Dela Cruz">👤 Juan Dela Cruz (Quezon City Hub)</option>
            <option value="Marco Rossi">🇮🇹 Marco Rossi (Milan Sourcing Lead)</option>
          </select>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex overflow-x-auto max-w-full bg-[#0A101D] border border-white/10 p-1.5 rounded-xl text-xs font-semibold scrollbar-none">
        <button
          onClick={() => setActiveRole('manila_warehouse')}
          className={`px-4 py-2.5 min-h-[44px] rounded-lg transition-all flex items-center gap-2 shrink-0 ${
            activeRole === 'manila_warehouse' ? 'bg-forest text-white font-bold shadow-md' : 'text-white/60 hover:text-white'
          }`}
        >
          📦 {activeStaff}'s Order Pack & Ship Queue
        </button>
        <button
          onClick={() => setActiveRole('box_handover')}
          className={`px-4 py-2.5 min-h-[44px] rounded-lg transition-all flex items-center gap-2 shrink-0 ${
            activeRole === 'box_handover' ? 'bg-amber text-navy-dark font-bold shadow-md' : 'text-white/60 hover:text-white'
          }`}
        >
          🛬 Italy Cargo Box Handover ({staffBoxes.length} Boxes)
        </button>
        <button
          onClick={() => setActiveRole('inter_staff_transfer')}
          className={`px-4 py-2.5 min-h-[44px] rounded-lg transition-all flex items-center gap-2 shrink-0 ${
            activeRole === 'inter_staff_transfer' ? 'bg-blue text-white font-bold shadow-md' : 'text-white/60 hover:text-white'
          }`}
        >
          ⚡ 1-Click Inter-Staff Transfer
        </button>
      </div>

      {/* MODE 1: STAFF SPECIFIC ORDER PACKING & SCAN-TO-SHIP */}
      {activeRole === 'manila_warehouse' && (
        <div className="space-y-6">
          
          {/* Barcode Verification Scanner Header */}
          <div className="bg-[#05080f] border border-forest/40 p-5 rounded-2xl shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📦</span>
                <div>
                  <h3 className="text-sm font-bold text-white">{activeStaff}'s Pack-to-Ship Verification Station</h3>
                  <p className="text-xs text-white/50">Point barcode scanner to verify item before sealing polybag</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-white/50">Shift Packed:</span>
                <span className="text-forest font-bold text-base bg-forest/10 px-3 py-1 rounded-lg border border-forest/30">{packedCount} orders</span>
              </div>
            </div>

            <form onSubmit={handleVerifyScan} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={scanBarcode}
                onChange={(e) => setScanBarcode(e.target.value)}
                placeholder="Scan barcode or SKU (e.g. KIKO-3D-05)..."
                className="flex-1 rounded-xl border border-white/20 bg-[#0A101D] px-4 py-3 text-sm text-white font-mono placeholder:text-white/30 focus:border-forest outline-none min-h-[44px]"
              />
              <button
                type="submit"
                className="bg-forest hover:bg-forest/90 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-lg shadow-forest/20 shrink-0 min-h-[44px] flex items-center justify-center"
              >
                Scan & Verify (+1)
              </button>
            </form>

            {scanMessage && (
              <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                scanMessage.success ? 'bg-forest/20 border-forest/40 text-forest' : 'bg-crimson/20 border-crimson/40 text-crimson'
              }`}>
                <span>{scanMessage.text}</span>
              </div>
            )}
          </div>

          {/* Orders Queue for Active Staff Member */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white/60">
              {activeStaff}'s Assigned Shipping Queue
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {orders.map(ord => (
                <div key={ord.id} className="bg-[#05080f] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span 
                        className="text-[10px] font-mono font-bold text-white px-2.5 py-1 rounded shadow-sm"
                        style={{ backgroundColor: ord.channelColor }}
                      >
                        {ord.channel}
                      </span>
                      <span className="text-xs font-mono text-white/40">{ord.id}</span>
                    </div>

                    <p className="text-sm font-bold text-white">{ord.customer}</p>
                    <p className="text-xs font-mono text-white/40 mt-0.5">{ord.courier} · {ord.tracking}</p>

                    <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 font-bold">Pick Items from {activeStaff}'s Custody Stock:</p>
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-xs font-mono">
                          <div>
                            <p className="font-bold text-white/90">{it.title}</p>
                            <p className="text-[10px] text-amber">{it.bin}</p>
                          </div>
                          <span className="text-forest font-bold bg-forest/10 px-2 py-0.5 rounded">x{it.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded ${
                      ord.status.includes('Packed') ? 'bg-forest/20 text-forest border border-forest/30' : 'bg-amber/20 text-amber border border-amber/30'
                    }`}>
                      {ord.status}
                    </span>

                    <button
                      onClick={() => setPrintSlipOrder(ord)}
                      className="bg-forest hover:bg-forest/90 text-white font-bold text-xs px-3.5 py-2 rounded-lg border border-forest/40 transition-all shadow-md flex items-center gap-1.5 min-h-[40px]"
                    >
                      🖨️ Print Shopee/Lazada Slip
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
          
          <div className="bg-[#05080f] border border-amber/40 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-amber/20 text-amber px-2 py-0.5 rounded border border-amber/30">
                  NAIA Cargo Box Handover & Custody Claim
                </span>
                <h2 className="font-serif text-xl font-bold text-white mt-1">Italy Flight Box Arrivals & Staff Inventory Handover</h2>
                <p className="text-xs text-white/50">Transfer specific flight boxes to staff members and claim SKU custody into local hubs.</p>
              </div>

              <span className="text-xs font-mono text-white/60">Active Custodian: <strong className="text-amber">{activeStaff}</strong></span>
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
                      isAssignedToActive ? 'bg-[#0A101D] border-amber/50 shadow-xl' : 'bg-[#05080f] border-white/10 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber bg-amber/10 px-2.5 py-1 rounded border border-amber/30">
                        {box.box_code}
                      </span>
                      <span className="text-[10px] font-mono text-white/40">{box.flight_num}</span>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono uppercase text-white/40 mb-1 font-bold">Assigned Staff Custodian:</label>
                      <select
                        value={box.assigned_staff}
                        onChange={(e) => handleReassignBoxStaff(box.box_code, e.target.value)}
                        className="w-full bg-[#05080f] border border-white/20 text-xs font-mono text-white rounded-lg px-2.5 py-1.5 outline-none focus:border-amber"
                      >
                        <option value="Elena Guerrero">Elena Guerrero (Makati Hub)</option>
                        <option value="Juan Dela Cruz">Juan Dela Cruz (Quezon City Hub)</option>
                        <option value="Maria Santos">Maria Santos (Alabang Hub)</option>
                      </select>
                    </div>

                    {/* Box SKUs Contents */}
                    <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-2 text-xs font-mono">
                      <p className="text-[10px] text-white/40 uppercase font-bold">Box SKU Breakdown:</p>
                      {box.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-white/90">
                          <span>{it.title}</span>
                          <span className="text-forest font-bold">x{it.qty} pcs</span>
                        </div>
                      ))}
                    </div>

                    {/* Handover Claim Action */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        isClaimed ? 'bg-forest/20 text-forest border border-forest/30' : 'bg-amber/20 text-amber border border-amber/30'
                      }`}>
                        {box.status}
                      </span>

                      {!isClaimed && isAssignedToActive && (
                        <button
                          onClick={() => handleClaimBoxCustody(box.box_code)}
                          className="bg-forest hover:bg-forest/90 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-md transition-all"
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
        <div className="bg-[#05080f] border border-blue/40 p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-blue/20 text-blue px-2 py-0.5 rounded border border-blue/30">
                Inter-Staff Custody Re-allocation
              </span>
              <h2 className="font-serif text-xl font-bold text-white mt-1">1-Click Inter-Staff Stock Transfer Station</h2>
              <p className="text-xs text-white/50">Transfer SKU inventory between staff members instantly with one click.</p>
            </div>

            <span className="text-xs font-mono text-forest">Audit Trail Logged</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { sku: 'KIKO-3D-05', title: 'KIKO Milano 3D Lipgloss Shade 05', from: 'Juan Dela Cruz (4 units)', to: 'Elena Guerrero (0 units)', defaultQty: 2 },
              { sku: 'MUL-PAN-500', title: 'Mulino Bianco Pan di Stelle 500g', from: 'Elena Guerrero (6 units)', to: 'Maria Santos (0 units)', defaultQty: 3 },
              { sku: 'LAV-ORO-250', title: 'Lavazza Qualità Oro Beans 250g', from: 'Juan Dela Cruz (10 units)', to: 'Elena Guerrero (1 unit)', defaultQty: 5 }
            ].map((trf, idx) => (
              <div key={idx} className="bg-[#0A101D] border border-white/10 p-5 rounded-2xl space-y-4 shadow-md">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold text-blue bg-blue/10 px-2 py-0.5 rounded border border-blue/30">{trf.sku}</span>
                  <span className="text-xs font-mono text-white/40">Instant 1-Click</span>
                </div>

                <h3 className="text-sm font-bold text-white">{trf.title}</h3>
                
                <div className="space-y-1 text-xs font-mono text-white/60 bg-white/5 p-3 rounded-xl border border-white/5">
                  <p>FROM: <strong className="text-crimson">{trf.from}</strong></p>
                  <p>TO: <strong className="text-forest">{trf.to}</strong></p>
                </div>

                <button
                  onClick={() => alert(`⚡ 1-Click Transfer Success! Transferred ${trf.defaultQty} units of ${trf.sku} to ${trf.to.split(' ')[0]}!`)}
                  className="w-full bg-blue hover:bg-blue/90 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-blue/20 transition-all"
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
