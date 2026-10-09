// IDEA10. Runs only inside the caller's owned disposable application-schema clone.
import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { signedAdminCommandArguments } from '../server/admin-bff/security.js'
const witnessBytes=fs.readFileSync(fileURLToPath(import.meta.url))
export const currentWriterWitnessSha256=createHash('sha256').update(witnessBytes).digest('hex')

export async function rehearseCurrentWriterConcurrency({sync,value,check,fixture,guestPayload,guestCall,
  actor,literal,source,withoutTransaction,session,controller,blockedBy,waitFor,invariant,
  completed,evidence,beforeRecountLockFix,writerWitnessFailure,recountInitialization,writerReverse,writerControllerFailure,postReceiving}) {
  const bytes=witnessBytes
  const hash=content=>createHash('sha256').update(content).digest('hex')
  fs.writeFileSync(path.join(evidence,'executed-writer-module.mjs'),bytes)
  const signatures=[
    'public.execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)',
    'public.set_order_request_payment_status(uuid,text,text,jsonb)',
    'public.confirm_order_request(uuid,text)',
    'public.fulfill_order_request(uuid,text)'
  ]
  const capture=()=>JSON.parse(value(`select jsonb_agg(jsonb_build_object(
    'signature',oid::regprocedure::text,'definition',pg_get_functiondef(oid),
    'body',prosrc,'bodyMd5',md5(prosrc),'catalog',to_jsonb(p)-'prosrc') order by oid)::text
    from pg_proc p where oid in (${signatures.map(s=>`${literal(s)}::regprocedure`).join(',')});`))
  fs.writeFileSync(path.join(evidence,'installed-functions-before.json'),JSON.stringify(capture(),null,2)+'\n')
  const originalCapture=capture()
  if(postReceiving)check('post-receiving writer uses exact compatibility-corrected signed recount body without reinstalling its predecessor',
    originalCapture.find(fn=>fn.signature.startsWith('execute_admin_lot'))?.bodyMd5==='6690b0ab5cf99a74a5f7e8ad7bafd8d0')
  if(!beforeRecountLockFix&&!postReceiving) {
    const migration=source('supabase/migrations/20261002102000_signed_recount_balance_lock_order.sql')
    sync(migration)
    const installed=capture()
    sync(migration)
    check('guarded recount correction preserves all non-body catalog metadata and unrelated writers, and replays',
      JSON.stringify(capture())===JSON.stringify(installed)&&installed.every((fn,i)=>
        JSON.stringify(fn.catalog)===JSON.stringify(originalCapture[i].catalog)&&
        (fn.signature.startsWith('execute_admin_lot')?fn.bodyMd5==='c1916e00eb4b0e041ec81e49bd2cb0bf':fn.body===originalCapture[i].body)))
    const current=installed.find(fn=>fn.signature.startsWith('execute_admin_lot'))
    const lotSignature='public.execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)'
    const predicate='k2_private.lot_is_eligible_v1(public.product_batches)'
    const drifts=[`alter function ${lotSignature} strict;`,`alter function ${lotSignature} leakproof;`,
      `alter function ${lotSignature} parallel safe;`,`alter function ${lotSignature} set search_path='public';`,
      `grant execute on function ${lotSignature} to anon;`,`revoke execute on function ${lotSignature} from authenticated;`,
      `alter function ${lotSignature} security invoker;`,`alter function ${lotSignature} cost 101;`,
      current.definition.replace(current.body,()=>current.body+'\n-- unknown body revision\n')+';',
      `alter function ${predicate} strict;`,`grant execute on function ${predicate} to authenticated;`]
    for(const [i,drift] of drifts.entries()) {
      let refusal=false
      try {sync(`begin; ${drift} ${withoutTransaction(migration)} rollback;`)}
      catch(error){refusal=/MAP-023 recount: unfamiliar/.test(error.message)}
      check(`recount installation refuses drift ${i+1} with exact function rollback`,refusal&&JSON.stringify(capture())===JSON.stringify(installed))
    }
    fs.writeFileSync(path.join(evidence,'installed-functions-after.json'),JSON.stringify(installed,null,2)+'\n')
  }
  sync(`create function k2_stock_fixture.before_balance_statement() returns trigger language plpgsql as $$ begin
    if current_setting('k2.fixture.before_balance_statement',true)='on' then
      perform set_config('k2.fixture.balance_statement_count',
        (coalesce(nullif(current_setting('k2.fixture.balance_statement_count',true),''),'0')::int+1)::text,true);
      if current_setting('k2.fixture.balance_statement_count')::int=${beforeRecountLockFix?1:2} then
        perform pg_advisory_xact_lock(61001,5); end if;
    end if; return null; end $$;
    create trigger local_before_balance_statement before insert on public.inventory_balances
    for each statement execute function k2_stock_fixture.before_balance_statement();`)
  const reviewer='42000000-0000-4000-8000-000000000002'
  const admin=(action,payload,who=actor,lot=false,key=randomUUID())=>{
    const a=signedAdminCommandArguments(action,who,key,payload)
    return `select set_config('request.jwt.claim.sub','${who}',false);
      select set_config('request.jwt.claims','{"aal":"aal2"}',false); set role authenticated;
      select public.${lot?'execute_admin_lot_command_v1':'execute_admin_fulfillment_command_v1'}(${[
        'p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'
      ].map(k=>literal(a[k])).join(',')});`
  }
  const paymentPayload=(id,toStatus,extra={})=>({orderRequestId:id,toStatus,
    evidenceNote:'Synthetic concurrency independent review',...JSON.parse(value(`select jsonb_build_object(
      'expectedPaymentStatus',payment_status,'expectedUpdatedAt',updated_at)::text
      from public.order_requests where id='${id}';`)),...extra})
  if(writerControllerFailure) {
    const report={synthetic:true,providerWrites:false,sourceSha256:hash(bytes),cases:[]}
    try {
      for(const [name,sql,inject,expected] of [
        ['after gate acquisition','',true,'INJECTED_CONTROLLER_SETUP_FAILURE'],
        ['readiness deadline during query','select pg_sleep(30);',false,'BARRIER_NOT_OBSERVED: controller owns gate']
      ]) {
        const item={name};report.cases.push(item)
        try {const gate=await controller(sql,inject);await gate.release()}catch(error){item.error=error.message}
        item.controllers=JSON.parse(value(`select coalesce(jsonb_agg(jsonb_build_object('name',application_name,
          'state',state,'inTransaction',xact_start is not null)),'[]'::jsonb)::text from pg_stat_activity
          where datname=current_database() and application_name like 'k2_stock_gate_%';`))
        check(`controller setup ${name} retains its cause and closes owned session before outer cleanup`,
          item.error===expected&&item.controllers.length===0)
      }
    }finally{fs.writeFileSync(path.join(evidence,'controller-setup.json'),JSON.stringify(report,null,2)+'\n')}
    return
  }
  if(recountInitialization) {
    const reports=[]
    const tables=['public.products','public.product_batches','public.inventory_balances',
      'public.inventory_reservations','public.batch_change_events','public.inventory_events',
      'public.order_requests','public.order_request_items','public.orders','public.order_request_events',
      'public.packing_scan_events','public.coupons','public.coupon_redemptions',
      'k2_private.admin_command_receipts','k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets',
      'k2_stock_fixture.seed_observations']
    const snapshot=()=>JSON.parse(value(`select jsonb_build_object(${tables.map(table=>
      `${literal(table)},(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from ${table} t)`
    ).join(',')})::text;`))
    const business=s=>Object.fromEntries(Object.entries(s).filter(([table])=>
      !['k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets'].includes(table)))
    const save=()=>fs.writeFileSync(path.join(evidence,'recount-initialization.json'),JSON.stringify({
      idea:'IDEA-20261002-10',sourceSha256:hash(bytes),synthetic:true,providerWrites:false,beforeRecountLockFix,
      scope:'Actual signed recount initialization, failure and retry after composed current preparation; no native CSV, provider or all-writer acceptance',reports
    },null,2)+'\n')
    sync(`create table k2_stock_fixture.seed_observations(sku text,on_hand integer,reserved integer);
      create function k2_stock_fixture.observe_balance_seed() returns trigger language plpgsql as $$ begin
        if current_setting('k2.fixture.observe_seed',true)='on' then
          insert into k2_stock_fixture.seed_observations values(new.sku,new.on_hand,new.reserved);
          if current_setting('k2.fixture.fail_seed',true)='on' then
            raise exception 'K2_FIXTURE_SEED_WRITE_FAILURE'; end if;
        end if; return new; end $$;
      create trigger local_observe_balance_seed after insert on public.inventory_balances
      for each row execute function k2_stock_fixture.observe_balance_seed();`)
    const observations=f=>JSON.parse(value(`select coalesce(jsonb_agg(to_jsonb(s) order by on_hand,reserved),'[]'::jsonb)::text
      from k2_stock_fixture.seed_observations s where sku=${literal(f.sku)};`))
    const lot=(id,quantity,status='available')=>({id,boxCode:'LOCAL',batchCode:'LOCAL',quantity,
      expiryDate:value("select (current_date+180)::text;"),landedDate:'',hub:'HUB-MNL-CENTRAL',
      custodian:'CUST-STAFF-ELENA',channel:'website',pinned:false,status})
    const prepare=(suffix,reserve=false)=>{
      const f=fixture(`seed-${suffix}-${randomUUID().slice(0,8)}`,2)
      sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA' where id='${f.lot}';`)
      if(reserve) {
        const purchase=guestPayload(f)
        check(`${suffix} seed fixture has a real signed synthetic hold`,value(`set role anon;
          select ok from ${guestCall(purchase,'192.0.2.245')};`)==='t')
        f.purchaseId=value(`select id from public.order_requests where idempotency_key=${literal(purchase.idempotencyKey)};`)
      }
      return f
    }
    const call=(payload,key=randomUUID(),fail=false)=>value(`set k2.fixture.observe_seed='on';
      ${fail?"set k2.fixture.fail_seed='on';":''}${admin('lots_reconcile',payload,actor,true,key)}`)
    let current
    try {
      const f=prepare('reserved',true),second=randomUUID(),key=randomUUID()
      sync(`insert into public.product_batches(id,sku,box_code,batch_code,quantity,quantity_available,reserved_quantity,
        inventory_status,expiry_date,best_before_date,hub,custodian) values('${second}',${literal(f.sku)},'LOCAL','DAMAGED',
        3,0,0,'damaged',current_date+180,current_date+180,'HUB-MNL-CENTRAL','CUST-STAFF-ELENA');
        delete from public.inventory_balances where sku=${literal(f.sku)};`)
      current={case:'saved physical and reserved seed before changed recount',fixture:f};reports.push(current)
      current.balanceAbsentBefore=value(`select not exists(select 1 from public.inventory_balances where sku=${literal(f.sku)});`)==='t'
      const payload={sku:f.sku,reason:'Synthetic saved seed versus incoming recount',lots:[lot(f.lot,4),lot(second,3,'damaged')]}
      current.result=JSON.parse(call(payload,key));current.observed=observations(f);current.counters=invariant(f)
      check('missing balance seeds saved physical 5 and reserved 1 before incoming physical 7',
        current.balanceAbsentBefore&&current.observed.length===1&&current.observed[0].on_hand===5&&current.observed[0].reserved===1)
      check('recount keeps one attributed hold and excludes damaged stock from sellable cache',current.counters==='7/1|4/1|3|1'
        &&value(`select count(*)=1 and sum(quantity)=1 from public.inventory_reservations
          where order_request_id='${f.purchaseId}' and status='active';`)==='t')
      const beforeRetry=snapshot();call(payload,key);current.retryUnchanged=JSON.stringify(business(snapshot()))===JSON.stringify(business(beforeRetry))
      check('missing balance recount fresh-signature same-key retry has no second stock or audit effect',current.retryUnchanged)

      const empty=prepare('empty')
      sync(`delete from public.product_batches where id='${empty.lot}'; delete from public.inventory_balances where sku=${literal(empty.sku)};
        select set_config('k2.allow_stock_write','on',false);update public.products set stock_available=0,total_stock=0 where sku=${literal(empty.sku)};`)
      current={case:'zero saved lots before new lot',fixture:empty};reports.push(current)
      current.result=JSON.parse(call({sku:empty.sku,reason:'Synthetic zero saved lot initialization',lots:[lot(null,4)]}))
      current.observed=observations(empty)
      check('zero saved lots initializes zero physical and reserved before new physical lot',current.observed.length===1
        &&current.observed[0].on_hand===0&&current.observed[0].reserved===0
        &&value(`select on_hand=4 and reserved=0 from public.inventory_balances where sku=${literal(empty.sku)};`)==='t'
        &&current.result.physicalQuantity===4&&current.result.sellableQuantity===4)

      const existing=prepare('existing',true)
      current={case:'existing balance preserves reserved units',fixture:existing};reports.push(current)
      current.before=JSON.parse(value(`select to_jsonb(b)::text from public.inventory_balances b where sku=${literal(existing.sku)};`))
      call({sku:existing.sku,reason:'Synthetic existing balance preservation',lots:[lot(existing.lot,5)]})
      current.observed=observations(existing);current.counters=invariant(existing)
      check('existing balance is not replaced and its reserved unit survives changed physical recount',current.observed.length===0
        &&current.before.on_hand===2&&current.before.reserved===1&&current.counters==='5/1|5/1|4|1')

      const failed=prepare('failure',true)
      sync(`delete from public.inventory_balances where sku=${literal(failed.sku)};`)
      const valid={sku:failed.sku,reason:'Synthetic missing balance failure rollback',lots:[lot(failed.lot,2)]}
      const missing={...valid};delete missing.sku
      const failures=[['missing SKU',missing,false,'K2_ADMIN_PAYLOAD_INVALID'],
        ['blank SKU',{...valid,sku:'   '},false,'K2_ADMIN_PAYLOAD_INVALID'],
        ['unknown SKU',{...valid,sku:'LOCAL-NONEXISTENT-'+randomUUID(),lots:[]},false,'K2_ADMIN_PAYLOAD_INVALID'],
        ['below reserved after seed',{...valid,lots:[lot(failed.lot,0)]},false,'K2_LOT_RESERVED_CONFLICT'],
        ['omitted saved lot after seed',{...valid,lots:[]},false,'K2_ADMIN_PAYLOAD_INVALID'],
        ['injected seed-write failure',valid,true,'K2_FIXTURE_SEED_WRITE_FAILURE']]
      for(const [name,payload,fail,message] of failures) {
        current={case:name};reports.push(current);current.before=snapshot()
        try {call(payload,randomUUID(),fail)}catch(error){current.refused=error.message.includes(message);current.error=error.message}
        current.after=snapshot();current.exactRollback=JSON.stringify(current.after)===JSON.stringify(current.before)
        check(`${name} refuses and rolls back stock, reservations, audit, receipt, nonce and rate rows`,current.refused&&current.exactRollback)
      }
      const recoveryKey=randomUUID()
      current={case:'same-key recovery after seed failure'};reports.push(current);current.before=snapshot()
      try {call(valid,recoveryKey,true)}catch(error){current.refused=error.message.includes('K2_FIXTURE_SEED_WRITE_FAILURE')}
      current.failedState=snapshot()
      check('failed seed leaves same-key retry free of partial receipt and controls',current.refused
        &&JSON.stringify(current.failedState)===JSON.stringify(current.before))
      current.result=JSON.parse(call(valid,recoveryKey));current.observed=observations(failed);current.counters=invariant(failed)
      check('fresh-signature same-key retry after seed failure commits exactly one physical balance and hold',
        current.observed.length===1&&current.observed[0].on_hand===2&&current.observed[0].reserved===1
        &&current.counters==='2/1|2/1|1|1')
    }catch(error){if(current)current.assertionError=error.message;throw error}
    finally {save()}
    return
  }
  const reports=[]
  const save=()=>fs.writeFileSync(path.join(evidence,'writer-races.json'),JSON.stringify({idea:'IDEA-20261002-10',
    sourceSha256:hash(bytes),synthetic:true,providerWrites:false,beforeRecountLockFix,writerWitnessFailure,writerReverse,postReceiving,
    scope:'Actual current owner-only underlying writers with staff/AAL2 claims versus signed recount; no authenticated/provider reachability or all-writer acceptance',reports},null,2)+'\n')
  if(writerReverse)sync(`create function k2_stock_fixture.before_reservation_statement() returns trigger language plpgsql as $$ begin
    if current_setting('k2.fixture.before_reservation_statement',true)='on' then
      perform pg_advisory_xact_lock(61001,5); end if; return null; end $$;
    create trigger local_before_reservation_statement before update on public.inventory_reservations
    for each statement execute function k2_stock_fixture.before_reservation_statement();
    create function k2_stock_fixture.before_orders_statement() returns trigger language plpgsql as $$ begin
    if current_setting('k2.fixture.before_orders_statement',true)='on' then
      perform pg_advisory_xact_lock(61001,5); end if; return null; end $$;
    create trigger local_before_orders_statement before insert on public.orders
    for each statement execute function k2_stock_fixture.before_orders_statement();`)
  for(const phase of ['payment','confirmation','handover']) {
    const report={phase,error:null,outcomes:[],cleanupErrors:[]};reports.push(report)
    let gate,released=false,recount,writer
    const suffix=randomUUID().slice(0,8)
    const recountName=`k2_current_recount_${phase}_${suffix}`,writerName=`k2_current_writer_${phase}_${suffix}`
    try {
      const f=fixture(`recount-${phase}-${suffix}`,2)
      report.fixture=f
      sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA' where id='${f.lot}';`)
      let couponCode=''
      if(writerReverse) {
        report.couponId=randomUUID();couponCode=`LOCAL-REVERSE-${suffix}`
        sync(`insert into public.coupons(id,code,discount_type,discount_value,is_active,max_redemptions)
          values('${report.couponId}',${literal(couponCode)},'fixed',10,true,1);`)
      }
      const purchase=guestPayload(f,{shippingAmount:95,shippingQuoteStatus:'customer_confirmed',couponCode})
      check(`${phase} concurrency fixture accepts signed purchase`,value(`set role anon;
        select ok from ${guestCall(purchase,'192.0.2.244')};`)==='t')
      const id=value(`select id from public.order_requests where idempotency_key=${literal(purchase.idempotencyKey)};`)
      report.orderId=id
      value(admin('payment_status',paymentPayload(id,'awaiting_instructions')))
      value(admin('payment_status',paymentPayload(id,'evidence_submitted',{paymentMethod:'gcash',
        paymentAmount:writerReverse?185:195,paymentCurrency:'PHP',payerName:'Synthetic payer',paymentReference:'SYNTHETIC-RACE'})))
      if(phase==='handover'||phase==='confirmation'&&!writerReverse)
        value(admin('payment_status',paymentPayload(id,'verified'),reviewer))
      if(phase==='handover') {
        value(admin('confirm_order',{orderRequestId:id,reason:'Synthetic valid race confirmation'}))
        const reservation=value(`select id from public.inventory_reservations where order_request_id='${id}';`)
        value(admin('packing_scan',{orderRequestId:id,scannedCode:f.sku,reservationId:reservation,lotConfirmed:true}))
      }
      check('current legacy item model is per-item orders plus request items, without an order_items table',
        value("select to_regclass('public.order_items') is null;")==='t')
      report.legacyItemModel='Legacy per-item public.orders; canonical public.order_request_items; public.order_items absent'
      const fullTables={orders:`order_request_id='${id}'`,
        order_request_items:`order_request_id='${id}'`,packing_scan_events:`order_request_id='${id}'`,
        coupons:`id in (select coupon_id from public.order_requests where id='${id}')`,
        coupon_redemptions:`order_request_id='${id}'`}
      const protectedTables=['public.consignments','public.consignment_items','public.consignment_scan_events',
        'public.hubs','public.custodians','public.channel_listings','k2_private.guest_request_nonces','k2_private.guest_rate_buckets']
      const snapshot=()=>JSON.parse(value(`select jsonb_build_object(
        'order',(select to_jsonb(o) from public.order_requests o where id='${id}'),
        'product',(select to_jsonb(p) from public.products p where sku=${literal(f.sku)}),
        'lot',(select to_jsonb(b) from public.product_batches b where id='${f.lot}'),
        'balance',(select to_jsonb(b) from public.inventory_balances b where sku=${literal(f.sku)}),
        'reservations',(select jsonb_agg(to_jsonb(r) order by id) from public.inventory_reservations r where sku=${literal(f.sku)}),
        'batchEvents',(select jsonb_agg(to_jsonb(e) order by id) from public.batch_change_events e where sku=${literal(f.sku)}),
        'inventoryEvents',(select jsonb_agg(to_jsonb(e) order by id) from public.inventory_events e where sku=${literal(f.sku)}),
        'orderEvents',(select jsonb_agg(to_jsonb(e) order by id) from public.order_request_events e where order_request_id='${id}'),
        'receipts',(select jsonb_agg(to_jsonb(e) order by actor_id,action,idempotency_key) from k2_private.admin_command_receipts e),
        'nonces',(select jsonb_agg(to_jsonb(e) order by actor_id,action,nonce) from k2_private.admin_request_nonces e),
        'rates',(select jsonb_agg(to_jsonb(e) order by scope,subject,bucket_start) from k2_private.admin_request_rate_buckets e),
        ${Object.entries(fullTables).map(([table,filter])=>`${literal(table)},(select jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text) from public.${table} t where ${filter})`).join(',')},
        'otherTableHashes',jsonb_build_object(${Object.entries(fullTables).map(([table,filter])=>`${literal(table)},(select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from public.${table} t where (${filter}) is not true)`).join(',')})
        ${postReceiving?`, 'protectedTableHashes',jsonb_build_object(${protectedTables.map(table=>`${literal(table)},
          (select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from ${table} t)`).join(',')})`:''}
      )::text;`))
      const expiry=value(`select expiry_date::text from public.product_batches where id='${f.lot}';`)
      const payload={sku:f.sku,reason:'Synthetic existing-order concurrency recount',lots:[{
        id:f.lot,boxCode:'LOCAL',batchCode:'LOCAL',quantity:writerReverse&&phase==='handover'?1:2,expiryDate:expiry,landedDate:'',
        hub:'HUB-MNL-CENTRAL',custodian:'CUST-STAFF-ELENA',channel:'website',pinned:false,status:'available'
      }]}
      if(postReceiving)value(admin('lots_reconcile',{...payload,reason:'Synthetic prior immutable recount history',
        lots:payload.lots.map(lot=>({...lot,quantity:2}))},actor,true))
      report.before=snapshot()
      gate=await controller()
      report.gate=gate.name
      const key=randomUUID()
      report.recountKey=key
      const probe=(table='inventory_balances')=>{
        try {sync(`begin; select 1 from public.${table} where sku=${literal(f.sku)}
          ${table==='inventory_balances'?"and location_code='MANILA_MAIN'":''} for update nowait; rollback;`);return {available:true}}
        catch(error){if(!/could not obtain lock on row/.test(error.message))throw error;return {available:false,error:error.message}}
      }
      const raw=phase==='payment'
        ?`select to_jsonb(public.set_order_request_payment_status('${id}','verified','Synthetic owner-only independent review','{}'::jsonb));`
        :phase==='confirmation'?`select to_jsonb(public.confirm_order_request('${id}','Synthetic current underlying confirmation'));`
        :`select to_jsonb(public.fulfill_order_request('${id}','Synthetic current underlying handover'));`
      const writerSql=`select set_config('request.jwt.claim.sub','${phase==='payment'?reviewer:actor}',false);
        select set_config('request.jwt.claims','{"aal":"aal2"}',false); ${raw}`
      if(writerReverse) {
        const barrier=phase==='confirmation'?'before_orders_statement':'before_reservation_statement'
        report.writerBarrier=barrier
        writer=session(writerName,`begin; set local k2.fixture.${barrier}='on'; ${writerSql} commit;`)
        report.launched=[writerName]
        await waitFor(blockedBy(writerName,gate.name),'current writer stopped after balance and lot locks, before product access')
        report.beforeRecount={balance:probe(),product:probe('products'),lot:probe('product_batches')}
        recount=session(recountName,`begin; ${admin('lots_reconcile',payload,actor,true,key)} commit;`)
        report.launched.push(recountName)
        await waitFor(blockedBy(recountName,writerName),'signed recount waits behind current writer')
        report.duringWait={balance:probe(),product:probe('products'),lot:probe('product_batches')}
      }else {
        recount=session(recountName,`begin; set local k2.fixture.before_balance_statement='on'; ${admin('lots_reconcile',payload,actor,true,key)} commit;`)
        report.launched=[recountName]
        await waitFor(blockedBy(recountName,gate.name),'recount stopped at balance insert statement')
        if(writerWitnessFailure)throw Error('INJECTED_WITNESS_FAILURE_AFTER_RECOUNT_LAUNCH')
        report.balanceBeforeWriter=probe()
        writer=session(writerName,writerSql)
        report.launched.push(writerName)
        await waitFor(blockedBy(writerName,recountName),'current writer waits behind recount')
      }
      report.balanceDuringWait=probe()
      report.waits=JSON.parse(value(`select jsonb_agg(jsonb_build_object('name',application_name,'pid',pid,
        'waitType',wait_event_type,'wait',wait_event,'blockers',pg_blocking_pids(pid)) order by application_name)::text
        from pg_stat_activity where application_name in (${[recountName,writerName,gate.name].map(literal).join(',')});`))
      await gate.release();released=true
      report.outcomes=await Promise.all([recount,writer])
      report.after=snapshot();report.counters=invariant(f)
      report.deadlock=report.outcomes.some(x=>/deadlock detected/.test(x.stderr))
      report.bothSucceeded=report.outcomes.every(x=>x.status===0)
      if(!beforeRecountLockFix) {
        check(`${phase} ${writerReverse?'writer owns balance and lot before recount without taking product':'recount owns the balance before the writer'} and preserves accepted charge and unrelated records`,
          (writerReverse?!report.beforeRecount.balance.available&&!report.beforeRecount.lot.available&&report.beforeRecount.product.available
            &&['balance','product','lot'].every(name=>report.beforeRecount[name].available===report.duringWait[name].available)
            :!report.balanceBeforeWriter.available&&!report.balanceDuringWait.available)
          &&report.counters===(phase==='handover'?'1/0|1/0|1|0':'2/1|2/1|1|1')
          &&report.after.order.total_amount===report.before.order.total_amount
          &&report.after.order.shipping_amount===report.before.order.shipping_amount
          &&JSON.stringify(report.after.otherTableHashes)===JSON.stringify(report.before.otherTableHashes)
          &&(!postReceiving||[report.before.protectedTableHashes,report.after.protectedTableHashes].every(map=>map
            &&Object.keys(map).sort().join('|')===[...protectedTables].sort().join('|')
            &&Object.values(map).every(hash=>typeof hash==='string'&&/^[a-f0-9]{32}$/.test(hash)))
            &&JSON.stringify(report.after.protectedTableHashes)===JSON.stringify(report.before.protectedTableHashes)))
        if(postReceiving)check(`${phase} post-receiving schedules preserve genuine prior immutable history in both starting orders`,
          report.before.batchEvents?.length>=1&&report.after.batchEvents.length===report.before.batchEvents.length+1
          &&['inventoryEvents','batchEvents','orderEvents'].every(table=>(report.before[table]??[]).every(old=>
            (report.after[table]??[]).some(saved=>saved.id===old.id&&JSON.stringify(saved)===JSON.stringify(old)))))
        if(postReceiving&&!writerReverse)check(`${phase} forward post-receiving schedule preserves exact commitment attribution and immutable history`,
          report.after.reservations?.length===1&&report.after.reservations[0].committed_at
          &&report.after.reservations[0].committed_by===reviewer&&report.after.reservations[0].commit_cause==='payment_verification'
          &&(phase==='payment'||['committed_at','committed_by','commit_cause'].every(field=>
            report.after.reservations[0][field]===report.before.reservations[0][field]))
          &&report.after.inventoryEvents.filter(e=>e.event_type==='stock_committed').length===1
          &&report.after.inventoryEvents.filter(e=>e.event_type==='fulfilled').length===(phase==='handover'?1:0)
          &&report.after.batchEvents.length===(report.before.batchEvents?.length??0)+1
          &&['inventoryEvents','batchEvents','orderEvents'].every(table=>(report.before[table]??[]).every(old=>
            (report.after[table]??[]).some(saved=>saved.id===old.id&&JSON.stringify(saved)===JSON.stringify(old))))
          &&(report.after.coupons??[]).length===0&&(report.after.coupon_redemptions??[]).length===0)
        if(writerReverse)check(`${phase} reverse schedule preserves coupon, one attributable commitment and audit effects`,
          report.after.order.total_amount===185&&report.after.order.discount_amount===10
          &&report.after.coupons.length===1&&report.after.coupons[0].redemption_count===(phase==='payment'?0:1)
          &&(report.after.coupon_redemptions??[]).length===(phase==='payment'?0:1)
          &&(phase==='payment'||report.after.coupon_redemptions[0].status===(phase==='handover'?'redeemed':'reserved'))
          &&report.after.reservations.length===1&&report.after.reservations[0].committed_at
          &&report.after.reservations[0].committed_by===(phase==='confirmation'?actor:reviewer)
          &&report.after.reservations[0].commit_cause===(phase==='confirmation'?'confirmation':'payment_verification')
          &&report.after.inventoryEvents.filter(x=>x.event_type==='stock_committed').length===1
          &&report.after.inventoryEvents.filter(x=>x.event_type==='fulfilled').length===(phase==='handover'?1:0)
          &&report.after.batchEvents.length===(report.before.batchEvents?.length??0)+1)
        const beforeRefusal=snapshot()
        const bad={...payload,lots:payload.lots.map(lot=>phase==='handover'?{...lot,id:randomUUID()}:{...lot,quantity:0})}
        let refused=false
        try {value(admin('lots_reconcile',bad,actor,true))}
        catch(error){refused=/K2_LOT_RESERVED_CONFLICT|K2_ADMIN_PAYLOAD_INVALID/.test(error.message)}
        const afterRefusal=snapshot()
        report.refusal={payload:bad,before:beforeRefusal,after:afterRefusal,refused}
        check(`${phase} invalid recount rolls back exact business, coupon, audit and signed controls`,refused&&JSON.stringify(afterRefusal)===JSON.stringify(beforeRefusal))
        const beforeReplay=snapshot()
        value(admin('lots_reconcile',payload,actor,true,key))
        const afterReplay=snapshot()
        report.replay={payload,key,before:beforeReplay,after:afterReplay}
        // A fresh valid retry adds nonce/rate controls, but no business/audit/receipt effect.
        const business=s=>{const {nonces,rates,...rest}=s;return rest}
        check(`${phase} freshly signed same-key recount retry preserves exact business and audit history`,
          JSON.stringify(business(afterReplay))===JSON.stringify(business(beforeReplay)))
        report.postChecks={refused,replayBusinessUnchanged:JSON.stringify(business(afterReplay))===JSON.stringify(business(beforeReplay))}
      }
    }catch(error){report.error=error.message}
    finally {
      if(report.error&&report.launched?.length) {
        try {sync(`select pg_cancel_backend(pid) from pg_stat_activity where datname=current_database()
          and application_name in (${report.launched.map(literal).join(',')});`)}catch(error){report.cleanupErrors.push(error.message)}
      }
      if(gate&&!released){try{await gate.release();released=true}catch(error){report.cleanupErrors.push(error.message)}}
      report.outcomes=await Promise.all([recount,writer].filter(Boolean))
      for(const name of report.launched??[])completed.delete(name)
      try {report.sessionsRemaining=Number(value(`select count(*) from pg_stat_activity where datname=current_database()
        and application_name in (${[recountName,writerName,...(gate?[gate.name]:[])].map(literal).join(',')});`))}
      catch(error){report.cleanupErrors.push(error.message)}
      save()
    }
    if(report.error)throw Error(report.error)
    check(`${phase} witness retains terminal outcomes and removes phase sessions`,report.outcomes.length===2&&report.sessionsRemaining===0&&report.cleanupErrors.length===0)
  }
  check('current writers and signed recount serialize without deadlock',reports.every(r=>r.bothSucceeded&&!r.deadlock))
}
