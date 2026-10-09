import { useEffect, useRef, useState } from 'react'
import { peso } from '../../data/products'
import { readExpressAcceptance, writeExpressAcceptance, withExpressAcceptanceLock, validExpressReceipt, expressAcceptanceStorageKey } from '../../services/expressAcceptanceRecovery'

const primary = 'min-h-12 rounded-xl bg-crimson px-5 text-base font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-50'
const secondary = 'min-h-11 rounded-xl border border-line px-4 text-base font-semibold text-navy disabled:opacity-50'
const terminalCodes = new Set(['EXPRESS_QUOTE_STALE', 'EXPRESS_QUOTE_EXPIRED', 'EXPRESS_ORDER_INELIGIBLE'])
function validQuote(q) {
  return q && Number.isInteger(q.quoteVersion) && q.quoteVersion > 0 && ['Lalamove', 'Grab'].includes(q.courier)
    && Number.isInteger(q.feeMinor) && q.feeMinor >= 0 && q.feeMinor <= 10000000
    && ['subtotal', 'discountAmount', 'proposedTotal'].every(k => Number.isFinite(q[k]) && q[k] >= 0)
    && typeof q.accepted === 'boolean' && ['quotedAt', 'expiresAt'].every(k => typeof q[k] === 'string' && Number.isFinite(Date.parse(q[k])))
    && typeof q.availabilityNote === 'string' && q.availabilityNote.length <= 500
}
export default function ExpressDeliveryApproval({ reference, quote, identity, onSubmit, onAccepted, onRefresh, offline = false }) {
  const [record, setRecord] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [reviewed, setReviewed] = useState(false), [clock, setClock] = useState(Date.now())
  const active = useRef(true), currentIdentity = useRef(identity), working = useRef(false)
  currentIdentity.current = identity
  useEffect(() => {
    active.current = true
    const restore = () => { try { setRecord(readExpressAcceptance(reference)); setError('') } catch (e) { setError(e.message) } }
    restore()
    const changed = e => { if (e.key === expressAcceptanceStorageKey(reference) && !working.current) restore() }
    const timer = setInterval(() => setClock(Date.now()), 1000)
    window.addEventListener('storage', changed)
    return () => { active.current = false; clearInterval(timer); window.removeEventListener('storage', changed) }
  }, [reference])
  useEffect(() => setReviewed(false), [quote?.quoteVersion, quote?.expiresAt, identity])
  const pending = record?.state === 'pending', paused = pending && record.identity !== identity
  const safe = validQuote(quote), expired = safe && Date.parse(quote.expiresAt) <= clock
  const resolved = record?.state === 'resolved' && record.identity === identity
  const submit = async e => {
    e.preventDefault()
    if (working.current || offline) return
    const actor = identity, intendedKey = pending ? record.body.idempotencyKey : null
    try {
      if (!actor || paused) throw Error('Return to the account that started this approval before retrying.')
      if (!pending && (!safe || expired || quote.accepted || !reviewed)) throw Error('Refresh and review the current complete quote before accepting.')
      working.current = true; setBusy(true); setError('')
      await withExpressAcceptanceLock(reference, async () => {
        if (!active.current || currentIdentity.current !== actor) return
        let held = readExpressAcceptance(reference)
        if (intendedKey && (held?.state !== 'pending' || held.body.idempotencyKey !== intendedKey)) {
          setRecord(held); setReviewed(false); return
        }
        if (held?.state === 'pending' && held.identity !== actor) throw Error('Return to the account that started this approval before retrying.')
        if (held?.state === 'resolved') { setRecord(held); return }
        if (held?.state !== 'pending') {
          if (!safe || Date.parse(quote.expiresAt) <= Date.now() || !reviewed) throw Error('This quote expired. Refresh before accepting.')
          held = writeExpressAcceptance(reference, { version: 1, state: 'pending', identity: actor,
            body: { orderReference: reference, quoteVersion: quote.quoteVersion, idempotencyKey: crypto.randomUUID() } })
        }
        setRecord(held)
        const result = await onSubmit(held.body)
        // Persist authoritative resolution even if account changes; only that
        // original actor can consume it. Never persist tokens or guest secrets.
        if (result.ok && validExpressReceipt(result.data, held.body)) {
          const r = result.data
          held = writeExpressAcceptance(reference, { ...held, state: 'resolved', receipt: {
            orderReference: r.orderReference, quoteVersion: r.quoteVersion, shippingQuoteStatus: r.shippingQuoteStatus,
            totalAmount: r.totalAmount, acceptedAt: r.acceptedAt } })
          if (active.current && currentIdentity.current === actor) { setRecord(held); await onAccepted?.(held.receipt) }
        } else if (!result.ok && terminalCodes.has(result.code)) {
          held = writeExpressAcceptance(reference, { ...held, state: 'rejected' })
          if (active.current && currentIdentity.current === actor) { setRecord(held); setReviewed(false); setError(result.error || 'Refresh and review the current quote before accepting again.') }
        } else if (active.current && currentIdentity.current === actor) {
          setError(result.error || 'We could not confirm the result. Retry this exact approval; do not start another.')
        }
      })
    } catch (failure) { if (active.current && currentIdentity.current === actor) setError(failure.message) }
    finally { working.current = false; if (active.current) setBusy(false) }
  }
  return <section className="mt-5 border-t border-line pt-5 text-left" aria-label={`Express delivery review for ${reference}`}>
    <h2 className="font-serif text-xl font-semibold text-navy">Review express delivery</h2>
    {resolved || (safe && quote.accepted && !pending) ? <p className="mt-2 text-base text-navy" role="status">Delivery accepted. Final total {peso(resolved ? record.receipt.totalAmount : quote.proposedTotal)}. Wait for staff payment instructions.</p>
      : safe ? <><dl className="mt-3 space-y-2 text-base text-navy">
        {[['Courier', quote.courier], ['Items', peso(quote.subtotal)], ['Discount', peso(quote.discountAmount)], ['Delivery', peso(quote.feeMinor / 100)], ['Complete total', peso(quote.proposedTotal)], ['Quote expires', new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(quote.expiresAt))]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-x-5 gap-y-1"><dt>{label}</dt><dd className={label === 'Complete total' ? 'font-bold tabular-nums' : 'tabular-nums'}>{value}</dd></div>)}
      </dl><p className="mt-3 break-words text-sm leading-6 text-navy-soft">{quote.availabilityNote}</p><p className="mt-2 text-sm leading-6 text-navy-soft">Accepting confirms this bill. It does not book the courier or guarantee dispatch.</p></>
      : <p className="mt-2 text-base text-navy-soft">{quote ? 'The quote could not be read safely. Refresh before accepting.' : 'Staff have not provided a delivery quote yet. No final bill or payment is due.'}</p>}
    {paused && <p role="alert" className="mt-3 text-base text-crimson">An approval is waiting for the account that started it. Return to that account; its request is kept.</p>}
    {pending && !paused && <p role="status" className="mt-3 text-base text-navy">Your approval result is uncertain. Retry the saved request even if the displayed quote has since expired.</p>}
    {expired && !pending && !resolved && !quote.accepted && <p role="status" className="mt-3 text-base text-navy">This quote expired. Ask staff for a current quote.</p>}
    {error && <p role="alert" className="mt-3 text-base text-crimson">{error}</p>}
    {!resolved && (!(safe && quote.accepted) || pending) && <form onSubmit={submit} className="mt-4 space-y-3">
      {!pending && safe && !expired && <label className="flex min-h-11 items-start gap-3 text-base text-navy"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-crimson" checked={reviewed} onChange={e => setReviewed(e.target.checked)} disabled={busy || offline} /><span>I reviewed and accept the complete total of {peso(quote.proposedTotal)}.</span></label>}
      <div className="flex flex-wrap gap-3"><button className={primary} disabled={busy || offline || paused || (!pending && (!safe || expired || !reviewed))}>{busy ? 'Checking approval…' : pending ? 'Retry saved approval' : 'Accept final total'}</button><button className={secondary} type="button" onClick={onRefresh} disabled={busy || offline}>Refresh order</button></div>
    </form>}
  </section>
}
