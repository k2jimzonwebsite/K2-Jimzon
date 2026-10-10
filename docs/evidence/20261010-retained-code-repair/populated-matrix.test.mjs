import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const priorBytes = fs.readFileSync(root + '/retained-code-pair01/prior-catalog.json')
const correctedBytes = fs.readFileSync(root + '/oci-retained-calibration01/execution01/retained-catalog-before.json')
const input = { priorBytes, correctedBytes,
  packageBytes: fs.readFileSync(root + '/oci-imported19/guarded-package.json'),
  fragments: ['product_master', 'customer_tariff', 'category_policy'].map(n => fs.readFileSync('supabase/prepared/' + n + '_version_conflict_transport.sql', 'utf8')),
  marker: '0b9bb642-ae60-4f1a-a9cb-00d4b3801c18' }
const load = async () => {
  try { return await import('./populated-matrix.mjs') }
  catch (error) { if (error.code === 'ERR_MODULE_NOT_FOUND') return {}; throw error }
}
test('matrix uses all eight exact known states and repeats each against full state', async () => {
  const { preparePopulatedMatrix } = await load()
  assert.equal(typeof preparePopulatedMatrix, 'function', 'native populated matrix missing')
  const matrix = preparePopulatedMatrix(input)
  assert.equal(matrix.states.length, 8)
  const before = JSON.parse(priorBytes), after = JSON.parse(correctedBytes)
  const changed = before.functions.filter((f, i) => f.definition !== after.functions[i].definition)
  assert.equal(changed.length, 3)
  for (const [mask, state] of matrix.states.entries()) {
    assert.equal(state.mask, mask)
    for (const [bit, f] of changed.entries()) {
      const corrected = after.functions.find(g => g.identity === f.identity)
      assert.ok(state.sql.includes((mask & (1 << bit) ? corrected : f).definition))
    }
    assert.ok(matrix.shell.includes('retained-state-' + mask + '-before.json'))
    assert.ok(matrix.shell.includes('retained-state-' + mask + '-after.json'))
    assert.ok(matrix.shell.includes('retained-state-' + mask + '-repeat.json'))
  }
  assert.equal(matrix.faults.length, 3)
  for (const fault of matrix.faults) assert.ok(fault.sql.includes('K2_RETAINED_REPAIR_INJECTED_FAULT'))
  assert.ok(matrix.shell.includes('K2_RETAINED_MATRIX_ALL8_OK'))
  assert.ok(matrix.shell.includes('cold-authority.sql'))
  assert.ok(!matrix.shell.includes('DROP TABLE') && !matrix.shell.includes('DISABLE TRIGGER'))
})
test('changed catalog/package inputs refuse before native files can be generated', async () => {
  const { preparePopulatedMatrix } = await load()
  assert.equal(typeof preparePopulatedMatrix, 'function', 'native populated matrix missing')
  assert.throws(() => preparePopulatedMatrix({ ...input, priorBytes: Buffer.from('{}') }), /SOURCE_PIN/)
  assert.throws(() => preparePopulatedMatrix({ ...input, packageBytes: Buffer.from('{}') }), /SOURCE_PIN/)
})
