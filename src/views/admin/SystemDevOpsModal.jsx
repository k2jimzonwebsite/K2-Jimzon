import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { safeUiError } from '../../lib/safeUiError'
import { AlertIcon, CheckIcon, ShieldIcon, XIcon } from '../../components/ui/icons'
import { adminBffEnabled, getAdminSystemReadinessBff } from '../../services/adminBffService'

const INITIAL_STATE = { loading: true, serverBoundary: false, session: false, database: false, contracts: false, notice: '' }

export default function SystemDevOpsModal({ isOpen, onClose, secureMode }) {
  const secure = secureMode ?? adminBffEnabled()
  const [state, setState] = useState(INITIAL_STATE)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined
    let active = true
    const controller = new AbortController()
    setState(INITIAL_STATE)
    closeRef.current?.focus()
    const handleKey = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)

    const load = async () => {
      if (secure) {
        const response = await getAdminSystemReadinessBff(controller.signal)
        if (!active || response.aborted) return
        if (!response.ok) {
          setState({ ...INITIAL_STATE, loading: false, notice: response.error || safeUiError('ADMIN_HEALTH_FAILED') })
          return
        }
        const readiness = response.readiness || {}
        setState({
          loading: false,
          serverBoundary: Boolean(readiness.serverBoundary),
          session: Boolean(readiness.currentSessionAal2),
          database: Boolean(readiness.databaseAccess),
          contracts: ['orderRequestsPresent', 'channelBoundaryPresent', 'staffBoundaryPresent', 'sessionRegistryPresent', 'securityEventBoundaryPresent'].every(key => readiness[key] === true),
          notice: '',
        })
        return
      }
      if (!supabase) {
        if (active) setState({ ...INITIAL_STATE, loading: false, notice: safeUiError('ADMIN_HEALTH_FAILED') })
        return
      }
      // Readiness probes only. Provider error text is never surfaced here; a
      // failed probe is reported as an unavailable check and nothing more.
      const [auth, health, launch] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from('channel_connections').select('channel,status').limit(10),
        supabase.from('order_requests').select('*', { count: 'exact', head: true }),
      ])
      if (!active) return
      const degraded = Boolean(health.error) || Boolean(launch.error)
      setState({
        loading: false,
        serverBoundary: false,
        session: Boolean(auth?.data?.session),
        database: !health.error,
        contracts: !launch.error,
        notice: degraded ? safeUiError('ADMIN_HEALTH_FAILED') : '',
      })
    }

    load().catch(() => {
      if (active) setState({ ...INITIAL_STATE, loading: false, notice: safeUiError('ADMIN_HEALTH_FAILED') })
    })
    return () => { active = false; controller.abort(); window.removeEventListener('keydown', handleKey) }
  }, [isOpen, onClose, secure])

  if (!isOpen) return null

  const cards = [
    { label: 'Protected Admin request', ok: secure ? state.serverBoundary : Boolean(supabase), detail: secure ? (state.serverBoundary ? 'Same-origin server boundary verified this request' : 'Server boundary unavailable') : (supabase ? 'Transitional browser client configured' : 'Environment variables missing') },
    { label: 'Current staff session', ok: state.session, detail: state.session ? (secure ? 'Admin identity and AAL2 verified for this request' : 'Authenticated browser session present') : 'Verified staff session unavailable' },
    { label: 'Database boundary', ok: state.database, detail: state.database ? 'Protected database check succeeded' : 'Protected query unavailable' },
    { label: 'Prepared operational contracts', ok: state.contracts, detail: state.contracts ? 'Required named boundary objects are present' : 'One or more required boundary objects are unavailable' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center sm:p-3" role="presentation">
      <div className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-adm border border-adm-line bg-adm-surface text-white shadow-2xl sm:rounded-adm" role="dialog" aria-modal="true" aria-labelledby="system-tools-title">
        <header className="flex items-center justify-between gap-4 border-b border-adm-line bg-adm-raised px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-adm-sm bg-blue/15 text-blue"><ShieldIcon size={21} /></span>
            <div>
              <h2 id="system-tools-title" className="text-lg font-bold">System readiness</h2>
              <p className="text-sm text-white/55">Observed checks only—no simulated throughput or security claims.</p>
            </div>
          </div>
          <button ref={closeRef} onClick={onClose} aria-label="Close system readiness" className="flex min-h-11 min-w-11 items-center justify-center rounded-adm-sm bg-white/5 text-white/60 hover:text-white"><XIcon size={19} /></button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map(card => (
              <div key={card.label} className="rounded-adm-sm border border-adm-line bg-adm-raised p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{card.label}</p>
                  {state.loading
                    ? <span className="text-xs text-white/40">Checking…</span>
                    : card.ok
                      ? <span className="flex items-center gap-1 text-xs font-semibold text-forest"><CheckIcon size={14} /> Available</span>
                      : <span className="flex items-center gap-1 text-xs font-semibold text-amber"><AlertIcon size={14} /> Action needed</span>}
                </div>
                <p className="mt-2 text-xs text-white/50">{card.detail}</p>
              </div>
            ))}
          </div>

          {state.notice && <div role="alert" className="rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-sm text-amber">{state.notice}</div>}

          <section className="rounded-adm-sm border border-adm-line bg-adm-raised p-5">
            <h3 className="text-sm font-semibold">Diagnostic logging boundary</h3>
            <p className="mt-2 text-xs leading-relaxed text-white/50">
              Raw client error rows are deliberately not readable or rendered here. The protected
              readiness response contains booleans only; security-event review stays on its separate,
              bounded Admin route. Provider text, request URLs, and arbitrary diagnostic payloads never
              enter this browser surface.
            </p>
          </section>

          <div className="rounded-adm-sm border border-blue/25 bg-blue/[0.06] p-4 text-sm leading-relaxed text-white/60">
            Marketplace secrets belong server-side. These checks do not prove encryption-at-rest, WAF rules, provider uptime, connector health, deployment correctness, latency, throughput, or production activation; those remain deliberately unreported here.
          </div>
        </div>

        <footer className="flex justify-end border-t border-adm-line bg-adm-raised px-5 py-4"><button onClick={onClose} className="min-h-11 rounded-adm-sm bg-blue px-6 text-sm font-bold text-white hover:bg-blue-deep">Close</button></footer>
      </div>
    </div>
  )
}
