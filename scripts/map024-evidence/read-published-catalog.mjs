// MAP-024 queue item 6: read-only published-catalog projection for the sitemap.
//
// This is the owner-authenticated K2 database read that `generate-sitemap.mjs`
// has always required and never had. It connects with SUPABASE_ACCESS_TOKEN via
// the Management API in read_only mode, selects a narrow non-PII projection, and
// writes the JSON array the generator consumes.
//
// It deliberately does NOT decide the two open data questions it reports on
// (see GAPS below). It surfaces them so a human resolves them once, rather than
// encoding a guess that would silently ship a wrong sitemap.
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

const REF = 'pixplcjqivlfflickobf'
const ENV_PATH = '.env.local'

// Mirrors src/context/StoreContext.jsx, minus 'Unlisted'. Unlisted products are
// reachable by direct link but must never be advertised to a crawler.
const SITEMAP_STATUSES = ['Live', 'Active']

// The projection is column-pinned. A `select *` here would pull internal_notes,
// cost_price, dealer_price and supplier_id into an artifact destined for a
// public file, so the column list is the security boundary and stays explicit.
const PROJECTION_COLUMNS = [
  'sku',
  'name',
  'status',
  'published',
  'primary_image_url',
  'image_url',
  'secondary_images',
  'lifestyle_images',
  'srp',
  'updated_at',
]

function readEnv(path = ENV_PATH) {
  const env = {}
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim())
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return env
}

function buildQuery() {
  const columns = PROJECTION_COLUMNS.join(', ')
  const statuses = SITEMAP_STATUSES.map(status => `'${status}'`).join(', ')
  return `select ${columns} from public.products where status in (${statuses}) order by sku`
}

// Fail closed. This script must never become a general SQL executor against
// production, so the statement it is about to send is re-validated as a pure
// single-statement read immediately before transmission.
const FORBIDDEN_VERB = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy)\b/i

function assertReadOnly(sql) {
  if (!sql.trim().toLowerCase().startsWith('select ')) {
    throw new Error('MAP024_CATALOG_REFUSAL: query must begin with SELECT')
  }
  if (FORBIDDEN_VERB.test(sql)) {
    throw new Error('MAP024_CATALOG_REFUSAL: query contains a write verb')
  }
  if (sql.includes(';')) {
    throw new Error('MAP024_CATALOG_REFUSAL: query must be a single statement')
  }
  return sql
}

export async function readPublishedCatalog({ env = readEnv(), fetchImpl = fetch } = {}) {
  const token = env.SUPABASE_ACCESS_TOKEN
  if (!token) throw new Error('MAP024_CATALOG_REFUSAL: SUPABASE_ACCESS_TOKEN is not set')

  const query = assertReadOnly(buildQuery())
  const response = await fetchImpl(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, read_only: true }),
  })

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`MAP024_CATALOG_REFUSAL: management API returned HTTP ${response.status}`)
  }

  const rows = await response.json()
  if (!Array.isArray(rows)) throw new Error('MAP024_CATALOG_REFUSAL: unexpected response shape')
  return rows
}

function firstImage(row) {
  const arrays = [row.secondary_images, row.lifestyle_images]
  for (const candidate of [row.primary_image_url, row.image_url]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  for (const list of arrays) {
    if (Array.isArray(list) && typeof list[0] === 'string' && list[0].trim()) return list[0].trim()
  }
  return null
}

/**
 * Report the conditions that stop `generate-sitemap.mjs` from emitting product
 * URLs. Each is a real property of the live data, not a style preference.
 */
export function auditProjection(rows) {
  return {
    total: rows.length,
    publishedFalse: rows.filter(row => row.published === false).length,
    missingImage: rows.filter(row => firstImage(row) === null).length,
    missingSku: rows.filter(row => !String(row.sku ?? '').trim()).length,
  }
}

export function runCli(args = process.argv.slice(2)) {
  const outputArg = args.find(value => value.startsWith('--output='))
  const output = outputArg ? outputArg.slice('--output='.length) : null
  if (!output) {
    console.error('Usage: node scripts/map024-evidence/read-published-catalog.mjs --output=<catalog.json>')
    return 2
  }
  return readPublishedCatalog()
    .then(rows => {
      const audit = auditProjection(rows)
      fs.writeFileSync(output, `${JSON.stringify(rows, null, 2)}\n`, 'utf8')
      console.log(`MAP024_CATALOG_READ: wrote ${output}`)
      console.log(`  sitemap-eligible statuses : ${SITEMAP_STATUSES.join(', ')}`)
      console.log(`  rows read                 : ${audit.total}`)
      console.log(`  published === false       : ${audit.publishedFalse}`)
      console.log(`  no image on any column    : ${audit.missingImage}`)
      console.log(`  missing SKU               : ${audit.missingSku}`)
      if (audit.publishedFalse) {
        console.log(`\n${audit.publishedFalse} of ${audit.total} row(s) have published=false and are excluded`)
        console.log('from the sitemap. That is correct while the catalog holds pre-launch mock')
        console.log('records: publication is a deliberate staff decision, not a side effect of')
        console.log('status. Product URLs appear here once real products are marked Published.')
      }
      if (audit.missingImage) {
        console.log(`\n${audit.missingImage} row(s) have no image. This no longer blocks generation —`)
        console.log('the <image:image> element is omitted for those products and the URL is still')
        console.log('listed. Supplied images are still validated strictly.')
      }
      return 0
    })
    .catch(error => {
      console.error(error.message)
      return 2
    })
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  runCli().then(code => { process.exitCode = code })
}
