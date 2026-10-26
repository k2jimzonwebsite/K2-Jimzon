import useSavedAdminDecisionRecovery from './useSavedAdminDecisionRecovery'
import { getAdminProductMasterBff, getAdminProductSkuMergeBff, sendSavedProductMasterBff } from '../services/adminBffService'
import { productMasterRecovery, validateProductMasterPayloadText } from '../lib/productMasterCommandRecovery'
import { validSkuMergePreview, validSkuMergeReceipt } from '../lib/productSkuMergeRecovery'
const statuses=['Draft','Under Review','Live','Active','Unlisted','Discontinued']
const adapter={
 changedEvent:'k2-product-master-recovery-changed',recovery:productMasterRecovery,validateBody:validateProductMasterPayloadText,
 body:payload=>({action:payload.groupId ? 'merge' : 'update',payload}),send:sendSavedProductMasterBff,staleCode:'PRODUCT_VERSION_CONFLICT',
 staleMessage:'This saved change did not apply because the product changed. Review the latest product before making a new decision.',
 recheckMessage:'Retry the original saved decision before reviewing the latest product.',
 latestFailureMessage:'The latest product details could not be verified. The saved request is preserved; try again later.',
 freshRefusalCodes:['PRODUCT_COMMAND_INVALID','PRODUCT_VERSION_CONFLICT','PRODUCT_MERGE_BLOCKED','PRODUCT_MERGE_LOT_CONSERVATION','PRODUCT_TAXONOMY_INITIAL_ONLY','PRODUCT_NOT_FOUND','PRODUCT_ADMIN_REQUIRED','PRODUCT_ACTOR_CHANGED','ORIGIN_DENIED','SESSION_EXPIRED','SESSION_REVOKED','MFA_REQUIRED','STAFF_ACCESS_REQUIRED','RATE_LIMITED'],
 readLatest:body=>body.action==='merge'?getAdminProductSkuMergeBff(body.payload.groupId):getAdminProductMasterBff(body.payload.sku),
 validLatest:(latest,body)=>body.action==='merge'?latest.ok&&validSkuMergePreview(latest.preview,body.payload.groupId):latest.ok&&latest.product?.sku===body.payload.sku&&typeof latest.product.name==='string'&&!!latest.product.name.trim()&&statuses.includes(latest.product.status)&&typeof latest.product.published==='boolean'&&typeof latest.product.updated_at==='string'&&Number.isFinite(Date.parse(latest.product.updated_at)),
 latestResult:latest=>({product:latest.product,taxonomyReview:latest.taxonomyReview||null,preview:latest.preview}),
 validReceipt:(result,body)=>body.action==='merge'?validSkuMergeReceipt(result,body):result?.sku===body.payload.sku&&statuses.includes(result.status)&&typeof result.updatedAt==='string'&&Number.isFinite(Date.parse(result.updatedAt))
}
export default function useProductMasterRecovery(options) {return useSavedAdminDecisionRecovery({...options,adapter})}
