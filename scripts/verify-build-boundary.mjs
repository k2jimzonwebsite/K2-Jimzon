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

function verifyStatic404() {
  const notFoundFile = path.join(distDir, '404.html')
  if (!fs.existsSync(notFoundFile)) {
    throw new Error(`${target} build is missing its static 404 recovery page.`)
  }

  const contents = fs.readFileSync(notFoundFile, 'utf8')
  const violations = []
  if (!/<meta name="robots" content="noindex, nofollow">/i.test(contents)) violations.push('missing noindex policy')
  if (!/<main(?:\s|>)/i.test(contents) || !/<h1(?:\s|>)/i.test(contents)) violations.push('missing main/H1 structure')
  if (/<script(?:\s|>)/i.test(contents)) violations.push('contains executable script')

  if (target === 'admin') {
    if (!/Admin page not found/i.test(contents)) violations.push('missing Admin identity')
    if (!/href="\/admin-portal-k2-secure"/i.test(contents)) violations.push('missing protected recovery link')
  } else {
    if (!/Page or product unavailable/i.test(contents)) violations.push('missing Storefront identity')
    if (!/href="\/catalog"/i.test(contents) || !/href="\/contact"/i.test(contents)) {
      violations.push('missing Storefront recovery links')
    }
    if (/admin-portal-k2-secure/i.test(contents)) violations.push('discloses the Admin route')
  }

  if (violations.length > 0) {
    throw new Error(`${target} static 404 recovery page is invalid:\n${violations.join('\n')}`)
  }
}

verifyStatic404()

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

// MAP-027 is opt-in. React.lazy in source is not sufficient evidence because a
// later Rollup/manual-chunk change could still pull the room or Three/Fiber into
// the entry, Home, Catalog, or product chunk. Follow static `imports` only;
// `dynamicImports` are the reviewed customer-initiated boundary.
if (target === 'storefront') {
  const ordinaryRouteEntries = [
    'index.html',
    'src/views/Home.jsx',
    'src/views/Catalog.jsx',
    'src/views/MasterProduct.jsx',
  ]
  const optionalPayloadPattern = /InteractiveShop|ShelfScene3D|react-three|(?:^|[/_.-])three(?:[/_.-]|$)|drei/i
  const eagerPayloadViolations = []

  for (const routeEntry of ordinaryRouteEntries) {
    if (!manifest[routeEntry]) continue
    const pending = [routeEntry]
    const visited = new Set()

    while (pending.length > 0) {
      const moduleName = pending.pop()
      if (visited.has(moduleName)) continue
      visited.add(moduleName)

      const moduleEntry = manifest[moduleName]
      if (!moduleEntry) continue
      for (const importedName of moduleEntry.imports || []) pending.push(importedName)
    }

    for (const moduleName of visited) {
      if (moduleName === routeEntry) continue
      const emittedFile = manifest[moduleName]?.file || ''
      if (optionalPayloadPattern.test(`${moduleName} ${emittedFile}`)) {
        eagerPayloadViolations.push(`${routeEntry} statically imports ${moduleName}`)
      }
    }
  }

  if (eagerPayloadViolations.length > 0) {
    throw new Error(
      `Storefront ordinary-route payload boundary includes opt-in Interactive Shop code:\n${[
        ...new Set(eagerPayloadViolations),
      ].join('\n')}`,
    )
  }
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
  const relativePath = path.relative(distDir, file).replaceAll('\\', '/')
  // `robots.txt` used to name the private Admin route in a Disallow directive,
  // which published that route to anyone reading the public file, and this scan
  // had to strip the line to avoid flagging it. The line is gone (MAP-028 B3),
  // so the carve-out is gone with it: if the Admin route ever reappears in any
  // storefront static asset, this now fails instead of quietly permitting it.
  const reviewedContents = contents
  for (const marker of forbiddenStaticMarkers) {
    if (marker.test(reviewedContents)) {
      staticViolations.push(`${relativePath} matches ${marker}`)
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

function assertReferencedLocalAssets(files) {
  const readable = new Set(['.css', '.html', '.js', '.json', '.svg', '.txt', '.webmanifest', '.xml'])
  // Open Food Facts URLs are assembled from a trusted absolute base plus
  // quoted numeric path fragments such as `/807/680/.../front.jpg`. Those
  // fragments are not root-local assets. K2 local asset directories and root
  // filenames are named, so exclude a numeric first segment while retaining
  // missing-reference detection for `/images/...`, `/icon.svg`, and peers.
  const localAsset = /(?<![A-Za-z0-9:/.])\/(?!\d+(?:\/|$))(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.(?:avif|gif|ico|jpe?g|png|svg|webp|woff2?)/gi
  const missing = new Set()
  for (const file of files) {
    if (!readable.has(path.extname(file).toLowerCase())) continue
    const content = fs.readFileSync(file, 'utf8')
    for (const match of content.matchAll(localAsset)) {
      const reference = match[0]
      const targetPath = path.resolve(distDir, `.${reference}`)
      if (!targetPath.startsWith(`${distDir}${path.sep}`) || !fs.existsSync(targetPath)) missing.add(reference)
    }
  }
  if (missing.size > 0) {
    throw new Error(`Build references missing local assets:\n${[...missing].sort().join('\n')}`)
  }
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
assertReferencedLocalAssets(allArtifacts)
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
