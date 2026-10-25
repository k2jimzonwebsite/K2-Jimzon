import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const verificationInput = file => /^(?:src\/|server\/|api\/|prepared-api\/|scripts\/|tests\/|\.githooks\/|\.github\/workflows\/|package(?:-lock)?\.json$|eslint\.config\.js$|(?:vite|playwright)[^/]*\.[cm]?[jt]s$)/.test(file)

export function pushRefsError(input, head) {
  for (const line of input.trim().split('\n').filter(Boolean)) {
    const parts = line.trim().split(/\s+/)
    if (parts.length !== 4 || !/^[a-f0-9]{40}$/.test(parts[1])) return 'pre-push: invalid Git ref list; no verification claim can be made.'
    if (!/^0{40}$/.test(parts[1]) && parts[1] !== head) return 'pre-push: outgoing commit differs from the checked-out HEAD. Check out and verify that branch before pushing it.'
  }
  return ''
}

export function verificationTreeError(mode, changed, untracked) {
  const dirty = changed.filter(verificationInput)
  if (dirty.length) return `${mode}: ${mode === 'pre-commit' ? 'unstaged' : 'uncommitted'} verification inputs: ${dirty.join(', ')}. Stage/commit the intended code first so the gate checks the code Git will publish.`
  const unknown = untracked.filter(verificationInput)
  if (mode === 'pre-push' && unknown.length) return `pre-push: untracked verification inputs: ${unknown.join(', ')}. Commit the intended code before pushing.`
  return ''
}

function run(task) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', task], {
    cwd: root, stdio: 'inherit', windowsHide: true, shell: process.platform === 'win32',
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status || 1)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2]
  if (!['pre-commit', 'pre-push'].includes(mode)) throw new Error('Expected pre-commit or pre-push')
  if (mode === 'pre-push') {
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim()
    const error = pushRefsError(readFileSync(0, 'utf8'), head)
    if (error) { console.error(error); process.exit(1) }
  }
  const gitPaths = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).split('\0').filter(Boolean)
  if (mode === 'pre-commit' && !gitPaths(['diff', '--cached', '--name-only', '-z']).some(verificationInput)) {
    console.log('K2 guardrails: receipt-only commit; no application rerun needed.')
  } else {
    const error = verificationTreeError(mode,
      gitPaths(['diff', ...(mode === 'pre-push' ? ['HEAD'] : []), '--name-only', '-z']),
      gitPaths(['ls-files', '--others', '--exclude-standard', '-z']))
    if (error) { console.error(error); process.exit(1) }
    run('security:test-turnstile')
    run('check:imports')
    if (mode === 'pre-push') run('test:security-check-ui')
  }
}
