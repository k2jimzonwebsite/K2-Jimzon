import fs from 'node:fs'
import path from 'node:path'
import { inspectBrowserSource, inspectServerSource } from './environment-source-boundary-core.mjs'

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx'])
const SERVER_ROOTS = ['api', 'prepared-api', 'server', 'supabase/functions']

function walk(root, files = []) {
  if (!fs.existsSync(root)) return files
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name)
    if (entry.isDirectory()) walk(absolute, files)
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(absolute)
  }
  return files
}

const browserFiles = walk('src')
const serverFiles = SERVER_ROOTS.flatMap((root) => walk(root))
const findings = []

for (const file of browserFiles) {
  findings.push(...inspectBrowserSource(fs.readFileSync(file, 'utf8'), file.replaceAll('\\', '/')))
}
for (const file of serverFiles) {
  findings.push(...inspectServerSource(fs.readFileSync(file, 'utf8'), file.replaceAll('\\', '/')))
}

if (findings.length) {
  console.error(`Environment source boundary failed (${findings.length} finding(s)):`)
  for (const finding of findings) {
    console.error(`- ${finding.file} [${finding.rule}]${finding.name ? ` ${finding.name}` : ''}`)
  }
  process.exit(1)
}

console.log(`Environment source boundary passed (${browserFiles.length} browser and ${serverFiles.length} server/Edge files checked).`)

