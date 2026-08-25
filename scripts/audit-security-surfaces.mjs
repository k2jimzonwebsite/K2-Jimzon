#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  deriveSqlEffectiveFunctionAccess,
  evaluateSqlFunctionAccessPolicy,
  scanSecuritySurfaceText, scanSqlSecuritySurfaceText,
  summarizeSecuritySurfaces, summarizeSqlSecuritySurfaces,
} from './security-surface-inventory-core.mjs'
import { EXPECTED_ANON_FUNCTIONS } from './security-surface-policy.mjs'
import {
  ADMIN_BFF_ROUTES, ADMIN_BFF_ROUTE_CONTROLS,
} from '../server/admin-bff/router.js'
import {
  STOREFRONT_BFF_ROUTES, STOREFRONT_BFF_ROUTE_CONTROLS,
} from '../server/storefront-bff/router.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const scanRoots = ['src', 'server', 'prepared-api', 'supabase/functions']
const extensions = new Set(['.js', '.jsx', '.ts', '.tsx'])

async function filesUnder(relativeRoot) {
  const absoluteRoot = path.join(root, relativeRoot)
  const entries = await readdir(absoluteRoot, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(absoluteRoot, entry.name)
    if (entry.isDirectory()) return filesUnder(path.relative(root, target))
    return entry.isFile() && extensions.has(path.extname(entry.name)) ? [target] : []
  }))
  return nested.flat()
}

const files = (await Promise.all(scanRoots.map(filesUnder))).flat().sort()
const operations = []
const wildcardCors = []
for (const file of files) {
  const relative = path.relative(root, file).replaceAll('\\', '/')
  const source = await readFile(file, 'utf8')
  operations.push(...scanSecuritySurfaceText(source, relative))
  if (/['"]Access-Control-Allow-Origin['"]\s*:\s*['"]\*['"]/i.test(source)) {
    wildcardCors.push(relative)
  }
}

// Scan both the ordered migration path and the already-applied historical
// bootstrap scripts. The historical files used to sit in `migrations/` and were
// skipped here by filename prefix, which left their SECURITY DEFINER functions,
// RLS enablement, and policies outside this inventory entirely. They now live in
// `supabase/historical/` so migration tooling ignores them, and are scanned here
// so the security surface is still counted. See supabase/historical/README.md.
const sqlRoots = [
  path.join(root, 'supabase', 'migrations'),
  path.join(root, 'supabase', 'historical'),
]
const migrationFiles = (await Promise.all(sqlRoots.map(async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => path.join(dir, entry.name))
}))).flat().sort()
const sqlInventory = { definitions: [], grants: [], hardenings: [], jobs: [], publications: [], policies: [] }
for (const file of migrationFiles) {
  const scanned = scanSqlSecuritySurfaceText(
    await readFile(file, 'utf8'),
    path.relative(root, file).replaceAll('\\', '/'),
  )
  for (const key of Object.keys(sqlInventory)) sqlInventory[key].push(...scanned[key])
}

const endpointFiles = {
  admin: (await filesUnder('prepared-api/admin')).filter((file) => file.endsWith('.js')),
  storefront: (await filesUnder('prepared-api/storefront')).filter((file) => file.endsWith('.js')),
}
const bffRoutes = Object.fromEntries(Object.entries(endpointFiles).map(([artifact, endpoints]) => [
  artifact,
  endpoints.map((file) => path.relative(path.join(root, 'prepared-api', artifact), file)
    .replaceAll('\\', '/').replace(/\.js$/, '')).sort(),
]))
const edgeFunctions = (await readdir(path.join(root, 'supabase/functions'), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_')).map((entry) => entry.name).sort()

const routeControlGaps = []
for (const route of ADMIN_BFF_ROUTES) {
  const control = ADMIN_BFF_ROUTE_CONTROLS[route]
  if (!control) routeControlGaps.push(`admin:${route}:missing-control`)
  else {
    const originOptional = route === 'auth/password-recovery/verify'
      && control.identity === 'recovery-token-hash'
    if (!control.origin && !originOptional) routeControlGaps.push(`admin:${route}:missing-origin`)
    if (!control.identity) routeControlGaps.push(`admin:${route}:missing-identity`)
    const methodControls = new Map([
      [control.method, control],
      ...Object.entries(control.additionalMethods || {}),
    ])
    for (const [method, methodControl] of methodControls) {
      if (!['GET', 'POST'].includes(method)) routeControlGaps.push(`admin:${route}:unsupported-method-${method}`)
      const preauthPost = ['auth/login', 'auth/mfa', 'auth/password-recovery/request'].includes(route)
      if (method === 'POST' && !preauthPost && !methodControl.csrf) {
        routeControlGaps.push(`admin:${route}:post-missing-csrf`)
      }
      if (method === 'POST' && !route.startsWith('auth/') && !methodControl.idempotency) {
        routeControlGaps.push(`admin:${route}:post-missing-idempotency`)
      }
    }
  }
}
for (const route of STOREFRONT_BFF_ROUTES) {
  const control = STOREFRONT_BFF_ROUTE_CONTROLS[route]
  if (!control) routeControlGaps.push(`storefront:${route}:missing-control`)
  else {
    if (control.method !== 'POST') routeControlGaps.push(`storefront:${route}:method-not-post`)
    if (!control.origin) routeControlGaps.push(`storefront:${route}:missing-origin`)
    if (!control.signed) routeControlGaps.push(`storefront:${route}:missing-signature`)
    if (!control.databaseRateLimit) routeControlGaps.push(`storefront:${route}:missing-database-rate-limit`)
  }
}
for (const route of Object.keys(ADMIN_BFF_ROUTE_CONTROLS)) {
  if (!ADMIN_BFF_ROUTES.includes(route)) routeControlGaps.push(`admin:${route}:orphan-control`)
}
for (const route of Object.keys(STOREFRONT_BFF_ROUTE_CONTROLS)) {
  if (!STOREFRONT_BFF_ROUTES.includes(route)) routeControlGaps.push(`storefront:${route}:orphan-control`)
}

const effectiveFunctionAccess = deriveSqlEffectiveFunctionAccess(sqlInventory)
const functionAccessPolicy = evaluateSqlFunctionAccessPolicy(effectiveFunctionAccess, EXPECTED_ANON_FUNCTIONS)
const result = {
  generatedAt: new Date().toISOString(),
  scope: scanRoots,
  summary: summarizeSecuritySurfaces(operations),
  sqlSummary: summarizeSqlSecuritySurfaces(sqlInventory),
  effectiveFunctionAccess,
  functionAccessPolicy,
  routeControlGaps,
  wildcardCors,
  bffRoutes,
  edgeFunctions,
  dynamicOperations: operations.filter((operation) => operation.dynamic),
  operations,
  sqlInventory,
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2))
} else {
  console.log('# MAP-020 Security Surface Inventory')
  console.log(`\nGenerated: ${result.generatedAt}`)
  console.log(`\n- Prepared Admin routes: ${bffRoutes.admin.length}`)
  console.log(`- Prepared Storefront routes: ${bffRoutes.storefront.length}`)
  console.log(`- Supabase Edge Functions: ${edgeFunctions.length} (${edgeFunctions.join(', ') || 'none'})`)
  for (const [kind, count] of Object.entries(result.summary)) console.log(`- ${kind}: ${count} source operations`)
  for (const [kind, count] of Object.entries(result.sqlSummary)) console.log(`- SQL ${kind}: ${count}`)
  console.log(`- Dynamic operations requiring explicit review: ${result.dynamicOperations.length}`)
  for (const operation of result.dynamicOperations) {
    console.log(`  - ${operation.file}:${operation.line} ${operation.kind} ${operation.expression || ''}`)
  }
  console.log(`- Exact expected anonymous function grants: ${EXPECTED_ANON_FUNCTIONS.length}`)
  console.log(`- Unexpected PUBLIC function grants: ${functionAccessPolicy.publicFunctions.length}`)
  console.log(`- Unexpected anonymous function grants: ${functionAccessPolicy.unexpectedAnonFunctions.length}`)
  console.log(`- Missing expected anonymous function grants: ${functionAccessPolicy.missingExpectedAnonFunctions.length}`)
  console.log(`- BFF route-control classification gaps: ${routeControlGaps.length}`)
  console.log(`- Wildcard CORS production sources: ${wildcardCors.length}`)
  for (const signature of functionAccessPolicy.publicFunctions) console.log(`  - unexpected PUBLIC: ${signature}`)
  for (const signature of functionAccessPolicy.unexpectedAnonFunctions) console.log(`  - unexpected anon: ${signature}`)
  for (const signature of functionAccessPolicy.missingExpectedAnonFunctions) console.log(`  - missing anon: ${signature}`)
  for (const gap of routeControlGaps) console.log(`  - route control: ${gap}`)
  for (const file of wildcardCors) console.log(`  - wildcard CORS: ${file}`)
  console.log('\nThis is a source inventory, not deployment or authorization evidence.')
}

if (process.argv.includes('--fail-on-dynamic') && result.dynamicOperations.length > 0) process.exitCode = 1
if (process.argv.includes('--fail-on-gaps') && (
  result.dynamicOperations.length > 0
  || result.sqlSummary.effectiveSecurityDefinerWithoutFixedSearchPath > 0
  || result.functionAccessPolicy.publicFunctions.length > 0
  || result.functionAccessPolicy.unexpectedAnonFunctions.length > 0
  || result.functionAccessPolicy.missingExpectedAnonFunctions.length > 0
  || result.routeControlGaps.length > 0
  || result.wildcardCors.length > 0
)) process.exitCode = 1
