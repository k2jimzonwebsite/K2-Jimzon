import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {createHash,randomUUID} from 'node:crypto'
const out=process.argv[2]
if(!/^docs\/evidence\/20261004-category-shelf-life\/foundation-[a-z0-9-]+$/.test(out??''))throw Error('EXCLUSIVE_ARCHIVE_REQUIRED')
fs.mkdirSync(out) // Exclusive archive; never overwrite a previous run.
fs.copyFileSync(new URL(import.meta.url),path.join(out,'executed-witness.mjs'))
const uuid=randomUUID(),database='k2_category_foundation_'+uuid.replaceAll('-',''),template='k2_current_restore_20260929'
const dataDirectory='C:/Users/jerze/K2 JImzon/.tools/current-restore-20260929-pg-data'
const psql=path.resolve('.tools/postgresql-17.11/runtime/pgsql/bin/psql.exe')
const q=s=>"'"+String(s).replaceAll("'","''")+"'",sha=s=>createHash('sha256').update(s).digest('hex')
let sequence=0,created=false,marked=false
const report={idea:'IDEA-20261002-05',scope:'Private policy foundation in rollback; not installed policy, operational writers or provider acceptance',database,template,uuid,checks:[],providerWrites:false}
const sql=(db,text)=>{const file=path.resolve(out,`command-${++sequence}.sql`);fs.writeFileSync(file,text);return execFileSync(psql,['-h','127.0.0.1','-p','54388','-U','postgres','-d',db,'-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-f',file],{encoding:'utf8',maxBuffer:64*1024*1024}).trim()}
const check=(name,passed)=>{report.checks.push({name,passed:!!passed});if(!passed)throw Error(name)}
const guard=db=>{
 const actual=JSON.parse(sql(db,"select jsonb_build_object('database',current_database(),'user',current_user,'directory',current_setting('data_directory'),'port',inet_server_port(),'host',host(inet_server_addr()))::text;"))
 if(actual.database!==db||actual.user!=='postgres'||actual.directory.replaceAll('\\','/')!==dataDirectory||actual.port!==54388||actual.host!=='127.0.0.1')throw Error('OWNED_TARGET_MISMATCH')
}
const captureSql=fs.readFileSync('supabase/current_install_state_capture.sql','utf8')
const fingerprint=db=>{
 const metadata=sql(db,captureSql)
 const metadataPath=path.join(out,`capture-${sequence}-metadata.json`)
 fs.writeFileSync(metadataPath,metadata)
 const tables=JSON.parse(sql(db,"select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private','storage','auth') and c.relkind in ('r','p');"))
 const rows=sql(db,`select jsonb_object_agg(name,hash order by name)::text from (values ${tables.map(t=>`(${q(t)},(select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by to_jsonb(x)::text),'')) from ${t} x))`).join(',')}) s(name,hash);`)
 const rowsPath=path.join(out,`capture-${sequence}-rows.json`)
 fs.writeFileSync(rowsPath,rows)
 ;(report.fingerprintArchives??=[]).push({database:db,metadataPath,rowsPath,metadataSha256:sha(metadata),rowsSha256:sha(rows),tables:tables.length})
 return {metadataSha256:sha(metadata),rowsSha256:sha(rows),tables:tables.length}
}
try{
 guard('postgres');guard(template)
 report.templateBefore=fingerprint(template)
 check('fresh exact UUID clone name absent',sql('postgres',`select count(*) from pg_database where datname=${q(database)};`)==='0')
 sql('postgres',`create database ${database} with template ${template};`);created=true
 sql('postgres',`comment on database ${database} is ${q('K2 category foundation:'+uuid)};`);marked=true;guard(database)
 check('exact clone owner and shared UUID marker',sql('postgres',`select pg_get_userbyid(datdba)||'|'||shobj_description(oid,'pg_database') from pg_database where datname=${q(database)};`)==='postgres|K2 category foundation:'+uuid)
 report.cloneBefore=fingerprint(database)
 const candidatePath='supabase/prepared/category_shelf_life_resolution.sql'
 report.candidatePresent=fs.existsSync(candidatePath)
 check('private policy foundation exists before native behavior cases',report.candidatePresent)
 const candidate=fs.readFileSync(candidatePath,'utf8'),cases=fs.readFileSync('tests/category-policy-foundation.sql','utf8')
 report.sources=[{path:candidatePath,sha256:sha(candidate)},{path:'tests/category-policy-foundation.sql',sha256:sha(cases)}]
 fs.writeFileSync(path.join(out,'executed-candidate.sql'),candidate)
 fs.writeFileSync(path.join(out,'executed-cases.sql'),cases)
 const fixtureResult=JSON.parse(sql(database,'begin;set local search_path=public,k2_private;\n'+candidate+'\n'+cases+'\nrollback;'))
 report.cases=fixtureResult.cases
 report.syntheticPlan=fixtureResult.syntheticPlan
 report.cloneAfter=fingerprint(database)
 check('fixture candidate and all business changes fully rolled back',JSON.stringify(report.cloneBefore)===JSON.stringify(report.cloneAfter))
 check('all native hierarchy/history foundation cases pass',report.cases.length>=20&&report.cases.every(c=>c.passed))
}catch(error){report.error=error.message;process.exitCode=1}
finally{
 try{
  if(created){
   guard('postgres')
   const owner=sql('postgres',`select pg_get_userbyid(datdba)||'|'||coalesce(shobj_description(oid,'pg_database'),'')||'|'||(select count(*) from pg_stat_activity where datname=${q(database)}) from pg_database where datname=${q(database)};`)
   if(!marked||owner!=='postgres|K2 category foundation:'+uuid+'|0')throw Error('CLONE_DISPOSAL_REFUSED')
   sql('postgres',`drop database ${database};`)
   report.cloneRemoved=sql('postgres',`select count(*) from pg_database where datname=${q(database)};`)==='0'
  }
  report.templateAfter=fingerprint(template)
  report.templateUnchanged=JSON.stringify(report.templateBefore)===JSON.stringify(report.templateAfter)
  check('owned clone removal positively verified',!created||report.cloneRemoved===true)
  check('original template preservation positively verified',report.templateUnchanged===true)
 }catch(error){report.disposalError=error.message;process.exitCode=1}
 report.passed=report.checks.filter(c=>c.passed).length;report.failed=report.checks.filter(c=>!c.passed).length
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2))
}
