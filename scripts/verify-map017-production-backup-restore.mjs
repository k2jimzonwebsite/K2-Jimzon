#!/usr/bin/env node
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decryptAndVerifyBackup } from './backup-database-encrypted.mjs'
import {
  productsOldArchiveAuthenticatedData,
  productsOldArchiveFingerprintFromRows,
  productsOldArchiveRowsSql,
  validateProductsOldArchive,
} from './create-map017-production-backup.mjs'
import { validateLocalTarget } from './rehearse-local-migration.mjs'

const MAP017_PROJECT_REF = 'pixplcjqivlfflickobf'
const MAP017_PURPOSE = 'MAP-017-pre-migration'
const MAP017_ARTIFACT_SHA256 = 'D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62'
const MAP017_LEDGER_VERSION = '20260824143000'
const rootDir = fileURLToPath(new URL('..', import.meta.url))
const bundledPostgresBin = path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin')
const LOOPBACK_EXCLUDED_MANAGED_EXTENSIONS = ['supabase_vault']

export function validateMap017RestoreTarget(value) {
  const local = validateLocalTarget(value)
  if (!local.isLocal) return { valid: false, reason: `RESTORE_TARGET_${local.reason}` }
  let parsed
  try { parsed = new URL(value) }
  catch { return { valid: false, reason: 'RESTORE_TARGET_URL_INVALID' } }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  if (!/^k2_map017_restore_verification_[a-z0-9_-]+$/.test(database)) {
    return { valid: false, reason: 'RESTORE_VERIFICATION_DATABASE_NAME_REQUIRED' }
  }
  return { valid: true, parsed, database }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export async function validateMap017BackupArtifact({ envelopePath, passphrase }) {
  if (!envelopePath || !passphrase) {
    throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: ENVELOPE_AND_PASSPHRASE_REQUIRED')
  }
  const manifestPath = `${envelopePath}.manifest.json`
  let envelope
  let manifest
  try {
    envelope = await fs.readFile(envelopePath)
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  } catch {
    throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: ENVELOPE_OR_MANIFEST_INVALID')
  }
  if (
    manifest.formatVersion !== 2
    || manifest.projectRef !== MAP017_PROJECT_REF
    || manifest.purpose !== MAP017_PURPOSE
    || manifest.artifactSha256 !== MAP017_ARTIFACT_SHA256
    || manifest.ledgerVersion !== MAP017_LEDGER_VERSION
    || manifest.dumpFormat !== 'PostgreSQL custom'
  ) {
    throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: MANIFEST_IDENTITY_MISMATCH')
  }
  let productsOldArchive
  try {
    productsOldArchive = validateProductsOldArchive(
      manifest.productsOldArchive,
      'MAP017_RESTORE_VERIFICATION_REFUSAL',
    )
  } catch {
    throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: MANIFEST_PRODUCTS_OLD_ARCHIVE_INVALID')
  }
  if (manifest.encryptedBytes !== envelope.length) {
    throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: ENCRYPTED_BYTE_LENGTH_MISMATCH')
  }
  if (manifest.encryptedSha256 !== sha256(envelope)) {
    throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: ENCRYPTED_SHA256_MISMATCH')
  }
  let dump
  try {
    dump = await decryptAndVerifyBackup({
      backupEnvelope: envelope,
      passphrase,
      authenticatedData: productsOldArchiveAuthenticatedData(productsOldArchive),
    })
  } catch {
    throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: ENVELOPE_AUTHENTICATION_FAILED')
  }
  if (manifest.dumpBytes !== dump.length) {
    throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: DUMP_BYTE_LENGTH_MISMATCH')
  }
  if (manifest.dumpSha256 !== sha256(dump)) {
    throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: DUMP_SHA256_MISMATCH')
  }
  if (dump.length < 6 || dump.subarray(0, 5).toString('ascii') !== 'PGDMP') {
    throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: CUSTOM_FORMAT_DATABASE_DUMP_REQUIRED')
  }
  return { dump, manifest, manifestPath }
}

function targetEnvironment(parsed) {
  return {
    ...process.env,
    PGHOST: parsed.hostname.replace(/^\[|\]$/g, ''),
    PGPORT: parsed.port || '5432',
    PGUSER: decodeURIComponent(parsed.username || 'postgres'),
    PGPASSWORD: decodeURIComponent(parsed.password || ''),
    PGDATABASE: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    PGSSLMODE: parsed.searchParams.get('sslmode') || 'disable',
    PGTZ: 'UTC',
  }
}

function runBinary(spawnImpl, executable, args, options, refusal) {
  const result = spawnImpl(executable, args, {
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 1024,
    ...options,
  })
  if (result.error || result.status !== 0) {
    throw new Error(`MAP017_RESTORE_VERIFICATION_REFUSAL: ${refusal}`)
  }
  return result.stdout
}

export function filterLoopbackRestoreToc(tocText) {
  const excludedEntries = []
  const includedLines = String(tocText).split(/\r?\n/).filter((line) => {
    const excludesManagedVault = /(?:^|\s)supabase_vault(?:\s|$)/.test(line)
      || /(?:^|\s)vault(?:\s|$)/.test(line)
    if (line.includes(';') && excludesManagedVault) {
      excludedEntries.push(line)
      return false
    }
    return true
  })
  return {
    toc: `${includedLines.join('\n').replace(/\n+$/, '')}\n`,
    excludedEntries,
    excludedManagedExtensions: excludedEntries.length > 0
      ? [...LOOPBACK_EXCLUDED_MANAGED_EXTENSIONS]
      : [],
  }
}

const emptyTargetSql = `/* RESTORE_TARGET_OBJECT_COUNT */
select count(*)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname not in ('pg_catalog', 'information_schema')
  and n.nspname !~ '^pg_toast';`

const restoredHealthSql = `select json_build_object(
  'publicRelations', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m')),
  'publicProductsPresent', to_regclass('public.products') is not null,
  'productBatchesPresent', to_regclass('public.product_batches') is not null,
  'productsOldPresent', to_regclass('public.products_old') is not null,
  'migrationLedgerPresent', to_regclass('supabase_migrations.schema_migrations') is not null,
  'map017ReceiptAbsent', not exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260824143000'
       or name = 'map017_public_write_boundary_hardening'
  )
)::text;`

export async function verifyMap017ProductionBackupRestore({
  envelopePath,
  passphrase,
  target,
  psql,
  pgRestore,
  spawnImpl = spawnSync,
  now = () => new Date(),
}) {
  const checkedTarget = validateMap017RestoreTarget(target)
  if (!checkedTarget.valid) {
    throw new Error(`MAP017_RESTORE_VERIFICATION_REFUSAL: ${checkedTarget.reason}`)
  }
  const artifact = await validateMap017BackupArtifact({ envelopePath, passphrase })
  const env = targetEnvironment(checkedTarget.parsed)
  const textOptions = { env, encoding: 'utf8' }
  const targetObjectCount = String(runBinary(
    spawnImpl,
    psql,
    ['-X', '--no-psqlrc', '-At', '-v', 'ON_ERROR_STOP=1', '-c', emptyTargetSql],
    textOptions,
    'RESTORE_TARGET_PREFLIGHT_FAILED',
  )).trim()
  if (targetObjectCount !== '0') {
    throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: RESTORE_TARGET_NOT_EMPTY')
  }

  const serverVersion = String(runBinary(
    spawnImpl,
    psql,
    ['-X', '--no-psqlrc', '-At', '-v', 'ON_ERROR_STOP=1', '-c', 'show server_version_num;'],
    textOptions,
    'RESTORE_TARGET_VERSION_QUERY_FAILED',
  )).trim()
  const serverMajor = Math.trunc(Number(serverVersion) / 10000)
  const clientVersion = String(runBinary(
    spawnImpl,
    pgRestore,
    ['--version'],
    textOptions,
    'PG_RESTORE_VERSION_CHECK_FAILED',
  ))
  const clientMajor = Number(/PostgreSQL\)\s+(\d+)/i.exec(clientVersion)?.[1])
  if (!Number.isInteger(serverMajor) || serverMajor < 10 || clientMajor !== serverMajor) {
    throw new Error(`MAP017_RESTORE_VERIFICATION_REFUSAL: POSTGRES_CLIENT_SERVER_MAJOR_MISMATCH (${clientMajor || 'unknown'} != ${serverMajor || 'unknown'})`)
  }

  const restoreStartedAt = Date.now()
  const tocText = String(runBinary(
    spawnImpl,
    pgRestore,
    ['--list'],
    { env, input: artifact.dump, encoding: 'utf8' },
    'PG_RESTORE_TOC_INSPECTION_FAILED',
  ))
  const filteredToc = filterLoopbackRestoreToc(tocText)
  const restoreTempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'k2-map017-restore-'))
  const restoreTocPath = path.join(restoreTempDirectory, 'restore.toc')
  try {
    await fs.writeFile(restoreTocPath, filteredToc.toc, { flag: 'wx' })
    runBinary(
      spawnImpl,
      pgRestore,
      [
        '--exit-on-error', '--no-owner', '--no-privileges',
        `--use-list=${restoreTocPath}`,
        '--dbname', checkedTarget.database,
      ],
      { env, input: artifact.dump },
      'PG_RESTORE_FAILED',
    )
  } finally {
    await fs.rm(restoreTempDirectory, { recursive: true, force: true })
  }
  const healthText = String(runBinary(
    spawnImpl,
    psql,
    ['-X', '--no-psqlrc', '-At', '-v', 'ON_ERROR_STOP=1', '-c', restoredHealthSql],
    textOptions,
    'RESTORED_DATABASE_HEALTH_QUERY_FAILED',
  )).trim()
  let health
  try { health = JSON.parse(healthText) }
  catch { throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: RESTORED_DATABASE_HEALTH_INVALID') }
  const healthPassed = Number(health.publicRelations) > 0
    && health.publicProductsPresent === true
    && health.productBatchesPresent === true
    && health.productsOldPresent === true
    && health.migrationLedgerPresent === true
    && health.map017ReceiptAbsent === true
  if (!healthPassed) {
    throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: RESTORED_DATABASE_HEALTH_FAILED')
  }

  const restoredProductsOldRows = String(runBinary(
    spawnImpl,
    psql,
    ['-X', '--no-psqlrc', '-At', '-v', 'ON_ERROR_STOP=1', '-c', productsOldArchiveRowsSql],
    textOptions,
    'RESTORED_PRODUCTS_OLD_ARCHIVE_QUERY_FAILED',
  ))
  let restoredProductsOldArchive
  try {
    restoredProductsOldArchive = productsOldArchiveFingerprintFromRows(restoredProductsOldRows)
  } catch {
    throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: RESTORED_PRODUCTS_OLD_ARCHIVE_INVALID')
  }
  if (
    restoredProductsOldArchive.rowCount !== artifact.manifest.productsOldArchive.rowCount
    || restoredProductsOldArchive.sha256 !== artifact.manifest.productsOldArchive.sha256
  ) {
    throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: PRODUCTS_OLD_ARCHIVE_FINGERPRINT_MISMATCH')
  }

  const evidencePath = `${envelopePath}.restore-verification.json`
  const evidence = {
    backupId: artifact.manifest.backupId,
    verifiedAt: now().toISOString(),
    restoreVerified: true,
    targetClass: 'dedicated-loopback-database',
    targetDatabase: checkedTarget.database,
    artifactSha256: artifact.manifest.artifactSha256,
    ledgerVersion: artifact.manifest.ledgerVersion,
    encryptedSha256: artifact.manifest.encryptedSha256,
    dumpSha256: artifact.manifest.dumpSha256,
    productsOldArchive: {
      ...artifact.manifest.productsOldArchive,
      restoredFingerprintMatches: true,
    },
    restoreDurationMs: Date.now() - restoreStartedAt,
    excludedManagedExtensions: filteredToc.excludedManagedExtensions,
    excludedManagedExtensionEntries: filteredToc.excludedEntries.length,
    health,
    evidenceBoundary: 'Application database archive restore on plain loopback PostgreSQL; Supabase Vault-owned entries, Storage objects, and provider configuration are not covered.',
  }
  try {
    await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' })
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error('MAP017_RESTORE_VERIFICATION_REFUSAL: RESTORE_EVIDENCE_ALREADY_EXISTS')
    }
    throw error
  }
  return {
    backupId: artifact.manifest.backupId,
    restoreVerified: true,
    evidencePath,
    evidence,
  }
}

function parseArgs(args = process.argv.slice(2)) {
  const options = { confirmIsolatedRestore: false }
  for (const arg of args) {
    if (arg.startsWith('--envelope=')) options.envelopePath = path.resolve(arg.slice('--envelope='.length))
    else if (arg === '--confirm-isolated-restore') options.confirmIsolatedRestore = true
  }
  return options
}

async function main() {
  const options = parseArgs()
  if (!options.confirmIsolatedRestore) {
    console.error('MAP017_RESTORE_VERIFICATION_REFUSAL: --confirm-isolated-restore is required')
    process.exit(2)
  }
  try {
    const result = await verifyMap017ProductionBackupRestore({
      envelopePath: options.envelopePath,
      passphrase: process.env.K2_BACKUP_PASSPHRASE,
      target: process.env.K2_MAP017_RESTORE_TARGET_URL,
      psql: process.env.K2_PSQL_BIN || path.join(bundledPostgresBin, 'psql.exe'),
      pgRestore: process.env.K2_PG_RESTORE_BIN || path.join(bundledPostgresBin, 'pg_restore.exe'),
    })
    console.log(`MAP-017 database restore verified: ${result.backupId}`)
    console.log(`Redacted restore evidence: ${result.evidencePath}`)
    console.log(result.evidence.evidenceBoundary)
  } catch (error) {
    const message = String(error?.message || 'MAP017_RESTORE_VERIFICATION_REFUSAL')
    console.error(message.startsWith('MAP017_RESTORE_VERIFICATION_REFUSAL')
      ? message
      : `MAP017_RESTORE_VERIFICATION_REFUSAL: ${message}`)
    process.exit(2)
  }
}

if (process.argv[1]?.endsWith('verify-map017-production-backup-restore.mjs')) main()
