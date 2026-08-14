import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('   K2 JIMZON MAP-007 CUSTOMER EXCEPTION WORKSPACE   ')
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

// 1. Check Inbox.jsx existence
const inboxPath = path.join(rootDir, 'src', 'views', 'admin', 'Inbox.jsx')
check('Inbox.jsx exists', fs.existsSync(inboxPath), 'Inbox.jsx missing')

if (fs.existsSync(inboxPath)) {
  const content = fs.readFileSync(inboxPath, 'utf8')
  check(
    'Inbox.jsx supports status options (Open, Pending, Resolved) and priorities',
    content.includes('STATUS_OPTIONS') && content.includes('PRIORITY_OPTIONS'),
    'Inbox.jsx missing status or priority options'
  )
  check(
    'Inbox.jsx handles conversation workflow updates & response deadlines',
    content.includes('updateConversationWorkflow') && content.includes('deadlineState'),
    'Inbox.jsx missing workflow update or deadline tracking'
  )
}

console.log('\n----------------------------------------------------')
if (failures === 0) {
  console.log(' ALL MAP-007 INTEGRITY CHECKS PASSED SUCCESSFULLY!')
  console.log('----------------------------------------------------\n')
  process.exit(0)
} else {
  console.error(` ${failures} INTEGRITY CHECK(S) FAILED.`)
  console.log('----------------------------------------------------\n')
  process.exit(1)
}
