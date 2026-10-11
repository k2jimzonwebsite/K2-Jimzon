import assert from 'node:assert/strict'
// Distinct framing prevents inherited pre-reference captures being substituted.
export function decodeReferenceMetadata(serial) {
 const begin='K2_REFERENCE_METADATA_BEGIN',end='K2_REFERENCE_METADATA_END'
 assert.equal(serial.split(begin).length,2,'Exactly one installed metadata start required')
 assert.equal(serial.split(end).length,2,'Exactly one installed metadata end required')
 const match=serial.match(/(?:^|\n)K2_REFERENCE_METADATA_BEGIN\r?\n([A-Za-z0-9+/=\r\n]+)\r?\nK2_REFERENCE_METADATA_END(?:\r?\n|$)/)
 assert.ok(match,'Complete installed metadata frame required')
 const encoded=match[1].replace(/[\r\n]/g,'')
 const bytes=Buffer.from(encoded,'base64')
 assert.equal(bytes.toString('base64'),encoded,'Canonical base64 required')
 const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))
 assert.equal(value?.contract,'k2-category-operating-schema-v1')
 assert.deepEqual(Object.keys(value).sort(),['contract','defaults','extensions','functions','relations','schemas','types','unsupportedAggregates'].sort())
 for(const key of Object.keys(value).filter(key=>key!=='contract'))assert.ok(Array.isArray(value[key]),key)
 return value
}
