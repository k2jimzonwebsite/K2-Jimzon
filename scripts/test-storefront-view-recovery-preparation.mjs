// Execute the real preparer against retained inputs with every mutation intercepted.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const hash = value => createHash('sha256').update(value).digest('hex')
const preparer = fs.readFileSync('scripts/prepare-product-master-recovery-fixture.mjs', 'utf8')
const normalized = value => String(value).replaceAll('\\', '/')
const flags = ['--customer-tariff-transport', '--category-policy-transport', '--references', '--staff-stock']
async function capture(withView, source = preparer) {
  const files = new Map(), calls = []
  const key = value => normalized(value)
  const read = (value, encoding) => {
    const filename = key(value)
    let bytes = files.get(filename)
    if (bytes === undefined) {
      let retained = filename.replaceAll('oci-imported99', 'oci-imported76')
      if (filename.endsWith('/initramfs.cpio')) return Buffer.from('virtual unexecuted prefix')
      if (/\/(?:image-probe\.sh|init\.sh)$/.test(filename) || filename.endsWith('/run-oci-imported99.mjs')) retained = retained.replaceAll('oci-imported76', 'oci-imported75')
      if (filename.endsWith('/guarded-package.json') && !withView) retained = root + '/oci-imported56/guarded-package.json'
      bytes = fs.readFileSync(retained)
    }
    return encoding ? bytes.toString(encoding) : bytes
  }
  const virtualFs = {
    constants: fs.constants,
    existsSync: value => key(value).includes('oci-imported99') ? false : fs.existsSync(value),
    readFileSync: read,
    writeFileSync: (value, bytes) => files.set(key(value), Buffer.from(bytes)),
    mkdirSync: () => {},
    copyFileSync: (from, to) => files.set(key(to), read(from)),
    appendFileSync: (value, bytes) => files.set(key(value), Buffer.concat([read(value), bytes])),
  }
  globalThis.recoveryTestFs = virtualFs
  globalThis.recoveryTestSpawn = (command, args) => {
    calls.push({ command, args })
    if (command === 'tar.exe') files.set(key(args[1]), Buffer.from('virtual overlay'))
    return { status: 0, stderr: '' }
  }
  const originalArgv = process.argv
  process.argv = [process.execPath, 'virtual-preparer', 'oci-imported99', ...flags, ...(withView ? ['--storefront-view'] : [])]
  try {
    await import('data:text/javascript;base64,' + Buffer.from(source
      .replace("import fs from 'node:fs'", 'const fs=globalThis.recoveryTestFs')
      .replace("import {spawnSync} from 'node:child_process'", 'const spawnSync=globalThis.recoveryTestSpawn')
      + '\n// mode=' + withView).toString('base64'))
  } catch (error) {
    error.stack = 'Virtual preparation failed: ' + error.message
    throw error
  } finally {
    process.argv = originalArgv
    delete globalThis.recoveryTestFs
    delete globalThis.recoveryTestSpawn
  }
  return { files, calls, record: JSON.parse(files.get(root + '/oci-imported99/revised-qualification.json')) }
}
const next = await capture(true)
assert.equal(next.record.storefrontView, true)
assert.equal(next.record.nativeVerified, false)
assert.equal(next.record.pkgSqlSha256, '8ca8e22fedcae9fa63eaba682b897b2dcfaa0b817f3f1c7a010204314fa5dc99')
assert.equal(next.record.installedSchemaSha256, '1d7ff4a4339029a42786df660edf70a81c012132679219121ce350d0008aae2e')
assert.equal(next.record.physicalSelection.length, 151)
assert.ok(next.calls[0].args.includes('--storefront-view'))
const names = ['interruption', 'website-body-drift', 'website-owner-drift', 'website-invoker-drift',
  'website-barrier-drift', 'website-acl-drift', 'website-column-drift', 'website-missing-drift']
assert.deepEqual(next.record.controls.map(c => c.name), names)
const body = next.files.get(root + '/oci-imported99/staging/k2/revised-install-body.sql').toString()
const pkg = JSON.parse(fs.readFileSync(root + '/oci-imported76/guarded-package.json'))
assert.equal(body, pkg.sql.slice(pkg.sql.indexOf('begin;') + 6).replace(/\ncommit;\s*$/, ''))
for (const name of names) {
  const sql = next.files.get(root + '/oci-imported99/staging/k2/revised-' + name + '.sql').toString()
  assert.ok(sql.startsWith('begin;\n'))
  assert.ok(sql.includes('\\i /tmp/revised-install-body.sql'))
  assert.ok(sql.endsWith('\ncommit;\n'))
}
const runner = next.files.get(root + '/run-oci-imported99.mjs').toString()
for (const name of names) assert.ok(runner.includes('K2_REVISED_' + name.replaceAll('-', '_').toUpperCase() + '_FULL_RECOVERY_OK'))
for (const marker of ['K2_REFERENCE_RECOVERY_POPULATED_OK', 'K2_REFERENCE_RECOVERY_POPULATED_REPLAY_CONSERVED',
  'K2_REVISED_EMPTY_COLD_COMMIT_REPLAY_OK']) assert.ok(runner.includes(marker))
assert.equal(hash(next.files.get(root + '/oci-imported99/staging/k2/revised-cold-install.sql')), next.record.pkgSqlSha256)
const base = await capture(false)
assert.equal(base.record.pkgSqlSha256, 'e6eda8085254f27f0dd30c01f77c3a53bfc4a1652c59ad472a68558079bab052')
assert.equal(base.record.controls.length, 11)
assert.equal(base.calls[0].args.includes('--storefront-view'), false)
assert.ok(base.record.controls.every(c => !c.name.startsWith('website-')))
const priorSource = fs.readFileSync(root + '/oci-imported58/qualification-preparer-source.mjs', 'utf8')
const prior = await capture(false, priorSource)
for (const [filename, bytes] of prior.files) {
  if (filename.endsWith('.sql') || filename.endsWith('/image-probe.sh') || filename.endsWith('/init.sh') || filename.endsWith('/run-oci-imported99.mjs')) {
    assert.deepEqual(base.files.get(filename), bytes, 'Unchanged stock recovery output: ' + filename)
  }
}
console.log(JSON.stringify({ passed: true, virtualOnly: true, providerWrites: false, viewControls: names.length,
  defaultStockControls: base.record.controls.length, defaultOutputsByteIdentical: true, physicalSelection: next.record.physicalSelection.length }))
