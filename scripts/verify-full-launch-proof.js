import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('   K2 JIMZON STATIC RELEASE-PRESENCE PRECHECK       ')
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

// 2. Static prerequisite presence only. Behavioral proof belongs to MAP-025.
check('Shelf-life gate source exists', fs.existsSync(path.join(rootDir, 'src', 'lib', 'shelfLifeGate.js')), 'Shelf-life gate source missing')
check('Pilot catalog seed exists', fs.existsSync(path.join(rootDir, 'scripts', 'seed-pilot-catalog.js')), 'Pilot catalog seed missing')
check('Canonical identity registry exists', fs.existsSync(path.join(rootDir, 'src', 'data', 'canonicalIdentities.js')), 'Canonical identity registry missing')

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

// 6. Connector runtime presence only; this does not prove a live adapter.
check('Connector runtime source exists', fs.existsSync(path.join(rootDir, 'src', 'lib', 'connectorRuntime.js')), 'Connector runtime source missing')

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
  console.log(' STATIC PRESENCE CHECKS PASSED; LAUNCH PROOF BLOCKED')
  console.log('----------------------------------------------------\n')
  console.error('This script does not verify live providers, database behavior,')
  console.error('backup/restore, production domains, operations, or acceptance.')
  console.error('Use MASTER_ACTION_PLAN.md MAP-025 for the remaining evidence gates.')
  process.exit(2)
} else {
  console.error(` ${failures} LAUNCH PROOF CHECK(S) FAILED.`)
  console.log('----------------------------------------------------\n')
  process.exit(1)
}
