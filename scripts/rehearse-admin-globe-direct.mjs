#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const bin = process.env.K2_TEST_PG_BIN || path.join(root, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin')
const data = path.join(root, '.tools', 'admin-globe-direct-pg-data')
const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: '55421', PGUSER: 'postgres', PGDATABASE: 'postgres' }
const executable = (name) => path.join(bin, process.platform === 'win32' ? `${name}.exe` : name)
function run(name, args, options = {}) {
  const result = spawnSync(executable(name), args, { cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 60000, ...options })
  if (result.error || result.status !== 0) throw new Error(`${name}: ${(result.stderr || result.stdout || result.error?.message || 'unknown').trim()}`)
  return result.stdout || ''
}
const psql = (file) => run('psql', ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-f', file])
try {
  if (!fs.existsSync(path.join(data, 'PG_VERSION'))) {
    fs.mkdirSync(data, { recursive: true })
    run('initdb', ['-D', data, '-U', 'postgres', '--auth=trust', '--encoding=UTF8'])
  }
  const status = spawnSync(executable('pg_ctl'), ['-D', data, 'status'], { cwd: root, env, encoding: 'utf8', windowsHide: true })
  if (status.status !== 0) run('pg_ctl', ['-D', data, '-l', path.join(root, '.tools', 'admin-globe-direct-pg.log'), '-o', '-p 55421 -h 127.0.0.1', '-w', 'start'], { stdio: 'ignore' })
  run('dropdb', ['--if-exists', 'k2_admin_globe_direct'])
  run('createdb', ['k2_admin_globe_direct'])
  env.PGDATABASE = 'k2_admin_globe_direct'
  psql(path.join(root, 'supabase', 'tests', 'map019_account_claim_bootstrap.sql'))
  psql(path.join(root, 'supabase', 'migrations', '20260822_admin_globe_review_boundary.sql'))
  psql(path.join(root, 'supabase', 'migrations', '20260921_admin_globe_direct_rpc.sql'))
  const output = psql(path.join(root, 'supabase', 'tests', 'admin_globe_direct_assertions.sql'))
  if (!output.includes('ADMIN_GLOBE_DIRECT_ASSERTIONS_PASSED')) throw new Error('Globe assertions did not finish')
  console.log('Admin Globe direct RPC: apply and role, MFA, draft, publication, retry and audit checks passed.')
} finally {
  if (fs.existsSync(path.join(data, 'PG_VERSION'))) spawnSync(executable('pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop'], { cwd: root, env, encoding: 'utf8', windowsHide: true })
}
