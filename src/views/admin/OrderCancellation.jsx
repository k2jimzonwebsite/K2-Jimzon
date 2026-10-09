import { useCallback, useEffect, useRef, useState } from 'react'
import { AdminDialog } from '../../components/ui/AdminDialog'
import { adminBffEnabled, cancelOrderBff, getAdminFulfillment } from '../../services/adminBffService'
import { StateBanner, primaryButton, secondaryButton } from './AdminWorkspaceUi'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PREFIX = 'k2-order-cancellation-pending-v1:'
const CHANGED = 'k2-cancellation-pending-changed'
const unsafe = () => Error('The saved cancellation cannot be restored safely. Keep it and contact the administrator.')
const storageKey = (actor, order) => `${PREFIX}${actor}:${order}`
const validBody = body => body && Object.keys(body).length === 4 && UUID.test(body.orderRequestId || '')
  && ['submitted', 'confirmed'].includes(body.expectedStatus)
  && typeof body.expectedUpdatedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(body.expectedUpdatedAt)
  && Number.isFinite(Date.parse(body.expectedUpdatedAt))
  && typeof body.reason === 'string' && body.reason === body.reason.trim() && body.reason.length > 0 && body.reason.length <= 500

function readPending(actor, order) {
  if (!UUID.test(actor || '') || !UUID.test(order || '') || !navigator.locks?.request) throw unsafe()
  const raw = localStorage.getItem(storageKey(actor, order))
  if (raw === null) return null
  try {
    if (new TextEncoder().encode(raw).length > 4096) throw unsafe()
    const saved = JSON.parse(raw)
    if (Object.keys(saved).length !== 5 || saved.version !== 1 || saved.actorId !== actor || !UUID.test(saved.key || '')
      || typeof saved.reference !== 'string' || !saved.reference.trim() || saved.reference.length > 80
      || !validBody(saved.body) || saved.body.orderRequestId !== order) throw unsafe()
    return saved
  } catch { throw unsafe() }
}
const changed = () => window.dispatchEvent(new Event(CHANGED))
function clearMatching(actor, order, key) {
  if (readPending(actor, order)?.key !== key) throw unsafe()
  localStorage.removeItem(storageKey(actor, order)); changed()
}

export function PendingOrderCancellations({ actorId, onSelect }) {
  const [records, setRecords] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    const refresh = () => {
      const found = []; let failure = ''
      try {
        if (!UUID.test(actorId || '')) throw unsafe()
        for (const key of Object.keys(localStorage).filter(key => key.startsWith(`${PREFIX}${actorId}:`))) {
          try { const saved = readPending(actorId, key.slice(`${PREFIX}${actorId}:`.length)); if (saved) found.push(saved) }
          catch { failure = unsafe().message }
        }
      } catch { failure = 'Cancellation recovery storage is unavailable. Contact the administrator.' }
      setRecords(found); setError(failure)
    }
    refresh(); window.addEventListener(CHANGED, refresh); window.addEventListener('storage', refresh)
    return () => { window.removeEventListener(CHANGED, refresh); window.removeEventListener('storage', refresh) }
  }, [actorId])
  if (!records.length && !error) return null
  return <section className="space-y-3 border-b border-adm-line py-4" aria-label="Pending cancellations">
    <h2 className="text-lg font-semibold text-white">Pending cancellations</h2>
    <p className="text-base text-white/80">These commands are awaiting confirmation. Review and retry the saved command; an order missing from the queue does not confirm cancellation.</p>
    {error && <StateBanner tone="danger" role="alert">{error}</StateBanner>}
    <div className="flex flex-wrap gap-3">{records.map(record => <button key={record.key} type="button" className={`${secondaryButton} max-w-full break-words`}
      onClick={() => onSelect({ id: record.body.orderRequestId, publicReference: record.reference })}>Review pending cancellation {record.reference}</button>)}</div>
  </section>
}

export default function OrderCancellation({ actorId, order, onClose, onSaved, returnFocusRef }) {
  const mounted = useRef(true); const busy = useRef(false)
  const [head, setHead] = useState(null); const [pending, setPending] = useState(null)
  const [loading, setLoading] = useState(true); const [working, setWorking] = useState(false)
  const [reason, setReason] = useState(''); const [reviewed, setReviewed] = useState(false)
  const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const key = storageKey(actorId, order.id)
  const load = useCallback(async () => {
    setLoading(true); setHead(null); setReviewed(false)
    try {
      const held = readPending(actorId, order.id)
      if (mounted.current) setPending(held)
      if (!adminBffEnabled()) throw Error('Secure staff cancellation is not enabled. Contact the administrator.')
      const response = await getAdminFulfillment()
      if (!mounted.current) return
      if (!response.ok) throw Error(response.error)
      const rows = ['submitted', 'confirmed'].flatMap(status => (response.data?.[status] || []).map(row => ({ ...row, nativeStatus: status })))
      const current = rows.find(row => row.id === order.id)
      if (current && (!validBody({ orderRequestId: current.id, expectedStatus: current.nativeStatus, expectedUpdatedAt: current.updated_at, reason: 'review' })
        || typeof current.public_reference !== 'string' || !current.public_reference.trim() || current.public_reference.length > 80)) throw Error('The current order could not be read safely. Refresh before cancelling.')
      setHead(current || null); setError('')
    } catch (failure) { if (mounted.current) setError(failure.message) }
    finally { if (mounted.current) setLoading(false) }
  }, [actorId, order.id])
  useEffect(() => {
    mounted.current = true; load()
    const refresh = event => { if (event.key === key && !busy.current) load() }
    window.addEventListener('storage', refresh)
    return () => { mounted.current = false; window.removeEventListener('storage', refresh) }
  }, [key, load])

  const submit = async event => {
    event?.preventDefault()
    if (busy.current) return
    const intendedKey = pending?.key || null
    let body
    try {
      readPending(actorId, order.id)
      if (!intendedKey) {
        if (!head || loading || !reviewed) throw Error('Refresh and review the current order before cancelling.')
        body = { orderRequestId: order.id, expectedStatus: head.nativeStatus, expectedUpdatedAt: head.updated_at, reason: reason.trim() }
        if (!validBody(body)) throw Error('Enter a cancellation reason of 1 to 500 characters.')
      }
      busy.current = true; setWorking(true); setError(''); setNotice('')
      await navigator.locks.request(key, async () => {
        if (!mounted.current) return
        let record = readPending(actorId, order.id)
        if ((record?.key || null) !== intendedKey) throw Error('The saved command changed in another tab. Refresh and review before continuing.')
        if (!record) {
          record = { version: 1, actorId, key: crypto.randomUUID(), reference: head.public_reference, body }
          const raw = JSON.stringify(record)
          if (new TextEncoder().encode(raw).length > 4096) throw unsafe()
          localStorage.setItem(key, raw)
          if (localStorage.getItem(key) !== raw) throw Error('The cancellation could not be saved safely. Nothing was sent.')
          changed()
        }
        setPending(record)
        const response = await cancelOrderBff(record.body, record.key)
        const receipt = response.result
        if (response.ok && receipt?.orderRequestId === order.id && receipt.status === 'cancelled'
          && typeof receipt.publicReference === 'string' && receipt.publicReference.trim() && receipt.publicReference.length <= 80
          && ['not_requested', 'unpaid', 'awaiting_instructions', 'evidence_submitted', 'verified', 'failed', 'refunded'].includes(receipt.paymentStatus)) {
          clearMatching(actorId, order.id, record.key)
          if (!mounted.current) return
          setPending(null); setHead(null); setReviewed(false); setReason('')
          setNotice('Cancellation confirmed. Stock holds were released. This does not issue a refund; review any payment separately.')
          await onSaved?.()
        } else if (['CANCELLATION_VERSION_CONFLICT', 'CANCELLATION_ORDER_INELIGIBLE'].includes(response.code)) {
          clearMatching(actorId, order.id, record.key)
          if (!mounted.current) return
          setPending(null); setHead(null); setReviewed(false)
          setError('This order changed or no longer allows cancellation. Refresh and review before another command.')
        } else if (mounted.current) setError(`${response.error || 'Cancellation was not confirmed.'} The command stays saved. Retry the same cancellation when access or connection is restored.`)
      })
    } catch (failure) { if (mounted.current) setError(failure.message) }
    finally { busy.current = false; if (mounted.current) setWorking(false) }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3" role="presentation">
    <AdminDialog onClose={onClose} closeDisabled={working} returnFocusRef={returnFocusRef} labelledBy="order-cancellation-title">
      <section className="max-h-[calc(100dvh-1.5rem)] w-full max-w-xl space-y-4 overflow-y-auto rounded-adm border border-adm-line bg-adm-surface p-5 text-white">
        <h2 id="order-cancellation-title" className="text-xl font-semibold">Cancel order</h2>
        <p className="break-words text-base text-white/90">{order.publicReference || order.public_reference || order.id}</p>
        <p className="text-base text-white/80">Cancellation releases stock holds. It does not refund a payment. Handle any refund through the finance workflow.</p>
        {loading && <p role="status">Loading current order…</p>}
        {error && <StateBanner tone="danger" role="alert">{error}</StateBanner>}
        {notice && <StateBanner tone="success" role="status">{notice}</StateBanner>}
        {pending ? <div className="space-y-3 border-b border-adm-line pb-4">
          <p role="status">A cancellation is awaiting confirmation. It remains saved when this screen closes.</p>
          <p className="break-words text-base">Saved reason: {pending.body.reason}</p>
          <button type="button" className={primaryButton} disabled={working} onClick={submit}>{working ? 'Confirming cancellation…' : 'Retry pending cancellation'}</button>
        </div> : <form onSubmit={submit} className="space-y-4">
          {head ? <p className="text-base">Order: {head.nativeStatus} · Payment: {String(head.payment_status || 'unknown').replaceAll('_', ' ')}</p>
            : !loading && !notice && <p>No eligible order was found in the current queue. Refresh or review its history; this does not prove cancellation.</p>}
          <fieldset disabled={working || loading || !head} className="space-y-4 disabled:opacity-60">
            <label className="block text-base">Cancellation reason<textarea className="adm-input min-h-24 resize-y text-base" required maxLength={500} value={reason}
              onChange={event => { setReason(event.target.value); setReviewed(false) }} /></label>
            <label className="flex min-h-11 items-start gap-3 text-base"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I reviewed this order and reason, and understand that cancellation does not issue a refund.</label>
            <button type="submit" className={primaryButton} disabled={!reviewed}>Cancel order</button>
          </fieldset>
        </form>}
        <div className="flex flex-wrap gap-3 border-t border-adm-line pt-4"><button type="button" className={secondaryButton} disabled={working || loading} onClick={load}>Refresh order</button>
          <button type="button" className={secondaryButton} disabled={working} onClick={onClose}>Close</button></div>
      </section>
    </AdminDialog>
  </div>
}
