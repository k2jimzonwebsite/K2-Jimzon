import { useEffect, useRef, useState } from 'react'
import { getAdminSessionBff, sendSavedProductMasterBff } from '../services/adminBffService'
import { clearPendingProductMaster, holdPendingProductMaster, productMasterRecoveryKey, readPendingProductMaster, validateProductMasterPayloadText } from '../lib/productMasterCommandRecovery'

const CHANGED = 'k2-product-master-recovery-changed'
const changed = () => window.dispatchEvent(new Event(CHANGED))
async function currentActor(actor) {
  const session = await getAdminSessionBff()
  if (!session.ok) throw Error(session.error || 'Sign in with the original account before retrying.')
  if ((session.user?.userId || session.user?.id) !== actor) throw Error('The signed-in account changed. Return to the original account before retrying.')
  if (!['Admin', 'SuperAdmin'].includes(session.user?.role)) throw Error('Only an Admin or SuperAdmin can resolve this saved request.')
}

export default function useProductMasterRecovery({ actorId, enabled, canManageProducts }) {
  const [pending, setPending] = useState(null), [error, setError] = useState(''), [working, setWorking] = useState(false)
  const mounted = useRef(false), busy = useRef(null), identity = useRef(null)
  if (identity.current?.actorId !== actorId || identity.current?.enabled !== enabled || identity.current?.canManageProducts !== canManageProducts) {
    identity.current = { actorId, enabled, canManageProducts }
  }
  useEffect(() => {
    mounted.current = true
    busy.current = null; setWorking(false)
    const refresh = () => {
      if (!enabled) { setPending(null); setError(''); return }
      try { setPending(readPendingProductMaster(actorId)); setError('') }
      catch (failure) { setPending(null); setError(failure.message) }
    }
    refresh(); window.addEventListener('storage', refresh); window.addEventListener(CHANGED, refresh)
    return () => { mounted.current = false; window.removeEventListener('storage', refresh); window.removeEventListener(CHANGED, refresh) }
  }, [actorId, enabled, canManageProducts])

  const run = async payload => {
    if (busy.current) return { ok: false, error: 'A product decision is already being confirmed.' }
    const actor = actorId, intended = pending, scope = identity.current, operation = {}
    const current = () => mounted.current && identity.current === scope && scope.enabled && scope.canManageProducts
    busy.current = operation; setWorking(true); setError('')
    try {
      if (!current()) throw Error('Only the original administrator can resolve this saved request.')
      if (!navigator.locks?.request) throw Error('Safe product recovery is unavailable in this browser. Keep any saved request and contact the administrator.')
      return await navigator.locks.request(productMasterRecoveryKey(actor), async () => {
        if (!current()) throw Error('The staff session changed. The saved request is preserved.')
        let record = readPendingProductMaster(actor)
        if ((record?.key || null) !== (intended?.key || null)
          || (record && record.payloadText !== intended?.payloadText)) throw Error('The saved request changed in another tab. Review it before continuing.')
        await currentActor(actor)
        if (!current()) throw Error('The staff session changed. The saved request is preserved.')
        const fresh = !record
        if (fresh) {
          if (!payload) throw Error('This saved request was resolved in another tab. Review the current record before a new decision.')
          record = holdPendingProductMaster(actor, crypto.randomUUID(), JSON.stringify({ action: 'update', payload })); changed()
        }
        const response = await sendSavedProductMasterBff(record.payloadText, record.key, actor)
        if (!current()) throw Error('The staff session changed. The saved request is preserved.')
        if (!response.ok) {
          // An initial explicit refusal is not an unknown write. A resumed
          // request stays held until a matching historical receipt confirms it.
          if (fresh && ['PRODUCT_COMMAND_INVALID', 'PRODUCT_VERSION_CONFLICT', 'PRODUCT_TAXONOMY_INITIAL_ONLY', 'PRODUCT_NOT_FOUND',
            'PRODUCT_ADMIN_REQUIRED', 'PRODUCT_ACTOR_CHANGED', 'ORIGIN_DENIED', 'SESSION_EXPIRED', 'SESSION_REVOKED',
            'MFA_REQUIRED', 'STAFF_ACCESS_REQUIRED', 'RATE_LIMITED'].includes(response.code)) {
            clearPendingProductMaster(actor, record.key); changed()
            throw Error(response.error)
          }
          throw Error(`${response.error || 'Save was not confirmed.'} Keep and retry the same saved request.`)
        }
        const body = validateProductMasterPayloadText(record.payloadText), result = response.result
        if (result?.sku !== body.payload.sku || !['Draft', 'Under Review', 'Live', 'Active', 'Unlisted', 'Discontinued'].includes(result.status)
          || typeof result.updatedAt !== 'string' || !Number.isFinite(Date.parse(result.updatedAt))) {
          throw Error('The reply did not confirm a valid recorded decision. Keep and retry the same saved request.')
        }
        await currentActor(actor)
        if (!current()) throw Error('The staff session changed. The saved request is preserved.')
        const held = readPendingProductMaster(actor)
        if (held?.key !== record.key || held.payloadText !== record.payloadText
          || !clearPendingProductMaster(actor, record.key)) throw Error('The saved request changed in another tab. Review it before continuing.')
        changed()
        return response // Receipt proves history; callers refresh current facts.
      })
    } catch (failure) {
      if (current()) setError(failure.message)
      return { ok: false, error: failure.message }
    } finally {
      if (busy.current === operation) {
        busy.current = null
        if (current()) setWorking(false)
      }
    }
  }
  return { pending, error, working, save: run, retry: () => run(null) }
}
