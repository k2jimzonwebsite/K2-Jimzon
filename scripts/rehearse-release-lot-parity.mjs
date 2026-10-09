// IDEA10. Actual current releases in the caller's owned synthetic restore only.
import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { signedAdminCommandArguments } from '../server/admin-bff/security.js'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
export const releaseLotWitnessSha256=createHash('sha256').update(bytes).digest('hex')

export async function rehearseReleaseLotParity({sync,value,check,fixture,guestPayload,guestCall,actor,literal,
  source,withoutTransaction,evidence,beforeReleaseLotFix}) {
  fs.writeFileSync(path.join(evidence,'executed-release-lot-module.mjs'),bytes)
  const signatures=['public.cancel_order_request(uuid,text)','public.release_expired_reservations_v1(integer)',
    'public.sync_product_batch_compat_columns()']
  const capture=()=>JSON.parse(value(`select jsonb_agg(jsonb_build_object('signature',oid::regprocedure::text,
    'definition',pg_get_functiondef(oid),'body',prosrc,'bodyMd5',md5(replace(prosrc,chr(13),'')),
    'catalog',to_jsonb(p)-'prosrc') order by oid)::text from pg_proc p where oid in (
      ${signatures.map(s=>`${literal(s)}::regprocedure`).join(',')});`))
  const publicBoundary=()=>value(`select jsonb_build_object('wrapper',to_jsonb(p),'view',to_jsonb(c),
    'viewBody',pg_get_viewdef(c.oid,true))::text from pg_proc p cross join pg_class c
    where p.oid='public.get_public_product_stock()'::regprocedure and c.oid='public.v_product_stock_from_batches'::regclass;`)
  const triggers=()=>value(`select jsonb_agg(to_jsonb(t) order by oid)::text from pg_trigger t
    where tgrelid='public.product_batches'::regclass and not tgisinternal;`)
  const tables=['public.products','public.product_batches','public.inventory_balances','public.inventory_reservations',
    'public.batch_change_events','public.inventory_events','public.order_requests','public.order_request_items','public.orders',
    'public.order_request_events','public.packing_scan_events','public.coupons','public.coupon_redemptions','public.channel_listings',
    'k2_private.admin_command_receipts','k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets',
    'k2_private.guest_request_nonces','k2_private.guest_rate_buckets']
  const snapshot=()=>JSON.parse(value(`select jsonb_build_object(${tables.map(t=>`${literal(t)},
    (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by to_jsonb(x)::text),'')) from ${t} x)`).join(',')})::text;`))
  const original=capture(),boundary=publicBoundary(),triggerBindings=triggers()
  fs.writeFileSync(path.join(evidence,'product-batch-triggers-before.json'),triggerBindings+'\n')
  fs.writeFileSync(path.join(evidence,'release-functions-before.json'),JSON.stringify(original,null,2)+'\n')
  const reports=[],failures=[]
  const expect=(name,condition)=>{try{check(name,condition)}catch(error){failures.push(error.message)}}
  const save=()=>fs.writeFileSync(path.join(evidence,'release-lot-parity.json'),JSON.stringify({idea:'IDEA-20261002-10',
    synthetic:true,providerWrites:false,beforeReleaseLotFix,releaseLotWitnessSha256,
    scope:'Actual current owner-only cancellation/expiry after signed valid allocation; synthetic eligibility/cache/history/rollback/retry, not provider roles or full-writer acceptance',
    reports,failures},null,2)+'\n')
  if(!beforeReleaseLotFix) {
    const migration=source('supabase/migrations/20261002124500_release_lot_eligibility.sql')
    const before=snapshot();sync(migration);const installed=capture()
    check('release eligibility installation preserves non-body catalogs, public boundary and all state',
      installed.every((f,i)=>JSON.stringify(f.catalog)===JSON.stringify(original[i].catalog))
      &&publicBoundary()===boundary&&triggers()===triggerBindings&&JSON.stringify(snapshot())===JSON.stringify(before))
    sync(migration)
    check('release eligibility preparation replays with exact definitions and no state effect',
      JSON.stringify(capture())===JSON.stringify(installed)&&JSON.stringify(snapshot())===JSON.stringify(before))
    fs.writeFileSync(path.join(evidence,'release-functions-after.json'),JSON.stringify(installed,null,2)+'\n')
    // Catalog OIDs do not follow the signature list's order.
    const captured=signature=>installed.find(f=>value(`select ${literal(f.signature)}::regprocedure=${literal(signature)}::regprocedure;`)==='t')
    const cancel=captured(signatures[0]),expiry=captured(signatures[1])
    check('release drift cases target the captured cancellation and expiry signatures',Boolean(cancel&&expiry&&cancel!==expiry))
    const drifts=[`alter function ${signatures[0]} strict;`,`alter function ${signatures[0]} leakproof;`,
      `alter function ${signatures[0]} parallel safe;`,`alter function ${signatures[0]} set search_path='public,pg_temp';`,
      `grant execute on function ${signatures[0]} to anon;`,`alter function ${signatures[0]} cost 101;`,
      cancel.definition.replace(cancel.body,()=>cancel.body+'\n-- unfamiliar body\n')+';',
      `alter function ${signatures[1]} strict;`,`alter function ${signatures[1]} rows 1001;`,
      `grant execute on function ${signatures[1]} to anon;`,`alter function ${signatures[1]} security invoker;`,
      expiry.definition.replace(expiry.body,()=>expiry.body+'\n-- unfamiliar body\n')+';',
      `alter function k2_private.lot_is_eligible_v1(public.product_batches) strict;`,
      `grant execute on function k2_private.lot_is_eligible_v1(public.product_batches) to authenticated;`,
      `alter function ${signatures[2]} strict;`,`alter function ${signatures[2]} security definer;`,
      `alter table public.product_batches disable trigger trg_sync_product_batch_compat_columns;`,
      `${original.find(f=>f.signature===cancel.signature).definition};alter function ${signatures[1]} strict;`]
    const driftReports=[]
    for(const [i,drift] of drifts.entries()) {
      let refusal=''
      try{sync(`begin;${drift}${withoutTransaction(migration)}rollback;`)}
      catch(error){refusal=error.message}
      const expected=i<7?'cancel':i<12||i===17?'expiry':i<14?'private predicate':i<16?'compatibility':'compatibility trigger binding'
      const refused=refusal.includes(`MAP-023 release lot eligibility: unfamiliar ${expected}`)
      const exactRollback=JSON.stringify(capture())===JSON.stringify(installed)&&publicBoundary()===boundary
        &&triggers()===triggerBindings&&JSON.stringify(snapshot())===JSON.stringify(before)
      driftReports.push({case:i+1,sql:drift,expected,refusal,refused,exactRollback})
      fs.writeFileSync(path.join(evidence,'release-install-drifts.json'),JSON.stringify(driftReports,null,2)+'\n')
      check(`release eligibility drift ${i+1} refuses with exact rollback`,refused&&exactRollback)
    }
  }
  const staff=`select set_config('request.jwt.claim.sub','${actor}',false);
    select set_config('request.jwt.claims','{"aal":"aal2"}',false);`
  const clearanceActor='42000000-0000-4000-8000-000000000003'
  sync(`insert into auth.users(id) values('${clearanceActor}');
    insert into public.user_profiles(id,role) values('${clearanceActor}','Admin')
      on conflict(id) do update set role=excluded.role;`)
  const clearance=(f,reason)=>{
    const a=signedAdminCommandArguments('lot_clearance',clearanceActor,randomUUID(),{batchId:f.lot,approved:true,reason})
    return value(`select set_config('request.jwt.claim.sub','${clearanceActor}',false);
      select set_config('request.jwt.claims','{"aal":"aal2"}',false);set role authenticated;
      select public.execute_admin_lot_command_v1(${['p_action','p_timestamp','p_nonce','p_idempotency_key',
        'p_payload_text','p_signature'].map(k=>literal(a[k])).join(',')});`)
  }
  const due=`select r.id from public.inventory_reservations r join public.order_requests o on o.id=r.order_request_id
    where o.status='submitted' and o.payment_status in ('unpaid','not_requested','awaiting_instructions','failed')
      and r.status='active' and r.expires_at<=clock_timestamp() and r.packed_quantity=0 and r.committed_at is null`
  check('release parity starts without unrelated due allocations',value(`select count(*) from (${due}) r;`)==='0')
  const observe=(f,id)=>JSON.parse(value(`select jsonb_build_object(
    'product',(select to_jsonb(p) from public.products p where sku=${literal(f.sku)}),
    'lot',(select to_jsonb(b) from public.product_batches b where id='${f.lot}'),
    'balance',(select to_jsonb(b) from public.inventory_balances b where sku=${literal(f.sku)} and location_code='MANILA_MAIN'),
    'privateEligible',(select k2_private.lot_is_eligible_v1(b) from public.product_batches b where id='${f.lot}'),
    'privateSellable',(select coalesce(sum(greatest(b.quantity-b.reserved_quantity,0)),0) from public.product_batches b
      where sku=${literal(f.sku)} and k2_private.lot_is_eligible_v1(b)),
    'publicSellable',(select coalesce((select stock_from_batches from public.get_public_product_stock() where sku=${literal(f.sku)}),0)),
    'order',(select to_jsonb(o) from public.order_requests o where id='${id}'),
    'reservations',(select jsonb_agg(to_jsonb(r) order by id) from public.inventory_reservations r where order_request_id='${id}'),
    'events',(select jsonb_agg(to_jsonb(e) order by id) from public.inventory_events e where reference_id='${id}'),
    'manilaToday',(transaction_timestamp() at time zone 'Asia/Manila')::date,
    'callerToday',current_date)::text;`))
  let current
  try {
    for(const phase of ['cancel','expiry'])for(const kind of ['custody','hub','history','disposition','thirty-day','31','89','90']) {
      const f=fixture(`release-parity-${phase}-${kind}-${randomUUID().slice(0,8)}`,2)
      const days=kind==='history'?60:/^\d+$/.test(kind)?Number(kind):180
      sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA',
        expiry_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${days},
        best_before_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${days} where id='${f.lot}';`)
      if(days<90)clearance(f,'Synthetic valid approval before release parity allocation')
      const purchase=guestPayload(f,{shippingAmount:95,shippingQuoteStatus:'customer_confirmed'})
      current={phase,kind,fixture:f,purchase};reports.push(current)
      check(`${phase}/${kind} actual signed purchase holds one valid physical unit`,
        value(`set role anon;select ok from ${guestCall(purchase,`192.0.2.${50+reports.length}`)};`)==='t')
      const id=value(`select id from public.order_requests where idempotency_key=${literal(purchase.idempotencyKey)};`)
      current.orderId=id;current.allocated=observe(f,id)
      check(`${phase}/${kind} saved valid allocation has exact physical, reserved and eligible counts`,
        current.allocated.privateEligible&&current.allocated.privateSellable===1&&current.allocated.publicSellable===1
        &&current.allocated.lot.quantity===2&&current.allocated.lot.reserved_quantity===1
        &&current.allocated.balance.on_hand===2&&current.allocated.balance.reserved===1
        &&current.allocated.reservations.length===1&&current.allocated.reservations[0].quantity===1
        &&current.allocated.reservations[0].status==='active')
      if(kind==='custody'||kind==='hub')sync(`update public.product_batches set ${kind==='custody'?'custodian':'hub'}=null where id='${f.lot}';`)
      else if(kind==='disposition')sync(`update public.product_batches set inventory_status='damaged' where id='${f.lot}';`)
      else if(kind==='history'||kind==='thirty-day') {
        const changed=kind==='history'?61:30
        sync(`begin;update public.product_batches set expiry_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${changed},
          best_before_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${changed} where id='${f.lot}';
          insert into public.batch_change_events(batch_id,sku,reason,actor_id,old_data,new_data) values(
            '${f.lot}',${literal(f.sku)},'Synthetic current expiry history','${actor}',
            jsonb_build_object('expiry_date',((transaction_timestamp() at time zone 'Asia/Manila')::date+${days})::text),
            jsonb_build_object('expiry_date',((transaction_timestamp() at time zone 'Asia/Manila')::date+${changed})::text,'inventory_status','available'));commit;`)
      }
      if(phase==='expiry')sync(`update public.inventory_reservations set expires_at=clock_timestamp()-interval '1 minute' where order_request_id='${id}';`)
      current.before=observe(f,id)
      const valid=/^\d+$/.test(kind)
      check(`${phase}/${kind} private eligibility reflects current facts before release`,current.before.privateEligible===valid)
      // The compatibility cache is internal; Website membership is separate.
      const timeZone=valid?value(`select zone from (values('Pacific/Kiritimati'),('Etc/GMT+12')) z(zone)
        where (transaction_timestamp() at time zone zone)::date is distinct from
        (transaction_timestamp() at time zone 'Asia/Manila')::date limit 1;`):'Asia/Manila'
      const release=()=>`${staff} set time zone ${literal(timeZone)};${phase==='cancel'
        ?`select to_jsonb(public.cancel_order_request('${id}','Synthetic unsafe stock release'));`
        :'select to_jsonb(r) from public.release_expired_reservations_v1(500) r;'}`
      current.callerCalendar=JSON.parse(value(`set time zone ${literal(timeZone)};select jsonb_build_object('zone',current_setting('TimeZone'),
        'today',current_date,'manilaToday',(transaction_timestamp() at time zone 'Asia/Manila')::date)::text;`))
      current.releaseResult=JSON.parse(value(release()));current.after=observe(f,id)
      check(`${phase}/${kind} release preserves physical count and exact allocation history`,
        current.after.balance.on_hand===2&&current.after.balance.reserved===0&&current.after.lot.quantity===2
        &&current.after.lot.reserved_quantity===0&&current.after.reservations.length===1
        &&current.after.reservations[0].status==='released'&&current.after.reservations[0].release_cause===(phase==='cancel'?'cancelled':'expired')
        &&current.after.events.filter(e=>e.event_type==='reservation_released'&&e.quantity===1&&e.actor_id===actor).length===1
        &&current.after.order.total_amount===195&&current.after.order.shipping_amount===95)
      expect(`${phase}/${kind} released cache agrees with current private and public eligible units`,
        current.after.product.stock_available===(valid?2:0)&&current.after.privateSellable===(valid?2:0)
        &&current.after.publicSellable===(valid?2:0)&&(!valid||current.callerCalendar.today!==current.callerCalendar.manilaToday))
      const beforeRetry=snapshot();current.retryResult=JSON.parse(value(release()))
      current.retryUnchanged=JSON.stringify(snapshot())===JSON.stringify(beforeRetry)
      check(`${phase}/${kind} underlying release replay has exact business/audit/control state`,current.retryUnchanged)
      if(!beforeReleaseLotFix) {
        const beforeRefusal=snapshot();let refused=false
        try{sync(`${staff}${phase==='cancel'?`select public.cancel_order_request('${id}','');`:'select * from public.release_expired_reservations_v1(0);'}`)}
        catch(error){refused=error.message.includes(phase==='cancel'?'Cancellation reason is required':'RELEASE_LIMIT_INVALID')}
        current.invalidRefused=refused;current.refusalUnchanged=JSON.stringify(snapshot())===JSON.stringify(beforeRefusal)
        check(`${phase}/${kind} invalid release has exact rollback`,refused&&current.refusalUnchanged)
        if(!valid) {
          if(kind==='custody'||kind==='hub')sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA' where id='${f.lot}';`)
          else if(kind==='history')clearance(f,'Synthetic fresh clearance after actual release')
          else sync(`update public.product_batches set inventory_status='available',expiry_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+180,
            best_before_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+180 where id='${f.lot}';`)
          const recover=guestPayload(f,{shippingAmount:95,shippingQuoteStatus:'customer_confirmed'})
          current.recoveryAccepted=value(`set role anon;select ok from ${guestCall(recover,`192.0.2.${100+reports.length}`)};`)==='t'
          current.recoveryOrder=value(`select id from public.order_requests where idempotency_key=${literal(recover.idempotencyKey)};`)
          current.recovered=observe(f,current.recoveryOrder)
          check(`${phase}/${kind} reviewed safe facts recover one fresh purchase without inventing physical stock`,current.recoveryAccepted
            &&current.recovered.privateEligible&&current.recovered.lot.quantity===2&&current.recovered.lot.reserved_quantity===1
            &&current.recovered.balance.on_hand===2&&current.recovered.balance.reserved===1&&current.recovered.publicSellable===1)
        }
      }
      save()
    }
  }catch(error){if(current)current.error=error.message;throw error}
  finally{save()}
  check('Release tests preserve exact public wrapper/view and trigger bindings',publicBoundary()===boundary&&triggers()===triggerBindings)
  if(failures.length)throw Error(`RELEASE_LOT_ELIGIBILITY_FAILURES:${failures.length}`)
}
