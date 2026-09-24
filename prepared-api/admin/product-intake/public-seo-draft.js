import { authorizeAdminRequest } from '../../../server/admin-bff/authorize.js'
import { lookupBarcodeCatalog } from '../../../server/admin-bff/barcode-catalog.js'
import { generatePublicSeoDraft } from '../../../server/admin-bff/gemini-public-draft.js'
import { readJson, requireAdminProject, safeJson } from '../../../server/admin-bff/security.js'
import { createRateShield } from '../../../server/rate-shield.js'

const draftRate = createRateShield({ windowMs: 60_000, limit: 5, maxKeys: 1 })

export default async function handler(req, res) {
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const body = await readJson(req)
    if (!body || Array.isArray(body) || Object.keys(body).join(',') !== 'barcode' || typeof body.barcode !== 'string') throw new Error('REQUEST_INVALID')
    if (!process.env.GEMINI_API_KEY?.trim()) throw new Error('GEMINI_NOT_CONFIGURED')
    const rate = draftRate.consume('gemini-public-draft')
    if (!rate.allowed) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': String(rate.retryAfter) })
    const catalog = await lookupBarcodeCatalog(body.barcode)
    if (catalog.status !== 'found') throw new Error('PUBLIC_CATALOG_REQUIRED')
    const draft = await generatePublicSeoDraft(catalog)
    return safeJson(res, 200, { ok: true, data: { draft, catalog: { barcode: catalog.barcode, name: catalog.name, brand: catalog.brand, quantity: catalog.quantity, source: catalog.source, sourceUrl: catalog.sourceUrl, license: catalog.license } } })
  } catch (error) {
    const code = ['REQUEST_INVALID', 'BARCODE_INVALID', 'PUBLIC_CATALOG_REQUIRED', 'GEMINI_NOT_CONFIGURED', 'GEMINI_TIMEOUT', 'GEMINI_UNAVAILABLE', 'GEMINI_OUTPUT_INVALID'].includes(error?.message)
      ? error.message : 'PUBLIC_DRAFT_UNAVAILABLE'
    const status = ['REQUEST_INVALID', 'BARCODE_INVALID'].includes(code) ? 400 : code === 'PUBLIC_CATALOG_REQUIRED' ? 422 : 503
    return safeJson(res, status, { error: { code } })
  }
}
