// MAP-018: extend the existing owned-local rehearsal, never a provider executor.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { randomUUID, createHash } from 'node:crypto'
import { isDeepStrictEqual as same } from 'node:util'
import { operatingReplayPackage } from '../docs/evidence/20261004-category-shelf-life/operating-replay-package.mjs'

const q = s => "'" + String(s).replaceAll("'", "''") + "'"
const qi = s => '"' + s.replaceAll('"', '""') + '"'
const sha = s => createHash('sha256').update(s).digest('hex')
const strip = s => {
  if (!/^begin;/i.test(s.trimStart()) || !/commit;\s*$/i.test(s)) throw Error('INSTALL_TRANSACTION_BOUNDARY_DRIFT')
  return s.trimStart().replace(/^begin;/i, '').replace(/commit;\s*$/i, '')
}
const literal = (sql, anchor, json = true) => {
  // The accepted delivery envelope embeds an earlier guarded envelope as a
  // quoted payload. Read its first (outer) constant, never the nested copy.
  const start = sql.indexOf(anchor)
  if (start < 0) throw Error('INSTALL_CONTRACT_ANCHOR_DRIFT')
  let i = start + anchor.length, text = ''
  if (sql[i++] !== "'") throw Error('INSTALL_CONTRACT_LITERAL_REQUIRED')
  for (; i < sql.length; i++) {
    if (sql[i] !== "'") { text += sql[i]; continue }
    if (sql[i + 1] === "'") { text += "'"; i++; continue }
    return json ? JSON.parse(text) : text
  }
  throw Error('INSTALL_CONTRACT_UNTERMINATED')
}

export function qualifyImportedInstallation({ db, dir, bin, out, adapted, good, sql, check, report }) {
  const contractSql = fs.readFileSync('supabase/prepared/category_operating_schema_contract.sql', 'utf8')
  const builderSource = fs.readFileSync('docs/evidence/20261004-category-shelf-life/operating-replay-package.mjs', 'utf8')
  check('logical contract and canonical envelope source pinned', sha(contractSql) === '52184d4b7b6cee2c81d5641608e830675993be482f4f757dec93c7e88be45f47' && sha(builderSource) === 'ecb1ed6d23cb1e85c76494a71406b16fa530d649f44dc2da06d6504a89fe175b')
  const imported = fs.readFileSync('supabase/prepared/imported_draft_continuation.sql', 'utf8')
  check('qualified imported fragment exact source', sha(imported) === '26ec4db009173aef02e3954504c05991937fb4d503769fc5133f3ebaa999d52a')
  const before = literal(adapted, 'v_before constant jsonb:='), foundationAfter = literal(adapted, 'v_after constant jsonb:=')
  const contract = database => JSON.parse(good(database, "set search_path='';" + contractSql))
  const eventSql = "select coalesce(jsonb_agg(jsonb_build_object('name',e.evtname,'event',e.evtevent,'enabled',e.evtenabled,'tags',e.evttags,'owner',pg_get_userbyid(e.evtowner),'function',format('%I.%I(%s)',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid))) order by e.evtname),'[]'::jsonb) from pg_catalog.pg_event_trigger e join pg_catalog.pg_proc p on p.oid=e.evtfoid join pg_catalog.pg_namespace n on n.oid=p.pronamespace"
  const events = database => JSON.parse(good(database, "set search_path='';" + eventSql))
  const expectedEvents = events(db)
  const rowsSql = (initial, omitNewBucket = false) => {
    const tables = initial.relations.filter(r => ['r', 'p'].includes(r.kind))
    const sequences = initial.relations.filter(r => r.kind === 'S')
    return 'select jsonb_build_object(\'tables\',jsonb_object_agg(name,hash order by name),\'sequences\',(select jsonb_object_agg(name,value order by name) from (values ' + sequences.map(r => '(' + q(r.name) + ",(select jsonb_build_object('last_value',s.last_value::text,'is_called',s.is_called) from " + r.name + ' s))').join(',') + ') s(name,value))) from (values ' + tables.map(r => '(' + q(r.name) + ",(select md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' order by to_jsonb(t)::text collate \"C\"),'')) from (select " + r.columns.map(c => qi(c.name)).join(',') + ' from ' + r.name + (omitNewBucket && r.name === 'storage.buckets' ? " where id<>'product-intake-evidence'" : '') + ') t))').join(',') + ') t(name,hash);'
  }
  const projection = (database, initial, omitNewBucket = false) => JSON.parse(good(database, rowsSql(initial, omitNewBucket)))
  const snapshot = (database, initial) => ({ contract: contract(database), rows: projection(database, initial), events: events(database) })
  const coldId = randomUUID(), cold = 'k2_category_cold_' + coldId.replaceAll('-', '')
  const recoveryId = randomUUID(), recovery = 'k2_category_foundation_' + recoveryId.replaceAll('-', '')
  const owned = []
  const create = (database, id, kind, options) => {
    good('postgres', 'create database ' + database + ' with ' + options + ' owner postgres;')
    owned.push({ database, marker: 'K2 category ' + kind + ':' + id, marked: false })
    good('postgres', 'comment on database ' + database + ' is ' + q(owned.at(-1).marker) + ';')
    owned.at(-1).marked = true
  }
  const dump = (database, args) => {
    const r = spawnSync(path.join(bin, 'pg_dump.exe'), ['-h','127.0.0.1','-p','54391','-U','postgres','-d',database,...args], { windowsHide: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    if (r.status !== 0) throw Error(r.stderr || 'INSTALL_DUMP_FAILED')
    return r.stdout
  }
  try {
    check('original contains no evidence bucket that could be excluded', good(db, "select count(*) from storage.buckets where id='product-intake-evidence';") === '0')
    const currentInitial = snapshot(db, before[0])
    check('combined package starts at exact accepted populated contract', same(currentInitial.contract, before[0]))
    check('complete original populated projection is 88 tables and two sequences', Object.keys(currentInitial.rows.tables).length === 88 && Object.keys(currentInitial.rows.sequences).length === 2)
    const locale = JSON.parse(good('postgres', 'select jsonb_build_object(\'encoding\',pg_encoding_to_char(encoding),\'collate\',datcollate,\'ctype\',datctype,\'provider\',datlocprovider) from pg_database where datname=' + q(db) + ';'))
    check('cold source uses supported captured libc locale', locale.provider === 'c')
    const schema = dump(db, ['--schema-only','--clean','--if-exists']).replaceAll('\r', '')
    fs.writeFileSync(path.join(out, 'cold-original-schema.sql'), schema, { flag: 'wx' })
    const backup = path.join(out, 'populated-original.dump')
    dump(db, ['--format=custom','--file=' + backup])
    create(cold, coldId, 'cold', 'template template0 encoding ' + q(locale.encoding) + ' lc_collate ' + q(locale.collate) + ' lc_ctype ' + q(locale.ctype) + ' locale_provider libc')
    good(cold, schema)
    const coldInitial = snapshot(cold, before[1])
    check('cold schema matches entire accepted original contract', same(coldInitial.contract, before[1]))
    check('all 88 cold tables start empty', Object.values(coldInitial.rows.tables).every(h => h === 'd41d8cd98f00b204e9800998ecf8427e'))
    const importedBody = imported.slice(imported.indexOf('\nbegin;') + 1)
    check('imported transaction anchor is unique', imported.split('\nbegin;').length === 2)
    // Reuse the exact accepted contents, replacing only the two nested local
    // admission envelopes with the same complete contract around the union.
    // Repeated multi-megabyte guards exceed the unchanged 10s statement bound.
    const payloadAnchor = "if v_actual is distinct from v_before->v_index then raise exception 'K2_OPERATING_CUTOVER_CONTRACT_CHANGED';end if;\n    execute "
    const canonicalSource = fs.readFileSync('docs/evidence/20261004-category-shelf-life/foundation-qualified-schema-full-launch-boundaries01/full65-22-install.sql', 'utf8')
    check('nested canonical package exact accepted source', sha(canonicalSource) === '4fe8bf869cc0a769055a4aa3bdd4692cb2ee08a23c0a6915e0e824b21b810ba8')
    const localTarget = "current_setting('data_directory') is distinct from 'C:/Users/jerze/K2 JImzon/.tools/current-restore-20260929-pg-data'"
    const canonical = strip(canonicalSource).replace(localTarget, () => "current_setting('data_directory') is distinct from " + q(dir)).replace('inet_server_port() is distinct from 54388', 'inet_server_port() is distinct from 54391')
    const combined = literal(adapted, payloadAnchor, false)
    check('accepted combined payload embeds canonical envelope exactly once', combined.split(canonical).length === 2)
    const fragments = [combined.replace(canonical, () => literal(canonical, payloadAnchor, false)), strip(importedBody)]
    const targets = [db, cold], initial = [currentInitial, coldInitial], after = []
    const changedNames = ['public.create_product_draft_server(', 'public.execute_admin_product_intake_command_v1(', 'public.execute_admin_intake_ai_v1(']
    for (let i = 0; i < targets.length; i++) {
      const calibrated = sql(targets[i], "begin;set local lock_timeout='2s';set local statement_timeout='10s';set local search_path='';" + fragments.join('\n') + '\n' + contractSql + '\nrollback;')
      check('combined calibration executes within rollback ' + i, calibrated.exit === 0)
      after.push(JSON.parse(calibrated.stdout.split('\n').filter(l => l.startsWith('{')).at(-1)))
      check('combined calibration restores complete original snapshot ' + i, same(snapshot(targets[i], before[i]), initial[i]))
      const prior = foundationAfter[i], next = after[i]
      check('imported change preserves every non-function contract field ' + i, same({ ...prior, functions: null }, { ...next, functions: null }))
      const newFunctions = next.functions.filter(f => !prior.functions.some(p => p.identity === f.identity))
      check('only intended private target helper is added ' + i, newFunctions.length === 1 && newFunctions[0].identity.startsWith('k2_private.assert_imported_draft_target_v1(') && newFunctions[0].owner === 'postgres' && newFunctions[0].language === 'plpgsql' && same(newFunctions[0].catalog.proacl, ['postgres=X/postgres']))
      const changed = prior.functions.filter(f => !same(f, next.functions.find(n => n.identity === f.identity)))
      check('exactly three intended function bodies change ' + i, changed.length === 3 && changedNames.every(name => changed.some(f => f.identity.startsWith(name))))
      check('all changed function authority and catalog metadata retained ' + i, changed.every(f => same({ ...f, definition: null }, { ...next.functions.find(n => n.identity === f.identity), definition: null })))
    }
    const pkg = operatingReplayPackage(contractSql, before, after, fragments, { sql: eventSql, expected: expectedEvents })
    const sourceTarget = "current_setting('data_directory') is distinct from 'C:/Users/jerze/K2 JImzon/.tools/current-restore-20260929-pg-data'"
    check('new envelope has one exact local target', pkg.sql.split(sourceTarget).length === 2 && pkg.sql.split('inet_server_port() is distinct from 54388').length === 2)
    pkg.sql = pkg.sql.replace(sourceTarget, () => "current_setting('data_directory') is distinct from " + q(dir)).replace('inet_server_port() is distinct from 54388', 'inet_server_port() is distinct from 54391')
    // Generate the body from these exact adapted bytes for rollback probes.
    const body = strip(pkg.sql)
    fs.writeFileSync(path.join(out, 'combined-imported-install.sql'), pkg.sql, { flag: 'wx' })
    report.installation = { scope: 'Owned PG17.11 current/cold installation only; not provider authority, transport or activation', sha256: sha(pkg.sql), bytes: Buffer.byteLength(pkg.sql), contractSha256: sha(contractSql), builderSha256: sha(builderSource), fragmentSha256: fragments.map(sha), beforeSha256: before.map(v => sha(JSON.stringify(v))), afterSha256: after.map(v => sha(JSON.stringify(v))), backupSha256: sha(fs.readFileSync(backup)), cases: [] }
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i], original = snapshot(target, before[i])
      const drift = sql(target, "begin;set local search_path='';alter table public.products disable row level security;" + body + 'rollback;')
      check('complete fresh envelope refuses original RLS drift ' + i, drift.exit === 3 && drift.stderr.includes('K2_OPERATING_SCHEMA_DRIFT'))
      check('fresh drift refusal conserves full original state ' + i, same(original, snapshot(target, before[i])))
      const interruption = sql(target, 'begin;' + body + "do $interrupt$ begin raise exception 'EXPLICIT_INSTALL_INTERRUPTION';end $interrupt$;commit;")
      check('deliberate failure after successful full apply aborts entire transaction ' + i, interruption.exit === 3 && interruption.stderr.includes('EXPLICIT_INSTALL_INTERRUPTION') && interruption.stderr.includes('K2_OPERATING_FRESH_APPLY'))
      check('aborted full apply restores full original rows, sequences and metadata ' + i, same(original, snapshot(target, before[i])))
      const fresh = sql(target, pkg.sql)
      check('complete combined installation fresh commits ' + i, fresh.exit === 0 && fresh.stderr.includes('K2_OPERATING_FRESH_APPLY'))
      const committed = snapshot(target, before[i])
      check('full exact after contract and event bindings committed ' + i, same(committed.contract, after[i]) && same(committed.events, expectedEvents))
      check('all original 88-table values and two sequence states conserved ' + i, same(projection(target, before[i], true), initial[i].rows))
      const bucket = JSON.parse(good(target, "select to_jsonb(b)-array['created_at','updated_at'] from storage.buckets b where id='product-intake-evidence';"))
      check('only intended private evidence bucket configuration added ' + i, bucket.id === 'product-intake-evidence' && bucket.name === 'product-intake-evidence' && bucket.public === false && bucket.file_size_limit === 10485760 && same(bucket.allowed_mime_types, ['image/jpeg','image/png','image/webp']))
      const replay = sql(target, pkg.sql)
      check('complete installation exact replay admits imported continuation ' + i, replay.exit === 0 && replay.stderr.includes('K2_OPERATING_EXACT_REPLAY') && same(committed, snapshot(target, before[i])))
      const helperDrift = sql(target, "begin;set local search_path='';grant execute on function k2_private.assert_imported_draft_target_v1(uuid,bigint) to authenticated;" + body + 'rollback;')
      check('complete replay refuses helper ACL drift ' + i, helperDrift.exit === 3 && helperDrift.stderr.includes('K2_OPERATING_SCHEMA_DRIFT') && same(committed, snapshot(target, before[i])))
      report.installation.cases.push({ target, originalProjection: initial[i].rows, committedProjection: committed.rows, freshExit: fresh.exit, replayExit: replay.exit })
    }
    create(recovery, recoveryId, 'foundation', 'template template0 encoding ' + q(locale.encoding) + ' lc_collate ' + q(locale.collate) + ' lc_ctype ' + q(locale.ctype) + ' locale_provider libc')
    const restored = spawnSync(path.join(bin, 'pg_restore.exe'), ['-h','127.0.0.1','-p','54391','-U','postgres','-d',recovery,'--exit-on-error',backup], { windowsHide: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    check('populated original backup restores successfully', restored.status === 0)
    check('populated recovery matches entire original contract, 88 tables, two sequences and events', same(snapshot(recovery, before[0]), currentInitial))
    report.installation.populatedRecoveryVerified = true
  } finally {
    for (const entry of owned.reverse()) {
      const identity = good('postgres', "select pg_get_userbyid(datdba)||'|'||coalesce(shobj_description(oid,'pg_database'),'')||'|'||(select count(*) from pg_stat_activity where datname=" + q(entry.database) + ') from pg_database where datname=' + q(entry.database) + ';')
      if (!entry.marked || identity !== 'postgres|' + entry.marker + '|0') throw Error('INSTALL_CLONE_DISPOSAL_REFUSED')
      good('postgres', 'drop database ' + entry.database + ';')
    }
    report.installationClonesRemoved = true
  }
}
