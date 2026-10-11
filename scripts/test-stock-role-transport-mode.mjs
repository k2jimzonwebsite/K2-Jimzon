// MAP-018: preparation must qualify protected reads without repeating UI.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
const name=process.argv[2]
assert.match(name||'',/^oci-imported-media\d{2}$/)
const r=spawnSync(process.execPath,['scripts/prepare-imported-media-fixture.mjs','--case='+name,'--stock-role-transport','--prepare-only'],{windowsHide:true,encoding:'utf8',maxBuffer:1024*1024})
assert.equal(r.status,0,r.stderr)
const source=fs.readFileSync('.tools/probe-local-imported-media.mjs','utf8')
assert.ok(source.includes('staffStock:true'),'Protected stock reads must be enabled')
assert.ok(source.includes('stockRoleTransport:true'),'Current-role transport must be enabled')
assert.ok(source.includes('browserWorkflow:false'),'No repeated browser prerequisites')
assert.ok(source.includes('browserInventory:false'),'Stock is created by existing signed command')
console.log(JSON.stringify({case:name,transportPrepared:true,nativeVerified:false,providerWrites:false}))
