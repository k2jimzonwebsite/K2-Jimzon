// IDEA10: reproduce actual clearance/receiving cache races in the owned restore clone.
import fs from 'node:fs'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {signedAdminCommandArguments} from '../server/admin-bff/security.js'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
export const clearanceConcurrencyWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export function clearanceHistoryIntegrity(report,actor) {
  const {before,after,fixture,payload,approved,manifestId,itemId,notes}=report
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
  const old=before.lots.find(l=>l.id===fixture.short),next=after.lots.find(l=>l.id===fixture.short)
  const ordinary=before.lots.find(l=>l.id===fixture.lot),savedOrdinary=after.lots.find(l=>l.id===fixture.lot)
  const allowed=new Set(['inventory_status','quantity_available','clearance_approved_at','clearance_approved_by','updated_at'])
  const stable=lot=>Object.fromEntries(Object.entries(lot).filter(([key])=>!allowed.has(key)))
  const addedBatch=after.batchEvents.filter(e=>!before.batchEvents.some(p=>p.id===e.id))
  const addedInventory=after.inventoryEvents.filter(e=>!before.inventoryEvents.some(p=>p.id===e.id))
  const event=addedBatch[0],received=addedInventory[0]
  const incoming=after.lots.find(l=>l.source_consignment_item_id===itemId)
  return {
    ordinaryLot:same(ordinary,savedOrdinary),
    physicalAttribution:after.lots.reduce((n,l)=>n+l.quantity,0)===6
      &&after.lots.reduce((n,l)=>n+l.reserved_quantity,0)===1
      &&before.lots.every(l=>after.lots.some(a=>a.id===l.id&&a.quantity===l.quantity&&a.reserved_quantity===l.reserved_quantity)),
    shortLot:!!old&&!!next&&same(stable(old),stable(next))&&next.quantity_available===(approved?2:0)
      &&next.inventory_status===(approved?'available':'quarantine')
      &&next.clearance_approved_by===(approved?actor:null)
      &&(approved?typeof next.clearance_approved_at==='string':next.clearance_approved_at===null),
    priorBatchHistory:before.batchEvents.every(e=>after.batchEvents.some(a=>same(e,a))),
    clearanceEvent:addedBatch.length===1&&event.batch_id===fixture.short&&event.sku===fixture.sku
      &&event.actor_id===actor&&event.reason===payload.reason&&same(event.old_data,old)&&same(event.new_data,next)
      &&event.created_at===next.updated_at,
    priorInventoryHistory:before.inventoryEvents.every(e=>after.inventoryEvents.some(a=>same(e,a))),
    receivingEvent:addedInventory.length===1&&!!incoming&&received.event_type==='received'
      &&received.sku===fixture.sku&&received.reference_id===manifestId&&received.reference_type==='consignment'
      &&received.location_code==='MANILA_MAIN'&&received.quantity===2&&received.actor_id===actor&&received.reason===notes
      &&received.metadata.source_consignment_item_id===itemId&&received.metadata.batch_id===incoming.id
      &&same(received.metadata.batch_after,incoming)&&same(received.metadata.balance_before,before.balance)
      &&same(received.metadata.balance_after,after.balance),
  }
}
export async function rehearseClearanceConcurrency({sync,value,check,fixture,guestPayload,guestCall,
  actor,literal,session,controller,blockedBy,waitFor,completed,evidence}) {
  const write=(name,data)=>fs.writeFileSync(path.join(evidence,name),JSON.stringify(data,null,2)+'\n')
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
  fs.writeFileSync(path.join(evidence,'executed-clearance-module.mjs'),bytes)
  const functions=()=>JSON.parse(value(`select jsonb_agg(jsonb_build_object('signature',oid::regprocedure::text,
    'definition',pg_get_functiondef(oid),'bodyMd5',md5(prosrc),'catalog',to_jsonb(p)-'prosrc') order by oid)::text
    from pg_proc p where pronamespace in ('public'::regnamespace,'k2_private'::regnamespace);`))
  const beforeFunctions=functions();write('clearance-functions-before.json',beforeFunctions)
  const expected={'execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)':'6690b0ab5cf99a74a5f7e8ad7bafd8d0',
    'execute_admin_consignment_command_v1(text,bigint,uuid,uuid,text,text)':'623e5ab404618196ac98a043134d7071',
    'k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)':'d8d3b6eb06d2b5d0e7e4edbdeb5b5101'}
  check('clearance overlaps start with exact unique current receiving/calendar/recount signatures and bodies',
    Object.entries(expected).every(([signature,md5])=>{
      const exact=beforeFunctions.filter(f=>f.signature===signature);return exact.length===1&&exact[0].bodyMd5===md5
    }))
  const tables=['public.products','public.product_batches','public.inventory_balances','public.inventory_reservations',
    'public.batch_change_events','public.inventory_events','public.order_requests','public.order_request_items',
    'public.orders','public.order_request_events','public.coupons','public.coupon_redemptions','public.consignments',
    'public.consignment_items','public.consignment_scan_events','public.audit_logs','public.hubs','public.custodians',
    'public.channel_listings','k2_private.admin_command_receipts','k2_private.admin_request_nonces',
    'k2_private.admin_request_rate_buckets','k2_private.guest_request_nonces','k2_private.guest_rate_buckets']
  const hashSQL=`jsonb_build_object(${tables.map(t=>`${literal(t)},
    (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by to_jsonb(x)::text),'')) from ${t} x)`).join(',')})`
  const hashes=()=>JSON.parse(value(`select ${hashSQL}::text;`))
  const completeHashes=h=>!!h&&Object.keys(h).sort().join('|')===[...tables].sort().join('|')
    &&Object.values(h).every(v=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v))
  const controls=()=>JSON.parse(value(`select jsonb_build_object('observedNow',clock_timestamp(),
    'observedBucket',date_trunc('minute',clock_timestamp()),'nonces',
    (select coalesce(jsonb_agg(to_jsonb(n) order by actor_id,action,nonce),'[]') from k2_private.admin_request_nonces n),
    'rates',(select coalesce(jsonb_agg(to_jsonb(b) order by scope,subject,bucket_start),'[]') from k2_private.admin_request_rate_buckets b))::text;`))
  const exactRetry=(a,b,args)=>{
    const added=b.nonces.filter(n=>!a.nonces.some(x=>same(x,n))),key=r=>[r.scope,r.subject,r.bucket_start].join('|')
    const old=new Map(a.rates.map(r=>[key(r),r])),deltas=b.rates.map(r=>({...r,delta:r.hit_count-(old.get(key(r))?.hit_count||0)})).filter(r=>r.delta)
    return b.nonces.length===a.nonces.length+1&&a.nonces.every(n=>b.nonces.some(x=>same(x,n)))
      &&added.length===1&&added[0].nonce===args.p_nonce&&added[0].actor_id===actor&&added[0].action===args.p_action
      &&Object.keys(added[0]).sort().join(',')==='action,actor_id,expires_at,nonce,used_at'
      &&Date.parse(added[0].used_at)>=Date.parse(a.observedNow)&&Date.parse(added[0].used_at)<=Date.parse(b.observedNow)
      &&Date.parse(added[0].expires_at)-Date.parse(added[0].used_at)===600000
      &&a.rates.every(r=>b.rates.some(x=>key(x)===key(r)))&&deltas.length===2&&deltas.every(r=>r.delta===1)
      &&deltas.some(r=>r.scope==='actor'&&r.subject===actor)&&deltas.some(r=>r.scope==='global'&&r.subject==='all_admin_requests')
      &&deltas[0].bucket_start===deltas[1].bucket_start&&[a.observedBucket,b.observedBucket].includes(deltas[0].bucket_start)
      &&b.rates.every(r=>{const previous=old.get(key(r));return previous?same({...previous,hit_count:r.hit_count},r)
        :deltas.some(d=>key(d)===key(r))&&r.hit_count===1&&Object.keys(r).sort().join(',')==='bucket_start,hit_count,scope,subject'})
  }
  const business=h=>Object.fromEntries(Object.entries(h).filter(([t])=>
    !['k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets'].includes(t)))
  const signed=(action,payload,key=randomUUID(),lot=false)=>{
    const args=signedAdminCommandArguments(action,actor,key,payload)
    return {args,sql:`select set_config('request.jwt.claim.sub',${literal(actor)},false);
      select set_config('request.jwt.claims','{"aal":"aal2"}',false);set time zone 'Asia/Manila';set role authenticated;
      select public.${lot?'execute_admin_lot_command_v1':'execute_admin_consignment_command_v1'}(${[
        'p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'].map(k=>literal(args[k])).join(',')})::text;`}
  }
  const admin=(action,payload)=>JSON.parse(value(signed(action,payload).sql))
  const reports=[],assertions=[]
  const assert=(name,passed)=>assertions.push({name,passed:!!passed})
  const save=()=>write('clearance-races.json',{idea:'IDEA-20261002-10',synthetic:true,providerWrites:false,
    clearanceConcurrencyWitnessSha256,scope:'Actual signed clearance versus owner-only finalizer; four single-SKU schedules',reports,assertions})
  try {
    for(const approved of [true,false])for(const startingOrder of ['clearance-first','receiving-first']) {
      const suffix=randomUUID().slice(0,8),clearanceName='k2_clearance_'+suffix,receivingName='k2_clearance_receiving_'+suffix
      const label=(approved?'approval':'reversal')+' '+startingOrder
      const report={approved,startingOrder,error:null,cleanupErrors:[]};reports.push(report)
      let gate,released=false,clearance,receiving
      try {
        const f=fixture('clearance-'+suffix,2),short=randomUUID();report.fixture={...f,short}
        sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA' where id='${f.lot}';`)
        report.purchasePayload=guestPayload(f)
        report.purchase=JSON.parse(value(`set role anon;select row_to_json(r)::text from ${guestCall(report.purchasePayload,'192.0.2.81')} r;`))
        report.orderId=value(`select id from public.order_requests where idempotency_key=${literal(report.purchasePayload.idempotencyKey)};`)
        const date=value(`select ((transaction_timestamp() at time zone 'Asia/Manila')::date+180)::text;`)
        sync(`begin;set local time zone 'Asia/Manila';
          insert into public.product_batches(id,sku,box_code,batch_code,quantity,quantity_available,reserved_quantity,
            inventory_status,expiry_date,best_before_date,hub,custodian)
          values('${short}',${literal(f.sku)},'SHORT','SHORT',2,0,0,'quarantine',current_date+60,current_date+60,
            'HUB-MNL-CENTRAL','CUST-STAFF-ELENA');
          update public.inventory_balances set on_hand=4 where sku=${literal(f.sku)} and location_code='MANILA_MAIN';commit;`)
        if(!approved)report.priorApproval=JSON.parse(value(signed('lot_clearance',{
          batchId:short,approved:true,reason:'Synthetic prior reviewed clearance approval'},randomUUID(),true).sql))
        const manifest=admin('consignment_create',{manifestCode:'CLEARANCE-'+suffix,shipmentReference:'Synthetic clearance overlap'})
        report.manifestId=manifest.consignmentId
        const item=admin('consignment_add_line',{consignmentId:manifest.consignmentId,sku:f.sku,batchCode:'ARRIVAL-'+suffix,
          boxCode:'BOX-'+suffix,bestBeforeDate:date,expectedQty:2});report.itemId=item.itemId
        const scan={consignmentId:manifest.consignmentId,itemId:item.itemId,stage:'milan',scannedCode:f.sku}
        report.milan=[admin('consignment_scan',scan),admin('consignment_scan',scan)]
        admin('consignment_advance',{consignmentId:manifest.consignmentId,toStatus:'In_Transit',reason:'Synthetic independently scanned packing'})
        admin('consignment_advance',{consignmentId:manifest.consignmentId,toStatus:'Arrived_Manila',reason:'Synthetic arrival for independent counting'})
        report.manila=[admin('consignment_scan',{...scan,stage:'manila'}),admin('consignment_scan',{...scan,stage:'manila'})]
        const snapshot=()=>JSON.parse(value(`select jsonb_build_object('hashes',${hashSQL},
          'product',(select to_jsonb(p) from public.products p where sku=${literal(f.sku)}),
          'lots',(select jsonb_agg(to_jsonb(b) order by id) from public.product_batches b where sku=${literal(f.sku)}),
          'eligible',(select coalesce(sum(greatest(b.quantity-b.reserved_quantity,0)),0) from public.product_batches b
            where sku=${literal(f.sku)} and k2_private.lot_is_eligible_v1(b)),
          'balance',(select to_jsonb(b) from public.inventory_balances b where sku=${literal(f.sku)} and location_code='MANILA_MAIN'),
          'reservations',(select jsonb_agg(to_jsonb(r) order by id) from public.inventory_reservations r where sku=${literal(f.sku)}),
          'order',(select to_jsonb(o) from public.order_requests o where id=${literal(report.orderId)}),
          'inventoryEvents',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') from public.inventory_events e where sku=${literal(f.sku)}),
          'batchEvents',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') from public.batch_change_events e where sku=${literal(f.sku)}),
          'manifest',(select to_jsonb(c) from public.consignments c where id=${literal(report.manifestId)}),
          'item',(select to_jsonb(i) from public.consignment_items i where id=${literal(report.itemId)}))::text;`))
        report.before=snapshot();report.beforeControls=controls()
        assert(label+': actual hold and independent scans preserve saved starting facts',report.purchase.ok===true
          &&report.before.balance.on_hand===4&&report.before.balance.reserved===1&&report.before.eligible===(approved?1:3)
          &&report.before.lots.length===2&&report.before.reservations.length===1&&report.before.reservations[0].quantity===1
          &&report.before.reservations[0].status==='active'&&report.milan[1].italyPackedQty===2&&report.manila[1].manilaScannedQty===2)
        report.payload={batchId:short,approved,reason:'Synthetic controlled clearance '+label};report.key=randomUUID()
        const command=signed('lot_clearance',report.payload,report.key,true);report.commandArgs=command.args
        report.notes='Synthetic independently counted clearance overlap'
        const receiveSQL=`select to_jsonb(k2_private.finalize_consignment_receipt_v1(${literal(report.manifestId)},
          ${literal(report.notes)},'HUB-MNL-CENTRAL','CUST-STAFF-ELENA'))::text;`
        const probe=(table,id)=>{
          try{sync(`begin;select 1 from public.${table} where ${id?`id='${id}'`:`sku=${literal(f.sku)}`}
            ${table==='inventory_balances'?"and location_code='MANILA_MAIN'":''} for update nowait;rollback;`);return {available:true}}
          catch(e){if(!/could not obtain lock on row/.test(e.message))throw e;return {available:false,error:e.message}}
        }
        const probes=()=>({balance:probe('inventory_balances'),product:probe('products'),short:probe('product_batches',short),ordinary:probe('product_batches',f.lot)})
        gate=await controller();report.gate=gate.name
        const owner=startingOrder==='clearance-first'?clearanceName:receivingName,contender=startingOrder==='clearance-first'?receivingName:clearanceName
        if(startingOrder==='clearance-first') {
          clearance=session(clearanceName,`begin;${command.sql}select pg_advisory_xact_lock(61001,5);commit;`)
          report.launched=[clearanceName];await waitFor(blockedBy(owner,gate.name),label+' owner gate');report.beforeContender=probes()
          receiving=session(receivingName,receiveSQL);report.launched.push(receivingName)
        }else {
          receiving=session(receivingName,`begin;${receiveSQL}select jsonb_build_object('receiverImage',${hashSQL})::text;
            select pg_advisory_xact_lock(61001,5);commit;`)
          report.launched=[receivingName];await waitFor(blockedBy(owner,gate.name),label+' owner gate');report.beforeContender=probes()
          clearance=session(clearanceName,`begin;${command.sql}commit;`);report.launched.push(clearanceName)
        }
        await waitFor(blockedBy(contender,owner),label+' actual contender blocks on business row')
        report.duringWait=probes()
        report.waits=JSON.parse(value(`select jsonb_agg(jsonb_build_object('name',application_name,'pid',pid,
          'waitType',wait_event_type,'wait',wait_event,'blockers',pg_blocking_pids(pid)) order by application_name)::text
          from pg_stat_activity where application_name in (${[clearanceName,receivingName,gate.name].map(literal).join(',')});`))
        await gate.release();released=true;report.outcomes=await Promise.all([clearance,receiving]);report.after=snapshot();report.afterControls=controls();save()
        const g=report.waits.find(s=>s.name===gate.name),o=report.waits.find(s=>s.name===owner),c=report.waits.find(s=>s.name===contender)
        assert(label+': three genuine sessions form gate owner contender blocking edges',report.waits.length===3
          &&new Set(report.waits.map(s=>s.pid)).size===3&&o.waitType==='Lock'&&o.wait==='advisory'&&o.blockers.includes(g.pid)
          &&c.waitType==='Lock'&&c.blockers.includes(o.pid)&&!report.beforeContender.product.available&&!report.duringWait.product.available)
        assert(label+': both actual commands finish without deadlock',report.outcomes.every(o=>o.status===0&&!/deadlock detected/.test(o.stderr)))
        assert(label+': physical6 reserved1 private eligibility and prior attributed hold/history survive',
          report.after.balance.on_hand===6&&report.after.balance.reserved===1&&report.after.eligible===(approved?5:3)
          &&report.after.lots.length===3&&same(report.before.reservations,report.after.reservations)&&same(report.before.order,report.after.order)
          &&report.before.batchEvents.every(e=>report.after.batchEvents.some(x=>same(e,x)))&&report.after.batchEvents.length===report.before.batchEvents.length+1)
        assert(label+': product eligible cache equals current private eligibility',report.after.product.total_stock===report.after.eligible
          &&report.after.product.stock_available===report.after.eligible)
        report.historyIntegrity=clearanceHistoryIntegrity(report,actor)
        for(const [name,passed] of Object.entries(report.historyIntegrity))assert(label+': exact '+name,passed)
        assert(label+': clearance adds only exact own verifier controls',exactRetry(report.beforeControls,report.afterControls,command.args))
        const incoming=report.after.lots.find(b=>b.source_consignment_item_id===report.itemId),received=report.after.inventoryEvents.filter(e=>e.event_type==='received'&&e.reference_id===report.manifestId)
        assert(label+': saved receipt retains source custody exact batch and full balances',incoming&&incoming.quantity===2
          &&incoming.reserved_quantity===0&&incoming.hub==='HUB-MNL-CENTRAL'&&incoming.custodian==='CUST-STAFF-ELENA'
          &&incoming.best_before_date===date&&received.length===1&&received[0].quantity===2&&received[0].actor_id===actor
          &&received[0].reason===report.notes&&same(received[0].metadata.batch_after,incoming)
          &&same(received[0].metadata.balance_before,report.before.balance)&&same(received[0].metadata.balance_after,report.after.balance)
          &&report.after.manifest.status==='Completed')
        const allowed=['public.products','public.product_batches','public.inventory_balances','public.batch_change_events','public.inventory_events',
          'public.consignments','public.audit_logs','k2_private.admin_command_receipts','k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets']
        assert(label+': complete protected table hashes remain unchanged',completeHashes(report.before.hashes)&&completeHashes(report.after.hashes)
          &&tables.filter(t=>!allowed.includes(t)).every(t=>report.before.hashes[t]===report.after.hashes[t]))
        const replay=signed('lot_clearance',report.payload,report.key,true)
        report.replay={args:replay.args,before:hashes(),beforeControls:controls()};report.replay.result=JSON.parse(value(replay.sql))
        report.replay.after=hashes();report.replay.afterControls=controls()
        report.result=report.outcomes[0].stdout.split(/\r?\n/).map(s=>{try{return JSON.parse(s)}catch{return null}}).find(s=>s?.batchId===short)
        assert(label+': exact durable replay preserves all business guest hashes and controls',same(business(report.replay.before),business(report.replay.after))
          &&same(report.replay.result,report.result)&&exactRetry(report.replay.beforeControls,report.replay.afterControls,replay.args))
      }catch(e){report.error=e.message;assert(label+': witness setup and execution complete',false)}
      finally {
        if(report.error&&report.launched?.length)try{sync(`select pg_cancel_backend(pid) from pg_stat_activity where datname=current_database()
          and application_name in (${report.launched.map(literal).join(',')});`)}catch(e){report.cleanupErrors.push(e.message)}
        if(gate&&!released)try{await gate.release();released=true}catch(e){report.cleanupErrors.push(e.message)}
        report.outcomes=await Promise.all([clearance,receiving].filter(Boolean))
        for(const name of report.launched??[])completed.delete(name)
        try{report.sessionsRemaining=Number(value(`select count(*) from pg_stat_activity where datname=current_database()
          and application_name in (${[clearanceName,receivingName,...(gate?[gate.name]:[])].map(literal).join(',')});`))}
        catch(e){report.cleanupErrors.push(e.message)}
        assert(label+': all owned phase sessions cleaned',report.sessionsRemaining===0&&report.cleanupErrors.length===0);save()
      }
    }
  }finally {
    const afterFunctions=functions();write('clearance-functions-after.json',afterFunctions)
    assert('Every production definition catalog and ACL unchanged',same(beforeFunctions,afterFunctions));save()
  }
  check('clearance/receiving four schedules satisfy all archived assertions',assertions.every(a=>a.passed),
    JSON.stringify({passed:assertions.filter(a=>a.passed).length,failed:assertions.filter(a=>!a.passed)}))
}
