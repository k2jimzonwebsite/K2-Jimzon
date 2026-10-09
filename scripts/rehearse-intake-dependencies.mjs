// IDEA-20261003-02: whole maintained dependencies on parent-owned clone only.
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {intakeSchemaCaptureSql,foundationPreservesExistingSchema,buildIntakeRestoredStorageGuard} from './rehearse-intake-foundation.mjs'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
export const intakeDependenciesWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export function extractDependencyBodies(sql){return [...sql.matchAll(/create or replace function (public|k2_private)\.([a-z_][a-z_0-9]*)\([\s\S]*?as \$\$([\s\S]*?)\$\$;/gi)].map(m=>({name:m[1]+'.'+m[2],md5:createHash('md5').update(m[3].replaceAll('\r','')).digest('hex')}))}
export function dependencyPreservesRows(before,after,allowed){
 if(!Object.entries(before).every(([t,r])=>same(r,after[t])))return false
 return Object.entries(after).filter(([t])=>!(t in before)).every(([t,r])=>{
  if(!allowed.includes(t))return false
  if(t!=='k2_private.ai_spend_control_config')return Array.isArray(r)&&r.length===0
  if(r.length!==1||!Number.isFinite(Date.parse(r[0].updated_at)))return false
  const {updated_at,...config}=r[0]
  const expected={config_key:'default',paid_path_enabled:false,provider_model_snapshot:null,per_product_usd_micros:null,per_session_usd_micros:null,monthly_usd_micros:null,content_confirmation_required:true,image_confirmation_required:true,manual_fallback_required:true,version:1,updated_by:null}
  return Object.keys(config).length===Object.keys(expected).length&&Object.entries(expected).every(([k,v])=>config[k]===v)
 })
}
export async function rehearseIntakeDependencies({sync,value,check,literal:quote,source,evidence,marker,dataDirectory}){
 const report={idea:'IDEA-20261003-02',providerWrites:false,scope:'Whole maintained intake dependencies on UUID-owned restore; disabled AI, no provider calls; not full lifecycle/cold installer/live acceptance',steps:[]},write=()=>fs.writeFileSync(path.join(evidence,'intake-dependencies.json'),JSON.stringify(report,null,2)+'\n')
 const tables=()=>JSON.parse(value("select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private','storage') and c.relkind in ('r','p');"))
 const rows=()=>JSON.parse(value(`select jsonb_object_agg(table_name,records)::text from (values ${tables().map(t=>`(${quote(t)},(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]') from ${t} x))`).join(',')}) s(table_name,records);`))
 const functions=()=>JSON.parse(value("select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'bodyMd5',md5(replace(p.prosrc,chr(13),'')),'catalog',to_jsonb(p)-'prosrc') order by p.oid)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','k2_private','storage');"))
 const schema=()=>JSON.parse(value(intakeSchemaCaptureSql)),enums=()=>JSON.parse(value("select jsonb_agg(jsonb_build_object('name',format('%I.%I',n.nspname,t.typname),'labels',(select jsonb_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid=t.oid)) order by n.nspname,t.typname)::text from pg_type t join pg_namespace n on n.oid=t.typnamespace where t.typtype='e' and n.nspname in ('public','k2_private','storage');"))
 const steps=[['cleanup','20260824_map018_intake_evidence_cleanup_boundary.sql',['k2_private.product_intake_evidence_cleanup_events']],['master','20260822_admin_product_master_boundary.sql',['k2_private.product_master_events']],['media','20260822_admin_product_media_boundary.sql',['k2_private.product_media_events','k2_private.product_media_orphan_events']],['spend','20260830_paid_ai_spend_controls.sql',['k2_private.ai_spend_control_config','k2_private.ai_spend_control_events']],['signer','20261001065252_admin_signing_null_inputs.sql',[]],['jobs','20260906_automatic_intake_jobs.sql',['k2_private.intake_ai_jobs']]]
 fs.writeFileSync(path.join(evidence,'executed-intake-dependencies.mjs'),bytes)
 try{
  sync(buildIntakeRestoredStorageGuard({marker,dataDirectory}))
  for(const [name,file,allowedTables] of steps){
   const sql=source('supabase/migrations/'+file),bodies=extractDependencyBodies(sql),s={name,file,allowedTables,sha256:createHash('sha256').update(sql).digest('hex'),expectedBodies:bodies,beforeRows:rows(),beforeFunctions:functions(),beforeSchema:schema(),beforeEnums:enums()};report.steps.push(s)
   fs.writeFileSync(path.join(evidence,'dependency-'+name+'.sql'),sql);sync(sql);s.afterRows=rows();s.afterFunctions=functions();s.afterSchema=schema();s.afterEnums=enums()
   check('intake dependency '+name+' preserves full existing rows and only declared empty/disabled new records',dependencyPreservesRows(s.beforeRows,s.afterRows,allowedTables))
   check('intake dependency '+name+' preserves all existing schema/RLS/ACL and adds only declared tables',allowedTables.every(t=>s.afterSchema.some(a=>a.table===t))&&s.afterSchema.filter(t=>!s.beforeSchema.some(b=>b.table===t.table)).every(t=>allowedTables.includes(t.table))&&foundationPreservesExistingSchema(s.beforeSchema,s.afterSchema.filter(t=>s.beforeSchema.some(b=>b.table===t.table)),name))
   const qualified=f=>f.signature.startsWith('k2_private.')?'k2_private.'+f.catalog.proname:'public.'+f.catalog.proname,allowed=bodies.map(b=>b.name)
   if(name==='master')allowed.push('public.delete_products_with_pin_v2')
   if(name==='signer')allowed.push('k2_private.verify_admin_bff_request')
   check('intake dependency '+name+' only named function contracts change and none disappear',s.beforeFunctions.every(b=>s.afterFunctions.some(a=>a.signature===b.signature))&&s.afterFunctions.filter(a=>!same(a,s.beforeFunctions.find(b=>b.signature===a.signature))).every(a=>allowed.includes(qualified(a))))
   check('intake dependency '+name+' installs exact unique whole candidate bodies',bodies.every(b=>{const matches=s.afterFunctions.filter(f=>qualified(f)===b.name);return matches.length===1&&matches[0].bodyMd5===b.md5}))
   if(name==='master'){
    const before=s.beforeFunctions.find(f=>f.catalog.proname==='delete_products_with_pin_v2'),after=s.afterFunctions.find(f=>f.signature===before?.signature),withoutAcl=f=>({...f,catalog:{...f.catalog,proacl:null}})
    check('product master closes legacy delete permission without changing its contract',!!before&&!!after&&same(withoutAcl(before),withoutAcl(after)))
   }
   const enumView=e=>e.map(t=>name==='spend'&&t.name==='public.user_role'?{...t,labels:t.labels.filter(l=>l!=='SuperAdmin')}:t)
   check('intake dependency '+name+' preserves all enum labels except declared SuperAdmin addition',same(enumView(s.beforeEnums),enumView(s.afterEnums))&&(name!=='spend'||s.afterEnums.find(t=>t.name==='public.user_role')?.labels.includes('SuperAdmin')))
   if(name==='spend'){
    const before=s.beforeFunctions.find(f=>f.signature.startsWith('k2_private.verify_admin_bff_request(')),after=s.afterFunctions.find(f=>f.signature===before.signature),actions=f=>[...f.definition.match(/p_action not in \(([\s\S]*?)\)\s*then/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1])
    s.signerActions={before:actions(before),after:actions(after)}
    check('spend installation preserves signer metadata and every current action',same(before.catalog,after.catalog)&&s.signerActions.before.every(a=>s.signerActions.after.includes(a)))
   }
   sync(sql);s.replayRows=rows();s.replayFunctions=functions();s.replaySchema=schema();s.replayEnums=enums()
   check('intake dependency '+name+' exact replay rows/functions/enums/schema',same(s.afterRows,s.replayRows)&&same(s.afterFunctions,s.replayFunctions)&&same(s.afterEnums,s.replayEnums)&&foundationPreservesExistingSchema(s.afterSchema,s.replaySchema,'replay'))
  }
  report.finalRows=rows();report.finalFunctions=functions();report.finalSchema=schema();report.finalEnums=enums()
  const signed=report.steps.flatMap(s=>s.expectedBodies).filter(b=>b.name.startsWith('public.')),privateNames=report.steps.flatMap(s=>s.expectedBodies).filter(b=>b.name.startsWith('k2_private.'))
  report.privileges=JSON.parse(value(`select jsonb_build_object('functions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'anon',has_function_privilege('anon',p.oid,'execute'),'authenticated',has_function_privilege('authenticated',p.oid,'execute')) order by p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname||'.'||p.proname) in (${[...signed,...privateNames].map(b=>quote(b.name)).join(',')})),'tables',(select jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'anon',has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE'),'authenticated',has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE')) order by c.oid) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname||'.'||c.relname in (${steps.flatMap(s=>s[2]).map(quote).join(',')})))::text;`))
  check('all new public boundaries callable by authenticated only and private helpers/tables closed',report.privileges.functions.every(f=>!f.anon&&f.authenticated===!f.signature.startsWith('k2_private.'))&&report.privileges.tables.every(t=>!t.anon&&!t.authenticated))
  const signer=report.finalFunctions.find(f=>f.signature.startsWith('k2_private.verify_admin_bff_request('))
  check('current signer retains explicit null guard and catalog size/rate/nonce controls',signer.definition.includes('p_action is null or p_timestamp is null or p_nonce is null')&&signer.definition.includes('p_idempotency_key is null or p_payload_text is null or p_signature is null')&&signer.definition.includes('1048576')&&signer.definition.includes('16384')&&signer.definition.includes('v_actor_hits > 360')&&signer.definition.includes('v_global_hits > 6000')&&signer.definition.includes("interval '10 minutes'"))
 }finally{write()}
}
