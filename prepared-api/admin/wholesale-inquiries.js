import { authorizeAdminRequest } from '../../server/admin-bff/authorize.js'
import { readAdminWholesaleInquiries } from '../../server/admin-bff/wholesale-inquiries.js'
import { requireAdminProject,safeJson } from '../../server/admin-bff/security.js'

export default async function handler(req,res) {
  if(!requireAdminProject(req)) return safeJson(res,404,{error:{code:'NOT_FOUND'}})
  if(req.method!=='GET') return safeJson(res,405,{error:{code:'METHOD_NOT_ALLOWED'}},{Allow:'GET'})
  const authorized=await authorizeAdminRequest(req,res)
  if(!authorized) return undefined
  if(authorized.identity.role!=='Admin') return safeJson(res,403,{error:{code:'WHOLESALE_ADMIN_REQUIRED'}})
  try { return safeJson(res,200,{ok:true,data:await readAdminWholesaleInquiries(authorized.client)}) }
  catch { return safeJson(res,503,{error:{code:'WHOLESALE_INQUIRIES_UNAVAILABLE'}}) }
}
