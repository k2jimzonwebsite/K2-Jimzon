// Focused preparation contracts against retained actual packages, not native acceptance.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { providerOperatingReplayPackage } from '../docs/evidence/20261004-category-shelf-life/operating-replay-package.mjs'
import { providerDeliveryFragments } from '../docs/evidence/20261004-category-shelf-life/build-express-delivery.mjs'

const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const packagePath = root + '/oci-envelope12/guarded-package.json'
const available = fs.existsSync(packagePath)
function inputs() {
  const original = JSON.parse(fs.readFileSync(packagePath))
  const before = JSON.parse(fs.readFileSync(root + '/oci-envelope12/execution01/before-catalog.json'))
  const after = JSON.parse(fs.readFileSync(root + '/oci-envelope12/execution01/after-catalog.json'))
  const authoritySql = original.sql.match(/if \((select jsonb_build_object\('roles',[\s\S]*?)\) is distinct from /)?.[1]
  assert.ok(authoritySql)
  const contractSql = fs.readFileSync('supabase/prepared/category_operating_schema_contract.sql', 'utf8').replace(/^--[^\n]*\n/gm, '').trim().replace(/;$/, '')
  const base = providerDeliveryFragments({ isolateFunctionDefaults:true, preserveCapturedStockViewAcl:true,
    preserveCapturedHandoverAcl:true, preserveCapturedReleaseAcls:true, preserveCapturedCompatibilityTriggerAcl:true,
    preserveCapturedReceivingAcls:true, preserveCapturedStaffAcls:true, financialRoleLock:true, boundedReferenceSeed:true })
  const source = fs.readFileSync('supabase/prepared/imported_draft_continuation.sql', 'utf8')
  const imported = source.slice(source.indexOf('\nbegin;') + 1).replace(/^begin;/, '').replace(/commit;\s*$/, '')
  return { original, imported, args:{ contractSql,before,after,fragments:base.fragments,
    authoritySql,authority:original.authority,serverVersion:'170006',managedAuthority:original.managedAuthority,qualifiedPlatformBarrier:true } }
}
test('old captured-authority envelope remains byte-identical', { skip:!available }, () => {
  const { original,args } = inputs()
  assert.equal(providerOperatingReplayPackage(args).sql, original.sql)
})
test('exact imported union admits preparation without broadening protected-table locks', { skip:!available }, () => {
  const { args,imported } = inputs()
  const prepared = providerOperatingReplayPackage({ ...args,fragments:[...args.fragments,imported] })
  assert.equal(prepared.protectedPlatformTables.length, 7)
  assert.equal(prepared.cutoverTables.length, 81)
  assert.equal(prepared.requiresConnectorProjectBinding, true)
})
test('changed imported payload and unknown extra fragments still refuse', { skip:!available }, () => {
  const { args,imported } = inputs()
  for (const fragments of [[...args.fragments,imported+'\n-- changed'],[...args.fragments,imported,'select 1;']]) {
    assert.throws(() => providerOperatingReplayPackage({ ...args,fragments }), /PROVIDER_PLATFORM_BARRIER_CONTENTS_DRIFT/)
  }
})
test('pinned imported payload cannot conceal protected metadata drift', { skip:!available }, () => {
  const { args,imported } = inputs(), after = structuredClone(args.after)
  after.relations.find(r => r.name === 'auth.schema_migrations').rls = false
  assert.throws(() => providerOperatingReplayPackage({ ...args,after,fragments:[...args.fragments,imported] }), /PROVIDER_PLATFORM_BARRIER_METADATA_DRIFT/)
})

test('exact Master tariff category union admits guarded preparation', { skip:!available }, () => {
  const { args,imported } = inputs()
  const overlays = ['product_master', 'customer_tariff', 'category_policy'].map(name =>
    fs.readFileSync('supabase/prepared/'+name+'_version_conflict_transport.sql', 'utf8'))
  const fragments = [...args.fragments,imported,...overlays]
  const prepared = providerOperatingReplayPackage({ ...args,fragments })
  assert.equal(prepared.protectedPlatformTables.length, 7)
  assert.equal(prepared.cutoverTables.length, 81)
  assert.equal(prepared.requiresConnectorProjectBinding, true)
  for (let i=0;i<overlays.length;i++) {
    const changed = [...fragments]
    changed[args.fragments.length+1+i] += '\n-- changed'
    assert.throws(() => providerOperatingReplayPackage({ ...args,fragments:changed }), /PROVIDER_PLATFORM_BARRIER_CONTENTS_DRIFT/)
  }
})
