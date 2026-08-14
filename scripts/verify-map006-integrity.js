import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('   K2 JIMZON MAP-006 ORDER & FULFILLMENT AUDIT     ')
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

// 1. Check OmniOperationsHub.jsx existence & behavior
const hubPath = path.join(rootDir, 'src', 'views', 'admin', 'OmniOperationsHub.jsx')
check('OmniOperationsHub.jsx exists', fs.existsSync(hubPath), 'OmniOperationsHub.jsx missing')

if (fs.existsSync(hubPath)) {
  const content = fs.readFileSync(hubPath, 'utf8')
  check(
    'OmniOperationsHub handles order request confirmation & reservation',
    content.includes('confirm_order_request') && content.includes('fetchOrderRequests'),
    'OmniOperationsHub missing order request confirmation logic'
  )
  check(
    'OmniOperationsHub handles manual payment & shipping quote approval',
    content.includes('payment_status') && content.includes('shipping_quote_status'),
    'OmniOperationsHub missing payment or shipping quote tracking'
  )
  check(
    'OmniOperationsHub handles packing slips & exact lot fulfillment',
    content.includes('PackingSlipModal') && content.includes('manila_warehouse'),
    'OmniOperationsHub missing packing slip or lot fulfillment components'
  )
}

console.log('\n----------------------------------------------------')
if (failures === 0) {
  console.log(' ALL MAP-006 INTEGRITY CHECKS PASSED SUCCESSFULLY!')
  console.log('----------------------------------------------------\n')
  process.exit(0)
} else {
  console.error(` ${failures} INTEGRITY CHECK(S) FAILED.`)
  console.log('----------------------------------------------------\n')
  process.exit(1)
}
