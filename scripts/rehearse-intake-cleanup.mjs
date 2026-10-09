// IDEA-20261004-01. Parent-owned restore only; no Storage or provider operations.
import fs from 'node:fs'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {signedAdminCommandArguments} from '../server/admin-bff/security.js'
import {intakeSchemaCaptureSql,buildIntakeRestoredStorageGuard} from './rehearse-intake-foundation.mjs'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
export const intakeCleanupWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export async function rehearseIntakeCleanup({sync,value,check,literal:q,source,evidence,marker,dataDirectory,actor,beforeFix=false}){
 const report={idea:'IDEA-20261004-01',scope:'Native owned-clone cleanup ledger only; completion is metadata, not Storage deletion',providerWrites:false,storageOperations:false,commands:[]},write=()=>fs.writeFileSync(path.join(evidence,'intake-cleanup.json'),JSON.stringify(report,null,2)+'\n')
 fs.writeFileSync(path.join(evidence,'executed-intake-cleanup.mjs'),bytes)
 const security=fs.readFileSync('server/admin-bff/security.js');fs.writeFileSync(path.join(evidence,'cleanup-security.js'),security);report.securitySha256=createHash('sha256').update(security).digest('hex')
 const tables=JSON.parse(value("select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private','storage') and c.relkind in ('r','p');"))
 const rows=()=>JSON.parse(value(`select jsonb_object_agg(t,r)::text from (values ${tables.map(t=>`(${q(t)},(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]') from ${t} x))`).join(',')}) s(t,r);`))
 const functions=()=>JSON.parse(value("select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'catalog',to_jsonb(p)-'prosrc') order by p.oid)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','k2_private','storage');")),schema=()=>JSON.parse(value(intakeSchemaCaptureSql))
 const signature='k2_private.verify_admin_bff_cleanup_request(text,bigint,uuid,uuid,text,text)',ledger='k2_private.product_intake_evidence_cleanup_events',nonces='k2_private.admin_request_nonces'
 const life=JSON.parse(fs.readFileSync(path.join(evidence,'intake-lifecycle.json'),'utf8')),objectPath=actor+'/'+life.sessionId+'/synthetic-cleanup-'+randomUUID()+'.jpg'
 const payload={sessionId:life.sessionId,objectPath,objectPathHash:createHash('sha256').update(objectPath).digest('hex')},key=randomUUID()
 const call=(action,payload,{key:commandKey=randomUUID(),error,overrides={},role='authenticated',jwtActor=actor,signerActor=actor,aal='aal2',args:given,setupSql=''}={})=>{
  const args={...(given??signedAdminCommandArguments(action,signerActor,commandKey,payload)),...overrides},rpc=action==='intake_evidence_cleanup_retry'?'claim_admin_product_intake_evidence_cleanup_v1':action==='intake_evidence_cleanup_complete'?'complete_admin_product_intake_evidence_cleanup_v1':'record_admin_product_intake_evidence_cleanup_v1'
  if(setupSql&&!error)throw Error('CLEANUP_FIXTURE_REQUIRES_ROLLBACK_REFUSAL')
  const sql=setupSql+`select set_config('request.jwt.claim.sub',${q(jwtActor??'')},false);select set_config('request.jwt.claims',${q(JSON.stringify({aal}))},false);set role ${role};select public.${rpc}(${['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'].map(k=>args[k]===null?'NULL':q(args[k])).join(',')})::text;`
  const c={action,key:commandKey,payload,args,role,jwtActor,signerActor,aal,sql,before:rows()};report.commands.push(c)
  try{c.result=JSON.parse(value(sql))}catch(e){c.error=e.message}
  c.after=rows()
  if(error){check(action+' refuses '+error+' with all-table rollback',c.error?.includes(error)&&same(c.before,c.after));if(!c.error?.includes(error))throw Error('Cleanup refusal mismatch: '+c.error)}
  else{
   check(action+' succeeds',!c.error&&!!c.result);if(c.error)throw Error(c.error)
   check(action+' preserves every table outside own ledger and nonce',Object.keys(c.before).filter(t=>![ledger,nonces].includes(t)).every(t=>same(c.before[t],c.after[t])))
   const bn=c.before[nonces],an=c.after[nonces],added=an.filter(n=>!bn.some(b=>same(b,n))),n=added[0]
   check(action+' consumes exactly own signed nonce with only expired pruning',added.length===1&&n.actor_id===actor&&n.action===action&&n.nonce===args.p_nonce&&Date.parse(n.expires_at)-Date.parse(n.used_at)===600000&&bn.every(b=>an.some(a=>same(a,b))||Date.parse(b.expires_at)<=Date.parse(n.used_at)))
   check(action+' retains all preexisting unrelated cleanup rows',c.before[ledger].filter(r=>r.id!==report.cleanupId).every(r=>c.after[ledger].some(a=>same(a,r))))
  }
  return c
 }
 try{
  sync(buildIntakeRestoredStorageGuard({marker,dataDirectory}));report.beforeRows=rows();report.beforeFunctions=functions();report.beforeSchema=schema()
  const old=report.beforeFunctions.find(f=>f.signature===signature);if(!old)throw Error('CLEANUP_VERIFIER_MISSING')
  let sql
  if(!beforeFix){
   sql=source('supabase/migrations/20261004014500_intake_cleanup_null_inputs.sql');fs.writeFileSync(path.join(evidence,'cleanup-null-inputs.sql'),sql);report.sqlSha256=createHash('sha256').update(sql).digest('hex')
   for(const [name,drift] of [['body',old.definition.replace(/AS \$function\$/,'AS $function$\n-- Unregistered cleanup drift')],['acl',`grant execute on function ${signature} to authenticated;`],['metadata',`alter function ${signature} set search_path=public;`],['strict',`alter function ${signature} strict;`]]){
    sync(drift);const d={name,beforeRows:rows(),beforeFunctions:functions(),beforeSchema:schema()};(report.drifts??=[]).push(d)
    try{sync(sql)}catch(e){d.error=e.message}d.afterRows=rows();d.afterFunctions=functions();d.afterSchema=schema()
    check('cleanup installer refuses '+name+' drift with complete rollback',d.error?.includes('K2_INTAKE_CLEANUP_FUNCTION_DRIFT')&&same(d.beforeRows,d.afterRows)&&same(d.beforeFunctions,d.afterFunctions)&&same(d.beforeSchema,d.afterSchema))
    sync(old.definition);if(name==='acl')sync(`revoke execute on function ${signature} from authenticated;`)
   }
   sync(sql);report.afterRows=rows();report.afterFunctions=functions();report.afterSchema=schema()
   check('cleanup correction changes only target body with complete metadata/ACL and rows/schema retained',same(report.beforeRows,report.afterRows)&&same(report.beforeSchema,report.afterSchema)&&report.beforeFunctions.length===report.afterFunctions.length&&report.beforeFunctions.every(b=>{const a=report.afterFunctions.find(f=>f.signature===b.signature);return a&&(b.signature===signature?same(a.catalog,b.catalog)&&a.definition.includes('p_action is null or p_timestamp is null or p_nonce is null'):same(a,b))}))
   sync(sql);report.replayRows=rows();report.replayFunctions=functions();report.replaySchema=schema()
   check('cleanup migration replay retains exact full rows/schema/functions',same(report.afterRows,report.replayRows)&&same(report.afterFunctions,report.replayFunctions)&&same(report.afterSchema,report.replaySchema))
  }
  for(const input of ['p_timestamp','p_signature','p_action','p_nonce','p_idempotency_key','p_payload_text'])call('intake_evidence_cleanup_pending',payload,{key,error:'K2_INTAKE_CLEANUP_REQUEST_INVALID',overrides:{[input]:null,p_signature:input==='p_signature'?null:'0'.repeat(64)}})
  call('intake_evidence_cleanup_pending',payload,{key,error:'K2_ADMIN_SIGNATURE_INVALID',overrides:{p_signature:'0'.repeat(64)}})
  call('intake_evidence_cleanup_pending',payload,{key,error:'K2_ADMIN_SIGNATURE_INVALID',signerActor:randomUUID()})
  call('intake_evidence_cleanup_pending',payload,{key,error:'K2_INTAKE_CLEANUP_REQUEST_INVALID',overrides:{p_signature:'invalid'}})
  call('intake_evidence_cleanup_pending',payload,{key,error:'K2_ADMIN_SIGNATURE_EXPIRED',overrides:{p_timestamp:Math.floor(Date.now()/1000)-600}})
  call('intake_evidence_cleanup_pending',payload,{key,error:'K2_INTAKE_CLEANUP_REQUEST_INVALID',overrides:{p_payload_text:'x'.repeat(4097)}})
  call('intake_evidence_cleanup_pending',payload,{key,error:'K2_ADMIN_AAL2_REQUIRED',aal:'aal1'})
  call('intake_evidence_cleanup_pending',payload,{key,error:'K2_ADMIN_ACCESS_REQUIRED',jwtActor:null})
  const outsider=randomUUID(),otherStaff=randomUUID(),otherSetup=`begin;insert into auth.users(id) values(${q(otherStaff)});insert into public.user_profiles(id,role) values(${q(otherStaff)},'Staff') on conflict(id) do update set role=excluded.role;`
  report.ownershipActors={outsider,otherStaff}
  call('intake_evidence_cleanup_pending',payload,{key,error:'K2_ADMIN_ACCESS_REQUIRED',jwtActor:outsider,signerActor:outsider,setupSql:`begin;insert into auth.users(id) values(${q(outsider)});`})
  call('intake_evidence_cleanup_pending',payload,{key,error:'permission denied',role:'anon'})
  const pending=call('intake_evidence_cleanup_pending',payload,{key});report.cleanupId=pending.result.cleanupId
  const event=pending.after[ledger].find(r=>r.id===report.cleanupId)
  check('pending creates exactly one attributable own row and opaque result',pending.after[ledger].length===pending.before[ledger].length+1&&event.actor_id===actor&&event.session_id===life.sessionId&&event.registration_request_id===key&&event.object_path===objectPath&&event.object_path_hash===payload.objectPathHash&&event.status==='pending'&&event.attempt_count===0&&same(pending.result,{status:'pending',cleanupId:report.cleanupId}))
  call('intake_evidence_cleanup_pending',payload,{key,args:pending.args,error:'K2_INTAKE_CLEANUP_REQUEST_REPLAYED'})
  const retry=call('intake_evidence_cleanup_pending',payload,{key});check('fresh signed pending retry retains exact ledger and result',same(pending.result,retry.result)&&same(retry.before[ledger],retry.after[ledger]))
  const changedPath=objectPath.replace('.jpg','-other.jpg'),changed={...payload,objectPath:changedPath,objectPathHash:createHash('sha256').update(changedPath).digest('hex')}
  call('intake_evidence_cleanup_pending',changed,{key,error:'K2_INTAKE_CLEANUP_IDEMPOTENCY_CONFLICT'})
  const wrongPath=randomUUID()+'/'+life.sessionId+'/wrong-actor.jpg',missingSession=randomUUID(),missingPath=actor+'/'+missingSession+'/missing-session.jpg'
  call('intake_evidence_cleanup_pending',{...payload,objectPath:wrongPath,objectPathHash:createHash('sha256').update(wrongPath).digest('hex')},{error:'K2_INTAKE_CLEANUP_PAYLOAD_INVALID'})
  call('intake_evidence_cleanup_pending',{sessionId:missingSession,objectPath:missingPath,objectPathHash:createHash('sha256').update(missingPath).digest('hex')},{error:'K2_INTAKE_CLEANUP_PAYLOAD_INVALID'})
  const otherPath=otherStaff+'/'+life.sessionId+'/other-staff.jpg'
  call('intake_evidence_cleanup_pending',{...payload,objectPath:otherPath,objectPathHash:createHash('sha256').update(otherPath).digest('hex')},{jwtActor:otherStaff,signerActor:otherStaff,setupSql:otherSetup,error:'K2_INTAKE_CLEANUP_PAYLOAD_INVALID'})
  call('intake_evidence_cleanup_retry',{cleanupId:report.cleanupId},{jwtActor:otherStaff,signerActor:otherStaff,setupSql:otherSetup,error:'K2_INTAKE_CLEANUP_NOT_FOUND'})
  call('intake_evidence_cleanup_complete',{cleanupId:report.cleanupId,objectPathHash:payload.objectPathHash},{jwtActor:otherStaff,signerActor:otherStaff,setupSql:otherSetup,error:'K2_INTAKE_CLEANUP_NOT_FOUND'})
  const claim=call('intake_evidence_cleanup_retry',{cleanupId:report.cleanupId}),claimed=claim.after[ledger].find(r=>r.id===report.cleanupId)
  check('claim returns exact private path/hash and increments only own attempt metadata',same(claim.result,{status:'pending',cleanupId:report.cleanupId,objectPath,objectPathHash:payload.objectPathHash})&&claimed.attempt_count===1&&Date.parse(claimed.last_attempt_at)>=Date.parse(event.created_at)&&same({...claimed,attempt_count:0,last_attempt_at:null,updated_at:event.updated_at},event))
  call('intake_evidence_cleanup_retry',{cleanupId:report.cleanupId},{args:claim.args,error:'K2_INTAKE_CLEANUP_REQUEST_REPLAYED'})
  call('intake_evidence_cleanup_retry',{cleanupId:report.cleanupId},{overrides:{p_timestamp:null,p_signature:'0'.repeat(64)},error:'K2_INTAKE_CLEANUP_REQUEST_INVALID'})
  call('intake_evidence_cleanup_retry',{cleanupId:randomUUID()},{error:'K2_INTAKE_CLEANUP_NOT_FOUND'})
  call('intake_evidence_cleanup_retry',{cleanupId:report.cleanupId},{setupSql:`begin;update ${ledger} set attempt_count=10 where id=${q(report.cleanupId)};`,error:'K2_INTAKE_CLEANUP_ATTEMPTS_EXHAUSTED'})
  call('intake_evidence_cleanup_complete',{cleanupId:report.cleanupId,objectPathHash:'0'.repeat(64)},{error:'K2_INTAKE_CLEANUP_NOT_FOUND'})
  call('intake_evidence_cleanup_complete',{cleanupId:report.cleanupId,objectPathHash:payload.objectPathHash},{overrides:{p_timestamp:null,p_signature:'0'.repeat(64)},error:'K2_INTAKE_CLEANUP_REQUEST_INVALID'})
  const completePayload={cleanupId:report.cleanupId,objectPathHash:payload.objectPathHash},complete=call('intake_evidence_cleanup_complete',completePayload),completed=complete.after[ledger].find(r=>r.id===report.cleanupId)
  check('metadata completion retains path/attempt/provenance and records completion time',same(complete.result,{status:'completed',cleanupId:report.cleanupId})&&completed.status==='completed'&&Number.isFinite(Date.parse(completed.completed_at))&&same({...completed,status:claimed.status,completed_at:null,updated_at:claimed.updated_at},claimed))
  call('intake_evidence_cleanup_complete',completePayload,{args:complete.args,error:'K2_INTAKE_CLEANUP_REQUEST_REPLAYED'})
  const doneClaim=call('intake_evidence_cleanup_retry',{cleanupId:report.cleanupId});check('completed claim exposes no private path and retains exact ledger',same(doneClaim.result,complete.result)&&same(doneClaim.before[ledger],doneClaim.after[ledger]))
  const done=call('intake_evidence_cleanup_complete',completePayload),doneEvent=done.after[ledger].find(r=>r.id===report.cleanupId)
  check('fresh signed completion retry retains completion time and all fields except update time',same(done.result,complete.result)&&same({...doneEvent,updated_at:completed.updated_at},completed))
  report.finalRows=rows();report.finalFunctions=functions();report.finalSchema=schema()
  check('lifecycle retains all original business rows and exact corrected functions/schema',Object.keys(report.beforeRows).filter(t=>![ledger,nonces].includes(t)).every(t=>same(report.beforeRows[t],report.finalRows[t]))&&same(report.afterFunctions,report.finalFunctions)&&same(report.beforeSchema,report.finalSchema))
  if(sql){
   const wrappers=['record','claim','complete'].map(n=>'public.'+n+'_admin_product_intake_evidence_cleanup_v1(text,bigint,uuid,uuid,text,text)'),deactivate='begin;\n'+wrappers.map(s=>'revoke execute on function '+s+' from public,anon,authenticated;').join('\n')+'\ncommit;',reactivate='begin;\n'+wrappers.map(s=>'grant execute on function '+s+' to authenticated;').join('\n')+'\ncommit;'
   fs.writeFileSync(path.join(evidence,'cleanup-local-deactivate.sql'),deactivate+'\n');fs.writeFileSync(path.join(evidence,'cleanup-local-reactivate.sql'),reactivate+'\n');sync(deactivate);report.deactivatedRows=rows();report.deactivatedFunctions=functions();report.deactivatedSchema=schema()
   report.deactivatedPrivileges=JSON.parse(value(`select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'anon',has_function_privilege('anon',p.oid,'execute'),'authenticated',has_function_privilege('authenticated',p.oid,'execute')) order by p.oid)::text from pg_proc p where p.oid in (${[signature,...wrappers].map(s=>q(s)+'::regprocedure').join(',')});`))
   check('deactivation retains populated rows/schema/private guard and closes only public wrapper ACLs',same(report.finalRows,report.deactivatedRows)&&same(report.finalSchema,report.deactivatedSchema)&&report.deactivatedPrivileges.length===4&&report.deactivatedPrivileges.every(p=>!p.anon&&!p.authenticated)&&report.finalFunctions.length===report.deactivatedFunctions.length&&report.finalFunctions.every(b=>{const a=report.deactivatedFunctions.find(f=>f.signature===b.signature);return a&&(wrappers.includes(b.signature.startsWith('public.')?b.signature:'public.'+b.signature)?same({...a,catalog:{...a.catalog,proacl:b.catalog.proacl}},b):same(a,b))}))
   call('intake_evidence_cleanup_pending',payload,{key,error:'permission denied'})
   sync(sql);sync(reactivate);report.recoveredRows=rows();report.recoveredFunctions=functions();report.recoveredSchema=schema()
   check('roll-forward retains populated rows/schema and exact corrected contracts',same(report.finalRows,report.recoveredRows)&&same(report.finalFunctions,report.recoveredFunctions)&&same(report.finalSchema,report.recoveredSchema))
  }
 }finally{write()}
}
