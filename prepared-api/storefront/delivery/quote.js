// MAP-023. Browser supplies identifiers; the database owns weight and tariff.
import { publicFailure, readJson, requireAllowedOrigin, requireStorefrontProject, safeJson, signedRpcArguments } from '../../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../../server/storefront-bff/supabase.js'

const SOURCE = 'psgc-2026-06-30'
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const bounded = (value, min, max) => Number.isInteger(value) && value >= min && value <= max
const invalid = () => { throw new Error('REQUEST_INVALID') }

export function validateCustomerDeliveryRequest(body) {
  if (!object(body) || Object.keys(body).some(k => !['service','items','destination'].includes(k))
      || !['standard','pickup','express'].includes(body.service)
      || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50
      || Buffer.byteLength(JSON.stringify(body),'utf8') > 16 * 1024) invalid()
  const seen = new Set()
  const items = body.items.map(line => {
    if (!object(line) || Object.keys(line).some(k => !['sku','quantity'].includes(k))
        || typeof line.sku !== 'string' || !/^[A-Za-z0-9._/-]{1,80}$/.test(line.sku)
        || !bounded(line.quantity,1,99) || seen.has(line.sku)) invalid()
    seen.add(line.sku)
    return {sku:line.sku,quantity:line.quantity}
  })
  if (body.service === 'pickup') {
    if (body.destination != null) invalid()
    return {service:body.service,items,destination:null}
  }
  const destination = body.destination
  if (!object(destination) || Object.keys(destination).some(k => !['sourceVersion','path'].includes(k))
      || destination.sourceVersion !== SOURCE || !Array.isArray(destination.path)
      || destination.path.length < 3 || destination.path.length > 5
      || destination.path.some(code => typeof code !== 'string' || !/^[0-9]{10}$/.test(code))
      || new Set(destination.path).size !== destination.path.length) invalid()
  return {service:body.service,items,destination:{sourceVersion:SOURCE,path:[...destination.path]}}
}

function publicQuote(value) {
  if (!object(value) || value.currency !== 'PHP' || !/^[a-f0-9]{64}$/.test(value.inputFingerprint || '')) return null
  const fields = ['service','status','feeMinor','currency','rateVersion','weightG','weightBasis','inputFingerprint','area','sourceVersion','messageCode']
  const quote = Object.fromEntries(fields.map(k => [k,value[k]]))
  if (quote.service === 'pickup') {
    if (quote.status !== 'customer_confirmed' || quote.feeMinor !== 0 || quote.rateVersion !== null
        || quote.weightG !== null || quote.weightBasis !== 'not_applicable' || quote.area !== null
        || quote.sourceVersion !== null || quote.messageCode !== 'PICKUP_ZERO') return null
  } else {
    if (!bounded(quote.weightG,1,495000000) || !['measured','estimated'].includes(quote.weightBasis)
        || quote.sourceVersion !== SOURCE || !['NCR','Greater Luzon','Visayas','Mindanao'].includes(quote.area)) return null
    if (quote.service === 'standard') {
      if (quote.status !== 'customer_confirmed' || !bounded(quote.feeMinor,1,10000000)
          || !bounded(quote.rateVersion,1,2147483647) || quote.messageCode !== 'STANDARD_RATE') return null
    } else if (quote.service !== 'express' || quote.area !== 'NCR' || quote.status !== 'pending_quote'
        || quote.feeMinor !== null || quote.rateVersion !== null || quote.messageCode !== 'EXPRESS_QUOTE_REQUIRED') return null
  }
  return quote
}

export default async function handler(req,res) {
  if (!requireStorefrontProject()) return safeJson(res,404,{error:{code:'NOT_FOUND'}})
  if (req.method !== 'POST') return safeJson(res,405,{error:{code:'METHOD_NOT_ALLOWED'}},{Allow:'POST'})
  if (!requireAllowedOrigin(req)) return safeJson(res,403,{error:{code:'ORIGIN_NOT_ALLOWED'}})
  try {
    const payload = validateCustomerDeliveryRequest(await readJson(req))
    const {data,error} = await createStorefrontServerSupabase().rpc('quote_customer_delivery_v1',signedRpcArguments(req,'delivery_quote',payload))
    if (error) {
      const status = error.code === '22023' ? 400 : error.code === 'K2WEB' ? 409 : 503
      const code = status === 400 ? 'REQUEST_INVALID' : status === 409 ? 'PRODUCT_NOT_AVAILABLE' : 'DELIVERY_QUOTE_UNAVAILABLE'
      return safeJson(res,status,{error:{code}})
    }
    const mapped = mapBoundaryResult(data)
    if (!mapped.ok) return safeJson(res,mapped.status,{error:{code:mapped.code}},mapped.retryAfter ? {'Retry-After':String(mapped.retryAfter)} : {})
    const quote = publicQuote(mapped.result.quote)
    if (!quote || quote.service !== payload.service) return safeJson(res,503,{error:{code:'DELIVERY_QUOTE_UNAVAILABLE'}})
    return safeJson(res,200,{ok:true,quote})
  } catch (error) {
    const [status,code] = publicFailure(error)
    return safeJson(res,status,{error:{code}})
  }
}
