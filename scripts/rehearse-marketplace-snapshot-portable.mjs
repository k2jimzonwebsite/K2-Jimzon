#!/usr/bin/env node
/**
 * Customer-free isolated PostgreSQL rehearsal for MAP-023/MAP-026.
 * It always creates a disposable local database and never accepts a remote URL.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const config = {
  binDir: path.join(rootDir,'.tools','postgresql-17.11','runtime','pgsql','bin'),
  dataDir: path.join(rootDir,'.tools','map023-marketplace-pg-data'),
  logPath: path.join(rootDir,'.tools','map023-marketplace-pg.log'),
  port: 54329,
  database: 'k2_map023_marketplace_rehearsal',
}
const lifecycle = [
  ['bootstrap','supabase/tests/marketplace_snapshot_staging_bootstrap.sql'],
  ['preflight','supabase/marketplace_snapshot_staging_preflight.sql'],
  ['migration','supabase/migrations/20260831_marketplace_snapshot_staging.sql'],
  ['migration replay','supabase/migrations/20260831_marketplace_snapshot_staging.sql'],
  ['behavior assertions','supabase/tests/marketplace_snapshot_staging_assertions.sql'],
  ['postflight','supabase/marketplace_snapshot_staging_postflight.sql'],
  ['non-destructive rollback','supabase/marketplace_snapshot_staging_rollback.sql'],
]

function requireRuntime() {
  const names=['initdb.exe','pg_ctl.exe','psql.exe','dropdb.exe','createdb.exe']
  const tools=Object.fromEntries(names.map((name)=>[name,path.join(config.binDir,name)]))
  const missing=names.filter((name)=>!fs.existsSync(tools[name]))
  if (missing.length) throw new Error(`PORTABLE_POSTGRES_RUNTIME_MISSING: ${missing.join(', ')}`)
  return tools
}

function run(executable,args,label,env,options={}) {
  const result=spawnSync(executable,args,{cwd:rootDir,env,encoding:'utf8',windowsHide:true,...options})
  if (result.error || result.status!==0) {
    const detail=String(result.stderr||result.stdout||result.error?.message||'unknown').trim()
    throw new Error(`${label} failed: ${detail}`)
  }
  return String(result.stdout||'').trim()
}

function main() {
  const executable=requireRuntime()
  const env={...process.env,PGHOST:'127.0.0.1',PGPORT:String(config.port),PGUSER:'postgres',PGDATABASE:'postgres'}
  let startedHere=false
  try {
    if (!fs.existsSync(path.join(config.dataDir,'PG_VERSION'))) {
      fs.mkdirSync(config.dataDir,{recursive:true})
      run(executable['initdb.exe'],['-D',config.dataDir,'-U','postgres','--auth=trust','--encoding=UTF8'],
        'portable PostgreSQL initialization',env)
    }
    const status=spawnSync(executable['pg_ctl.exe'],['-D',config.dataDir,'status'],{
      cwd:rootDir,env,encoding:'utf8',windowsHide:true,
    })
    if (status.status!==0) {
      run(executable['pg_ctl.exe'],['-D',config.dataDir,'-l',config.logPath,
        '-o',`-p ${config.port} -h 127.0.0.1`,'-w','start'],
      'portable PostgreSQL startup',env,{stdio:'ignore'})
      startedHere=true
    }
    run(executable['dropdb.exe'],['--if-exists',config.database],'rehearsal database reset',env)
    run(executable['createdb.exe'],[config.database],'rehearsal database creation',env)
    const dbEnv={...env,PGDATABASE:config.database}
    for (const [label,relative] of lifecycle) {
      run(executable['psql.exe'],['-X','--no-psqlrc','-v','ON_ERROR_STOP=1','-f',path.join(rootDir,relative)],label,dbEnv)
      console.log(`[ok] ${label}`)
    }
    const rollbackEvidence=run(executable['psql.exe'],[
      '-X','--no-psqlrc','-v','ON_ERROR_STOP=1','-t','-A','-c',
      `select not has_function_privilege('authenticated','public.execute_admin_marketplace_snapshot_v1(text,bigint,uuid,uuid,text,text)','EXECUTE')
       and not has_function_privilege('authenticated','public.read_admin_marketplace_snapshot_status_v1(uuid)','EXECUTE')
       and to_regclass('k2_private.marketplace_snapshot_imports') is not null
       and (select count(*)=1 from k2_private.marketplace_snapshot_imports);`,
    ],'rollback evidence assertion',dbEnv)
    if (rollbackEvidence.split(/\r?\n/).filter(Boolean).pop()!=='t') {
      throw new Error('rollback evidence assertion failed')
    }
    console.log('[ok] rollback revoked entry points and preserved staged evidence')
    console.log('All marketplace snapshot checks passed against isolated PostgreSQL.')
    console.log('This is local rehearsal evidence, not a provider or production apply.')
  } finally {
    if (startedHere) spawnSync(executable['pg_ctl.exe'],['-D',config.dataDir,'-w','stop'],{
      cwd:rootDir,env,encoding:'utf8',windowsHide:true,stdio:'ignore',
    })
  }
}

try { main() } catch (error) { console.error(error.message); process.exitCode=1 }
