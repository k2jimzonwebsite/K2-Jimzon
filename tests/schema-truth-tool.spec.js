import { test, expect } from '@playwright/test'
import {
  parseSchemaExport,
  buildExpectedRepositorySchema,
  compareSchemaTruth,
  sanitizeSchemaText,
  formatSchemaTruthReport,
  SEVERITY,
} from '../scripts/schema-truth-core.mjs'
import {
  generateSafeRecoverySql,
  validateGeneratedRecoverySql,
} from '../scripts/generate-captured-baseline-recovery.mjs'
import { validateLocalTarget } from '../scripts/rehearse-local-migration.mjs'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const auditCli = fileURLToPath(new URL('../scripts/schema-truth-audit.mjs', import.meta.url))
const applyCli = fileURLToPath(new URL('../scripts/apply-map017-migration.mjs', import.meta.url))
const rehearsalCli = fileURLToPath(new URL('../scripts/rehearse-local-migration.mjs', import.meta.url))
const authSuiteCli = fileURLToPath(new URL('../scripts/run-local-database-authorization-suite.mjs', import.meta.url))
const exportCli = fileURLToPath(new URL('../scripts/export-schema-metadata.mjs', import.meta.url))

function runNode(script, args = []) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })
}

test('schema-truth core sanitizes sensitive strings, connection strings, and tokens', () => {
  const mockDbUrl = ['postgresql://', 'db_user:', 'test_secret_pass', '@db.example.internal:5432/k2_db'].join('')
  const mockSecretKey = ['sb_secret_', 'mock_test_key_value_12345'].join('')
  const input = `Connect to ${mockDbUrl} with ${mockSecretKey} and sample_user@example.test`
  const sanitized = sanitizeSchemaText(input)
  expect(sanitized).not.toContain('test_secret_pass')
  expect(sanitized).not.toContain('mock_test_key_value_12345')
  expect(sanitized).not.toContain('sample_user@example.test')
  expect(sanitized).toContain('[REDACTED]')
})

test('schema-truth parser fails closed on missing, malformed, or incomplete input', () => {
  expect(() => parseSchemaExport('')).toThrow(/SCHEMA_EXPORT_EMPTY/)
  expect(() => parseSchemaExport('{ invalid json')).toThrow(/SCHEMA_EXPORT_INVALID_JSON/)
  expect(() => parseSchemaExport([])).toThrow(/SCHEMA_EXPORT_FORMAT_ERROR/)
  expect(() => parseSchemaExport({ tables: {} })).toThrow(/SCHEMA_EXPORT_INCOMPLETE/)
})

test('schema-truth engine parses fabricated clean fixture and confirms zero critical findings', async () => {
  const cleanJson = await readFile(
    new URL('./fixtures/schema-truth-exports/fabricated-clean-sample.json', import.meta.url),
    'utf8',
  )
  const parsed = parseSchemaExport(cleanJson)
  const expected = buildExpectedRepositorySchema()
  const result = compareSchemaTruth(parsed, expected)

  expect(result.clean).toBe(true)
  expect(result.criticalCount).toBe(0)
  expect(result.highCount).toBe(0)
  expect(result.summary.status).toBe('CONFORMANT')

  const report = formatSchemaTruthReport(result)
  expect(report).toContain('CONFORMANT')
  expect(report).not.toContain('[REDACTED]')
})

test('schema-truth engine detects anon DML grants, blanket policies, and storage flaws in fabricated vulnerable fixture', async () => {
  const vulnerableJson = await readFile(
    new URL('./fixtures/schema-truth-exports/fabricated-vulnerable-sample.json', import.meta.url),
    'utf8',
  )
  const parsed = parseSchemaExport(vulnerableJson)
  const expected = buildExpectedRepositorySchema()
  const result = compareSchemaTruth(parsed, expected)

  expect(result.clean).toBe(false)
  expect(result.criticalCount).toBeGreaterThanOrEqual(4)
  expect(result.summary.status).toBe('NON_CONFORMANT_CRITICAL')

  const issueTypes = result.issues.map((i) => i.type)
  expect(issueTypes).toContain('ANON_DML_GRANTED')
  expect(issueTypes).toContain('BLANKET_PUBLIC_WRITE_POLICY')
  expect(issueTypes).toContain('STORAGE_PUBLIC_WRITE_POLICY')
  expect(issueTypes).toContain('REALTIME_EXCLUDED_TABLE_PRESENT')
  expect(issueTypes).toContain('SECURITY_INVOKER_MISSING')
})

test('schema-truth JSON formatting is machine readable and contains structured summaries', async () => {
  const cleanJson = await readFile(
    new URL('./fixtures/schema-truth-exports/fabricated-clean-sample.json', import.meta.url),
    'utf8',
  )
  const parsed = parseSchemaExport(cleanJson)
  const expected = buildExpectedRepositorySchema()
  const result = compareSchemaTruth(parsed, expected)

  const jsonReport = JSON.parse(formatSchemaTruthReport(result, { format: 'json' }))
  expect(jsonReport.clean).toBe(true)
  expect(jsonReport.summary.tablesChecked).toBe(13)
  expect(jsonReport.summary.viewsChecked).toBe(4)
})

test('schema-truth CLI refuses to audit when no explicit export or fixture is supplied', () => {
  const result = runNode(auditCli)
  expect(result.status).toBe(2)
  expect(result.stderr).toContain('SCHEMA_EXPORT_REQUIRED')
  expect(result.stdout).not.toContain('CONFORMANT')
})

test('schema-truth CLI fails by default when an explicit fixture contains findings', () => {
  const result = runNode(auditCli, ['--fixture=fabricated-vulnerable-sample'])
  expect(result.status).toBe(1)
  expect(result.stdout).toContain('NON_CONFORMANT_CRITICAL')
  expect(result.stdout).toContain('product_drafts.Allow all authenticated')
})

test('schema-truth CLI allows a diagnostic findings report only when explicitly requested', () => {
  const result = runNode(auditCli, ['--fixture=fabricated-vulnerable-sample', '--allow-findings'])
  expect(result.status).toBe(0)
  expect(result.stdout).toContain('NON_CONFORMANT_CRITICAL')
})

test('MAP-017 apply command fails truthfully when missing gates or when execution path is not implemented', () => {
  // Test missing gates
  const missingResult = runNode(applyCli, ['--apply'])
  expect(missingResult.status).toBe(1)
  expect(missingResult.stderr).toContain('PRODUCTION APPLY GATING REFUSAL')

  // Test fully supplied gates -> exits 2 (unimplemented)
  const fullResult = runNode(applyCli, [
    '--apply',
    '--confirm-project=pixplcjqivlfflickobf',
    '--confirm-authorization',
    '--confirm-backup-verified',
    '--confirm-ledger-aligned',
  ])
  expect(fullResult.status).toBe(2)
  expect(fullResult.stderr).toContain('MAP017_APPLY_NOT_IMPLEMENTED')
})

test('local migration rehearsal runner strictly refuses remote or production targets', () => {
  const remoteSupabase = ['postgres://', 'user:', 'pass', '@db.pixplcjqivlfflickobf.supabase.co:5432/postgres'].join('')
  const localTarget = ['postgres://', 'user:', 'pass', '@127.0.0.1:54322/postgres'].join('')
  const localhostTarget = ['postgres://', 'user:', 'pass', '@localhost:5432/postgres'].join('')

  expect(validateLocalTarget(remoteSupabase).isLocal).toBe(false)
  expect(validateLocalTarget(remoteSupabase).reason).toBe('NON_LOCAL_HOST_REJECTED')
  expect(validateLocalTarget(localTarget).isLocal).toBe(true)
  expect(validateLocalTarget(localhostTarget).isLocal).toBe(true)
  const lookalikeLocalhost = ['postgres://', 'user:', 'pass', '@localhost.evil.example:5432/postgres'].join('')
  const lookalikeLoopback = ['postgres://', 'user:', 'pass', '@127.0.0.1.evil.example:5432/postgres'].join('')
  expect(validateLocalTarget(lookalikeLocalhost).isLocal).toBe(false)
  expect(validateLocalTarget(lookalikeLoopback).isLocal).toBe(false)
})

test('captured-baseline recovery generator fails closed until faithful DDL recovery is implemented', async () => {
  const cleanJson = await readFile(
    new URL('./fixtures/schema-truth-exports/fabricated-clean-sample.json', import.meta.url),
    'utf8',
  )
  expect(() => generateSafeRecoverySql(cleanJson)).toThrow(/CAPTURED_BASELINE_RECOVERY_NOT_IMPLEMENTED/)
  const validation = validateGeneratedRecoverySql('begin;\nrevoke all on table public.example from anon;\ncommit;')
  expect(validation.valid).toBe(true)

  // Incomplete metadata fails closed
  expect(() => generateSafeRecoverySql({ tables: {} })).toThrow(/SCHEMA_EXPORT_INCOMPLETE/)
})

test('unfinished MAP-017 database commands never report success', () => {
  const rehearsalMissing = runNode(rehearsalCli)
  expect(rehearsalMissing.status).toBe(2)
  expect(rehearsalMissing.stdout).toContain('BLOCKED_LOCAL_DATABASE_UNAVAILABLE')

  const rehearsalLocal = runNode(rehearsalCli, ['--target=127.0.0.1:5432'])
  expect(rehearsalLocal.status).toBe(2)
  expect(rehearsalLocal.stderr).toContain('BLOCKED_LOCAL_MIGRATION_EXECUTOR_NOT_IMPLEMENTED')

  const authUnavailable = runNode(authSuiteCli, ['--target=127.0.0.1:1'])
  expect(authUnavailable.status).toBe(2)
  expect(authUnavailable.stdout).toContain('BLOCKED_LOCAL_DATABASE_UNAVAILABLE')

  const exportMissing = runNode(exportCli)
  expect(exportMissing.status).toBe(2)

  const exportLocal = runNode(exportCli, ['--connection-string=postgres://user:pass@localhost:5432/postgres'])
  expect(exportLocal.status).toBe(2)
  expect(exportLocal.stderr).toContain('BLOCKED_SCHEMA_METADATA_EXECUTOR_NOT_IMPLEMENTED')
})
