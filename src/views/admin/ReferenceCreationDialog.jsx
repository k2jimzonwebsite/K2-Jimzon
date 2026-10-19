import { useEffect, useRef, useState } from 'react'
import { AdminDialog } from '../../components/ui/AdminDialog'
import { createAdminReferenceBff, getAdminReferencesBff, getAdminSessionBff } from '../../services/adminBffService'
import { clearPendingReference, holdPendingReference, isReadableReferenceName, readPendingReference, referenceRecoveryKey, validateReferencePayloadText } from '../../lib/referenceCommandRecovery'
import { primaryButton, secondaryButton } from './AdminWorkspaceUi'

const CHANGED = 'k2-reference-recovery-changed'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const changed = () => window.dispatchEvent(new Event(CHANGED))
function optionsFrom(response) {
  const refs = response.references
  for (const [field, category] of [['brands', false], ['categories', true]]) {
    const rows = refs?.[field]
    if (!response.ok || !Array.isArray(rows) || rows.length > 500 || new Set(rows.map(row => row?.id)).size !== rows.length
      || !rows.every(row => row && UUID.test(row.id) && isReadableReferenceName(row.name)
        && (!category || row.parent_id === null || UUID.test(row.parent_id)))) throw Error('Complete brand and category choices could not be verified. Refresh before continuing.')
  }
  return refs
}
async function currentActor(actorId) {
  const session = await getAdminSessionBff()
  if (!session.ok) throw Error(session.error || 'Sign in again with the original account before retrying.')
  if ((session.user?.userId || session.user?.id) !== actorId) throw Error('The signed-in account changed. Return to the original account before retrying this saved request.')
  if (!['Admin', 'SuperAdmin'].includes(session.user?.role)) throw Error('Only an Admin or SuperAdmin can confirm this reference. The saved request is preserved.')
}

export function PendingReferenceCreation({ actorId, onReview }) {
  const [held, setHeld] = useState(null), [error, setError] = useState('')
  useEffect(() => {
    const refresh = () => {
      try { setHeld(readPendingReference(actorId)); setError('') }
      catch (failure) { setHeld(null); setError(failure.message) }
    }
    refresh(); window.addEventListener(CHANGED, refresh); window.addEventListener('storage', refresh)
    return () => { window.removeEventListener(CHANGED, refresh); window.removeEventListener('storage', refresh) }
  }, [actorId])
  if (!held && !error) return null
  return <section className="mb-4 space-y-2 border-b border-adm-line pb-4" aria-label="Pending reference creation">
    {error ? <p role="alert" className="text-base text-crimson">{error}</p> : <><p className="text-base text-white/80">A reference creation is awaiting confirmation. Review the saved request before creating another.</p>
      <button type="button" className={secondaryButton} onClick={() => onReview(JSON.parse(held.payloadText).kind)}>Review pending reference creation</button></>}
  </section>
}

export default function ReferenceCreationDialog({ actorId, kind, canCreate, onClose, onConfirmed }) {
  const mounted = useRef(true), busy = useRef(false), closeRef = useRef(null)
  const [targetKind, setTargetKind] = useState(kind), [name, setName] = useState(''), [parentId, setParentId] = useState(''), [reason, setReason] = useState('')
  const [pending, setPending] = useState(null), [options, setOptions] = useState(null), [outcome, setOutcome] = useState(null)
  const [loading, setLoading] = useState(true), [working, setWorking] = useState(false), [error, setError] = useState('')
  const load = async () => {
    setLoading(true); setOptions(null)
    try {
      const record = readPendingReference(actorId)
      if (!mounted.current) return
      setPending(record)
      if (record) { const body = validateReferencePayloadText(record.payloadText); setTargetKind(body.kind); setName(body.name); setParentId(body.parentId || ''); setReason(body.reason) }
      if (!navigator.locks?.request) throw Error('Safe reference recovery is unavailable in this browser. Keep any saved request and contact the administrator.')
      const refs = optionsFrom(await getAdminReferencesBff())
      if (mounted.current) { setOptions(refs); setError('') }
    } catch (failure) { if (mounted.current) setError(failure.message) }
    finally { if (mounted.current) setLoading(false) }
  }
  useEffect(() => {
    mounted.current = true; load()
    const refresh = event => { if (!busy.current && (!event.key || event.key === referenceRecoveryKey(actorId))) { setOutcome(null); load() } }
    window.addEventListener('storage', refresh)
    return () => { mounted.current = false; window.removeEventListener('storage', refresh) }
  }, [actorId])
  const submit = async event => {
    event?.preventDefault()
    if (busy.current || !canCreate || loading || outcome || (!pending && !options)) return
    const intended = pending?.key || null
    busy.current = true; setWorking(true); setError('')
    try {
      if (!navigator.locks?.request) throw Error('Safe reference recovery is unavailable in this browser.')
      await navigator.locks.request(referenceRecoveryKey(actorId), async () => {
        if (!mounted.current) return
        let record = readPendingReference(actorId)
        if ((record?.key || null) !== intended) throw Error('The saved request changed in another tab. Refresh and review it before continuing.')
        await currentActor(actorId)
        if (!mounted.current) return
        if (!record) {
          const trimmedReason = reason.trim()
          const effectiveReason = trimmedReason.length >= 8
            ? trimmedReason
            : (trimmedReason.length > 0 ? `Canonical ${targetKind} reference created by admin (${trimmedReason})` : `Canonical ${targetKind} reference created by admin`)
          const payloadText = JSON.stringify({ kind: targetKind, name, parentId: targetKind === 'category' && parentId ? parentId : null, reason: effectiveReason })
          try { validateReferencePayloadText(payloadText) } catch { throw Error('Enter a printable name up to 120 characters and review the category parent.') }
          record = holdPendingReference(actorId, crypto.randomUUID(), payloadText); changed()
        }
        setPending(record)
        const response = await createAdminReferenceBff(record.payloadText, record.key, actorId)
        if (!mounted.current) return
        if (!response.ok) {
          if (['REFERENCE_INVALID', 'REFERENCE_PARENT_INVALID'].includes(response.code)) {
            clearPendingReference(actorId, record.key); changed(); setPending(null)
            throw Error(`${response.error} Nothing was created by this request; correct the details before creating again.`)
          }
          throw Error(`${response.error || 'Creation was not confirmed.'} Keep and retry the same saved request.`)
        }
        const body = validateReferencePayloadText(record.payloadText), reference = response.result?.reference
        if (!reference || !UUID.test(reference.id) || reference.kind !== body.kind || !isReadableReferenceName(reference.name)
          || reference.parentId !== body.parentId || typeof response.result?.reused !== 'boolean') throw Error('The reply did not confirm a valid reference. Keep and retry the same saved request.')
        let refs = null
        try { refs = optionsFrom(await getAdminReferencesBff()) } catch { /* Receipt remains confirmed; selection needs a current read. */ }
        if (!mounted.current) return
        const rows = refs?.[body.kind === 'brand' ? 'brands' : 'categories'] || []
        const available = response.currentReference?.status === 'available' && rows.some(row => row.id === reference.id && row.name === reference.name && (body.kind === 'brand' || row.parent_id === reference.parentId))
        setOutcome({ reference, reused: response.result.reused, refs, available })
      })
    } catch (failure) { if (mounted.current) setError(failure.message) }
    finally { busy.current = false; if (mounted.current) setWorking(false) }
  }
  const acknowledge = async () => {
    if (busy.current || !outcome || !pending || !canCreate) return
    busy.current = true; setWorking(true); setError('')
    try {
      await navigator.locks.request(referenceRecoveryKey(actorId), async () => {
        await currentActor(actorId)
        if (!mounted.current) return
        let confirmed = outcome
        if (outcome.available) {
          let refs = null
          try { refs = optionsFrom(await getAdminReferencesBff()) } catch { /* Reconcile before selecting, while retaining the receipt. */ }
          if (!mounted.current) return
          const rows = refs?.[outcome.reference.kind === 'brand' ? 'brands' : 'categories'] || []
          if (!rows.some(row => row.id === outcome.reference.id && row.name === outcome.reference.name
            && (outcome.reference.kind === 'brand' || row.parent_id === outcome.reference.parentId))) {
            setOutcome({ ...outcome, available: false, refs })
            return
          }
          confirmed = { ...outcome, refs }
        }
        if (!clearPendingReference(actorId, pending.key)) throw Error('That request was resolved in another tab. Refresh before using a reference.')
        changed()
        onConfirmed?.(confirmed.available ? confirmed.reference : null, confirmed.refs, `${confirmed.reused ? 'Matched' : 'Created'} reference; product changes are not saved yet.`)
        onClose()
      })
    } catch (failure) { if (mounted.current) setError(failure.message) }
    finally { busy.current = false; if (mounted.current) setWorking(false) }
  }
  return <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/75 sm:items-center sm:p-4">
    <AdminDialog onClose={onClose} closeDisabled={working} initialFocusRef={closeRef} labelledBy="reference-create-title">
      <form onSubmit={submit} className="max-h-[90dvh] w-full space-y-4 overflow-y-auto rounded-t-adm border border-adm-line bg-adm-surface p-5 text-white sm:max-w-lg sm:rounded-adm">
        <div className="flex items-start justify-between gap-4"><h2 id="reference-create-title" className="text-xl font-semibold">Create {targetKind}</h2><button type="button" ref={closeRef} aria-label="Close reference creation" className={secondaryButton} disabled={working} onClick={onClose}>Close</button></div>
        <p className="text-base text-white/80">Create or match a canonical reference. Product assignment is recorded separately with Save Changes.</p>
        {loading && <p role="status">Loading current choices…</p>}
        {!canCreate && <p role="alert">Only an Admin or SuperAdmin can create or retry. The saved request is preserved.</p>}
        <fieldset disabled={loading || working || Boolean(pending) || Boolean(outcome) || !canCreate} className="space-y-3 disabled:opacity-60">
          <label className="block text-sm text-white/90">{targetKind === 'brand' ? 'Brand name' : 'Category name'}<input required value={name} onChange={event => setName(event.target.value)} className="adm-input mt-1 min-h-11 w-full text-base" /></label>
          {targetKind === 'category' && <label className="block text-sm text-white/90">Category parent<select value={parentId} onChange={event => setParentId(event.target.value)} className="adm-input mt-1 min-h-11 w-full text-base"><option value="">Root category</option>{options?.categories.map(row => <option key={row.id} value={row.id}>{row.name} · {row.parent_id ? options.categories.find(parent => parent.id === row.parent_id)?.name || 'Parent unavailable' : 'Root'}</option>)}</select></label>}
          <label className="block text-sm text-white/90">Creation reason <span className="font-normal text-white/50">(optional)</span><textarea value={reason} placeholder={`Default: Canonical ${targetKind} reference created by admin`} onChange={event => setReason(event.target.value)} className="adm-input mt-1 min-h-[88px] w-full text-base" /></label>
        </fieldset>
        {error && <p role="alert" className="break-words text-base text-crimson">{error}</p>}
        {pending && !outcome && <p className="text-base text-white/80">The exact request is saved. Closing or reloading keeps it; retry uses the same request.</p>}
        {outcome && <div className="space-y-2 break-words"><p role="status" className="text-base text-white">{outcome.reused ? 'Matched' : 'Created'} reference; product changes are not saved yet.</p><p>{outcome.reference.name}</p>{!outcome.available && <p className="text-base text-white/80">Its current name, parent or availability could not be confirmed. Acknowledge this recorded outcome, then refresh and review existing choices; nothing will be selected automatically.</p>}</div>}
        <div className="flex flex-wrap gap-3">
          {outcome ? <button type="button" className={primaryButton} disabled={working || !canCreate} onClick={acknowledge}>{working ? 'Confirming…' : outcome.available ? 'Use reference' : 'Acknowledge reference outcome'}</button>
            : <button type="submit" className={primaryButton} disabled={loading || working || !canCreate || (!options && !pending)}>{working ? 'Confirming creation…' : pending ? 'Retry saved request' : 'Create reference'}</button>}
          <button type="button" className={secondaryButton} disabled={working} onClick={() => { setOutcome(null); load() }}>Refresh choices</button>
        </div>
      </form>
    </AdminDialog>
  </div>
}
