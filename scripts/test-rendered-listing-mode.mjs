// MAP-018 / IDEA-20261012-01. Preparation contract; no native/provider dispatch.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
const source=fs.readFileSync('scripts/prepare-imported-media-fixture.mjs','utf8')
assert.ok(source.includes("process.argv.includes('--browser-listing')"),'Rendered listing must be an explicit opt-in')
const name=process.argv[2]
const customer=process.argv.includes('--customer')
if(customer)assert.ok(source.includes("process.argv.includes('--browser-customer')"),'Customer continuation must be explicit')
if(customer)assert.ok(source.includes('customerVisibilitySql'),'Existing narrow Website projection prerequisite must be prepared and recovered')
if(customer)assert.ok(source.includes('customerPrerequisitesAfterSchemaCapture'),'Temporary Website prerequisite must follow original schema capture')
assert.match(name||'',/^oci-imported-media\d{2}$/)
const run=spawnSync(process.execPath,['scripts/prepare-imported-media-fixture.mjs','--case='+name,customer?'--browser-customer':'--browser-listing','--prepare-only'],{windowsHide:true,encoding:'utf8',maxBuffer:1024*1024})
assert.equal(run.status,0,run.stderr)
const helper=fs.readFileSync('.tools/probe-local-imported-media.mjs','utf8')
for(const flag of ['browserListing:true','browserWorkflow:true','browserInventory:true','productMasterRecoveryTransport:false'])assert.ok(helper.includes(flag),flag)
const derived=fs.readFileSync('.tools/derived-imported-media.mjs','utf8')
assert.ok(derived.includes('rendered-listing-browser-probe.inc.mjs'),'Continuation must be pinned')
if(customer){assert.ok(helper.includes('browserCustomer:true'));assert.ok(derived.includes('storefront-fixture-worker.mjs'));assert.ok(derived.includes('guest_bff_secrets'));assert.ok(derived.includes('rendered-customer-browser-probe.inc.mjs'))}
console.log(JSON.stringify({case:name,renderedListingPrepared:true,nativeVerified:false,providerWrites:false}))
