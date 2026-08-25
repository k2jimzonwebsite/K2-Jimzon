import fs from 'node:fs'
import path from 'node:path'

const distDir = path.resolve('dist')
const targetFile = path.join(distDir, 'k2-build-target.json')
const manifestFile = path.join(distDir, '.vite', 'manifest.json')
const expectedTarget = process.argv[2] || 'auto'

if (!fs.existsSync(targetFile) || !fs.existsSync(manifestFile)) {
  throw new Error('Build boundary verification requires a completed Vite build with a manifest.')
}

const { target } = JSON.parse(fs.readFileSync(targetFile, 'utf8'))
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
const modules = Object.keys(manifest)

if (!['storefront', 'admin'].includes(target)) {
  throw new Error(`Production build target must be storefront or admin; received "${target}".`)
}

if (expectedTarget !== 'auto' && target !== expectedTarget) {
  throw new Error(`Expected a ${expectedTarget} build but Vite produced ${target}.`)
}

const forbiddenPatterns = target === 'storefront'
  ? [/src\/AdminApp\.jsx$/i, /src\/views\/admin\//i]
  : [
      /src\/StorefrontApp\.jsx$/i,
      /src\/views\/(Home|Catalog|Checkout|Confirmation|MasterProduct|Pasabuy|Wholesale)\.jsx$/i,
    ]

const violations = modules.filter((moduleName) => forbiddenPatterns.some((pattern) => pattern.test(moduleName)))

if (violations.length > 0) {
  throw new Error(`${target} build crossed the deployment boundary:\n${violations.join('\n')}`)
}

// Static files copied straight out of `public/` never appear in the Vite module
// manifest, so the module check above cannot see them. That blind spot shipped
// the Admin BOS manifest — naming the internal `/admin-portal-k2-secure` path —
// inside the public storefront artifact. Walk the emitted static assets too.
const STATIC_TEXT_EXTENSIONS = new Set(['.json', '.webmanifest', '.txt', '.xml', '.svg', '.html'])

const forbiddenStaticMarkers = target === 'storefront'
  ? [/admin-portal-k2-secure/i, /Business Operating System/i, /K2 Jimzon BOS/i]
  : []

function staticTextFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    // `assets/` holds hashed build output already covered by the module manifest,
    // and `.vite/` is build metadata that is not deployed as content.
    if (entry.isDirectory()) {
      return ['assets', '.vite'].includes(entry.name) ? [] : staticTextFiles(fullPath)
    }
    return STATIC_TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ? [fullPath] : []
  })
}

const staticViolations = []
for (const file of staticTextFiles(distDir)) {
  if (path.resolve(file) === path.resolve(targetFile)) continue
  const contents = fs.readFileSync(file, 'utf8')
  for (const marker of forbiddenStaticMarkers) {
    if (marker.test(contents)) {
      staticViolations.push(`${path.relative(distDir, file).replaceAll('\\', '/')} matches ${marker}`)
    }
  }
}

if (staticViolations.length > 0) {
  throw new Error(
    `${target} build shipped a static asset belonging to the other target:\n${staticViolations.join('\n')}`,
  )
}

function javascriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return javascriptFiles(fullPath)
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : []
  })
}

function artifactFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return artifactFiles(fullPath)
    return entry.isFile() ? [fullPath] : []
  })
}

const forbiddenBundleContent = target === 'storefront'
  ? [
      /\/api\/admin/, /k2_admin_csrf/, /MFA_ENROLLMENT_REQUIRED/,
      /invite-staff/, /append_internal_message/, /mark_conversation_read/,
      /update_conversation_workflow/, /admin:conversations/,
      /VIP Portal Login/, /Prototype views/, /Authenticate to unlock tier pricing/,
    ]
  : [
      /\/api\/storefront/, /k2_guest/, /submit_guest_order_v1/,
      /submit_guest_pasabuy_v1/, /preview_guest_coupon_v1/,
      /TurnstileChallenge/, /k2_claimed_vouchers/,
    ]

const contentViolations = []
const allArtifacts = artifactFiles(distDir)
const sourceMaps = allArtifacts.filter((file) => file.endsWith('.map'))
if (sourceMaps.length) {
  contentViolations.push(...sourceMaps.map((file) => `${path.relative(distDir, file)} is a production source map`))
}
let reviewedSupabaseLocalhostMarkers = 0
for (const file of javascriptFiles(distDir)) {
  const content = fs.readFileSync(file, 'utf8')
  const hit = forbiddenBundleContent.find((pattern) => pattern.test(content))
  if (hit) contentViolations.push(`${path.relative(distDir, file)} matched ${hit}`)
  for (const pattern of [/sourceMappingURL=/, /\/@vite\/client/, /__vite__injectQuery/, /Ciao! Inspecting the code/]) {
    if (pattern.test(content)) contentViolations.push(`${path.relative(distDir, file)} matched ${pattern}`)
  }
  const localUrls = content.match(/http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/[^'"`\s)]*)?/gi) || []
  for (const url of localUrls) {
    if (url === 'http://localhost:9999') reviewedSupabaseLocalhostMarkers += 1
    else contentViolations.push(`${path.relative(distDir, file)} contains localhost URL ${url}`)
  }
}

if (reviewedSupabaseLocalhostMarkers !== 1) {
  contentViolations.push(`expected one reviewed Supabase localhost library marker, found ${reviewedSupabaseLocalhostMarkers}`)
}

if (contentViolations.length > 0) {
  throw new Error(`${target} bundle contains cross-artifact runtime code:\n${contentViolations.join('\n')}`)
}

console.log(`Verified ${target} production boundary (${modules.length} manifest modules, no source maps/dev markers, and one reviewed Supabase localhost library marker).`)
