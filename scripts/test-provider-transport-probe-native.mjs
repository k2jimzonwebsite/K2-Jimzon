// MAP-018: synthetic PostgreSQL17.6 transaction schedules, never a provider dispatcher.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareTransportProbe } from './prepare-provider-transport-probe.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const bin = path.join(root, '.tools/postgresql-17.6/runtime/pgsql/bin');
const dir = fs.mkdtempSync(path.join(root, '.tools/map018-transport-native-'));
const data = path.join(dir, 'data');
const port = '54437';
let sequence = 0;
let started = false;
const results = [];
const sha = value => createHash('sha256').update(value).digest('hex');
const literal = value => `'${value.replaceAll("'", "''")}'`;
const run = (program, args, input) => {
  const id = String(++sequence).padStart(2, '0');
  const outputFile = path.join(dir, `${id}-${program}.stdout`);
  const errorFile = path.join(dir, `${id}-${program}.stderr`);
  const outputFd = fs.openSync(outputFile, 'wx');
  const errorFd = fs.openSync(errorFile, 'wx');
  const inputFile = path.join(dir, `${id}-input.sql`);
  if (input) fs.writeFileSync(inputFile, input, { flag: 'wx' });
  const effectiveArgs = program === 'psql' && input ? [...args, '-f', inputFile] : args;
  let result;
  try {
    // Windows postgres descendants can inherit pg_ctl's pipe handles after pg_ctl exits.
    result = spawnSync(path.join(bin, `${program}.exe`), effectiveArgs,
      { encoding: 'utf8', windowsHide: true, timeout: 45000,
        stdio: ['ignore', outputFd, errorFd], maxBuffer: 32 * 1024 * 1024 });
  } finally {
    fs.closeSync(outputFd);
    fs.closeSync(errorFd);
  }
  result.stdout = fs.readFileSync(outputFile, 'utf8');
  result.stderr = fs.readFileSync(errorFile, 'utf8');
  fs.writeFileSync(path.join(dir, `${id}-${program}.json`), JSON.stringify({ status: result.status,
    error: result.error?.code ?? null, stdout: result.stdout, stderr: result.stderr }));
  if (result.error) throw Error(`LOCAL_${program}_FAILED_${result.error.code}`);
  return result;
};
const sql = query => run('psql', ['-X', '-h', '127.0.0.1', '-p', port, '-U', 'k2_transport_bootstrap',
  '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], query);
const good = query => {
  const result = sql(query);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
const refuses = (query, code) => {
  const result = sql(query);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(code));
};
const absent = probe => assert.equal(good(`SELECT to_regnamespace('${probe.schema}') IS NULL;`), 't');
const inner = probe => probe.query.replace(/^BEGIN;\n/, '').replace(/COMMIT;\n$/, '');
const receipt = probe => `INSERT INTO supabase_migrations.schema_migrations VALUES(${literal(probe.name)},${literal(probe.name)},ARRAY[${literal(probe.query)}]);`;
const atomic = probe => `BEGIN; SET LOCAL ROLE postgres; ${inner(probe)} RESET ROLE; ${receipt(probe)} COMMIT;`;
const check = (name, action) => {
  action();
  results.push({ name, passed: true });
  console.log(`PASS ${name}`);
};

for (const file of ['prepare-provider-transport-probe.mjs', 'test-provider-transport-probe-native.mjs']) {
  fs.copyFileSync(path.join(root, 'scripts', file), path.join(dir, file), fs.constants.COPYFILE_EXCL);
}
try {
  assert.equal(run('initdb', ['-D', data, '-U', 'k2_transport_bootstrap', '-A', 'trust', '--encoding=UTF8', '--locale=C']).status, 0);
  const start = run('pg_ctl', ['-D', data, '-l', path.join(dir, 'postgres.log'), '-w', '-t', '30',
    '-o', `-h 127.0.0.1 -p ${port}`, 'start']);
  started = start.status === 0;
  assert.equal(start.status, 0, start.stderr);
  good(`CREATE ROLE postgres NOLOGIN NOSUPERUSER;
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
GRANT CREATE ON DATABASE postgres TO postgres;
CREATE SCHEMA supabase_migrations;
CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY,name text,statements text[]);
GRANT USAGE ON SCHEMA supabase_migrations TO postgres;
GRANT SELECT ON supabase_migrations.schema_migrations TO postgres;
CREATE TABLE public.business_control(id integer PRIMARY KEY,payload text NOT NULL);
INSERT INTO public.business_control VALUES(1,'synthetic unchanged control');`);
  const before = good(`SELECT md5(jsonb_agg(to_jsonb(b) ORDER BY id)::text) FROM public.business_control b;`);
  const success = prepareTransportProbe('success');
  const inside = prepareTransportProbe('inside_failure');
  const after = prepareTransportProbe('after_commit_failure');
  check('raw envelope without same-transaction history refuses and rolls back', () => {
    refuses(`SET ROLE postgres; ${success.query}`, 'K2_TRANSPORT_HISTORY_NOT_SAME_TOP_TRANSACTION');
    absent(success);
  });
  check('inner exception rolls back marker and leaves no history', () => {
    refuses(atomic(inside), 'K2_TRANSPORT_INSIDE_FAILURE');
    absent(inside);
    assert.equal(good(`SELECT count(*) FROM supabase_migrations.schema_migrations WHERE name=${literal(inside.name)};`), '0');
  });
  check('platform-history write failure rolls back synthetic marker', () => {
    refuses(`BEGIN; SET LOCAL ROLE postgres; ${inner(success)} RESET ROLE;
INSERT INTO supabase_migrations.schema_migrations VALUES(NULL,'invalid',NULL); COMMIT;`, 'null value');
    absent(success);
  });
  check('subtransaction history xmin is conservatively refused', () => {
    refuses(`BEGIN; SET LOCAL ROLE postgres; ${inner(success)} RESET ROLE;
SAVEPOINT history_subtransaction; ${receipt(success)} RELEASE SAVEPOINT history_subtransaction; COMMIT;`,
    'K2_TRANSPORT_HISTORY_NOT_SAME_TOP_TRANSACTION');
    absent(success);
  });
  check('full-size atomic wrapper commits durable witness and exact statement pin', () => {
    good(atomic(success));
    assert.equal(good(`SELECT witnessed AND history_version=probe_name AND history_xmin::text::numeric=mod(marker_xid::text::numeric,4294967296) FROM ${success.schema}.probe;`), 't');
    const readback = JSON.parse(good(success.readbackQuery));
    assert.equal(readback.schemaExists, true);
    assert.equal(readback.history.length, 1);
    assert.equal(readback.history[0].statementPins[0].sha256, success.querySha256);
    assert.equal(readback.history[0].statementPins[0].bytes, Buffer.byteLength(success.query));
  });
  check('pre-existing names refuse without changing accepted witness', () => {
    refuses(atomic(success), 'K2_TRANSPORT_FRESH_NAMES_REQUIRED');
    assert.equal(good(`SELECT count(*) FROM ${success.schema}.probe WHERE witnessed;`), '1');
  });
  check('cleanup refuses ACL drift and preserves objects', () => {
    good(`SET ROLE postgres; GRANT SELECT ON ${success.schema}.probe TO anon;`);
    refuses(`SET ROLE postgres; ${success.cleanupQuery}`, 'K2_TRANSPORT_CLEANUP_ACL');
    assert.equal(good(`SELECT to_regclass('${success.schema}.probe') IS NOT NULL;`), 't');
    good(`SET ROLE postgres; REVOKE SELECT ON ${success.schema}.probe FROM anon;`);
  });
  check('cleanup refuses extra object and preserves all marker objects', () => {
    good(`SET ROLE postgres; CREATE TABLE ${success.schema}.unexpected(id integer);`);
    refuses(`SET ROLE postgres; ${success.cleanupQuery}`, 'K2_TRANSPORT_CLEANUP_OBJECTS');
    assert.equal(good(`SELECT to_regclass('${success.schema}.probe') IS NOT NULL;`), 't');
    good(`SET ROLE postgres; DROP TABLE ${success.schema}.unexpected;`);
  });
  check('exact cleanup succeeds and retains successful migration history', () => {
    good(`SET ROLE postgres; ${success.cleanupQuery}`);
    absent(success);
    assert.equal(good(`SELECT count(*) FROM supabase_migrations.schema_migrations WHERE name=${literal(success.name)};`), '1');
  });
  check('post-commit error exposes committed marker/history in split schedule', () => {
    const tail = after.query.slice(after.query.indexOf('DO $failure$'));
    refuses(`BEGIN; SET LOCAL ROLE postgres; ${after.doBody} RESET ROLE; ${receipt(after)} COMMIT; ${tail}`,
      'K2_TRANSPORT_AFTER_COMMIT_FAILURE');
    assert.equal(good(`SELECT witnessed FROM ${after.schema}.probe;`), 't');
    good(`SET ROLE postgres; ${after.cleanupQuery}`);
    absent(after);
  });
  check('synthetic business control remains exact', () => {
    assert.equal(good(`SELECT md5(jsonb_agg(to_jsonb(b) ORDER BY id)::text) FROM public.business_control b;`), before);
  });
} finally {
  if (started || fs.existsSync(path.join(data, 'postmaster.pid'))) {
    const stopped = run('pg_ctl', ['-D', data, '-m', 'fast', '-w', '-t', '30', 'stop']);
    assert.equal(stopped.status, 0, stopped.stderr);
  }
  const status = run('pg_ctl', ['-D', data, 'status']);
  assert.equal(status.status, 3, status.stdout);
  const sourcePins = ['prepare-provider-transport-probe.mjs', 'test-provider-transport-probe-native.mjs'].map(file =>
    ({ file: `scripts/${file}`, sha256: sha(fs.readFileSync(path.join(dir, file))) }));
  fs.writeFileSync(path.join(dir, 'receipt.json'), JSON.stringify({ owningMap: 'MAP-018',
    scope: 'Synthetic ordinary PostgreSQL17.6 transaction schedules only; not actual API, captured full provider, installer or business recovery.',
    providerWrites: false, providerReads: false, started, stopped: status.status === 3,
    results, sourcePins }, null, 2));
  console.log(JSON.stringify({ directory: dir, passed: results.length, stopped: status.status === 3 }));
}
