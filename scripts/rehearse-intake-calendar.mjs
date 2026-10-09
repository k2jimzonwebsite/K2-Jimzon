// IDEA-20261003-06: parent UUID-owned clone only; whole body-only calendar correction.
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {intakeSchemaCaptureSql,buildIntakeRestoredStorageGuard} from './rehearse-intake-foundation.mjs'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
export const intakeCalendarWitnessSha256=createHash('sha256').update(bytes).digest('hex')
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
export async function rehearseIntakeCalendar({sync,value,check,literal:q,source,evidence,marker,dataDirectory}){
 const report={idea:'IDEA-20261003-06',scope:'Local calendar body installation/replay/refusal/data-retaining recovery only',providerWrites:false},write=()=>fs.writeFileSync(path.join(evidence,'intake-calendar.json'),JSON.stringify(report,null,2)+'\n')
 fs.writeFileSync(path.join(evidence,'executed-intake-calendar.mjs'),bytes)
 const sql=source('supabase/migrations/20261003233500_intake_flight_calendar.sql');report.sqlSha256=createHash('sha256').update(sql).digest('hex');fs.writeFileSync(path.join(evidence,'intake-calendar.sql'),sql)
 const tables=JSON.parse(value("select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private','storage') and c.relkind in ('r','p');"))
 const rows=()=>JSON.parse(value(`select jsonb_object_agg(t,r)::text from (values ${tables.map(t=>`(${q(t)},(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]') from ${t} x))`).join(',')}) s(t,r);`))
 const functions=()=>JSON.parse(value("select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'bodyMd5',md5(replace(p.prosrc,chr(13),'')),'catalog',to_jsonb(p)-'prosrc') order by p.oid)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','k2_private','storage');")),schema=()=>JSON.parse(value(intakeSchemaCaptureSql)),signature='create_product_first_inventory_server(uuid,uuid,text,jsonb)'
 try{
  sync(buildIntakeRestoredStorageGuard({marker,dataDirectory}));report.beforeRows=rows();report.beforeFunctions=functions();report.beforeSchema=schema()
  const old=report.beforeFunctions.find(f=>f.signature===signature);if(!old)throw Error('INTAKE_CALENDAR_SOURCE_MISSING')
  sync(old.definition.replace(/AS \$function\$/,'AS $function$\n-- Unregistered calendar drift'))
  report.driftBeforeRows=rows();report.driftBeforeFunctions=functions();report.driftBeforeSchema=schema()
  try{sync(sql)}catch(e){report.driftError=e.message}
  report.driftAfterRows=rows();report.driftAfterFunctions=functions();report.driftAfterSchema=schema()
  check('intake calendar refuses unfamiliar body with complete row/schema/function rollback',report.driftError?.includes('K2_INTAKE_CALENDAR_FUNCTION_DRIFT')&&same(report.driftBeforeRows,report.driftAfterRows)&&same(report.driftBeforeFunctions,report.driftAfterFunctions)&&same(report.driftBeforeSchema,report.driftAfterSchema))
  sync(old.definition);sync(sql);report.afterRows=rows();report.afterFunctions=functions();report.afterSchema=schema()
  check('intake calendar changes no row or schema and only exact source body preserving metadata/ACL',same(report.beforeRows,report.afterRows)&&same(report.beforeSchema,report.afterSchema)&&report.beforeFunctions.length===report.afterFunctions.length&&report.beforeFunctions.every(b=>{const a=report.afterFunctions.find(f=>f.signature===b.signature);return a&&(b.signature===signature?same(a.catalog,b.catalog)&&a.bodyMd5==='1f8b31fa745a8ff858241f4bb8cf3a45':same(a,b))}))
  sync(sql);report.replayRows=rows();report.replayFunctions=functions();report.replaySchema=schema()
  check('intake calendar whole replay retains exact rows/schema/functions',same(report.afterRows,report.replayRows)&&same(report.afterFunctions,report.replayFunctions)&&same(report.afterSchema,report.replaySchema))
  write()
  return async()=>{
   try{
    report.beforeDeactivateRows=rows();report.beforeDeactivateFunctions=functions();report.beforeDeactivateSchema=schema()
    fs.writeFileSync(path.join(evidence,'calendar-local-deactivate.sql'),old.definition.trimEnd()+';\n');sync(old.definition)
    report.afterDeactivateRows=rows();report.afterDeactivateFunctions=functions();report.afterDeactivateSchema=schema()
    check('intake calendar local deactivation retains populated business/schema and exact old contracts',same(report.beforeDeactivateRows,report.afterDeactivateRows)&&same(report.beforeDeactivateSchema,report.afterDeactivateSchema)&&same(report.beforeFunctions,report.afterDeactivateFunctions))
    sync(sql);report.afterRecoveryRows=rows();report.afterRecoveryFunctions=functions();report.afterRecoverySchema=schema()
    check('intake calendar roll-forward retains populated rows/schema and exact corrected contracts',same(report.afterDeactivateRows,report.afterRecoveryRows)&&same(report.afterDeactivateSchema,report.afterRecoverySchema)&&same(report.beforeDeactivateFunctions,report.afterRecoveryFunctions))
   }finally{write()}
  }
 }finally{write()}
}
