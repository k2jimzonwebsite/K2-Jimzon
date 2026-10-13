// MAP-018 / IDEA-20261010-08. Preparation tests; native SQL proof is separate.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const input = {
  priorBytes: fs.readFileSync(root + '/oci-imported02/execution01/after-catalog.json'),
  correctedBytes: fs.readFileSync(root + '/oci-imported23/execution01/after-catalog.json'),
  packageBytes: fs.readFileSync(root + '/oci-imported19/guarded-package.json'),
  fragments: ['product_master', 'customer_tariff', 'category_policy'].map(name =>
    fs.readFileSync('supabase/prepared/' + name + '_version_conflict_transport.sql', 'utf8')),
  marker: '32c52df3-2642-4b5a-8b84-5c327824f4bc',
}
const prior = JSON.parse(input.priorBytes)
const corrected = JSON.parse(input.correctedBytes)
const pkg = JSON.parse(input.packageBytes)
const indices = prior.functions.flatMap((f, i) => f.definition !== corrected.functions[i].definition ? [i] : [])
let module
try { module = await import('./repair-envelope.mjs') } catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
}

test('reviewed repair preparation is available', () => {
  assert.equal(typeof module?.prepareRepairEnvelope, 'function', 'known-correction envelope is missing')
})

for (let mask = 0; mask < 8; mask++) {
  test('admits complete known catalog combination ' + mask, () => {
    assert.ok(module, 'known-correction envelope is missing')
    const prepared = module.prepareRepairEnvelope(input)
    const state = structuredClone(prior)
    indices.forEach((index, bit) => { if (mask & (1 << bit)) state.functions[index] = corrected.functions[index] })
    const result = prepared.classify(state, pkg.authority, pkg.managedAuthority)
    assert.equal(result.corrections.length, 3 - mask.toString(2).replaceAll('0', '').length)
    assert.equal(result.noOp, mask === 7)
  })
}

for (const [name, mutate] of [
  ['unknown target body', c => { c.functions[indices[0]].definition += '\n-- unknown' }],
  ['target owner', c => { c.functions[indices[0]].owner = 'authenticated' }],
  ['target ACL', c => { c.functions[indices[1]].catalog.proacl = null }],
  ['target settings', c => { c.functions[indices[2]].catalog.proconfig = ['search_path=public'] }],
  ['non-target definition', c => { c.functions.find((_, i) => !indices.includes(i)).definition += '\n-- drift' }],
  ['relation drift', c => { c.relations.pop() }],
]) test('refuses ' + name, () => {
  assert.ok(module, 'known-correction envelope is missing')
  const state = structuredClone(prior)
  mutate(state)
  assert.throws(() => module.prepareRepairEnvelope(input).classify(state, pkg.authority, pkg.managedAuthority), /SCHEMA_DRIFT/)
})

test('refuses global and managed authority drift', () => {
  assert.ok(module, 'known-correction envelope is missing')
  const prepared = module.prepareRepairEnvelope(input)
  const authority = structuredClone(pkg.authority)
  authority.roles.pop()
  assert.throws(() => prepared.classify(prior, authority, pkg.managedAuthority), /AUTHORITY_DRIFT/)
  const managed = { ...pkg.managedAuthority, sessionPreloadLibraries: '' }
  assert.throws(() => prepared.classify(prior, pkg.authority, managed), /MANAGED_AUTHORITY_DRIFT/)
})

test('refuses altered reviewed bytes and invalid owned marker', () => {
  assert.ok(module, 'known-correction envelope is missing')
  for (const key of ['priorBytes', 'correctedBytes', 'packageBytes'])
    assert.throws(() => module.prepareRepairEnvelope({ ...input, [key]: Buffer.concat([input[key], Buffer.from(' ')]) }), /SOURCE_PIN/)
  const fragments = [...input.fragments]
  fragments[0] += '\n-- changed'
  assert.throws(() => module.prepareRepairEnvelope({ ...input, fragments }), /SOURCE_PIN/)
  assert.throws(() => module.prepareRepairEnvelope({ ...input, marker: "x';commit;" }), /OWNED_MARKER/)
})

test('generates one atomic local-only transaction reusing exact correction bytes', () => {
  assert.ok(module, 'known-correction envelope is missing')
  const { sql } = module.prepareRepairEnvelope(input)
  assert.match(sql, /^-- Disposable owned RAM qualification only\nBEGIN;/)
  assert.match(sql, /lock_timeout='2s';set local statement_timeout='10s'/)
  assert.match(sql, /data_directory.*\/tmp\/k2-managed-data/)
  assert.match(sql, /inet_server_addr\(\) is not null/)
  assert.match(sql, /shobj_description/)
  assert.match(sql, /pg_advisory_xact_lock\(1261585232,1347374169\)/)
  for (const fragment of input.fragments) assert.ok(sql.includes("EXECUTE '" + fragment.replaceAll("'", "''") + "';"))
  assert.match(sql, /K2_RETAINED_REPAIR_POSTCONDITION/)
  assert.ok(sql.endsWith('COMMIT;\n'))
  // The full catalog embeds retained function bodies as quoted data. Inspect
  // executable text, plus the exact correction fragments, rather than that data.
  const executable = [sql, ...input.fragments].map(s => s.replace(/'(?:''|[^'])*'/g, "''")).join('\n')
  assert.equal(/truncate table|disable trigger|delete\s+from/i.test(executable), false)
})

for (const faultAfter of [1, 2, 3]) test('fault follows an actual correction boundary ' + faultAfter, () => {
  assert.ok(module, 'known-correction envelope is missing')
  const { sql } = module.prepareRepairEnvelope({ ...input, faultAfter })
  assert.ok(sql.includes('v_executed=' + faultAfter))
  assert.ok(sql.indexOf('v_executed:=v_executed+1') > sql.indexOf("EXECUTE '-- IDEA"))
  assert.match(sql, /K2_RETAINED_REPAIR_INJECTED_FAULT/)
  assert.match(sql, /K2_RETAINED_REPAIR_FAULT_BOUNDARY_UNAVAILABLE/)
})

test('full snapshot discovers permanent physical data and all sequences without a selection allowlist', () => {
  assert.equal(typeof module?.retainedSnapshotSql, 'string', 'complete populated-state capture is missing')
  const sql = module.retainedSnapshotSql
  assert.match(sql, /relkind in \('r','p','m','S'\)/)
  assert.match(sql, /relpersistence<>'t'/)
  assert.match(sql, /to_jsonb\(t\)::text collate "C"/)
  assert.match(sql, /extensions\.digest/)
  assert.match(sql, /last_value::text.*is_called/)
  assert.equal(sql.includes("nspname in ('public'"), false)
  assert.match(sql, /SET TIME ZONE 'UTC'/)
})

const fixtureInput = {
  ...input,
  priorBytes: fs.readFileSync(root + '/retained-code-pair01/prior-catalog.json'),
  correctedBytes: fs.readFileSync(root + '/oci-retained-calibration01/execution01/retained-catalog-before.json'),
}
const fixturePrior = JSON.parse(fixtureInput.priorBytes)
const fixtureCorrected = JSON.parse(fixtureInput.correctedBytes)
const fixtureIndices = fixturePrior.functions.flatMap((f, i) => f.definition !== fixtureCorrected.functions[i].definition ? [i] : [])

// Complete current composition, with only the three reviewed prior definitions
// restored as a synthetic fault state. This is preparation, not native evidence.
const fullCorrectedBytes = fs.readFileSync('.tools/map018-controlled-native-20261012-10/committed-catalog.json')
const fullCorrected = JSON.parse(fullCorrectedBytes)
const fullPrior = structuredClone(fullCorrected)
const fullIndices = fixtureIndices.map(index => {
  const before = fixturePrior.functions[index]
  const fullIndex = fullPrior.functions.findIndex(f => f.identity === before.identity)
  assert.ok(fullIndex >= 0)
  fullPrior.functions[fullIndex].definition = before.definition
  return fullIndex
})
const fullInput = {
  ...input,
  priorBytes: Buffer.from(JSON.stringify(fullPrior, null, 2) + '\n'),
  correctedBytes: fullCorrectedBytes,
  packageBytes: fs.readFileSync(root + '/oci-imported76/guarded-package.json'),
}
const fullPackage = JSON.parse(fullInput.packageBytes)

for (let mask = 0; mask < 8; mask++) test('complete installation profile admits known combination ' + mask, () => {
  const state = structuredClone(fullPrior)
  fullIndices.forEach((index, bit) => {
    if (mask & (1 << bit)) state.functions[index].definition = fullCorrected.functions[index].definition
  })
  const prepared = module.prepareRepairEnvelope(fullInput)
  const result = prepared.classify(state, fullPackage.authority, fullPackage.managedAuthority)
  assert.equal(result.corrections.length, 3 - mask.toString(2).replaceAll('0', '').length)
  assert.equal(result.noOp, mask === 7)
  assert.equal(prepared.runtimeExecuted, false)
  assert.equal(prepared.providerWrites, false)
})

test('complete and earlier profiles refuse cross-profile package bytes', () => {
  for (const changed of [
    { ...fullInput, packageBytes: input.packageBytes },
    { ...input, packageBytes: fullInput.packageBytes },
    { ...fixtureInput, packageBytes: fullInput.packageBytes },
    { ...fullInput, correctedBytes: fixtureInput.correctedBytes },
    { ...fullInput, priorBytes: Buffer.concat([fullInput.priorBytes, Buffer.from(' ')]) },
  ]) assert.throws(() => module.prepareRepairEnvelope(changed), /SOURCE_PIN/)
})

test('complete profile refuses body, metadata and authority drift', () => {
  const prepared = module.prepareRepairEnvelope(fullInput)
  for (const mutate of [
    c => { c.functions[fullIndices[0]].definition += '\n-- unknown' },
    c => { c.functions[fullIndices[0]].owner = 'authenticated' },
    c => { c.functions[fullIndices[1]].catalog.proacl = null },
    c => { c.functions[fullIndices[2]].catalog.proconfig = ['search_path=public'] },
    c => { c.relations.pop() },
  ]) {
    const state = structuredClone(fullCorrected)
    mutate(state)
    assert.throws(() => prepared.classify(state, fullPackage.authority, fullPackage.managedAuthority), /SCHEMA_DRIFT/)
  }
  const authority = structuredClone(fullPackage.authority)
  authority.roles.pop()
  assert.throws(() => prepared.classify(fullCorrected, authority, fullPackage.managedAuthority), /AUTHORITY_DRIFT/)
  assert.throws(() => prepared.classify(fullCorrected, fullPackage.authority, { ...fullPackage.managedAuthority, sessionPreloadLibraries: '' }), /MANAGED_AUTHORITY_DRIFT/)
})

for (let mask = 0; mask < 8; mask++) test('exact calibrated request fixture admits known combination ' + mask, () => {
  const state = structuredClone(fixturePrior)
  fixtureIndices.forEach((index, bit) => { if (mask & (1 << bit)) state.functions[index] = fixtureCorrected.functions[index] })
  const result = module.prepareRepairEnvelope(fixtureInput).classify(state, pkg.authority, pkg.managedAuthority)
  assert.equal(result.corrections.length, 3 - mask.toString(2).replaceAll('0', '').length)
  assert.equal(result.noOp, mask === 7)
})

test('fixed catalog profiles cannot be mixed or altered', () => {
  for (const changed of [
    { ...input, correctedBytes: fixtureInput.correctedBytes },
    { ...fixtureInput, correctedBytes: input.correctedBytes },
    { ...fixtureInput, correctedBytes: Buffer.concat([fixtureInput.correctedBytes, Buffer.from(' ')]) },
  ]) assert.throws(() => module.prepareRepairEnvelope(changed), /SOURCE_PIN/)
})

for (const [name, mutate] of [
  ['telemetry table removed', c => { c.relations = c.relations.filter(r => r.name !== 'k2_private.security_events') }],
  ['telemetry function owner', c => { c.functions.find(f => f.catalog.proname === 'record_security_event_v1').owner = 'authenticated' }],
  ['preauth ACL', c => { c.functions.find(f => f.catalog.proname === 'consume_admin_preauth_rate_v1').catalog.proacl = null }],
  ['existing session definition', c => { c.functions.find(f => f.catalog.proname === 'execute_admin_session_command_v1').definition += '\n-- drift' }],
  ['Auth foreign-key trigger', c => { c.relations.find(r => r.name === 'auth.users').internalTriggers.pop() }],
]) test('calibrated fixture refuses ' + name, () => {
  const state = structuredClone(fixtureCorrected)
  mutate(state)
  assert.throws(() => module.prepareRepairEnvelope(fixtureInput).classify(state, pkg.authority, pkg.managedAuthority), /SCHEMA_DRIFT/)
})
