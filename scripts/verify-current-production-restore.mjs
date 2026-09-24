#!/usr/bin/env node
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decryptAndVerifyBackup } from './backup-database-encrypted.mjs'
import { currentBackupAuthenticatedData } from './backup-current-production.mjs'
import {
  productsOldArchiveFingerprintFromRows,
  productsOldArchiveRowsSql,
} from './create-map017-production-backup.mjs'
import { filterLoopbackRestoreToc } from './verify-map017-production-backup-restore.mjs'

const PROJECT_REF = 'pixplcjqivlfflickobf'
const PURPOSE = 'current-schema-pre-account-guest-permission-cutover'
const root = fileURLToPath(new URL('..', import.meta.url))
const postgresBin = path.join(root, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin')
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex')

function run(executable, args, env, label, options = {}) {
  const result = spawnSync(executable, args, {
    env, windowsHide: true, maxBuffer: 1024 * 1024 * 1024, ...options,
  })
  if (result.error || result.status !== 0) throw new Error(`CURRENT_RESTORE_REFUSAL: ${label}`)
  return result.stdout
}

export async function verifyCurrentProductionRestore({ envelopePath, passphrase, targetUrl }) {
  if (!passphrase || passphrase.length < 24) throw new Error('CURRENT_RESTORE_REFUSAL: PASSPHRASE_TOO_SHORT')
  let target
  try { target = new URL(targetUrl) } catch { throw new Error('CURRENT_RESTORE_REFUSAL: TARGET_URL_INVALID') }
  const database = decodeURIComponent(target.pathname.slice(1))
  if (!['postgres:', 'postgresql:'].includes(target.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    || !/^k2_current_restore_[a-z0-9_-]+$/.test(database)) {
    throw new Error('CURRENT_RESTORE_REFUSAL: DEDICATED_LOOPBACK_TARGET_REQUIRED')
  }
  const [envelope, manifestText] = await Promise.all([
    fs.readFile(envelopePath), fs.readFile(`${envelopePath}.manifest.json`, 'utf8'),
  ])
  let manifest
  try { manifest = JSON.parse(manifestText) } catch { throw new Error('CURRENT_RESTORE_REFUSAL: MANIFEST_INVALID') }
  if (manifest.formatVersion !== 1 || manifest.projectRef !== PROJECT_REF || manifest.purpose !== PURPOSE
    || manifest.encryptedBytes !== envelope.length || manifest.encryptedSha256 !== sha256(envelope)) {
    throw new Error('CURRENT_RESTORE_REFUSAL: ENVELOPE_IDENTITY_MISMATCH')
  }
  let dump
  try {
    dump = await decryptAndVerifyBackup({
      backupEnvelope: envelope, passphrase,
      authenticatedData: currentBackupAuthenticatedData(manifest),
    })
  } catch { throw new Error('CURRENT_RESTORE_REFUSAL: ENVELOPE_AUTHENTICATION_FAILED') }
  if (dump.subarray(0, 5).toString('ascii') !== 'PGDMP'
    || dump.length !== manifest.dumpBytes || sha256(dump) !== manifest.dumpSha256) {
    throw new Error('CURRENT_RESTORE_REFUSAL: DUMP_CHECKSUM_MISMATCH')
  }
  const env = {
    ...process.env,
    PGHOST: target.hostname.replace(/^\[|\]$/g, ''),
    PGPORT: target.port || '5432',
    PGUSER: decodeURIComponent(target.username || 'postgres'),
    PGPASSWORD: decodeURIComponent(target.password || ''),
    PGDATABASE: database,
    PGSSLMODE: 'disable',
    PGTZ: 'UTC',
  }
  const psql = process.env.K2_PSQL_BIN || path.join(postgresBin, 'psql.exe')
  const pgRestore = process.env.K2_PG_RESTORE_BIN || path.join(postgresBin, 'pg_restore.exe')
  const query = sql => String(run(psql,
    ['-X', '--no-psqlrc', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql], env, 'QUERY_FAILED',
    { encoding: 'utf8' })).trim()
  if (query(`select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname not in ('pg_catalog','information_schema') and n.nspname !~ '^pg_toast'`) !== '0') {
    throw new Error('CURRENT_RESTORE_REFUSAL: TARGET_NOT_EMPTY')
  }
  const serverMajor = Math.trunc(Number(query('show server_version_num')) / 10000)
  const clientMajor = Number(/PostgreSQL\)\s+(\d+)/i.exec(String(run(pgRestore, ['--version'], env,
    'CLIENT_VERSION_FAILED', { encoding: 'utf8' })))?.[1])
  if (!Number.isInteger(serverMajor) || serverMajor !== clientMajor) {
    throw new Error('CURRENT_RESTORE_REFUSAL: POSTGRES_MAJOR_MISMATCH')
  }
  const toc = filterLoopbackRestoreToc(String(run(pgRestore, ['--list'], env,
    'ARCHIVE_LIST_FAILED', { input: dump, encoding: 'utf8' })))
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'k2-current-restore-'))
  try {
    const listPath = path.join(temp, 'restore.toc')
    await fs.writeFile(listPath, toc.toc, { flag: 'wx' })
    run(pgRestore, ['--exit-on-error', '--no-owner', '--no-privileges',
      `--use-list=${listPath}`, '--dbname', database], env, 'PG_RESTORE_FAILED', { input: dump })
  } finally {
    await fs.rm(temp, { recursive: true, force: true })
  }
  const health = JSON.parse(query(`select json_build_object(
    'publicRelations', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind in ('r','p','v','m')),
    'map017ReceiptPresent', exists(select 1 from supabase_migrations.schema_migrations
      where version='20260824143000' and name='map017_public_write_boundary_hardening'),
    'currentOrderFunctionPresent', to_regprocedure('public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text,numeric,text)') is not null,
    'stockFunctionPresent', to_regprocedure('public.get_public_product_stock()') is not null
  )::text`))
  const productsOldArchive = productsOldArchiveFingerprintFromRows(query(productsOldArchiveRowsSql))
  if (health.publicRelations < 1 || !health.map017ReceiptPresent
    || !health.currentOrderFunctionPresent || !health.stockFunctionPresent
    || productsOldArchive.rowCount !== manifest.productsOldArchive?.rowCount
    || productsOldArchive.sha256 !== manifest.productsOldArchive?.sha256) {
    throw new Error('CURRENT_RESTORE_REFUSAL: RESTORED_SCHEMA_OR_ROWS_MISMATCH')
  }
  const receipt = {
    backupId: manifest.backupId, verifiedAt: new Date().toISOString(),
    restoreVerified: true, publicRelations: health.publicRelations,
    latestMigrationVersion: query('select max(version) from supabase_migrations.schema_migrations'),
    excludedManagedEntries: toc.excludedEntries.length,
    evidenceBoundary: 'Application database in isolated PostgreSQL; managed Vault, Storage objects and provider settings are excluded.',
  }
  const receiptPath = `${envelopePath}.restore-verification.json`
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
  return { receiptPath, receipt }
}

if (process.argv[1]?.endsWith('verify-current-production-restore.mjs')) {
  const envelopePath = process.argv.find(arg => arg.startsWith('--envelope='))?.slice('--envelope='.length)
  try {
    const result = await verifyCurrentProductionRestore({
      envelopePath,
      passphrase: process.env.K2_BACKUP_PASSPHRASE,
      targetUrl: process.env.K2_CURRENT_RESTORE_TARGET_URL,
    })
    console.log(`Current production restore verified: ${result.receipt.backupId}`)
    console.log(`Redacted receipt: ${result.receiptPath}`)
  } catch (error) {
    console.error(String(error?.message || 'CURRENT_RESTORE_FAILED'))
    process.exitCode = 1
  }
}
