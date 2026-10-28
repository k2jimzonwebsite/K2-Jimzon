// MAP-019: restore an existing encrypted K2 archive on an owned loopback cluster.
// No network/production client. Never prints row contents or backup credentials.
import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { verifyCurrentProductionRestore } from './verify-current-production-restore.mjs'
import { canonicalJson } from '../server/privacy-authority/state.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const namespace = path.join(root, '.tools/privacy-current-schema')
const work = path.join(namespace, randomUUID())
const data = path.join(work, 'data')
const bin = path.join(root, '.tools/postgresql-17.11/runtime/pgsql/bin')
const source = path.join(root, '.tools/current-production-backups/borella-installed-before-merge-20261026.k2backup')
const envelope = path.join(work, 'captured.k2backup')
const database = `k2_current_restore_privacy_${randomUUID().replaceAll('-', '')}`
const migrations = [
  'supabase/migrations/20261027_customer_account_portfolio.sql',
  'supabase/migrations/20261027_customer_privacy_automation.sql',
  'supabase/migrations/20261027_customer_privacy_admin.sql',
]
const coordinatorProtocol = process.argv.includes('--hold-coordinator-protocol')
const addressBookProtocol = process.argv.includes('--address-book-protocol')
const writerProtocol = process.argv.includes('--writer-barrier-protocol')
const writerMigration = 'supabase/migrations/20261028_customer_privacy_writer_barrier.sql'
const writerAssertions = 'supabase/tests/customer_privacy_writer_barrier.sql'
const writerConcurrency = 'supabase/tests/customer_privacy_writer_concurrency.sql'
const addressMigration = 'supabase/migrations/20261028_customer_delivery_addresses.sql'
if (addressBookProtocol) migrations.push(addressMigration)
const holdProtocol = process.argv.includes('--hold-intent-protocol') || coordinatorProtocol
if (addressBookProtocol && holdProtocol) throw new Error('QUALIFICATION_MODES_ARE_EXCLUSIVE')
if (holdProtocol) migrations.push('supabase/migrations/20261027_customer_privacy_hold_intent.sql')
if (coordinatorProtocol) migrations.push('supabase/migrations/20261027_customer_privacy_hold_authority.sql')
const assertions = holdProtocol ? 'supabase/tests/customer_privacy_hold_intent.sql' : 'supabase/tests/customer_privacy_current_schema.sql'
const authorityAssertions = 'supabase/tests/customer_privacy_hold_authority.sql'
const addressAssertions = 'supabase/tests/customer_address_book_assertions.sql'
const addressConcurrency = 'supabase/tests/customer_address_book_concurrency.sql'
const assertionSql = () => [...(addressBookProtocol ? [addressAssertions] : []), assertions, ...(coordinatorProtocol ? [authorityAssertions] : [])].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n')
const holdConcurrencyFile = 'supabase/tests/customer_privacy_hold_concurrency.sql'
const authorityConcurrencyFile = 'supabase/tests/customer_privacy_hold_authority_concurrency.sql'
const coordinatorSources = [authorityAssertions, authorityConcurrencyFile, 'scripts/prove-customer-hold-coordinator.mjs',
  'server/admin-bff/customer-privacy.js', 'server/admin-bff/security.js', 'server/admin-bff/request-deadline.js',
  'server/privacy-authority/native-holds.js', 'server/privacy-authority/bounds.js', 'server/privacy-authority/journal.js',
  'server/privacy-authority/state.js', 'server/privacy-authority/sqlite-witness.js', 'scripts/lib/local-worker-runtime.mjs',
  '.tools/closure-authority-runtime/package-lock.json']
const inventoryFile = 'supabase/tests/customer_privacy_writer_inventory.sql'
const inventoryOnly = process.argv.includes('--inventory-privacy-writers')
if (holdProtocol && inventoryOnly) throw new Error('QUALIFICATION_MODES_ARE_EXCLUSIVE')
if (inventoryOnly && !addressBookProtocol) migrations.push(addressMigration,
  'supabase/migrations/20261027_customer_privacy_hold_intent.sql',
  'supabase/migrations/20261027_customer_privacy_hold_authority.sql')
if (writerProtocol) {
  if (holdProtocol || addressBookProtocol || inventoryOnly) throw new Error('QUALIFICATION_MODES_ARE_EXCLUSIVE')
  migrations.push(addressMigration, 'supabase/migrations/20261027_customer_privacy_hold_intent.sql',
    'supabase/migrations/20261027_customer_privacy_hold_authority.sql')
  if (fs.existsSync(path.join(root, writerMigration))) migrations.push(writerMigration)
}
const hash = value => createHash('sha256').update(value).digest('hex')
const literal = value => "'" + value.replaceAll("'", "''") + "'"
const identifier = value => '"' + value.replaceAll('"', '""') + '"'
const receipt = { mapItem: 'MAP-019', startedAt: new Date().toISOString(), status: 'running', checks: [],
  productionChanged: false, limits: ['Existing 26 October archive, not a new production snapshot.',
    'Restore excludes managed Vault entries and original ACL/owners; not managed privilege, Auth, Storage or hosted acceptance.',
    'Migration transaction rollback only, not a committed downgrade or post-closure recovery safeguard.'],
  sources: [...migrations, inventoryOnly ? inventoryFile : writerProtocol ? writerAssertions : assertions,
    ...(writerProtocol && fs.existsSync(path.join(root, writerConcurrency)) ? [writerConcurrency] : []),
    ...(inventoryOnly ? ['tests/customer-privacy-writer-inventory.test.mjs'] : []), ...(addressBookProtocol ? [addressAssertions,addressConcurrency] : []), ...(coordinatorProtocol ? coordinatorSources : []), ...(holdProtocol ? [holdConcurrencyFile] : [])].map(file => ({ path: file, sha256: hash(fs.readFileSync(path.join(root, file))) })) }
receipt.mode = inventoryOnly ? 'writer-catalog-inventory-only' : writerProtocol ? 'native-writer-barrier-protocol' : addressBookProtocol ? 'address-book-protocol' : coordinatorProtocol ? 'native-hold-coordinator-protocol' : holdProtocol ? 'native-hold-intent-protocol' : 'closure-compatibility'
const startupProbe = process.argv.includes('--prove-startup-recovery')
let startAttempted = false, port, env
fs.mkdirSync(work, { recursive: true })
fs.writeFileSync(path.join(work, 'owned.json'), JSON.stringify({ database, data, purpose: 'MAP-019 loopback qualification' }), { flag: 'wx' })

function run(executable, args, options = {}) {
  const result = spawnSync(path.join(bin, executable + '.exe'), args,
    { env, cwd: root, windowsHide: true, encoding: 'utf8', timeout: 90000, maxBuffer: 64 * 1024 * 1024, ...options })
  if (result.error || result.status !== 0) {
    // Only controlled schema statements run here. Keep data dumps out of errors.
    const error = new Error(`${executable}: ${String(result.stderr || result.error?.message || 'command failed').slice(-3500)}`)
    error.command = executable
    throw error
  }
  return result.stdout || ''
}
const sql = statement => run('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', statement]).trim()
const dumpSchema = () => run('pg_dump', ['--schema-only', '--no-owner', '--no-privileges'])
  .replace(/^\\(?:un)?restrict .*\r?\n/gm, '').replaceAll('\r\n', '\n')
function snapshot() {
  const tables = JSON.parse(sql(`select coalesce(json_agg(json_build_object('schema',n.nspname,'name',c.relname) order by n.nspname,c.relname),'[]')
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relkind in ('r','p') and n.nspname not in ('pg_catalog','information_schema') and n.nspname !~ '^pg_toast'`))
  const rows = tables.map(table => ({ ...table, ...JSON.parse(sql(`select json_build_object('count',count(*),'hash',
    md5(coalesce(string_agg(row_to_json(t)::text,'|' order by row_to_json(t)::text),''))) from ${identifier(table.schema)}.${identifier(table.name)} t`)) }))
  const sequences = snapshotSequences()
  return { schemaHash: hash(dumpSchema()), rows, sequences }
}
function snapshotSequences() {
  const definitions = JSON.parse(sql(`select coalesce(json_agg(to_json(s) order by schemaname,sequencename),'[]') from pg_sequences s`))
  return definitions.map(sequence => ({ ...sequence, state: JSON.parse(sql(`select json_build_object('last_value',last_value::text,
    'is_called',is_called) from ${identifier(sequence.schemaname)}.${identifier(sequence.sequencename)}`)) }))
}
async function availablePort() {
  const listener = net.createServer()
  await new Promise((resolve, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', resolve) })
  const value = listener.address().port
  await new Promise(resolve => listener.close(resolve))
  return value
}

try {
  port = await availablePort()
  env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP,
    PGHOST: '127.0.0.1', PGPORT: String(port), PGUSER: 'postgres', PGDATABASE: 'postgres', PGSSLMODE: 'disable', PGTZ: 'UTC' }
  run('initdb', ['-D', data, '-U', 'postgres', '--auth=trust', '--encoding=UTF8'])
  startAttempted = true
  run('pg_ctl', ['-D', data, '-l', path.join(work, 'postgres.log'), '-o', `-p ${port} -h 127.0.0.1`, '-w', 'start'], { stdio: 'ignore' })
  if (startupProbe) throw new Error('SYNTHETIC_START_ACKNOWLEDGEMENT_LOSS')
  if (path.resolve(sql('show data_directory')) !== path.resolve(data)) throw new Error('OWNED_CLUSTER_IDENTITY_MISMATCH')
  if (!process.env.K2_BACKUP_PASSPHRASE) throw new Error('K2_BACKUP_PASSPHRASE_REQUIRED_FOR_EXISTING_LOCAL_ARCHIVE')
  fs.copyFileSync(source, envelope, fs.constants.COPYFILE_EXCL)
  fs.copyFileSync(`${source}.manifest.json`, `${envelope}.manifest.json`, fs.constants.COPYFILE_EXCL)
  receipt.backup = JSON.parse(fs.readFileSync(`${source}.manifest.json`, 'utf8')).backupId
  sql('create role anon nologin;create role authenticated nologin;create role service_role nologin;create role authenticator nologin;create role supabase_auth_admin nologin;create role supabase_storage_admin nologin;')
  run('createdb', [database])
  const restored = await verifyCurrentProductionRestore({ envelopePath: envelope, passphrase: process.env.K2_BACKUP_PASSPHRASE,
    targetUrl: `postgresql://postgres@127.0.0.1:${port}/${database}` })
  receipt.restore = restored.receipt
  env.PGDATABASE = database
  const sequenceProbe = 'k2_privacy_probe_' + randomUUID().replaceAll('-', '')
  sql(`create sequence public.${identifier(sequenceProbe)}`)
  const sequenceBefore = snapshotSequences()
  const viewBefore = sql(`select row_to_json(s) from pg_sequences s where schemaname='public' and sequencename=${literal(sequenceProbe)}`)
  sql(`select setval(${literal('public.' + sequenceProbe)},42,false)`)
  const sequenceAfter = snapshotSequences()
  const viewAfter = sql(`select row_to_json(s) from pg_sequences s where schemaname='public' and sequencename=${literal(sequenceProbe)}`)
  if (viewBefore !== viewAfter || JSON.stringify(sequenceBefore) === JSON.stringify(sequenceAfter)) throw new Error('UNCALLED_SEQUENCE_NEGATIVE_CONTROL_FAILED')
  sql(`drop sequence public.${identifier(sequenceProbe)}`)
  receipt.checks.push('Negative control detects an uncalled sequence counter change hidden by pg_sequences.')
  const before = snapshot()
  receipt.before = { schemaHash: before.schemaHash, tables: before.rows.length, rows: before.rows.reduce((sum, table) => sum + table.count, 0),
    dataHash: hash(JSON.stringify(before.rows)), sequenceHash: hash(JSON.stringify(before.sequences)) }
  receipt.checks.push('Existing encrypted archive identity/hash and isolated restore passed.')
  console.log(`CURRENT_SCHEMA_BASELINE tables=${receipt.before.tables} rows=${receipt.before.rows}`)
  const stripTransaction = sourceSql => {
    if (!/^begin;$/im.test(sourceSql) || !/^commit;\s*$/im.test(sourceSql)) throw new Error('MIGRATION_TRANSACTION_MARKERS_MISSING')
    return sourceSql.replace(/^begin;\r?\n/im, '').replace(/^commit;\s*$/im, '')
  }
  const transaction = ['begin;', ...migrations.map(file => stripTransaction(fs.readFileSync(path.join(root, file), 'utf8'))),
    inventoryOnly ? fs.readFileSync(path.join(root, inventoryFile), 'utf8') : writerProtocol ? fs.readFileSync(path.join(root, writerAssertions), 'utf8') : holdProtocol ? assertionSql() :
      "select 'CURRENT_SCHEMA_MIGRATIONS_INSTALLED_IN_TRANSACTION';\n" + assertionSql(), 'rollback;'].join('\n')
  let executionFailure
  try {
    const output = run('psql', ['-X', inventoryOnly || holdProtocol ? '-qAt' : '-q', '-v', 'ON_ERROR_STOP=1'], { input: transaction })
    if (inventoryOnly) {
      const inventory = JSON.parse(output.trim())
      fs.writeFileSync(path.join(work, 'writer-inventory.json'), JSON.stringify(inventory, null, 2) + '\n', { flag: 'wx' })
      receipt.inventory = { path: 'writer-inventory.json', sha256: hash(fs.readFileSync(path.join(work, 'writer-inventory.json'))),
        relations: inventory.relations.length, routines: inventory.routines.length }
      const coverage = spawnSync(process.execPath, ['--test', 'tests/customer-privacy-writer-inventory.test.mjs'], {
        cwd: root, env: { ...env, K2_PRIVACY_WRITER_INVENTORY: path.join(work, 'writer-inventory.json') },
        windowsHide: true, encoding: 'utf8', timeout: 10000,
      })
      fs.writeFileSync(path.join(work, 'inventory-coverage.log'), (coverage.stdout || '') + (coverage.stderr || ''), { flag: 'wx' })
      if (coverage.error || coverage.status !== 0) throw new Error('NATIVE_WRITER_INVENTORY_COVERAGE_FAILED')
      receipt.inventory.completeCatalogCheck = true
    }
    if (holdProtocol) {
      const result = JSON.parse(output.trim().split(/\r?\n/).at(-1))
      const nativeKey = createHash('sha256').update('MAP019 synthetic native proof only').digest()
      const executionKey = createHash('sha256').update('MAP019 synthetic execution only').digest()
      for (const exported of Object.values(result.exports)) {
        const body = JSON.parse(exported.proof.body)
        if (canonicalJson(body) !== exported.proof.body || body.commandHash !== hash(canonicalJson(exported.command))
          || body.purpose !== exported.command.kind || body.initiatorId !== exported.command.payload.initiatorId
          || createHmac('sha256', nativeKey).update(exported.proof.body).digest('hex') !== exported.proof.mac
          || createHmac('sha256', executionKey).update(exported.proof.body).digest('hex') === exported.proof.mac) {
          throw new Error('NATIVE_HOLD_CANONICAL_HMAC_COMPOSITION_FAILED')
        }
      }
      fs.writeFileSync(path.join(work, 'hold-protocol.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
      receipt.holdProtocol = { checks: result.checks, nativeProofExportsVerified: Object.keys(result.exports).length,
        sha256: hash(fs.readFileSync(path.join(work, 'hold-protocol.json'))) }
    }
    if (holdProtocol || addressBookProtocol || writerProtocol) {
      // A separate owned clone permits real committed concurrent sessions.
      // The original restore remains under the full before/after conservation gate.
      const clone = `k2_native_${writerProtocol ? 'writer' : addressBookProtocol ? 'address' : 'hold'}_${randomUUID().replaceAll('-', '')}`
      if (!/^k2_native_(?:hold|address|writer)_[0-9a-f]{32}$/.test(clone) || env.PGHOST !== '127.0.0.1') throw new Error('OWNED_NATIVE_CLONE_IDENTITY_REFUSED')
      const cloneEnv = { ...env, PGDATABASE: clone }
      try {
        run('createdb', ['--template', database, clone])
        for (const file of migrations) run('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', file], { env: cloneEnv })
        if (writerProtocol) {
          const concurrent = run('psql', ['-X','-qAt','-v','ON_ERROR_STOP=1','-f',writerConcurrency], { env: cloneEnv })
          receipt.writerBarrier = JSON.parse(concurrent.trim().split(/\r?\n/).at(-1))
          if (receipt.writerBarrier.checks.length !== 13 || receipt.writerBarrier.disconnected !== true) throw new Error('WRITER_BARRIER_QUALIFICATION_FAILED')
        } else if (addressBookProtocol) {
          const concurrent = run('psql', ['-X','-qAt','-v','ON_ERROR_STOP=1','-f',addressConcurrency], { env: cloneEnv })
          receipt.addressConcurrency = JSON.parse(concurrent.trim().split(/\r?\n/).at(-1))
          if (receipt.addressConcurrency.checks.length !== 2 || receipt.addressConcurrency.disconnected !== true) throw new Error('ADDRESS_CONCURRENCY_QUALIFICATION_FAILED')
        } else {
        run('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], { env: cloneEnv,
          input: 'create schema k2_hold_fixture;\n' + assertionSql().replaceAll('pg_temp.', 'k2_hold_fixture.') })
        const concurrent = run('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-f', holdConcurrencyFile], { env: cloneEnv })
        receipt.holdConcurrency = JSON.parse(concurrent.trim().split(/\r?\n/).at(-1))
        if (receipt.holdConcurrency.checks.length !== 4 || receipt.holdConcurrency.disconnected !== true) throw new Error('NATIVE_HOLD_CONCURRENT_COMPOSITION_FAILED')
        if (coordinatorProtocol) {
          const expiry = run('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-f', authorityConcurrencyFile], { env: cloneEnv })
          receipt.holdAuthorityExpiry = JSON.parse(expiry.trim().split(/\r?\n/).at(-1))
          const { proveCustomerHoldCoordinator } = await import('./prove-customer-hold-coordinator.mjs')
          receipt.holdCoordinator = await proveCustomerHoldCoordinator({ bin, env: cloneEnv, work })
        }
        }
      } finally {
        // Exact fresh generated name in this already verified owned loopback cluster.
        run('dropdb', ['--if-exists', '--force', clone])
        const dropped = sql(`select count(*) from pg_database where datname=${literal(clone)}`) === '0'
        receipt[writerProtocol ? 'writerCloneDropped' : addressBookProtocol ? 'addressCloneDropped' : 'holdCloneDropped'] = dropped
        if (!dropped) throw new Error('OWNED_NATIVE_CLONE_DROP_NOT_VERIFIED')
      }
    }
  } catch (error) { executionFailure = error }
  const after = snapshot()
  receipt.after = { schemaHash: after.schemaHash, dataHash: hash(JSON.stringify(after.rows)), sequenceHash: hash(JSON.stringify(after.sequences)) }
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('CURRENT_SCHEMA_TRANSACTION_ROLLBACK_CONSERVATION_FAILED')
  receipt.checks.push('Rollback preserves complete restored schema, all selected tables/rows and exact sequence values/is_called, including after a refused transaction.')
  if (executionFailure) throw executionFailure
  receipt.checks.push(`All ${migrations.length} migrations applied together inside one transaction against the restored schema.`)
  receipt.checks.push(inventoryOnly ? 'Catalog metadata inventory captured without printing row values or source bodies; not complete writer qualification.' : writerProtocol ?
    'Private lock-entry primitives and real-session ordering/refusal/expiry qualify only the entry boundary; complete association guards/manifest/permit/restore remain required.' : holdProtocol ?
    'Native one-shot hold intent/projection/resolution, private grants and cross-language canonical/HMAC checks pass; no genuine Auth/journal/freeze qualification.' :
    'Synthetic account/contact/grant/settings/notification closure and repeated processing pass against original restored constraints/triggers.')
  receipt.status = 'passed'
  console.log(inventoryOnly ? 'CURRENT_SCHEMA_WRITER_CATALOG_AND_ATOMIC_ROLLBACK_PASSED' : writerProtocol ? 'CURRENT_SCHEMA_WRITER_ENTRY_AND_ATOMIC_ROLLBACK_PASSED' : holdProtocol ? 'CURRENT_SCHEMA_NATIVE_HOLD_PROTOCOL_AND_ATOMIC_ROLLBACK_PASSED' : 'CURRENT_SCHEMA_PRIVACY_COMPATIBILITY_AND_ATOMIC_ROLLBACK_PASSED')
} catch (error) {
  if (startupProbe && error.message === 'SYNTHETIC_START_ACKNOWLEDGEMENT_LOSS') {
    receipt.status = 'passed'
    receipt.checks.push('Simulated lost startup acknowledgement before any archive restore; cleanup must still reconcile the owned server.')
  } else {
    receipt.status = 'failed'
    receipt.failure = String(error.message)
    console.error(receipt.failure)
    process.exitCode = 1
  }
} finally {
  try {
    if (startAttempted) {
      spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', data, '-m', 'fast', '-w', 'stop'], { env, windowsHide: true, stdio: 'ignore', timeout: 30000 })
      const status = spawnSync(path.join(bin, 'pg_ctl.exe'), ['-D', data, 'status'], { env, windowsHide: true, stdio: 'ignore', timeout: 5000 })
      receipt.portRefused = await new Promise(resolve => {
        const socket = net.createConnection({ host: '127.0.0.1', port })
        socket.setTimeout(2000)
        socket.once('error', error => { socket.destroy(); resolve(error.code === 'ECONNREFUSED') })
        socket.once('connect', () => { socket.destroy(); resolve(false) })
        socket.once('timeout', () => { socket.destroy(); resolve(false) })
      })
      receipt.clusterStopped = status.status === 3 && !fs.existsSync(path.join(data, 'postmaster.pid')) && receipt.portRefused
      if (!receipt.clusterStopped) throw new Error('OWNED_CLUSTER_STOP_NOT_VERIFIED')
      // Never remove an unverified/computed directory outside this owned run.
      const resolvedData = fs.realpathSync(data), resolvedWork = fs.realpathSync(work), resolvedNamespace = fs.realpathSync(namespace)
      if (!resolvedWork.startsWith(resolvedNamespace + path.sep) || resolvedData !== path.join(resolvedWork, 'data')) throw new Error('OWNED_CLEANUP_PATH_REFUSED')
      fs.rmSync(resolvedData, { recursive: true })
      receipt.restoredPlaintextRemoved = !fs.existsSync(data)
    }
  } catch (error) {
    process.exitCode = 1
    receipt.status = 'failed'
    receipt.cleanupFailure = String(error.message)
    receipt.recovery = `Inspect owned cluster only at ${data}; stop/verify its server before removing its plaintext data. Preserve this receipt.`
    console.error(receipt.cleanupFailure)
  }
  receipt.completedAt = new Date().toISOString()
  fs.writeFileSync(path.join(work, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' })
  console.log(`Redacted qualification receipt: ${path.relative(root, path.join(work, 'receipt.json'))}`)
}
