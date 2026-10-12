import { createSavedAdminCommandRecovery } from './savedAdminCommandRecovery.js'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SKU=/^[A-Za-z0-9._/-]{1,80}$/
const TIMESTAMP=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/
const version=value=>typeof value==='string'&&TIMESTAMP.test(value)&&Number.isFinite(Date.parse(value))
export function validateWebsiteAssignmentPayloadText(text) {
  try {
    if(typeof text!=='string'||!text.isWellFormed()||new TextEncoder().encode(text).length>16384)throw Error()
    const b=JSON.parse(text),keys=['action','sku','assigned','expectedUpdatedAt','reason']
    if(!b||Array.isArray(b)||Object.keys(b).length!==keys.length||!keys.every(k=>Object.hasOwn(b,k))
      ||b.action!=='website_listing_set'||typeof b.sku!=='string'||!SKU.test(b.sku)
      ||typeof b.assigned!=='boolean'||typeof b.reason!=='string'||b.reason.trim().length<3||b.reason.trim().length>500
      ||(b.expectedUpdatedAt!==null&&!version(b.expectedUpdatedAt)))throw Error()
    return b
  }catch {throw Error('The pending Website decision could not be restored safely. Keep it and contact the administrator.')}
}
export function validWebsiteListing(listing,sku) {
  return !!listing&&listing.sku===sku&&typeof listing.assigned==='boolean'
    &&((listing.id===null&&listing.updatedAt===null&&listing.assigned===false)
      ||(typeof listing.id==='string'&&UUID.test(listing.id)&&version(listing.updatedAt)))
}
export const websiteAssignmentRecovery=createSavedAdminCommandRecovery({namespace:'k2-website-assignment-pending-v1',label:'Website',validatePayloadText:validateWebsiteAssignmentPayloadText})
