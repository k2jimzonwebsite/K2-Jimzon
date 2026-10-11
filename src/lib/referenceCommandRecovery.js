// MAP-018 / IDEA-20261010-06. One unresolved creation per actor, shared by tabs.
// Callers hold the matching Web Lock while holding, sending or acknowledging.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SPACE = /[ \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/gu
const unsafe = () => new Error('The pending reference could not be restored safely. Keep it and contact the administrator.')

export function referenceRecoveryKey(actorId) {
  if (typeof actorId !== 'string' || !UUID.test(actorId)) throw unsafe()
  return `k2-reference-pending-v1:${actorId}`
}

function text(value, minimum, maximum) {
  if (typeof value !== 'string' || !value.isWellFormed() || /[\u0000-\u001f\u007f-\u009f]/u.test(value)) return false
  const length = Array.from(value.replace(SPACE, ' ').replace(/^ +| +$/g, '')).length
  return length >= minimum && length <= maximum
}

// Reads may include historical names beyond the current creation limit.
export function isReadableReferenceName(value) {
  return text(value, 1, Number.MAX_SAFE_INTEGER)
}

export function validateReferencePayloadText(payloadText) {
  try {
    if (typeof payloadText !== 'string' || new TextEncoder().encode(payloadText).length > 8192) throw unsafe()
    const body = JSON.parse(payloadText)
    const keys = ['kind', 'name', 'parentId', 'reason']
    if (!body || Array.isArray(body) || Object.keys(body).length !== 4 || !keys.every(key => Object.hasOwn(body, key))
      || !['brand', 'category'].includes(body.kind) || !text(body.name, 1, 120) || !text(body.reason, 8, 500)
      || (body.kind === 'brand' && body.parentId !== null)
      || (body.parentId !== null && (typeof body.parentId !== 'string' || !UUID.test(body.parentId)))) throw unsafe()
    return body
  } catch { throw unsafe() }
}

export function readPendingReference(actorId, storage = localStorage) {
  const address = referenceRecoveryKey(actorId)
  try {
    const raw = storage.getItem(address)
    if (raw === null) return null
    if (new TextEncoder().encode(raw).length > 16384) throw unsafe()
    const saved = JSON.parse(raw)
    if (!saved || Object.keys(saved).length !== 4 || saved.actorId !== actorId
      || typeof saved.key !== 'string' || !UUID.test(saved.key) || saved.state !== 'pending') throw unsafe()
    validateReferencePayloadText(saved.payloadText)
    return saved
  } catch { throw unsafe() }
}

export function holdPendingReference(actorId, key, payloadText, storage = localStorage) {
  const address = referenceRecoveryKey(actorId)
  validateReferencePayloadText(payloadText)
  if (typeof key !== 'string' || !UUID.test(key)) throw unsafe()
  const previous = readPendingReference(actorId, storage)
  if (previous) {
    if (previous.key !== key || previous.payloadText !== payloadText) throw new Error('A reference creation is pending. Review and retry the same saved command before creating another.')
    return previous
  }
  const saved = { actorId, key, payloadText, state: 'pending' }
  const raw = JSON.stringify(saved)
  try {
    if (new TextEncoder().encode(raw).length > 16384) throw unsafe()
    storage.setItem(address, raw)
    if (storage.getItem(address) !== raw) throw unsafe()
  } catch { throw new Error('The reference request could not be saved safely in this browser. Nothing was sent; contact the administrator.') }
  return saved
}

export function clearPendingReference(actorId, key, storage = localStorage) {
  const address = referenceRecoveryKey(actorId)
  const saved = readPendingReference(actorId, storage)
  if (!saved || saved.key !== key) return false
  storage.removeItem(address)
  if (storage.getItem(address) !== null) throw unsafe()
  return true
}
