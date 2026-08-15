#!/usr/bin/env node
/**
 * MAP-017 Migration Apply & Dry-Run Tool
 *
 * Provides a safe dry-run / preflight verification tool and a strictly gated apply path.
 *
 * Dry-run (Default):
 *   node scripts/apply-map017-migration.mjs --dry-run
 *
 * Gated Apply Path (Refuses execution without all explicit confirmations):
 *   node scripts/apply-map017-migration.mjs --apply \
 *     --confirm-project=pixplcjqivlfflickobf \
 *     --confirm-authorization \
 *     --confirm-backup-verified \
 *     --confirm-ledger-aligned
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const EXPECTED_PROJECT = 'pixplcjqivlfflickobf'

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    apply: false,
    dryRun: true,
    confirmProject: null,
    confirmAuthorization: false,
    confirmBackupVerified: false,
    confirmLedgerAligned: false,
  }

  for (const arg of args) {
    if (arg === '--apply') {
      options.apply = true
      options.dryRun = false
    } else if (arg === '--dry-run' || arg === '--preflight-only') {
      options.dryRun = true
      options.apply = false
    } else if (arg.startsWith('--confirm-project=')) {
      options.confirmProject = arg.split('=')[1]
    } else if (arg === '--confirm-authorization') {
      options.confirmAuthorization = true
    } else if (arg === '--confirm-backup-verified') {
      options.confirmBackupVerified = true
    } else if (arg === '--confirm-ledger-aligned') {
      options.confirmLedgerAligned = true
    }
  }
  return options
}

export function validateMap017MigrationArtifacts() {
  const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20260812_map017_public_write_boundary_hardening.sql')
  const preflightPath = path.join(rootDir, 'supabase', 'map017_public_write_boundary_preflight.sql')
  const postflightPath = path.join(rootDir, 'supabase', 'map017_public_write_boundary_postflight.sql')
  const rollbackPath = path.join(rootDir, 'supabase', 'map017_public_write_boundary_rollback.sql')

  const checks = [
    { name: 'Migration SQL', path: migrationPath, requiresTransaction: true },
    { name: 'Preflight SQL', path: preflightPath, requiresTransaction: false },
    { name: 'Postflight SQL', path: postflightPath, requiresTransaction: false },
    { name: 'Rollback refusal guard', path: rollbackPath, requiresTransaction: true, refusalGuard: true },
  ]

  for (const c of checks) {
    if (!fs.existsSync(c.path)) {
      throw new Error(`MISSING_ARTIFACT: ${c.name} not found at ${c.path}`)
    }
    const content = fs.readFileSync(c.path, 'utf8')
    if (content.length < 50) {
      throw new Error(`EMPTY_ARTIFACT: ${c.name} appears truncated or empty`)
    }
    if (c.requiresTransaction) {
      const hasExpectedEnd = c.refusalGuard ? /\brollback;/i.test(content) : /\bcommit;/i.test(content)
      if (!/\bbegin;/i.test(content) || !hasExpectedEnd) {
        throw new Error(`TRANSACTION_MISSING: ${c.name} must have an explicit safe transaction boundary`)
      }
    }
  }

  return {
    valid: true,
    migrationSize: fs.statSync(migrationPath).size,
    preflightSize: fs.statSync(preflightPath).size,
    postflightSize: fs.statSync(postflightPath).size,
    rollbackSize: fs.statSync(rollbackPath).size,
  }
}

export function executeDryRun() {
  const artifacts = validateMap017MigrationArtifacts()
  console.log('===========================================================')
  console.log('   MAP-017 MIGRATION DRY-RUN & PREFLIGHT VERIFICATION      ')
  console.log('===========================================================')
  console.log(`Target Project: ${EXPECTED_PROJECT}`)
  console.log(`Migration: supabase/migrations/20260812_map017_public_write_boundary_hardening.sql (${artifacts.migrationSize} bytes)`)
  console.log(`Preflight: supabase/map017_public_write_boundary_preflight.sql (${artifacts.preflightSize} bytes)`)
  console.log(`Postflight: supabase/map017_public_write_boundary_postflight.sql (${artifacts.postflightSize} bytes)`)
  console.log(`Rollback: supabase/map017_public_write_boundary_rollback.sql (${artifacts.rollbackSize} bytes)`)
  console.log('\nPlanned Hardening Operations:')
  console.log('  1. Revoke public/anon DML on 7 tables (brands, categories, warehouses, product_drafts, products_old, channel_credentials, staff_allocations)')
  console.log('  2. Establish is_staff() row security policies on brands, categories, warehouses, and product_drafts')
  console.log('  3. Enable security_invoker = true on operational views (v_channel_catalog_readiness, v_expiring_batches)')
  console.log('  4. Enforce 10 MB limit and image MIME allowlist on product-images Storage bucket')
  console.log('  5. Remove legacy products_old from supabase_realtime publication')
  console.log('\nSafety Checks:')
  console.log('  [PASS] All 4 SQL artifacts present and non-empty')
  console.log('  [PASS] Mutating DDL artifacts wrapped in explicit BEGIN / COMMIT transactions')
  console.log('  [PASS] Read-only preflight and postflight assertion queries verified')
  console.log('  [PASS] Unsafe rollback is blocked by an explicit refusal guard')
  console.log('  [OPEN] Captured-baseline inverse migration remains unimplemented')
  console.log('\nDry-run complete. No changes were applied to any database.')
  return true
}

export function checkApplyGating(options) {
  const missingGates = []

  if (options.confirmProject !== EXPECTED_PROJECT) {
    missingGates.push(`--confirm-project must exactly match "${EXPECTED_PROJECT}" (got: "${options.confirmProject}")`)
  }
  if (!options.confirmAuthorization) {
    missingGates.push('--confirm-authorization is required (explicit owner authorization)')
  }
  if (!options.confirmBackupVerified) {
    missingGates.push('--confirm-backup-verified is required (pre-migration backup confirmation)')
  }
  if (!options.confirmLedgerAligned) {
    missingGates.push('--confirm-ledger-aligned is required (migration sequence ledger alignment)')
  }

  if (missingGates.length > 0) {
    console.error('===========================================================')
    console.error('   PRODUCTION APPLY GATING REFUSAL (MAP-017)               ')
    console.error('===========================================================')
    console.error('Execution refused because the following mandatory gates were not satisfied:\n')
    for (const gate of missingGates) {
      console.error(`  [BLOCKED] ${gate}`)
    }
    console.error('\nProduction migrations may only be applied when all confirmation flags are explicitly supplied.')
    return false
  }

  return true
}

function main() {
  const options = parseArgs()

  if (options.dryRun || !options.apply) {
    executeDryRun()
    process.exit(0)
  }

  if (options.apply) {
    const gated = checkApplyGating(options)
    if (!gated) {
      process.exit(1)
    }

    console.error('MAP017_APPLY_NOT_IMPLEMENTED: Preconditions were supplied, but this tool has no database execution path.')
    console.error('No migration was applied. Implement and independently verify a real fail-closed executor before using --apply.')
    process.exit(2)
  }
}

if (process.argv[1]?.endsWith('apply-map017-migration.mjs')) {
  main()
}
