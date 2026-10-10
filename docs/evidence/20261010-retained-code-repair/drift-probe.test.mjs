import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const input = {
  priorBytes: fs.readFileSync(root + '/retained-code-pair01/prior-catalog.json'),
  correctedBytes: fs.readFileSync(root + '/oci-retained-calibration01/execution01/retained-catalog-before.json'),
  packageBytes: fs.readFileSync(root + '/oci-imported19/guarded-package.json'),
  fragments: ['product_master', 'customer_tariff', 'category_policy'].map(n => fs.readFileSync('supabase/prepared/' + n + '_version_conflict_transport.sql', 'utf8')),
  marker: '4b9bb642-ae60-4f1a-a9cb-00d4b3801c18',
}
const load = async () => { try { return await import('./drift-probe.mjs') } catch (e) { if (e.code === 'ERR_MODULE_NOT_FOUND') return {}; throw e } }
test('five actual drift setups retain refusal state and restore exact baseline', async () => {
  const { prepareDriftProbe } = await load()
  assert.equal(typeof prepareDriftProbe, 'function', 'native drift witness missing')
  const probe = prepareDriftProbe(input)
  assert.deepEqual(probe.cases.map(c => c.name), ['body', 'owner', 'acl', 'search-path', 'schema'])
  for (const c of probe.cases) {
    assert.ok(c.setup.includes(input.marker) && c.restore.includes(input.marker))
    assert.ok(probe.shell.includes('retained-drift-' + c.name + '-before.json'))
    assert.ok(probe.shell.includes('retained-drift-' + c.name + '-after.json'))
    assert.ok(probe.shell.includes('K2_RETAINED_DRIFT_' + c.name.toUpperCase().replace('-', '_') + '_REFUSED_CONSERVED'))
  }
  assert.ok(probe.cases[0].setup.includes('-- MAP018 unexpected body drift'))
  assert.ok(probe.cases[1].setup.includes('OWNER TO supabase_admin'))
  assert.ok(probe.cases[2].setup.includes('TO anon'))
  assert.ok(probe.cases[3].setup.includes('search_path = public'))
  assert.ok(probe.cases[4].setup.includes('CREATE TABLE public.k2_retained_unknown_schema'))
  assert.equal((probe.shell.match(/K2_RETAINED_REPAIR_SCHEMA_DRIFT/g) || []).length, 5)
  assert.ok(probe.shell.includes('[ "$refusal_exit" = 3 ]'))
  assert.ok(!probe.shell.includes('! cmp -s'))
  assert.ok(probe.shell.includes('[ "$catalog_compare_exit" = 1 ]'), 'require an actual difference; comparison I/O errors must refuse')
  assert.ok(!probe.shell.includes('retained-state-0.sql'), 'passing known-state matrix must not be repeated')
})
test('altered inputs refuse before drift SQL generation', async () => {
  const { prepareDriftProbe } = await load()
  assert.equal(typeof prepareDriftProbe, 'function', 'native drift witness missing')
  assert.throws(() => prepareDriftProbe({ ...input, correctedBytes: Buffer.from('{}') }), /SOURCE_PIN/)
})
