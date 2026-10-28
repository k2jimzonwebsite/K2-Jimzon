import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

// Reproduce old-backup resurrection using the owned synthetic cluster only.
// A successful diagnostic confirms the existing risk; it is not a safeguard.
export function diagnosePrivacyRestore({ bin, env }) {
  if (env.PGHOST !== '127.0.0.1' || env.PGPORT !== '55449' ||
      env.PGUSER !== 'postgres' || env.PGDATABASE !== 'k2_privacy_fixture') {
    throw new Error('PRIVACY_RESTORE_DIAGNOSTIC_REQUIRES_SYNTHETIC_FIXTURE')
  }
  const target = `k2_privacy_restore_${randomBytes(8).toString('hex')}`
  const maintenance = { ...env, PGDATABASE: 'postgres' }
  const restored = { ...env, PGDATABASE: target }
  function run(exe, args, options = {}) {
    const result = spawnSync(path.join(bin, `${exe}.exe`), args, {
      env, encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 32 * 1024 * 1024, ...options,
    })
    if (result.error || result.status !== 0) {
      throw new Error(`${exe} failed: ${result.stderr || result.error?.message || result.status}`)
    }
    return result.stdout
  }
  const sql = (query, targetEnv = env) => run('psql', [
    '-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-At', '-c', query,
  ], { env: targetEnv }).trim()
  let created = false
  try {
    sql(`
      insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-8000-999999999999','restore@example.test',now());
      insert into public.customers(id,display_name,created_source) values('20000000-0000-4000-8000-999999999999','Synthetic restore customer','website_guest');
      insert into public.customer_contact_points(id,customer_id,contact_kind,contact_value,normalized_hash,verification_status,verified_at,source)
        values('30000000-0000-4000-8000-999999999999','20000000-0000-4000-8000-999999999999','email','restore@example.test',extensions.digest('restore-fixture','sha256'),'verified',now(),'website_guest');
      insert into public.customer_accounts(user_id,customer_id,verified_contact_point_id) values
        ('10000000-0000-4000-8000-999999999999','20000000-0000-4000-8000-999999999999','30000000-0000-4000-8000-999999999999');
      insert into public.conversations(id,customer_id,customer_name,platform,status,source_kind)
        values('70000000-0000-4000-8000-999999999999','20000000-0000-4000-8000-999999999999','Synthetic restore customer','Website','Open','website_message');
      insert into public.messages(conversation_id,sender_type,content,delivery_status)
        values('70000000-0000-4000-8000-999999999999','Customer','synthetic restore content','received');
      insert into k2_private.customer_privacy_requests(id,user_id,customer_id,channel,receipt_hash,state,verified_at)
        values('60000000-0000-4000-8000-999999999999','10000000-0000-4000-8000-999999999999','20000000-0000-4000-8000-999999999999','email',extensions.digest('restore-receipt','sha256'),'pending',now());
    `)
    const archive = run('pg_dump', ['--format=custom', '--no-owner', '--no-acl'], { encoding: null })
    if (!Buffer.isBuffer(archive) || archive.length === 0) throw new Error('SYNTHETIC_BACKUP_EMPTY')
    sql("select k2_private.process_customer_privacy('60000000-0000-4000-8000-999999999999')")
    const state = `select jsonb_build_object(
      'account',(select status from public.customer_accounts where user_id='10000000-0000-4000-8000-999999999999'),
      'customer',(select status from public.customers where id='20000000-0000-4000-8000-999999999999'),
      'message_present',exists(select 1 from public.messages where conversation_id='70000000-0000-4000-8000-999999999999' and content='synthetic restore content'),
      'tombstone_present',exists(select 1 from k2_private.customer_privacy_tombstones where user_id='10000000-0000-4000-8000-999999999999'),
      'request',(select state from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-999999999999'))::text`
    const afterClosure = JSON.parse(sql(state))
    if (afterClosure.account !== 'revoked' || afterClosure.customer !== 'deleted' || afterClosure.message_present ||
        !afterClosure.tombstone_present || afterClosure.request !== 'closed') {
      throw new Error(`SYNTHETIC_CLOSURE_NOT_ESTABLISHED: ${JSON.stringify(afterClosure)}`)
    }
    run('createdb', [target], { env: maintenance })
    created = true
    run('pg_restore', ['--exit-on-error', '--no-owner', '--no-acl', '--dbname', target], { env: restored, input: archive, encoding: null })
    const afterRestore = JSON.parse(sql(state, restored))
    if (afterRestore.account !== 'active' || afterRestore.customer !== 'active' || !afterRestore.message_present ||
        afterRestore.tombstone_present || afterRestore.request !== 'pending') {
      throw new Error(`SYNTHETIC_RESTORE_DID_NOT_REPRODUCE_EXPECTED_RISK: ${JSON.stringify(afterRestore)}`)
    }
    console.log('CUSTOMER_PRIVACY_OLD_BACKUP_RESURRECTION_CONFIRMED_SYNTHETIC_ONLY')
  } finally {
    if (created) run('dropdb', ['--if-exists', target], { env: maintenance })
  }
}
