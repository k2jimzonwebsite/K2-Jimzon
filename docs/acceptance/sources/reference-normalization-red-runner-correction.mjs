import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const target = root + '/oci-imported26'
assert.ok(!fs.existsSync(target + '/execution01'), 'Never modify an executed fixture')
const sha = value => createHash('sha256').update(value).digest('hex')
const before = fs.readFileSync(target + '/reference-probe-preparation.json')
const receipt = JSON.parse(before)
assert.equal(receipt.mode, 'red')
assert.equal(receipt.case, 'oci-imported26')
let runner = fs.readFileSync(root + '/run-oci-imported26.mjs', 'utf8')
const beforeRunnerSha256 = sha(runner)
const marker = "stdout.includes('K2_PROTECTED_CONCURRENT_DRIFT_REFUSED_AND_RECOVERED')"
assert.equal(runner.split(marker).length, 2)
runner = runner.replace(marker, "stdout.includes('K2_REFERENCE_NORMALIZATION_EXPECTED_RED_OK')")
const scope = 'Complete guarded10s envelope/fresh/exact replay/cold archive recovery on actual local postgres target; provider physical/locale/project/host qualification separate'
assert.equal(runner.split(scope).length, 2)
runner = runner.replace(scope, 'Owned reference normalization probe on captured PostgreSQL17.6; base/cold recovery retained; no whole revised installation or provider qualification')
fs.writeFileSync(target + '/runner-source.mjs', runner, { flag: 'wx' })
fs.writeFileSync(target + '/reference-probe-preparation.initial.json', before, { flag: 'wx' })
receipt.runnerSha256 = sha(runner)
receipt.preparationCorrection = { reason: 'Reviewed scoped runner marker/scope correction before first execution',
  beforeRunnerSha256, beforeReceiptSha256: sha(before),
  script: '.tools/finalize-reference-red-runner.mjs', scriptSha256: sha(fs.readFileSync(import.meta.filename)) }
receipt.sources.push(...['scripts/prepare-reference-normalization-fixture.mjs', 'scripts/prepare-imported-provider-fixture.mjs']
  .map(file => ({ file, sha256: sha(fs.readFileSync(file)) })))
fs.writeFileSync(target + '/reference-probe-preparation.json', JSON.stringify(receipt, null, 2) + '\n')
console.log(JSON.stringify({ case: receipt.case, runnerCorrected: true, notExecuted: true }))
