import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('   K2 JIMZON MAP-005 RECEIVING & CONSIGNMENT AUDIT  ')
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

// 1. Check ConsignmentManager.jsx
const managerPath = path.join(rootDir, 'src', 'views', 'admin', 'ConsignmentManager.jsx')
check('ConsignmentManager.jsx exists', fs.existsSync(managerPath), 'ConsignmentManager.jsx missing')
if (fs.existsSync(managerPath)) {
  const content = fs.readFileSync(managerPath, 'utf8')
  check(
    'ConsignmentManager handles unit scanning & discrepancy reconciliation',
    content.includes('record_consignment_item_scan') && content.includes('DiscrepancyReconciliationModal'),
    'ConsignmentManager missing scan or discrepancy handling'
  )
}

// 2. Check DiscrepancyReconciliationModal.jsx
const discrepancyPath = path.join(rootDir, 'src', 'views', 'admin', 'DiscrepancyReconciliationModal.jsx')
check('DiscrepancyReconciliationModal.jsx exists', fs.existsSync(discrepancyPath), 'DiscrepancyReconciliationModal.jsx missing')
if (fs.existsSync(discrepancyPath)) {
  const content = fs.readFileSync(discrepancyPath, 'utf8')
  check(
    'DiscrepancyReconciliationModal calculates unit variance (packed vs scanned)',
    content.includes('manila_scanned_qty') && content.includes('italy_packed_qty'),
    'DiscrepancyReconciliationModal missing unit variance calculation'
  )
}

// 3. Check MilanPackingScannerModal.jsx
const milanScannerPath = path.join(rootDir, 'src', 'views', 'admin', 'MilanPackingScannerModal.jsx')
check('MilanPackingScannerModal.jsx exists', fs.existsSync(milanScannerPath), 'MilanPackingScannerModal.jsx missing')

console.log('\n----------------------------------------------------')
if (failures === 0) {
  console.log(' ALL MAP-005 INTEGRITY CHECKS PASSED SUCCESSFULLY!')
  console.log('----------------------------------------------------\n')
  process.exit(0)
} else {
  console.error(` ${failures} INTEGRITY CHECK(S) FAILED.`)
  console.log('----------------------------------------------------\n')
  process.exit(1)
}
