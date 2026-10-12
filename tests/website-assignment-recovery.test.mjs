import test from 'node:test'
import assert from 'node:assert/strict'
const domain = await import('../src/lib/websiteAssignmentRecovery.js').catch(() => null)
const actor='11111111-1111-4111-8111-111111111111', key='22222222-2222-4222-8222-222222222222'
const body={action:'website_listing_set',sku:'DUMMY-REVIEW',assigned:true,expectedUpdatedAt:null,reason:'Explicit Website decision'}
const text=' '+JSON.stringify(body,null,1)+'\n'
const storage=()=>{const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}}
test('Website has its own durable actor-scoped original request recovery',()=>assert.equal(typeof domain?.websiteAssignmentRecovery?.hold,'function'))
test('Website literal body and key survive reload and cannot be replaced', {skip:!domain},()=>{
  const s=storage(),r=domain.websiteAssignmentRecovery, saved=r.hold(actor,key,text,s)
  assert.deepEqual(r.read(actor,s),saved);assert.equal(saved.payloadText,text)
  assert.match(r.key(actor),/^k2-website-assignment-pending-v1:/)
  assert.throws(()=>r.hold(actor,key,text.trim(),s),/pending/i)
  assert.throws(()=>r.hold(actor,key,text.replace('true','false'),s),/pending/i)
  assert.equal(r.clear(actor,actor,s),false);assert.equal(r.read(key,s),null)
  assert.equal(r.clear(actor,key,s),true)
})
test('corrupt Website records remain untouched and invalid bodies never persist',{skip:!domain},()=>{
  const s=storage(),r=domain.websiteAssignmentRecovery
  for(const invalid of [{...body,assigned:'true'},{...body,extra:true},{...body,reason:'x'},{...body,expectedUpdatedAt:'bad'}, {...body,sku:'bad sku'}, {...body,token:'synthetic'}]) {
    assert.throws(()=>r.hold(actor,key,JSON.stringify(invalid),s));assert.equal(s.values.size,0)
  }
  for(const raw of ['{',' '.repeat(65537),JSON.stringify({actorId:key,key,payloadText:text,state:'pending'})]) {
    s.setItem(r.key(actor),raw);assert.throws(()=>r.clear(actor,key,s));assert.equal(s.getItem(r.key(actor)),raw)
  }
})
test('existing unassigned Website listing keeps a real version; only absent row has null identity',{skip:!domain},()=>{
  const listing={id:key,sku:body.sku,assigned:false,updatedAt:'2026-10-12T00:00:00Z'}
  assert.equal(domain.validWebsiteListing(listing,body.sku),true)
  assert.equal(domain.validWebsiteListing({...listing,id:null,updatedAt:null},body.sku),true)
  for(const invalid of [{...listing,id:null},{...listing,updatedAt:null},{...listing,sku:'OTHER'}, {...listing,id:null,updatedAt:null,assigned:true},{...listing,assigned:'false'}])assert.equal(domain.validWebsiteListing(invalid,body.sku),false)
})
