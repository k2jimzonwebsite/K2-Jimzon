import React, { useEffect, useRef, useState } from 'react'
import { automaticIntakeRequest } from '../../services/productIntakeService'

const button = 'min-h-[44px] rounded-lg border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-50 disabled:cursor-not-allowed'
const money = value => value == null ? 'Not approved' : `$${(value / 1000000).toFixed(2)} USD`
export default function AutomaticIntakePanel({ session, isOnline, onContent, onBusy }) {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [briefs, setBriefs] = useState({ PRIMARY: '', AFTER: '' })
  const [reasons, setReasons] = useState({})
  const [candidates, setCandidates] = useState({})
  const lock = useRef(false)
  const generation = useRef(0)
  useEffect(() => { generation.current++; setState(null); setError(''); setConfirmed(false); setCandidates({}) }, [session.id])
  useEffect(() => () => { generation.current++ }, [])
  async function act(action, payload = {}) {
    if (lock.current || !isOnline) return
    lock.current = true; setBusy(true); onBusy(true); setError('')
    const token = generation.current
    try {
      const result = await automaticIntakeRequest(session.id, action, payload)
      if (action === 'candidate' && token === generation.current) setCandidates(current => ({ ...current, [result.job.id]: result.job.result.image }))
      const next = action === 'read' ? result : await automaticIntakeRequest(session.id, 'read')
      if (token === generation.current) { setState(next); setConfirmed(false) }
    } catch (failure) { if (token === generation.current) setError(failure.userMessage) }
    finally { lock.current = false; if (token === generation.current) setBusy(false); onBusy(false) }
  }
  const jobs = state?.jobs || []
  const content = jobs.find(job => job.kind === 'content')
  const reviewed = session.field_decisions?.name === 'accepted' && session.draft_payload?.product?.name
  async function loadContent() {
    if (lock.current || !isOnline) return
    lock.current = true; setBusy(true); onBusy(true); setError('')
    try { await onContent(content.result.content) }
    catch (failure) { setError(failure.userMessage || 'Field review could not be opened. Recover the saved content and try again.') }
    finally { lock.current = false; setBusy(false); onBusy(false) }
  }
  return <section aria-label="Automatic API intake" className="space-y-3 border-t border-white/15 pt-4 text-sm">
    <h4 className="font-semibold text-white">Automatic API (paid)</h4>
    <p className="text-white/80">Prepare content from registered package evidence. Review fields first, then request each image separately. No stock, pricing or publication is created.</p>
    <button type="button" className={button} disabled={busy || !isOnline} onClick={() => act('read')}>Check readiness / Recover saved results</button>
    {busy && <p role="status" className="text-white/80">Checking the saved job. Keep this intake open.</p>}
    {error && <p role="alert" className="text-amber-200">{error}</p>}
    {state && <>
      <p role="status">{state.readiness.ready ? 'Configured for deliberate paid requests.' : 'Automatic requests unavailable.'}</p>
      {!state.readiness.ready && <ul className="list-disc pl-5 text-amber-200">{state.readiness.missing.map(message => <li key={message}>{message}</li>)}</ul>}
      <p className="text-white/80">Reserved this session: {money(state.budget.sessionReserved)} / {money(state.budget.perSessionCap)}. Month: {money(state.budget.monthReserved)} / {money(state.budget.monthlyCap)}. Reservations include uncertain outcomes; these are not invoice totals.</p>
      <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />I confirm one paid request using package evidence only.</label>
      {!content && !session.product_id && <button type="button" className={button} disabled={busy || !isOnline || !confirmed || !state.readiness.ready} onClick={() => act('start', { kind: 'content', confirmation: 'CONFIRM_PAID_INTAKE' })}>Prepare content — reserve {money(state.readiness.reservations.content)}</button>}
      {content && <div className="space-y-2">
        <p>Content: {content.status === 'dispatched' ? 'Started; outcome not yet confirmed. Recover results; do not start again.' : content.status === 'failed' ? `Unavailable (${content.failure}). Use the manual path.` : 'Draft ready for field review.'}</p>
        {content.result?.content && <button type="button" className={button} disabled={busy || !isOnline || Boolean(session.product_id)} onClick={loadContent}>Load content into field review</button>}
      </div>}
      {['PRIMARY', 'AFTER'].map(kind => {
        const job = jobs.find(item => item.kind === kind)
        return <div key={kind} className="space-y-2 border-t border-white/10 pt-3">
          <h5 className="font-semibold">{kind} image candidate</h5>
          {!job && <>
            <label className="block" htmlFor={`ai-brief-${kind}`}>Reviewed composition brief</label>
            <textarea id={`ai-brief-${kind}`} value={briefs[kind]} maxLength={1500} disabled={busy} onChange={event => setBriefs(current => ({ ...current, [kind]: event.target.value }))} className="min-h-[88px] w-full rounded-lg border border-white/20 bg-black/20 p-3 text-white" />
            {!reviewed && <p className="text-white/80">Save the field review with the product name accepted before requesting images.</p>}
            <button type="button" className={button} disabled={busy || !isOnline || !confirmed || !state.readiness.ready || !reviewed || briefs[kind].trim().length < 8 || Boolean(session.product_id)} onClick={() => act('start', { kind, brief: briefs[kind], confirmation: 'CONFIRM_PAID_INTAKE' })}>Prepare {kind} — reserve {money(state.readiness.reservations[kind])}</button>
          </>}
          {job && <p>{job.status === 'dispatched' ? 'Started; outcome unconfirmed. Recover results or continue manually.' : `${job.status}${job.decision ? ` · ${job.decision}` : ' · review pending'}`}</p>}
          {job?.status === 'completed' && <button type="button" className={button} disabled={busy || !isOnline} onClick={() => act('candidate', { jobId: job.id })}>Load {kind} candidate for review</button>}
          {job && candidates[job.id] && <>
            <img src={`data:image/png;base64,${candidates[job.id]}`} alt={`${kind} generated candidate; verify against original package`} className="max-h-64 w-full rounded-lg object-contain" />
            {job.decision === 'accepted' && <>
              <p>{job.attachment_result ? 'Attached through the canonical media command.' : session.product_id ? 'Ready to attach to this Draft. This replaces the selected image slot.' : 'Create the Product Draft before attaching this accepted candidate.'}</p>
              {session.product_id && !job.attachment_result && <button type="button" className={button} disabled={busy || !isOnline} onClick={() => act('attach', { jobId: job.id })}>Attach reviewed {kind} to Draft</button>}
            </>}
            {!job.decision && <>
              <label htmlFor={`ai-review-${kind}`} className="block">Review reason — package fidelity, truth, rights and composition</label>
              <input id={`ai-review-${kind}`} value={reasons[kind] || ''} maxLength={500} onChange={event => setReasons(current => ({ ...current, [kind]: event.target.value }))} className="min-h-[44px] w-full rounded-lg border border-white/20 bg-black/20 p-3" />
              <div className="flex flex-wrap gap-2">{['accepted', 'rejected'].map(decision => <button type="button" key={decision} className={button} disabled={busy || !isOnline || (reasons[kind] || '').trim().length < 8} onClick={() => act('review', { jobId: job.id, decision, reason: reasons[kind] })}>{decision === 'accepted' ? 'Accept candidate' : 'Reject candidate'}</button>)}</div>
            </>}
          </>}
        </div>
      })}
    </>}
    <p className="text-white/80">Manual ChatGPT Projects remains available through the intake steps. AI candidates require review and canonical attachment after Draft creation.</p>
  </section>
}
