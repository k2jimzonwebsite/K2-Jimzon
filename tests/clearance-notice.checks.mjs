import test from 'node:test'
import assert from 'node:assert/strict'
import * as witness from '../scripts/rehearse-clearance-recount.mjs'
test('a split PostgreSQL notice stays pending until its complete line arrives',()=>{
  assert.equal(typeof witness.clearanceNoticeLine,'function')
  const line='NOTICE:  K2_CLEARANCE_OWNER_CONTROLS:{"rates":[{"hit_count":1}]}\r\n'
  for(let n=0;n<line.length;n++)assert.equal(witness.clearanceNoticeLine(line.slice(0,n),'K2_CLEARANCE_OWNER_CONTROLS'),undefined)
  assert.deepEqual(witness.clearanceNoticeLine(line,'K2_CLEARANCE_OWNER_CONTROLS'),{rates:[{hit_count:1}]})
})
test('a complete unrelated notice cannot substitute for the required verifier image',()=>{
  assert.equal(typeof witness.clearanceNoticeLine,'function')
  assert.equal(witness.clearanceNoticeLine('NOTICE:  OTHER:{"ok":true}\n','K2_CLEARANCE_VERIFIER_IMAGE'),undefined)
  assert.throws(()=>witness.clearanceNoticeLine('NOTICE:  K2_CLEARANCE_VERIFIER_IMAGE:{broken}\n','K2_CLEARANCE_VERIFIER_IMAGE'),SyntaxError)
})
