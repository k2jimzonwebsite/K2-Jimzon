// Disposable loopback PostgreSQL fixture. Never reads owner env/provider tokens.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'

const root = process.cwd()
const bin = process.env.K2_TEST_PG_BIN || path.join(root, '.tools/postgresql-17.6/runtime/pgsql/bin')
const data = path.join(root, '.tools/customer-order-chat-pg-data')
const database = 'k2_customer_order_chat_fixture'
const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: '55472', PGUSER: 'postgres', PGDATABASE: database, PGSSLMODE: 'disable' }
function run(name, args, input) {
  const result = spawnSync(path.join(bin, process.platform === 'win32' ? `${name}.exe` : name), args,
    { cwd: root, env, input, encoding: 'utf8', windowsHide: true, ...(name === 'pg_ctl' && args.includes('start') ? { stdio: 'ignore' } : {}) })
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout)
  return (result.stdout || '').trim()
}
const sql = body => run('psql', ['-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'], body)
const read = name => fs.readFileSync(path.join(root, name), 'utf8')
const quote = value => value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const secret = Buffer.alloc(32, 21)
const grant = 'a'.repeat(64), otherGrant = 'b'.repeat(64), ipHash = 'c'.repeat(64)
const reference = 'WEB-0123456789ABCDEF'
const orderId = '11111111-1111-4111-8111-111111111111'
let started = false
function command(operation, extra = {}, options = {}) {
  const payload = JSON.stringify({ operation, orderReference: reference, ...extra })
  const timestamp = Math.floor(Date.now() / 1000), nonce = options.nonce || randomUUID()
  const hash = createHash('sha256').update(payload).digest('hex')
  const action = operation === 'read' ? 'guest_read' : 'guest_reply'
  const signature = createHmac('sha256', secret).update(`${action}\n${timestamp}\n${nonce}\n${hash}\n${ipHash}`).digest('hex')
  const input = [timestamp, nonce, payload, ipHash, options.forged ? '0'.repeat(64) : signature, options.grant === undefined ? grant : options.grant, options.base64 || null]
  const result = sql(`set role anon; select public.guest_order_conversation_v1(${input.map(quote).join(',')});`)
  return JSON.parse(result)
}
try {
  if (!fs.existsSync(path.join(data, 'PG_VERSION'))) {
    fs.mkdirSync(data, { recursive: true })
    run('initdb', ['-D', data, '-U', 'postgres', '--auth=trust', '--encoding=UTF8'])
  }
  const status = spawnSync(path.join(bin, process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl'), ['-D', data, 'status'], { env, windowsHide: true })
  if (status.status !== 0) {
    run('pg_ctl', ['-D', data, '-l', path.join(root, '.tools/customer-order-chat-pg.log'), '-o', `-p 55472 -h 127.0.0.1 ${process.platform === 'win32' ? '' : `-k ${data}`}`, '-w', 'start'])
    started = true
  }
  run('dropdb', ['--if-exists', database]); run('createdb', [database])
  sql(`
    do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
    do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
    create schema auth; create schema extensions; create schema k2_private;
    create extension pgcrypto with schema extensions;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('fixture.actor',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('aal',current_setting('fixture.aal',true))$$;
    create function public.is_staff() returns boolean language sql as $$select auth.uid() is not null$$;
    create table public.order_requests(id uuid primary key, public_reference text, idempotency_key text,
      status text, payment_status text, total_amount numeric, shipping_quote_status text, customer_note text,
      delivery_review_required boolean default false);
    create table public.conversations(id uuid primary key, source_kind text, source_id uuid, unread_count integer default 0,
      last_inbound_at timestamptz, last_message_at timestamptz, response_due_at timestamptz, updated_at timestamptz);
    create table public.messages(id uuid primary key default gen_random_uuid(), conversation_id uuid, sender_type text,
      content text, is_draft boolean, delivery_status text, direction text, provider_event_key text, created_at timestamptz default now());
    create table public.guest_access_grants(id uuid primary key, token_hash bytea, status text, expires_at timestamptz,
      max_uses integer, use_count integer default 0, last_used_at timestamptz);
    create table public.guest_access_grant_scopes(grant_id uuid, scope_kind text, scope_id uuid, permissions text[]);
    create table k2_private.anonymous_chat_blocks(ip_hash bytea);
    insert into public.order_requests values('${orderId}','${reference}','fixture-order-key-0000000000000000001','submitted','awaiting_instructions',735,'customer_confirmed','[Payment: GCash QR transfer]',false);
    insert into public.conversations(id,source_kind,source_id) values('22222222-2222-4222-8222-222222222222','order_request','${orderId}');
    insert into public.guest_access_grants(id,token_hash,status,expires_at) values
      ('33333333-3333-4333-8333-333333333333',decode('${grant}','hex'),'active',now()+interval '1 day'),
      ('44444444-4444-4444-8444-444444444444',decode('${otherGrant}','hex'),'active',now()+interval '1 day');
    insert into public.guest_access_grant_scopes values
      ('33333333-3333-4333-8333-333333333333','order_request','${orderId}',array['read']),
      ('33333333-3333-4333-8333-333333333333','conversation','22222222-2222-4222-8222-222222222222',array['read','reply']);
  `)
  const guest = read('supabase/migrations/20260812_guest_submission_boundary.sql')
  sql(guest.slice(guest.indexOf('create schema'), guest.indexOf('create or replace function k2_private.contact_hash')))
  sql(guest.slice(guest.indexOf('create or replace function k2_private.consume_guest_rate'), guest.indexOf('create or replace function k2_private.resolve_guest_identity')))
  sql(`insert into k2_private.guest_bff_secrets(request_secret,contact_secret) values(decode('${secret.toString('hex')}','hex'),decode('${secret.toString('hex')}','hex'));`)
  sql(read('supabase/migrations/20260928_order_payment_receipt_chat.sql'))
  // Preserve the real direct reader/messages; add the installed charge projection
  // to this deliberately minimal schema, rather than pretend a price is final.
  sql(`alter function public.get_order_conversation_v1(uuid,text) rename to fixture_order_messages;
    create function public.get_order_conversation_v1(p_order_id uuid,p_order_key text) returns jsonb
    language sql security definer set search_path='' as $$
      select public.fixture_order_messages(p_order_id,p_order_key)||jsonb_build_object(
        'total_amount',o.total_amount,'shipping_quote_status',o.shipping_quote_status,
        'delivery_review_required',o.delivery_review_required)
      from public.order_requests o where o.id=p_order_id and o.idempotency_key=p_order_key $$;`)
  if (!process.argv.includes('--baseline')) sql(read('supabase/migrations/20261014_guest_order_conversation.sql'))
  assert.equal(command('read').public_reference, reference)
  assert.equal(command('read', {}, { grant: null }).ok, false)
  assert.equal(command('read', {}, { grant: otherGrant }).ok, false)
  assert.throws(() => command('read', {}, { forged: true }), /SIGNATURE_INVALID/)
  const message = { message: 'Confirm my order please', idempotencyKey: randomUUID() }
  assert.equal(command('message', message).ok, true)
  assert.equal(command('message', message).ok, true)
  assert.equal(command('message', { ...message, message: 'Changed content' }).error_code, 'IDEMPOTENCY_CONFLICT')
  assert.equal(sql('select count(*) from public.messages;'), '1')
  const bytes = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(30000)])
  const proof = { paymentReference: 'GC-123', mediaType: 'image/png', proofSha256: createHash('sha256').update(bytes).digest('hex'), idempotencyKey: randomUUID() }
  const options = { base64: bytes.toString('base64') }
  sql(`update public.order_requests set delivery_review_required=true;`)
  assert.equal(command('receipt', proof, options).ok, false)
  sql(`update public.order_requests set delivery_review_required=false,payment_status=null;`)
  assert.equal(command('receipt', proof, options).ok, false)
  sql(`update public.order_requests set payment_status='awaiting_instructions';`)
  assert.equal(command('receipt', { ...proof, proofSha256: '0'.repeat(64) }, options).ok, false)
  assert.equal(command('receipt', proof, options).ok, true)
  assert.equal(command('receipt', proof, options).ok, true)
  assert.equal(command('receipt', { ...proof, paymentReference: 'different' }, options).error_code, 'IDEMPOTENCY_CONFLICT')
  assert.equal(sql('select count(*) from k2_private.order_payment_receipts;'), '1')
  assert.equal(sql('select payment_status from public.order_requests;'), 'awaiting_instructions')
  assert.throws(() => sql('set role anon; select * from k2_private.order_payment_receipts;'), /permission denied/)
  assert.throws(() => sql(`set role authenticated; select public.list_order_payment_receipts_v1('${orderId}');`), /AAL2_REQUIRED/)
  const staff = `set role authenticated; set fixture.actor='55555555-5555-4555-8555-555555555555'; set fixture.aal='aal2';`
  const listed = JSON.parse(sql(`${staff} select public.list_order_payment_receipts_v1('${orderId}');`))
  assert.equal(listed.length, 1)
  assert.equal(listed[0].payment_reference, proof.paymentReference)
  const downloaded = JSON.parse(sql(`${staff} select public.get_order_payment_receipt_v1('${listed[0].id}');`))
  assert.equal(downloaded.sha256, proof.proofSha256)
  assert.deepEqual(Buffer.from(downloaded.contents_base64, 'base64'), bytes)
  const nonce = randomUUID()
  assert.equal(command('read', {}, { nonce }).ok, true)
  assert.equal(command('read', {}, { nonce }).error_code, 'REQUEST_REPLAYED')
  sql(`update public.order_requests set payment_status='verified';`)
  assert.equal(command('receipt', proof, options).ok, true)
  assert.equal(command('receipt', { ...proof, idempotencyKey: randomUUID() }, options).ok, false)
  sql(`update public.guest_access_grants set status='expired' where token_hash=decode('${grant}','hex');`)
  assert.equal(command('read').error_code, 'GUEST_ACCESS_EXPIRED')
  sql(`update public.guest_access_grants set status='active';`)
  sql(`insert into k2_private.anonymous_chat_blocks values(decode('${ipHash}','hex'));`)
  assert.equal(command('message', { ...message, idempotencyKey: randomUUID() }).error_code, 'CHAT_BLOCKED')
  sql(read('supabase/migrations/20261014_guest_order_conversation_rollback.sql'))
  assert.equal(sql('select count(*) from k2_private.order_payment_receipts;'), '1')
  assert.equal(sql("select to_regprocedure('public.guest_order_conversation_v1(bigint,uuid,text,text,text,text,text)') is null;"), 't')
  console.log('Native guest order chat/proof: signature, grant isolation, idempotency, charge/payment gates, private proof and data-retaining rollback passed.')
} finally {
  if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop'])
}
