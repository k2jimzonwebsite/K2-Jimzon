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

