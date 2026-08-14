import { execFileSync } from "node:child_process"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { resolve, relative } from "node:path"
import { looksBinary, scanText } from "./secret-scan-core.mjs"

const SKIP_DIRECTORIES = new Set([".git", "node_modules", "playwright-report", "test-results"])

function walk(target, files = []) {
  const absolute = resolve(target)
  const stats = statSync(absolute)
  if (stats.isFile()) {
    files.push(absolute)
    return files
  }

  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue
    walk(resolve(absolute, entry.name), files)
  }
  return files
}

function repositoryFiles() {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  )
  return output.split("\0").filter(Boolean).map((file) => resolve(file))
}

const targets = process.argv.slice(2)
const files = targets.length > 0
  ? targets.flatMap((target) => walk(target))
  : repositoryFiles()

const findings = []
for (const file of files) {
  const buffer = readFileSync(file)
  if (looksBinary(buffer)) continue
  findings.push(...scanText(buffer.toString("utf8"), relative(process.cwd(), file)))
}

if (findings.length > 0) {
  console.error(`Secret scan failed with ${findings.length} potential finding(s).`)
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} [${finding.rule}]`)
  }
  process.exit(1)
}

console.log(`Secret scan passed (${files.length} files checked; secret values are never printed).`)
