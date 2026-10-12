// MAP-018 / IDEA-20261009-11. Owned native calibration, never provider dispatch.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { storefrontViewSource } from './storefront-view-source.mjs'

const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const name = process.argv[2]
assert.match(name || '', /^oci-imported\d{2}$/)
assert.ok(!fs.existsSync(path.join(root, name)), 'Fresh owned fixture required')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const migrationPath = 'supabase/migrations/20260929_channel_listing_slices.sql'
const viewSql = storefrontViewSource(fs.readFileSync(migrationPath, 'utf8'))
const basePath = path.join(root, 'oci-imported56/execution01/after-catalog.json')
assert.equal(hash(fs.readFileSync(basePath)), 'f29a086264ad7b166f7a098af8aefb619d70297e597b40956af48912729ca03b')
const preparation = spawnSync(process.execPath, ['scripts/prepare-imported-provider-fixture.mjs', '--case=' + name,
  '--product-master-transport', '--customer-tariff-transport', '--category-policy-transport', '--references', '--staff-stock'],
{ windowsHide: true, encoding: 'utf8', maxBuffer: 1024 * 1024 })
assert.equal(preparation.status, 0, preparation.stderr)
const dir = path.join(root, name), stage = path.join(dir, 'staging/k2')
const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'guarded-package.json')))
assert.equal(hash(pkg.sql), 'e6eda8085254f27f0dd30c01f77c3a53bfc4a1652c59ad472a68558079bab052')
const catalog = fs.readFileSync(path.join(stage, 'race-catalog.sql'), 'utf8')
const file = 'storefront-view-calibrate.sql'
fs.writeFileSync(path.join(stage, file), "begin;set local statement_timeout='10s';set local lock_timeout='2s';\n"
  + "DO $absent$ BEGIN IF to_regclass('public.v_storefront_visible_skus') IS NOT NULL THEN RAISE EXCEPTION 'WEBSITE_VIEW_BASE_NOT_ABSENT'; END IF; END $absent$;\n"
  + viewSql + '\n\\o /tmp/k2-calibrated.json\n' + catalog + '\n\\o\nrollback;\n\\o /tmp/k2-view-rollback.json\n'
  + catalog + '\n\\o\n', { flag: 'wx' })
let probe = fs.readFileSync(path.join(stage, 'image-probe.sh'), 'utf8')
const anchor = "su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/full-contents.sql'"
assert.equal(probe.split(anchor).length, 2)
probe = probe.replace(anchor, () => anchor + "\nsu postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/" + file + "'\n"
  + 'cmp -s /tmp/k2-after.json /tmp/k2-view-rollback.json\nsha256sum /tmp/k2-after.json /tmp/k2-view-rollback.json\necho K2_STOREFRONT_VIEW_CALIBRATION_ROLLBACK_OK')
probe = probe.replace('echo K2_CATALOG_BEFORE_BEGIN', 'echo K2_CATALOG_CALIBRATED_BEGIN\n/bin/busybox base64 /tmp/k2-calibrated.json\necho K2_CATALOG_CALIBRATED_END\necho K2_CATALOG_BEFORE_BEGIN')
fs.writeFileSync(path.join(stage, 'image-probe.sh'), probe)
let init = fs.readFileSync(path.join(stage, 'init.sh'), 'utf8')
const launch = '/bin/busybox chroot /k2root /bin/sh /tmp/k2-image-probe.sh'
assert.equal(init.split(launch).length, 2)
init = init.replace(launch, '/bin/busybox cp /k2/' + file + ' /k2root/tmp/' + file + '\n' + launch)
fs.writeFileSync(path.join(stage, 'init.sh'), init)
const overlayStage = path.join(dir, 'view-calibration-staging'), overlayFiles = [file, 'init.sh', 'image-probe.sh']
fs.mkdirSync(path.join(overlayStage, 'k2'), { recursive: true })
for (const entry of overlayFiles) fs.copyFileSync(path.join(stage, entry), path.join(overlayStage, 'k2', entry), fs.constants.COPYFILE_EXCL)
const overlay = path.join(dir, 'view-calibration-overlay.cpio')
const tar = spawnSync('tar.exe', ['-cf', overlay, '--format=newc', '-C', overlayStage, 'k2'], { windowsHide: true, encoding: 'utf8' })
assert.equal(tar.status, 0, tar.stderr)
const initramfs = path.join(dir, 'initramfs.cpio'), prefixSha256 = hash(fs.readFileSync(initramfs))
fs.appendFileSync(initramfs, fs.readFileSync(overlay))
const runnerFile = path.join(root, 'run-' + name + '.mjs')
let runner = fs.readFileSync(runnerFile, 'utf8')
assert.equal(runner.split("['before','after','rollback']").length, 2)
runner = runner.replace("['before','after','rollback']", "['before','after','rollback','calibrated']")
runner = runner.replace('report.moduleGucs=', "report.moduleGucs=stdout.includes('K2_STOREFRONT_VIEW_CALIBRATION_ROLLBACK_OK')&&")
fs.writeFileSync(runnerFile, runner)
fs.copyFileSync('scripts/prepare-storefront-view-calibration-fixture.mjs', path.join(dir, 'view-calibration-preparer.mjs'), fs.constants.COPYFILE_EXCL)
fs.copyFileSync('scripts/storefront-view-source.mjs', path.join(dir, 'view-source.mjs'), fs.constants.COPYFILE_EXCL)
fs.writeFileSync(path.join(dir, 'view-calibration.json'), JSON.stringify({ owningMap: 'MAP-018', idea: 'IDEA-20261009-11',
  case: name, providerWrites: false, prepared: true, nativeVerified: false, prefixSha256,
  baseCatalogSha256: hash(fs.readFileSync(basePath)), viewSqlSha256: hash(viewSql), viewSqlBytes: Buffer.byteLength(viewSql),
  sourcePins: Object.fromEntries([migrationPath, 'scripts/storefront-view-source.mjs', 'scripts/prepare-storefront-view-calibration-fixture.mjs'].map(file => [file, hash(fs.readFileSync(file))])),
  overlaySha256: hash(fs.readFileSync(overlay)), files: Object.fromEntries(overlayFiles.map(file => [file, hash(fs.readFileSync(path.join(stage, file)))])),
  runnerSha256: hash(runner), scope: 'Only existing narrow view on accepted installer56; exact metadata delta and rollback calibration. Complete composition and provider acceptance remain unverified.' }, null, 2), { flag: 'wx' })
console.log(JSON.stringify({ prepared: true, case: name, providerWrites: false, nativeVerified: false }))
