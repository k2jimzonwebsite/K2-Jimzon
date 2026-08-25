#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir=fileURLToPath(new URL('..',import.meta.url))
const binDir=path.join(rootDir,'.tools','postgresql-17.11','runtime','pgsql','bin')
const dataDir=path.join(rootDir,'.tools','map018-pg-data')
const logPath=path.join(rootDir,'.tools','map018-pg.log')
const port='55433'
const database='k2_map018_cleanup_rehearsal_local'

function run(name,args,label,env,options={}) {
  const executable=path.join(binDir,`${name}.exe`)
  if(!fs.existsSync(executable)) throw new Error(`PORTABLE_POSTGRES_RUNTIME_MISSING: ${executable}`)
  const result=spawnSync(executable,args,{cwd:rootDir,env,encoding:'utf8',windowsHide:true,...options})
  if(result.error||result.status!==0) {
    throw new Error(`${label} failed: ${String(result.stderr||result.stdout||result.error?.message||'unknown').trim()}`)
  }
  return String(result.stdout||'').trim()
}

export function runMap018CleanupRehearsal() {
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
    run('psql',[...target,'-f','supabase/tests/map018_cleanup_bootstrap.sql'],'bootstrap',env)
    run('psql',[...target,'-f','supabase/migrations/20260824_map018_intake_evidence_cleanup_boundary.sql'],'migration',env)
    run('psql',[...target,'-f','supabase/tests/map018_cleanup_behavior.sql'],'behavior assertions',env)
    run('psql',[...target,'-f','supabase/migrations/20260824_map018_intake_evidence_cleanup_boundary.sql'],'idempotent replay',env)
    console.log('MAP-018 cleanup portable rehearsal passed: migration, private lifecycle, privileges, and idempotent replay verified.')
  } finally {
    if(started) run('pg_ctl',['-D',dataDir,'-m','fast','-w','stop'],'shutdown',env)
  }
}

try { runMap018CleanupRehearsal() } catch(error) { console.error(error.message); process.exit(2) }

