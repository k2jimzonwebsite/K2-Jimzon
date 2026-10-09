// IDEA-20261003-05. Guarded full cost migration; parent-owned restore only.
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {intakeSchemaCaptureSql,foundationPreservesExistingSchema,buildIntakeRestoredStorageGuard} from './rehearse-intake-foundation.mjs'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
export const intakeFlightCostWitnessSha256=createHash('sha256').update(bytes).digest('hex')
const canonical=x=>JSON.stringify(x,(_k,v)=>v&&!Array.isArray(v)&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v),same=(a,b)=>canonical(a)===canonical(b)
export function costPreservesRows(before,after){
 if(!same(Object.keys(before).sort(),Object.keys(after).sort()))return false
 return Object.entries(before).every(([t,rows])=>{
  if(!Array.isArray(after[t]))return false
  let current=after[t]
  if(t==='public.consignment_items'&&rows.every(r=>!Object.hasOwn(r,'unit_cost'))){
   if(!current.every(r=>Object.hasOwn(r,'unit_cost')&&r.unit_cost===null))return false
   current=current.map(({unit_cost,...r})=>r)
  }
  return same(rows,current)
 })
}
const signatures=['create_product_first_inventory_server(uuid,uuid,text,jsonb)','k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)'],bodies=['39dbc55e65ffb4bcdcb8b8f34955538b','0df85cb01249dface47ded9d27f83212']
export async function rehearseIntakeFlightCost({sync,value,check,literal:q,source,evidence,marker,dataDirectory}){
 const report={idea:'IDEA-20261003-05',scope:'Local exact whole cost migration/schema/row/function/ACL replay and data-retaining source deactivation; no provider/full installer acceptance',providerWrites:false},write=()=>fs.writeFileSync(path.join(evidence,'intake-flight-cost.json'),JSON.stringify(report,null,2)+'\n')
 fs.writeFileSync(path.join(evidence,'executed-intake-flight-cost.mjs'),bytes)
 const sql=source('supabase/migrations/20261003221500_intake_flight_cost_propagation.sql');report.sqlSha256=createHash('sha256').update(sql).digest('hex');fs.writeFileSync(path.join(evidence,'intake-flight-cost.sql'),sql)
 const tables=JSON.parse(value("select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private','storage') and c.relkind in ('r','p');"))
 const rows=()=>JSON.parse(value(`select jsonb_object_agg(t,r)::text from (values ${tables.map(t=>`(${q(t)},(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]') from ${t} x))`).join(',')}) s(t,r);`))
 const functions=()=>JSON.parse(value("select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'bodyMd5',md5(replace(p.prosrc,chr(13),'')),'catalog',to_jsonb(p)-'prosrc') order by p.oid)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','k2_private','storage');"))
 const schema=()=>JSON.parse(value(intakeSchemaCaptureSql)),columnAcl=()=>JSON.parse(value("select jsonb_agg(jsonb_build_object('table',format('%I.%I',n.nspname,c.relname),'column',a.attname,'acl',a.attacl) order by n.nspname,c.relname,a.attnum)::text from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private','storage') and c.relkind in ('r','p') and a.attnum>0 and not a.attisdropped;"))
 const preservesSchema=(before,after)=>{
  const b=before.find(t=>t.table==='public.consignment_items'),a=after.find(t=>t.table==='public.consignment_items'),had=b.columns.some(c=>c.name==='unit_cost')
  if(!had){const col=a.columns.filter(c=>c.name==='unit_cost');if(col.length!==1||col[0].type!=='numeric'||col[0].default!==null||col[0].notNull||col[0].generated!=='')return false}
  if(!a.constraints.some(c=>c.name==='consignment_items_unit_cost_check'))return false
  return foundationPreservesExistingSchema(before,after.map(t=>t.table!=='public.consignment_items'?t:{...t,columns:had?t.columns:t.columns.filter(c=>c.name!=='unit_cost'),constraints:t.constraints.filter(c=>c.name!=='consignment_items_unit_cost_check'||b.constraints.some(old=>old.name===c.name))}),'cost')
 }
 try{
  sync(buildIntakeRestoredStorageGuard({marker,dataDirectory}))
  report.beforeRows=rows();report.beforeFunctions=functions();report.beforeSchema=schema();report.beforeColumnAcl=columnAcl()
  // Native malformed-body refusal: comment-only drift on the expected intake body.
  const original=report.beforeFunctions.find(f=>f.signature===signatures[0]),drift=original.definition.replace(/AS \$function\$/,'AS $function$\n-- Unregistered cost installation witness drift')
  if(drift===original.definition)throw Error('COST_DRIFT_INJECTION_UNAVAILABLE')
  sync(drift);report.driftBeforeRows=rows();report.driftBeforeFunctions=functions();report.driftBeforeSchema=schema()
  try{sync(sql)}catch(e){report.driftError=e.message}
  report.driftAfterRows=rows();report.driftAfterFunctions=functions();report.driftAfterSchema=schema()
  check('cost migration refuses unfamiliar function before any lasting schema/data/contract write',report.driftError?.includes('K2_FLIGHT_COST_FUNCTION_DRIFT')&&same(report.driftBeforeRows,report.driftAfterRows)&&same(report.driftBeforeFunctions,report.driftAfterFunctions)&&foundationPreservesExistingSchema(report.driftBeforeSchema,report.driftAfterSchema,'refusal'))
  sync(original.definition);check('cost drift recovery restores exact original function catalogs',same(report.beforeFunctions,functions()))
  sync(sql);report.afterRows=rows();report.afterFunctions=functions();report.afterSchema=schema();report.afterColumnAcl=columnAcl()
  check('cost migration retains all old rows with only declared NULL cost initialization',costPreservesRows(report.beforeRows,report.afterRows))
  check('cost migration retains all schema/owner/table ACL/RLS/policies/triggers/indexes except declared cost column/check',preservesSchema(report.beforeSchema,report.afterSchema))
  check('cost migration retains all old column ACLs and new cost has no explicit grant',report.beforeColumnAcl.every(b=>report.afterColumnAcl.some(a=>same(a,b)))&&report.afterColumnAcl.filter(a=>!report.beforeColumnAcl.some(b=>same(a,b))).every(a=>a.table==='public.consignment_items'&&a.column==='unit_cost'&&a.acl===null))
  check('cost migration changes only two exact body pins and preserves all metadata/permissions',report.beforeFunctions.length===report.afterFunctions.length&&report.beforeFunctions.every(b=>{const a=report.afterFunctions.find(f=>f.signature===b.signature);return !!a&&(signatures.includes(b.signature)?same(a.catalog,b.catalog)&&a.bodyMd5===bodies[signatures.indexOf(b.signature)]:same(a,b))}))
  // Reject numeric precision/scale drift before a reviewed fractional cost can round.
  sync('alter table public.consignment_items alter column unit_cost type numeric(18,2);')
  report.typmodBeforeRows=rows();report.typmodBeforeFunctions=functions();report.typmodBeforeSchema=schema()
  try{sync(sql)}catch(e){report.typmodError=e.message}
  report.typmodAfterRows=rows();report.typmodAfterFunctions=functions();report.typmodAfterSchema=schema()
  check('cost migration refuses constrained numeric precision/scale with full rollback',report.typmodError?.includes('K2_FLIGHT_COST_COLUMN_DRIFT')&&same(report.typmodBeforeRows,report.typmodAfterRows)&&same(report.typmodBeforeFunctions,report.typmodAfterFunctions)&&foundationPreservesExistingSchema(report.typmodBeforeSchema,report.typmodAfterSchema,'typmod-refusal'))
  sync('alter table public.consignment_items alter column unit_cost type numeric;')
  check('cost precision/scale drift recovery restores exact installed rows/functions/schema',same(report.afterRows,rows())&&same(report.afterFunctions,functions())&&foundationPreservesExistingSchema(report.afterSchema,schema(),'typmod-recovery'))
  sync(sql);report.replayRows=rows();report.replayFunctions=functions();report.replaySchema=schema();report.replayColumnAcl=columnAcl()
  check('cost immediate replay retains full exact rows/functions/column ACL and schema',same(report.afterRows,report.replayRows)&&same(report.afterFunctions,report.replayFunctions)&&same(report.afterColumnAcl,report.replayColumnAcl)&&foundationPreservesExistingSchema(report.afterSchema,report.replaySchema,'replay'))
  write()
  return async()=>{
   try{
   report.beforeDeactivateRows=rows();report.beforeDeactivateFunctions=functions();report.beforeDeactivateSchema=schema()
   const deactivate=report.beforeFunctions.filter(f=>signatures.includes(f.signature)).map(f=>f.definition.trimEnd()+';').join('\n')
   fs.writeFileSync(path.join(evidence,'cost-local-deactivate.sql'),deactivate);sync(deactivate)
   report.afterDeactivateRows=rows();report.afterDeactivateFunctions=functions();report.afterDeactivateSchema=schema()
   check('local cost deactivation retains every populated column/lot/audit row and all schema',same(report.beforeDeactivateRows,report.afterDeactivateRows)&&foundationPreservesExistingSchema(report.beforeDeactivateSchema,report.afterDeactivateSchema,'deactivate'))
   check('local deactivation restores exact historical function metadata/body catalogs',same(report.afterDeactivateFunctions,report.beforeFunctions))
   sync(sql);report.afterRecoveryRows=rows();report.afterRecoveryFunctions=functions();report.afterRecoverySchema=schema()
   check('cost roll-forward retains populated rows/schema and exact corrected functions',same(report.afterDeactivateRows,report.afterRecoveryRows)&&same(report.beforeDeactivateFunctions,report.afterRecoveryFunctions)&&foundationPreservesExistingSchema(report.afterDeactivateSchema,report.afterRecoverySchema,'recovery'))
   }finally{write()}
  }
 }finally{write()}
}
