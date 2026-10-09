import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const source=fs.readFileSync(new URL('../scripts/rehearse-receiving-purchase.mjs',import.meta.url),'utf8')
const start=source.indexOf('const exactGuest='),end=source.indexOf('const admin=',start)
assert.ok(start>0&&end>start)
const exactGuest=vm.runInNewContext(source.slice(start,end)+';exactGuest',{same:(a,b)=>JSON.stringify(a)===JSON.stringify(b)})
const oldTime='2026-10-03T05:00:00Z',time='2026-10-03T05:01:00Z',afterTime='2026-10-03T05:02:00Z'
const command={args:{p_nonce:'00000000-0000-4000-8000-000000000001',p_ip_hash:'a'.repeat(64)},contactHash:'b'.repeat(64)}
function fixture() {
  const old={action:'guest_read',dimension:'ip',subject_hash:'\\x'+'c'.repeat(64),bucket_start:oldTime,window_seconds:60,hit_count:1,updated_at:oldTime}
  const a={observedNow:oldTime,nonces:[],rates:[old]}
  const b={observedNow:afterTime,nonces:[{action:'order',nonce:command.args.p_nonce,used_at:time,expires_at:'2026-10-03T05:11:00Z'}],rates:[structuredClone(old),
    ...[['ip',command.args.p_ip_hash,900],['contact',command.contactHash,3600]].map(([dimension,hash,window_seconds])=>({
      action:'order',dimension,subject_hash:'\\x'+hash,bucket_start:oldTime,window_seconds,hit_count:1,updated_at:time}))]}
  return {a,b}
}
test('exact guest control assertion accepts only its own nonce and two rate hits',()=>{
  const {a,b}=fixture();assert.equal(exactGuest(a,b,command),true)
})
test('unrelated existing rate timestamp mutation must refuse',()=>{
  const {a,b}=fixture();b.rates[0].updated_at=time;assert.equal(exactGuest(a,b,command),false)
})
