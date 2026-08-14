import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('   K2 JIMZON MAP-009 MARKETPLACE CHANNEL AUDIT     ')
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

// 1. Check ChannelIntegrations.jsx existence
const channelPath = path.join(rootDir, 'src', 'views', 'admin', 'ChannelIntegrations.jsx')
check('ChannelIntegrations.jsx exists', fs.existsSync(channelPath), 'ChannelIntegrations.jsx missing')

if (fs.existsSync(channelPath)) {
  const content = fs.readFileSync(channelPath, 'utf8')
  check(
    'ChannelIntegrations defines CHANNELS for Website, Pasabuy, Shopee, TikTok, Lazada',
    content.includes('shopee') && content.includes('tiktok') && content.includes('lazada') && content.includes('pasabuy'),
    'ChannelIntegrations missing required channels'
  )
  check(
    'ChannelIntegrations lists required partner portal secrets & readiness metrics',
    content.includes('SHOPEE_PARTNER_ID') && content.includes('TIKTOK_APP_KEY') && content.includes('v_channel_catalog_readiness'),
    'ChannelIntegrations missing secrets list or readiness query'
  )
}

console.log('\n----------------------------------------------------')
if (failures === 0) {
  console.log(' ALL MAP-009 INTEGRITY CHECKS PASSED SUCCESSFULLY!')
  console.log('----------------------------------------------------\n')
  process.exit(0)
} else {
  console.error(` ${failures} INTEGRITY CHECK(S) FAILED.`)
  console.log('----------------------------------------------------\n')
  process.exit(1)
}
