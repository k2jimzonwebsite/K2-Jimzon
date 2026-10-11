// MAP-018 / IDEA-20261012-01. One unresolved update per actor across browser tabs.
// Callers must hold the matching Web Lock for hold, send and acknowledgement.
import { validateProductMasterPatch } from './productMasterPatch.js'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SKU = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/
const unsafe = () => new Error('The pending product decision could not be restored safely. Keep it and contact the administrator.')
const bytes = value => new TextEncoder().encode(value).length
const exact = (value,keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key))

export function productMasterRecoveryKey(actorId) {
  if(typeof actorId !== 'string' || !UUID.test(actorId)) throw unsafe()
  return `k2-product-master-pending-v1:${actorId}`
}

export function validateProductMasterPayloadText(payloadText) {
  try {
    if(typeof payloadText !== 'string' || !payloadText.isWellFormed() || bytes(payloadText)>16384) throw unsafe()
    const body=JSON.parse(payloadText), p=body?.payload
    if(!exact(body,['action','payload']) || body.action !== 'update'
      || !exact(p,['sku','patch','expectedUpdatedAt','reason'])
      || typeof p.sku !== 'string' || !SKU.test(p.sku)
      || typeof p.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(p.expectedUpdatedAt))
      || typeof p.reason !== 'string' || p.reason.trim().length<8 || p.reason.trim().length>500) throw unsafe()
    validateProductMasterPatch(p.patch)
    return body // Validation never rewrites the persisted literal request bytes.
  } catch { throw unsafe() }
}

export function readPendingProductMaster(actorId, storage=localStorage) {
  const address=productMasterRecoveryKey(actorId)
  try {
    const raw=storage.getItem(address)
    if(raw===null) return null
    if(bytes(raw)>65536) throw unsafe()
    const saved=JSON.parse(raw)
    if(!exact(saved,['actorId','key','payloadText','state']) || saved.actorId!==actorId
      || typeof saved.key !== 'string' || !UUID.test(saved.key) || saved.state!=='pending') throw unsafe()
    validateProductMasterPayloadText(saved.payloadText)
    return saved
  } catch { throw unsafe() }
}

export function holdPendingProductMaster(actorId,key,payloadText,storage=localStorage) {
  const address=productMasterRecoveryKey(actorId)
  validateProductMasterPayloadText(payloadText)
  if(typeof key !== 'string' || !UUID.test(key)) throw unsafe()
  const previous=readPendingProductMaster(actorId,storage)
  if(previous) {
    if(previous.key!==key || previous.payloadText!==payloadText) throw new Error('A product decision is pending. Retry the same saved request before changing it.')
    return previous
  }
  const saved={actorId,key,payloadText,state:'pending'},raw=JSON.stringify(saved)
  try {
    if(bytes(raw)>65536) throw unsafe()
    storage.setItem(address,raw)
    if(storage.getItem(address)!==raw) throw unsafe()
  } catch { throw new Error('The product decision could not be saved safely in this browser. Nothing was sent; contact the administrator.') }
  return saved
}

export function clearPendingProductMaster(actorId,key,storage=localStorage) {
  const address=productMasterRecoveryKey(actorId),saved=readPendingProductMaster(actorId,storage)
  if(!saved || saved.key!==key) return false
  storage.removeItem(address)
  if(storage.getItem(address)!==null) throw unsafe()
  return true
}
