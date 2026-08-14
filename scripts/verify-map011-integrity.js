import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  createEventEnvelope,
  processEventEnvelope,
  ADAPTER_STATUSES
} from '../src/lib/connectorRuntime.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('   K2 JIMZON MAP-011 CONNECTOR RUNTIME AUDIT       ')
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

// 1. Test event envelope creation
const env = createEventEnvelope('shopee', 'order.created', 'EVT-1001', { orderId: 'ORD-99' })
check('Envelope has correct idempotency key', env.idempotencyKey === 'shopee:order.created:EVT-1001', 'Idempotency key mismatch')

// 2. Test successful processing
async function testSuccess() {
  const res = await processEventEnvelope(env, async () => true)
  check('Successful event marks status COMPLETED', res.status === ADAPTER_STATUSES.COMPLETED, 'Failed completed status check')
}

// 3. Test retry & dead-letter routing
async function testDeadLetter() {
  let current = createEventEnvelope('tiktok', 'inventory.update', 'EVT-2002', {})
  const failingHandler = async () => { throw new Error('Simulated network timeout') }

  current = await processEventEnvelope(current, failingHandler)
  check('Attempt 1 transitions to RETRYING', current.status === ADAPTER_STATUSES.RETRYING, 'Attempt 1 failed')

  current = await processEventEnvelope(current, failingHandler)
  check('Attempt 2 transitions to RETRYING', current.status === ADAPTER_STATUSES.RETRYING, 'Attempt 2 failed')

  current = await processEventEnvelope(current, failingHandler)
  check('Attempt 3 transitions to DEAD_LETTER', current.status === ADAPTER_STATUSES.DEAD_LETTER, 'Attempt 3 failed dead letter check')
}

// 4. PackingSlipModal check
const slipPath = path.join(rootDir, 'src', 'views', 'admin', 'PackingSlipModal.jsx')
check('PackingSlipModal.jsx exists', fs.existsSync(slipPath), 'PackingSlipModal.jsx missing')

async function main() {
  await testSuccess()
  await testDeadLetter()

  console.log('\n----------------------------------------------------')
  if (failures === 0) {
    console.log(' ALL MAP-011 INTEGRITY CHECKS PASSED SUCCESSFULLY!')
    console.log('----------------------------------------------------\n')
    process.exit(0)
  } else {
    console.error(` ${failures} INTEGRITY CHECK(S) FAILED.`)
    console.log('----------------------------------------------------\n')
    process.exit(1)
  }
}

main()
