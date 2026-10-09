// Synthetic provider auth, actual protected handler/HMAC/SQL on the owned clone.
import fs from 'node:fs'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {withConsignmentHandler} from '../tests/fixtures/consignment-handler-harness.mjs'
import {signedAdminCommandArguments} from '../server/admin-bff/security.js'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
const harnessBytes=fs.readFileSync(new URL('../tests/fixtures/consignment-handler-harness.mjs',import.meta.url))
export const receivingRetryWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export async function rehearseReceivingRetry({sync,value,check,fixture,literal,evidence,beforeReceivingRetryFix}) {
  const write=(name,data)=>fs.writeFileSync(path.join(evidence,name),JSON.stringify(data,null,2)+'\n')
  fs.writeFileSync(path.join(evidence,'executed-retry-module.mjs'),bytes)
  fs.writeFileSync(path.join(evidence,'executed-handler-harness.mjs'),harnessBytes)
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
  const controls=()=>JSON.parse(value(`select jsonb_build_object('observedNow',clock_timestamp(),
    'observedBucket',date_trunc('minute',clock_timestamp()),'nonces',
    (select coalesce(jsonb_agg(to_jsonb(n) order by actor_id,action,nonce),'[]') from k2_private.admin_request_nonces n),
    'rates',(select coalesce(jsonb_agg(to_jsonb(b) order by scope,subject,bucket_start),'[]') from k2_private.admin_request_rate_buckets b))::text;`))
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
  const business=s=>Object.fromEntries(Object.entries(s).filter(([t])=>
    !['k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets'].includes(t)))
  const exactRetry=(a,b,actor,args)=>{
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
  const signature='public.execute_admin_consignment_command_v1(text,bigint,uuid,uuid,text,text)'
  const beforeFunctions=allFunctions(),command=beforeFunctions.find(f=>f.signature===signature.replace('public.',''))
    ||beforeFunctions.find(f=>f.catalog.proname==='execute_admin_consignment_command_v1')
  write('retry-functions-before.json',beforeFunctions)
  check('Retry witness starts with the exact prepared receiving calendar command',
    createHash('md5').update(command.body).digest('hex')==='623e5ab404618196ac98a043134d7071')
  const sqlCommand=(args,actor)=>{
    try{return {data:JSON.parse(value(`select set_config('request.jwt.claim.sub',${literal(actor)},false);
      select set_config('request.jwt.claims','{"aal":"aal2"}',false);set time zone 'Asia/Manila';set role authenticated;
      select public.execute_admin_consignment_command_v1(${['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature']
        .map(k=>literal(args[k])).join(',')})::text;`))}}
    catch(e){return {error:e.message}}
  }
  const actor='42000000-0000-4000-8000-000000000097',other='42000000-0000-4000-8000-000000000098'
  for(const id of [actor,other])sync(`insert into auth.users(id) values('${id}');
    insert into public.user_profiles(id,role) values('${id}','Admin') on conflict(id) do update set role=excluded.role;`)
  const clock=JSON.parse(value(`select jsonb_build_object('today',(transaction_timestamp() at time zone 'Asia/Manila')::date,
    'maximum',make_date(extract(year from transaction_timestamp() at time zone 'Asia/Manila')::integer+10,
    extract(month from transaction_timestamp() at time zone 'Asia/Manila')::integer,1)
    +extract(day from transaction_timestamp() at time zone 'Asia/Manila')::integer-1)::text;`))
  write('retry-clock.json',{...clock,scope:'Actual seed clock; subsequent BFF constructor and SQL v_today clocks are controlled, signing/session clocks remain actual'})
  const f=fixture('retry-'+randomUUID().slice(0,8),3)
  const manifest=sqlCommand(signedAdminCommandArguments('consignment_create',actor,randomUUID(),
    {manifestCode:'RETRY-'+randomUUID().slice(0,8),shipmentReference:'Synthetic BFF retry'}),actor)
  if(manifest.error)throw Error(manifest.error)
  const payload=date=>({consignmentId:manifest.data.consignmentId,sku:f.sku,batchCode:'RETRY-'+randomUUID().slice(0,8),
    boxCode:'RETRY-'+randomUUID().slice(0,8),bestBeforeDate:date,expectedQty:1})
  let handler
  if(beforeReceivingRetryFix) {
    const original=fs.readFileSync(new URL('../docs/evidence/20261003-receiving-retry/source-before-consignments.js',import.meta.url),'utf8')
    const compiled=original.replace("from './authorize.js'",()=>`from '${new URL('../server/admin-bff/authorize.js',import.meta.url).href}'`)
      .replace("from './security.js'",()=>`from '${new URL('../server/admin-bff/security.js',import.meta.url).href}'`)
    fs.writeFileSync(path.join(evidence,'executed-before-handler.js'),compiled)
    const module=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))
    handler=(req,res)=>module.handleConsignmentCommand(req,res,'consignment_add_line')
  }
  const reports=[],failures=[],expect=(name,ok)=>{try{check(name,ok)}catch(e){failures.push(e.message)}}
  const save=()=>write('retry-parity.json',{idea:'IDEA-20261002-10',synthetic:true,providerWrites:false,
    beforeReceivingRetryFix,clock,reports,failures,authScope:'Synthetic HTTP auth/profile/session-registry responses; actual cookie/CSRF/staff/AAL2/session/signing code and owned-clone consignment SQL'})
  const requestSecret=Buffer.from(process.env.K2_ADMIN_BFF_REQUEST_SECRET,'base64')
  const baseline=snapshot()
  try {
    for(const [label,date,offset] of [['lower',clock.today,1],['upper',clock.maximum,-1]]) {
      const body=payload(date),key=randomUUID(),record={case:label,body,key,seedBefore:snapshot()}
      reports.push(record)
      await withConsignmentHandler({actor,requestSecret,command:sqlCommand,handler},async h=>{
        record.seed=await h.invoke(body,{key,date:clock.today});record.seedAfter=snapshot()
        expect(`${label}: actual protected handler creates a fresh durable line at the current boundary`,record.seed.status===200)
        if(record.seed.status!==200){save();return}
        record.item=JSON.parse(value(`select to_jsonb(i)::text from public.consignment_items i where id=${literal(record.seed.body.result.itemId)};`))
        record.seedSigned=h.commandCalls()[0].body
        record.receipt=JSON.parse(value(`select to_jsonb(r)::text from k2_private.admin_command_receipts r
          where actor_id=${literal(actor)} and action='consignment_add_line' and idempotency_key=${literal(key)};`))
        expect(`${label}: actual saved item and durable receipt bind exact normalized payload and actor/key`,
          record.item.best_before_date===date&&record.item.expected_qty===body.expectedQty
          &&record.item.consignment_id===body.consignmentId&&record.seedSigned.p_payload_text===JSON.stringify(body)
          &&record.receipt.payload_hash===createHash('sha256').update(record.seedSigned.p_payload_text).digest('hex')
          &&same(record.receipt.result,record.seed.body.result))
        record.shift=value(`select (${literal(clock.today)}::date+${offset})::text;`)
        const declaration="v_today date := (transaction_timestamp() at time zone 'Asia/Manila')::date;"
        if(command.body.split(declaration).length!==2)throw Error('CLOCK_SUBSTITUTION_SCOPE_INVALID')
        const alteredBody=command.body.replace(declaration,()=>`v_today date := ${literal(record.shift)}::date;`)
        const alteredDefinition=command.definition.replace(command.body,()=>alteredBody)
        record.controlledDefinition=alteredDefinition
        sync(alteredDefinition+';')
        try {
          record.before=snapshot();record.controlsBefore=controls()
          const count=h.commandCalls().length
          record.retry=await h.invoke(body,{key,date:record.shift})
          record.signedRetry=h.commandCalls()[count]?.body;record.after=snapshot();record.controlsAfter=controls()
          expect(`${label}: historical exact receipt reaches signed SQL and returns its original line`,
            record.retry.status===200&&same(record.retry.body,record.seed.body)
            &&record.signedRetry?.p_payload_text===JSON.stringify(body))
          expect(`${label}: retry preserves business rows and consumes exactly its own fresh nonce and actor/global hits`,
            same(business(record.before),business(record.after))&&exactRetry(record.controlsBefore,record.controlsAfter,actor,record.signedRetry))
          record.refusals=[]
          for(const [name,p,k,status,code] of [['fresh stale date',body,randomUUID(),400,'REQUEST_INVALID'],
            ['same-key changed quantity',{...body,expectedQty:2},key,409,'IDEMPOTENCY_CONFLICT'],
            ['malformed retry',{...body,bestBeforeDate:'2028-02-30'},key,400,'REQUEST_INVALID'],
            ['malformed zero year',{...body,bestBeforeDate:'0000-01-01'},key,400,'REQUEST_INVALID']]) {
            const r={case:name,before:snapshot(),commandsBefore:h.commandCalls().length}
            record.refusals.push(r);r.response=await h.invoke(p,{key:k,date:record.shift})
            r.after=snapshot();r.commandsAfter=h.commandCalls().length
            expect(`${label}: ${name} refuses atomically with safe HTTP status`,r.response.status===status
              &&r.response.body.error?.code===code&&same(r.before,r.after)
              &&r.commandsAfter-r.commandsBefore===(name.startsWith('malformed')?0:1))
          }
          await withConsignmentHandler({actor:other,requestSecret,command:sqlCommand,handler},async outsider=>{
            record.otherActor={before:snapshot(),response:await outsider.invoke(body,{key,date:record.shift}),after:snapshot(),
              commandCount:outsider.commandCalls().length}
            expect(`${label}: another actor cannot obtain the original receipt`,record.otherActor.response.status===400
              &&record.otherActor.response.body.error?.code==='REQUEST_INVALID'&&same(record.otherActor.before,record.otherActor.after)
              &&record.otherActor.commandCount===1)
          })
          record.denied={before:snapshot(),commandsBefore:h.commandCalls().length,
            response:await h.invoke(body,{key,date:record.shift,headers:{'x-k2-csrf':'invalid'}}),
            after:snapshot(),commandsAfter:h.commandCalls().length}
          expect(`${label}: protected retry retains CSRF authorization before SQL`,record.denied.response.status===403
            &&record.denied.response.body.error?.code==='CSRF_DENIED'&&same(record.denied.before,record.denied.after)
            &&record.denied.commandsBefore===record.denied.commandsAfter)
        }finally{sync(command.definition+';')}
        save()
      })
    }
  }finally {
    sync(command.definition+';')
    const afterFunctions=allFunctions();write('retry-functions-after.json',afterFunctions)
    expect('Controlled retry clocks restore every complete function catalog, body and grant',same(beforeFunctions,afterFunctions))
    const after=snapshot();write('retry-state.json',{before:baseline,after})
    expect('BFF add-line retry never changes stock, holds, products or publication',
      ['public.products','public.product_batches','public.inventory_balances','public.inventory_reservations','public.channel_listings']
        .every(t=>baseline[t]===after[t]))
    save()
  }
  if(failures.length)throw Error('RECEIVING_RETRY_PARITY_FAILED: '+failures.length)
}
