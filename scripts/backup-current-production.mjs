#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createEncryptedBackup } from './backup-database-encrypted.mjs'
import {
  dumpMap017ProductionDatabase,
  validateMap017ProductionDatabaseUrl,
} from './create-map017-production-backup.mjs'

const PROJECT_REF = 'pixplcjqivlfflickobf'
const PURPOSE = 'current-schema-pre-account-guest-permission-cutover'
const root = fileURLToPath(new URL('..', import.meta.url))
const postgresBin = path.join(root, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin')
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex')

export function currentBackupAuthenticatedData(manifest) {
  return `K2-CURRENT-PRODUCTION-V1\n${manifest.projectRef}\n${manifest.purpose}\n${manifest.createdAt}\n${manifest.dumpSha256}`
}

export async function createCurrentProductionBackup({ databaseUrl, passphrase, destinationPath }) {
  const target = validateMap017ProductionDatabaseUrl(databaseUrl)
  if (!target.valid) throw new Error(`CURRENT_BACKUP_REFUSAL: ${target.reason}`)
  if (!passphrase || passphrase.length < 24) throw new Error('CURRENT_BACKUP_REFUSAL: PASSPHRASE_TOO_SHORT')
  if (!path.isAbsolute(destinationPath || '') || !destinationPath.endsWith('.k2backup')) {
    throw new Error('CURRENT_BACKUP_REFUSAL: ABSOLUTE_K2BACKUP_DESTINATION_REQUIRED')
  }
  const { dump, productsOldArchive } = await dumpMap017ProductionDatabase({
    databaseUrl,
    psql: process.env.K2_PSQL_BIN || path.join(postgresBin, 'psql.exe'),
    pgDump: process.env.K2_PG_DUMP_BIN || path.join(postgresBin, 'pg_dump.exe'),
  })
  const manifest = {
    formatVersion: 1,
    projectRef: PROJECT_REF,
    purpose: PURPOSE,
    createdAt: new Date().toISOString(),
    dumpFormat: 'PostgreSQL custom',
    dumpBytes: dump.length,
    dumpSha256: sha256(dump),
    productsOldArchive,
    restoreVerification: 'Pending',
  }
  const encrypted = await createEncryptedBackup({
    sourceData: dump,
    passphrase,
    authenticatedData: currentBackupAuthenticatedData(manifest),
  })
  manifest.encryptedBytes = encrypted.byteLength
  manifest.encryptedSha256 = encrypted.sha256
  manifest.backupId = `current-${PROJECT_REF}-${manifest.createdAt.replace(/[:.]/g, '')}-${encrypted.sha256.slice(0, 12)}`
  const manifestPath = `${destinationPath}.manifest.json`
  let envelopeCreated = false
  try {
    await fs.writeFile(destinationPath, encrypted.envelope, { flag: 'wx' })
    envelopeCreated = true
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
  } catch (error) {
    if (envelopeCreated) await fs.unlink(destinationPath).catch(() => {})
    if (error?.code === 'EEXIST') throw new Error('CURRENT_BACKUP_REFUSAL: DESTINATION_EXISTS')
    throw error
  }
  return { backupId: manifest.backupId, destinationPath, manifestPath }
}

if (process.argv[1]?.endsWith('backup-current-production.mjs')) {
  const destinationPath = process.argv.find(arg => arg.startsWith('--destination='))?.slice('--destination='.length)
  try {
    const result = await createCurrentProductionBackup({
      databaseUrl: process.env.K2_PRODUCTION_DATABASE_URL,
      passphrase: process.env.K2_BACKUP_PASSPHRASE,
      destinationPath,
    })
    console.log(`Encrypted current production backup: ${result.backupId}`)
    console.log(`Envelope: ${result.destinationPath}`)
    console.log(`Redacted manifest: ${result.manifestPath}`)
  } catch (error) {
    console.error(String(error?.message || 'CURRENT_BACKUP_FAILED'))
    process.exitCode = 1
  }
}
