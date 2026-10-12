// MAP-018 / IDEA-20261012-01: preparation only, no guest/provider dispatch.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
const name=process.argv[2]
assert.match(name||'',/^oci-imported-media\d{2}$/)
const r=spawnSync(process.execPath,['scripts/prepare-imported-media-fixture.mjs','--case='+name,'--product-master-recovery-transport','--prepare-only'],{windowsHide:true,encoding:'utf8',maxBuffer:1024*1024})
assert.equal(r.status,0,r.stderr)
const helper=fs.readFileSync('.tools/probe-local-imported-media.mjs','utf8')
assert.ok(helper.includes('productMasterRecoveryTransport:true'),'Genuine Product Master recovery mode must be enabled')
assert.ok(helper.includes('stockRoleTransport:false'),'Do not repeat completed role diagnostic')
assert.ok(helper.includes('browserWorkflow:false'),'HTTP recovery is not rendered-browser qualification')
assert.ok(helper.includes('after-commit')&&helper.includes('before-dispatch'),'Both observed loss points must be prepared')
const derived=fs.readFileSync('.tools/derived-imported-media.mjs','utf8')
assert.ok(derived.includes('K2_PRODUCT_RECOVERY_RECEIPT_WITNESS_OK'),'Independent private receipt/event witness is required')
assert.ok(derived.includes('product_recovery_witness_status'),'Witness failure must not skip fixture restoration')
console.log(JSON.stringify({case:name,recoveryTransportPrepared:true,nativeVerified:false,providerWrites:false}))
