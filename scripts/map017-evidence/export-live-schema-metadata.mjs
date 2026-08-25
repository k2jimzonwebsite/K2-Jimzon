// MAP-017: read-only live schema metadata export.
// Runs the repository's own export SQL and writes the resulting inventory.
// Emits structure counts only; the export SQL selects no row data.
import fs from 'node:fs'

const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim())
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const REF = 'pixplcjqivlfflickobf'
const sql = fs.readFileSync('supabase/export-schema-metadata.sql', 'utf8')

// Fail closed if the export file ever stops being a pure read.
const FORBIDDEN = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke)\s/i
const body = sql.replace(/--[^\n]*/g, '')
const firstWord = body.trim().split(/\s+/)[0].toLowerCase()
if (firstWord !== 'with' && firstWord !== 'select') {
  throw new Error(`REFUSED: export SQL must begin with WITH/SELECT, got "${firstWord}"`)
}
const afterCte = body.slice(body.toLowerCase().lastIndexOf('select jsonb_build_object'))
if (FORBIDDEN.test(afterCte)) throw new Error('REFUSED: export SQL contains a write verb in its final projection')

const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql, read_only: true }),
})

console.log(`HTTP ${r.status}`)
const out = await r.json().catch(() => null)
if (r.status !== 200 && r.status !== 201) {
  console.log(JSON.stringify(out, null, 2).slice(0, 1200))
  process.exit(1)
}

const row = Array.isArray(out) ? out[0] : out
const metadata = row?.schema_metadata ?? row?.jsonb_build_object ?? row
const target = process.argv[2] || 'live-schema-metadata.json'
fs.writeFileSync(target, `${JSON.stringify(metadata, null, 2)}\n`)

console.log(`\nwrote ${target}`)
for (const [k, v] of Object.entries(metadata ?? {})) {
  const n = Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 1
  console.log(`  ${k.padEnd(20)} ${Array.isArray(v) ? `${n} entries` : `${n} keys`}`)
}
