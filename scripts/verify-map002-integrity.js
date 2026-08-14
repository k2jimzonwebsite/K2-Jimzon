import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { evaluateShelfLife, getDaysUntilExpiry } from '../src/lib/shelfLifeGate.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('   K2 JIMZON MAP-002 PRODUCT MEDIA & SHELF LIFE AUDIT ')
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

// 1. Check shelfLifeGate.js existence & 90-day default
const gatePath = path.join(rootDir, 'src', 'lib', 'shelfLifeGate.js')
check('shelfLifeGate.js exists', fs.existsSync(gatePath), 'shelfLifeGate.js is missing')

// Test 90-day default evaluation
const future95 = new Date(Date.now() + 95 * 24 * 60 * 60 * 1000).toISOString()
const res95 = evaluateShelfLife(future95, 'food')
check('95 days remaining is regular sale', res95.eligible && res95.status === 'regular', 'Failed 95-day check')

const future45 = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString()
const res45 = evaluateShelfLife(future45, 'food')
check('45 days remaining requires clearance path', res45.eligible && res45.status === 'clearance', 'Failed 45-day clearance check')

const future15 = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
const res15 = evaluateShelfLife(future15, 'food')
check('15 days remaining is unsellable', !res15.eligible && res15.status === 'unsellable', 'Failed 15-day unsellable check')

const resNull = evaluateShelfLife(null, 'food')
check('Unknown expiry date is unsellable', !resNull.eligible && resNull.status === 'unsellable', 'Failed null expiry check')

// 2. MasterProduct.jsx canonical media contract check
const masterProductPath = path.join(rootDir, 'src', 'views', 'MasterProduct.jsx')
const masterContent = fs.readFileSync(masterProductPath, 'utf8')
check(
  'MasterProduct.jsx renders primary, after, gallery, and video media',
  masterContent.includes('primary_image_url') && masterContent.includes('afterImage') && masterContent.includes('product_video_url'),
  'MasterProduct.jsx missing canonical media contract properties'
)

console.log('\n----------------------------------------------------')
if (failures === 0) {
  console.log(' ALL MAP-002 INTEGRITY CHECKS PASSED SUCCESSFULLY!')
  console.log('----------------------------------------------------\n')
  process.exit(0)
} else {
  console.error(` ${failures} INTEGRITY CHECK(S) FAILED.`)
  console.log('----------------------------------------------------\n')
  process.exit(1)
}
