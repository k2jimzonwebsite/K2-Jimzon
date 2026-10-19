import { useEffect, useRef, useState } from 'react'
import { AdminDialog } from '../../components/ui/AdminDialog'
import { getAdminProducts, getAdminSessionBff, uploadProductMediaBff, assignProductMediaBff } from '../../services/adminBffService'
import { PHOTO_BATCH_KEY, preparePhotoBatch, readPhotoBatch, runPhotoBatch, writePhotoBatch } from '../../lib/photoCsvBatch'

const button = 'min-h-11 rounded-adm-sm border border-adm-line px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue disabled:opacity-50'
function download(name, value, type) {
  const url = URL.createObjectURL(new Blob([value], { type }))
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url)
}
function Thumbnail({ file, label }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    if (!file) { setSrc(''); return undefined }
    const next = URL.createObjectURL(file); setSrc(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return src ? <img src={src} alt={label} className="h-24 w-20 shrink-0 rounded-adm-sm bg-adm-raised object-contain" /> : <span className="text-sm text-white/75">{label}: reselect file to preview</span>
}

export default function BulkPhotoCsv({ onBack, onClose, onSaved }) {
  const [csv, setCsv] = useState('')
  const [files, setFiles] = useState([])
  const [batch, setBatch] = useState(null)
  const [saved, setSaved] = useState(false)
  const [reason, setReason] = useState('')
  const [approved, setApproved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [corrupt, setCorrupt] = useState(false)
  const active = useRef(true)
  const running = useRef(false)
  useEffect(() => {
    active.current = true
    try {
      const pending = readPhotoBatch(localStorage)
      if (pending) { setBatch(pending); setSaved(true); setReason(pending.reason) }
    } catch (failure) { setError(failure.message); setCorrupt(true) }
    return () => { active.current = false }
  }, [])
  useEffect(() => {
    if (!busy) return undefined
    const guard = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [busy])
  const completed = batch?.rows.filter(row => row.done).length || 0
  const finished = Boolean(batch && completed === batch.rows.length)
  const getActor = async () => {
    const result = await getAdminSessionBff()
    if (!result.ok || !result.user?.userId) throw Error('The staff session could not be verified. Sign in and retry this saved batch.')
    return result.user.userId
  }
  const getProducts = async () => {
    const result = await getAdminProducts()
    if (!result.ok || !Array.isArray(result.products)) throw Error('Current product photos could not be checked. Try again without changing the batch.')
    return result.products
  }
  const review = async () => {
    if (running.current) return
    running.current = true; setBusy(true); setError('')
    try {
      if (readPhotoBatch(localStorage)) throw Error('A saved photo batch needs reconciliation first. Close and reopen this review.')
      const actor = await getActor(), products = await getProducts()
      const next = await preparePhotoBatch(csv, files, products, actor)
      if (active.current) { setBatch(next); setApproved(false) }
    } catch (failure) { if (active.current) setError(failure.message) }
    finally { running.current = false; if (active.current) setBusy(false) }
  }
  const run = async () => {
    if (running.current || !batch || finished || (!saved && !approved)) return
    running.current = true; setBusy(true); setError('')
    try {
      if (!navigator.locks?.request) throw Error('Use a browser with Web Locks to protect photo-batch recovery.')
      await navigator.locks.request('k2-photo-csv-writer', { ifAvailable: true }, async lock => {
        if (!lock) throw Error('Another tab is uploading a photo batch. Continue in that tab or wait for it to stop.')
        const trimmed = reason.trim()
        const effectiveReason = trimmed.length >= 10 ? trimmed : (trimmed.length > 0 ? `Photo batch processed by admin (${trimmed})` : 'Photo batch processed by admin')
        const next = saved ? readPhotoBatch(localStorage) : { ...batch, reason: effectiveReason }
        if (!next || next.id !== batch.id) throw Error('The saved batch changed in another tab. Close and reopen to reconcile it.')
        await runPhotoBatch(next, files, {
          actor: async () => { if (!active.current) throw Error('Review closed. Reopen the saved batch to continue.'); return getActor() },
          products: getProducts, upload: uploadProductMediaBff, assign: assignProductMediaBff,
          persist(value) {
            writePhotoBatch(localStorage, value)
            if (active.current) { setSaved(true); setBatch(structuredClone(value)) }
          },
        })
        if (active.current) { setBatch(structuredClone(next)); await onSaved?.() }
      })
    } catch (failure) { if (active.current) setError(failure.message) }
    finally { running.current = false; if (active.current) setBusy(false) }
  }
  const acknowledge = async () => {
    if (running.current || !finished) return
    running.current = true; setBusy(true); setError('')
    try {
      await navigator.locks.request('k2-photo-csv-writer', { ifAvailable: true }, async lock => {
        if (!lock) throw Error('Another tab holds the photo batch. Keep the saved receipt.')
        const current = readPhotoBatch(localStorage)
        if (!current || current.id !== batch.id || await getActor() !== current.actorId || current.rows.some(row => !row.done)) throw Error('The saved receipt changed. Keep it and reopen this review.')
        localStorage.removeItem(PHOTO_BATCH_KEY)
        if (localStorage.getItem(PHOTO_BATCH_KEY) !== null) throw Error('The completed receipt could not be acknowledged.')
        if (active.current) { setBatch(null); setSaved(false); setCsv(''); setFiles([]); setReason(''); setApproved(false) }
      })
    } catch (failure) { if (active.current) setError(failure.message) }
    finally { running.current = false; if (active.current) setBusy(false) }
  }
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 sm:items-center sm:p-4">
    <AdminDialog onClose={onClose} closeDisabled={busy} labelledBy="photo-csv-title" describedBy="photo-csv-help">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-adm border border-adm-line bg-adm-surface text-white">
        <header className="flex items-start justify-between gap-3 border-b border-adm-line p-4 sm:p-5">
          <div><h2 id="photo-csv-title" className="text-xl font-semibold">Upload photos by CSV</h2><p id="photo-csv-help" className="mt-2 max-w-prose text-sm leading-6 text-white/75">Match files to existing Draft SKUs. Fill missing primary and AFTER slots; blank cells keep current photos. Product details and stock stay unchanged.</p></div>
          <button type="button" className={button} onClick={onClose} disabled={busy} aria-label="Close photo CSV review">Close</button>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {error && <p role="alert" className="rounded-adm-sm border border-crimson/50 bg-crimson/10 p-3 text-sm leading-6 text-red-200">{error}</p>}
          {saved && <p role="status" className="text-sm leading-6 text-white/85">Saved batch · {completed} of {batch?.rows.length} products verified. {finished ? 'Download the result, then acknowledge completion.' : 'Keep the original files. Retry continues from the saved receipt without repeating confirmed uploads.'}</p>}
          <fieldset disabled={busy || saved || corrupt} className="space-y-4">
            <legend className="sr-only">Photo batch inputs</legend>
            <button type="button" className={button} onClick={() => download('k2-photo-template.csv', 'sku,primary_file,after_file\r\n', 'text/csv;charset=utf-8')}>Download photo CSV template</button>
            <label className="block text-sm font-semibold">Photo mapping CSV<input type="file" accept=".csv" className="mt-2 block min-h-11 w-full text-sm" onChange={async event => {
              setError(''); setBatch(null); setApproved(false)
              const file = event.target.files?.[0]
              if (!file) { setCsv(''); return }
              if (file.size > 65536) { setError('Choose a photo CSV no larger than 64 KB.'); setCsv(''); return }
              try { setCsv(await file.text()) } catch { setCsv(''); setError('The CSV could not be read. Select it again.') }
            }} /></label>
            <p className="text-sm leading-6 text-white/75">Headers: <code>sku,primary_file,after_file</code>. Use exact filenames, one row per SKU, up to 200 rows. Existing filled slots are held for separate review.</p>
          </fieldset>
          <label className="block text-sm font-semibold">Photo files<input aria-label="Photo files" aria-describedby="photo-files-help" type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={busy || corrupt || finished} className="mt-2 block min-h-11 w-full text-sm" onChange={event => { setFiles(Array.from(event.target.files || [])); if (!saved) { setBatch(null); setApproved(false) } }} /><span id="photo-files-help" className="mt-2 block text-sm font-normal leading-6 text-white/75">{files.length} files selected. PNG, JPEG or WebP; 4 MB each, 256 MB per batch. Reselect original files after reopening a paused batch.</span></label>
          {!saved && <button type="button" className={button} disabled={busy || corrupt || !csv || !files.length} onClick={review}>{busy ? 'Checking files…' : 'Review photo assignments'}</button>}
          {batch && <>
            <ol aria-label="Photo assignments" className="divide-y divide-adm-line">
              {batch.rows.map(row => <li key={row.sku} className="py-4">
                <div className="flex flex-wrap justify-between gap-2"><p className="min-w-0 break-words text-sm font-semibold">{row.sku} · {row.name}</p><span className="text-sm text-white/75">{row.done ? 'Saved and verified' : row.command ? 'Awaiting confirmation' : 'Ready'}</span></div>
                <div className="mt-3 flex flex-wrap gap-4">{Object.entries(row.files).map(([slot, file]) => <div key={slot} className="flex min-w-0 max-w-full items-center gap-3"><Thumbnail file={files.find(item => item.name === file.name)} label={slot === 'primary' ? 'Primary' : 'AFTER'} /><div className="min-w-0 text-sm"><p className="font-semibold">{slot === 'primary' ? 'Primary' : 'AFTER'} · empty → photo</p><p className="break-all text-white/75">{file.name}</p></div></div>)}</div>
              </li>)}
            </ol>
            <label className="block text-sm font-semibold">Photo batch reason<textarea aria-label="Photo batch reason" value={reason} onChange={event => setReason(event.target.value)} disabled={busy || saved} maxLength={500} rows={3} placeholder="Describe the photo batch source (optional)" className="adm-input mt-2 w-full text-base" /></label>
            {!saved && <label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input type="checkbox" checked={approved} disabled={busy} onChange={event => setApproved(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />I reviewed every SKU, photo and slot. These files are approved for the selected Draft listings.</label>}
          </>}
          {batch && saved && <button type="button" className={button} onClick={() => download('k2-photo-batch-result.json', JSON.stringify(batch, null, 2), 'application/json')}>Download photo batch result</button>}
        </div>
        <footer className="flex flex-wrap justify-end gap-3 border-t border-adm-line p-4 sm:p-5">
          <button type="button" className={button} disabled={busy} onClick={onBack}>Back to catalog CSV</button>
          {finished ? <button type="button" className={button} disabled={busy} onClick={acknowledge}>Acknowledge completed batch</button> : <button type="button" className={button + ' bg-blue/20'} disabled={busy || corrupt || !batch || (!saved && !approved)} onClick={run}>{busy ? 'Uploading and verifying…' : saved ? 'Continue saved photo batch' : `Upload and assign ${batch?.rows.length || 0} product${batch?.rows.length === 1 ? '' : 's'}`}</button>}
        </footer>
      </div>
    </AdminDialog>
  </div>
}
