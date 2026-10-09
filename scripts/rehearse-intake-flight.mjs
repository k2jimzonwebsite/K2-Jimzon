// IDEA-20261003-02/04: native signed intake -> manifest -> controlled receiving.
import fs from 'node:fs'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {validateProductIntakeCommand} from '../server/admin-bff/product-intake.js'
import {validateConsignmentCommand} from '../server/admin-bff/consignments.js'
import {signedAdminCommandArguments} from '../server/admin-bff/security.js'
import {intakePreservesRows} from './rehearse-intake-lifecycle.mjs'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
export const intakeFlightWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export async function rehearseIntakeFlight({value,check,literal:q,evidence,actor,calendar=false}){
 const report={idea:calendar?'IDEA-20261003-06':'IDEA-20261003-04',calendar,scope:'Local native signed flight receiving with synthetic evidence metadata; no actual upload, supplier count, provider or host acceptance',providerWrites:false,commands:[]}
 fs.writeFileSync(path.join(evidence,'executed-intake-flight.mjs'),bytes)
 report.sources=['server/admin-bff/product-intake.js','server/admin-bff/consignments.js','server/admin-bff/security.js'].map(file=>{const b=fs.readFileSync(file);fs.writeFileSync(path.join(evidence,'flight-'+path.basename(file)),b);return {file,sha256:createHash('sha256').update(b).digest('hex')}})
 const tables=JSON.parse(value("select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private','storage') and c.relkind in ('r','p');"))
 const rows=()=>JSON.parse(value(`select jsonb_object_agg(t,r)::text from (values ${tables.map(t=>`(${q(t)},(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]') from ${t} x))`).join(',')}) s(t,r);`))
 const functions=()=>JSON.parse(value("select jsonb_agg(jsonb_build_object('definition',pg_get_functiondef(p.oid),'catalog',to_jsonb(p)) order by p.oid)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','k2_private','storage');"))
 const controls=['k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets','k2_private.admin_command_receipts']
 const call=(action,raw,{key=randomUUID(),error,validate=true,effects=[]}={})=>{
  const receiving=action.startsWith('consignment_'),payload=validate?(receiving?validateConsignmentCommand(action,raw,{deferDateWindowToReceipt:true}):validateProductIntakeCommand(action,raw)):raw,args=signedAdminCommandArguments(action,actor,key,payload)
  const rpc=receiving?'execute_admin_consignment_command_v1':'execute_admin_product_intake_command_v1'
  const c={action,key,payload,args,rpc,before:rows(),sql:`select set_config('request.jwt.claim.sub',${q(actor)},false);select set_config('request.jwt.claims','{"aal":"aal2"}',false);set role authenticated;select public.${rpc}(${['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'].map(k=>q(args[k])).join(',')})::text;`};report.commands.push(c)
  try{c.result=JSON.parse(value(c.sql))}catch(e){c.error=e.message}
  c.after=rows()
  if(error)check('flight '+action+' refuses '+error+' with complete table rollback',c.error?.includes(error)&&same(c.before,c.after))
  else{check('flight '+action+' succeeds',!c.error&&!!c.result);check('flight '+action+' changes only declared tables',Object.keys(c.before).filter(t=>![...controls,...effects].includes(t)).every(t=>same(c.before[t],c.after[t])))}
  return c
 }
 const pending=(state,sku)=>!state['public.product_batches'].some(b=>b.sku===sku)&&state['public.inventory_balances'].filter(b=>b.sku===sku).every(b=>b.on_hand===0)&&Number(state['public.products'].find(p=>p.sku===sku)?.stock_available??0)===0
 try{
  report.before=rows();report.beforeFunctions=functions()
  const requestId=randomUUID(),c=call('intake_session_create',{requestId,barcode:null,scannedIdentity:'Synthetic native flight intake'},{effects:['public.product_intake_sessions']}),sessionId=c.result.sessionId
  report.sessionId=sessionId
  for(const step of ['packaging_evidence','research_handoff','field_review','draft_saved'])call('intake_session_step',{sessionId,step,patch:step==='draft_saved'?{evidenceChecklist:{ingredients:true,allergens:true,storage:true,expiry:true}}:{}},{effects:['public.product_intake_sessions']})
  for(const slot of ['PRIMARY','BACK','BARCODE'])call('intake_evidence_register',{sessionId,slot,path:`${actor}/${sessionId}/${slot.toLowerCase()}-${randomUUID()}-0123456789abcdef.jpg`,fileName:'synthetic-flight-metadata.jpg',size:1024,type:'image/jpeg',width:500,height:500,sha256:'0123456789abcdef'.repeat(4)},{validate:false,effects:['public.product_intake_sessions']})
  const d=call('intake_draft',{sessionId,requestId,reviewedPayload:{meta:{schemaVersion:'k2.product-content.v3'},product:{name:'Isolated flight '+requestId}},fieldDecisions:{name:'accepted'}},{effects:['public.products','public.product_intake_sessions','public.audit_logs']}),sku=d.result.sku
  report.draft=d.result
  const m=call('consignment_create',{manifestCode:'INTAKE-'+requestId,shipmentReference:'Synthetic first-inventory flight'},{effects:['public.consignments','public.audit_logs']}),consignmentId=m.result.consignmentId
  report.manifest=m.result
  const input={sessionId,inventoryRequestId:randomUUID(),source:'flight',inventory:{quantity:2,boxCode:'FLIGHT-'+requestId,batchCode:'FLIGHT-'+requestId,expiryDate:value("select ((transaction_timestamp() at time zone 'Asia/Manila')::date+365)::text;"),isNonExpiry:false,unitCost:12.345,consignmentId}}
  if(calendar){
   input.inventory.expiryDate=value("select ((transaction_timestamp() at time zone 'Asia/Manila')::date)::text;")
   report.calendarDates=JSON.parse(value("select jsonb_build_object('yesterday',((transaction_timestamp() at time zone 'Asia/Manila')::date-1)::text,'beyondCeiling',(make_date(extract(year from (transaction_timestamp() at time zone 'Asia/Manila'))::integer+10,extract(month from (transaction_timestamp() at time zone 'Asia/Manila'))::integer,1)+extract(day from (transaction_timestamp() at time zone 'Asia/Manila'))::integer)::text)::text;"))
   for(const expiryDate of [report.calendarDates.yesterday,report.calendarDates.beyondCeiling,'2026-02-30'])call('intake_inventory',{...input,inventory:{...input.inventory,expiryDate}},{error:'K2_EXPIRY_INVALID'})
  }
  const f=call('intake_inventory',input,{effects:['public.consignment_items','public.product_intake_sessions','public.audit_logs']}),itemId=f.result.manifest_line.id
  report.input=input;report.firstInventory=f.result;report.itemId=itemId
  check('first flight inventory creates one exact costed manifest line without physical stock',f.result.action==='flight_manifest_line_added'&&f.result.manifest_line.sku===sku&&f.result.manifest_line.consignment_id===consignmentId&&f.result.manifest_line.expected_qty===2&&f.result.manifest_line.unit_cost===input.inventory.unitCost&&f.result.manifest_line.italy_packed_qty===0&&f.result.manifest_line.manila_scanned_qty===0&&f.after['public.consignment_items'].length===f.before['public.consignment_items'].length+1&&pending(f.after,sku))
  const a=f.after['public.audit_logs'].filter(a=>!f.before['public.audit_logs'].some(b=>b.id===a.id)&&a.new_data?.operation==='CREATE_FIRST_INVENTORY_SOURCE'),inventory=a[0]?.new_data.inventory
  check('flight source audit keeps exact reviewed input and stable request/source identity',a.length===1&&a[0].record_id===sessionId&&a[0].user_id===actor&&a[0].new_data.inventory_request_id===input.inventoryRequestId&&a[0].new_data.sku===sku&&!!inventory&&Object.keys(inventory).length===Object.keys(input.inventory).length&&Object.entries(input.inventory).every(([k,v])=>inventory[k]===v))
  const replay=call('intake_inventory',input,{key:f.key});check('flight signed first-inventory replay adds no manifest or physical stock',same(f.result,replay.result)&&pending(replay.after,sku))
  if(calendar){
   const original=functions().find(f=>f.catalog.proname==='create_product_first_inventory_server'),body=original.catalog.prosrc
   if(!body.includes('transaction_timestamp()'))throw Error('INTAKE_CALENDAR_CLOCK_INJECTION_MISSING')
   report.clockInjection={scope:'Owned-clone source clock only; production expression preserved otherwise',now:'2040-01-01T00:00:00Z',beforeFunctions:functions()}
   value(original.definition.replace(body,()=>body.replaceAll('transaction_timestamp()',"timestamptz '2040-01-01T00:00:00Z'")))
   try{
    const historical=call('intake_inventory',input,{key:f.key})
    check('historical signed receipt replays before advanced source calendar without duplicate stock',same(f.result,historical.result)&&pending(historical.after,sku))
    const businessReplay=call('intake_inventory',input)
    check('stable first-inventory business request replays before advanced calendar without new manifest/audit',same({...f.result,idempotent:true},businessReplay.result)&&pending(businessReplay.after,sku))
   }finally{value(original.definition);report.clockInjection.afterFunctions=functions()}
   check('calendar clock injection restores every exact function contract',same(report.clockInjection.beforeFunctions,report.clockInjection.afterFunctions))
  }
  call('intake_inventory',{...input,inventoryRequestId:randomUUID()},{error:'K2_FIRST_INVENTORY_ALREADY_RECORDED'})
  const scan={consignmentId,itemId,stage:'manila',scannedCode:sku}
  call('consignment_scan',scan,{error:'Consignment is not ready for Manila receiving'})
  for(let n=0;n<2;n++){const s=call('consignment_scan',{...scan,stage:'milan'},{effects:['public.consignment_items','public.consignment_scan_events']});check('independent Milan scan retains zero physical stock',s.result.italyPackedQty===n+1&&s.result.manilaScannedQty===0&&pending(s.after,sku))}
  for(const toStatus of ['In_Transit','Arrived_Manila'])call('consignment_advance',{consignmentId,toStatus,reason:'Synthetic independent flight packing and arrival'},{effects:['public.consignments','public.audit_logs']})
  for(let n=0;n<2;n++){const s=call('consignment_scan',scan,{effects:['public.consignment_items','public.consignment_scan_events']});check('independent Manila recount retains zero physical stock before final receipt',s.result.manilaScannedQty===n+1&&s.result.italyPackedQty===2&&pending(s.after,sku))}
  const receiptInput={consignmentId,notes:'Synthetic controlled receipt of first flight intake',hub:'HUB-MNL-CENTRAL',custodian:'CUST-STAFF-ELENA'},received=call('consignment_finalize',receiptInput,{effects:['public.consignments','public.products','public.product_batches','public.inventory_balances','public.inventory_events','public.audit_logs']})
  report.receipt=received.result
  const batches=received.after['public.product_batches'].filter(b=>b.sku===sku),balances=received.after['public.inventory_balances'].filter(b=>b.sku===sku),events=received.after['public.inventory_events'].filter(e=>e.sku===sku)
  report.receivedBatches=batches;report.receivedBalances=balances;report.receivedEvents=events
  check('controlled receiving creates exactly two units once with manifest/lot/custody joins',batches.length===1&&batches[0].quantity===2&&batches[0].source_consignment_item_id===itemId&&batches[0].hub==='HUB-MNL-CENTRAL'&&batches[0].custodian==='CUST-STAFF-ELENA'&&balances.length===1&&balances[0].on_hand===2&&balances[0].available===2&&balances[0].reserved===0&&events.length===1&&events[0].quantity===2&&events[0].reference_id===consignmentId&&events[0].actor_id===actor&&events[0].metadata.batch_id===batches[0].id&&events[0].metadata.source_consignment_item_id===itemId)
  const retry=call('consignment_finalize',receiptInput,{key:received.key});check('signed first flight receipt replay retains exact result and all physical/history tables',same(received.result,retry.result))
  check('reviewed cost remains joined across manifest, received lot and immutable receipt event',batches[0].unit_cost===input.inventory.unitCost&&events[0].metadata.batch_after.unit_cost===input.inventory.unitCost)
  if(calendar)check('Manila today is accepted into physical quarantine without sellable stock',batches[0].expiry_date===input.inventory.expiryDate&&batches[0].inventory_status==='quarantine'&&Number(received.after['public.products'].find(p=>p.sku===sku).stock_available)===0)
  // Ordinary historical-compatible add-line has no reviewed cost; never infer zero or product price.
  const legacyManifest=call('consignment_create',{manifestCode:'UNKNOWN-'+requestId,shipmentReference:'Synthetic ordinary manifest with unknown cost'},{effects:['public.consignments','public.audit_logs']}).result
  const legacyItem=call('consignment_add_line',{consignmentId:legacyManifest.consignmentId,sku,batchCode:'UNKNOWN-'+requestId,boxCode:'UNKNOWN-'+requestId,bestBeforeDate:input.inventory.expiryDate,expectedQty:1},{effects:['public.consignment_items','public.audit_logs']}).result
  const legacyScan={consignmentId:legacyManifest.consignmentId,itemId:legacyItem.itemId,stage:'milan',scannedCode:sku}
  call('consignment_scan',legacyScan,{effects:['public.consignment_items','public.consignment_scan_events']})
  for(const toStatus of ['In_Transit','Arrived_Manila'])call('consignment_advance',{consignmentId:legacyManifest.consignmentId,toStatus,reason:'Synthetic ordinary legacy-compatible packing and arrival'},{effects:['public.consignments','public.audit_logs']})
  call('consignment_scan',{...legacyScan,stage:'manila'},{effects:['public.consignment_items','public.consignment_scan_events']})
  const legacyInput={...receiptInput,consignmentId:legacyManifest.consignmentId},legacyReceipt=call('consignment_finalize',legacyInput,{effects:['public.consignments','public.products','public.product_batches','public.inventory_balances','public.inventory_events','public.audit_logs']})
  report.unknownCost={manifest:legacyManifest,item:legacyItem,result:legacyReceipt.result,batches:legacyReceipt.after['public.product_batches'].filter(b=>b.sku===sku),events:legacyReceipt.after['public.inventory_events'].filter(e=>e.reference_id===legacyManifest.consignmentId),balance:legacyReceipt.after['public.inventory_balances'].find(b=>b.sku===sku)}
  const unknown=report.unknownCost.batches.find(b=>b.source_consignment_item_id===legacyItem.itemId)
  check('ordinary unknown-cost manifest receives one unit without inventing cost or changing reviewed lot',!!unknown&&unknown.unit_cost===null&&unknown.quantity===1&&report.unknownCost.batches.length===2&&same(report.unknownCost.batches.find(b=>b.id===batches[0].id),batches[0])&&report.unknownCost.balance.on_hand===3&&report.unknownCost.events.length===1&&report.unknownCost.events[0].metadata.batch_after.unit_cost===null)
  const legacyRetry=call('consignment_finalize',legacyInput,{key:legacyReceipt.key});check('unknown-cost receipt replay is exact with no duplicate stock',same(legacyReceipt.result,legacyRetry.result))
  if(calendar){
   // Separate genuine Draft proves the inclusive upper boundary without receiving stock.
   const maxRequest=randomUUID(),maxSession=call('intake_session_create',{requestId:maxRequest,barcode:null,scannedIdentity:'Synthetic maximum calendar boundary'},{effects:['public.product_intake_sessions']}).result.sessionId
   for(const step of ['packaging_evidence','research_handoff','field_review','draft_saved'])call('intake_session_step',{sessionId:maxSession,step,patch:step==='draft_saved'?{evidenceChecklist:{ingredients:true,allergens:true,storage:true,expiry:true}}:{}},{effects:['public.product_intake_sessions']})
   for(const slot of ['PRIMARY','BACK','BARCODE'])call('intake_evidence_register',{sessionId:maxSession,slot,path:`${actor}/${maxSession}/${slot.toLowerCase()}-${randomUUID()}-0123456789abcdef.jpg`,fileName:'synthetic-calendar-metadata.jpg',size:1024,type:'image/jpeg',width:500,height:500,sha256:'0123456789abcdef'.repeat(4)},{validate:false,effects:['public.product_intake_sessions']})
   const maxDraft=call('intake_draft',{sessionId:maxSession,requestId:maxRequest,reviewedPayload:{meta:{schemaVersion:'k2.product-content.v3'},product:{name:'Isolated calendar '+maxRequest}},fieldDecisions:{name:'accepted'}},{effects:['public.products','public.product_intake_sessions','public.audit_logs']}).result
   const maxManifest=call('consignment_create',{manifestCode:'MAX-'+maxRequest,shipmentReference:'Synthetic inclusive calendar maximum'},{effects:['public.consignments','public.audit_logs']}).result
   const maximum=value(`select (${q(report.calendarDates.beyondCeiling)}::date-1)::text;`),maxInput={...input,sessionId:maxSession,inventoryRequestId:randomUUID(),inventory:{...input.inventory,consignmentId:maxManifest.consignmentId,expiryDate:maximum,boxCode:'MAX-'+maxRequest,batchCode:'MAX-'+maxRequest}}
   const maxLine=call('intake_inventory',maxInput,{effects:['public.consignment_items','public.product_intake_sessions','public.audit_logs']})
   report.maximumBoundary={input:maxInput,result:maxLine.result,sku:maxDraft.sku}
   check('inclusive ten-year maximum creates one exact manifest line and zero physical stock',maxLine.result.manifest_line.best_before_date===maximum&&maxLine.result.manifest_line.unit_cost===12.345&&pending(maxLine.after,maxDraft.sku))
   const maxRetry=call('intake_inventory',maxInput,{key:maxLine.key});check('inclusive maximum signed retry retains exact receipt and zero stock',same(maxRetry.result,maxLine.result)&&pending(maxRetry.after,maxDraft.sku))
  }
  report.after=rows();report.afterFunctions=functions()
  const business=Object.fromEntries(Object.entries(report.after).map(([t,r])=>[t,controls.includes(t)?report.before[t]:r]))
  check('full flight lifecycle preserves all original business rows and every unrelated table',intakePreservesRows(report.before,business,['public.products','public.product_intake_sessions','public.audit_logs','public.consignments','public.consignment_items','public.consignment_scan_events','public.product_batches','public.inventory_balances','public.inventory_events']))
  check('flight workflow retains every installed function contract',same(report.beforeFunctions,report.afterFunctions))
  check('received first flight lot retains the reviewed intake unit cost',Number(batches[0].unit_cost)===input.inventory.unitCost)
 }finally{fs.writeFileSync(path.join(evidence,'intake-flight.json'),JSON.stringify(report,null,2)+'\n')}
}
