import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

process.env.K2_SESSION_COOKIE_KEY = Buffer.alloc(32, 7).toString('base64')
process.env.K2_ADMIN_ORIGINS = 'https://admin.example.test'
process.env.K2_DEPLOYMENT_TARGET = 'admin'
process.env.NODE_ENV = 'production'

const security = await import('../server/admin-bff/security.js')
const router = await import('../server/admin-bff/router.js')
assert.equal(router.ADMIN_BFF_ROUTES.length, 68)
assert.equal(new Set(router.ADMIN_BFF_ROUTES).size, 68)

const preparedAdminRoot = fileURLToPath(new URL('../prepared-api/admin', import.meta.url))
async function preparedRoutes(directory = preparedAdminRoot) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return preparedRoutes(target)
    if (!entry.isFile() || !entry.name.endsWith('.js')) return []
    return [path.relative(preparedAdminRoot, target).replaceAll('\\', '/').replace(/\.js$/, '')]
  }))
  return nested.flat()
}
assert.deepEqual(
  [...router.ADMIN_BFF_ROUTES].sort(),
  (await preparedRoutes()).sort(),
  'The single-function router must explicitly cover every prepared Admin endpoint',
)

const allowedRequest = {
  method: 'POST',
  headers: { origin: 'https://admin.example.test' },
  socket: { remoteAddress: '127.0.0.1' },
}
assert.equal(security.requireAdminProject(allowedRequest), true)
assert.equal(security.requireAllowedOrigin(allowedRequest), true)
assert.equal(security.requireAllowedOrigin({ ...allowedRequest, headers: { origin: 'https://evil.example' } }), false)
process.env.K2_DEPLOYMENT_TARGET = 'storefront'
assert.equal(security.requireAdminProject(allowedRequest), false)
process.env.K2_DEPLOYMENT_TARGET = 'admin'

const responseHeaders = new Map()
const response = { setHeader: (name, value) => responseHeaders.set(name.toLowerCase(), value) }
const nowSeconds = Math.floor(Date.now() / 1000)
security.setActiveSessionCookies(response, {
  access_token: 'fabricated-access-token',
  refresh_token: 'fabricated-refresh-token',
  expires_at: nowSeconds + 3600,
}, { userId: '00000000-0000-4000-8000-000000000001', role: 'Admin' })

const setCookies = responseHeaders.get('set-cookie')
assert.equal(Array.isArray(setCookies), true)
assert.match(setCookies[0], /HttpOnly/)
assert.match(setCookies[0], /Secure/)
assert.match(setCookies[0], /SameSite=Strict/)
assert.doesNotMatch(setCookies[1], /HttpOnly/)
const cookieHeader = setCookies.map((item) => item.split(';')[0]).join('; ')
const sessionRequest = { headers: { cookie: cookieHeader } }
const active = security.readActiveSession(sessionRequest)
assert.equal(active.role, 'Admin')
assert.match(active.sessionId, /^[0-9a-f-]{36}$/i)
const csrf = decodeURIComponent(setCookies[1].split(';')[0].split('=').slice(1).join('='))
assert.equal(security.verifyCsrf({ headers: { cookie: cookieHeader, 'x-k2-csrf': csrf } }, active), true)
assert.equal(security.verifyCsrf({ headers: { cookie: cookieHeader, 'x-k2-csrf': `${csrf}x` } }, active), false)

const secondHeaders = new Map()
security.setActiveSessionCookies({ setHeader: (name, value) => secondHeaders.set(name.toLowerCase(), value) }, {
  access_token: 'fabricated-access-token',
  refresh_token: 'fabricated-refresh-token',
  expires_at: nowSeconds + 3600,
}, { userId: '00000000-0000-4000-8000-000000000001', role: 'Admin' })
const secondCookie = secondHeaders.get('set-cookie')[0].split(';')[0]
const secondActive = security.readActiveSession({ headers: { cookie: secondCookie } })
assert.notEqual(secondActive.sessionId, active.sessionId, 'A new authentication must rotate the session identity')

const refreshHeaders = new Map()
security.refreshActiveSessionCookie({ setHeader: (name, value) => refreshHeaders.set(name.toLowerCase(), value) }, {
  access_token: 'fabricated-refreshed-access-token',
  refresh_token: 'fabricated-refreshed-refresh-token',
  expires_at: nowSeconds + 7200,
}, active)
const refreshedCookie = refreshHeaders.get('set-cookie').split(';')[0]
const refreshed = security.readActiveSession({ headers: { cookie: refreshedCookie } })
assert.equal(refreshed.sessionId, active.sessionId, 'An inactivity refresh must preserve the revocable session identity')
assert.equal(refreshed.createdAt, active.createdAt, 'An inactivity refresh must preserve the absolute lifetime anchor')

const originalPair = setCookies[0].split(';')[0]
const separator = originalPair.indexOf('=')
const tamperedPair = `${originalPair.slice(0, separator + 1)}${originalPair.slice(separator + 1, -2)}xx`
assert.equal(security.readActiveSession({ headers: { cookie: tamperedPair } }), null)

const files = [
  'prepared-api/admin/auth/login.js', 'prepared-api/admin/auth/mfa.js',
  'prepared-api/admin/auth/logout.js', 'prepared-api/admin/session.js', 'prepared-api/admin/overview.js',
  'prepared-api/admin/products.js',
  'server/admin-bff/security.js', 'server/admin-bff/supabase.js',
  'server/admin-bff/authorize.js', 'server/admin-bff/sessions.js', 'server/admin-bff/router.js',
  'server/admin-bff/mfa-enrollment.js',
  'server/admin-bff/mfa-replacement.js',
  'server/admin-bff/mfa-replacement-handler.js',
  'server/admin-bff/preauth-rate.js',
  'prepared-api/admin/auth/password-recovery/request.js',
  'server/admin-bff/security-events.js', 'prepared-api/admin/security-events.js',
  'prepared-api/admin-router.js', 'api/admin/index.js', 'src/services/adminBffService.js',
  'src/context/useAdminAuthRuntime.js',
  'server/admin-bff/staff-invitations.js', 'prepared-api/admin/staff-access/invite.js',
]
const contents = await Promise.all(files.map(async (path) => [path, await readFile(new URL(`../${path}`, import.meta.url), 'utf8')]))
for (const [path, content] of contents) {
  assert.doesNotMatch(content, /SUPABASE_SERVICE_ROLE|SUPABASE_SECRET_KEY/, `${path} must use the limited key`)
  assert.doesNotMatch(content, /SUPABASE_ANON_KEY/, `${path} must use the modern publishable key`)
  assert.doesNotMatch(content, /Access-Control-Allow-Origin['"\s:,]+\*/, `${path} must not use wildcard CORS`)
  assert.doesNotMatch(content, /error\.stack|error\.message\s*\|\|/, `${path} must not return provider internals`)
}
assert.match((contents.find(([path]) => path === 'server/admin-bff/supabase.js') || [null, ''])[1], /SUPABASE_PUBLISHABLE_KEY/)
assert.match((contents.find(([path]) => path === 'api/admin/index.js') || [null, ''])[1], /K2_ADMIN_BFF_ENABLED\s*===\s*'true'/)

const viteConfig = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8')
const supabaseClient = await readFile(new URL('../src/lib/supabaseClient.js', import.meta.url), 'utf8')
const adminAuthRuntime = await readFile(new URL('../src/context/useAdminAuthRuntime.js', import.meta.url), 'utf8')
assert.match(viteConfig, /VITE_SUPABASE_PUBLISHABLE_KEY[\s\S]*SUPABASE_PUBLISHABLE_KEY[\s\S]*K2_SUPABASE_PUBLISHABLE_KEY/)
assert.match(supabaseClient, /VITE_SUPABASE_PUBLIC_KEY/)
assert.doesNotMatch(adminAuthRuntime, /apikey:\s*import\.meta\.env\.VITE_SUPABASE_ANON_KEY/)

console.log('Admin BFF security foundation contract passed (UI/data proxy activation remains pending).')
