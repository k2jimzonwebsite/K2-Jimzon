import { useEffect, useRef, useState } from 'react'
import { getAdminSessionBff } from '../services/adminBffService'

async function currentActor(actor) {
  const session = await getAdminSessionBff()
  if (!session.ok) throw Error(session.error || 'Sign in with the original account before retrying.')
  if ((session.user?.userId || session.user?.id) !== actor) throw Error('The signed-in account changed. Return to the original account before retrying.')
  if (!['Admin', 'SuperAdmin'].includes(session.user?.role)) throw Error('Only an Admin or SuperAdmin can resolve this saved request.')
}

export default function useSavedAdminDecisionRecovery({ actorId, enabled, canManageProducts, adapter }) {
  const CHANGED=adapter.changedEvent
  const changed=()=>window.dispatchEvent(new Event(CHANGED))
  const [pending, setPending] = useState(null), [error, setError] = useState(''), [working, setWorking] = useState(false)
  const [nonApplied, setNonApplied] = useState(null)
  const [storageBlocked,setStorageBlocked]=useState(false)
  const mounted = useRef(false), busy = useRef(null), identity = useRef(null), storageGeneration = useRef(0)
  if (identity.current?.actorId !== actorId || identity.current?.enabled !== enabled || identity.current?.canManageProducts !== canManageProducts) {
    identity.current = { actorId, enabled, canManageProducts }
  }
  useEffect(() => {
    mounted.current = true
    busy.current = null; setWorking(false)
    const refresh = event => {
      if (!enabled) { setNonApplied(null); setPending(null); setError('');setStorageBlocked(false); return }
      try {
        if (event?.type === 'storage' && event.key !== null && event.key !== adapter.recovery.key(actorId)) return
        storageGeneration.current++; setNonApplied(null)
        setPending(adapter.recovery.read(actorId)); setError('');setStorageBlocked(false)
      } catch (failure) {
        storageGeneration.current++; setNonApplied(null); setPending(null); setError(failure.message);setStorageBlocked(true)
      }
    }
    refresh(); window.addEventListener('storage', refresh); window.addEventListener(CHANGED, refresh)
    return () => { mounted.current = false; window.removeEventListener('storage', refresh); window.removeEventListener(CHANGED, refresh) }
  }, [actorId, enabled, canManageProducts])

  const run = async (payload, reconcile = false) => {
    if (busy.current) return { ok: false, error: `A ${adapter.label || 'product'} decision is already being confirmed.` }
    const actor = actorId, intended = pending, proof = nonApplied, scope = identity.current, operation = {}
    let generation = storageGeneration.current
    const current = () => mounted.current && identity.current === scope && scope.enabled && scope.canManageProducts
      && storageGeneration.current === generation
    busy.current = operation; setWorking(true); setError(''); setNonApplied(null)
    try {
      if (!current()) throw Error('Only the original administrator can resolve this saved request.')
      if (!navigator.locks?.request) throw Error(`Safe ${adapter.label || 'product'} recovery is unavailable in this browser. Keep any saved request and contact the administrator.`)
      return await navigator.locks.request(adapter.recovery.key(actor), async () => {
        if (!current()) throw Error(storageGeneration.current !== generation
          ? 'The saved request changed in another tab. Review it before continuing.'
          : 'The staff session changed. The saved request is preserved.')
        let record = adapter.recovery.read(actor)
        if ((record?.key || null) !== (intended?.key || null)
          || (record && record.payloadText !== intended?.payloadText)) throw Error('The saved request changed in another tab. Review it before continuing.')
        if (reconcile && (!record || proof?.scope !== scope || proof.generation !== generation
          || proof.key !== record.key || proof.payloadText !== record.payloadText)) {
          throw Error(adapter.recheckMessage)
        }
        await currentActor(actor)
        if (!current()) throw Error('The staff session changed. The saved request is preserved.')
        const fresh = !record
        if (fresh) {
          if (!payload) throw Error('This saved request was resolved in another tab. Review the current record before a new decision.')
          record = adapter.recovery.hold(actor, crypto.randomUUID(), JSON.stringify(adapter.body(payload))); changed()
          generation = storageGeneration.current
        }
        const response = await adapter.send(record.payloadText, record.key, actor)
        if (!current()) throw Error('The staff session changed. The saved request is preserved.')
        if (!response.ok) {
          // Receipt lookup precedes this canonical version refusal. Keep the
          // original request until an explicit action rechecks and reads facts.
          if (!fresh && response.code === adapter.staleCode) {
            setNonApplied({ scope, generation, key: record.key, payloadText: record.payloadText })
            if (!reconcile) throw Error(adapter.staleMessage)
            const body = adapter.validateBody(record.payloadText)
            const latest = await adapter.readLatest(body)
            if (!current()) throw Error('The staff session or saved request changed. The request is preserved.')
            if (!adapter.validLatest(latest,body)) {
              throw Error(adapter.latestFailureMessage)
            }
            await currentActor(actor)
            if (!current()) throw Error('The staff session or saved request changed. The request is preserved.')
            const held = adapter.recovery.read(actor)
            if (held?.key !== record.key || held.payloadText !== record.payloadText
              || !adapter.recovery.clear(actor, record.key)) throw Error('The saved request changed in another tab. Review it before continuing.')
            changed()
            return { ok:false, nonApplied:true, ...adapter.latestResult(latest) }
          }
          // Only fresh explicit refusals can release without reconciliation.
          if (fresh && adapter.freshRefusalCodes.includes(response.code)) {
            adapter.recovery.clear(actor, record.key); changed()
            throw Error(response.error)
          }
          throw Error(`${response.error || 'Save was not confirmed.'} Keep and retry the same saved request.`)
        }
        const body = adapter.validateBody(record.payloadText), result = response.result
        if (!adapter.validReceipt(result,body)) {
          throw Error('The reply did not confirm a valid recorded decision. Keep and retry the same saved request.')
        }
        await currentActor(actor)
        if (!current()) throw Error('The staff session changed. The saved request is preserved.')
        const held = adapter.recovery.read(actor)
        if (held?.key !== record.key || held.payloadText !== record.payloadText
          || !adapter.recovery.clear(actor, record.key)) throw Error('The saved request changed in another tab. Review it before continuing.')
        changed()
        return response // Receipt proves history; callers refresh current facts.
      })
    } catch (failure) {
      if (mounted.current && identity.current === scope) setError(failure.message)
      return { ok: false, error: failure.message }
    } finally {
      if (busy.current === operation) {
        busy.current = null
        if (mounted.current && identity.current === scope) setWorking(false)
      }
    }
  }
  const canReconcile = nonApplied?.scope === identity.current && nonApplied?.generation === storageGeneration.current
    && nonApplied?.key === pending?.key && nonApplied?.payloadText === pending?.payloadText
  return { pending, error, working, storageBlocked,canReconcile, save: run, retry: () => run(null), reviewLatest: () => run(null, true) }
}
