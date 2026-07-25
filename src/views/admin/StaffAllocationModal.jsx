import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'

// ============================================================================
// Staff custody & multi-location stock allocation.
//
// What this screen is actually claiming: "these named people are physically
// holding this many units of this SKU, in these places." That claim has to be
// true, so this component:
//   • loads real staff from user_profiles instead of inventing custodians
//   • loads real allocations from staff_allocations and writes them back
//   • reconciles the allocated total against products.stock_available and
//     shows the variance rather than quietly disagreeing with inventory
// ============================================================================

const emptyDraft = { staff_name: '', location: '', stock: 1, bin: '' }

export default function StaffAllocationModal({ product, onClose, onSaveAllocations }) {
  const sku = product?.sku || product?.id || null
  const onHand = Number(product?.stock_available ?? product?.stock ?? 0)

  const [allocations, setAllocations] = useState([])
  const [staffOptions, setStaffOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [transferFromId, setTransferFromId] = useState('')
  const [transferToId, setTransferToId] = useState('')
  const [transferQty, setTransferQty] = useState(1)
  const [transferMessage, setTransferMessage] = useState(null)

  const [draft, setDraft] = useState(emptyDraft)

  // ── Load real custody records + real staff ─────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setLoadError('')

      if (!supabase || !sku) {
        // Offline / preview mode: start empty rather than fabricating people.
        if (!cancelled) { setAllocations([]); setStaffOptions([]); setLoading(false) }
        return
      }

      const [allocRes, staffRes] = await Promise.all([
        supabase.from('staff_allocations').select('*').eq('sku', sku).order('created_at', { ascending: true }),
        supabase.from('user_profiles').select('id, email, role').in('role', ['Admin', 'Staff']).order('created_at', { ascending: true }),
      ])

      if (cancelled) return

      if (allocRes.error) {
        setLoadError(
          allocRes.error.message.includes('does not exist')
            ? 'Custody table missing — run migration 20260725_staff_custody_allocations.sql in Supabase.'
            : allocRes.error.message
        )
        setAllocations([])
      } else {
        setAllocations((allocRes.data || []).map(a => ({
          id: a.id,
          staff_user_id: a.staff_user_id,
          staff_name: a.staff_name,
          location: a.location || '',
          bin: a.bin || '',
          stock: Number(a.stock) || 0,
        })))
      }

      setStaffOptions(staffRes.error ? [] : (staffRes.data || []))
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [sku])

  // Keep the transfer selects pointed at rows that still exist. Previously
  // these were seeded once from allocations[0]/[1] and went stale the moment a
  // custodian was removed, making the transfer button a silent no-op.
  useEffect(() => {
    const ids = allocations.map(a => a.id)
    if (!ids.includes(transferFromId)) setTransferFromId(ids[0] || '')
    if (!ids.includes(transferToId)) setTransferToId(ids[1] || ids[0] || '')
  }, [allocations]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalAllocated = useMemo(
    () => allocations.reduce((sum, a) => sum + (Number(a.stock) || 0), 0),
    [allocations]
  )
  const variance = onHand - totalAllocated

  const flash = (error, text, ms = 4000) => {
    setTransferMessage({ error, text })
    setTimeout(() => setTransferMessage(null), ms)
  }

  const handleUpdate = (id, patch) =>
    setAllocations(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)))

  // ── Transfer custody between two staff ─────────────────────────────────────
  const handleTransfer = (e) => {
    e.preventDefault()
    const qty = Number(transferQty)

    if (!transferFromId || !transferToId) return flash(true, '⚠️ Pick both a source and a destination custodian.')
    if (transferFromId === transferToId) return flash(true, '⚠️ Source and destination are the same person.')
    if (!Number.isFinite(qty) || qty <= 0) return flash(true, '⚠️ Transfer quantity must be at least 1.')

    const source = allocations.find(a => a.id === transferFromId)
    const dest = allocations.find(a => a.id === transferToId)
    if (!source || !dest) return flash(true, '⚠️ That custodian is no longer on this SKU.')

    if (source.stock < qty) {
      return flash(true, `⚠️ ${source.staff_name} only holds ${source.stock} unit(s). Cannot transfer ${qty}.`)
    }

    setAllocations(prev => prev.map(a => {
      if (a.id === transferFromId) return { ...a, stock: a.stock - qty }
      if (a.id === transferToId) return { ...a, stock: a.stock + qty }
      return a
    }))
    flash(false, `⚡ Moved ${qty} unit(s): ${source.staff_name} → ${dest.staff_name}. Save to commit.`)
  }

  // ── Add a custodian ────────────────────────────────────────────────────────
  const handleAdd = (e) => {
    e.preventDefault()
    const name = draft.staff_name.trim()
    const qty = Number(draft.stock)

    if (!name) return flash(true, '⚠️ Pick a staff member.')
    if (!Number.isFinite(qty) || qty <= 0) return flash(true, '⚠️ Assigned units must be at least 1.')
    if (allocations.some(a => a.staff_name === name)) {
      return flash(true, `⚠️ ${name} already holds custody of this SKU — edit their row instead.`)
    }
    if (totalAllocated + qty > onHand && onHand > 0) {
      return flash(true, `⚠️ That would allocate ${totalAllocated + qty} of ${onHand} on hand.`)
    }

    const match = staffOptions.find(s => s.email === name)
    setAllocations(prev => [...prev, {
      id: (crypto?.randomUUID?.() || `tmp-${Date.now()}`),
      staff_user_id: match?.id || null,
      staff_name: name,
      location: draft.location.trim(),
      bin: draft.bin.trim() || 'General Shelf',
      stock: qty,
      _new: true,
    }])
    setDraft(emptyDraft)
  }

  const handleDelete = (id) => setAllocations(prev => prev.filter(a => a.id !== id))

  // ── Persist ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!sku) return
    setSaving(true)

    if (supabase) {
      // Replace this SKU's custody set in one shot — simplest correct sync.
      const del = await supabase.from('staff_allocations').delete().eq('sku', sku)
      if (del.error) {
        setSaving(false)
        return flash(true, `⚠️ Save failed: ${del.error.message}`, 6000)
      }

      if (allocations.length > 0) {
        const ins = await supabase.from('staff_allocations').insert(
          allocations.map(a => ({
            sku,
            staff_user_id: a.staff_user_id || null,
            staff_name: a.staff_name,
            location: a.location || null,
            bin: a.bin || null,
            stock: Number(a.stock) || 0,
          }))
        )
        if (ins.error) {
          setSaving(false)
          return flash(true, `⚠️ Save failed: ${ins.error.message}`, 6000)
        }
      }
    }

    setSaving(false)
    onSaveAllocations?.(sku, allocations)
    onClose()
  }

  const fieldCls = 'w-full rounded-adm-sm border border-adm-line bg-adm-raised px-3 min-h-[44px] text-base text-white outline-none focus:border-blue'
  const labelCls = 'block text-xs text-white/60 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md sm:p-4">
      <div className="flex w-full sm:max-w-3xl max-h-[92dvh] flex-col overflow-hidden bg-adm-surface border border-adm-line rounded-t-adm sm:rounded-adm text-white shadow-adm-float">

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-adm-line bg-adm-sunken px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-xs font-mono font-bold text-blue uppercase tracking-wide">Staff custody & locations</p>
            <h2 className="text-base font-bold text-white mt-0.5 truncate">{product?.name || product?.title || 'Product Stock Allocation'}</h2>
            <p className="text-xs text-white/50 font-mono truncate">SKU: {sku || 'N/A'}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="shrink-0 -mr-1 flex h-11 w-11 items-center justify-center rounded-adm-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors">✕</button>
        </div>

        {/* Reconciliation strip — allocated vs. on hand, always visible */}
        <div className="shrink-0 grid grid-cols-3 divide-x divide-adm-line border-b border-adm-line bg-adm-sunken text-center">
          <div className="px-2 py-2">
            <p className="text-[11px] uppercase tracking-wide text-white/45">On hand</p>
            <p className="text-base font-bold font-mono tabular-nums text-white">{onHand}</p>
          </div>
          <div className="px-2 py-2">
            <p className="text-[11px] uppercase tracking-wide text-white/45">Allocated</p>
            <p className="text-base font-bold font-mono tabular-nums text-blue">{totalAllocated}</p>
          </div>
          <div className="px-2 py-2">
            <p className="text-[11px] uppercase tracking-wide text-white/45">
              {variance === 0 ? 'Balanced' : variance > 0 ? 'Unassigned' : 'Over-allocated'}
            </p>
            <p className={`text-base font-bold font-mono tabular-nums ${
              variance === 0 ? 'text-forest' : variance > 0 ? 'text-amber' : 'text-crimson'
            }`}>{variance > 0 ? `+${variance}` : variance}</p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-4">

          {loadError && (
            <div className="rounded-adm-sm border border-crimson/40 bg-crimson/10 p-3 text-sm text-crimson font-semibold leading-snug">
              ⚠️ {loadError}
            </div>
          )}
          {variance < 0 && (
            <div className="rounded-adm-sm border border-crimson/40 bg-crimson/10 p-3 text-sm text-crimson leading-snug">
              ⚠️ Staff are holding {Math.abs(variance)} more unit(s) than inventory says exist. Recount before saving.
            </div>
          )}

          {transferMessage && (
            <div className={`rounded-adm-sm border p-3 text-sm font-mono leading-snug ${
              transferMessage.error
                ? 'bg-crimson/15 border-crimson/40 text-crimson'
                : 'bg-forest/15 border-forest/40 text-forest font-bold'
            }`}>
              {transferMessage.text}
            </div>
          )}

          {loading ? (
            <p className="py-8 text-center text-sm text-white/50">Loading custody records…</p>
          ) : (
            <>
              {/* Transfer between custodians */}
              {allocations.length >= 2 && (
                <form onSubmit={handleTransfer} className="rounded-adm-sm border border-amber/40 bg-adm-sunken p-3 space-y-2.5">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber">⚡ Re-assign custody</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className={labelCls}>From</label>
                      <select value={transferFromId} onChange={e => setTransferFromId(e.target.value)} className={fieldCls}>
                        {allocations.map(a => <option key={a.id} value={a.id}>{a.staff_name} ({a.stock} held)</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>To</label>
                      <select value={transferToId} onChange={e => setTransferToId(e.target.value)} className={fieldCls}>
                        {allocations.map(a => <option key={a.id} value={a.id}>{a.staff_name} ({a.stock} held)</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number" min="1" inputMode="numeric"
                      value={transferQty}
                      onChange={e => setTransferQty(e.target.value)}
                      className={`${fieldCls} w-20 shrink-0`}
                      aria-label="Transfer quantity"
                    />
                    <button type="submit" className="flex-1 min-h-[44px] rounded-adm-sm bg-amber hover:bg-amber/90 text-navy font-extrabold text-sm transition-colors">
                      Transfer
                    </button>
                  </div>
                </form>
              )}

              {/* Custodian list */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white/45">
                  Custodians ({allocations.length})
                </h3>

                {allocations.length === 0 && (
                  <div className="rounded-adm-sm border border-adm-line bg-adm-sunken p-5 text-center">
                    <p className="text-sm font-semibold text-white">No custody assigned</p>
                    <p className="mt-1 text-xs text-white/45 leading-relaxed">
                      All {onHand} unit(s) are unassigned. Add a custodian below.
                    </p>
                  </div>
                )}

                {allocations.map(alloc => (
                  <div key={alloc.id} className="rounded-adm-sm border border-adm-line bg-white/5 p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm truncate">{alloc.staff_name}</p>
                        <p className="text-white/50 text-xs truncate">{alloc.location || 'No location set'}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`px-2 py-1 rounded-adm-sm text-[11px] font-bold border ${
                          alloc.stock > 0 ? 'bg-forest/20 border-forest/40 text-forest' : 'bg-crimson/20 border-crimson/40 text-crimson'
                        }`}>
                          {alloc.stock > 0 ? `${alloc.stock} units` : 'Empty'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(alloc.id)}
                          title={`Remove ${alloc.staff_name}`}
                          className="flex h-11 w-11 items-center justify-center rounded-adm-sm text-white/45 hover:text-crimson hover:bg-crimson/10 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/5">
                      <div>
                        <label className={labelCls}>Units held</label>
                        <input
                          type="number" min="0" inputMode="numeric"
                          value={alloc.stock}
                          onChange={e => handleUpdate(alloc.id, { stock: Math.max(0, Number(e.target.value) || 0) })}
                          className={fieldCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Bin / shelf</label>
                        <input
                          type="text"
                          value={alloc.bin}
                          onChange={e => handleUpdate(alloc.id, { bin: e.target.value })}
                          placeholder="e.g. A-02"
                          className={fieldCls}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add custodian — staff come from user_profiles, not from a
                  hardcoded list of invented names. */}
              <form onSubmit={handleAdd} className="rounded-adm-sm border border-adm-line bg-adm-sunken p-3 space-y-2.5">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white/55">+ Assign custody</h4>

                <div>
                  <label className={labelCls}>Staff member</label>
                  {staffOptions.length > 0 ? (
                    <select
                      value={draft.staff_name}
                      onChange={e => setDraft(d => ({ ...d, staff_name: e.target.value }))}
                      className={fieldCls}
                    >
                      <option value="">Select staff…</option>
                      {staffOptions
                        .filter(s => !allocations.some(a => a.staff_name === s.email))
                        .map(s => <option key={s.id} value={s.email}>{s.email} · {s.role}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={draft.staff_name}
                      onChange={e => setDraft(d => ({ ...d, staff_name: e.target.value }))}
                      placeholder="Staff name"
                      className={fieldCls}
                    />
                  )}
                  {staffOptions.length === 0 && !loading && (
                    <p className="mt-1 text-xs text-white/35">No staff accounts found — invite them under Staff &amp; Roles.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>Location / hub</label>
                    <input type="text" value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))} placeholder="e.g. Makati Hub" className={fieldCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Units</label>
                    <input type="number" min="1" inputMode="numeric" value={draft.stock} onChange={e => setDraft(d => ({ ...d, stock: e.target.value }))} className={fieldCls} />
                  </div>
                </div>

                <button type="submit" className="w-full min-h-[44px] rounded-adm-sm bg-blue hover:bg-blue-deep text-white font-bold text-sm transition-colors">
                  + Assign custody
                </button>
              </form>
            </>
          )}
        </div>

        {/* Sticky footer */}
        <div
          className="flex shrink-0 items-center gap-2 border-t border-adm-line bg-adm-sunken px-3.5 py-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button type="button" onClick={onClose} className="min-h-[44px] px-4 rounded-adm-sm bg-white/5 border border-adm-line text-sm font-semibold text-neutral-300 hover:bg-white/10 transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || !!loadError}
            className="flex-1 min-h-[44px] rounded-adm-sm bg-blue hover:bg-blue-deep text-sm font-bold text-white transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save custody'}
          </button>
        </div>
      </div>
    </div>
  )
}
