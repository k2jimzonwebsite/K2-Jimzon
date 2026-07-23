import { useState } from 'react'

export default function StaffAllocationModal({ product, onClose, onSaveAllocations }) {
  const [allocations, setAllocations] = useState(() => {
    if (product && product.staff_allocations && Array.isArray(product.staff_allocations) && product.staff_allocations.length > 0) {
      return product.staff_allocations
    }
    // Default initial allocation breakdown fallback
    const totalStock = product?.stock_available || product?.stock || 9
    const elenaStock = Math.min(3, totalStock)
    const juanStock = Math.min(4, Math.max(0, totalStock - elenaStock))
    const marcoStock = Math.max(0, totalStock - elenaStock - juanStock)

    return [
      { id: 'ALC-01', staff_id: 'STF-101', staff_name: 'Elena Guerrero', location: 'Makati Hub (South)', stock: elenaStock, bin: 'Bin A-02' },
      { id: 'ALC-02', staff_id: 'STF-102', staff_name: 'Juan Dela Cruz', location: 'Quezon City Hub (North)', stock: juanStock, bin: 'Bin B-14' },
      { id: 'ALC-03', staff_id: 'STF-103', staff_name: 'Marco Rossi', location: 'Milan Cargo Transit (Italy)', stock: marcoStock, bin: 'Box MXP-09' }
    ]
  })

  // 1-Click Transfer State
  const [transferFromId, setTransferFromId] = useState(allocations[1]?.id || allocations[0]?.id || '')
  const [transferToId, setTransferToId] = useState(allocations[0]?.id || '')
  const [transferQty, setTransferQty] = useState(1)
  const [transferMessage, setTransferMessage] = useState(null)

  // New Allocation Form State
  const [newStaffName, setNewStaffName] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newStock, setNewStock] = useState(1)
  const [newBin, setNewBin] = useState('')

  const handleUpdateStock = (id, newQty) => {
    setAllocations(prev => prev.map(a => a.id === id ? { ...a, stock: Math.max(0, Number(newQty)) } : a))
  }

  const handleUpdateBin = (id, newBinVal) => {
    setAllocations(prev => prev.map(a => a.id === id ? { ...a, bin: newBinVal } : a))
  }

  // 1-Click Stock Transfer Execution
  const handleExecute1ClickTransfer = (e) => {
    e.preventDefault()
    if (!transferFromId || !transferToId || transferFromId === transferToId || transferQty <= 0) return

    const sourceAlloc = allocations.find(a => a.id === transferFromId)
    const destAlloc = allocations.find(a => a.id === transferToId)

    if (!sourceAlloc || sourceAlloc.stock < transferQty) {
      setTransferMessage({ error: true, text: `⚠️ ${sourceAlloc?.staff_name || 'Source'} only has ${sourceAlloc?.stock || 0} units. Cannot transfer ${transferQty} units.` })
      setTimeout(() => setTransferMessage(null), 3500)
      return
    }

    setAllocations(prev => prev.map(a => {
      if (a.id === transferFromId) {
        return { ...a, stock: a.stock - Number(transferQty) }
      }
      if (a.id === transferToId) {
        return { ...a, stock: a.stock + Number(transferQty) }
      }
      return a
    }))

    setTransferMessage({
      error: false,
      text: `⚡ 1-Click Transfer Success! Transferred ${transferQty} unit(s) from ${sourceAlloc.staff_name} → ${destAlloc.staff_name}.`
    })
    setTimeout(() => setTransferMessage(null), 4000)
  }

  const handleAddAllocation = (e) => {
    e.preventDefault()
    if (!newStaffName || !newLocation || newStock <= 0) return

    const newAlloc = {
      id: `ALC-${Date.now().toString().slice(-4)}`,
      staff_id: `STF-${Math.floor(100 + Math.random() * 900)}`,
      staff_name: newStaffName,
      location: newLocation,
      stock: Number(newStock),
      bin: newBin || 'General Shelf'
    }

    setAllocations(prev => [...prev, newAlloc])
    setNewStaffName('')
    setNewLocation('')
    setNewStock(1)
    setNewBin('')
  }

  const handleDeleteAllocation = (id) => {
    setAllocations(prev => prev.filter(a => a.id !== id))
  }

  const handleSave = () => {
    if (onSaveAllocations && product) {
      onSaveAllocations(product.sku || product.id, allocations)
    }
    onClose()
  }

  const totalAllocatedStock = allocations.reduce((sum, a) => sum + (Number(a.stock) || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-[#0A101D] border border-white/10 rounded-2xl p-4 sm:p-6 text-white space-y-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-blue/20 text-blue px-2 py-0.5 rounded border border-blue/30 uppercase">
                Staff Custody & Multi-Location Stock Allocation
              </span>
              <span className="text-sm text-white/50">SKU: {product?.sku || product?.id || 'N/A'}</span>
            </div>
            <h2 className="font-serif text-xl font-bold text-white mt-1">{product?.name || product?.title || 'Product Stock Allocation'}</h2>
            <p className="text-sm text-white/60">
              Total Allocated Across Staff: <span className="text-blue font-bold font-mono">{totalAllocatedStock} units</span> across {allocations.length} staff locations.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>

        {/* ⚡ 1-Click Inter-Staff Stock Transfer Station */}
        <form onSubmit={handleExecute1ClickTransfer} className="bg-[#05080f] border border-amber/40 p-4 rounded-xl space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-amber flex items-center gap-1.5">
              <span>⚡</span> 1-Click Inter-Staff Stock Transfer Engine
            </h3>
            <span className="text-[10px] font-mono text-white/40">Re-assign custody in 1 click</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm font-mono">
            <div>
              <label className="block text-[10px] text-white/40 mb-1">Transfer FROM (Source Staff)</label>
              <select
                value={transferFromId}
                onChange={(e) => setTransferFromId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0A101D] px-3 py-2 text-white outline-none focus:border-amber"
              >
                {allocations.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.staff_name} ({a.stock} units available)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-white/40 mb-1">Transfer TO (Destination Staff)</label>
              <select
                value={transferToId}
                onChange={(e) => setTransferToId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0A101D] px-3 py-2 text-white outline-none focus:border-amber"
              >
                {allocations.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.staff_name} ({a.stock} units currently)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-white/40 mb-1">Transfer Qty (Units)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  className="w-20 rounded-lg border border-white/10 bg-[#0A101D] px-3 py-2 text-white outline-none focus:border-amber"
                />
                <button
                  type="submit"
                  className="flex-1 bg-amber hover:bg-amber/90 text-navy-dark font-extrabold text-sm py-2 rounded-lg transition-all shadow-md"
                >
                  ⚡ Execute 1-Click Transfer
                </button>
              </div>
            </div>
          </div>

          {transferMessage && (
            <div className={`p-2.5 rounded-lg border text-sm font-mono ${
              transferMessage.error ? 'bg-crimson/20 border-crimson/40 text-crimson' : 'bg-forest/20 border-forest/40 text-forest font-bold'
            }`}>
              {transferMessage.text}
            </div>
          )}
        </form>

        {/* Staff Custody Breakdown List */}
        <div className="space-y-3">
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white/50">
            Assigned Staff Custodians & Location Inventories
          </h3>

          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {allocations.map((alloc) => (
              <div key={alloc.id} className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm font-mono space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-blue/20 text-blue font-bold flex items-center justify-center text-sm">
                      👤
                    </span>
                    <div>
                      <p className="font-bold text-white text-base">{alloc.staff_name}</p>
                      <p className="text-white/40 text-[10px]">{alloc.location} · {alloc.staff_id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                      alloc.stock > 0 ? 'bg-forest/20 border-forest/40 text-forest' : 'bg-crimson/20 border-crimson/40 text-crimson'
                    }`}>
                      {alloc.stock > 0 ? `${alloc.stock} Units Available` : 'Out of Stock'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDeleteAllocation(alloc.id)}
                      className="text-white/30 hover:text-crimson transition-colors p-1"
                      title="Remove Staff Allocation"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Inline Quantity & Bin Editing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div>
                    <label className="block text-[9px] text-white/40 uppercase mb-1">Staff Custody Stock (Units)</label>
                    <input
                      type="number"
                      min="0"
                      value={alloc.stock}
                      onChange={(e) => handleUpdateStock(alloc.id, e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#0A101D] px-3 py-1.5 text-white font-mono outline-none focus:border-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-white/40 uppercase mb-1">Staff Shelf / Bin Location</label>
                    <input
                      type="text"
                      value={alloc.bin}
                      onChange={(e) => handleUpdateBin(alloc.id, e.target.value)}
                      placeholder="e.g. Shelf A-02"
                      className="w-full rounded-lg border border-white/10 bg-[#0A101D] px-3 py-1.5 text-white font-mono outline-none focus:border-blue"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Staff Allocation Form */}
        <form onSubmit={handleAddAllocation} className="bg-[#05080f] border border-white/10 p-4 rounded-xl space-y-3">
          <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-white/60">+ Assign Stock to New Staff Member / Location</h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm font-mono">
            <div>
              <label className="block text-[10px] text-white/40 mb-1">Staff Name</label>
              <input
                type="text"
                required
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="e.g. Maria Santos"
                className="w-full rounded-lg border border-white/10 bg-[#0A101D] px-3 py-2 text-white outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-[10px] text-white/40 mb-1">Location / Hub</label>
              <input
                type="text"
                required
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. Alabang Hub"
                className="w-full rounded-lg border border-white/10 bg-[#0A101D] px-3 py-2 text-white outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-[10px] text-white/40 mb-1">Assigned Units</label>
              <input
                type="number"
                min="1"
                value={newStock}
                onChange={(e) => setNewStock(Number(e.target.value))}
                className="w-full rounded-lg border border-white/10 bg-[#0A101D] px-3 py-2 text-white outline-none focus:border-blue"
              />
            </div>

            <div>
              <label className="block text-[10px] text-white/40 mb-1">Bin / Shelf</label>
              <input
                type="text"
                value={newBin}
                onChange={(e) => setNewBin(e.target.value)}
                placeholder="e.g. Bin C-01"
                className="w-full rounded-lg border border-white/10 bg-[#0A101D] px-3 py-2 text-white outline-none focus:border-blue"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue hover:bg-blue/90 text-white font-bold text-sm py-2 rounded-lg transition-all shadow-md shadow-blue/20"
          >
            + Assign Custody Allocation
          </button>
        </form>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white/70 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-blue text-sm font-bold text-white hover:bg-blue/90 shadow-lg shadow-blue/20"
          >
            💾 Save Staff Inventory Allocations
          </button>
        </div>

      </div>
    </div>
  )
}
