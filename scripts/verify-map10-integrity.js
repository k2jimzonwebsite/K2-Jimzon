import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('   K2 JIMZON MAP-010 CUSTOMER IDENTITY AUDIT       ')
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

// 1. Check Customers.jsx existence
const custPath = path.join(rootDir, 'src', 'views', 'admin', 'Customers.jsx')
check('Customers.jsx exists', fs.existsSync(custPath), 'Customers.jsx missing')

if (fs.existsSync(custPath)) {
  const content = fs.readFileSync(custPath, 'utf8')
  check(
    'Customers.jsx queries customer profiles with role status',
    content.includes('user_profiles') && content.includes('fetchCustomers'),
    'Customers.jsx missing customer query logic'
  )
}

console.log('\n----------------------------------------------------')
if (failures === 0) {
  console.log(' ALL MAP-010 INTEGRITY CHECKS PASSED SUCCESSFULLY!')
  console.log('----------------------------------------------------\n')
  process.exit(0)
} else {
  console.error(` ${failures} INTEGRITY CHECK(S) FAILED.`)
  console.log('----------------------------------------------------\n')
  process.exit(1)
}
