import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
test('calendar generator preserves the complete literal date regex without duplicated SQL body',()=>{
 const parent=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(parent,'k2-calendar-generation-'))
 try{
  fs.mkdirSync(path.join(root,'supabase/migrations'),{recursive:true});fs.mkdirSync(path.join(root,'docs/evidence/20261003-catalog-current-chain/foundation-13'),{recursive:true})
  fs.copyFileSync('supabase/migrations/20261003221500_intake_flight_cost_propagation.sql',path.join(root,'supabase/migrations/20261003221500_intake_flight_cost_propagation.sql'))
  const r=spawnSync(process.execPath,[fileURLToPath(new URL('../docs/evidence/20261003-catalog-current-chain/foundation-13/prepare-calendar-migration.mjs',import.meta.url))],{cwd:root,encoding:'utf8',windowsHide:true})
  assert.equal(r.status,0,r.stderr)
  const sql=fs.readFileSync(path.join(root,'supabase/migrations/20261003233500_intake_flight_calendar.sql'),'utf8'),body=sql.split('$candidate$')[1]
  assert.ok(body.includes("!~ '^\\d{4}-\\d{2}-\\d{2}$'"),'date regex dollar anchor must remain literal SQL')
  assert.equal(body.split('\nend;\n').length-1,1,'candidate must contain one function body')
  assert.ok(body.includes('invalid_datetime_format or datetime_field_overflow'))
 }finally{
  const resolved=fs.realpathSync(root);assert.ok(resolved.startsWith(parent+path.sep)&&path.basename(resolved).startsWith('k2-calendar-generation-'));fs.rmSync(resolved,{recursive:true,force:true})
 }
})
