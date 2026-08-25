#!/usr/bin/env node
/**
 * Metadata-Only Schema Export Tool (MAP-017)
 *
 * Extracts structural metadata from PostgreSQL/Supabase catalogs without accessing
 * or exporting any business records, passwords, credentials, tokens, or emails.
 *
 * Usage:
 *   node scripts/export-schema-metadata.mjs [--connection-string=<url>] [--output=<file.json>]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { redactObject } from './schema-truth-core.mjs'
import { validateLocalTarget } from './rehearse-local-migration.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const exportQueryPath = path.join(rootDir, 'supabase', 'export-schema-metadata.sql')

export function readExportQuery() {
  if (!fs.existsSync(exportQueryPath)) {
    throw new Error(`MISSING_EXPORT_SQL: ${exportQueryPath} not found.`)
  }
  return fs.readFileSync(exportQueryPath, 'utf8')
}

export function validateExportedMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    throw new Error('INVALID_METADATA: Exported metadata is not a valid JSON object.')
  }
  const requiredFields = [
    'format_version',
    'schemas',
    'tables',
    'columns',
    'constraints',
    'indexes',
    'sequences',
    'triggers',
    'views',
    'materialized_views',
    'functions',
    'policies',
    'grants',
    'storage',
    'realtime',
    'migrations',
  ]
  for (const field of requiredFields) {
    if (!(field in metadata)) {
      throw new Error(`INCOMPLETE_METADATA: Exported metadata is missing section "${field}".`)
    }
  }
  return redactObject(metadata)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    connectionString: null,
    output: null,
    queryOnly: false,
  }
  for (const arg of args) {
    if (arg.startsWith('--connection-string=')) {
      options.connectionString = arg.split('=')[1]
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1]
    } else if (arg === '--query-only') {
      options.queryOnly = true
    }
  }
  return options
}

async function main() {
  const options = parseArgs()

  if (options.queryOnly) {
    console.log(readExportQuery())
    process.exit(0)
  }

  if (!options.connectionString) {
    console.log('MAP-017 Metadata-Only Schema Exporter:')
    console.log('Query definition loaded from supabase/export-schema-metadata.sql.')
    console.log('Run with --connection-string=<url> to execute against a running database, or --query-only to print SQL.')
    process.exit(2)
  }

  // Refuse execution against non-local hosts unless explicit local flags are provided
  const localTarget = validateLocalTarget(options.connectionString)
  if (!localTarget.isLocal) {
    console.error('REFUSED: Schema export tool will not connect to remote or production databases without local isolation.')
    process.exit(2)
  }

  console.error(`Target verified local: ${localTarget.display}`)
  console.error('Status: BLOCKED_SCHEMA_METADATA_EXECUTOR_NOT_IMPLEMENTED')
  console.error('No database connection or metadata export was performed.')
  process.exit(2)
}

if (process.argv[1]?.endsWith('export-schema-metadata.mjs')) {
  main()
}
