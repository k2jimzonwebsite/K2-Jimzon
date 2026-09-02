import login from '../../prepared-api/admin/auth/login.js'
import logout from '../../prepared-api/admin/auth/logout.js'
import mfa from '../../prepared-api/admin/auth/mfa.js'
import passwordRecoveryRequest from '../../prepared-api/admin/auth/password-recovery/request.js'
import passwordRecoveryVerify from '../../prepared-api/admin/auth/password-recovery/verify.js'
import passwordRecoveryComplete from '../../prepared-api/admin/auth/password-recovery/complete.js'
import session from '../../prepared-api/admin/session.js'
import sessions from '../../prepared-api/admin/sessions.js'
import sessionsRevoke from '../../prepared-api/admin/sessions/revoke.js'
import overview from '../../prepared-api/admin/overview.js'
import products from '../../prepared-api/admin/products.js'
import productMaster from '../../prepared-api/admin/product-master.js'
import productMedia from '../../prepared-api/admin/product-media.js'
import productMediaAssign from '../../prepared-api/admin/product-media/assign.js'
import productMediaOrphans from '../../prepared-api/admin/product-media/orphans.js'
import customers from '../../prepared-api/admin/customers.js'
import fulfillment from '../../prepared-api/admin/fulfillment.js'
import fulfillmentAssignBox from '../../prepared-api/admin/fulfillment/assign-box.js'
import fulfillmentConfirm from '../../prepared-api/admin/fulfillment/confirm.js'
import fulfillmentDelivery from '../../prepared-api/admin/fulfillment/delivery.js'
import fulfillmentFulfill from '../../prepared-api/admin/fulfillment/fulfill.js'
import fulfillmentPackingScan from '../../prepared-api/admin/fulfillment/packing-scan.js'
import fulfillmentPayment from '../../prepared-api/admin/fulfillment/payment.js'
import fulfillmentTransferLot from '../../prepared-api/admin/fulfillment/transfer-lot.js'
import inbox from '../../prepared-api/admin/inbox.js'
import inboxHistory from '../../prepared-api/admin/inbox/history.js'
import inboxInternalNote from '../../prepared-api/admin/inbox/internal-note.js'
import inboxSendReply from '../../prepared-api/admin/inbox/send-reply.js'
import inboxMarkRead from '../../prepared-api/admin/inbox/mark-read.js'
import inboxWorkflow from '../../prepared-api/admin/inbox/workflow.js'
import productKnowledgeSave from '../../prepared-api/admin/product-knowledge/save.js'
import pasabuy from '../../prepared-api/admin/pasabuy.js'
import pasabuyQuote from '../../prepared-api/admin/pasabuy/quote.js'
import pasabuyTransition from '../../prepared-api/admin/pasabuy/transition.js'
import intakeConsignments from '../../prepared-api/admin/product-intake/consignments.js'
import intakeDraft from '../../prepared-api/admin/product-intake/draft.js'
import intakeDuplicates from '../../prepared-api/admin/product-intake/duplicates.js'
import intakeEvidence from '../../prepared-api/admin/product-intake/evidence.js'
import intakeEvidenceCleanup from '../../prepared-api/admin/product-intake/evidence-cleanup.js'
import intakeInventory from '../../prepared-api/admin/product-intake/inventory.js'
import intakePublication from '../../prepared-api/admin/product-intake/publication.js'
import intakeSession from '../../prepared-api/admin/product-intake/session.js'
import intakeStep from '../../prepared-api/admin/product-intake/step.js'
import consignments from '../../prepared-api/admin/consignments.js'
import consignmentAddLine from '../../prepared-api/admin/consignments/add-line.js'
import consignmentAdvance from '../../prepared-api/admin/consignments/advance.js'
import consignmentCreate from '../../prepared-api/admin/consignments/create.js'
import consignmentFinalize from '../../prepared-api/admin/consignments/finalize.js'
import consignmentScan from '../../prepared-api/admin/consignments/scan.js'
import lots from '../../prepared-api/admin/lots.js'
import lotsClearance from '../../prepared-api/admin/lots/clearance.js'
import lotsReconcile from '../../prepared-api/admin/lots/reconcile.js'
import coupons from '../../prepared-api/admin/coupons.js'
import couponArchive from '../../prepared-api/admin/coupons/archive.js'
import couponCreate from '../../prepared-api/admin/coupons/create.js'
import couponState from '../../prepared-api/admin/coupons/state.js'
import catalogExport from '../../prepared-api/admin/catalog-export.js'
import catalogImportPreview from '../../prepared-api/admin/catalog-import/preview.js'
import catalogImportCommit from '../../prepared-api/admin/catalog-import/commit.js'
import catalogImportStatus from '../../prepared-api/admin/catalog-import/status.js'
import marketplaceSnapshotStage from '../../prepared-api/admin/marketplace-snapshots/stage.js'
import marketplaceSnapshotDecision from '../../prepared-api/admin/marketplace-snapshots/decision.js'
import marketplaceSnapshotStatus from '../../prepared-api/admin/marketplace-snapshots/status.js'
import marketplaceOrderStage from '../../prepared-api/admin/marketplace-orders/stage.js'
import marketplaceOrderStatus from '../../prepared-api/admin/marketplace-orders/status.js'
import ownerCloseSession from '../../prepared-api/admin/owner-close/session.js'
import ownerCloseCoverage from '../../prepared-api/admin/owner-close/coverage.js'
import ownerCloseFees from '../../prepared-api/admin/owner-close/fees.js'
import ownerCloseStock from '../../prepared-api/admin/owner-close/stock.js'
import ownerClosePasabuy from '../../prepared-api/admin/owner-close/pasabuy.js'
import ownerCloseBookkeeping from '../../prepared-api/admin/owner-close/bookkeeping.js'
import securityEvents from '../../prepared-api/admin/security-events.js'
import wholesaleInquiries from '../../prepared-api/admin/wholesale-inquiries.js'
import wholesaleInquiryReview from '../../prepared-api/admin/wholesale-inquiries/review.js'
import delivery from '../../prepared-api/admin/delivery.js'
import deliveryQuote from '../../prepared-api/admin/delivery/quote.js'
import deliveryCourier from '../../prepared-api/admin/delivery/courier.js'
import deliveryCourierState from '../../prepared-api/admin/delivery/courier-state.js'
import deliveryLocality from '../../prepared-api/admin/delivery/locality.js'
import deliveryCostPublish from '../../prepared-api/admin/delivery/cost-publish.js'
import deliverySourceState from '../../prepared-api/admin/delivery/source-state.js'
import globeCms from '../../prepared-api/admin/globe-cms.js'
import procurement from '../../prepared-api/admin/procurement.js'
import channels from '../../prepared-api/admin/channels.js'
import staffAccess from '../../prepared-api/admin/staff-access.js'
import staffAccessInvite from '../../prepared-api/admin/staff-access/invite.js'
import staffAccessMfaReplacement from '../../prepared-api/admin/staff-access/mfa-replacement.js'
import systemReadiness from '../../prepared-api/admin/system-readiness.js'
import { safeJson } from './security.js'

const ROUTES = new Map([
  ['auth/login', login],
  ['auth/logout', logout],
  ['auth/mfa', mfa],
  ['auth/password-recovery/request', passwordRecoveryRequest],
  ['auth/password-recovery/verify', passwordRecoveryVerify],
  ['auth/password-recovery/complete', passwordRecoveryComplete],
  ['session', session],
  ['sessions', sessions],
  ['sessions/revoke', sessionsRevoke],
  ['overview', overview],
  ['products', products],
  ['product-master', productMaster],
  ['product-media', productMedia],
  ['product-media/assign', productMediaAssign],
  ['product-media/orphans', productMediaOrphans],
  ['customers', customers],
  ['fulfillment', fulfillment],
  ['fulfillment/assign-box', fulfillmentAssignBox],
  ['fulfillment/confirm', fulfillmentConfirm],
  ['fulfillment/delivery', fulfillmentDelivery],
  ['fulfillment/fulfill', fulfillmentFulfill],
  ['fulfillment/packing-scan', fulfillmentPackingScan],
  ['fulfillment/payment', fulfillmentPayment],
  ['fulfillment/transfer-lot', fulfillmentTransferLot],
  ['inbox', inbox],
  ['inbox/history', inboxHistory],
  ['inbox/internal-note', inboxInternalNote],
  ['inbox/send-reply', inboxSendReply],
  ['inbox/mark-read', inboxMarkRead],
  ['inbox/workflow', inboxWorkflow],
  ['product-knowledge/save', productKnowledgeSave],
  ['pasabuy', pasabuy],
  ['pasabuy/quote', pasabuyQuote],
  ['pasabuy/transition', pasabuyTransition],
  ['product-intake/consignments', intakeConsignments],
  ['product-intake/draft', intakeDraft],
  ['product-intake/duplicates', intakeDuplicates],
  ['product-intake/evidence', intakeEvidence],
  ['product-intake/evidence-cleanup', intakeEvidenceCleanup],
  ['product-intake/inventory', intakeInventory],
  ['product-intake/publication', intakePublication],
  ['product-intake/session', intakeSession],
  ['product-intake/step', intakeStep],
  ['consignments', consignments],
  ['consignments/add-line', consignmentAddLine],
  ['consignments/advance', consignmentAdvance],
  ['consignments/create', consignmentCreate],
  ['consignments/finalize', consignmentFinalize],
  ['consignments/scan', consignmentScan],
  ['lots', lots],
  ['lots/clearance', lotsClearance],
  ['lots/reconcile', lotsReconcile],
  ['coupons', coupons],
  ['coupons/archive', couponArchive],
  ['coupons/create', couponCreate],
  ['coupons/state', couponState],
  ['catalog-export', catalogExport],
  ['catalog-import/preview', catalogImportPreview],
  ['catalog-import/commit', catalogImportCommit],
  ['catalog-import/status', catalogImportStatus],
  ['marketplace-snapshots/stage', marketplaceSnapshotStage],
  ['marketplace-snapshots/decision', marketplaceSnapshotDecision],
  ['marketplace-snapshots/status', marketplaceSnapshotStatus],
  ['marketplace-orders/stage', marketplaceOrderStage],
  ['marketplace-orders/status', marketplaceOrderStatus],
  ['owner-close/session', ownerCloseSession],
  ['owner-close/coverage', ownerCloseCoverage],
  ['owner-close/fees', ownerCloseFees],
  ['owner-close/stock', ownerCloseStock],
  ['owner-close/pasabuy', ownerClosePasabuy],
  ['owner-close/bookkeeping', ownerCloseBookkeeping],
  ['security-events', securityEvents],
  ['wholesale-inquiries', wholesaleInquiries],
  ['wholesale-inquiries/review', wholesaleInquiryReview],
  ['delivery', delivery],
  ['delivery/quote', deliveryQuote],
  ['delivery/courier', deliveryCourier],
  ['delivery/courier-state', deliveryCourierState],
  ['delivery/locality', deliveryLocality],
  ['delivery/cost-publish', deliveryCostPublish],
  ['delivery/source-state', deliverySourceState],
  ['globe-cms', globeCms],
  ['procurement', procurement],
  ['channels', channels],
  ['staff-access', staffAccess],
  ['staff-access/invite', staffAccessInvite],
  ['staff-access/mfa-replacement', staffAccessMfaReplacement],
  ['system-readiness', systemReadiness],
])

const ADMIN_POST_ROUTES = new Set([
  'auth/login', 'auth/logout', 'auth/mfa',
  'auth/password-recovery/request', 'auth/password-recovery/complete',
  'product-media', 'product-media/assign', 'product-media/orphans',
  'product-master',
  'sessions/revoke',
  'fulfillment/assign-box', 'fulfillment/confirm', 'fulfillment/delivery',
  'fulfillment/fulfill', 'fulfillment/packing-scan', 'fulfillment/payment',
  'fulfillment/transfer-lot',
  'inbox/internal-note', 'inbox/send-reply', 'inbox/mark-read', 'inbox/workflow',
  'product-knowledge/save',
  'pasabuy/quote', 'pasabuy/transition',
  'product-intake/draft', 'product-intake/evidence', 'product-intake/evidence-cleanup', 'product-intake/inventory',
  'product-intake/publication', 'product-intake/step',
  'consignments/add-line', 'consignments/advance', 'consignments/create',
  'consignments/finalize', 'consignments/scan',
  'lots/clearance', 'lots/reconcile',
  'coupons/archive', 'coupons/create', 'coupons/state',
  'catalog-import/preview',
  'catalog-import/commit',
  'marketplace-snapshots/stage',
  'marketplace-snapshots/decision',
  'marketplace-orders/stage',
  'delivery/quote', 'delivery/courier', 'delivery/courier-state',
  'delivery/locality', 'delivery/cost-publish', 'delivery/source-state',
  'wholesale-inquiries/review',
  'staff-access/invite',
  'staff-access/mfa-replacement',
])
const ADMIN_AUTH_ROUTES = new Set([
  'auth/login', 'auth/logout', 'auth/mfa',
  'auth/password-recovery/request', 'auth/password-recovery/verify', 'auth/password-recovery/complete',
])
const ADMIN_IDEMPOTENT_COMMAND_ROUTES = new Set(
  [...ADMIN_POST_ROUTES].filter((route) => !ADMIN_AUTH_ROUTES.has(route)),
)

export const ADMIN_BFF_ROUTES = Object.freeze([...ROUTES.keys()])
export const ADMIN_BFF_ROUTE_CONTROLS = Object.freeze(Object.fromEntries(
  ADMIN_BFF_ROUTES.map((route) => {
    const recoveryControl = route === 'auth/password-recovery/request'
      ? { method: 'POST', identity: 'preauth-email', origin: true, csrf: false, idempotency: false, rateLimit: 'database', bot: true }
      : route === 'auth/password-recovery/verify'
        ? { method: 'GET', identity: 'recovery-token-hash', origin: false, csrf: false, idempotency: false, rateLimit: 'database' }
        : route === 'auth/password-recovery/complete'
          ? { method: 'POST', identity: 'recovery-session', origin: true, csrf: true, idempotency: false, rateLimit: 'database' }
          : null
    if (recoveryControl) return [route, Object.freeze(recoveryControl)]
    const additionalMethods = route === 'product-intake/session'
      ? Object.freeze({
          POST: Object.freeze({ csrf: true, idempotency: true, rateLimit: 'database' }),
        })
      : undefined
    const securityMethods = route === 'security-events'
      ? Object.freeze({ POST: Object.freeze({ csrf: true, idempotency: true, rateLimit: 'database' }) })
      : undefined
    const orphanMethods = route === 'product-media/orphans'
      ? Object.freeze({ GET: Object.freeze({ csrf: false, idempotency: false, rateLimit: 'database' }) })
      : undefined
    const globeMethods = route === 'globe-cms'
      ? Object.freeze({ POST: Object.freeze({ csrf: true, idempotency: true, rateLimit: 'database' }) })
      : undefined
    const procurementMethods = route === 'procurement'
      ? Object.freeze({ POST: Object.freeze({ csrf: true, idempotency: true, rateLimit: 'database' }) })
      : undefined
    const channelMethods = route === 'channels'
      ? Object.freeze({ POST: Object.freeze({ csrf: true, idempotency: true, rateLimit: 'database' }) })
      : undefined
    const staffAccessMethods = route === 'staff-access'
      ? Object.freeze({ POST: Object.freeze({ csrf: true, idempotency: true, rateLimit: 'database' }) })
      : undefined
    const productMasterMethods = route === 'product-master'
      ? Object.freeze({ GET: Object.freeze({ csrf: false, idempotency: false, rateLimit: 'database' }) })
      : undefined
    const ownerCloseMethods = route === 'owner-close/session' || route === 'owner-close/coverage' || route === 'owner-close/fees' || route === 'owner-close/stock' || route === 'owner-close/pasabuy' || route === 'owner-close/bookkeeping'
      ? Object.freeze({ POST: Object.freeze({ csrf: true, idempotency: true, rateLimit: 'database' }) })
      : undefined
    return [route, Object.freeze({
    method: ADMIN_POST_ROUTES.has(route) ? 'POST' : 'GET',
    identity: route === 'auth/login' ? 'credentials'
      : route === 'auth/mfa' ? 'pending-session'
        : route === 'auth/logout' ? 'active-session' : 'active-aal2-session',
    origin: true,
    csrf: ADMIN_POST_ROUTES.has(route) && !['auth/login', 'auth/mfa'].includes(route),
    idempotency: ADMIN_IDEMPOTENT_COMMAND_ROUTES.has(route),
    rateLimit: 'database',
    ...(route === 'auth/login' ? { bot: true } : {}),
    ...(additionalMethods || securityMethods || orphanMethods || globeMethods || procurementMethods || channelMethods || staffAccessMethods || productMasterMethods || ownerCloseMethods
      ? { additionalMethods: additionalMethods || securityMethods || orphanMethods || globeMethods || procurementMethods || channelMethods || staffAccessMethods || productMasterMethods || ownerCloseMethods } : {}),
  })]
  }),
))

export function extractAdminRoute(req) {
  const supplied = req.query?.route
  if (supplied !== undefined) {
    const joined = Array.isArray(supplied) ? supplied.join('/') : String(supplied)
    try { return decodeURIComponent(joined).replace(/^\/+|\/+$/g, '') } catch { return '' }
  }
  try {
    const pathname = new URL(String(req.url || ''), 'https://admin.invalid').pathname
    return decodeURIComponent(pathname).replace(/^\/api\/admin\/?/, '').replace(/\/+$/g, '')
  } catch {
    return ''
  }
}

export default async function adminBffRouter(req, res) {
  const route = extractAdminRoute(req)
  const handler = ROUTES.get(route)
  if (!handler) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  const control = ADMIN_BFF_ROUTE_CONTROLS[route]
  const allowedMethods = [control.method, ...Object.keys(control.additionalMethods || {})]
  if (!allowedMethods.includes(req.method)) {
    return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: allowedMethods.join(', ') })
  }
  return handler(req, res)
}
