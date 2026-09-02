import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  adminBffEnabled, getAdminLots, reconcileLotsBff, setLotClearanceBff,
} from '../../services/adminBffService'
import { AlertIcon, CheckIcon, MinusIcon, PlusIcon, XIcon } from '../../components/ui/icons'
import FefoWorkflowDiagram from '../../components/admin/guides/FefoWorkflowDiagram'
import CustodyWorkflowDiagram from '../../components/admin/guides/CustodyWorkflowDiagram'
import { AdminDialog } from '../../components/ui/AdminDialog'

const STATUSES = ['available', 'quarantine', 'damaged', 'expired', 'unaccounted', 'depleted']

function todayUtc() {
  return new Date().toISOString().slice(0, 10)
}

export function getExpiryHealth(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return { status: 'NONE', tone: 'neutral', text: 'Expiry missing', daysLeft: null }
  }
  const expiry = Date.parse(`${dateString}T00:00:00Z`)
  const today = Date.parse(`${todayUtc()}T00:00:00Z`)
  if (Number.isNaN(expiry)) return { status: 'NONE', tone: 'neutral', text: 'Expiry invalid', daysLeft: null }
  const daysLeft = Math.round((expiry - today) / 86_400_000)
  if (daysLeft < 0) return { status: 'EXPIRED', tone: 'danger', text: `Expired ${Math.abs(daysLeft)}d ago`, daysLeft }
  if (daysLeft <= 30) return { status: 'CRITICAL', tone: 'danger', text: daysLeft === 0 ? 'Expires today' : `${daysLeft}d left · quarantine`, daysLeft }
  if (daysLeft <= 89) return { status: 'WARNING', tone: 'warning', text: `${daysLeft}d left · clearance only`, daysLeft }
  return { status: 'FRESH', tone: 'safe', text: `${daysLeft}d left`, daysLeft }
}

function mapLot(row) {
  return {
    id: row.id,
    box_code: row.box_code || '',
    batch_code: row.batch_code || '',
    qty: Number(row.quantity || 0),
    quantity_available: Number(row.quantity_available || 0),
    reserved_quantity: Number(row.reserved_quantity || 0),
    expiry_date: row.expiry_date || row.best_before_date || '',
    landed_date: row.landed_date || '',
    hub: row.hub || '',
    custodian: row.custodian || '',
    channel: row.channel || '',
    is_pinned: Boolean(row.is_pinned),
    inventory_status: row.inventory_status || 'quarantine',
    clearance_approved_at: row.clearance_approved_at || null,
  }
}

function sellablePreview(lot) {
  const health = getExpiryHealth(lot.expiry_date)
  const eligible = lot.inventory_status === 'available' && (
    health.daysLeft >= 90 || (health.daysLeft >= 31 && health.daysLeft <= 89 && lot.clearance_approved_at)
  )
  return eligible ? Math.max(Number(lot.qty || 0) - Number(lot.reserved_quantity || 0), 0) : 0
}

const inputClass = 'min-h-11 w-full rounded-adm-sm border border-adm-line bg-adm-raised px-3 py-2 text-sm text-white outline-none transition-[border-color,box-shadow] duration-150 focus:border-blue focus:ring-2 focus:ring-blue/20 disabled:opacity-50'
const labelClass = 'mb-1.5 block text-xs font-semibold text-white/70'

export default function BatchExpiryManagerModal({ product, onClose, onSaveBatches }) {
  const sku = product?.sku || product?.id || ''
  const secure = adminBffEnabled()
  const [batches, setBatches] = useState(() => Array.isArray(product?.batches) ? product.batches.map(mapLot) : [])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [clearance, setClearance] = useState(null)
  const [clearanceReason, setClearanceReason] = useState('')
  const [showGuide, setShowGuide] = useState(null) // null | 'fefo' | 'custody'
  const [newLot, setNewLot] = useState({ box: '', batch: '', quantity: 1, expiry: '', hub: '', custodian: '', channel: '' })
  const reconcileKey = useRef(null)
  const clearanceKeys = useRef(new Map())

  useEffect(() => {
    if (!sku) return undefined
    const controller = new AbortController()
    let active = true
    async function load() {
      setLoading(true); setError('')
      if (secure) {
        const result = await getAdminLots(sku, controller.signal)
        if (!active || result.aborted) return
        if (!result.ok) setError(result.error)
        else setBatches((result.data?.lots || []).map(mapLot))
      } else if (supabase) {
        const result = await supabase.from('product_batches')
          .select('id,sku,box_code,batch_code,quantity,quantity_available,reserved_quantity,expiry_date,best_before_date,landed_date,hub,custodian,channel,is_pinned,inventory_status,clearance_approved_at')
          .eq('sku', sku).order('expiry_date', { ascending: true })
        if (!active) return
        if (result.error) setError('Physical lots could not be loaded. Refresh and try again.')
        else setBatches((result.data || []).map(mapLot))
      } else {
        setError('Inventory service is unavailable. Nothing can be changed.')
      }
      if (active) setLoading(false)
    }
    load()
    return () => { active = false; controller.abort() }
  }, [secure, sku])

  const sortedBatches = useMemo(() => [...batches].sort((a, b) => {
    const aDate = a.expiry_date || '9999-12-31'
    const bDate = b.expiry_date || '9999-12-31'
    return aDate.localeCompare(bDate)
  }), [batches])
  const totals = useMemo(() => batches.reduce((sum, lot) => ({
    physical: sum.physical + Number(lot.qty || 0),
    reserved: sum.reserved + Number(lot.reserved_quantity || 0),
    sellable: sum.sellable + sellablePreview(lot),
  }), { physical: 0, reserved: 0, sellable: 0 }), [batches])

  const updateLot = (id, field, value) => {
    setBatches((current) => current.map((lot) => lot.id === id ? { ...lot, [field]: value } : lot))
    setError('')
  }

  const addLot = (event) => {
    event.preventDefault()
    const quantity = Number(newLot.quantity)
    if (!newLot.box.trim() || !newLot.batch.trim() || !newLot.expiry || !newLot.hub.trim() || !newLot.custodian.trim()
        || !Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
      setError('Complete box, batch, quantity, expiry, hub, and custodian before adding the lot.')
      return
    }
    const health = getExpiryHealth(newLot.expiry)
    setBatches((current) => [...current, {
      id: `new-${crypto.randomUUID()}`, box_code: newLot.box.trim(), batch_code: newLot.batch.trim(),
      qty: quantity, quantity_available: 0, reserved_quantity: 0, expiry_date: newLot.expiry,
      landed_date: todayUtc(), hub: newLot.hub.trim(), custodian: newLot.custodian.trim(),
      channel: newLot.channel.trim(), is_pinned: false,
      inventory_status: health.daysLeft >= 90 ? 'available' : 'quarantine', clearance_approved_at: null,
    }])
    setNewLot({ box: '', batch: '', quantity: 1, expiry: '', hub: '', custodian: '', channel: '' })
    setError('')
  }

  const requestClearance = (lot) => {
    setClearance({ id: lot.id, approved: !lot.clearance_approved_at })
    setClearanceReason('')
    setError('')
  }

  const saveClearance = async () => {
    if (!clearance || clearanceReason.trim().length < 10) {
      setError('Explain the clearance decision in at least 10 characters.')
      return
    }
    setSaving(true); setError('')
    const keyName = `${clearance.id}:${clearance.approved}`
    const operationKey = clearanceKeys.current.get(keyName) || crypto.randomUUID()
    clearanceKeys.current.set(keyName, operationKey)
    let result
    if (secure) {
      result = await setLotClearanceBff({ batchId: clearance.id, approved: clearance.approved, reason: clearanceReason.trim() }, operationKey)
    } else if (supabase) {
      const direct = await supabase.rpc('set_batch_clearance_approval', {
        p_batch_id: clearance.id, p_approved: clearance.approved, p_reason: clearanceReason.trim(),
      })
      result = direct.error ? { ok: false, error: 'The clearance decision could not be saved safely.' } : { ok: true, result: Array.isArray(direct.data) ? direct.data[0] : direct.data }
    } else result = { ok: false, error: 'Inventory service is unavailable.' }
    setSaving(false)
    if (!result.ok) { setError(result.error); return }
    clearanceKeys.current.delete(keyName)
    setBatches((current) => current.map((lot) => lot.id === clearance.id ? {
      ...lot,
      inventory_status: clearance.approved ? 'available' : 'quarantine',
      clearance_approved_at: clearance.approved ? new Date().toISOString() : null,
      quantity_available: clearance.approved ? Math.max(lot.qty - lot.reserved_quantity, 0) : 0,
    } : lot))
    setClearance(null); setClearanceReason('')
  }

  const saveReconciliation = async () => {
    if (reason.trim().length < 10) { setError('Record a specific reconciliation reason in at least 10 characters.'); return }
    const invalid = batches.find((lot) => Number(lot.qty) > 0 && (
      !lot.box_code.trim() || !lot.batch_code.trim() || !lot.expiry_date || !lot.hub.trim() || !lot.custodian.trim()
    ))
    if (invalid) { setError('Every positive-stock lot needs a box, batch, expiry, hub, and custodian.'); return }
    if (!secure && batches.some((lot) => Number(lot.reserved_quantity) > 0)) {
      setError('This product has reserved units. Reconciliation is locked until the secure Admin boundary is activated, preventing reservation corruption.')
      return
    }
    setSaving(true); setError('')
    const rows = batches.map((lot) => ({
      id: String(lot.id).startsWith('new-') ? null : lot.id,
      boxCode: lot.box_code.trim(), batchCode: lot.batch_code.trim(), quantity: Number(lot.qty),
      expiryDate: lot.expiry_date || null, landedDate: lot.landed_date || null,
      hub: lot.hub.trim(), custodian: lot.custodian.trim(), channel: lot.channel.trim(),
      pinned: Boolean(lot.is_pinned), status: lot.inventory_status,
    }))
    let result
    if (secure) {
      reconcileKey.current ||= crypto.randomUUID()
      result = await reconcileLotsBff({ sku, reason: reason.trim(), lots: rows }, reconcileKey.current)
    } else if (supabase) {
      const directRows = rows.map((lot) => ({
        id: lot.id, box_code: lot.boxCode || null, batch_code: lot.batchCode || null,
        quantity: lot.quantity, expiry_date: lot.expiryDate, landed_date: lot.landedDate,
        hub: lot.hub || null, custodian: lot.custodian || null, channel: lot.channel || null,
        is_pinned: lot.pinned, inventory_status: lot.status,
      }))
      const direct = await supabase.rpc('reconcile_product_batches', { p_sku: sku, p_batches: directRows, p_reason: reason.trim() })
      result = direct.error ? { ok: false, error: 'The lot reconciliation could not be saved safely.' } : { ok: true }
    } else result = { ok: false, error: 'Inventory service is unavailable.' }
    setSaving(false)
    if (!result.ok) { setError(result.error); return }
    reconcileKey.current = null
    onSaveBatches?.(sku, batches)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-4" role="presentation">
      <AdminDialog onClose={onClose} closeDisabled={saving} labelledBy="lot-editor-title">
      <section className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-adm border border-adm-line bg-adm-surface text-white shadow-adm-float">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-adm-line bg-adm-sunken px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white/65">Inventory lots · FEFO</p>
            <h2 id="lot-editor-title" className="mt-0.5 truncate text-xl font-bold text-white">{product?.name || product?.title || 'Physical lots'}</h2>
            <p className="mt-1 text-sm text-white/65">SKU {sku} · physical, reserved, and sellable quantities stay separate.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close lot editor" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-adm-sm text-white/70 transition-[background-color,color,transform] duration-150 hover:bg-white/8 hover:text-white active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue">
            <XIcon size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          <div className="mb-5 grid grid-cols-3 divide-x divide-adm-line rounded-adm-sm border border-adm-line bg-adm-sunken">
            {[['Physical', totals.physical], ['Reserved', totals.reserved], ['Sellable', totals.sellable]].map(([label, value]) => (
              <div key={label} className="px-3 py-3 sm:px-4"><p className="text-xs font-semibold text-white/60">{label}</p><p className="mt-0.5 text-lg font-bold tabular-nums text-white">{value}</p></div>
            ))}
          </div>

          {error && <div role="alert" className="mb-4 flex gap-3 rounded-adm-sm border border-crimson/40 bg-crimson/10 p-3 text-sm text-red-200"><AlertIcon className="mt-0.5 shrink-0" /><span>{error}</span></div>}

          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white">Lots in FEFO order</h3>
              <p className="text-sm text-white/60">Flags are reminders only. Expiry eligibility controls dispatch.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowGuide((g) => (g === 'fefo' ? null : 'fefo'))}
                className={`rounded-adm-sm border px-2.5 py-1 text-xs font-semibold transition-all ${
                  showGuide === 'fefo'
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                    : 'border-adm-line text-white/60 hover:bg-white/6 hover:text-white'
                }`}
              >
                ⏳ {showGuide === 'fefo' ? 'Hide FEFO Map' : 'FEFO Rules Map'}
              </button>
              <button
                type="button"
                onClick={() => setShowGuide((g) => (g === 'custody' ? null : 'custody'))}
                className={`rounded-adm-sm border px-2.5 py-1 text-xs font-semibold transition-all ${
                  showGuide === 'custody'
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                    : 'border-adm-line text-white/60 hover:bg-white/6 hover:text-white'
                }`}
              >
                🤝 {showGuide === 'custody' ? 'Hide Custody Map' : 'Custody Flow'}
              </button>
              <p className="text-xs font-semibold text-white/55">{secure ? 'Secure boundary prepared' : 'Current direct mode'}</p>
            </div>
          </div>

          {showGuide === 'fefo' && (
            <div className="mb-4 animate-in fade-in duration-200">
              <FefoWorkflowDiagram />
            </div>
          )}

          {showGuide === 'custody' && (
            <div className="mb-4 animate-in fade-in duration-200">
              <CustodyWorkflowDiagram />
            </div>
          )}

          {loading ? (
            <div aria-label="Loading physical lots" className="space-y-2">
              {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-adm-sm bg-white/6 motion-reduce:animate-none" />)}
            </div>
          ) : sortedBatches.length === 0 ? (
            <div className="rounded-adm-sm border border-dashed border-adm-line-strong px-4 py-10 text-center"><p className="font-semibold text-white">No physical lots recorded</p><p className="mt-1 text-sm text-white/60">Use the form below after the stock is physically verified.</p></div>
          ) : (
            <div className="divide-y divide-adm-line overflow-hidden rounded-adm-sm border border-adm-line">
              {sortedBatches.map((lot) => {
                const health = getExpiryHealth(lot.expiry_date)
                const tone = health.tone === 'danger' ? 'text-red-300' : health.tone === 'warning' ? 'text-amber' : health.tone === 'safe' ? 'text-forest' : 'text-white/60'
                return <div key={lot.id} className="bg-adm-surface p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <button type="button" onClick={() => updateLot(lot.id, 'is_pinned', !lot.is_pinned)} aria-pressed={lot.is_pinned} className={`min-h-11 rounded-adm-sm border px-3 text-sm font-semibold transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] ${lot.is_pinned ? 'border-amber/50 bg-amber/12 text-amber' : 'border-adm-line text-white/70 hover:bg-white/6'}`}><AlertIcon className="mr-1.5 inline" size={16} />{lot.is_pinned ? 'Flagged' : 'Flag'}</button>
                      <span className={`text-sm font-semibold ${tone}`}>{health.text}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {health.status === 'WARNING' && !String(lot.id).startsWith('new-') && <button type="button" disabled={saving} onClick={() => requestClearance(lot)} className="min-h-11 rounded-adm-sm border border-amber/40 px-3 text-sm font-semibold text-amber transition-[background-color,transform] duration-150 hover:bg-amber/10 active:scale-[0.97] disabled:opacity-50">{lot.clearance_approved_at ? 'Review clearance' : 'Approve clearance'}</button>}
                      <button type="button" onClick={() => String(lot.id).startsWith('new-') ? setBatches((current) => current.filter((item) => item.id !== lot.id)) : updateLot(lot.id, 'qty', 0)} aria-label={String(lot.id).startsWith('new-') ? 'Remove unsaved lot' : 'Set physical lot quantity to zero'} className="flex min-h-11 min-w-11 items-center justify-center rounded-adm-sm text-white/65 transition-[background-color,color,transform] duration-150 hover:bg-crimson/10 hover:text-red-300 active:scale-[0.97]"><MinusIcon /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div><label className={labelClass} htmlFor={`box-${lot.id}`}>Cargo box</label><input id={`box-${lot.id}`} maxLength={120} value={lot.box_code} onChange={(e) => updateLot(lot.id, 'box_code', e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass} htmlFor={`batch-${lot.id}`}>Batch code</label><input id={`batch-${lot.id}`} maxLength={120} value={lot.batch_code} onChange={(e) => updateLot(lot.id, 'batch_code', e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass} htmlFor={`qty-${lot.id}`}>Physical quantity</label><input id={`qty-${lot.id}`} type="number" min={lot.reserved_quantity} max={1_000_000} value={lot.qty} onChange={(e) => updateLot(lot.id, 'qty', Number(e.target.value))} className={inputClass} /><p className="mt-1 text-xs text-white/55">{lot.reserved_quantity} reserved · {sellablePreview(lot)} sellable</p></div>
                    <div><label className={labelClass} htmlFor={`expiry-${lot.id}`}>Best-before / expiry</label><input id={`expiry-${lot.id}`} type="date" value={lot.expiry_date} onChange={(e) => updateLot(lot.id, 'expiry_date', e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass} htmlFor={`status-${lot.id}`}>Disposition</label><select id={`status-${lot.id}`} value={lot.inventory_status} onChange={(e) => updateLot(lot.id, 'inventory_status', e.target.value)} className={inputClass}>{STATUSES.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></div>
                    <div><label className={labelClass} htmlFor={`hub-${lot.id}`}>Hub / location</label><input id={`hub-${lot.id}`} maxLength={120} value={lot.hub} onChange={(e) => updateLot(lot.id, 'hub', e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass} htmlFor={`custodian-${lot.id}`}>Custodian</label><input id={`custodian-${lot.id}`} maxLength={120} value={lot.custodian} onChange={(e) => updateLot(lot.id, 'custodian', e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass} htmlFor={`channel-${lot.id}`}>Channel allocation</label><input id={`channel-${lot.id}`} maxLength={80} value={lot.channel} onChange={(e) => updateLot(lot.id, 'channel', e.target.value)} placeholder="Optional" className={inputClass} /></div>
                  </div>

                  {clearance?.id === lot.id && <div className="mt-4 rounded-adm-sm border border-amber/35 bg-amber/8 p-3">
                    <label className={labelClass} htmlFor={`clearance-reason-${lot.id}`}>{clearance.approved ? 'Why is this lot suitable for disclosed clearance?' : 'Why is clearance approval being withdrawn?'}</label>
                    <textarea id={`clearance-reason-${lot.id}`} maxLength={500} rows={2} value={clearanceReason} onChange={(e) => setClearanceReason(e.target.value)} className={inputClass} />
                    <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setClearance(null)} className="min-h-11 rounded-adm-sm border border-adm-line px-4 text-sm font-semibold text-white/75 active:scale-[0.97]">Cancel</button><button type="button" disabled={saving || clearanceReason.trim().length < 10} onClick={saveClearance} className="min-h-11 rounded-adm-sm bg-amber px-4 text-sm font-bold text-adm-bg transition-transform duration-150 active:scale-[0.97] disabled:opacity-45"><CheckIcon className="mr-1.5 inline" />{clearance.approved ? 'Approve clearance' : 'Withdraw clearance'}</button></div>
                  </div>}
                </div>
              })}
            </div>
          )}

          <form onSubmit={addLot} className="mt-5 border-t border-adm-line pt-5">
            <h3 className="text-base font-bold text-white">Add a verified physical lot</h3>
            <p className="mt-0.5 text-sm text-white/60">Adding a row does not save it until reconciliation is confirmed below.</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div><label className={labelClass} htmlFor="new-lot-box">Cargo box</label><input id="new-lot-box" required maxLength={120} value={newLot.box} onChange={(e) => setNewLot({ ...newLot, box: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass} htmlFor="new-lot-batch">Batch code</label><input id="new-lot-batch" required maxLength={120} value={newLot.batch} onChange={(e) => setNewLot({ ...newLot, batch: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass} htmlFor="new-lot-qty">Physical quantity</label><input id="new-lot-qty" required type="number" min="1" max="1000000" value={newLot.quantity} onChange={(e) => setNewLot({ ...newLot, quantity: Number(e.target.value) })} className={inputClass} /></div>
              <div><label className={labelClass} htmlFor="new-lot-expiry">Best-before / expiry</label><input id="new-lot-expiry" required type="date" value={newLot.expiry} onChange={(e) => setNewLot({ ...newLot, expiry: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass} htmlFor="new-lot-hub">Hub / location</label><input id="new-lot-hub" required maxLength={120} value={newLot.hub} onChange={(e) => setNewLot({ ...newLot, hub: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass} htmlFor="new-lot-custodian">Custodian</label><input id="new-lot-custodian" required maxLength={120} value={newLot.custodian} onChange={(e) => setNewLot({ ...newLot, custodian: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass} htmlFor="new-lot-channel">Channel allocation</label><input id="new-lot-channel" maxLength={80} value={newLot.channel} onChange={(e) => setNewLot({ ...newLot, channel: e.target.value })} placeholder="Optional" className={inputClass} /></div>
              <button type="submit" className="min-h-11 self-end rounded-adm-sm border border-blue/45 bg-blue/12 px-4 text-sm font-bold text-blue-200 transition-[background-color,transform] duration-150 hover:bg-blue/18 active:scale-[0.97]"><PlusIcon className="mr-1.5 inline" />Add to reconciliation</button>
            </div>
          </form>
        </div>

        <footer className="shrink-0 border-t border-adm-line bg-adm-sunken px-4 py-4 sm:px-6">
          <label className={labelClass} htmlFor="reconciliation-reason">Why are these physical counts or lot details changing?</label>
          <textarea id="reconciliation-reason" maxLength={500} rows={2} value={reason} onChange={(e) => { setReason(e.target.value); setError('') }} placeholder="Example: Manila recount after shelf transfer; physical units verified against box MIL-104." className={inputClass} />
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-adm-sm border border-adm-line px-5 text-sm font-semibold text-white/75 transition-[background-color,transform] duration-150 hover:bg-white/6 active:scale-[0.97] disabled:opacity-50">Cancel</button><button type="button" onClick={saveReconciliation} disabled={saving || loading || reason.trim().length < 10} className="min-h-11 rounded-adm-sm bg-blue px-5 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-blue-deep active:scale-[0.97] disabled:opacity-45">{saving ? 'Recording reconciliation…' : 'Record reconciliation'}</button></div>
        </footer>
      </section>
      </AdminDialog>
    </div>
  )
}
