import { execFileSync } from 'node:child_process'
import { findSensitiveFiles } from './sensitive-file-policy.mjs'

let tracked
try {
  tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
} catch (error) {
  console.error('Unable to enumerate tracked files for the sensitive-file policy.')
  process.exit(error.status || 1)
}

const findings = findSensitiveFiles(tracked)
if (findings.length) {
  console.error(`Tracked sensitive-file policy failed (${findings.length} finding(s)):`)
  for (const finding of findings) console.error(`- ${finding.file} [${finding.reason}]`)
  process.exit(1)
}

console.log(`Tracked sensitive-file policy passed (${tracked.length} tracked files checked).`)

