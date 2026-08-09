import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export function getExpiryHealth(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return { status: 'NONE', color: 'slate', text: 'No Expiry Set', daysLeft: 999 }
  }
  
  const expiry = new Date(dateString)
  if (isNaN(expiry.getTime())) {
    return { status: 'NONE', color: 'slate', text: 'No Expiry Set', daysLeft: 999 }
  }

  const today = new Date()
  const diffTime = expiry.getTime() - today.getTime()
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (daysLeft <= 0) {
    return { status: 'EXPIRED', color: 'crimson', text: `Expired (${Math.abs(daysLeft)}d ago)`, daysLeft }
  } else if (daysLeft <= 30) {
    return { status: 'CRITICAL', color: 'crimson', text: `Expiring Soon (${daysLeft}d left)`, daysLeft }
  } else if (daysLeft <= 90) {
    return { status: 'WARNING', color: 'amber', text: `Nearing Expiry (${daysLeft}d left)`, daysLeft }
  } else {
    return { status: 'FRESH', color: 'forest', text: `Fresh (${daysLeft}d left)`, daysLeft }
  }
}

export default function BatchExpiryManagerModal({ product, onClose, onSaveBatches }) {
  const [batches, setBatches] = useState(() => {
    if (product && product.batches && Array.isArray(product.batches) && product.batches.length > 0) {
      return product.batches
    }
    return []
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load this product's real batches from Supabase (falls back to the initial state above)
  useEffect(() => {
    if (!supabase || !product?.sku) return
    let active = true
    supabase.from('product_batches').select('*').eq('sku', product.sku).order('expiry_date', { ascending: true })
      .then(({ data, error: loadError }) => {
        if (!active) return
        if (loadError) {
          setError(`Could not load physical lots: ${loadError.message}`)
          return
        }
        if (Array.isArray(data)) {
          setBatches(data.map((r) => ({
            id: r.id,
            box_code: r.box_code || '',
            batch_code: r.batch_code || '',
            qty: r.quantity ?? 0,
            reserved_quantity: r.reserved_quantity ?? 0,
            expiry_date: r.expiry_date || '',
            landed_date: r.landed_date || '',
            hub: r.hub || '',
            custodian: r.custodian || '',
            channel: r.channel || '',
            is_pinned: !!r.is_pinned,
            inventory_status: r.inventory_status || 'available',
            clearance_approved_at: r.clearance_approved_at || null,
          })))
        }
      })
    return () => { active = false }
  }, [product?.sku])

  // New Batch Form State
  const [newBoxCode, setNewBoxCode] = useState('')
  const [newQty, setNewQty] = useState(1)
  const [newExpiryDate, setNewExpiryDate] = useState('')
  const [newHub, setNewHub] = useState('')
  const [newCustodian, setNewCustodian] = useState('')
  const [newChannel, setNewChannel] = useState('')

  const handleUpdateBatchField = (id, field, value) => {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b))
  }

  const handleTogglePin = (id) => {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, is_pinned: !b.is_pinned } : b))
  }

  const handleClearanceApproval = async batch => {
    if (String(batch.id).startsWith('new-')) {
      setError('Save the physical lot before recording a clearance approval.')
      return
    }
    const approving = !batch.clearance_approved_at
    const reason = window.prompt(approving
      ? 'Record why this 31–89 day lot is approved for disclosed clearance sale.'
      : 'Record why the clearance approval is being withdrawn.')
    if (!reason?.trim()) return
    setSaving(true); setError('')
    const { data, error: approvalError } = await supabase.rpc('set_batch_clearance_approval', {
      p_batch_id: batch.id,
      p_approved: approving,
      p_reason: reason.trim(),
    })
    setSaving(false)
    if (approvalError) { setError(approvalError.message); return }
    const saved = Array.isArray(data) ? data[0] : data
    if (saved) setBatches(previous => previous.map(item => item.id === saved.id ? {
      ...item,
      inventory_status: saved.inventory_status,
      clearance_approved_at: saved.clearance_approved_at,
    } : item))
  }

  const handleAddBatch = (e) => {
    e.preventDefault()
    if (!newBoxCode.trim() || !newExpiryDate || newQty <= 0) return

    const newBatch = {
      id: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      box_code: newBoxCode.trim(),
      batch_code: newBoxCode.trim(),
      qty: Number(newQty),
      expiry_date: newExpiryDate,
      landed_date: new Date().toISOString().split('T')[0],
      hub: newHub,
      custodian: newCustodian,
      channel: newChannel,
      is_pinned: false,
      inventory_status: 'available',
    }

    setBatches(prev => [...prev, newBatch])
    setNewBoxCode('')
    setNewQty(1)
    setNewExpiryDate('')
    setNewHub('')
    setNewCustodian('')
    setNewChannel('')
  }

  const handleDeleteBatch = (id) => {
    setBatches(prev => prev.flatMap(batch => {
      if (batch.id !== id) return [batch]
      if (String(batch.id).startsWith('new-')) return []
      return [{ ...batch, qty: 0, inventory_status: 'depleted' }]
    }))
  }

  const handleSave = async () => {
    const sku = product?.sku || product?.id
    setError('')
    setSaving(true)
    if (!supabase || !sku) {
      setError('Database connection is unavailable. Nothing was saved.')
      setSaving(false)
      return
    }
    if (supabase && sku) {
      const rows = batches
        .map((b) => ({
          id: String(b.id).startsWith('new-') ? null : b.id,
          box_code: b.box_code || null,
          batch_code: b.batch_code || b.box_code || null,
          quantity: Number(b.qty) || 0,
          expiry_date: b.expiry_date || null,
          landed_date: b.landed_date || null,
          hub: b.hub || null,
          custodian: b.custodian || null,
          channel: b.channel || null,
          is_pinned: !!b.is_pinned,
          inventory_status: b.inventory_status || null,
        }))
      const { error: saveError } = await supabase.rpc('reconcile_product_batches', {
        p_sku: sku,
        p_batches: rows,
        p_reason: 'Batch editor reconciliation',
      })
      if (saveError) {
        setError(saveError.message)
        setSaving(false)
        return
      }
    }
    if (onSaveBatches && product) onSaveBatches(sku, batches)
    setSaving(false)
    onClose()
  }

  const totalBatchStock = batches.reduce((sum, b) => sum + (Number(b.qty) || 0), 0)

  // FEFO order always wins. Pins are visual follow-up markers only.
  const sortedBatches = [...batches].sort((a, b) => {
    const aDate = a.expiry_date ? new Date(a.expiry_date).getTime() : Number.MAX_SAFE_INTEGER
    const bDate = b.expiry_date ? new Date(b.expiry_date).getTime() : Number.MAX_SAFE_INTEGER
    return aDate - bDate
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-adm-surface border border-adm-line rounded-adm p-4 sm:p-6 text-white space-y-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-adm-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-forest/20 text-forest px-2 py-0.5 rounded border border-forest/30 uppercase">
                FEFO Multi-Batch & Item Expiration Editor
              </span>
              <span className="text-sm text-white/50">SKU: {product?.sku || product?.id || 'N/A'}</span>
            </div>
            <h2 className="font-serif text-xl font-bold text-white mt-1">{product?.name || product?.title || 'Product Batch Editor'}</h2>
            <p className="text-sm text-white/60">Total Batch Stock: <span className="text-forest font-bold font-mono">{totalBatchStock} units</span> across {batches.length} box shipment batches.</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-adm-sm bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Existing Batches List with Inline Editing & Pinning */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white/50">
              Active Shipment Boxes & Expiration Dates (Editable)
            </h3>
            <span className="text-xs font-mono text-amber">Pins flag follow-up only; dispatch remains FEFO.</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {sortedBatches.map((b) => {
              const health = getExpiryHealth(b.expiry_date)
              return (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-adm-sm border text-sm font-mono transition-all space-y-3 ${
                    b.is_pinned ? 'bg-amber/10 border-amber/50 shadow-md' : 'bg-white/5 border-adm-line'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-adm-line pb-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(b.id)}
                        className={`px-2 py-0.5 rounded text-xs font-bold border transition-all ${
                          b.is_pinned ? 'bg-amber text-navy border-amber font-extrabold' : 'bg-white/5 border-adm-line text-white/60 hover:text-white'
                        }`}
                        title="Flag this batch for staff attention"
                      >
                        {b.is_pinned ? '📌 Attention flagged' : '📌 Flag attention'}
                      </button>
                      <span className="text-white/60 text-xs">ID: {b.id}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                        health.color === 'crimson' ? 'bg-crimson/20 border-crimson/40 text-crimson animate-pulse' :
                        health.color === 'amber' ? 'bg-amber/20 border-amber/40 text-amber' :
                        'bg-forest/20 border-forest/40 text-forest'
                      }`}>
                        {health.text}
                      </span>
                      {health.status === 'WARNING' && <button type="button" disabled={saving} onClick={() => handleClearanceApproval(b)} className={`rounded border px-2 py-1 text-[10px] font-bold ${b.clearance_approved_at ? 'border-forest/40 bg-forest/10 text-forest' : 'border-amber/40 bg-amber/10 text-amber'}`}>{b.clearance_approved_at ? 'Clearance approved' : 'Approve clearance'}</button>}

                      <button
                        type="button"
                        onClick={() => handleDeleteBatch(b.id)}
                        className="text-white/55 hover:text-crimson transition-colors p-1"
                        title="Remove Batch"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Inline Editable Fields for this specific batch */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-white/60 uppercase mb-1">Cargo Box Code</label>
                      <input
                        type="text"
                        value={b.box_code}
                        onChange={(e) => handleUpdateBatchField(b.id, 'box_code', e.target.value)}
                        className="w-full rounded-adm-sm border border-adm-line bg-adm-surface px-2.5 py-1.5 text-white font-mono outline-none focus:border-amber"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-white/60 uppercase mb-1">Quantity (Pcs)</label>
                      <input
                        type="number"
                        value={b.qty}
                        onChange={(e) => handleUpdateBatchField(b.id, 'qty', Number(e.target.value))}
                        className="w-full rounded-adm-sm border border-adm-line bg-adm-surface px-2.5 py-1.5 text-white font-mono outline-none focus:border-amber"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-white/60 uppercase mb-1">Expiration Date</label>
                      <input
                        type="date"
                        value={b.expiry_date}
                        onChange={(e) => handleUpdateBatchField(b.id, 'expiry_date', e.target.value)}
                        className="w-full rounded-adm-sm border border-adm-line bg-adm-surface px-2.5 py-1.5 text-white font-mono outline-none focus:border-amber"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 uppercase mb-1">Inventory disposition</label>
                      <select
                        value={b.inventory_status || 'available'}
                        onChange={(e) => handleUpdateBatchField(b.id, 'inventory_status', e.target.value)}
                        className="w-full rounded-adm-sm border border-adm-line bg-adm-surface px-2.5 py-1.5 text-white font-mono outline-none focus:border-amber"
                      >
                        <option value="available">Available</option>
                        <option value="quarantine">Quarantine</option>
                        <option value="damaged">Damaged</option>
                        <option value="expired">Expired</option>
                        <option value="unaccounted">Unaccounted</option>
                        <option value="depleted">Depleted</option>
                      </select>
                      {Number(b.reserved_quantity || 0) > 0 && <p className="mt-1 text-[10px] text-amber">{b.reserved_quantity} unit(s) reserved</p>}
                    </div>
                  </div>

                  {/* Where it is · Who holds it · Which channel */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-white/60 uppercase mb-1">📍 Location / Hub</label>
                      <input
                        type="text"
                        value={b.hub || ''}
                        placeholder="e.g. Manila Hub"
                        onChange={(e) => handleUpdateBatchField(b.id, 'hub', e.target.value)}
                        className="w-full rounded-adm-sm border border-adm-line bg-adm-surface px-2.5 py-1.5 text-white font-mono outline-none focus:border-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-white/60 uppercase mb-1">🙋 Held By (Staff)</label>
                      <input
                        type="text"
                        value={b.custodian || ''}
                        placeholder="e.g. Ate Rose"
                        onChange={(e) => handleUpdateBatchField(b.id, 'custodian', e.target.value)}
                        className="w-full rounded-adm-sm border border-adm-line bg-adm-surface px-2.5 py-1.5 text-white font-mono outline-none focus:border-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-white/60 uppercase mb-1">🛒 Channel / Platform</label>
                      <input
                        type="text"
                        value={b.channel || ''}
                        placeholder="e.g. Shopee"
                        onChange={(e) => handleUpdateBatchField(b.id, 'channel', e.target.value)}
                        className="w-full rounded-adm-sm border border-adm-line bg-adm-surface px-2.5 py-1.5 text-white font-mono outline-none focus:border-blue"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {error && <p role="alert" className="rounded-adm-sm border border-crimson/40 bg-crimson/10 p-3 text-sm text-crimson">{error}</p>}

        {/* Add New Batch Box Form */}
        <form onSubmit={handleAddBatch} className="bg-adm-sunken border border-adm-line p-4 rounded-adm-sm space-y-3">
          <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-white/60">+ Add an incoming box batch</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm font-mono">
            <div>
              <label className="block text-xs text-white/60 mb-1">Box / Cargo Code</label>
              <input
                type="text"
                required
                value={newBoxCode}
                onChange={(e) => setNewBoxCode(e.target.value)}
                placeholder="e.g. MIL-BOX-104"
                className="w-full rounded-adm-sm border border-adm-line bg-adm-surface px-3 py-2 text-white outline-none focus:border-forest"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">Box Quantity (Pcs)</label>
              <input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(Number(e.target.value))}
                className="w-full rounded-adm-sm border border-adm-line bg-adm-surface px-3 py-2 text-white outline-none focus:border-forest"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">Batch Expiration Date</label>
              <input
                type="date"
                required
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
                className="w-full rounded-adm-sm border border-adm-line bg-adm-surface px-3 py-2 text-white outline-none focus:border-forest"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">📍 Location / Hub</label>
              <input
                type="text"
                value={newHub}
                onChange={(e) => setNewHub(e.target.value)}
                placeholder="e.g. Manila Hub"
                className="w-full rounded-adm-sm border border-adm-line bg-adm-surface px-3 py-2 text-white outline-none focus:border-forest"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">🙋 Held By (Staff)</label>
              <input
                type="text"
                value={newCustodian}
                onChange={(e) => setNewCustodian(e.target.value)}
                placeholder="e.g. Ate Rose"
                className="w-full rounded-adm-sm border border-adm-line bg-adm-surface px-3 py-2 text-white outline-none focus:border-forest"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">🛒 Channel / Platform</label>
              <input
                type="text"
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                placeholder="e.g. Shopee"
                className="w-full rounded-adm-sm border border-adm-line bg-adm-surface px-3 py-2 text-white outline-none focus:border-forest"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-forest hover:bg-forest/90 text-white font-bold text-sm py-2 rounded-adm-sm transition-all"
          >
            + Register Batch Box
          </button>
        </form>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-adm-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-adm-sm bg-white/5 border border-adm-line text-sm font-semibold text-neutral-300 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="min-h-11 px-6 py-2 rounded-adm-sm bg-forest text-sm font-bold text-white hover:bg-forest/90 shadow-lg shadow-forest/20 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save batch reconciliation'}
          </button>
        </div>

      </div>
    </div>
  )
}
