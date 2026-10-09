import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const source=fs.readFileSync(new URL('../scripts/rehearse-current-release-concurrency.mjs',import.meta.url),'utf8')
function helper(name,next){const start=source.indexOf('const '+name+'='),end=source.indexOf('const '+next+'=',start);return start<0?undefined:vm.runInNewContext(source.slice(start,end)+';'+name,{same:(a,b)=>JSON.stringify(a)===JSON.stringify(b)})}
const exactGuest=helper('exactGuest','exactReplay')
let exactReplay=helper('exactReplay','reports')
if(!exactReplay){const start=source.indexOf('check(`${phase}/${first} release and fresh-signature purchase retries'),end=source.indexOf('// A second-SKU',start);assert.ok(start>0&&end>start);const code=source.slice(start,end);exactReplay=(original,replay)=>{let result;vm.runInNewContext(code,{phase:'cancel',first:'release',report:{replayBusinessUnchanged:true,buyerReplayResult:replay,releaseReplayResult:{status:'cancelled'}},check:(_name,passed)=>{result=passed}});return result}}
const actorTime='2026-10-03T05:00:00Z',time='2026-10-03T05:01:00Z',after='2026-10-03T05:02:00Z'
const command={args:{p_timestamp:1791003660,p_nonce:'00000000-0000-4000-8000-000000000001',p_ip_hash:'a'.repeat(64)},contactHash:'b'.repeat(64)}
function controls(){const old={action:'guest_read',dimension:'ip',subject_hash:'\\x'+'c'.repeat(64),bucket_start:actorTime,window_seconds:60,hit_count:1,updated_at:actorTime};return {a:{observedNow:actorTime,nonces:[],rates:[old]},b:{observedNow:after,nonces:[{action:'order',nonce:command.args.p_nonce,used_at:time,expires_at:'2026-10-03T05:11:00Z'}],rates:[structuredClone(old),...[['ip',command.args.p_ip_hash,900],['contact',command.contactHash,3600]].map(([dimension,hash,window_seconds])=>({action:'order',dimension,subject_hash:'\\x'+hash,bucket_start:actorTime,window_seconds,hit_count:1,updated_at:time}))]}}}
const original={ok:true,error_code:null,status:'submitted',subtotal:200,total_amount:295,discount_amount:0,created_at:'2026-10-03T05:01:00Z',delivery_status:'awaiting_quote',public_reference:'WEB-EXACT',guest_grant_token:'d'.repeat(64),retry_after_seconds:0,shipping_quote_status:'customer_confirmed'}
const replay=()=>({...original,guest_grant_token:null})
test('durable public result replay accepts only one-time grant omission',()=>assert.equal(exactReplay(original,replay()),true))
for(const field of Object.keys(original).filter(k=>k!=='guest_grant_token'))test('changed durable '+field+' refuses',()=>{const b=replay();b[field]=field==='ok'?false:field==='error_code'?'ERROR':typeof b[field]==='number'?b[field]+1:'changed';assert.equal(exactReplay(original,b),false)})
test('extra public result field refuses',()=>assert.equal(exactReplay(original,{...replay(),extra:true}),false))
test('missing public result field refuses',()=>{const b=replay();delete b.public_reference;assert.equal(exactReplay(original,b),false)})
test('unexpected replay grant token refuses',()=>assert.equal(exactReplay(original,{...replay(),guest_grant_token:'d'.repeat(64)}),false))
test('exact guest controls helper must be present',()=>assert.equal(typeof exactGuest,'function'))
for(const [name,mutate] of [
  ['own exact',()=>{},true],
  ['wrong nonce',b=>{b.nonces[0].nonce='wrong'}],
  ['wrong action',b=>{b.nonces[0].action='guest_read'}],
  ['ancient time',b=>{b.nonces[0].used_at='2000-01-01T00:00:00Z'}],
  ['wrong TTL',b=>{b.nonces[0].expires_at='2026-10-03T05:11:01Z'}],
  ['extra nonce metadata',b=>{b.nonces[0].extra=true}],
  ['extra zero-hit rate',b=>{b.rates.push({...b.rates[0],subject_hash:'\\x'+'e'.repeat(64),hit_count:0})}],
  ['unrelated timestamp',b=>{b.rates[0].updated_at=time}],
  ['wrong IP',b=>{b.rates[1].subject_hash='\\x'+'e'.repeat(64)}],
  ['wrong contact',b=>{b.rates[2].subject_hash='\\x'+'e'.repeat(64)}],
  ['wrong bucket',b=>{b.rates[1].bucket_start=time}],
  ['wrong window',b=>{b.rates[1].window_seconds=60}],
  ['wrong delta',b=>{b.rates[1].hit_count=2}],
  ['extra rate metadata',b=>{b.rates[1].extra=true}]
])test(name+' guest controls',()=>{assert.equal(typeof exactGuest,'function');const {a,b}=controls();mutate(b);assert.equal(exactGuest(a,b,command),name==='own exact')})

test('signed guest builder exposes one exact call for both transaction and replay',()=>{
  const start=source.indexOf('const guest='),end=source.indexOf('const exactGuest=',start)
  const args={...command.args,p_payload_text:'{}',p_signature:'f'.repeat(64)}
  const guest=vm.runInNewContext(source.slice(start,end)+';guest',{signedRpcArguments:()=>args,value:()=>'b'.repeat(64),literal:x=>JSON.stringify(x)})
  const result=guest({},'192.0.2.1')
  assert.equal(typeof result.call,'string');assert.ok(result.call.startsWith('public.submit_guest_order_v1('))
  assert.ok(result.sql.includes(' from '+result.call+' r;'));assert.deepEqual(result.args,args)
})

test('guest replay business map retains Admin controls',()=>{
  const start=source.indexOf('const business='),end=source.indexOf('const same=',start)
  const business=vm.runInNewContext(source.slice(start,end)+';business')
  const map={'public.products':'stock','k2_private.admin_request_nonces':'admin-nonce','k2_private.admin_request_rate_buckets':'admin-rate','k2_private.guest_request_nonces':'guest-nonce','k2_private.guest_rate_buckets':'guest-rate'}
  const result=business(map);assert.equal(result['k2_private.admin_request_nonces'],'admin-nonce');assert.equal(result['k2_private.admin_request_rate_buckets'],'admin-rate');assert.equal('k2_private.guest_request_nonces' in result,false)
})
test('own existing guest rate buckets accept exactly one hit and timestamp change',()=>{
  const {a,b}=controls();a.rates.push(...b.rates.slice(1).map(r=>({...r,hit_count:5,updated_at:actorTime})));b.rates.slice(1).forEach(r=>{r.hit_count=6});assert.equal(exactGuest(a,b,command),true)
})
test('wrong signing time refuses',()=>{const {a,b}=controls();assert.equal(exactGuest(a,b,{...command,args:{...command.args,p_timestamp:0}}),false)})
test('missing command refuses',()=>{const {a,b}=controls();assert.equal(exactGuest(a,b),false)})

test('recovered release replay archives both exact hash maps',()=>{
  const old=source.indexOf('const recoveredBeforeReplay=whole()'),fresh=source.indexOf('report.recoveryReplay={beforeHashes:whole()}')
  const start=fresh>=0?fresh:old,end=source.indexOf('}catch(error)',start)
  assert.ok(start>0&&end>start)
  const report={recoveryResult:{id:'order',status:'cancelled'}}
  vm.runInNewContext(source.slice(start,end),{report,phase:'cancel',first:'release',whole:()=>({'public.products':'stock'}),sync:()=>{},value:()=>'{}',recoverySql:'fixture',same:(a,b)=>JSON.stringify(a)===JSON.stringify(b),check:()=>{}})
  assert.deepEqual(report.recoveryReplay.beforeHashes,{'public.products':'stock'});assert.deepEqual(report.recoveryReplay.afterHashes,report.recoveryReplay.beforeHashes)
})

test('identical durable result accepts SQL JSON field ordering differences',()=>{
  const reordered=Object.fromEntries(Object.entries(replay()).reverse());assert.equal(exactReplay(original,reordered),true)
})
