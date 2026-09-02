import { expect, test } from '@playwright/test'
import { validateBackupRehearsalTargets } from '../scripts/rehearse-database-backup-restore.mjs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { decryptAndVerifyBackup } from '../scripts/backup-database-encrypted.mjs'

const productionBackupCli = fileURLToPath(new URL('../scripts/create-map017-production-backup.mjs', import.meta.url))
const providerBackupInventoryCli = fileURLToPath(new URL('../scripts/map017-evidence/list-provider-backups.mjs', import.meta.url))
const productionRestoreCli = fileURLToPath(new URL('../scripts/verify-map017-production-backup-restore.mjs', import.meta.url))

function fixtureProductionDatabaseUrl({
  host = 'db.pixplcjqivlfflickobf.supabase.co',
  user = 'postgres',
  ssl = true,
} = {}) {
  return [
    'postgresql://',
    encodeURIComponent(user),
    ':',
    'fixture-password',
    '@',
    host,
    ':5432/postgres',
    ssl ? '?sslmode=require' : '',
  ].join('')
}

const fixtureProductsOldRows = Array.from({ length: 14 }, (_, index) => JSON.stringify({
  id: index + 1,
  sku: `LEGACY-${String(index + 1).padStart(3, '0')}`,
}))

test('database backup rehearsal accepts only distinct loopback rehearsal databases', () => {
  expect(validateBackupRehearsalTargets(
    'postgresql://postgres@127.0.0.1:5432/k2_catalog_rehearsal_ci',
    'postgresql://postgres@127.0.0.1:5432/k2_restore_rehearsal_ci',
  )).toMatchObject({ valid: true, sourceDb: 'k2_catalog_rehearsal_ci', targetDb: 'k2_restore_rehearsal_ci' })
  expect(validateBackupRehearsalTargets(
    'postgresql://postgres@db.example.com:5432/k2_catalog_rehearsal_ci',
    'postgresql://postgres@127.0.0.1:5432/k2_restore_rehearsal_ci',
  )).toMatchObject({ valid: false, reason: 'SOURCE_NON_LOCAL_HOST_REJECTED' })
  expect(validateBackupRehearsalTargets(
    'postgresql://postgres@127.0.0.1:5432/postgres',
    'postgresql://postgres@127.0.0.1:5432/k2_restore_rehearsal_ci',
  )).toMatchObject({ valid: false, reason: 'SOURCE_REHEARSAL_DATABASE_NAME_REQUIRED' })
})

test('MAP-017 production backup command fails closed when required authority is absent', () => {
  const result = spawnSync(process.execPath, [productionBackupCli], {
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
    },
  })
  expect(result.status).toBe(2)
  expect(result.stderr).toContain('MAP017_PRODUCTION_BACKUP_REFUSAL')
  expect(result.stderr).not.toContain('postgresql://')
})

test('MAP-017 provider backup inventory fails closed without an access token', () => {
  const result = spawnSync(process.execPath, [providerBackupInventoryCli], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot },
  })
  expect(result.status).toBe(2)
  expect(result.stderr).toContain('MAP017_PROVIDER_BACKUP_INVENTORY_REFUSAL')
})

test('MAP-017 production restore verifier fails closed without an envelope and isolated target', () => {
  const result = spawnSync(process.execPath, [productionRestoreCli], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot },
  })
  expect(result.status).toBe(2)
  expect(result.stderr).toContain('MAP017_RESTORE_VERIFICATION_REFUSAL')
})

test('MAP-017 restore verifier accepts only a dedicated loopback verification database', async () => {
  const module = await import('../scripts/verify-map017-production-backup-restore.mjs')
  expect(typeof module.validateMap017RestoreTarget).toBe('function')
  expect(module.validateMap017RestoreTarget(
    'postgresql://postgres@127.0.0.1:55432/k2_map017_restore_verification_20260826',
  )).toMatchObject({ valid: true, database: 'k2_map017_restore_verification_20260826' })
  expect(module.validateMap017RestoreTarget(
    'postgresql://postgres@127.0.0.1:55432/postgres',
  )).toEqual({ valid: false, reason: 'RESTORE_VERIFICATION_DATABASE_NAME_REQUIRED' })
  expect(module.validateMap017RestoreTarget(
    'postgresql://postgres@db.pixplcjqivlfflickobf.supabase.co:5432/k2_map017_restore_verification_20260826?sslmode=require',
  )).toEqual({ valid: false, reason: 'RESTORE_TARGET_NON_LOCAL_HOST_REJECTED' })
})

test('MAP-017 products_old archive fingerprint is deterministic and content-sensitive', async () => {
  const module = await import('../scripts/create-map017-production-backup.mjs')
  expect(typeof module.productsOldArchiveFingerprintFromRows).toBe('function')
  const first = module.productsOldArchiveFingerprintFromRows(fixtureProductsOldRows.join('\n'))
  const reordered = module.productsOldArchiveFingerprintFromRows([...fixtureProductsOldRows].reverse().join('\n'))
  const changed = module.productsOldArchiveFingerprintFromRows([
    ...fixtureProductsOldRows.slice(0, -1),
    JSON.stringify({ id: 14, sku: 'LEGACY-CHANGED' }),
  ].join('\n'))

  expect(first).toEqual(reordered)
  expect(first).toMatchObject({ rowCount: 14 })
  expect(first.sha256).toMatch(/^[0-9a-f]{64}$/)
  expect(changed.sha256).not.toBe(first.sha256)
  expect(JSON.stringify(first)).not.toContain('LEGACY-')
})

test('MAP-017 backup binds the audited products_old archive and restore rejects any row drift', async () => {
  const backupModule = await import('../scripts/create-map017-production-backup.mjs')
  const restoreModule = await import('../scripts/verify-map017-production-backup-restore.mjs')
  const directory = await mkdtemp(path.join(tmpdir(), 'k2-map017-products-old-archive-'))
  const envelopePath = path.join(directory, 'map017.k2backup')
  const passphrase = 'fixture-only-map017-backup-passphrase-2026'
  const archive = backupModule.productsOldArchiveFingerprintFromRows(fixtureProductsOldRows.join('\n'))
  const target = 'postgresql://postgres@127.0.0.1:55432/k2_map017_restore_verification_archive'

  try {
    await backupModule.createMap017ProductionBackup({
      databaseUrl: fixtureProductionDatabaseUrl(),
      passphrase,
      destinationPath: envelopePath,
      confirmProject: 'pixplcjqivlfflickobf',
      confirmPurpose: 'MAP-017-pre-migration',
      confirmArtifactSha256: 'D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62',
      confirmLedgerVersion: '20260824143000',
      dumpDatabase: async () => ({
        dump: Buffer.from('PGDMP\u0001fixture-production-dump'),
        productsOldArchive: archive,
      }),
    })
    const manifestText = await readFile(`${envelopePath}.manifest.json`, 'utf8')
    const manifest = JSON.parse(manifestText)
    expect(manifest).toMatchObject({
      formatVersion: 2,
      productsOldArchive: archive,
    })
    expect(manifestText).not.toContain('LEGACY-')

    const spawnImpl = (executable, args) => {
      if (executable === 'fixture-pg-restore' && args.includes('--version')) {
        return { status: 0, stdout: 'pg_restore (PostgreSQL) 17.11\n', stderr: '' }
      }
      if (executable === 'fixture-pg-restore' && args.includes('--list')) {
        return { status: 0, stdout: '; fixture archive\n1; 2615 2200 SCHEMA - public postgres\n', stderr: '' }
      }
      if (executable === 'fixture-pg-restore') return { status: 0, stdout: '', stderr: '' }
      if (args.includes('show server_version_num;')) return { status: 0, stdout: '170011\n', stderr: '' }
      if (args.some((arg) => arg.includes('RESTORE_TARGET_OBJECT_COUNT'))) {
        return { status: 0, stdout: '0\n', stderr: '' }
      }
      if (args.some((arg) => arg.includes('MAP017_PRODUCTS_OLD_ARCHIVE_ROWS'))) {
        return {
          status: 0,
          stdout: [...fixtureProductsOldRows.slice(0, -1), JSON.stringify({ id: 14, sku: 'LEGACY-CHANGED' })].join('\n'),
          stderr: '',
        }
      }
      return {
        status: 0,
        stdout: `${JSON.stringify({
          publicRelations: 42,
          publicProductsPresent: true,
          productBatchesPresent: true,
          productsOldPresent: true,
          migrationLedgerPresent: true,
          map017ReceiptAbsent: true,
        })}\n`,
        stderr: '',
      }
    }

    await expect(restoreModule.verifyMap017ProductionBackupRestore({
      envelopePath,
      passphrase,
      target,
      psql: 'fixture-psql',
      pgRestore: 'fixture-pg-restore',
      spawnImpl,
    })).rejects.toThrow('PRODUCTS_OLD_ARCHIVE_FINGERPRINT_MISMATCH')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('MAP-017 restore verifier authenticates the envelope against its exact manifest', async () => {
  const backupModule = await import('../scripts/create-map017-production-backup.mjs')
  const restoreModule = await import('../scripts/verify-map017-production-backup-restore.mjs')
  expect(typeof restoreModule.validateMap017BackupArtifact).toBe('function')
  const directory = await mkdtemp(path.join(tmpdir(), 'k2-map017-restore-artifact-'))
  const envelopePath = path.join(directory, 'map017.k2backup')
  const passphrase = 'fixture-only-map017-backup-passphrase-2026'
  const dump = Buffer.from('PGDMP\u0001fixture-production-dump')

  try {
    await backupModule.createMap017ProductionBackup({
      databaseUrl: fixtureProductionDatabaseUrl(),
      passphrase,
      destinationPath: envelopePath,
      confirmProject: 'pixplcjqivlfflickobf',
      confirmPurpose: 'MAP-017-pre-migration',
      confirmArtifactSha256: 'D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62',
      confirmLedgerVersion: '20260824143000',
      dumpDatabase: async () => ({
        dump,
        productsOldArchive: backupModule.productsOldArchiveFingerprintFromRows(fixtureProductsOldRows.join('\n')),
      }),
    })
    const verified = await restoreModule.validateMap017BackupArtifact({ envelopePath, passphrase })
    expect(verified.dump).toEqual(dump)
    expect(verified.manifest).toMatchObject({
      projectRef: 'pixplcjqivlfflickobf',
      restoreVerification: 'Pending',
    })

    const manifestPath = `${envelopePath}.manifest.json`
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    manifest.encryptedSha256 = '0'.repeat(64)
    await writeFile(manifestPath, JSON.stringify(manifest))
    await expect(restoreModule.validateMap017BackupArtifact({ envelopePath, passphrase }))
      .rejects.toThrow('ENCRYPTED_SHA256_MISMATCH')

    manifest.encryptedSha256 = verified.manifest.encryptedSha256
    manifest.productsOldArchive.sha256 = '1'.repeat(64)
    await writeFile(manifestPath, JSON.stringify(manifest))
    await expect(restoreModule.validateMap017BackupArtifact({ envelopePath, passphrase }))
      .rejects.toThrow('ENVELOPE_AUTHENTICATION_FAILED')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('MAP-017 restore verifier restores only into an empty target and writes redacted passing evidence', async () => {
  const backupModule = await import('../scripts/create-map017-production-backup.mjs')
  const restoreModule = await import('../scripts/verify-map017-production-backup-restore.mjs')
  expect(typeof restoreModule.verifyMap017ProductionBackupRestore).toBe('function')
  const directory = await mkdtemp(path.join(tmpdir(), 'k2-map017-restore-run-'))
  const envelopePath = path.join(directory, 'map017.k2backup')
  const passphrase = 'fixture-only-map017-backup-passphrase-2026'
  const target = [
    'postgresql://postgres',
    'restore-fixture-password@127.0.0.1:55432',
    'k2_map017_restore_verification_20260826',
  ].join(':').replace(':k2_map017_', '/k2_map017_')
  const calls = []

  try {
    await backupModule.createMap017ProductionBackup({
      databaseUrl: fixtureProductionDatabaseUrl(),
      passphrase,
      destinationPath: envelopePath,
      confirmProject: 'pixplcjqivlfflickobf',
      confirmPurpose: 'MAP-017-pre-migration',
      confirmArtifactSha256: 'D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62',
      confirmLedgerVersion: '20260824143000',
      dumpDatabase: async () => ({
        dump: Buffer.from('PGDMP\u0001fixture-production-dump'),
        productsOldArchive: backupModule.productsOldArchiveFingerprintFromRows(fixtureProductsOldRows.join('\n')),
      }),
    })
    const spawnImpl = (executable, args, options) => {
      calls.push({ executable, args, options })
      if (executable === 'fixture-pg-restore' && args.includes('--version')) {
        return { status: 0, stdout: 'pg_restore (PostgreSQL) 17.11\n', stderr: '' }
      }
      if (executable === 'fixture-pg-restore' && args.includes('--list')) {
        return {
          status: 0,
          stdout: [
            '; fixture archive',
            '1; 2615 2200 SCHEMA - public postgres',
            '2; 2615 16607 SCHEMA - vault supabase_admin',
            '3; 3079 16608 EXTENSION - supabase_vault',
            '4; 0 16612 TABLE DATA vault secrets supabase_admin',
            '',
          ].join('\n'),
          stderr: '',
        }
      }
      if (executable === 'fixture-pg-restore') {
        return { status: 0, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) }
      }
      if (args.includes('show server_version_num;')) return { status: 0, stdout: '170011\n', stderr: '' }
      if (args.some((arg) => arg.includes('RESTORE_TARGET_OBJECT_COUNT'))) {
        return { status: 0, stdout: '0\n', stderr: '' }
      }
      if (args.some((arg) => arg.includes('MAP017_PRODUCTS_OLD_ARCHIVE_ROWS'))) {
        return { status: 0, stdout: fixtureProductsOldRows.join('\n'), stderr: '' }
      }
      return {
        status: 0,
        stdout: `${JSON.stringify({
          publicRelations: 42,
          publicProductsPresent: true,
          productBatchesPresent: true,
          productsOldPresent: true,
          migrationLedgerPresent: true,
          map017ReceiptAbsent: true,
        })}\n`,
        stderr: '',
      }
    }

    const result = await restoreModule.verifyMap017ProductionBackupRestore({
      envelopePath,
      passphrase,
      target,
      psql: 'fixture-psql',
      pgRestore: 'fixture-pg-restore',
      spawnImpl,
      now: () => new Date('2026-08-26T04:00:00.000Z'),
    })
    expect(result.restoreVerified).toBe(true)
    const restoreCall = calls.find((call) => call.executable === 'fixture-pg-restore' && call.args.includes('--dbname'))
    expect(restoreCall.args.slice(0, 3)).toEqual(['--exit-on-error', '--no-owner', '--no-privileges'])
    expect(restoreCall.args[3]).toMatch(/^--use-list=/)
    expect(restoreCall.args.slice(4)).toEqual(['--dbname', 'k2_map017_restore_verification_20260826'])
    expect(Buffer.isBuffer(restoreCall.options.input)).toBe(true)
    expect(restoreCall.options.env.PGTZ).toBe('UTC')
    for (const call of calls) {
      expect(call.args.join(' ')).not.toContain('restore-fixture-password')
      expect(call.args.join(' ')).not.toContain('postgresql://')
    }
    const evidenceText = await readFile(`${envelopePath}.restore-verification.json`, 'utf8')
    const evidence = JSON.parse(evidenceText)
    expect(evidence).toMatchObject({
      backupId: result.backupId,
      verifiedAt: '2026-08-26T04:00:00.000Z',
      restoreVerified: true,
      targetClass: 'dedicated-loopback-database',
      excludedManagedExtensions: ['supabase_vault'],
      excludedManagedExtensionEntries: 3,
    })
    expect(evidenceText).not.toContain('restore-fixture-password')
    expect(evidenceText).not.toContain('postgresql://')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('MAP-017 Storage archive rejects unsafe paths and detects byte drift', async () => {
  const module = await import('../scripts/map017-storage-backup.mjs')
  expect(() => module.validateStorageObjectPath('../secret.txt')).toThrow('UNSAFE_OBJECT_PATH')
  const encoded = module.encodeStorageArchive([
    { bucketId: 'product-images', name: 'catalog/one.jpg', mimeType: 'image/jpeg', data: Buffer.from('one') },
    { bucketId: 'product-images', name: 'catalog/two.png', mimeType: 'image/png', data: Buffer.from('two') },
  ])
  expect(encoded.summary).toMatchObject({ objectCount: 2, totalBytes: 6 })
  const decoded = module.decodeStorageArchive(encoded.archive)
  expect(decoded.objects.map((item) => item.data.toString('utf8'))).toEqual(['one', 'two'])
  const tampered = Buffer.from(encoded.archive)
  tampered[tampered.length - 1] ^= 1
  expect(() => module.decodeStorageArchive(tampered)).toThrow('OBJECT_CHECKSUM_MISMATCH')
})

test('MAP-017 Storage backup encrypts object bytes and restores them into a dedicated directory', async () => {
  const module = await import('../scripts/map017-storage-backup.mjs')
  const directory = await mkdtemp(path.join(tmpdir(), 'k2-map017-storage-'))
  const envelopePath = path.join(directory, 'production.k2storage')
  const restoreTarget = path.join(directory, 'k2_map017_storage_restore_verification_fixture')
  const passphrase = 'fixture-only-map017-storage-passphrase-2026'
  const fixtureObjects = new Map([
    ['catalog/one.jpg', Buffer.from('fixture-image-one')],
    ['catalog/two.png', Buffer.from('fixture-image-two')],
  ])
  const inventory = [...fixtureObjects.entries()].map(([name, data]) => ({
    bucketId: 'product-images', name, recordedSize: data.length, mimeType: 'image/jpeg', public: true,
  }))

  try {
    const backup = await module.createMap017StorageBackup({
      databaseUrl: fixtureProductionDatabaseUrl(),
      passphrase,
      destinationPath: envelopePath,
      confirmProject: 'pixplcjqivlfflickobf',
      confirmPurpose: 'MAP-017-storage-pre-migration',
      inventory,
      fetchImpl: async (url) => {
        const name = decodeURIComponent(new URL(url).pathname.split('/product-images/')[1])
        const data = fixtureObjects.get(name)
        return { ok: Boolean(data), arrayBuffer: async () => data }
      },
      now: () => new Date('2026-08-27T15:00:00.000Z'),
    })
    expect(backup.manifest).toMatchObject({
      objectCount: 2,
      totalBytes: 34,
      restoreVerification: 'Pending',
      bucketCounts: [{ bucketId: 'product-images', objectCount: 2 }],
    })
    const manifestText = await readFile(`${envelopePath}.manifest.json`, 'utf8')
    expect(manifestText).not.toContain('catalog/one.jpg')
    expect(manifestText).not.toContain('fixture-image-one')

    const restored = await module.restoreMap017StorageBackup({
      envelopePath,
      passphrase,
      targetDirectory: restoreTarget,
      now: () => new Date('2026-08-27T15:01:00.000Z'),
    })
    expect(restored.restoreVerified).toBe(true)
    expect(await readFile(path.join(restoreTarget, 'product-images', 'catalog', 'one.jpg'), 'utf8'))
      .toBe('fixture-image-one')
    expect(restored.evidence).toMatchObject({
      objectCount: 2,
      totalBytes: 34,
      restoredFingerprintMatches: true,
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('encrypted backup transport chunks verify exact reassembly and reject part drift', async () => {
  const module = await import('../scripts/split-encrypted-backup.mjs')
  const directory = await mkdtemp(path.join(tmpdir(), 'k2-backup-parts-'))
  const sourcePath = path.join(directory, 'fixture.k2storage')
  try {
    await writeFile(sourcePath, Buffer.alloc(2500, 7))
    const split = await module.splitEncryptedBackup({
      sourcePath,
      chunkBytes: 1024,
      now: () => new Date('2026-08-27T15:30:00.000Z'),
    })
    expect(split.manifest).toMatchObject({ sourceBytes: 2500, partCount: 3, chunkBytes: 1024 })
    await expect(module.verifyEncryptedBackupParts({ manifestPath: split.manifestPath }))
      .resolves.toMatchObject({ verified: true, partCount: 3, totalBytes: 2500 })
    await writeFile(split.partPaths[1], Buffer.from('changed'), { flag: 'w' })
    await expect(module.verifyEncryptedBackupParts({ manifestPath: split.manifestPath }))
      .rejects.toThrow('PART_CHECKSUM_MISMATCH')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('MAP-017 provider backup inventory performs one read-only request and returns redacted evidence', async () => {
  const module = await import('../scripts/map017-evidence/list-provider-backups.mjs')
  expect(typeof module.listMap017ProviderBackups).toBe('function')
  const calls = []
  const result = await module.listMap017ProviderBackups({
    accessToken: 'fixture-management-token',
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      return {
        ok: true,
        status: 200,
        json: async () => ({
          pitr_enabled: false,
          walg_enabled: true,
          backups: [{
            id: 'backup-fixture-id',
            status: 'COMPLETED',
            inserted_at: '2026-08-26T00:00:00.000Z',
            type: 'DAILY',
            download_url: 'https://private.example.test/secret-backup',
          }],
        }),
      }
    },
  })

  expect(calls).toHaveLength(1)
  expect(calls[0]).toMatchObject({
    url: 'https://api.supabase.com/v1/projects/pixplcjqivlfflickobf/database/backups',
    init: { method: 'GET' },
  })
  expect(result).toEqual({
    projectRef: 'pixplcjqivlfflickobf',
    pitrEnabled: false,
    walgEnabled: true,
    backups: [{
      id: 'backup-fixture-id',
      status: 'COMPLETED',
      createdAt: '2026-08-26T00:00:00.000Z',
      type: 'DAILY',
    }],
  })
  expect(JSON.stringify(result)).not.toContain('download_url')
  expect(JSON.stringify(result)).not.toContain('fixture-management-token')
})

test('MAP-017 production backup accepts only the exact Supabase project over TLS', async () => {
  const module = await import('../scripts/create-map017-production-backup.mjs')
  expect(typeof module.validateMap017ProductionDatabaseUrl).toBe('function')

  expect(module.validateMap017ProductionDatabaseUrl(
    fixtureProductionDatabaseUrl(),
  )).toMatchObject({ valid: true, projectRef: 'pixplcjqivlfflickobf' })
  expect(module.validateMap017ProductionDatabaseUrl(
    fixtureProductionDatabaseUrl({
      host: 'aws-0-ap-southeast-1.pooler.supabase.com',
      user: 'postgres.pixplcjqivlfflickobf',
    }).replace(':5432/', ':6543/'),
  )).toMatchObject({ valid: true, projectRef: 'pixplcjqivlfflickobf' })
  expect(module.validateMap017ProductionDatabaseUrl(
    fixtureProductionDatabaseUrl({ host: 'db.pixplcjqivlfflickobf.supabase.co.evil.test' }),
  )).toEqual({ valid: false, reason: 'PRODUCTION_DATABASE_PROJECT_MISMATCH' })
  expect(module.validateMap017ProductionDatabaseUrl(
    fixtureProductionDatabaseUrl({ ssl: false }),
  )).toEqual({ valid: false, reason: 'PRODUCTION_DATABASE_TLS_REQUIRED' })
})

test('MAP-017 production backup writes only an encrypted envelope and redacted manifest', async () => {
  const module = await import('../scripts/create-map017-production-backup.mjs')
  expect(typeof module.createMap017ProductionBackup).toBe('function')
  const directory = await mkdtemp(path.join(tmpdir(), 'k2-map017-production-backup-'))
  const destinationPath = path.join(directory, 'map017-pre-migration.k2backup')
  const databaseUrl = fixtureProductionDatabaseUrl()
  const passphrase = 'fixture-only-map017-backup-passphrase-2026'
  const dump = Buffer.from('PGDMP\u0001fixture-production-dump')

  try {
    const result = await module.createMap017ProductionBackup({
      databaseUrl,
      passphrase,
      destinationPath,
      confirmProject: 'pixplcjqivlfflickobf',
      confirmPurpose: 'MAP-017-pre-migration',
      confirmArtifactSha256: 'D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62',
      confirmLedgerVersion: '20260824143000',
      now: () => new Date('2026-08-26T03:30:00.000Z'),
      dumpDatabase: async ({ databaseUrl: receivedUrl }) => {
        expect(receivedUrl).toBe(databaseUrl)
        return {
          dump,
          productsOldArchive: module.productsOldArchiveFingerprintFromRows(fixtureProductsOldRows.join('\n')),
        }
      },
    })

    expect(result.backupId).toContain('map017-pixplcjqivlfflickobf-20260826T033000Z')
    const envelope = await readFile(destinationPath)
    expect(await decryptAndVerifyBackup({
      backupEnvelope: envelope,
      passphrase,
      authenticatedData: module.productsOldArchiveAuthenticatedData(result.manifest.productsOldArchive),
    })).toEqual(dump)
    const manifestText = await readFile(`${destinationPath}.manifest.json`, 'utf8')
    const manifest = JSON.parse(manifestText)
    expect(manifest).toMatchObject({
      backupId: result.backupId,
      projectRef: 'pixplcjqivlfflickobf',
      purpose: 'MAP-017-pre-migration',
      artifactSha256: 'D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62',
      ledgerVersion: '20260824143000',
      restoreVerification: 'Pending',
    })
    expect(manifestText).not.toContain('fixture-password')
    expect(manifestText).not.toContain(passphrase)
    expect(manifestText).not.toContain('postgresql://')
    expect(await readdir(directory)).toEqual([
      'map017-pre-migration.k2backup',
      'map017-pre-migration.k2backup.manifest.json',
    ])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('MAP-017 pg_dump keeps credentials out of arguments and enforces client/server major parity', async () => {
  const module = await import('../scripts/create-map017-production-backup.mjs')
  expect(typeof module.dumpMap017ProductionDatabase).toBe('function')
  const databaseUrl = fixtureProductionDatabaseUrl()
  const calls = []
  const spawnImpl = (executable, args, options) => {
    calls.push({ executable, args, options })
    if (executable === 'fixture-psql' && args.includes('show server_version_num;')) {
      return { status: 0, stdout: '170011\n', stderr: '' }
    }
    if (executable === 'fixture-psql') {
      return { status: 0, stdout: fixtureProductsOldRows.join('\n'), stderr: '' }
    }
    if (args.includes('--version')) return { status: 0, stdout: 'pg_dump (PostgreSQL) 17.11\n', stderr: '' }
    return { status: 0, stdout: Buffer.from('PGDMP\u0001fixture-production-dump'), stderr: Buffer.alloc(0) }
  }

  const result = await module.dumpMap017ProductionDatabase({
    databaseUrl,
    psql: 'fixture-psql',
    pgDump: 'fixture-pg-dump',
    spawnImpl,
  })
  expect(result.dump.subarray(0, 5).toString('ascii')).toBe('PGDMP')
  expect(result.productsOldArchive).toEqual(
    module.productsOldArchiveFingerprintFromRows(fixtureProductsOldRows.join('\n')),
  )
  expect(calls).toHaveLength(5)
  for (const call of calls) {
    expect(call.args.join(' ')).not.toContain('postgresql://')
    expect(call.args.join(' ')).not.toContain('fixture-password')
    expect(call.options.env.PGPASSWORD).toBe('fixture-password')
  }
  expect(calls[3].args).toEqual(['--format=custom', '--no-owner'])

  await expect(module.dumpMap017ProductionDatabase({
    databaseUrl,
    psql: 'fixture-psql',
    pgDump: 'fixture-pg-dump',
    spawnImpl: (executable, args) => executable === 'fixture-psql'
      ? { status: 0, stdout: '150014\n', stderr: '' }
      : { status: 0, stdout: 'pg_dump (PostgreSQL) 17.11\n', stderr: '' },
  })).rejects.toThrow('POSTGRES_CLIENT_SERVER_MAJOR_MISMATCH')

  let archiveReads = 0
  await expect(module.dumpMap017ProductionDatabase({
    databaseUrl,
    psql: 'fixture-psql',
    pgDump: 'fixture-pg-dump',
    spawnImpl: (executable, args) => {
      if (executable === 'fixture-psql' && args.includes('show server_version_num;')) {
        return { status: 0, stdout: '170011\n', stderr: '' }
      }
      if (executable === 'fixture-psql') {
        archiveReads += 1
        const rows = archiveReads === 1
          ? fixtureProductsOldRows
          : [...fixtureProductsOldRows.slice(0, -1), JSON.stringify({ id: 14, sku: 'LEGACY-CHANGED' })]
        return { status: 0, stdout: rows.join('\n'), stderr: '' }
      }
      if (args.includes('--version')) {
        return { status: 0, stdout: 'pg_dump (PostgreSQL) 17.11\n', stderr: '' }
      }
      return { status: 0, stdout: Buffer.from('PGDMP\u0001fixture-production-dump'), stderr: '' }
    },
  })).rejects.toThrow('PRODUCTS_OLD_CHANGED_DURING_DUMP')
})

test('MAP-017 production backup never overwrites or deletes an existing destination', async () => {
  const module = await import('../scripts/create-map017-production-backup.mjs')
  const directory = await mkdtemp(path.join(tmpdir(), 'k2-map017-existing-backup-'))
  const destinationPath = path.join(directory, 'existing.k2backup')
  const existing = Buffer.from('existing-owner-backup')
  await writeFile(destinationPath, existing)

  try {
    await expect(module.createMap017ProductionBackup({
      databaseUrl: fixtureProductionDatabaseUrl(),
      passphrase: 'fixture-only-map017-backup-passphrase-2026',
      destinationPath,
      confirmProject: 'pixplcjqivlfflickobf',
      confirmPurpose: 'MAP-017-pre-migration',
      confirmArtifactSha256: 'D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62',
      confirmLedgerVersion: '20260824143000',
      dumpDatabase: async () => ({
        dump: Buffer.from('PGDMP\u0001fixture-production-dump'),
        productsOldArchive: module.productsOldArchiveFingerprintFromRows(fixtureProductsOldRows.join('\n')),
      }),
    })).rejects.toThrow('BACKUP_DESTINATION_ALREADY_EXISTS')
    expect(await readFile(destinationPath)).toEqual(existing)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
