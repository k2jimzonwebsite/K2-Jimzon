import { spawn } from 'node:child_process'
import path from 'node:path'
import assert from 'node:assert/strict'

// Native psql sessions avoid a new runtime dependency. Caller pins the isolated
// loopback port/database; this helper refuses any other destination.
export async function provePrivacyConcurrency({bin,env}) {
 if(env.PGHOST!=='127.0.0.1'||env.PGPORT!=='55449'||env.PGDATABASE!=='k2_privacy_fixture')throw new Error('ISOLATED_PRIVACY_FIXTURE_REQUIRED')
 const sessions=[]
 function session(name) {
  const child=spawn(path.join(bin,'psql.exe'),['-X','-qAt','-v','ON_ERROR_STOP=1'],{env:{...env,PGAPPNAME:name},windowsHide:true,stdio:['pipe','pipe','pipe']})
  let output='';let errors='';let pending=null;let sequence=0
  child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8')
  child.stdout.on('data',text=>{output+=text;if(pending&&output.includes(pending.marker)){const {resolve,marker}=pending;pending=null;const result=output.slice(0,output.indexOf(marker));output=output.slice(output.indexOf(marker)+marker.length);resolve(result)}})
  child.stderr.on('data',text=>{errors+=text})
  child.on('error',error=>{pending?.reject(error);pending=null})
  child.on('exit',code=>{if(pending){pending.reject(new Error(errors||`PSQL_EXIT_${code}`));pending=null}})
  const result={query(sql){if(pending)throw new Error('FIXTURE_SESSION_BUSY');return new Promise((resolve,reject)=>{
   const marker=`FIXTURE_${name}_${++sequence}`;pending={marker,resolve,reject};child.stdin.write(`${sql};\nselect '${marker}';\n`)
  })},stop(){child.stdin.end();child.kill()}}
  sessions.push(result);return result
 }
 const setup=session('privacy_inspector');const writer=session('privacy_writer');const closer=session('privacy_closer')
 async function seed(number) {
  const suffix=String(number).padStart(12,'0')
  await setup.query(`insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-8000-${suffix}','fixture-${number}@example.test',now());
   insert into public.customers(id,display_name,created_source) values('20000000-0000-4000-8000-${suffix}','Synthetic fixture ${number}','website_guest');
   insert into public.customer_contact_points(id,customer_id,contact_kind,contact_value,normalized_hash,verification_status,verified_at,source)
    values('30000000-0000-4000-8000-${suffix}','20000000-0000-4000-8000-${suffix}','email','fixture-${number}@example.test',extensions.digest('fixture-${number}','sha256'),'verified',now(),'website_guest');
   insert into public.customer_accounts(user_id,customer_id,verified_contact_point_id) values('10000000-0000-4000-8000-${suffix}','20000000-0000-4000-8000-${suffix}','30000000-0000-4000-8000-${suffix}');
   insert into k2_private.customer_privacy_requests(id,user_id,customer_id,channel,receipt_hash,state,verified_at)
    values('60000000-0000-4000-8000-${suffix}','10000000-0000-4000-8000-${suffix}','20000000-0000-4000-8000-${suffix}','email',decode(repeat('e',64),'hex'),'pending',now())`)
  return suffix
 }
 async function awaitLock(name) {
  const until=Date.now()+4000
  while(Date.now()<until){const count=await setup.query(`select count(*) from pg_stat_activity where application_name='${name}' and wait_event_type='Lock'`)
   if(count.trim()==='1')return
   await new Promise(resolve=>setTimeout(resolve,20))
  }
  throw new Error(`EXPECTED_NATIVE_ROW_LOCK_${name}`)
 }
 try {
  await setup.query(`insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-8000-000000000004','race@example.test',now());
   insert into public.customers(id,display_name,created_source) values('20000000-0000-4000-8000-000000000004','Synthetic race','website_guest');
   insert into public.customer_contact_points(id,customer_id,contact_kind,contact_value,normalized_hash,verification_status,verified_at,source)
    values('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','email','race@example.test',extensions.digest('race','sha256'),'verified',now(),'website_guest');
   insert into public.customer_accounts(user_id,customer_id,verified_contact_point_id)
    values('10000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000004');
   insert into k2_private.customer_privacy_requests(id,user_id,customer_id,channel,receipt_hash,state,verified_at)
    values('60000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','email',decode(repeat('e',64),'hex'),'pending',now())`)
  await writer.query('begin')
  await writer.query(`insert into public.order_requests(public_reference,customer_id,status,payment_status) values('WEB-RACE-FIRST','20000000-0000-4000-8000-000000000004','submitted','not_requested')`)
  const closeAfterWriter=closer.query(`select k2_private.process_customer_privacy('60000000-0000-4000-8000-000000000004')`)
  await awaitLock('privacy_closer');await writer.query('commit');await closeAfterWriter
  assert.equal((await setup.query(`select state from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-000000000004'`)).trim(),'held')
  await setup.query(`update public.order_requests set status='fulfilled' where public_reference='WEB-RACE-FIRST'`)
  await closer.query('begin')
  await closer.query(`select k2_private.process_customer_privacy('60000000-0000-4000-8000-000000000004')`)
  const writeAfterClosure=writer.query(`insert into public.order_requests(public_reference,customer_id,status,payment_status) values('WEB-RACE-SECOND','20000000-0000-4000-8000-000000000004','submitted','not_requested')`).then(()=>null,error=>error)
  await awaitLock('privacy_writer');await closer.query('commit')
  const denied=await writeAfterClosure
  assert.match(String(denied),/K2_CUSTOMER_CLOSED/)
  assert.equal((await setup.query(`select count(*) from public.order_requests where public_reference='WEB-RACE-SECOND'`)).trim(),'0')
  console.log('CUSTOMER_PRIVACY_NATIVE_CONCURRENCY_PASSED: writer-first hold; closure-first stale writer denied.')
  // Regression from independent review: pause an already-authorized settings
  // save in the inner nonce insert, then attempt closure. The actor lock must
  // serialize BEFORE its tombstone check so no PII can be resurrected.
  const fifth=await seed(5);const blocker=session('privacy_nonce_blocker');const settings=session('privacy_settings_writer')
  const nonce='90000000-0000-4000-8000-000000000005'
  await blocker.query(`begin;insert into k2_private.guest_request_nonces(action,nonce,expires_at) values('account_settings_write','${nonce}',now()+interval '10 minutes')`)
  await settings.query(`select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-${fifth}',false)`)
  const payload='{"displayName":"Private fixture name","deliveryAddress":"Private fixture address","notifyInApp":true}'
  const save=settings.query(`with p as (select extract(epoch from clock_timestamp())::bigint ts) select public.save_customer_account_settings_v1(ts,'${nonce}','${payload}',repeat('a',64),k2_test.signature('account_settings_write',ts,'${nonce}','${payload}',repeat('a',64))) from p`)
  await awaitLock('privacy_settings_writer')
  const closingSettings=closer.query(`select k2_private.process_customer_privacy('60000000-0000-4000-8000-${fifth}')`)
  await awaitLock('privacy_closer');await blocker.query('rollback');await save;await closingSettings
  assert.equal((await setup.query(`select count(*) from k2_private.customer_account_settings where user_id='10000000-0000-4000-8000-${fifth}'`)).trim(),'0')
  console.log('CUSTOMER_PRIVACY_IN_FLIGHT_SETTINGS_REGRESSION_PASSED')
  for(const [number,kind] of [[6,'workflow'],[7,'event'],[8,'hold'],[9,'payment']]) {
   const suffix=await seed(number);const caseWriter=session(`privacy_case_${number}`)
   if(kind==='workflow'||kind==='event')await setup.query(`insert into public.conversations(id,customer_id,customer_name,platform,status,source_kind) values('70000000-0000-4000-8000-${suffix}','20000000-0000-4000-8000-${suffix}','Private inquiry','Website','${kind==='workflow'?'Resolved':'Open'}','website_message');insert into public.messages(conversation_id,sender_type,content,delivery_status) values('70000000-0000-4000-8000-${suffix}','Customer','private case body','received')`)
   if(kind==='payment')await setup.query(`insert into public.order_requests(public_reference,customer_id,status,payment_status) values('WEB-RACE-PAYMENT','20000000-0000-4000-8000-${suffix}','fulfilled','not_requested')`)
   await caseWriter.query('begin')
   if(kind==='workflow')await caseWriter.query(`update public.conversations set status='Open' where id='70000000-0000-4000-8000-${suffix}'`)
   if(kind==='workflow'||kind==='event')await caseWriter.query(`insert into public.conversation_events(conversation_id,event_type,reason) values('70000000-0000-4000-8000-${suffix}','workflow_updated','Reopen refund dispute')`)
   if(kind==='hold')await caseWriter.query(`insert into k2_private.customer_privacy_holds(customer_id,kind,reason,created_by) values('20000000-0000-4000-8000-${suffix}','dispute','Synthetic active dispute','10000000-0000-4000-8000-000000000002')`)
   if(kind==='payment')await caseWriter.query(`update public.order_requests set payment_status='evidence_submitted' where public_reference='WEB-RACE-PAYMENT'`)
   const closingCase=closer.query(`select k2_private.process_customer_privacy('60000000-0000-4000-8000-${suffix}')`)
   await awaitLock('privacy_closer');await caseWriter.query('commit');await closingCase
   assert.equal((await setup.query(`select state from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-${suffix}'`)).trim(),'held',`Concurrent ${kind} must hold closure`)
   if(kind==='workflow'||kind==='event')assert.equal((await setup.query(`select content from public.messages where conversation_id='70000000-0000-4000-8000-${suffix}'`)).trim(),'private case body')
  }
  console.log('CUSTOMER_PRIVACY_CONCURRENT_CASE_SOURCES_PASSED: workflow,event,hold,payment')
  // The actual signed Admin command and automatic closure serialize in both orders.
  const adminId='11000000-0000-4000-8000-000000000011'
  await setup.query(`insert into auth.users(id,email,email_confirmed_at) values('${adminId}','fixture-admin@example.test',now());
   insert into public.user_profiles(id,role) values('${adminId}','Admin');
   create function k2_test.concurrent_admin_hold(request_id uuid) returns jsonb language plpgsql as $body$
   declare action text:='customer_privacy_review';ts bigint:=extract(epoch from clock_timestamp())::bigint;nonce uuid:=gen_random_uuid();key uuid:=gen_random_uuid();
    txt text:=jsonb_build_object('requestId',request_id,'action','add_hold','kind','dispute','reason','Concurrent dispute review')::text; sig text;
   begin
    select encode(extensions.hmac(convert_to(action||E'\\n'||ts||E'\\n'||nonce||E'\\n'||auth.uid()||E'\\n'||key||E'\\n'||encode(extensions.digest(convert_to(txt,'UTF8'),'sha256'),'hex'),'UTF8'),request_secret,'sha256'),'hex') into sig from k2_private.admin_bff_secrets where singleton=true;
    return public.review_admin_customer_privacy_v1(action,ts,nonce,key,txt,sig);
   end $body$`)
  const staff=session('privacy_admin_writer')
  await staff.query(`select set_config('request.jwt.claim.sub','${adminId}',false);select set_config('request.jwt.claims','{"role":"authenticated","is_staff":true,"aal":"aal2"}',false)`)
  const first=await seed(10)
  await setup.query(`update k2_private.customer_privacy_requests set assigned_to='${adminId}' where id='60000000-0000-4000-8000-${first}'`)
  await staff.query('begin')
  await staff.query(`select k2_test.concurrent_admin_hold('60000000-0000-4000-8000-${first}')`)
  const afterAdmin=closer.query(`select k2_private.process_customer_privacy('60000000-0000-4000-8000-${first}')`)
  await awaitLock('privacy_closer');await staff.query('commit');await afterAdmin
  assert.equal((await setup.query(`select state from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-${first}'`)).trim(),'held')
  const second=await seed(11)
  await setup.query(`update k2_private.customer_privacy_requests set assigned_to='${adminId}' where id='60000000-0000-4000-8000-${second}'`)
  await closer.query('begin');await closer.query(`select k2_private.process_customer_privacy('60000000-0000-4000-8000-${second}')`)
  const afterClose=staff.query(`select k2_test.concurrent_admin_hold('60000000-0000-4000-8000-${second}')`).then(()=>null,error=>error)
  await awaitLock('privacy_admin_writer');await closer.query('commit')
  assert.match(String(await afterClose),/K2_PRIVACY_STATE_CONFLICT/)
  assert.equal((await setup.query(`select count(*) from k2_private.customer_privacy_holds where customer_id='20000000-0000-4000-8000-${second}'`)).trim(),'0')
  console.log('CUSTOMER_PRIVACY_SIGNED_ADMIN_CLOSURE_RACES_PASSED')
  // A long-running operation for one customer must not starve another verified
  // request forever. Keep the oldest actor locked through two worker ticks.
  await setup.query("update k2_private.customer_privacy_requests set updated_at=clock_timestamp()+interval '1 day' where state in ('pending','held')")
  const blocked=await seed(12);const ready=await seed(13);const blocker2=session('privacy_blocked_actor');const worker=session('privacy_worker_fairness')
  await blocker2.query(`begin;select pg_advisory_xact_lock(hashtextextended('account-claim-user:10000000-0000-4000-8000-${blocked}',0))`)
  await worker.query(`select set_config('request.jwt.claims','{"role":"service_role"}',false)`)
  await worker.query("select public.customer_privacy_worker_v1('tick','{}')")
  await worker.query("select public.customer_privacy_worker_v1('tick','{}')")
  assert.equal((await setup.query(`select state from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-${ready}'`)).trim(),'closed','A locked request must not starve an unrelated eligible customer')
  await blocker2.query('rollback')
  await setup.query(`update k2_private.customer_privacy_worker_cooldowns set retry_after=clock_timestamp()-interval '1 second' where request_id='60000000-0000-4000-8000-${blocked}'`)
  await worker.query("select public.customer_privacy_worker_v1('tick','{}')")
  assert.equal((await setup.query(`select state from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-${blocked}'`)).trim(),'closed','The original request must resume after its cooldown')
  assert.equal((await setup.query(`select count(*) from k2_private.customer_privacy_worker_cooldowns where request_id='60000000-0000-4000-8000-${blocked}'`)).trim(),'0')
  const rowBlocked=await seed(14);const rowReady=await seed(15);const rowLocker=session('privacy_locked_request')
  await rowLocker.query(`begin;select id from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-${rowBlocked}' for update`)
  await worker.query("select public.customer_privacy_worker_v1('tick','{}')")
  await worker.query("select public.customer_privacy_worker_v1('tick','{}')")
  assert.equal((await setup.query(`select state from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-${rowReady}'`)).trim(),'closed','A locked request row must not prevent another request from closing')
  await rowLocker.query('rollback')
  await setup.query(`update k2_private.customer_privacy_worker_cooldowns set retry_after=clock_timestamp()-interval '1 second' where request_id='60000000-0000-4000-8000-${rowBlocked}'`)
  await worker.query("select public.customer_privacy_worker_v1('tick','{}')")
  assert.equal((await setup.query(`select state from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-${rowBlocked}'`)).trim(),'closed','A row-locked request must resume after release')
  // Simulate repeated scheduler cycles with five permanently blocked requests.
  // Even when every cooldown has already expired, their last-attempt order
  // must let an older unattempted ready request advance.
  await setup.query("update k2_private.customer_privacy_requests set updated_at=clock_timestamp()+interval '1 day' where state in ('pending','held')")
  const busy=[]
  for(let number=16;number<=20;number++) {
   const suffix=await seed(number);const holder=session(`privacy_busy_${number}`)
   await holder.query(`begin;select pg_advisory_xact_lock(hashtextextended('account-claim-user:10000000-0000-4000-8000-${suffix}',0))`)
   busy.push(holder)
  }
  const next=await seed(21)
  for(let attempt=0;attempt<6;attempt++) {
   await setup.query("update k2_private.customer_privacy_worker_cooldowns set retry_after=clock_timestamp()-interval '1 second'")
   await worker.query("select public.customer_privacy_worker_v1('tick','{}')")
  }
  assert.equal((await setup.query(`select state from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-${next}'`)).trim(),'closed','Expired cooldowns must not starve an unattempted request')
  for(const holder of busy)await holder.query('rollback')
  // A lock timeout followed by a different persistent error must also move
  // behind unrelated work; stale cooldown metadata cannot keep it first.
  await setup.query("update k2_private.customer_privacy_requests set updated_at=clock_timestamp()+interval '1 day' where state in ('pending','held');delete from k2_private.customer_privacy_worker_cooldowns")
  const poison=await seed(22);const independent=await seed(23);const poisonLock=session('privacy_poison_actor')
  await setup.query(`update k2_private.customer_privacy_requests set updated_at=clock_timestamp()+interval '1 day' where id='60000000-0000-4000-8000-${independent}'`)
  await setup.query(`create function k2_test.fail_poison_closure() returns trigger language plpgsql as $body$ begin
   if new.id='20000000-0000-4000-8000-${poison}' and new.status='deleted' then raise exception 'SYNTHETIC_PROCESSING_FAILURE';end if;return new;end $body$;
   create trigger fixture_fail_poison before update of status on public.customers for each row execute function k2_test.fail_poison_closure()`)
  await poisonLock.query(`begin;select pg_advisory_xact_lock(hashtextextended('account-claim-user:10000000-0000-4000-8000-${poison}',0))`)
  await worker.query("select public.customer_privacy_worker_v1('tick','{}')")
  await poisonLock.query('rollback')
  const priorAttempt=(await setup.query(`select last_attempted::text from k2_private.customer_privacy_worker_cooldowns where request_id='60000000-0000-4000-8000-${poison}'`)).trim()
  await setup.query(`update k2_private.customer_privacy_worker_cooldowns set retry_after=clock_timestamp()-interval '1 second' where request_id='60000000-0000-4000-8000-${poison}'`)
  await worker.query("select public.customer_privacy_worker_v1('tick','{}')")
  assert.equal((await setup.query(`select reasons::text from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-${poison}'`)).trim(),'{processing_review}')
  await setup.query(`update k2_private.customer_privacy_requests set updated_at='${priorAttempt}'::timestamptz+interval '1 microsecond' where id='60000000-0000-4000-8000-${independent}'`)
  await worker.query("select public.customer_privacy_worker_v1('tick','{}')")
  assert.equal((await setup.query(`select state from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-${independent}'`)).trim(),'closed','Processing errors after a lock timeout must not starve other requests')
  await setup.query('drop trigger fixture_fail_poison on public.customers;drop function k2_test.fail_poison_closure()')
  console.log('CUSTOMER_PRIVACY_WORKER_LOCK_FAIRNESS_PASSED')
 }finally{sessions.forEach(item=>item.stop())}
}
