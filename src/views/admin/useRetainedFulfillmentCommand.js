import { useEffect, useRef, useState } from 'react'
import { commandOutcomeIsUncertain, createRetainedOperationSession } from '../../services/adminBffService'

// Scoped to a mounted, actor/order-keyed dialog. An uncertain write owns its
// original payload until a receipt resolves it; editing cannot create a new write.
export function useRetainedFulfillmentCommand(send, retrySafe = true, recordLabel = 'order') {
  const sender = useRef(send)
  sender.current = send
  const runtime = useRef(null)
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const current = { active: true, busy: false, payload: null,
      session: createRetainedOperationSession((payload, key) => sender.current(payload, key)) }
    runtime.current = current
    return () => { current.active = false; current.session.dispose() }
  }, [])
  const locked = busy || uncertain
  useEffect(() => {
    if (!locked) return undefined
    const guard = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [locked])
  const run = async payload => {
    const current = runtime.current
    if (!current?.active || current.busy || (current.uncertain && !retrySafe)) return null
    current.busy = true
    current.payload ??= payload
    setBusy(true); setError('')
    let result
    try { result = await current.session.run(current.payload) }
    catch { result = { ok: false, code: 'ADMIN_SERVICE_UNAVAILABLE' } }
    if (!current.active) return null
    const unknown = commandOutcomeIsUncertain(result) || ['FULFILLMENT_COMMAND_UNAVAILABLE', 'PROCUREMENT_COMMAND_UNAVAILABLE', 'COUPON_COMMAND_UNAVAILABLE', 'WHOLESALE_COMMAND_UNAVAILABLE', 'PRODUCT_MEDIA_ASSIGNMENT_UNAVAILABLE', 'PRODUCT_MEDIA_CLEANUP_PENDING', 'COMMAND_IN_PROGRESS'].includes(result?.code)
    current.uncertain = unknown
    setUncertain(unknown)
    setError(unknown
      ? retrySafe
        ? 'This command may already be saved. Keep these details and retry the same command to retrieve its recorded result.'
        : `This command may already be saved. Close this form and reconcile the ${recordLabel} before making another change. Safe receipt retry requires the protected workflow.`
      : result?.ok ? '' : result?.error || 'The command was not accepted. Review the details before trying again.')
    if (!unknown) current.payload = null
    current.busy = false; setBusy(false)
    return result
  }
  return { run, busy, uncertain, locked, error }
}
