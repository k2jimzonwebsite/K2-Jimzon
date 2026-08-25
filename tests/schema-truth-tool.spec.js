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
import {
  buildMap017ApplyContract,
  checkApplyGating,
  executeMap017PermanentApply,
} from '../scripts/apply-map017-migration.mjs'
import { validateLocalTarget, validateMap017RehearsalTarget } from '../scripts/rehearse-local-migration.mjs'
import { authorizationAssertionGroups } from '../scripts/run-local-database-authorization-suite.mjs'
import { portableMap017Config } from '../scripts/rehearse-map017-portable.mjs'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
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
  expect(issueTypes).toContain('FUNCTION_MISSING')
  expect(issueTypes).toContain('MIGRATION_LEDGER_ENTRY_MISSING')
})

test('schema-truth engine checks function definer, fixed search path, anon execute, and view grants', async () => {
  const cleanJson = await readFile(
    new URL('./fixtures/schema-truth-exports/fabricated-clean-sample.json', import.meta.url),
    'utf8',
  )
  const sample = JSON.parse(cleanJson)
  sample.functions['public.set_user_role(uuid,text)'] = {
    securityDefiner: false,
    searchPath: '',
    grants: [{ grantee: 'anon', privilege: 'EXECUTE' }],
  }
  sample.grants.v_channel_catalog_readiness = [{ grantee: 'anon', privilege: 'SELECT' }]

  const result = compareSchemaTruth(parseSchemaExport(sample), buildExpectedRepositorySchema())
  const issueTypes = result.issues.map((issue) => issue.type)

  expect(issueTypes).toContain('FUNCTION_SECURITY_DEFINER_MISMATCH')
  expect(issueTypes).toContain('FUNCTION_SEARCH_PATH_UNSAFE')
  expect(issueTypes).toContain('FUNCTION_ANON_EXECUTE_GRANTED')
  expect(issueTypes).toContain('VIEW_ANON_ACCESS_GRANTED')
})

test('schema-truth grants and policies are schema-qualified and do not collide by table name', async () => {
  const cleanJson = await readFile(
    new URL('./fixtures/schema-truth-exports/fabricated-clean-sample.json', import.meta.url),
    'utf8',
  )
  const sample = JSON.parse(cleanJson)
  sample.grants = [
    ...Object.entries(sample.grants).flatMap(([table_name, grants]) =>
      grants.map((grant) => ({ ...grant, schema_name: 'public', table_name })),
    ),
    { schema_name: 'realtime', table_name: 'messages', grantee: 'anon', privilege: 'INSERT' },
    { schema_name: 'private', table_name: 'brands', grantee: 'anon', privilege: 'DELETE' },
  ]
  sample.policies.push({
    schema_name: 'private', table_name: 'brands', policy_name: 'collision',
    command: 'ALL', roles: ['public'], using_expression: 'true', with_check_expression: 'true',
  })

  const result = compareSchemaTruth(parseSchemaExport(sample), buildExpectedRepositorySchema())
  const publicCollisionFindings = result.issues.filter((issue) =>
    issue.target === 'public.messages' || issue.target.startsWith('public.brands.collision'),
  )
  expect(publicCollisionFindings).toEqual([])
})

test('schema-truth exhaustively audits unlisted exposed relations, functions, schema grants, and defaults', async () => {
  const cleanJson = await readFile(
    new URL('./fixtures/schema-truth-exports/fabricated-clean-sample.json', import.meta.url),
    'utf8',
  )
  const sample = JSON.parse(cleanJson)
  sample.tables['public.debug_dump'] = {
    schema_name: 'public', table_name: 'debug_dump', rls_enabled: false,
  }
  sample.views['public.debug_view'] = {
    schema_name: 'public', view_name: 'debug_view', security_invoker: false,
  }
  sample.functions['public.debug_rpc()'] = {
    schema_name: 'public', signature: 'public.debug_rpc()', security_definer: true,
    search_path_config: '', grants: [
      { grantee: 'public', privilege: 'EXECUTE' },
      { grantee: 'authenticated', privilege: 'EXECUTE' },
    ],
  }
  sample.functions['public.staff_rpc()'] = {
    schema_name: 'public', signature: 'public.staff_rpc()', security_definer: true,
    search_path_config: 'search_path=""',
    grants: [{ grantee: 'authenticated', privilege: 'EXECUTE' }],
  }
  sample.grants.debug_dump = [{ grantee: 'anon', privilege: 'TRUNCATE' }]
  sample.grants.debug_view = [
    { grantee: 'anon', privilege: 'SELECT' },
    { grantee: 'authenticated', privilege: 'UPDATE' },
  ]
  sample.schema_grants = [
    { schema_name: 'public', owner: 'postgres', grantee: 'authenticated', privilege: 'CREATE' },
  ]
  sample.default_privileges = [
    { schema_name: 'public', owner: 'postgres', grantee: 'public', object_type: 'FUNCTION', privilege: 'EXECUTE' },
  ]

  const result = compareSchemaTruth(parseSchemaExport(sample), buildExpectedRepositorySchema())
  const issueTypes = result.issues.map((issue) => issue.type)
  expect(issueTypes).toContain('EXPOSED_TABLE_RLS_DISABLED')
  expect(issueTypes).toContain('ANON_DML_GRANTED')
  expect(issueTypes).toContain('VIEW_CLIENT_DML_GRANTED')
  expect(issueTypes).toContain('VIEW_ANON_ACCESS_UNREVIEWED')
  expect(issueTypes).toContain('FUNCTION_PUBLIC_EXECUTE_GRANTED')
  expect(issueTypes).toContain('FUNCTION_AUTHORIZATION_UNREVIEWED')
  expect(issueTypes).toContain('FUNCTION_SEARCH_PATH_UNSAFE')
  expect(issueTypes).toContain('EXPOSED_SCHEMA_CLIENT_CREATE')
  expect(issueTypes).toContain('UNSAFE_DEFAULT_PRIVILEGE')
  expect(result.summary.exposedTablesAudited).toBe(14)
  expect(result.summary.exposedViewsAudited).toBe(5)
})

test('migration ledger matching tolerates the real CLI shape without hiding a genuine absence', async () => {
  const cleanJson = await readFile(
    new URL('./fixtures/schema-truth-exports/fabricated-clean-sample.json', import.meta.url),
    'utf8',
  )

  // The fixtures store `version` as the literal repository slug, which satisfies
  // the exact-match branch before slug normalization is ever reached. The live
  // Supabase ledger instead stores a 14-digit CLI version plus a separate name,
  // so that shape is reproduced here explicitly. Without this, a regression in
  // the slug matcher would let a genuinely unapplied migration read as applied.
  const applied = JSON.parse(cleanJson)
  applied.migrations = [
    { version: '20260809163606', name: 'operations_hardening_20260809' },
    { version: '20260809164204', name: 'security_boundary_hardening_20260810' },
    { version: '20260809164442', name: 'deprecated_rpc_lockdown_20260810' },
    { version: '20260812104500', name: 'map017_public_write_boundary_hardening' },
  ]
  const appliedTypes = compareSchemaTruth(parseSchemaExport(applied), buildExpectedRepositorySchema())
    .issues.map((issue) => issue.type)
  expect(appliedTypes).not.toContain('MIGRATION_LEDGER_ENTRY_MISSING')

  // True negative: drop one entry and it must still be reported. A matcher that
  // over-normalizes would silently absorb this into a sibling migration.
  const missing = JSON.parse(cleanJson)
  missing.migrations = [
    { version: '20260809163606', name: 'operations_hardening_20260809' },
    { version: '20260809164204', name: 'security_boundary_hardening_20260810' },
    { version: '20260809164442', name: 'deprecated_rpc_lockdown_20260810' },
  ]
  const missingIssues = compareSchemaTruth(parseSchemaExport(missing), buildExpectedRepositorySchema())
    .issues.filter((issue) => issue.type === 'MIGRATION_LEDGER_ENTRY_MISSING')
  expect(missingIssues).toHaveLength(1)
  expect(missingIssues[0].target).toBe('20260812_map017_public_write_boundary_hardening')

  // Similar-but-different slugs must not collide. `admin_lots_bff_boundary` must
  // never satisfy an expectation for `admin_coupons_bff_boundary`.
  const decoy = JSON.parse(cleanJson)
  decoy.migrations = [{ version: '20260812110000', name: 'admin_lots_bff_boundary' }]
  const decoyTargets = compareSchemaTruth(parseSchemaExport(decoy), buildExpectedRepositorySchema())
    .issues.filter((issue) => issue.type === 'MIGRATION_LEDGER_ENTRY_MISSING')
    .map((issue) => issue.target)
  expect(decoyTargets).toHaveLength(buildExpectedRepositorySchema().expectedMigrations.length)

  // Matching must be exact-after-normalization, never substring. A ledger entry
  // whose slug merely CONTAINS an expected slug is a different migration, and
  // accepting it would report an unapplied security migration as applied — the
  // worst possible failure mode for this tool.
  const superset = JSON.parse(cleanJson)
  superset.migrations = [
    { version: '20260812104500', name: 'map017_public_write_boundary_hardening_rollback_only' },
  ]
  const supersetTargets = compareSchemaTruth(parseSchemaExport(superset), buildExpectedRepositorySchema())
    .issues.filter((issue) => issue.type === 'MIGRATION_LEDGER_ENTRY_MISSING')
    .map((issue) => issue.target)
  expect(supersetTargets).toContain('20260812_map017_public_write_boundary_hardening')

  // And the reverse: a truncated ledger slug must not satisfy a longer expectation.
  const truncated = JSON.parse(cleanJson)
  truncated.migrations = [{ version: '20260812104500', name: 'map017_public_write' }]
  const truncatedTargets = compareSchemaTruth(parseSchemaExport(truncated), buildExpectedRepositorySchema())
    .issues.filter((issue) => issue.type === 'MIGRATION_LEDGER_ENTRY_MISSING')
    .map((issue) => issue.target)
  expect(truncatedTargets).toContain('20260812_map017_public_write_boundary_hardening')
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
  expect(jsonReport.summary.functionsChecked).toBe(5)
  expect(jsonReport.summary.migrationsChecked).toBe(4)
})

test('schema-truth CLI refuses to audit when no explicit export or fixture is supplied', () => {
  const result = runNode(auditCli)
  expect(result.status).toBe(2)
  expect(result.stderr).toContain('SCHEMA_EXPORT_REQUIRED')
  expect(result.stdout).not.toContain('CONFORMANT')
})

// Restored 25 August 2026 from the Codex worktree, where this safeguard and its
// tests were written and then lost from main. The audit CLI must never let a
// fabricated-fixture run read as evidence about the live database.
test('schema-truth CLI labels fabricated fixtures as parser checks rather than database evidence', () => {
  const result = runNode(auditCli, ['--fixture=fabricated-clean-sample'])
  expect(result.status).toBe(0)
  expect(result.stdout).toContain('FABRICATED_FIXTURE_PARSER_CHECK_ONLY')
  expect(result.stdout).toContain('not database drift or authorization evidence')
  expect(result.stdout).toContain('[Schema Truth Source: fixture: fabricated-clean-sample]')
})

test('schema-truth CLI persists fixture evidence labels in Markdown and JSON output artifacts', async () => {
  const tempDirectory = await mkdtemp(path.join(tmpdir(), 'k2-schema-truth-'))
  const markdownPath = path.join(tempDirectory, 'fixture-report.md')
  const jsonPath = path.join(tempDirectory, 'fixture-report.json')

  try {
    const markdownResult = runNode(auditCli, [
      '--fixture=fabricated-clean-sample',
      `--output=${markdownPath}`,
    ])
    expect(markdownResult.status).toBe(0)
    const markdownReport = await readFile(markdownPath, 'utf8')
    expect(markdownReport).toContain('FABRICATED_FIXTURE_PARSER_CHECK_ONLY')
    expect(markdownReport).toContain('not database drift or authorization evidence')
    expect(markdownReport).toContain('[Schema Truth Source: fixture: fabricated-clean-sample]')

    const jsonResult = runNode(auditCli, [
      '--fixture=fabricated-clean-sample',
      '--json',
      `--output=${jsonPath}`,
    ])
    expect(jsonResult.status).toBe(0)
    const jsonReport = JSON.parse(await readFile(jsonPath, 'utf8'))
    expect(jsonReport.evidenceLevel).toBe('FABRICATED_FIXTURE_PARSER_CHECK_ONLY')
    expect(jsonReport.evidenceDisclaimer).toContain('not database drift or authorization evidence')
    expect(jsonReport.source).toBe('fixture: fabricated-clean-sample')
  } finally {
    await rm(tempDirectory, { recursive: true, force: true })
  }
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

test('MAP-017 apply command fails truthfully without recorded owner authorization and exact evidence gates', () => {
  // Test missing gates
  const missingResult = runNode(applyCli, ['--apply'])
  expect(missingResult.status).toBe(1)
  expect(missingResult.stderr).toContain('PRODUCTION APPLY GATING REFUSAL')

  // Legacy boolean confirmations are intentionally insufficient.
  const fullResult = runNode(applyCli, [
    '--apply',
    '--confirm-project=pixplcjqivlfflickobf',
    '--confirm-authorization',
    '--confirm-backup-verified',
    '--confirm-ledger-aligned',
  ])
  expect(fullResult.status).toBe(1)
  expect(fullResult.stderr).toContain('OWNER-005')
  expect(fullResult.stderr).toContain('--confirm-artifact-sha256')
})

test('MAP-017 permanent apply contract is payload-bound, ledgered, and independently verified', async () => {
  const [preflight, migration, postflight] = await Promise.all([
    readFile(new URL('../supabase/map017_public_write_boundary_preflight.sql', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20260812_map017_public_write_boundary_hardening.sql', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/map017_public_write_boundary_postflight.sql', import.meta.url), 'utf8'),
  ])
  const contract = buildMap017ApplyContract({ preflight, migration, postflight })
  expect(contract.artifactSha256).toMatch(/^[A-F0-9]{64}$/)
  expect(contract.applySql).toContain('begin;')
  expect(contract.applySql).toContain('supabase_migrations.schema_migrations')
  expect(contract.applySql).toContain(contract.artifactSha256)
  expect(contract.applySql).toContain('commit;')
  expect(contract.verificationSql).toContain('phase1_ledger_receipt')

  const ownerDecisionText = [
    '## OWNER-005 — Authorize the public-write-boundary production migration',
    '**Decision:** Authorized',
    '**Backup evidence ID:** production-backup-evidence-20260824',
    '**Backup/restore verification:** Verified',
  ].join('\n')
  const options = {
    apply: true,
    confirmProject: 'pixplcjqivlfflickobf',
    confirmAuthorization: 'OWNER-005',
    confirmArtifactSha256: contract.artifactSha256,
    backupEvidence: 'production-backup-evidence-20260824',
    confirmLedgerVersion: contract.ledgerVersion,
    confirmLiveFindings: 55,
    confirmRollForwardRecovery: true,
  }
  expect(checkApplyGating(options, contract, ownerDecisionText)).toEqual([])
  expect(checkApplyGating(options, contract, [
    '## OWNER-005',
    '**Decision:** Authorized',
  ].join('\n'))).toContain('OWNER-005 backup evidence must exactly match and be Verified')

  const calls = []
  const verification = Object.fromEntries(contract.verificationKeys.map((key) => [key, true]))
  const fetchImpl = async (_url, init) => {
    calls.push(JSON.parse(init.body))
    return calls.length === 1
      ? { status: 201, json: async () => [{ result: 'applied' }] }
      : { status: 201, json: async () => [{ verification }] }
  }
  const result = await executeMap017PermanentApply({
    options,
    contract,
    ownerDecisionText,
    accessToken: 'access-token-fixture',
    fetchImpl,
  })
  expect(result.status).toBe('APPLIED_AND_VERIFIED')
  expect(calls).toHaveLength(2)
  expect(calls[0].read_only).toBe(false)
  expect(calls[0].query).toBe(contract.applySql)
  expect(calls[1].read_only).toBe(true)
  expect(calls[1].query).toBe(contract.verificationSql)
})

test('MAP-017 permanent apply refuses an ambiguous outcome without an exact durable receipt', async () => {
  const [preflight, migration, postflight] = await Promise.all([
    readFile(new URL('../supabase/map017_public_write_boundary_preflight.sql', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20260812_map017_public_write_boundary_hardening.sql', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/map017_public_write_boundary_postflight.sql', import.meta.url), 'utf8'),
  ])
  const contract = buildMap017ApplyContract({ preflight, migration, postflight })
  const ownerDecisionText = [
    '## OWNER-005',
    '**Decision:** Authorized',
    '**Backup evidence ID:** production-backup-evidence-20260824',
    '**Backup/restore verification:** Verified',
  ].join('\n')
  const options = {
    apply: true,
    confirmProject: 'pixplcjqivlfflickobf',
    confirmAuthorization: 'OWNER-005',
    confirmArtifactSha256: contract.artifactSha256,
    backupEvidence: 'production-backup-evidence-20260824',
    confirmLedgerVersion: contract.ledgerVersion,
    confirmLiveFindings: 55,
    confirmRollForwardRecovery: true,
  }
  let call = 0
  const fetchImpl = async () => {
    call += 1
    if (call === 1) throw new Error('simulated connection loss')
    const verification = Object.fromEntries(contract.verificationKeys.map((key) => [key, false]))
    return { status: 201, json: async () => [{ verification }] }
  }
  await expect(executeMap017PermanentApply({
    options,
    contract,
    ownerDecisionText,
    accessToken: 'access-token-fixture',
    fetchImpl,
  })).rejects.toThrow('APPLY_OUTCOME_AMBIGUOUS')
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
  expect(validateMap017RehearsalTarget('postgres://postgres@127.0.0.1:5432/postgres').isLocal).toBe(false)
  expect(validateMap017RehearsalTarget('postgres://postgres@127.0.0.1:5432/postgres').reason).toBe('REHEARSAL_DATABASE_NAME_REQUIRED')
  expect(validateMap017RehearsalTarget('postgres://postgres@127.0.0.1:5432/k2_map017_rehearsal_test').isLocal).toBe(true)
})

test('portable MAP-017 rehearsal is pinned to the workspace runtime and isolated loopback database', () => {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const config = portableMap017Config(root)

  expect(config.binDir).toBe(fileURLToPath(new URL('../.tools/postgresql-17.11/runtime/pgsql/bin', import.meta.url)))
  expect(config.dataDir).toBe(fileURLToPath(new URL('../.tools/map017-pg-data', import.meta.url)))
  expect(config.port).toBe(55432)
  expect(config.database).toBe('k2_map017_rehearsal_local')
  expect(config.target).toBe('postgresql://postgres@127.0.0.1:55432/k2_map017_rehearsal_local')
  expect(validateMap017RehearsalTarget(config.target).isLocal).toBe(true)
})

test('MAP-017 behavioral coverage is machine-counted and rejects an invalid manifest', async () => {
  const sql = await readFile(
    new URL('../supabase/tests/map017_authorization_assertions.sql', import.meta.url),
    'utf8',
  )
  const groups = authorizationAssertionGroups(sql)
  expect(groups).toHaveLength(12)
  expect(new Set(groups).size).toBe(groups.length)
  expect(groups).toContain('storage_write_denial')
  expect(groups).toContain('realtime_legacy_exclusion')
  expect(groups).toContain('future_object_default_denial')
  expect(() => authorizationAssertionGroups('select 1;')).toThrow('AUTHORIZATION_ASSERTION_MANIFEST_INVALID')
  expect(() => authorizationAssertionGroups([
    '-- K2_ASSERTION_GROUP: duplicate',
    '-- K2_ASSERTION_GROUP: duplicate',
  ].join('\n'))).toThrow('AUTHORIZATION_ASSERTION_MANIFEST_INVALID')
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

test('MAP-017 database commands fail closed without a permitted executable target', () => {
  const rehearsalMissing = runNode(rehearsalCli)
  expect(rehearsalMissing.status).toBe(2)
  expect(rehearsalMissing.stderr).toContain('BLOCKED_LOCAL_DATABASE_UNAVAILABLE')

  const rehearsalLocal = runNode(rehearsalCli, ['--target=postgres://postgres@127.0.0.1:5432/postgres'])
  expect(rehearsalLocal.status).toBe(2)
  expect(rehearsalLocal.stderr).toContain('REHEARSAL_DATABASE_NAME_REQUIRED')

  const authUnavailable = runNode(authSuiteCli, ['--target=postgres://postgres@127.0.0.1:1/k2_map017_rehearsal_test'])
  expect(authUnavailable.status).toBe(2)
  expect(authUnavailable.stdout).toContain('BLOCKED_LOCAL_DATABASE_UNAVAILABLE')

  const exportMissing = runNode(exportCli)
  expect(exportMissing.status).toBe(2)

  const exportLocal = runNode(exportCli, ['--connection-string=postgres://user:pass@localhost:5432/postgres'])
  expect(exportLocal.status).toBe(2)
  expect(exportLocal.stderr).toContain('BLOCKED_SCHEMA_METADATA_EXECUTOR_NOT_IMPLEMENTED')
})
