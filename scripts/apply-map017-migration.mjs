#!/usr/bin/env node
/**
 * MAP-017 production migration dry-run and owner-gated executor.
 *
 * The apply path is deliberately unusable until OWNER-005 is recorded as
 * Authorized in OWNER_QUESTIONS.md and every payload/evidence gate is supplied.
 * It never retries a write. An ambiguous provider response is resolved only by
 * reading the atomic migration receipt and post-commit invariants.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const EXPECTED_PROJECT = 'pixplcjqivlfflickobf'
const EXPECTED_OWNER_ITEM = 'OWNER-005'
const EXPECTED_LIVE_FINDINGS = 55
const LEDGER_VERSION = '20260824143000'
const MIGRATION_NAME = 'map017_public_write_boundary_hardening'
const OWNER_QUESTIONS_PATH = path.join(rootDir, 'K2 Jimzon - Brain', 'OWNER_QUESTIONS.md')
const ENV_PATH = path.join(rootDir, '.env.local')

const artifactPaths = {
  migration: path.join(rootDir, 'supabase', 'migrations', '20260812_map017_public_write_boundary_hardening.sql'),
  preflight: path.join(rootDir, 'supabase', 'map017_public_write_boundary_preflight.sql'),
  postflight: path.join(rootDir, 'supabase', 'map017_public_write_boundary_postflight.sql'),
  rollback: path.join(rootDir, 'supabase', 'map017_public_write_boundary_rollback.sql'),
}

const VERIFICATION_KEYS = [
  'phase1_ledger_receipt',
  'anonymous_table_dml_removed',
  'products_old_browser_access_removed',
  'operational_views_private',
  'public_stock_projection_available',
  'private_lot_rows_not_anonymous',
  'staff_policies_scoped',
  'public_storage_writes_removed',
  'product_image_limits_enforced',
  'products_old_realtime_removed',
  'postgres_defaults_hardened',
]

function parseArgs(args = process.argv.slice(2)) {
  const options = {
    apply: false,
    dryRun: true,
    confirmProject: null,
    confirmAuthorization: null,
    confirmArtifactSha256: null,
    backupEvidence: null,
    confirmLedgerVersion: null,
    confirmLiveFindings: null,
    confirmRollForwardRecovery: false,
  }

  for (const arg of args) {
    if (arg === '--apply') {
      options.apply = true
      options.dryRun = false
    } else if (arg === '--dry-run' || arg === '--preflight-only') {
      options.apply = false
      options.dryRun = true
    } else if (arg.startsWith('--confirm-project=')) {
      options.confirmProject = arg.slice('--confirm-project='.length)
    } else if (arg.startsWith('--confirm-authorization=')) {
      options.confirmAuthorization = arg.slice('--confirm-authorization='.length)
    } else if (arg === '--confirm-authorization') {
      options.confirmAuthorization = 'boolean-only'
    } else if (arg.startsWith('--confirm-artifact-sha256=')) {
      options.confirmArtifactSha256 = arg.slice('--confirm-artifact-sha256='.length).toUpperCase()
    } else if (arg.startsWith('--backup-evidence=')) {
      options.backupEvidence = arg.slice('--backup-evidence='.length)
    } else if (arg === '--confirm-backup-verified') {
      options.backupEvidence = 'boolean-only'
    } else if (arg.startsWith('--confirm-ledger-version=')) {
      options.confirmLedgerVersion = arg.slice('--confirm-ledger-version='.length)
    } else if (arg === '--confirm-ledger-aligned') {
      options.confirmLedgerVersion = 'boolean-only'
    } else if (arg.startsWith('--confirm-live-findings=')) {
      options.confirmLiveFindings = Number(arg.slice('--confirm-live-findings='.length))
    } else if (arg === '--confirm-roll-forward-recovery') {
      options.confirmRollForwardRecovery = true
    }
  }
  return options
}

function migrationBody(sql) {
  const normalized = String(sql).replace(/^(?:\s*--[^\n]*(?:\r?\n|$))+/, '').trim()
  const markers = normalized.match(/\b(begin|commit)\s*;/gi) ?? []
  if (markers.length !== 2 || !/^begin\s*;/i.test(normalized) || !/commit\s*;\s*$/i.test(normalized)) {
    throw new Error('MIGRATION_TRANSACTION_SHAPE_INVALID')
  }
  return normalized.replace(/^begin\s*;/i, '').replace(/commit\s*;\s*$/i, '').trim()
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function owner005Section(ownerDecisionText) {
  return /## OWNER-005\b([\s\S]*?)(?=\n## OWNER-|$)/i.exec(String(ownerDecisionText))?.[1] ?? ''
}

function owner005Authorized(ownerDecisionText) {
  return /\*\*Decision:\*\*\s*Authorized\b/i.test(owner005Section(ownerDecisionText))
}

function owner005BackupVerified(ownerDecisionText, backupEvidence) {
  const section = owner005Section(ownerDecisionText)
  const evidence = /\*\*Backup evidence ID:\*\*\s*([^\r\n]+)/i.exec(section)?.[1]?.trim()
  const verified = /\*\*Backup\/restore verification:\*\*\s*Verified\b/i.test(section)
  return verified && evidence === backupEvidence
}

function owner005RecoveryAccessVerified(ownerDecisionText) {
  return /\*\*Owner recovery access:\*\*\s*Verified\b/i.test(owner005Section(ownerDecisionText))
}

function parseEnvFile(filePath = ENV_PATH) {
  if (!fs.existsSync(filePath)) return {}
  const values = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim())
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return values
}

export function validateMap017MigrationArtifacts() {
  const checks = [
    { name: 'Migration SQL', path: artifactPaths.migration, requiresTransaction: true },
    { name: 'Preflight SQL', path: artifactPaths.preflight },
    { name: 'Postflight SQL', path: artifactPaths.postflight },
    { name: 'Rollback refusal guard', path: artifactPaths.rollback, requiresTransaction: true, refusalGuard: true },
  ]
  const contents = {}

  for (const check of checks) {
    if (!fs.existsSync(check.path)) throw new Error(`MISSING_ARTIFACT: ${check.name} not found at ${check.path}`)
    const content = fs.readFileSync(check.path, 'utf8')
    if (content.length < 50) throw new Error(`EMPTY_ARTIFACT: ${check.name} appears truncated or empty`)
    if (check.requiresTransaction) {
      const expectedEnd = check.refusalGuard ? /\brollback;/i : /\bcommit;/i
      if (!/\bbegin;/i.test(content) || !expectedEnd.test(content)) {
        throw new Error(`TRANSACTION_MISSING: ${check.name} must have an explicit safe transaction boundary`)
      }
    }
    contents[path.basename(check.path)] = content
  }

  return {
    valid: true,
    contents,
    migrationSize: fs.statSync(artifactPaths.migration).size,
    preflightSize: fs.statSync(artifactPaths.preflight).size,
    postflightSize: fs.statSync(artifactPaths.postflight).size,
    rollbackSize: fs.statSync(artifactPaths.rollback).size,
  }
}

export function buildMap017ApplyContract({ preflight, migration, postflight }) {
  const normalized = {
    preflight: String(preflight).trim(),
    migration: String(migration).trim(),
    postflight: String(postflight).trim(),
  }
  const artifactSha256 = crypto.createHash('sha256')
    .update(normalized.preflight).update('\0')
    .update(normalized.migration).update('\0')
    .update(normalized.postflight)
    .digest('hex').toUpperCase()
  const idempotencyKey = `sha256:${artifactSha256}`
  const ledgerInsert = `
do $map017_ledger$
begin
  if exists (
    select 1 from supabase_migrations.schema_migrations
    where version = ${sqlLiteral(LEDGER_VERSION)}
      and name = ${sqlLiteral(MIGRATION_NAME)}
      and idempotency_key = ${sqlLiteral(idempotencyKey)}
  ) then
    null;
  elsif exists (
    select 1 from supabase_migrations.schema_migrations
    where version = ${sqlLiteral(LEDGER_VERSION)} or name = ${sqlLiteral(MIGRATION_NAME)}
  ) then
    raise exception 'MAP-017 ledger identity conflicts with a different payload';
  else
    insert into supabase_migrations.schema_migrations(
      version, name, statements, created_by, idempotency_key
    ) values (
      ${sqlLiteral(LEDGER_VERSION)},
      ${sqlLiteral(MIGRATION_NAME)},
      array[
        ${sqlLiteral(normalized.preflight)},
        ${sqlLiteral(normalized.migration)},
        ${sqlLiteral(normalized.postflight)}
      ]::text[],
      'owner-authorized-map017-apply',
      ${sqlLiteral(idempotencyKey)}
    );
  end if;
end
$map017_ledger$;`.trim()

  const applySql = [
    'begin;',
    normalized.preflight,
    migrationBody(normalized.migration),
    normalized.postflight,
    'set local role anon;',
    'select count(*) from public.v_product_stock_from_batches;',
    'reset role;',
    ledgerInsert,
    'commit;',
  ].join('\n\n')

  const verificationSql = `
select jsonb_build_object(
  'phase1_ledger_receipt', exists (
    select 1 from supabase_migrations.schema_migrations
    where version = ${sqlLiteral(LEDGER_VERSION)}
      and name = ${sqlLiteral(MIGRATION_NAME)}
      and idempotency_key = ${sqlLiteral(idempotencyKey)}
  ),
  'anonymous_table_dml_removed', not exists (
    select 1 from unnest(array[
      'brands','categories','warehouses','product_drafts','products_old',
      'channel_credentials','staff_allocations'
    ]) relation_name
    where has_table_privilege('anon', format('public.%I', relation_name), 'insert')
       or has_table_privilege('anon', format('public.%I', relation_name), 'update')
       or has_table_privilege('anon', format('public.%I', relation_name), 'delete')
  ),
  'products_old_browser_access_removed',
    not has_table_privilege('anon', 'public.products_old', 'select')
    and not has_table_privilege('authenticated', 'public.products_old', 'select'),
  'operational_views_private',
    not has_table_privilege('anon', 'public.v_channel_catalog_readiness', 'select')
    and not has_table_privilege('anon', 'public.v_expiring_batches', 'select'),
  'public_stock_projection_available',
    has_table_privilege('anon', 'public.v_product_stock_from_batches', 'select')
    and has_function_privilege('anon', 'public.get_public_product_stock()', 'execute'),
  'private_lot_rows_not_anonymous',
    not has_table_privilege('anon', 'public.product_batches', 'select'),
  'staff_policies_scoped', exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'product_drafts' and policyname = 'product_drafts_staff_manage'
      and qual like '%is_staff%' and with_check like '%is_staff%'
  ),
  'public_storage_writes_removed', not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
      and policyname in ('Anyone can upload','Anyone can update','Anyone can delete')
  ),
  'product_image_limits_enforced', exists (
    select 1 from storage.buckets where id = 'product-images'
      and file_size_limit = 10485760
      and allowed_mime_types @> array['image/jpeg','image/png','image/webp','image/avif']::text[]
  ),
  'products_old_realtime_removed', not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'products_old'
  ),
  'postgres_defaults_hardened', not exists (
    select 1 from pg_default_acl d
    join pg_roles owner_role on owner_role.oid = d.defaclrole
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) a
    left join pg_roles grantee_role on grantee_role.oid = a.grantee
    where n.nspname = 'public' and owner_role.rolname = 'postgres'
      and coalesce(grantee_role.rolname, 'public') in ('public','anon','authenticated')
      and ((d.defaclobjtype = 'f' and a.privilege_type = 'EXECUTE') or d.defaclobjtype in ('r','S'))
  )
) as verification;`.trim()

  return {
    artifactSha256,
    applySql,
    verificationSql,
    verificationKeys: [...VERIFICATION_KEYS],
    ledgerVersion: LEDGER_VERSION,
    migrationName: MIGRATION_NAME,
    idempotencyKey,
  }
}

export function checkApplyGating(options, contract, ownerDecisionText) {
  const missing = []
  if (options.confirmProject !== EXPECTED_PROJECT) missing.push(`--confirm-project=${EXPECTED_PROJECT}`)
  if (options.confirmAuthorization !== EXPECTED_OWNER_ITEM) missing.push(`--confirm-authorization=${EXPECTED_OWNER_ITEM}`)
  if (!owner005Authorized(ownerDecisionText)) missing.push('OWNER-005 must contain **Decision:** Authorized')
  if (options.confirmArtifactSha256 !== contract.artifactSha256) {
    missing.push(`--confirm-artifact-sha256=${contract.artifactSha256}`)
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(options.backupEvidence ?? '')) {
    missing.push('--backup-evidence=<durable-evidence-id>')
  }
  if (!owner005BackupVerified(ownerDecisionText, options.backupEvidence)) {
    missing.push('OWNER-005 backup evidence must exactly match and be Verified')
  }
  if (!owner005RecoveryAccessVerified(ownerDecisionText)) {
    missing.push('OWNER-005 owner recovery access must be Verified')
  }
  if (options.confirmLedgerVersion !== contract.ledgerVersion) {
    missing.push(`--confirm-ledger-version=${contract.ledgerVersion}`)
  }
  if (options.confirmLiveFindings !== EXPECTED_LIVE_FINDINGS) {
    missing.push(`--confirm-live-findings=${EXPECTED_LIVE_FINDINGS}`)
  }
  if (!options.confirmRollForwardRecovery) missing.push('--confirm-roll-forward-recovery')
  return missing
}

function safeProviderMessage(body) {
  const raw = typeof body?.message === 'string' ? body.message : 'Provider query failed'
  return raw.replace(/(?:eyJ|sb_(?:secret|publishable)_)[A-Za-z0-9._-]+/g, '[REDACTED]').slice(0, 500)
}

async function providerQuery({ endpoint, accessToken, sql, readOnly, fetchImpl }) {
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, read_only: readOnly }),
  })
  const body = await response.json().catch(() => null)
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`HTTP ${response.status}: ${safeProviderMessage(body)}`)
  }
  return body
}

function readVerification(body, keys) {
  const row = Array.isArray(body) ? body[0] : body
  const verification = row?.verification ?? row?.jsonb_build_object ?? row
  const failed = keys.filter((key) => verification?.[key] !== true)
  return { verification, failed }
}

export async function executeMap017PermanentApply({
  options,
  contract,
  ownerDecisionText,
  accessToken,
  fetchImpl = fetch,
}) {
  const missing = checkApplyGating(options, contract, ownerDecisionText)
  if (missing.length > 0) throw new Error(`PRODUCTION_APPLY_GATING_REFUSAL: ${missing.join('; ')}`)
  if (!accessToken) throw new Error('SUPABASE_ACCESS_TOKEN_MISSING')

  const endpoint = `https://api.supabase.com/v1/projects/${EXPECTED_PROJECT}/database/query`
  let applyError = null
  try {
    await providerQuery({ endpoint, accessToken, sql: contract.applySql, readOnly: false, fetchImpl })
  } catch (error) {
    applyError = error
  }

  let verificationBody
  try {
    verificationBody = await providerQuery({
      endpoint,
      accessToken,
      sql: contract.verificationSql,
      readOnly: true,
      fetchImpl,
    })
  } catch (error) {
    throw new Error(`APPLY_OUTCOME_AMBIGUOUS: ${applyError?.message ?? 'apply response succeeded'}; verification unavailable: ${error.message}`)
  }
  const { failed } = readVerification(verificationBody, contract.verificationKeys)
  if (failed.length > 0) {
    const prefix = applyError ? 'APPLY_OUTCOME_AMBIGUOUS' : 'POST_COMMIT_VERIFICATION_FAILED'
    throw new Error(`${prefix}: ${failed.join(', ')}`)
  }

  return {
    status: applyError ? 'APPLIED_AND_VERIFIED_AFTER_AMBIGUOUS_RESPONSE' : 'APPLIED_AND_VERIFIED',
    artifactSha256: contract.artifactSha256,
    ledgerVersion: contract.ledgerVersion,
  }
}

export function loadMap017ApplyContract() {
  const artifacts = validateMap017MigrationArtifacts()
  return {
    artifacts,
    contract: buildMap017ApplyContract({
      preflight: artifacts.contents[path.basename(artifactPaths.preflight)],
      migration: artifacts.contents[path.basename(artifactPaths.migration)],
      postflight: artifacts.contents[path.basename(artifactPaths.postflight)],
    }),
  }
}

export function executeDryRun() {
  const { artifacts, contract } = loadMap017ApplyContract()
  const ownerDecisionText = fs.readFileSync(OWNER_QUESTIONS_PATH, 'utf8')
  const ownerAuthorized = owner005Authorized(ownerDecisionText)
  const recordedBackupEvidence = /\*\*Backup evidence ID:\*\*\s*([^\r\n]+)/i
    .exec(owner005Section(ownerDecisionText))?.[1]?.trim()
  const backupVerified = Boolean(
    recordedBackupEvidence
    && !/^pending$/i.test(recordedBackupEvidence)
    && owner005BackupVerified(ownerDecisionText, recordedBackupEvidence),
  )
  const recoveryAccessVerified = owner005RecoveryAccessVerified(ownerDecisionText)
  console.log('===========================================================')
  console.log('   MAP-017 MIGRATION DRY-RUN & PREFLIGHT VERIFICATION      ')
  console.log('===========================================================')
  console.log(`Target Project: ${EXPECTED_PROJECT}`)
  console.log(`Migration: supabase/migrations/20260812_map017_public_write_boundary_hardening.sql (${artifacts.migrationSize} bytes)`)
  console.log(`Preflight: supabase/map017_public_write_boundary_preflight.sql (${artifacts.preflightSize} bytes)`)
  console.log(`Postflight: supabase/map017_public_write_boundary_postflight.sql (${artifacts.postflightSize} bytes)`)
  console.log(`Rollback: supabase/map017_public_write_boundary_rollback.sql (${artifacts.rollbackSize} bytes)`)
  console.log(`Artifact SHA-256: ${contract.artifactSha256}`)
  console.log(`Planned ledger version: ${contract.ledgerVersion}`)
  console.log(`OWNER-005 recorded authorization: ${ownerAuthorized ? 'YES' : 'NO'}`)
  console.log('\nPlanned Hardening Operations:')
  console.log('  1. Revoke unsafe postgres-owned future-object defaults')
  console.log('  2. Revoke anonymous/browser access to seven catalog and legacy tables')
  console.log('  3. Replace blanket policies with staff-scoped policies')
  console.log('  4. Remove anonymous operational-view access and restore minimal public stock')
  console.log('  5. Remove public Storage writes and enforce image limits')
  console.log('  6. Remove products_old from Realtime')
  console.log('  7. Write an atomic payload-bound migration ledger receipt')
  console.log('\nSafety Checks:')
  console.log('  [PASS] SQL artifacts and transaction shape validated')
  console.log('  [PASS] Apply payload bound to SHA-256 and fixed ledger identity')
  console.log('  [PASS] Independent post-commit verification and ambiguous-outcome recovery prepared')
  console.log(ownerAuthorized
    ? '  [PASS] OWNER-005 is authorized'
    : '  [OPEN] OWNER-005 remains unauthorized; no apply was attempted')
  console.log(backupVerified
    ? '  [PASS] Named production database, Storage, and off-site backup evidence is verified'
    : recordedBackupEvidence && !/^pending$/i.test(recordedBackupEvidence)
      ? '  [OPEN] Named production backup evidence is not fully verified; no apply was attempted'
      : '  [OPEN] Named production backup evidence and restore verification remain pending; no apply was attempted')
  console.log(recoveryAccessVerified
    ? '  [PASS] Owner recovery access is verified'
    : '  [OPEN] Owner recovery access remains unverified; no apply was attempted')
  console.log('  [OPEN] Post-commit recovery remains reviewed roll-forward, not insecure baseline restoration')
  console.log('\nDry-run complete. No changes were applied to any database.')
  return true
}

async function main() {
  const options = parseArgs()
  if (options.dryRun || !options.apply) {
    executeDryRun()
    return
  }

  const { contract } = loadMap017ApplyContract()
  const ownerDecisionText = fs.readFileSync(OWNER_QUESTIONS_PATH, 'utf8')
  const missing = checkApplyGating(options, contract, ownerDecisionText)
  if (missing.length > 0) {
    console.error('===========================================================')
    console.error('   PRODUCTION APPLY GATING REFUSAL (MAP-017)               ')
    console.error('===========================================================')
    for (const gate of missing) console.error(`  [BLOCKED] ${gate}`)
    process.exit(1)
  }

  const accessToken = parseEnvFile().SUPABASE_ACCESS_TOKEN
  try {
    const result = await executeMap017PermanentApply({
      options,
      contract,
      ownerDecisionText,
      accessToken,
    })
    console.log(`${result.status}: ledger ${result.ledgerVersion}, SHA-256 ${result.artifactSha256}`)
  } catch (error) {
    console.error(error.message)
    process.exit(2)
  }
}

if (process.argv[1]?.endsWith('apply-map017-migration.mjs')) await main()
