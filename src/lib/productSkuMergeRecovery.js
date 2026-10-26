import { PRODUCT_SKU_MERGE_GROUPS } from './productSkuMerge.js'

export function validSkuMergePreview(preview, groupId) {
  const group=PRODUCT_SKU_MERGE_GROUPS[groupId]
  const skus=group && [group.canonicalSku,...group.sourceSkus]
  return !!group && preview?.groupId===groupId && preview.canonicalSku===group.canonicalSku
    && /^[a-f0-9]{64}$/.test(preview.stateHash) && typeof preview.recorded==='boolean'
    && (preview.blocker===null || typeof preview.blocker==='string')
    && Array.isArray(preview.products) && preview.products.length===skus.length
    && skus.every(sku=>preview.products.filter(p=>p.sku===sku).length===1)
    && preview.products.every(p=>typeof p.name==='string' && typeof p.status==='string'
      && Number.isSafeInteger(p.quantity) && p.quantity>=0 && Number.isSafeInteger(p.available) && p.available>=0 && p.available<=p.quantity)
    && Array.isArray(preview.lots) && preview.lots.length<=200
    && new Set(preview.lots.map(l=>l.id)).size===preview.lots.length
    && preview.lots.every(l=>typeof l.id==='string' && skus.includes(l.sku) && Number.isSafeInteger(l.quantity) && l.quantity>=0)
}

export function validSkuMergeReceipt(result, body) {
  const g=PRODUCT_SKU_MERGE_GROUPS[body.payload.groupId]
  return !!g && result?.groupId===body.payload.groupId && result.canonicalSku===g.canonicalSku
    && JSON.stringify(result.sourceSkus)===JSON.stringify(g.sourceSkus)
    && ['quantity','available','lotCount'].every(k=>Number.isSafeInteger(result[k]) && result[k]>=0)
    && result.available<=result.quantity && result.lotCount<=200
    && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(result.requestId)
}
