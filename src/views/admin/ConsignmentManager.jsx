import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useStore } from '../../context/StoreContext'
import { AlertIcon, BarcodeIcon, CheckIcon, PlaneIcon } from '../../components/ui/icons'
import ConsignmentScannerModal from './ConsignmentScannerModal'
import DiscrepancyReconciliationModal from './DiscrepancyReconciliationModal'

export default function ConsignmentManager() {
  const { products } = useStore()
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
  const [working, setWorking] = useState(false)
  const [create, setCreate] = useState({ manifestCode: `K2-${new Date().toISOString().slice(0, 7)}`, flightNumber: '' })
  const [line, setLine] = useState({ sku: '', batchCode: '', boxCode: '', bestBefore: '', packedQty: '1' })

  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return }
    const { data, error: loadError } = await supabase.from('consignments')
      .select('*, consignment_items(*)').order('created_at', { ascending: false }).limit(100)
    if (loadError) setError(loadError.message)
    else {
      const nextManifests = data || []
      const selected = nextManifests.find(item => item.id === selectedManifestId) || nextManifests[0] || null
      setManifests(nextManifests)
      setManifest(selected)
      setSelectedManifestId(selected?.id || '')
      setError('')
    }
    setLoading(false)
  }, [selectedManifestId])

  useEffect(() => {
    load()
    if (!supabase) return undefined
    const channel = supabase.channel('admin:consignment')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consignments' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consignment_items' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [load])

  const items = manifest?.consignment_items || []
  const packed = items.reduce((sum, item) => sum + item.italy_packed_qty, 0)
  const scanned = items.reduce((sum, item) => sum + item.manila_scanned_qty, 0)
  const missing = Math.max(packed - scanned, 0)
  const bySku = useMemo(() => Object.fromEntries((products || []).map(product => [product.sku, product])), [products])
  const displayItems = useMemo(() => items.map(item => ({ ...item, name: bySku[item.sku]?.name || item.sku })), [items, bySku])

  const createManifest = async (event) => {
    event.preventDefault(); setWorking(true); setError(''); setNotice('')
    const { data, error: createError } = await supabase.rpc('create_consignment_manifest', {
      p_manifest_code: create.manifestCode.trim(),
      p_shipment_reference: create.flightNumber.trim() || null,
    })
    setWorking(false)
    if (createError) { setError(createError.message); return }
    const saved = Array.isArray(data) ? data[0] : data
    if (saved?.id) setSelectedManifestId(saved.id)
    setShowCreate(false); setNotice('Manifest created in Packing Italy state.'); await load()
  }

  const addLine = async (event) => {
    event.preventDefault(); setWorking(true); setError(''); setNotice('')
    const { error: lineError } = await supabase.rpc('add_consignment_item_v2', {
      p_consignment_id: manifest.id,
      p_sku: line.sku,
      p_batch_code: line.batchCode.trim(),
      p_box_code: line.boxCode.trim(),
      p_best_before_date: line.bestBefore,
      p_expected_qty: Number(line.packedQty),
    })
    setWorking(false)
    if (lineError) { setError(lineError.message); return }
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
    const { data, error: scanError } = await supabase.rpc('record_consignment_item_scan', {
      p_consignment_id: manifest.id,
      p_consignment_item_id: manifestItem.id,
      p_stage: stage,
    })
    setWorking(false)
    if (scanError) { setError(scanError.message); throw scanError }
    const updated = Array.isArray(data) ? data[0] : data
    if (updated) setManifest(current => ({ ...current, consignment_items: (current.consignment_items || []).map(item => item.id === updated.id ? updated : item) }))
    setNotice(`${manifestItem.sku} / ${manifestItem.box_code} recorded for ${stage === 'milan' ? 'Milan packing' : 'Manila receiving'}.`)
    return { ...(updated || manifestItem), name: bySku[manifestItem.sku]?.name || manifestItem.sku }
  }

  const advance = async (toStatus) => {
    setWorking(true); setError(''); setNotice('')
    const { error: advanceError } = await supabase.rpc('advance_consignment', { p_consignment_id: manifest.id, p_to_status: toStatus })
    setWorking(false)
    if (advanceError) { setError(advanceError.message); return }
    setNotice(`Consignment moved to ${toStatus.replaceAll('_', ' ')}.`); await load()
  }

  const finalize = async (notes = '') => {
    const message = missing > 0
      ? `Finalize with ${missing} unit${missing === 1 ? '' : 's'} missing on arrival? The discrepancy will be recorded.`
      : 'Finalize this receipt and add scanned units to inventory?'
    if (!window.confirm(message)) return false
    setWorking(true); setError(''); setNotice('')
    const { error: finalError } = await supabase.rpc('finalize_consignment_receipt', {
      p_consignment_id: manifest.id,
      p_notes: notes.trim() || (missing > 0 ? `Finalized with ${missing} missing unit(s)` : 'All scanned units reconciled'),
    })
    setWorking(false)
    if (finalError) {
      setError(finalError.message)
      throw finalError
    }
    setNotice('Receipt finalized atomically. Scanned batches and inventory events were recorded.'); setShowReconcile(false); await load()
    return true
  }

  const input = 'min-h-11 w-full rounded-adm-sm border border-adm-line bg-adm-sunken px-3 py-2 text-base text-white outline-none focus:border-blue'

  if (loading) return <div className="rounded-adm border border-adm-line bg-adm-surface p-10 text-center text-sm text-white/55">Loading latest consignment…</div>

  return <div className="mx-auto max-w-7xl space-y-5 text-white">
    <div className="rounded-adm border border-adm-line bg-adm-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-gold">Italy to Philippines custody</p>
      <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="font-serif text-2xl font-bold">Consignment receiving</h1><p className="mt-1 max-w-2xl text-sm text-white/55">Every flight, box, lot, and unit scan remains identifiable from Milan packing through Manila recount.</p></div><button onClick={() => setShowCreate(true)} className="min-h-11 rounded-adm-sm bg-blue px-5 text-sm font-bold">Create manifest</button></div>
      {manifests.length > 0 && <label className="mt-4 block max-w-md text-xs font-semibold text-white/55">Working manifest<select className={`${input} mt-1.5`} value={selectedManifestId} onChange={event => { const id = event.target.value; setSelectedManifestId(id); setManifest(manifests.find(item => item.id === id) || null) }}>{manifests.map(item => <option key={item.id} value={item.id}>{item.manifest_code} · {item.status.replaceAll('_', ' ')}</option>)}</select></label>}
    </div>

    {(error || notice) && <div role={error ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-adm-sm border p-3 text-sm ${error ? 'border-crimson/40 bg-crimson/10 text-crimson' : 'border-forest/40 bg-forest/10 text-forest'}`}>{error ? <AlertIcon size={17} /> : <CheckIcon size={17} />}<span>{error || notice}</span></div>}

    {!manifest ? <div className="rounded-adm border border-dashed border-adm-line bg-adm-surface p-12 text-center"><PlaneIcon size={28} className="mx-auto text-white/35" /><p className="mt-3 text-sm font-semibold">No consignment manifests found</p><p className="mt-1 text-xs text-white/45">Create a real manifest when the next packing cycle begins.</p></div> : <>
      <section className="rounded-adm border border-adm-line bg-adm-surface p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><p className="font-mono text-xs font-bold text-gold">{manifest.manifest_code}</p><h2 className="mt-1 font-serif text-xl font-bold">{manifest.flight_number}</h2><p className="mt-1 text-sm text-white/50">{manifest.departure_city} → {manifest.destination_city}</p></div><span className="w-fit rounded-full border border-blue/30 bg-blue/10 px-3 py-1.5 text-xs font-semibold text-blue">{manifest.status.replaceAll('_', ' ')}</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Milan packed" value={packed} /><Metric label="Manila scanned" value={scanned} /><Metric label="Difference" value={missing} warn={missing > 0} /></div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-adm-line pt-5">
          {manifest.status === 'Packing_Italy' && <>
            <button onClick={() => setShowLine(true)} className="min-h-11 rounded-adm-sm border border-adm-line bg-white/5 px-4 text-sm font-semibold">Add manifest SKU</button>
            <button disabled={working || items.length === 0} onClick={() => setScannerStage('milan')} className="inline-flex min-h-11 items-center gap-2 rounded-adm-sm bg-crimson px-4 text-sm font-bold disabled:opacity-40"><BarcodeIcon size={16} /> Start Milan scan</button>
            <button disabled={working || items.length === 0} onClick={() => advance('In_Transit')} className="min-h-11 rounded-adm-sm bg-blue px-4 text-sm font-bold disabled:opacity-40">Close packing and mark in transit</button>
          </>}
          {manifest.status === 'In_Transit' && <button disabled={working} onClick={() => advance('Arrived_Manila')} className="min-h-11 rounded-adm-sm bg-blue px-4 text-sm font-bold">Mark arrived in Manila</button>}
          {manifest.status === 'Arrived_Manila' && <>
            <button disabled={working || packed === 0} onClick={() => setScannerStage('manila')} className="inline-flex min-h-11 items-center gap-2 rounded-adm-sm bg-forest px-4 text-sm font-bold disabled:opacity-40"><BarcodeIcon size={16} /> Start Manila recount</button>
            <button disabled={working || scanned === 0} onClick={() => setShowReconcile(true)} className="min-h-11 rounded-adm-sm border border-forest/35 bg-forest/10 px-4 text-sm font-bold text-forest disabled:opacity-40">Review and finalize</button>
          </>}
        </div>
      </section>

      <section className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
        <div className="flex items-center justify-between border-b border-adm-line bg-adm-sunken px-4 py-3"><h3 className="text-sm font-semibold">Manifest box and lot lines</h3><span className="text-xs text-white/45">{items.length} lines</span></div>
        {items.length > 0 && <div className="flex gap-2 overflow-x-auto border-b border-adm-line px-4 py-3">{items.map(item => <div key={`box-${item.id}`} className="min-w-48 rounded-adm-sm border border-adm-line bg-white/[0.03] px-3 py-2"><p className="font-mono text-xs font-bold text-blue">{item.box_code}</p><p className="mt-1 text-[11px] text-white/50">{item.batch_code} · {item.sku}</p></div>)}</div>}
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

    {(showCreate || showLine) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md" role="dialog" aria-modal="true">
      <form onSubmit={showCreate ? createManifest : addLine} className="w-full max-w-md space-y-4 rounded-adm border border-adm-line bg-adm-surface p-6">
        <h2 className="font-serif text-xl font-bold">{showCreate ? 'Create consignment manifest' : 'Add manifest SKU'}</h2>
        {showCreate ? <>
          <Field label="Manifest code"><input className={input} value={create.manifestCode} onChange={e => setCreate(current => ({ ...current, manifestCode: e.target.value }))} required /></Field>
          <Field label="Flight or shipment reference"><input className={input} value={create.flightNumber} onChange={e => setCreate(current => ({ ...current, flightNumber: e.target.value }))} placeholder="Record only confirmed details" /></Field>
        </> : <>
          <Field label="Product SKU"><select className={input} value={line.sku} onChange={e => setLine(current => ({ ...current, sku: e.target.value }))} required><option value="">Select a product</option>{(products || []).map(product => <option key={product.sku} value={product.sku}>{product.sku} · {product.name}</option>)}</select></Field>
          <Field label="Batch / lot code"><input className={input} value={line.batchCode} onChange={e => setLine(current => ({ ...current, batchCode: e.target.value }))} required /></Field>
          <Field label="Physical box code"><input className={input} value={line.boxCode} onChange={e => setLine(current => ({ ...current, boxCode: e.target.value }))} required /></Field>
          <Field label="Best-before date"><input className={input} type="date" value={line.bestBefore} onChange={e => setLine(current => ({ ...current, bestBefore: e.target.value }))} required /></Field>
          <Field label="Expected quantity"><input className={input} type="number" min="1" value={line.packedQty} onChange={e => setLine(current => ({ ...current, packedQty: e.target.value }))} required /></Field>
        </>}
        <div className="flex gap-2 pt-2"><button type="button" onClick={() => { setShowCreate(false); setShowLine(false) }} className="min-h-11 flex-1 rounded-adm-sm border border-adm-line bg-white/5 text-sm font-semibold">Cancel</button><button type="submit" disabled={working} className="min-h-11 flex-1 rounded-adm-sm bg-blue text-sm font-bold disabled:opacity-40">{working ? 'Saving…' : 'Save'}</button></div>
      </form>
    </div>}
  </div>
}

function Field({ label, children }) { return <label className="block text-xs font-semibold text-white/60">{label}<span className="mt-1.5 block">{children}</span></label> }
function Metric({ label, value, warn }) { return <div className="rounded-adm-sm border border-adm-line bg-black/15 p-4"><p className="text-xs text-white/45">{label}</p><p className={`mt-1 text-2xl font-semibold ${warn ? 'text-crimson' : 'text-white'}`}>{value}</p></div> }
