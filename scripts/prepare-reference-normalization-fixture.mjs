// MAP-018 / IDEA-20261010-06. Fresh owned RAM probe; no provider transport.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const caseName = process.argv.find(value => value.startsWith('--case='))?.slice(7)
assert.match(caseName || '', /^oci-imported\d{2}$/)
const mode = process.argv.includes('--red') ? 'red' : 'green'
const target = path.resolve(root, caseName)
assert.equal(path.dirname(target), path.resolve(root))
assert.ok(!fs.existsSync(target), 'Fresh owned fixture required; never reuse a prior case')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const testFile = 'tests/sql/protected-reference-normalization.sql'
const sources = [testFile]
if (mode === 'green') sources.push('supabase/prepared/protected_reference_normalization.sql')
for (const file of sources) assert.ok(fs.existsSync(file), file)
const result = spawnSync(process.execPath, ['scripts/prepare-imported-provider-fixture.mjs',
  `--case=${caseName}`, '--product-master-transport', '--customer-tariff-transport', '--category-policy-transport'],
{ windowsHide: true, encoding: 'utf8', maxBuffer: 1024 * 1024 })
assert.equal(result.status, 0, result.stderr)
assert.ok(!fs.existsSync(path.join(target, 'execution01')))
const stage = path.join(target, 'staging/k2')
const sql = fs.readFileSync(testFile, 'utf8')
fs.writeFileSync(path.join(stage, 'reference-normalization-test.sql'), sql, { flag: 'wx' })
const added = ['reference-normalization-test.sql']
if (mode === 'green') {
  fs.writeFileSync(path.join(stage, 'reference-normalization-install.sql'),
    "begin;\nset local statement_timeout='10s';\nset local lock_timeout='2s';\n"
      + fs.readFileSync(sources[1], 'utf8') + '\ncommit;\n', { flag: 'wx' })
  added.push('reference-normalization-install.sql')
}
const command = file => `su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/${file}'`
let probe = fs.readFileSync(path.join(stage, 'image-probe.sh'), 'utf8')
// Remove unrelated previously accepted concurrent-installer schedule. Keep exact
// captured restore/base installation and its original-row/cold recovery guards.
const raceStart = probe.indexOf(command('race-catalog.sql').replace('-U postgres', '-U supabase_admin'))
const raceEnd = probe.indexOf(command('original-row-projection.sql').replace('-U postgres', '-U supabase_admin'), raceStart)
assert.ok(raceStart > 0 && raceEnd > raceStart)
probe = probe.slice(0, raceStart) + probe.slice(raceEnd)
const anchor = 'echo K2_ALL88_COMMITTED_ORIGINAL_PROJECTIONS_OK\n'
assert.equal(probe.split(anchor).length, 2)
const tests = mode === 'red'
  ? `set +e\n${command('reference-normalization-test.sql')} > /tmp/reference-normalization.log 2>&1\nreference_status=$?\nset -e\ncat /tmp/reference-normalization.log\n[ "$reference_status" -eq 3 ]\ngrep -q K2_REFERENCE_NORMALIZATION_MISSING /tmp/reference-normalization.log\necho K2_REFERENCE_NORMALIZATION_EXPECTED_RED_OK\n`
  : `${command('reference-normalization-install.sql')}\n${command('reference-normalization-test.sql')}\n`
probe = probe.replace(anchor, anchor + tests)
fs.writeFileSync(path.join(stage, 'image-probe.sh'), probe)
let init = fs.readFileSync(path.join(stage, 'init.sh'), 'utf8')
const initAnchor = '/bin/busybox chroot /k2root /bin/sh /tmp/k2-image-probe.sh'
assert.equal(init.split(initAnchor).length, 2)
init = init.replace(initAnchor, added.map(file => `/bin/busybox cp /k2/${file} /k2root/tmp/${file}`).join('\n') + '\n' + initAnchor)
fs.writeFileSync(path.join(stage, 'init.sh'), init)
const overlayStage = path.join(target, 'reference-overlay-staging')
fs.mkdirSync(path.join(overlayStage, 'k2'), { recursive: true })
for (const file of [...added, 'init.sh', 'image-probe.sh']) {
  fs.copyFileSync(path.join(stage, file), path.join(overlayStage, 'k2', file), fs.constants.COPYFILE_EXCL)
}
const overlay = path.join(target, 'reference-overlay.cpio')
const tar = spawnSync('tar.exe', ['-cf', overlay, '--format=newc', '-C', overlayStage, 'k2'], { windowsHide: true, encoding: 'utf8' })
assert.equal(tar.status, 0, tar.stderr)
fs.appendFileSync(path.join(target, 'initramfs.cpio'), fs.readFileSync(overlay))
const runnerFile = path.join(root, `run-${caseName}.mjs`)
let runner = fs.readFileSync(runnerFile, 'utf8')
const oldMarker = "stdout.includes('K2_PROTECTED_CONCURRENT_DRIFT_REFUSED_AND_RECOVERED')"
assert.equal(runner.split(oldMarker).length, 2)
runner = runner.replace(oldMarker, `stdout.includes('${mode === 'red' ? 'K2_REFERENCE_NORMALIZATION_EXPECTED_RED_OK' : 'K2_REFERENCE_NORMALIZATION_CHECKS_OK'}')`)
const oldScope = 'Complete guarded10s envelope/fresh/exact replay/cold archive recovery on actual local postgres target; provider physical/locale/project/host qualification separate'
assert.equal(runner.split(oldScope).length, 2)
runner = runner.replace(oldScope, 'Owned reference normalization probe on captured PostgreSQL17.6; base/cold recovery retained; no whole revised installation or provider qualification')
fs.writeFileSync(path.join(target, 'runner-source.mjs'), runner, { flag: 'wx' })
sources.push('scripts/prepare-reference-normalization-fixture.mjs', 'scripts/prepare-imported-provider-fixture.mjs')
const receipt = { owningMap: 'MAP-018', idea: 'IDEA-20261010-06', case: caseName, mode,
  scope: 'Owned captured PostgreSQL17.6 normalization probe, not whole revised installation qualification',
  providerWrites: false, sources: sources.map(file => ({ file, sha256: sha(fs.readFileSync(file)) })),
  runnerSha256: sha(runner),
  initramfsSha256: sha(fs.readFileSync(path.join(target, 'initramfs.cpio'))),
  staged: [...added, 'init.sh', 'image-probe.sh'].map(file => ({ file, sha256: sha(fs.readFileSync(path.join(stage, file))) })) }
fs.writeFileSync(path.join(target, 'reference-probe-preparation.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ case: caseName, mode, prepared: true, providerWrites: false }))
