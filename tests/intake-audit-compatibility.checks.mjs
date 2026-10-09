import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const candidates=[['20260811_product_intake_and_sku_gate.sql',['CREATE_PRODUCT_DRAFT','CREATE_FIRST_INVENTORY_SOURCE','TRANSITION_PUBLICATION']],['20260812_admin_product_intake_bff_boundary.sql',['PRODUCT_PUBLICATION_REASON']],['20260905_publication_transition_consistency.sql',['TRANSITION_PUBLICATION']]]
for(const [file,operations]of candidates)test(file+' retains canonical CRUD audit actions and explicit operation provenance',()=>{
 const sql=fs.readFileSync('supabase/migrations/'+file,'utf8'),inserts=[...sql.matchAll(/insert into public\.audit_logs[\s\S]*?\);/g)].map(m=>m[0])
 assert.equal(inserts.length,operations.length)
 for(let i=0;i<inserts.length;i++){
  assert.ok(inserts[i].includes("'operation', '"+operations[i]+"'"),'operation provenance missing '+operations[i])
  assert.match(inserts[i],i===0&&operations[i]==='CREATE_PRODUCT_DRAFT'?/'INSERT', null/:/'UPDATE',/)
  assert.ok(!inserts[i].includes("'"+operations[i]+"', null"))
 }
 assert.ok(!sql.includes('drop constraint audit_logs_action_check'))
})
