import test from 'node:test'
import assert from 'node:assert/strict'
import * as witness from '../scripts/rehearse-catalog-current-chain.mjs'
const before=[{sku:'target',catalog_id:'id',name:'A',internal_notes:'old',catalog_record_version:1,updated_at:'old',stock_available:2,total_stock:2,retail_price:5},{sku:'other',catalog_id:'other',name:'B',stock_available:3}]
const valid=()=>[{...before[0],internal_notes:'new',catalog_record_version:2,updated_at:'new'},before[1]]
for(const [name,mutate,expected] of [['valid',()=>{},true],['stock',a=>a[0].stock_available++,false],['total',a=>a[0].total_stock++,false],['retail',a=>a[0].retail_price++,false],['identity',a=>a[0].catalog_id='different',false],['other',a=>a[1]={...a[1],name:'changed'},false],['missing',a=>a.pop(),false],['version',a=>a[0].catalog_record_version=1,false]])test(name+' product metadata delta',()=>{const after=valid();mutate(after);assert.equal(witness.catalogProductDelta(before,after,'target'),expected)})
