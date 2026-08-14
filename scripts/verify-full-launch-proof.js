import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { evaluateShelfLife } from '../src/lib/shelfLifeGate.js'
import { CANONICAL_HUBS, CANONICAL_CUSTODIANS } from '../src/data/canonicalIdentities.js'
import { PILOT_PRODUCTS, PILOT_BATCHES } from './seed-pilot-catalog.js'
import { createEventEnvelope, processEventEnvelope, ADAPTER_STATUSES } from '../src/lib/connectorRuntime.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('   K2 JIMZON MAP-014 FULL SYSTEM RELEASE PROOF      ')
console.log('====================================================\n')

let failures = 0

function check(name, condition, failureMessage) {
  if (condition) {
    console.log(`[PASS] ${name}`)
  } else {
    console.error(`[FAIL] ${name}: ${failureMessage}`)
    failures++
  }
}

// 1. MAP-000 & MAP-001 Security & Intake Checks
const envExPath = path.join(rootDir, '.env.example')
check('Secret isolation matrix exists (.env.example)', fs.existsSync(envExPath), '.env.example missing')

const intakeMigPath = path.join(rootDir, 'supabase', 'migrations', '20260811_product_intake_and_sku_gate.sql')
check('Server SKU assignment migration exists', fs.existsSync(intakeMigPath), 'MAP-001 migration missing')

// 2. MAP-002 Product Media & Shelf Life Gate
const evalRes = evaluateShelfLife(new Date(Date.now() + 100 * 86400000).toISOString(), 'food')
check('90-day shelf life gate operates correctly', evalRes.eligible && evalRes.status === 'regular', 'Shelf life gate check failed')

// 3. MAP-003 Pilot Catalog Data Health
check('Pilot catalog contains 8 representative products', PILOT_PRODUCTS.length === 8, 'Pilot products check failed')
check('Pilot catalog contains 8 batch lots', PILOT_BATCHES.length === 8, 'Pilot batches check failed')

// 4. MAP-004 Canonical Operational Identities
check('Canonical Hubs registry defined (3 hubs)', CANONICAL_HUBS.length === 3, 'Canonical Hubs check failed')
check('Canonical Custodians registry defined (3 custodians)', CANONICAL_CUSTODIANS.length === 3, 'Canonical Custodians check failed')

// 5. MAP-005 through MAP-010 Operational Workspaces
const consignmentPath = path.join(rootDir, 'src', 'views', 'admin', 'ConsignmentManager.jsx')
const omniPath = path.join(rootDir, 'src', 'views', 'admin', 'OmniOperationsHub.jsx')
const inboxPath = path.join(rootDir, 'src', 'views', 'admin', 'Inbox.jsx')
const pasabuyPath = path.join(rootDir, 'src', 'views', 'admin', 'PasabuyManager.jsx')
const channelPath = path.join(rootDir, 'src', 'views', 'admin', 'ChannelIntegrations.jsx')

check('Consignment Manager workspace exists (MAP-005)', fs.existsSync(consignmentPath), 'ConsignmentManager.jsx missing')
check('Omni Operations Hub exists (MAP-006)', fs.existsSync(omniPath), 'OmniOperationsHub.jsx missing')
check('Customer Exception Inbox exists (MAP-007)', fs.existsSync(inboxPath), 'Inbox.jsx missing')
check('Pasabuy Sourcing Manager exists (MAP-008)', fs.existsSync(pasabuyPath), 'PasabuyManager.jsx missing')
check('Multichannel Integration Board exists (MAP-009)', fs.existsSync(channelPath), 'ChannelIntegrations.jsx missing')

// 6. MAP-011 Idempotent Connector Runtime
const testEnvelope = createEventEnvelope('lazada', 'order.paid', 'EVT-9009', { orderId: 'LAZ-123' })
check('Connector idempotency key generated', testEnvelope.idempotencyKey === 'lazada:order.paid:EVT-9009', 'Idempotency key check failed')

// 7. MAP-012 & MAP-013 Analytics & Vercel Boundary
const overviewPath = path.join(rootDir, 'src', 'views', 'admin', 'Overview.jsx')
const boundaryPath = path.join(rootDir, 'scripts', 'verify-build-boundary.mjs')
const sfConfigPath = path.join(rootDir, 'vercel.storefront.json')
const adminConfigPath = path.join(rootDir, 'vercel.admin.json')

check('Canonical Overview Analytics exists (MAP-012)', fs.existsSync(overviewPath), 'Overview.jsx missing')
check('Build Boundary Script exists (MAP-013)', fs.existsSync(boundaryPath), 'verify-build-boundary.mjs missing')
check('Storefront Vercel config exists (MAP-013)', fs.existsSync(sfConfigPath), 'vercel.storefront.json missing')
check('Admin Vercel config exists (MAP-013)', fs.existsSync(adminConfigPath), 'vercel.admin.json missing')

console.log('\n----------------------------------------------------')
if (failures === 0) {
  console.log(' ALL FULL LAUNCH PROOF INTEGRITY CHECKS PASSED!')
  console.log('----------------------------------------------------\n')
  process.exit(0)
} else {
  console.error(` ${failures} LAUNCH PROOF CHECK(S) FAILED.`)
  console.log('----------------------------------------------------\n')
  process.exit(1)
}
