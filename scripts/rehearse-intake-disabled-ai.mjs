// IDEA-20261003-02 / MAP-018/020. Owned clone, disabled configuration, no provider dispatch.
import fs from 'node:fs'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {signedAdminCommandArguments} from '../server/admin-bff/security.js'
import {validateProductIntakeCommand} from '../server/admin-bff/product-intake.js'
import {intakeSchemaCaptureSql,foundationPreservesExistingSchema} from './rehearse-intake-foundation.mjs'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])):v
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b))
export const intakeDisabledAiWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export async function rehearseIntakeDisabledAi({value,check,literal:q,evidence,actor}){
 const report={idea:'IDEA-20261003-02',scope:'Native signed disabled AI readiness/claim refusal on owned clone; no upload, deletion, spend, job dispatch or host acceptance',providerWrites:false,providerCalls:false,storageOperations:false,commands:[]}
 fs.writeFileSync(path.join(evidence,'executed-intake-disabled-ai.mjs'),bytes)
 report.sources=['server/admin-bff/security.js','server/admin-bff/product-intake.js'].map(file=>{const b=fs.readFileSync(file),archive='disabled-ai-'+path.basename(file);fs.writeFileSync(path.join(evidence,archive),b);return {file,archive,sha256:createHash('sha256').update(b).digest('hex')}})
 const tables=JSON.parse(value("select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private','storage') and c.relkind in ('r','p');"))
 const rows=()=>JSON.parse(value(`select jsonb_object_agg(t,r)::text from (values ${tables.map(t=>`(${q(t)},(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]') from ${t} x))`).join(',')}) s(t,r);`))
 const functions=()=>JSON.parse(value("select jsonb_agg(jsonb_build_object('definition',pg_get_functiondef(p.oid),'catalog',to_jsonb(p)) order by p.oid)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','k2_private','storage');")),schema=()=>JSON.parse(value(intakeSchemaCaptureSql))
 const nt='k2_private.admin_request_nonces',rt='k2_private.admin_request_rate_buckets',ct='k2_private.admin_command_receipts',st='public.product_intake_sessions'
 const call=(action,payload,{error,overrides={},role='authenticated',jwtActor=actor,signerActor=actor,aal='aal2',args:given,setupSql=''}={})=>{
  const args={...(given??signedAdminCommandArguments(action,signerActor,randomUUID(),payload)),...overrides},rpc=action==='intake_session_create'?'execute_admin_product_intake_command_v1':'execute_admin_intake_ai_v1'
  if(setupSql&&!error)throw Error('AI_FIXTURE_REQUIRES_ROLLBACK_REFUSAL')
  const sql=setupSql+`select set_config('request.jwt.claim.sub',${q(jwtActor??'')},false);select set_config('request.jwt.claims',${q(JSON.stringify({aal}))},false);set role ${role};select public.${rpc}(${['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'].map(k=>args[k]===null?'NULL':q(args[k])).join(',')})::text;`
  const c={action,payload,args,sql,role,jwtActor,signerActor,aal,before:rows()};report.commands.push(c)
  try{c.result=JSON.parse(value(sql))}catch(e){c.error=e.message}c.after=rows()
  if(error){check(action+' refuses '+error+' with exact all-table rollback',c.error?.includes(error)&&same(c.before,c.after));if(!c.error?.includes(error))throw Error('Disabled AI refusal mismatch: '+c.error)}
  else{check(action+' succeeds',!c.error&&!!c.result);if(c.error)throw Error(c.error)}
  return c
 }
 const exactRead=c=>{
  check('AI read changes only own nonce and namespaced actor rate bucket',Object.keys(c.before).filter(t=>![nt,rt].includes(t)).every(t=>same(c.before[t],c.after[t])))
  const bn=c.before[nt],an=c.after[nt],newNonces=an.filter(n=>!bn.some(b=>same(b,n))),n=newNonces[0]
  check('AI read adds exactly own signed nonce without pruning any old nonce',newNonces.length===1&&an.length===bn.length+1&&bn.every(b=>an.some(a=>same(a,b)))&&n.actor_id===actor&&n.action===c.action&&n.nonce===c.args.p_nonce&&Date.parse(n.expires_at)-Date.parse(n.used_at)===600000)
  const br=c.before[rt],ar=c.after[rt],changed=ar.filter(n=>!br.some(b=>same(b,n))),r=changed[0],prior=br.find(b=>b.scope===r?.scope&&b.subject===r?.subject&&b.bucket_start===r?.bucket_start)
  check('AI read increments exactly its intake-ai actor bucket with all other rate rows exact',changed.length===1&&r.scope==='actor'&&r.subject==='intake-ai:'+actor&&r.hit_count===(prior?.hit_count??0)+1&&ar.length===br.length+(prior?0:1)&&br.every(b=>same(b,prior)||ar.some(a=>same(a,b)))&&(!prior||same({...r,hit_count:prior.hit_count},prior)))
 }
 try{
  report.before=rows();report.beforeFunctions=functions();report.beforeSchema=schema()
  const config=report.before['k2_private.ai_spend_control_config'];check('owned clone retains one disabled AI config with no approved model or caps',config.length===1&&config[0].paid_path_enabled===false&&config[0].provider_model_snapshot===null&&['per_product_usd_micros','per_session_usd_micros','monthly_usd_micros'].every(k=>config[0][k]===null))
  const input=validateProductIntakeCommand('intake_session_create',{requestId:randomUUID(),barcode:null,scannedIdentity:'Synthetic disabled AI readiness '+randomUUID()}),created=call('intake_session_create',input),sessionId=created.result.sessionId;report.sessionId=sessionId
  check('native intake creates only one own pre-Draft session and shared signing controls',Object.keys(created.before).filter(t=>![st,nt,rt,ct].includes(t)).every(t=>same(created.before[t],created.after[t]))&&created.after[st].length===created.before[st].length+1&&created.before[st].every(r=>created.after[st].some(a=>same(a,r)))&&created.after[st].some(s=>s.id===sessionId&&s.created_by===actor&&s.product_id===null&&s.status==='active'))
  const bn=created.before[nt],an=created.after[nt],added=an.filter(n=>!bn.some(b=>same(b,n))),nonce=added[0]
  check('pre-Draft creation adds exactly own nonce with only expired pruning',added.length===1&&nonce.actor_id===actor&&nonce.action===created.action&&nonce.nonce===created.args.p_nonce&&Date.parse(nonce.expires_at)-Date.parse(nonce.used_at)===600000&&bn.every(b=>an.some(a=>same(a,b))||Date.parse(b.expires_at)<=Date.parse(nonce.used_at)))
  const br=created.before[rt],ar=created.after[rt],changed=ar.filter(n=>!br.some(b=>same(b,n))),bucket=changed[0]?.bucket_start
  check('pre-Draft creation consumes exact actor/global rate hits with only expired pruning',changed.length===2&&changed.every(n=>n.bucket_start===bucket&&((n.scope==='actor'&&n.subject===actor)||(n.scope==='global'&&n.subject==='all_admin_requests'))&&n.hit_count===(br.find(b=>b.scope===n.scope&&b.subject===n.subject&&b.bucket_start===bucket)?.hit_count??0)+1)&&br.every(b=>ar.some(n=>same(b,n))||changed.some(n=>n.scope===b.scope&&n.subject===b.subject&&n.bucket_start===b.bucket_start)||Date.parse(b.bucket_start)<Date.parse(bucket)-86400000))
  const bc=created.before[ct],ac=created.after[ct],receipt=ac.find(r=>r.actor_id===actor&&r.action===created.action&&r.idempotency_key===created.args.p_idempotency_key)
  check('pre-Draft creation retains exact own durable receipt and every old receipt',!!receipt&&receipt.payload_hash===createHash('sha256').update(created.args.p_payload_text).digest('hex')&&same(receipt.result,created.result)&&!!receipt.completed_at&&ac.length===bc.length+1&&bc.every(b=>ac.some(a=>same(a,b))))
  const payload={sessionId},read=call('intake_ai_read',payload);exactRead(read)
  check('disabled AI read returns no jobs, false readiness and exact unknown caps without a product',same(read.result,{jobs:[],budget:{ready:false,monthlyCap:null,perProductCap:null,perSessionCap:null,monthReserved:0,productReserved:0,sessionReserved:0},productId:null}))
  const retry=call('intake_ai_read',payload);exactRead(retry);check('fresh signed readiness retry returns exact same disabled projection',same(read.result,retry.result))
  call('intake_ai_read',payload,{args:read.args,error:'AI_JOB_UNAVAILABLE'})
  for(const kind of ['content','PRIMARY','AFTER'])call('intake_ai_claim',{sessionId,kind,confirmation:'CONFIRM_PAID_INTAKE',version:'k2.intake-ai.2026-09-06',brief:'Synthetic bounded refusal only'},{error:'AI_BUDGET_BLOCKED'})
  call('intake_ai_read',payload,{role:'anon',error:'permission denied'})
  call('intake_ai_read',payload,{aal:'aal1',error:'AI_JOB_UNAVAILABLE'})
  call('intake_ai_read',payload,{jwtActor:null,error:'AI_JOB_UNAVAILABLE'})
  call('intake_ai_read',payload,{jwtActor:randomUUID(),error:'AI_JOB_UNAVAILABLE'})
  const outsider=randomUUID(),otherStaff=randomUUID();report.ownershipActors={outsider,otherStaff}
  call('intake_ai_read',payload,{jwtActor:outsider,signerActor:outsider,setupSql:`begin;insert into auth.users(id) values(${q(outsider)});`,error:'AI_JOB_UNAVAILABLE'})
  const otherSetup=`begin;insert into auth.users(id) values(${q(otherStaff)});insert into public.user_profiles(id,role) values(${q(otherStaff)},'Staff') on conflict(id) do update set role=excluded.role;`
  call('intake_ai_read',payload,{jwtActor:otherStaff,signerActor:otherStaff,setupSql:otherSetup,error:'AI_JOB_UNAVAILABLE'})
  call('intake_ai_claim',{sessionId,kind:'content',confirmation:'CONFIRM_PAID_INTAKE',version:'k2.intake-ai.2026-09-06'},{jwtActor:otherStaff,signerActor:otherStaff,setupSql:otherSetup,error:'AI_JOB_UNAVAILABLE'})
  call('intake_ai_read',payload,{overrides:{p_signature:'0'.repeat(64)},error:'AI_JOB_UNAVAILABLE'})
  call('intake_ai_read',payload,{overrides:{p_timestamp:Math.floor(Date.now()/1000)-600},error:'AI_JOB_UNAVAILABLE'})
  for(const input of ['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'])call('intake_ai_read',payload,{overrides:{[input]:null},error:'AI_JOB_UNAVAILABLE'})
  call('intake_ai_read',{sessionId:randomUUID()},{error:'AI_JOB_UNAVAILABLE'})
  report.final=rows();report.finalFunctions=functions();report.finalSchema=schema()
  check('disabled AI proof preserves exact installed functions and schema/RLS/ACL/columns/constraints',same(report.beforeFunctions,report.finalFunctions)&&report.beforeSchema.length===report.finalSchema.length&&foundationPreservesExistingSchema(report.beforeSchema,report.finalSchema,'disabled-ai'))
  check('disabled AI never changes jobs, spend config/events, evidence, products, stock or any unrelated table',Object.keys(report.before).filter(t=>![st,nt,rt,ct].includes(t)).every(t=>same(report.before[t],report.final[t])))
 }finally{fs.writeFileSync(path.join(evidence,'intake-disabled-ai.json'),JSON.stringify(report,null,2)+'\n')}
}
