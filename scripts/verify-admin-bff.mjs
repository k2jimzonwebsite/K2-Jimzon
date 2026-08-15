import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

process.env.K2_SESSION_COOKIE_KEY = Buffer.alloc(32, 7).toString('base64')
process.env.K2_ADMIN_ORIGINS = 'https://admin.example.test'
process.env.K2_DEPLOYMENT_TARGET = 'admin'
process.env.NODE_ENV = 'production'

const security = await import('../server/admin-bff/security.js')

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
const csrf = decodeURIComponent(setCookies[1].split(';')[0].split('=').slice(1).join('='))
assert.equal(security.verifyCsrf({ headers: { cookie: cookieHeader, 'x-k2-csrf': csrf } }, active), true)
assert.equal(security.verifyCsrf({ headers: { cookie: cookieHeader, 'x-k2-csrf': `${csrf}x` } }, active), false)

const files = [
  'prepared-api/admin/auth/login.js', 'prepared-api/admin/auth/mfa.js',
  'prepared-api/admin/auth/logout.js', 'prepared-api/admin/session.js', 'prepared-api/admin/overview.js',
  'prepared-api/admin/products.js',
  'server/admin-bff/security.js', 'server/admin-bff/supabase.js',
  'server/admin-bff/authorize.js', 'src/services/adminBffService.js',
  'src/context/useAdminAuthRuntime.js',
]
const contents = await Promise.all(files.map(async (path) => [path, await readFile(new URL(`../${path}`, import.meta.url), 'utf8')]))
for (const [path, content] of contents) {
  assert.doesNotMatch(content, /SUPABASE_SERVICE_ROLE|SUPABASE_SECRET_KEY/, `${path} must use the limited key`)
  assert.doesNotMatch(content, /SUPABASE_ANON_KEY/, `${path} must use the modern publishable key`)
  assert.doesNotMatch(content, /Access-Control-Allow-Origin['"\s:,]+\*/, `${path} must not use wildcard CORS`)
  assert.doesNotMatch(content, /error\.stack|error\.message\s*\|\|/, `${path} must not return provider internals`)
}
assert.match((contents.find(([path]) => path === 'server/admin-bff/supabase.js') || [null, ''])[1], /SUPABASE_PUBLISHABLE_KEY/)

const viteConfig = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8')
const supabaseClient = await readFile(new URL('../src/lib/supabaseClient.js', import.meta.url), 'utf8')
const adminAuthRuntime = await readFile(new URL('../src/context/useAdminAuthRuntime.js', import.meta.url), 'utf8')
assert.match(viteConfig, /VITE_SUPABASE_PUBLISHABLE_KEY[\s\S]*SUPABASE_PUBLISHABLE_KEY[\s\S]*K2_SUPABASE_PUBLISHABLE_KEY/)
assert.match(supabaseClient, /VITE_SUPABASE_PUBLIC_KEY/)
assert.doesNotMatch(adminAuthRuntime, /apikey:\s*import\.meta\.env\.VITE_SUPABASE_ANON_KEY/)

console.log('Admin BFF security foundation contract passed (UI/data proxy activation remains pending).')
