import { spawnSync } from 'node:child_process'
import { chmodSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
export const hooksPathDecision = current => !current || current === '.githooks' ? 'install' : 'preserve'

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && !process.env.CI) {
  const git = args => spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true })
  if (git(['rev-parse', '--git-dir']).status === 0) {
    const current = git(['config', '--get', 'core.hooksPath']).stdout.trim()
    if (hooksPathDecision(current) === 'preserve') {
      console.warn('K2 guardrails: existing hooksPath preserved. Chain the K2 pre-commit/pre-push hooks from your current hook manager; see docs/runbooks/SECURITY_CHECK_GUARDRAILS.md.')
    } else {
      for (const hook of ['pre-commit', 'pre-push']) chmodSync(path.join(root, '.githooks', hook), 0o755)
      const result = git(['config', '--local', 'core.hooksPath', '.githooks'])
      if (result.status !== 0) { console.error(result.stderr); process.exit(result.status || 1) }
      console.log('K2 commit/push guardrails installed in .githooks.')
    }
  }
}
