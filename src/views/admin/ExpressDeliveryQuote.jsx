import { useCallback, useEffect, useRef, useState } from 'react'
import { AdminDialog } from '../../components/ui/AdminDialog'
import { adminBffEnabled, getExpressDeliveryQuoteBff, publishExpressDeliveryQuoteBff } from '../../services/adminBffService'
import { StateBanner, primaryButton, secondaryButton } from './AdminWorkspaceUi'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TEXT_FIELDS = [['route', 'Checked pickup and drop-off'], ['packageDescription', 'Package size, weight and handling'],
  ['availabilityNote', 'Current availability and proposed timing'], ['evidenceRef', 'Courier quotation evidence'], ['note', 'Quotation note']]
const blank = () => ({ courier: '', fee: '', quotedAt: '', expiresAt: '', ...Object.fromEntries(TEXT_FIELDS.map(([field]) => [field, ''])) })
const validBody = body => body && Object.keys(body).length === 11 && UUID.test(body.orderRequestId || '')
  && Number.isInteger(body.expectedVersion) && body.expectedVersion >= 0 && body.expectedVersion <= 2147483646
  && ['Lalamove', 'Grab'].includes(body.courier) && Number.isInteger(body.feeMinor) && body.feeMinor >= 0 && body.feeMinor <= 10000000
  && ['quotedAt', 'expiresAt'].every(field => typeof body[field] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(body[field]) && Number.isFinite(Date.parse(body[field])))
  && Date.parse(body.expiresAt) > Date.parse(body.quotedAt)
  && TEXT_FIELDS.every(([field]) => typeof body[field] === 'string' && body[field].trim() && body[field].length <= 500)
const money = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
const manilaTime = raw => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) throw Error('Enter both quotation times in Manila time.')
  const time = new Date(`${raw}:00+08:00`)
  if (!Number.isFinite(time.getTime())) throw Error('Enter valid quotation times.')
  return time.toISOString()
}

export default function ExpressDeliveryQuote({ order, actorId, onClose, onSaved, returnFocusRef }) {
  const storageKey = `k2-express-quote-pending-v1:${actorId}:${order.id}`
  const mounted = useRef(true)
  const busy = useRef(false)
  const firstInput = useRef(null)
  const [form, setForm] = useState(blank)
  const [head, setHead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [pending, setPending] = useState(null)
  const [reviewed, setReviewed] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const readPending = useCallback(() => {
    if (typeof actorId !== 'string' || !UUID.test(actorId) || !UUID.test(order.id) || !navigator.locks?.request) throw Error('Safe quotation recovery is unavailable. Contact the administrator before publishing.')
    const raw = localStorage.getItem(storageKey)
    if (raw === null) return null
    if (new TextEncoder().encode(raw).length > 16384) throw Error('The saved quotation cannot be restored safely. Keep it and contact the administrator.')
    const saved = JSON.parse(raw)
    if (saved?.version !== 1 || saved.actorId !== actorId || typeof saved.key !== 'string' || !UUID.test(saved.key)
      || !validBody(saved.body) || saved.body.orderRequestId !== order.id) throw Error('The saved quotation cannot be restored safely. Keep it and contact the administrator.')
    return saved
  }, [actorId, order.id, storageKey])
  const load = useCallback(async () => {
    setLoading(true); setHead(null); setReviewed(false)
    try {
      const held = readPending()
      if (mounted.current) setPending(held)
      if (!adminBffEnabled()) throw Error('Secure staff quotation is not enabled. Contact the administrator.')
      const result = await getExpressDeliveryQuoteBff(order.id)
      if (!mounted.current) return
      if (!result.ok) throw Error(result.error)
      if (result.orderRequestId !== order.id || !Number.isInteger(result.currentVersion) || result.currentVersion < 0
        || typeof result.eligible !== 'boolean' || (result.currentVersion === 0) !== (result.quote === null)) throw Error('The current quotation could not be read safely. Refresh before publishing.')
      setHead(result); setError('')
    } catch (failure) {
      if (mounted.current) setError(failure instanceof SyntaxError ? 'The saved quotation cannot be restored safely. Keep it and contact the administrator.' : failure.message)
    } finally { if (mounted.current) setLoading(false) }
  }, [readPending, order.id])
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
    const intendedKey = pending?.key
    let body
    try {
      readPending()
      if (!intendedKey) {
        if (!head?.eligible || !reviewed || loading) throw Error('Load the current version and review the observed quotation before publishing.')
        if (!/^\d+(\.\d{1,2})?$/.test(form.fee.trim())) throw Error('Enter the delivery fee in pesos with at most two decimal places.')
        body = { orderRequestId: order.id, expectedVersion: head.currentVersion, courier: form.courier,
          feeMinor: Math.round(Number(form.fee) * 100), quotedAt: manilaTime(form.quotedAt), expiresAt: manilaTime(form.expiresAt),
          ...Object.fromEntries(TEXT_FIELDS.map(([field]) => [field, form[field].trim()])) }
        if (!validBody(body)) throw Error('Complete all observed facts. The fee must be between ₱0 and ₱100,000.')
        const now = Date.now()
        if (Date.parse(body.quotedAt) > now || Date.parse(body.quotedAt) < now - 86400000
          || Date.parse(body.expiresAt) <= now || Date.parse(body.expiresAt) > now + 86400000) throw Error('Use a quotation from the last 24 hours and an expiry within the next 24 hours.')
      }
      busy.current = true; setWorking(true); setError(''); setNotice('')
      await navigator.locks.request(storageKey, async () => {
        if (!mounted.current) return
        let record = readPending()
        if (intendedKey && record?.key !== intendedKey) { setNotice('That quotation was resolved in another tab. Refresh and review before publishing again.'); await load(); return }
        if (!record) {
          record = { version: 1, actorId, key: crypto.randomUUID(), body }
          const raw = JSON.stringify(record)
          if (new TextEncoder().encode(raw).length > 16384) throw Error('The quotation is too large to retain safely. Nothing was sent.')
          localStorage.setItem(storageKey, raw)
          if (localStorage.getItem(storageKey) !== raw) throw Error('The quotation could not be retained safely. Nothing was sent.')
        }
        setPending(record)
        const result = await publishExpressDeliveryQuoteBff(record.body, record.key)
        const receipt = result.receipt
        if (result.ok && receipt?.orderRequestId === order.id && receipt.quoteVersion === record.body.expectedVersion + 1) {
          localStorage.removeItem(storageKey)
          if (!mounted.current) return
          setPending(null); setForm(blank()); setNotice(`Quotation version ${receipt.quoteVersion} published. The customer must approve the full total before payment.`)
          await load()
          await onSaved?.()
        } else if (['EXPRESS_QUOTE_STALE', 'EXPRESS_ORDER_INELIGIBLE'].includes(result.code)) {
          localStorage.removeItem(storageKey)
          if (!mounted.current) return
          setPending(null); setHead(null); setReviewed(false); setError(`${result.error} Refresh and review this order before another quotation.`)
        } else if (mounted.current) setError(`${result.error || 'Publication was not confirmed.'} Keep this quotation and retry the same command.`)
      })
    } catch (failure) {
      if (mounted.current) setError(failure instanceof SyntaxError ? 'The saved quotation cannot be restored safely. Keep it and contact the administrator.' : failure.message)
    } finally { busy.current = false; if (mounted.current) setWorking(false) }
  }
  const update = field => event => { setForm(current => ({ ...current, [field]: event.target.value })); setReviewed(false) }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3" role="presentation">
    <AdminDialog onClose={onClose} closeDisabled={working} initialFocusRef={firstInput} returnFocusRef={returnFocusRef} labelledBy="express-quote-title">
      <section className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl space-y-4 overflow-y-auto rounded-adm border border-adm-line bg-adm-surface p-5 text-white">
        <h2 id="express-quote-title" className="text-xl font-semibold">Express delivery quotation</h2>
        <p className="break-words text-base text-white/80">{order.publicReference || order.public_reference} · Record an observed courier quote. This does not book delivery or approve it for the customer.</p>
        {loading && <p role="status">Loading current quotation…</p>}
        {error && <StateBanner tone="danger" role="alert">{error}</StateBanner>}
        {notice && <StateBanner tone="success" role="status">{notice}</StateBanner>}
        {head && <div className="space-y-2 border-b border-adm-line pb-4 text-base text-white/90">
          <p>Current quotation version {head.currentVersion}</p>
          {head.quote ? <><p>{head.quote.courier} · Delivery {money(head.quote.feeMinor / 100)} · Proposed total {money(head.quote.proposedTotal)}</p>
            <p className="break-words">{head.quote.availabilityNote}</p></> : <p>No quotation published. Enter the actual observed facts below.</p>}
          {!head.eligible && <p>This order cannot receive another quotation. Refresh its accepted or cancelled state.</p>}
        </div>}
        {pending && <div className="space-y-2 border-b border-adm-line pb-4">
          <p role="status">A quotation is awaiting confirmation. It stays saved when this screen closes or another staff member signs in.</p>
          <p>{pending.body.courier} · Delivery {money(pending.body.feeMinor / 100)} · Based on version {pending.body.expectedVersion}</p>
          <button type="button" className={primaryButton} disabled={working} onClick={publish}>{working ? 'Confirming quotation…' : 'Retry pending quotation'}</button>
        </div>}
        <form onSubmit={publish} className="space-y-4">
          <fieldset disabled={working || loading || !head?.eligible || Boolean(pending)} className="space-y-4 disabled:opacity-60">
            <legend className="mb-2 text-base font-semibold">Observed quotation facts</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-white/90">Courier<select ref={firstInput} className="adm-input min-h-11 text-base" required value={form.courier} onChange={update('courier')}><option value="">Choose observed courier</option><option>Lalamove</option><option>Grab</option></select></label>
              <label className="block text-sm text-white/90">Delivery fee (₱)<input className="adm-input min-h-11 text-base" inputMode="decimal" required value={form.fee} onChange={update('fee')} /></label>
              <label className="block text-sm text-white/90">Quoted at (Manila time)<input className="adm-input min-h-11 text-base" type="datetime-local" required value={form.quotedAt} onChange={update('quotedAt')} /></label>
              <label className="block text-sm text-white/90">Expires at (Manila time)<input className="adm-input min-h-11 text-base" type="datetime-local" required value={form.expiresAt} onChange={update('expiresAt')} /></label>
            </div>
            {TEXT_FIELDS.map(([field, label]) => <label key={field} className="block text-sm text-white/90">{label}<textarea className="adm-input min-h-20 resize-y text-base" required maxLength={500} value={form[field]} onChange={update(field)} /></label>)}
            <label className="flex min-h-11 items-start gap-3 text-base text-white/90"><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I checked the route, package, price, timing and quotation evidence.</label>
            <button type="submit" className={primaryButton} disabled={!reviewed}>Publish quotation for customer review</button>
          </fieldset>
        </form>
        <div className="flex flex-wrap gap-3 border-t border-adm-line pt-4"><button type="button" className={secondaryButton} disabled={working || loading} onClick={load}>Refresh quotation</button><button type="button" className={secondaryButton} disabled={working} onClick={onClose}>Close</button></div>
      </section>
    </AdminDialog>
  </div>
}
