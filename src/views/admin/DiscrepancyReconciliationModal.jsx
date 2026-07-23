import { useState } from 'react'

export default function DiscrepancyReconciliationModal({ isOpen, onClose, consignment, items, onFinalizeArrival }) {
  const [notes, setNotes] = useState('')
  const [finalizing, setFinalizing] = useState(false)

  if (!isOpen || !consignment) return null

  const handleFinalize = async () => {
    setFinalizing(true)
    try {
      await onFinalizeArrival(notes)
      onClose()
    } catch (e) {
      alert("Error finalizing shipment stock sync: " + e.message)
    } finally {
      setFinalizing(false)
    }
  }

  const totalPacked = items.reduce((sum, i) => sum + (i.italy_packed_qty || 0), 0)
  const totalScanned = items.reduce((sum, i) => sum + (i.manila_scanned_qty || 0), 0)
  const varianceTotal = totalScanned - totalPacked

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/10 bg-[#0A101D] text-white shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-[#09090b] flex justify-between items-center shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-forest bg-forest/20 px-2 py-0.5 rounded">
                Manila Customs & Warehouse Check
              </span>
              <span className="text-sm text-white/60 font-mono">{consignment.manifest_code}</span>
            </div>
            <h2 className="font-serif text-xl font-bold text-white mt-1">Fix box count mismatches</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl">✕</button>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-3 gap-px bg-white/10 border-b border-white/10 text-center shrink-0">
          <div className="bg-[#09090b] p-4">
            <p className="text-xs font-mono uppercase tracking-widest text-white/60">Italy Packed Box Qty</p>
            <p className="text-xl font-bold text-white mt-1">{totalPacked} units</p>
          </div>
          <div className="bg-[#09090b] p-4">
            <p className="text-xs font-mono uppercase tracking-widest text-white/60">Manila Scanned Qty</p>
            <p className="text-xl font-bold text-forest mt-1">{totalScanned} units</p>
          </div>
          <div className="bg-[#09090b] p-4">
            <p className="text-xs font-mono uppercase tracking-widest text-white/60">Variance</p>
            <p className={`text-xl font-bold mt-1 ${varianceTotal === 0 ? 'text-forest' : varianceTotal < 0 ? 'text-crimson' : 'text-amber'}`}>
              {varianceTotal > 0 ? `+${varianceTotal}` : varianceTotal} units
            </p>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-white/60 uppercase tracking-wider font-mono">
                <th className="py-2.5 px-3">SKU & Item Details</th>
                <th className="py-2.5 px-3 text-center">Batch Code</th>
                <th className="py-2.5 px-3 text-center">Best Before</th>
                <th className="py-2.5 px-3 text-center">Italy Packed</th>
                <th className="py-2.5 px-3 text-center">Manila Scanned</th>
                <th className="py-2.5 px-3 text-center">Variance</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map(item => {
                const variance = item.manila_scanned_qty - item.italy_packed_qty
                const isMatched = variance === 0
                const isShort = variance < 0

                return (
                  <tr key={item.sku} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-bold text-white">{item.sku}</p>
                      <p className="text-xs text-white/50">{item.name || 'Authentic Italian Product'}</p>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-neutral-300">{item.batch_code}</td>
                    <td className="py-3 px-3 text-center font-mono text-neutral-300">{item.best_before_date}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-neutral-300">{item.italy_packed_qty}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-forest">{item.manila_scanned_qty}</td>
                    <td className={`py-3 px-3 text-center font-mono font-bold ${isMatched ? 'text-white/60' : isShort ? 'text-crimson' : 'text-amber'}`}>
                      {variance > 0 ? `+${variance}` : variance}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                        isMatched ? 'bg-forest/20 text-forest' : isShort ? 'bg-crimson/20 text-crimson' : 'bg-amber/20 text-amber'
                      }`}>
                        {isMatched ? 'Matched 🟢' : isShort ? 'Shortage 🔴' : 'Surplus 🟡'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Warehouse Discrepancy Note */}
          <div className="pt-4 border-t border-white/10">
            <label className="block text-sm font-mono uppercase tracking-wider text-white/60 mb-2">
              Customs / Warehouse Arrival Notes & Audit Comments
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Box #2 outer seal checked at NAIA customs. No damages detected..."
              className="w-full rounded-lg border border-white/10 bg-[#09090b] p-3 text-sm text-white placeholder-white/30 outline-none focus:border-forest resize-none h-20"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#09090b] flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-neutral-300 hover:bg-white/10"
          >
            Back to Scanning
          </button>
          <button
            onClick={handleFinalize}
            disabled={finalizing}
            className="rounded-lg bg-forest hover:bg-forest/90 text-white px-6 py-2.5 text-sm font-bold shadow-lg shadow-forest/20 transition-all disabled:opacity-50"
          >
            {finalizing ? 'Syncing Master Inventory...' : 'Finalize Arrival & Sync Master Stock 🚀'}
          </button>
        </div>

      </div>
    </div>
  )
}
