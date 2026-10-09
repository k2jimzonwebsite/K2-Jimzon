// IDEA10. Actual functions in the caller's UUID-owned restore clone only.
import fs from 'node:fs'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {signedAdminCommandArguments} from '../server/admin-bff/security.js'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
export const lotCompatibilityWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export async function rehearseLotCompatibility({sync,value,check,fixture,guestPayload,guestCall,literal,source,
  withoutTransaction,evidence,beforeLotCompatFix}) {
  fs.writeFileSync(path.join(evidence,'executed-compatibility-module.mjs'),bytes)
  // This mode does not execute or overwrite the earlier release matrix.
  sync(source('supabase/migrations/20261002124500_release_lot_eligibility.sql'))
  const signatures=['public.execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)',
    'public.sync_product_batch_compat_columns()','k2_private.lot_is_eligible_v1(public.product_batches)',
    'public.finalize_consignment_receipt(uuid,text)']
  const capture=()=>JSON.parse(value(`select jsonb_agg(jsonb_build_object('signature',oid::regprocedure::text,
    'definition',pg_get_functiondef(oid),'body',prosrc,'bodyMd5',md5(replace(prosrc,chr(13),'')),
    'catalog',to_jsonb(p)-'prosrc') order by oid)::text from pg_proc p
    where oid in (${signatures.map(s=>`${literal(s)}::regprocedure`).join(',')});`))
  const boundary=()=>value(`select jsonb_build_object('wrapper',to_jsonb(p),'view',to_jsonb(c),
    'viewBody',pg_get_viewdef(c.oid,true),'triggers',(select jsonb_agg(to_jsonb(t) order by oid) from pg_trigger t
      where tgrelid='public.product_batches'::regclass and not tgisinternal))::text
    from pg_proc p cross join pg_class c where p.oid='public.get_public_product_stock()'::regprocedure
      and c.oid='public.v_product_stock_from_batches'::regclass;`)
  const tables=['public.products','public.product_batches','public.inventory_balances','public.inventory_reservations',
    'public.batch_change_events','public.inventory_events','public.order_requests','public.order_request_items',
    'public.orders','public.order_request_events','public.coupons','public.coupon_redemptions',
    'public.consignments','public.consignment_items','public.consignment_scan_events','public.audit_logs',
    'k2_private.admin_command_receipts','k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets',
    'k2_private.guest_request_nonces','k2_private.guest_rate_buckets']
  const snapshot=()=>JSON.parse(value(`select jsonb_build_object(${tables.map(t=>`${literal(t)},
    (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by to_jsonb(x)::text),'')) from ${t} x)`).join(',')})::text;`))
  const business=s=>Object.fromEntries(Object.entries(s).filter(([t])=>!t.includes('request_nonces')&&!t.includes('rate_buckets')))
  const original=capture(),publicBefore=boundary()
  fs.writeFileSync(path.join(evidence,'composed-functions-before.json'),JSON.stringify(original,null,2)+'\n')
  fs.writeFileSync(path.join(evidence,'public-trigger-boundary-before.json'),publicBefore+'\n')
  const auditBoundary=()=>value(`select jsonb_build_object(
    'triggers',(select coalesce(jsonb_agg(to_jsonb(t) order by oid),'[]') from pg_trigger t
      where tgrelid='public.batch_change_events'::regclass and not tgisinternal),
    'rules',(select coalesce(jsonb_agg(to_jsonb(r) order by oid),'[]') from pg_rewrite r
      where ev_class='public.batch_change_events'::regclass))::text;`)
  const auditBefore=auditBoundary()
  fs.writeFileSync(path.join(evidence,'audit-consumers-before.json'),auditBefore+'\n')
  // Preserve one actually stale sibling before candidate installation. Its
  // physical units remain attributable; its cache must not inflate sale units.
  const stale=fixture(`compat-stale-sibling-${randomUUID().slice(0,8)}`,2),sibling=randomUUID()
  sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA',
    expiry_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+60,
    best_before_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+60 where id='${stale.lot}';
    insert into public.product_batches(id,sku,box_code,batch_code,quantity,quantity_available,reserved_quantity,
      inventory_status,expiry_date,best_before_date) values('${sibling}',${literal(stale.sku)},'LOCAL','STALE',3,3,0,
      'available',(transaction_timestamp() at time zone 'Asia/Manila')::date+180,
      (transaction_timestamp() at time zone 'Asia/Manila')::date+180);
    update public.inventory_balances set on_hand=5 where sku=${literal(stale.sku)} and location_code='MANILA_MAIN';`)
  if(!beforeLotCompatFix) {
    const migration=source('supabase/migrations/20261002140500_lot_compatibility_eligibility.sql'),before=snapshot()
    sync(migration)
    const installed=capture()
    check('compatibility installation preserves full non-body catalogs, boundary and business state',
      installed.every((f,i)=>JSON.stringify(f.catalog)===JSON.stringify(original[i].catalog))&&boundary()===publicBefore
      &&JSON.stringify(snapshot())===JSON.stringify(before))
    sync(migration)
    check('compatibility preparation replays with exact bodies and no state effect',
      JSON.stringify(capture())===JSON.stringify(installed)&&JSON.stringify(snapshot())===JSON.stringify(before))
    fs.writeFileSync(path.join(evidence,'composed-functions-after.json'),JSON.stringify(installed,null,2)+'\n')
    const command=installed.find(f=>f.catalog.proname==='execute_admin_lot_command_v1')
    const trigger=installed.find(f=>f.catalog.proname==='sync_product_batch_compat_columns')
    const cmd=signatures[0],trg=signatures[1],helper=signatures[2]
    const unknown=f=>f.definition.replace(f.body,()=>f.body+'\n-- unreviewed body\n')+';'
    const cases=[
      ['trigger',`alter function ${trg} strict;`],['trigger',`alter function ${trg} security definer;`],
      ['trigger',`grant execute on function ${trg} to anon;`],['trigger',`alter function ${trg} parallel safe;`],
      ['trigger',unknown(trigger)],
      ['command',`alter function ${cmd} strict;`],['command',`alter function ${cmd} leakproof;`],
      ['command',`alter function ${cmd} parallel safe;`],['command',`alter function ${cmd} set search_path='public';`],
      ['command',`alter function ${cmd} cost 101;`],['command',`alter function ${cmd} security invoker;`],
      ['command',`grant execute on function ${cmd} to anon;`],['command',`revoke execute on function ${cmd} from authenticated;`],
      ['command',unknown(command)],['private predicate',`alter function ${helper} strict;`],
      ['private predicate',`grant execute on function ${helper} to authenticated;`],
      ['trigger binding','alter table public.product_batches disable trigger trg_sync_product_batch_compat_columns;'],
      ['audit consumers',`create function k2_stock_fixture.compat_consumer() returns trigger language plpgsql as $$begin return new;end$$;
        create trigger local_compat_consumer after insert on public.batch_change_events for each row execute function k2_stock_fixture.compat_consumer();`],
      ['audit consumers',`create rule local_compat_consumer as on insert to public.batch_change_events do also notify local_compat_consumer;`],
      ['command',`${original.find(f=>f.catalog.proname==='sync_product_batch_compat_columns').definition};alter function ${cmd} strict;`]
    ]
    const drifts=[]
    for(const [i,[expected,sql]] of cases.entries()) {
      let error='';try{sync(`begin;${sql}${withoutTransaction(migration)}rollback;`)}catch(e){error=e.message}
      const refused=error.includes(`MAP-023 lot compatibility: unfamiliar ${expected}`)
      const exactRollback=JSON.stringify(capture())===JSON.stringify(installed)&&boundary()===publicBefore
        &&auditBoundary()===auditBefore&&JSON.stringify(snapshot())===JSON.stringify(before)
      drifts.push({case:i+1,expected,sql,error,refused,exactRollback})
      fs.writeFileSync(path.join(evidence,'installation-drifts.json'),JSON.stringify(drifts,null,2)+'\n')
      check(`compatibility installer drift ${i+1} refuses with complete DDL/data rollback`,refused&&exactRollback)
    }
  }
  const actor='42000000-0000-4000-8000-000000000005'
  sync(`insert into auth.users(id) values('${actor}');insert into public.user_profiles(id,role) values('${actor}','Admin')
    on conflict(id) do update set role=excluded.role;`)
  const staff=`select set_config('request.jwt.claim.sub','${actor}',false);
    select set_config('request.jwt.claims','{"aal":"aal2"}',false);`
  const command=(action,payload,key=randomUUID(),zone='Asia/Manila',fn='execute_admin_lot_command_v1')=>{
    const a=signedAdminCommandArguments(action,actor,key,payload)
    return `${staff}set time zone ${literal(zone)};set role authenticated;select public.${fn}(${[
      'p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'].map(k=>literal(a[k])).join(',')});`
  }
  const admin=(...args)=>JSON.parse(value(command(...args)))
  const observe=f=>JSON.parse(value(`select jsonb_build_object(
    'lot',(select to_jsonb(b) from public.product_batches b where id='${f.lot}'),
    'lots',(select jsonb_agg(to_jsonb(b) order by id) from public.product_batches b where sku=${literal(f.sku)}),
    'product',(select to_jsonb(p) from public.products p where sku=${literal(f.sku)}),
    'balance',(select to_jsonb(b) from public.inventory_balances b where sku=${literal(f.sku)} and location_code='MANILA_MAIN'),
    'eligible',(select k2_private.lot_is_eligible_v1(b) from public.product_batches b where id='${f.lot}'),
    'privateSellable',(select coalesce(sum(greatest(quantity-reserved_quantity,0)),0) from public.product_batches b
      where sku=${literal(f.sku)} and k2_private.lot_is_eligible_v1(b)),
    'publicSellable',(select coalesce(sum(stock_from_batches),0) from public.get_public_product_stock() where sku=${literal(f.sku)}),
    'reservations',(select coalesce(jsonb_agg(to_jsonb(r) order by id),'[]') from public.inventory_reservations r where sku=${literal(f.sku)}),
    'history',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') from public.batch_change_events e where sku=${literal(f.sku)}),
    'typedHistory',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'snapshot',to_jsonb(
      jsonb_populate_record(null::public.product_batches,e.new_data))) order by created_at,id),'[]')
      from public.batch_change_events e where sku=${literal(f.sku)} and e.new_data ? 'quantity_available'),
    'inventoryEvents',(select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]') from public.inventory_events e where sku=${literal(f.sku)}))::text;`))
  const prepare=(label,days=180)=>{
    const f=fixture(`compat-${label}-${randomUUID().slice(0,8)}`,2)
    sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA',
      expiry_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${days},
      best_before_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${days} where id='${f.lot}';`)
    return f
  }
  const reports=[],failures=[]
  const expect=(name,condition)=>{try{check(name,condition)}catch(e){failures.push(e.message)}}
  const save=()=>fs.writeFileSync(path.join(evidence,'compatibility-parity.json'),JSON.stringify({idea:'IDEA-20261002-10',
    synthetic:true,providerWrites:false,beforeLotCompatFix,lotCompatibilityWitnessSha256,
    scope:'Actual current trigger, signed lot commands, anonymous purchase/releases and receiving discovery on owned restore; not provider or full-writer readiness',
    reports,failures},null,2)+'\n')
  let current
  try {
    for(const kind of ['custody','hub','history','forged','disposition','30']) {
      const f=prepare(kind,kind==='history'?60:180)
      current={case:'held current facts/'+kind,fixture:f};reports.push(current)
      if(kind==='history')current.approval=admin('lot_clearance',{batchId:f.lot,approved:true,reason:'Synthetic attributable clearance before compatibility hold'})
      const payload=guestPayload(f,{shippingAmount:95,shippingQuoteStatus:'customer_confirmed'})
      check(`${kind} compatibility fixture has actual signed valid hold`,value(`set role anon;select ok from ${guestCall(payload,`192.0.2.${160+reports.length}`)};`)==='t')
      current.orderId=value(`select id from public.order_requests where idempotency_key=${literal(payload.idempotencyKey)};`)
      current.before=observe(f)
      if(kind==='custody'||kind==='hub')sync(`update public.product_batches set ${kind==='custody'?'custodian':'hub'}=null where id='${f.lot}';`)
      else if(kind==='disposition')sync(`update public.product_batches set inventory_status='damaged' where id='${f.lot}';`)
      else {
        const days=kind==='history'?61:kind==='forged'?60:30
        sync(`begin;update public.product_batches set expiry_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${days},
          best_before_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${days}
          ${kind==='forged'?`,clearance_approved_at=now(),clearance_approved_by='${actor}'`:''} where id='${f.lot}';
          ${kind==='history'?`insert into public.batch_change_events(batch_id,sku,reason,actor_id,old_data,new_data)
            values('${f.lot}',${literal(f.sku)},'Synthetic expiry invalidation','${actor}',
            jsonb_build_object('expiry_date',((transaction_timestamp() at time zone 'Asia/Manila')::date+60)::text),
            jsonb_build_object('expiry_date',((transaction_timestamp() at time zone 'Asia/Manila')::date+61)::text,'inventory_status','available'));`:''}commit;`)
      }
      sync(`update public.product_batches set reserved_quantity=reserved_quantity where id='${f.lot}';`)
      current.afterFacts=observe(f)
      expect(`${kind} reservation-only update derives zero compatibility units from current eligibility`,
        current.afterFacts.eligible===false&&current.afterFacts.lot.quantity_available===0&&current.afterFacts.lot.quantity===2
        &&current.afterFacts.lot.reserved_quantity===1&&current.afterFacts.balance.on_hand===2&&current.afterFacts.balance.reserved===1)
      current.release=JSON.parse(value(`${staff}select to_jsonb(public.cancel_order_request('${current.orderId}','Synthetic compatibility release'));`))
      current.afterRelease=observe(f)
      expect(`${kind} release keeps unsafe compatibility and canonical sellability zero`,current.release.status==='cancelled'
        &&current.afterRelease.lot.quantity_available===0&&current.afterRelease.privateSellable===0&&current.afterRelease.publicSellable===0
        &&current.afterRelease.product.stock_available===0&&current.afterRelease.balance.on_hand===2&&current.afterRelease.balance.reserved===0)
      save()
    }
    const zone=value(`select zone from (values('Pacific/Kiritimati'),('Etc/GMT+12')) z(zone)
      where (transaction_timestamp() at time zone zone)::date is distinct from (transaction_timestamp() at time zone 'Asia/Manila')::date limit 1;`)
    for(const days of [31,60,89]) {
      const f=prepare(`clearance-${days}`,days),key=randomUUID()
      current={case:'signed approval/recount/'+days,fixture:f,zone,key};reports.push(current)
      const payload={batchId:f.lot,approved:true,reason:'Synthetic signed approval with current compatibility audit'}
      current.before=observe(f)
      try{current.result=admin('lot_clearance',payload,key,zone)}catch(e){current.approvalError=e.message}
      current.after=observe(f)
      expect(`${days} signed clearance keeps current compatibility/private/public/result parity across caller calendar`,!current.approvalError
        &&current.result.quantityAvailable===2&&current.result.sellableQuantity===2&&current.after.eligible
        &&current.after.lot.quantity_available===2&&current.after.privateSellable===2&&current.after.publicSellable===2
        &&current.after.product.stock_available===2&&current.after.history.length===1
        &&JSON.stringify(current.after.typedHistory[0].snapshot)===JSON.stringify(current.after.lot))
      if(!current.approvalError) {
        const retryBefore=snapshot();current.retry=admin('lot_clearance',payload,key,zone)
        current.retryUnchanged=JSON.stringify(business(snapshot()))===JSON.stringify(business(retryBefore))
        check(`${days} actual signed clearance replay preserves business/history and returns the same result`,
          current.retryUnchanged&&JSON.stringify(current.retry)===JSON.stringify(current.result))
        const b=current.after.lot,recount={sku:f.sku,reason:'Synthetic recount preserving valid clearance and event history',lots:[{
          id:f.lot,boxCode:b.box_code,batchCode:b.batch_code,quantity:2,expiryDate:b.expiry_date,landedDate:'',
          hub:b.hub,custodian:b.custodian,channel:b.channel??'',pinned:b.is_pinned,status:'available'}]}
        current.recount=admin('lots_reconcile',recount,randomUUID(),zone);current.afterRecount=observe(f)
        expect(`${days} signed recount preserves current valid approval without creating a false approval`,
          current.recount.physicalQuantity===2&&current.recount.sellableQuantity===2&&current.afterRecount.lot.quantity_available===2
          &&current.afterRecount.privateSellable===2&&current.afterRecount.publicSellable===2
          &&current.afterRecount.history.length===2&&JSON.stringify(current.afterRecount.history[0])===JSON.stringify(current.after.history[0]))
      }
      save()
    }
    current={case:'stale unsafe sibling aggregate',fixture:stale,sibling};reports.push(current)
    current.before=observe(stale)
    check('Sibling fixture retains three physically counted stale unsafe units',current.before.balance.on_hand===5
      &&current.before.lots.find(b=>b.id===sibling).quantity_available===3)
    current.result=admin('lot_clearance',{batchId:stale.lot,approved:true,reason:'Synthetic approval excluding stale unsafe sibling cache'})
    current.after=observe(stale)
    expect('Signed approval product/result units exclude the untouched stale unsafe sibling',current.result.quantityAvailable===2
      &&current.result.sellableQuantity===2&&current.after.product.stock_available===2&&current.after.privateSellable===2
      &&current.after.publicSellable===2&&current.after.balance.on_hand===5
      &&JSON.stringify(current.before.lots.find(b=>b.id===sibling))===JSON.stringify(current.after.lots.find(b=>b.id===sibling)))
    save()
    if(!beforeLotCompatFix) {
      const inserted=prepare('signed-insert',180),newKey=randomUUID()
      current={case:'signed new lot insertion',fixture:inserted,key:newKey};reports.push(current)
      const expiry=value(`select ((transaction_timestamp() at time zone 'Asia/Manila')::date+180)::text;`)
      current.before=observe(inserted)
      const existing=current.before.lot
      const newPayload={sku:inserted.sku,reason:'Synthetic signed insertion with complete final audit snapshot',lots:[{
        id:existing.id,boxCode:existing.box_code,batchCode:existing.batch_code,quantity:existing.quantity,
        expiryDate:existing.expiry_date,landedDate:'',hub:existing.hub,custodian:existing.custodian,
        channel:existing.channel??'',pinned:existing.is_pinned,status:existing.inventory_status},{
        id:null,boxCode:'LOCAL-INSERT',batchCode:'LOCAL-INSERT',quantity:3,expiryDate:expiry,landedDate:'',
        hub:'HUB-MNL-CENTRAL',custodian:'CUST-STAFF-ELENA',channel:'',pinned:false,status:'available'}]}
      current.result=admin('lots_reconcile',newPayload,newKey);current.after=observe(inserted)
      current.newLot=current.after.lots.find(b=>b.id!==inserted.lot)
      const newEvent=current.after.history.find(e=>e.batch_id===current.newLot?.id)
      const existingEvent=current.after.history.find(e=>e.batch_id===inserted.lot)
      check('Signed new-lot insertion finalizes current eligible units and exact typed audit snapshot',
        current.result.physicalQuantity===5&&current.result.sellableQuantity===5&&current.after.balance.on_hand===5
        &&current.after.privateSellable===5&&current.after.publicSellable===5&&current.after.product.stock_available===5
        &&current.newLot?.quantity===3&&current.newLot.quantity_available===3&&current.after.history.length===2
        &&newEvent?.old_data===null&&JSON.stringify(existingEvent?.old_data)===JSON.stringify(current.before.lot)
        &&JSON.stringify(current.after.typedHistory.find(e=>e.id===newEvent?.id)?.snapshot)===JSON.stringify(current.newLot)
        &&JSON.stringify(current.after.typedHistory.find(e=>e.id===existingEvent?.id)?.snapshot)===JSON.stringify(current.after.lot)
        &&current.after.lot.quantity===2&&current.after.lot.reserved_quantity===0&&current.after.lot.quantity_available===2)
      const insertionRetryBefore=snapshot();current.retry=admin('lots_reconcile',newPayload,newKey)
      current.retryUnchanged=JSON.stringify(business(snapshot()))===JSON.stringify(business(insertionRetryBefore))
      check('Signed new-lot retry preserves exact final result and creates no extra lot or history',
        current.retryUnchanged&&JSON.stringify(current.retry)===JSON.stringify(current.result));save()
      const historical=reports.find(x=>x.case==='held current facts/history'),b=historical.afterRelease.lot
      current={case:'invalidated history signed recount and reapproval',fixture:historical.fixture};reports.push(current)
      const invalidPayload={sku:b.sku,reason:'Synthetic signed recount preserving an invalidated prior approval',lots:[{
        id:b.id,boxCode:b.box_code,batchCode:b.batch_code,quantity:2,expiryDate:b.expiry_date,landedDate:'',
        hub:b.hub,custodian:b.custodian,channel:b.channel??'',pinned:b.is_pinned,status:'available'}]}
      current.before=observe(current.fixture);current.recount=admin('lots_reconcile',invalidPayload);current.afterRecount=observe(current.fixture)
      check('Invalidated approval remains unsellable after signed recount with prior history unchanged',
        current.recount.physicalQuantity===2&&current.recount.sellableQuantity===0&&current.afterRecount.lot.quantity_available===0
        &&current.afterRecount.privateSellable===0&&current.afterRecount.publicSellable===0&&current.afterRecount.product.stock_available===0
        &&current.afterRecount.history.length===current.before.history.length+1
        &&current.before.history.every(e=>JSON.stringify(e)===JSON.stringify(current.afterRecount.history.find(n=>n.id===e.id))))
      current.revoke=admin('lot_clearance',{batchId:b.id,approved:false,reason:'Synthetic explicit clearance revocation preserves existing history'})
      current.afterRevoke=observe(current.fixture)
      check('Signed revocation clears approval and retains zero current sellability and exact final audit',
        current.revoke.quantityAvailable===0&&current.afterRevoke.lot.clearance_approved_at===null
        &&current.afterRevoke.lot.clearance_approved_by===null&&current.afterRevoke.lot.inventory_status==='quarantine'
        &&current.afterRevoke.privateSellable===0&&current.afterRevoke.publicSellable===0&&current.afterRevoke.balance.on_hand===2
        &&JSON.stringify(current.afterRevoke.typedHistory.at(-1).snapshot)===JSON.stringify(current.afterRevoke.lot))
      current.reapproval=admin('lot_clearance',{batchId:b.id,approved:true,reason:'Synthetic new approval after explicit history-preserving revocation'})
      current.afterReapproval=observe(current.fixture)
      check('Fresh signed reapproval restores eligible units without rewriting any prior committed audit event',
        current.reapproval.quantityAvailable===2&&current.reapproval.sellableQuantity===2&&current.afterReapproval.eligible
        &&current.afterReapproval.privateSellable===2&&current.afterReapproval.publicSellable===2&&current.afterReapproval.product.stock_available===2
        &&current.afterReapproval.balance.on_hand===2&&current.afterReapproval.balance.reserved===0
        &&current.afterRevoke.history.every(e=>JSON.stringify(e)===JSON.stringify(current.afterReapproval.history.find(n=>n.id===e.id)))
        &&JSON.stringify(current.afterReapproval.typedHistory.at(-1).snapshot)===JSON.stringify(current.afterReapproval.lot));save()
      for(const days of [30,90]) {
        const f=prepare(`refuse-${days}`,days),before=snapshot()
        current={case:'ineligible clearance/'+days,fixture:f};reports.push(current)
        try{admin('lot_clearance',{batchId:f.lot,approved:true,reason:'Synthetic forbidden clearance boundary'})}
        catch(e){current.refusal=e.message}
        current.exactRollback=JSON.stringify(snapshot())===JSON.stringify(before)
        check(`${days} actual signed clearance refuses with complete business/audit/control rollback`,
          current.refusal?.includes('K2_CLEARANCE_INELIGIBLE')&&current.exactRollback);save()
      }
      // Owned-clone fault hooks only. The actual command must abort after its
      // event exists, including signed nonce/rate/result effects.
      sync(`create function k2_stock_fixture.compat_refresh_fault() returns trigger language plpgsql as $$begin
        if current_setting('k2.fixture.compat_fault',true)='refresh' and new.sku=current_setting('k2.fixture.compat_sku',true) then
          perform set_config('k2.fixture.compat_updates',(current_setting('k2.fixture.compat_updates')::int+1)::text,true);
          if current_setting('k2.fixture.compat_updates')::int=2 then raise exception 'LOCAL_COMPAT_REFRESH_FAILURE';end if;
        end if;return new;end$$;
        create trigger local_compat_refresh_fault before update on public.product_batches for each row execute function k2_stock_fixture.compat_refresh_fault();
        create function k2_stock_fixture.compat_event_fault() returns trigger language plpgsql as $$begin
          if current_setting('k2.fixture.compat_fault',true)='event' and new.sku=current_setting('k2.fixture.compat_sku',true)
            then raise exception 'LOCAL_COMPAT_EVENT_FAILURE';end if;return new;end$$;
        create trigger local_compat_event_fault before update on public.batch_change_events for each row execute function k2_stock_fixture.compat_event_fault();`)
      try {
        for(const point of ['refresh','event']) {
          const f=prepare('rollback-'+point,60),key=randomUUID(),payload={batchId:f.lot,approved:true,reason:'Synthetic post-event compatibility rollback'}
          current={case:'post-event rollback/'+point,fixture:f,key,before:observe(f)};reports.push(current)
          const before=snapshot()
          try{value(`set k2.fixture.compat_fault=${literal(point)};set k2.fixture.compat_sku=${literal(f.sku)};
            set k2.fixture.compat_updates='0';${command('lot_clearance',payload,key)}`)}catch(e){current.refusal=e.message}
          current.exactRollback=JSON.stringify(snapshot())===JSON.stringify(before);current.afterFailure=observe(f)
          check(`${point} fault rolls back actual lot/audit/receipt/nonce/rate changes`,current.exactRollback
            &&current.refusal?.includes(point==='refresh'?'LOCAL_COMPAT_REFRESH_FAILURE':'LOCAL_COMPAT_EVENT_FAILURE'))
          current.recovery=admin('lot_clearance',payload,key);current.afterRecovery=observe(f)
          check(`${point} fresh-signature same-key recovery finalizes one valid audit snapshot`,current.recovery.quantityAvailable===2
            &&current.afterRecovery.eligible&&current.afterRecovery.history.length===1
            &&JSON.stringify(current.afterRecovery.typedHistory[0].snapshot)===JSON.stringify(current.afterRecovery.lot))
          const beforeRetry=snapshot();current.retry=admin('lot_clearance',payload,key)
          current.retryUnchanged=JSON.stringify(business(snapshot()))===JSON.stringify(business(beforeRetry))
          check(`${point} signed retry returns the final stored result without another history effect`,current.retryUnchanged
            &&JSON.stringify(current.retry)===JSON.stringify(current.recovery));save()
        }
      }finally{
        sync(`drop trigger local_compat_refresh_fault on public.product_batches;drop trigger local_compat_event_fault on public.batch_change_events;
          drop function k2_stock_fixture.compat_refresh_fault();drop function k2_stock_fixture.compat_event_fault();`)
      }
      check('Actual private helper remains inaccessible to browser and service roles',value(`select
        not has_function_privilege('anon','${signatures[2]}','execute') and not has_function_privilege('authenticated','${signatures[2]}','execute')
        and not has_function_privilege('service_role','${signatures[2]}','execute');`)==='t')
    }
  }catch(e){if(current)current.error=e.message;throw e}finally{save()}
  check('Compatibility witness preserves exact public boundary and original trigger binding',boundary()===publicBefore)
  if(failures.length)throw Error(`LOT_COMPATIBILITY_FAILURES:${failures.length}`)
}
