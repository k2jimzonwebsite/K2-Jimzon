#!/usr/bin/env node
/**
 * MAP-017 Captured-Baseline Recovery Generator & Validator
 *
 * Validates recovery SQL safety. Faithful DDL reconstruction from a captured
 * pre-change snapshot is not implemented; generation fails closed.
 *
 * SAFETY INVARIANTS:
 * - NEVER restores anonymous/public DML privileges.
 * - NEVER restores blanket USING (true) / WITH CHECK (true) write policies.
 * - NEVER restores public Storage upload/update/delete policies.
 * - NEVER restores client EXECUTE grants on deprecated mutation RPCs.
 * - NEVER emits DROP TABLE, CASCADE, TRUNCATE, or destructive statements.
 * - ALWAYS wraps operations in an explicit transactional boundary (BEGIN / COMMIT).
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSchemaExport } from './schema-truth-core.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

export function generateSafeRecoverySql(capturedMetadata) {
  // The current metadata contract does not capture enough faithful DDL to
  // reconstruct policies, grants, owners, functions, triggers, view definitions,
  // Storage policies, and Realtime state without inventing or losing semantics.
  // Validate the broad artifact shape, then fail closed until the full contract
  // and an isolated apply/recovery rehearsal exist.
  if (typeof capturedMetadata === 'string') parseSchemaExport(capturedMetadata)
  else parseSchemaExport(JSON.stringify(capturedMetadata))
  throw new Error('CAPTURED_BASELINE_RECOVERY_NOT_IMPLEMENTED')
}

export function validateGeneratedRecoverySql(sqlText) {
  const stripped = sqlText
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')

  // Prohibit destructive statements
  if (/(?:^|;|\n)\s*drop\s+table\b/i.test(stripped)) throw new Error('SAFETY_VIOLATION: Recovery SQL contains DROP TABLE')
  if (/\bcascade\b/i.test(stripped)) throw new Error('SAFETY_VIOLATION: Recovery SQL contains CASCADE')
  if (/\btruncate\b/i.test(stripped)) throw new Error('SAFETY_VIOLATION: Recovery SQL contains TRUNCATE')

  // Prohibit insecure restorations
  if (/grant\s+(?:all|insert|update|delete)\s+on\s+table\s+public\.\w+\s+to\s+(?:anon|public)/i.test(stripped)) {
    throw new Error('SAFETY_VIOLATION: Recovery SQL attempts to restore anonymous/public DML grants')
  }
  if (/create\s+policy[\s\S]+for\s+(?:all|insert|update|delete)\s+to\s+(?:public|anon)[\s\S]+using\s*\(\s*true\s*\)/i.test(stripped)) {
    throw new Error('SAFETY_VIOLATION: Recovery SQL attempts to restore blanket public write policy')
  }

  // Ensure transaction boundaries
  if (!/\bbegin;/i.test(stripped) || !/\bcommit;/i.test(stripped)) {
    throw new Error('SAFETY_VIOLATION: Recovery SQL missing explicit BEGIN / COMMIT transaction')
  }

  return { valid: true }
}

async function main() {
  const args = process.argv.slice(2)
  const metadataPath = args.find((a) => a.startsWith('--baseline='))?.split('=')[1]
  const outputPath = args.find((a) => a.startsWith('--output='))?.split('=')[1]

  if (!metadataPath) {
    console.log('MAP-017 Captured-Baseline Recovery Tool:')
    console.log('Usage: node scripts/generate-captured-baseline-recovery.mjs --baseline=<path-to-export.json> [--output=<recovery.sql>]')
    process.exit(2)
  }

  try {
    const rawMetadata = fs.readFileSync(path.resolve(process.cwd(), metadataPath), 'utf8')
    const recoverySql = generateSafeRecoverySql(rawMetadata)
    validateGeneratedRecoverySql(recoverySql)

    if (outputPath) {
      fs.writeFileSync(path.resolve(process.cwd(), outputPath), recoverySql, 'utf8')
      console.log(`✓ Safe recovery SQL generated and validated at ${outputPath}`)
    } else {
      console.log(recoverySql)
    }
    process.exit(0)
  } catch (err) {
    console.error(`Recovery Generation Failed: ${err.message}`)
    process.exit(1)
  }
}

if (process.argv[1]?.endsWith('generate-captured-baseline-recovery.mjs')) {
  main()
}
