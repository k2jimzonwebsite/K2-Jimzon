import { useCallback, useEffect, useRef, useState } from 'react'
import { adminBffEnabled, getCustomerDeliveryRatesBff, publishCustomerDeliveryRatesBff } from '../../services/adminBffService'
import { StateBanner, WorkspaceIntro, primaryButton, secondaryButton } from './AdminWorkspaceUi'

const AREAS = ['NCR', 'Greater Luzon', 'Visayas', 'Mindanao']
const FIELDS = [
  ['baseMinor', 'Base fee (₱)'], ['includedWeightG', 'Included weight (grams)'],
  ['extraKgMinor', 'Each extra kg (₱)'], ['roundMinor', 'Round fee up to (₱)'],
]
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const blankRows = () => Object.fromEntries(AREAS.map(area => [area, Object.fromEntries(FIELDS.map(([field]) => [field, '']))]))
const displayRows = rates => Object.fromEntries(AREAS.map(area => [area, Object.fromEntries(FIELDS.map(([field]) => [field,
  field === 'includedWeightG' ? String(rates[area][field]) : (rates[area][field] / 100).toFixed(2),
]))]))
const validRates = rates => rates && Object.keys(rates).length === AREAS.length && AREAS.every(area => {
  const row = rates[area]
  return row && Object.keys(row).length === FIELDS.length && FIELDS.every(([field]) => Number.isInteger(row[field])
    && row[field] >= (field === 'extraKgMinor' ? 0 : 1) && row[field] <= (field === 'includedWeightG' ? 100000 : 10000000))
})

function parseRows(rows) {
  const rates = Object.fromEntries(AREAS.map(area => [area, Object.fromEntries(FIELDS.map(([field]) => {
    const raw = rows[area][field].trim()
    const allowed = field === 'includedWeightG' ? /^\d+$/ : /^\d+(\.\d{1,2})?$/
    return [field, allowed.test(raw) ? Math.round(Number(raw) * (field === 'includedWeightG' ? 1 : 100)) : NaN]
  }))]))
  if (!validRates(rates)) throw new Error('Review all four regions. Fees need at most two decimal places; included weight needs whole grams. Only the extra-kg fee may be zero.')
  return rates
}

export default function CustomerDeliveryRates({ actorId }) {
  const storageKey = `k2-customer-rates-pending-v1:${actorId}`
  const mounted = useRef(true)
  const busy = useRef(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [readReady, setReadReady] = useState(false)
  const [current, setCurrent] = useState(null)
  const [rows, setRows] = useState(blankRows)
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState('')
  const [reviewed, setReviewed] = useState(false)
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const readPending = useCallback(() => {
    if (!UUID.test(actorId || '') || !navigator.locks?.request) throw new Error('Safe recovery is unavailable in this browser. Keep this page and contact the administrator before publishing.')
    const raw = localStorage.getItem(storageKey)
    if (raw === null) return null
    if (new TextEncoder().encode(raw).length > 16384) throw new Error('The pending change could not be restored safely. Keep it and contact the administrator.')
    const record = JSON.parse(raw)
    const body = record?.body
    if (record?.version !== 1 || record.actorId !== actorId || !UUID.test(record.key || '')
      || !body || Object.keys(body).length !== 4 || !Number.isInteger(body.expectedVersion) || body.expectedVersion < 0 || body.expectedVersion > 2147483646
      || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 500
      || typeof body.evidenceRef !== 'string' || !body.evidenceRef.trim() || body.evidenceRef.length > 500 || !validRates(body.rates)) {
      throw new Error('The pending change could not be restored safely. Keep it and contact the administrator.')
    }
    return record
  }, [actorId, storageKey])

  const load = useCallback(async () => {
    setLoading(true); setReadReady(false); setReviewed(false)
    try {
      const held = readPending()
      if (mounted.current) setPending(held)
      if (!adminBffEnabled()) throw new Error('Secure customer delivery controls are not enabled. Contact the administrator.')
      const result = await getCustomerDeliveryRatesBff()
      if (!mounted.current) return
      if (!result.ok) throw new Error(result.error)
      const saved = result.result?.current
      if (saved !== null && (!saved || saved.policy !== 'jt_current' || !Number.isInteger(saved.version) || saved.version < 1 || !validRates(saved.rates))) {
        throw new Error('The saved rate version could not be read safely. Refresh before publishing.')
      }
      setCurrent(saved); setReadReady(true); setError('')
      setRows(held ? displayRows(held.body.rates) : saved ? displayRows(saved.rates) : blankRows())
      setReason(held?.body.reason || ''); setEvidence(held?.body.evidenceRef || '')
    } catch (failure) {
      if (mounted.current) setError(failure instanceof SyntaxError ? 'The pending change could not be restored safely. Keep it and contact the administrator.' : failure.message)
    } finally { if (mounted.current) setLoading(false) }
  }, [readPending])

  useEffect(() => {
    mounted.current = true
    load()
    const changed = event => { if (event.key === storageKey && !busy.current) load() }
    window.addEventListener('storage', changed)
    return () => { mounted.current = false; window.removeEventListener('storage', changed) }
  }, [load, storageKey])

  const publish = async event => {
    event?.preventDefault()
    if (busy.current) return
    const intended = pending
    let body
    try {
      if (!intended) {
        if (!readReady || !reviewed) throw new Error('Load and review the current rates before publishing.')
        if (!reason.trim() || !evidence.trim()) throw new Error('Enter the change reason and its evidence reference.')
        body = { expectedVersion: current?.version || 0, reason: reason.trim(), evidenceRef: evidence.trim(), rates: parseRows(rows) }
      }
      // Required before entering the lock too; unsupported APIs never send HTTP.
      readPending()
      busy.current = true; setWorking(true); setError(''); setNotice('')
      await navigator.locks.request(storageKey, async () => {
        let record = readPending()
        if (intended && record?.key !== intended.key) {
          setNotice('That change was resolved in another tab. Review the refreshed rates before publishing again.')
          await load()
          return
        }
        if (!record) {
          record = { version: 1, actorId, key: crypto.randomUUID(), body }
          const raw = JSON.stringify(record)
          localStorage.setItem(storageKey, raw)
          if (localStorage.getItem(storageKey) !== raw) throw new Error('The change could not be saved safely in this browser. Nothing was sent; contact the administrator.')
        }
        if (!mounted.current) return
        setPending(record)
        const result = await publishCustomerDeliveryRatesBff(record.body, record.key)
        if (!mounted.current) return
        if (result.ok && result.result?.policy === 'jt_current' && result.result.version === record.body.expectedVersion + 1) {
          localStorage.removeItem(storageKey)
          setPending(null)
          setNotice(`Customer delivery rates published as version ${result.result.version}. Previously accepted order charges stay unchanged.`)
          await load()
        } else if (result.code === 'CUSTOMER_TARIFF_VERSION_STALE') {
          // Native receipt lookup precedes this no-commit version refusal.
          localStorage.removeItem(storageKey)
          setPending(null); setReadReady(false); setReviewed(false)
          setError(result.error)
        } else {
          setError(`${result.error || 'The reply did not confirm publication.'} The change may already be saved. Editing is paused; retry the same change.`)
        }
      })
    } catch (failure) {
      if (mounted.current) setError(failure instanceof SyntaxError ? 'The pending change could not be restored safely. Keep it and contact the administrator.' : failure.message)
    } finally {
      busy.current = false
      if (mounted.current) setWorking(false)
    }
  }

  return <section className="min-w-0 space-y-5">
    <WorkspaceIntro title="Customer delivery rates" description="Maintain the standard delivery fees customers review at checkout." actions={
      <button className={secondaryButton} type="button" onClick={load} disabled={working || loading}>Refresh saved rates</button>
    } />
    <p className="max-w-prose text-base text-white/80">These are customer charges for standard delivery. Pickup remains free. NCR express needs a separate current staff quote and buyer acceptance before payment.</p>
    {notice && <StateBanner tone="success" role="status">{notice}</StateBanner>}
    {error && <StateBanner tone="danger" role="alert">{error}</StateBanner>}
    {loading && <p role="status" className="text-white/80">Loading saved customer rates…</p>}
    {!loading && readReady && <div className="space-y-1 border-b border-adm-line pb-4 text-sm text-white/80">
      <p>{current ? `Saved customer rate version ${current.version}` : 'No customer rates published. Enter all four regions using reviewed evidence.'}</p>
      {current && <><p className="break-words">Last reason: {current.reason}</p><p className="break-all">Evidence: {current.evidenceRef}</p></>}
      <p>Future standard delivery remains outside this editor.</p>
    </div>}
    {pending && <div className="space-y-3 border-b border-adm-line pb-4">
      <p role="status" className="text-base text-white/90">A change is awaiting confirmation. Refreshing keeps it; retry publishes the same reviewed change.</p>
      <button type="button" className={primaryButton} onClick={publish} disabled={working}>{working ? 'Confirming change…' : 'Retry pending rate change'}</button>
    </div>}
    <form onSubmit={publish} className="space-y-5">
      <fieldset disabled={working || loading || !readReady || Boolean(pending)} className="space-y-4 disabled:opacity-60">
        <legend className="mb-3 text-base font-semibold text-white">Standard delivery matrix</legend>
        {AREAS.map((area, index) => <fieldset key={area} className="border-b border-adm-line pb-4">
          <legend className="mb-2 text-base font-semibold text-white">{area}</legend>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {FIELDS.map(([field, label]) => <label key={field} htmlFor={`customer-rate-${index}-${field}`} className="block min-w-0 text-sm text-white/90">
              <span className="mb-1 block">{label}</span>
              <input id={`customer-rate-${index}-${field}`} className="adm-input min-h-11 w-full font-mono text-base" inputMode={field === 'includedWeightG' ? 'numeric' : 'decimal'} required
                value={rows[area][field]} onChange={event => { setRows(previous => ({ ...previous, [area]: { ...previous[area], [field]: event.target.value } })); setReviewed(false) }} />
            </label>)}
          </div>
        </fieldset>)}
        <p className="max-w-prose text-sm text-white/80">The base fee covers the included grams. Each started extra kilogram adds its fee, then the total rounds up to the specified peso increment.</p>
        <label className="block text-sm text-white/90">Change reason<input className="adm-input min-h-11 text-base" required maxLength={500} value={reason} onChange={event => { setReason(event.target.value); setReviewed(false) }} /></label>
        <label className="block text-sm text-white/90">Evidence reference<input className="adm-input min-h-11 text-base" required maxLength={500} value={evidence} onChange={event => { setEvidence(event.target.value); setReviewed(false) }} /></label>
        <label className="flex min-h-11 items-start gap-3 text-base text-white/90"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I reviewed all four regions and the evidence for these customer charges.</label>
        <button type="submit" className={primaryButton} disabled={!reviewed}>{working ? 'Publishing…' : 'Publish customer rates'}</button>
      </fieldset>
    </form>
  </section>
}
