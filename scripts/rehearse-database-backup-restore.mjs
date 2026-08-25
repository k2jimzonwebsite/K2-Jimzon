#!/usr/bin/env node
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createEncryptedBackup, decryptAndVerifyBackup } from './backup-database-encrypted.mjs'
import { validateLocalTarget } from './rehearse-local-migration.mjs'

const MAX_REHEARSAL_DUMP_BYTES = 64 * 1024 * 1024

export function validateBackupRehearsalTargets(source, target) {
  const sourceLocal = validateLocalTarget(source)
  const targetLocal = validateLocalTarget(target)
  if (!sourceLocal.isLocal) return { valid: false, reason: `SOURCE_${sourceLocal.reason}` }
  if (!targetLocal.isLocal) return { valid: false, reason: `TARGET_${targetLocal.reason}` }
  let sourceUrl
  let targetUrl
  try { sourceUrl = new URL(source); targetUrl = new URL(target) }
  catch { return { valid: false, reason: 'TARGET_URL_INVALID' } }
  const sourceDb = decodeURIComponent(sourceUrl.pathname.replace(/^\//, ''))
  const targetDb = decodeURIComponent(targetUrl.pathname.replace(/^\//, ''))
  if (!/^k2_catalog_rehearsal[a-z0-9_-]*$/.test(sourceDb)) {
    return { valid: false, reason: 'SOURCE_REHEARSAL_DATABASE_NAME_REQUIRED' }
  }
  if (!/^k2_restore_rehearsal[a-z0-9_-]*$/.test(targetDb)) {
    return { valid: false, reason: 'TARGET_REHEARSAL_DATABASE_NAME_REQUIRED' }
  }
  if (sourceUrl.href === targetUrl.href) return { valid: false, reason: 'SOURCE_TARGET_MUST_DIFFER' }
  return { valid: true, sourceUrl, targetUrl, sourceDb, targetDb }
}

function databaseEnvironment(parsed) {
  return {
    ...process.env,
    PGHOST: parsed.hostname.replace(/^\[|\]$/g, ''),
    PGPORT: parsed.port || '5432',
    PGUSER: decodeURIComponent(parsed.username || 'postgres'),
    PGPASSWORD: decodeURIComponent(parsed.password || ''),
    PGDATABASE: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
  }
}

function runBinary(executable, args, env, { input, encoding = null, label }) {
  const result = spawnSync(executable, args, {
    env, input, encoding, windowsHide: true, maxBuffer: MAX_REHEARSAL_DUMP_BYTES,
  })
  if (result.error || result.status !== 0) {
    const detail = Buffer.isBuffer(result.stderr) ? result.stderr.toString('utf8') : String(result.stderr || result.error?.message || '')
    throw new Error(`${label} failed: ${detail.trim()}`)
  }
  return result.stdout
}

const fingerprintSql = `select jsonb_build_object(
  'products', (select count(*) from public.products),
  'operations', (select count(*) from k2_private.catalog_import_operations),
  'events', (select count(*) from k2_private.catalog_import_row_events),
  'product_hash', (select encode(extensions.digest(convert_to(coalesce(jsonb_agg(to_jsonb(x) order by x.sku)::text,'[]'),'UTF8'),'sha256'),'hex') from public.products x),
  'operation_hash', (select encode(extensions.digest(convert_to(coalesce(jsonb_agg(to_jsonb(x) order by x.operation_id)::text,'[]'),'UTF8'),'sha256'),'hex') from k2_private.catalog_import_operations x),
  'event_hash', (select encode(extensions.digest(convert_to(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text,'[]'),'UTF8'),'sha256'),'hex') from k2_private.catalog_import_row_events x),
  'commit_execute', has_function_privilege('authenticated','public.execute_admin_catalog_import_v1(text,bigint,uuid,uuid,text,text)','EXECUTE'),
  'status_execute', has_function_privilege('authenticated','public.read_admin_catalog_import_status_v1(uuid)','EXECUTE')
)::text;`

function readFingerprint(psql, parsed) {
  return String(runBinary(psql, ['-X', '--no-psqlrc', '-At', '-v', 'ON_ERROR_STOP=1', '-c', fingerprintSql], databaseEnvironment(parsed), {
    encoding: 'utf8', label: 'database fingerprint',
  })).trim()
}

export async function rehearseDatabaseBackupRestore({
  source, target,
  pgDump = process.env.PG_DUMP_BIN || 'pg_dump',
  pgRestore = process.env.PG_RESTORE_BIN || 'pg_restore',
  psql = process.env.PSQL_BIN || 'psql',
  passphrase = crypto.randomBytes(32).toString('base64url'),
}) {
  const check = validateBackupRehearsalTargets(source, target)
  if (!check.valid) throw new Error(`SECURITY_REFUSAL: ${check.reason}`)
  if (passphrase.length < 24) throw new Error('REHEARSAL_PASSPHRASE_TOO_SHORT')
  const sourceFingerprint = readFingerprint(psql, check.sourceUrl)
  const targetObjects = String(runBinary(psql, ['-X', '--no-psqlrc', '-At', '-c', `select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname not in ('pg_catalog','information_schema') and n.nspname !~ '^pg_toast';`], databaseEnvironment(check.targetUrl), {
    encoding: 'utf8', label: 'empty-target preflight',
  })).trim()
  if (targetObjects !== '0') throw new Error('RESTORE_TARGET_NOT_EMPTY')

  const backupStartedAt = Date.now()
  const dump = runBinary(pgDump, ['--format=custom', '--no-owner'], databaseEnvironment(check.sourceUrl), { label: 'pg_dump' })
  if (!Buffer.isBuffer(dump) || dump.length < 1) throw new Error('DATABASE_DUMP_EMPTY')
  const encrypted = await createEncryptedBackup({ sourceData: dump, passphrase })
  const restoredDump = await decryptAndVerifyBackup({ backupEnvelope: encrypted.envelope, passphrase })
  const beforeHash = crypto.createHash('sha256').update(dump).digest()
  const afterHash = crypto.createHash('sha256').update(restoredDump).digest()
  if (!crypto.timingSafeEqual(beforeHash, afterHash)) throw new Error('DECRYPTED_DUMP_FIDELITY_FAILED')
  const restoreStartedAt = Date.now()
  runBinary(pgRestore, ['--exit-on-error', '--no-owner', '--dbname', check.targetDb], databaseEnvironment(check.targetUrl), {
    input: restoredDump, label: 'pg_restore',
  })
  const targetFingerprint = readFingerprint(psql, check.targetUrl)
  if (sourceFingerprint !== targetFingerprint) throw new Error('RESTORE_FINGERPRINT_MISMATCH')
  return {
    dumpBytes: dump.length,
    encryptedBytes: encrypted.byteLength,
    encryptedSha256: encrypted.sha256,
    backupDurationMs: restoreStartedAt - backupStartedAt,
    restoreDurationMs: Date.now() - restoreStartedAt,
    fingerprintMatched: true,
  }
}

async function main() {
  const source = process.env.K2_BACKUP_REHEARSAL_SOURCE_URL
  const target = process.env.K2_BACKUP_REHEARSAL_TARGET_URL
  if (!source || !target) {
    console.error('BLOCKED_LOCAL_DATABASE_UNAVAILABLE: set both K2 backup rehearsal URLs.')
    process.exit(2)
  }
  try {
    const result = await rehearseDatabaseBackupRestore({ source, target })
    console.log(`Encrypted database backup/restore rehearsal passed (${result.dumpBytes} dump bytes, ${result.encryptedBytes} encrypted bytes, backup ${result.backupDurationMs} ms, restore ${result.restoreDurationMs} ms, fingerprint matched).`)
  } catch (error) {
    console.error(error.message)
    process.exit(2)
  }
}

if (process.argv[1]?.endsWith('rehearse-database-backup-restore.mjs')) main()
