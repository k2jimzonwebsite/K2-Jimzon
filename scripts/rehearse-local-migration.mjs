#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadMap017ApplyContract } from './apply-map017-migration.mjs'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const ALLOWED_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export function parseLocalTarget(targetHostOrUrl) {
  if (!targetHostOrUrl || typeof targetHostOrUrl !== 'string') throw new Error('TARGET_HOST_EMPTY')
  const candidate = targetHostOrUrl.includes('://') ? targetHostOrUrl : `postgresql://${targetHostOrUrl}`
  let parsed
  try { parsed = new URL(candidate) } catch { throw new Error('TARGET_URL_INVALID') }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  const port = Number(parsed.port || 5432)
  if (!hostname || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('TARGET_URL_INVALID')
  return { hostname, port, display: `${hostname}:${port}`, parsed }
}

export function validateLocalTarget(targetHostOrUrl) {
  try {
    const parsed = parseLocalTarget(targetHostOrUrl)
    if (!ALLOWED_LOCAL_HOSTS.has(parsed.hostname)) return { isLocal: false, reason: 'NON_LOCAL_HOST_REJECTED' }
    return { isLocal: true, ...parsed }
  } catch (error) {
    return { isLocal: false, reason: error.message }
  }
}

export function validateMap017RehearsalTarget(target) {
  const local = validateLocalTarget(target)
  if (!local.isLocal) return local
  if (!['postgres:', 'postgresql:'].includes(local.parsed.protocol)) {
    return { isLocal: false, reason: 'TARGET_PROTOCOL_INVALID' }
  }
  const database = decodeURIComponent(local.parsed.pathname.replace(/^\//, ''))
  if (!/^k2_map017_rehearsal[a-z0-9_-]*$/.test(database)) {
    return { isLocal: false, reason: 'REHEARSAL_DATABASE_NAME_REQUIRED' }
  }
  return { ...local, database }
}

export function psqlEnvironment(parsed) {
  return {
    ...process.env,
    PGHOST: parsed.hostname.replace(/^\[|\]$/g, ''),
    PGPORT: parsed.port || '5432',
    PGUSER: decodeURIComponent(parsed.username || 'postgres'),
    PGPASSWORD: decodeURIComponent(parsed.password || ''),
    PGDATABASE: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
  }
}

export function runPsql(executable, env, args, label) {
  const result = spawnSync(executable, ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', ...args], {
    cwd: rootDir, env, encoding: 'utf8', windowsHide: true,
  })
  if (result.error || result.status !== 0) {
    const detail = String(result.stderr || result.error?.message || 'unknown psql failure').trim()
    throw new Error(`${label} failed: ${detail}`)
  }
  return String(result.stdout || '').trim()
}

function migrationBody(sql) {
  const withoutComments = sql.replace(/^(?:\s*--[^\n]*(?:\r?\n|$))+/, '').trim()
  const markers = withoutComments.match(/\b(begin|commit)\s*;/gi) ?? []
  if (markers.length !== 2 || !/^begin\s*;/i.test(withoutComments) || !/commit\s*;\s*$/i.test(withoutComments)) {
    throw new Error('MIGRATION_TRANSACTION_SHAPE_INVALID')
  }
  return withoutComments.replace(/^begin\s*;/i, '').replace(/commit\s*;\s*$/i, '')
}

export function runMap017LocalRehearsal({ target, psql = process.env.PSQL_BIN || 'psql' }) {
  const check = validateMap017RehearsalTarget(target)
  if (!check.isLocal) throw new Error(`SECURITY_REFUSAL: ${check.reason}`)
  const env = psqlEnvironment(check.parsed)
  const sql = (relative) => fs.readFileSync(path.join(rootDir, relative), 'utf8')
  const bootstrap = 'supabase/tests/map017_rehearsal_bootstrap.sql'
  const preflightPath = 'supabase/map017_public_write_boundary_preflight.sql'
  const migrationPath = 'supabase/migrations/20260812_map017_public_write_boundary_hardening.sql'
  const postflightPath = 'supabase/map017_public_write_boundary_postflight.sql'
  const baseline = 'supabase/tests/map017_rehearsal_baseline_assertions.sql'
  const authorization = 'supabase/tests/map017_authorization_assertions.sql'
  const { contract } = loadMap017ApplyContract()

  const verifyPermanentApply = (label) => {
    const output = runPsql(psql, env, ['-At', '-c', contract.verificationSql], label)
    let verification
    try { verification = JSON.parse(output) }
    catch { throw new Error(`${label} returned invalid JSON: ${output.slice(0, 300)}`) }
    const failed = contract.verificationKeys.filter((key) => verification[key] !== true)
    if (failed.length > 0) throw new Error(`${label} failed: ${failed.join(', ')}`)
  }

  runPsql(psql, env, ['-f', path.join(rootDir, bootstrap)], 'bootstrap')
  console.log('MAP-017 local rehearsal: vulnerable baseline created.')

  const preflight = runPsql(psql, env, ['-At', '-f', path.join(rootDir, preflightPath)], 'preflight')
  if (!preflight.startsWith('t|')) throw new Error(`preflight did not report ready_to_apply: ${preflight.slice(0, 300)}`)
  console.log('MAP-017 local rehearsal: preflight passed.')

  const rollbackSql = [
    'begin;', sql(preflightPath), migrationBody(sql(migrationPath)), sql(postflightPath), 'rollback;',
  ].join('\n\n')
  runPsql(psql, env, ['-c', rollbackSql], 'rollback-only lifecycle')
  runPsql(psql, env, ['-f', path.join(rootDir, baseline)], 'rollback restoration')
  console.log('MAP-017 local rehearsal: rollback lifecycle and restoration passed.')

  runPsql(psql, env, ['-c', contract.applySql], 'payload-bound permanent apply')
  verifyPermanentApply('independent permanent-apply verification')
  const authorizationOutput = runPsql(
    psql,
    env,
    ['-f', path.join(rootDir, authorization)],
    'authorization assertions',
  )
  if (!authorizationOutput.includes('MAP017_AUTHORIZATION_ASSERTIONS_PASSED')) {
    throw new Error('AUTHORIZATION_ASSERTION_SUCCESS_MARKER_MISSING')
  }
  console.log('MAP-017 local rehearsal: apply and authorization assertions passed.')

  runPsql(psql, env, ['-c', contract.applySql], 'payload-bound idempotent replay')
  verifyPermanentApply('independent replay verification')
  console.log('MAP-017 local rehearsal: payload-bound apply, receipt, verification, and idempotent replay passed.')
  return { passed: true, target: check.display, database: check.database }
}

async function main() {
  const target = process.argv.slice(2).find((arg) => arg.startsWith('--target='))?.slice(9)
    || process.env.K2_MAP017_REHEARSAL_URL
  if (!target) {
    console.error('BLOCKED_LOCAL_DATABASE_UNAVAILABLE: set K2_MAP017_REHEARSAL_URL.')
    process.exit(2)
  }
  try { runMap017LocalRehearsal({ target }) }
  catch (error) { console.error(error.message); process.exit(2) }
}

if (process.argv[1]?.endsWith('rehearse-local-migration.mjs')) main()
