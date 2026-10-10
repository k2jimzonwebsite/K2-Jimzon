// MAP-018 / IDEA-20261009-11. Owned fixture preparation, never provider dispatch.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const caseName = process.argv.find(a => a.startsWith('--case='))?.slice(7) || 'oci-imported01'
const productMasterTransport = process.argv.includes('--product-master-transport')
const customerTariffTransport = process.argv.includes('--customer-tariff-transport')
if (!/^oci-imported\d{2}$/.test(caseName)) throw Error('OWNED_IMPORTED_FIXTURE_NAME_REQUIRED')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const sourcePath = path.join(root, 'oci-envelope12/preparer-source.mjs')
const source = fs.readFileSync(sourcePath, 'utf8')
assert.equal(sha(source), '2f6942385816d838cdc61fe628b6d2e96c08b1df9f4dc302027d3cd5d7d1325c')
const fragmentPath = 'supabase/prepared/imported_draft_continuation.sql'
const fragment = fs.readFileSync(fragmentPath, 'utf8')
assert.equal(sha(fragment), '26ec4db009173aef02e3954504c05991937fb4d503769fc5133f3ebaa999d52a')
const providerPath = path.join(root, 'oci-envelope12/execution01/after-catalog.json')
assert.equal(sha(fs.readFileSync(providerPath)), 'abb347eb1c28ff7e42368d97a1aca7f7dea6b71a38c2abf2b3b93d6794917c62')
const unionPath = path.join(root, 'imported-draft-025b3682-3b76-465e-bd2a-5c2c0c597314/combined-imported-install.sql')
const union = fs.readFileSync(unionPath, 'utf8')
assert.equal(sha(union), 'abc2abd5d685913d07508bd704aa1ecc0a29c6b0bae0f870cb47cb5ca82f85d5')
function literal(sql, anchor) {
  const start = sql.indexOf(anchor)
  assert.ok(start >= 0)
  let i = start + anchor.length, value = ''
  assert.equal(sql[i++], "'")
  for (; i < sql.length; i++) {
    if (sql[i] !== "'") { value += sql[i]; continue }
    if (sql[i + 1] === "'") { value += "'"; i++; continue }
    return JSON.parse(value)
  }
  throw Error('IMPORTED_CONTRACT_LITERAL_REQUIRED')
}
const importedAfter = literal(union, 'v_after constant jsonb:=')[0]
const providerAfter = JSON.parse(fs.readFileSync(providerPath))
const calibrationBefore = path.join(root, 'oci-baseline14/execution01/before-catalog.json')
const calibrationAfter = path.join(root, 'oci-baseline14/execution01/after-catalog.json')
assert.equal(sha(fs.readFileSync(calibrationBefore)), '87941b6c79455be42391d9fb2b9a02eebc650f9ee6b1124b9aac2509526ff963')
assert.deepEqual(JSON.parse(fs.readFileSync(calibrationAfter)), providerAfter)
const originalPackagePath = path.join(root, 'oci-envelope12/guarded-package.json')
assert.equal(sha(fs.readFileSync(originalPackagePath)), 'fa0ef714dd5d3582a8b99a57faa1cef1cb4ad0a56fffbfeee0442d3d8692a55b')
const originalPackage = JSON.parse(fs.readFileSync(originalPackagePath))
const authorityPath = path.join(root, 'provider-admission-20261008/authority-inventory.json')
const authorityCapture = JSON.parse(fs.readFileSync(authorityPath))
assert.deepEqual({ roles: authorityCapture.roles, memberships: authorityCapture.memberships, eventTriggers: authorityCapture.eventTriggers }, originalPackage.authority)
const managedPath = path.join(root, 'provider-admission-20261008/provider-managed-ddl-authority.json')
assert.deepEqual(JSON.parse(fs.readFileSync(managedPath)).managed_ddl_authority, originalPackage.managedAuthority)
const body = f => {
  const match = f.definition.match(/\bAS (\$[^$]*\$)([\s\S]*)\1/)
  assert.ok(match, f.identity)
  return match[2]
}
const transitions = [
  ['create_product_draft_server', 'e0ae0726b5d19da69a023eb59bc98722'],
  ['execute_admin_product_intake_command_v1', 'd0c8b9094f90c57f1893fca4d4c91806'],
  ['execute_admin_intake_ai_v1', 'acde04b0dbcaa3b5c02283c63a185320'],
]
const expected = structuredClone(providerAfter)
for (const [name, beforeMd5] of transitions) {
  const current = expected.functions.find(f => f.catalog.proname === name)
  const replacement = importedAfter.functions.find(f => f.identity === current.identity)
  assert.equal(createHash('md5').update(body(current).replaceAll('\r', '')).digest('hex'), beforeMd5)
  assert.deepEqual({ ...current, definition: null }, { ...replacement, definition: null })
  assert.equal(current.definition.split(body(current)).length, 2)
  current.definition = current.definition.replace(body(current), () => body(replacement))
}
const helper = importedAfter.functions.find(f => f.catalog.proname === 'assert_imported_draft_target_v1')
assert.ok(helper)
assert.deepEqual(helper.catalog.proacl, ['postgres=X/postgres'])
assert.ok(!expected.functions.some(f => f.identity === helper.identity))
const position = expected.functions.findIndex(f => f.catalog.proname === 'assert_express_order_v1')
assert.ok(position >= 0 && expected.functions[position + 1].catalog.proname === 'clear_category_lot_context_v1')
expected.functions.splice(position + 1, 0, helper)
assert.equal(expected.functions.length, providerAfter.functions.length + 1)
const transportPath = 'supabase/prepared/product_master_version_conflict_transport.sql'
let transport = ''
if (productMasterTransport) {
  transport = fs.readFileSync(transportPath, 'utf8')
  assert.equal(sha(transport), 'ef4442fe9d6ebba0bd557e9a53bf25e75c78585d91a1cd54f910b02fd78d8476')
  const master = expected.functions.find(f => f.catalog.proname === 'execute_admin_product_master_command_v1')
  assert.equal(sha(master.definition), 'b9553f8fc638395ce9b5db66197eeaa8b1a9271b218c73dececffae7fefa78d2')
  const anchor = "raise exception using errcode='40001',message='K2_ADMIN_PRODUCT_VERSION_CONFLICT';"
  assert.equal(master.definition.split(anchor).length, 2)
  master.definition = master.definition.replace(anchor, anchor.replace('40001', 'P0001'))
  assert.equal(sha(master.definition), 'c7e9f53fe80c68ce99401caf10d31f4ee272bd506a0c0f3bc7f6363c97f38b94')
}
const tariffTransportPath = 'supabase/prepared/customer_tariff_version_conflict_transport.sql'
let tariffTransport = ''
if (customerTariffTransport) {
  tariffTransport = fs.readFileSync(tariffTransportPath, 'utf8')
  assert.equal(sha(tariffTransport), 'efe76030dfc116ace181492b02d03cacf4a5e7140ecb30141575a6d2ea8ed166')
  const tariff = expected.functions.find(f => f.catalog.proname === 'execute_customer_delivery_rates_v1')
  assert.equal(sha(tariff.definition), '15f0d4d3373ae753c062d37c70d91def0dc6bb1d292f99f6935e2d2db26fbb81')
  const anchor = "raise exception using errcode='40001',message='K2_CUSTOMER_TARIFF_VERSION_STALE';"
  assert.equal(tariff.definition.split(anchor).length, 2)
  tariff.definition = tariff.definition.replace(anchor, anchor.replace('40001', 'P0001'))
}

let derived = source.replaceAll('oci-envelope12', caseName)
for (const module of ['operating-replay-package.mjs', 'build-express-delivery.mjs']) {
  derived = derived.replace('../20261004-category-shelf-life/' + module,
    pathToFileURL(path.resolve('docs/evidence/20261004-category-shelf-life/' + module)).href)
}
const afterAnchor = "const fixed=providerDeliveryFragments("
assert.equal(derived.split(afterAnchor).length, 2)
derived = derived.replace(afterAnchor, () => 'after.functions=' + JSON.stringify(expected.functions) + ';\n' + afterAnchor)
assert.equal(derived.split('fragments:fixed.fragments').length, 2)
const fragmentStart = fragment.indexOf('\nbegin;')
assert.ok(fragmentStart >= 0 && fragment.split('\nbegin;').length === 2 && /commit;\s*$/.test(fragment))
const importedBody = fragment.slice(fragmentStart + 1).replace(/^begin;/, '').replace(/commit;\s*$/, '')
derived = derived.replace('fragments:fixed.fragments', () => 'fragments:[...fixed.fragments,' + JSON.stringify(importedBody) + (productMasterTransport ? ',' + JSON.stringify(transport) : '') + (customerTariffTransport ? ',' + JSON.stringify(tariffTransport) : '') + ']')
const generated = path.join(root, 'prepare-' + caseName + '.mjs')
assert.ok(!fs.existsSync(path.join(root, caseName)) && !fs.existsSync(generated))
fs.writeFileSync(generated, derived, { flag: 'wx' })
const execution = spawnSync(process.execPath, [generated], { windowsHide: true, encoding: 'utf8', maxBuffer: 1024 * 1024 })
if (execution.status !== 0) throw Error(execution.stderr || 'IMPORTED_FIXTURE_PREPARATION_FAILED')
const out = path.join(root, caseName)
fs.copyFileSync(generated, path.join(out, 'preparer-source.mjs'), fs.constants.COPYFILE_EXCL)
const record = {
  owningMap: 'MAP-018', idea: productMasterTransport || customerTariffTransport ? 'IDEA-20261010-08' : 'IDEA-20261009-11', providerWrites: false,
  scope: 'Prepared captured-authority fixture; native execution and provider acceptance unverified',
  sources: [sourcePath, fragmentPath, providerPath, unionPath, calibrationBefore, calibrationAfter,
    originalPackagePath, authorityPath, managedPath, 'scripts/prepare-imported-provider-fixture.mjs',
    'docs/evidence/20261004-category-shelf-life/operating-replay-package.mjs',
    ...(productMasterTransport ? [transportPath] : []), ...(customerTariffTransport ? [tariffTransportPath] : [])]
    .map(file => ({ file, sha256: sha(fs.readFileSync(file)) })),
  transitions: transitions.map(([name, beforeMd5]) => ({ name, beforeMd5 })),
  helper: helper.identity, expectedAfterSha256: sha(JSON.stringify(expected)),
  derivedSourceSha256: sha(derived),
}
fs.writeFileSync(path.join(out, 'imported-composition.json'), JSON.stringify(record, null, 2), { flag: 'wx' })
console.log(execution.stdout.trim())
console.log(JSON.stringify({ prepared: true, caseName, providerWrites: false, nativeVerified: false }))
