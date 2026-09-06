import { useEffect, useRef, useState } from 'react'
import { adminBffEnabled, getAdminProducts, getAdminConsignments } from '../../../services/adminBffService'

// Each entry delegates to an existing authenticated service. Diagram data cannot
// supply a URL, method or privileged command payload.
const sources = {
  inventory: { label: 'Catalog records', read: getAdminProducts, rows: result => result.products, id: 'sku', title: 'name' },
  consignment: { label: 'Consignment records', read: getAdminConsignments, rows: result => result.data?.consignments, id: 'id', title: 'manifest_code' },
}

export default function WorkflowRecords({ section }) {
  const source = Object.hasOwn(sources, section) ? sources[section] : null
  const [state, setState] = useState({ phase: 'idle' })
  const pending = useRef(null)
  useEffect(() => () => { pending.current?.abort() }, [])
  if (!source) return null
  const enabled = adminBffEnabled()
  async function load() {
    if (!enabled || pending.current) return
    const controller = new AbortController()
    pending.current = controller
    setState({ phase: 'loading' })
    try {
      const result = await source.read(controller.signal)
      if (controller.signal.aborted) return
      if (!result.ok) {
        setState({ phase: 'error', message: result.error || 'Records could not be read. Check your staff session and retry.' })
        return
      }
      const rows = source.rows(result)
      if (!Array.isArray(rows) || rows.some(row => !row || typeof row[source.id] !== 'string')) {
        setState({ phase: 'error', message: 'The returned records could not be read. Retry or open the Admin screen.' })
        return
      }
      setState({ phase: 'loaded', rows: rows.slice(0, 10), checkedAt: new Date().toLocaleTimeString(), partial: Boolean(result.unavailable?.length) })
    } catch {
      if (!controller.signal.aborted) setState({ phase: 'error', message: 'Records could not be read. Check your connection and retry.' })
    } finally {
      if (pending.current === controller) pending.current = null
    }
  }
  return <section aria-label="Current records" className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/85">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h4 className="font-semibold">{source.label}</h4>
      <button type="button" disabled={!enabled || state.phase === 'loading'} onClick={load} className="min-h-11 rounded-lg border border-sky-500/30 bg-sky-500/15 px-4 font-semibold text-sky-200 hover:bg-sky-500/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-50">
        {state.phase === 'loading' ? 'Loading records…' : 'Load current records'}
      </button>
    </div>
    <p className="mt-2 leading-6 text-white/65">{enabled ? 'Read current records from K2. Review and change them in the linked Admin screen.' : 'Record access is not enabled in this environment. Use the linked Admin screen.'}</p>
    {state.phase === 'error' && <p role="alert" className="mt-3 text-amber-200">{state.message}</p>}
    <div role="status" aria-live="polite">
      {state.phase === 'loading' && <p className="mt-3">Requesting records…</p>}
      {state.phase === 'loaded' && <>
        <p className="mt-3 text-xs text-white/65">Read at {state.checkedAt}. Showing up to 10 records from the returned batch; this is not a total or a completed workflow step.</p>
        {state.partial && <p className="mt-2 text-amber-200">Some supporting data is unavailable. Check the Admin screen before acting.</p>}
        {state.rows.length ? <ul className="mt-3 divide-y divide-white/10">{state.rows.map(row => <li key={row[source.id]} className="py-3 [overflow-wrap:anywhere]">
          <span className="block font-semibold">{typeof row[source.title] === 'string' ? row[source.title] : row[source.id]}</span>
          <span className="block text-xs text-white/65">{row[source.id]}{typeof row.status === 'string' ? ` · ${row.status}` : ''}</span>
        </li>)}</ul> : <p className="mt-3">No records returned.</p>}
      </>}
    </div>
  </section>
}
