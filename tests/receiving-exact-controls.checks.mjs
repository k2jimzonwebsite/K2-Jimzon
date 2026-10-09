import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const source=fs.readFileSync(new URL('../scripts/rehearse-current-receiving.mjs',import.meta.url),'utf8')
const start=source.indexOf('const permittedRetry='),end=source.indexOf('const expect=',start)
assert.ok(start>0&&end>start)
const permittedRetry=vm.runInNewContext(source.slice(start,end)+';permittedRetry',{same:(a,b)=>JSON.stringify(a)===JSON.stringify(b)})
const bs=source.indexOf('const business='),be=source.indexOf('const reports=',bs)
const business=vm.runInNewContext(source.slice(bs,be)+';business')
const actor='42000000-0000-4000-8000-000000000010'
const oldTime='2026-10-03T05:00:00+00:00',time='2026-10-03T05:01:10+00:00',bucket='2026-10-03T05:01:00+00:00'
const args={p_action:'consignment_finalize',p_nonce:'00000000-0000-4000-8000-000000000001',p_timestamp:1791003670}
function fixture(existing=false) {
  const a={observedNow:'2026-10-03T05:01:09+00:00',observedBucket:bucket,
    nonces:[{actor_id:actor,action:'consignment_scan',nonce:'00000000-0000-4000-8000-000000000099',used_at:oldTime,expires_at:'2026-10-03T05:10:00+00:00'}],
    rates:[{scope:'actor',subject:'unrelated',bucket_start:oldTime,hit_count:5}]}
  const own=[{scope:'actor',subject:actor,bucket_start:bucket,hit_count:existing?4:1},{scope:'global',subject:'all_admin_requests',bucket_start:bucket,hit_count:existing?8:1}]
  if(existing)a.rates.push(...own.map(r=>({...r,hit_count:r.hit_count-1})))
  const b={observedNow:'2026-10-03T05:01:11+00:00',observedBucket:bucket,nonces:[...structuredClone(a.nonces),{actor_id:actor,action:args.p_action,nonce:args.p_nonce,used_at:time,expires_at:'2026-10-03T05:11:10+00:00'}],rates:[structuredClone(a.rates[0]),...own]}
  return {a,b}
}
for(const existing of [false,true])test('exact own signed retry accepts '+(existing?'existing':'new')+' rate buckets',()=>{
  const {a,b}=fixture(existing);assert.equal(permittedRetry(a,b,actor,args),true)
})
const mutations=[
  ['wrong nonce UUID',b=>{b.nonces[1].nonce='ffffffff-ffff-4fff-8fff-ffffffffffff'}],
  ['wrong nonce actor',b=>{b.nonces[1].actor_id='unrelated'}],
  ['wrong nonce action',b=>{b.nonces[1].action='consignment_scan'}],
  ['ancient one-second nonce',b=>{b.nonces[1].used_at='2000-01-01T00:00:00Z';b.nonces[1].expires_at='2000-01-01T00:00:01Z'}],
  ['future nonce',b=>{b.nonces[1].used_at='2026-10-03T05:02:00Z'}],
  ['wrong TTL',b=>{b.nonces[1].expires_at='2026-10-03T05:11:11Z'}],
  ['extra nonce metadata',b=>{b.nonces[1].extra=true}],
  ['unrelated nonce mutation',b=>{b.nonces[0].used_at=time}],
  ['extra zero-hit rate',b=>{b.rates.push({...b.rates[0],subject:'extra',hit_count:0})}],
  ['unrelated rate metadata',b=>{b.rates[0].updated_at=time}],
  ['extra own rate metadata',b=>{b.rates[1].updated_at=time}],
  ['wrong bucket',b=>{b.rates[1].bucket_start=oldTime;b.rates[2].bucket_start=oldTime}],
  ['mismatched buckets',b=>{b.rates[2].bucket_start=oldTime}],
  ['wrong global subject',b=>{b.rates[2].subject='wrong'}],
  ['wrong rate delta',b=>{b.rates[1].hit_count=2}],
  ['missing unrelated rate',b=>{b.rates.shift()}]
]
for(const [name,mutate] of mutations)test(name+' refuses',()=>{const {a,b}=fixture();mutate(b);assert.equal(permittedRetry(a,b,actor,args),false)})
test('missing actual signed args refuses',()=>{const {a,b}=fixture();assert.equal(permittedRetry(a,b,actor),false)})
test('wrong signed timestamp refuses',()=>{const {a,b}=fixture();assert.equal(permittedRetry(a,b,actor,{...args,p_timestamp:0}),false)})
test('admin-only business map retains both guest control hashes',()=>{
  const a={'public.products':'stock','k2_private.admin_request_nonces':'admin-nonce','k2_private.admin_request_rate_buckets':'admin-rate','k2_private.guest_request_nonces':'guest-nonce','k2_private.guest_rate_buckets':'guest-rate'}
  const out=business(a)
  assert.equal(out['k2_private.guest_request_nonces'],'guest-nonce');assert.equal(out['k2_private.guest_rate_buckets'],'guest-rate')
  assert.equal('k2_private.admin_request_nonces' in out,false);assert.equal('k2_private.admin_request_rate_buckets' in out,false)
})

const adminStart=source.indexOf('const admin='),adminEnd=source.indexOf('let ordinal=',adminStart)
const actualAdmin=source.slice(adminStart,adminEnd)
for(const [label,needle,actorName] of [['historical','current.beforeRetryControls=controls();current.signedRetry={}','historical'],['explicit','const beforeRetry=snapshot();current.beforeRetryControls=controls()','f'],['recovery','current.beforeRetryHashes=snapshot();current.beforeRetryControls=controls()','multi']])test(label+' report captures the actual signed retry args',()=>{
  const offset=source.indexOf(needle);assert.ok(offset>0)
  const chunk=source.slice(offset,source.indexOf('check(',offset))
  const current={retryPayload:{consignmentId:'fixture'}}
  vm.runInNewContext(actualAdmin+';'+chunk,{current,historical:{actor},f:{actor},multi:{actor},key:'key',newKey:'key',payload:{},supplied:{},zone:'Asia/Manila',randomUUID:()=>args.p_nonce,
    signedAdminCommandArguments:()=>structuredClone(args),literal:x=>JSON.stringify(x),value:()=>'{}',controls:()=>({}),snapshot:()=>({})})
  assert.deepEqual(current.signedRetry.args,args);assert.equal(current.signedRetry.actor,actor)
})
