import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Authenticated-encryption envelope for an existing backup payload.
 *
 * This module does not export Supabase/Postgres data and is not, by itself,
 * MAP-022 backup or restore evidence. A real workflow must separately produce
 * a database dump, encrypt it, store it off-site, and restore it into an
 * isolated target before MAP-022 can be accepted.
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32

export async function createEncryptedBackup({ sourceData, passphrase, destinationPath, authenticatedData }) {
  if (!passphrase || passphrase.length < 16) {
    throw new Error('Passphrase must be at least 16 characters long')
  }

  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = crypto.scryptSync(passphrase, salt, 32)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  if (authenticatedData !== undefined) {
    cipher.setAAD(Buffer.isBuffer(authenticatedData) ? authenticatedData : Buffer.from(authenticatedData, 'utf8'))
  }
  const plaintext = Buffer.isBuffer(sourceData) ? sourceData : Buffer.from(sourceData, 'utf8')
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const authTag = cipher.getAuthTag()
  const backupEnvelope = Buffer.concat([salt, iv, authTag, encrypted])

  if (destinationPath) {
    await fs.mkdir(path.dirname(destinationPath), { recursive: true })
    await fs.writeFile(destinationPath, backupEnvelope)
  }

  return {
    byteLength: backupEnvelope.length,
    sha256: crypto.createHash('sha256').update(backupEnvelope).digest('hex'),
    envelope: backupEnvelope,
  }
}

export async function decryptAndVerifyBackup({ backupEnvelope, passphrase, authenticatedData }) {
  if (backupEnvelope.length < SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid backup file structure: payload too small')
  }

  const salt = backupEnvelope.subarray(0, SALT_LENGTH)
  const iv = backupEnvelope.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const authTag = backupEnvelope.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = backupEnvelope.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)
  const key = crypto.scryptSync(passphrase, salt, 32)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  if (authenticatedData !== undefined) {
    decipher.setAAD(Buffer.isBuffer(authenticatedData) ? authenticatedData : Buffer.from(authenticatedData, 'utf8'))
  }
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

// Local cryptographic-envelope self-check only. This is not a database backup.
if (process.argv[1]?.endsWith('backup-database-encrypted.mjs')) {
  const samplePayload = 'K2 encrypted-envelope self-check'
  const testPass = 'k2-secure-test-passphrase-2026-launch!'
  const result = await createEncryptedBackup({ sourceData: samplePayload, passphrase: testPass })
  const restored = await decryptAndVerifyBackup({ backupEnvelope: result.envelope, passphrase: testPass })

  if (restored.toString('utf8') !== samplePayload) {
    throw new Error('Encrypted-envelope integrity verification failed')
  }

  console.log(`Encrypted-envelope self-check passed (${result.byteLength} bytes, SHA-256: ${result.sha256.substring(0, 16)}...)`)
}
