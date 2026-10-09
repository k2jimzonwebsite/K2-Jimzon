// IDEA-20261003-02. Parent-owned composed restore only; no provider calls.
import fs from 'node:fs'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {validateProductIntakeCommand} from '../server/admin-bff/product-intake.js'
import {signedAdminCommandArguments} from '../server/admin-bff/security.js'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
export const intakeLifecycleWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export function intakePreservesRows(before,after,appendTables){
 return same(Object.keys(before).sort(),Object.keys(after).sort())&&Object.entries(before).every(([t,rows])=>
  appendTables.includes(t)?rows.every(r=>after[t].some(n=>same(r,n)))&&after[t].length>=rows.length:same(rows,after[t]))
}
export async function rehearseIntakeLifecycle({value,check,literal:q,evidence,actor,publication=false}){
 const report={idea:'IDEA-20261003-02',providerWrites:false,scope:'Signed native intake through first opening balance and publication refusal; synthetic evidence metadata, no Storage API/upload or real stock acceptance',commands:[]}
 fs.writeFileSync(path.join(evidence,'executed-intake-lifecycle.mjs'),bytes)
 report.sources=['server/admin-bff/product-intake.js','server/admin-bff/security.js'].map(file=>{
  const b=fs.readFileSync(file);fs.writeFileSync(path.join(evidence,'lifecycle-'+path.basename(file)),b)
  return {file,sha256:createHash('sha256').update(b).digest('hex')}
 })
 const tables=JSON.parse(value("select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private','storage') and c.relkind in ('r','p');"))
 const rows=()=>JSON.parse(value(`select jsonb_object_agg(t,r)::text from (values ${tables.map(t=>`(${q(t)},(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]') from ${t} x))`).join(',')}) s(t,r);`))
 const functions=()=>JSON.parse(value("select jsonb_agg(jsonb_build_object('definition',pg_get_functiondef(p.oid),'catalog',to_jsonb(p)) order by p.oid)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','k2_private','storage');"))
 const controls=['k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets','k2_private.admin_command_receipts']
 const call=(action,raw,{key=randomUUID(),error,role='authenticated',validate=true,effects=[]}={})=>{
  const payload=validate?validateProductIntakeCommand(action,raw):raw,args=signedAdminCommandArguments(action,actor,key,payload)
  const sql=`select set_config('request.jwt.claim.sub',${q(actor)},false);select set_config('request.jwt.claims','{"aal":"aal2"}',false);set role ${role};select public.execute_admin_product_intake_command_v1(${['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'].map(k=>q(args[k])).join(',')})::text;`
  const c={action,key,payload,args,sql,before:rows()};report.commands.push(c)
  try{c.result=JSON.parse(value(sql))}catch(e){c.error=e.message}
  c.after=rows()
  if(error)check(action+' refuses '+error+' with exact all-table rollback',c.error?.includes(error)&&same(c.before,c.after))
  else{
   check(action+' succeeds',!c.error&&!!c.result)
   check(action+' preserves every table outside declared effects',Object.keys(c.before).filter(t=>![...controls,...effects].includes(t)).every(t=>same(c.before[t],c.after[t])))
   if(c.error)throw Error(c.error)
  }
  return c
 }
 try{
  report.before=rows();report.beforeFunctions=functions()
  if(publication){
   const brand={id:randomUUID(),name:'Synthetic reviewed brand '+randomUUID()},category={id:randomUUID(),name:'Synthetic reviewed category '+randomUUID()}
   const sql=`insert into public.brands(id,name) values(${q(brand.id)},${q(brand.name)});insert into public.categories(id,name) values(${q(category.id)},${q(category.name)});select 'null';`
   report.taxonomySeed={scope:'Owned clone lookup fixtures only; not real approved taxonomy or taxonomy-write acceptance',brand,category,sql,before:report.before}
   value(sql);report.taxonomySeed.after=rows()
   check('publication taxonomy fixtures add exactly own lookup rows and preserve all original business tables',Object.entries(report.taxonomySeed.before).every(([t,r])=>['public.brands','public.categories'].includes(t)?report.taxonomySeed.after[t].length===r.length+1&&r.every(x=>report.taxonomySeed.after[t].some(y=>same(x,y))):same(r,report.taxonomySeed.after[t])))
   report.before=report.taxonomySeed.after
  }
  const requestId=randomUUID(),create={requestId,barcode:null,scannedIdentity:'Synthetic isolated native intake acceptance'}
  const c=call('intake_session_create',create,{effects:['public.product_intake_sessions']}),sessionId=c.result.sessionId
  report.sessionId=sessionId
  const replay=call('intake_session_create',create,{key:c.key})
  check('same signed session key replays identical durable result',same(c.result,replay.result))
  call('intake_session_create',{...create,scannedIdentity:'Changed payload'},{key:c.key,error:'K2_ADMIN_IDEMPOTENCY_CONFLICT'})
  call('intake_session_step',{sessionId,step:'draft_saved',patch:{}},{error:'K2_INTAKE_STEP_INVALID'})
  const draft={sessionId,requestId,reviewedPayload:{meta:{schemaVersion:'k2.product-content.v3'},product:{name:'Isolated intake '+requestId,brand:report.taxonomySeed?.brand.name??report.before['public.brands'][0]?.name,category:report.taxonomySeed?.category.name??report.before['public.categories'][0]?.name}},fieldDecisions:publication?{name:'accepted',brand:'accepted',category:'accepted'}:{name:'accepted'}}
  call('intake_draft',draft,{error:'K2_DRAFT_REVIEW_GATE_INCOMPLETE'})
  for(const step of ['packaging_evidence','research_handoff','field_review','draft_saved'])call('intake_session_step',{sessionId,step,patch:step==='draft_saved'?{evidenceChecklist:{ingredients:true,allergens:true,storage:true,expiry:true}}:{}},{effects:['public.product_intake_sessions']})
  call('intake_draft',draft,{error:'K2_EVIDENCE_GATE_INCOMPLETE'})
  for(const slot of ['PRIMARY','BACK','BARCODE']){
   const payload={sessionId,slot,path:`${actor}/${sessionId}/${slot.toLowerCase()}-${randomUUID()}-0123456789abcdef.jpg`,fileName:'synthetic-metadata.jpg',size:1024,type:'image/jpeg',width:500,height:500,sha256:'0123456789abcdef'.repeat(4)}
   call('intake_evidence_register',payload,{validate:false,effects:['public.product_intake_sessions']})
  }
  const d=call('intake_draft',draft,{effects:['public.products','public.product_intake_sessions','public.audit_logs']})
  report.draft=d.result;const sku=d.result.sku,p=d.after['public.products'].find(x=>x.sku===sku)
  check('Draft has genuine immutable server SKU, unpublished and no physical batch',/^K2-SKU-\d{6}$/.test(sku)&&p?.status==='Draft'&&p.published===false&&p.is_human_reviewed===false&&!d.after['public.product_batches'].some(b=>b.sku===sku))
  if(publication)check('native reviewed Draft resolves exact fixture brand/category without direct product writes',p.brand_id===report.taxonomySeed.brand.id&&p.category_id===report.taxonomySeed.category.id)
  const dr=call('intake_draft',draft,{key:d.key});check('signed Draft replay returns exact original SKU/result',same(d.result,dr.result))
  const inv={sessionId,inventoryRequestId:randomUUID(),source:'reconciliation',inventory:{quantity:7,boxCode:'INTAKE-'+requestId,batchCode:'INTAKE-'+requestId,expiryDate:value("select (current_date+365)::text;"),isNonExpiry:false,unitCost:12,ownerCode:'ISOLATED-OWNER',hubLocation:'HUB-MNL-CENTRAL',custodian:'CUST-STAFF-ELENA',reason:'Synthetic verified opening balance on owned clone only'}}
  const i=call('intake_inventory',inv,{effects:['public.products','public.product_batches','public.inventory_balances','public.batch_change_events','public.product_intake_sessions','public.audit_logs']})
  report.inventory=i.result
  const batch=i.after['public.product_batches'].filter(b=>b.sku===sku),stock=i.after['public.products'].find(x=>x.sku===sku)
  check('opening balance creates exactly seven units with declared custody/cost/source',i.result.action==='opening_balance_reconciled'&&batch.length===1&&Number(batch[0].quantity)===7&&batch[0].hub==='HUB-MNL-CENTRAL'&&batch[0].custodian==='CUST-STAFF-ELENA'&&Number(batch[0].unit_cost)===12&&batch[0].owner_code==='ISOLATED-OWNER'&&batch[0].source_type==='opening_balance'&&Number(stock.stock_available)===7)
  const balance=i.after['public.inventory_balances'].filter(b=>b.sku===sku),events=i.after['public.batch_change_events'].filter(b=>b.sku===sku)
  check('opening balance projects exactly seven units and one own physical history event',balance.length===1&&balance[0].location_code==='MANILA_MAIN'&&balance[0].on_hand===7&&balance[0].available===7&&balance[0].reserved===0&&events.length===1&&events[0].batch_id===batch[0].id&&events[0].actor_id===actor&&events[0].reason===inv.inventory.reason&&events[0].new_data.quantity===7&&events[0].old_data===null&&i.after['public.inventory_balances'].length===i.before['public.inventory_balances'].length+1&&i.after['public.batch_change_events'].length===i.before['public.batch_change_events'].length+1)
  const provenance=i.after['public.audit_logs'].filter(a=>!i.before['public.audit_logs'].some(b=>b.id===a.id)&&a.new_data?.operation==='CREATE_FIRST_INVENTORY_SOURCE')
  const reviewed=provenance[0]?.new_data.inventory
  check('final opening balance audit retains exact reviewed cost/owner/lot/custody input',provenance.length===1&&provenance[0].action==='UPDATE'&&provenance[0].user_id===actor&&provenance[0].record_id===sessionId&&provenance[0].new_data.sku===sku&&provenance[0].new_data.product_id===d.result.product_id&&provenance[0].new_data.inventory_request_id===inv.inventoryRequestId&&!!reviewed&&Object.keys(reviewed).length===Object.keys(inv.inventory).length&&Object.entries(inv.inventory).every(([k,v])=>reviewed[k]===v))
  const ir=call('intake_inventory',inv,{key:i.key});check('opening balance replay retains exact inventory result',same(i.result,ir.result))
  call('intake_inventory',{...inv,inventoryRequestId:randomUUID()},{error:'K2_FIRST_INVENTORY_ALREADY_RECORDED'})
  call('intake_publication',{sessionId,requestedStatus:'live',reason:'Unreviewed synthetic product must remain unavailable'},{error:'K2_PUBLICATION_NOT_READY'})
  call('intake_publication',{sessionId,requestedStatus:'under_review',reason:'Synthetic signed publication review'},{effects:['public.products','public.product_intake_sessions','public.audit_logs']})
  call('intake_publication',{sessionId,requestedStatus:'live',reason:'Missing reviewed price and public photo must refuse'},{error:'K2_PUBLICATION_NOT_READY'})
  call('intake_session_create',{requestId:randomUUID(),barcode:null,scannedIdentity:'Anonymous refusal'},{role:'anon',error:'permission denied'})
  report.after=rows();report.afterFunctions=functions()
  const unchangedControls=Object.fromEntries(Object.entries(report.after).map(([t,r])=>[t,controls.includes(t)?report.before[t]:r]))
  check('complete lifecycle preserves every existing product/lot/balance/history/audit/session and unrelated table',intakePreservesRows(report.before,unchangedControls,['public.products','public.product_batches','public.inventory_balances','public.batch_change_events','public.product_intake_sessions','public.audit_logs']))
  check('lifecycle retains every full installed function contract',same(report.beforeFunctions,report.afterFunctions))
 }finally{fs.writeFileSync(path.join(evidence,'intake-lifecycle.json'),JSON.stringify(report,null,2)+'\n')}
}
