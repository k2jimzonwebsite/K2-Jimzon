import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
const sha = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex')
const module = await import('../scripts/storage-runtime-layout.mjs').catch(() => null)
const describe = (...args) => { assert.ok(module, 'Verified Storage OCI layout preparation required'); return module.describeStorageLayout(...args) }
function fixture() {
  const config = Buffer.from(JSON.stringify({ architecture:'amd64', os:'linux', rootfs:{type:'layers',diff_ids:[sha('uncompressed fixture')]}}))
  const layer = Buffer.from('compressed fixture')
  const manifest = Buffer.from(JSON.stringify({schemaVersion:2,mediaType:'application/vnd.oci.image.manifest.v1+json',config:{mediaType:'application/vnd.oci.image.config.v1+json',digest:sha(config),size:config.length},layers:[{mediaType:'application/vnd.oci.image.layer.v1.tar+gzip',digest:sha(layer),size:layer.length}]}))
  return { manifest, config, layers:[layer], expectedManifestDigest:sha(manifest) }
}
test('standard OCI layout retains exact verified blobs and tagged manifest', () => {
  const input=fixture(), result=describe(input)
  assert.deepEqual(JSON.parse(result.layout),{imageLayoutVersion:'1.0.0'})
  const index=JSON.parse(result.index)
  assert.equal(index.manifests[0].digest,sha(input.manifest))
  assert.equal(index.manifests[0].annotations['org.opencontainers.image.ref.name'],'storage')
  assert.deepEqual(result.blobs.map(blob=>blob.bytes),[input.manifest,input.config,...input.layers])
})
test('changed manifest refuses against independent pinned receipt',()=>{
  const input=fixture(); input.manifest=Buffer.from(input.manifest.toString()+' ')
  assert.throws(()=>describe(input),/STORAGE_MANIFEST_DIGEST/)
})
test('changed config or layer refuses before staging',()=>{
  for(const field of ['config','layers']) {
    const input=fixture(); if(field==='config') input.config=Buffer.from('changed'); else input.layers=[Buffer.from('changed')]
    assert.throws(()=>describe(input),/STORAGE_BLOB_DIGEST/)
  }
})
test('different architecture refuses even when blobs are internally coherent',()=>{
  const input=fixture(), config=JSON.parse(input.config);config.architecture='arm64';input.config=Buffer.from(JSON.stringify(config))
  const manifest=JSON.parse(input.manifest);manifest.config.digest=sha(input.config);manifest.config.size=input.config.length;input.manifest=Buffer.from(JSON.stringify(manifest));input.expectedManifestDigest=sha(input.manifest)
  assert.throws(()=>describe(input),/STORAGE_PLATFORM/)
})
test('incomplete layer set refuses rather than staging a partial image',()=>{
  const input=fixture();input.layers=[];assert.throws(()=>describe(input),/STORAGE_LAYER_COUNT/)
})
