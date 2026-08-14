import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  CANONICAL_HUBS,
  CANONICAL_CUSTODIANS,
  CANONICAL_CHANNELS,
  normalizeHub,
  normalizeCustodian
} from '../src/data/canonicalIdentities.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('   K2 JIMZON MAP-004 CANONICAL IDENTITIES AUDIT    ')
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

// 1. Verify canonical identity exports
check('CANONICAL_HUBS contains 3 hubs', CANONICAL_HUBS.length === 3, 'Hub count incorrect')
check('CANONICAL_CUSTODIANS contains 3 staff custodians', CANONICAL_CUSTODIANS.length === 3, 'Custodian count incorrect')
check('CANONICAL_CHANNELS contains 5 channels', CANONICAL_CHANNELS.length === 5, 'Channel count incorrect')

// 2. Test Hub Normalizer
const milanNorm = normalizeHub('Milan Depot Cargo')
check('normalizeHub("Milan") resolves to HUB-MIL-DEPOT', milanNorm.id === 'HUB-MIL-DEPOT', 'Failed Milan hub normalization')

const cebuNorm = normalizeHub('Cebu Branch')
check('normalizeHub("Cebu") resolves to HUB-CEB-TRANSIT', cebuNorm.id === 'HUB-CEB-TRANSIT', 'Failed Cebu hub normalization')

const defaultNorm = normalizeHub('Unknown')
check('normalizeHub("Unknown") defaults to HUB-MNL-CENTRAL', defaultNorm.id === 'HUB-MNL-CENTRAL', 'Failed default hub normalization')

// 3. Test Custodian Normalizer
const marcoNorm = normalizeCustodian('Marco Rossi')
check('normalizeCustodian("Marco") resolves to CUST-STAFF-MARCO', marcoNorm.id === 'CUST-STAFF-MARCO', 'Failed Marco custodian normalization')

// 4. Migration check
const migPath = path.join(rootDir, 'supabase', 'migrations', '20260812_canonical_identities.sql')
check('Migration 20260812_canonical_identities.sql exists', fs.existsSync(migPath), 'Migration file missing')

console.log('\n----------------------------------------------------')
if (failures === 0) {
  console.log(' ALL MAP-004 INTEGRITY CHECKS PASSED SUCCESSFULLY!')
  console.log('----------------------------------------------------\n')
  process.exit(0)
} else {
  console.error(` ${failures} INTEGRITY CHECK(S) FAILED.`)
  console.log('----------------------------------------------------\n')
  process.exit(1)
}
