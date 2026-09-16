import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { generateGuestSeedRecovery } from './guest-seed-recovery.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const bin = process.env.K2_TEST_PG_BIN || path.join(root,'.tools/postgresql-17.11/runtime/pgsql/bin')
const data = path.join(root,'.tools/guest-seed-recovery-pg-data')
const env = { ...process.env, PGHOST:'127.0.0.1', PGPORT:'55443', PGUSER:'postgres', PGDATABASE:'postgres' }
function run(name,args,input,options={}) {
  const result=spawnSync(path.join(bin,name+(process.platform==='win32'?'.exe':'')),args,{cwd:root,env,input,encoding:'utf8',windowsHide:true,timeout:30000,...options})
  if(result.error || result.status!==0) throw Error(result.stderr || result.error?.message || name)
  return (result.stdout || '').trim()
}
const sql = input => run('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'], 'set check_function_bodies=off;\n'+input)
const read = name => fs.readFileSync(path.join(root,name),'utf8')
let started=false
try {
  if(!fs.existsSync(path.join(data,'PG_VERSION'))) {
    fs.mkdirSync(data,{recursive:true}); run('initdb',['-D',data,'-U','postgres','--auth=trust','--encoding=UTF8'])
  }
  run('pg_ctl',['-D',data,'-l',path.join(root,'.tools/guest-seed-recovery-pg.log'),'-o','-p 55443 -h 127.0.0.1','-w','start'],undefined,{stdio:'ignore'}); started=true
  // No existing database is dropped; this run creates a new disposable database.
  const original = read('supabase/migrations/20260812_guest_submission_boundary.sql')
  const definitions = ['submit_guest_order_v1','submit_guest_pasabuy_v1'].map(name=>{
    const matches=[...original.matchAll(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`,'gi'))]
    assert.equal(matches.length,1); return matches[0][0]
  }).join('\n')
  const seed=read('supabase/migrations/20260912_guest_order_conversation_seed.sql').replace(/^begin;$/m,'').replace(/^commit;$/m,'')
  const capture=read('supabase/guest_order_conversation_seed_capture.sql')
  // Install only function definitions; this rehearsal proves recovery mechanics,
  // not signed submission behavior, table/RLS or application readiness.
  const database = `k2_guest_seed_recovery_${Date.now()}`
  run('createdb',[database])
  env.PGDATABASE=database
  sql(`create table public.messages(id int); create table public.conversations(id int); ${definitions}`)
  const before=JSON.parse(sql(capture))
  sql(seed)
  const after=JSON.parse(sql(capture))
  const recovery=generateGuestSeedRecovery(before,after)
  sql(seed) // replay preserves exactly the same post-seed definitions
  sql(recovery)
  const restored=JSON.parse(sql(capture))
  assert.deepEqual(restored.functions,before.functions)
  assert.throws(()=>generateGuestSeedRecovery({...before,database:'wrong'},after),/DATABASE_MISMATCH/)
  assert.throws(()=>generateGuestSeedRecovery({...before,systemIdentifier:'wrong'},after),/CLUSTER_MISMATCH/)
  assert.throws(()=>generateGuestSeedRecovery({...before,functions:[]},after),/CAPTURE_REQUIRED/)
  sql(seed)
  sql(`alter function public.submit_guest_order_v1(bigint,uuid,text,text,text,text) set search_path=public;`)
  assert.throws(()=>sql(recovery),/LATER_CHANGE_REFUSED/)
  console.log('Guest-seed recovery passed: real before/after definitions, seed replay, exact definition/owner/ACL restoration, missing capture and wrong database denial, later-change refusal. Submission behavior is not covered.')
} finally {
  if(started) run('pg_ctl',['-D',data,'-m','fast','-w','stop'])
}
