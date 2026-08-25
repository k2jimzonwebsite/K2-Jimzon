#!/usr/bin/env node
/**
 * MAP-017 Isolated Local Database Authorization Test Suite Runner
 *
 * Executes the phase-one RBAC, RLS, Storage, Realtime, default-privilege, and
 * public-stock assertion groups. Coverage counts are derived from the SQL
 * manifest rather than hard-coded.
 *
 * STRICT SAFETY RULE: Refuses to run against any remote or production host.
 * If no local database is running, truthfully reports the suite as BLOCKED.
 */

import net from 'node:net'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseLocalTarget,
  psqlEnvironment,
  runPsql,
  validateMap017RehearsalTarget,
} from './rehearse-local-migration.mjs'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const authorizationAssertionsPath = path.join(
  rootDir,
  'supabase/tests/map017_authorization_assertions.sql',
)
const assertionGroupPattern = /^-- K2_ASSERTION_GROUP: ([a-z0-9_]+)$/gm
const successMarker = 'MAP017_AUTHORIZATION_ASSERTIONS_PASSED'

export function authorizationAssertionGroups(sql) {
  const groups = [...String(sql).matchAll(assertionGroupPattern)].map((match) => match[1])
  if (groups.length === 0 || new Set(groups).size !== groups.length) {
    throw new Error('AUTHORIZATION_ASSERTION_MANIFEST_INVALID')
  }
  return groups
}

export async function checkLocalPortReachable(host = '127.0.0.1', port = 5432, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let resolved = false

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => {
      resolved = true
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      if (!resolved) {
        resolved = true
        socket.destroy()
        resolve(false)
      }
    })
    socket.once('error', () => {
      if (!resolved) {
        resolved = true
        resolve(false)
      }
    })
    socket.connect(port, host)
  })
}

export async function runDatabaseAuthorizationSuite(options = {}) {
  const target = options.target || process.env.LOCAL_PG_URL || '127.0.0.1:5432'
  const localCheck = validateMap017RehearsalTarget(target)

  if (!localCheck.isLocal) {
    throw new Error(`SECURITY_REFUSAL: Target "${target}" is not a permitted local database (${localCheck.reason}).`)
  }

  const { hostname: host, port } = parseLocalTarget(target)
  const assertionGroups = authorizationAssertionGroups(
    readFileSync(authorizationAssertionsPath, 'utf8'),
  )

  const isReachable = await checkLocalPortReachable(host, port)

  if (!isReachable) {
    return {
      status: 'BLOCKED_LOCAL_DATABASE_UNAVAILABLE',
      target: `${host}:${port}`,
      message: `No local PostgreSQL instance is listening at ${host}:${port}. Database-executed authorization tests require an active local database container or runtime.`,
      executedTests: 0,
      assertionGroups,
      passed: false,
    }
  }

  try {
    const output = runPsql(
      options.psql || process.env.PSQL_BIN || 'psql',
      psqlEnvironment(localCheck.parsed),
      ['-f', authorizationAssertionsPath],
      'MAP-017 authorization assertions',
    )
    if (!output.includes(successMarker)) {
      throw new Error('AUTHORIZATION_ASSERTION_SUCCESS_MARKER_MISSING')
    }
    return {
      status: 'PASSED',
      target: `${host}:${port}`,
      message: `${assertionGroups.length} database-executed phase-one authorization assertion groups passed without retaining test rows.`,
      executedTests: assertionGroups.length,
      assertionGroups,
      passed: true,
    }
  } catch (error) {
    return {
      status: 'FAILED',
      target: `${host}:${port}`,
      message: error.message,
      executedTests: assertionGroups.length,
      assertionGroups,
      passed: false,
    }
  }
}

async function main() {
  console.log('===========================================================')
  console.log('   MAP-017 LOCAL DATABASE AUTHORIZATION SUITE RUNNER       ')
  console.log('===========================================================')

  const target = process.argv.slice(2).find((arg) => arg.startsWith('--target='))?.slice('--target='.length)
  const result = await runDatabaseAuthorizationSuite({ target })
  if (result.status.startsWith('BLOCKED_')) {
    console.log(`\nStatus: ${result.status}`)
    console.log(result.message)
    console.log('\nNo database authorization behavior was verified by this command.')
    process.exit(2)
  }

  console.log(`Status: ${result.status}`)
  console.log(result.message)
  process.exit(result.passed && result.executedTests > 0 ? 0 : 2)
}

if (process.argv[1]?.endsWith('run-local-database-authorization-suite.mjs')) {
  main()
}
