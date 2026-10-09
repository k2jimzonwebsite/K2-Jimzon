// IDEA-20261002-09. Owned restored-schema clone only; synthetic physical facts.
import { randomUUID } from 'node:crypto'
import { signedAdminCommandArguments } from '../server/admin-bff/security.js'

export async function rehearsePaymentLotParity({sync,value,check,fixture,guestPayload,guestCall,
  actor,literal,captureDefinition,captureMetadata,source,withoutTransaction,beforePaymentLotFix,advisor}) {
  const reviewer='42000000-0000-4000-8000-000000000002'
  const failures=[]
  const expect=(name,ok,detail)=>{try {check(name,ok,detail)} catch(error){failures.push(error.message)}}
  const command=(action,payload,who=actor,key=randomUUID(),lot=false)=>{
    const a=signedAdminCommandArguments(action,who,key,payload)
    return `select set_config('request.jwt.claim.sub','${who}',false);
      select set_config('request.jwt.claims','{"aal":"aal2"}',false); set role authenticated;
      select public.${lot?'execute_admin_lot_command_v1':'execute_admin_fulfillment_command_v1'}(${[
        'p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature',
      ].map(k=>literal(a[k])).join(',')});`
  }
  const state=id=>JSON.parse(value(`select jsonb_build_object('expectedPaymentStatus',payment_status,
    'expectedUpdatedAt',updated_at)::text from public.order_requests where id='${id}';`))
  const payload=(id,toStatus,extra={})=>({orderRequestId:id,toStatus,
    evidenceNote:'Synthetic merchant review',...state(id),...extra})
  // Full involved tables plus private controls; not merely a status assertion.
  const snapshot=()=>value(`select jsonb_build_object(
    'orders',(select jsonb_agg(to_jsonb(t) order by id) from public.order_requests t),
    'items',(select jsonb_agg(to_jsonb(t) order by id) from public.order_request_items t),
    'legacy',(select jsonb_agg(to_jsonb(t) order by id) from public.orders t),
    'lots',(select jsonb_agg(to_jsonb(t) order by id) from public.product_batches t),
    'balances',(select jsonb_agg(to_jsonb(t) order by sku,location_code) from public.inventory_balances t),
    'products',(select jsonb_agg(to_jsonb(t) order by sku) from public.products t),
    'reservations',(select jsonb_agg(to_jsonb(t) order by id) from public.inventory_reservations t),
    'inventory_events',(select jsonb_agg(to_jsonb(t) order by id) from public.inventory_events t),
    'order_events',(select jsonb_agg(to_jsonb(t) order by id) from public.order_request_events t),
    'scans',(select jsonb_agg(to_jsonb(t) order by id) from public.packing_scan_events t),
    'coupons',(select jsonb_agg(to_jsonb(t) order by id) from public.coupons t),
    'redemptions',(select jsonb_agg(to_jsonb(t) order by id) from public.coupon_redemptions t),
    'nonces',(select jsonb_agg(to_jsonb(t) order by actor_id,action,nonce) from k2_private.admin_request_nonces t),
    'rates',(select jsonb_agg(to_jsonb(t) order by scope,subject,bucket_start) from k2_private.admin_request_rate_buckets t),
    'receipts',(select jsonb_agg(to_jsonb(t) order by actor_id,action,idempotency_key) from k2_private.admin_command_receipts t)
  )::text;`)
  for(const [name,signature] of [
    ['payment','public.set_order_request_payment_status(uuid,text,text,jsonb)'],
    ['handover','public.fulfill_order_request(uuid,text)'],
  ]) captureDefinition(name,sync(`select replace(pg_get_functiondef('${signature}'::regprocedure),chr(13),'');`))
  captureMetadata('before-overlay',value(`select jsonb_agg(to_jsonb(p) order by oid)::text from pg_proc p
    where oid in ('public.set_order_request_payment_status(uuid,text,text,jsonb)'::regprocedure,
      'public.fulfill_order_request(uuid,text)'::regprocedure);`))
  // Dump omits ACLs. Only a missing handover ACL gets the explicit historical
  // named staff contract; never infer an actual provider grant from this overlay.
  sync(`do $$ begin if (select proacl is null from pg_proc where oid='public.fulfill_order_request(uuid,text)'::regprocedure) then
    revoke all on function public.fulfill_order_request(uuid,text) from public,anon,authenticated,service_role;
    grant execute on function public.fulfill_order_request(uuid,text) to authenticated;
  end if; end $$;`)
  const metadata=()=>value(`select jsonb_agg(to_jsonb(p)-'prosrc' order by oid)::text from pg_proc p
    where oid in ('public.set_order_request_payment_status(uuid,text,text,jsonb)'::regprocedure,
      'public.fulfill_order_request(uuid,text)'::regprocedure);`)
  const boundary=()=>value(`select jsonb_build_object('public',to_jsonb(p),'view',to_jsonb(c),
    'view_body',pg_get_viewdef(c.oid,true))::text from pg_proc p cross join pg_class c
    where p.oid='public.get_public_product_stock()'::regprocedure and c.oid='public.v_product_stock_from_batches'::regclass;`)
  captureMetadata('before-install',metadata())
  if(!beforePaymentLotFix) {
    const migration=source('supabase/migrations/20261002074418_payment_handover_lot_eligibility.sql')
    const priorMetadata=metadata(),priorSnapshot=snapshot(),priorBoundary=boundary()
    advisor('payment-before'); sync(migration); advisor('payment-after')
    check('payment/handover eligibility installation preserves full metadata, public boundary and all physical/business/control facts',
      metadata()===priorMetadata && snapshot()===priorSnapshot && boundary()===priorBoundary)
    const definitions=()=>value(`select jsonb_agg(pg_get_functiondef(p.oid) order by oid)::text from pg_proc p
      where oid in ('public.set_order_request_payment_status(uuid,text,text,jsonb)'::regprocedure,
        'public.fulfill_order_request(uuid,text)'::regprocedure);`)
    const installed=definitions(); sync(migration)
    check('payment/handover eligibility installation replays with no additional effects',
      definitions()===installed && metadata()===priorMetadata && snapshot()===priorSnapshot)
    const paymentDefinition=sync(`select pg_get_functiondef('public.set_order_request_payment_status(uuid,text,text,jsonb)'::regprocedure);`)
    const handoverDefinition=sync(`select pg_get_functiondef('public.fulfill_order_request(uuid,text)'::regprocedure);`)
    const variants=[
      `alter function public.set_order_request_payment_status(uuid,text,text,jsonb) strict;`,
      `grant execute on function public.set_order_request_payment_status(uuid,text,text,jsonb) to authenticated;`,
      `alter function public.set_order_request_payment_status(uuid,text,text,jsonb) parallel safe;`,
      `alter function public.set_order_request_payment_status(uuid,text,text,jsonb) set search_path=public;`,
      paymentDefinition.replace('if v_submitter is null or v_submitter = auth.uid() then','if false then')+';',
      `alter function public.fulfill_order_request(uuid,text) strict;`,
      `grant execute on function public.fulfill_order_request(uuid,text) to anon;`,
      `alter function public.fulfill_order_request(uuid,text) set search_path='public,pg_temp';`,
      handoverDefinition.replace('if not public.is_staff() then','if false then')+';',
      `alter function k2_private.lot_is_eligible_v1(public.product_batches) strict;`,
      `grant execute on function k2_private.lot_is_eligible_v1(public.product_batches) to anon;`,
    ]
    for(let i=0;i<variants.length;i++) {
      let refused=false
      try {sync(`begin; ${variants[i]} ${withoutTransaction(migration)} rollback;`)}
      catch(error){refused=error.message.includes('MAP-023 payment lot eligibility:')}
      expect(`payment/handover correction refuses drift ${i+1} with rollback`,refused && definitions()===installed
        && metadata()===priorMetadata && snapshot()===priorSnapshot && boundary()===priorBoundary)
    }
  }
  const business=()=>{
    const state=JSON.parse(snapshot());for(const key of ['nonces','rates','receipts'])delete state[key]
    return JSON.stringify(state)
  }
  const acceptedCharge=id=>value(`select jsonb_build_object('charge',jsonb_build_array(subtotal,discount_amount,
    shipping_amount,total_amount),'submitted_evidence',jsonb_build_object('method',payment_evidence->'method',
      'amount',payment_evidence->'amount','currency',payment_evidence->'currency',
      'payer_name',payment_evidence->'payer_name','payment_reference',payment_evidence->'payment_reference',
      'proof_asset_ref',payment_evidence->'proof_asset_ref'))::text from public.order_requests where id='${id}';`)
  for(const phase of ['payment','handover']) for(const kind of ['custody','history','thirty-day']) {
    const f=fixture(`parity-${phase}-${kind}`,1)
    sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA',
      expiry_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${kind==='history'?60:180},
      best_before_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${kind==='history'?60:180}
      where id='${f.lot}';`)
    if(kind==='history') value(command('lot_clearance',{batchId:f.lot,approved:true,
      reason:'Synthetic valid clearance before purchase'},actor,randomUUID(),true))
    const purchase=guestPayload(f,{shippingAmount:95,shippingQuoteStatus:'customer_confirmed'})
    check(`${phase}/${kind}: actual signed purchase allocates valid stock after eligibility correction`,
      value(`set role anon; select ok from ${guestCall(purchase,`192.0.2.${phase==='payment'?240:241}`)};`)==='t')
    const id=value(`select id from public.order_requests where idempotency_key=${literal(purchase.idempotencyKey)};`)
    value(command('payment_status',payload(id,'awaiting_instructions')))
    value(command('payment_status',payload(id,'evidence_submitted',{paymentMethod:'gcash',paymentAmount:195,
      paymentCurrency:'PHP',payerName:'Synthetic payer',paymentReference:'SYNTHETIC-PARITY'})))
    if(phase==='handover') {
      value(command('payment_status',payload(id,'verified'),reviewer))
      value(command('confirm_order',{orderRequestId:id,reason:'Synthetic valid confirmation before packing'}))
      const reservation=value(`select id from public.inventory_reservations where order_request_id='${id}';`)
      value(command('packing_scan',{orderRequestId:id,scannedCode:f.sku,reservationId:reservation,lotConfirmed:true}))
    }
    if(kind==='custody') sync(`update public.product_batches set custodian=null where id='${f.lot}';`)
    else {
      const days=kind==='thirty-day'?30:61
      sync(`begin; update public.product_batches set expiry_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${days},
        best_before_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${days} where id='${f.lot}';
        insert into public.batch_change_events(batch_id,sku,reason,actor_id,old_data,new_data)
        values('${f.lot}',${literal(f.sku)},'Synthetic expiry correction history','${actor}',
          jsonb_build_object('expiry_date',((transaction_timestamp() at time zone 'Asia/Manila')::date+${kind==='history'?60:180})::text),
          jsonb_build_object('expiry_date',((transaction_timestamp() at time zone 'Asia/Manila')::date+${days})::text,
            'inventory_status','available')); commit;`)
    }
    const prior=snapshot(); let refused=false; let result=null; let commandError=null
    try {result=JSON.parse(value(phase==='payment'?command('payment_status',payload(id,'verified'),reviewer)
      :command('fulfill_order',{orderRequestId:id,handoverNote:'Synthetic physical handover'})))}
    catch(error) {commandError=error.message; refused=error.message.includes(phase==='payment'
      ?'K2_PAYMENT_STOCK_INELIGIBLE':'K2_RESERVATION_RECONCILIATION_REQUIRED')}
    const unchanged=snapshot()===prior
    expect(`${phase}/${kind}: actual signed command refuses newly ineligible stock with full business/control rollback`,
      refused && unchanged,JSON.stringify({commandSucceeded:result!==null,commandError,
        resultStatus:result?.status,paymentStatus:result?.paymentStatus,snapshotUnchanged:unchanged,
        physicalQuantity:Number(value(`select quantity from public.product_batches where id='${f.lot}';`))}))
    if(!beforePaymentLotFix && refused) {
      const charge=acceptedCharge(id)
      if(kind==='custody')sync(`update public.product_batches set custodian='CUST-STAFF-ELENA' where id='${f.lot}';`)
      else if(kind==='history')value(command('lot_clearance',{batchId:f.lot,approved:true,
        reason:'Synthetic fresh approval after invalidation'},actor,randomUUID(),true))
      // The whole lot trigger quarantines 0-30-day stock; restoring a date alone
      // intentionally does not revive it. Simulate explicit disposition review.
      else sync(`update public.product_batches set inventory_status='available',expiry_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+180,
        best_before_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+180 where id='${f.lot}';`)
      const recoveryKey=randomUUID()
      const recoveryPayload=phase==='payment'?payload(id,'verified'):{orderRequestId:id,handoverNote:'Synthetic safe recovered handover'}
      const recovery=()=>command(phase==='payment'?'payment_status':'fulfill_order',recoveryPayload,
        phase==='payment'?reviewer:actor,recoveryKey)
      const accepted=value(recovery());const recovered=business()
      check(`${phase}/${kind}: same order recovers with unchanged accepted charge and one commitment`,
        acceptedCharge(id)===charge
        && value(`select count(*) from public.inventory_events where reference_id='${id}' and event_type='stock_committed';`)==='1'
        && Number(value(`select quantity from public.product_batches where id='${f.lot}';`))===(phase==='payment'?1:0))
      check(`${phase}/${kind}: freshly signed exact recovery retry preserves business/physical history`,
        value(recovery())===accepted && business()===recovered)
    }
  }
  if(!beforePaymentLotFix) for(const days of [31,89,90]) {
    const f=fixture(`payment-handover-positive-${days}`,1)
    sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA',
      expiry_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${days},
      best_before_date=(transaction_timestamp() at time zone 'Asia/Manila')::date+${days} where id='${f.lot}';`)
    if(days<90)value(command('lot_clearance',{batchId:f.lot,approved:true,
      reason:'Synthetic valid payment/handover boundary'},actor,randomUUID(),true))
    const purchase=guestPayload(f,{shippingAmount:95,shippingQuoteStatus:'customer_confirmed'})
    check(`valid ${days}-day signed boundary purchase succeeds after payment/handover correction`,
      value(`set role anon; select ok from ${guestCall(purchase,`192.0.2.${days===31?245:days===89?246:247}`)};`)==='t')
    const id=value(`select id from public.order_requests where idempotency_key=${literal(purchase.idempotencyKey)};`)
    value(command('payment_status',payload(id,'awaiting_instructions')))
    value(command('payment_status',payload(id,'evidence_submitted',{paymentMethod:'gcash',paymentAmount:195,
      paymentCurrency:'PHP',payerName:'Synthetic boundary payer',paymentReference:'SYNTHETIC-BOUNDARY'})))
    const charge=acceptedCharge(id)
    value(`set timezone='Etc/GMT+12'; ${command('payment_status',payload(id,'verified'),reviewer)}`)
    check(`valid ${days}-day fully reserved lot verifies under a different caller calendar`,
      acceptedCharge(id)===charge && value(`select quantity=1 and reserved_quantity=1 from public.product_batches where id='${f.lot}';`)==='t')
    value(command('confirm_order',{orderRequestId:id,reason:'Synthetic valid boundary confirmation'}))
    const rid=value(`select id from public.inventory_reservations where order_request_id='${id}';`)
    const attribution=()=>value(`select jsonb_build_array(committed_at,committed_by,commit_cause,commit_reason)::text
      from public.inventory_reservations where id='${rid}';`)
    const committed=attribution()
    value(command('packing_scan',{orderRequestId:id,scannedCode:f.sku,reservationId:rid,lotConfirmed:true}))
    const key=randomUUID(),handover={orderRequestId:id,handoverNote:'Synthetic valid boundary handover'}
    const accepted=value(`set timezone='Etc/GMT+12'; ${command('fulfill_order',handover,actor,key)}`)
    const after=business()
    check(`valid ${days}-day exact physical handover preserves charge and commitment attribution`,
      acceptedCharge(id)===charge && attribution()===committed
      && value(`select quantity=0 and reserved_quantity=0 from public.product_batches where id='${f.lot}';`)==='t'
      && value(`select count(*) from public.inventory_events where reference_id='${id}' and event_type='fulfilled';`)==='1')
    check(`valid ${days}-day freshly signed handover retry preserves all business history`,
      value(command('fulfill_order',handover,actor,key))===accepted && business()===after)
  }
  if(failures.length) throw new Error(`PAYMENT_LOT_PARITY_FAILURES (${failures.length}): ${failures.join(' | ')}`)
}
