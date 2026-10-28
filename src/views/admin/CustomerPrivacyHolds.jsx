import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdminCustomerPrivacy, reviewAdminCustomerPrivacy } from '../../services/adminBffService'
import { SectionHeading, StateBanner } from './AdminWorkspaceUi'
import { useRetainedFulfillmentCommand } from './useRetainedFulfillmentCommand'

const field = 'mt-2 min-h-11 w-full rounded-adm-sm border border-adm-line bg-adm-sunken px-3 text-white disabled:opacity-50'

export function CustomerPrivacyHolds({ customers, actor }) {
  const [customerId, setCustomerId] = useState('')
  const [holds, setHolds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [action, setAction] = useState('add_customer_hold')
  const [kind, setKind] = useState('legal')
  const [holdId, setHoldId] = useState('')
  const [reason, setReason] = useState('')
  const loadSequence = useRef(0)
  const operation = useRetainedFulfillmentCommand(async (payload, key, operationActor) => {
    const result = await reviewAdminCustomerPrivacy(payload, key, operationActor)
    if (result.ok && (result.result?.customerId !== payload.customerId || result.result?.action !== payload.action
      || result.result?.currentState !== (payload.action === 'add_customer_hold' ? 'projected' : 'resolved')
      || !result.result?.holdId || !Number.isFinite(Date.parse(result.result?.checkedAt)))) return { ok: false, code: 'PRIVACY_COMMAND_UNAVAILABLE' }
    return result
  }, true, 'customer hold')
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current
    if (!customerId) { setHolds([]); setError(''); setLoading(false); return }
    setLoading(true); setError('')
    const result = await getAdminCustomerPrivacy(null, 'customer', undefined, customerId)
    if (sequence !== loadSequence.current) return
    if (!result.ok || result.actorId !== actor) { setHolds([]); setError('Customer holds could not be loaded. Refresh the customer list and try again.') }
    else setHolds(result.customerHolds)
    setLoading(false)
  }, [customerId, actor])
  useEffect(() => { if (actor) load(); return () => { loadSequence.current++ } }, [actor, load])
  const submit = async event => {
    event.preventDefault()
    if (!customerId || reason.trim().length < 3) return
    const payload = { customerId, action, reason: reason.trim(), ...(action === 'add_customer_hold' ? { kind } : { holdId }) }
    const result = await operation.run(payload, actor)
    if (!result?.ok) return
    setNotice(action === 'add_customer_hold' ? 'Customer hold recorded.' : 'Customer hold resolved.')
    setReason(''); setHoldId(''); setAction('add_customer_hold'); await load()
  }
  const choices = customers.filter(customer => customer.status === 'active')
  return <section className="mt-5 overflow-hidden rounded-adm border border-adm-line bg-adm-surface"><div className="p-4"><SectionHeading title="Customer holds" description="Record a known legal, refund, dispute or security hold before a closure request is submitted." /></div><form onSubmit={submit} className="space-y-4 border-t border-adm-line p-4"><p className="text-sm leading-6 text-white/65">Choose from loaded customer records. If a verified request is already pending, its assigned Admin must resolve holds in the request above.</p><label className="block text-sm font-semibold">Customer<select required disabled={operation.locked || !actor} className={field} value={customerId} onChange={event => { setCustomerId(event.target.value); setHolds([]); setError(''); setLoading(Boolean(event.target.value)); setNotice(''); setAction('add_customer_hold'); setHoldId('') }}><option value="">Choose a loaded customer</option>{choices.map(customer => <option key={customer.id} value={customer.id}>{customer.displayName} · {customer.id}</option>)}</select></label>
    {loading && <p role="status" className="text-sm text-white/65">Loading holds…</p>}{error && <><StateBanner tone="danger">{error}</StateBanner><button type="button" onClick={load} className="min-h-11 rounded-adm-sm border border-adm-line px-4 text-sm font-semibold">Retry loading holds</button></>}{notice && <StateBanner tone="success">{notice}</StateBanner>}
    {customerId && !loading && !error && <><p className="text-sm text-white/70">{holds.length ? 'Active holds:' : 'No explicit holds recorded for this customer.'}</p>{holds.length > 0 && <ul className="space-y-1 text-sm text-white/70">{holds.map(hold => <li key={hold.id}>{hold.kind}: {hold.reason}</li>)}</ul>}<label className="block text-sm font-semibold">Action<select className={field} disabled={operation.locked} value={action} onChange={event => { setAction(event.target.value); setHoldId('') }}><option value="add_customer_hold">Add a hold</option><option value="resolve_customer_hold" disabled={!holds.length}>Resolve a hold</option></select></label>{action === 'add_customer_hold' ? <label className="block text-sm font-semibold">Hold type<select className={field} disabled={operation.locked} value={kind} onChange={event => setKind(event.target.value)}><option value="legal">Legal</option><option value="refund">Refund</option><option value="dispute">Dispute</option><option value="security">Security</option></select></label> : <><label className="block text-sm font-semibold">Hold to resolve<select required className={field} disabled={operation.locked} value={holdId} onChange={event => setHoldId(event.target.value)}><option value="">Choose a hold</option>{holds.map(hold => <option key={hold.id} value={hold.id}>{hold.kind}: {hold.reason}</option>)}</select></label><StateBanner tone="warning">Resolving a hold may allow a verified closure to continue. If there is a pending verified request, use its assigned review instead.</StateBanner></>}<label className="block text-sm font-semibold">Reason<textarea required minLength={3} maxLength={500} rows={3} disabled={operation.locked} value={reason} onChange={event => setReason(event.target.value)} className={`${field} py-3`} /></label>{operation.error && <StateBanner tone={operation.uncertain ? 'warning' : 'danger'}>{operation.error}</StateBanner>}<button type="submit" disabled={operation.busy} className="min-h-11 rounded-adm-sm bg-blue px-4 text-sm font-semibold text-white disabled:opacity-40">{operation.busy ? 'Recording…' : operation.uncertain ? 'Retry saved action' : action === 'add_customer_hold' ? 'Add hold' : 'Resolve this hold'}</button></>}
  </form></section>
}
