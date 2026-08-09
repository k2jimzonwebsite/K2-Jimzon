import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { AlertIcon, CheckIcon, ShieldIcon, XIcon } from '../../components/ui/icons'

export default function SystemDevOpsModal({ isOpen, onClose }) {
  const [state, setState] = useState({ loading: true, session: false, database: false, launchCore: false, errors: [], message: '' })

  useEffect(() => {
    if (!isOpen) return undefined
    let active = true
    const load = async () => {
      if (!supabase) {
        if (active) setState({ loading: false, session: false, database: false, launchCore: false, errors: [], message: 'Supabase environment variables are missing.' })
        return
      }
      const [{ data: auth }, health, errorRows] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from('channel_connections').select('channel,status').limit(10),
        supabase.from('error_reports').select('id,created_at,message,url,status').order('created_at', { ascending: false }).limit(25),
      ])
      const launch = await supabase.from('order_requests').select('*', { count: 'exact', head: true })
      if (!active) return
      setState({
        loading: false, session: Boolean(auth?.session), database: !health.error,
        launchCore: !launch.error, errors: errorRows.data || [],
        message: health.error?.message || launch.error?.message || errorRows.error?.message || '',
      })
    }
    load()
    return () => { active = false }
  }, [isOpen])

  if (!isOpen) return null
  const cards = [
    { label: 'Supabase configuration', ok: Boolean(supabase), detail: supabase ? 'Client environment is configured' : 'Environment variables missing' },
    { label: 'Staff session', ok: state.session, detail: state.session ? 'Authenticated session present' : 'No authenticated session detected' },
    { label: 'Database access', ok: state.database, detail: state.database ? 'Channel status query succeeded' : 'Query unavailable' },
    { label: 'Launch-core migration', ok: state.launchCore, detail: state.launchCore ? 'Order request table is reachable' : 'Migration not detected' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="system-tools-title">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-adm border border-adm-line bg-adm-surface text-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-adm-line bg-adm-raised px-5 py-4">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-adm-sm bg-blue/15 text-blue"><ShieldIcon size={21} /></span><div><h2 id="system-tools-title" className="text-lg font-bold">System readiness</h2><p className="text-sm text-white/55">Observed checks only—no simulated throughput or security claims.</p></div></div>
          <button onClick={onClose} aria-label="Close system readiness" className="flex min-h-11 min-w-11 items-center justify-center rounded-adm-sm bg-white/5 text-white/60 hover:text-white"><XIcon size={19} /></button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map(card => <div key={card.label} className="rounded-adm-sm border border-adm-line bg-adm-raised p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{card.label}</p>{state.loading ? <span className="text-xs text-white/40">Checking…</span> : card.ok ? <span className="flex items-center gap-1 text-xs font-semibold text-forest"><CheckIcon size={14} /> Available</span> : <span className="flex items-center gap-1 text-xs font-semibold text-amber"><AlertIcon size={14} /> Action needed</span>}</div><p className="mt-2 text-xs text-white/50">{card.detail}</p></div>)}
          </div>

          {state.message && <div role="alert" className="rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-sm text-amber">{state.message}</div>}

          <section className="rounded-adm-sm border border-adm-line bg-adm-raised p-5">
            <div className="flex items-center justify-between gap-3 border-b border-adm-line pb-3"><div><h3 className="text-sm font-semibold">Recent client errors</h3><p className="mt-0.5 text-xs text-white/45">Latest rows visible through staff RLS</p></div><span className="text-xs text-white/50">{state.loading ? 'Loading…' : `${state.errors.length} shown`}</span></div>
            {!state.loading && state.errors.length === 0 ? <p className="py-8 text-center text-sm text-white/50">No visible error rows. This does not prove zero errors; it only reflects the configured error table.</p> : <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">{state.errors.map(item => <div key={item.id} className="rounded-adm-sm border border-adm-line bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><p className="break-words text-sm text-crimson">{item.message || 'Unknown error'}</p><time className="shrink-0 text-xs text-white/40">{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</time></div>{item.url && <p className="mt-1 truncate text-xs text-white/35">{item.url}</p>}</div>)}</div>}
          </section>

          <div className="rounded-adm-sm border border-blue/25 bg-blue/[0.06] p-4 text-sm leading-relaxed text-white/60">
            Marketplace secrets belong in server-side function secrets. This browser cannot verify encryption-at-rest, WAF rules, provider uptime, or deployment latency, so those are deliberately not reported here.
          </div>
        </div>

        <footer className="flex justify-end border-t border-adm-line bg-adm-raised px-5 py-4"><button onClick={onClose} className="min-h-11 rounded-adm-sm bg-blue px-6 text-sm font-bold text-white hover:bg-blue-deep">Close</button></footer>
      </div>
    </div>
  )
}
