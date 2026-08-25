// MAP-016 blocker 2: build the name-only Vercel environment inventory.
//
// Reads variable NAMES from both deployment projects and writes the JSON that
// `npm run security:env-contract` consumes. Values are never requested, read,
// printed, or written — `vercel env ls` returns names and targets only.
//
// Each project is linked inside a throwaway directory so the repository's own
// .vercel/project.json is never modified.
//
// Usage:
//   node scripts/map016-evidence/build-vercel-env-inventory.mjs \
//     --admin k2-jimzon-admin --storefront k2-jimzon --out vercel-env-inventory.json
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

function arg(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}

const projects = { admin: arg('admin', 'k2-jimzon-admin'), storefront: arg('storefront', 'k2-jimzon') }
const outPath = arg('out', 'vercel-env-inventory.json')
// The CLI's default scope can be stale after re-login, so the team is passed
// explicitly on every call rather than relying on the persisted selection.
const scope = arg('scope', 'k2-jimzon')
const scopeArgs = scope ? ['--scope', scope] : []

// Current Node refuses to spawn a Windows .cmd shim without a shell, so the
// command is run through the shell there. Shell-invoking a .cmd concatenates
// arguments rather than escaping them, so every argument is validated against a
// strict identifier allowlist first. Project and team names come from operator
// input today, but this must stay safe if the script is ever driven by CI.
const SAFE_ARG = /^[A-Za-z0-9._@/-]+$/
const isWindows = process.platform === 'win32'
const run = (args, cwd) => {
  for (const arg of args) {
    if (!SAFE_ARG.test(arg)) {
      throw new Error(`REFUSED: unsafe argument for shell invocation: ${JSON.stringify(arg)}`)
    }
  }
  return execFileSync(isWindows ? 'vercel.cmd' : 'vercel', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWindows,
  })
}

// `vercel env ls` prints a table whose columns are name, value, environments and
// created. The value column never contains a secret — it renders the literal
// word "Encrypted" — and only the name column is read here.
function parseNames(output) {
  const names = new Set()
  for (const line of output.split(/\r?\n/)) {
    const m = /^\s+([A-Za-z_][A-Za-z0-9_]*)\s{2,}\S/.exec(line)
    if (m && m[1] !== 'name') names.add(m[1])
  }
  return [...names].sort()
}

const inventory = {}
for (const [target, project] of Object.entries(projects)) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `k2-envscan-${target}-`))
  try {
    run(['link', '--project', project, '--yes', ...scopeArgs], dir)
    const out = run(['env', 'ls', ...scopeArgs], dir)
    inventory[target] = parseNames(out)
    console.log(`${target.padEnd(11)} (${project}): ${inventory[target].length} variable names`)
  } catch (e) {
    const detail = String(e.stderr || e.message).split(/\r?\n/).filter(Boolean).slice(-3).join(' | ')
    console.error(`${target.padEnd(11)} (${project}): FAILED — ${detail}`)
    process.exitCode = 1
  } finally {
    // Windows can still hold a handle on the linked directory; a leftover temp
    // folder must not fail the inventory.
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
    } catch {
      console.warn(`  (left temp dir behind: ${dir})`)
    }
  }
}

if (process.exitCode === 1) {
  console.error('\nInventory incomplete. Confirm `vercel whoami` is the account owning these projects.')
  process.exit(1)
}

fs.writeFileSync(outPath, `${JSON.stringify(inventory, null, 2)}\n`)
console.log(`\nWrote ${outPath} (names only, no values).`)
console.log(`Next: npm run security:env-contract -- --inventory ${outPath}`)
