import useSavedAdminDecisionRecovery from './useSavedAdminDecisionRecovery'
import { getAdminProductFamiliesBff, sendSavedProductFamilyBff } from '../services/adminBffService'
import { productFamilyRecovery, validateFamilyPayloadText, validFamilyRead } from '../lib/productFamilyRecovery'

const adapter = {
  label: 'product variation', changedEvent: 'k2-product-family-recovery-changed', recovery: productFamilyRecovery,
  validateBody: validateFamilyPayloadText, body: payload => payload, send: sendSavedProductFamilyBff,
  staleCode: 'FAMILY_VERSION_CONFLICT',
  staleMessage: 'This saved grouping did not apply because the mother product changed. Review its latest members before a new decision.',
  recheckMessage: 'Retry the original saved grouping before reviewing its current members.',
  latestFailureMessage: 'The latest grouping could not be verified. Your original request is preserved.',
  freshRefusalCodes: ['FAMILY_INVALID', 'FAMILY_MEMBERSHIP_CONFLICT', 'FAMILY_TAXONOMY', 'FAMILY_MIXED', 'PRODUCT_NOT_FOUND', 'PRODUCT_ADMIN_REQUIRED', 'PRODUCT_ACTOR_CHANGED', 'ORIGIN_DENIED', 'SESSION_EXPIRED', 'SESSION_REVOKED', 'MFA_REQUIRED', 'STAFF_ACCESS_REQUIRED', 'RATE_LIMITED'],
  readLatest: body => getAdminProductFamiliesBff(body.members.map(member => member.sku), body.familyId),
  validLatest: (read, body) => validFamilyRead(read, body.members.map(member => member.sku), body.familyId),
  latestResult: read => ({ snapshot: read }),
  validReceipt: (result, body) => result?.familyId === body.familyId.toLowerCase() && result.version === body.expectedVersion + 1 && result.memberCount === body.members.length,
}
export default function useProductFamilyRecovery(options) { return useSavedAdminDecisionRecovery({ ...options, adapter }) }
