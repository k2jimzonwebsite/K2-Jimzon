import { createHash, timingSafeEqual } from 'node:crypto'
import { createClient as supabaseClient } from '@supabase/supabase-js'
import { safeJson } from './security.js'

const K2_URL='https://pixplcjqivlfflickobf.supabase.co'
const digest=value=>createHash('sha256').update(value).digest()
function serverClient(env) {
  return supabaseClient(K2_URL,env.K2_PRIVACY_SERVICE_ROLE_KEY,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal
      ?AbortSignal.any([options.signal,AbortSignal.timeout(3000)]):AbortSignal.timeout(3000)})},
  })
}
export function createPrivacyWorkerHandler({env=process.env,createClient=serverClient,now=Date.now}={}) {
  return async function handler(req,res) {
    if(env.K2_DEPLOYMENT_TARGET!=='storefront'||env.K2_CUSTOMER_PRIVACY_ENABLED!=='true')return safeJson(res,404,{error:{code:'NOT_FOUND'}})
    if(req.method!=='GET')return safeJson(res,405,{error:{code:'METHOD_NOT_ALLOWED'}},{Allow:'GET'})
    const expected=String(env.CRON_SECRET||'')
    if(expected.length<32||!timingSafeEqual(digest(String(req.headers.authorization||'')),digest(`Bearer ${expected}`)))return safeJson(res,401,{error:{code:'SCHEDULER_AUTH_REQUIRED'}})
    if(env.SUPABASE_URL!==K2_URL||!env.K2_PRIVACY_SERVICE_ROLE_KEY)return safeJson(res,503,{error:{code:'PRIVACY_WORKER_CONFIG_REQUIRED'}})
    try {
      const client=createClient(env)
      const rpc=async(operation,payload={})=>{
        const {data,error}=await client.rpc('customer_privacy_worker_v1',{p_operation:operation,p_payload:payload})
        if(error||!data?.ok)throw new Error('PRIVACY_WORKER_UNAVAILABLE')
        return data
      }
      const started=now();const tick=await rpc('tick');let completed=0;let retries=0
      for(let index=0;index<3&&now()-started<6500;index++) {
        const {task}=await rpc('lease');if(!task)break
        const receipt={requestId:task.requestId,lease:task.lease}
        try {
          const existing=await client.auth.admin.getUserById(task.userId)
          const missing=existing.error?.status===404||existing.error?.code==='user_not_found'
          if(existing.error&&!missing)throw new Error('AUTH_UNAVAILABLE')
          if(!missing&&!existing.data?.user?.deleted_at) {
            const result=await client.auth.admin.deleteUser(task.userId,true)
            if(result.error&&result.error.status!==404&&result.error.code!=='user_not_found')throw new Error('AUTH_UNAVAILABLE')
          }
          await rpc('complete',receipt);completed++
        }catch {
          // A committed deletion with a lost response will be observed as deleted
          // by UUID next time. Never resolve users by re-used email/phone.
          await rpc('retry',receipt);retries++
        }
      }
      return safeJson(res,retries?503:200,{ok:retries===0,checked:tick.checked||0,completed,retries})
    }catch{return safeJson(res,503,{error:{code:'PRIVACY_WORKER_UNAVAILABLE'}})}
  }
}
export default createPrivacyWorkerHandler()
