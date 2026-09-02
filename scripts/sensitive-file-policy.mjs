import fs from 'node:fs'
import path from 'node:path'

const FORBIDDEN_BASENAMES = new Set([
  '.npmrc',
  'auth.json',
  'credentials.json',
  'service-account.json',
])

const FORBIDDEN_EXTENSIONS = new Set(['.pem', '.key', '.p12', '.pfx', '.dump'])

export function sensitiveFileReason(file) {
  const normalized = String(file || '').replaceAll('\\', '/')
  const basename = path.posix.basename(normalized).toLowerCase()
  const extension = path.posix.extname(basename)

  if (basename === '.env.example') return ''
  if (basename === '.env' || basename.startsWith('.env.')) return 'environment file'
  if (FORBIDDEN_BASENAMES.has(basename)) return 'credential-bearing filename'
  if (FORBIDDEN_EXTENSIONS.has(extension)) return `${extension} credential or backup file`
  if (basename.endsWith('.sql.gz')) return 'compressed database export'
  return ''
}

export function findSensitiveFiles(files) {
  return files
    .map((file) => ({ file, reason: sensitiveFileReason(file) }))
    .filter((entry) => entry.reason)
}


/**
 * Directories that are never part of the deployable source inventory.
 *
 * `node_modules` is vendor code governed by the dependency policy, and `.git`
 * is history rather than shipped content. Nothing else is skipped: a build
 * output directory can absolutely contain a leaked credential, so it stays in
 * scope here.
 */
const INVENTORY_SKIP_DIRECTORIES = new Set(['node_modules', '.git'])

/**
 * Enumerate the files physically present under `root`.
 *
 * This exists for deployment-source checkouts — a Vercel build workspace has no
 * `.git`, so `git ls-files` cannot answer there. It is deliberately **stricter**
 * than the tracked-file check rather than a relaxation of it: it reports what
 * would actually ship, including anything untracked that found its way into the
 * upload. It must never be used to excuse a failure the tracked check reports.
 *
 * Paths are returned repo-relative with forward slashes so both callers feed
 * `findSensitiveFiles` identically shaped input.
 */
export function enumerateSourceFiles(root = '.', { skip = INVENTORY_SKIP_DIRECTORIES } = {}) {
  const results = []

  const walk = (directory) => {
    let entries
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true })
    } catch {
      // An unreadable directory is not proof of safety, so it is surfaced as a
      // finding rather than silently skipped.
      results.push(path.posix.join(toRelative(root, directory), '<unreadable-directory>'))
      return
    }

    for (const entry of entries) {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        if (skip.has(entry.name)) continue
        walk(full)
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        results.push(toRelative(root, full))
      }
    }
  }

  walk(root)
  return results
}

function toRelative(root, target) {
  const relative = path.relative(root, target) || path.basename(target)
  return relative.split(path.sep).join('/')
}
