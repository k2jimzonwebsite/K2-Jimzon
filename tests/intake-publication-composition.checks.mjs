import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as m from '../scripts/rehearse-intake-foundation.mjs'
test('current intake composition includes complete latest publication after signed legacy closure',()=>{
 assert.ok(Array.isArray(m.intakeFoundationSteps),'maintained executed step list is available')
 const steps=m.intakeFoundationSteps,publication=steps.findIndex(s=>s[0]==='publication')
 assert.ok(publication>steps.findIndex(s=>s[0]==='legacy-acl'))
 assert.ok(steps.findIndex(s=>s[0]==='legacy-acl')>steps.findIndex(s=>s[0]==='signed'))
 assert.equal(steps[publication][1],'20260905_publication_transition_consistency.sql')
 const sql=fs.readFileSync('supabase/migrations/'+steps[publication][1],'utf8')
 assert.deepEqual(m.extractPublicFunctionBodies(sql),[{name:'transition_product_publication_server',md5:'47b5f07d104fd7a5cc8d4a93123d62bc'}])
 assert.deepEqual(steps[publication][2],['transition_product_publication_server'])
})

