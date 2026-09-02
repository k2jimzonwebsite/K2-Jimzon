#!/usr/bin/env node
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createEncryptedBackup } from './backup-database-encrypted.mjs'

const MAP017_PROJECT_REF = 'pixplcjqivlfflickobf'
const MAP017_ARTIFACT_SHA256 = 'D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62'
const MAP017_LEDGER_VERSION = '20260824143000'
const MAP017_BACKUP_PURPOSE = 'MAP-017-pre-migration'
export const MAP017_PRODUCTS_OLD_EXPECTED_ROWS = 14
const rootDir = fileURLToPath(new URL('..', import.meta.url))
const bundledPostgresBin = path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin')

export function validateMap017ProductionDatabaseUrl(value) {
  let parsed
  try { parsed = new URL(value) }
  catch { return { valid: false, reason: 'PRODUCTION_DATABASE_URL_INVALID' } }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    return { valid: false, reason: 'PRODUCTION_DATABASE_URL_INVALID' }
  }
  if (!parsed.password) return { valid: false, reason: 'PRODUCTION_DATABASE_CREDENTIAL_REQUIRED' }
  if (!['require', 'verify-full'].includes(parsed.searchParams.get('sslmode'))) {
    return { valid: false, reason: 'PRODUCTION_DATABASE_TLS_REQUIRED' }
  }
  if (decodeURIComponent(parsed.pathname) !== '/postgres') {
    return { valid: false, reason: 'PRODUCTION_DATABASE_NAME_MISMATCH' }
  }

  const hostname = parsed.hostname.toLowerCase()
  const username = decodeURIComponent(parsed.username)
  const direct = hostname === `db.${MAP017_PROJECT_REF}.supabase.co` && username === 'postgres'
  const pooled = /^[a-z0-9.-]+\.pooler\.supabase\.com$/.test(hostname)
    && username === `postgres.${MAP017_PROJECT_REF}`
  if (!direct && !pooled) {
    return { valid: false, reason: 'PRODUCTION_DATABASE_PROJECT_MISMATCH' }
  }

  return { valid: true, projectRef: MAP017_PROJECT_REF, connectionKind: direct ? 'direct' : 'pooler' }
}

function databaseEnvironment(databaseUrl) {
  const parsed = new URL(databaseUrl)
  return {
    ...process.env,
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || '5432',
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGDATABASE: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    PGSSLMODE: parsed.searchParams.get('sslmode'),
    PGTZ: 'UTC',
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function productsOldArchiveFingerprintFromRows(rowsText) {
  let rows
  try {
    rows = String(rowsText).split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line))
  } catch {
    throw new Error('MAP017_PRODUCTION_BACKUP_REFUSAL: PRODUCTS_OLD_ARCHIVE_ROWS_INVALID')
  }
  const canonicalRows = rows.map(canonicalJson).sort()
  return {
    rowCount: canonicalRows.length,
    sha256: crypto.createHash('sha256').update(canonicalRows.join('\n')).digest('hex'),
  }
}

export function validateProductsOldArchive(archive, prefix = 'MAP017_PRODUCTION_BACKUP_REFUSAL') {
  if (
    archive?.rowCount !== MAP017_PRODUCTS_OLD_EXPECTED_ROWS
    || !/^[0-9a-f]{64}$/.test(archive?.sha256 || '')
  ) {
    throw new Error(`${prefix}: PRODUCTS_OLD_ARCHIVE_EXPECTED_14_ROWS`)
  }
  return { rowCount: archive.rowCount, sha256: archive.sha256 }
}

export function productsOldArchiveAuthenticatedData(archive) {
  const checked = validateProductsOldArchive(archive)
  return `K2-MAP017-PRODUCTS-OLD-ARCHIVE-V1\n${checked.rowCount}\n${checked.sha256}`
}

export const productsOldArchiveRowsSql = `/* MAP017_PRODUCTS_OLD_ARCHIVE_ROWS */
select to_jsonb(t)::text
from public.products_old t
order by to_jsonb(t)::text;`

function captureProductsOldArchive({ spawnImpl, psql, common }) {
  const result = spawnImpl(psql, [
    '-X', '--no-psqlrc', '-At', '-v', 'ON_ERROR_STOP=1', '-c', productsOldArchiveRowsSql,
  ], { ...common, encoding: 'utf8' })
  if (result.error || result.status !== 0) {
    throw new Error('MAP017_PRODUCTION_BACKUP_REFUSAL: PRODUCTS_OLD_ARCHIVE_QUERY_FAILED')
  }
  return validateProductsOldArchive(productsOldArchiveFingerprintFromRows(result.stdout))
}

export async function dumpMap017ProductionDatabase({
  databaseUrl,
  psql,
  pgDump,
  spawnImpl = spawnSync,
}) {
  const target = validateMap017ProductionDatabaseUrl(databaseUrl)
  if (!target.valid) throw new Error(`MAP017_PRODUCTION_BACKUP_REFUSAL: ${target.reason}`)
  const env = databaseEnvironment(databaseUrl)
  const common = { env, windowsHide: true, maxBuffer: 1024 * 1024 * 1024 }
  const serverVersion = spawnImpl(psql, [
    '-X', '--no-psqlrc', '-At', '-v', 'ON_ERROR_STOP=1', '-c', 'show server_version_num;',
  ], { ...common, encoding: 'utf8' })
  if (serverVersion.error || serverVersion.status !== 0) {
    throw new Error('MAP017_PRODUCTION_BACKUP_REFUSAL: DATABASE_VERSION_QUERY_FAILED')
  }
  const serverMajor = Math.trunc(Number(String(serverVersion.stdout).trim()) / 10000)
  if (!Number.isInteger(serverMajor) || serverMajor < 10) {
    throw new Error('MAP017_PRODUCTION_BACKUP_REFUSAL: DATABASE_SERVER_VERSION_INVALID')
  }

  const clientVersion = spawnImpl(pgDump, ['--version'], { ...common, encoding: 'utf8' })
  if (clientVersion.error || clientVersion.status !== 0) {
    throw new Error('MAP017_PRODUCTION_BACKUP_REFUSAL: PG_DUMP_VERSION_CHECK_FAILED')
  }
  const clientMajor = Number(/PostgreSQL\)\s+(\d+)/i.exec(String(clientVersion.stdout))?.[1])
  if (clientMajor !== serverMajor) {
    throw new Error(`MAP017_PRODUCTION_BACKUP_REFUSAL: POSTGRES_CLIENT_SERVER_MAJOR_MISMATCH (${clientMajor || 'unknown'} != ${serverMajor})`)
  }

  const productsOldArchiveBefore = captureProductsOldArchive({ spawnImpl, psql, common })
  const result = spawnImpl(pgDump, ['--format=custom', '--no-owner'], common)
  if (result.error || result.status !== 0) {
    throw new Error('MAP017_PRODUCTION_BACKUP_REFUSAL: PG_DUMP_FAILED')
  }
  const productsOldArchiveAfter = captureProductsOldArchive({ spawnImpl, psql, common })
  if (
    productsOldArchiveBefore.rowCount !== productsOldArchiveAfter.rowCount
    || productsOldArchiveBefore.sha256 !== productsOldArchiveAfter.sha256
  ) {
    throw new Error('MAP017_PRODUCTION_BACKUP_REFUSAL: PRODUCTS_OLD_CHANGED_DURING_DUMP')
  }
  return { dump: result.stdout, productsOldArchive: productsOldArchiveBefore }
}

function validateConfirmations(options) {
  const failures = []
  if (options.confirmProject !== MAP017_PROJECT_REF) failures.push(`--confirm-project=${MAP017_PROJECT_REF}`)
  if (options.confirmPurpose !== MAP017_BACKUP_PURPOSE) failures.push(`--confirm-purpose=${MAP017_BACKUP_PURPOSE}`)
  if (options.confirmArtifactSha256 !== MAP017_ARTIFACT_SHA256) {
    failures.push(`--confirm-artifact-sha256=${MAP017_ARTIFACT_SHA256}`)
  }
  if (options.confirmLedgerVersion !== MAP017_LEDGER_VERSION) {
    failures.push(`--confirm-ledger-version=${MAP017_LEDGER_VERSION}`)
  }
  return failures
}

export async function createMap017ProductionBackup({
  databaseUrl,
  passphrase,
  destinationPath,
  confirmProject,
  confirmPurpose,
  confirmArtifactSha256,
  confirmLedgerVersion,
  dumpDatabase,
  now = () => new Date(),
}) {
  const target = validateMap017ProductionDatabaseUrl(databaseUrl)
  if (!target.valid) throw new Error(`MAP017_PRODUCTION_BACKUP_REFUSAL: ${target.reason}`)
  if (!passphrase || passphrase.length < 24) {
    throw new Error('MAP017_PRODUCTION_BACKUP_REFUSAL: BACKUP_PASSPHRASE_TOO_SHORT')
  }
  if (!destinationPath || !path.isAbsolute(destinationPath) || !destinationPath.endsWith('.k2backup')) {
    throw new Error('MAP017_PRODUCTION_BACKUP_REFUSAL: ABSOLUTE_K2BACKUP_DESTINATION_REQUIRED')
  }
  const confirmationFailures = validateConfirmations({
    confirmProject,
    confirmPurpose,
    confirmArtifactSha256,
    confirmLedgerVersion,
  })
  if (confirmationFailures.length > 0) {
    throw new Error(`MAP017_PRODUCTION_BACKUP_REFUSAL: ${confirmationFailures.join(', ')}`)
  }
  if (typeof dumpDatabase !== 'function') {
    throw new Error('MAP017_PRODUCTION_BACKUP_REFUSAL: DATABASE_DUMP_IMPLEMENTATION_REQUIRED')
  }

  const result = await dumpDatabase({ databaseUrl })
  const dump = result?.dump
  const productsOldArchive = validateProductsOldArchive(result?.productsOldArchive)
  if (!Buffer.isBuffer(dump) || dump.length < 6 || dump.subarray(0, 5).toString('ascii') !== 'PGDMP') {
    throw new Error('MAP017_PRODUCTION_BACKUP_REFUSAL: CUSTOM_FORMAT_DATABASE_DUMP_REQUIRED')
  }

  const encrypted = await createEncryptedBackup({
    sourceData: dump,
    passphrase,
    authenticatedData: productsOldArchiveAuthenticatedData(productsOldArchive),
  })
  const createdAt = now().toISOString()
  const compactTime = createdAt.replace(/[-:]/g, '').replace('.000', '')
  const backupId = `map017-${MAP017_PROJECT_REF}-${compactTime}-${encrypted.sha256.slice(0, 12)}`
  const manifestPath = `${destinationPath}.manifest.json`
  const manifest = {
    formatVersion: 2,
    backupId,
    createdAt,
    projectRef: MAP017_PROJECT_REF,
    purpose: MAP017_BACKUP_PURPOSE,
    artifactSha256: MAP017_ARTIFACT_SHA256,
    ledgerVersion: MAP017_LEDGER_VERSION,
    dumpFormat: 'PostgreSQL custom',
    dumpBytes: dump.length,
    dumpSha256: crypto.createHash('sha256').update(dump).digest('hex'),
    encryptedBytes: encrypted.byteLength,
    encryptedSha256: encrypted.sha256,
    productsOldArchive,
    restoreVerification: 'Pending',
  }

  let envelopeCreated = false
  try {
    await fs.writeFile(destinationPath, encrypted.envelope, { flag: 'wx' })
    envelopeCreated = true
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
  } catch (error) {
    if (envelopeCreated) await fs.unlink(destinationPath).catch(() => {})
    if (error?.code === 'EEXIST') {
      throw new Error('MAP017_PRODUCTION_BACKUP_REFUSAL: BACKUP_DESTINATION_ALREADY_EXISTS')
    }
    throw error
  }

  return { backupId, destinationPath, manifestPath, manifest }
}

function parseArgs(args = process.argv.slice(2)) {
  const options = {}
  for (const arg of args) {
    if (arg.startsWith('--destination=')) options.destinationPath = path.resolve(arg.slice('--destination='.length))
    else if (arg.startsWith('--confirm-project=')) options.confirmProject = arg.slice('--confirm-project='.length)
    else if (arg.startsWith('--confirm-purpose=')) options.confirmPurpose = arg.slice('--confirm-purpose='.length)
    else if (arg.startsWith('--confirm-artifact-sha256=')) {
      options.confirmArtifactSha256 = arg.slice('--confirm-artifact-sha256='.length).toUpperCase()
    } else if (arg.startsWith('--confirm-ledger-version=')) {
      options.confirmLedgerVersion = arg.slice('--confirm-ledger-version='.length)
    }
  }
  return options
}

async function main() {
  const options = parseArgs()
  try {
    const result = await createMap017ProductionBackup({
      ...options,
      databaseUrl: process.env.K2_PRODUCTION_DATABASE_URL,
      passphrase: process.env.K2_BACKUP_PASSPHRASE,
      dumpDatabase: ({ databaseUrl }) => dumpMap017ProductionDatabase({
        databaseUrl,
        psql: process.env.K2_PSQL_BIN || path.join(bundledPostgresBin, 'psql.exe'),
        pgDump: process.env.K2_PG_DUMP_BIN || path.join(bundledPostgresBin, 'pg_dump.exe'),
      }),
    })
    console.log(`MAP-017 encrypted production backup created: ${result.backupId}`)
    console.log(`Encrypted envelope: ${result.destinationPath}`)
    console.log(`Redacted manifest: ${result.manifestPath}`)
    console.log('Restore verification remains Pending until this envelope is restored into an isolated target and fingerprinted.')
  } catch (error) {
    const message = String(error?.message || 'MAP017_PRODUCTION_BACKUP_REFUSAL')
    console.error(message.startsWith('MAP017_PRODUCTION_BACKUP_REFUSAL')
      ? message
      : `MAP017_PRODUCTION_BACKUP_REFUSAL: ${message}`)
    process.exit(2)
  }
}

if (process.argv[1]?.endsWith('create-map017-production-backup.mjs')) main()
