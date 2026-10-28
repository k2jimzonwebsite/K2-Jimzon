import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdminCustomerPrivacy, reviewAdminCustomerPrivacy } from '../../services/adminBffService'
import { EmptyState, SectionHeading, StateBanner, StatusPill } from './AdminWorkspaceUi'
import { UserIcon } from '../../components/ui/icons'
import { useRetainedFulfillmentCommand } from './useRetainedFulfillmentCommand'
import { CustomerPrivacyHolds } from './CustomerPrivacyHolds'

const control = 'mt-2 min-h-11 w-full rounded-adm-sm border border-adm-line bg-adm-sunken px-3 text-white disabled:opacity-50'

export function CustomerPrivacyReview({ secure, customers }) {
  const [requests, setRequests] = useState([])
  const [cursor, setCursor] = useState(null)
  const [scope, setScope] = useState('current')
  const [actor, setActor] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState('')
  const [action, setAction] = useState('assign')
  const [kind, setKind] = useState('legal')
  const [holdId, setHoldId] = useState('')
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState('')
  const reviewHeading = useRef(null)
  const reviewOpener = useRef(null)
  const loadSequence = useRef(0)

  const send = async (payload, key, operationActor) => {
    const result = await reviewAdminCustomerPrivacy(payload, key, operationActor)
    const assignment = payload.action === 'assign'
    const expectedState = payload.action === 'add_hold' ? 'projected' : 'resolved'
    if (result.ok && (result.result?.requestId !== payload.requestId || result.result?.action !== payload.action
      || !Number.isFinite(Date.parse(assignment ? result.result?.updatedAt : result.result?.checkedAt))
      || (!assignment && (result.result?.currentState !== expectedState || !result.result?.holdId)))) {
      return { ok: false, code: 'PRIVACY_COMMAND_UNAVAILABLE' }
    }
    return result
  }
  const operation = useRetainedFulfillmentCommand(send, true, 'privacy request')
  const load = useCallback(async (next = null) => {
    const sequence = ++loadSequence.current
    setLoading(true); setLoadError('')
    const result = await getAdminCustomerPrivacy(next, scope)
    if (sequence !== loadSequence.current) return
    if (!result.ok) setLoadError('Privacy requests could not be loaded. Refresh and try again.')
    else {
      setRequests(current => next ? [...current, ...result.requests] : result.requests)
      setCursor(result.nextCursor || null); setActor(result.actorId)
    }
    setLoading(false)
  }, [scope])
  useEffect(() => { if (secure) load(); return () => { loadSequence.current++ } }, [secure, load])
  useEffect(() => { if (selected) reviewHeading.current?.focus() }, [selected])
  const request = requests.find(item => item.id === selected)
  const assigned = Boolean(actor && request?.assignedTo === actor)
  const submit = async event => {
    event.preventDefault()
    if (!request || reason.trim().length < 3) return
    const payload = { requestId: request.id, action, reason: reason.trim() }
    if (action === 'add_hold') payload.kind = kind
    if (action === 'resolve_hold') payload.holdId = holdId
    const result = await operation.run(payload, actor)
    if (!result?.ok) return
    setNotice(action === 'assign' ? 'Responsibility recorded.' : action === 'add_hold' ? 'Hold recorded.' : 'Hold resolved. Any other holds still apply; the verified request may resume automatically.')
    setReason(''); setSelected(''); setAction('assign'); setHoldId('')
    await load()
  }
  if (!secure) return <StateBanner tone="info">Privacy review is available through the secure Admin workspace.</StateBanner>
  return <><section className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
    <div className="flex flex-wrap items-start justify-between gap-3 p-4"><SectionHeading title="Privacy requests" description="Verified requests that need attention. Eligible closures continue automatically." count={requests.length} /><button type="button" disabled={loading || operation.locked} onClick={() => load()} className="min-h-11 rounded-adm-sm border border-adm-line px-4 text-sm font-semibold disabled:opacity-40">Refresh requests</button></div>
    <div className="space-y-4 border-t border-adm-line p-4">
      <div className="flex flex-wrap gap-2" aria-label="Privacy request views"><button type="button" disabled={operation.locked} aria-pressed={scope === 'current'} onClick={() => { if (scope !== 'current') { setRequests([]); setSelected(''); setScope('current') } }} className="min-h-11 rounded-adm-sm border border-adm-line px-4 text-sm font-semibold aria-pressed:bg-white/10 disabled:opacity-40">Requests needing review</button><button type="button" disabled={operation.locked} aria-pressed={scope === 'history'} onClick={() => { if (scope !== 'history') { setRequests([]); setSelected(''); setScope('history') } }} className="min-h-11 rounded-adm-sm border border-adm-line px-4 text-sm font-semibold aria-pressed:bg-white/10 disabled:opacity-40">Recent outcomes</button></div>
      {loadError && <StateBanner tone="danger">{loadError}</StateBanner>}
      {notice && <StateBanner tone="success">{notice}</StateBanner>}
      {loading && <p role="status" className="text-sm text-white/65">Loading privacy requests…</p>}
      {!loading && !loadError && !requests.length && <EmptyState icon={UserIcon} title={scope === 'current' ? 'No requests need review' : 'No recent outcomes'} description={scope === 'current' ? 'Verified requests with open work or other holds will appear here.' : 'Closed and cancelled verified requests will appear here.'} />}
      {requests.length > 0 && <div className="space-y-3">{requests.map(item => <article key={item.id} className="rounded-adm-sm border border-adm-line bg-adm-sunken p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{item.customerName}</h3><p className="mt-1 text-xs text-white/55">Verified {new Date(item.verifiedAt).toLocaleString()} · {item.assignedTo === actor ? 'Assigned to you' : item.assignedTo ? 'Assigned to another Admin' : 'Unassigned'}</p></div><StatusPill tone={item.state === 'held' ? 'warning' : 'info'}>{item.state === 'held' ? 'On hold' : item.state === 'closed' ? 'Closed' : item.state === 'cancelled' ? 'Cancelled' : 'Pending'}</StatusPill></div><p className="mt-2 break-all text-xs text-white/55">Request {item.id}</p>{scope === 'history' && item.state === 'closed' && <p className="mt-2 text-sm text-white/70">Sign-in cleanup: {item.providerState === 'complete' ? 'complete' : item.providerState === 'retry' ? 'retry pending' : 'pending'} · Retained and external copies need separate review.</p>}<p className="mt-3 text-sm leading-6 text-white/75">{item.reasons?.length ? item.reasons.map(value => value.replaceAll('_', ' ')).join(' · ') : scope === 'history' ? 'Outcome recorded.' : 'Eligibility is being checked.'}</p>{item.holds?.length > 0 && <ul className="mt-3 space-y-1 text-sm text-white/70">{item.holds.map(hold => <li key={hold.id}>{hold.kind}: {hold.reason}</li>)}</ul>}{item.recentActions?.length > 0 && <details className="mt-3 text-sm"><summary className="min-h-11 cursor-pointer py-3 font-semibold text-blue">Recent review actions</summary><ul className="space-y-2 text-white/70">{item.recentActions.map((entry, index) => <li key={index}>{entry.action.replaceAll('_', ' ')} · {entry.reason} · {new Date(entry.createdAt).toLocaleString()} · Admin {entry.actorId}</li>)}</ul></details>}{scope === 'current' && <button type="button" disabled={operation.locked} onClick={event => { reviewOpener.current = event.currentTarget; if (selected === item.id) reviewHeading.current?.focus(); setSelected(item.id); setAction('assign'); setHoldId(''); setReason(''); setNotice('') }} className="mt-3 min-h-11 rounded-adm-sm border border-adm-line bg-white/5 px-4 text-sm font-semibold disabled:opacity-40">Review request</button>}</article>)}</div>}
      {cursor && <button type="button" disabled={loading || operation.locked} onClick={() => load(cursor)} className="min-h-11 rounded-adm-sm border border-adm-line px-4 text-sm font-semibold disabled:opacity-40">Load more requests</button>}
      {request && <form onSubmit={submit} className="space-y-4 border-t border-adm-line pt-4"><h3 ref={reviewHeading} tabIndex={-1} className="text-lg font-bold">Review {request.customerName}</h3><p className="text-sm leading-6 text-white/65">Any Admin can take responsibility. Only the assigned Admin can add or resolve an explicit hold. Existing order and case checks continue separately.</p><label className="block text-sm font-semibold">Action<select className={control} disabled={operation.locked} value={action} onChange={event => { setAction(event.target.value); setHoldId('') }}><option value="assign">Take responsibility</option><option value="add_hold" disabled={!assigned}>Add a hold</option><option value="resolve_hold" disabled={!assigned || !request.holds?.length}>Resolve a hold</option></select></label>
        {action === 'add_hold' && <label className="block text-sm font-semibold">Hold type<select className={control} disabled={operation.locked} value={kind} onChange={event => setKind(event.target.value)}><option value="legal">Legal</option><option value="refund">Refund</option><option value="dispute">Dispute</option><option value="security">Security</option></select></label>}
        {action === 'resolve_hold' && <><label className="block text-sm font-semibold">Hold to resolve<select required className={control} disabled={operation.locked} value={holdId} onChange={event => setHoldId(event.target.value)}><option value="">Choose a hold</option>{request.holds?.map(hold => <option key={hold.id} value={hold.id}>{hold.kind}: {hold.reason}</option>)}</select></label><StateBanner tone="warning">Resolving this hold may allow the verified closure to resume automatically. Other holds and open work still apply.</StateBanner></>}
        <label className="block text-sm font-semibold">Reason<textarea required minLength={3} maxLength={500} rows={3} disabled={operation.locked} value={reason} onChange={event => setReason(event.target.value)} className={`${control} py-3`} placeholder="Explain what you checked" /></label>
        {operation.error && <StateBanner tone={operation.uncertain ? 'warning' : 'danger'}>{operation.error}</StateBanner>}
        <div className="flex flex-wrap gap-2"><button type="submit" disabled={operation.busy} className="min-h-11 rounded-adm-sm bg-blue px-4 text-sm font-semibold text-white disabled:opacity-40">{operation.busy ? 'Recording…' : operation.uncertain ? 'Retry saved action' : action === 'resolve_hold' ? 'Resolve this hold' : action === 'add_hold' ? 'Add hold' : 'Take responsibility'}</button><button type="button" disabled={operation.locked} onClick={() => { setSelected(''); reviewOpener.current?.focus() }} className="min-h-11 rounded-adm-sm border border-adm-line px-4 text-sm font-semibold disabled:opacity-40">Cancel</button></div>
      </form>}
    </div>
  </section><CustomerPrivacyHolds customers={customers} actor={actor} /></>
}
