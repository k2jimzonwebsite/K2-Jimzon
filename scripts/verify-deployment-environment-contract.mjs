import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const REQUIRED = Object.freeze({
  admin: new Set(['K2_DEPLOYMENT_TARGET', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_ADMIN_BFF_ENABLED']),
  storefront: new Set(['K2_DEPLOYMENT_TARGET', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_GUEST_BFF_ENABLED']),
})

const ACTIVATION_REQUIRED = Object.freeze({
  admin: new Set([
    'K2_ADMIN_BFF_ENABLED',
    'VITE_TURNSTILE_SITE_KEY', 'K2_TURNSTILE_SECRET_KEY',
    'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'K2_SESSION_COOKIE_KEY',
    'K2_ADMIN_BFF_REQUEST_SECRET', 'K2_ADMIN_ORIGINS',
  ]),
  storefront: new Set([
    'K2_STOREFRONT_BFF_ENABLED',
    'VITE_TURNSTILE_SITE_KEY', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY',
    'K2_GUEST_BFF_SECRET', 'K2_STOREFRONT_ORIGINS', 'K2_TURNSTILE_SECRET_KEY',
  ]),
})

const ALLOWED = Object.freeze({
  admin: new Set([
    ...REQUIRED.admin, 'VITE_IS_ADMIN_DEPLOYMENT', 'VITE_STOREFRONT_URL', 'VITE_TURNSTILE_SITE_KEY',
    'K2_ADMIN_BFF_ENABLED',
    'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'K2_SESSION_COOKIE_KEY',
    'K2_ADMIN_BFF_REQUEST_SECRET', 'K2_ADMIN_ORIGINS', 'K2_COOKIE_SECURE',
    'K2_STAFF_INVITATIONS_ENABLED', 'K2_MFA_REPLACEMENT_ENABLED',
    'K2_ADMIN_PASSWORD_RECOVERY_ENABLED', 'K2_ADMIN_PASSWORD_RECOVERY_CALLBACK_URL',
    'K2_TURNSTILE_SECRET_KEY',
  ]),
  storefront: new Set([
    ...REQUIRED.storefront, 'VITE_CUSTOMER_ACCOUNT_ENABLED', 'VITE_TURNSTILE_SITE_KEY', 'SUPABASE_URL',
    'K2_STOREFRONT_BFF_ENABLED',
    'SUPABASE_PUBLISHABLE_KEY', 'K2_GUEST_BFF_SECRET', 'K2_STOREFRONT_ORIGINS',
    'K2_COOKIE_SECURE', 'K2_TURNSTILE_SECRET_KEY',
  ]),
})

const EXPLICITLY_FORBIDDEN = new Set([
  'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'SUPABASE_SECRET_KEYS',
  'ENCRYPTION_SECRET', 'GOOGLE_CLIENT_SECRET', 'FACEBOOK_APP_SECRET',
  'WHATSAPP_ACCESS_TOKEN', 'VIBER_BOT_TOKEN', 'SHOPEE_PARTNER_KEY',
  'LAZADA_APP_SECRET', 'TIKTOK_APP_SECRET', 'GEMINI_API_KEY',
])

const BROWSER_SECRET_PATTERN = /^VITE_.*(?:SECRET|SERVICE_ROLE|TOKEN|PASSWORD|PRIVATE|PARTNER_KEY|APP_SECRET)/i
const VALID_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/

export function validateInventory(inventory, { activationTargets = [] } = {}) {
  const errors = []
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) {
    return ['Inventory must be a JSON object with admin and storefront arrays.']
  }

  const extraTargets = Object.keys(inventory).filter((target) => !(target in REQUIRED))
  if (extraTargets.length) errors.push(`Unexpected target(s): ${extraTargets.sort().join(', ')}`)

  const activation = new Set(activationTargets)
  for (const target of activation) {
    if (!(target in REQUIRED)) errors.push(`Unknown activation target: ${target}`)
  }

  for (const target of Object.keys(REQUIRED)) {
    const names = inventory[target]
    if (!Array.isArray(names) || names.some((name) => typeof name !== 'string')) {
      errors.push(`${target} must be an array of environment-variable names only.`)
      continue
    }

    const unique = new Set(names)
    if (unique.size !== names.length) errors.push(`${target} contains duplicate names.`)

    for (const name of unique) {
      if (!VALID_NAME_PATTERN.test(name)) errors.push(`${target}: invalid variable name ${JSON.stringify(name)}`)
      if (BROWSER_SECRET_PATTERN.test(name)) errors.push(`${target}: browser-exposed secret-shaped name ${name}`)
      if (EXPLICITLY_FORBIDDEN.has(name)) errors.push(`${target}: provider secret ${name} does not belong in Vercel`)
      if (!ALLOWED[target].has(name)) errors.push(`${target}: unapproved custom variable ${name}`)
    }

    for (const required of REQUIRED[target]) {
      if (!unique.has(required)) errors.push(`${target}: missing required variable ${required}`)
    }
    if (activation.has(target)) {
      for (const required of ACTIVATION_REQUIRED[target]) {
        if (!unique.has(required)) errors.push(`${target}: activation missing server variable ${required}`)
      }
    }
  }

  return [...new Set(errors)].sort()
}

function runSelfTest() {
  const clean = { admin: [...REQUIRED.admin], storefront: [...REQUIRED.storefront] }
  const unsafe = {
    admin: [...REQUIRED.admin, 'VITE_SUPABASE_SERVICE_ROLE_KEY'],
    storefront: [...REQUIRED.storefront, 'SUPABASE_SECRET_KEY'],
  }
  if (validateInventory(clean).length !== 0) throw new Error('Clean inventory fixture failed.')
  if (validateInventory(unsafe).length < 2) throw new Error('Unsafe inventory fixture was not rejected.')
  if (!validateInventory({ admin: {}, storefront: [] }).length) throw new Error('Malformed inventory fixture was accepted.')
  if (!validateInventory(clean, { activationTargets: ['admin'] }).length) {
    throw new Error('Incomplete activation fixture was accepted.')
  }
  const activated = {
    admin: [...REQUIRED.admin, ...ACTIVATION_REQUIRED.admin],
    storefront: [...REQUIRED.storefront, ...ACTIVATION_REQUIRED.storefront],
  }
  if (validateInventory(activated, { activationTargets: ['admin', 'storefront'] }).length) {
    throw new Error('Complete activation fixture failed.')
  }
  console.log('Deployment environment contract self-test passed (5 fixtures).')
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes('--self-test')) return runSelfTest()
  const inventoryIndex = args.indexOf('--inventory')
  const inventoryPath = inventoryIndex >= 0 ? args[inventoryIndex + 1] : ''
  if (!inventoryPath) throw new Error('Usage: node scripts/verify-deployment-environment-contract.mjs --inventory <redacted-name-only.json>')

  const inventory = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), inventoryPath), 'utf8'))
  const activationTargets = args.flatMap((arg, index) => (
    arg === '--activation' && args[index + 1] ? args[index + 1].split(',') : []
  )).map((value) => value.trim()).filter(Boolean)
  const errors = validateInventory(inventory, { activationTargets })
  if (errors.length) {
    console.error(`Deployment environment contract failed (${errors.length} issue(s)):`)
    for (const error of errors) console.error(`- ${error}`)
    process.exitCode = 1
    return
  }
  console.log('Deployment environment contract passed for admin and storefront name-only inventories.')
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isEntrypoint) {
  try { main() } catch (error) {
    console.error(`Deployment environment contract failed: ${error.message}`)
    process.exitCode = 1
  }
}
