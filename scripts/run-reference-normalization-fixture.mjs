// MAP-018 / IDEA-20261010-06. One-use pinned owned RAM execution only.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { decodeReferenceMetadata,assertReferenceMetadataSuccess } from './reference-metadata-frame.mjs'
const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const caseName = process.argv.find(value => value.startsWith('--case='))?.slice(7)
assert.match(caseName || '', /^oci-imported\d{2}$/)
const target = path.resolve(root, caseName)
assert.equal(path.dirname(target), path.resolve(root))
assert.ok(!fs.existsSync(path.join(target, 'execution01')), 'Never reuse executed fixture')
const receipt = JSON.parse(fs.readFileSync(path.join(target, 'reference-probe-preparation.json')))
assert.equal(receipt.case, caseName)
assert.equal(receipt.providerWrites, false)
assert.ok(['red', 'green'].includes(receipt.mode))
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
assert.equal(sha(path.join(target, 'runner-source.mjs')), receipt.runnerSha256)
assert.equal(sha(path.join(target, 'initramfs.cpio')), receipt.initramfsSha256)
for (const pin of receipt.sources) assert.equal(sha(pin.file), pin.sha256, pin.file)
for (const pin of receipt.staged) {
  assert.equal(path.basename(pin.file), pin.file)
  assert.equal(sha(path.join(target, 'staging/k2', pin.file)), pin.sha256, pin.file)
}
console.log(JSON.stringify({ case: caseName, mode: receipt.mode, pinsVerified: true, launchingOnce: true }))
await import(pathToFileURL(path.join(target, 'runner-source.mjs')).href)
if (receipt.captureMetadata) {
  const run=path.join(target,'execution01')
  const result=JSON.parse(fs.readFileSync(path.join(run,'result.json')))
  assert.ok(process.exitCode===undefined || process.exitCode===0,'Controller must exit successfully')
  assertReferenceMetadataSuccess(result)
  assert.equal(sha(path.join(run,'serial.log')),result.serialSha256)
  const catalog=decodeReferenceMetadata(fs.readFileSync(path.join(run,'serial.log'),'utf8'))
  const file=path.join(run,'reference-installed-catalog.json')
  fs.writeFileSync(file,JSON.stringify(catalog)+'\n',{flag:'wx'})
  fs.writeFileSync(path.join(run,'reference-metadata-result.json'),JSON.stringify({
    owningMap:'MAP-018',case:caseName,providerWrites:false,scope:'Exact installed metadata before synthetic workflow; whole revised installer remains unqualified',
    catalogSha256:sha(file),serialSha256:result.serialSha256,querySha256:sha(path.join(target,'staging/k2/reference-metadata.sql')),
    preparationSha256:sha(path.join(target,'reference-probe-preparation.json')),
  },null,2)+'\n',{flag:'wx'})
  console.log(JSON.stringify({case:caseName,metadataCaptured:true,catalogSha256:sha(file)}))
}
