// IDEA10: actual signed add-line calendar on the owned disposable restore only.
import fs from 'node:fs'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {signedAdminCommandArguments} from '../server/admin-bff/security.js'
import {validateConsignmentCommand} from '../server/admin-bff/consignments.js'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
const bffBytes=fs.readFileSync(new URL('../server/admin-bff/consignments.js',import.meta.url))
export const receivingCalendarWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export async function rehearseReceivingCalendar({sync,value,check,fixture,literal,source,withoutTransaction,evidence,beforeReceivingCalendarFix}) {
  const write=(name,data)=>fs.writeFileSync(path.join(evidence,name),JSON.stringify(data,null,2)+'\n')
  fs.writeFileSync(path.join(evidence,'executed-calendar-module.mjs'),bytes)
  fs.writeFileSync(path.join(evidence,'executed-consignments.js'),bffBytes)
  for(const file of ['20261002124500_release_lot_eligibility.sql','20261002140500_lot_compatibility_eligibility.sql',
    '20260812_admin_consignments_bff_boundary.sql'])sync(source('supabase/migrations/'+file))
  const legacy=['finalize_consignment_receipt(uuid,text)','create_consignment_manifest(text,text)',
    'add_consignment_item_v2(uuid,text,text,text,date,integer)','record_consignment_item_scan(uuid,uuid,text)','advance_consignment(uuid,text)']
  const overlay=legacy.map(s=>`revoke all on function public.${s} from public,anon,authenticated;`).join('\n')
  fs.writeFileSync(path.join(evidence,'local-acl-overlay.sql'),overlay+'\n');sync(overlay)
  sync(source('supabase/migrations/20261002225500_receiving_custody_eligibility.sql'))
  const signature='public.execute_admin_consignment_command_v1(text,bigint,uuid,uuid,text,text)'
  const allFunctions=()=>JSON.parse(value(`select jsonb_agg(jsonb_build_object('signature',oid::regprocedure::text,
    'definition',pg_get_functiondef(oid),'body',prosrc,'catalog',to_jsonb(p)-'prosrc') order by oid)::text
    from pg_proc p where pronamespace in ('public'::regnamespace,'k2_private'::regnamespace);`))
  const tables=['public.products','public.product_batches','public.inventory_balances','public.inventory_reservations',
    'public.batch_change_events','public.inventory_events','public.order_requests','public.order_request_items',
    'public.orders','public.order_request_events','public.coupons','public.coupon_redemptions','public.consignments',
    'public.consignment_items','public.consignment_scan_events','public.audit_logs','public.hubs','public.custodians',
    'public.channel_listings','k2_private.admin_command_receipts','k2_private.admin_request_nonces',
    'k2_private.admin_request_rate_buckets','k2_private.guest_request_nonces','k2_private.guest_rate_buckets']
  const snapshot=()=>JSON.parse(value(`select jsonb_build_object(${tables.map(t=>`${literal(t)},
    (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by to_jsonb(x)::text),'')) from ${t} x)`).join(',')})::text;`))
  const controls=()=>JSON.parse(value(`select jsonb_build_object('nonces',
    (select coalesce(jsonb_agg(to_jsonb(n) order by actor_id,action,nonce),'[]') from k2_private.admin_request_nonces n),
    'rates',(select coalesce(jsonb_agg(to_jsonb(b) order by scope,subject,bucket_start),'[]') from k2_private.admin_request_rate_buckets b))::text;`))
  const retryDelta=(a,b,actor,action)=>{
    const key=r=>[r.scope,r.subject,r.bucket_start].join('|'),old=new Map(a.rates.map(r=>[key(r),r]))
    const delta=b.rates.map(r=>({...r,delta:r.hit_count-(old.get(key(r))?.hit_count||0)})).filter(r=>r.delta)
    return b.nonces.length===a.nonces.length+1&&a.nonces.every(n=>b.nonces.some(x=>JSON.stringify(x)===JSON.stringify(n)))
      &&b.nonces.filter(n=>!a.nonces.some(x=>x.nonce===n.nonce)).every(n=>n.actor_id===actor&&n.action===action)
      &&a.rates.every(r=>b.rates.some(x=>key(x)===key(r)))&&delta.length===2&&delta.every(r=>r.delta===1)
      &&delta.some(r=>r.scope==='actor'&&r.subject===actor)&&delta.some(r=>r.scope==='global'&&r.subject==='all_admin_requests')
  }
  const business=s=>Object.fromEntries(Object.entries(s).filter(([t])=>!t.includes('request_nonces')&&!t.includes('rate_buckets')))
  const clockSql=`jsonb_build_object('zone',current_setting('TimeZone'),'callerToday',current_date,
    'manilaToday',(transaction_timestamp() at time zone 'Asia/Manila')::date,
    'manilaMaximum',make_date(extract(year from transaction_timestamp() at time zone 'Asia/Manila')::integer+10,
      extract(month from transaction_timestamp() at time zone 'Asia/Manila')::integer,1)
      +extract(day from transaction_timestamp() at time zone 'Asia/Manila')::integer-1)`
  const clock=zone=>JSON.parse(value(`set time zone ${literal(zone)};select ${clockSql}::text;`))
  const zone=value(`select zone from (values('Pacific/Kiritimati'),('Etc/GMT+12')) z(zone)
    where (transaction_timestamp() at time zone zone)::date is distinct from
      (transaction_timestamp() at time zone 'Asia/Manila')::date limit 1;`)
  const selectedClock=clock(zone);write('selected-caller-calendar.json',selectedClock)
  check('Calendar witness records an actual caller date different from Manila',!!zone&&selectedClock.callerToday!==selectedClock.manilaToday)
  const admin=(actor,action,payload,key=randomUUID(),tz=zone,extra='')=>{
    const a=signedAdminCommandArguments(action,actor,key,payload)
    return JSON.parse(value(`select set_config('request.jwt.claim.sub','${actor}',false);
      select set_config('request.jwt.claims','{"aal":"aal2"}',false);set time zone ${literal(tz)};${extra}set role authenticated;
      select jsonb_build_object('clock',${clockSql},'result',public.execute_admin_consignment_command_v1(
      ${['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'].map(k=>literal(a[k])).join(',')}));`))
  }
  const actor='42000000-0000-4000-8000-000000000096'
  sync(`insert into auth.users(id) values('${actor}');insert into public.user_profiles(id,role) values('${actor}','Admin')
    on conflict(id) do update set role=excluded.role;`)
  const f=fixture('calendar-'+randomUUID().slice(0,8),3)
  const manifest=admin(actor,'consignment_create',{manifestCode:'CAL-'+randomUUID().slice(0,8),shipmentReference:'Synthetic calendar'}).result
  const payload=date=>({consignmentId:manifest.consignmentId,sku:f.sku,batchCode:'CAL-'+randomUUID().slice(0,8),
    boxCode:'CAL-'+randomUUID().slice(0,8),bestBeforeDate:date,expectedQty:1})
  const historicalPayload=payload(selectedClock.manilaToday),historicalKey=randomUUID()
  const historical=admin(actor,'consignment_add_line',historicalPayload,historicalKey,'Asia/Manila')
  write('historical-receipt-before.json',{payload:historicalPayload,key:historicalKey,result:historical})
  const migrationPath='supabase/migrations/20261002234500_receiving_input_calendar.sql'
  let migration
  const beforeFunctions=allFunctions(),beforeRows=snapshot();write('functions-before.json',beforeFunctions)
  if(!beforeReceivingCalendarFix){migration=source(migrationPath);sync(migration)}
  const afterFunctions=allFunctions(),afterRows=snapshot();write('functions-after.json',afterFunctions)
  write('installation-state.json',{before:beforeRows,after:afterRows})
  check('Calendar installation changes no business or signed control rows',JSON.stringify(beforeRows)===JSON.stringify(afterRows))
  check('Calendar changes only signed add-line body and preserves all function catalogs/ACLs',
    beforeFunctions.length===afterFunctions.length&&beforeFunctions.every(a=>{
      const b=afterFunctions.find(x=>x.catalog.oid===a.catalog.oid)
      return b&&JSON.stringify(a.catalog)===JSON.stringify(b.catalog)&&(a.catalog.proname==='execute_admin_consignment_command_v1'||a.body===b.body)
    }))
  const reports=[],failures=[]
  const save=()=>write('calendar-parity.json',{idea:'IDEA-20261002-10',synthetic:true,providerWrites:false,beforeReceivingCalendarFix,
    receivingCalendarWitnessSha256,selectedClock,reports,failures})
  const expect=(name,ok)=>{try{check(name,ok)}catch(e){failures.push(e.message)}}
  for(const [name,date,accepted] of [['Manila today',selectedClock.manilaToday,true],
    ['Manila yesterday',value(`select (${literal(selectedClock.manilaToday)}::date-1)::text;`),false],
    ['Ten-year maximum',selectedClock.manilaMaximum,true],
    ['Beyond ten-year maximum',value(`select (${literal(selectedClock.manilaMaximum)}::date+1)::text;`),false],
    ['Impossible leap day','2038-02-29',false],['Malformed date','2030/01/01',false]]){
    const p=payload(date),key=randomUUID(),r={case:name,payload:p,key,expectedAccepted:accepted,clockBefore:clock(zone),before:snapshot()}
    reports.push(r)
    try{r.bffPayload=validateConsignmentCommand('consignment_add_line',p)}catch(e){r.bffError=e.message}
    if(!beforeReceivingCalendarFix)expect(`${name}: production BFF matches the intended signed SQL input boundary`,
      accepted?JSON.stringify(r.bffPayload)===JSON.stringify(p):r.bffError==='REQUEST_INVALID')
    // Deliberately sign refused inputs directly to test the database defense too.
    try{r.response=admin(actor,'consignment_add_line',r.bffPayload||p,key)}catch(e){r.error=e.message}
    r.after=snapshot();r.clockAfter=clock(zone)
    if(accepted){
      const saved=r.response?JSON.parse(value(`select to_jsonb(i)::text from public.consignment_items i where id='${r.response.result.itemId}';`)):null
      r.saved=saved
      expect(`${name}: actual signed add-line accepts and saves exact input date`,!r.error&&saved?.best_before_date===date)
      if(r.response){
        r.beforeRetry=snapshot();r.beforeControls=controls();r.retry=admin(actor,'consignment_add_line',p,key);r.afterControls=controls();r.afterRetry=snapshot()
        expect(`${name}: exact retry preserves business rows and increments only own nonce/rate controls`,
          JSON.stringify(r.response.result)===JSON.stringify(r.retry.result)
          &&JSON.stringify(business(r.beforeRetry))===JSON.stringify(business(r.afterRetry))
          &&retryDelta(r.beforeControls,r.afterControls,actor,'consignment_add_line'))
      }
    }else expect(`${name}: refused SQL input rolls back all 24 table effects including signed controls`,
      !!r.error&&/K2_ADMIN_PAYLOAD_INVALID|date\/time field value out of range/.test(r.error)&&JSON.stringify(r.before)===JSON.stringify(r.after))
    save()
  }
  const replay={case:'historical exact receipt replay precedes fresh calendar validation',before:snapshot(),beforeControls:controls()}
  replay.response=admin(actor,'consignment_add_line',historicalPayload,historicalKey)
  replay.after=snapshot();replay.afterControls=controls();reports.push(replay)
  expect('Historical exact line receipt replays without revalidation or stock/item duplication',
    JSON.stringify(replay.response.result)===JSON.stringify(historical.result)
    &&JSON.stringify(business(replay.before))===JSON.stringify(business(replay.after))
    &&retryDelta(replay.beforeControls,replay.afterControls,actor,'consignment_add_line'));save()
  const unchanged=['public.products','public.product_batches','public.inventory_balances','public.inventory_reservations','public.channel_listings']
  const afterCases=snapshot()
  expect('Add-line calendar acceptance never creates stock, holds, product changes or publication',unchanged.every(t=>beforeRows[t]===afterCases[t]))
  if(!beforeReceivingCalendarFix){
    const beforeReplay=allFunctions();sync(migration)
    expect('Exact calendar installer replay preserves complete function records',JSON.stringify(beforeReplay)===JSON.stringify(allFunctions()))
    const command=afterFunctions.find(f=>f.catalog.proname==='execute_admin_consignment_command_v1')
    const drifts=[['body',command.definition.replace(command.body,()=>command.body+'\n-- unfamiliar calendar body\n')],
      ['strict',`alter function ${signature} strict;`],['security',`alter function ${signature} security invoker;`],
      ['search-path',`alter function ${signature} set search_path=public;`],['cost',`alter function ${signature} cost 101;`],
      ['parallel',`alter function ${signature} parallel safe;`],['volatility',`alter function ${signature} stable;`],
      ['acl',`grant execute on function ${signature} to anon;`]]
    for(const name of ['verify_admin_bff_request','finalize_consignment_receipt_v1','lot_is_eligible_v1','sync_product_batch_compat_columns','add_consignment_item_v2']){
      const dependency=afterFunctions.find(f=>f.catalog.proname===name)
      drifts.push(['dependency-body-'+name,dependency.definition.replace(dependency.body,()=>dependency.body+'\n-- unfamiliar dependency\n')])
    }
    drifts.push(['dependency-acl',`grant execute on function k2_private.finalize_consignment_receipt_v1(uuid,text,text,text) to anon;`])
    drifts.push(['add-line-writer-acl',`grant execute on function public.add_consignment_item_v2(uuid,text,text,text,date,integer) to anon;`])
    for(const [name,sql] of drifts){
      const r={case:'installer drift '+name,beforeFunctions:allFunctions(),beforeRows:snapshot()};reports.push(r)
      try{sync(`begin;${sql};\n${withoutTransaction(migration)}\nrollback;`)}catch(e){r.error=e.message}
      r.afterFunctions=allFunctions();r.afterRows=snapshot()
      expect(r.case,!!r.error&&/MAP-023 calendar: unfamiliar/.test(r.error)
        &&JSON.stringify(r.beforeFunctions)===JSON.stringify(r.afterFunctions)&&JSON.stringify(r.beforeRows)===JSON.stringify(r.afterRows));save()
    }
    const fault={case:'installer later DDL failure restores body/catalog/ACL and all rows',beforeFunctions:allFunctions(),beforeRows:snapshot()};reports.push(fault)
    try{sync(`begin;${beforeFunctions.find(f=>f.catalog.proname==='execute_admin_consignment_command_v1').definition};
      ${withoutTransaction(migration)}\ndo $$ begin raise exception 'LOCAL_CALENDAR_LATE_DDL_FAULT';end $$;commit;`)}catch(e){fault.error=e.message}
    fault.afterFunctions=allFunctions();fault.afterRows=snapshot()
    expect(fault.case,!!fault.error&&/LOCAL_CALENDAR_LATE_DDL_FAULT/.test(fault.error)
      &&JSON.stringify(fault.beforeFunctions)===JSON.stringify(fault.afterFunctions)&&JSON.stringify(fault.beforeRows)===JSON.stringify(fault.afterRows));save()
    const commandBefore=beforeFunctions.find(f=>f.catalog.proname==='execute_admin_consignment_command_v1')
    const corrected=afterFunctions.find(f=>f.catalog.proname==='execute_admin_consignment_command_v1')
    // Change only the transaction clock in a disposable owner-only copy of the exact command,
    // so leap/year/midnight fixtures exercise the production date expressions and real writer.
    const clockCases=[['2028-02-28T16:00:00Z','2028-02-29','2038-03-01'],['2026-12-31T16:00:00Z','2027-01-01','2037-01-01'],
      ['2026-10-02T15:59:59Z','2026-10-02','2036-10-02'],['2026-10-02T16:00:00Z','2026-10-03','2036-10-03']]
    for(const [now,today,max] of clockCases){
      const r={case:'controlled SQL clock '+now,expectedToday:today,expectedMaximum:max,clockInjectionOnly:true,before:snapshot()};reports.push(r)
      const injected=corrected.body.replaceAll('transaction_timestamp()',`timestamptz ${literal(now)}`)
      sync(corrected.definition.replace(corrected.body,()=>injected))
      try{
        if(historicalPayload.bestBeforeDate<today||historicalPayload.bestBeforeDate>max){
          const h={before:snapshot(),beforeControls:controls()};r.historicalReplay=h
          h.response=admin(actor,'consignment_add_line',historicalPayload,historicalKey)
          h.after=snapshot();h.afterControls=controls()
          expect(`${now}: out-of-range historical exact receipt replays before fresh date validation`,
            JSON.stringify(h.response.result)===JSON.stringify(historical.result)
            &&JSON.stringify(business(h.before))===JSON.stringify(business(h.after))
            &&retryDelta(h.beforeControls,h.afterControls,actor,'consignment_add_line'))
          h.freshBefore=snapshot()
          try{h.freshResult=admin(actor,'consignment_add_line',historicalPayload)}catch(e){h.freshError=e.message}
          h.freshAfter=snapshot()
          expect(`${now}: same now-out-of-range payload with a fresh key refuses atomically`,
            !!h.freshError&&/K2_ADMIN_PAYLOAD_INVALID/.test(h.freshError)&&JSON.stringify(h.freshBefore)===JSON.stringify(h.freshAfter))
        }
        for(const [date,accepted] of [[today,true],[max,true],[value(`select (${literal(today)}::date-1)::text;`),false],
          [value(`select (${literal(max)}::date+1)::text;`),false]]){
          const a={date,accepted,before:snapshot()};(r.inputs??=[]).push(a)
          try{a.response=admin(actor,'consignment_add_line',payload(date),randomUUID(),'Etc/GMT+12')}catch(e){a.error=e.message}
          a.after=snapshot()
          if(a.response)a.saved=JSON.parse(value(`select to_jsonb(i)::text from public.consignment_items i where id='${a.response.result.itemId}';`))
          expect(`${now} ${date}: controlled SQL bounds ${accepted?'accept':'refuse'}`,
            accepted?!!a.response&&!a.error&&a.saved.best_before_date===date
              :!!a.error&&/K2_ADMIN_PAYLOAD_INVALID/.test(a.error)&&JSON.stringify(a.before)===JSON.stringify(a.after))
        }
      }finally{sync(corrected.definition)}
      r.after=snapshot();expect(`${now}: production command restored after clock-only fixture`,
        JSON.stringify(allFunctions())===JSON.stringify(afterFunctions));save()
    }
    write('source-body-transition.json',{beforeMd5:createHash('md5').update(commandBefore.body.replaceAll('\r','')).digest('hex'),
      afterMd5:createHash('md5').update(corrected.body.replaceAll('\r','')).digest('hex')})
  }
  save();if(failures.length)throw new Error('RECEIVING_CALENDAR_PARITY_FAILED: '+failures.length)
}
