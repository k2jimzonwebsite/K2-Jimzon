import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('   K2 JIMZON MAP-013 VERCEL DEPLOYMENT AUDIT       ')
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

// 1. Check vercel.storefront.json
const sfPath = path.join(rootDir, 'vercel.storefront.json')
check('vercel.storefront.json exists', fs.existsSync(sfPath), 'vercel.storefront.json missing')

// 2. Check vercel.admin.json
const adminPath = path.join(rootDir, 'vercel.admin.json')
check('vercel.admin.json exists', fs.existsSync(adminPath), 'vercel.admin.json missing')

if (fs.existsSync(adminPath)) {
  const content = fs.readFileSync(adminPath, 'utf8')
  check(
    'vercel.admin.json contains noindex, nofollow header',
    content.includes('noindex, nofollow'),
    'vercel.admin.json missing X-Robots-Tag noindex header'
  )
}

// 3. Check verify-build-boundary.mjs
const boundaryPath = path.join(rootDir, 'scripts', 'verify-build-boundary.mjs')
check('verify-build-boundary.mjs exists', fs.existsSync(boundaryPath), 'verify-build-boundary.mjs missing')

console.log('\n----------------------------------------------------')
if (failures === 0) {
  console.log(' ALL MAP-013 INTEGRITY CHECKS PASSED SUCCESSFULLY!')
  console.log('----------------------------------------------------\n')
  process.exit(0)
} else {
  console.error(` ${failures} INTEGRITY CHECK(S) FAILED.`)
  console.log('----------------------------------------------------\n')
  process.exit(1)
}
