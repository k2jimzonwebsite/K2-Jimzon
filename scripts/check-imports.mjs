#!/usr/bin/env node
// ============================================================================
// Import-integrity check — catches "X is not defined" runtime crashes BEFORE
// they ship. `vite build` bundles happily even when a component uses an
// identifier it never imported (it's valid JS that only throws at runtime),
// so these bugs pass the build. This script scans for the specific identifiers
// that must be imported (React hooks + the supabase client) and fails if any
// file uses one without importing it.
//
// Run: node scripts/check-imports.mjs   (also runs in CI before the build)
// ============================================================================

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../src', import.meta.url))

// Identifiers that are ONLY valid when imported, and where they come from.
const REACT_HOOKS = ['useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'useLayoutEffect', 'useContext', 'useReducer']
const CHECKS = [
  ...REACT_HOOKS.map((h) => ({ name: h, importedFrom: /from\s+['"]react['"]/, alt: `React.${h}` })),
  { name: 'supabase', importedFrom: /supabaseClient/, alt: null },
]

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (/\.jsx?$/.test(entry)) files.push(full)
  }
  return files
}

// Strip comments + string/template literals so we only inspect real code usage.
function stripNonCode(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')   // block comments
    .replace(/\/\/[^\n]*/g, ' ')          // line comments
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '``')   // template literals
    .replace(/'(?:\\.|[^'\\])*'/g, "''")        // single-quote strings
    .replace(/"(?:\\.|[^"\\])*"/g, '""')        // double-quote strings
}

const problems = []

for (const file of walk(ROOT)) {
  const raw = readFileSync(file, 'utf8')
  const code = stripNonCode(raw)
  for (const { name, importedFrom, alt } of CHECKS) {
    const used = new RegExp(`(^|[^.\\w])${name}\\s*\\(`).test(code) // called like name( … )
    if (!used) continue
    const importLine = new RegExp(`import[^;\\n]*\\b${name}\\b[^;\\n]*${importedFrom.source}`)
    const imported = importLine.test(raw)
    const localDef = new RegExp(`(const|let|var|function)\\s+${name}\\b`).test(code)
    const altUsed = alt && raw.includes(alt)
    if (!imported && !localDef && !altUsed) {
      problems.push(`${file.replace(ROOT, 'src')}: uses "${name}" but never imports it`)
    }
  }
}

if (problems.length) {
  console.error('\n✗ Import-integrity check FAILED — these would crash at runtime:\n')
  for (const p of problems) console.error('  - ' + p)
  console.error('\nAdd the missing import(s) and re-run.\n')
  process.exit(1)
}

console.log('✓ Import-integrity check passed — all hooks and supabase usages are imported.')
