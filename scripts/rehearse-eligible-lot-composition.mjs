// IDEA-20261002-08: only the caller's owned disposable restored-schema clone.
// Fixture facts/audit history are synthetic; purchase/confirmation RPCs are real.
import { randomUUID } from 'node:crypto'
import { signedAdminCommandArguments } from '../server/admin-bff/security.js'

export async function rehearseEligibleLotComposition({sync,value,source,check,fixture,
  guestPayload,guestCall,canonicalCall,actor,literal,staff,captureDefinition,captureMetadata,beforeEligibleFix,withoutTransaction,advisor}) {
  const failures=[]
  const expect=(name,condition,detail='')=>{
    try {check(name,condition,detail)} catch(error) {failures.push(error.message)}
  }
  const publicMetadata=()=>value(`select jsonb_build_object('function',pg_get_functiondef(p.oid),
    'owner',p.proowner,'acl',p.proacl,'settings',p.proconfig,
    'view',pg_get_viewdef(c.oid,true),'view_owner',c.relowner,'view_acl',c.relacl,'view_options',c.reloptions)::text
    from pg_proc p cross join pg_class c where p.oid='public.get_public_product_stock()'::regprocedure
    and c.oid='public.v_product_stock_from_batches'::regclass;`)
  const physical=()=>value(`select jsonb_build_object('lots',(select jsonb_agg(jsonb_build_object(
    'id',id,'sku',sku,'quantity',quantity,'reserved',reserved_quantity,'hub',hub,'custodian',custodian) order by id)
    from public.product_batches),'balances',(select jsonb_agg(to_jsonb(b) order by sku,location_code)
    from public.inventory_balances b),'reservations',(select jsonb_agg(to_jsonb(r) order by id)
    from public.inventory_reservations r),'inventory_events',(select jsonb_agg(to_jsonb(e) order by id)
    from public.inventory_events e))::text;`)
  const command=(action,payload)=>{
    const a=signedAdminCommandArguments(action,actor,randomUUID(),payload)
    return `${staff} select public.execute_admin_lot_command_v1(${[
      'p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature',
    ].map(k=>literal(a[k])).join(',')});`
  }
  const offers=sku=>Number(value(`set role anon; select coalesce(sum(stock_from_batches),0)
    from public.v_product_stock_from_batches where sku=${literal(sku)};`))
  // The restored dump omits ACLs; overlay the reviewed named-role contract.
  // This is local composition evidence, never an actual provider grant capture.
  sync(source('supabase/migrations/20260812_canonical_identities.sql'))
  sync(`revoke all on function public.get_public_product_stock() from public,anon,authenticated;
    grant execute on function public.get_public_product_stock() to anon,authenticated,service_role;
    grant select on public.v_product_stock_from_batches to anon,authenticated,service_role;`)
  const before=publicMetadata(); const beforePhysical=physical()
  const lots=source('supabase/migrations/20260812_admin_lots_bff_boundary.sql')
  sync(lots)
  expect('current purchase/payment chain whole lot installation preserves public wrapper and physical commitments',
    publicMetadata()===before && physical()===beforePhysical)
  sync(source('supabase/migrations/20261002035106_public_eligible_website_stock.sql'))
  const installed=publicMetadata()
  sync(lots)
  expect('lot-first public correction and lot replay preserve protected metadata and physical commitments',
    publicMetadata()===installed && physical()===beforePhysical)
  for(const [name,signature] of [
    ['reservation','public.reserve_order_request_lots_v1(uuid,text)'],
    ['public-stock','public.get_public_product_stock()'],
  ]) captureDefinition(name,sync(`select replace(pg_get_functiondef('${signature}'::regprocedure),chr(13),'');`))
  captureMetadata(value(`select jsonb_build_object('reservation',to_jsonb(r)-'prosrc',
    'reservation_md5',md5(r.prosrc),'reservation_default',pg_get_expr(r.proargdefaults,0),
    'public',to_jsonb(p)-'prosrc','public_md5',md5(p.prosrc))::text
    from pg_proc r cross join pg_proc p
    where r.oid='public.reserve_order_request_lots_v1(uuid,text)'::regprocedure
      and p.oid='public.get_public_product_stock()'::regprocedure;`))
  if(!beforeEligibleFix) {
    const correction=source('supabase/migrations/20261002061138_purchase_lot_eligibility.sql')
    const metadata=()=>value(`select (to_jsonb(p)-'prosrc')::text from pg_proc p
      where oid='public.reserve_order_request_lots_v1(uuid,text)'::regprocedure;`)
    const priorMetadata=metadata(); const priorFacts=physical()
    advisor('before')
    sync(correction)
    advisor('after')
    expect('eligible lot correction preserves reservation metadata, public boundary and physical commitments',
      metadata()===priorMetadata && physical()===priorFacts && publicMetadata()===installed)
    const definition=sync(`select pg_get_functiondef('public.reserve_order_request_lots_v1(uuid,text)'::regprocedure);`)
    sync(correction)
    expect('eligible lot correction replays without changing function or physical commitments',
      definition===sync(`select pg_get_functiondef('public.reserve_order_request_lots_v1(uuid,text)'::regprocedure);`)
      && metadata()===priorMetadata && physical()===priorFacts)
    expect('private eligible-lot predicate grants no browser or service-role execution',value(`select
      not has_function_privilege('anon','k2_private.lot_is_eligible_v1(public.product_batches)','EXECUTE')
      and not has_function_privilege('authenticated','k2_private.lot_is_eligible_v1(public.product_batches)','EXECUTE')
      and not has_function_privilege('service_role','k2_private.lot_is_eligible_v1(public.product_batches)','EXECUTE');`)==='t')
    const variants=[
      ...['anon','authenticated','service_role'].map(role=>
        `revoke execute on function public.get_public_product_stock() from ${role};`),
      `alter function public.reserve_order_request_lots_v1(uuid,text) strict;`,
      `alter function k2_private.lot_is_eligible_v1(public.product_batches) strict;`,
      `alter function public.get_public_product_stock() strict;`,
      `alter function public.reserve_order_request_lots_v1(uuid,text) leakproof;`,
      `alter function public.reserve_order_request_lots_v1(uuid,text) parallel safe;`,
      `alter function k2_private.lot_is_eligible_v1(public.product_batches) parallel safe;`,
      `alter function public.get_public_product_stock() parallel safe;`,
      `alter function public.reserve_order_request_lots_v1(uuid,text) set search_path='public,pg_temp';`,
      `grant execute on function public.reserve_order_request_lots_v1(uuid,text) to anon;`,
      definition.replace('if v_existing > 0 then','if false then')+';',
      `grant execute on function k2_private.lot_is_eligible_v1(public.product_batches) to authenticated;`,
      `create or replace function k2_private.lot_is_eligible_v1(p_lot public.product_batches)
        returns boolean language sql stable set search_path='' as $$ select true; $$;`,
    ]
    for(let i=0;i<variants.length;i++) {
      let refused=false
      try {sync(`begin; ${variants[i]} ${withoutTransaction(correction)} rollback;`)}
      catch(error) {refused=/MAP-023 lot eligibility:/.test(error.message)}
      expect(`eligible correction refuses drift variant ${i+1} with rollback`,refused
        && metadata()===priorMetadata && physical()===priorFacts
        && definition===sync(`select pg_get_functiondef('public.reserve_order_request_lots_v1(uuid,text)'::regprocedure);`))
    }
  }

  function mixed(label,kind) {
    const f=fixture(label,2); const unsafe=randomUUID()
    sync(`begin; update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA'
      where id='${f.lot}';
      insert into public.product_batches(id,sku,box_code,batch_code,quantity,quantity_available,
        reserved_quantity,inventory_status,expiry_date,best_before_date,hub,custodian,clearance_approved_at,clearance_approved_by)
      values('${unsafe}',${literal(f.sku)},'LOCAL-PARITY','LOCAL-PARITY',1,1,0,'available',
        (transaction_timestamp() at time zone 'Asia/Manila')::date+${kind==='custody'?100:60},
        (transaction_timestamp() at time zone 'Asia/Manila')::date+${kind==='custody'?100:60},
        'HUB-MNL-CENTRAL',${kind==='custody'?'null':"'CUST-STAFF-ELENA'"},
        ${kind==='marker'?'transaction_timestamp()':'null'},${kind==='marker'?literal(actor):'null'});
      update public.inventory_balances set on_hand=3 where sku=${literal(f.sku)};
      select set_config('k2.allow_stock_write','on',true);
      update public.products set stock_available=3 where sku=${literal(f.sku)}; commit;`)
    if(kind==='history') {
      value(command('lot_clearance',{batchId:unsafe,approved:true,reason:'Synthetic approval for actual purchase parity'}))
      for(const [oldDays,newDays] of [[60,61],[61,60]]) sync(`begin;
        update public.product_batches set expiry_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${newDays},
          best_before_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${newDays} where id='${unsafe}';
        insert into public.batch_change_events(batch_id,sku,reason,actor_id,old_data,new_data)
        values('${unsafe}',${literal(f.sku)},'Synthetic expiry correction history','${actor}',
          jsonb_build_object('expiry_date',((transaction_timestamp() at time zone 'Asia/Manila')::date+${oldDays})::text),
          jsonb_build_object('expiry_date',((transaction_timestamp() at time zone 'Asia/Manila')::date+${newDays})::text,
            'inventory_status','available')); commit;`)
    }
    expect(`${label}: public offer excludes unsafe earliest lot`,offers(f.sku)===2)
    return {...f,unsafe}
  }
  for(const kind of ['custody','marker','history']) for(const entry of ['canonical','signed']) {
    const label=`eligible-${kind}-${entry}`; const f=mixed(label,kind)
    const payload=guestPayload(f,{shippingAmount:95,shippingQuoteStatus:'customer_confirmed'})
    const result=JSON.parse(value(`set role anon; ${entry==='signed'
      ? `select row_to_json(r)::text from ${guestCall(payload,`192.0.2.${kind==='custody'?220:kind==='marker'?221:222}`)} r;`
      : `select row_to_json(r)::text from ${canonicalCall(payload)} r;`}`))
    expect(`${label}: actual purchase succeeds using safe available coverage`,entry==='signed'?result.ok===true:!!result.id)
    const selected=value(`select coalesce(bool_and(r.batch_id='${f.lot}'),false) and sum(r.quantity)=1
      from public.inventory_reservations r join public.order_requests o on o.id=r.order_request_id
      where o.idempotency_key=${literal(payload.idempotencyKey)} and r.status='active';`)
    expect(`${label}: actual purchase reserves only eligible physical lot`,selected==='t',
      value(`select coalesce(string_agg(r.batch_id::text,','),'none') from public.inventory_reservations r
        join public.order_requests o on o.id=r.order_request_id where o.idempotency_key=${literal(payload.idempotencyKey)};`))
  }
  // Existing allocation revalidation must reject a later custody discrepancy
  // without committing it. Invoke the current actual confirmation function.
  const f=fixture('eligible-revalidation',1)
  sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA' where id='${f.lot}';`)
  const p=guestPayload(f,{shippingAmount:95,shippingQuoteStatus:'customer_confirmed'})
  const bought=JSON.parse(value(`set role anon; select row_to_json(r)::text from ${canonicalCall(p)} r;`))
  sync(`update public.product_batches set custodian=null where id='${f.lot}';`)
  const snapshot=()=>value(`select jsonb_build_object('order',to_jsonb(o),'physical',
    (select to_jsonb(b) from public.product_batches b where b.id='${f.lot}'),'allocations',
    (select jsonb_agg(to_jsonb(r) order by id) from public.inventory_reservations r where r.order_request_id=o.id),
    'events',(select jsonb_agg(to_jsonb(e) order by id) from public.inventory_events e where e.reference_id=o.id))::text
    from public.order_requests o where id='${bought.id}';`)
  const prior=snapshot(); let refused=false
  try {value(`${staff} select public.confirm_order_request('${bought.id}','Synthetic custody discrepancy');`)}
  catch(error) {refused=/K2_RESERVATION_RECONCILIATION_REQUIRED|K2_RESERVATION_COVERAGE_REQUIRED/.test(error.message)}
  expect('current confirmation refuses invalid-custody held lot without committing order or inventory',refused && snapshot()===prior)
  let defaultRefused=false
  try {value(`${staff} select public.confirm_order_request('${bought.id}');`)}
  catch(error) {defaultRefused=/K2_RESERVATION_RECONCILIATION_REQUIRED|K2_RESERVATION_COVERAGE_REQUIRED/.test(error.message)}
  expect('default-NULL-reason confirmation revalidates custody and preserves all effects on refusal',
    defaultRefused && snapshot()===prior)
  if(!beforeEligibleFix) {
    sync(`update public.product_batches set custodian='CUST-STAFF-ELENA' where id='${f.lot}';`)
    value(`${staff} select public.confirm_order_request('${bought.id}','Synthetic restored custody');`)
    const confirmed=snapshot()
    value(`${staff} select public.confirm_order_request('${bought.id}','Synthetic exact confirmation retry');`)
    expect('current confirmation recovers after custody restoration and replays without another commitment',
      snapshot()===confirmed && value(`select status='confirmed' and
        (select count(*) from public.inventory_events where reference_id=o.id and event_type='stock_committed')=1
        from public.order_requests o where id='${bought.id}';`)==='t')
    for(const days of [31,89,90]) {
      const positive=fixture(`eligible-positive-${days}`,1)
      sync(`begin; update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA',
        expiry_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${days},
        best_before_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${days}
        where id='${positive.lot}'; commit;`)
      if(days<90) value(command('lot_clearance',{batchId:positive.lot,approved:true,
        reason:'Synthetic valid clearance boundary purchase'}))
      expect(`valid ${days}-day lot offers exactly one unit before purchase`,offers(positive.sku)===1)
      const payload=guestPayload(positive,{shippingAmount:95,shippingQuoteStatus:'customer_confirmed'})
      const accepted=JSON.parse(value(`set timezone='Etc/GMT+12'; set role anon;
        select row_to_json(r)::text from ${guestCall(payload,`192.0.2.${days===31?231:days===89?232:233}`)} r;`))
      expect(`valid ${days}-day actual signed purchase succeeds independent of caller timezone`,accepted.ok===true)
      const id=value(`select id from public.order_requests where idempotency_key=${literal(payload.idempotencyKey)};`)
      value(`${staff} select public.confirm_order_request('${id}','Synthetic fully reserved valid lot');`)
      expect(`valid ${days}-day fully reserved lot remains valid for confirmation and exact commitment`,value(`select
        status='confirmed' and (select count(*) from public.inventory_reservations where order_request_id=o.id
          and batch_id='${positive.lot}' and quantity=1 and committed_at is not null)=1
        and (select quantity=1 and reserved_quantity=1 from public.product_batches where id='${positive.lot}')
        from public.order_requests o where id='${id}';`)==='t' && offers(positive.sku)===0)
    }
  }
  if(failures.length) throw new Error(`ELIGIBLE_LOT_PARITY_FAILURES (${failures.length}): ${failures.join(' | ')}`)
}
