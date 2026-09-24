#!/usr/bin/env node
// Isolated portable PostgreSQL rehearsal; never connects to Supabase.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const bin = path.join(root, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin')
const data = path.join(root, '.tools', 'anonymous-chat-pg-data')
const log = path.join(root, '.tools', 'anonymous-chat-pg.log')
const port = '55422'
const db = 'k2_anonymous_chat_rehearsal'
const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: port, PGUSER: 'postgres', PGDATABASE: 'postgres' }
const executable = name => path.join(bin, process.platform === 'win32' ? `${name}.exe` : name)

function run(name, args, label, options = {}) {
  const result = spawnSync(executable(name), args, {
    cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 60000, ...options,
  })
  if (result.error || result.status !== 0) {
    throw new Error(`${label}: ${(result.stderr || result.stdout || result.error?.message || 'unknown').trim()}`)
  }
  return String(result.stdout || '').trim()
}
const psql = (file, label) => run('psql', ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-f', file], label)

for (const name of ['initdb', 'pg_ctl', 'psql', 'dropdb', 'createdb']) {
  if (!fs.existsSync(executable(name))) throw new Error(`PORTABLE_POSTGRES_RUNTIME_MISSING: ${name}`)
}
try {
  if (!fs.existsSync(path.join(data, 'PG_VERSION'))) {
    fs.mkdirSync(data, { recursive: true })
    run('initdb', ['-D', data, '-U', 'postgres', '--auth=trust', '--encoding=UTF8'], 'initdb')
  }
  const status = spawnSync(executable('pg_ctl'), ['-D', data, 'status'], {
    cwd: root, env, encoding: 'utf8', windowsHide: true,
  })
  if (status.status !== 0) {
    run('pg_ctl', ['-D', data, '-l', log, '-o', `-p ${port} -h 127.0.0.1`, '-w', 'start'], 'startup', { stdio: 'ignore' })
  }
  run('dropdb', ['--if-exists', db], 'drop isolated database')
  run('createdb', [db], 'create isolated database')
  env.PGDATABASE = db
  psql(path.join(root, 'supabase/tests/map019_account_claim_bootstrap.sql'), 'bootstrap')
  psql(path.join(root, 'supabase/tests/map020_guest_boundary_preflight_fixture.sql'), 'current order signature fixture')
  psql(path.join(root, 'supabase/map020_guest_boundary_preflight.sql'), 'guest boundary preflight')
  psql(path.join(root, 'supabase/tests/anonymous_chat_moderation_fixture.sql'), 'fixture')
  psql(path.join(root, 'supabase/migrations/20260922_anonymous_chat_moderation.sql'), 'migration')
  const result = psql(path.join(root, 'supabase/tests/anonymous_chat_moderation_assertions.sql'), 'behavior')
  if (!result.includes('ANONYMOUS_CHAT_MODERATION_ASSERTIONS_PASSED')) throw new Error('success marker missing')
  psql(path.join(root, 'supabase/migrations/20260922_anonymous_chat_moderation_rollback.sql'), 'rollback')
  const grant = run('psql', ['-X', '--no-psqlrc', '-At', '-c',
    "select has_function_privilege('anon','public.submit_storefront_chat_v1(text,text,text,uuid,text)','EXECUTE')"],
  'rollback direct-chat grant')
  if (grant !== 't') throw new Error('rollback did not restore the prior direct-chat grant')
  psql(path.join(root, 'supabase/tests/map020_cutover_overloads_fixture.sql'), 'cutover overload fixture')
  psql(path.join(root, 'supabase/migrations/20260812_guest_submission_cutover.sql'), 'guest cutover')
  psql(path.join(root, 'supabase/map020_guest_cutover_postflight.sql'), 'guest cutover postflight')
  const cutover = psql(path.join(root, 'supabase/tests/map020_cutover_overloads_assertions.sql'), 'cutover overload denials')
  if (!cutover.includes('MAP020_CUTOVER_OVERLOADS_PASSED')) throw new Error('cutover overload marker missing')
  console.log('Anonymous chat moderation: migration, behavior, and rollback passed in isolated PostgreSQL.')
  console.log('Guest cutover: nine- and eleven-argument direct order overloads denied in isolated PostgreSQL.')
} finally {
  if (fs.existsSync(path.join(data, 'PG_VERSION'))) {
    spawnSync(executable('pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop'], {
      cwd: root, env, encoding: 'utf8', windowsHide: true,
    })
  }
}
