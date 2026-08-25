#!/usr/bin/env node
/**
 * K2 Jimzon Schema-Truth Audit CLI (MAP-017)
 *
 * Runs schema inventory and comparison against expected repository truth.
 * Usage:
 *   node scripts/schema-truth-audit.mjs [--export=<path-to-export.json>] [--json] [--fixture=<name>]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseSchemaExport,
  buildExpectedRepositorySchema,
  compareSchemaTruth,
  formatSchemaTruthReport,
} from './schema-truth-core.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    exportPath: null,
    fixture: null,
    json: false,
    output: null,
    allowFindings: false,
  }

  for (const arg of args) {
    if (arg.startsWith('--export=')) {
      options.exportPath = arg.split('=')[1]
    } else if (arg.startsWith('--fixture=')) {
      options.fixture = arg.split('=')[1]
    } else if (arg === '--json') {
      options.json = true
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1]
    } else if (arg === '--allow-findings') {
      options.allowFindings = true
    }
  }
  return options
}

async function runAudit() {
  const options = parseArgs()
  const expected = buildExpectedRepositorySchema()

  let rawExport = null
  let sourceDescription = 'repository baseline validation'

  if (options.exportPath) {
    const resolvedPath = path.resolve(process.cwd(), options.exportPath)
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: Schema export file not found: ${resolvedPath}`)
      process.exit(1)
    }
    rawExport = fs.readFileSync(resolvedPath, 'utf8')
    sourceDescription = `file: ${options.exportPath}`
  } else if (options.fixture) {
    const fixturePath = path.join(rootDir, 'tests', 'fixtures', 'schema-truth-exports', `${options.fixture}.json`)
    if (!fs.existsSync(fixturePath)) {
      console.error(`Error: Fixture not found: ${fixturePath}`)
      process.exit(1)
    }
    rawExport = fs.readFileSync(fixturePath, 'utf8')
    sourceDescription = `fixture: ${options.fixture}`
  } else {
    console.error('SCHEMA_EXPORT_REQUIRED: No schema export was supplied.')
    console.error('Use --export=<redacted-export.json> for an audit or --fixture=<name> for an explicit fabricated-fixture test.')
    process.exit(2)
  }

  try {
    const parsedExport = parseSchemaExport(rawExport)
    const diff = compareSchemaTruth(parsedExport, expected)
    const report = formatSchemaTruthReport(diff, { format: options.json ? 'json' : 'markdown' })

    // Every report states what kind of evidence it is. A fixture run only proves
    // the parser handles self-authored test data; it is not database evidence,
    // and an export audit is only as current as the export it was handed. Without
    // this banner the two outputs look identical, which is how a fabricated
    // fixture ends up quoted as proof about the live database.
    const evidenceLevel = options.fixture
      ? 'FABRICATED_FIXTURE_PARSER_CHECK_ONLY'
      : 'EXPLICIT_SCHEMA_EXPORT_AUDIT'
    const evidenceDisclaimer = options.fixture
      ? 'This result validates the parser against self-authored test data; it is not database drift or authorization evidence.'
      : 'This result compares the supplied metadata export only; verify the export provenance and capture time before treating it as database evidence.'
    const renderedReport = options.json
      ? JSON.stringify({
          evidenceLevel,
          evidenceDisclaimer,
          source: sourceDescription,
          ...JSON.parse(report),
        }, null, 2)
      : `${evidenceLevel}\n${evidenceDisclaimer}\n\n${report}\n\n[Schema Truth Source: ${sourceDescription}]`

    if (options.output) {
      fs.writeFileSync(path.resolve(process.cwd(), options.output), renderedReport, 'utf8')
    }

    console.log(renderedReport)

    if (!options.allowFindings && diff.totalIssues > 0) {
      process.exit(1)
    }
    process.exit(0)
  } catch (err) {
    console.error(`Schema-Truth Audit Failed: ${err.message}`)
    process.exit(1)
  }
}

runAudit()
