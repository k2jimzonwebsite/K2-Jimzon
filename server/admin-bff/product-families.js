import { authorizeAdminRequest } from './authorize.js'
import { isAdminRole } from './supabase.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'
import { FAMILY_UUID, validateFamilyPayload } from '../../src/lib/productFamilies.js'

export async function enrichAdminProductFamilyRead(client, read, requestedSkus) {
  const members = read?.family?.members ?? []
  if (!read || !Array.isArray(read.products) || !Array.isArray(members)) throw Error('FAMILY_STATE_UNAVAILABLE')
  const skus = [...new Set([...requestedSkus, ...read.products.map(product => product.sku), ...members.map(member => member.sku)])]
  if (!skus.length) {
    if (requestedSkus.length || read.products.length || members.length || !read.family || !FAMILY_UUID.test(read.family.id)) throw Error('FAMILY_STATE_UNAVAILABLE')
    return { ...read, family: { ...read.family, members: [] }, products: [] }
  }
  if (skus.some(sku => typeof sku !== 'string' || !sku)) throw Error('FAMILY_STATE_UNAVAILABLE')
  const [productRead, websiteRead] = await Promise.all([
    client.from('products').select('sku,status').in('sku', skus),
    client.from('channel_listings').select('sku,status,publication_status')
      .eq('channel_source', 'website').is('shop_id', null).in('sku', skus),
  ])
  if (productRead.error || !Array.isArray(productRead.data)
    || websiteRead.error || !Array.isArray(websiteRead.data)) throw Error('FAMILY_STATE_UNAVAILABLE')
  const products = new Map(productRead.data.map(product => [product.sku, product]))
  const websites = new Map()
  if (products.size !== skus.length || skus.some(sku => !products.has(sku)
    || typeof products.get(sku).status !== 'string' || !products.get(sku).status)) throw Error('FAMILY_STATE_UNAVAILABLE')
  for (const listing of websiteRead.data) {
    if (!listing?.sku || !skus.includes(listing.sku) || websites.has(listing.sku)) throw Error('FAMILY_STATE_UNAVAILABLE')
    websites.set(listing.sku, listing)
  }
  const state = sku => {
    const listing = websites.get(sku)
    const websiteStatus = !listing ? 'Not assigned'
      : listing.status === 'Active'
        ? `Assigned${listing.publication_status ? ` · ${listing.publication_status}` : ''}`
        : 'Inactive'
    return { status: products.get(sku).status, websiteStatus }
  }
  return {
    ...read,
    family: read.family ? { ...read.family, members: members.map(member => ({ ...member, ...state(member.sku) })) } : null,
    products: read.products.map(product => ({ ...product, ...state(product.sku) })),
  }
}

export default async function handleProductFamilies(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  const commandKey = String(req.headers['x-k2-idempotency-key'] || '')
  if (req.method === 'POST' && !FAMILY_UUID.test(commandKey)) return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (!isAdminRole(authorized.identity.role)) return safeJson(res, 403, { error: { code: 'PRODUCT_ADMIN_REQUIRED' } })
  if (req.method === 'POST' && req.headers['x-k2-actor-id'] !== authorized.identity.userId) return safeJson(res, 403, { error: { code: 'PRODUCT_ACTOR_CHANGED' } })
  try {
    let response, skus = []
    if (req.method === 'POST') {
      const payload = validateFamilyPayload(await readJson(req))
      response = await authorized.client.rpc('execute_admin_product_family_v1', signedAdminCommandArguments('product_family_save', authorized.identity.userId, commandKey, payload))
    } else {
      const url = new URL(req.url || '/', 'https://admin.invalid')
      const familyId = url.searchParams.get('familyId')
      skus = (url.searchParams.get('skus') || '').split(',').filter(Boolean)
      if ((familyId && !FAMILY_UUID.test(familyId)) || skus.length > 100 || (!familyId && !skus.length)
        || new Set(skus).size !== skus.length || skus.some(sku => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(sku))) throw Error('FAMILY_INVALID')
      response = await authorized.client.rpc('read_admin_product_families_v1', { p_skus: skus, p_family_id: familyId })
    }
    if (response.error) {
      const message = String(response.error.message || '')
      for (const [match, status, code] of [
        ['K2_FAMILY_VERSION_CONFLICT', 409, 'FAMILY_VERSION_CONFLICT'],
        ['K2_FAMILY_MEMBERSHIP_CONFLICT', 409, 'FAMILY_MEMBERSHIP_CONFLICT'],
        ['K2_FAMILY_MIXED', 409, 'FAMILY_MIXED'],
        ['K2_FAMILY_TAXONOMY', 409, 'FAMILY_TAXONOMY'],
        ['K2_FAMILY_INVALID', 400, 'FAMILY_INVALID'],
        ['K2_FAMILY_PRODUCT_MISSING', 404, 'PRODUCT_NOT_FOUND'],
        ['K2_ADMIN_IDEMPOTENCY_CONFLICT', 409, 'IDEMPOTENCY_CONFLICT'],
        ['K2_ADMIN_RATE_LIMITED', 429, 'RATE_LIMITED'],
      ]) if (message.includes(match)) return safeJson(res, status, { error: { code } })
      return safeJson(res, 503, { error: { code: 'FAMILY_UNAVAILABLE' } })
    }
    if (req.method === 'GET') {
      const read = await enrichAdminProductFamilyRead(authorized.client, response.data, skus)
      return safeJson(res, 200, { ok: true, ...read })
    }
    return safeJson(res, 200, { ok: true, result: response.data })
  } catch (error) {
    if (['FAMILY_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) return safeJson(res, 400, { error: { code: 'FAMILY_INVALID' } })
    return safeJson(res, 503, { error: { code: 'FAMILY_UNAVAILABLE' } })
  }
}
