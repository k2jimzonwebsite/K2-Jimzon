import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
 ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value
export const catalogValueHash=value=>hash(JSON.stringify(canonical(value)))
const body=definition=>{
 const m=definition.match(/\bas\s+(\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$)([\s\S]*?)\1/i)
 assert.ok(m,'Function body required');return m[2].replaceAll('\r','')
}
function map(values,key){
 const result=new Map(values.map(value=>[value[key],value]))
 assert.equal(result.size,values.length,'Duplicate catalog identities refused');return result
}
function additions(before,after,expected,key){
 const old=map(before,key),next=map(after,key)
 const added=[...next.keys()].filter(name=>!old.has(name))
 assert.deepEqual(added.sort(),Object.keys(expected).sort(),'Only approved additions permitted')
 for(const name of added)assert.equal(catalogValueHash(next.get(name)),expected[name],name)
 return {old,next}
}
export function assertReferenceCatalogDelta(before,after,contract,sources){
 assert.equal(contract.version,1)
 assert.equal(catalogValueHash(before),contract.beforeCanonicalSha256,'Exact accepted base required')
 for(const pin of contract.sources)assert.equal(hash(sources[pin.file]),pin.sha256,pin.file)
 assert.deepEqual(Object.keys(after).sort(),Object.keys(before).sort())
 for(const key of ['contract','defaults','extensions','schemas','unsupportedAggregates'])assert.deepEqual(after[key],before[key],key)
 const functions=additions(before.functions,after.functions,contract.functions,'identity')
 for(const [name,old] of functions.old){
  const expected=structuredClone(old)
  if(old.catalog.proname==='verify_admin_bff_request'){
   const anchor='if p_action not in ('
   assert.equal(expected.definition.split(anchor).length,2)
   expected.definition=expected.definition.replace(anchor,"if p_action not in ('reference_create',")
  }
  assert.deepEqual(functions.next.get(name),expected,name)
 }
 for(const name of Object.keys(contract.functions)){
  const f=functions.next.get(name),qualified=name.slice(0,name.indexOf('('))
  assert.equal(f.owner,'postgres');assert.deepEqual(f.catalog.proconfig,['search_path=""'])
  const source=contract.sources.map(pin=>sources[pin.file]).find(s=>s.includes('create function '+qualified+'('))
  assert.ok(source,qualified)
  assert.equal(body(f.definition),body(source.slice(source.indexOf('create function '+qualified+'('))),qualified)
 }
 const types=additions(before.types,after.types,contract.types,'name')
 for(const [name,old] of types.old)assert.deepEqual(types.next.get(name),old,name)
 const relations=additions(before.relations,after.relations,contract.relations,'name')
 for(const [name,old] of relations.old){
  const expected=structuredClone(relations.next.get(name));assert.ok(expected,name)
  const change=contract.relationChanges[name]
  if(change)for(const field of ['indexes','triggers']){
   for(const pin of change[field])assert.equal(expected[field].filter(v=>catalogValueHash(v)===pin).length,1,name+' '+field)
   expected[field]=expected[field].filter(v=>!change[field].includes(catalogValueHash(v)))
  }
  assert.deepEqual(expected,old,name)
 }
 for(const name of Object.keys(contract.relations)){
  const t=relations.next.get(name)
  assert.equal(t.owner,'postgres');assert.equal(t.kind,'r');assert.equal(t.rls,true)
  assert.deepEqual(t.acl,['postgres=arwdDxtm/postgres']);assert.deepEqual(t.policies,[])
 }
 assert.equal(catalogValueHash(after),contract.afterCanonicalSha256,'Complete approved target required')
 return structuredClone(after)
}
