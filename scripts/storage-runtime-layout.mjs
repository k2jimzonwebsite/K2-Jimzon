// MAP-018 / IDEA-20261009-11. Standard OCI layout only; umoci applies layers.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
const digest = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex')
export function describeStorageLayout({ manifest, config, layers, expectedManifestDigest }) {
  assert.equal(digest(manifest), expectedManifestDigest, 'STORAGE_MANIFEST_DIGEST')
  const image = JSON.parse(manifest)
  assert.equal(image.schemaVersion, 2)
  assert.equal(image.mediaType, 'application/vnd.oci.image.manifest.v1+json')
  assert.equal(layers.length, image.layers.length, 'STORAGE_LAYER_COUNT')
  const descriptors = [image.config, ...image.layers], bytes = [config, ...layers]
  descriptors.forEach((descriptor, index) => {
    assert.equal(digest(bytes[index]), descriptor.digest, 'STORAGE_BLOB_DIGEST')
    assert.equal(bytes[index].length, descriptor.size, 'STORAGE_BLOB_SIZE')
  })
  const platform = JSON.parse(config)
  assert.equal(platform.architecture, 'amd64', 'STORAGE_PLATFORM')
  assert.equal(platform.os, 'linux', 'STORAGE_PLATFORM')
  assert.equal(platform.rootfs.type, 'layers')
  assert.equal(platform.rootfs.diff_ids.length, layers.length)
  return {
    layout: JSON.stringify({ imageLayoutVersion:'1.0.0' }),
    index: JSON.stringify({schemaVersion:2,mediaType:'application/vnd.oci.image.index.v1+json',manifests:[{
      mediaType:image.mediaType,digest:expectedManifestDigest,size:manifest.length,
      annotations:{'org.opencontainers.image.ref.name':'storage'},
    }]}),
    blobs: [manifest, ...bytes].map(value => ({ digest:digest(value),bytes:value })),
  }
}
