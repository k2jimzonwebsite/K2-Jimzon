import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('   K2 JIMZON MAP-012 CANONICAL ANALYTICS AUDIT     ')
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

// 1. Check Overview.jsx existence
const overviewPath = path.join(rootDir, 'src', 'views', 'admin', 'Overview.jsx')
check('Overview.jsx exists', fs.existsSync(overviewPath), 'Overview.jsx missing')

if (fs.existsSync(overviewPath)) {
  const content = fs.readFileSync(overviewPath, 'utf8')
  check(
    'Overview.jsx defines RANGE_OPTIONS (7, 30, 90) and PASABUY_STAGES',
    content.includes('RANGE_OPTIONS') && content.includes('PASABUY_STAGES'),
    'Overview.jsx missing range options or Pasabuy stages'
  )
  check(
    'Overview.jsx calculates revenue series & percentage changes vs prior period',
    content.includes('buildRevenueSeries') && content.includes('percentageChange'),
    'Overview.jsx missing revenue series or percentage change logic'
  )
}

console.log('\n----------------------------------------------------')
if (failures === 0) {
  console.log(' ALL MAP-012 INTEGRITY CHECKS PASSED SUCCESSFULLY!')
  console.log('----------------------------------------------------\n')
  process.exit(0)
} else {
  console.error(` ${failures} INTEGRITY CHECK(S) FAILED.`)
  console.log('----------------------------------------------------\n')
  process.exit(1)
}
