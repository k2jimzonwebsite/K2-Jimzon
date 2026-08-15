#!/usr/bin/env node
/**
 * MAP-017 Isolated Local Database Authorization Test Suite Runner
 *
 * Prepared boundary for live RBAC, RLS, IDOR, search-path, and AAL2 tests.
 * The behavioral assertion executor is not implemented; the CLI fails closed.
 *
 * STRICT SAFETY RULE: Refuses to run against any remote or production host.
 * If no local database is running, truthfully reports the suite as BLOCKED.
 */

import net from 'node:net'
import { parseLocalTarget, validateLocalTarget } from './rehearse-local-migration.mjs'

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
  const localCheck = validateLocalTarget(target)

  if (!localCheck.isLocal) {
    throw new Error(`SECURITY_REFUSAL: Target "${target}" is not a permitted local database (${localCheck.reason}).`)
  }

  const { hostname: host, port } = parseLocalTarget(target)

  const isReachable = await checkLocalPortReachable(host, port)

  if (!isReachable) {
    return {
      status: 'BLOCKED_LOCAL_DATABASE_UNAVAILABLE',
      target: `${host}:${port}`,
      message: `No local PostgreSQL instance is listening at ${host}:${port}. Database-executed authorization tests require an active local database container or runtime.`,
      executedTests: 0,
      passed: false,
    }
  }

  return {
    status: 'BLOCKED_AUTHORIZATION_SUITE_NOT_IMPLEMENTED',
    target: `${host}:${port}`,
    message: 'The local database port is reachable, but no RBAC/RLS/IDOR/AAL2 assertions are implemented or executed.',
    executedTests: 0,
    passed: false,
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
