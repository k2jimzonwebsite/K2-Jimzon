// MAP-018 / IDEA-20261009-11. Observe exact prepared installer; no provider path.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { instrumentInstallerTimingProbe, instrumentInstallerTimingRunner } from './installer-timing-diagnostic.mjs'
const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc', name = process.argv[2]
assert.match(name || '', /^oci-imported\d{2}$/)
assert.ok(!fs.existsSync(path.join(root, name)), 'Fresh owned fixture required')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const preparation = spawnSync(process.execPath, ['scripts/prepare-imported-provider-fixture.mjs', '--case=' + name,
  '--product-master-transport', '--customer-tariff-transport', '--category-policy-transport', '--references', '--staff-stock', '--storefront-view'],
  { windowsHide: true, encoding: 'utf8', maxBuffer: 1024 * 1024 })
assert.equal(preparation.status, 0, preparation.stderr)
const dir = path.join(root, name), stage = path.join(dir, 'staging/k2')
const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'guarded-package.json')))
assert.equal(hash(pkg.sql), '8ca8e22fedcae9fa63eaba682b897b2dcfaa0b817f3f1c7a010204314fa5dc99')
const probePath = path.join(stage, 'image-probe.sh'), runnerPath = path.join(root, 'run-' + name + '.mjs')
const originalProbe = fs.readFileSync(probePath, 'utf8'), originalRunner = fs.readFileSync(runnerPath, 'utf8')
const probe = instrumentInstallerTimingProbe(originalProbe), runner = instrumentInstallerTimingRunner(originalRunner)
fs.writeFileSync(probePath, probe); fs.writeFileSync(runnerPath, runner)
const overlayStage = path.join(dir, 'timing-staging')
fs.mkdirSync(path.join(overlayStage, 'k2'), { recursive: true })
fs.copyFileSync(probePath, path.join(overlayStage, 'k2/image-probe.sh'), fs.constants.COPYFILE_EXCL)
const overlay = path.join(dir, 'timing-overlay.cpio')
const tar = spawnSync('tar.exe', ['-cf', overlay, '--format=newc', '-C', overlayStage, 'k2'], { windowsHide: true, encoding: 'utf8' })
assert.equal(tar.status, 0, tar.stderr)
const initramfs = path.join(dir, 'initramfs.cpio'), prefixSha256 = hash(fs.readFileSync(initramfs))
fs.appendFileSync(initramfs, fs.readFileSync(overlay))
const sources = ['scripts/installer-timing-diagnostic.mjs', 'scripts/prepare-installer-timing-fixture.mjs']
for (const file of sources) fs.copyFileSync(file, path.join(dir, path.basename(file)), fs.constants.COPYFILE_EXCL)
fs.writeFileSync(path.join(dir, 'timing-preparation.json'), JSON.stringify({ owningMap: 'MAP-018', idea: 'IDEA-20261009-11',
  providerWrites: false, case: name, prepared: true, nativeVerified: false, pkgSqlSha256: hash(pkg.sql),
  originalProbeSha256: hash(originalProbe), originalRunnerSha256: hash(originalRunner), probeSha256: hash(probe), runnerSha256: hash(runner),
  prefixSha256, overlaySha256: hash(fs.readFileSync(overlay)), sourcePins: Object.fromEntries(sources.map(file => [file, hash(fs.readFileSync(file))])),
  scope: 'Exact installer SQL/role/guards/deadlines; host/guest timing/resource observations and terse client error display only. Full acceptance pending.' }, null, 2), { flag: 'wx' })
console.log(JSON.stringify({ prepared: true, case: name, sqlSha256: hash(pkg.sql), providerWrites: false, nativeVerified: false }))
