// MAP-018 H-018. Disposable local schema, real publication function, no providers.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const bin = path.join(root, '.tools/postgresql-17.11/runtime/pgsql/bin')
const data = path.join(root, '.tools/publication-transition-pg-data')
const database = 'k2_publication_transition_rehearsal'
const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: '55439', PGUSER: 'postgres', PGDATABASE: database }
function run(name, args, input, options = {}) {
  const result = spawnSync(path.join(bin, `${name}.exe`), args, {
    cwd: root, env, input, encoding: 'utf8', windowsHide: true, ...options,
  })
  if (result.error || result.status !== 0) throw new Error(`${name}: ${result.error?.message || result.stderr || result.stdout}`)
  return result.stdout
}
function sql(input) { return run('psql', ['-X', '-v', 'ON_ERROR_STOP=1'], input) }
let started = false
try {
  if (!fs.existsSync(path.join(data, 'PG_VERSION'))) {
    fs.mkdirSync(data, { recursive: true })
    run('initdb', ['-D', data, '-U', 'postgres', '--auth=trust', '--encoding=UTF8'])
  }
  const status = spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', data, 'status'], { env, encoding: 'utf8', windowsHide: true })
  if (status.error) throw status.error
  if (status.status !== 0) {
    run('pg_ctl', ['-D', data, '-l', path.join(root, '.tools/publication-transition-pg.log'), '-o', '-p 55439 -h 127.0.0.1', '-w', 'start'], undefined, { stdio: 'ignore' })
    started = true
  }
  // This fixed database belongs exclusively to this fixture on its dedicated port.
  run('dropdb', ['--if-exists', database])
  run('createdb', [database])
  sql(fs.readFileSync(path.join(root, 'supabase/tests/publication_transition_bootstrap.sql'), 'utf8'))
  const original = fs.readFileSync(path.join(root, 'supabase/migrations/20260811_product_intake_and_sku_gate.sql'), 'utf8')
  const start = original.indexOf('create or replace function public.transition_product_publication_server(')
  const end = original.indexOf("notify pgrst, 'reload schema';", start)
  if (start < 0 || end < 0) throw new Error('Publication function markers missing')
  sql(original.slice(start, end))
  // Simulate a tightened RPC boundary and prove the correction preserves it.
  sql('revoke all on function public.transition_product_publication_server(uuid,text) from authenticated;')
  const correction = path.join(root, 'supabase/migrations/20260905_publication_transition_consistency.sql')
  if (!process.argv.includes('--baseline') && fs.existsSync(correction)) {
    sql(fs.readFileSync(correction, 'utf8'))
    sql(fs.readFileSync(correction, 'utf8'))
  }
  sql(fs.readFileSync(path.join(root, 'supabase/tests/publication_transition_behavior.sql'), 'utf8'))
  console.log('Publication transition SQL assertions passed (local fixture only).')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop'])
}
