import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as m from '../scripts/rehearse-intake-foundation.mjs'
const intake=fs.readFileSync('supabase/migrations/20260811_product_intake_and_sku_gate.sql','utf8')
// Actual compiled body fingerprint in frozen catalog-04 intake afterFunctions.
test('whole genuine intake extracts all six candidates including actual compiled SKU body',()=>{const bodies=m.extractPublicFunctionBodies(intake);assert.equal(bodies.length,6);assert.equal(bodies.find(b=>b.name==='generate_k2_sku_internal').md5,'b0ac1c40e652db3f13cc333ca24fce73')})
for(const [file,names] of [['20260812_admin_product_intake_bff_boundary.sql',['execute_admin_product_intake_command_v1']],['20260822_catalog_spreadsheet_commit.sql',['execute_admin_catalog_import_v1','read_admin_catalog_import_status_v1']]])test('whole '+file+' extracts exact digit-suffixed candidates',()=>{const sql=fs.readFileSync('supabase/migrations/'+file,'utf8');assert.deepEqual(m.extractPublicFunctionBodies(sql).map(b=>b.name).sort(),names.sort())})
