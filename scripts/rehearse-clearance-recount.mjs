// IDEA10: actual signed commands across a real verifier minute boundary.
import fs from 'node:fs'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {signedAdminCommandArguments} from '../server/admin-bff/security.js'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
export const clearanceRecountWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export function clearanceNoticeLine(output,label) {
  const prefix='NOTICE:  '+label+':'
  const line=output.split(/\r?\n/).slice(0,-1).find(line=>line.startsWith(prefix))
  return line===undefined?undefined:JSON.parse(line.slice(prefix.length))
}
export async function rehearseClearanceRecount({sync,value,check,fixture,guestPayload,guestCall,actor,literal,source,withoutTransaction,session,controller,blockedBy,waitFor,completed,evidence,beforeClearanceLockFix,clearanceEdges}) {
  const write=(name,data)=>fs.writeFileSync(path.join(evidence,name),JSON.stringify(data,null,2)+'\n')
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
  const notice=async (running,label)=>{
    const end=Date.now()+2000
    while(Date.now()<end){const image=clearanceNoticeLine(running.peek().stderr,label)
      if(image!==undefined)return image
      await new Promise(resolve=>setTimeout(resolve,10))}
    throw Error('COMPLETE_NOTICE_NOT_OBSERVED:'+label)
  }
  fs.writeFileSync(path.join(evidence,'executed-clearance-recount-module.mjs'),bytes)
  const functions=()=>JSON.parse(value(`select jsonb_agg(jsonb_build_object('signature',oid::regprocedure::text,
    'definition',pg_get_functiondef(oid),'catalog',to_jsonb(p)-'prosrc') order by oid)::text
    from pg_proc p where pronamespace in ('public'::regnamespace,'k2_private'::regnamespace);`))
  const preInstallFunctions=functions();write('functions-pre-install.json',preInstallFunctions)
  const tableNames=JSON.parse(value(`select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)::text
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private') and c.relkind in ('r','p');`))
  const tableHashes=()=>Object.fromEntries(tableNames.map(t=>[t,value(`select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from ${t} t;`)]))
  const preInstallHashes=tableHashes();write('table-hashes-pre-install.json',preInstallHashes)
  const migration=source('supabase/migrations/20261003151500_signed_clearance_balance_lock_order.sql')
  fs.writeFileSync(path.join(evidence,'executed-clearance-migration.sql'),migration)
  if(!beforeClearanceLockFix) {
    sync(migration);sync(migration)
    const installed=functions(),hashes=tableHashes();write('functions-installed.json',installed);write('table-hashes-installed.json',hashes)
    const changed=installed.filter((f,i)=>!same(f,preInstallFunctions[i]))
    check('clearance lock installation/replay changes only the exact signed body, preserving complete catalogs and every public/private table',
      installed.length===preInstallFunctions.length&&changed.length===1&&changed[0].signature.startsWith('execute_admin_lot_command_v1(')
      &&same(changed[0].catalog,preInstallFunctions.find(f=>f.signature===changed[0].signature).catalog)
      &&same(preInstallHashes,hashes))
    const target='public.execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)'
    const helper='k2_private.lot_is_eligible_v1(public.product_batches)'
    const drifts=[`alter function ${target} security invoker;`,`alter function ${target} immutable;`,
      `alter function ${target} parallel safe;`,`alter function ${target} strict;`,`alter function ${target} cost 101;`,
      `alter function ${target} set search_path=public;`,`grant execute on function ${target} to anon;`,
      `grant execute on function ${target} to authenticated with grant option;`,`alter function ${target} owner to authenticated;`,
      `alter function ${helper} security definer;`,`alter function ${helper} volatile;`,`alter function ${helper} strict;`,
      `alter function ${helper} set search_path=public;`,`grant execute on function ${helper} to anon;`,
      `alter function ${helper} owner to authenticated;`]
    const installedTarget=installed.find(f=>f.signature.startsWith('execute_admin_lot_command_v1('))
    const body=installedTarget.definition.split('$function$')[1]
    drifts.push(installedTarget.definition.replace(body,()=>body+'\n-- unfamiliar body\n')+';')
    for(const [i,drift] of drifts.entries()) {
      let refused=false
      try{sync(`begin;${drift}${withoutTransaction(migration)}rollback;`)}catch(error){refused=/MAP-023 clearance: unfamiliar/.test(error.message)}
      check('clearance installer refuses exact drift '+(i+1)+' with complete function rollback',refused&&same(functions(),installed))
    }
    let rolledBack=false
    try{sync(`begin;${installedTarget.definition.replace(body,()=>preInstallFunctions.find(f=>f.signature===installedTarget.signature).definition.split('$function$')[1])};
      ${withoutTransaction(migration)}select 1/0;commit;`)}catch(error){rolledBack=/division by zero/.test(error.message)}
    check('clearance candidate and a later failed statement roll back the whole installation transaction',rolledBack&&same(functions(),installed)&&same(tableHashes(),hashes))
  }
  const beforeFunctions=functions();write('functions-before.json',beforeFunctions)
  const reports=[],extras=[],assertions=[]
  const assert=(name,passed)=>assertions.push({name,passed:!!passed})
  const save=()=>write('clearance-recount.json',{idea:'IDEA-20261002-10',providerWrites:false,synthetic:true,
    scope:clearanceEdges?'Two actual signed multi-lot/held-stock/other-location schedules and concurrent lot-SKU drift refusal/recovery; excludes full production acceptance':'Two single-SKU actual signed schedules, exact refusal/replay/history-fault recovery and retained-hold missing balance; excludes full production acceptance',reports,extras,assertions})
  const signed=(action,payload,key)=>{
    const args=signedAdminCommandArguments(action,actor,key,payload)
    return {args,sql:`select set_config('request.jwt.claim.sub',${literal(actor)},false);
      select set_config('request.jwt.claims','{"aal":"aal2"}',false);set time zone 'Asia/Manila';set role authenticated;
      select public.execute_admin_lot_command_v1(${['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'].map(k=>literal(args[k])).join(',')})::text;`}
  }
  const bucket=()=>value(`select date_trunc('minute',clock_timestamp())::text;`)
  const controls=()=>JSON.parse(value(`select jsonb_build_object('observedNow',clock_timestamp(),'nonces',(select coalesce(jsonb_agg(to_jsonb(n) order by actor_id,action,nonce),'[]') from k2_private.admin_request_nonces n),
    'rates',(select coalesce(jsonb_agg(to_jsonb(r) order by scope,subject,bucket_start),'[]') from k2_private.admin_request_rate_buckets r),
    'receipts',(select coalesce(jsonb_agg(to_jsonb(r) order by actor_id,action,idempotency_key),'[]') from k2_private.admin_command_receipts r))::text;`))
  const business=h=>Object.fromEntries(Object.entries(h).filter(([t])=>!['k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets'].includes(t)))
  const stockCommandTables=new Set(['public.products','public.product_batches','public.inventory_balances','public.batch_change_events',
    'k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets','k2_private.admin_command_receipts'])
  const protectedSame=(a,b)=>tableNames.every(t=>stockCommandTables.has(t)||a[t]===b[t])
  const otherStockRows=sku=>Object.fromEntries(['products','product_batches','inventory_balances','batch_change_events'].map(t=>[t,
    value(`select md5(coalesce(string_agg(to_jsonb(t)::text,'|' order by to_jsonb(t)::text),'')) from public.${t} t where sku is distinct from ${literal(sku)};`)]))
  const response=o=>JSON.parse(o.stdout.split(/\r?\n/).filter(x=>x.startsWith('{')&&x.includes('"sku"')).at(-1))
  const exactControls=(before,after,commands,buckets)=>{
    const nonceKey=n=>[n.actor_id,n.action,n.nonce].join('|'),rateKey=r=>[r.scope,r.subject,r.bucket_start].join('|')
    const receiptKey=r=>[r.actor_id,r.action,r.idempotency_key].join('|')
    const added=commands.map(c=>after.nonces.find(n=>n.nonce===c.args.p_nonce))
    if(added.some((n,i)=>!n||n.actor_id!==actor||n.action!==commands[i].args.p_action
      ||Object.keys(n).sort().join(',')!=='action,actor_id,expires_at,nonce,used_at'
      ||Date.parse(n.used_at)<Date.parse(before.observedNow)||Date.parse(n.used_at)>Date.parse(after.observedNow)
      ||Date.parse(n.expires_at)-Date.parse(n.used_at)!==600000))return false
    const lastNow=Math.max(...added.map(n=>Date.parse(n.used_at)))
    const expectedNonces=[...before.nonces.filter(n=>Date.parse(n.expires_at)>lastNow),...added]
    const sortNonces=rows=>[...rows].sort((a,b)=>nonceKey(a).localeCompare(nonceKey(b)))
    if(!same(sortNonces(expectedNonces),sortNonces(after.nonces)))return false
    const previousRates=new Map(before.rates.map(r=>[rateKey(r),r]))
    if(!buckets) {
      const changed=after.rates.filter(r=>r.hit_count!==(previousRates.get(rateKey(r))?.hit_count||0))
      if(commands.length!==1||changed.length!==2||new Set(changed.map(r=>r.bucket_start)).size!==1)return false
      buckets=[changed[0].bucket_start]
    }
    if(buckets.length!==commands.length||buckets.some(b=>Date.parse(b)<Math.floor(Date.parse(before.observedNow)/60000)*60000
      ||Date.parse(b)>Math.floor(Date.parse(after.observedNow)/60000)*60000))return false
    const lastBucket=Math.max(...buckets.map(Date.parse)),expectedRates=new Map(before.rates.filter(r=>Date.parse(r.bucket_start)>=lastBucket-86400000).map(r=>[rateKey(r),{...r}]))
    for(const bucket of buckets)for(const [scope,subject] of [['actor',actor],['global','all_admin_requests']]) {
      const key=[scope,subject,bucket].join('|'),old=expectedRates.get(key)
      expectedRates.set(key,old?{...old,hit_count:old.hit_count+1}:{scope,subject,hit_count:1,bucket_start:bucket})
    }
    const sortRates=rows=>[...rows].sort((a,b)=>rateKey(a).localeCompare(rateKey(b)))
    if(!same(sortRates(expectedRates.values()),sortRates(after.rates)))return false
    const oldReceipts=new Map(before.receipts.map(r=>[receiptKey(r),r]))
    if(before.receipts.some(r=>!after.receipts.some(a=>same(r,a))))return false
    const newReceipts=after.receipts.filter(r=>!oldReceipts.has(receiptKey(r)))
    const fresh=commands.filter(c=>!oldReceipts.has([actor,c.args.p_action,c.args.p_idempotency_key].join('|')))
    return newReceipts.length===fresh.length&&commands.every(c=>{
      const r=after.receipts.find(r=>r.actor_id===actor&&r.action===c.args.p_action&&r.idempotency_key===c.args.p_idempotency_key)
      return r&&r.payload_hash===createHash('sha256').update(c.args.p_payload_text).digest('hex')&&same(r.result,c.result)
        &&Date.parse(r.completed_at)>=Date.parse(r.created_at)&&(oldReceipts.has(receiptKey(r))
          ||Date.parse(r.created_at)>=Date.parse(before.observedNow)&&Date.parse(r.completed_at)<=Date.parse(after.observedNow))
    })
  }
  const commandEffect=(action,payload,key)=>{
    const command=signed(action,payload,key),before=controls(),otherBefore=otherStockRows(payload.sku||value(`select sku from public.product_batches where id=${literal(payload.batchId)};`))
    const hashesBefore=tableHashes()
    const result=JSON.parse(value(command.sql)),after=controls(),otherAfter=otherStockRows(payload.sku||result.sku)
    const hashesAfter=tableHashes()
    return {args:command.args,result,before,after,otherBefore,otherAfter,hashesBefore,hashesAfter,protectedUnchanged:protectedSame(hashesBefore,hashesAfter)}
  }
  if(clearanceEdges) {
    const snapshot=sku=>JSON.parse(value(`select jsonb_build_object(
      'lots',(select jsonb_agg(to_jsonb(b) order by id) from public.product_batches b where sku=${literal(sku)}),
      'balances',(select jsonb_agg(to_jsonb(b) order by location_code) from public.inventory_balances b where sku=${literal(sku)}),
      'product',(select to_jsonb(p) from public.products p where sku=${literal(sku)}),
      'holds',(select coalesce(jsonb_agg(to_jsonb(r) order by id),'[]') from public.inventory_reservations r where sku=${literal(sku)}),
      'events',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') from public.batch_change_events e where sku=${literal(sku)}),
      'eligible',(select coalesce(sum(greatest(quantity-reserved_quantity,0)),0) from public.product_batches b where sku=${literal(sku)} and k2_private.lot_is_eligible_v1(b)))::text;`))
    const main=s=>s.balances.find(b=>b.location_code==='MANILA_MAIN')
    const other=s=>s.balances.filter(b=>b.location_code!=='MANILA_MAIN')
    const stableFields=(a,b,allowed)=>Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>allowed.includes(k)||same(a[k],b[k]))
    const lotPayload=l=>({id:l.id,boxCode:l.box_code,batchCode:l.batch_code,quantity:l.quantity,
      expiryDate:l.expiry_date,landedDate:l.landed_date||'',hub:l.hub,custodian:l.custodian,channel:l.channel||'',pinned:l.is_pinned,status:l.inventory_status})
    const faultSql=`create function k2_stock_fixture.clearance_edge_fault() returns trigger language plpgsql as $$
      begin if current_setting('k2.fixture.clearance_edge_fault',true)='on' then raise exception 'LOCAL_CLEARANCE_EDGE_FAULT';end if;return new;end;$$;
      create trigger k2_clearance_edge_fault after insert on public.batch_change_events for each row execute function k2_stock_fixture.clearance_edge_fault();`
    sync(`create function k2_stock_fixture.clearance_edge_verifier() returns trigger language plpgsql as $$
      begin raise notice 'K2_EDGE_VERIFIER:%',jsonb_build_object('nonce',to_jsonb(new),'rates',(select jsonb_agg(to_jsonb(r)) from k2_private.admin_request_rate_buckets r));return new;end;$$;
      create trigger k2_clearance_edge_verifier after insert on k2_private.admin_request_nonces for each row execute function k2_stock_fixture.clearance_edge_verifier();
      create function k2_stock_fixture.clearance_edge_pause() returns trigger language plpgsql as $$
      begin if current_setting('k2.fixture.clearance_edge_pause',true)='on' then
        raise notice 'K2_EDGE_OWNER_CONTROLS:%',jsonb_build_object('nonces',(select jsonb_agg(to_jsonb(n)) from k2_private.admin_request_nonces n));
        perform pg_advisory_xact_lock(61001,5);end if;return null;end;$$;
      create trigger k2_clearance_edge_pause before insert on public.batch_change_events for each statement execute function k2_stock_fixture.clearance_edge_pause();${faultSql}`)
    try {
      for(const order of ['clearance-first','recount-first']) {
        const f=fixture('clearance-edge-'+randomUUID().slice(0,8),4),sibling=randomUUID(),bad=randomUUID()
        const r={order,fixture:f,sibling,bad,error:null,cleanupErrors:[]};reports.push(r)
        let gate,released=false,owner,contender
        const ownerName='k2_ce_owner_'+randomUUID(),contenderName='k2_ce_peer_'+randomUUID()
        try {
          sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA' where id='${f.lot}';`)
          r.purchasePayload=guestPayload(f,{items:[{sku:f.sku,quantity:2}]})
          r.purchase=JSON.parse(value(`set role anon;select row_to_json(r)::text from ${guestCall(r.purchasePayload,'203.0.113.91')} r;`))
          sync(`begin;update public.product_batches set expiry_date=current_date+60,best_before_date=current_date+60,inventory_status='quarantine',quantity_available=0 where id='${f.lot}';
            insert into public.product_batches(id,sku,box_code,batch_code,quantity,quantity_available,reserved_quantity,inventory_status,expiry_date,best_before_date,hub,custodian)
            values('${sibling}',${literal(f.sku)},'EDGE-SIBLING','EDGE-SIBLING',5,5,0,'available',current_date+180,current_date+180,'HUB-MNL-CENTRAL','CUST-STAFF-ELENA'),
            ('${bad}',${literal(f.sku)},'EDGE-UNSAFE','EDGE-UNSAFE',3,0,0,'quarantine',current_date+30,current_date+30,'HUB-MNL-CENTRAL','CUST-STAFF-ELENA');
            update public.inventory_balances set on_hand=12,reserved=2,in_transit=3 where sku=${literal(f.sku)} and location_code='MANILA_MAIN';
            insert into public.inventory_balances(sku,location_code,on_hand,reserved,in_transit) values(${literal(f.sku)},'EDGE_OTHER',7,1,2);commit;`)
          r.before=snapshot(f.sku);r.beforeHashes=tableHashes();r.beforeControls=controls();r.otherBefore=otherStockRows(f.sku)
          r.queryPlans={balance:JSON.parse(sync(`explain (format json) select 1 from public.inventory_balances where sku=${literal(f.sku)} and location_code='MANILA_MAIN' for update;`).trim()),
            lot:JSON.parse(sync(`explain (format json) select * from public.product_batches where id='${f.lot}' and sku=${literal(f.sku)} for update;`).trim()),
            eligibility:JSON.parse(sync(`explain (format json) select coalesce(sum(greatest(quantity-reserved_quantity,0)),0) from public.product_batches b where sku=${literal(f.sku)} and k2_private.lot_is_eligible_v1(b);`).trim())}
          assert(order+': multiple saved lots and genuine held stock exist',r.purchase.ok&&r.before.lots.length===3&&main(r.before).on_hand===12&&main(r.before).reserved===2
            &&r.before.holds.length===1&&r.before.holds[0].quantity===2&&r.before.lots.find(l=>l.id===f.lot).reserved_quantity===2)
          r.clearancePayload={batchId:f.lot,approved:true,reason:'Synthetic multi-lot signed clearance overlap'}
          r.recountPayload={sku:f.sku,reason:'Synthetic complete multi-lot count',lots:r.before.lots.map(l=>({...lotPayload(l),status:l.id===f.lot?'available':l.inventory_status})).reverse()}
          const first=signed(order==='clearance-first'?'lot_clearance':'lots_reconcile',order==='clearance-first'?r.clearancePayload:r.recountPayload,randomUUID())
          const secondPayload=order==='clearance-first'?r.recountPayload:r.clearancePayload
          gate=await controller();r.gate=gate.name
          owner=session(ownerName,`set statement_timeout='90s';begin;set local k2.fixture.clearance_edge_pause='on';${first.sql}commit;`)
          await waitFor(blockedBy(ownerName,gate.name),'multi-lot owner at history boundary')
          r.ownerControls=await notice(owner,'K2_EDGE_OWNER_CONTROLS');r.ownerVerifier=await notice(owner,'K2_EDGE_VERIFIER')
          const rateKey=x=>[x.scope,x.subject,x.bucket_start].join('|'),priorRates=new Map(r.beforeControls.rates.map(x=>[rateKey(x),x]))
          const deltas=image=>image.rates.filter(x=>x.hit_count!==(priorRates.get(rateKey(x))?.hit_count||0))
          r.ownerDeltas=deltas(r.ownerVerifier)
          if(r.ownerVerifier.nonce.nonce!==first.args.p_nonce||r.ownerDeltas.length!==2||new Set(r.ownerDeltas.map(x=>x.bucket_start)).size!==1)throw Error('EDGE_OWNER_SIGNED_RATE_BUCKET_AMBIGUOUS')
          r.ownerMinute=Math.floor(Date.parse(r.ownerDeltas[0].bucket_start)/60000);const end=Date.now()+65000
          const probe=(table,predicate)=>{try{sync(`begin;select 1 from public.${table} where ${predicate} for update nowait;rollback;`);return {available:true}}catch(error){if(!/could not obtain lock on row/.test(error.message))throw error;return {available:false,error:error.message}}}
          r.ownerTouchedLot=order==='clearance-first'?f.lot:r.recountPayload.lots[0].id
          r.ownerProbes={balance:probe('inventory_balances',`sku=${literal(f.sku)} and location_code='MANILA_MAIN'`),
            product:probe('products',`sku=${literal(f.sku)}`),target:probe('product_batches',`id='${f.lot}'`),
            touchedLot:probe('product_batches',`id=${literal(r.ownerTouchedLot)}`),otherLocation:probe('inventory_balances',`sku=${literal(f.sku)} and location_code='EDGE_OTHER'`)}
          while(Math.floor(Date.parse(bucket())/60000)===r.ownerMinute){if(Date.now()>end)throw Error('EDGE_MINUTE_TIMEOUT');await new Promise(resolve=>setTimeout(resolve,500))}
          const second=signed(order==='clearance-first'?'lots_reconcile':'lot_clearance',secondPayload,randomUUID())
          contender=session(contenderName,`begin;${second.sql}commit;`)
          await waitFor(blockedBy(contenderName,ownerName),'multi-lot contender at stock boundary')
          r.contenderVerifier=await notice(contender,'K2_EDGE_VERIFIER');r.contenderDeltas=deltas(r.contenderVerifier)
          if(r.contenderVerifier.nonce.nonce!==second.args.p_nonce||r.contenderDeltas.length!==2||new Set(r.contenderDeltas.map(x=>x.bucket_start)).size!==1)throw Error('EDGE_CONTENDER_SIGNED_RATE_BUCKET_AMBIGUOUS')
          r.waits=JSON.parse(value(`select jsonb_agg(jsonb_build_object('name',application_name,'pid',pid,'xid',backend_xid::text,'blockers',pg_blocking_pids(pid),'wait',wait_event,'waitType',wait_event_type) order by application_name)::text from pg_stat_activity where application_name in (${[ownerName,contenderName,gate.name].map(literal).join(',')});`))
          r.locks=JSON.parse(value(`select jsonb_agg(jsonb_build_object('name',a.application_name,'lock',to_jsonb(l),'relationName',l.relation::regclass::text) order by a.application_name,l.locktype,l.relation,l.mode)::text from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name in (${[ownerName,contenderName,gate.name].map(literal).join(',')});`))
          r.balanceVersion=JSON.parse(value(`select jsonb_build_object('xmin',xmin::text,'xmax',xmax::text)::text from public.inventory_balances where sku=${literal(f.sku)} and location_code='MANILA_MAIN';`))
          await gate.release();released=true;r.outcomes=await Promise.all([owner,contender]);r.after=snapshot(f.sku);r.afterHashes=tableHashes();r.afterControls=controls();r.otherAfter=otherStockRows(f.sku)
          r.commands=[first,second].map((c,i)=>({args:c.args,result:r.outcomes[i].status===0?response(r.outcomes[i]):null}))
          const buckets=[r.ownerDeltas[0].bucket_start,r.contenderDeltas[0].bucket_start]
          assert(order+': both multi-lot signed commands commit across actual distinct verifier minutes',r.outcomes.every(o=>o.status===0&&!/deadlock detected/.test(o.stderr))&&buckets[0]!==buckets[1]
            &&[...r.ownerDeltas,...r.contenderDeltas].every(x=>x.hit_count-(priorRates.get(rateKey(x))?.hit_count||0)===1))
          const ownXid=r.waits.find(x=>x.name===ownerName)?.xid
          const peerLocks=r.locks.filter(x=>x.name===contenderName)
          assert(order+': exact canonical balance wait binds owner transaction',r.waits.length===3&&r.waits.find(x=>x.name===ownerName).blockers.includes(r.waits.find(x=>x.name===gate.name).pid)
            &&!r.ownerProbes.balance.available&&!r.ownerProbes.product.available&&!r.ownerProbes.touchedLot.available&&r.ownerProbes.otherLocation.available
            &&r.waits.find(x=>x.name===contenderName).blockers.includes(r.waits.find(x=>x.name===ownerName).pid)
            &&(peerLocks.some(x=>x.lock.locktype==='tuple'&&x.relationName==='inventory_balances')||r.balanceVersion.xmax===ownXid&&peerLocks.some(x=>x.lock.locktype==='transactionid'&&!x.lock.granted&&x.lock.transactionid===ownXid)
              &&peerLocks.some(x=>x.relationName==='inventory_balances'&&x.lock.mode==='RowExclusiveLock'&&x.lock.granted)
              &&!peerLocks.some(x=>['products','product_batches'].includes(x.relationName)&&x.lock.mode==='RowShareLock')))
          assert(order+': physical12 held2 eligible7 and other location7/1 are retained',main(r.after).on_hand===12&&main(r.after).reserved===2&&main(r.after).in_transit===3
            &&same(other(r.before),other(r.after))&&same(r.before.holds,r.after.holds)&&r.after.eligible===7&&r.after.product.stock_available===7&&r.after.product.total_stock===7
            &&r.after.lots.find(l=>l.id===f.lot).quantity===4&&r.after.lots.find(l=>l.id===f.lot).reserved_quantity===2
            &&r.after.lots.find(l=>l.id===bad).quantity_available===0)
          assert(order+': complete stable balance product and lot fields retained',stableFields(main(r.before),main(r.after),['updated_at'])
            &&stableFields(r.before.product,r.after.product,['stock_available','total_stock','updated_at'])
            &&r.before.lots.every(l=>stableFields(l,r.after.lots.find(a=>a.id===l.id),['quantity_available','inventory_status','clearance_approved_at','clearance_approved_by','updated_at'])))
          assert(order+': exact controls protected tables and unrelated stock remain attributable',protectedSame(r.beforeHashes,r.afterHashes)&&same(r.otherBefore,r.otherAfter)
            &&exactControls(r.beforeControls,r.afterControls,r.commands,buckets))
          r.newEvents=r.after.events.filter(e=>!r.before.events.some(b=>b.id===e.id))
          assert(order+': all complete per-lot history chains and prior events preserved',r.before.events.every(e=>r.after.events.some(a=>same(e,a)))&&r.newEvents.length===4&&r.before.lots.every(l=>{
            const chain=r.newEvents.filter(e=>e.batch_id===l.id).sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at))
            const reasons=l.id===f.lot?(order==='clearance-first'?[r.clearancePayload.reason,r.recountPayload.reason]:[r.recountPayload.reason,r.clearancePayload.reason]):[r.recountPayload.reason]
            return chain.length===(l.id===f.lot?2:1)&&chain.every((e,i)=>e.sku===f.sku&&e.actor_id===actor&&e.reason===reasons[i]&&e.created_at===e.new_data.updated_at&&same(e.old_data,i?chain[i-1].new_data:l))&&same(chain.at(-1).new_data,r.after.lots.find(a=>a.id===l.id))
          }))
          r.faultPayload={batchId:f.lot,approved:false,reason:'Synthetic multi-lot atomic reversal recovery'};r.faultKey=randomUUID();r.faultBefore=tableHashes();let refused=false
          try{value(`set k2.fixture.clearance_edge_fault='on';${signed('lot_clearance',r.faultPayload,r.faultKey).sql}`)}catch(error){refused=/LOCAL_CLEARANCE_EDGE_FAULT/.test(error.message)}
          r.faultAfter=tableHashes();assert(order+': late reversal fault rolls back every table',refused&&same(r.faultBefore,r.faultAfter))
          r.recoveryBefore=snapshot(f.sku);r.recovery=commandEffect('lot_clearance',r.faultPayload,r.faultKey);r.recoveryAfter=snapshot(f.sku)
          const recoveryEvents=r.recoveryAfter.events.filter(e=>!r.recoveryBefore.events.some(p=>p.id===e.id))
          assert(order+': same-key reversal preserves complete balances sibling lots and holds',same(r.recoveryBefore.balances,r.recoveryAfter.balances)&&same(r.recoveryBefore.holds,r.recoveryAfter.holds)
            &&r.recoveryBefore.lots.filter(l=>l.id!==f.lot).every(l=>r.recoveryAfter.lots.some(a=>same(l,a)))&&r.recoveryAfter.eligible===5&&r.recoveryAfter.product.stock_available===5
            &&recoveryEvents.length===1&&recoveryEvents[0].batch_id===f.lot&&recoveryEvents[0].sku===f.sku&&recoveryEvents[0].actor_id===actor
            &&recoveryEvents[0].reason===r.faultPayload.reason&&recoveryEvents[0].created_at===recoveryEvents[0].new_data.updated_at
            &&same(recoveryEvents[0].old_data,r.recoveryBefore.lots.find(l=>l.id===f.lot))&&same(recoveryEvents[0].new_data,r.recoveryAfter.lots.find(l=>l.id===f.lot))
            &&r.recoveryBefore.events.every(e=>r.recoveryAfter.events.some(a=>same(e,a)))
            &&stableFields(r.recoveryBefore.product,r.recoveryAfter.product,['stock_available','total_stock','updated_at'])
            &&stableFields(r.recoveryBefore.lots.find(l=>l.id===f.lot),r.recoveryAfter.lots.find(l=>l.id===f.lot),['quantity_available','inventory_status','clearance_approved_at','clearance_approved_by','updated_at'])
            &&exactControls(r.recovery.before,r.recovery.after,[r.recovery])&&r.recovery.protectedUnchanged&&same(r.recovery.otherBefore,r.recovery.otherAfter))
          r.replay=commandEffect('lot_clearance',r.faultPayload,r.faultKey)
          assert(order+': recovered receipt replay has exact controls and no business effects',same(r.recovery.result,r.replay.result)&&same(business(r.replay.hashesBefore),business(r.replay.hashesAfter))&&exactControls(r.replay.before,r.replay.after,[r.replay]))
          r.invalidBefore=tableHashes();r.invalidError=null
          try{value(signed('lot_clearance',{batchId:bad,approved:true,reason:'Synthetic unsafe thirty-day approval refusal'},randomUUID()).sql)}catch(error){r.invalidError=error.message}
          r.invalidAfter=tableHashes();assert(order+': unsafe sibling approval refuses with every table unchanged',/K2_CLEARANCE_INELIGIBLE/.test(r.invalidError)&&same(r.invalidBefore,r.invalidAfter))
          r.conflictBefore=tableHashes();r.conflictError=null
          try{value(signed('lot_clearance',{...r.faultPayload,approved:true},r.faultKey).sql)}catch(error){r.conflictError=error.message}
          r.conflictAfter=tableHashes();assert(order+': conflicting payload under recovered key refuses with every table unchanged',/K2_ADMIN_IDEMPOTENCY_CONFLICT/.test(r.conflictError)&&same(r.conflictBefore,r.conflictAfter))
        }catch(error){r.error=error.message;assert(order+': edge witness completes',false)}
        finally{
          if(gate&&!released)try{await gate.release()}catch(error){r.cleanupErrors.push(error.message)}
          r.outcomes=await Promise.all([owner,contender].filter(Boolean));for(const n of [ownerName,contenderName,gate?.name].filter(Boolean))completed.delete(n)
          r.remaining=JSON.parse(value(`select coalesce(jsonb_agg(application_name),'[]')::text from pg_stat_activity where application_name in (${[ownerName,contenderName,gate?.name].filter(Boolean).map(literal).join(',')});`))
          assert(order+': all edge sessions removed',r.remaining.length===0&&r.cleanupErrors.length===0);save()
        }
      }
      const from=fixture('clearance-identity-from-'+randomUUID().slice(0,8),2),to=fixture('clearance-identity-to-'+randomUUID().slice(0,8),2)
      const drift={case:'lot SKU changes after signed resolution',from,to,error:null,cleanupErrors:[]};extras.push(drift)
      let gate,released=false,command
      const name='k2_ce_identity_'+randomUUID()
      sync(`update public.product_batches set expiry_date=current_date+60,best_before_date=current_date+60,
        inventory_status='quarantine',quantity_available=0,hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA' where id='${from.lot}';
        create function k2_stock_fixture.clearance_identity_pause() returns trigger language plpgsql as $$
          begin if current_setting('k2.fixture.clearance_identity_pause',true)='on' then
            raise notice 'K2_EDGE_IDENTITY:%',jsonb_build_object('target',current_setting('k2.fixture.clearance_identity_target'),
              'savedSku',(select sku from public.product_batches where id=current_setting('k2.fixture.clearance_identity_target')::uuid));
            perform pg_advisory_xact_lock(61001,5);end if;return null;end;$$;
        create trigger k2_clearance_identity_pause before insert on public.inventory_balances for each statement execute function k2_stock_fixture.clearance_identity_pause();`)
      try{
        drift.payload={batchId:from.lot,approved:true,reason:'Synthetic concurrent lot identity protection'};drift.key=randomUUID();drift.command=signed('lot_clearance',drift.payload,drift.key)
        drift.beforeFrom=snapshot(from.sku);drift.beforeTo=snapshot(to.sku)
        gate=await controller();drift.gate=gate.name
        command=session(name,`begin;set local k2.fixture.clearance_identity_pause='on';set local k2.fixture.clearance_identity_target='${from.lot}';${drift.command.sql}commit;`)
        await waitFor(blockedBy(name,gate.name),'signed clearance resolved original identity before balance statement')
        drift.resolved=await notice(command,'K2_EDGE_IDENTITY')
        drift.waits=JSON.parse(value(`select jsonb_agg(jsonb_build_object('name',application_name,'pid',pid,'xid',backend_xid::text,'blockers',pg_blocking_pids(pid),'wait',wait_event) order by application_name)::text from pg_stat_activity where application_name in (${[name,gate.name].map(literal).join(',')});`))
        // External identity correction is fixture-only, committed while the actual signed command is paused.
        sync(`begin;update public.product_batches set sku=${literal(to.sku)} where id='${from.lot}';
          update public.inventory_balances set on_hand=0 where sku=${literal(from.sku)} and location_code='MANILA_MAIN';
          update public.inventory_balances set on_hand=4 where sku=${literal(to.sku)} and location_code='MANILA_MAIN';commit;`)
        drift.committedFrom=snapshot(from.sku);drift.committedTo=snapshot(to.sku);drift.committedHashes=tableHashes()
        await gate.release();released=true;drift.outcome=await command;drift.afterHashes=tableHashes();drift.afterFrom=snapshot(from.sku);drift.afterTo=snapshot(to.sku)
        assert('identity drift: signed resolved original SKU then refuses with exact external committed image',drift.resolved.savedSku===from.sku&&drift.resolved.target===from.lot
          &&drift.outcome.status!==0&&/K2_ADMIN_PAYLOAD_INVALID/.test(drift.outcome.stderr)&&same(drift.committedHashes,drift.afterHashes)
          &&same(drift.committedFrom,drift.afterFrom)&&same(drift.committedTo,drift.afterTo))
        drift.recovery=commandEffect('lot_clearance',drift.payload,drift.key);drift.recoveredFrom=snapshot(from.sku);drift.recoveredTo=snapshot(to.sku)
        const events=drift.recoveredTo.events.filter(e=>!drift.committedTo.events.some(p=>p.id===e.id))
        assert('identity drift: same-key recovery resolves new SKU and preserves physical stock',drift.recovery.result.sku===to.sku&&drift.recovery.result.approved===true
          &&same(drift.afterFrom,drift.recoveredFrom)&&same(drift.afterTo.balances,drift.recoveredTo.balances)&&main(drift.recoveredTo).on_hand===4
          &&events.length===1&&events[0].batch_id===from.lot&&events[0].sku===to.sku&&events[0].actor_id===actor
          &&events[0].reason===drift.payload.reason&&events[0].created_at===events[0].new_data.updated_at
          &&same(events[0].old_data,drift.committedTo.lots.find(l=>l.id===from.lot))&&same(events[0].new_data,drift.recoveredTo.lots.find(l=>l.id===from.lot))
          &&drift.committedTo.events.every(e=>drift.recoveredTo.events.some(a=>same(e,a)))
          &&stableFields(drift.committedTo.product,drift.recoveredTo.product,['stock_available','total_stock','updated_at'])
          &&drift.committedTo.lots.every(l=>stableFields(l,drift.recoveredTo.lots.find(a=>a.id===l.id),l.id===from.lot?['quantity_available','inventory_status','clearance_approved_at','clearance_approved_by','updated_at']:[]))
          &&exactControls(drift.recovery.before,drift.recovery.after,[drift.recovery])&&drift.recovery.protectedUnchanged&&same(drift.recovery.otherBefore,drift.recovery.otherAfter))
        drift.replay=commandEffect('lot_clearance',drift.payload,drift.key)
        assert('identity drift: recovered receipt exact replay preserves all business rows',same(drift.recovery.result,drift.replay.result)
          &&same(business(drift.replay.hashesBefore),business(drift.replay.hashesAfter))&&exactControls(drift.replay.before,drift.replay.after,[drift.replay]))
      }catch(error){drift.error=error.message;assert('identity drift: witness completes',false)}
      finally{
        if(gate&&!released)try{await gate.release()}catch(error){drift.cleanupErrors.push(error.message)}
        if(command)drift.outcome=await command
        for(const n of [name,gate?.name].filter(Boolean))completed.delete(n)
        sync('drop trigger k2_clearance_identity_pause on public.inventory_balances;drop function k2_stock_fixture.clearance_identity_pause();')
        drift.remaining=JSON.parse(value(`select coalesce(jsonb_agg(application_name),'[]')::text from pg_stat_activity where application_name in (${[name,gate?.name].filter(Boolean).map(literal).join(',')});`))
        assert('identity drift: all owned sessions removed',drift.remaining.length===0&&drift.cleanupErrors.length===0);save()
      }
    }finally{
      sync('drop trigger k2_clearance_edge_pause on public.batch_change_events;drop function k2_stock_fixture.clearance_edge_pause();drop trigger k2_clearance_edge_fault on public.batch_change_events;drop function k2_stock_fixture.clearance_edge_fault();drop trigger k2_clearance_edge_verifier on k2_private.admin_request_nonces;drop function k2_stock_fixture.clearance_edge_verifier();')
      const afterFunctions=functions();write('functions-after.json',afterFunctions);assert('all edge production functions/catalogs/ACLs remain exact',same(beforeFunctions,afterFunctions));save()
    }
    check('clearance multi-lot and identity edge assertions pass',assertions.every(x=>x.passed),JSON.stringify(assertions.filter(x=>!x.passed)))
    return
  }
  sync(`create or replace function k2_stock_fixture.clearance_verifier_image() returns trigger language plpgsql as $$
    begin raise notice 'K2_CLEARANCE_VERIFIER_IMAGE:%',jsonb_build_object('nonce',to_jsonb(new),'rates',(select coalesce(jsonb_agg(to_jsonb(r) order by scope,subject,bucket_start),'[]') from k2_private.admin_request_rate_buckets r));return new;end;$$;
    create trigger k2_clearance_verifier_image after insert on k2_private.admin_request_nonces for each row execute function k2_stock_fixture.clearance_verifier_image();
    create or replace function k2_stock_fixture.clearance_owner_controls() returns void language plpgsql as $$
    begin raise notice 'K2_CLEARANCE_OWNER_CONTROLS:%',jsonb_build_object('nonces',(select coalesce(jsonb_agg(to_jsonb(n) order by actor_id,action,nonce),'[]') from k2_private.admin_request_nonces n),
      'rates',(select coalesce(jsonb_agg(to_jsonb(r) order by scope,subject,bucket_start),'[]') from k2_private.admin_request_rate_buckets r));end;$$;
    create or replace function k2_stock_fixture.pause_clearance_product() returns trigger language plpgsql as $$
    begin if current_setting('k2.fixture.pause_clearance_product',true)='on' then
      perform k2_stock_fixture.clearance_owner_controls();perform pg_advisory_xact_lock(61001,5); end if;return null;end;$$;
    create trigger k2_clearance_product_pause before insert on public.batch_change_events for each statement execute function k2_stock_fixture.pause_clearance_product();`)
  try {
    for(const order of ['clearance-first','recount-first']) {
      const suffix=randomUUID().slice(0,8),cName='k2_cr_clearance_'+suffix,rName='k2_cr_recount_'+suffix
      const report={order,error:null,cleanupErrors:[]};reports.push(report)
      let gate,released=false,c,r
      try {
        const f=fixture('clearance-recount-'+suffix,2);report.fixture=f
        sync(`update public.product_batches set expiry_date=current_date+60,best_before_date=current_date+60,
          inventory_status='quarantine',hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA',quantity_available=0 where id='${f.lot}';`)
        const snapshot=()=>JSON.parse(value(`select jsonb_build_object('lot',(select to_jsonb(b) from public.product_batches b where id='${f.lot}'),
          'product',(select to_jsonb(p) from public.products p where sku=${literal(f.sku)}),
          'balance',(select to_jsonb(b) from public.inventory_balances b where sku=${literal(f.sku)} and location_code='MANILA_MAIN'),
          'eligible',(select coalesce(sum(greatest(quantity-reserved_quantity,0)),0) from public.product_batches b where sku=${literal(f.sku)} and k2_private.lot_is_eligible_v1(b)),
          'events',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') from public.batch_change_events e where sku=${literal(f.sku)}))::text;`))
        report.before=snapshot();report.beforeControls=controls()
        report.beforeHashes=tableHashes();report.otherBefore=otherStockRows(f.sku)
        const l=report.before.lot
        report.clearancePayload={batchId:f.lot,approved:true,reason:'Synthetic real-minute clearance overlap'}
        report.recountPayload={sku:f.sku,reason:'Synthetic real-minute physical recount',lots:[{id:l.id,
          boxCode:l.box_code,batchCode:l.batch_code,quantity:2,expiryDate:l.expiry_date,landedDate:l.landed_date||'',
          hub:l.hub,custodian:l.custodian,channel:l.channel||'',pinned:l.is_pinned,status:'available'}]}
        report.clearanceKey=randomUUID();report.recountKey=randomUUID()
        gate=await controller();report.gate=gate.name
        report.ownerBucket=bucket()
        const first=signed(order==='clearance-first'?'lot_clearance':'lots_reconcile',order==='clearance-first'?report.clearancePayload:report.recountPayload,
          order==='clearance-first'?report.clearanceKey:report.recountKey)
        report.ownerArgs=first.args
        if(order==='clearance-first')c=session(cName,`set statement_timeout='90s';begin;set local k2.fixture.pause_clearance_product='on';${first.sql}commit;`)
        else r=session(rName,`set statement_timeout='90s';begin;${first.sql}reset role;select k2_stock_fixture.clearance_owner_controls();select pg_advisory_xact_lock(61001,5);commit;`)
        const owner=order==='clearance-first'?cName:rName,contender=order==='clearance-first'?rName:cName
        await waitFor(blockedBy(owner,gate.name),'actual signed owner holds early business boundary')
        const ownerSession=order==='clearance-first'?c:r
        report.ownerControls=await notice(ownerSession,'K2_CLEARANCE_OWNER_CONTROLS')
        const rateKey=x=>[x.scope,x.subject,x.bucket_start].join('|')
        const prior=new Map(report.beforeControls.rates.map(x=>[rateKey(x),x]))
        report.ownerRateDeltas=report.ownerControls.rates.filter(x=>x.hit_count!==(prior.get(rateKey(x))?.hit_count||0))
        if(report.ownerRateDeltas.length!==2||new Set(report.ownerRateDeltas.map(x=>x.bucket_start)).size!==1)throw Error('ACTUAL_OWNER_RATE_BUCKET_AMBIGUOUS')
        report.sampledOwnerBucket=report.ownerBucket;report.ownerBucket=report.ownerRateDeltas[0].bucket_start
        const probe=table=>{try{sync(`begin;select 1 from public.${table} where ${table==='product_batches'?`id='${f.lot}'`:`sku=${literal(f.sku)}`} for update nowait;rollback;`);return {available:true}}catch(error){if(!/could not obtain lock on row/.test(error.message))throw error;return {available:false,error:error.message}}}
        report.ownerProbes=Object.fromEntries(['products','product_batches','inventory_balances'].map(t=>[t,probe(t)]))
        const end=Date.now()+65000
        while(Date.parse(bucket())===Date.parse(report.ownerBucket)){if(Date.now()>end)throw Error('REAL_MINUTE_BOUNDARY_NOT_OBSERVED');await new Promise(resolve=>setTimeout(resolve,500))}
        report.contenderBucket=bucket()
        const second=signed(order==='clearance-first'?'lots_reconcile':'lot_clearance',order==='clearance-first'?report.recountPayload:report.clearancePayload,
          order==='clearance-first'?report.recountKey:report.clearanceKey)
        report.contenderArgs=second.args
        if(order==='clearance-first')r=session(rName,`begin;${second.sql}commit;`)
        else c=session(cName,`begin;${second.sql}commit;`)
        await waitFor(blockedBy(contender,owner),'actual next-minute signed contender blocks on stock')
        report.waits=JSON.parse(value(`select jsonb_agg(jsonb_build_object('name',application_name,'pid',pid,'xid',backend_xid::text,'wait',wait_event,
          'waitType',wait_event_type,'blockers',pg_blocking_pids(pid)) order by application_name)::text from pg_stat_activity
          where application_name in (${[cName,rName,gate.name].map(literal).join(',')});`))
        const contenderSession=order==='clearance-first'?r:c
        report.contenderVerifierControls=await notice(contenderSession,'K2_CLEARANCE_VERIFIER_IMAGE')
        report.ownerVerifierControls=await notice(ownerSession,'K2_CLEARANCE_VERIFIER_IMAGE')
        report.contenderRateDeltas=report.contenderVerifierControls.rates.filter(x=>x.hit_count!==(prior.get(rateKey(x))?.hit_count||0))
        assert(order+': both genuine verifiers retain exact signed nonce and disjoint actor/global minute hits',report.ownerVerifierControls.nonce.nonce===first.args.p_nonce
          &&report.contenderVerifierControls.nonce.nonce===second.args.p_nonce&&report.contenderRateDeltas.length===2
          &&report.ownerRateDeltas.every(x=>x.hit_count-(prior.get(rateKey(x))?.hit_count||0)===1)
          &&report.contenderRateDeltas.every(x=>x.hit_count-(prior.get(rateKey(x))?.hit_count||0)===1&&Date.parse(x.bucket_start)!==Date.parse(report.ownerBucket))
          &&report.contenderRateDeltas.some(x=>x.scope==='actor'&&x.subject===actor)&&report.contenderRateDeltas.some(x=>x.scope==='global'&&x.subject==='all_admin_requests'))
        report.contenderProbes=Object.fromEntries(['products','product_batches','inventory_balances'].map(t=>[t,probe(t)]))
        report.balanceVersion=JSON.parse(value(`select jsonb_build_object('sku',sku,'location',location_code,'xmin',xmin::text,'xmax',xmax::text)::text
          from public.inventory_balances where sku=${literal(f.sku)} and location_code='MANILA_MAIN';`))
        report.locks=JSON.parse(value(`select jsonb_agg(jsonb_build_object('name',a.application_name,'lock',to_jsonb(l),'relationName',l.relation::regclass::text) order by a.application_name,l.locktype,l.relation,l.mode)::text from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name in (${[cName,rName,gate.name].map(literal).join(',')});`))
        await gate.release();released=true;report.outcomes=await Promise.all([c,r]);report.after=snapshot();report.afterControls=controls();report.afterHashes=tableHashes();report.otherAfter=otherStockRows(f.sku);save()
        assert(order+': genuine minute boundary and distinct three-session blocking chain',Date.parse(report.ownerBucket)!==Date.parse(report.contenderBucket)
          &&report.waits.length===3&&new Set(report.waits.map(x=>x.pid)).size===3
          &&report.waits.find(x=>x.name===owner).blockers.includes(report.waits.find(x=>x.name===gate.name).pid)
          &&report.waits.find(x=>x.name===contender).blockers.includes(report.waits.find(x=>x.name===owner).pid))
        const ownerXid=report.waits.find(x=>x.name===owner).xid
        const exactTuple=report.locks.some(x=>x.name===contender&&x.lock.locktype==='tuple'
          &&x.relationName===(beforeClearanceLockFix?'product_batches':'inventory_balances'))
        const balanceConflict=!beforeClearanceLockFix&&order==='recount-first'&&report.balanceVersion.xmax===ownerXid
          &&report.locks.some(x=>x.name===contender&&x.lock.locktype==='transactionid'&&!x.lock.granted&&x.lock.transactionid===ownerXid)
          &&report.locks.some(x=>x.name===contender&&x.relationName==='inventory_balances'&&x.lock.mode==='RowExclusiveLock'&&x.lock.granted)
          &&!report.locks.some(x=>x.name===contender&&['products','product_batches'].includes(x.relationName)&&x.lock.mode==='RowShareLock')
        report.balanceConflict=balanceConflict
        assert(order+': contender waits on exact canonical stock authority rather than verifier row',(exactTuple||balanceConflict)
          &&!report.ownerProbes.product_batches.available&&!report.contenderProbes.product_batches.available
          &&(beforeClearanceLockFix||!report.ownerProbes.inventory_balances.available&&!report.ownerProbes.products.available))
        assert(order+': actual signed clearance and recount both commit without deadlock',report.outcomes.every(x=>x.status===0&&!/deadlock detected/.test(x.stderr)))
        assert(order+': physical stock is retained and cache equals private eligibility',report.after.lot.quantity===2
          &&report.after.lot.reserved_quantity===0&&report.after.balance.on_hand===2&&report.after.balance.reserved===0
          &&report.after.eligible===2&&report.after.lot.inventory_status==='available'&&report.after.lot.clearance_approved_by===actor&&report.after.lot.clearance_approved_at!==null&&report.after.product.stock_available===report.after.eligible&&report.after.product.total_stock===report.after.eligible)
        const changedTables=new Set(['public.products','public.product_batches','public.inventory_balances','public.batch_change_events',
          'k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets','k2_private.admin_command_receipts'])
        assert(order+': all protected public/private tables remain exactly unchanged',tableNames.every(t=>changedTables.has(t)||report.beforeHashes[t]===report.afterHashes[t]))
        report.controlCommands=[{args:first.args,outcome:order==='clearance-first'?report.outcomes[0]:report.outcomes[1],bucket:report.ownerBucket},
          {args:second.args,outcome:order==='clearance-first'?report.outcomes[1]:report.outcomes[0],bucket:report.contenderRateDeltas[0].bucket_start}]
          .filter(c=>c.outcome.status===0).map(c=>({args:c.args,result:response(c.outcome),bucket:c.bucket}))
        assert(order+': exact successful-only nonce/rate/receipt effects and unrelated stock rows',same(report.otherBefore,report.otherAfter)
          &&exactControls(report.beforeControls,report.afterControls,report.controlCommands,report.controlCommands.map(c=>c.bucket)))
        const added=report.after.events.filter(e=>!report.before.events.some(p=>p.id===e.id)).sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at))
        const reasons=order==='clearance-first'?[report.clearancePayload.reason,report.recountPayload.reason]:[report.recountPayload.reason,report.clearancePayload.reason]
        assert(order+': both exact history chains retain source and terminal lot images',added.length===2
          &&report.before.events.every(e=>report.after.events.some(a=>same(e,a)))
          &&added.every((e,i)=>e.batch_id===f.lot&&e.sku===f.sku&&e.actor_id===actor&&e.reason===reasons[i]
            &&same(e.old_data,i===0?report.before.lot:added[i-1].new_data)&&e.created_at===e.new_data.updated_at)
          &&same(added.at(-1)?.new_data,report.after.lot))
        if(!beforeClearanceLockFix&&report.outcomes.every(x=>x.status===0)) {
          report.replayBeforeHashes=tableHashes()
          report.replayEffect=commandEffect('lot_clearance',report.clearancePayload,report.clearanceKey)
          report.replayResult=report.replayEffect.result;report.replayAfterHashes=tableHashes()
          assert(order+': fresh-signature accepted clearance replay has no business or receipt effect',report.replayResult.approved===true
            &&same(business(report.replayBeforeHashes),business(report.replayAfterHashes))&&same(report.replayEffect.otherBefore,report.replayEffect.otherAfter)
            &&report.replayEffect.protectedUnchanged&&exactControls(report.replayEffect.before,report.replayEffect.after,[report.replayEffect]))
          for(const mode of ['invalid-lot','aal1']) {
            const before=tableHashes(),bad=signed('lot_clearance',mode==='invalid-lot'?{...report.clearancePayload,batchId:randomUUID()}:report.clearancePayload,randomUUID())
            let refused=false
            try{value(mode==='aal1'?bad.sql.replace('{"aal":"aal2"}','{"aal":"aal1"}'):bad.sql)}catch(error){refused=(mode==='aal1'?/K2_ADMIN_AAL2_REQUIRED/:/K2_ADMIN_PAYLOAD_INVALID/).test(error.message)}
            const after=tableHashes();(report.refusals??=[]).push({mode,before,after,refused})
            assert(order+': '+mode+' refusal retains every public/private table',refused&&same(before,after))
          }
          const faultKey=randomUUID(),faultPayload={...report.clearancePayload,approved:false,reason:'Synthetic post-history clearance fault recovery'}
          report.faultKey=faultKey;report.faultPayload=faultPayload
          sync(`create function k2_stock_fixture.clearance_history_fault() returns trigger language plpgsql as $$
            begin if current_setting('k2.fixture.clearance_history_fault',true)='on' then raise exception 'LOCAL_CLEARANCE_HISTORY_FAULT';end if;return new;end;$$;
            create trigger k2_clearance_history_fault after insert on public.batch_change_events for each row execute function k2_stock_fixture.clearance_history_fault();`)
          try {
            report.faultBeforeHashes=tableHashes();let faulted=false
            try{value(`set k2.fixture.clearance_history_fault='on';${signed('lot_clearance',faultPayload,faultKey).sql}`)}catch(error){faulted=/LOCAL_CLEARANCE_HISTORY_FAULT/.test(error.message)}
            report.faultAfterHashes=tableHashes()
            assert(order+': actual after-history fault rolls back every stock/history/control table',faulted&&same(report.faultBeforeHashes,report.faultAfterHashes))
            report.recoveryBefore=snapshot();report.recoveryEffect=commandEffect('lot_clearance',faultPayload,faultKey)
            report.recoveryResult=report.recoveryEffect.result;report.recoveryAfter=snapshot()
            const recoveryEvents=report.recoveryAfter.events.filter(e=>!report.recoveryBefore.events.some(p=>p.id===e.id))
            assert(order+': failed same-key clearance recovers once with exact reversal history and retained physical balances',report.recoveryResult.approved===false
              &&report.recoveryAfter.lot.quantity===2&&report.recoveryAfter.lot.reserved_quantity===0&&report.recoveryAfter.balance.on_hand===2
              &&report.recoveryAfter.balance.reserved===0&&report.recoveryAfter.eligible===0&&report.recoveryAfter.product.stock_available===0
              &&report.recoveryAfter.product.total_stock===0&&recoveryEvents.length===1&&same(recoveryEvents[0].old_data,report.recoveryBefore.lot)
              &&same(recoveryEvents[0].new_data,report.recoveryAfter.lot)&&recoveryEvents[0].reason===faultPayload.reason
              &&same(report.recoveryEffect.otherBefore,report.recoveryEffect.otherAfter)&&report.recoveryEffect.protectedUnchanged
              &&exactControls(report.recoveryEffect.before,report.recoveryEffect.after,[report.recoveryEffect]))
            report.recoveryReplayBefore=tableHashes();report.recoveryReplayEffect=commandEffect('lot_clearance',faultPayload,faultKey)
            report.recoveryReplayResult=report.recoveryReplayEffect.result;report.recoveryReplayAfter=tableHashes()
            assert(order+': recovered reversal exact replay preserves every business/receipt row',same(report.recoveryResult,report.recoveryReplayResult)
              &&same(business(report.recoveryReplayBefore),business(report.recoveryReplayAfter))&&report.recoveryReplayEffect.protectedUnchanged
              &&same(report.recoveryReplayEffect.otherBefore,report.recoveryReplayEffect.otherAfter)&&exactControls(report.recoveryReplayEffect.before,report.recoveryReplayEffect.after,[report.recoveryReplayEffect]))
          }finally{sync('drop trigger k2_clearance_history_fault on public.batch_change_events;drop function k2_stock_fixture.clearance_history_fault();')}
        }
        report.deadlock=report.outcomes.some(x=>/deadlock detected/.test(x.stderr));save()
      }catch(error){report.error=error.message;assert(order+': diagnostic setup completes',false);save()}
      finally {
        if(gate&&!released)try{await gate.release()}catch(error){report.cleanupErrors.push(error.message)}
        report.outcomes=await Promise.all([c,r].filter(Boolean))
        for(const name of [cName,rName,gate?.name].filter(Boolean))completed.delete(name)
        try{report.remainingSessions=JSON.parse(value(`select coalesce(jsonb_agg(application_name),'[]')::text from pg_stat_activity where application_name in (${[cName,rName,gate?.name].filter(Boolean).map(literal).join(',')});`))}
        catch(error){report.cleanupErrors.push(error.message)}
        assert(order+': all named sessions are absent',report.remainingSessions?.length===0&&report.cleanupErrors.length===0);save()
      }
    }
    if(!beforeClearanceLockFix) {
      const f=fixture('clearance-seed-'+randomUUID().slice(0,8),3),extra={case:'missing balance with genuine retained hold',fixture:f};extras.push(extra)
      sync(`update public.product_batches set hub='HUB-MNL-CENTRAL',custodian='CUST-STAFF-ELENA' where id='${f.lot}';`)
      extra.purchasePayload=guestPayload(f);extra.purchase=JSON.parse(value(`set role anon;select row_to_json(r)::text from ${guestCall(extra.purchasePayload,'203.0.113.89')} r;`))
      sync(`update public.product_batches set expiry_date=current_date+60,best_before_date=current_date+60,inventory_status='quarantine',quantity_available=0 where id='${f.lot}';
        delete from public.inventory_balances where sku=${literal(f.sku)} and location_code='MANILA_MAIN';`)
      const seedSnapshot=()=>JSON.parse(value(`select jsonb_build_object('lot',(select to_jsonb(b) from public.product_batches b where id='${f.lot}'),
        'balance',(select to_jsonb(b) from public.inventory_balances b where sku=${literal(f.sku)} and location_code='MANILA_MAIN'),
        'product',(select to_jsonb(p) from public.products p where sku=${literal(f.sku)}),
        'reservations',(select jsonb_agg(to_jsonb(r) order by id) from public.inventory_reservations r where sku=${literal(f.sku)}),
        'events',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') from public.batch_change_events e where sku=${literal(f.sku)}))::text;`))
      extra.before=seedSnapshot();extra.key=randomUUID();extra.payload={batchId:f.lot,approved:true,reason:'Synthetic saved physical and held seed recovery'}
      sync(`create function k2_stock_fixture.clearance_seed_fault() returns trigger language plpgsql as $$
        begin if current_setting('k2.fixture.clearance_seed_fault',true)='on' then raise exception 'LOCAL_CLEARANCE_SEED_FAULT';end if;return new;end;$$;
        create trigger k2_clearance_seed_fault after insert on public.batch_change_events for each row execute function k2_stock_fixture.clearance_seed_fault();`)
      try {
        extra.faultBeforeHashes=tableHashes();let faulted=false
        try{value(`set k2.fixture.clearance_seed_fault='on';${signed('lot_clearance',extra.payload,extra.key).sql}`)}catch(error){faulted=/LOCAL_CLEARANCE_SEED_FAULT/.test(error.message)}
        extra.faultAfterHashes=tableHashes();extra.afterFault=seedSnapshot()
        assert('missing balance: late history failure removes initialized balance and all stock/control effects',extra.purchase.ok===true&&extra.before.balance===null
          &&extra.before.lot.quantity===3&&extra.before.lot.reserved_quantity===1&&extra.before.reservations.length===1&&extra.before.reservations[0].quantity===1
          &&faulted&&same(extra.faultBeforeHashes,extra.faultAfterHashes)&&same(extra.before,extra.afterFault))
        extra.effect=commandEffect('lot_clearance',extra.payload,extra.key);extra.result=extra.effect.result;extra.after=seedSnapshot()
        assert('missing balance: same-key retry seeds saved physical3/reserved1 and preserves exact hold attribution',extra.result.approved===true&&extra.result.quantityAvailable===2
          &&extra.after.balance.on_hand===3&&extra.after.balance.reserved===1&&extra.after.lot.quantity===3&&extra.after.lot.reserved_quantity===1
          &&extra.after.product.stock_available===2&&extra.after.product.total_stock===2&&same(extra.before.reservations,extra.after.reservations)
          &&extra.after.events.length===1&&same(extra.after.events[0].old_data,extra.before.lot)&&same(extra.after.events[0].new_data,extra.after.lot)
          &&same(extra.effect.otherBefore,extra.effect.otherAfter)&&extra.effect.protectedUnchanged&&exactControls(extra.effect.before,extra.effect.after,[extra.effect]))
        extra.replayBefore=tableHashes();extra.replayEffect=commandEffect('lot_clearance',extra.payload,extra.key)
        extra.replayResult=extra.replayEffect.result;extra.replayAfter=tableHashes()
        assert('missing balance: initialized held-stock receipt replays without another physical/audit/receipt effect',same(extra.result,extra.replayResult)
          &&same(business(extra.replayBefore),business(extra.replayAfter))&&extra.replayEffect.protectedUnchanged
          &&same(extra.replayEffect.otherBefore,extra.replayEffect.otherAfter)&&exactControls(extra.replayEffect.before,extra.replayEffect.after,[extra.replayEffect]))
      }finally{sync('drop trigger k2_clearance_seed_fault on public.batch_change_events;drop function k2_stock_fixture.clearance_seed_fault();');save()}
    }
  } finally {
    sync('drop trigger k2_clearance_verifier_image on k2_private.admin_request_nonces;drop function k2_stock_fixture.clearance_verifier_image();drop trigger k2_clearance_product_pause on public.batch_change_events;drop function k2_stock_fixture.pause_clearance_product();drop function k2_stock_fixture.clearance_owner_controls();')
    const afterFunctions=functions();write('functions-after.json',afterFunctions)
    assert('all production functions/catalogs/ACLs remain exactly unchanged',same(beforeFunctions,afterFunctions));save()
  }
  check('clearance/recount actual minute-boundary schedules satisfy all diagnostic assertions',assertions.every(x=>x.passed),JSON.stringify(assertions.filter(x=>!x.passed)))
}
