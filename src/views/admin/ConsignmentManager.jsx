import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAdminStore as useStore } from '../../context/AdminStoreContext'
import { AlertIcon, BarcodeIcon, CheckIcon, PlaneIcon } from '../../components/ui/icons'
import ConsignmentScannerModal from './ConsignmentScannerModal'
import DiscrepancyReconciliationModal from './DiscrepancyReconciliationModal'
import {
  addConsignmentLineBff, adminBffEnabled, advanceConsignmentBff,
  createConsignmentBff, finalizeConsignmentBff, getAdminConsignments,
  recordConsignmentScanBff,
} from '../../services/adminBffService'

export default function ConsignmentManager() {
  const { products } = useStore()
  const secureConsignments = adminBffEnabled()
  const [manifest, setManifest] = useState(null)
  const [manifests, setManifests] = useState([])
  const [selectedManifestId, setSelectedManifestId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showLine, setShowLine] = useState(false)
  const [scannerStage, setScannerStage] = useState(null)
  const [showReconcile, setShowReconcile] = useState(false)
  const [advanceTarget, setAdvanceTarget] = useState('')
  const [advanceReason, setAdvanceReason] = useState('')
  const [working, setWorking] = useState(false)
  const [create, setCreate] = useState({ manifestCode: `K2-${new Date().toISOString().slice(0, 7)}`, flightNumber: '' })
  const [line, setLine] = useState({ sku: '', batchCode: '', boxCode: '', bestBefore: '', packedQty: '1' })
  const commandKeysRef = useRef(new Map())

  const operationKey = (slot, fingerprint) => {
    const existing = commandKeysRef.current.get(slot)
    if (existing?.fingerprint === fingerprint) return existing.key
    const key = crypto.randomUUID()
    commandKeysRef.current.set(slot, { fingerprint, key })
    return key
  }
  const completeOperation = slot => commandKeysRef.current.delete(slot)

  const load = useCallback(async () => {
    if (!secureConsignments && !supabase) { setError('The consignment service is not configured.'); setLoading(false); return }
    const result = secureConsignments
      ? await getAdminConsignments()
      : await supabase.from('consignments').select('*, consignment_items(*)').order('created_at', { ascending: false }).limit(100)
    const nextManifests = secureConsignments ? result.data?.consignments : result.data
    const loadError = secureConsignments ? (!result.ok ? result.error : '') : result.error
    if (loadError) setError(secureConsignments ? loadError : 'Flight and consignment records could not be loaded.')
    else {
      const records = nextManifests || []
      const selected = records.find(item => item.id === selectedManifestId) || records[0] || null
      setManifests(records)
      setManifest(selected)
      setSelectedManifestId(selected?.id || '')
      setError('')
    }
    setLoading(false)
  }, [selectedManifestId, secureConsignments])

  useEffect(() => {
    load()
    if (secureConsignments) {
      const timer = window.setInterval(() => {
        if (document.visibilityState === 'visible') load()
      }, 15000)
      return () => window.clearInterval(timer)
    }
    if (!supabase) return undefined
    const channel = supabase.channel('admin:consignment')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consignments' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consignment_items' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [load, secureConsignments])

  const items = manifest?.consignment_items || []
  const packed = items.reduce((sum, item) => sum + item.italy_packed_qty, 0)
  const scanned = items.reduce((sum, item) => sum + item.manila_scanned_qty, 0)
  const missing = Math.max(packed - scanned, 0)
  const bySku = useMemo(() => Object.fromEntries((products || []).map(product => [product.sku, product])), [products])
  const displayItems = useMemo(() => items.map(item => ({ ...item, name: bySku[item.sku]?.name || item.sku })), [items, bySku])

  const createManifest = async (event) => {
    event.preventDefault(); setWorking(true); setError(''); setNotice('')
    const payload = { manifestCode: create.manifestCode.trim(), shipmentReference: create.flightNumber.trim() }
    const fingerprint = JSON.stringify(payload)
    const slot = 'create'
    const result = secureConsignments
      ? await createConsignmentBff(payload, operationKey(slot, fingerprint))
      : await supabase.rpc('create_consignment_manifest', {
          p_manifest_code: payload.manifestCode, p_shipment_reference: payload.shipmentReference || null,
        })
    setWorking(false)
    const createError = secureConsignments ? (!result.ok ? result.error : '') : result.error
    if (createError) { setError(secureConsignments ? createError : 'The manifest could not be created.'); return }
    completeOperation(slot)
    const saved = secureConsignments ? result.result : (Array.isArray(result.data) ? result.data[0] : result.data)
    const savedId = saved?.consignmentId || saved?.id
    if (savedId) setSelectedManifestId(savedId)
    setShowCreate(false); setNotice('Manifest created in Packing Italy state.'); await load()
  }

  const addLine = async (event) => {
    event.preventDefault(); setWorking(true); setError(''); setNotice('')
    const payload = {
      consignmentId: manifest.id, sku: line.sku, batchCode: line.batchCode.trim(),
      boxCode: line.boxCode.trim(), bestBeforeDate: line.bestBefore, expectedQty: Number(line.packedQty),
    }
    const fingerprint = JSON.stringify(payload)
    const slot = `line:${manifest.id}`
    const result = secureConsignments
      ? await addConsignmentLineBff(payload, operationKey(slot, fingerprint))
      : await supabase.rpc('add_consignment_item_v2', {
          p_consignment_id: payload.consignmentId, p_sku: payload.sku,
          p_batch_code: payload.batchCode, p_box_code: payload.boxCode,
          p_best_before_date: payload.bestBeforeDate, p_expected_qty: payload.expectedQty,
        })
    setWorking(false)
    const lineError = secureConsignments ? (!result.ok ? result.error : '') : result.error
    if (lineError) { setError(secureConsignments ? lineError : 'The manifest line could not be saved.'); return }
    completeOperation(slot)
    setLine({ sku: '', batchCode: '', boxCode: '', bestBefore: '', packedQty: '1' }); setShowLine(false); setNotice('Manifest box and lot line saved.'); await load()
  }

  const scan = async (codeOrSku, stage, selectedItemId = null) => {
    const clean = String(codeOrSku || '').trim()
    const product = (products || []).find(candidate => candidate.sku?.toLowerCase() === clean.toLowerCase() || (candidate.barcode && String(candidate.barcode) === clean))
    const matches = items.filter(item => item.sku.toLowerCase() === clean.toLowerCase() || item.sku === product?.sku)
    const manifestItem = selectedItemId
      ? matches.find(item => item.id === selectedItemId)
      : matches.find(item => stage === 'milan'
        ? item.italy_packed_qty < item.expected_qty
        : item.manila_scanned_qty < item.italy_packed_qty)
    if (!manifestItem) throw new Error(`Barcode or SKU ${clean} is not on this manifest. Add the manifest line before scanning it.`)
    setWorking(true); setError(''); setNotice('')
    const payload = { consignmentId: manifest.id, itemId: manifestItem.id, stage, scannedCode: clean }
    const fingerprint = JSON.stringify(payload)
    const slot = `scan:${manifest.id}:${stage}:${manifestItem.id}`
    const result = secureConsignments
      ? await recordConsignmentScanBff(payload, operationKey(slot, fingerprint))
      : await supabase.rpc('record_consignment_item_scan', {
          p_consignment_id: payload.consignmentId, p_consignment_item_id: payload.itemId, p_stage: payload.stage,
        })
    setWorking(false)
    const scanError = secureConsignments ? (!result.ok ? result.error : '') : result.error
    if (scanError) { setError(secureConsignments ? scanError : 'The scan could not be recorded.'); throw new Error(secureConsignments ? scanError : 'The scan could not be recorded.') }
    completeOperation(slot)
    const serverItem = secureConsignments ? result.result : (Array.isArray(result.data) ? result.data[0] : result.data)
    const updated = secureConsignments ? {
      ...manifestItem, status: serverItem.status,
      italy_packed_qty: Number(serverItem.italyPackedQty),
      manila_scanned_qty: Number(serverItem.manilaScannedQty),
    } : serverItem
    if (updated) setManifest(current => ({ ...current, consignment_items: (current.consignment_items || []).map(item => item.id === updated.id ? updated : item) }))
    setNotice(`${manifestItem.sku} / ${manifestItem.box_code} recorded for ${stage === 'milan' ? 'Milan packing' : 'Manila receiving'}.`)
    return { ...(updated || manifestItem), name: bySku[manifestItem.sku]?.name || manifestItem.sku }
  }

  const advance = async (toStatus, reason) => {
    setWorking(true); setError(''); setNotice('')
    const payload = { consignmentId: manifest.id, toStatus, reason: reason.trim() }
    const fingerprint = JSON.stringify(payload)
    const slot = `advance:${manifest.id}:${toStatus}`
    const result = secureConsignments
      ? await advanceConsignmentBff(payload, operationKey(slot, fingerprint))
      : await supabase.rpc('advance_consignment', { p_consignment_id: manifest.id, p_to_status: toStatus })
    setWorking(false)
    const advanceError = secureConsignments ? (!result.ok ? result.error : '') : result.error
    if (advanceError) { setError(secureConsignments ? advanceError : 'The consignment state could not be changed.'); return false }
    completeOperation(slot)
    setAdvanceTarget(''); setAdvanceReason('')
    setNotice(`Consignment moved to ${toStatus.replaceAll('_', ' ')}.`); await load()
    return true
  }

  const finalize = async (notes = '') => {
    const finalNotes = notes.trim() || (missing === 0 ? 'All scanned units matched the Milan packed count.' : '')
    if (finalNotes.length < 10) throw new Error('Describe the arrival discrepancy before finalizing. No inventory was changed.')
    setWorking(true); setError(''); setNotice('')
    const payload = { consignmentId: manifest.id, notes: finalNotes }
    const fingerprint = JSON.stringify(payload)
    const slot = `finalize:${manifest.id}`
    const result = secureConsignments
      ? await finalizeConsignmentBff(payload, operationKey(slot, fingerprint))
      : await supabase.rpc('finalize_consignment_receipt', { p_consignment_id: manifest.id, p_notes: finalNotes })
    setWorking(false)
    const finalError = secureConsignments ? (!result.ok ? result.error : '') : result.error
    if (finalError) {
      const safeError = secureConsignments ? finalError : 'The receipt could not be finalized. No inventory was changed.'
      setError(safeError)
      throw new Error(safeError)
    }
    completeOperation(slot)
    setNotice('Receipt finalized atomically. Scanned batches and inventory events were recorded.'); setShowReconcile(false); await load()
    return true
  }

  const submitAdvance = async event => {
    event.preventDefault()
    if (advanceReason.trim().length < 10) {
      setError('Record a specific reason of at least 10 characters before changing custody state.')
      return
    }
    await advance(advanceTarget, advanceReason)
  }

  const closeEditor = () => {
    setShowCreate(false); setShowLine(false); setAdvanceTarget(''); setAdvanceReason('')
  }

  const input = 'min-h-11 w-full rounded-adm-sm border border-adm-line bg-adm-sunken px-3 py-2 text-base text-white outline-none focus:border-blue'

  if (loading) return <div className="rounded-adm border border-adm-line bg-adm-surface p-10 text-center text-sm text-white/55">Loading latest consignment…</div>

  return <div className="mx-auto max-w-7xl space-y-5 text-white">
    <div className="rounded-adm border border-adm-line bg-adm-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-gold">Italy to Philippines custody</p>
      <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="font-sans text-2xl font-bold">Consignment receiving</h1><p className="mt-1 max-w-2xl text-sm text-white/55">Every flight, box, lot, and unit scan remains identifiable from Milan packing through Manila recount.</p></div><button onClick={() => setShowCreate(true)} className="min-h-11 rounded-adm-sm bg-blue px-5 text-sm font-bold">Create manifest</button></div>
      {manifests.length > 0 && <label className="mt-4 block max-w-md text-xs font-semibold text-white/55">Working manifest<select className={`${input} mt-1.5`} value={selectedManifestId} onChange={event => { const id = event.target.value; setSelectedManifestId(id); setManifest(manifests.find(item => item.id === id) || null) }}>{manifests.map(item => <option key={item.id} value={item.id}>{item.manifest_code} · {item.status.replaceAll('_', ' ')}</option>)}</select></label>}
    </div>

    {(error || notice) && <div role={error ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-adm-sm border p-3 text-sm ${error ? 'border-crimson/40 bg-crimson/10 text-crimson' : 'border-forest/40 bg-forest/10 text-forest'}`}>{error ? <AlertIcon size={17} /> : <CheckIcon size={17} />}<span>{error || notice}</span></div>}

    {!manifest ? <div className="rounded-adm border border-dashed border-adm-line bg-adm-surface p-12 text-center"><PlaneIcon size={28} className="mx-auto text-white/35" /><p className="mt-3 text-sm font-semibold">No consignment manifests found</p><p className="mt-1 text-xs text-white/45">Create a real manifest when the next packing cycle begins.</p></div> : <>
      <section className="rounded-adm border border-adm-line bg-adm-surface p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><p className="font-mono text-xs font-bold text-gold">{manifest.manifest_code}</p><h2 className="mt-1 font-sans text-xl font-bold">{manifest.flight_number}</h2><p className="mt-1 text-sm text-white/50">{manifest.departure_city} → {manifest.destination_city}</p></div><span className="w-fit rounded-full border border-blue/30 bg-blue/10 px-3 py-1.5 text-xs font-semibold text-blue">{manifest.status.replaceAll('_', ' ')}</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Milan packed" value={packed} /><Metric label="Manila scanned" value={scanned} /><Metric label="Difference" value={missing} warn={missing > 0} /></div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-adm-line pt-5">
          {manifest.status === 'Packing_Italy' && <>
            <button onClick={() => setShowLine(true)} className="min-h-11 rounded-adm-sm border border-adm-line bg-white/5 px-4 text-sm font-semibold">Add manifest SKU</button>
            <button disabled={working || items.length === 0} onClick={() => setScannerStage('milan')} className="inline-flex min-h-11 items-center gap-2 rounded-adm-sm bg-crimson px-4 text-sm font-bold disabled:opacity-40"><BarcodeIcon size={16} /> Start Milan scan</button>
            <button disabled={working || items.length === 0} onClick={() => setAdvanceTarget('In_Transit')} className="min-h-11 rounded-adm-sm bg-blue px-4 text-sm font-bold active:scale-[0.98] disabled:opacity-40">Close packing and mark in transit</button>
          </>}
          {manifest.status === 'In_Transit' && <button disabled={working} onClick={() => setAdvanceTarget('Arrived_Manila')} className="min-h-11 rounded-adm-sm bg-blue px-4 text-sm font-bold active:scale-[0.98]">Mark arrived in Manila</button>}
          {manifest.status === 'Arrived_Manila' && <>
            <button disabled={working || packed === 0} onClick={() => setScannerStage('manila')} className="inline-flex min-h-11 items-center gap-2 rounded-adm-sm bg-forest px-4 text-sm font-bold disabled:opacity-40"><BarcodeIcon size={16} /> Start Manila recount</button>
            <button disabled={working || scanned === 0} onClick={() => setShowReconcile(true)} className="min-h-11 rounded-adm-sm border border-forest/35 bg-forest/10 px-4 text-sm font-bold text-forest disabled:opacity-40">Review and finalize</button>
          </>}
        </div>
      </section>

      <section className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
        <div className="flex items-center justify-between border-b border-adm-line bg-adm-sunken px-4 py-3"><h3 className="text-sm font-semibold">Manifest box and lot lines</h3><span className="text-xs text-white/45">{items.length} lines</span></div>
        {items.length > 0 && <div className="flex gap-2 overflow-x-auto border-b border-adm-line px-4 py-3">{items.map(item => <div key={`box-${item.id}`} className="min-w-48 rounded-adm-sm border border-adm-line bg-white/[0.03] px-3 py-2"><p className="font-mono text-xs font-bold text-blue">{item.box_code}</p><p className="mt-1 text-xs text-white/50">{item.batch_code} · {item.sku}</p></div>)}</div>}
        {items.length === 0 ? <p className="p-8 text-center text-sm text-white/45">No SKUs on this manifest yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-white/45"><tr><th className="px-4 py-3">SKU / product</th><th className="px-4 py-3">Batch</th><th className="px-4 py-3">Best before</th><th className="px-4 py-3 text-center">Expected</th><th className="px-4 py-3 text-center">Milan packed</th><th className="px-4 py-3 text-center">Manila received</th><th className="px-4 py-3 text-right">Record scan</th></tr></thead><tbody className="divide-y divide-adm-line">{items.map(item => <tr key={item.id}><td className="px-4 py-3"><p className="font-mono text-xs font-bold">{item.sku}</p><p className="mt-0.5 text-xs text-white/45">{bySku[item.sku]?.name || item.sku}</p></td><td className="px-4 py-3 font-mono text-xs text-white/60">{item.batch_code}</td><td className="px-4 py-3 text-white/60">{item.best_before_date}</td><td className="px-4 py-3 text-center font-semibold">{item.expected_qty}</td><td className="px-4 py-3 text-center font-semibold">{item.italy_packed_qty}</td><td className="px-4 py-3 text-center font-semibold text-forest">{item.manila_scanned_qty}</td><td className="px-4 py-3 text-right">{manifest.status === 'Packing_Italy' ? <button disabled={working || item.italy_packed_qty >= item.expected_qty} onClick={() => scan(item.sku, 'milan').catch(() => {})} className="min-h-11 rounded-adm-sm border border-blue/35 bg-blue/10 px-3 text-xs font-semibold text-blue disabled:opacity-35">+1 Milan packed</button> : manifest.status === 'Arrived_Manila' ? <button disabled={working || item.manila_scanned_qty >= item.italy_packed_qty} onClick={() => scan(item.sku, 'manila').catch(() => {})} className="min-h-11 rounded-adm-sm border border-forest/35 bg-forest/10 px-3 text-xs font-semibold text-forest disabled:opacity-35">+1 Manila received</button> : <span className="text-xs text-white/35">Scanning closed</span>}</td></tr>)}</tbody></table></div>}
      </section>
    </>}

    <ConsignmentScannerModal
      isOpen={Boolean(scannerStage)}
      stage={scannerStage || 'milan'}
      items={displayItems}
      onScan={(code, itemId) => scan(code, scannerStage, itemId)}
      onClose={() => setScannerStage(null)}
      onDone={() => {
        const completedStage = scannerStage
        setScannerStage(null)
        if (completedStage === 'manila') setShowReconcile(true)
      }}
    />

    <DiscrepancyReconciliationModal
      isOpen={showReconcile}
      onClose={() => setShowReconcile(false)}
      consignment={manifest}
      items={displayItems}
      onFinalizeArrival={finalize}
    />

    {(showCreate || showLine || advanceTarget) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md" role="dialog" aria-modal="true">
      <form onSubmit={advanceTarget ? submitAdvance : showCreate ? createManifest : addLine} className="w-full max-w-md space-y-4 rounded-adm border border-adm-line bg-adm-surface p-6">
        <h2 className="font-sans text-xl font-bold">{advanceTarget ? (advanceTarget === 'In_Transit' ? 'Close Milan packing' : 'Confirm Manila arrival') : showCreate ? 'Create consignment manifest' : 'Add manifest SKU'}</h2>
        {advanceTarget ? <>
          <p className="text-sm leading-relaxed text-white/55">{advanceTarget === 'In_Transit' ? 'This closes Milan scanning. Every expected unit must already be scan-packed.' : 'This opens the independent Manila recount. Milan counts will not be copied as received.'}</p>
          <Field label="Custody / state-change reason"><textarea minLength={10} maxLength={500} className={`${input} min-h-24 resize-y`} value={advanceReason} onChange={event => setAdvanceReason(event.target.value)} placeholder="Record who confirmed the handoff or arrival and the physical evidence checked" required /></Field>
        </> : showCreate ? <>
          <Field label="Manifest code"><input className={input} value={create.manifestCode} onChange={e => setCreate(current => ({ ...current, manifestCode: e.target.value }))} minLength={3} maxLength={80} required /></Field>
          <Field label="Flight or shipment reference"><input className={input} value={create.flightNumber} onChange={e => setCreate(current => ({ ...current, flightNumber: e.target.value }))} maxLength={120} placeholder="Record only confirmed details" /></Field>
        </> : <>
          <Field label="Product SKU"><select className={input} value={line.sku} onChange={e => setLine(current => ({ ...current, sku: e.target.value }))} required><option value="">Select a product</option>{(products || []).map(product => <option key={product.sku} value={product.sku}>{product.sku} · {product.name}</option>)}</select></Field>
          <Field label="Batch / lot code"><input className={input} value={line.batchCode} onChange={e => setLine(current => ({ ...current, batchCode: e.target.value }))} maxLength={120} required /></Field>
          <Field label="Physical box code"><input className={input} value={line.boxCode} onChange={e => setLine(current => ({ ...current, boxCode: e.target.value }))} maxLength={120} required /></Field>
          <Field label="Best-before date"><input className={input} type="date" value={line.bestBefore} onChange={e => setLine(current => ({ ...current, bestBefore: e.target.value }))} required /></Field>
          <Field label="Expected quantity"><input className={input} type="number" min="1" max="100000" value={line.packedQty} onChange={e => setLine(current => ({ ...current, packedQty: e.target.value }))} required /></Field>
        </>}
        <div className="flex gap-2 pt-2"><button type="button" onClick={closeEditor} className="min-h-11 flex-1 rounded-adm-sm border border-adm-line bg-white/5 text-sm font-semibold active:scale-[0.98]">Cancel</button><button type="submit" disabled={working} className="min-h-11 flex-1 rounded-adm-sm bg-blue text-sm font-bold active:scale-[0.98] disabled:opacity-40">{working ? 'Saving…' : advanceTarget ? 'Confirm state change' : 'Save'}</button></div>
      </form>
    </div>}
  </div>
}

function Field({ label, children }) { return <label className="block text-xs font-semibold text-white/60">{label}<span className="mt-1.5 block">{children}</span></label> }
function Metric({ label, value, warn }) { return <div className="rounded-adm-sm border border-adm-line bg-black/15 p-4"><p className="text-xs text-white/45">{label}</p><p className={`mt-1 text-2xl font-semibold ${warn ? 'text-crimson' : 'text-white'}`}>{value}</p></div> }
