// Isolated synthetic Auth + captured real verifier. Never loads the K2 environment.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { spawnSync, spawn } from 'node:child_process'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const migration = path.join(root, 'supabase/migrations/20261021_product_families.sql')
assert.ok(fs.existsSync(migration), 'product family migration is missing')
const work = path.join(root, '.tools/product-families', randomUUID())
const bin = path.join(root, '.tools/postgresql-17.11/runtime/pgsql/bin')
const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: '55328', PGUSER: 'postgres', PGDATABASE: 'postgres', PGPASSWORD: '', PGOPTIONS: '', PGSSLMODE: 'disable' }
const actor = '11111111-1111-4111-8111-111111111111', familyId = '22222222-2222-4222-8222-222222222222'
const secret = Buffer.alloc(32, 39), checks = []
const literal = value => "'" + String(value).replaceAll("'", "''") + "'"
let started = false, failure
fs.mkdirSync(work, { recursive: true })
function run(name, args, options = {}) {
  const result = spawnSync(path.join(bin, `${name}.exe`), args, { cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 60000, ...options })
  if (result.error || result.status !== 0) throw Error(String(result.stderr || result.stdout || result.error?.message).slice(-3500))
  return String(result.stdout || '').trim()
}
const sql = text => run('psql', ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', text])
const session = `set role authenticated; set k2.staff='on'; set k2.admin='on'; set request.jwt.claim.sub='${actor}'; set request.jwt.claim.aal='aal2';`
function signed(payload, key = randomUUID(), signature) {
  const text = JSON.stringify(payload), timestamp = Math.round(Date.now() / 1000), nonce = randomUUID()
  const message = ['product_family_save', timestamp, nonce, actor, key, createHash('sha256').update(text).digest('hex')].join('\n')
  const mac = signature ?? createHmac('sha256', secret).update(message).digest('hex')
  return `public.execute_admin_product_family_v1('product_family_save',${timestamp},${literal(nonce)},${literal(key)},${literal(text)},${literal(mac)})`
}
function check(name, query, expected = 't') {
  const actual = sql(query).split(/\r?\n/).filter(Boolean).pop()
  assert.equal(actual, expected, name)
  checks.push(name); console.log('[ok]', name)
}
const refusal = (call, message) => `do $$ begin perform ${call}; raise exception 'UNEXPECTED_SUCCESS'; exception when others then if sqlerrm <> '${message}' then raise; end if; end $$; select true;`
const payload = { familyId, expectedVersion: 0, name: 'Synthetic coffee', axes: ['Flavour', 'Weight'], members: [
  { sku: 'a', options: { Flavour: 'Classic', Weight: '250 g' } },
  { sku: 'b', options: { Flavour: 'Classic', Weight: '500 g' } },
  { sku: 'c', options: { Flavour: 'Vanilla', Weight: '250 g' } },
  { sku: 'd', options: { Flavour: 'Unpublished', Weight: '1 kg' } },
] }
try {
  run('initdb', ['-D', path.join(work, 'data'), '-U', 'postgres', '--auth=trust', '--encoding=UTF8'])
  run('pg_ctl', ['-D', path.join(work, 'data'), '-l', path.join(work, 'postgres.log'), '-o', `-p ${env.PGPORT} -h 127.0.0.1`, '-w', 'start'], { stdio: 'ignore' })
  started = true
  const captured = JSON.parse(fs.readFileSync(path.join(root, 'docs/acceptance/product-knowledge-install-20261021/live-function-metadata.json'), 'utf8'))
  const verifier = captured.find(row => row.schema === 'k2_private' && row.name === 'verify_admin_bff_request')
  assert.ok(verifier?.definition, 'captured K2 verifier missing')
  sql(`create schema extensions; create extension pgcrypto with schema extensions; create schema auth; create schema k2_private;
    create role anon nologin; create role authenticated nologin;
    grant usage on schema public,auth,extensions to anon,authenticated;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('request.jwt.claim.aal',true)) $$;
    create function public.is_staff() returns boolean language sql stable as $$ select coalesce(current_setting('k2.staff',true),'off')='on' $$;
    create function public.is_admin() returns boolean language sql stable as $$ select coalesce(current_setting('k2.admin',true),'off')='on' $$;
    create table k2_private.admin_bff_secrets(singleton boolean primary key,request_secret bytea);
    insert into k2_private.admin_bff_secrets values(true,decode('${secret.toString('hex')}','hex'));
    create table k2_private.admin_request_rate_buckets(scope text,subject text,bucket_start timestamptz,hit_count int,primary key(scope,subject,bucket_start));
    create table k2_private.admin_request_nonces(actor_id uuid,action text,nonce uuid,expires_at timestamptz,verified_backend_pid int,verified_transaction_id xid8,primary key(actor_id,action,nonce));
    create table k2_private.admin_command_receipts(actor_id uuid,action text,idempotency_key uuid,payload_hash text,result jsonb,created_at timestamptz default now(),completed_at timestamptz,primary key(actor_id,action,idempotency_key));
    ${verifier.definition}; revoke all on function k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text) from public,anon,authenticated;
    create table public.products(id uuid primary key default gen_random_uuid(),sku text unique,name text,brand_id uuid,category_id uuid,status text,published boolean);
    insert into public.products(sku,name,status,published) select x,x,'Live',x<>'d' from unnest(array['a','b','c','d','e']) x;
    create table public.fixture_website(sku text primary key); insert into public.fixture_website values('a'),('b'),('c'),('d');
    create view public.v_storefront_visible_skus as select sku from public.fixture_website;
    create table public.product_batches(id int,sku text,quantity int); insert into public.product_batches values(1,'a',7),(2,'b',3);
    create table public.orders(id int,sku text,quantity int); insert into public.orders values(1,'a',1);
    grant select on public.products,public.v_storefront_visible_skus to anon,authenticated;`)
  const before = sql(`select jsonb_build_array((select jsonb_agg(p order by sku) from public.products p),(select jsonb_agg(b) from public.product_batches b),(select jsonb_agg(o) from public.orders o));`)
  check('signed command is absent before this local installation', "select to_regprocedure('public.execute_admin_product_family_v1(text,bigint,uuid,uuid,text,text)') is null")
  run('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', migration])
  check('Staff cannot save grouping', session + "set k2.admin='off';" + refusal(signed(payload), 'K2_FAMILY_ADMIN_REQUIRED'))
  check('AAL1 cannot save grouping', session + "set request.jwt.claim.aal='aal1';" + refusal(signed(payload), 'K2_FAMILY_ADMIN_REQUIRED'))
  check('invalid signature refused', session + refusal(signed(payload, randomUUID(), '0'.repeat(64)), 'K2_ADMIN_SIGNATURE_INVALID'))
  const key = randomUUID()
  check('one signed decision records version one', session + `select (${signed(payload, key)}->>'version')='1';`)
  check('lost-reply retry returns exact original version', session + `select (${signed(payload, key)}->>'version')='1';`)
  check('same key changed payload refused', session + refusal(signed({ ...payload, name: 'Changed' }, key), 'K2_ADMIN_IDEMPOTENCY_CONFLICT'))
  check('stale family version refused', session + refusal(signed(payload), 'K2_FAMILY_VERSION_CONFLICT'))
  check('duplicate combinations refused', session + refusal(signed({ ...payload, expectedVersion: 1, members: [payload.members[0], { ...payload.members[1], options: payload.members[0].options }] }), 'K2_FAMILY_INVALID'))
  check('unknown payload fields refused', session + refusal(signed({ ...payload, expectedVersion: 1, stock: 40 }), 'K2_FAMILY_INVALID'))
  check('public reader excludes unpublished and non-Website SKUs', `set role anon; select count(*)=3 and bool_and(sku in ('a','b','c')) from public.read_storefront_product_families_v1(array['a','b','c','d','e']);`)
  check('direct anonymous grouping writes denied', "set role anon; do $$ begin delete from public.product_family_members; raise exception 'UNEXPECTED_SUCCESS'; exception when insufficient_privilege then null; end $$; select true;")
  check('direct authenticated grouping writes denied', session + "do $$ begin update public.product_families set name='Bad'; raise exception 'UNEXPECTED_SUCCESS'; exception when insufficient_privilege then null; end $$; select true;")
  check('taxonomy drift drops grouping while retaining individual products', `begin; update public.products set brand_id='33333333-3333-4333-8333-333333333333' where sku='a'; set role anon; select count(*)=0 from public.read_storefront_product_families_v1(array['a','b','c']); rollback;`)
  check('Admin reader returns complete family for a single selected SKU', session + `select jsonb_array_length(public.read_admin_product_families_v1(array['b'],null)->'family'->'members')=4;`)
  const claim = id => ({ ...payload, familyId: id, members: [{ sku: 'e', options: { Flavour: 'Classic', Weight: '250 g' } }] })
  const parallel = text => new Promise(resolve => {
    const child = spawn(path.join(bin, 'psql.exe'), ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', session + `select ${signed(text)};`], { cwd: root, env, windowsHide: true })
    let output = ''; child.stdout.on('data', chunk => { output += chunk }); child.stderr.on('data', chunk => { output += chunk })
    child.on('error', error => resolve({ code: -1, output: error.message })); child.on('exit', code => resolve({ code, output }))
  })
  const race = await Promise.all([parallel(claim(randomUUID())), parallel(claim(randomUUID()))])
  assert.equal(race.filter(result => result.code === 0).length, 1)
  assert.ok(race.find(result => result.code !== 0)?.output.includes('K2_FAMILY_MEMBERSHIP_CONFLICT'))
  checks.push('concurrent same-SKU claims have one winner and one atomic refusal'); console.log('[ok]', checks.at(-1))
  const after = sql(`select jsonb_build_array((select jsonb_agg(p order by sku) from public.products p),(select jsonb_agg(b) from public.product_batches b),(select jsonb_agg(o) from public.orders o));`)
  assert.equal(after, before); checks.push('all original product, lot and order rows unchanged')
  check('ungrouping preserves history and releases only membership', session + `select (${signed({ ...payload, expectedVersion: 1, members: [], axes: [] })}->>'version')='2';`)
  check('events and receipts retain one record per applied decision', "select (select count(*) from k2_private.product_family_events)=3 and (select count(*) from k2_private.admin_command_receipts where action='product_family_save')=3;")
} catch (error) { failure = error; console.error(error.message); process.exitCode = 1 }
finally {
  if (started) run('pg_ctl', ['-D', path.join(work, 'data'), '-m', 'fast', '-w', 'stop'])
  fs.writeFileSync(path.join(work, 'receipt.json'), JSON.stringify({ status: failure ? 'failed' : 'passed', checks, error: failure?.message, stopped: started, migrationSha256: createHash('sha256').update(fs.readFileSync(migration)).digest('hex'), scope: 'isolated local PostgreSQL; synthetic staff/Auth/products; captured verifier; no production or hosted claim' }, null, 2))
  console.log('Receipt:', path.join(work, 'receipt.json'))
}
