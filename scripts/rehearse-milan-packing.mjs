import fs from 'node:fs'
import path from 'node:path'
import { spawnSync, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
const root=process.cwd(), bin=process.env.K2_LOCAL_PG_BIN||path.join(root,'.tools/postgresql-17.11/runtime/pgsql/bin')
const owned=path.join(root,'.tools','milan-packing-'+randomUUID()),data=path.join(owned,'data')
fs.mkdirSync(owned,{recursive:true})
const env={...process.env,PGHOST:'127.0.0.1',PGPORT:'54379',PGUSER:'postgres',PGDATABASE:'k2_milan_packing_rehearsal'}
function run(name,args,options={}) {
 const r=spawnSync(path.join(bin,name+'.exe'),args,{cwd:root,env,encoding:'utf8',windowsHide:true,...options})
 if(r.status!==0)throw Error(name+': '+(r.stderr||r.stdout||r.error?.message))
 return r.stdout?.trim()
}
let started=false
try {
 run('initdb',['-D',data,'-U','postgres','--auth=trust','--encoding=UTF8'])
 run('pg_ctl',['-D',data,'-l',path.join(owned,'postgres.log'),'-o','-p 54379 -h 127.0.0.1','-w','start'],{stdio:'ignore'});started=true
 run('createdb',[env.PGDATABASE])
 const sql=text=>run('psql',['-X','-v','ON_ERROR_STOP=1','-At'],{input:text})
 const file=name=>sql(fs.readFileSync(name,'utf8'))
 file('supabase/tests/milan_packing_bootstrap.sql')
 const foundation=fs.readFileSync('supabase/migrations/20260812_admin_fulfillment_bff_boundary.sql','utf8')
 const verifierSource=foundation.slice(0,foundation.indexOf('create or replace function public.execute_admin_fulfillment_command_v1'))+'\ncommit;'
 sql(verifierSource)
 sql("insert into k2_private.admin_bff_secrets(singleton,request_secret)values(true,decode(repeat('2c',32),'hex'));")
 file('supabase/migrations/20260812_admin_consignments_bff_boundary.sql')
 const current=JSON.parse(fs.readFileSync('docs/acceptance/milan-packing-discovery-20261029/current-function-definitions.json','utf8'))
 sql(`create table k2_private.admin_request_rate_buckets(scope text,subject text,bucket_start timestamptz,hit_count integer,primary key(scope,subject,bucket_start));
 alter table k2_private.admin_request_nonces add column verified_backend_pid integer,add column verified_transaction_id xid8;`)
 for(const captured of current)sql(captured.definition)
 const before=JSON.parse(fs.readFileSync('docs/acceptance/milan-packing-release-20261029/live-before.json','utf8'))
 sql(before.functions.find(row=>row.identity==='k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)').definition)
 if(!process.argv.includes('--red'))file('supabase/migrations/20261029_milan_packing_workflow.sql')
 file('supabase/tests/milan_packing_workflow.sql')
 if(!process.argv.includes('--red')) {
  if(!process.argv.includes('--red-unknown-lot'))file('supabase/migrations/20261030_italy_box_scan_without_lot.sql')
  file('supabase/tests/italy_box_scan_without_lot.sql')
 }
 if(!process.argv.includes('--red')) {
  const actor="select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);select set_config('request.jwt.claim.role','Admin',false);select set_config('request.jwt.claims','{\"aal\":\"aal2\"}',false);"
  const shipment='20000000-0000-4000-8000-000000000002'
  sql(`insert into public.consignments(id,manifest_code)values('${shipment}','SYNTHETIC-RACE');`)
  const count={operation:'count',consignmentId:shipment,itemId:null,code:'8001234567890',boxCode:'B',batchCode:'L',bestBeforeDate:'2027-10-01',delta:1,source:'barcode'}
  sql(actor+`select public.test_pack('${JSON.stringify(count)}'::jsonb);`)
  const revision=Number(sql(`select packing_revision from public.consignments where id='${shipment}'`))
  const launch=text=>{
   const child=spawn(path.join(bin,'psql.exe'),['-X','-v','ON_ERROR_STOP=1','-At'],{cwd:root,env,windowsHide:true})
   let output='',errors='';let ready
   const locked=new Promise(resolve=>{ready=resolve})
   child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('LOCK_HELD'))ready()})
   child.stderr.on('data',chunk=>{errors+=chunk})
   const finished=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>resolve({code,output,errors}))})
   child.stdin.end(text);return {locked,finished}
  }
  const first=launch(actor+`begin;select public.test_pack('${JSON.stringify(count)}'::jsonb);\n\\echo LOCK_HELD\nselect pg_sleep(0.5);commit;`)
  await Promise.race([first.locked,new Promise((_,reject)=>setTimeout(()=>reject(Error('Parent lock was not observed')),5000))])
  const decision={operation:'dispatch',consignmentId:shipment,packingRevision:revision,reason:'Synthetic reviewed handoff',acknowledgeVariance:true}
  const second=launch(actor+`select public.test_pack('${JSON.stringify(decision)}'::jsonb);`)
  const a=await first.finished,b=await second.finished
  if(a.code!==0||b.code===0||!b.errors.includes('K2_PACKING_REVIEW_STALE')||sql(`select status from public.consignments where id='${shipment}'`)!=='Packing_Italy')throw Error('Count versus stale dispatch race failed: '+JSON.stringify({a,b}))
  fs.writeFileSync(path.join(owned,'count-versus-dispatch.json'),JSON.stringify({scope:'Disposable minimal schema with actual existing HMAC verifier; not full provider composition',a,b},null,2))
  console.log('Native concurrent count versus stale dispatch: safe refusal.')
  const other1='20000000-0000-4000-8000-000000000003',other2='20000000-0000-4000-8000-000000000004',barcode='8001234599999'
  sql(`insert into public.consignments(id,manifest_code)values('${other1}','IDENTITY-A'),('${other2}','IDENTITY-B');`)
  const p1={...count,consignmentId:other1,code:barcode},p2={...count,consignmentId:other2,code:barcode}
  const left=launch(actor+`begin;select public.test_pack('${JSON.stringify(p1)}'::jsonb);\n\\echo LOCK_HELD\nselect pg_sleep(0.5);commit;`)
  await Promise.race([left.locked,new Promise((_,reject)=>setTimeout(()=>reject(Error('Identity lock was not observed')),5000))])
  const right=launch(actor+`select public.test_pack('${JSON.stringify(p2)}'::jsonb);`)
  const l=await left.finished,r=await right.finished
  if(l.code!==0||r.code!==0||Number(sql(`select count(*) from public.products where barcode='${barcode}'`))!==1||Number(sql(`select sum(italy_packed_qty) from public.consignment_items where consignment_id in ('${other1}','${other2}')`))!==2)throw Error('Concurrent barcode Draft identity failed: '+JSON.stringify({l,r}))
  fs.writeFileSync(path.join(owned,'concurrent-barcode.json'),JSON.stringify({l,r},null,2))
  console.log('Native concurrent unknown barcode: one canonical Draft, two independent packed units.')
 }
 console.log('Milan packing native PostgreSQL checks passed.')
} finally {
 if(started)run('pg_ctl',['-D',data,'-m','fast','-w','stop'])
 console.log('Owned rehearsal retained at '+owned+'; started process stopped.')
}
