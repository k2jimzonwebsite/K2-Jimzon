import { execFileSync } from "node:child_process"
import { scanText } from "./secret-scan-core.mjs"

let history
try {
  history = execFileSync(
    "git",
    ["log", "--all", "-p", "--no-ext-diff", "--", ".", ":(exclude)package-lock.json"],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  )
} catch (error) {
  console.error("Unable to inspect Git history.")
  process.exit(error.status || 1)
}

let currentCommit = "unknown"
let currentFile = "unknown"
const findings = []
for (const line of history.split(/\r?\n/)) {
  if (line.startsWith("commit ")) currentCommit = line.slice(7, 19)
  if (line.startsWith("+++ b/")) currentFile = line.slice(6)
  if (!line.startsWith("+") || line.startsWith("+++")) continue
  for (const finding of scanText(line.slice(1), `commit:${currentCommit}:${currentFile}`)) {
    findings.push(finding)
  }
}

if (findings.length > 0) {
  console.error(`Git history scan failed with ${findings.length} potential finding(s).`)
  for (const finding of findings) {
    console.error(`${finding.file} [${finding.rule}]`)
  }
  process.exit(1)
}

console.log("Git history secret scan passed (secret values are never printed).")
