#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir=fileURLToPath(new URL('..',import.meta.url))
const localRuntime=path.join(rootDir,'.tools','postgresql-17.11','runtime','pgsql','bin')
const binDir=process.env.K2_TEST_PG_BIN || (fs.existsSync(localRuntime) ? localRuntime : path.join(rootDir,'..','..','.tools','postgresql-17.11','runtime','pgsql','bin'))
const dataDir=path.join(rootDir,'.tools','intake-ai-pg-data')
const logPath=path.join(rootDir,'.tools','intake-ai-pg.log')
const port='55439'
const database='k2_intake_ai_rehearsal_local'

function run(name,args,label,env,options={}) {
  const executable=path.join(binDir,`${name}.exe`)
  if(!fs.existsSync(executable)) throw new Error(`PORTABLE_POSTGRES_RUNTIME_MISSING: ${executable}`)
  const result=spawnSync(executable,args,{cwd:rootDir,env,encoding:'utf8',windowsHide:true,...options})
  if(result.error||result.status!==0) {
    throw new Error(`${label} failed: ${String(result.stderr||result.stdout||result.error?.message||'unknown').trim()}`)
  }
  return String(result.stdout||'').trim()
}

export async function runIntakeAiRehearsal() {
  const env={...process.env,PGHOST:'127.0.0.1',PGPORT:port,PGUSER:'postgres',PGDATABASE:'postgres'}
  let started=false
  try {
    if(!fs.existsSync(path.join(dataDir,'PG_VERSION'))) {
      fs.mkdirSync(dataDir,{recursive:true})
      run('initdb',['-D',dataDir,'-U','postgres','--auth=trust','--encoding=UTF8'],'initialization',env)
    }
    const status=spawnSync(path.join(binDir,'pg_ctl.exe'),['-D',dataDir,'status'],{cwd:rootDir,env,encoding:'utf8',windowsHide:true})
    if(status.status!==0) {
      run('pg_ctl',['-D',dataDir,'-l',logPath,'-o',`-p ${port} -h 127.0.0.1`,'-w','start'],'startup',env,{stdio:'ignore'})
      started=true
    }
    run('dropdb',['--if-exists',database],'database reset',env)
    run('createdb',[database],'database creation',env)
    const target=['-v','ON_ERROR_STOP=1','-d',database]
    run('psql',[...target,'-f','supabase/tests/intake_ai_bootstrap.sql'],'bootstrap',env)
    run('psql',[...target,'-f','supabase/migrations/20260906_automatic_intake_jobs.sql'],'migration',env)
    run('psql',[...target,'-f','supabase/tests/intake_ai_behavior.sql'],'behavior assertions',env)
    run('psql',[...target,'-f','supabase/tests/intake_ai_attachment.sql'],'canonical attachment assertions',env)
    run('psql',[...target,'-f','supabase/tests/intake_ai_concurrency_setup.sql'],'concurrency setup',env)
    const concurrent = sessionId => new Promise((resolve,reject) => {
      const child=spawn(path.join(binDir,'psql.exe'),[...target,'-v',`session_id=${sessionId}`,'-f','supabase/tests/intake_ai_concurrency_claim.sql'],{cwd:rootDir,env,windowsHide:true})
      let output=''; child.stdout.on('data',data=>output+=data); child.stderr.on('data',data=>output+=data)
      child.on('error',reject); child.on('close',code=>code===0?resolve(output):reject(new Error(output)))
    })
    await Promise.all([concurrent('a74a4161-72ca-4d72-8f59-37aa690e1869'),concurrent('b74a4161-72ca-4d72-8f59-37aa690e1869')])
    run('psql',[...target,'-c',"do $$ begin if (select sum(reserved_usd_micros) from k2_private.intake_ai_jobs)<>1200000 or (select count(*) from k2_private.intake_ai_jobs)<>3 then raise exception 'concurrent budget failure'; end if; end $$;"],'concurrent cap assertions',env)
    run('psql',[...target,'-f','supabase/migrations/20260906_automatic_intake_jobs.sql'],'idempotent replay',env)
    console.log('Automatic intake local rehearsal passed: signed lifecycle, replay, ownership, caps, privileges, and idempotent migration replay.')
  } finally {
    if(started) run('pg_ctl',['-D',dataDir,'-m','fast','-w','stop'],'shutdown',env)
  }
}

try { await runIntakeAiRehearsal() } catch(error) { console.error(error.message); process.exit(2) }
// Keep the runner directly executable while retaining the exported rehearsal for contracts.
