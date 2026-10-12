// MAP-018. Preserve the original Product Master storage namespace and validation.
import { validateProductMasterPatch } from './productMasterPatch.js'
import { createSavedAdminCommandRecovery } from './savedAdminCommandRecovery.js'
const SKU = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/
const unsafe = () => new Error('The pending product decision could not be restored safely. Keep it and contact the administrator.')
const bytes = value => new TextEncoder().encode(value).length
const exact = (value,keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key))


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


export const productMasterRecovery = createSavedAdminCommandRecovery({namespace:'k2-product-master-pending-v1',label:'product',validatePayloadText:validateProductMasterPayloadText})
export const productMasterRecoveryKey=productMasterRecovery.key
export const readPendingProductMaster=productMasterRecovery.read
export const holdPendingProductMaster=productMasterRecovery.hold
export const clearPendingProductMaster=productMasterRecovery.clear
