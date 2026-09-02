#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_CHUNK_BYTES = 64 * 1024 * 1024
const MAX_CONNECTOR_BYTES = 100 * 1024 * 1024

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function validateSourcePath(sourcePath) {
  if (!path.isAbsolute(sourcePath) || !/\.(?:k2backup|k2storage)$/.test(sourcePath)) {
    throw new Error('BACKUP_SPLIT_REFUSAL: ABSOLUTE_ENCRYPTED_BACKUP_REQUIRED')
  }
}

export async function splitEncryptedBackup({
  sourcePath,
  chunkBytes = DEFAULT_CHUNK_BYTES,
  now = () => new Date(),
}) {
  validateSourcePath(sourcePath)
  if (!Number.isSafeInteger(chunkBytes) || chunkBytes < 1024 || chunkBytes >= MAX_CONNECTOR_BYTES) {
    throw new Error('BACKUP_SPLIT_REFUSAL: CHUNK_SIZE_INVALID')
  }
  const source = await fs.readFile(sourcePath)
  if (source.length <= chunkBytes) throw new Error('BACKUP_SPLIT_REFUSAL: SPLIT_NOT_REQUIRED')
  const manifestPath = `${sourcePath}.parts.json`
  try {
    await fs.access(manifestPath)
    throw new Error('BACKUP_SPLIT_REFUSAL: PARTS_MANIFEST_EXISTS')
  } catch (error) {
    if (error?.message === 'BACKUP_SPLIT_REFUSAL: PARTS_MANIFEST_EXISTS') throw error
  }
  const createdPaths = []
  const parts = []
  try {
    for (let offset = 0, index = 1; offset < source.length; offset += chunkBytes, index += 1) {
      const data = source.subarray(offset, Math.min(offset + chunkBytes, source.length))
      const fileName = `${path.basename(sourcePath)}.part${String(index).padStart(3, '0')}`
      const partPath = path.join(path.dirname(sourcePath), fileName)
      await fs.writeFile(partPath, data, { flag: 'wx' })
      createdPaths.push(partPath)
      parts.push({ fileName, size: data.length, sha256: sha256(data) })
    }
    const manifest = {
      formatVersion: 1,
      createdAt: now().toISOString(),
      sourceFile: path.basename(sourcePath),
      sourceBytes: source.length,
      sourceSha256: sha256(source),
      chunkBytes,
      partCount: parts.length,
      parts,
      evidenceBoundary: 'Transport chunks of an already encrypted backup; no plaintext data is present.',
    }
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
    createdPaths.push(manifestPath)
    return { manifestPath, manifest, partPaths: parts.map((part) => path.join(path.dirname(sourcePath), part.fileName)) }
  } catch (error) {
    await Promise.all(createdPaths.map((createdPath) => fs.rm(createdPath, { force: true })))
    throw error
  }
}

export async function verifyEncryptedBackupParts({ manifestPath, partsDirectory = path.dirname(manifestPath) }) {
  let manifest
  try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) }
  catch { throw new Error('BACKUP_PARTS_VERIFICATION_REFUSAL: MANIFEST_INVALID') }
  if (
    manifest.formatVersion !== 1 || !Number.isSafeInteger(manifest.partCount)
    || manifest.partCount < 2 || manifest.partCount !== manifest.parts?.length
    || !/^[0-9a-f]{64}$/.test(manifest.sourceSha256 || '')
  ) throw new Error('BACKUP_PARTS_VERIFICATION_REFUSAL: MANIFEST_INVALID')
  const sourceHash = crypto.createHash('sha256')
  let totalBytes = 0
  for (const part of manifest.parts) {
    if (!/^[^/\\]+\.part\d{3}$/.test(part.fileName) || !/^[0-9a-f]{64}$/.test(part.sha256 || '')) {
      throw new Error('BACKUP_PARTS_VERIFICATION_REFUSAL: PART_METADATA_INVALID')
    }
    const data = await fs.readFile(path.join(partsDirectory, part.fileName))
    if (data.length !== part.size || sha256(data) !== part.sha256) {
      throw new Error('BACKUP_PARTS_VERIFICATION_REFUSAL: PART_CHECKSUM_MISMATCH')
    }
    sourceHash.update(data)
    totalBytes += data.length
  }
  if (totalBytes !== manifest.sourceBytes || sourceHash.digest('hex') !== manifest.sourceSha256) {
    throw new Error('BACKUP_PARTS_VERIFICATION_REFUSAL: REASSEMBLED_CHECKSUM_MISMATCH')
  }
  return { verified: true, partCount: manifest.partCount, totalBytes, sourceSha256: manifest.sourceSha256 }
}

async function main() {
  const [command, rawPath] = process.argv.slice(2)
  try {
    if (command === 'split') {
      const result = await splitEncryptedBackup({ sourcePath: path.resolve(rawPath || '') })
      console.log(`Encrypted backup split into ${result.manifest.partCount} verified parts`)
      console.log(`Redacted parts manifest: ${result.manifestPath}`)
    } else if (command === 'verify') {
      const result = await verifyEncryptedBackupParts({ manifestPath: path.resolve(rawPath || '') })
      console.log(`Encrypted backup parts verified: ${result.partCount} parts, ${result.totalBytes} bytes`)
      console.log(`Reassembled SHA-256: ${result.sourceSha256}`)
    } else {
      throw new Error('BACKUP_SPLIT_REFUSAL: SPLIT_OR_VERIFY_COMMAND_REQUIRED')
    }
  } catch (error) {
    console.error(String(error?.message || 'BACKUP_SPLIT_REFUSAL'))
    process.exit(2)
  }
}

if (process.argv[1]?.endsWith('split-encrypted-backup.mjs')) main()
