// IDEA10. Actual receiving functions on the caller's owned restore clone only.
import fs from 'node:fs'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {signedAdminCommandArguments} from '../server/admin-bff/security.js'
import {validateConsignmentCommand} from '../server/admin-bff/consignments.js'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
const bffBytes=fs.readFileSync(new URL('../server/admin-bff/consignments.js',import.meta.url))
const securityBytes=fs.readFileSync(new URL('../server/admin-bff/security.js',import.meta.url))
export const receivingWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export async function rehearseCurrentReceiving({sync,value,check,fixture,literal,source,withoutTransaction,evidence,beforeReceivingFix,guestPayload,guestCall}) {
  fs.writeFileSync(path.join(evidence,'executed-receiving-module.mjs'),bytes)
  fs.writeFileSync(path.join(evidence,'executed-consignments.js'),bffBytes)
  fs.writeFileSync(path.join(evidence,'executed-admin-security.js'),securityBytes)
  sync(source('supabase/migrations/20261002124500_release_lot_eligibility.sql'))
  sync(source('supabase/migrations/20261002140500_lot_compatibility_eligibility.sql'))
  const signatures=['public.execute_admin_consignment_command_v1(text,bigint,uuid,uuid,text,text)',
    'public.finalize_consignment_receipt(uuid,text)','public.create_consignment_manifest(text,text)',
    'public.add_consignment_item_v2(uuid,text,text,text,date,integer)',
    'public.record_consignment_item_scan(uuid,uuid,text)','public.advance_consignment(uuid,text)',
    'k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)',
    'public.sync_product_batch_compat_columns()','k2_private.lot_is_eligible_v1(public.product_batches)',
    'k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)']
  const capture=()=>JSON.parse(value(`select jsonb_agg(jsonb_build_object('signature',oid::regprocedure::text,
    'definition',pg_get_functiondef(oid),'body',prosrc,'bodyMd5',md5(replace(prosrc,chr(13),'')),
    'catalog',to_jsonb(p)-'prosrc') order by oid)::text from pg_proc p
    where oid in (${signatures.map(s=>`to_regprocedure(${literal(s)})`).join(',')});`))
  const boundary=()=>value(`select jsonb_build_object('wrapper',to_jsonb(p),'view',to_jsonb(c),
    'viewBody',pg_get_viewdef(c.oid,true),'triggers',(select jsonb_agg(to_jsonb(t) order by oid) from pg_trigger t
      where tgrelid='public.product_batches'::regclass and not tgisinternal))::text
    from pg_proc p cross join pg_class c where p.oid='public.get_public_product_stock()'::regprocedure
      and c.oid='public.v_product_stock_from_batches'::regclass;`)
  const write=(name,data)=>fs.writeFileSync(path.join(evidence,name),JSON.stringify(data,null,2)+'\n')
  const pre=capture(),publicBefore=boundary()
  write('functions-before-foundation.json',pre)
  write('public-boundary-before.json',JSON.parse(publicBefore))
  write('registry-facts.json',JSON.parse(value(`select jsonb_build_object('hubs',
    (select jsonb_agg(to_jsonb(h) order by id) from public.hubs h),'custodians',
    (select jsonb_agg(to_jsonb(c) order by id) from public.custodians c))::text;`)))
  // Prepared signed cutover in the disposable clone. The dump omits ACLs;
  // record the intended owner-only legacy overlay explicitly, not as provider grants.
  sync(source('supabase/migrations/20260812_admin_consignments_bff_boundary.sql'))
  const aclOverlay=signatures.slice(1,6).map(s=>`revoke all on function ${s} from public,anon,authenticated;`).join('\n')
  fs.writeFileSync(path.join(evidence,'local-acl-overlay.sql'),aclOverlay+'\n')
  write('functions-before-overlay.json',capture());sync(aclOverlay)
  const original=capture()
  write('composed-functions-before.json',original)
  check('Receiving signed foundation preserves current verifier/trigger/private predicate and public boundary',
    ['verify_admin_bff_request','sync_product_batch_compat_columns','lot_is_eligible_v1'].every(n=>{
      const a=pre.find(f=>f.catalog.proname===n),b=original.find(f=>f.catalog.proname===n)
      return JSON.stringify(a)===JSON.stringify(b)
    })&&boundary()===publicBefore)
  check('Recorded local legacy receiving overlay leaves actual signed RPC as the browser mutation boundary',value(`select
    has_function_privilege('authenticated','${signatures[0]}','execute')
    and not has_function_privilege('anon','${signatures[0]}','execute')
    and ${signatures.slice(1,6).map(s=>`not has_function_privilege('authenticated','${s}','execute') and
      not has_function_privilege('anon','${s}','execute')`).join(' and ')};`)==='t')
  const tables=['public.products','public.product_batches','public.inventory_balances','public.inventory_reservations',
    'public.batch_change_events','public.inventory_events','public.order_requests','public.order_request_items',
    'public.orders','public.order_request_events','public.coupons','public.coupon_redemptions',
    'public.consignments','public.consignment_items','public.consignment_scan_events','public.audit_logs',
    'public.hubs','public.custodians','public.channel_listings','k2_private.admin_command_receipts','k2_private.admin_request_nonces',
    'k2_private.admin_request_rate_buckets','k2_private.guest_request_nonces','k2_private.guest_rate_buckets']
  const snapshot=()=>JSON.parse(value(`select jsonb_build_object(${tables.map(t=>`${literal(t)},
    (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by to_jsonb(x)::text),'')) from ${t} x)`).join(',')})::text;`))
  const business=s=>Object.fromEntries(Object.entries(s).filter(([t])=>
    !['k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets'].includes(t)))
  const reports=[],failures=[]
  const controls=()=>JSON.parse(value(`select jsonb_build_object('observedNow',clock_timestamp(),
    'observedBucket',date_trunc('minute',clock_timestamp()),'nonces',
    (select coalesce(jsonb_agg(to_jsonb(n) order by actor_id,action,nonce),'[]') from k2_private.admin_request_nonces n),
    'rates',(select coalesce(jsonb_agg(to_jsonb(b) order by scope,subject,bucket_start),'[]') from k2_private.admin_request_rate_buckets b))::text;`))
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
  const permittedRetry=(a,b,actor,args)=>{
    if(!args||!Number.isInteger(args.p_timestamp)||args.p_action!=='consignment_finalize'
      ||args.p_timestamp<Math.floor(Date.parse(a.observedNow)/1000)
      ||args.p_timestamp>Math.floor(Date.parse(b.observedNow)/1000))return false
    const added=b.nonces.filter(n=>!a.nonces.some(x=>same(x,n))),key=r=>[r.scope,r.subject,r.bucket_start].join('|')
    const old=new Map(a.rates.map(r=>[key(r),r])),deltas=b.rates.map(r=>({...r,delta:r.hit_count-(old.get(key(r))?.hit_count||0)})).filter(r=>r.delta)
    return b.nonces.length===a.nonces.length+1&&a.nonces.every(n=>b.nonces.some(x=>same(x,n)))
      &&added.length===1&&added[0].nonce===args?.p_nonce&&added[0].actor_id===actor&&added[0].action===args.p_action
      &&Object.keys(added[0]).sort().join(',')==='action,actor_id,expires_at,nonce,used_at'
      &&Date.parse(added[0].used_at)>=Date.parse(a.observedNow)
      &&Date.parse(added[0].used_at)<=Date.parse(b.observedNow)
      &&Date.parse(added[0].expires_at)-Date.parse(added[0].used_at)===600000
      &&a.rates.every(r=>b.rates.some(x=>key(x)===key(r)))&&deltas.length===2
      &&deltas.every(r=>r.delta===1)&&deltas.some(r=>r.scope==='actor'&&r.subject===actor)
      &&deltas.some(r=>r.scope==='global'&&r.subject==='all_admin_requests')
      &&deltas[0].bucket_start===deltas[1].bucket_start
      &&[a.observedBucket,b.observedBucket].includes(deltas[0].bucket_start)
      &&b.rates.every(r=>{const previous=old.get(key(r));return previous?same({...previous,hit_count:r.hit_count},r)
        :deltas.some(d=>key(d)===key(r))&&r.hit_count===1&&Object.keys(r).sort().join(',')==='bucket_start,hit_count,scope,subject'})
  }
  const expect=(name,condition)=>{try{check(name,condition)}catch(e){failures.push(e.message)}}
  const save=()=>write('receiving-parity.json',{idea:'IDEA-20261002-10',synthetic:true,providerWrites:false,
    beforeReceivingFix,receivingWitnessSha256,scope:'Actual signed historical receiving custody chain after prepared release/lot compatibility; nine rapid no-pruning retries with exact controls; excludes later calendar/retry/clearance chain, UI/provider/real acceptance',reports,failures})
  const observe=(sku,id)=>JSON.parse(value(`select jsonb_build_object(
    'manifest',(select to_jsonb(c) from public.consignments c where id='${id}'),
    'items',(select jsonb_agg(to_jsonb(i) order by id) from public.consignment_items i where consignment_id='${id}'),
    'scans',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') from public.consignment_scan_events e where consignment_id='${id}'),
    'lots',(select coalesce(jsonb_agg(to_jsonb(b) order by id),'[]') from public.product_batches b where sku=${literal(sku)}),
    'product',(select to_jsonb(p) from public.products p where sku=${literal(sku)}),
    'balance',(select to_jsonb(b) from public.inventory_balances b where sku=${literal(sku)} and location_code='MANILA_MAIN'),
    'privateSellable',(select coalesce(sum(greatest(quantity-reserved_quantity,0)),0) from public.product_batches b
      where sku=${literal(sku)} and k2_private.lot_is_eligible_v1(b)),
    'publicSellable',(select coalesce(sum(stock_from_batches),0) from public.get_public_product_stock() where sku=${literal(sku)}),
    'events',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') from public.inventory_events e where sku=${literal(sku)}),
    'audit',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') from public.audit_logs e where record_id='${id}'))::text;`))
  const admin=(actor,action,payload,key=randomUUID(),zone='Asia/Manila',extra='',capture)=>{
    const a=signedAdminCommandArguments(action,actor,key,payload)
    if(capture)Object.assign(capture,{actor,zone,args:a})
    return JSON.parse(value(`select set_config('request.jwt.claim.sub','${actor}',false);
      select set_config('request.jwt.claims','{"aal":"aal2"}',false);set time zone ${literal(zone)};${extra}set role authenticated;
      select public.execute_admin_consignment_command_v1(${['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'].map(k=>literal(a[k])).join(',')});`))
  }
  let ordinal=6,current
  const prepare=(label,days,{received=2,seedQuantity=0,draft=false,extraLines=[]}={})=>{
    const actor=`42000000-0000-4000-8000-${String(ordinal++).padStart(12,'0')}`
    sync(`insert into auth.users(id) values('${actor}');insert into public.user_profiles(id,role) values('${actor}','Admin')
      on conflict(id) do update set role=excluded.role;`)
    const f=fixture('receiving-'+label+'-'+randomUUID().slice(0,8),seedQuantity)
    if(draft)sync(`update public.products set status='Draft',published=false where sku=${literal(f.sku)};
      delete from public.channel_listings where sku=${literal(f.sku)};`)
    const manifest=admin(actor,'consignment_create',{manifestCode:'LOCAL-'+randomUUID().slice(0,8),shipmentReference:'Synthetic receiving'})
    const date=value(`select ((transaction_timestamp() at time zone 'Asia/Manila')::date+${days})::text;`)
    const line=admin(actor,'consignment_add_line',{consignmentId:manifest.consignmentId,sku:f.sku,batchCode:'LOCAL-RECEIPT',boxCode:'LOCAL-BOX',bestBeforeDate:date,expectedQty:2})
    const scan={consignmentId:manifest.consignmentId,itemId:line.itemId,stage:'milan',scannedCode:f.sku}
    const milan=[admin(actor,'consignment_scan',scan),admin(actor,'consignment_scan',scan)]
    const extras=extraLines.map((sku,i)=>{
      const item=admin(actor,'consignment_add_line',{consignmentId:manifest.consignmentId,sku:sku||f.sku,
        batchCode:'LOCAL-EXTRA-'+i,boxCode:'LOCAL-EXTRA-'+i,bestBeforeDate:date,expectedQty:2})
      const s={consignmentId:manifest.consignmentId,itemId:item.itemId,stage:'milan',scannedCode:sku||f.sku}
      return {...item,milan:[admin(actor,'consignment_scan',s),admin(actor,'consignment_scan',s)],scan:s}
    })
    admin(actor,'consignment_advance',{consignmentId:manifest.consignmentId,toStatus:'In_Transit',reason:'Synthetic complete independent Milan packing'})
    admin(actor,'consignment_advance',{consignmentId:manifest.consignmentId,toStatus:'Arrived_Manila',reason:'Synthetic declared arrival for independent recount'})
    const manila=Array.from({length:received},()=>admin(actor,'consignment_scan',{...scan,stage:'manila'}))
    for(const e of extras)e.manila=[admin(actor,'consignment_scan',{...e.scan,stage:'manila'}),admin(actor,'consignment_scan',{...e.scan,stage:'manila'})]
    const result={...f,actor,id:manifest.consignmentId,itemId:line.itemId,milan,manila,days,date,extras}
    check(`${label}: actual signed create/lines/independent scans preserve pre-receipt physical stock`,
      milan[0].italyPackedQty===1&&milan[1].italyPackedQty===2&&milan[1].manilaScannedQty===0
      &&manila.every((s,i)=>s.manilaScannedQty===i+1)&&observe(f.sku,result.id).balance.on_hand===seedQuantity
      &&extras.every(e=>e.milan[1].italyPackedQty===2&&e.milan[1].manilaScannedQty===0&&e.manila[1].manilaScannedQty===2))
    return result
  }
  const context=f=>({consignmentId:f.id,notes:'Synthetic complete verified receiving with canonical custody',
    hub:'HUB-MNL-CENTRAL',custodian:'CUST-STAFF-ELENA'})
  const refuse=(name,call,pattern)=>{
    current={case:name,beforeHashes:snapshot()};reports.push(current)
    try{current.result=call()}catch(e){current.error=e.message}
    current.afterHashes=snapshot()
    check(name,!!current.error&&pattern.test(current.error)&&JSON.stringify(current.beforeHashes)===JSON.stringify(current.afterHashes));save()
  }
  try {
    if(!beforeReceivingFix) {
      const historical=prepare('historical-receipt',180),key=randomUUID()
      const payload={consignmentId:historical.id,notes:'Synthetic historical signed receipt remains exactly replayable'}
      current={case:'historical receipt before installation',fixture:historical,key,payload};reports.push(current)
      current.result=admin(historical.actor,'consignment_finalize',payload,key);current.beforeHashes=snapshot();save()
      const migration=source('supabase/migrations/20261002225500_receiving_custody_eligibility.sql')
      sync(migration);current.afterHashes=snapshot()
      const installed=capture();write('composed-functions-after.json',installed)
      write('installation-state.json',{before:current.beforeHashes,after:current.afterHashes})
      check('Receiving installation changes no physical/product/history/publication/control row',
        JSON.stringify(current.beforeHashes)===JSON.stringify(current.afterHashes))
      sync(migration)
      check('Guarded receiving installation replays with exact compiled catalogs and ACLs',JSON.stringify(capture())===JSON.stringify(installed))
      current.retryPayload=validateConsignmentCommand('consignment_finalize',payload)
      current.beforeRetryControls=controls();current.signedRetry={}
      current.retry=admin(historical.actor,'consignment_finalize',current.retryPayload,key,'Asia/Manila','',current.signedRetry);current.afterRetryHashes=snapshot();current.afterRetryControls=controls()
      check('Historical exact ID/notes receipt passes BFF and signed retry without retrofitting history or custody',
        JSON.stringify(current.result)===JSON.stringify(current.retry)&&JSON.stringify(business(current.afterHashes))===JSON.stringify(business(current.afterRetryHashes)))
      check('Historical accepted retry changes exactly its new nonce and actor/global rate hits',permittedRetry(current.beforeRetryControls,current.afterRetryControls,historical.actor,current.signedRetry.args))
      save()
      refuse('Historical same key with new context remains an idempotency conflict',
        ()=>admin(historical.actor,'consignment_finalize',{...payload,hub:'HUB-MNL-CENTRAL',custodian:'CUST-STAFF-ELENA'},key),/K2_ADMIN_IDEMPOTENCY_CONFLICT/)
      const staff=`select set_config('request.jwt.claim.sub','${historical.actor}',false);
        select set_config('request.jwt.claims','{"aal":"aal2"}',false);set role authenticated;`
      refuse('Actual unsigned staff/AAL2 historical finalizer is denied',()=>sync(`${staff}
        select public.finalize_consignment_receipt('${historical.id}','Synthetic unsigned finalizer must be denied');`),/permission denied/)
      refuse('Actual unsigned staff/AAL2 private finalizer is denied',()=>sync(`${staff}
        select k2_private.finalize_consignment_receipt_v1('${historical.id}','Synthetic unsigned finalizer must be denied','HUB-MNL-CENTRAL','CUST-STAFF-ELENA');`),/permission denied/)
      const signedBefore=original.find(f=>f.catalog.proname==='execute_admin_consignment_command_v1')
      const oldBefore=original.find(f=>f.catalog.proname==='finalize_consignment_receipt')
      const signedAfter=installed.find(f=>f.catalog.proname===signedBefore.catalog.proname)
      const oldAfter=installed.find(f=>f.catalog.proname===oldBefore.catalog.proname)
      check('Receiving preserves signed non-body catalog and old finalizer body/default/catalog except explicit ACL',
        JSON.stringify(signedBefore.catalog)===JSON.stringify(signedAfter.catalog)&&oldBefore.body===oldAfter.body
        &&JSON.stringify({...oldBefore.catalog,proacl:null})===JSON.stringify({...oldAfter.catalog,proacl:null}))
      const oldSig='public.finalize_consignment_receipt(uuid,text)',newSig='k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)'
      check('Both legacy/private finalizers grant only owner with no unsigned role execution',value(`select
        ${[oldSig,newSig].map(s=>`(select proacl is not null and (select count(*) from aclexplode(proacl))=1
          and not exists(select 1 from aclexplode(proacl) a where a.grantee<>proowner) from pg_proc where oid='${s}'::regprocedure)
          and ${['anon','authenticated','service_role'].map(role=>`not has_function_privilege('${role}','${s}','execute')`).join(' and ')}`).join(' and ')};`)==='t')
      const closure={case:'deliberate legacy PUBLIC execution closure',beforeHashes:snapshot()};reports.push(closure)
      sync(`begin;grant execute on function ${oldSig} to public;`+withoutTransaction(migration)+`
        create table k2_stock_fixture.closure as select proacl::text acl from pg_proc where oid='${oldSig}'::regprocedure;commit;`)
      closure.ownerOnly=value(`select acl=(select proacl::text from pg_proc where oid='${oldSig}'::regprocedure) and
        not has_function_privilege('authenticated','${oldSig}','execute') from k2_stock_fixture.closure;`)==='t'
      closure.afterHashes=snapshot();closure.afterFunctions=capture()
      check('Known legacy PUBLIC/default execution closes deliberately without any row or unrelated catalog change',
        closure.ownerOnly&&JSON.stringify(closure.beforeHashes)===JSON.stringify(closure.afterHashes)&&JSON.stringify(capture())===JSON.stringify(installed));save()
      const driftCases=[`alter function ${oldSig} strict;`,`grant execute on function ${oldSig} to anon;`,
        `alter function ${newSig} security invoker;`,`alter function ${newSig} cost 101;`,`grant execute on function ${newSig} to authenticated;`,
        `alter function ${signatures[0]} set search_path='public';`,`grant execute on function ${signatures[0]} to service_role;`,
        `alter function ${signatures[0]} strict;`,`alter function ${signatures[0]} parallel safe;`,
        `alter function k2_private.lot_is_eligible_v1(public.product_batches) strict;`,
        `grant execute on function k2_private.lot_is_eligible_v1(public.product_batches) to authenticated;`,
        `alter table public.product_batches disable trigger trg_sync_product_batch_compat_columns;`,
        installed.find(f=>f.catalog.proname==='finalize_consignment_receipt_v1').definition.replace(
          installed.find(f=>f.catalog.proname==='finalize_consignment_receipt_v1').body,
          b=>b+'\n-- unknown private body revision\n')]
      for(const [i,drift] of driftCases.entries()) {
        const beforeFunctions=capture()
        refuse(`Receiving installer refuses drift ${i+1} with exact row rollback`,()=>sync(`begin;${drift};${withoutTransaction(migration)}rollback;`),/MAP-023 receiving: unfamiliar/)
        current.beforeFunctions=beforeFunctions;current.afterFunctions=capture()
        check(`Receiving installer drift ${i+1} restores exact body/catalog/ACL/binding`,JSON.stringify(beforeFunctions)===JSON.stringify(current.afterFunctions)&&boundary()===publicBefore);save()
      }
      sync(`create function k2_stock_fixture.fail_receiving_ddl() returns event_trigger language plpgsql as $$ declare d record;begin
        if current_setting('k2.fixture.fail_receiving_ddl',true)='on' then
          for d in select * from pg_event_trigger_ddl_commands() loop
            if d.objid='${signatures[0]}'::regprocedure then
              if to_regprocedure('${newSig}') is null or has_function_privilege('authenticated','${oldSig}','execute') then
                raise exception 'FIXTURE_INVALID_INSTALL_FAULT_POINT';end if;
              raise exception 'LOCAL_DDL_AFTER_PRIVATE_FAILURE';end if;
          end loop;end if;end $$;
        create event trigger local_receiving_ddl_fault on ddl_command_end execute function k2_stock_fixture.fail_receiving_ddl();`)
      const ddlBefore=capture()
      refuse('Later installer DDL failure rolls back private creation, legacy ACL closure and command replacement',
        ()=>sync(`begin;${signedBefore.definition};drop function ${newSig};grant execute on function ${oldSig} to public;
          set local k2.fixture.fail_receiving_ddl='on';${withoutTransaction(migration)}rollback;`),/LOCAL_DDL_AFTER_PRIVATE_FAILURE/)
      current.beforeFunctions=ddlBefore;current.afterFunctions=capture()
      check('Later installer fault restores exact original installed body/catalog/ACL set',JSON.stringify(ddlBefore)===JSON.stringify(current.afterFunctions));save()
    }
    const payload={consignmentId:randomUUID(),notes:'Synthetic finalization with missing receiving custody'}
    const legacyPayload=validateConsignmentCommand('consignment_finalize',payload)
    let partialRefusal='';try{validateConsignmentCommand('consignment_finalize',{...payload,hub:'HUB-MNL-CENTRAL'})}catch(e){partialRefusal=e.message}
    current={case:'legacy receipt retry BFF schema',payload,legacyPayload,partialRefusal};reports.push(current)
    check('BFF preserves exact historical ID/notes receipt retry shape and refuses partial custody',
      JSON.stringify(legacyPayload)===JSON.stringify(payload)&&partialRefusal==='REQUEST_INVALID');save()
    const missing=prepare('missing-context',180),key=randomUUID()
    current={case:'missing custody signed finalization',fixture:missing,before:observe(missing.sku,missing.id),beforeHashes:snapshot(),key};reports.push(current)
    try{current.result=admin(missing.actor,'consignment_finalize',{consignmentId:missing.id,notes:'Synthetic missing receiving custody must not complete'},key)}catch(e){current.error=e.message}
    current.after=observe(missing.sku,missing.id);current.afterHashes=snapshot()
    expect('Actual signed finalization refuses missing custody with complete business/control rollback',
      current.error?.includes('K2_ADMIN_PAYLOAD_INVALID')&&JSON.stringify(current.beforeHashes)===JSON.stringify(current.afterHashes));save()
    const legacy=prepare('legacy-calendar',90)
    const zone=value(`select zone from (values('Pacific/Kiritimati'),('Etc/GMT+12')) z(zone)
      where (transaction_timestamp() at time zone zone)::date>(transaction_timestamp() at time zone 'Asia/Manila')::date limit 1;`)
    if(beforeReceivingFix&&zone) {
      current={case:'original caller-calendar discovery',fixture:legacy,zone};reports.push(current)
      current.result=admin(legacy.actor,'consignment_finalize',{consignmentId:legacy.id,notes:'Synthetic original caller-calendar receiving discovery'},randomUUID(),zone)
      current.after=observe(legacy.sku,legacy.id);save()
    }
    for(const days of [180,90,89,31,30]) {
      const f=days===90?legacy:prepare('explicit-'+days,days),newKey=randomUUID(),valid=days>=90
      current={case:'explicit custody/'+days,fixture:f,key:newKey,before:observe(f.sku,f.id),beforeHashes:snapshot()};reports.push(current)
      const supplied=context(f)
      try{current.apiPayload=validateConsignmentCommand('consignment_finalize',supplied)}catch(e){current.apiError=e.message}
      try{current.result=admin(f.actor,'consignment_finalize',supplied,newKey,zone||'Asia/Manila')}catch(e){current.error=e.message}
      current.after=observe(f.sku,f.id);current.afterHashes=snapshot()
      const lot=current.after.lots.find(b=>b.source_consignment_item_id===f.itemId)
      expect(`${days}: explicit canonical receiving context reaches complete signed physical/private/public/cache/source parity`,
        !current.apiError&&!current.error&&current.result?.inventoryFinalized===true&&current.after.manifest.status==='Completed'
        &&lot?.quantity===2&&lot.reserved_quantity===0&&lot.hub===supplied.hub&&lot.custodian===supplied.custodian
        &&lot.landed_date===value("select (transaction_timestamp() at time zone 'Asia/Manila')::date::text;")
        &&lot.quantity_available===(valid?2:0)&&lot.inventory_status===(valid?'available':'quarantine')
        &&current.after.balance.on_hand===2&&current.after.balance.reserved===0&&current.after.privateSellable===(valid?2:0)
        &&current.after.publicSellable===(valid?2:0)&&current.after.product.stock_available===(valid?2:0)&&current.after.product.total_stock===(valid?2:0)
        &&current.after.events.filter(e=>e.event_type==='received'&&e.reference_id===f.id&&e.actor_id===f.actor&&e.quantity===2).length===1)
      if(!current.error) {
        const beforeRetry=snapshot();current.beforeRetryControls=controls();current.signedRetry={};current.retry=admin(f.actor,'consignment_finalize',supplied,newKey,zone||'Asia/Manila','',current.signedRetry);current.afterRetryControls=controls()
        current.afterRetryHashes=snapshot();current.beforeRetryHashes=beforeRetry
        check(`${days}: signed same-key receiving retry preserves exact business/history and result`,
          JSON.stringify(current.result)===JSON.stringify(current.retry)&&JSON.stringify(business(beforeRetry))===JSON.stringify(business(current.afterRetryHashes)))
        check(`${days}: retry has exact permitted nonce/rate deltas`,permittedRetry(current.beforeRetryControls,current.afterRetryControls,f.actor,current.signedRetry.args))
        check(`${days}: received audit snapshots bind the actual saved lot, source and balance delta`,value(`select count(*)=1 and bool_and(
          e.metadata->>'batch_id'=b.id::text and e.metadata->>'source_consignment_item_id'=b.source_consignment_item_id::text
          and e.metadata->>'inventory_status'=b.inventory_status and (e.metadata->>'quantity_available')::integer=b.quantity_available
          and jsonb_populate_record(null::public.product_batches,e.metadata->'batch_after') is not distinct from b
          and (e.metadata->'balance_after'->>'on_hand')::integer-(e.metadata->'balance_before'->>'on_hand')::integer=e.quantity)
          from public.inventory_events e join public.product_batches b on b.id=(e.metadata->>'batch_id')::uuid
          where e.reference_id='${f.id}' and e.event_type='received';`)==='t')
      }
      save()
      if(!beforeReceivingFix&&!current.error) {
        refuse(`${days}: fresh key cannot refinalize completed receipt`,()=>admin(f.actor,'consignment_finalize',supplied),/K2_RECEIVING_ALREADY_COMPLETED/)
        refuse(`${days}: fresh key cannot relabel completed receipt custody`,()=>admin(f.actor,'consignment_finalize',
          {...supplied,custodian:'CUST-STAFF-MATTEO'}),/K2_RECEIVING_ALREADY_COMPLETED/)
      }
    }
    if(!beforeReceivingFix) {
      const invalid=prepare('invalid-context',180)
      for(const [name,extra,pattern] of [
        ['missing hub',{hub:undefined},/K2_ADMIN_PAYLOAD_INVALID/],['missing custodian',{custodian:undefined},/K2_ADMIN_PAYLOAD_INVALID/],
        ['NULL hub',{hub:null},/K2_ADMIN_PAYLOAD_INVALID/],['wrong type custody',{custodian:5},/K2_ADMIN_PAYLOAD_INVALID/],
        ['empty custody',{custodian:' '},/K2_ADMIN_PAYLOAD_INVALID/],['legacy hub',{hub:'MANILA_MAIN'},/K2_RECEIVING_CUSTODY_INVALID/],
        ['unknown hub',{hub:'HUB-NOT-REGISTERED'},/K2_RECEIVING_CUSTODY_INVALID/],
        ['unknown custodian',{custodian:'CUST-NOT-REGISTERED'},/K2_RECEIVING_CUSTODY_INVALID/],
        ['wrong hub association',{custodian:'CUST-STAFF-MARCO'},/K2_RECEIVING_CUSTODY_INVALID/],
        ['forged received count',{quantity:20},/K2_ADMIN_PAYLOAD_INVALID/],
        ['wrong type notes',{notes:1234567890},/K2_ADMIN_PAYLOAD_INVALID/],
      ])refuse(`Fresh receiving refuses ${name}`,()=>admin(invalid.actor,'consignment_finalize',{...context(invalid),...extra}),pattern)
      refuse('Receiving refuses actual non-AAL2 signed staff',()=>admin(invalid.actor,'consignment_finalize',context(invalid),randomUUID(),
        'Asia/Manila',`select set_config('request.jwt.claims','{"aal":"aal1"}',false);`),/K2_ADMIN_AAL2_REQUIRED/)
      const outsider=randomUUID();sync(`insert into auth.users(id) values('${outsider}');`)
      refuse('Receiving refuses actual nonstaff signed actor',()=>admin(outsider,'consignment_finalize',context(invalid)),/K2_ADMIN_ACCESS_REQUIRED/)
      current={case:'valid receiving recovery after custody/auth refusals',fixture:invalid};reports.push(current)
      current.result=admin(invalid.actor,'consignment_finalize',context(invalid));current.after=observe(invalid.sku,invalid.id)
      check('Known-success receiving control completes after invalid-context/auth refusals',current.after.balance.on_hand===2&&current.after.privateSellable===2);save()
      const short=prepare('shortage',180,{received:1})
      current={case:'actual independent shortage',fixture:short,before:observe(short.sku,short.id),beforeHashes:snapshot()};reports.push(current)
      current.result=admin(short.actor,'consignment_finalize',context(short));current.after=observe(short.sku,short.id);current.afterHashes=snapshot()
      const received=current.after.events.find(e=>e.event_type==='received'),shortage=current.after.events.find(e=>e.event_type==='reconciled')
      check('Actual packed2/Manila1 receipt adds only physical1 and attributes missing1 without copying packed counts',
        current.after.balance.on_hand===1&&current.after.privateSellable===1&&received?.quantity===1&&shortage?.quantity===1
        &&shortage.actor_id===short.actor&&shortage.metadata.result==='missing_on_arrival'&&shortage.metadata.source_consignment_item_id===short.itemId
        &&shortage.metadata.italy_packed_qty===2&&shortage.metadata.manila_scanned_qty===1);save()
      const draft=prepare('draft-unlisted',180,{draft:true})
      current={case:'Draft unlisted receiving',fixture:draft,before:observe(draft.sku,draft.id),beforeHashes:snapshot()};reports.push(current)
      current.result=admin(draft.actor,'consignment_finalize',context(draft));current.after=observe(draft.sku,draft.id);current.afterHashes=snapshot()
      check('Draft receiving creates physical/internal eligible units without publication or Website membership',
        current.after.balance.on_hand===2&&current.after.privateSellable===2&&current.after.publicSellable===0
        &&current.after.product.stock_available===2&&current.after.product.status==='Draft'&&current.after.product.published===false
        &&current.beforeHashes['public.channel_listings']===current.afterHashes['public.channel_listings']);save()
      const saved=prepare('saved-held-stock',180,{seedQuantity:3})
      sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA' where id='${saved.lot}';`)
      const purchase=guestPayload(saved);check('Receiving existing-stock fixture has an actual signed active reservation',
        value(`set role anon;select ok from ${guestCall(purchase,'192.0.2.254')};`)==='t')
      const bad=randomUUID();sync(`insert into public.product_batches(id,sku,box_code,batch_code,quantity,reserved_quantity,expiry_date,best_before_date,hub,custodian,inventory_status)
        values('${bad}',${literal(saved.sku)},'LOCAL-BAD','LOCAL-BAD',4,0,current_date+180,current_date+180,'MANILA_MAIN',null,'available');
        alter table public.product_batches disable trigger trg_sync_product_batch_compat_columns;
        update public.product_batches set quantity_available=4 where id='${bad}';
        alter table public.product_batches enable trigger trg_sync_product_batch_compat_columns;
        delete from public.inventory_balances where sku=${literal(saved.sku)};`)
      current={case:'saved physical/reserved initialization and stale sibling',fixture:saved,before:observe(saved.sku,saved.id),beforeHashes:snapshot()};reports.push(current)
      current.result=admin(saved.actor,'consignment_finalize',context(saved));current.after=observe(saved.sku,saved.id);current.afterHashes=snapshot()
      check('Absent receiving balance retains saved physical7/reserved1 and adds only counted2, excluding unsafe stale sibling',
        current.before.balance===null&&current.after.balance.on_hand===9&&current.after.balance.reserved===1
        &&current.after.privateSellable===4&&current.after.publicSellable===4&&current.after.product.stock_available===4
        &&current.after.lots.find(b=>b.id===bad).quantity_available===4
        &&current.beforeHashes['public.inventory_reservations']===current.afterHashes['public.inventory_reservations']
        &&JSON.stringify(current.before.lots)===JSON.stringify(current.after.lots.filter(b=>b.source_consignment_item_id!==saved.itemId)));save()
      sync(`create function k2_stock_fixture.fail_receiving_command() returns trigger language plpgsql as $$ begin
        if current_setting('k2.fixture.fail_receiving_command',true)=tg_argv[0] then
          if tg_table_name='inventory_events' and to_jsonb(new)->>'event_type'='received' or
            tg_table_name='audit_logs' and to_jsonb(new)->>'table_name'='consignments' and to_jsonb(new)->'new_data' ? 'receipt_notes' or
            tg_table_name='admin_command_receipts' and to_jsonb(new)->>'action'='consignment_finalize' and to_jsonb(new)->'result'<>'null'::jsonb then
            raise exception 'LOCAL_RECEIVING_COMMAND_FAULT:%',tg_argv[0];end if;
        end if;return new;end $$;
        create trigger local_receiving_event_fault after insert on public.inventory_events for each row
          execute function k2_stock_fixture.fail_receiving_command('received');
        create trigger local_receiving_audit_fault after insert on public.audit_logs for each row
          execute function k2_stock_fixture.fail_receiving_command('audit');
        create trigger local_receiving_receipt_fault after update on k2_private.admin_command_receipts for each row
          execute function k2_stock_fixture.fail_receiving_command('receipt');`)
      for(const point of ['received','audit','receipt']) {
        const other=fixture('aaa-receiving-'+point+'-'+randomUUID().slice(0,8),0)
        const multi=prepare('multi-'+point,180,{extraLines:['',other.sku]})
        const key=randomUUID(),payload=context(multi)
        refuse(`Receiving ${point} fault rolls back all three source lines, two SKUs and signed controls`,
          ()=>admin(multi.actor,'consignment_finalize',payload,key,'Asia/Manila',`set k2.fixture.fail_receiving_command='${point}';`),new RegExp('LOCAL_RECEIVING_COMMAND_FAULT:'+point))
        current.fixture=multi;current.other=other;current.key=key;current.payload=payload;save()
        current={case:'multi-line '+point+' recovery/retry',fixture:multi,other,key,before:observe(multi.sku,multi.id),
          otherBefore:observe(other.sku,multi.id),beforeHashes:snapshot()};reports.push(current)
        current.result=admin(multi.actor,'consignment_finalize',payload,key);current.after=observe(multi.sku,multi.id)
        current.otherAfter=observe(other.sku,multi.id);current.afterHashes=snapshot()
        const sourceLots=current.after.lots.filter(b=>b.source_consignment_item_id),otherLots=current.otherAfter.lots.filter(b=>b.source_consignment_item_id)
        check(`${point}: actual reverse-SKU three-line receipt adds each distinct box once and sums same-SKU units`,
          multi.sku>other.sku&&sourceLots.length===2&&otherLots.length===1&&new Set(sourceLots.map(b=>b.box_code)).size===2
          &&current.after.balance.on_hand===4&&current.otherAfter.balance.on_hand===2
          &&current.after.privateSellable===4&&current.after.publicSellable===4&&current.otherAfter.privateSellable===2
          &&current.after.events.filter(e=>e.event_type==='received').length===2&&current.otherAfter.events.filter(e=>e.event_type==='received').length===1
          &&current.beforeHashes['public.consignment_scan_events']===current.afterHashes['public.consignment_scan_events']);save()
        current.beforeRetryHashes=snapshot();current.beforeRetryControls=controls();current.signedRetry={}
        current.retry=admin(multi.actor,'consignment_finalize',payload,key,'Asia/Manila','',current.signedRetry);current.afterRetryHashes=snapshot();current.afterRetryControls=controls()
        check(`${point}: freshly signed same-key recovery replay has exact result/business and permitted controls`,
          JSON.stringify(current.result)===JSON.stringify(current.retry)&&JSON.stringify(business(current.beforeRetryHashes))===JSON.stringify(business(current.afterRetryHashes))
          &&permittedRetry(current.beforeRetryControls,current.afterRetryControls,multi.actor,current.signedRetry.args));save()
      }
    }
  }catch(e){if(current)current.executionError=e.message;throw e}finally{save()}
  check('Receiving witness preserves exact public stock boundary and compatibility binding',boundary()===publicBefore)
  if(failures.length)throw Error(`RECEIVING_PARITY_FAILURES:${failures.length}`)
}
