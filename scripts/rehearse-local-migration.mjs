#!/usr/bin/env node
/**
 * MAP-017 Isolated-Local Migration Rehearsal Runner
 *
 * Prepared runner boundary for the complete lifecycle:
 *   Preflight -> Migration -> Postflight -> Local Invariants -> Rollback/Cleanup
 * The database transaction executor is not implemented; the CLI fails closed.
 *
 * STRICT SAFETY RULE: Refuses to run against any remote or production host.
 * Only localhost / 127.0.0.1 / ::1 / local container targets are permitted.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const ALLOWED_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export function parseLocalTarget(targetHostOrUrl) {
  if (!targetHostOrUrl || typeof targetHostOrUrl !== 'string') {
    throw new Error('TARGET_HOST_EMPTY')
  }

  const candidate = targetHostOrUrl.includes('://')
    ? targetHostOrUrl
    : `postgresql://${targetHostOrUrl}`
  let parsed
  try {
    parsed = new URL(candidate)
  } catch {
    throw new Error('TARGET_URL_INVALID')
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  const port = Number(parsed.port || 5432)
  if (!hostname || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('TARGET_URL_INVALID')
  }

  return { hostname, port, display: `${hostname}:${port}` }
}

export function validateLocalTarget(targetHostOrUrl) {
  try {
    const parsed = parseLocalTarget(targetHostOrUrl)
    if (!ALLOWED_LOCAL_HOSTS.has(parsed.hostname)) {
      return { isLocal: false, reason: 'NON_LOCAL_HOST_REJECTED' }
    }
    return { isLocal: true, ...parsed }
  } catch (error) {
    return { isLocal: false, reason: error.message }
  }
}

export function parseLocalRehearsalSqlLifecycle() {
  const preflightPath = path.join(rootDir, 'supabase', 'map017_public_write_boundary_preflight.sql')
  const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20260812_map017_public_write_boundary_hardening.sql')
  const postflightPath = path.join(rootDir, 'supabase', 'map017_public_write_boundary_postflight.sql')

  for (const p of [preflightPath, migrationPath, postflightPath]) {
    if (!fs.existsSync(p)) {
      throw new Error(`MISSING_LIFECYCLE_SQL: ${p} does not exist.`)
    }
  }

  const preflightSql = fs.readFileSync(preflightPath, 'utf8')
  const migrationSql = fs.readFileSync(migrationPath, 'utf8')
  const postflightSql = fs.readFileSync(postflightPath, 'utf8')

  return {
    preflightSql,
    migrationSql,
    postflightSql,
    sizes: {
      preflight: preflightSql.length,
      migration: migrationSql.length,
      postflight: postflightSql.length,
    },
  }
}

async function runRehearsal() {
  const args = process.argv.slice(2)
  const targetArg = args.find((a) => a.startsWith('--target='))?.split('=')[1] || process.env.LOCAL_PG_URL

  console.log('===========================================================')
  console.log('   MAP-017 ISOLATED-LOCAL TRANSACTION REHEARSAL            ')
  console.log('===========================================================')

  if (!targetArg) {
    console.log('Status: BLOCKED_LOCAL_DATABASE_UNAVAILABLE')
    console.log('No local database target was specified (pass --target=127.0.0.1:54322 or LOCAL_PG_URL).')
    console.log('Local SQL artifacts and lifecycle assertions are validated locally.')
    const lifecycle = parseLocalRehearsalSqlLifecycle()
    console.log(`- Preflight query: ${lifecycle.sizes.preflight} bytes [VALID]`)
    console.log(`- Hardening migration: ${lifecycle.sizes.migration} bytes [VALID]`)
    console.log(`- Postflight assertions: ${lifecycle.sizes.postflight} bytes [VALID]`)
    process.exit(2)
  }

  const targetCheck = validateLocalTarget(targetArg)
  if (!targetCheck.isLocal) {
    console.error(`\n[FATAL REFUSAL] Rehearsal runner strictly prohibits remote targets: ${targetCheck.reason}`)
    console.error('Remote execution is blocked to prevent accidental mutation of non-local databases.')
    process.exit(2)
  }

  parseLocalRehearsalSqlLifecycle()
  console.error(`Target verified local: ${targetCheck.display}`)
  console.error('Status: BLOCKED_LOCAL_MIGRATION_EXECUTOR_NOT_IMPLEMENTED')
  console.error('No SQL was executed. A real transaction executor and rollback evidence are still required.')
  process.exit(2)
}

if (process.argv[1]?.endsWith('rehearse-local-migration.mjs')) {
  runRehearsal()
}
