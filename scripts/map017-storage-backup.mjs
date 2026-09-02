#!/usr/bin/env node
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createEncryptedBackup, decryptAndVerifyBackup } from './backup-database-encrypted.mjs'
import { validateMap017ProductionDatabaseUrl } from './create-map017-production-backup.mjs'

const PROJECT_REF = 'pixplcjqivlfflickobf'
const PURPOSE = 'MAP-017-storage-pre-migration'
const MAGIC = Buffer.from('K2STORAGE1\n', 'ascii')
const MAX_OBJECTS = 10000
const MAX_TOTAL_BYTES = 1024 * 1024 * 1024
const rootDir = fileURLToPath(new URL('..', import.meta.url))
const bundledPsql = path.join(rootDir, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin', 'psql.exe')

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function validateStorageObjectPath(value) {
  const name = String(value || '')
  const segments = name.split('/')
  if (
    !name || name.startsWith('/') || name.includes('\\') || name.includes('\0') || name.includes(':')
    || segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) throw new Error('MAP017_STORAGE_BACKUP_REFUSAL: UNSAFE_OBJECT_PATH')
  return name
}

function contentFingerprint(objects) {
  return sha256(Buffer.from(canonicalJson(objects.map(({ bucketId, name, size, sha256: digest }) => ({
    bucketId, name, size, sha256: digest,
  }))), 'utf8'))
}

function archiveAuthenticatedData(summary) {
  return [
    'K2-MAP017-STORAGE-ARCHIVE-V1',
    PROJECT_REF,
    PURPOSE,
    String(summary.objectCount),
    String(summary.totalBytes),
    summary.contentFingerprint,
  ].join('\n')
}

export function encodeStorageArchive(objects) {
  if (!Array.isArray(objects) || objects.length < 1 || objects.length > MAX_OBJECTS) {
    throw new Error('MAP017_STORAGE_BACKUP_REFUSAL: OBJECT_COUNT_INVALID')
  }
  const normalized = objects.map((object) => {
    const data = Buffer.isBuffer(object.data) ? object.data : Buffer.from(object.data)
    const bucketId = validateStorageObjectPath(object.bucketId)
    const name = validateStorageObjectPath(object.name)
    return {
      bucketId,
      name,
      mimeType: object.mimeType || 'application/octet-stream',
      size: data.length,
      sha256: sha256(data),
      data,
    }
  }).sort((a, b) => `${a.bucketId}/${a.name}`.localeCompare(`${b.bucketId}/${b.name}`))
  const identities = new Set(normalized.map((object) => `${object.bucketId}/${object.name}`))
  if (identities.size !== normalized.length) {
    throw new Error('MAP017_STORAGE_BACKUP_REFUSAL: DUPLICATE_OBJECT_PATH')
  }
  const totalBytes = normalized.reduce((sum, object) => sum + object.size, 0)
  if (totalBytes > MAX_TOTAL_BYTES) throw new Error('MAP017_STORAGE_BACKUP_REFUSAL: ARCHIVE_SIZE_LIMIT')
  const header = {
    formatVersion: 1,
    projectRef: PROJECT_REF,
    purpose: PURPOSE,
    objects: normalized.map(({ bucketId, name, mimeType, size, sha256: digest }) => ({
      bucketId, name, mimeType, size, sha256: digest,
    })),
  }
  const headerBytes = Buffer.from(canonicalJson(header), 'utf8')
  const headerLength = Buffer.alloc(8)
  headerLength.writeBigUInt64BE(BigInt(headerBytes.length))
  const archive = Buffer.concat([MAGIC, headerLength, headerBytes, ...normalized.map((object) => object.data)])
  return {
    archive,
    header,
    summary: {
      objectCount: normalized.length,
      totalBytes,
      contentFingerprint: contentFingerprint(header.objects),
    },
  }
}

export function decodeStorageArchive(archive) {
  if (!Buffer.isBuffer(archive) || archive.length < MAGIC.length + 8 || !archive.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: ARCHIVE_FORMAT_INVALID')
  }
  const headerLength = Number(archive.readBigUInt64BE(MAGIC.length))
  const headerStart = MAGIC.length + 8
  const headerEnd = headerStart + headerLength
  if (!Number.isSafeInteger(headerLength) || headerLength < 2 || headerEnd > archive.length) {
    throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: ARCHIVE_HEADER_INVALID')
  }
  let header
  try { header = JSON.parse(archive.subarray(headerStart, headerEnd).toString('utf8')) }
  catch { throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: ARCHIVE_HEADER_INVALID') }
  if (header.formatVersion !== 1 || header.projectRef !== PROJECT_REF || header.purpose !== PURPOSE) {
    throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: ARCHIVE_IDENTITY_MISMATCH')
  }
  if (!Array.isArray(header.objects) || header.objects.length < 1 || header.objects.length > MAX_OBJECTS) {
    throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: OBJECT_COUNT_INVALID')
  }
  const seen = new Set()
  const objects = []
  let offset = headerEnd
  for (const record of header.objects) {
    const bucketId = validateStorageObjectPath(record.bucketId)
    const name = validateStorageObjectPath(record.name)
    const identity = `${bucketId}/${name}`
    if (seen.has(identity)) throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: DUPLICATE_OBJECT_PATH')
    seen.add(identity)
    if (!Number.isSafeInteger(record.size) || record.size < 0 || !/^[0-9a-f]{64}$/.test(record.sha256 || '')) {
      throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: OBJECT_METADATA_INVALID')
    }
    const end = offset + record.size
    if (end > archive.length) throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: OBJECT_BYTES_TRUNCATED')
    const data = archive.subarray(offset, end)
    if (sha256(data) !== record.sha256) throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: OBJECT_CHECKSUM_MISMATCH')
    objects.push({ ...record, bucketId, name, data })
    offset = end
  }
  if (offset !== archive.length) throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: TRAILING_ARCHIVE_BYTES')
  const totalBytes = objects.reduce((sum, object) => sum + object.size, 0)
  return {
    header,
    objects,
    summary: {
      objectCount: objects.length,
      totalBytes,
      contentFingerprint: contentFingerprint(header.objects),
    },
  }
}

const inventorySql = `select coalesce(json_agg(json_build_object(
  'bucketId', o.bucket_id,
  'name', o.name,
  'recordedSize', case when coalesce(o.metadata->>'size','') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else -1 end,
  'mimeType', coalesce(o.metadata->>'mimetype', 'application/octet-stream'),
  'public', b.public
) order by o.bucket_id, o.name), '[]'::json)::text
from storage.objects o
join storage.buckets b on b.id = o.bucket_id;`

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

export function readStorageInventory({ databaseUrl, psql = bundledPsql, spawnImpl = spawnSync }) {
  const target = validateMap017ProductionDatabaseUrl(databaseUrl)
  if (!target.valid) throw new Error(`MAP017_STORAGE_BACKUP_REFUSAL: ${target.reason}`)
  const result = spawnImpl(psql, ['-X', '--no-psqlrc', '-At', '-v', 'ON_ERROR_STOP=1', '-c', inventorySql], {
    env: databaseEnvironment(databaseUrl), encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024,
  })
  if (result.error || result.status !== 0) throw new Error('MAP017_STORAGE_BACKUP_REFUSAL: INVENTORY_QUERY_FAILED')
  let inventory
  try { inventory = JSON.parse(String(result.stdout).trim()) }
  catch { throw new Error('MAP017_STORAGE_BACKUP_REFUSAL: INVENTORY_INVALID') }
  if (!Array.isArray(inventory) || inventory.length < 1 || inventory.length > MAX_OBJECTS) {
    throw new Error('MAP017_STORAGE_BACKUP_REFUSAL: OBJECT_COUNT_INVALID')
  }
  for (const item of inventory) {
    validateStorageObjectPath(item.bucketId)
    validateStorageObjectPath(item.name)
    if (item.public !== true) throw new Error('MAP017_STORAGE_BACKUP_REFUSAL: PRIVATE_BUCKET_AUTHORITY_REQUIRED')
    if (!Number.isSafeInteger(Number(item.recordedSize)) || Number(item.recordedSize) < 0) {
      throw new Error('MAP017_STORAGE_BACKUP_REFUSAL: RECORDED_SIZE_REQUIRED')
    }
  }
  return inventory
}

function publicObjectUrl(bucketId, name) {
  const encodedName = name.split('/').map(encodeURIComponent).join('/')
  return `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/${encodeURIComponent(bucketId)}/${encodedName}`
}

export async function createMap017StorageBackup({
  databaseUrl,
  passphrase,
  destinationPath,
  confirmProject,
  confirmPurpose,
  inventory,
  fetchImpl = fetch,
  now = () => new Date(),
}) {
  if (confirmProject !== PROJECT_REF || confirmPurpose !== PURPOSE) {
    throw new Error('MAP017_STORAGE_BACKUP_REFUSAL: CONFIRMATION_MISMATCH')
  }
  if (!passphrase || passphrase.length < 24) throw new Error('MAP017_STORAGE_BACKUP_REFUSAL: PASSPHRASE_REQUIRED')
  if (!path.isAbsolute(destinationPath) || !destinationPath.endsWith('.k2storage')) {
    throw new Error('MAP017_STORAGE_BACKUP_REFUSAL: ABSOLUTE_K2STORAGE_DESTINATION_REQUIRED')
  }
  const manifestPath = `${destinationPath}.manifest.json`
  await Promise.all([fs.access(destinationPath), fs.access(manifestPath)]).then(
    () => { throw new Error('MAP017_STORAGE_BACKUP_REFUSAL: DESTINATION_EXISTS') },
    () => {},
  )
  const sourceInventory = inventory || readStorageInventory({ databaseUrl })
  const downloaded = []
  for (const item of sourceInventory) {
    const response = await fetchImpl(publicObjectUrl(item.bucketId, item.name), {
      method: 'GET', headers: { Accept: 'application/octet-stream' }, redirect: 'error',
    })
    if (!response.ok) throw new Error('MAP017_STORAGE_BACKUP_REFUSAL: OBJECT_DOWNLOAD_FAILED')
    const data = Buffer.from(await response.arrayBuffer())
    if (data.length !== Number(item.recordedSize)) {
      throw new Error('MAP017_STORAGE_BACKUP_REFUSAL: OBJECT_SIZE_MISMATCH')
    }
    downloaded.push({ bucketId: item.bucketId, name: item.name, mimeType: item.mimeType, data })
  }
  const encoded = encodeStorageArchive(downloaded)
  const encrypted = await createEncryptedBackup({
    sourceData: encoded.archive,
    passphrase,
    authenticatedData: archiveAuthenticatedData(encoded.summary),
  })
  const createdAt = now().toISOString()
  const backupId = `map017-storage-${PROJECT_REF}-${createdAt.replace(/[:.]/g, '')}-${encrypted.sha256.slice(0, 12)}`
  const bucketCounts = Object.entries(downloaded.reduce((counts, item) => {
    counts[item.bucketId] = (counts[item.bucketId] || 0) + 1
    return counts
  }, {})).map(([bucketId, objectCount]) => ({ bucketId, objectCount }))
  const manifest = {
    formatVersion: 1,
    backupId,
    createdAt,
    projectRef: PROJECT_REF,
    purpose: PURPOSE,
    objectCount: encoded.summary.objectCount,
    totalBytes: encoded.summary.totalBytes,
    contentFingerprint: encoded.summary.contentFingerprint,
    bucketCounts,
    archiveBytes: encoded.archive.length,
    archiveSha256: sha256(encoded.archive),
    encryptedBytes: encrypted.byteLength,
    encryptedSha256: encrypted.sha256,
    encryption: 'AES-256-GCM',
    restoreVerification: 'Pending',
    evidenceBoundary: 'Supabase Storage object bytes and paths only; bucket policies, provider configuration, and database state are not covered.',
  }
  await fs.mkdir(path.dirname(destinationPath), { recursive: true })
  let envelopeCreated = false
  try {
    await fs.writeFile(destinationPath, encrypted.envelope, { flag: 'wx' })
    envelopeCreated = true
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
  } catch (error) {
    if (envelopeCreated) await fs.rm(destinationPath, { force: true })
    throw error
  }
  return { backupId, destinationPath, manifestPath, manifest }
}

export async function restoreMap017StorageBackup({ envelopePath, passphrase, targetDirectory, now = () => new Date() }) {
  if (!passphrase || passphrase.length < 24) throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: PASSPHRASE_REQUIRED')
  if (!path.isAbsolute(targetDirectory) || !/^k2_map017_storage_restore_verification_[a-z0-9_-]+$/.test(path.basename(targetDirectory))) {
    throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: DEDICATED_TARGET_REQUIRED')
  }
  let envelope
  let manifest
  try {
    envelope = await fs.readFile(envelopePath)
    manifest = JSON.parse(await fs.readFile(`${envelopePath}.manifest.json`, 'utf8'))
  } catch { throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: ENVELOPE_OR_MANIFEST_INVALID') }
  if (
    manifest.formatVersion !== 1 || manifest.projectRef !== PROJECT_REF || manifest.purpose !== PURPOSE
    || manifest.encryptedBytes !== envelope.length || manifest.encryptedSha256 !== sha256(envelope)
  ) throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: MANIFEST_IDENTITY_MISMATCH')
  let archive
  try {
    archive = await decryptAndVerifyBackup({
      backupEnvelope: envelope,
      passphrase,
      authenticatedData: archiveAuthenticatedData(manifest),
    })
  } catch { throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: ENVELOPE_AUTHENTICATION_FAILED') }
  if (manifest.archiveBytes !== archive.length || manifest.archiveSha256 !== sha256(archive)) {
    throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: ARCHIVE_CHECKSUM_MISMATCH')
  }
  const decoded = decodeStorageArchive(archive)
  if (
    decoded.summary.objectCount !== manifest.objectCount
    || decoded.summary.totalBytes !== manifest.totalBytes
    || decoded.summary.contentFingerprint !== manifest.contentFingerprint
  ) throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: CONTENT_FINGERPRINT_MISMATCH')
  await fs.mkdir(targetDirectory, { recursive: false })
  const targetRoot = `${path.resolve(targetDirectory)}${path.sep}`
  for (const object of decoded.objects) {
    const target = path.resolve(targetDirectory, object.bucketId, ...object.name.split('/'))
    if (!target.startsWith(targetRoot)) throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: TARGET_ESCAPE')
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, object.data, { flag: 'wx' })
  }
  for (const object of decoded.objects) {
    const target = path.resolve(targetDirectory, object.bucketId, ...object.name.split('/'))
    const restored = await fs.readFile(target)
    if (restored.length !== object.size || sha256(restored) !== object.sha256) {
      throw new Error('MAP017_STORAGE_RESTORE_REFUSAL: RESTORED_OBJECT_MISMATCH')
    }
  }
  const evidencePath = `${envelopePath}.restore-verification.json`
  const evidence = {
    backupId: manifest.backupId,
    verifiedAt: now().toISOString(),
    restoreVerified: true,
    targetClass: 'dedicated-local-directory',
    targetDirectory: path.basename(targetDirectory),
    encryptedSha256: manifest.encryptedSha256,
    objectCount: manifest.objectCount,
    totalBytes: manifest.totalBytes,
    contentFingerprint: manifest.contentFingerprint,
    restoredFingerprintMatches: true,
    evidenceBoundary: 'File-level Storage restore only; Supabase bucket policies, provider configuration, and live upload behavior are not covered.',
  }
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' })
  return { restoreVerified: true, evidencePath, evidence }
}

function parseArgs(args = process.argv.slice(2)) {
  const [command, ...rest] = args
  const options = { command }
  for (const arg of rest) {
    if (arg.startsWith('--destination=')) options.destinationPath = path.resolve(arg.slice(14))
    else if (arg.startsWith('--envelope=')) options.envelopePath = path.resolve(arg.slice(11))
    else if (arg.startsWith('--target=')) options.targetDirectory = path.resolve(arg.slice(9))
    else if (arg.startsWith('--confirm-project=')) options.confirmProject = arg.slice(18)
    else if (arg.startsWith('--confirm-purpose=')) options.confirmPurpose = arg.slice(18)
    else if (arg === '--confirm-isolated-restore') options.confirmIsolatedRestore = true
  }
  return options
}

async function main() {
  const options = parseArgs()
  try {
    if (options.command === 'backup') {
      const result = await createMap017StorageBackup({
        databaseUrl: process.env.K2_PRODUCTION_DATABASE_URL,
        passphrase: process.env.K2_BACKUP_PASSPHRASE,
        destinationPath: options.destinationPath,
        confirmProject: options.confirmProject,
        confirmPurpose: options.confirmPurpose,
      })
      console.log(`MAP-017 Storage backup created: ${result.backupId}`)
      console.log(`Encrypted envelope: ${result.destinationPath}`)
      console.log(`Redacted manifest: ${result.manifestPath}`)
    } else if (options.command === 'restore' && options.confirmIsolatedRestore) {
      const result = await restoreMap017StorageBackup({
        envelopePath: options.envelopePath,
        passphrase: process.env.K2_BACKUP_PASSPHRASE,
        targetDirectory: options.targetDirectory,
      })
      console.log(`MAP-017 Storage restore verified: ${result.evidence.objectCount} objects`)
      console.log(`Redacted restore evidence: ${result.evidencePath}`)
      console.log(result.evidence.evidenceBoundary)
    } else {
      throw new Error('MAP017_STORAGE_REFUSAL: BACKUP_OR_CONFIRMED_RESTORE_COMMAND_REQUIRED')
    }
  } catch (error) {
    const message = String(error?.message || 'MAP017_STORAGE_REFUSAL')
    console.error(message)
    process.exit(2)
  }
}

if (process.argv[1]?.endsWith('map017-storage-backup.mjs')) main()
