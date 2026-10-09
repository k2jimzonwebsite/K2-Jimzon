import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as m from '../scripts/rehearse-intake-dependencies.mjs'
test('whole dependency parser binds private signer and public candidate bodies',()=>{
 assert.equal(typeof m.extractDependencyBodies,'function')
 const bodies=m.extractDependencyBodies(fs.readFileSync('supabase/migrations/20260830_paid_ai_spend_controls.sql','utf8'))
 assert.deepEqual(bodies.map(b=>b.name),['k2_private.verify_admin_bff_request','public.read_admin_ai_spend_controls_v1','public.execute_admin_ai_spend_controls_command_v1'])
 assert.equal(bodies[0].md5,'599afc1e0a5ced392eb2d70da4b16076')
})
test('dependency data preserves old rows and refuses unknown/nonempty new tables',()=>{
 assert.equal(typeof m.dependencyPreservesRows,'function')
 const before={'public.products':[{sku:'OLD',stock:5}]},allowed=['k2_private.product_master_events']
 assert.ok(m.dependencyPreservesRows(before,{...before,'k2_private.product_master_events':[]},allowed))
 assert.ok(!m.dependencyPreservesRows(before,{...before,'k2_private.other':[]},allowed))
 assert.ok(!m.dependencyPreservesRows(before,{...before,'k2_private.product_master_events':[{}]},allowed))
 assert.ok(!m.dependencyPreservesRows(before,{'public.products':[{sku:'OLD',stock:6}]},allowed))
})
test('disabled AI seed accepts native JSON key order and refuses enabled or extra fields',()=>{
 const config={updated_at:'2026-10-03T00:00:00Z',updated_by:null,version:1,manual_fallback_required:true,image_confirmation_required:true,content_confirmation_required:true,monthly_usd_micros:null,per_session_usd_micros:null,per_product_usd_micros:null,provider_model_snapshot:null,paid_path_enabled:false,config_key:'default'},table='k2_private.ai_spend_control_config'
 assert.ok(m.dependencyPreservesRows({}, {[table]:[config]},[table]))
 assert.ok(!m.dependencyPreservesRows({}, {[table]:[{...config,paid_path_enabled:true}]},[table]))
 assert.ok(!m.dependencyPreservesRows({}, {[table]:[{...config,extra:true}]},[table]))
})
