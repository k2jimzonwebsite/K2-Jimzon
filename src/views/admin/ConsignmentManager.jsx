import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useStore } from '../../context/StoreContext'
import MobileScannerModal from './MobileScannerModal'
import MilanPackingScannerModal from './MilanPackingScannerModal'
import DiscrepancyReconciliationModal from './DiscrepancyReconciliationModal'
import ScanToAiModal from './ScanToAiModal'

const INITIAL_CONSIGNMENT = {
  id: 'csg-101',
  manifest_code: 'FLIGHT-MILAN-2026-08',
  flight_number: 'PR 721 (Milan Malpensa → Manila NAIA)',
  status: 'Arrived_Manila',
  packed_at: '2026-07-20',
  items: [
    { sku: 'KIKO-3D-05', name: 'KIKO Milano 3D Hydra Lipgloss (Shade 05)', batch_code: 'LOT-202607-A', best_before_date: '2028-06-30', italy_packed_qty: 24, manila_scanned_qty: 20 },
    { sku: 'LAV-ORO-1000', name: 'Lavazza Qualità Oro Coffee Beans 1kg', batch_code: 'LOT-202607-B', best_before_date: '2027-12-31', italy_packed_qty: 50, manila_scanned_qty: 50 },
    { sku: 'MB-PANDISTELLE-350', name: 'Mulino Bianco Pan di Stelle Biscuits', batch_code: 'LOT-202607-C', best_before_date: '2027-04-15', italy_packed_qty: 36, manila_scanned_qty: 35 },
    { sku: 'PERI-BACCI-200', name: 'Perugina Baci Dark Chocolates Box', batch_code: 'LOT-202607-D', best_before_date: '2027-09-30', italy_packed_qty: 15, manila_scanned_qty: 15 }
  ]
}

export default function ConsignmentManager() {
  const { products } = useStore()
  const [consignment, setConsignment] = useState(INITIAL_CONSIGNMENT)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isMilanScannerOpen, setIsMilanScannerOpen] = useState(false)
  const [showScanAiModal, setShowScanAiModal] = useState(false)
  const [isReconcileOpen, setIsReconcileOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Form states for new packing manifest
  const [manifestCode, setManifestCode] = useState(`FLIGHT-MILAN-${Date.now().toString().slice(-4)}`)
  const [selectedSku, setSelectedSku] = useState('')
  const [packedQty, setPackedQty] = useState(10)
  const [batchCode, setBatchCode] = useState(`LOT-${new Date().toISOString().slice(0, 7).replace('-', '')}`)
  const [bestBeforeDate, setBestBeforeDate] = useState('2028-12-31')

  useEffect(() => {
    fetchConsignmentFromDb()
  }, [])

  const fetchConsignmentFromDb = async () => {
    if (!supabase) return
    try {
      const { data: cData } = await supabase
        .from('consignments')
        .select('*, consignment_items(*)')
        .order('created_at', { ascending: false })
        .limit(1)

      if (cData && cData.length > 0) {
        const c = cData[0]
        setConsignment({
          id: c.id,
          manifest_code: c.manifest_code,
          flight_number: c.flight_number,
          status: c.status,
          packed_at: new Date(c.packed_at).toLocaleDateString(),
          items: (c.consignment_items || []).map(i => ({
            sku: i.sku,
            name: (products || []).find(p => p.sku === i.sku)?.name || i.sku,
            batch_code: i.batch_code,
            best_before_date: i.best_before_date,
            italy_packed_qty: i.italy_packed_qty,
            manila_scanned_qty: i.manila_scanned_qty
          }))
        })
      }
    } catch (e) {
      console.warn("Consignment DB fetch notice:", e)
    }
  }

  // Handle +1 barcode scan increment
  const handleScanItem = (codeOrSku) => {
    let updatedItem = null
    setConsignment(prev => {
      const targetSku = codeOrSku.toLowerCase()
      const newItems = prev.items.map(item => {
        if (item.sku.toLowerCase() === targetSku || targetSku.includes(item.sku.toLowerCase())) {
          updatedItem = { ...item, manila_scanned_qty: item.manila_scanned_qty + 1 }
          return updatedItem
        }
        return item
      })

      // If SKU was not in list, add it dynamically
      if (!updatedItem) {
        const matchedP = (products || []).find(p => p.sku.toLowerCase() === targetSku)
        updatedItem = {
          sku: matchedP ? matchedP.sku : codeOrSku.toUpperCase(),
          name: matchedP ? matchedP.name : 'Scanned Arrival Item',
          batch_code: 'LOT-ARRIVED-MANILA',
          best_before_date: '2028-12-31',
          italy_packed_qty: 0,
          manila_scanned_qty: 1
        }
        newItems.push(updatedItem)
      }

      return { ...prev, items: newItems }
    })
    return updatedItem
  }

  // Handle +1 barcode scan in Milan (Italy POV)
  const handlePackItemMilan = (targetSku) => {
    let updatedItem = null
    setConsignment(prev => {
      const target = targetSku.toLowerCase()
      const newItems = prev.items.map(item => {
        if (item.sku.toLowerCase() === target) {
          updatedItem = { ...item, italy_packed_qty: item.italy_packed_qty + 1 }
          return updatedItem
        }
        return item
      })

      if (!updatedItem) {
        const matchedP = (products || []).find(p => p.sku.toLowerCase() === target)
        updatedItem = {
          sku: matchedP ? matchedP.sku : targetSku.toUpperCase(),
          name: matchedP ? matchedP.name : 'Packed Milan Item',
          batch_code: `LOT-${new Date().toISOString().slice(0, 7).replace('-', '')}`,
          best_before_date: '2028-12-31',
          italy_packed_qty: 1,
          manila_scanned_qty: 0
        }
        newItems.push(updatedItem)
      }

      return { ...prev, items: newItems }
    })
    return updatedItem
  }

  const handleQuickCreateProduct = (newP) => {
    if (supabase) {
      supabase.from('products').insert({
        sku: newP.sku,
        name: newP.name,
        srp: newP.srp || 0,
        stock_available: 0,
        status: 'Draft'
      }).then(({ error }) => { if (error) console.warn('Quick create product failed:', error.message) })
    }

    setConsignment(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          sku: newP.sku,
          name: newP.name,
          batch_code: newP.batch_code,
          best_before_date: newP.best_before_date,
          italy_packed_qty: newP.italy_packed_qty,
          manila_scanned_qty: 0
        }
      ]
    }))
  }

  // Finalize stock arrival and update database
  const handleFinalizeArrival = async (notes) => {
    if (supabase && consignment.id && consignment.id.includes('-')) {
      for (const item of consignment.items) {
        if (item.manila_scanned_qty > 0) {
          // Increment product master stock
          await supabase.rpc('decrement_stock', { p_sku: item.sku, p_quantity: -item.manila_scanned_qty })
            .catch(async () => {
              // Direct update fallback
              const p = (products || []).find(prod => prod.sku === item.sku)
              if (p) {
                await supabase.from('products').update({
                  stock_available: (p.stock_available || 0) + item.manila_scanned_qty,
                  updated_at: new Date().toISOString()
                }).eq('sku', item.sku)
              }
            })

          // Add batch tracking
          await supabase.from('product_batches').insert({
            sku: item.sku,
            batch_code: item.batch_code,
            best_before_date: item.best_before_date,
            quantity_available: item.manila_scanned_qty,
            arrival_flight: consignment.manifest_code
          }).catch(() => {})
        }
      }

      await supabase.from('consignments').update({
        status: 'Completed',
        arrived_at: new Date().toISOString()
      }).eq('id', consignment.id).catch(() => {})
    }

    setConsignment(prev => ({ ...prev, status: 'Completed' }))
    alert("🎉 Success! Manila box arrival finalized, batch dates logged, and master stock updated!")
  }

  const handleAddPackingItem = (e) => {
    e.preventDefault()
    if (!selectedSku) return
    const matchedP = products.find(p => p.sku === selectedSku)
    
    setConsignment(prev => {
      const existing = prev.items.find(i => i.sku === selectedSku)
      if (existing) {
        return {
          ...prev,
          items: prev.items.map(i => i.sku === selectedSku ? { ...i, italy_packed_qty: i.italy_packed_qty + Number(packedQty) } : i)
        }
      }
      return {
        ...prev,
        items: [
          ...prev.items,
          {
            sku: selectedSku,
            name: matchedP ? matchedP.name : selectedSku,
            batch_code: batchCode,
            best_before_date: bestBeforeDate,
            italy_packed_qty: Number(packedQty),
            manila_scanned_qty: 0
          }
        ]
      }
    })
    setShowCreateModal(false)
  }

  const totalItalyPacked = consignment.items.reduce((sum, i) => sum + i.italy_packed_qty, 0)
  const totalManilaScanned = consignment.items.reduce((sum, i) => sum + i.manila_scanned_qty, 0)

  return (
    <div className="max-w-7xl mx-auto text-white space-y-4 animate-in fade-in duration-300 font-sans">

      {/* Header */}
      <div className="bg-[#161922] p-4 sm:p-5 rounded-2xl border border-white/10 shadow-lg space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wide bg-gold text-navy px-2 py-0.5 rounded-full">
              Italy ✈ PH consignment
            </span>
            <span className="text-[11px] font-mono text-gold font-bold">{consignment.manifest_code}</span>
          </div>
          <h1 className="font-serif text-base sm:text-2xl font-bold text-white leading-snug">{consignment.flight_number}</h1>
          <p className="text-xs sm:text-sm text-white/55 mt-1">
            Packed in Milan {consignment.packed_at} · <span className="font-semibold text-blue">{consignment.status}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
          <button onClick={() => setIsMilanScannerOpen(true)}
            className="bg-blue hover:bg-blue-deep text-white font-semibold text-sm px-4 min-h-11 rounded-xl transition-all flex items-center justify-center gap-2">
            📷 Scan in Milan
          </button>
          <button onClick={() => setShowCreateModal(true)}
            className="bg-gold hover:bg-gold-deep text-navy font-semibold text-sm px-4 min-h-11 rounded-xl transition-all">
            + New box
          </button>
          <button onClick={() => setIsScannerOpen(true)}
            className="bg-white/10 hover:bg-white/15 text-white font-semibold text-sm px-4 min-h-11 rounded-xl transition-all flex items-center justify-center gap-2">
            📷 Scan Manila arrival
          </button>
        </div>
      </div>

      {/* Receiving summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="bg-[#0A101D] border border-white/10 p-3.5 rounded-xl">
          <p className="text-[11px] font-mono uppercase tracking-wide text-white/50">Milan packed</p>
          <p className="text-xl font-bold text-white mt-0.5">{totalItalyPacked} <span className="text-xs font-normal text-white/45">units</span></p>
        </div>

        <div className="bg-[#0A101D] border border-white/10 p-3.5 rounded-xl">
          <p className="text-[11px] font-mono uppercase tracking-wide text-white/50">Manila scanned</p>
          <p className="text-xl font-bold text-forest mt-0.5">{totalManilaScanned} <span className="text-xs font-normal text-white/45">units</span></p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-[#0A101D] border border-white/10 p-3.5 rounded-xl flex flex-col justify-between gap-2">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wide text-white/50">Match status</p>
            <p className={`text-base font-bold mt-0.5 ${totalManilaScanned === totalItalyPacked ? 'text-forest' : 'text-crimson'}`}>
              {totalManilaScanned === totalItalyPacked ? '🟢 All matched' : `🔴 ${totalItalyPacked - totalManilaScanned} pending`}
            </p>
          </div>
          <button onClick={() => setIsReconcileOpen(true)} className="text-[13px] font-semibold text-blue hover:underline text-left">
            Reconcile →
          </button>
        </div>
      </div>

      {/* Manifest */}
      <div className="bg-[#0A101D] border border-white/10 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-4 py-3 border-b border-white/10 bg-[#09090b] flex justify-between items-center gap-2">
          <h3 className="font-serif font-semibold text-white text-[15px]">Box manifest · Milan → Manila</h3>
          <span className="text-xs font-mono text-white/45 shrink-0">{consignment.items.length} SKUs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-white/60 font-mono uppercase tracking-wider bg-white/5">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Batch Code</th>
                <th className="py-3 px-4">Best Before</th>
                <th className="py-3 px-4 text-center">Italy Packed</th>
                <th className="py-3 px-4 text-center">Manila Scanned</th>
                <th className="py-3 px-4 text-right">Action (+1)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {consignment.items.map(item => (
                <tr key={item.sku} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-white">{item.sku}</td>
                  <td className="py-3 px-4 font-medium text-neutral-200">{item.name}</td>
                  <td className="py-3 px-4 font-mono text-white/60">{item.batch_code}</td>
                  <td className="py-3 px-4 font-mono text-white/60">{item.best_before_date}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-white">{item.italy_packed_qty}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-forest">{item.manila_scanned_qty}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleScanItem(item.sku)}
                      className="bg-white/10 hover:bg-forest hover:text-white text-neutral-300 px-3 py-1 rounded text-sm font-bold transition-all"
                    >
                      +1 Scan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Milan Packing Scanner Modal (Italy POV) */}
      <MilanPackingScannerModal
        isOpen={isMilanScannerOpen}
        onClose={() => setIsMilanScannerOpen(false)}
        items={consignment.items}
        products={products}
        onPackItem={handlePackItemMilan}
        onUnrecognizedBarcode={(barcode) => {
          setIsMilanScannerOpen(false)
          setShowScanAiModal(true)
        }}
        onQuickCreateProduct={handleQuickCreateProduct}
      />

      {/* AI Scan-to-PIM Modal */}
      {showScanAiModal && (
        <ScanToAiModal
          onClose={() => setShowScanAiModal(false)}
          onOpenSmartPaste={() => {
            setShowScanAiModal(false)
          }}
        />
      )}

      {/* Mobile Scanner Modal (Manila Arrival POV) */}
      <MobileScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        items={consignment.items}
        onScanItem={handleScanItem}
        onFinishScanning={() => {
          setIsScannerOpen(false)
          setIsReconcileOpen(true)
        }}
      />

      {/* Reconciliation Modal */}
      <DiscrepancyReconciliationModal
        isOpen={isReconcileOpen}
        onClose={() => setIsReconcileOpen(false)}
        consignment={consignment}
        items={consignment.items}
        onFinalizeArrival={handleFinalizeArrival}
      />

      {/* Create New Box Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#0A101D] border border-white/10 rounded-2xl p-6 text-white shadow-2xl space-y-4">
            <h3 className="font-serif font-bold text-xl text-white">Pack New Item Box (Milan)</h3>
            <form onSubmit={handleAddPackingItem} className="space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase text-white/50 mb-1">Select SKU</label>
                <select
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white"
                >
                  <option value="">Select a product SKU...</option>
                  {(products || []).map(p => (
                    <option key={p.sku} value={p.sku}>{p.sku} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-white/50 mb-1">Italy Box Packed Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={packedQty}
                  onChange={(e) => setPackedQty(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-white/50 mb-1">Batch / Lot Code</label>
                <input
                  type="text"
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-white/50 mb-1">Best-Before Date</label>
                <input
                  type="date"
                  value={bestBeforeDate}
                  onChange={(e) => setBestBeforeDate(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 rounded-lg bg-white/10 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-crimson text-sm font-bold text-white shadow-lg shadow-crimson/20"
                >
                  Add to Manifest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
