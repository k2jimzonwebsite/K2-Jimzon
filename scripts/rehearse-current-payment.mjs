// Invoked only by the owned disposable restored-schema witness. No provider calls.
import { randomUUID } from 'node:crypto'
import { signedAdminCommandArguments } from '../server/admin-bff/security.js'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { signedRpcArguments } from '../server/storefront-bff/security.js'

export function paymentVerdictAuthoritySql() {
  const sha=s=>createHash('sha256').update(s).digest('hex')
  const q=s=>"'"+String(s).replaceAll("'","''")+"'"
  const capture='docs/evidence/20261004-category-shelf-life/foundation-qualified-schema-guest-checkout-legacy-review07/metadata-388.json'
  const bytes=fs.readFileSync(capture)
  if(sha(bytes)!=='c9babb44aa95790f0d5a7efc7fcd4aac3b49c6682d2e962ae2e5f957b17606ed')throw Error('PAYMENT_VERDICT_CAPTURE_DRIFT')
  const data=JSON.parse(bytes)
  const exact=(body,anchor,replacement)=>{if(body.split(anchor).length!==2)throw Error('PAYMENT_VERDICT_ANCHOR_DRIFT');return body.replace(anchor,()=>replacement)}
  const identities=['public.set_order_request_payment_status(uuid, text, text, jsonb)','public.execute_admin_fulfillment_command_v1(text, bigint, uuid, uuid, text, text)']
  const rows=identities.map(identity=>{
    const f=data.functions.find(f=>f.signature===identity)
    if(!f)throw Error('PAYMENT_VERDICT_SIGNATURE_REQUIRED')
    const before=f.catalog.prosrc.replaceAll('\r\n','\n')
    const anchor=identity.includes('set_order_request_payment_status')
      ?'  select * into v_order from public.order_requests where id=p_order_request_id for update;'
      :"  v_payload_hash := encode(extensions.digest(convert_to(p_payload_text, 'UTF8'), 'sha256'), 'hex');"
    const predicate=identity.includes('set_order_request_payment_status')
      ?"p_to_status in ('verified','failed','refunded')"
      :"p_action='payment_status' and v_payload->>'toStatus' in ('verified','failed','refunded')"
    const prior=exact(before,anchor,`  if ${predicate} and not coalesce(public.is_admin(),false) then
    raise exception using errcode='42501',message='K2_PAYMENT_VERDICT_ADMIN_REQUIRED';
  end if;
${anchor}`)
    const body=exact(before,anchor,`  if ${predicate} then
    perform k2_private.lock_category_policy_v1(false);
    perform 1 from public.user_profiles where id=auth.uid() for share;
    if not found or not coalesce(public.is_admin(),false) then
      raise exception using errcode='42501',message='K2_PAYMENT_VERDICT_ADMIN_REQUIRED';
    end if;
  end if;
${anchor}`)
    return {identity,before:sha(before),prior:sha(prior),after:sha(body),body,acl:f.catalog.proacl,config:f.catalog.proconfig,definer:f.catalog.prosecdef}
  })
  const dependencies=['public.is_admin()','k2_private.lock_category_policy_v1(boolean)','k2_private.verify_admin_bff_request(text, bigint, uuid, uuid, text, text)','k2_private.guard_order_delivery_charge_v1()'].map(identity=>{
    const f=data.functions.find(f=>f.signature===identity)
    if(!f)throw Error('PAYMENT_VERDICT_DEPENDENCY_REQUIRED')
    return {identity,body:sha(f.catalog.prosrc.replaceAll('\r\n','\n')),acl:f.catalog.proacl,config:f.catalog.proconfig,definer:f.catalog.prosecdef}
  })
  return `begin;
set local lock_timeout='2s';set local statement_timeout='10s';set local search_path='';
select pg_catalog.pg_advisory_xact_lock(1261585232,1347374169);
do $financial_authority$ declare t record;b record;a record;v_before boolean:=true;v_prior boolean:=true;v_after boolean:=true;v_hash text;
begin
 if current_user<>'postgres' then raise exception 'K2_PAYMENT_VERDICT_OWNER_REQUIRED';end if;
 for t in select * from jsonb_to_recordset(${q(JSON.stringify(dependencies))}::jsonb)
  as x(identity text,body text,acl text[],config text[],definer boolean) loop
  select * into b from pg_proc where oid=to_regprocedure(t.identity);
  if not found or pg_get_userbyid(b.proowner)<>'postgres' or b.proacl::text[] is distinct from t.acl
   or b.proconfig is distinct from t.config or b.prosecdef is distinct from t.definer
   or encode(extensions.digest(convert_to(replace(b.prosrc,chr(13)||chr(10),chr(10)),'UTF8'),'sha256'),'hex') is distinct from t.body
   then raise exception 'K2_PAYMENT_VERDICT_DEPENDENCY_DRIFT';end if;
 end loop;
 for t in select * from jsonb_to_recordset(${q(JSON.stringify(rows))}::jsonb)
  as x(identity text,before text,prior text,after text,body text,acl text[],config text[],definer boolean) loop
  select * into b from pg_proc where oid=to_regprocedure(t.identity);
  if not found or pg_get_userbyid(b.proowner)<>'postgres' or b.proacl::text[] is distinct from t.acl
   or b.proconfig is distinct from t.config or b.prosecdef is distinct from t.definer then raise exception 'K2_PAYMENT_VERDICT_AUTHORITY_DRIFT';end if;
  v_hash:=encode(extensions.digest(convert_to(replace(b.prosrc,chr(13)||chr(10),chr(10)),'UTF8'),'sha256'),'hex');
  v_before:=v_before and v_hash=t.before;v_prior:=v_prior and v_hash=t.prior;v_after:=v_after and v_hash=t.after;
 end loop;
 if not v_before and not v_prior and not v_after then raise exception 'K2_PAYMENT_VERDICT_BODY_DRIFT';end if;
 if v_after then return;end if;
 for t in select * from jsonb_to_recordset(${q(JSON.stringify(rows))}::jsonb)
  as x(identity text,before text,prior text,after text,body text,acl text[],config text[],definer boolean) loop
  select p.*,pg_get_functiondef(p.oid) definition into b from pg_proc p where oid=to_regprocedure(t.identity);
  execute replace(b.definition,b.prosrc,t.body);select * into a from pg_proc where oid=b.oid;
  if a.prosrc is distinct from t.body or (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc'-'definition') then raise exception 'K2_PAYMENT_VERDICT_METADATA_CHANGED';end if;
 end loop;
end $financial_authority$;
commit;
`
}

export function legacyPositiveWriterAuthoritySql() {
  const sha=s=>createHash('sha256').update(s).digest('hex'),q=s=>"'"+String(s).replaceAll("'","''")+"'"
  const bytes=fs.readFileSync('docs/evidence/20261004-category-shelf-life/foundation-qualified-schema-guest-checkout-legacy-review07/metadata-388.json')
  if(sha(bytes)!=='c9babb44aa95790f0d5a7efc7fcd4aac3b49c6682d2e962ae2e5f957b17606ed')throw Error('LEGACY_WRITER_CAPTURE_DRIFT')
  const data=JSON.parse(bytes),exact=(s,a,b)=>{if(s.split(a).length!==2)throw Error('LEGACY_WRITER_ANCHOR_DRIFT');return s.replace(a,()=>b)}
  const identities=['public.confirm_order_request(uuid, text)','public.fulfill_order_request(uuid, text)','public.record_packing_scan_exact_v1(uuid, text, uuid, boolean)','public.record_packing_scan(uuid, text)','public.commit_order_request_stock_v1(uuid, text, text)','public.reserve_order_request_lots_v1(uuid, text)','public.submit_order_payment_receipt_v1(uuid, text, text, text, text, uuid)']
  const rows=identities.map(identity=>{
    const f=data.functions.find(f=>f.signature===identity);if(!f)throw Error('LEGACY_WRITER_SIGNATURE_REQUIRED')
    const before=f.catalog.prosrc.replaceAll('\r\n','\n');let body=before
    const guard=`  if v_order.channel_source='website' and not exists(select 1 from k2_private.order_delivery_snapshots where order_id=v_order.id) then
    raise exception using errcode='22023',message='K2_DELIVERY_REVIEW_REQUIRED';
  end if;
`
    if(identity.includes('submit_order_payment_receipt')){
      const anchor="  if v_order.status not in ('submitted','confirmed') or v_order.payment_status in ('verified','refunded') then"
      body=exact(body,anchor,`  if v_order.channel_source='website' and not exists(select 1 from k2_private.order_delivery_snapshots where order_id=v_order.id) then
    return jsonb_build_object('ok',false,'error','K2_DELIVERY_REVIEW_REQUIRED');
  end if;
  if v_order.payment_status not in ('awaiting_instructions','evidence_submitted','failed')
    or v_order.shipping_quote_status not in ('platform_charged','customer_confirmed','waived')
    or v_order.total_amount is null or v_order.total_amount<0 then
    return jsonb_build_object('ok',false,'error','ORDER_RECEIPT_CLOSED');
  end if;
${anchor}`)
    }else if(identity.includes('commit_order_request_stock')){
      const anchor="  if not found then raise exception 'Order request not found'; end if;"
      body=exact(body,anchor,anchor+`
  if exists(select 1 from public.order_requests o where o.id=p_order_request_id and o.channel_source='website')
    and not exists(select 1 from k2_private.order_delivery_snapshots where order_id=p_order_request_id) then
    raise exception using errcode='22023',message='K2_DELIVERY_REVIEW_REQUIRED';
  end if;`)
    }else if(identity.includes('reserve_order_request_lots')){
      const anchor='  -- K2_PURCHASE_BALANCE_LOCK_ORDER_V1'
      body=exact(body,anchor,`  if v_order.channel_source='website' and not exists(select 1 from k2_private.order_delivery_snapshots where order_id=v_order.id)
    and not exists(select 1 from k2_private.order_delivery_construction_context c where c.order_id=v_order.id
      and c.backend_pid=pg_catalog.pg_backend_pid() and c.transaction_id=pg_catalog.pg_current_xact_id()) then
    raise exception using errcode='22023',message='K2_DELIVERY_REVIEW_REQUIRED';
  end if;
${anchor}`)
    }else{
      const anchor=identity.includes('confirm_order_request')?"  if v_order.status <> 'submitted' then":identity.includes('fulfill_order_request')?"  if v_order.status <> 'confirmed' then":identity.includes('record_packing_scan_exact')?'  perform 1 from public.order_request_items':"  if v_order.status <> 'confirmed' then"
      body=exact(body,anchor,guard+anchor)
    }
    return {identity,before:sha(before),after:sha(body),body,acl:f.catalog.proacl,config:f.catalog.proconfig,definer:f.catalog.prosecdef}
  })
  const dependencies=['k2_private.guard_order_delivery_charge_v1()','k2_private.guard_order_delivery_construction_v1()'].map(identity=>{
    const f=data.functions.find(f=>f.signature===identity);if(!f)throw Error('LEGACY_WRITER_DEPENDENCY_REQUIRED')
    return {identity,body:sha(f.catalog.prosrc.replaceAll('\r\n','\n')),acl:f.catalog.proacl,config:f.catalog.proconfig,definer:f.catalog.prosecdef}
  })
  return `begin;
set local lock_timeout='2s';set local statement_timeout='10s';set local search_path='';
select pg_catalog.pg_advisory_xact_lock(1261585232,1347374169);
do $legacy_writers$ declare t record;b record;a record;v_before boolean:=true;v_after boolean:=true;v_hash text;
begin
 if current_user<>'postgres' then raise exception 'K2_LEGACY_WRITER_OWNER_REQUIRED';end if;
 for t in select * from jsonb_to_recordset(${q(JSON.stringify(dependencies))}::jsonb)
  as x(identity text,body text,acl text[],config text[],definer boolean) loop
  select * into b from pg_proc where oid=to_regprocedure(t.identity);
  if not found or pg_get_userbyid(b.proowner)<>'postgres' or b.proacl::text[] is distinct from t.acl
   or b.proconfig is distinct from t.config or b.prosecdef is distinct from t.definer
   or encode(extensions.digest(convert_to(replace(b.prosrc,chr(13)||chr(10),chr(10)),'UTF8'),'sha256'),'hex') is distinct from t.body
   then raise exception 'K2_LEGACY_WRITER_DEPENDENCY_DRIFT';end if;
 end loop;
 for t in select * from jsonb_to_recordset(${q(JSON.stringify(rows))}::jsonb)
  as x(identity text,before text,after text,body text,acl text[],config text[],definer boolean) loop
  select * into b from pg_proc where oid=to_regprocedure(t.identity);
  if not found or pg_get_userbyid(b.proowner)<>'postgres' or b.proacl::text[] is distinct from t.acl
   or b.proconfig is distinct from t.config or b.prosecdef is distinct from t.definer then raise exception 'K2_LEGACY_WRITER_AUTHORITY_DRIFT';end if;
  v_hash:=encode(extensions.digest(convert_to(replace(b.prosrc,chr(13)||chr(10),chr(10)),'UTF8'),'sha256'),'hex');
  v_before:=v_before and v_hash=t.before;v_after:=v_after and v_hash=t.after;
 end loop;
 if not v_before and not v_after then raise exception 'K2_LEGACY_WRITER_BODY_DRIFT';end if;
 if v_after then return;end if;
 for t in select * from jsonb_to_recordset(${q(JSON.stringify(rows))}::jsonb)
  as x(identity text,before text,after text,body text,acl text[],config text[],definer boolean) loop
  select p.*,pg_get_functiondef(p.oid) definition into b from pg_proc p where oid=to_regprocedure(t.identity);
  execute replace(b.definition,b.prosrc,t.body);select * into a from pg_proc where oid=b.oid;
  if a.prosrc is distinct from t.body or (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc'-'definition') then raise exception 'K2_LEGACY_WRITER_METADATA_CHANGED';end if;
 end loop;
end $legacy_writers$;
commit;
`
}

async function rehearseLegacyPaymentLifecycle(c) {
  const {out,database,good,sql,check,report,fingerprint,corrected,setup,actor,order,refundOrder,q,call,promote}=c
  const pack='e8000000-0000-4000-8000-000000000005',res='e8000000-0000-4000-8000-00000000000a'
  const parse=s=>JSON.parse(s.split('\n').at(-1))
  const media=Buffer.from('%PDF-1.7\nSynthetic local payment proof, no actual transfer').toString('base64')
  const upload=(key=randomUUID(),access=order,id=order)=>`public.submit_order_payment_receipt_v1(${q(id)},${q(access)},'Synthetic local proof','application/pdf',${q(media)},${q(key)})`
  good(database,`begin;${setup}
    insert into public.hubs(id,name,code,country,role) values('HUB-MNL-CENTRAL','Synthetic lifecycle hub','SYN-LEGACY','PH','Synthetic test');
    insert into public.custodians(id,name,role,hub_id) values('SYN-LEGACY-CUSTODY','Synthetic lifecycle custodian','Synthetic test','HUB-MNL-CENTRAL');
    insert into k2_private.category_shelf_life_policy(category_id,minimum_days,version,actor_id,reason)
    values('e8000000-0000-4000-8000-00000000000c',150,1,${q(actor)},'Explicit synthetic lifecycle policy');
    select k2_private.lock_category_policy_v1(false);select k2_private.start_category_lot_context_v1(10);
    update public.inventory_reservations set expires_at=clock_timestamp()+interval '30 minutes'
    where sku='SYNTHETIC-LEGACY-LIFECYCLE';
    update public.inventory_reservations set committed_at=clock_timestamp(),committed_by=${q(actor)},commit_cause='confirmation',commit_reason='Explicit synthetic historical confirmation'
    where id=${q(res)};
    select k2_private.clear_category_lot_context_v1();
    insert into public.channel_listings(sku,channel_source,status,publication_status,validation_errors)
    values('SYNTHETIC-LEGACY-LIFECYCLE','website','Active','ready','[]');
    insert into public.conversations(customer_name,platform,source_kind,source_id)
    values('Synthetic historical lifecycle','Website','order_request',${q(order)});commit;`)
  const facts=()=>parse(good(database,`select jsonb_build_object(
    'physical',(select quantity from public.product_batches where sku='SYNTHETIC-LEGACY-LIFECYCLE'),
    'reserved',(select reserved_quantity from public.product_batches where sku='SYNTHETIC-LEGACY-LIFECYCLE'),
    'onHand',(select on_hand from public.inventory_balances where sku='SYNTHETIC-LEGACY-LIFECYCLE'),
    'balanceReserved',(select reserved from public.inventory_balances where sku='SYNTHETIC-LEGACY-LIFECYCLE'),
    'packed',(select packed_quantity from public.inventory_reservations where id=${q(res)}),
    'receipts',(select count(*) from k2_private.order_payment_receipts where order_id=${q(order)}),
    'snapshots',(select count(*) from k2_private.order_delivery_snapshots where order_id in (${q(order)},${q(pack)})),
    'contexts',(select count(*) from k2_private.category_lot_command_context))::text;`))
  report.legacyLifecycle={before:facts(),cases:[],corrected:false}
  check('synthetic historical lifecycle starts physical6 held3 without snapshots',report.legacyLifecycle.before.physical===6&&report.legacyLifecycle.before.reserved===3&&report.legacyLifecycle.before.onHand===6&&report.legacyLifecycle.before.balanceReserved===3&&report.legacyLifecycle.before.snapshots===0)
  let baseline=fingerprint(database)
  if(corrected){
    const aal1=sql(database,`begin;${setup.replace('"aal2"','"aal1"')}set local role authenticated;
      select to_jsonb(public.confirm_order_request(${q(order)},'Synthetic AAL1 boundary probe'));reset role;rollback;`)
    report.legacyLifecycle.aal1Probe=aal1
    check('existing stock context already refuses AAL1 confirmation',aal1.exit===3&&aal1.stderr.includes('K2_AAL2_REQUIRED'))
    check('AAL1 reproduction fully rolls back',JSON.stringify(fingerprint(database))===JSON.stringify(baseline))
    const savedKey=randomUUID(),savedReceipt=parse(good(database,`begin;${setup}set local role anon;select ${upload(savedKey)};reset role;commit;`))
    check('retain explicitly synthetic pre-correction receipt history',savedReceipt.ok===true)
    baseline=fingerprint(database)
    const correction=legacyPositiveWriterAuthoritySql(),prepared='supabase/prepared/legacy_positive_writer_authority.sql'
    check('prepared positive writer correction equals maintained builder',fs.readFileSync(prepared,'utf8')===correction)
    const catalogue=()=>parse(good(database,"select jsonb_object_agg(oid::text,to_jsonb(p))::text from pg_proc p;"))
    const before=catalogue();good(database,correction);const after=catalogue()
    const changed=Object.keys(before).filter(id=>JSON.stringify(before[id])!==JSON.stringify(after[id]))
    check('positive writer correction changes only seven function bodies',changed.length===7&&changed.every(id=>{const {prosrc,...a}=after[id],{prosrc:old,...b}=before[id];return JSON.stringify(a)===JSON.stringify(b)}))
    const installed=fingerprint(database)
    check('positive writer installation preserves every row/history',installed.rowsSha256===baseline.rowsSha256)
    baseline=installed;good(database,correction)
    check('positive writer exact replay is metadata/data no-op',JSON.stringify(fingerprint(database))===JSON.stringify(baseline))
    const refused=(label,body,error)=>{
      const result=sql(database,`begin;${setup}${body}rollback;`)
      report.legacyLifecycle.cases.push({label,result})
      check(label,result.exit===3&&result.stderr.includes(error))
      check(label+' entire rollback',JSON.stringify(fingerprint(database))===JSON.stringify(baseline))
    }
    for(const [label,body]of [
      ['historical new confirmation',`set local role authenticated;select public.confirm_order_request(${q(order)},'Synthetic confirmation');reset role;`],
      ['historical exact packing',`select public.record_packing_scan_exact_v1(${q(pack)},'SYNTHETIC-LEGACY-LIFECYCLE',${q(res)},true);`],
      ['historical deprecated packing',`select public.record_packing_scan(${q(pack)},'SYNTHETIC-LEGACY-LIFECYCLE');`],
      ['historical physical handover',`set local role authenticated;select public.fulfill_order_request(${q(pack)},'Synthetic handover');reset role;`],
      ['historical direct ownership commit',`select k2_private.lock_category_policy_v1(false);select k2_private.start_category_lot_context_v1(10);select public.commit_order_request_stock_v1(${q(order)},'confirmation','Synthetic ownership');`]
    ])refused(label+' requires review',body,'K2_DELIVERY_REVIEW_REQUIRED')
    for(const [label,command,error] of [
      ['new historical proof refuses',upload(),'K2_DELIVERY_REVIEW_REQUIRED'],
      ['wrong opaque order key refuses',upload(randomUUID(),randomUUID()),'ORDER_ACCESS_REQUIRED']
    ]){
      const result=sql(database,`begin;${setup}set local role anon;select ${command};reset role;rollback;`)
      report.legacyLifecycle.cases.push({label,result})
      check(label,result.exit===0&&parse(result.stdout).ok===false&&parse(result.stdout).error===error)
      check(label+' entire rollback',JSON.stringify(fingerprint(database))===JSON.stringify(baseline))
    }
    const replay=parse(good(database,`begin;${setup}set local role anon;select ${upload(savedKey)};reset role;rollback;`))
    check('historical saved receipt replay remains accessible without renewed collection',replay.ok===true&&replay.replayed===true&&replay.receipt_id===savedReceipt.receipt_id&&JSON.stringify(fingerprint(database))===JSON.stringify(baseline))
    for(const [id,to,expected] of [[order,'failed','awaiting_instructions'],[pack,'refunded','verified']]){
      const instant=good(database,`select updated_at::text from public.order_requests where id=${q(id)};`)
      const payload={orderRequestId:id,toStatus:to,evidenceNote:'Synthetic held-stock financial reconciliation',expectedPaymentStatus:expected,expectedUpdatedAt:instant}
      const key=randomUUID(),first=call(payload,key),retry=call(payload,key)
      const result=sql(database,`begin;${setup}${promote}set local role authenticated;select ${first};select ${retry};reset role;
        do $conserve$ begin
          if (select quantity from public.product_batches where sku='SYNTHETIC-LEGACY-LIFECYCLE')<>6
            or (select reserved_quantity from public.product_batches where sku='SYNTHETIC-LEGACY-LIFECYCLE')<>3
            or (select on_hand from public.inventory_balances where sku='SYNTHETIC-LEGACY-LIFECYCLE')<>6
            or (select reserved from public.inventory_balances where sku='SYNTHETIC-LEGACY-LIFECYCLE')<>3
            or (select count(*) from public.inventory_reservations where sku='SYNTHETIC-LEGACY-LIFECYCLE' and status='active')<>2
            or (select count(*) from public.order_request_events where order_request_id=${q(id)} and metadata->>'event'='payment_status_changed')<>1
            or not exists(select 1 from public.order_requests where id=${q(id)} and payment_status=${q(to)} and shipping_amount=7)
            then raise exception 'HELD_FINANCIAL_CONSERVATION_FAILED';end if;
        end $conserve$;rollback;`)
      report.legacyLifecycle.cases.push({label:'held-stock '+to+' exact retry',result})
      check('held-stock '+to+' preserves physical6 held3 and one financial event',result.exit===0)
      check('held-stock '+to+' entire rollback',JSON.stringify(fingerprint(database))===JSON.stringify(baseline))
    }
    const cancellation=sql(database,`begin;${setup}set local role authenticated;
      select public.cancel_order_request(${q(order)},'Synthetic historical cancellation');select public.cancel_order_request(${q(order)},'Synthetic historical cancellation');reset role;
      do $release$ begin if (select quantity from public.product_batches where sku='SYNTHETIC-LEGACY-LIFECYCLE')<>6
        or (select reserved_quantity from public.product_batches where sku='SYNTHETIC-LEGACY-LIFECYCLE')<>2
        or not exists(select 1 from public.order_requests where id=${q(order)} and status='cancelled' and total_amount=107 and payment_status='awaiting_instructions')
        then raise exception 'HISTORICAL_CANCELLATION_CONSERVATION_FAILED';end if;end $release$;rollback;`)
    report.legacyLifecycle.cases.push({label:'historical cancellation preserves money and releases once',result:cancellation})
    check('historical cancellation still releases exactly one hold',cancellation.exit===0)
    check('historical cancellation entire rollback',JSON.stringify(fingerprint(database))===JSON.stringify(baseline))
    const strip=correction.replace(/^begin;\n/,'').replace(/commit;\n$/,'')
    for(const [label,change] of [
      ['ACL',"grant execute on function public.commit_order_request_stock_v1(uuid,text,text) to authenticated;"],
      ['body',"do $drift$ declare d text;b text;begin select pg_get_functiondef(oid),prosrc into d,b from pg_proc where oid='public.submit_order_payment_receipt_v1(uuid,text,text,text,text,uuid)'::regprocedure;execute replace(d,b,replace(b,'K2_DELIVERY_REVIEW_REQUIRED','SYNTHETIC_DRIFT'));end $drift$;"],
      ['construction dependency',"alter function k2_private.guard_order_delivery_construction_v1() set search_path=public;"]
    ])refused('positive writer '+label+' drift refuses',change+strip,'K2_LEGACY_WRITER_')
    const guest=(action,payload)=>{
      const previous=process.env.K2_GUEST_BFF_SECRET
      try{process.env.K2_GUEST_BFF_SECRET=Buffer.alloc(32,1).toString('base64');return signedRpcArguments({headers:{},socket:{remoteAddress:'127.0.8.1'}},action,payload)}
      finally{if(previous===undefined)delete process.env.K2_GUEST_BFF_SECRET;else process.env.K2_GUEST_BFF_SECRET=previous}
    }
    good(database,"insert into k2_private.guest_bff_secrets(singleton,request_secret,contact_secret) values(true,decode(repeat('01',32),'hex'),decode(repeat('01',32),'hex')) on conflict(singleton) do update set request_secret=excluded.request_secret,contact_secret=excluded.contact_secret;")
    const guestQuery=(fn,action,payload)=>{
      const a=guest(action,payload),keys=['p_timestamp','p_nonce','p_payload_text','p_ip_hash','p_signature']
      return `begin;set local search_path='';set local lock_timeout='2s';set local statement_timeout='10s';select set_config('request.jwt.claim.sub','',true);select set_config('request.jwt.claims','{}',true);set local role anon;
        select to_jsonb(x) from public.${fn}(${keys.map(k=>q(a[k])).join(',')}${fn==='submit_guest_order_v1'?',null':''}) x;reset role;commit;`
    }
    const quote=parse(good(database,guestQuery('quote_customer_delivery_v1','delivery_quote',{service:'pickup',items:[{sku:'SYNTHETIC-LEGACY-LIFECYCLE',quantity:1}],destination:null})))
    check('corrected native pickup quote remains usable',quote.ok===true&&quote.quote.service==='pickup')
    const body={customerName:'Synthetic canonical lifecycle',email:'canonical-lifecycle@example.invalid',phone:'',address:'Synthetic pickup address',fulfillmentMethod:'Pickup',note:'',items:[{sku:'SYNTHETIC-LEGACY-LIFECYCLE',quantity:1}],idempotencyKey:randomUUID(),couponCode:'',delivery:{service:'pickup',destination:null,acceptance:{inputFingerprint:quote.quote.inputFingerprint,rateVersion:quote.quote.rateVersion}}}
    const fresh=parse(good(database,guestQuery('submit_guest_order_v1','order',body)))
    check('new canonical checkout still finishes its construction and snapshot',fresh.ok===true&&fresh.total_amount===100&&facts().physical===6&&facts().reserved===4&&facts().contexts===0)
    const retry=parse(good(database,guestQuery('submit_guest_order_v1','order',body)))
    check('new canonical checkout exact retry adds no second hold',retry.public_reference===fresh.public_reference&&facts().reserved===4)
    const freshId=good(database,`select id from public.order_requests where public_reference=${q(fresh.public_reference)};`)
    const nativeAdmin=(action,payload,who=actor)=>{
      const a=signedAdminCommandArguments(action,who,randomUUID(),payload)
      return `begin;${setup}select set_config('request.jwt.claim.sub',${q(who)},true);set local role authenticated;
        select public.execute_admin_fulfillment_command_v1(${[a.p_action,a.p_timestamp,a.p_nonce,a.p_idempotency_key,a.p_payload_text,a.p_signature].map(q).join(',')});reset role;commit;`
    }
    const payment=(to,who=actor,extra={})=>{
      const version=parse(good(database,`select jsonb_build_object('expectedPaymentStatus',payment_status,'expectedUpdatedAt',updated_at)::text from public.order_requests where id=${q(freshId)};`))
      return parse(good(database,nativeAdmin('payment_status',{orderRequestId:freshId,toStatus:to,evidenceNote:'Synthetic lifecycle payment',...version,...extra},who)))
    }
    check('new canonical signed Staff instructions remain allowed',payment('awaiting_instructions').paymentStatus==='awaiting_instructions')
    const receiptKey=randomUUID(),proof=parse(good(database,`begin;${setup}set local role anon;select ${upload(receiptKey,body.idempotencyKey,freshId)};reset role;commit;`))
    check('new canonical payable receipt upload remains usable',proof.ok===true&&proof.replayed===false)
    check('new canonical signed confirmation commits ownership',parse(good(database,nativeAdmin('confirm_order',{orderRequestId:freshId,reason:'Synthetic canonical confirmation'}))).status==='confirmed')
    check('new canonical structured evidence remains usable',payment('evidence_submitted',actor,{paymentMethod:'bank_transfer',paymentAmount:100,paymentCurrency:'PHP',payerName:'Synthetic payer',paymentReference:'SYNTHETIC-PAYMENT',proofAssetRef:proof.receipt_id}).paymentStatus==='evidence_submitted')
    check('new canonical independent Admin verification remains usable',payment('verified','e8000000-0000-4000-8000-000000000004').paymentStatus==='verified')
    const freshReservation=good(database,`select id from public.inventory_reservations where order_request_id=${q(freshId)} and status='active';`)
    const packed=parse(good(database,nativeAdmin('packing_scan',{orderRequestId:freshId,scannedCode:'SYNTHETIC-LEGACY-LIFECYCLE',reservationId:freshReservation,lotConfirmed:true})))
    check('new canonical signed exact packing remains usable',packed.packed_quantity===1&&packed.order_complete===true)
    const fulfilled=parse(good(database,nativeAdmin('fulfill_order',{orderRequestId:freshId,handoverNote:'Synthetic pickup handover'})))
    check('new canonical signed handover moves exactly one physical unit',fulfilled.status==='fulfilled'&&facts().physical===5&&facts().reserved===3&&facts().onHand===5&&facts().balanceReserved===3)
    check('confirmation and verification commit the same stock only once',good(database,`select count(*) from public.inventory_events where reference_id=${q(freshId)} and event_type='stock_committed';`)==='1')
    report.legacyLifecycle.canonical={reference:fresh.public_reference,recordedTotal:100,physicalAfter:5,reservedAfter:3,receipt:proof.receipt_id,independentSyntheticReviewer:true}
    report.legacyLifecycle.corrected=true
    report.legacyLifecycle.after=facts()
    report.sources.push({path:prepared,sha256:createHash('sha256').update(correction).digest('hex')})
    report.acceptance={historicalPositiveWritersCorrected:true,heldStockFailureRefund:true,safeHistoricalReceiptReplay:true,existingAal2ContextRetained:true,allWriter:false,canonicalPositive:true,provider:false,realInventory:false}
    report.latestPolicyBaseline=fingerprint(database)
    return
  }
  const probes=[
    ['new historical payment proof accepted',`set local role anon;select ${upload()};reset role;`,s=>parse(s).ok===true],
    ['historical confirmation commits ownership',`set local role authenticated;select to_jsonb(public.confirm_order_request(${q(order)},'Synthetic historical confirmation probe'));reset role;`,s=>parse(s).status==='confirmed'],
    ['historical partial packing mutates exact hold',`select public.record_packing_scan_exact_v1(${q(pack)},'SYNTHETIC-LEGACY-LIFECYCLE',${q(res)},true);`,s=>parse(s).packed_quantity===1],
    ['historical handover moves physical custody',`select k2_private.lock_category_policy_v1(false);select k2_private.start_category_lot_context_v1(10);update public.inventory_reservations set packed_quantity=quantity where id=${q(res)};select k2_private.clear_category_lot_context_v1();set local role authenticated;select to_jsonb(public.fulfill_order_request(${q(pack)},'Synthetic handover probe'));reset role;`,s=>parse(s).status==='fulfilled']
  ]
  for(const [label,body,accept]of probes){
    const result=sql(database,`begin;${setup}${body}rollback;`)
    report.legacyLifecycle.cases.push({label,result})
    check(label,result.exit===0&&accept(result.stdout))
    check(label+' entire rollback',JSON.stringify(fingerprint(database))===JSON.stringify(baseline))
  }
  report.legacyLifecycle.after=facts()
  check('all historical probes preserve original physical/held facts',JSON.stringify(report.legacyLifecycle.before)===JSON.stringify(report.legacyLifecycle.after))
  report.acceptance={historicalPositiveWritersDefectsReproduced:true,corrected:false,allWriter:false,provider:false,realInventory:false}
  report.latestPolicyBaseline=fingerprint(database)
}

// Exercise real PostgreSQL waits using the enclosing rehearsal's owned sessions.
async function rehearsePaymentRoleRace(c) {
  const {database,good,sql,check,report,fingerprint,setup,actor,roleAdmin,order,refundOrder,q,call,start,successful,watch}=c
  const claims=id=>`select set_config('request.jwt.claim.sub',${q(id)},true);select set_config('request.jwt.claims','{"aal":"aal2"}',true);`
  const header="begin;set local lock_timeout='2s';set local statement_timeout='10s';set local search_path='';select k2_private.lock_category_policy_v1(false);"
  good(database,`begin;${setup}${claims(roleAdmin)}update public.user_profiles set role='Admin' where id=${q(actor)};commit;`)
  const baseline=fingerprint(database),observer=await start('payment-role-observer')
  const tables=JSON.parse(good(database,"select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private','storage','auth') and c.relkind in ('r','p');"))
  const rows=()=>createHash('sha256').update(good(database,`select jsonb_object_agg(name,hash order by name)::text from (values ${tables.map(t=>`(${q(t)},(select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by to_jsonb(x)::text),'')) from ${t} x))`).join(',')}) s(name,hash);`)).digest('hex')
  report.roleRace={cases:[],scope:'Synthetic accounts/orders, actual signed dispatcher and native helper, owned PostgreSQL transactions only'}
  for(const boundary of ['native','signed'])for(const status of ['failed','refunded','verified']){
    const id=status==='failed'?order:refundOrder,expected=status==='failed'?'awaiting_instructions':'verified'
    const instant=good(database,`select updated_at::text from public.order_requests where id=${q(id)};`)
    const command=boundary==='signed'?call({orderRequestId:id,toStatus:status,evidenceNote:'Synthetic concurrent verdict',expectedPaymentStatus:expected,expectedUpdatedAt:instant}):`public.set_order_request_payment_status(${q(id)},${q(status)},'Synthetic concurrent verdict','{}')`
    const blocker=await start(`payment-${boundary}-${status}-order`),financial=await start(`payment-${boundary}-${status}-verdict`),demoter=await start(`payment-${boundary}-${status}-role`)
    await successful(blocker,header+`select 1 from public.order_requests where id=${q(id)} for update;`)
    const pending=financial.query(header+claims(actor)+(boundary==='signed'?'set local role authenticated;':'')+`select to_jsonb(x) from ${command} x;rollback;`)
    const orderWait=await watch(observer,financial,blocker)
    let demotionFinished=false
    const demotion=demoter.query(header+claims(roleAdmin)+`update public.user_profiles set role='Staff' where id=${q(actor)};commit;`).then(r=>{demotionFinished=true;return r})
    let roleWait=null
    const until=Date.now()+1000
    while(!demotionFinished&&Date.now()<until){
      const state=JSON.parse(await successful(observer,`select jsonb_build_object('blockers',pg_blocking_pids(${demoter.pid}),'waitType',wait_event_type) from pg_stat_activity where pid=${demoter.pid};`))
      if(state.waitType==='Lock'&&state.blockers.includes(financial.pid)){roleWait=state;break}
      await new Promise(resolve=>setTimeout(resolve,10))
    }
    await successful(blocker,'rollback;')
    const outcome=await pending,changed=await demotion
    const current=good(database,`select role::text from public.user_profiles where id=${q(actor)};`)
    const refused=sql(database,header+claims(actor)+(boundary==='signed'?'set local role authenticated;':'')+`select ${command};rollback;`)
    report.roleRace.cases.push({boundary,status,orderWait,roleWait,demotionFinishedBeforeRelease:roleWait===null,outcome,changed,current,retry:refused})
    // Restore only the synthetic role; each financial action itself rolled back.
    good(database,header+claims(roleAdmin)+`update public.user_profiles set role='Admin' where id=${q(actor)};commit;`)
    await blocker.close();await financial.close();await demoter.close()
    check(boundary+' '+status+' retains every row after race',rows()===baseline.rowsSha256)
    check(boundary+' '+status+' completes with authority held before downgrade',!!roleWait&&outcome.ok&&changed.ok&&current==='Staff')
    check(boundary+' '+status+' refuses after committed downgrade',refused.exit===3&&refused.stderr.includes('K2_PAYMENT_VERDICT_ADMIN_REQUIRED'))
    const first=await start(`payment-${boundary}-${status}-role-first`),after=await start(`payment-${boundary}-${status}-after-role`)
    after.expectedCode=3
    await successful(first,header+claims(roleAdmin)+`update public.user_profiles set role='Staff' where id=${q(actor)};`)
    const later=after.query(header+claims(actor)+(boundary==='signed'?'set local role authenticated;':'')+`select ${command};rollback;`)
    const downgradeWait=await watch(observer,after,first)
    await successful(first,'commit;')
    const denied=await later
    report.roleRace.cases.push({boundary,status,schedule:'downgrade first',downgradeWait,result:denied})
    await first.close();await after.close()
    good(database,header+claims(roleAdmin)+`update public.user_profiles set role='Admin' where id=${q(actor)};commit;`)
    check(boundary+' '+status+' rechecks role after waiting for downgrade',!denied.ok&&denied.stderr.includes('K2_PAYMENT_VERDICT_ADMIN_REQUIRED'))
    check(boundary+' '+status+' downgrade-first rollback retains every row',rows()===baseline.rowsSha256)
  }
  await observer.close()
  check('all financial role schedules retain every row and metadata',JSON.stringify(fingerprint(database))===JSON.stringify(baseline))
  report.acceptance={financialRoleRaceCorrected:true,signedAndNative:true,bothLockSchedules:true,provider:false,realInventory:false}
}

// IDEA-20261008-02 / MAP-023/018. Reuse the accepted composed installer once;
// only the financial verdict boundary is rehearsed, on the enclosing owned clone.
export async function rehearsePaymentVerdictAuthority({out,base,database,good,sql,check,report,fingerprint,corrected,lifecycle=false,roleRace=false,start,successful,watch}) {
  const sha=s=>createHash('sha256').update(s).digest('hex')
  const q=s=>"'"+String(s).replaceAll("'","''")+"'"
  const archive=base+'foundation-qualified-schema-full-delivery-legacy-readers02/'
  const receipt=JSON.parse(fs.readFileSync(archive+'result.json'))
  const packageBytes=fs.readFileSync(archive+'full65-delivery-install.sql')
  check('reuse accepted M installer and complete cleanup',receipt.failed===0&&!receipt.error&&receipt.cloneRemoved&&receipt.coldCloneRemoved&&receipt.templateUnchanged&&sha(packageBytes)==='ee39915d6d6d461025b1b432ac5a3e1b432b9325652557c0b1149111cef221ab')
  report.idea='IDEA-20261008-02'
  report.scope='Native financial verdict boundary with synthetic identities/history; accepted M installer reused once on an owned current clone; no cold rerun, provider or all-writer claim'
  report.sources.push({path:archive+'full65-delivery-install.sql',sha256:sha(packageBytes)},{path:'scripts/rehearse-current-payment.mjs',sha256:sha(fs.readFileSync('scripts/rehearse-current-payment.mjs'))})
  const actor='e8000000-0000-4000-8000-000000000001'
  const order='e8000000-0000-4000-8000-000000000002'
  const refundOrder='e8000000-0000-4000-8000-000000000003'
  const roleAdmin='e8000000-0000-4000-8000-000000000004'
  // Explicit historical synthetic fixture before installing construction guards.
  // No sale, stock receipt or independent payment verification is manufactured.
  good(database,`insert into auth.users(id) values(${q(actor)});
    insert into public.user_profiles(id,role) values(${q(actor)},'Staff') on conflict(id) do update set role=excluded.role;
    insert into auth.users(id) values(${q(roleAdmin)});
    insert into public.user_profiles(id,role) values(${q(roleAdmin)},'Admin') on conflict(id) do update set role=excluded.role;
    insert into public.order_requests(id,idempotency_key,customer_name,customer_email,subtotal,shipping_amount,total_amount,
      payment_status,shipping_quote_status,payment_evidence)
    values(${q(order)},${q(order)},'Synthetic historical payment','payment-fixture@example.invalid',100,7,107,
      'awaiting_instructions','customer_confirmed','{"fixture":"historical evidence, not a real transfer"}');
    insert into public.order_requests(id,idempotency_key,customer_name,customer_email,subtotal,shipping_amount,total_amount,
      status,payment_status,shipping_quote_status,payment_evidence)
    values(${q(refundOrder)},'synthetic-refund-history','Synthetic historical refund','refund-fixture@example.invalid',100,7,107,
      'cancelled','verified','customer_confirmed','{"fixture":"historically verified dummy evidence, not a transfer"}');`)
  if(lifecycle)good(database,`
    insert into public.categories(id,name) values('e8000000-0000-4000-8000-00000000000c','Synthetic lifecycle category');
    insert into public.products(sku,name,status,srp,primary_image_url,is_human_reviewed,category_id)
    values('SYNTHETIC-LEGACY-LIFECYCLE','Synthetic lifecycle product','Unlisted',100,'https://example.invalid/synthetic.jpg',true,'e8000000-0000-4000-8000-00000000000c');
    insert into public.product_batches(id,sku,quantity,reserved_quantity,expiry_date,inventory_status,hub,custodian)
    values('e8000000-0000-4000-8000-00000000000b','SYNTHETIC-LEGACY-LIFECYCLE',6,3,(clock_timestamp() at time zone 'Asia/Manila')::date+180,'available','HUB-MNL-CENTRAL','SYN-LEGACY-CUSTODY');
    insert into public.inventory_balances(sku,location_code,on_hand,reserved) values('SYNTHETIC-LEGACY-LIFECYCLE','MANILA_MAIN',6,3);
    insert into public.order_requests(id,idempotency_key,customer_name,customer_email,subtotal,shipping_amount,total_amount,status,payment_status,shipping_quote_status)
    values('e8000000-0000-4000-8000-000000000005','synthetic-packing-history','Synthetic historical packing','packing-fixture@example.invalid',200,7,207,'confirmed','verified','customer_confirmed');
    insert into public.order_request_items(id,order_request_id,sku,product_name,quantity,unit_price,line_total) values
      ('e8000000-0000-4000-8000-000000000006',${q(order)},'SYNTHETIC-LEGACY-LIFECYCLE','Synthetic lifecycle product',1,100,100),
      ('e8000000-0000-4000-8000-000000000007','e8000000-0000-4000-8000-000000000005','SYNTHETIC-LEGACY-LIFECYCLE','Synthetic lifecycle product',2,100,200);
    insert into public.inventory_reservations(id,order_request_id,order_request_item_id,batch_id,sku,quantity) values
      ('e8000000-0000-4000-8000-000000000009',${q(order)},'e8000000-0000-4000-8000-000000000006','e8000000-0000-4000-8000-00000000000b','SYNTHETIC-LEGACY-LIFECYCLE',1),
      ('e8000000-0000-4000-8000-00000000000a','e8000000-0000-4000-8000-000000000005','e8000000-0000-4000-8000-000000000007','e8000000-0000-4000-8000-00000000000b','SYNTHETIC-LEGACY-LIFECYCLE',2);`)
  good(database,packageBytes.toString('utf8'))
  report.installedBaseline=fingerprint(database)
  const saved=process.env.K2_ADMIN_BFF_REQUEST_SECRET
  process.env.K2_ADMIN_BFF_REQUEST_SECRET=Buffer.alloc(32,8).toString('base64')
  const setup=`set local lock_timeout='2s';set local statement_timeout='10s';set local search_path='';
    insert into k2_private.category_policy_command_config(singleton,maximum_depth) values(true,10)
    on conflict(singleton) do update set maximum_depth=excluded.maximum_depth;
    select set_config('request.jwt.claim.sub',${q(actor)},true);
    select set_config('request.jwt.claims','{"aal":"aal2"}',true);
    insert into k2_private.admin_bff_secrets(singleton,request_secret) values(true,decode(repeat('08',32),'hex'))
    on conflict(singleton) do update set request_secret=excluded.request_secret;`
  const call=(payload,key=randomUUID())=>{
    const a=signedAdminCommandArguments('payment_status',actor,key,payload)
    return `public.execute_admin_fulfillment_command_v1(${[a.p_action,a.p_timestamp,a.p_nonce,a.p_idempotency_key,a.p_payload_text,a.p_signature].map(q).join(',')})`
  }
  const promote=`select set_config('request.jwt.claim.sub',${q(roleAdmin)},true);
    update public.user_profiles set role='Admin' where id=${q(actor)};
    select set_config('request.jwt.claim.sub',${q(actor)},true);`
  try {
    if(roleRace){
      good(database,fs.readFileSync('supabase/prepared/payment_verdict_authority.sql','utf8'))
      if(corrected){
        const prepared='supabase/prepared/payment_verdict_role_lock_authority.sql',correction=paymentVerdictAuthoritySql()
        check('prepared role-lock correction matches maintained builder',fs.readFileSync(prepared,'utf8')===correction)
        const catalog=()=>JSON.parse(good(database,"select jsonb_object_agg(oid::text,to_jsonb(p))::text from pg_proc p;"))
        const before=catalog(),rowsBefore=fingerprint(database)
        good(database,correction)
        const after=catalog(),changed=Object.keys(before).filter(id=>JSON.stringify(before[id])!==JSON.stringify(after[id]))
        check('role-lock forward upgrade changes only two bodies',changed.length===2&&changed.every(id=>{const {prosrc,...a}=after[id],{prosrc:old,...b}=before[id];return JSON.stringify(a)===JSON.stringify(b)}))
        const installed=fingerprint(database)
        check('role-lock upgrade retains every row',installed.rowsSha256===rowsBefore.rowsSha256)
        good(database,correction)
        check('role-lock exact replay retains every row and metadata',JSON.stringify(fingerprint(database))===JSON.stringify(installed))
        report.sources.push({path:prepared,sha256:sha(correction)})
      }
      await rehearsePaymentRoleRace({database,good,sql,check,report,fingerprint,setup,actor,roleAdmin,order,refundOrder,q,call,start,successful,watch})
      report.latestPolicyBaseline=fingerprint(database)
      return
    }
    if(lifecycle){
      const financial=fs.readFileSync('supabase/prepared/payment_verdict_authority.sql','utf8')
      check('reuse exact locally verified N financial fragment',sha(financial)==='d0d5ba4f6dc918d140132896a6525257704c53677229fbf67ceb15cd8849fbc2')
      good(database,financial)
      await rehearseLegacyPaymentLifecycle({out,database,good,sql,check,report,fingerprint,corrected,setup,actor,order,refundOrder,q,call,promote})
      return
    }
    const updated=good(database,`select updated_at::text from public.order_requests where id=${q(order)};`)
    const payload={orderRequestId:order,toStatus:'failed',evidenceNote:'Synthetic failure verdict',expectedPaymentStatus:'awaiting_instructions',expectedUpdatedAt:updated}
    const command=call(payload)
    if(!corrected){
      const result=sql(database,`begin;${setup}set local role authenticated;
        select ${command};reset role;
        select jsonb_build_object('payment',payment_status,'money',total_amount,'evidence',payment_evidence,
          'events',(select count(*) from public.order_request_events where order_request_id=${q(order)}
            and metadata->>'event'='payment_status_changed'),'snapshot',(select count(*) from k2_private.order_delivery_snapshots where order_id=${q(order)}))::text
        from public.order_requests where id=${q(order)};rollback;`)
      report.paymentVerdictProbe=result
      check('valid signed Staff financial failure reaches native mutation',result.exit===0&&result.stdout.includes('"payment": "failed"')&&result.stdout.includes('"money": 107')&&result.stdout.includes('"events": 1')&&result.stdout.includes('"snapshot": 0'))
      check('probe rolls back every row and metadata',JSON.stringify(fingerprint(database))===JSON.stringify(report.installedBaseline))
      report.acceptance={nativeSignedStaffVerdictDefectReproduced:true,maintainedBffExploit:false,corrected:false,allWriter:false,provider:false}
    }else{
      const correction=paymentVerdictAuthoritySql()
      const prepared='supabase/prepared/payment_verdict_role_lock_authority.sql'
      check('prepared financial correction matches maintained builder',fs.readFileSync(prepared,'utf8')===correction)
      const before=JSON.parse(good(database,"select jsonb_object_agg(oid::text,to_jsonb(p))::text from pg_proc p;"))
      const rowsBefore=report.installedBaseline.rowsSha256
      good(database,correction)
      const after=JSON.parse(good(database,"select jsonb_object_agg(oid::text,to_jsonb(p))::text from pg_proc p;"))
      const changed=Object.keys(before).filter(id=>JSON.stringify(before[id])!==JSON.stringify(after[id]))
      check('financial installation changes only two function bodies',changed.length===2&&changed.every(id=>{
        const {prosrc,...a}=after[id],{prosrc:old,...b}=before[id];return JSON.stringify(a)===JSON.stringify(b)
      }))
      const baseline=fingerprint(database)
      check('financial installation retains every business row',baseline.rowsSha256===rowsBefore)
      good(database,correction)
      check('financial exact replay preserves all metadata and rows',JSON.stringify(fingerprint(database))===JSON.stringify(baseline))
      const bodyOnly=correction.replace(/^begin;\n/,'').replace(/commit;\n$/,'')
      const denied=(label,body,message)=>{
        const result=sql(database,`begin;${setup}${body}rollback;`)
        report.financialCases??=[];report.financialCases.push({label,result})
        check(label,result.exit===3&&result.stderr.includes(message))
        check(label+' full rollback',JSON.stringify(fingerprint(database))===JSON.stringify(baseline))
      }
      for(const status of ['verified','failed','refunded']){
        denied('signed Staff '+status+' requires Admin',`set local role authenticated;select ${call({...payload,toStatus:status})};reset role;`,'K2_PAYMENT_VERDICT_ADMIN_REQUIRED')
        denied('owner-only setter still checks Staff '+status,`select public.set_order_request_payment_status(${q(order)},${q(status)},'Synthetic verdict','{}');`,'K2_PAYMENT_VERDICT_ADMIN_REQUIRED')
      }
      const refundUpdated=good(database,`select updated_at::text from public.order_requests where id=${q(refundOrder)};`)
      for(const [label,id,status,expected,instant] of [['failure',order,'failed','awaiting_instructions',updated],['refund',refundOrder,'refunded','verified',refundUpdated]]){
        const p={...payload,orderRequestId:id,toStatus:status,expectedPaymentStatus:expected,expectedUpdatedAt:instant}
        const key=randomUUID(),first=call(p,key),retry=call(p,key)
        const accepted=sql(database,`begin;${setup}${promote}
          set local role authenticated;select ${first};select ${retry};reset role;
          do $retained$ begin
            if not exists(select 1 from public.order_requests where id=${q(id)} and payment_status=${q(status)} and total_amount=107 and shipping_amount=7 and payment_evidence ? 'fixture')
              or (select count(*) from public.order_request_events where order_request_id=${q(id)} and metadata->>'event'='payment_status_changed')<>1
              or (select count(*) from k2_private.admin_command_receipts where actor_id=${q(actor)} and idempotency_key=${q(key)})<>1
              or exists(select 1 from k2_private.order_delivery_snapshots where order_id=${q(id)})
              or exists(select 1 from k2_private.category_lot_command_context) then raise exception 'FINANCIAL_HISTORY_RETENTION_FAILED';end if;
          end $retained$;rollback;`)
        report.financialCases.push({label:'Admin '+label+' and exact retry',result:accepted})
        check('Admin '+label+' preserves money/evidence/history once and no snapshot',accepted.exit===0)
        check('Admin '+label+' fully rolls back',JSON.stringify(fingerprint(database))===JSON.stringify(baseline))
        denied('demoted actor cannot replay saved '+label+' verdict',`${promote}
          set local role authenticated;select ${first};reset role;
          update public.user_profiles set role='Staff' where id=${q(actor)};
          set local role authenticated;select ${call(p,key)};reset role;`,'K2_PAYMENT_VERDICT_ADMIN_REQUIRED')
        denied('Staff same-status '+label+' cannot bypass setter',`${promote}
          set local role authenticated;select ${call(p,key)};reset role;
          update public.user_profiles set role='Staff' where id=${q(actor)};
          select public.set_order_request_payment_status(${q(id)},${q(status)},'Synthetic verdict','{}');`,'K2_PAYMENT_VERDICT_ADMIN_REQUIRED')
      }
      for(const [label,change] of [
        ['grant',"grant execute on function public.set_order_request_payment_status(uuid,text,text,jsonb) to authenticated;"],
        ['owner',"alter function public.execute_admin_fulfillment_command_v1(text,bigint,uuid,uuid,text,text) owner to anon;"],
        ['body',"do $drift$ declare d text;b text;begin select pg_get_functiondef(oid),prosrc into d,b from pg_proc where oid='public.set_order_request_payment_status(uuid,text,text,jsonb)'::regprocedure;execute replace(d,b,replace(b,'K2_PAYMENT_VERDICT_ADMIN_REQUIRED','K2_FINANCIAL_FIXTURE_DRIFT'));end $drift$;"],
        ['role helper',"alter function public.is_admin() set search_path='';"]
      ])denied('financial installer rejects '+label+' drift',change+bodyOnly,'K2_PAYMENT_VERDICT_')
      report.sources.push({path:prepared,sha256:sha(correction)})
      report.acceptance={nativeFinancialVerdictCorrected:true,adminFailureRefundHistory:true,currentRoleRetry:true,metadataAndRows:true,allWriter:false,provider:false,realInventory:false}
    }
  } finally {
    if(saved===undefined)delete process.env.K2_ADMIN_BFF_REQUEST_SECRET
    else process.env.K2_ADMIN_BFF_REQUEST_SECRET=saved
  }
  report.latestPolicyBaseline=fingerprint(database)
}

export async function rehearseCurrentPayment({sync,value,source,check,fixture,guestPayload,
  guestCall,actor,literal,invariant,withoutTransaction,beforeStructuredCommitment,beforePaymentBodyGuard,recordDiagnostic}) {
  const reviewer='42000000-0000-4000-8000-000000000002'
  const migrations=[
    '20260906_payment_evidence_recovery.sql',
    '20260908_payment_balance_integrity.sql',
    '20260906_exact_packing_lot.sql',
    '20260906_exact_packing_wrapper.sql',
    '20260906_handover_coverage.sql',
    '20260913_payment_handover_commitment.sql',
    '20260916_structured_payment_evidence.sql',
    '20261001065252_admin_signing_null_inputs.sql',
  ]
  const verifier=()=>value(`select md5(pg_get_functiondef(oid)||proowner::text||coalesce(proacl::text,'')||coalesce(proconfig::text,''))
    from pg_proc where oid='k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure;`)
  const verifierBefore=verifier()
  for (const file of migrations) sync(source(`supabase/migrations/${file}`))
  check('payment composition preserves the final shared verifier definition and security metadata',verifier()===verifierBefore)
  const signature='public.set_order_request_payment_status(uuid,text,text,jsonb)'
  const original=sync(`select replace(pg_get_functiondef('${signature}'::regprocedure),chr(13),'');`)
  const metadata=()=>value(`select jsonb_build_object('owner',proowner,'acl',proacl,'config',proconfig,
    'definer',prosecdef,'returns',prorettype,'defaults',proargdefaults::text)::text from pg_proc
    where oid='${signature}'::regprocedure;`)
  const metadataBefore=metadata()
  let correction
  if (!beforeStructuredCommitment) {
    correction=source('supabase/migrations/20261001165531_structured_payment_stock_commitment.sql')
    if (beforePaymentBodyGuard) {
      const start=correction.indexOf('  if md5(replace(v_before.prosrc')
      const end=correction.indexOf("     or position('K2_PAYMENT_BALANCE_INTEGRITY_V1'",start)
      if (start<0 || end<0) throw new Error('PAYMENT_BODY_GUARD_DIAGNOSTIC_SHAPE_CHANGED')
      correction=correction.slice(0,start)+`  if not v_before.prosecdef or v_before.prorettype<>'public.order_requests'::regtype
     or not coalesce(v_before.proconfig @> array['search_path=""'],false)
`+correction.slice(end)
      const postflight=/^     or md5\(replace\(v_after\.prosrc[^\n]*\n/gm
      if ([...correction.matchAll(postflight)].length!==1) throw new Error('PAYMENT_BODY_POSTFLIGHT_DIAGNOSTIC_SHAPE_CHANGED')
      correction=correction.replace(postflight,'')
      recordDiagnostic(correction)
    }
    sync(correction)
    const installed=value(`select md5(pg_get_functiondef('${signature}'::regprocedure));`)
    sync(correction)
    check('current structured correction preserves security metadata and replays without replacing behavior',
      metadata()===metadataBefore && installed===value(`select md5(pg_get_functiondef('${signature}'::regprocedure));`))
    const installedDefinition=sync(`select replace(pg_get_functiondef('${signature}'::regprocedure),chr(13),'');`)
    const variants=[
      `drop function ${signature};`,
      `alter function ${signature} set search_path=public;`,
      installedDefinition.replace('if v_submitter is null or v_submitter = auth.uid() then','if false then'),
      installedDefinition.replace('if not public.is_staff() or auth.uid() is null','if false or auth.uid() is null'),
      installedDefinition.replace('if v_method is null or v_method not in','if v_method not in'),
      `grant execute on function ${signature} to authenticated;`,
      `alter function ${signature} set statement_timeout='1s';`,
      `alter function ${signature} owner to anon;`,
      installedDefinition.replace('p_payment_evidence jsonb)','p_payment_evidence jsonb DEFAULT null)'),
    ]
    for (let i=0;i<variants.length;i+=1) {
      let refused=false
      let detail='unexpected acceptance'
      try { sync(`begin; ${variants[i]}; ${withoutTransaction(correction)} rollback;`) }
      catch(error) { refused=error.message.includes('MAP-023 structured commitment:'); detail=error.message }
      check(`structured correction refuses drift variant ${i+1} with complete function rollback`,refused
        && metadata()===metadataBefore
        && installed===value(`select md5(pg_get_functiondef('${signature}'::regprocedure));`),refused?'':detail)
    }
  }
  sync(`insert into auth.users(id) values('${reviewer}');
    insert into public.user_profiles(id,role) values('${reviewer}','Admin') on conflict(id) do update set role=excluded.role;`)
  const command=(action,payload,who=actor,key=randomUUID(),overrides={})=> {
    const args={...signedAdminCommandArguments(action,who,key,payload),...overrides}
    return `select set_config('request.jwt.claim.sub','${who}',false);
      select set_config('request.jwt.claims','{"aal":"aal2"}',false); set role authenticated;
      select public.execute_admin_fulfillment_command_v1(${[
        'p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature',
      ].map(k=>args[k]===null?'null':literal(args[k])).join(',')});`
  }
  const offered=fixture('post-payment-assignment',2)
  const listingVersion=value(`select to_char(updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    from public.channel_listings where sku=${literal(offered.sku)};`)
  value(command('website_listing_set',{sku:offered.sku,assigned:false,expectedUpdatedAt:listingVersion,
    reason:'Local final composition assignment'}).replace('public.execute_admin_fulfillment_command_v1(',
    'public.execute_admin_website_listing_command_v1('))
  check('actual signed Website assignment still works after final payment composition',value(`select status='Paused'
    from public.channel_listings where sku=${literal(offered.sku)};`)==='t' && invariant(offered)==='2/0|2/0|2|0')
  const state=id=>JSON.parse(value(`select jsonb_build_object('expectedPaymentStatus',payment_status,
    'expectedUpdatedAt',updated_at)::text from public.order_requests where id='${id}';`))
  const paymentPayload=(id,toStatus,extra={})=>({
    orderRequestId:id,toStatus,evidenceNote:'Local merchant-account review',...state(id),...extra,
  })
  const payment=(id,toStatus,who=actor,extra={})=>value(command('payment_status',paymentPayload(id,toStatus,extra),who))
  const snapshot=id=>value(`select jsonb_build_object('order',to_jsonb(o),
    'allocations',(select jsonb_agg(to_jsonb(r) order by r.id) from public.inventory_reservations r where r.order_request_id=o.id),
    'batches',(select jsonb_agg(to_jsonb(b) order by b.id) from public.product_batches b where b.id in
      (select batch_id from public.inventory_reservations where order_request_id=o.id)),
    'balances',(select jsonb_agg(to_jsonb(b) order by b.sku,b.location_code) from public.inventory_balances b where b.sku in
      (select sku from public.order_request_items where order_request_id=o.id)),
    'products',(select jsonb_agg(to_jsonb(p) order by p.sku) from public.products p where p.sku in
      (select sku from public.order_request_items where order_request_id=o.id)),
    'legacy_orders',(select jsonb_agg(to_jsonb(l) order by l.id) from public.orders l where l.order_request_id=o.id),
    'redemptions',(select jsonb_agg(to_jsonb(c) order by c.id) from public.coupon_redemptions c where c.order_request_id=o.id),
    'coupon',(select to_jsonb(c) from public.coupons c where c.id=o.coupon_id),
    'inventory_events',(select jsonb_agg(to_jsonb(e) order by e.id) from public.inventory_events e where e.reference_id=o.id),
    'order_events',(select jsonb_agg(to_jsonb(e) order by e.id) from public.order_request_events e where e.order_request_id=o.id),
    'scans',(select jsonb_agg(to_jsonb(s) order by s.id) from public.packing_scan_events s where s.order_request_id=o.id)
    )::text from public.order_requests o where o.id='${id}';`)
  const controls=()=>value(`select jsonb_build_object('nonces',
    (select jsonb_agg(to_jsonb(n) order by actor_id,action,nonce) from k2_private.admin_request_nonces n),
    'rates',(select jsonb_agg(to_jsonb(b) order by scope,subject,bucket_start) from k2_private.admin_request_rate_buckets b),
    'receipts',(select jsonb_agg(to_jsonb(r) order by actor_id,action,idempotency_key)
      from k2_private.admin_command_receipts r))::text;`)
  const denial=(name,id,sql,expected)=> {
    const before=snapshot(id); const beforeControls=controls()
    let refused=false
    try { value(sql) } catch(error) { refused=error.message.includes(expected) }
    check(name,refused && snapshot(id)===before && controls()===beforeControls)
  }
  const f=fixture('current-payment-first',2)
  const couponId=randomUUID()
  sync(`insert into public.coupons(id,code,discount_type,discount_value,is_active)
    values('${couponId}','LOCAL-PAYMENT-HANDOVER','fixed',10,true);`)
  const payload=guestPayload(f,{couponCode:'LOCAL-PAYMENT-HANDOVER',shippingAmount:95,shippingQuoteStatus:'customer_confirmed'})
  check('current payment fixture enters through actual signed guest purchase',
    value(`set role anon; select ok from ${guestCall(payload,'192.0.2.200')};`)==='t')
  const id=value(`select id from public.order_requests where idempotency_key=${literal(payload.idempotencyKey)};`)
  payment(id,'awaiting_instructions')
  const evidence={paymentMethod:'gcash',paymentAmount:185,paymentCurrency:'PHP',
    payerName:'Local payer',paymentReference:'LOCAL-REFERENCE'}
  denial('structured evidence refuses a null method without order or command effects',id,
    command('payment_status',paymentPayload(id,'evidence_submitted',{...evidence,paymentMethod:null})),
    'K2_PAYMENT_METHOD_INVALID')
  for (const [extra,error] of [
    [{paymentMethod:'unknown'},'K2_PAYMENT_METHOD_INVALID'],
    [{paymentAmount:0},'K2_PAYMENT_AMOUNT_INVALID'],
    [{paymentCurrency:'USD'},'K2_PAYMENT_CURRENCY_INVALID'],
    [{payerName:''},'K2_PAYMENT_PAYER_INVALID'],
    [{paymentReference:''},'K2_PAYMENT_REFERENCE_INVALID'],
  ]) denial(`invalid structured field ${Object.keys(extra)[0]} refuses without effects`,id,
    command('payment_status',paymentPayload(id,'evidence_submitted',{...evidence,...extra})),error)
  const stale=paymentPayload(id,'evidence_submitted',evidence)
  payment(id,'evidence_submitted',actor,evidence)
  denial('stale signed evidence refuses without effects',id,command('payment_status',stale),'K2_PAYMENT_VERSION_CONFLICT')
  denial('evidence submitter cannot verify their own payment',id,
    command('payment_status',paymentPayload(id,'verified')),'K2_PAYMENT_INDEPENDENT_REVIEW_REQUIRED')
  const verifiedPayload=paymentPayload(id,'verified'); const verificationKey=randomUUID()
  for (const field of ['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature']) {
    denial(`current fulfillment rejects null ${field}`,id,
      command('payment_status',verifiedPayload,reviewer,randomUUID(),{[field]:null}),'K2_ADMIN_REQUEST_INVALID')
  }
  denial('current signed review requires AAL2',id,
    command('payment_status',verifiedPayload,reviewer).replace('"aal":"aal2"','"aal":"aal1"'),'K2_ADMIN_AAL2_REQUIRED')
  denial('current signed review requires staff membership',id,
    command('payment_status',verifiedPayload,randomUUID()),'K2_ADMIN_ACCESS_REQUIRED')
  denial('current signed review rejects forged signatures',id,
    command('payment_status',verifiedPayload,reviewer,randomUUID(),{p_signature:'0'.repeat(64)}),'K2_ADMIN_SIGNATURE_INVALID')
  denial('current signed review rejects expired timestamps',id,
    command('payment_status',verifiedPayload,reviewer,randomUUID(),{p_timestamp:Math.floor(Date.now()/1000)-600}),
    'K2_ADMIN_SIGNATURE_EXPIRED')
  denial('current shared verifier rejects unknown actions',id,
    command('unknown_action',verifiedPayload,reviewer),'K2_ADMIN_ACTION_INVALID')
  denial('current shared verifier retains the payload byte ceiling',id,
    command('payment_status',{...verifiedPayload,evidenceNote:'x'.repeat(16385)},reviewer),'K2_ADMIN_REQUEST_INVALID')
  for (const [scope,subject,limit] of [['actor',reviewer,360],['global','all_admin_requests',6000]]) {
    denial(`current shared verifier retains the ${scope} rate budget`,id,`begin;
      insert into k2_private.admin_request_rate_buckets(scope,subject,bucket_start,hit_count)
        select ${literal(scope)},${literal(subject)},date_trunc('minute',clock_timestamp())+step*interval '1 minute',${limit}
        from generate_series(0,1) step on conflict(scope,subject,bucket_start) do update set hit_count=excluded.hit_count;
      ${command('payment_status',verifiedPayload,reviewer)} rollback;`,'K2_ADMIN_RATE_LIMITED')
  }
  const verificationSql=command('payment_status',verifiedPayload,reviewer,verificationKey)
  const result=JSON.parse(value(verificationSql))
  check('signed current structured verification succeeds with independent reviewer',result.paymentStatus==='verified')
  check('current structured verification commits exact allocation before physical handover',value(`select
    count(*)=1 and bool_and(committed_at is not null and committed_by='${reviewer}'
      and commit_cause='payment_verification') from public.inventory_reservations where order_request_id='${id}';`)==='t'
    && value(`select count(*)=1 from public.inventory_events where reference_id='${id}' and event_type='stock_committed';`)==='t'
    && invariant(f)==='2/1|2/1|1|1')
  check('structured submission and verification identities remain distinct and intact',value(`select
    payment_evidence->>'method'='gcash' and (payment_evidence->>'amount')::numeric=185
    and payment_evidence->>'currency'='PHP' and payment_evidence->>'payer_name'='Local payer'
    and payment_evidence->>'payment_reference'='LOCAL-REFERENCE'
    and payment_evidence->>'submitted_by'='${actor}' and payment_evidence->>'verified_by'='${reviewer}'
    and total_amount=185 and shipping_amount=95 from public.order_requests where id='${id}';`)==='t')
  const verifiedSnapshot=snapshot(id)
  denial('current shared verifier rejects an exact nonce replay',id,verificationSql,'K2_ADMIN_REQUEST_REPLAYED')
  check('freshly signed uncertain verification retry returns the same receipt without duplicate effects',
    JSON.stringify(JSON.parse(value(command('payment_status',verifiedPayload,reviewer,verificationKey))))===JSON.stringify(result)
    && snapshot(id)===verifiedSnapshot)
  denial('same verification key with changed payload refuses without effects',id,
    command('payment_status',{...verifiedPayload,evidenceNote:'Changed'},reviewer,verificationKey),'K2_ADMIN_IDEMPOTENCY_CONFLICT')
  const commitment=()=>value(`select jsonb_agg(jsonb_build_array(id,committed_at,committed_by,commit_cause,commit_reason) order by id)::text
    from public.inventory_reservations where order_request_id='${id}';`)
  const originalCommitment=commitment()
  sync(`update public.inventory_reservations set expires_at=now()-interval '1 minute' where order_request_id='${id}';`)
  check('paid committed hold is excluded from the due view',value(`select not exists(select 1 from public.v_reservations_due
    where order_request_id='${id}');`)==='t')
  value(command('confirm_order',{orderRequestId:id,reason:'Local confirmed paid purchase'}))
  check('later confirmation preserves payment commitment and accepted coupon charges',commitment()===originalCommitment
    && value(`select status='confirmed' and total_amount=185 and shipping_amount=95
      and (select redemption_count from public.coupons where id='${couponId}')=1
      and (select count(*) from public.inventory_events where reference_id=o.id and event_type='stock_committed')=1
      from public.order_requests o where id='${id}';`)==='t')
  const rid=value(`select id from public.inventory_reservations where order_request_id='${id}' and status='active';`)
  denial('handover refuses an unscanned committed allocation',id,
    command('fulfill_order',{orderRequestId:id,handoverNote:'Local pickup'}),'K2_RESERVATION_RECONCILIATION_REQUIRED')
  denial('exact packing requires explicit physical-lot confirmation',id,
    command('packing_scan',{orderRequestId:id,scannedCode:f.sku,reservationId:rid,lotConfirmed:false}),
    'K2_PACKING_LOT_CONFIRMATION_REQUIRED')
  value(command('packing_scan',{orderRequestId:id,scannedCode:f.sku,reservationId:rid,lotConfirmed:true}))
  const handover={orderRequestId:id,handoverNote:'Local physical pickup witness'}; const handoverKey=randomUUID()
  const handed=JSON.parse(value(command('fulfill_order',handover,actor,handoverKey)))
  check('signed exact handover consumes custody and completes the coupon once',handed.status==='fulfilled'
    && invariant(f)==='1/0|1/0|1|0' && commitment()===originalCommitment
    && value(`select (select count(*) from public.inventory_events where reference_id='${id}' and event_type='stock_committed')=1
      and (select count(*) from public.inventory_events where reference_id='${id}' and event_type='fulfilled')=1
      and (select count(*) from public.coupon_redemptions where order_request_id='${id}' and status='redeemed')=1;`)==='t')
  const handedSnapshot=snapshot(id)
  check('handover retry returns its receipt without another custody deduction',
    JSON.stringify(JSON.parse(value(command('fulfill_order',handover,actor,handoverKey))))===JSON.stringify(handed)
    && snapshot(id)===handedSnapshot)

  const confirmed=fixture('current-confirmation-first',2)
  const confirmedPayload=guestPayload(confirmed)
  check('confirmation-first fixture enters through signed purchase',value(`set role anon; select ok from
    ${guestCall(confirmedPayload,'192.0.2.201')};`)==='t')
  const confirmedId=value(`select id from public.order_requests where idempotency_key=${literal(confirmedPayload.idempotencyKey)};`)
  value(command('confirm_order',{orderRequestId:confirmedId,reason:'Local confirmation-first witness'}))
  const confirmationAttribution=()=>value(`select jsonb_agg(jsonb_build_array(id,committed_at,committed_by,commit_cause,commit_reason) order by id)::text from public.inventory_reservations r
    where order_request_id='${confirmedId}';`)
  const confirmedCommitment=confirmationAttribution()
  sync(`update public.inventory_reservations set expires_at=now()-interval '1 minute' where order_request_id='${confirmedId}';`)
  payment(confirmedId,'awaiting_instructions')
  const beforeEvidence=snapshot(confirmedId); const beforeEvidenceControls=controls()
  let originalExpiryRefused=false
  try { sync(`begin; ${original}; ${command('payment_status',paymentPayload(confirmedId,'evidence_submitted',evidence))} rollback;`) }
  catch(error) { originalExpiryRefused=error.message.includes('K2_PAYMENT_STOCK_INELIGIBLE') }
  check('unpatched latest definition reproduces committed-expiry refusal with complete rollback',
    originalExpiryRefused && snapshot(confirmedId)===beforeEvidence && controls()===beforeEvidenceControls)
  payment(confirmedId,'evidence_submitted',actor,{...evidence,paymentAmount:100})
  payment(confirmedId,'verified',reviewer)
  check('current structured review accepts expired committed holds without rewriting confirmation attribution',
    value(`select count(*)=1 and bool_and(committed_at is not null and committed_by='${actor}' and commit_cause='confirmation')
      from public.inventory_reservations where order_request_id='${confirmedId}';`)==='t'
    && value(`select count(*)=1 from public.inventory_events where reference_id='${confirmedId}' and event_type='stock_committed';`)==='t'
    && invariant(confirmed)==='2/1|2/1|1|1' && confirmationAttribution()===confirmedCommitment)

  const expired=fixture('current-payment-expired',2); const expiredPayload=guestPayload(expired)
  check('temporary-expiry fixture enters through signed purchase',value(`set role anon; select ok from
    ${guestCall(expiredPayload,'192.0.2.202')};`)==='t')
  const expiredId=value(`select id from public.order_requests where idempotency_key=${literal(expiredPayload.idempotencyKey)};`)
  payment(expiredId,'awaiting_instructions'); payment(expiredId,'evidence_submitted',actor,evidence)
  sync(`update public.inventory_reservations set expires_at=now()-interval '1 minute' where order_request_id='${expiredId}';`)
  denial('uncommitted expired hold still refuses current verification',expiredId,
    command('payment_status',paymentPayload(expiredId,'verified'),reviewer),'K2_PAYMENT_STOCK_INELIGIBLE')
  sync(`update public.inventory_reservations set expires_at=now()+interval '30 minutes' where order_request_id='${expiredId}';
    update public.inventory_balances set reserved=0 where sku=${literal(expired.sku)};`)
  denial('current verification still refuses inconsistent canonical balances',expiredId,
    command('payment_status',paymentPayload(expiredId,'verified'),reviewer),'K2_PAYMENT_STOCK_INELIGIBLE')
  sync(`update public.inventory_balances set reserved=1 where sku=${literal(expired.sku)};
    update public.product_batches set inventory_status='quarantine' where id='${expired.lot}';`)
  denial('current verification still refuses quarantined lots',expiredId,
    command('payment_status',paymentPayload(expiredId,'verified'),reviewer),'K2_PAYMENT_STOCK_INELIGIBLE')
  sync(`update public.product_batches set inventory_status='available' where id='${expired.lot}';`)
  for (const [suffix,assignment] of [
    ['missing actor',"committed_at=now(),committed_by=null,commit_cause='confirmation'"],
    ['missing timestamp',`committed_at=null,committed_by='${actor}',commit_cause='confirmation'`],
    ['unknown cause',`committed_at=now(),committed_by='${actor}',commit_cause='unknown'`],
    ['missing cause',`committed_at=now(),committed_by='${actor}',commit_cause=null`],
  ]) {
    sync(`update public.inventory_reservations set ${assignment} where order_request_id='${expiredId}';`)
    denial(`current verification refuses commitment with ${suffix}`,expiredId,
      command('payment_status',paymentPayload(expiredId,'verified'),reviewer),'K2_PAYMENT_STOCK_INELIGIBLE')
  }
  sync(`update public.inventory_reservations set committed_at=null,committed_by=null,commit_cause=null
    where order_request_id='${expiredId}';`)
  payment(expiredId,'verified',reviewer)
  check('same order recovers after stock eligibility is restored',
    state(expiredId).expectedPaymentStatus==='verified' && invariant(expired)==='2/1|2/1|1|1')

  const retried=fixture('current-corrected-payment',2); const retriedPayload=guestPayload(retried)
  check('corrected-attempt fixture enters through signed purchase',value(`set role anon; select ok from
    ${guestCall(retriedPayload,'192.0.2.203')};`)==='t')
  const retriedId=value(`select id from public.order_requests where idempotency_key=${literal(retriedPayload.idempotencyKey)};`)
  payment(retriedId,'awaiting_instructions'); payment(retriedId,'evidence_submitted',actor,{...evidence,paymentAmount:100})
  payment(retriedId,'failed',reviewer)
  const rejectedEvent=value(`select to_jsonb(e)::text from public.order_request_events e
    where order_request_id='${retriedId}' and metadata->>'to'='failed';`)
  payment(retriedId,'evidence_submitted',reviewer,{...evidence,paymentAmount:100,paymentReference:'LOCAL-CORRECTED'})
  denial('latest corrected evidence submitter cannot verify their own payment',retriedId,
    command('payment_status',paymentPayload(retriedId,'verified'),reviewer),'K2_PAYMENT_INDEPENDENT_REVIEW_REQUIRED')
  payment(retriedId,'verified',actor)
  check('corrected attempt retains rejected history and commits through a distinct latest reviewer',
    rejectedEvent===value(`select to_jsonb(e)::text from public.order_request_events e
      where order_request_id='${retriedId}' and metadata->>'to'='failed';`)
    && value(`select payment_status='verified' and payment_evidence->>'payment_reference'='LOCAL-CORRECTED'
      and payment_evidence->>'submitted_by'='${reviewer}' and payment_evidence->>'verified_by'='${actor}'
      and (select count(*) from public.order_request_events where order_request_id=o.id
        and metadata->>'to'='evidence_submitted' and (metadata->>'corrected_attempt')::boolean)=1
      and (select count(*) from public.inventory_events where reference_id=o.id and event_type='stock_committed')=1
      from public.order_requests o where id='${retriedId}';`)==='t' && invariant(retried)==='2/1|2/1|1|1')

  const atomic=fixture('current-payment-atomic',1); const secondLot=randomUUID(); const atomicCoupon=randomUUID()
  sync(`insert into public.product_batches(id,sku,box_code,batch_code,quantity,quantity_available,reserved_quantity,
    inventory_status,expiry_date,best_before_date) values('${secondLot}',${literal(atomic.sku)},'LOCAL','LOCAL-LATE',1,1,0,
      'available',current_date+190,current_date+190);
    update public.inventory_balances set on_hand=2 where sku=${literal(atomic.sku)};
    select set_config('k2.allow_stock_write','on',false); update public.products set stock_available=2 where sku=${literal(atomic.sku)};
    insert into public.coupons(id,code,discount_type,discount_value,is_active)
      values('${atomicCoupon}','LOCAL-PAYMENT-ATOMIC','fixed',10,true);`)
  const atomicPayload=guestPayload(atomic,{items:[{sku:atomic.sku,quantity:2}],couponCode:'LOCAL-PAYMENT-ATOMIC',
    shippingAmount:95,shippingQuoteStatus:'customer_confirmed'})
  check('two-lot payment fixture enters through actual signed purchase',value(`set role anon; select ok from
    ${guestCall(atomicPayload,'192.0.2.204')};`)==='t')
  const atomicId=value(`select id from public.order_requests where idempotency_key=${literal(atomicPayload.idempotencyKey)};`)
  payment(atomicId,'awaiting_instructions'); payment(atomicId,'evidence_submitted',actor,{...evidence,paymentAmount:285})
  sync(`create function k2_stock_fixture.payment_commitment_fault() returns trigger language plpgsql as $$ begin
    if new.reference_id='${atomicId}'::uuid and new.event_type='stock_committed'
      and exists(select 1 from public.inventory_events where reference_id=new.reference_id and event_type='stock_committed')
    then raise exception 'LOCAL_SECOND_PAYMENT_COMMITMENT_FAILURE'; end if; return new; end $$;
    create trigger local_payment_commitment_fault before insert on public.inventory_events
      for each row execute function k2_stock_fixture.payment_commitment_fault();`)
  const atomicReview=paymentPayload(atomicId,'verified'); const atomicKey=randomUUID()
  denial('second-lot payment fault rolls back evidence, stock, coupon, events and signed command controls',atomicId,
    command('payment_status',atomicReview,reviewer,atomicKey),'LOCAL_SECOND_PAYMENT_COMMITMENT_FAILURE')
  sync('drop trigger local_payment_commitment_fault on public.inventory_events;')
  const recovered=JSON.parse(value(command('payment_status',atomicReview,reviewer,atomicKey)))
  const recoveredSnapshot=snapshot(atomicId)
  check('original payment operation recovers and replays with two exact commitments and unchanged charges',
    recovered.paymentStatus==='verified'
    && JSON.stringify(JSON.parse(value(command('payment_status',atomicReview,reviewer,atomicKey))))===JSON.stringify(recovered)
    && snapshot(atomicId)===recoveredSnapshot
    && value(`select total_amount=285 and shipping_amount=95
      and (select count(*) from public.inventory_reservations where order_request_id=o.id
        and committed_at is not null and committed_by='${reviewer}' and commit_cause='payment_verification')=2
      and (select count(*) from public.inventory_events where reference_id=o.id and event_type='stock_committed')=2
      and (select redemption_count from public.coupons where id='${atomicCoupon}')=0
      and (select on_hand=2 and reserved=2 from public.inventory_balances where sku=${literal(atomic.sku)})
      and (select sum(quantity)=2 and sum(reserved_quantity)=2 from public.product_batches where sku=${literal(atomic.sku)})
      from public.order_requests o where id='${atomicId}';`)==='t')

  for (const role of ['anon','authenticated']) for (const args of [
    `'${id}','verified','Local direct denial'`, `'${id}','verified','Local direct denial','{}'::jsonb`,
  ]) denial(`unsigned ${role} payment overload with ${args.split(',').length} arguments is denied`,id,
    `set role ${role}; select public.set_order_request_payment_status(${args});`,'permission denied for function set_order_request_payment_status')
}
