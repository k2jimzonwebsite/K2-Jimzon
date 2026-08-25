#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const bin = path.join(root,'.tools','postgresql-17.11','runtime','pgsql','bin')
const data = path.join(root,'.tools','map019-account-claim-pg-data')
const log = path.join(root,'.tools','map019-account-claim-pg.log')
const port = '55419'
const rollbackSqlPath = path.join(root,'.map019-rollback-rehearsal.sql')
const env = {...process.env,PGHOST:'127.0.0.1',PGPORT:port,PGUSER:'postgres',PGDATABASE:'postgres'}
function run(exe,args,label,options={}) {
  console.log(`[rehearse-map019] running ${label}...`)
  const result=spawnSync(path.join(bin,exe),args,{cwd:root,env,encoding:'utf8',windowsHide:true,timeout:30000,...options})
  if(result.error||result.status!==0) throw new Error(`${label}: ${(result.stderr||result.stdout||result.error?.message||'unknown').trim()}`)
  return String(result.stdout||'').trim()
}
const psql=(args,label)=>run('psql.exe',['-X','--no-psqlrc','-v','ON_ERROR_STOP=1',...args],label)
let started=false
try {
  if(!fs.existsSync(path.join(data,'PG_VERSION'))) {
    fs.mkdirSync(data,{recursive:true})
    run('initdb.exe',['-D',data,'-U','postgres','--auth=trust','--encoding=UTF8'],'initdb')
  }
  const status=spawnSync(path.join(bin,'pg_ctl.exe'),['-D',data,'status'],{cwd:root,env,encoding:'utf8',windowsHide:true})
  if(status.status!==0) {
    run('pg_ctl.exe',['-D',data,'-l',log,'-o',`-p ${port} -h 127.0.0.1`,'-w','start'],'startup',{stdio:'ignore'})
    started=true
  }
  run('dropdb.exe',['--if-exists','k2_map019_rehearsal'],'drop database')
  run('createdb.exe',['k2_map019_rehearsal'],'create database')
  env.PGDATABASE='k2_map019_rehearsal'
  const bootstrap=path.join(root,'supabase/tests/map019_account_claim_bootstrap.sql')
  const migrations=[
    path.join(root,'supabase/migrations/20260822_admin_session_registry.sql'),
    path.join(root,'supabase/migrations/20260822_admin_product_media_boundary.sql'),
    path.join(root,'supabase/migrations/20260822_admin_globe_review_boundary.sql'),
    path.join(root,'supabase/migrations/20260822_admin_procurement_boundary.sql'),
    path.join(root,'supabase/migrations/20260822_admin_channel_readiness_boundary.sql'),
    path.join(root,'supabase/migrations/20260822_admin_staff_access_boundary.sql'),
    path.join(root,'supabase/migrations/20260822_admin_system_readiness_boundary.sql'),
    path.join(root,'supabase/migrations/20260822_admin_product_master_boundary.sql'),
    path.join(root,'supabase/migrations/20260822_guest_account_claim_boundary.sql'),
    path.join(root,'supabase/migrations/20260822_wholesale_inquiry_boundary.sql'),
  ]
  const postflight=path.join(root,'supabase/map019_account_claim_postflight.sql')
  const wholesalePostflight=path.join(root,'supabase/map019_wholesale_inquiry_postflight.sql')
  const mediaPostflight=path.join(root,'supabase/map019_product_media_postflight.sql')
  const globeReviewPostflight=path.join(root,'supabase/map020_globe_review_postflight.sql')
  const procurementPostflight=path.join(root,'supabase/map020_procurement_postflight.sql')
  const channelPostflight=path.join(root,'supabase/map020_channel_readiness_postflight.sql')
  const staffAccessPostflight=path.join(root,'supabase/map020_staff_access_postflight.sql')
  const systemReadinessPostflight=path.join(root,'supabase/map022_system_readiness_postflight.sql')
  const productMasterPostflight=path.join(root,'supabase/map020_product_master_postflight.sql')
  const productMasterAssertions=path.join(root,'supabase/tests/map020_product_master_assertions.sql')
  const assertions=path.join(root,'supabase/tests/map019_account_claim_assertions.sql')
  psql(['-f',bootstrap],'bootstrap')
  const migrationSql=migrations.map(file=>fs.readFileSync(file,'utf8').replace(/^\s*(?:--[^\n]*\n)+\s*begin\s*;/i,'').replace(/commit\s*;\s*$/i,'')).join('\n')
  const postflightSql=[postflight,wholesalePostflight,mediaPostflight,globeReviewPostflight,procurementPostflight,channelPostflight,staffAccessPostflight,systemReadinessPostflight,productMasterPostflight].map(file=>fs.readFileSync(file,'utf8').replace(/^\\set[^\n]*\n/i,'')).join('\n')
  fs.writeFileSync(rollbackSqlPath,`begin;\n${migrationSql}\n${postflightSql}\nrollback;\n`)
  psql(['-f',rollbackSqlPath],'rollback rehearsal')
  const absent=psql(['-At','-c',"select to_regprocedure('public.claim_guest_customer_account_v1(bigint,uuid,text,text,text,text)') is null and to_regprocedure('public.submit_wholesale_inquiry_v1(bigint,uuid,text,text,text,text)') is null and to_regclass('public.wholesale_inquiries') is null and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='customer_claim_requests' and column_name='request_fingerprint')"],'rollback assertion').trim()
  if(absent!=='t') throw new Error('rollback did not restore the baseline')
  for(const migration of migrations) psql(['-f',migration],`migration apply ${path.basename(migration)}`)
  psql(['-f',postflight],'postflight')
  psql(['-f',wholesalePostflight],'wholesale postflight')
  psql(['-f',mediaPostflight],'product media postflight')
  psql(['-f',globeReviewPostflight],'globe review postflight')
  psql(['-f',procurementPostflight],'procurement postflight')
  psql(['-f',channelPostflight],'channel postflight')
  psql(['-f',staffAccessPostflight],'staff access postflight')
  psql(['-f',productMasterPostflight],'product master postflight')
  psql(['-f',systemReadinessPostflight],'system readiness postflight')
  const output=psql(['-f',assertions],'behavior assertions')
  if(!output.includes('MAP019_ACCOUNT_CLAIM_ASSERTIONS_PASSED')) throw new Error('behavior success marker missing')
  psql(['-f',productMasterAssertions],'product master behavior assertions')
  for(const migration of migrations) psql(['-f',migration],`migration replay ${path.basename(migration)}`)
  psql(['-f',postflight],'replay postflight')
  psql(['-f',wholesalePostflight],'wholesale replay postflight')
  psql(['-f',mediaPostflight],'product media replay postflight')
  psql(['-f',globeReviewPostflight],'globe review replay postflight')
  psql(['-f',procurementPostflight],'procurement replay postflight')
  psql(['-f',channelPostflight],'channel replay postflight')
  psql(['-f',staffAccessPostflight],'staff access replay postflight')
  psql(['-f',productMasterPostflight],'product master replay postflight')
  psql(['-f',systemReadinessPostflight],'system readiness replay postflight')
  console.log('MAP-019 account claim: rollback, apply, behavior, and migration replay passed.')
} finally {
  if(fs.existsSync(rollbackSqlPath)) fs.unlinkSync(rollbackSqlPath)
  if(fs.existsSync(path.join(data,'PG_VERSION'))) spawnSync(path.join(bin,'pg_ctl.exe'),['-D',data,'-m','fast','-w','stop'],{cwd:root,env,encoding:'utf8',windowsHide:true})
}
