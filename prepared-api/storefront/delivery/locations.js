// MAP-023. Public static geography, not customer addresses or courier coverage.
import { publicFailure, requireStorefrontProject, safeJson } from '../../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase } from '../../../server/storefront-bff/supabase.js'

export default async function handler(req,res) {
  if (!requireStorefrontProject()) return safeJson(res,404,{error:{code:'NOT_FOUND'}})
  if (req.method !== 'GET') return safeJson(res,405,{error:{code:'METHOD_NOT_ALLOWED'}},{Allow:'GET'})
  try {
    const parent = req.query?.parent ?? new URL(req.url || '/', 'https://storefront.invalid').searchParams.get('parent')
    if (parent !== null && (typeof parent !== 'string' || !/^[0-9]{10}$/.test(parent))) throw new Error('REQUEST_INVALID')
    const {data,error} = await createStorefrontServerSupabase().rpc('read_delivery_locations_v1',{p_parent_code:parent})
    if (error) return safeJson(res,error.code === '22023' ? 400 : 503,{error:{code:error.code === '22023' ? 'REQUEST_INVALID' : 'DELIVERY_LOCATIONS_UNAVAILABLE'}})
    if (!data || data.sourceVersion !== 'psgc-2026-06-30' || !Array.isArray(data.children) || data.children.length > 1000
        || data.children.some(child => !child || !/^[0-9]{10}$/.test(child.code || '')
          || typeof child.name !== 'string' || !['Reg','Prov','Group','City','Mun','SubMun','Bgy'].includes(child.level)
          || child.sourceVersion !== data.sourceVersion)) return safeJson(res,503,{error:{code:'DELIVERY_LOCATIONS_UNAVAILABLE'}})
    const children = data.children.map(({code,name,level,sourceVersion}) => ({code,name,level,sourceVersion}))
    return safeJson(res,200,{ok:true,sourceVersion:data.sourceVersion,children})
  } catch (error) {
    const [status,code] = publicFailure(error)
    return safeJson(res,status,{error:{code}})
  }
}
