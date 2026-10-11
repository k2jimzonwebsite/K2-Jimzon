// MAP-018 / IDEA-20261011-01: actual owned recovery preparation, no provider writes.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
const root='D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const name=process.argv[2]
assert.match(name||'',/^oci-imported\d{2}$/)
assert.ok(!fs.existsSync(path.join(root,name)))
const result=spawnSync(process.execPath,['scripts/prepare-product-master-recovery-fixture.mjs',name,'--customer-tariff-transport','--category-policy-transport','--references','--staff-stock'],{windowsHide:true,encoding:'utf8',maxBuffer:1024*1024})
assert.equal(result.status,0,result.stderr)
const record=JSON.parse(fs.readFileSync(path.join(root,name,'revised-qualification.json')))
assert.equal(record.pkgSqlSha256,'e6eda8085254f27f0dd30c01f77c3a53bfc4a1652c59ad472a68558079bab052','Recovery must cover accepted stock installer')
assert.equal(record.stockReads,true)
for(const fn of ['read-admin-product-stock-v1','read-admin-lot-snapshot-v1'])for(const kind of ['body','authority','acl','owner','settings'])assert.ok(record.controls.some(c=>c.name===fn+'-'+kind+'-drift'))
assert.equal(record.physicalSelection.length,151)
assert.equal(record.providerWrites,false);assert.equal(record.nativeVerified,false)
console.log(JSON.stringify({case:name,prepared:true,stockDriftCases:10,nativeVerified:false,providerWrites:false}))
