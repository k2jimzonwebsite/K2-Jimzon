// IDEA10: historical release-race chain on the owned local clone; later candidates excluded.
import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { signedAdminCommandArguments } from '../server/admin-bff/security.js'
import { signedRpcArguments } from '../server/storefront-bff/security.js'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
export const releaseWitnessSha256=createHash('sha256').update(bytes).digest('hex')

export async function rehearseCurrentReleaseConcurrency({sync,value,check,fixture,guestPayload,guestCall,
  actor,literal,session,controller,blockedBy,waitFor,invariant,completed,evidence,releaseWitnessFailure,fixtureSkus,releaseCurrentChain}) {
  fs.writeFileSync(path.join(evidence,'executed-release-module.mjs'),bytes)
  const signatures=['public.cancel_order_request(uuid,text)','public.release_expired_reservations_v1(integer)',
    'public.reserve_order_request_lots_v1(uuid,text)',
    'public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text,numeric,text)']
  const capture=()=>JSON.parse(value(`select jsonb_agg(jsonb_build_object('signature',oid::regprocedure::text,
    'definition',pg_get_functiondef(oid),'catalog',to_jsonb(p)-'prosrc') order by oid)::text
    from pg_proc p where oid in (${signatures.map(s=>`${literal(s)}::regprocedure`).join(',')});`))
  const installed=capture()
  fs.writeFileSync(path.join(evidence,'release-functions.json'),JSON.stringify(installed,null,2)+'\n')
  const allTables=releaseCurrentChain?JSON.parse(value(`select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private') and c.relkind in ('r','p');`)):['public.products','public.product_batches','public.inventory_balances','public.inventory_reservations',
    'public.batch_change_events','public.inventory_events','public.order_requests','public.order_request_items',
    'public.orders','public.order_request_events','public.packing_scan_events','public.coupons','public.coupon_redemptions',
    'public.channel_listings','public.customers','public.customer_contact_points','public.channel_identities',
    'public.guest_access_grants','public.guest_access_grant_scopes','public.conversations','public.messages',
    'public.conversation_events','k2_private.admin_command_receipts','k2_private.admin_request_nonces',
    'k2_private.admin_request_rate_buckets','k2_private.guest_request_nonces','k2_private.guest_rate_buckets']
  fs.writeFileSync(path.join(evidence,'release-table-names.json'),JSON.stringify(allTables,null,2)+'\n')
  const whole=()=>JSON.parse(value(`select jsonb_object_agg(table_name,table_hash)::text from (values ${allTables.map(table=>`(${literal(table)},
    (select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from ${table} t))`).join(',')}) snapshot(table_name,table_hash);`))
  const business=s=>Object.fromEntries(Object.entries(s).filter(([table])=>
    !['k2_private.guest_request_nonces','k2_private.guest_rate_buckets'].includes(table)))
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
  const controls=()=>JSON.parse(value(`select jsonb_build_object('observedNow',clock_timestamp(),
    'nonces',(select coalesce(jsonb_agg(to_jsonb(n) order by action,nonce),'[]') from k2_private.guest_request_nonces n),
    'rates',(select coalesce(jsonb_agg(to_jsonb(b) order by action,dimension,subject_hash,bucket_start),'[]')
      from k2_private.guest_rate_buckets b))::text;`))
  const guest=(payload,ip)=>{
    const args=signedRpcArguments({headers:{},socket:{remoteAddress:ip}},'order',payload)
    const contactHash=value(`select encode(k2_private.contact_hash(${literal(args.p_payload_text)}::jsonb),'hex');`)
    const call=`public.submit_guest_order_v1(${[
      'p_timestamp','p_nonce','p_payload_text','p_ip_hash','p_signature'].map(k=>literal(args[k])).join(',')},null)`
    return {args,contactHash,call,sql:`select set_config('request.jwt.claim.sub','',false);
      select set_config('request.jwt.claims','{}',false);set role anon;
      select row_to_json(r)::text from ${call} r;`}

  }
  const exactGuest=(a,b,command)=>{
    if(!command?.args||!Number.isInteger(command.args.p_timestamp)
      ||command.args.p_timestamp<Math.floor(Date.parse(a.observedNow)/1000)
      ||command.args.p_timestamp>Math.floor(Date.parse(b.observedNow)/1000))return false
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
      &&b.rates.every(r=>Object.keys(r).sort().join(',')==='action,bucket_start,dimension,hit_count,subject_hash,updated_at,window_seconds')
      &&b.rates.every(r=>{const p=old.get(key(r));return p?(deltas.some(d=>key(d)===key(r))
        ?same({...p,hit_count:r.hit_count,updated_at:r.updated_at},r):same(p,r))
        :deltas.some(d=>key(d)===key(r))&&r.hit_count===1})
  }
  const exactReplay=(a,b)=>{
    const {guest_grant_token:originalGrant,...original}=a
    const {guest_grant_token:replayGrant,...replay}=b
    return a.ok===true&&a.error_code===null&&/^[a-f0-9]{64}$/.test(originalGrant)
      &&replayGrant===null&&Object.keys(original).length===Object.keys(replay).length
      &&Object.keys(original).every(key=>Object.hasOwn(replay,key)&&same(original[key],replay[key]))
  }
  const reports=[]
  const omit=(row,keys)=>Object.fromEntries(Object.entries(row).filter(([key])=>!keys.includes(key)))
  const resultFrom=(output,key)=>{
    const result=output.split('\n').map(line=>line.trim()).filter(line=>line.startsWith('{'))
      .map(line=>JSON.parse(line)).find(row=>Object.hasOwn(row,key))
    if(!result)throw Error(`WITNESS_RESULT_MISSING: ${key}`)
    return result
  }
  const save=()=>fs.writeFileSync(path.join(evidence,'release-races.json'),JSON.stringify({idea:'IDEA-20261002-10',
    synthetic:true,providerWrites:false,releaseWitnessSha256,releaseWitnessFailure,
    scope:releaseCurrentChain?'Current prepared release/compatibility/receiving/calendar/clearance body chain; all-table protected/replay proofs and nonempty registered expiry isolation/refusal; excludes complete installer/provider/BFF release/real acceptance':'Historical pre-release-eligibility chain: owner-only cancellation/expiry with staff/AAL2 claims versus signed two-SKU purchase; exact rapid no-pruning guest replay controls/durable result; excludes later receiving/calendar/clearance/full-chain, provider/BFF release reachability, shipping or full-writer acceptance',reports},null,2)+'\n')
  const staff=`select set_config('request.jwt.claim.sub','${actor}',false);
    select set_config('request.jwt.claims','{"aal":"aal2"}',false);`
  sync(`create function k2_stock_fixture.fail_second_release_audit() returns trigger language plpgsql as $$ begin
    if new.event_type='reservation_released' and new.sku=current_setting('k2.fixture.fail_release_sku',true) then
      raise exception 'K2_FIXTURE_SECOND_SKU_RELEASE_FAILURE'; end if;return new;end $$;
    create trigger local_fail_second_release_audit before insert on public.inventory_events
      for each row execute function k2_stock_fixture.fail_second_release_audit();`)
  for(const phase of ['cancel','expiry'])for(const first of ['release','purchase']) {
    const report={phase,first,error:null,outcomes:[],cleanupErrors:[]};reports.push(report)
    const suffix=randomUUID().slice(0,8)
    const releaseName=`k2_current_release_${phase}_${first}_${suffix}`
    const purchaseName=`k2_current_purchase_${phase}_${first}_${suffix}`
    let gate,released=false,writer,buyer
    try {
      const fixtures=['A','B'].map((s,i)=>fixture(`release-${phase}-${first}-${suffix}-${s}`,i?4:2))
      const skuList=fixtures.map(f=>literal(f.sku)).join(',')
      report.fixtures=fixtures
      sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA' where sku in (${skuList});`)
      // Isolate only earlier synthetic due orders before the scoped sweep.
      if(phase==='expiry') {
        let withheld
        if(releaseCurrentChain) {
          report.isolationSeeds=[]
          for(const label of ['registered','withheld']) {
            const f=fixture('expiry-isolation-'+first+'-'+suffix+'-'+label,3)
            sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA' where sku=${literal(f.sku)};`)
            const payload=guestPayload(f,{shippingAmount:95,shippingQuoteStatus:'customer_confirmed'})
            const result=JSON.parse(value(`set role anon;select row_to_json(r)::text from ${guestCall(payload,'192.0.2.'+(label==='registered'?248:249))} r;`))
            const orderId=value(`select id from public.order_requests where idempotency_key=${literal(payload.idempotencyKey)};`)
            check('current expiry isolation seed is a genuine synthetic signed hold',result.ok===true&&invariant(f)==='3/1|3/1|2|1')
            sync(`update public.inventory_reservations set expires_at=clock_timestamp()-interval '1 minute' where order_request_id=${literal(orderId)} and status='active';`)
            report.isolationSeeds.push({fixture:f,payload,result,orderId})
            if(label==='withheld')withheld=f
          }
          fixtureSkus.delete(withheld.sku)
        }
        const isolate=()=>{
        const due=`select o.id from public.order_requests o where o.status='submitted'
          and o.payment_status in ('unpaid','not_requested','awaiting_instructions','failed')
          and exists(select 1 from public.inventory_reservations r where r.order_request_id=o.id and r.status='active'
            and r.expires_at<=clock_timestamp()) and not exists(select 1 from public.inventory_reservations r
            where r.order_request_id=o.id and r.status='active' and (r.packed_quantity>0 or r.expires_at is null))`
        report.isolatedPriorDue=JSON.parse(value(`select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb)::text
          from public.inventory_reservations r where r.status='active' and r.order_request_id in (${due});`))
        if(!report.isolatedPriorDue.every(r=>fixtureSkus.has(r.sku)))throw Error('EXPIRY_ISOLATION_UNREGISTERED_SKU')
        check('expiry setup excludes only previously generated synthetic due holds',
          report.isolatedPriorDue.every(r=>fixtureSkus.has(r.sku)))
        report.registeredFixtureSkus=[...fixtureSkus].sort()
        sync(`update public.inventory_reservations set expires_at=clock_timestamp()+interval '1 day'
          where id in (${report.isolatedPriorDue.length?report.isolatedPriorDue.map(r=>literal(r.id)).join(','):'null'});`)
        report.isolatedPriorDueAfter=JSON.parse(value(`select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb)::text
          from public.inventory_reservations r where id in (
            ${report.isolatedPriorDue.length?report.isolatedPriorDue.map(r=>literal(r.id)).join(','):'null'});`))
        }
        if(releaseCurrentChain) {
          report.isolationRefusal={beforeHashes:whole(),registeredBefore:[...fixtureSkus].sort()}
          try{isolate()}catch(error){report.isolationRefusal.error=error.message}
          report.isolationRefusal.afterHashes=whole()
          check('current expiry isolation refuses unregistered SKU before every write',report.isolationRefusal.error==='EXPIRY_ISOLATION_UNREGISTERED_SKU'&&same(report.isolationRefusal.beforeHashes,report.isolationRefusal.afterHashes))
          fixtureSkus.add(withheld.sku)
          report.isolationRegistryRecovery=[...fixtureSkus].sort()
        }
        report.isolationBeforeHashes=whole();report.isolationObservedBefore=value('select clock_timestamp()::text;')
        isolate()
        report.isolationObservedAfter=value('select clock_timestamp()::text;');report.isolationAfterHashes=whole()
        if(releaseCurrentChain) {
          const withoutExpiry=r=>omit(r,['expires_at'])
          check('current expiry isolation changes only registered expiry timestamps with all other tables exact',report.isolatedPriorDue.length===2&&report.isolatedPriorDueAfter.length===2
            &&report.isolatedPriorDue.every(r=>report.isolatedPriorDueAfter.some(n=>n.id===r.id&&same(withoutExpiry(n),withoutExpiry(r))
              &&Date.parse(n.expires_at)>=Date.parse(report.isolationObservedBefore)+86400000&&Date.parse(n.expires_at)<=Date.parse(report.isolationObservedAfter)+86400000))
            &&Object.keys(report.isolationBeforeHashes).every(t=>t==='public.inventory_reservations'||report.isolationBeforeHashes[t]===report.isolationAfterHashes[t]))
        }

      }
      report.couponId=randomUUID()
      sync(`insert into public.coupons(id,code,discount_type,discount_value,is_active,max_redemptions)
        values('${report.couponId}','LOCAL-RELEASE-${suffix}','fixed',10,true,1);`)
      const items=fixtures.map(f=>({sku:f.sku,quantity:1}))
      const oldPayload=guestPayload(fixtures[0],{items:[{...items[1],quantity:2},items[0]],couponCode:`LOCAL-RELEASE-${suffix}`,
        shippingAmount:95,shippingQuoteStatus:'customer_confirmed'})
      check(`${phase}/${first} signed old two-SKU purchase succeeds`,value(`set role anon;
        select ok from ${guestCall(oldPayload,'192.0.2.246')};`)==='t')
      const oldId=value(`select id from public.order_requests where idempotency_key=${literal(oldPayload.idempotencyKey)};`)
      report.oldId=oldId
      if(phase==='cancel') {
        const a=signedAdminCommandArguments('confirm_order',actor,randomUUID(),{orderRequestId:oldId,reason:'Synthetic cancellation commitment'})
        value(`${staff} set role authenticated;select public.execute_admin_fulfillment_command_v1(${[
          'p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'].map(k=>literal(a[k])).join(',')});`)
      }else sync(`update public.inventory_reservations set expires_at=clock_timestamp()-interval '1 minute' where order_request_id='${oldId}';`)
      const payload=guestPayload(fixtures[0],{items:releaseCurrentChain?[...items].reverse():items,shippingAmount:95,shippingQuoteStatus:'customer_confirmed'})
      report.purchasePayload=payload
      const purchaseIp=`192.0.2.${(phase==='cancel'?220:222)+(first==='purchase'?1:0)}`
      report.purchaseIp=purchaseIp
      const orders=`select id from public.order_requests where idempotency_key in (
        ${literal(oldPayload.idempotencyKey)},${literal(payload.idempotencyKey)})`
      const filters={products:`sku in (${skuList})`,product_batches:`sku in (${skuList})`,
        inventory_balances:`sku in (${skuList})`,inventory_reservations:`sku in (${skuList})`,
        inventory_events:`sku in (${skuList})`,batch_change_events:`sku in (${skuList})`,
        channel_listings:`sku in (${skuList})`,order_requests:`id in (${orders})`,
        order_request_items:`order_request_id in (${orders})`,orders:`order_request_id in (${orders})`,
        order_request_events:`order_request_id in (${orders})`,packing_scan_events:`order_request_id in (${orders})`,
        coupons:`id='${report.couponId}'`,coupon_redemptions:`order_request_id in (${orders})`}
      const snapshot=()=>JSON.parse(value(`select jsonb_build_object('state',jsonb_build_object(${Object.entries(filters).map(([table,filter])=>
        `${literal(table)},(select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) from public.${table} t where ${filter})`).join(',')}),
        'unrelated',jsonb_build_object(${Object.entries(filters).map(([table,filter])=>`${literal(table)},
        (select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from public.${table} t where (${filter}) is not true)`).join(',')}))::text;`))
      const probe=(table,f)=>{
        if(value(`select count(*) from public.${table} where sku=${literal(f.sku)}
          ${table==='inventory_balances'?"and location_code='MANILA_MAIN'":''};`)!=='1')throw Error(`LOCK_PROBE_ROW_MISSING: ${table}/${f.sku}`)
        try {sync(`begin;select 1 from public.${table} where sku=${literal(f.sku)}
          ${table==='inventory_balances'?"and location_code='MANILA_MAIN'":''} for update nowait;rollback;`);return {available:true}}
        catch(error){if(!/could not obtain lock on row/.test(error.message))throw error;return {available:false,error:error.message}}
      }
      const probes=()=>fixtures.map(f=>({sku:f.sku,balance:probe('inventory_balances',f),
        product:probe('products',f),lot:probe('product_batches',f)}))
      report.before=snapshot()
      const prior=report.before.state
      check(`${phase}/${first} old purchase has exact quantities and expected commitment/legacy stage`,
        prior.inventory_reservations.length===2&&fixtures.every((f,i)=>prior.inventory_reservations
          .filter(r=>r.sku===f.sku&&r.order_request_id===oldId&&r.quantity===(i?2:1)).length===1)
        &&prior.inventory_reservations.every(r=>phase==='cancel'?r.committed_at&&r.committed_by===actor
          &&r.commit_cause==='confirmation'&&r.commit_reason:!r.committed_at&&!r.committed_by&&!r.commit_cause)
        &&prior.orders.length===(phase==='cancel'?2:0)
        &&prior.order_requests[0].status===(phase==='cancel'?'confirmed':'submitted'))
      const releaseSql=`${staff} ${phase==='cancel'?`select to_jsonb(public.cancel_order_request('${oldId}','Synthetic release race'));`
        :'select to_jsonb(r) from public.release_expired_reservations_v1(500) r;'}`
      report.purchaseCommand=guest(payload,purchaseIp)
      const purchaseSql=`select set_config('request.jwt.claim.sub','',false);
        select set_config('request.jwt.claims','{}',false);
        select 'BUYER_UID|'||coalesce(auth.uid()::text,'NULL');set role anon;
        select 'BUYER_SCOPE|'||current_user||'|'||current_setting('request.jwt.claim.sub')||'|'||current_setting('request.jwt.claims');
        select to_jsonb(r) from ${report.purchaseCommand.call} r;`
      gate=await controller();report.gate=gate.name
      if(first==='release') {
        writer=session(releaseName,`begin;set local k2.fixture.balance_barrier='on';${releaseSql}commit;`)
        report.launched=[releaseName]
        await waitFor(blockedBy(releaseName,gate.name),'current release paused while owning balance')
        if(releaseWitnessFailure)throw Error('INJECTED_RELEASE_WITNESS_FAILURE')
        report.beforeSecond=probes()
        buyer=session(purchaseName,`begin;${purchaseSql}commit;`);report.launched.push(purchaseName)
        await waitFor(blockedBy(purchaseName,releaseName),'signed purchase waits behind release')
      }else {
        buyer=session(purchaseName,`begin;${purchaseSql}select pg_advisory_xact_lock(61001,5);commit;`)
        report.launched=[purchaseName]
        await waitFor(blockedBy(purchaseName,gate.name),'signed purchase owns both SKU allocations')
        report.beforeSecond=probes()
        writer=session(releaseName,`begin;${releaseSql}commit;`);report.launched.push(releaseName)
        await waitFor(blockedBy(releaseName,purchaseName),'release waits behind signed purchase')
      }
      report.duringWait=probes()
      report.waits=JSON.parse(value(`select jsonb_agg(jsonb_build_object('name',application_name,'pid',pid,
        'waitType',wait_event_type,'wait',wait_event,'blockers',pg_blocking_pids(pid)) order by application_name)::text
        from pg_stat_activity where datname=current_database() and application_name in (
        ${[releaseName,purchaseName,gate.name].map(literal).join(',')});`))
      await gate.release();released=true
      report.outcomes=await Promise.all([writer,buyer])
      report.after=snapshot();report.counters=fixtures.map(invariant)
      report.buyerResult=resultFrom(report.outcomes[1].stdout,'ok')
      report.buyerIdentity=report.outcomes[1].stdout.split('\n').map(line=>line.trim()).find(line=>line.startsWith('BUYER_SCOPE|'))
      report.buyerUid=report.outcomes[1].stdout.split('\n').map(line=>line.trim()).find(line=>line.startsWith('BUYER_UID|'))
      report.releaseResult=resultFrom(report.outcomes[0].stdout,phase==='cancel'?'id':'released_count')
      check(`${phase}/${first} two current operations serialize without deadlock`,
        report.outcomes.every(r=>r.status===0)&&report.buyerResult.ok===true&&report.buyerResult.error_code===null
          &&report.buyerIdentity==='BUYER_SCOPE|anon||{}'&&report.buyerUid==='BUYER_UID|NULL'
          &&!report.outcomes.some(r=>/deadlock detected/.test(r.stderr)),
        report.outcomes.map(r=>r.stderr).join(''))
      check(`${phase}/${first} actual balance ownership blocks the second writer without changing lock states`,
        !report.beforeSecond[0].balance.available&&report.beforeSecond.every((p,i)=>['balance','product','lot']
          .every(k=>p[k].available===report.duringWait[i][k].available))
        &&report.beforeSecond.every((p,i)=>JSON.stringify([p.balance.available,p.product.available,p.lot.available])
          ===JSON.stringify(first==='purchase'?[false,false,false]:phase==='expiry'?[false,true,false]:i?[true,true,true]:[false,true,true])))
      const s=report.after.state
      const oldBefore=report.before.state.inventory_reservations.filter(r=>r.order_request_id===oldId)
      const oldAfter=s.inventory_reservations.filter(r=>r.order_request_id===oldId)
      const newId=s.order_requests.find(o=>o.idempotency_key===payload.idempotencyKey).id;report.newId=newId
      check(`${phase}/${first} both physical counts retain exactly one attributed new hold`,
        JSON.stringify(report.counters)===JSON.stringify(['2/1|2/1|1|1','4/1|4/1|3|1'])
        &&s.inventory_reservations.filter(r=>r.order_request_id===newId&&r.status==='active'&&r.quantity===1).length===2
        &&oldAfter.length===2&&oldAfter.every(r=>r.status==='released'&&r.release_cause===(phase==='cancel'?'cancelled':'expired')
          &&r.released_at&&r.committed_at===oldBefore.find(b=>b.id===r.id).committed_at
          &&r.committed_by===oldBefore.find(b=>b.id===r.id).committed_by&&r.commit_cause===oldBefore.find(b=>b.id===r.id).commit_cause))
      check(`${phase}/${first} release changes only allowed old reservation and legacy fields`,
        oldAfter.every(r=>JSON.stringify(omit(r,['status','released_at','release_cause','updated_at']))
          ===JSON.stringify(omit(oldBefore.find(b=>b.id===r.id),['status','released_at','release_cause','updated_at'])))
        &&s.orders.every(o=>JSON.stringify(omit(o,['order_status']))
          ===JSON.stringify(omit(prior.orders.find(b=>b.id===o.id),['order_status'])))
        &&JSON.stringify(s.order_request_items.filter(i=>i.order_request_id===oldId))===JSON.stringify(prior.order_request_items)
        &&s.coupon_redemptions.every(r=>JSON.stringify(omit(r,['status','updated_at']))
          ===JSON.stringify(omit(prior.coupon_redemptions.find(b=>b.id===r.id),['status','updated_at']))))
      const oldShell=s.order_requests.find(o=>o.id===oldId)
      check(`${phase}/${first} old order state changes only through the intended release contract`,phase==='expiry'
        ?JSON.stringify(oldShell)===JSON.stringify(prior.order_requests[0])
        :oldShell.status==='cancelled'&&oldShell.delivery_status==='cancelled'
          &&JSON.stringify(omit(oldShell,['status','delivery_status','exception_status','exception_note','cancelled_at','updated_at']))
          ===JSON.stringify(omit(prior.order_requests[0],['status','delivery_status','exception_status','exception_note','cancelled_at','updated_at'])))
      check(`${phase}/${first} charges, legacy items, coupon and release audit survive exactly once`,
        s.order_requests.find(o=>o.id===oldId).total_amount===385&&s.order_requests.find(o=>o.id===newId).total_amount===295
        &&s.order_requests.every(o=>o.shipping_amount===95)&&s.coupons[0].redemption_count===0
        &&s.coupon_redemptions.length===(phase==='cancel'?1:0)
        &&(phase==='expiry'||s.coupon_redemptions[0].status==='released')
        &&s.orders.length===(phase==='cancel'?2:0)&&s.orders.every(o=>o.order_status==='Cancelled')
        &&oldBefore.every(r=>s.inventory_events.filter(e=>e.reference_id===oldId&&e.event_type==='reservation_released'
          &&e.sku===r.sku&&e.quantity===r.quantity&&e.actor_id===actor).length===1)
        &&(phase==='cancel'||JSON.stringify(report.releaseResult.released_ids.sort())===JSON.stringify(oldBefore.map(r=>r.id).sort()))
        &&JSON.stringify(report.after.unrelated)===JSON.stringify(report.before.unrelated))
      for(const [name,sql,message] of [
        ['invalid argument',phase==='cancel'?`select public.cancel_order_request('${newId}','');`:'select * from public.release_expired_reservations_v1(0);',
          phase==='cancel'?'Cancellation reason is required':'RELEASE_LIMIT_INVALID'],
        ['anonymous caller',`select set_config('request.jwt.claim.sub','',false);
          select set_config('request.jwt.claims','{}',false);set role anon;
          ${phase==='cancel'?`select public.cancel_order_request('${newId}','Synthetic denied');`:'select * from public.release_expired_reservations_v1(500);'}`,
          'permission denied|Staff access required|STAFF_REQUIRED']
      ]) {
        const before=whole();let refused=false
        try{sync(`${staff} ${sql}`)}catch(error){refused=new RegExp(message).test(error.message)}
        const exactRollback=JSON.stringify(whole())===JSON.stringify(before)
        ;(report.refusals??=[]).push({name,refused,exactRollback})
        check(`${phase}/${first} ${name} refuses with exact business, audit and signed-control rollback`,refused&&exactRollback)
      }
      report.replay={beforeReleaseHashes:whole()}
      report.releaseReplayResult=JSON.parse(value(releaseSql))
      report.replay.afterReleaseHashes=whole()
      check(`${phase}/${first} release-only replay preserves all business and admin/guest controls`,
        same(report.replay.beforeReleaseHashes,report.replay.afterReleaseHashes)
        &&(phase==='cancel'?report.releaseReplayResult.status==='cancelled':report.releaseReplayResult.released_count===0))
      report.replay.beforeGuestHashes=whole();report.replay.beforeGuestControls=controls()
      report.replay.command=guest(payload,purchaseIp)
      report.buyerReplayResult=JSON.parse(value(report.replay.command.sql))
      report.replay.afterGuestControls=controls();report.replay.afterGuestHashes=whole()
      report.replayBusinessUnchanged=same(business(report.replay.beforeGuestHashes),business(report.replay.afterGuestHashes))
      check(`${phase}/${first} guest replay preserves full durable public result and every business/Admin row`,
        report.replayBusinessUnchanged&&exactReplay(report.buyerResult,report.buyerReplayResult))
      check(`${phase}/${first} guest replay consumes exactly own fresh signed nonce/IP/contact hits`,
        exactGuest(report.replay.beforeGuestControls,report.replay.afterGuestControls,report.replay.command))
      save()
      // A second-SKU audit failure must unwind the first SKU's actual mutation.
      if(phase==='expiry')sync(`update public.inventory_reservations set expires_at=clock_timestamp()-interval '1 minute'
        where order_request_id='${newId}' and status='active';`)
      const recoverySql=`${staff} ${phase==='cancel'?`select to_jsonb(public.cancel_order_request('${newId}','Synthetic atomic recovery'));`
        :'select to_jsonb(r) from public.release_expired_reservations_v1(500) r;'}`
      report.atomicBefore=whole()
      try{sync(`begin;set local k2.fixture.fail_release_sku=${literal(fixtures[1].sku)};${recoverySql}commit;`)}
      catch(error){report.atomicRefused=/K2_FIXTURE_SECOND_SKU_RELEASE_FAILURE/.test(error.message)}
      report.atomicAfterFailure=whole()
      check(`${phase}/${first} second-SKU audit failure rolls back the complete release and controls`,
        report.atomicRefused&&JSON.stringify(report.atomicAfterFailure)===JSON.stringify(report.atomicBefore))
      report.recoveryResult=JSON.parse(value(recoverySql))
      report.recovered=snapshot();report.recoveredCounters=fixtures.map(invariant)
      check(`${phase}/${first} same-order release recovery frees both holds once without changing charges`,
        JSON.stringify(report.recoveredCounters)===JSON.stringify(['2/0|2/0|2|0','4/0|4/0|4|0'])
        &&report.recovered.state.inventory_reservations.filter(r=>r.order_request_id===newId&&r.status==='released').length===2
        &&report.recovered.state.inventory_events.filter(e=>e.reference_id===newId&&e.event_type==='reservation_released').length===2
        &&report.recovered.state.order_requests.find(o=>o.id===newId).total_amount===295)
      report.recoveryReplay={beforeHashes:whole()}
      report.recoveryReplay.result=JSON.parse(value(recoverySql));report.recoveryReplay.afterHashes=whole()
      report.recoveryReplayUnchanged=same(report.recoveryReplay.beforeHashes,report.recoveryReplay.afterHashes)
      check(`${phase}/${first} recovered release replay preserves exact rows and controls`,report.recoveryReplayUnchanged)
    }catch(error){report.error=error.message}
    finally {
      if(report.error&&report.launched?.length)try{sync(`select pg_cancel_backend(pid) from pg_stat_activity
        where datname=current_database() and application_name in (${report.launched.map(literal).join(',')});`)}catch(error){report.cleanupErrors.push(error.message)}
      if(gate&&!released)try{await gate.release();released=true}catch(error){report.cleanupErrors.push(error.message)}
      report.outcomes=await Promise.all([writer,buyer].filter(Boolean))
      for(const name of report.launched??[])completed.delete(name)
      try{report.sessionsRemaining=Number(value(`select count(*) from pg_stat_activity where datname=current_database()
        and application_name in (${[releaseName,purchaseName,...(gate?[gate.name]:[])].map(literal).join(',')});`))}catch(error){report.cleanupErrors.push(error.message)}
      save()
    }
    if(report.error)throw Error(report.error)
    check(`${phase}/${first} witness preserves both terminal outcomes and removes phase sessions`,
      report.outcomes.length===2&&report.sessionsRemaining===0&&report.cleanupErrors.length===0)
  }
  check('release schedules retain exact installed definitions and execution metadata',JSON.stringify(capture())===JSON.stringify(installed))
}
