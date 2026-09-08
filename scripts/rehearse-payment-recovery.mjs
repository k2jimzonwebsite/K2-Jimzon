// MAP-023 H-015. Disposable local schema, real payment function, no providers.
import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const bin = path.join(root, '.tools/postgresql-17.11/runtime/pgsql/bin')
const data = path.join(root, '.tools/payment-recovery-pg-data')
const database = 'k2_payment_recovery_rehearsal'
const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: '55441', PGUSER: 'postgres', PGDATABASE: database }
function run(name, args, input, options = {}) {
  const result = spawnSync(path.join(bin, `${name}.exe`), args, {
    cwd: root, env, input, encoding: 'utf8', windowsHide: true, ...options,
  })
  if (result.error || result.status !== 0) throw new Error(`${name}: ${result.error?.message || result.stderr || result.stdout}`)
  return result.stdout
}
function sql(input) { return run('psql', ['-X', '-v', 'ON_ERROR_STOP=1'], input) }
function asyncSql(input) {
  return new Promise((resolve, reject) => {
    const child = spawn(path.join(bin, 'psql.exe'), ['-X', '-v', 'ON_ERROR_STOP=1'], { cwd: root, env, windowsHide: true })
    let stderr = ''
    child.stdout.resume()
    child.stderr.on('data', chunk => { stderr += chunk.toString() })
    child.on('error', reject)
    child.on('close', status => resolve({ status, stderr }))
    child.stdin.end(input)
  })
}
let started = false
try {
  if (!fs.existsSync(path.join(data, 'PG_VERSION'))) {
    fs.mkdirSync(data, { recursive: true })
    run('initdb', ['-D', data, '-U', 'postgres', '--auth=trust', '--encoding=UTF8'])
  }
  const status = spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', data, 'status'], { env, encoding: 'utf8', windowsHide: true })
  if (status.error) throw status.error
  if (status.status !== 0) {
    run('pg_ctl', ['-D', data, '-l', path.join(root, '.tools/payment-recovery-pg.log'), '-o', '-p 55441 -h 127.0.0.1', '-w', 'start'], undefined, { stdio: 'ignore' })
    started = true
  }
  // This fixed database belongs exclusively to this fixture on its dedicated port.
  run('dropdb', ['--if-exists', database])
  run('createdb', [database])
  sql(fs.readFileSync(path.join(root, 'supabase/tests/payment_recovery_bootstrap.sql'), 'utf8'))
  const original = fs.readFileSync(path.join(root, 'supabase/migrations/20260803_launch_core_stabilization.sql'), 'utf8')
  const start = original.indexOf('create or replace function public.set_order_request_payment_status(')
  const end = original.indexOf('create or replace function public.cancel_order_request(', start)
  if (start < 0 || end < 0) throw new Error('Payment recovery function markers missing')
  sql(original.slice(start, end))
  // Simulate a tightened RPC boundary and prove the correction preserves it.
  sql('revoke all on function public.set_order_request_payment_status(uuid,text,text) from authenticated;')
  sql(fs.readFileSync(path.join(root, 'supabase/migrations/20260812_admin_fulfillment_bff_boundary.sql'), 'utf8'))
  const correction = path.join(root, 'supabase/migrations/20260906_payment_evidence_recovery.sql')
  if (!process.argv.includes('--baseline')) {
    sql(fs.readFileSync(correction, 'utf8'))
    sql(fs.readFileSync(correction, 'utf8'))
  }
  sql(`create table public.fixture_payment_recovery as
    select pg_get_functiondef(oid) definition,proacl::text acl from pg_proc
    where oid='public.set_order_request_payment_status(uuid,text,text)'::regprocedure;`)
  const balanceCorrection = fs.readFileSync(path.join(root, 'supabase/migrations/20260908_payment_balance_integrity.sql'), 'utf8')
  if (!process.argv.includes('--baseline') && !process.argv.includes('--baseline-balance') && !process.argv.includes('--baseline-balance-lock')) {
    sql(balanceCorrection); sql(balanceCorrection)
  }
  if (!process.argv.includes('--baseline-balance-lock')) {
    sql(fs.readFileSync(path.join(root, 'supabase/tests/payment_balance_integrity.sql'), 'utf8'))
  }
  sql(fs.readFileSync(path.join(root, 'supabase/tests/payment_recovery_behavior.sql'), 'utf8'))
  sql(fs.readFileSync(path.join(root, 'supabase/tests/payment_recovery_signed.sql'), 'utf8'))
  // A concurrent balance writer commits an inconsistent count while review waits.
  // The signed review must re-read locked state and leave no success receipt.
  const balanceWriter = asyncSql(`set application_name='k2_payment_balance_writer';
    begin; update inventory_balances set reserved=0 where sku='LOCAL-SKU';
    select pg_sleep(2); commit;`)
  let holding = false
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const observed = run('psql', ['-X', '-A', '-t'], `select count(*) from pg_stat_activity
      where application_name='k2_payment_balance_writer' and wait_event='PgSleep';`).trim()
    if (observed === '1') { holding = true; break }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  if (!holding) { await balanceWriter; throw new Error('Balance-writer lock was not observed') }
  const review = await asyncSql(`set statement_timeout='10s';
    select set_config('request.actor','22222222-2222-4222-8222-222222222222',false);
    select set_config('request.aal','aal2',false);
    select public.fixture_payment(jsonb_build_object('orderRequestId',id,'toStatus','verified',
      'evidenceNote','Concurrent balance fixture','expectedPaymentStatus',payment_status,'expectedUpdatedAt',updated_at),
      gen_random_uuid()) from order_requests;`)
  const writer = await balanceWriter
  if (writer.status !== 0 || review.status === 0 || !review.stderr.includes('K2_PAYMENT_STOCK_INELIGIBLE')) {
    throw new Error(`Payment ignored concurrent balance state: ${JSON.stringify({ writer, review })}`)
  }
  sql(`do $$ begin
    if (select count(*) from k2_private.admin_command_receipts)<>1
      or (select payment_status from order_requests)<>'evidence_submitted' then
      raise exception 'Balance denial wrote a payment or receipt'; end if;
  end $$; update inventory_balances set reserved=1 where sku='LOCAL-SKU';`)
  const payload = run('psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1'],
    "select jsonb_build_object('orderRequestId',id,'toStatus','verified','evidenceNote','Independent local ledger review','expectedPaymentStatus',payment_status,'expectedUpdatedAt',updated_at) from order_requests;").trim()
  const reviewers = ['22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333']
  const results = await Promise.all(reviewers.map(actor => new Promise((resolve, reject) => {
    const child = spawn(path.join(bin, 'psql.exe'), ['-X', '-v', 'ON_ERROR_STOP=1'], { cwd: root, env, windowsHide: true })
    let stderr = ''
    child.stdout.resume()
    child.stderr.on('data', chunk => { stderr += chunk.toString() })
    child.on('error', reject)
    child.on('close', status => resolve({ status, stderr }))
    child.stdin.end(`select set_config('request.actor','${actor}',false); select set_config('request.aal','aal2',false); select public.fixture_payment('${payload.replaceAll("'", "''")}'::jsonb,gen_random_uuid());`)
  })))
  if (results.filter(result => result.status === 0).length !== 1
    || results.filter(result => result.stderr.includes('K2_PAYMENT_VERSION_CONFLICT')).length !== 1) {
    throw new Error(`Concurrent reviewers did not serialize: ${JSON.stringify(results)}`)
  }
  sql("do $$ begin if (select count(*) from k2_private.admin_command_receipts)<>2 then raise exception 'Concurrent review duplicated receipts'; end if; end $$;")
  sql(fs.readFileSync(path.join(root, 'supabase/tests/packing_signed_bootstrap.sql'), 'utf8'))
  for (const migration of ['20260906_exact_packing_lot.sql', '20260906_exact_packing_wrapper.sql']) {
    const content = fs.readFileSync(path.join(root, 'supabase/migrations', migration), 'utf8')
    sql(content); sql(content)
  }
  sql(fs.readFileSync(path.join(root, 'supabase/tests/packing_signed_behavior.sql'), 'utf8'))
  sql(`do $$ begin
    if exists(select 1 from pg_proc p cross join fixture_payment_recovery f
      where p.oid='public.set_order_request_payment_status(uuid,text,text)'::regprocedure
        and p.proacl::text is distinct from f.acl) then raise exception 'Payment ACL changed'; end if;
    execute (select definition from fixture_payment_recovery);
    if exists(select 1 from pg_proc p cross join fixture_payment_recovery f
      where p.oid='public.set_order_request_payment_status(uuid,text,text)'::regprocedure
        and (pg_get_functiondef(p.oid)<>f.definition or p.proacl::text is distinct from f.acl))
      then raise exception 'Payment function recovery mismatch'; end if;
  end $$;`)
  sql(balanceCorrection)
  console.log('Payment recovery and composed signed packing SQL assertions passed (local fixture only).')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop'])
}
