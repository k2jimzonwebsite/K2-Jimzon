import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { findSensitiveFiles, enumerateSourceFiles } from './sensitive-file-policy.mjs'

/**
 * Sensitive-file gate.
 *
 * Two enumeration modes, and the distinction matters:
 *
 *   git    — what the repository tracks. The default whenever a repo is present.
 *   source — what is physically present in a deployment checkout.
 *
 * `source` exists because a Vercel build workspace contains no `.git`, so the
 * tracked check cannot run there and the gate refused outright (MAP-024). It is
 * deliberately **stricter** than `git`, not a relaxation: it reports anything
 * that would actually ship, including untracked files that reached the upload.
 *
 * The mode is always printed, and `source` never silently substitutes for `git`
 * when a repository is available. A run that can enumerate nothing still fails
 * closed.
 */

const args = process.argv.slice(2)

function requestedMode() {
  const flag = args.find(value => value.startsWith('--mode='))
  if (!flag) return 'auto'
  const mode = flag.slice('--mode='.length)
  if (!['auto', 'git', 'source'].includes(mode)) {
    console.error(`Unknown --mode=${mode}. Use auto, git, or source.`)
    process.exit(2)
  }
  return mode
}

function hasGitRepository(root) {
  // A worktree or submodule uses a `.git` file rather than a directory, so the
  // check is for existence, not for a directory specifically.
  return fs.existsSync(path.join(root, '.git'))
}

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
}

const root = process.cwd()
const mode = requestedMode()
const gitAvailable = hasGitRepository(root)

let files
let usedMode

if (mode === 'source' || (mode === 'auto' && !gitAvailable)) {
  usedMode = 'source'
  try {
    files = enumerateSourceFiles(root)
  } catch (error) {
    console.error(`Unable to enumerate the deployment source inventory: ${error.message}`)
    process.exit(2)
  }
  if (mode === 'auto') {
    console.log('No git repository found; falling back to deployment-source inventory.')
  }
} else {
  usedMode = 'git'
  try {
    files = trackedFiles()
  } catch (error) {
    console.error('Unable to enumerate tracked files for the sensitive-file policy.')
    console.error('If this is a deployment checkout without git, rerun with --mode=source.')
    process.exit(error.status || 1)
  }
}

const findings = findSensitiveFiles(files)
if (findings.length) {
  console.error(`Sensitive-file policy failed in ${usedMode} mode (${findings.length} finding(s)):`)
  for (const finding of findings) console.error(`- ${finding.file} [${finding.reason}]`)
  process.exit(1)
}

console.log(`Sensitive-file policy passed in ${usedMode} mode (${files.length} files checked).`)
