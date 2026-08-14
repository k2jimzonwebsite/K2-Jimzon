import { PILOT_PRODUCTS, PILOT_BATCHES } from './seed-pilot-catalog.js'
import { evaluateShelfLife } from '../src/lib/shelfLifeGate.js'

console.log('====================================================')
console.log('   K2 JIMZON MAP-003 PILOT DATA HEALTH AUDIT       ')
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

// 1. Verify pilot products count and SKUs
check('Pilot catalog contains 8 representative products', PILOT_PRODUCTS.length === 8, 'Product count is not 8')

const validSkus = PILOT_PRODUCTS.every(p => /^K2-SKU-\d{6}$/.test(p.sku))
check('All pilot products have stable K2-SKU-XXXXXX identifiers', validSkus, 'Found malformed SKU in pilot catalog')

// 2. Verify publication status enum
const validStatuses = new Set(['draft', 'under_review', 'live', 'unlisted', 'discontinued'])
const validProdStatus = PILOT_PRODUCTS.every(p => validStatuses.has(p.status))
check('All products use valid single publication status', validProdStatus, 'Found invalid publication status')

// 3. Verify stock/expiry isolation from product rows
const noDirectStockInRows = PILOT_PRODUCTS.every(p => p.stock === undefined && p.stock_available === undefined && p.expiry_date === undefined)
check('Product master rows do not store direct quantity or expiry values', noDirectStockInRows, 'Found direct stock or expiry in product rows')

// 4. Verify pilot batches
check('Pilot catalog contains 8 lot batches', PILOT_BATCHES.length === 8, 'Batch count is not 8')

const validBatches = PILOT_BATCHES.every(b => b.batch_code && b.quantity > 0 && b.hub && b.custodian)
check('All lot batches have batch code, quantity > 0, hub, and custodian', validBatches, 'Malformed batch found')

// 5. Evaluate shelf life for pilot batches
let unsellableCount = 0
for (const b of PILOT_BATCHES) {
  const p = PILOT_PRODUCTS.find(item => item.sku === b.sku)
  const evalRes = evaluateShelfLife(b.expiry_date, p?.category)
  if (!evalRes.eligible) {
    unsellableCount++
    console.error(`Unsellable batch: ${b.batch_code} (${evalRes.reason})`)
  }
}
check('All pilot lots pass category shelf-life gate (>90 days)', unsellableCount === 0, `${unsellableCount} lot(s) failed shelf-life evaluation`)

console.log('\n----------------------------------------------------')
if (failures === 0) {
  console.log(' ALL MAP-003 PILOT DATA HEALTH CHECKS PASSED!')
  console.log('----------------------------------------------------\n')
  process.exit(0)
} else {
  console.error(` ${failures} DATA HEALTH CHECK(S) FAILED.`)
  console.log('----------------------------------------------------\n')
  process.exit(1)
}
