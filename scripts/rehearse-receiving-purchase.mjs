// IDEA10: actual two-SKU receiving/purchase overlap in the caller's owned local restore.
import fs from 'node:fs'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {signedAdminCommandArguments} from '../server/admin-bff/security.js'
import {signedRpcArguments} from '../server/storefront-bff/security.js'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
export const receivingPurchaseWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export async function rehearseReceivingPurchase({sync,value,check,fixture,guestPayload,guestCall,
  actor,literal,session,controller,blockedBy,waitFor,completed,evidence}) {
  const write=(name,data)=>fs.writeFileSync(path.join(evidence,name),JSON.stringify(data,null,2)+'\n')
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
  fs.writeFileSync(path.join(evidence,'executed-purchase-module.mjs'),bytes)
  const functions=()=>JSON.parse(value(`select jsonb_agg(jsonb_build_object('signature',oid::regprocedure::text,
    'definition',pg_get_functiondef(oid),'bodyMd5',md5(prosrc),'catalog',to_jsonb(p)-'prosrc') order by oid)::text
    from pg_proc p where pronamespace in ('public'::regnamespace,'k2_private'::regnamespace);`))
  const beforeFunctions=functions();write('purchase-functions-before.json',beforeFunctions)
  const expected={'execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)':'6690b0ab5cf99a74a5f7e8ad7bafd8d0',
    'execute_admin_consignment_command_v1(text,bigint,uuid,uuid,text,text)':'623e5ab404618196ac98a043134d7071',
    'k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)':'d8d3b6eb06d2b5d0e7e4edbdeb5b5101'}
  check('receiving/purchase starts with exact current receiving/calendar/recount bodies',Object.entries(expected)
    .every(([signature,md5])=>beforeFunctions.filter(f=>f.signature===signature&&f.bodyMd5===md5).length===1))
  const tables=['public.products','public.product_batches','public.inventory_balances','public.inventory_reservations',
    'public.batch_change_events','public.inventory_events','public.order_requests','public.order_request_items',
    'public.orders','public.order_request_events','public.coupons','public.coupon_redemptions','public.consignments',
    'public.consignment_items','public.consignment_scan_events','public.audit_logs','public.hubs','public.custodians',
    'public.channel_listings','k2_private.admin_command_receipts','k2_private.admin_request_nonces',
    'k2_private.admin_request_rate_buckets','k2_private.guest_request_nonces','k2_private.guest_rate_buckets',
    'public.customers','public.customer_contact_points','public.guest_access_grants','public.guest_access_grant_scopes',
    'public.conversations','public.messages','k2_private.guest_conversation_receipts']
  const hashSQL=`jsonb_build_object(${tables.map(t=>`${literal(t)},(select md5(coalesce(
    string_agg(to_jsonb(x)::text,'|' order by to_jsonb(x)::text),'')) from ${t} x)`).join(',')})`
  const hashes=()=>JSON.parse(value(`select ${hashSQL}::text;`))
  const complete=h=>!!h&&Object.keys(h).sort().join('|')===[...tables].sort().join('|')
    &&Object.values(h).every(v=>/^[a-f0-9]{32}$/.test(v))
  const controls=()=>JSON.parse(value(`select jsonb_build_object('observedNow',clock_timestamp(),
    'nonces',(select coalesce(jsonb_agg(to_jsonb(n) order by action,nonce),'[]') from k2_private.guest_request_nonces n),
    'rates',(select coalesce(jsonb_agg(to_jsonb(b) order by action,dimension,subject_hash,bucket_start),'[]')
      from k2_private.guest_rate_buckets b))::text;`))
  const guest=(payload,ip)=>{
    const args=signedRpcArguments({headers:{},socket:{remoteAddress:ip}},'order',payload)
    const contactHash=value(`select encode(k2_private.contact_hash(${literal(args.p_payload_text)}::jsonb),'hex');`)
    return {args,contactHash,sql:`select set_config('request.jwt.claim.sub','',false);
      select set_config('request.jwt.claims','{}',false);set role anon;
      select row_to_json(r)::text from public.submit_guest_order_v1(${[
        'p_timestamp','p_nonce','p_payload_text','p_ip_hash','p_signature'].map(k=>literal(args[k])).join(',')},null) r;`}
  }
  const exactGuest=(a,b,command)=>{
    const added=b.nonces.filter(n=>!a.nonces.some(p=>same(n,p))),key=r=>[r.action,r.dimension,r.subject_hash,r.bucket_start].join('|')
    const old=new Map(a.rates.map(r=>[key(r),r])),deltas=b.rates.map(r=>({...r,delta:r.hit_count-(old.get(key(r))?.hit_count||0)})).filter(r=>r.delta)
    const within=t=>Date.parse(t)>=Date.parse(a.observedNow)&&Date.parse(t)<=Date.parse(b.observedNow)
    return b.nonces.length===a.nonces.length+1&&a.nonces.every(n=>b.nonces.some(p=>same(n,p)))&&added.length===1
      &&added[0].nonce===command.args.p_nonce&&added[0].action==='order'
      &&Object.keys(added[0]).sort().join(',')==='action,expires_at,nonce,used_at'&&within(added[0].used_at)
      &&Date.parse(added[0].expires_at)-Date.parse(added[0].used_at)===600000
      &&a.rates.every(r=>b.rates.some(n=>key(n)===key(r)))&&deltas.length===2
      &&[['ip',command.args.p_ip_hash,900],['contact',command.contactHash,3600]].every(([dimension,hash,seconds])=>
        deltas.some(r=>r.action==='order'&&r.dimension===dimension&&r.subject_hash==='\\x'+hash
          &&r.window_seconds===seconds&&r.delta===1&&within(r.updated_at)
          &&[a.observedNow,b.observedNow].some(t=>Date.parse(r.bucket_start)===Math.floor(Date.parse(t)/1000/seconds)*seconds*1000)))
      &&b.rates.every(r=>{const p=old.get(key(r));return p?(deltas.some(d=>key(d)===key(r))
        ?same({...p,hit_count:r.hit_count,updated_at:r.updated_at},r):same(p,r))
        :deltas.some(d=>key(d)===key(r))&&r.hit_count===1})
  }
  const admin=(action,payload)=>{
    const args=signedAdminCommandArguments(action,actor,randomUUID(),payload)
    return JSON.parse(value(`select set_config('request.jwt.claim.sub',${literal(actor)},false);
      select set_config('request.jwt.claims','{"aal":"aal2"}',false);set time zone 'Asia/Manila';set role authenticated;
      select public.execute_admin_consignment_command_v1(${['p_action','p_timestamp','p_nonce','p_idempotency_key',
        'p_payload_text','p_signature'].map(k=>literal(args[k])).join(',')})::text;`))
  }
  const reports=[],assertions=[]
  const assert=(name,passed)=>assertions.push({name,passed:!!passed})
  const save=()=>write('purchase-races.json',{idea:'IDEA-20261002-10',synthetic:true,providerWrites:false,
    receivingPurchaseWitnessSha256,scope:'Actual signed purchase versus owner-only finalizer; two SKUs/three receiving lines; two success orders and one receiving rollback/recovery overlap',reports,assertions})
  sync(`create function k2_stock_fixture.receiving_purchase_fault() returns trigger language plpgsql as $$ begin
    if new.event_type='received' and new.sku=current_setting('k2.fixture.receiving_purchase_fault',true) then
      raise notice 'RECEIVING_PURCHASE_FAULT_IMAGE:%',jsonb_build_object('sku',new.sku,
        'events',(select jsonb_agg(to_jsonb(e) order by id) from public.inventory_events e
          where e.event_type='received' and e.reference_id=new.reference_id));
      perform pg_advisory_xact_lock(61001,5);raise exception 'LOCAL_RECEIVING_PURCHASE_FAULT';
    end if;return new;end $$;
    create trigger local_receiving_purchase_fault after insert on public.inventory_events for each row
      execute function k2_stock_fixture.receiving_purchase_fault();`)
  try {
    for(const mode of ['purchase-first','receiving-first','receiving-fault']) {
      const suffix=randomUUID().slice(0,8),purchaseName='k2_receive_purchase_'+suffix,receivingName='k2_purchase_receive_'+suffix
      const report={mode,error:null,cleanupErrors:[]};reports.push(report)
      let gate,released=false,purchase,receiving
      try {
        const low=fixture('aaa-purchase-'+suffix,2),high=fixture('zzz-purchase-'+suffix,2),fixtures=[low,high];report.fixtures=fixtures
        sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA'
          where id in ('${low.lot}','${high.lot}');`)
        report.priorPayload=guestPayload(high,{items:[{sku:high.sku,quantity:1},{sku:low.sku,quantity:1}]})
        report.priorResult=JSON.parse(value(`select set_config('request.jwt.claim.sub','',false);
          select set_config('request.jwt.claims','{}',false);set role anon;select row_to_json(r)::text
          from ${guestCall(report.priorPayload,'192.0.2.'+(120+reports.length))} r;`))
        report.priorOrderId=value(`select id from public.order_requests where idempotency_key=${literal(report.priorPayload.idempotencyKey)};`)
        const manifest=admin('consignment_create',{manifestCode:'PURCHASE-'+suffix,shipmentReference:'Synthetic receiving/purchase overlap'})
        report.manifestId=manifest.consignmentId
        const date=value(`select ((transaction_timestamp() at time zone 'Asia/Manila')::date+180)::text;`)
        report.lines=[]
        for(const [index,f,qty] of [[0,high,2],[1,low,2],[2,high,1]]) {
          const item=admin('consignment_add_line',{consignmentId:report.manifestId,sku:f.sku,batchCode:'BATCH-'+suffix+'-'+index,
            boxCode:'BOX-'+suffix+'-'+index,bestBeforeDate:date,expectedQty:qty})
          const line={index,sku:f.sku,qty,itemId:item.itemId,date};report.lines.push(line)
          const scan={consignmentId:report.manifestId,itemId:item.itemId,stage:'milan',scannedCode:f.sku}
          for(let n=0;n<qty;n++)line.milan=admin('consignment_scan',scan)
        }
        admin('consignment_advance',{consignmentId:report.manifestId,toStatus:'In_Transit',reason:'Synthetic independent box scans'})
        admin('consignment_advance',{consignmentId:report.manifestId,toStatus:'Arrived_Manila',reason:'Synthetic arrival'})
        for(const line of report.lines)for(let n=0;n<line.qty;n++)line.manila=admin('consignment_scan',{
          consignmentId:report.manifestId,itemId:line.itemId,stage:'manila',scannedCode:line.sku})
        const snapshot=()=>JSON.parse(value(`select jsonb_build_object('hashes',${hashSQL},
          'products',(select jsonb_agg(to_jsonb(p) order by sku) from public.products p where sku in (${fixtures.map(f=>literal(f.sku)).join(',')})),
          'lots',(select jsonb_agg(to_jsonb(b) order by id) from public.product_batches b where sku in (${fixtures.map(f=>literal(f.sku)).join(',')})),
          'balances',(select jsonb_agg(to_jsonb(b) order by sku) from public.inventory_balances b where sku in (${fixtures.map(f=>literal(f.sku)).join(',')})),
          'reservations',(select coalesce(jsonb_agg(to_jsonb(r) order by id),'[]') from public.inventory_reservations r where sku in (${fixtures.map(f=>literal(f.sku)).join(',')})),
          'inventoryEvents',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') from public.inventory_events e where sku in (${fixtures.map(f=>literal(f.sku)).join(',')})),
          'batchEvents',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') from public.batch_change_events e where sku in (${fixtures.map(f=>literal(f.sku)).join(',')})),
          'priorOrder',(select to_jsonb(o) from public.order_requests o where id=${literal(report.priorOrderId)}),
          'manifest',(select to_jsonb(c) from public.consignments c where id=${literal(report.manifestId)}),
          'items',(select jsonb_agg(to_jsonb(i) order by id) from public.consignment_items i where consignment_id=${literal(report.manifestId)}),
          'eligible',(select jsonb_object_agg(sku,q) from (select b.sku,coalesce(sum(greatest(b.quantity-b.reserved_quantity,0))
             filter(where k2_private.lot_is_eligible_v1(b)),0) q from public.product_batches b
             where sku in (${fixtures.map(f=>literal(f.sku)).join(',')}) group by sku) x))::text;`))
        report.before=snapshot();report.beforeControls=controls()
        assert(mode+': three independently counted source lines and two saved prior holds',report.priorResult.ok===true
          &&high.sku>low.sku&&report.before.lots.length===2&&report.before.reservations.length===2
          &&report.before.balances.every(b=>b.on_hand===2&&b.reserved===1)
          &&report.lines.every(l=>l.milan.italyPackedQty===l.qty&&l.manila.manilaScannedQty===l.qty))
        report.payload=guestPayload(high,{items:[{sku:high.sku,quantity:1},{sku:low.sku,quantity:1}]})
        report.command=guest(report.payload,'192.0.2.'+(140+reports.length));report.notes='Synthetic receiving/purchase counted receipt'
        const receiveSQL=`select set_config('request.jwt.claim.sub',${literal(actor)},false);
          select set_config('request.jwt.claims','{"aal":"aal2"}',false);
          select to_jsonb(k2_private.finalize_consignment_receipt_v1(${literal(report.manifestId)},
          ${literal(report.notes)},'HUB-MNL-CENTRAL','CUST-STAFF-ELENA'))::text;`
        const receiverImage=`select jsonb_build_object('receiverBalances',(select jsonb_agg(to_jsonb(b) order by sku)
          from public.inventory_balances b where sku in (${fixtures.map(f=>literal(f.sku)).join(',')})))::text;`
        const probes=()=>fixtures.map(f=>{try{sync(`begin;select 1 from public.inventory_balances
          where sku=${literal(f.sku)} and location_code='MANILA_MAIN' for update nowait;rollback;`);return {sku:f.sku,available:true}}
          catch(e){if(!/could not obtain lock on row/.test(e.message))throw e;return {sku:f.sku,available:false,error:e.message}}})
        gate=await controller();report.gate=gate.name
        const purchaseSQL=`begin;${report.command.sql}commit;`
        if(mode==='purchase-first') {
          purchase=session(purchaseName,`begin;${report.command.sql}reset role;
            select jsonb_build_object('ownerBalances',(select jsonb_agg(to_jsonb(b) order by sku)
              from public.inventory_balances b where sku in (${fixtures.map(f=>literal(f.sku)).join(',')})))::text;
            select pg_advisory_xact_lock(61001,5);commit;`)
          report.launched=[purchaseName];await waitFor(blockedBy(purchaseName,gate.name),'purchase holds both SKU balances')
          report.ownerProbes=probes();receiving=session(receivingName,`begin;${receiveSQL}${receiverImage}commit;`);report.launched.push(receivingName)
        }else {
          receiving=session(receivingName,`begin;${mode==='receiving-fault'?`set local k2.fixture.receiving_purchase_fault=${literal(high.sku)};`:''}
            ${receiveSQL}${receiverImage}${mode==='receiving-first'?'select pg_advisory_xact_lock(61001,5);':''}commit;`)
          report.launched=[receivingName];await waitFor(blockedBy(receivingName,gate.name),'receiver holds both SKU balances')
          report.ownerProbes=probes();purchase=session(purchaseName,purchaseSQL);report.launched.push(purchaseName)
        }
        const owner=mode==='purchase-first'?purchaseName:receivingName,contender=mode==='purchase-first'?receivingName:purchaseName
        await waitFor(blockedBy(contender,owner),'real buyer/receiver business contention');report.waitProbes=probes()
        report.waits=JSON.parse(value(`select jsonb_agg(jsonb_build_object('name',application_name,'pid',pid,
          'waitType',wait_event_type,'wait',wait_event,'blockers',pg_blocking_pids(pid)) order by application_name)::text
          from pg_stat_activity where application_name in (${[purchaseName,receivingName,gate.name].map(literal).join(',')});`))
        await gate.release();released=true;report.outcomes=await Promise.all([purchase,receiving]);report.after=snapshot();report.afterControls=controls();save()
        const g=report.waits.find(s=>s.name===gate.name),o=report.waits.find(s=>s.name===owner),c=report.waits.find(s=>s.name===contender)
        assert(mode+': three distinct sessions and both genuine locked SKU balances',report.waits.length===3
          &&new Set(report.waits.map(s=>s.pid)).size===3&&o.waitType==='Lock'&&o.wait==='advisory'&&o.blockers.includes(g.pid)
          &&c.waitType==='Lock'&&c.blockers.includes(o.pid)&&report.ownerProbes.every(p=>!p.available)&&report.waitProbes.every(p=>!p.available))
        report.purchaseResult=report.outcomes[0].stdout.split(/\r?\n/).map(s=>{try{return JSON.parse(s)}catch{return null}}).find(s=>s?.ok!==undefined)
        report.orderId=value(`select id from public.order_requests where idempotency_key=${literal(report.payload.idempotencyKey)};`)
        assert(mode+': actual buyer succeeds without deadlock with exact own guest controls',report.outcomes[0].status===0&&report.purchaseResult?.ok===true
          &&/^[a-f0-9-]{36}$/.test(report.orderId)&&!report.outcomes.some(o=>/deadlock detected/.test(o.stderr))
          &&exactGuest(report.beforeControls,report.afterControls,report.command))
        assert(mode+': saved prior order/holds/history immutable and new hold exact for each SKU',same(report.before.priorOrder,report.after.priorOrder)
          &&report.before.reservations.every(r=>report.after.reservations.some(n=>same(r,n)))
          &&['inventoryEvents','batchEvents'].every(t=>report.before[t].every(e=>report.after[t].some(n=>same(e,n))))
          &&fixtures.every(f=>report.after.reservations.filter(r=>r.order_request_id===report.orderId&&r.sku===f.sku
            &&r.batch_id===f.lot&&r.quantity===1&&r.status==='active').length===1)&&report.after.reservations.length===4)
        if(mode==='receiving-fault') {
          const fault=report.outcomes[1].stderr.split(/\r?\n/).find(s=>s.includes('RECEIVING_PURCHASE_FAULT_IMAGE:'))
          report.faultImage=fault?JSON.parse(fault.slice(fault.indexOf('RECEIVING_PURCHASE_FAULT_IMAGE:')+'RECEIVING_PURCHASE_FAULT_IMAGE:'.length)):null
          assert('later-SKU receipt fault rolls back all incoming lots/counts/events and administrative controls',
            report.outcomes[1].status!==0&&/LOCAL_RECEIVING_PURCHASE_FAULT/.test(report.outcomes[1].stderr)
            &&report.after.lots.length===2&&report.after.balances.every(b=>b.on_hand===2&&b.reserved===2)
            &&same(report.before.manifest,report.after.manifest)&&same(report.before.items,report.after.items)
            &&report.after.inventoryEvents.every(e=>e.event_type!=='received')
            &&['public.consignment_scan_events','public.consignments','public.consignment_items','public.audit_logs',
              'k2_private.admin_command_receipts','k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets']
              .every(t=>report.before.hashes[t]===report.after.hashes[t]))
          assert('fault occurs after genuine lower-SKU and higher-SKU receiving events exist inside the transaction',
            report.faultImage?.sku===high.sku&&report.faultImage.events.some(e=>e.sku===low.sku)
            &&report.faultImage.events.some(e=>e.sku===high.sku))
          report.beforeRecovery=snapshot();report.beforeRecoveryControls=controls()
          report.recoveryResult=JSON.parse(value(receiveSQL));report.afterRecovery=snapshot();report.afterRecoveryControls=controls();save()
          assert('same-manifest receipt recovery changes no guest or administrative controls',same(report.beforeRecoveryControls.nonces,report.afterRecoveryControls.nonces)
            &&same(report.beforeRecoveryControls.rates,report.afterRecoveryControls.rates))
        }else assert(mode+': receiver finishes successfully',report.outcomes[1].status===0)
        const final=report.afterRecovery??report.after,preReceive=report.beforeRecovery??report.before
        const incoming=final.lots.filter(l=>report.lines.some(i=>i.itemId===l.source_consignment_item_id)),received=final.inventoryEvents
          .filter(e=>e.event_type==='received'&&e.reference_id===report.manifestId)
        assert(mode+': final physical5/4 reserved2/2 eligible3/2 agree with both caches and lot sums',
          fixtures.every(f=>{const b=final.balances.find(b=>b.sku===f.sku),p=final.products.find(p=>p.sku===f.sku),physical=f===high?5:4
            return b.on_hand===physical&&b.reserved===2&&final.lots.filter(l=>l.sku===f.sku).reduce((n,l)=>n+l.quantity,0)===physical
              &&final.lots.filter(l=>l.sku===f.sku).reduce((n,l)=>n+l.reserved_quantity,0)===2
              &&final.eligible[f.sku]===physical-2&&p.total_stock===physical-2&&p.stock_available===physical-2}))
        assert(mode+': each independent box creates one exact source/custody lot and receiving event',incoming.length===3&&received.length===3
          &&report.lines.every(line=>{const l=incoming.find(l=>l.source_consignment_item_id===line.itemId),e=received.find(e=>e.metadata.source_consignment_item_id===line.itemId)
            const item=final.items.find(i=>i.id===line.itemId)
            return l&&e&&item&&item.sku===line.sku&&l.sku===line.sku&&l.quantity===line.qty&&l.reserved_quantity===0
              &&l.quantity_available===line.qty&&l.inventory_status==='available'&&l.hub==='HUB-MNL-CENTRAL'&&l.custodian==='CUST-STAFF-ELENA'
              &&l.best_before_date===line.date&&l.expiry_date===line.date&&l.box_code===item.box_code&&l.batch_code===item.batch_code
              &&l.arrival_flight===final.manifest.manifest_code&&e.sku===line.sku&&e.reference_type==='consignment'
              &&e.location_code==='MANILA_MAIN'&&e.quantity===line.qty&&e.actor_id===actor&&e.reason===report.notes
              &&e.metadata.batch_id===l.id&&same(e.metadata.batch_after,l)&&e.metadata.hub===l.hub&&e.metadata.custodian===l.custodian}))
        const ownerImage=report.outcomes[0].stdout.split(/\r?\n/).map(s=>{try{return JSON.parse(s)}catch{return null}}).find(s=>s?.ownerBalances)
        report.receiverBeforeBalances=mode==='purchase-first'?ownerImage?.ownerBalances:preReceive.balances
        const receiverAfterImage=report.outcomes[1].stdout.split(/\r?\n/).map(s=>{try{return JSON.parse(s)}catch{return null}}).find(s=>s?.receiverBalances)
        report.receiverAfterBalances=mode==='receiving-fault'?final.balances:receiverAfterImage?.receiverBalances
        report.balanceChains=fixtures.map(f=>{
          let balance=report.receiverBeforeBalances?.find(b=>b.sku===f.sku)
          const pending=received.filter(e=>e.sku===f.sku),chain=[]
          while(balance&&pending.length){const index=pending.findIndex(e=>same(e.metadata.balance_before,balance));if(index<0)break
            const e=pending.splice(index,1)[0];chain.push(e.id);balance=e.metadata.balance_after}
          const physical=f===high?5:4,reserved=mode==='receiving-first'?1:2
          return {sku:f.sku,chain,pending:pending.map(e=>e.id),after:balance,passed:pending.length===0
            &&balance?.on_hand===physical&&balance?.reserved===reserved
            &&same(balance,report.receiverAfterBalances?.find(b=>b.sku===f.sku))}
        })
        assert(mode+': receiving events form exact full before/after balance chains from captured preimages',
          report.balanceChains.every(c=>c.passed))
        const stable=lot=>Object.fromEntries(Object.entries(lot).filter(([k])=>!['reserved_quantity','quantity_available','updated_at'].includes(k)))
        assert(mode+': original physical lot/custody/expiry fields retained exactly',report.before.lots.every(l=>
          final.lots.some(n=>n.id===l.id&&same(stable(l),stable(n)))))
        const protectedTables=['public.batch_change_events','public.orders','public.coupons','public.coupon_redemptions',
          'public.consignment_items','public.consignment_scan_events','public.hubs','public.custodians','public.channel_listings',
          'k2_private.admin_command_receipts','k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets','k2_private.guest_conversation_receipts']
        assert(mode+': complete31 table hashes and all13 protected maps remain exact',complete(report.before.hashes)&&complete(final.hashes)
          &&protectedTables.every(t=>report.before.hashes[t]===final.hashes[t]))
        assert(mode+': recovery/receiving retains every preceding immutable event and attributed hold',
          ['inventoryEvents','batchEvents','reservations'].every(t=>preReceive[t].every(e=>final[t].some(n=>same(e,n))))
          &&final.manifest.status==='Completed')
        report.receiverRetry={before:hashes(),succeeded:false,error:null}
        try{report.receiverRetry.result=JSON.parse(value(receiveSQL));report.receiverRetry.succeeded=true}
        catch(error){report.receiverRetry.error=error.message}
        report.receiverRetry.after=hashes()
        report.receiverResult=report.recoveryResult??report.outcomes[1].stdout.split(/\r?\n/)
          .map(s=>{try{return JSON.parse(s)}catch{return null}}).find(s=>s?.id===report.manifestId)
        assert(mode+': repeated private finalization refuses completed receipt with every31 table unchanged',
          !report.receiverRetry.succeeded&&/K2_RECEIVING_ALREADY_COMPLETED/.test(report.receiverRetry.error)
          &&same(report.receiverRetry.before,report.receiverRetry.after))
        const replay=guest(report.payload,'192.0.2.'+(140+reports.length))
        report.replay={command:replay,before:hashes(),beforeControls:controls(),result:JSON.parse(value(replay.sql)),after:hashes(),afterControls:controls()}
        assert(mode+': buyer replay preserves all29 noncontrol tables and exact durable public reference',
          tables.filter(t=>!['k2_private.guest_request_nonces','k2_private.guest_rate_buckets'].includes(t))
            .every(t=>report.replay.before[t]===report.replay.after[t])&&report.replay.result.ok===true
          &&report.replay.result.public_reference===report.purchaseResult.public_reference
          &&same({...report.purchaseResult,guest_grant_token:null},{...report.replay.result,guest_grant_token:null})
          &&exactGuest(report.replay.beforeControls,report.replay.afterControls,replay));save()
      }catch(e){report.error=e.message;assert(mode+': setup/execution complete',false)}
      finally {
        if(report.error&&report.launched?.length)try{sync(`select pg_cancel_backend(pid) from pg_stat_activity where datname=current_database()
          and application_name in (${report.launched.map(literal).join(',')});`)}catch(e){report.cleanupErrors.push(e.message)}
        if(gate&&!released)try{await gate.release();released=true}catch(e){report.cleanupErrors.push(e.message)}
        report.outcomes=await Promise.all([purchase,receiving].filter(Boolean))
        for(const name of report.launched??[])completed.delete(name)
        try{report.sessionsRemaining=Number(value(`select count(*) from pg_stat_activity where datname=current_database()
          and application_name in (${[purchaseName,receivingName,...(gate?[gate.name]:[])].map(literal).join(',')});`))}
        catch(e){report.cleanupErrors.push(e.message)}
        assert(mode+': all owned phase sessions removed',report.sessionsRemaining===0&&report.cleanupErrors.length===0);save()
      }
    }
  }finally{const afterFunctions=functions();write('purchase-functions-after.json',afterFunctions)
    assert('Every public/private production function definition/catalog/ACL unchanged',same(beforeFunctions,afterFunctions));save()}
  check('receiving/purchase multi-SKU schedules satisfy all archived assertions',assertions.every(a=>a.passed),
    JSON.stringify({passed:assertions.filter(a=>a.passed).length,failed:assertions.filter(a=>!a.passed)}))
}
