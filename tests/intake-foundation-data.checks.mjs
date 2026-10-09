import test from 'node:test'
import assert from 'node:assert/strict'
import {foundationPreservesExistingRows} from '../scripts/rehearse-intake-foundation.mjs'
const before={'public.products':[{id:'p',stock:2,published:false}],'public.product_batches':[{id:'b',unit_cost:4}],'storage.buckets':[],'storage.objects':[]}
const valid={...before,'public.product_batches':[{id:'b',unit_cost:4,owner_code:null,source_type:null}],'public.product_intake_sessions':[],'storage.buckets':[{id:'product-intake-evidence'}]}
test('preserves every original field and permits only declared nullable additions/new empty intake',()=>assert.equal(foundationPreservesExistingRows(before,valid),true))
for(const [name,change] of [
 ['product stock',x=>x['public.products'][0].stock++],
 ['batch cost',x=>x['public.product_batches'][0].unit_cost++],
 ['unexpected new field',x=>x['public.product_batches'][0].extra=null],
 ['non-null new field',x=>x['public.product_batches'][0].source_type='legacy'],
 ['new intake row',x=>x['public.product_intake_sessions'].push({id:'new'})],
 ['unknown table',x=>x['public.extra']=[]],
 ['storage object',x=>x['storage.objects'].push({id:'new'})],
 ['extra bucket',x=>x['storage.buckets'].push({id:'other'})]
])test('refuses '+name,()=>{const after=structuredClone(valid);change(after);assert.equal(foundationPreservesExistingRows(before,after),false)})
