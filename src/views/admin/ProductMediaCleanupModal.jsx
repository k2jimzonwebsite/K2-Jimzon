import { useEffect, useMemo, useRef, useState } from 'react'
import { cleanupProductMediaOrphansBff, getProductMediaOrphansBff } from '../../services/adminBffService'
import { AdminDialog } from '../../components/ui/AdminDialog'

const formatBytes = (value) => {
  const bytes = Number(value) || 0
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function ProductMediaCleanupModal({ onClose }) {
  const closeRef = useRef(null)
  const operationKey = useRef(crypto.randomUUID())
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [reason, setReason] = useState('')
  const [state, setState] = useState({ kind: 'loading', message: 'Reviewing verified uploads…' })
  const [cleanupPending, setCleanupPending] = useState(false)

  const load = async () => {
    setState({ kind: 'loading', message: 'Reviewing verified uploads…' })
    const result = await getProductMediaOrphansBff(60)
    if (!result.ok) {
      setState({ kind: 'error', message: result.error || 'Unused uploads could not be reviewed safely.' })
      return
    }
    setItems(result.review?.items || [])
    setSelected(new Set())
    setState({ kind: 'ready', message: '' })
  }

  useEffect(() => {
    void load()
  }, [])

  const selectedPaths = useMemo(() => [...selected].sort(), [selected])
  const toggle = (path) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path); else next.add(path)
      return next
    })
    setCleanupPending(false)
    setState({ kind: 'ready', message: '' })
    operationKey.current = crypto.randomUUID()
  }

  const cleanup = async () => {
    if (!selectedPaths.length || reason.trim().length < 3) return
    setState({ kind: 'working', message: 'Removing selected unused files…' })
    const result = await cleanupProductMediaOrphansBff({
      objectPaths: selectedPaths,
      reason: reason.trim(),
    }, operationKey.current)
    if (!result.ok) {
      setState({ kind: 'error', message: result.error || 'Unused uploads could not be removed safely.' })
      return
    }
    if (result.cleanupPending) {
      setCleanupPending(true)
      setState({ kind: 'warning', message: 'Cleanup is recorded but Storage has not confirmed completion. Retry with the same selection.' })
      return
    }
    setCleanupPending(false)
    setReason('')
    operationKey.current = crypto.randomUUID()
    await load()
    setState({ kind: 'success', message: `${selectedPaths.length} unused file${selectedPaths.length === 1 ? '' : 's'} removed.` })
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <AdminDialog onClose={onClose} closeDisabled={state.kind === 'working'} initialFocusRef={closeRef} labelledBy="media-cleanup-title" describedBy="media-cleanup-help">
      <div className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-adm border border-adm-line bg-adm-surface text-white shadow-2xl sm:max-h-[90dvh] sm:rounded-adm">
        <header className="flex items-start justify-between gap-4 border-b border-adm-line bg-black/35 px-4 py-4 sm:px-5">
          <div>
            <p className="font-mono text-xs text-blue">ADMIN MEDIA MAINTENANCE</p>
            <h2 id="media-cleanup-title" className="mt-1 text-xl font-semibold">Unused verified uploads</h2>
            <p id="media-cleanup-help" className="mt-1 text-sm leading-5 text-white/60">Only receipt-backed files older than one hour and unreferenced by every product are shown. References are checked again before removal.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={state.kind === 'working'} aria-label="Close unused uploads" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-adm-sm border border-adm-line text-white/70 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue disabled:opacity-50">×</button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {state.message && <div role={state.kind === 'error' ? 'alert' : 'status'} className={`rounded-adm-sm border p-3 text-sm leading-5 ${state.kind === 'error' ? 'border-crimson/35 bg-crimson/10 text-red-200' : state.kind === 'success' ? 'border-forest/35 bg-forest/10 text-emerald-100' : 'border-amber/35 bg-amber/10 text-amber-100'}`}>{state.message}</div>}
          {state.kind === 'loading' ? (
            <div className="space-y-2" role="status">{[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-adm-sm bg-white/5 motion-reduce:animate-none" />)}</div>
          ) : items.length === 0 ? (
            <div className="rounded-adm-sm border border-adm-line bg-adm-sunken p-5 text-center"><p className="font-semibold">No unused verified uploads</p><p className="mt-1 text-sm text-white/55">Nothing currently meets the one-hour safety window and reference checks.</p></div>
          ) : (
            <fieldset className="space-y-2" disabled={state.kind === 'working'}>
              <legend className="mb-2 text-sm font-semibold text-white/70">Select up to 25 files</legend>
              {items.map((item) => (
                <label key={item.objectPath} className="flex min-h-14 cursor-pointer items-start gap-3 rounded-adm-sm border border-adm-line bg-adm-sunken p-3 hover:border-white/25">
                  <input type="checkbox" checked={selected.has(item.objectPath)} onChange={() => toggle(item.objectPath)} className="mt-1 h-5 w-5 shrink-0 accent-blue" />
                  <span className="min-w-0"><span className="block break-all font-mono text-xs text-white/80">{item.objectPath}</span><span className="mt-1 block text-xs text-white/45">{item.contentType} · {formatBytes(item.size)} · uploaded {new Date(item.createdAt).toLocaleString()}</span></span>
                </label>
              ))}
            </fieldset>
          )}
          {items.length > 0 && <label className="block text-sm font-semibold text-white/75">Cleanup reason <span className="text-red-300" aria-hidden="true">*</span><textarea value={reason} onChange={(event) => { setReason(event.target.value); setCleanupPending(false); operationKey.current = crypto.randomUUID() }} maxLength={500} rows={3} className="adm-input mt-2 min-h-24 resize-y text-base" /><span className="mt-1 block text-xs font-normal text-white/50">Recorded with the signed cleanup event.</span></label>}
        </div>

        <footer className="flex gap-2 border-t border-adm-line bg-black/35 p-4 sm:px-5">
          <button type="button" onClick={onClose} disabled={state.kind === 'working'} className="min-h-11 flex-1 rounded-adm-sm border border-adm-line px-4 font-semibold hover:bg-white/5 disabled:opacity-50">Close</button>
          <button type="button" onClick={() => void cleanup()} disabled={state.kind === 'working' || !selectedPaths.length || reason.trim().length < 3} className="min-h-11 flex-[1.4] rounded-adm-sm bg-crimson px-4 font-bold text-white hover:bg-crimson/90 disabled:cursor-not-allowed disabled:opacity-45">{state.kind === 'working' ? 'Removing…' : cleanupPending ? 'Retry cleanup' : `Remove ${selectedPaths.length || ''} unused`}</button>
        </footer>
      </div>
      </AdminDialog>
    </div>
  )
}
