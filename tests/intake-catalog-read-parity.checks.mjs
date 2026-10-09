import test from 'node:test'
import assert from 'node:assert/strict'
import * as foundation from '../scripts/rehearse-intake-foundation.mjs'
const args={marker:'12345678-1234-4234-8234-123456789abc',dataDirectory:process.cwd().replaceAll('\\','/')+'/.tools/current-restore-20260929-pg-data'}
test('catalog read parity grants only authenticated SELECT behind exact clone guard',()=>{
 assert.equal(typeof foundation.buildCatalogReadRestoreParity,'function')
 const sql=foundation.buildCatalogReadRestoreParity(args)
 assert.ok(sql.includes('k2_stock_fixture.owner'))
 assert.deepEqual(sql.match(/GRANT[^;]+;/g),['GRANT SELECT ON TABLE public.products TO authenticated;'])
 assert.ok(!/CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|REVOKE|service_role/.test(sql))
})
for(const changed of [{marker:null},{dataDirectory:'C:/other'}])test('read parity refuses invalid owned target '+JSON.stringify(changed),()=>{
 assert.equal(typeof foundation.buildCatalogReadRestoreParity,'function')
 assert.throws(()=>foundation.buildCatalogReadRestoreParity({...args,...changed}),/INTAKE_REFERENCE_TARGET_INVALID/)
})
