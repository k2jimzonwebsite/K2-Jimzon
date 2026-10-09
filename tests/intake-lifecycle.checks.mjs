import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
test('intake lifecycle preserves every existing row while allowing declared additions only',async()=>{
 assert.ok(fs.existsSync('scripts/rehearse-intake-lifecycle.mjs'),'maintained lifecycle witness missing')
 const {intakePreservesRows}=await import('../scripts/rehearse-intake-lifecycle.mjs')
 const before={products:[{sku:'OLD',stock:5}],sessions:[]},after={products:[{sku:'OLD',stock:5},{sku:'NEW',stock:0}],sessions:[{id:'NEW'}]}
 assert.ok(intakePreservesRows(before,after,['products','sessions']))
 assert.ok(!intakePreservesRows(before,{...after,products:[{sku:'OLD',stock:6},{sku:'NEW',stock:0}]},['products','sessions']))
 assert.ok(!intakePreservesRows(before,after,['products']))
 assert.ok(!intakePreservesRows(before,{...after,unknown:[]},['products','sessions']))
 assert.ok(!intakePreservesRows(before,{products:[{sku:'NEW',stock:0}],sessions:[]},['products','sessions']))
})
