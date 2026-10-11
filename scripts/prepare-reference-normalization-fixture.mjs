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
const phase = process.argv.includes('--concurrency') ? 'concurrency'
  : process.argv.includes('--creation') ? 'creation' : 'normalization'
assert.ok(phase !== 'concurrency' || mode === 'green', 'Concurrency qualifies the existing creation component')
const extended = process.argv.includes('--extended-concurrency')
assert.ok(!extended || phase === 'concurrency')
const ordering = process.argv.includes('--ordering')
const orderingGreen = process.argv.includes('--ordering-green')
assert.ok(!ordering || phase === 'concurrency' && !extended)
assert.ok(!orderingGreen || ordering)
const target = path.resolve(root, caseName)
assert.equal(path.dirname(target), path.resolve(root))
assert.ok(!fs.existsSync(target), 'Fresh owned fixture required; never reuse a prior case')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const testFile = ordering ? 'tests/native/protected-reference-ordering.sh'
  : phase === 'concurrency' ? 'tests/native/protected-reference-concurrency.sh'
  : `tests/sql/protected-reference-${phase}.sql`
const sources = [testFile]
if (phase === 'concurrency') sources.push('tests/sql/protected-reference-concurrency-setup.sql')
if (extended) sources.push('tests/sql/protected-reference-authority.sql')
if (ordering) sources.push('tests/sql/protected-reference-ordering-setup.sql')
const installs = []
if (mode === 'green' || phase === 'creation') installs.push('supabase/prepared/protected_reference_normalization.sql')
if (mode === 'green' && phase !== 'normalization') installs.push('supabase/prepared/protected_reference_creation.sql')
sources.push(...installs)
for (const file of sources) assert.ok(fs.existsSync(file), file)
const result = spawnSync(process.execPath, ['scripts/prepare-imported-provider-fixture.mjs',
  `--case=${caseName}`, '--product-master-transport', '--customer-tariff-transport', '--category-policy-transport'],
{ windowsHide: true, encoding: 'utf8', maxBuffer: 1024 * 1024 })
assert.equal(result.status, 0, result.stderr)
assert.ok(!fs.existsSync(path.join(target, 'execution01')))
const stage = path.join(target, 'staging/k2')
const sql = fs.readFileSync(testFile, 'utf8')
const stagedTest = phase === 'concurrency' ? 'reference-concurrency-test.sh' : 'reference-normalization-test.sql'
fs.writeFileSync(path.join(stage, stagedTest), sql, { flag: 'wx' })
const added = [stagedTest]
if (phase === 'concurrency') {
  fs.copyFileSync('tests/sql/protected-reference-concurrency-setup.sql',path.join(stage,'reference-concurrency-setup.sql'),fs.constants.COPYFILE_EXCL)
  added.push('reference-concurrency-setup.sql')
}
if (extended) {
  fs.copyFileSync('tests/sql/protected-reference-authority.sql',path.join(stage,'reference-authority-test.sql'),fs.constants.COPYFILE_EXCL)
  added.push('reference-authority-test.sql')
}
if (ordering) {
  fs.copyFileSync('tests/sql/protected-reference-ordering-setup.sql',path.join(stage,'reference-ordering-setup.sql'),fs.constants.COPYFILE_EXCL)
  added.push('reference-ordering-setup.sql')
}
if (installs.length) {
  fs.writeFileSync(path.join(stage, 'reference-normalization-install.sql'),
    "begin;\nset local statement_timeout='10s';\nset local lock_timeout='2s';\n"
      + installs.map(file => fs.readFileSync(file, 'utf8')).join('\n') + '\ncommit;\n', { flag: 'wx' })
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
const marker = `K2_REFERENCE_${phase.toUpperCase()}`
const tests = (installs.length ? `${command('reference-normalization-install.sql')}\n` : '') + (mode === 'red'
  ? `set +e\n${command('reference-normalization-test.sql')} > /tmp/reference-normalization.log 2>&1\nreference_status=$?\nset -e\ncat /tmp/reference-normalization.log\n[ "$reference_status" -eq 3 ]\ngrep -q ${marker}_MISSING /tmp/reference-normalization.log\necho ${marker}_EXPECTED_RED_OK\n`
  : phase === 'concurrency' ? `${ordering ? `K2_REFERENCE_ORDERING_EXPECTATION=${orderingGreen ? 'green' : 'red'} ` : extended ? 'K2_REFERENCE_SCHEDULE_SET=extended ' : ''}/bin/sh /tmp/reference-concurrency-test.sh\n`
    : `${command('reference-normalization-test.sql')}\n`)
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
runner = runner.replace(oldMarker, `stdout.includes('${marker}_${mode === 'red' ? 'EXPECTED_RED_OK' : 'CHECKS_OK'}')`)
const oldScope = 'Complete guarded10s envelope/fresh/exact replay/cold archive recovery on actual local postgres target; provider physical/locale/project/host qualification separate'
assert.equal(runner.split(oldScope).length, 2)
runner = runner.replace(oldScope, `Owned reference ${phase} probe on captured PostgreSQL17.6; base/cold recovery retained; no whole revised installation or provider qualification`)
fs.writeFileSync(path.join(target, 'runner-source.mjs'), runner, { flag: 'wx' })
sources.push('scripts/prepare-reference-normalization-fixture.mjs', 'scripts/prepare-imported-provider-fixture.mjs')
const receipt = { owningMap: 'MAP-018', idea: 'IDEA-20261010-06', case: caseName, mode, phase, extended, ordering, orderingGreen,
  scope: `Owned captured PostgreSQL17.6 ${phase} probe, not whole revised installation qualification`,
  providerWrites: false, sources: sources.map(file => ({ file, sha256: sha(fs.readFileSync(file)) })),
  runnerSha256: sha(runner),
  initramfsSha256: sha(fs.readFileSync(path.join(target, 'initramfs.cpio'))),
  staged: [...added, 'init.sh', 'image-probe.sh'].map(file => ({ file, sha256: sha(fs.readFileSync(path.join(stage, file))) })) }
fs.writeFileSync(path.join(target, 'reference-probe-preparation.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ case: caseName, mode, prepared: true, providerWrites: false }))
