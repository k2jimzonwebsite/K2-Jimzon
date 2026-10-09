// IDEA10: actual receiving-finalizer/recount overlap in the caller's owned restore clone.
import fs from 'node:fs'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {signedAdminCommandArguments} from '../server/admin-bff/security.js'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
export const receivingFinalizerWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export async function rehearseReceivingFinalizer({sync,value,check,fixture,guestPayload,guestCall,
  actor,literal,session,controller,blockedBy,waitFor,completed,evidence}) {
  const write=(name,data)=>fs.writeFileSync(path.join(evidence,name),JSON.stringify(data,null,2)+'\n')
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
  fs.writeFileSync(path.join(evidence,'executed-finalizer-module.mjs'),bytes)
  const functions=()=>JSON.parse(value(`select jsonb_agg(jsonb_build_object('signature',oid::regprocedure::text,
    'definition',pg_get_functiondef(oid),'bodyMd5',md5(prosrc),'catalog',to_jsonb(p)-'prosrc') order by oid)::text
    from pg_proc p where pronamespace in ('public'::regnamespace,'k2_private'::regnamespace);`))
  const beforeFunctions=functions();write('finalizer-functions-before.json',beforeFunctions)
  const expected={'execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)':'6690b0ab5cf99a74a5f7e8ad7bafd8d0',
    'execute_admin_consignment_command_v1(text,bigint,uuid,uuid,text,text)':'623e5ab404618196ac98a043134d7071',
    'k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)':'d8d3b6eb06d2b5d0e7e4edbdeb5b5101'}
  check('finalizer overlaps start with exact unique current receiving/calendar/recount signatures and bodies',
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
  const reports=[]
  const save=()=>write('finalizer-races.json',{idea:'IDEA-20261002-10',synthetic:true,providerWrites:false,
    receivingFinalizerWitnessSha256,scope:'Owner-only actual finalizer with staff/AAL2 claims versus signed recount; two single-SKU starting orders, stale-state refusal/recovery; no provider/browser reachability or all-writer acceptance',reports})
  sync(`create function k2_stock_fixture.finalizer_recount_gate() returns trigger language plpgsql as $$ begin
    if current_setting('k2.fixture.finalizer_recount_gate',true)='on' then
      perform set_config('k2.fixture.finalizer_balance_count',
        (coalesce(nullif(current_setting('k2.fixture.finalizer_balance_count',true),''),'0')::int+1)::text,true);
      if current_setting('k2.fixture.finalizer_balance_count')::int=2 then perform pg_advisory_xact_lock(61001,5);end if;
    end if;return null;end $$;
    create trigger local_finalizer_recount_gate before insert on public.inventory_balances
      for each statement execute function k2_stock_fixture.finalizer_recount_gate();`)
  try {
    for(const startingOrder of ['recount-first','receiving-first']) {
      const suffix=randomUUID().slice(0,8),recountName='k2_finalizer_recount_'+suffix,receivingName='k2_finalizer_receiving_'+suffix
      const report={startingOrder,error:null,cleanupErrors:[],outcomes:[]};reports.push(report)
      let gate,released=false,recount,receiving
      try {
        const f=fixture('finalizer-'+suffix,2);report.fixture=f
        sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA' where id='${f.lot}';`)
        report.purchasePayload=guestPayload(f)
        report.purchase=JSON.parse(value(`set role anon;select row_to_json(r)::text from ${guestCall(report.purchasePayload,'192.0.2.80')} r;`))
        report.orderId=value(`select id from public.order_requests where idempotency_key=${literal(report.purchasePayload.idempotencyKey)};`);save()
        check(`${startingOrder}: actual signed purchase saves exactly its idempotency-key order`,
          report.purchase.ok===true&&/^[a-f0-9-]{36}$/.test(report.orderId))
        const manifest=admin('consignment_create',{manifestCode:'OVERLAP-'+suffix,shipmentReference:'Synthetic receiving concurrency'})
        report.manifestId=manifest.consignmentId
        const date=value(`select ((transaction_timestamp() at time zone 'Asia/Manila')::date+180)::text;`)
        const item=admin('consignment_add_line',{consignmentId:manifest.consignmentId,sku:f.sku,batchCode:'ARRIVAL-'+suffix,
          boxCode:'BOX-'+suffix,bestBeforeDate:date,expectedQty:2});report.itemId=item.itemId
        const scan={consignmentId:manifest.consignmentId,itemId:item.itemId,stage:'milan',scannedCode:f.sku}
        report.milan=[admin('consignment_scan',scan),admin('consignment_scan',scan)]
        admin('consignment_advance',{consignmentId:manifest.consignmentId,toStatus:'In_Transit',reason:'Synthetic independently scanned packing'})
        admin('consignment_advance',{consignmentId:manifest.consignmentId,toStatus:'Arrived_Manila',reason:'Synthetic arrival for independent counting'})
        report.manila=[admin('consignment_scan',{...scan,stage:'manila'}),admin('consignment_scan',{...scan,stage:'manila'})]
        const lot=(b,quantity)=>({id:b.id,boxCode:b.box_code,batchCode:b.batch_code,quantity,expiryDate:b.expiry_date,
          landedDate:b.landed_date||'',hub:b.hub,custodian:b.custodian,channel:'website',pinned:!!b.is_pinned,status:b.inventory_status})
        const old=JSON.parse(value(`select to_jsonb(b)::text from public.product_batches b where id='${f.lot}';`))
        const payload={sku:f.sku,reason:'Synthetic receiving concurrency physical recount',lots:[lot(old,3)]},key=randomUUID()
        report.payload=payload;report.recountKey=key
        value(signed('lots_reconcile',{...payload,reason:'Synthetic prior immutable recount history',lots:[lot(old,2)]},randomUUID(),true).sql)
        const snapshot=()=>JSON.parse(value(`select jsonb_build_object('hashes',${hashSQL},
          'product',(select to_jsonb(p) from public.products p where sku=${literal(f.sku)}),
          'lots',(select jsonb_agg(to_jsonb(b) order by id) from public.product_batches b where sku=${literal(f.sku)}),
          'balance',(select to_jsonb(b) from public.inventory_balances b where sku=${literal(f.sku)} and location_code='MANILA_MAIN'),
          'reservations',(select jsonb_agg(to_jsonb(r) order by id) from public.inventory_reservations r where sku=${literal(f.sku)}),
          'order',(select to_jsonb(o) from public.order_requests o where id=${literal(report.orderId)}),
          'inventoryEvents',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') from public.inventory_events e where sku=${literal(f.sku)}),
          'batchEvents',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') from public.batch_change_events e where sku=${literal(f.sku)}),
          'manifest',(select to_jsonb(c) from public.consignments c where id=${literal(report.manifestId)}),
          'item',(select to_jsonb(i) from public.consignment_items i where id=${literal(report.itemId)}))::text;`))
        report.before=snapshot();report.beforeControls=controls()
        check(`${startingOrder}: signed independent packing/counting and prior recount preserve physical2/reserved1`,
          completeHashes(report.before.hashes)&&report.orderId&&report.before.balance.on_hand===2&&report.before.balance.reserved===1
          &&report.before.batchEvents.length===1&&report.before.reservations.length===1
          &&report.before.reservations[0].status==='active'&&report.before.reservations[0].quantity===1
          &&report.milan[1].italyPackedQty===2&&report.milan[1].manilaScannedQty===0&&report.manila[1].manilaScannedQty===2)
        const probe=(table='inventory_balances')=>{
          try{sync(`begin;select 1 from public.${table} where sku=${literal(f.sku)}
            ${table==='inventory_balances'?"and location_code='MANILA_MAIN'":''} for update nowait;rollback;`);return {available:true}}
          catch(e){if(!/could not obtain lock on row/.test(e.message))throw e;return {available:false,error:e.message}}
        }
        const notes='Synthetic independently counted receiving overlap',receiveSQL=`select to_jsonb(k2_private.finalize_consignment_receipt_v1(
          ${literal(report.manifestId)},${literal(notes)},'HUB-MNL-CENTRAL','CUST-STAFF-ELENA'))::text;`
        report.notes=notes;gate=await controller();report.gate=gate.name
        const command=signed('lots_reconcile',payload,key,true);report.recountArgs=command.args
        if(startingOrder==='recount-first') {
          recount=session(recountName,`begin;set local k2.fixture.finalizer_recount_gate='on';${command.sql}commit;`)
          report.launched=[recountName]
          await waitFor(blockedBy(recountName,gate.name),'receiving overlap recount owns balance before gate')
          report.beforeContender={balance:probe(),lot:probe('product_batches'),product:probe('products')}
          receiving=session(receivingName,receiveSQL);report.launched.push(receivingName)
          await waitFor(blockedBy(receivingName,recountName),'actual receiving finalizer waits behind recount balance')
        }else {
          receiving=session(receivingName,`begin;${receiveSQL}
            select jsonb_build_object('receivingUncommittedHashes',${hashSQL})::text;
            select pg_advisory_xact_lock(61001,5);commit;`);report.launched=[receivingName]
          await waitFor(blockedBy(receivingName,gate.name),'actual receiving owns balance after counted credit before commit')
          report.beforeContender={balance:probe(),lot:probe('product_batches'),product:probe('products')}
          recount=session(recountName,`begin;${command.sql}commit;`);report.launched.push(recountName)
          await waitFor(blockedBy(recountName,receivingName),'stale signed recount waits behind actual receiving balance')
        }
        report.duringWait={balance:probe(),lot:probe('product_batches'),product:probe('products')}
        report.waits=JSON.parse(value(`select jsonb_agg(jsonb_build_object('name',application_name,'pid',pid,
          'waitType',wait_event_type,'wait',wait_event,'blockers',pg_blocking_pids(pid)) order by application_name)::text
          from pg_stat_activity where application_name in (${[recountName,receivingName,gate.name].map(literal).join(',')});`))
        await gate.release();released=true;report.outcomes=await Promise.all([recount,receiving]);report.after=snapshot();report.afterControls=controls();save()
        const gateRow=report.waits.find(s=>s.name===gate.name),owner=report.waits.find(s=>s.name===(startingOrder==='recount-first'?recountName:receivingName)),
          contender=report.waits.find(s=>s.name===(startingOrder==='recount-first'?receivingName:recountName))
        check(`${startingOrder}: genuine three-session edges retain owned balance and unchanged probe availability`,
          !report.beforeContender.balance.available&&!report.duringWait.balance.available
          &&['balance','lot','product'].every(k=>report.beforeContender[k].available===report.duringWait[k].available)
          &&report.waits.length===3&&new Set(report.waits.map(s=>s.pid)).size===3
          &&gateRow&&owner&&contender&&owner.waitType==='Lock'&&owner.wait==='advisory'
          &&owner.blockers.includes(gateRow.pid)&&contender.waitType==='Lock'&&contender.blockers.includes(owner.pid))
        check(`${startingOrder}: terminal receiving succeeds with no deadlock`,
          report.outcomes[1].status===0&&!report.outcomes.some(o=>/deadlock detected/.test(o.stderr)))
        if(startingOrder==='receiving-first') {
          const image=report.outcomes[1].stdout.split(/\r?\n/).map(s=>{try{return JSON.parse(s)}catch{return null}})
            .find(s=>s?.receivingUncommittedHashes);report.receivingUncommittedHashes=image?.receivingUncommittedHashes
          check('receiving-first stale lot-list recount refuses with complete business/control rollback to receiving image',
            report.outcomes[0].status!==0&&/K2_ADMIN_PAYLOAD_INVALID/.test(report.outcomes[0].stderr)
            &&completeHashes(report.receivingUncommittedHashes)&&completeHashes(report.after.hashes)
            &&same(report.receivingUncommittedHashes,report.after.hashes)
            &&report.after.balance.on_hand===4&&report.after.balance.reserved===1&&report.after.batchEvents.length===1)
          const incoming=report.after.lots.find(b=>b.source_consignment_item_id===report.itemId)
          report.recoveryPayload={...payload,lots:[lot(old,3),lot(incoming,2)]}
          report.beforeRecovery=snapshot();report.beforeRecoveryControls=controls();report.recoveryArgs=signed('lots_reconcile',report.recoveryPayload,key,true)
          report.recoveryResult=JSON.parse(value(report.recoveryArgs.sql));report.afterRecovery=snapshot();report.afterRecoveryControls=controls();save()
          check('receiving-first refreshed same-key recount succeeds without losing received physical stock or attributed hold',
            report.afterRecovery.balance.on_hand===5&&report.afterRecovery.balance.reserved===1
            &&report.afterRecovery.batchEvents.length===report.beforeRecovery.batchEvents.length+2
            &&report.afterRecovery.lots.find(b=>b.id===incoming.id)?.quantity===2
            &&[report.recoveryPayload.lots[0].id,incoming.id].every(id=>report.afterRecovery.batchEvents.filter(e=>
              !report.beforeRecovery.batchEvents.some(old=>old.id===e.id)&&e.batch_id===id
              &&e.actor_id===actor&&e.reason===report.recoveryPayload.reason).length===1))
          check('receiving-first recovery retains complete maps and exact own signed controls',
            completeHashes(report.beforeRecovery.hashes)&&completeHashes(report.afterRecovery.hashes)
            &&exactRetry(report.beforeRecoveryControls,report.afterRecoveryControls,report.recoveryArgs.args))
        }else {
          report.recountResult=report.outcomes[0].stdout.split(/\r?\n/).map(s=>{try{return JSON.parse(s)}catch{return null}}).find(s=>s?.sku===f.sku)
          check('recount-first count3 then actual receipt2 produces physical5 with hold1 and exact own signed controls',
            report.outcomes[0].status===0&&report.recountResult&&completeHashes(report.after.hashes)
            &&report.after.balance.on_hand===5&&report.after.balance.reserved===1&&report.after.batchEvents.length===2
            &&exactRetry(report.beforeControls,report.afterControls,command.args))
        }
        const final=report.afterRecovery??report.after,received=final.inventoryEvents.filter(e=>e.event_type==='received'&&e.reference_id===report.manifestId)
        const incoming=final.lots.find(b=>b.source_consignment_item_id===report.itemId)
        report.savedReceiverLot=report.after.lots.find(b=>b.source_consignment_item_id===report.itemId)
        check(`${startingOrder}: one saved receipt lot/event retains independent scans, explicit custody and actual before/after balance`,
          incoming&&incoming.quantity===2&&incoming.reserved_quantity===0&&incoming.inventory_status==='available'
          &&incoming.hub==='HUB-MNL-CENTRAL'&&incoming.custodian==='CUST-STAFF-ELENA'&&incoming.best_before_date===date
          &&received.length===1&&received[0].quantity===2&&received[0].actor_id===actor&&received[0].reason===notes
          &&received[0].metadata.batch_id===incoming.id&&received[0].metadata.source_consignment_item_id===report.itemId
          &&received[0].metadata.hub===incoming.hub&&received[0].metadata.custodian===incoming.custodian
          &&received[0].metadata.quantity_available===report.savedReceiverLot.quantity_available
          &&received[0].metadata.inventory_status===report.savedReceiverLot.inventory_status
          &&same(received[0].metadata.batch_after,report.savedReceiverLot)
          &&same(received[0].metadata.balance_after,report.after.balance)
          &&report.savedReceiverLot.box_code===report.after.item.box_code&&report.savedReceiverLot.batch_code===report.after.item.batch_code
          &&report.savedReceiverLot.best_before_date===report.after.item.best_before_date&&report.savedReceiverLot.expiry_date===date
          &&report.savedReceiverLot.arrival_flight===report.after.manifest.manifest_code
          &&report.savedReceiverLot.landed_date===value(`select (transaction_timestamp() at time zone 'Asia/Manila')::date::text;`)
          &&received[0].metadata.balance_before.on_hand===(startingOrder==='recount-first'?3:2)
          &&received[0].metadata.balance_after.on_hand===(startingOrder==='recount-first'?5:4)
          &&received[0].metadata.balance_before.reserved===1&&received[0].metadata.balance_after.reserved===1
          &&final.manifest.status==='Completed'&&final.item.manila_scanned_qty===2)
        check(`${startingOrder}: both physical lots, exact prior holds/order/history and current eligible product units agree`,
          final.lots.length===2&&final.lots.find(b=>b.id===f.lot)?.quantity===3&&final.product.stock_available===4&&final.product.total_stock===4
          &&same(final.reservations,report.before.reservations)&&same(final.order,report.before.order)
          &&['inventoryEvents','batchEvents'].every(t=>report.before[t].every(old=>final[t].some(e=>e.id===old.id&&same(e,old)))))
        const unchanged=tables.filter(t=>!['public.products','public.product_batches','public.inventory_balances',
          'public.batch_change_events','public.inventory_events','public.consignments','k2_private.admin_command_receipts',
          'k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets'].includes(t))
        check(`${startingOrder}: all fifteen protected full-table maps including guest controls remain exact`,
          completeHashes(report.before.hashes)&&completeHashes(final.hashes)
          &&unchanged.length===15&&unchanged.every(t=>final.hashes[t]===report.before.hashes[t]))
        const replayPayload=report.recoveryPayload??payload,replay=signed('lots_reconcile',replayPayload,key,true)
        report.replay={payload:replayPayload,args:replay.args,before:hashes(),beforeControls:controls()}
        report.replay.result=JSON.parse(value(replay.sql));report.replay.afterControls=controls();report.replay.after=hashes();save()
        check(`${startingOrder}: exact same-key recount replay preserves all22 business/guest tables and its durable result`,
          completeHashes(report.replay.before)&&completeHashes(report.replay.after)
          &&same(business(report.replay.before),business(report.replay.after))
          &&same(report.replay.result,report.recoveryResult??report.recountResult))
        check(`${startingOrder}: retry adds only its own five-field nonce and two exact minute rate hits`,
          exactRetry(report.replay.beforeControls,report.replay.afterControls,replay.args))
      }catch(e){report.error=e.message}
      finally {
        if(report.error&&report.launched?.length)try{sync(`select pg_cancel_backend(pid) from pg_stat_activity where datname=current_database()
          and application_name in (${report.launched.map(literal).join(',')});`)}catch(e){report.cleanupErrors.push(e.message)}
        if(gate&&!released)try{await gate.release();released=true}catch(e){report.cleanupErrors.push(e.message)}
        report.outcomes=await Promise.all([recount,receiving].filter(Boolean))
        for(const name of report.launched??[])completed.delete(name)
        try{report.sessionsRemaining=Number(value(`select count(*) from pg_stat_activity where datname=current_database()
          and application_name in (${[recountName,receivingName,...(gate?[gate.name]:[])].map(literal).join(',')});`))}
        catch(e){report.cleanupErrors.push(e.message)}save()
      }
      if(report.error)throw Error(report.error)
      check(`${startingOrder}: terminal outcomes retained and all phase sessions removed`,
        report.outcomes.length===2&&report.sessionsRemaining===0&&report.cleanupErrors.length===0)
    }
  }finally{const afterFunctions=functions();write('finalizer-functions-after.json',afterFunctions)
    check('actual finalizer/recount schedules preserve every production function definition/catalog/ACL',same(beforeFunctions,afterFunctions))}
}
