import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
test('cost installation preserves all old values and permits only one declared nullable column',async()=>{
 assert.ok(fs.existsSync('scripts/rehearse-intake-flight-cost.mjs'),'maintained cost installation witness missing')
 const {costPreservesRows}=await import('../scripts/rehearse-intake-flight-cost.mjs')
 const before={'public.consignment_items':[{id:'OLD',expected_qty:2}],'public.products':[{sku:'OLD',price:100}]},after={...before,'public.consignment_items':[{id:'OLD',expected_qty:2,unit_cost:null}]}
 assert.ok(costPreservesRows(before,after))
 assert.ok(!costPreservesRows(before,{...after,'public.consignment_items':[{id:'OLD',expected_qty:2,unit_cost:0}]}))
 assert.ok(!costPreservesRows(before,{...after,'public.products':[{sku:'OLD',price:101}]}))
 assert.ok(!costPreservesRows(before,{...after,'public.unknown':[]}))
 assert.ok(!costPreservesRows(before,{...after,'public.consignment_items':[]}))
 const populated={...before,'public.consignment_items':[{id:'OLD',expected_qty:2,unit_cost:12}]}
 assert.ok(costPreservesRows(populated,populated))
 assert.ok(!costPreservesRows(populated,{...populated,'public.consignment_items':[{id:'OLD',expected_qty:2,unit_cost:null}]}))
})
