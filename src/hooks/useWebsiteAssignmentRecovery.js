import useSavedAdminDecisionRecovery from './useSavedAdminDecisionRecovery'
import { getAdminWebsiteAssignmentBff,sendSavedWebsiteAssignmentBff } from '../services/adminBffService'
import { websiteAssignmentRecovery,validateWebsiteAssignmentPayloadText,validWebsiteListing } from '../lib/websiteAssignmentRecovery'
const adapter={
  label:'Website',changedEvent:'k2-website-assignment-recovery-changed',recovery:websiteAssignmentRecovery,validateBody:validateWebsiteAssignmentPayloadText,
  body:payload=>({action:'website_listing_set',...payload}),send:sendSavedWebsiteAssignmentBff,staleCode:'WEBSITE_LISTING_STALE',
  staleMessage:'This saved Website decision did not apply because the assignment changed. Review the latest assignment before a new decision.',
  recheckMessage:'Retry the original saved decision before reviewing the latest assignment.',
  latestFailureMessage:'The latest assignment could not be verified. The saved request is preserved; try again later.',
  freshRefusalCodes:['WEBSITE_LISTING_INVALID','CHANNEL_VERIFICATION_INVALID','WEBSITE_LISTING_STALE','PRODUCT_NOT_FOUND','CHANNEL_ADMIN_REQUIRED','CHANNEL_ACTOR_CHANGED','ORIGIN_DENIED','SESSION_EXPIRED','SESSION_REVOKED','MFA_REQUIRED','STAFF_ACCESS_REQUIRED','RATE_LIMITED'],
  readLatest:body=>getAdminWebsiteAssignmentBff(body.sku),
  validLatest:(latest,body)=>latest.ok&&validWebsiteListing(latest.listing,body.sku),
  latestResult:latest=>({listing:latest.listing}),
  validReceipt:(result,body)=>validWebsiteListing(result?.listing,body.sku)&&result.listing.id!==null&&result.listing.assigned===body.assigned,
}
export default function useWebsiteAssignmentRecovery(options) {return useSavedAdminDecisionRecovery({...options,adapter})}
