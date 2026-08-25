#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runMap017LocalRehearsal } from './rehearse-local-migration.mjs'
import { runDatabaseAuthorizationSuite } from './run-local-database-authorization-suite.mjs'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

export function portableMap017Config(root = rootDir) {
  const port = 55432
  const database = 'k2_map017_rehearsal_local'
  return {
    binDir: path.join(root, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin'),
    dataDir: path.join(root, '.tools', 'map017-pg-data'),
    logPath: path.join(root, '.tools', 'map017-pg.log'),
    port,
    database,
    target: `postgresql://postgres@127.0.0.1:${port}/${database}`,
  }
}

function runBinary(executable, args, label, env, options = {}) {
  const result = spawnSync(executable, args, {
    cwd: rootDir,
    env,
    encoding: 'utf8',
    windowsHide: true,
    ...options,
  })
  if (result.error || result.status !== 0) {
    const detail = String(result.stderr || result.stdout || result.error?.message || 'unknown failure').trim()
    throw new Error(`${label} failed: ${detail}`)
  }
  return String(result.stdout || '').trim()
}

function requirePortableRuntime(config) {
  const names = ['initdb.exe', 'pg_ctl.exe', 'psql.exe', 'dropdb.exe', 'createdb.exe']
  const executables = Object.fromEntries(names.map((name) => [name, path.join(config.binDir, name)]))
  const missing = names.filter((name) => !fs.existsSync(executables[name]))
  if (missing.length > 0) throw new Error(`PORTABLE_POSTGRES_RUNTIME_MISSING: ${missing.join(', ')}`)
  return executables
}

export async function runPortableMap017Rehearsal(root = rootDir) {
  const config = portableMap017Config(root)
  const executable = requirePortableRuntime(config)
  const env = {
    ...process.env,
    PGHOST: '127.0.0.1',
    PGPORT: String(config.port),
    PGUSER: 'postgres',
    PGDATABASE: 'postgres',
  }
  let startedByRunner = false

  try {
    if (!fs.existsSync(path.join(config.dataDir, 'PG_VERSION'))) {
      fs.mkdirSync(config.dataDir, { recursive: true })
      runBinary(
        executable['initdb.exe'],
        ['-D', config.dataDir, '-U', 'postgres', '--auth=trust', '--encoding=UTF8'],
        'portable PostgreSQL initialization',
        env,
      )
    }

    const status = spawnSync(executable['pg_ctl.exe'], ['-D', config.dataDir, 'status'], {
      cwd: root,
      env,
      encoding: 'utf8',
      windowsHide: true,
    })
    if (status.status !== 0) {
      runBinary(
        executable['pg_ctl.exe'],
        [
          '-D', config.dataDir,
          '-l', config.logPath,
          '-o', `-p ${config.port} -h 127.0.0.1`,
          '-w', 'start',
        ],
        'portable PostgreSQL startup',
        env,
        { stdio: 'ignore' },
      )
      startedByRunner = true
    }

    runBinary(
      executable['dropdb.exe'],
      ['--if-exists', '-h', '127.0.0.1', '-p', String(config.port), '-U', 'postgres', config.database],
      'rehearsal database reset',
      env,
    )
    runBinary(
      executable['createdb.exe'],
      ['-h', '127.0.0.1', '-p', String(config.port), '-U', 'postgres', config.database],
      'rehearsal database creation',
      env,
    )

    const rehearsal = runMap017LocalRehearsal({
      target: config.target,
      psql: executable['psql.exe'],
    })
    const authorization = await runDatabaseAuthorizationSuite({
      target: config.target,
      psql: executable['psql.exe'],
    })
    if (!rehearsal.passed || !authorization.passed || authorization.executedTests === 0) {
      throw new Error(`PORTABLE_MAP017_AUTHORIZATION_FAILED: ${authorization.message}`)
    }

    console.log(
      `MAP-017 portable rehearsal passed: ${authorization.executedTests} authorization groups; `
      + 'rollback restoration, apply, and idempotent replay verified.',
    )
    return { passed: true, config, authorization }
  } finally {
    if (startedByRunner) {
      runBinary(
        executable['pg_ctl.exe'],
        ['-D', config.dataDir, '-m', 'fast', '-w', 'stop'],
        'portable PostgreSQL shutdown',
        env,
      )
    }
  }
}

async function main() {
  try {
    await runPortableMap017Rehearsal()
  } catch (error) {
    console.error(error.message)
    process.exit(2)
  }
}

if (process.argv[1]?.endsWith('rehearse-map017-portable.mjs')) main()
