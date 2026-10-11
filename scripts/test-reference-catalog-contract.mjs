import fs from 'node:fs'
import assert from 'node:assert/strict'
let assertReferenceCatalogDelta
try { ({assertReferenceCatalogDelta}=await import('./reference-catalog-contract.mjs')) }
catch(error) { if(error.code!=='ERR_MODULE_NOT_FOUND')throw error }
assert.equal(typeof assertReferenceCatalogDelta,'function','Constrained reference catalog composition is missing')
const read=file=>JSON.parse(fs.readFileSync(file))
const before=read(process.argv[2]),after=read(process.argv[3])
const contract=read('supabase/prepared/protected_reference_catalog_delta.json')
const sources=Object.fromEntries(contract.sources.map(p=>[p.file,fs.readFileSync(p.file,'utf8')]))
assertReferenceCatalogDelta(before,after,contract,sources)
let refused=0
function refuse(label,change,changeBefore=false){
 const old=structuredClone(before),next=structuredClone(after)
 change(changeBefore?old:next)
 assert.throws(()=>assertReferenceCatalogDelta(old,next,contract,sources),label)
 refused++
}
refuse('unrelated existing function body',c=>{c.functions.find(f=>f.catalog.proname==='is_admin').definition+='\n-- altered';})
refuse('unrelated schema authority',c=>{c.schemas[0].owner='authenticated';})
refuse('unrelated default privileges',c=>{c.defaults.push({unexpected:true});})
refuse('unrelated extension',c=>{c.extensions[0].version='unexpected';})
refuse('unexpected function',c=>{c.functions.push({...c.functions[0],identity:'public.unexpected_reference()'});})
refuse('missing new function',c=>{c.functions=c.functions.filter(f=>f.catalog.proname!=='reference_name_key_v1');})
for(const field of ['proacl','prosecdef','proconfig','provolatile','proparallel'])refuse('new function '+field,c=>{c.functions.find(f=>f.catalog.proname==='reference_name_key_v1').catalog[field]=null;})
refuse('changed command owner',c=>{c.functions.find(f=>f.catalog.proname==='execute_admin_reference_command_v1').owner='authenticated';})
refuse('changed verifier authority',c=>{c.functions.find(f=>f.catalog.proname==='verify_admin_bff_request').catalog.proacl.push('authenticated=X/postgres');})
refuse('unrelated brand column',c=>{c.relations.find(t=>t.name==='public.brands').columns[0].type='text';})
refuse('brand privilege widened',c=>{c.relations.find(t=>t.name==='public.brands').acl.push('anon=w/postgres');})
refuse('category policy removed',c=>{c.relations.find(t=>t.name==='public.categories').policies=[];})
refuse('category trigger disabled',c=>{c.relations.find(t=>t.name==='public.categories').triggers[0].enabled='D';})
refuse('identity index invalid',c=>{c.relations.find(t=>t.name==='public.brands').indexes.find(i=>i.definition.includes('brands_reference_name_key_v1')).valid=false;})
refuse('private table RLS disabled',c=>{c.relations.find(t=>t.name==='k2_private.reference_events').rls=false;})
refuse('private table client grant',c=>{c.relations.find(t=>t.name==='k2_private.reference_command_context').acl.push('authenticated=arwd/postgres');})
refuse('unexpected table',c=>{c.relations.push({...c.relations[0],name:'public.unexpected_reference'});})
refuse('missing private table',c=>{c.relations=c.relations.filter(t=>t.name!=='k2_private.reference_events');})
refuse('unrelated type changed',c=>{c.types[0].owner='authenticated';})
refuse('unexpected type',c=>{c.types.push({...c.types[0],name:'public.unexpected_reference_type'});})
refuse('before catalog drift',c=>{c.functions[0].owner='authenticated';},true)
const badSources={...sources,[contract.sources[0].file]:sources[contract.sources[0].file]+'\n-- changed'}
assert.throws(()=>assertReferenceCatalogDelta(before,after,contract,badSources));refused++
console.log(JSON.stringify({checks:1+refused,passed:1+refused,refused,providerWrites:false,scope:'Exact captured metadata and constrained negative mutations, not native installer qualification'}))
