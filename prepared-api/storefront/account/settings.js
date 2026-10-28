import { authorizationBearer, publicFailure, readJson, requireAllowedOrigin, requireStorefrontProject, safeJson, signedRpcArguments } from '../../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../../server/storefront-bff/supabase.js'
import { validateAddressBookCommand } from '../../../shared/customer-address-book.js'

export function validateCustomerSettings(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).sort().join(',') !== 'deliveryAddress,displayName,notifyInApp') throw new Error('REQUEST_INVALID')
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
  const deliveryAddress = typeof body.deliveryAddress === 'string' ? body.deliveryAddress.trim() : ''
  if (displayName.length < 1 || displayName.length > 140 || deliveryAddress.length > 500
      || typeof body.notifyInApp !== 'boolean') throw new Error('REQUEST_INVALID')
  return { displayName, deliveryAddress, notifyInApp: body.notifyInApp }
}

export function createCustomerSettingsHandler({ createClient = createStorefrontServerSupabase } = {}) {
return async function handler(req, res) {
  if (!requireStorefrontProject()) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } })
  const accessToken = authorizationBearer(req)
  if (!accessToken) return safeJson(res, 401, { error: { code: 'ACCOUNT_AUTH_REQUIRED' } })
  try {
    const body = await readJson(req)
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('REQUEST_INVALID')
    const addressCommand = body.operation === 'addresses'
    const payload = Object.keys(body).length === 0 ? {} : addressCommand
      ? validateAddressBookCommand(body) : validateCustomerSettings(body)
    const client = createClient(accessToken)
    const { data: identity, error: identityError } = await client.auth.getUser(accessToken)
    if (identityError || !identity?.user?.id) return safeJson(res, 401, { error: { code: 'ACCOUNT_AUTH_REQUIRED' } })
    const writing = Object.keys(payload).length > 0
    const { data, error } = addressCommand
      ? await client.rpc('save_customer_account_address_book_v1', signedRpcArguments(req, 'account_settings_write', payload))
      : writing
        ? await client.rpc('save_customer_account_settings_v1', signedRpcArguments(req, 'account_settings_write', payload))
        : await client.rpc('read_customer_account_settings_v1', signedRpcArguments(req, 'account_settings_read', payload))
    if (error) return safeJson(res, 503, { error: { code: 'ACCOUNT_SETTINGS_UNAVAILABLE' } })
    const mapped = mapBoundaryResult(data)
    if (!mapped.ok) return safeJson(res, mapped.status, { error: { code: mapped.code } })
    return safeJson(res, 200, { ok: true, settings: mapped.result.settings, notifications: mapped.result.notifications || [] })
  } catch (error) {
    const [status, code] = publicFailure(error)
    return safeJson(res, status, { error: { code } })
  }
}
}
export default createCustomerSettingsHandler()
