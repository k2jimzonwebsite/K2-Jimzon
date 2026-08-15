import assert from 'node:assert/strict'
import { createEncryptedBackup, decryptAndVerifyBackup } from './backup-database-encrypted.mjs'

/**
 * Cryptographic-envelope rehearsal only.
 *
 * This verifies byte fidelity, wrong-passphrase rejection, and tamper detection.
 * It does not connect to or restore a database and is not MAP-022 evidence.
 */

async function runEnvelopeRehearsal() {
  const originalData = Buffer.from('K2 encrypted-envelope rehearsal payload')
  const passphrase = 'k2-rehearsal-passphrase-32-chars-ok!'
  const backup = await createEncryptedBackup({ sourceData: originalData, passphrase })

  assert.ok(backup.byteLength > 0, 'Encrypted envelope must be non-empty')
  assert.equal(typeof backup.sha256, 'string')

  const restoredBuffer = await decryptAndVerifyBackup({
    backupEnvelope: backup.envelope,
    passphrase,
  })
  assert.deepEqual(restoredBuffer, originalData, 'Decrypted bytes must match the original exactly')

  await assert.rejects(
    decryptAndVerifyBackup({
      backupEnvelope: backup.envelope,
      passphrase: 'wrong-passphrase-attempt-1234567!',
    }),
    /Unsupported state or unable to authenticate data/,
    'Decryption with the wrong passphrase must fail',
  )

  const tamperedEnvelope = Buffer.from(backup.envelope)
  tamperedEnvelope[tamperedEnvelope.length - 1] ^= 0xff
  await assert.rejects(
    decryptAndVerifyBackup({ backupEnvelope: tamperedEnvelope, passphrase }),
    /Unsupported state or unable to authenticate data/,
    'Decryption of tampered ciphertext must fail',
  )

  console.log('Encrypted-envelope rehearsal passed integrity, authentication, and tamper tests.')
}

runEnvelopeRehearsal()
