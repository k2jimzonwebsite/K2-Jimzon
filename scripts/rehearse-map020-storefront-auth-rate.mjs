#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const bin = path.join(root, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin')
const data = path.join(root, '.tools', 'map020-storefront-auth-rate-pg-data')
const log = path.join(root, '.tools', 'map020-storefront-auth-rate-pg.log')
const port = '55438'
const database = 'k2_map020_storefront_auth_rate_rehearsal_local'

function run(name, args, label, env, options = {}) {
  const executable = path.join(bin, `${name}.exe`)
  if (!fs.existsSync(executable)) throw new Error(`PORTABLE_POSTGRES_RUNTIME_MISSING: ${executable}`)
  const result = spawnSync(executable, args, {
    cwd: root, env, encoding: 'utf8', windowsHide: true, ...options,
  })
  if (result.error || result.status !== 0) {
    throw new Error(`${label} failed: ${String(result.stderr || result.stdout || result.error?.message || 'unknown').trim()}`)
  }
}

const env = {
  ...process.env, PGHOST: '127.0.0.1', PGPORT: port, PGUSER: 'postgres', PGDATABASE: 'postgres',
}
let started = false
try {
  if (!fs.existsSync(path.join(data, 'PG_VERSION'))) {
    fs.mkdirSync(data, { recursive: true })
    run('initdb', ['-D', data, '-U', 'postgres', '--auth=trust', '--encoding=UTF8'], 'initialization', env)
  }
  const status = spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', data, 'status'], {
    cwd: root, env, encoding: 'utf8', windowsHide: true,
  })
  if (status.status !== 0) {
    run('pg_ctl', ['-D', data, '-l', log, '-o', `-p ${port} -h 127.0.0.1`, '-w', 'start'], 'startup', env, { stdio: 'ignore' })
    started = true
  }
  run('dropdb', ['--if-exists', database], 'database reset', env)
  run('createdb', [database], 'database creation', env)
  const target = ['-v', 'ON_ERROR_STOP=1', '-d', database]
  run('psql', [...target, '-f', 'supabase/tests/map020_storefront_auth_rate_bootstrap.sql'], 'bootstrap', env)
  run('psql', [...target, '-f', 'supabase/migrations/20260825_storefront_customer_auth_boundary.sql'], 'migration', env)
  run('psql', [...target, '-f', 'supabase/tests/map020_storefront_auth_rate_behavior.sql'], 'behavior assertions', env)
  run('psql', [...target, '-f', 'supabase/map020_storefront_auth_rate_postflight.sql'], 'read-only postflight', env)
  run('psql', [...target, '-f', 'supabase/migrations/20260825_storefront_customer_auth_boundary.sql'], 'idempotent replay', env)
  run('psql', [...target, '-f', 'supabase/map020_storefront_auth_rate_postflight.sql'], 'post-replay postflight', env)
  console.log('MAP-020 Storefront customer Auth portable rehearsal passed: private HMAC-only email/SMS/verification IP, subject, and global budgets; denial persistence; replay rejection; privileges; postflight; and migration replay verified.')
} finally {
  if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop'], 'shutdown', env)
}
