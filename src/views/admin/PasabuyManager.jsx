import { useState, useEffect } from 'react'
import { peso } from '../../data/products'
import { useStore } from '../../context/StoreContext'
import { supabase } from '../../lib/supabaseClient'

const INITIAL_PASABUY_REQUESTS = [
  {
    id: 'PB-1042',
    customer_name: 'Maria Santos',
    contact_number: '+63 917 555 0192',
    channel: 'Viber',
    item_title: 'Mulino Bianco Pan di Stelle (500g)',
    quantity: 6,
    reference_url: 'https://mulinobianco.it/pan-di-stelle',
    notes: 'Please check if they have the limited edition holiday tin in Milan supermarkets.',
    target_budget_eur: 18.0,
    cost_eur: 3.5,
    weight_kg: 0.5,
    shipping_method: 'air', // 'air' | 'sea'
    exchange_rate: 62.5,
    air_rate_eur_per_kg: 14.0,
    customs_tax_percent: 12,
    quoted_price_php: 450,
    status: 'Buying in Italy', // 'Pending Quote' | 'Quoted' | 'Approved' | 'Buying in Italy' | 'In Flight' | 'Delivered'
    created_at: '2026-07-21'
  },
  {
    id: 'PB-1043',
    customer_name: 'Chef Marco Rossi (Cafe Roma)',
    contact_number: '+63 918 888 2026',
    channel: 'WhatsApp',
    item_title: 'Urbani Tartufi White Truffle Oil (250ml)',
    quantity: 12,
    reference_url: 'https://urbanitartufi.it',
    notes: 'Need authentic product certificates for restaurant compliance.',
    target_budget_eur: 150.0,
    cost_eur: 12.0,
    weight_kg: 0.4,
    shipping_method: 'air',
    exchange_rate: 62.5,
    air_rate_eur_per_kg: 14.0,
    customs_tax_percent: 12,
    quoted_price_php: 1480,
    status: 'Quoted',
    created_at: '2026-07-22'
  },
  {
    id: 'PB-1044',
    customer_name: 'Elena Guerrero',
    contact_number: '+63 920 111 4455',
    channel: 'Website Form',
    item_title: 'KIKO Milano 3D Hydra Lipgloss Shade 20 & 21',
    quantity: 4,
    reference_url: 'https://kikocosmetics.com',
    notes: 'Can you include original Rinascente Milan receipt?',
    target_budget_eur: 40.0,
    cost_eur: 11.0,
    weight_kg: 0.1,
    shipping_method: 'air',
    exchange_rate: 62.5,
    air_rate_eur_per_kg: 14.0,
    customs_tax_percent: 12,
    quoted_price_php: 1150,
    status: 'Pending Quote',
    created_at: '2026-07-22'
  }
]

export default function PasabuyManager() {
  const { conversations } = useStore()
  const [requests, setRequests] = useState(() => {
    const saved = localStorage.getItem('k2_pasabuy_requests')
    return saved ? JSON.parse(saved) : INITIAL_PASABUY_REQUESTS
  })

  const [selectedReq, setSelectedReq] = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')
  const [quoteSuccess, setQuoteSuccess] = useState(false)

  // Quotation Engine Form State
  const [costEur, setCostEur] = useState(10)
  const [weightKg, setWeightKg] = useState(0.5)
  const [shippingMethod, setShippingMethod] = useState('air')
  const [exchangeRate, setExchangeRate] = useState(62.5)
  const [marginPercent, setMarginPercent] = useState(40)
  const [customPricePhp, setCustomPricePhp] = useState('')

  useEffect(() => {
    localStorage.setItem('k2_pasabuy_requests', JSON.stringify(requests))
  }, [requests])

  useEffect(() => {
    if (selectedReq) {
      setCostEur(selectedReq.cost_eur || 10)
      setWeightKg(selectedReq.weight_kg || 0.5)
      setShippingMethod(selectedReq.shipping_method || 'air')
      setExchangeRate(selectedReq.exchange_rate || 62.5)
      setCustomPricePhp(selectedReq.quoted_price_php ? String(selectedReq.quoted_price_php) : '')
    }
  }, [selectedReq])

  // Calculated Landed Cost Logic
  const itemCostPhp = costEur * exchangeRate
  const freightCostEur = shippingMethod === 'air' ? weightKg * 14.0 : weightKg * 4.0
  const freightCostPhp = freightCostEur * exchangeRate
  const customsTaxPhp = (itemCostPhp + freightCostPhp) * 0.12
  const totalLandedCostPhp = itemCostPhp + freightCostPhp + customsTaxPhp
  const suggestedSellingPricePhp = Math.ceil(totalLandedCostPhp * (1 + marginPercent / 100))
  const finalPricePhp = customPricePhp ? Number(customPricePhp) : suggestedSellingPricePhp
  const calculatedMarginPercent = totalLandedCostPhp > 0 ? (((finalPricePhp - totalLandedCostPhp) / finalPricePhp) * 100).toFixed(1) : 0

  const handleUpdateStatus = (reqId, newStatus) => {
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: newStatus } : r))
    if (selectedReq && selectedReq.id === reqId) {
      setSelectedReq(prev => ({ ...prev, status: newStatus }))
    }
  }

  const handleSaveQuote = () => {
    if (!selectedReq) return
    setRequests(prev => prev.map(r => {
      if (r.id === selectedReq.id) {
        return {
          ...r,
          cost_eur: costEur,
          weight_kg: weightKg,
          shipping_method: shippingMethod,
          exchange_rate: exchangeRate,
          quoted_price_php: finalPricePhp,
          status: r.status === 'Pending Quote' ? 'Quoted' : r.status
        }
      }
      return r
    }))
    setQuoteSuccess(true)
    setTimeout(() => setQuoteSuccess(false), 2500)
  }

  const filteredRequests = requests.filter(r => filterStatus === 'All' || r.status === filterStatus)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-[#09090b] border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-widest bg-amber/20 text-amber px-2 py-0.5 rounded border border-amber/30">
              Italy Pasabuy Command Center
            </span>
            <span className="text-sm text-white/50">Custom Shopper Request & Quotation Engine</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-white">Pasabuy Requests & Landed Cost Calculator</h1>
          <p className="text-sm text-white/60 mt-1 max-w-2xl">
            Review custom Pasabuy item requests submitted by shoppers, calculate exact landed costs in Manila (EuroFX + Air Freight + Customs Duty), and push quotes to Viber/WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-sm font-mono">
            <span className="text-white/40">EUR/PHP FX:</span> <span className="text-forest font-bold">₱62.50</span>
          </div>
          <div className="bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-sm font-mono">
            <span className="text-white/40">Air Cargo Rate:</span> <span className="text-blue font-bold">€14.00 / kg</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-3 overflow-x-auto text-sm font-mono">
        {['All', 'Pending Quote', 'Quoted', 'Approved', 'Buying in Italy', 'In Flight'].map(st => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3.5 py-1.5 rounded-lg border transition-all whitespace-nowrap ${
              filterStatus === st ? 'bg-amber/20 border-amber/40 text-amber font-bold' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
            }`}
          >
            {st} {st !== 'All' && `(${requests.filter(r => r.status === st).length})`}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Request List */}
        <div className="lg:col-span-1 space-y-3">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-white/40 px-1">Customer Item Submissions</p>

          {filteredRequests.map(req => {
            const isSelected = selectedReq?.id === req.id
            return (
              <div
                key={req.id}
                onClick={() => setSelectedReq(req)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected ? 'bg-[#0A101D] border-amber/50 shadow-xl' : 'bg-[#09090b] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-amber bg-amber/10 px-2 py-0.5 rounded border border-amber/20">
                    {req.id}
                  </span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    req.status === 'Pending Quote' ? 'bg-crimson/20 text-crimson border border-crimson/30' :
                    req.status === 'Quoted' ? 'bg-blue/20 text-blue border border-blue/30' :
                    'bg-forest/20 text-forest border border-forest/30'
                  }`}>
                    {req.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white truncate">{req.item_title}</h3>
                <p className="text-xs text-white/50 mt-1 truncate">Customer: {req.customer_name} ({req.channel})</p>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 text-xs font-mono">
                  <span className="text-white/40">Qty: {req.quantity} pcs</span>
                  <span className="text-forest font-bold">
                    {req.quoted_price_php ? peso(req.quoted_price_php) : 'Needs Quote'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Column: Interactive Quotation & Landed Cost Calculator */}
        <div className="lg:col-span-2 space-y-6">
          {selectedReq ? (
            <div className="bg-[#09090b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-amber bg-amber/20 px-2 py-0.5 rounded">
                      {selectedReq.id}
                    </span>
                    <span className="text-sm text-white/40">Requested on {selectedReq.created_at}</span>
                  </div>
                  <h2 className="font-serif text-xl font-bold text-white">{selectedReq.item_title}</h2>
                  <p className="text-sm text-white/60 mt-0.5">Requester: {selectedReq.customer_name} ({selectedReq.contact_number} · {selectedReq.channel})</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedReq.status}
                    onChange={(e) => handleUpdateStatus(selectedReq.id, e.target.value)}
                    className="bg-[#0A101D] border border-white/20 text-sm font-mono text-white rounded-lg px-3 py-2 outline-none"
                  >
                    <option value="Pending Quote">Pending Quote</option>
                    <option value="Quoted">Quoted</option>
                    <option value="Approved">Approved</option>
                    <option value="Buying in Italy">Buying in Italy</option>
                    <option value="In Flight">In Flight</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
              </div>

              {/* Customer Notes Card */}
              {selectedReq.notes && (
                <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl text-sm text-neutral-300">
                  <p className="text-xs font-mono uppercase text-white/40 font-bold mb-1">Customer Special Instructions:</p>
                  <p className="italic">"{selectedReq.notes}"</p>
                  {selectedReq.reference_url && (
                    <a
                      href={selectedReq.reference_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-blue text-xs hover:underline"
                    >
                      🔗 Open Customer Reference Link →
                    </a>
                  )}
                </div>
              )}

              {/* Quotation & Landed Cost Breakdown Engine */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white/60">
                    🇮🇹 Italy Landed Cost & Pricing Engine
                  </h3>
                  <span className="text-xs font-mono text-forest">Auto-Calculates Cargo & Customs</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-white/40 mb-1">Cost in Italy (€ EUR)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={costEur}
                      onChange={(e) => setCostEur(Number(e.target.value))}
                      className="w-full rounded-lg border border-white/10 bg-[#0A101D] px-3 py-2 text-sm text-white font-mono outline-none focus:border-amber"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-white/40 mb-1">Item Weight (KG)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                      className="w-full rounded-lg border border-white/10 bg-[#0A101D] px-3 py-2 text-sm text-white font-mono outline-none focus:border-amber"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-white/40 mb-1">Shipping Route</label>
                    <select
                      value={shippingMethod}
                      onChange={(e) => setShippingMethod(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#0A101D] px-3 py-2 text-sm text-white font-mono outline-none focus:border-amber"
                    >
                      <option value="air">✈️ Air Express (€14/kg)</option>
                      <option value="sea">🚢 Sea Cargo (€4/kg)</option>
                    </select>
                  </div>
                </div>

                {/* Calculation Summary Card */}
                <div className="bg-[#0A101D] border border-white/10 p-4 rounded-xl space-y-2 text-sm font-mono">
                  <div className="flex justify-between text-white/60">
                    <span>Base Item Price (€{costEur} × ₱{exchangeRate}):</span>
                    <span className="text-white">{peso(itemCostPhp)}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Freight Charge ({shippingMethod === 'air' ? 'Air Express' : 'Sea Cargo'}):</span>
                    <span className="text-white">{peso(freightCostPhp)}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Manila Customs & Import Tax (12%):</span>
                    <span className="text-white">{peso(customsTaxPhp)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-white/10 pt-2 text-base">
                    <span className="text-neutral-300">Total Manila Landed Cost:</span>
                    <span className="text-amber">{peso(totalLandedCostPhp)}</span>
                  </div>
                </div>

                {/* Final Quote Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-mono uppercase text-white/40 mb-1">Target Margin %</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="20"
                        max="80"
                        value={marginPercent}
                        onChange={(e) => setMarginPercent(Number(e.target.value))}
                        className="flex-1 accent-amber"
                      />
                      <span className="text-sm font-mono font-bold text-amber w-12">{marginPercent}%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-white/40 mb-1">Final Customer Quote (PHP)</label>
                    <input
                      type="number"
                      value={finalPricePhp}
                      onChange={(e) => setCustomPricePhp(e.target.value)}
                      className="w-full rounded-lg border border-forest/50 bg-forest/10 px-3 py-2 text-base text-forest font-bold font-mono outline-none"
                    />
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                  <div className="text-sm font-mono text-white/50">
                    Calculated Margin: <span className="text-forest font-bold">{calculatedMarginPercent}%</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveQuote}
                      className="bg-amber hover:bg-amber/90 text-navy-dark font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg transition-all"
                    >
                      {quoteSuccess ? '✓ Quote Saved & Updated!' : '💾 Save Quotation'}
                    </button>
                    <button
                      onClick={() => alert(`Quote for ${selectedReq.item_title}: ${peso(finalPricePhp)} pushed to ${selectedReq.customer_name} via ${selectedReq.channel}!`)}
                      className="bg-forest hover:bg-forest/90 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all"
                    >
                      📱 Send Quote via {selectedReq.channel}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-[#09090b] border border-white/10 rounded-2xl p-12 text-center text-white/40 font-mono text-sm">
              👈 Select a Pasabuy request from the left panel to open the Landed Cost Quotation Engine.
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
