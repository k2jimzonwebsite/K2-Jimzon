#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createMap017ProductionBackup,
  productsOldArchiveFingerprintFromRows,
  productsOldArchiveRowsSql,
} from './create-map017-production-backup.mjs'
import { runMap017LocalRehearsal } from './rehearse-local-migration.mjs'
import { runDatabaseAuthorizationSuite } from './run-local-database-authorization-suite.mjs'
import { verifyMap017ProductionBackupRestore } from './verify-map017-production-backup-restore.mjs'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

export function portableMap017Config(root = rootDir) {
  const port = 55432
  const database = 'k2_map017_rehearsal_local'
  const restoreDatabase = 'k2_map017_restore_verification_portable'
  return {
    binDir: path.join(root, '.tools', 'postgresql-17.11', 'runtime', 'pgsql', 'bin'),
    dataDir: path.join(root, '.tools', 'map017-pg-data'),
    logPath: path.join(root, '.tools', 'map017-pg.log'),
    port,
    database,
    target: `postgresql://postgres@127.0.0.1:${port}/${database}`,
    restoreDatabase,
    restoreTarget: `postgresql://postgres@127.0.0.1:${port}/${restoreDatabase}`,
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
  const names = ['initdb.exe', 'pg_ctl.exe', 'psql.exe', 'dropdb.exe', 'createdb.exe', 'pg_dump.exe', 'pg_restore.exe']
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
  let restoreDatabaseCreated = false
  let backupTempDir = null

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
    runBinary(
      executable['psql.exe'],
      ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-f', path.join(root, 'supabase', 'migrations', '20260826_map017_error_report_boundary.sql')],
      'MAP-017 error-report boundary migration',
      { ...env, PGDATABASE: config.database },
    )
    runBinary(
      executable['psql.exe'],
      ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-f', path.join(root, 'supabase', 'migrations', '20260826_map017_error_report_boundary.sql')],
      'MAP-017 error-report boundary replay',
      { ...env, PGDATABASE: config.database },
    )
    runBinary(
      executable['psql.exe'],
      ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-f', path.join(root, 'supabase', 'tests', 'map017_error_report_boundary_authorization.sql')],
      'MAP-017 error-report boundary authorization',
      { ...env, PGDATABASE: config.database },
    )
    const authorization = await runDatabaseAuthorizationSuite({
      target: config.target,
      psql: executable['psql.exe'],
    })
    if (!rehearsal.passed || !authorization.passed || authorization.executedTests === 0) {
      throw new Error(`PORTABLE_MAP017_AUTHORIZATION_FAILED: ${authorization.message}`)
    }

    runBinary(
      executable['psql.exe'],
      ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-f', path.join(root, 'supabase', 'tests', 'map017_rehearsal_bootstrap.sql')],
      'portable backup source baseline reset',
      { ...env, PGDATABASE: config.database },
    )
    const dumpResult = spawnSync(executable['pg_dump.exe'], ['--format=custom', '--no-owner'], {
      cwd: root,
      env: { ...env, PGDATABASE: config.database },
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 1024,
    })
    if (dumpResult.error || dumpResult.status !== 0 || !Buffer.isBuffer(dumpResult.stdout)) {
      throw new Error('portable MAP-017 backup archive creation failed')
    }
    const productsOldRows = runBinary(
      executable['psql.exe'],
      ['-X', '--no-psqlrc', '-At', '-v', 'ON_ERROR_STOP=1', '-c', productsOldArchiveRowsSql],
      'portable products_old archive fingerprint',
      { ...env, PGDATABASE: config.database },
    )
    const productsOldArchive = productsOldArchiveFingerprintFromRows(productsOldRows)
    backupTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'k2-map017-portable-restore-'))
    const envelopePath = path.join(backupTempDir, 'map017-portable.k2backup')
    const passphrase = 'portable-map017-restore-rehearsal-passphrase-2026'
    const rehearsalProductionUrl = [
      'postgresql://', 'postgres', ':', 'portable-fixture-password', '@',
      'db.pixplcjqivlfflickobf.supabase.co:5432/postgres?sslmode=require',
    ].join('')
    await createMap017ProductionBackup({
      databaseUrl: rehearsalProductionUrl,
      passphrase,
      destinationPath: envelopePath,
      confirmProject: 'pixplcjqivlfflickobf',
      confirmPurpose: 'MAP-017-pre-migration',
      confirmArtifactSha256: 'D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62',
      confirmLedgerVersion: '20260824143000',
      dumpDatabase: async () => ({ dump: dumpResult.stdout, productsOldArchive }),
    })
    runBinary(
      executable['dropdb.exe'],
      ['--if-exists', '-h', '127.0.0.1', '-p', String(config.port), '-U', 'postgres', config.restoreDatabase],
      'portable restore database reset',
      env,
    )
    runBinary(
      executable['createdb.exe'],
      ['-h', '127.0.0.1', '-p', String(config.port), '-U', 'postgres', config.restoreDatabase],
      'portable restore database creation',
      env,
    )
    restoreDatabaseCreated = true
    const restore = await verifyMap017ProductionBackupRestore({
      envelopePath,
      passphrase,
      target: config.restoreTarget,
      psql: executable['psql.exe'],
      pgRestore: executable['pg_restore.exe'],
    })
    if (!restore.restoreVerified) throw new Error('PORTABLE_MAP017_RESTORE_VERIFICATION_FAILED')

    console.log(
      `MAP-017 portable rehearsal passed: ${authorization.executedTests} authorization groups; `
      + 'rollback restoration, apply, error-report flood denial, idempotent replay, encrypted backup, '
      + '14-row legacy archive equality, and isolated restore verified.',
    )
    return { passed: true, config, authorization, restore }
  } finally {
    if (restoreDatabaseCreated) {
      runBinary(
        executable['dropdb.exe'],
        ['--if-exists', '-h', '127.0.0.1', '-p', String(config.port), '-U', 'postgres', config.restoreDatabase],
        'portable restore database cleanup',
        env,
      )
    }
    if (backupTempDir) fs.rmSync(backupTempDir, { recursive: true, force: true })
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
