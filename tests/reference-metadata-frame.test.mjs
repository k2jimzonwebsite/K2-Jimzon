import test from 'node:test'
import assert from 'node:assert/strict'
let decodeReferenceMetadata,assertReferenceMetadataSuccess
try { ({decodeReferenceMetadata,assertReferenceMetadataSuccess}=await import('../scripts/reference-metadata-frame.mjs')) }
catch(error) { if(error.code!=='ERR_MODULE_NOT_FOUND')throw error }
const sample={contract:'k2-category-operating-schema-v1',functions:[],relations:[],schemas:[],types:[],extensions:[],defaults:[],unsupportedAggregates:[]}
const frame=value=>'K2_REFERENCE_METADATA_BEGIN\r\n'+Buffer.from(JSON.stringify(value)).toString('base64')+'\r\nK2_REFERENCE_METADATA_END\r\n'
test('extracts the installed metadata frame without confusing inherited base catalog frames',()=>{
 assert.equal(typeof decodeReferenceMetadata,'function','Installed reference metadata extraction is missing')
 assert.deepEqual(decodeReferenceMetadata('boot\nK2_CATALOG_AFTER_BEGIN\nignored\nK2_CATALOG_AFTER_END\n'+frame(sample)+'shutdown'),sample)
})
test('only an exact successful native terminal result permits metadata extraction',()=>{
 assert.equal(typeof assertReferenceMetadataSuccess,'function','Native terminal extraction gate is missing')
 const success={exit:0,timedOut:false,guestSuccess:true,fullCatalogRollback:true,processStopped:true}
 assert.doesNotThrow(()=>assertReferenceMetadataSuccess(success))
 for(const patch of [{exit:1},{timedOut:true},{error:'watchdog failure'},{guestSuccess:false},{fullCatalogRollback:false},{processStopped:false},{exit:undefined},{timedOut:undefined}])
  assert.throws(()=>assertReferenceMetadataSuccess({...success,...patch}))
})
test('refuses absent, duplicate or truncated installed frames',()=>{
 assert.equal(typeof decodeReferenceMetadata,'function')
 for(const serial of ['',frame(sample)+frame(sample),'K2_REFERENCE_METADATA_BEGIN\n'])assert.throws(()=>decodeReferenceMetadata(serial))
})
test('refuses malformed bytes, JSON and incomplete catalog shapes',()=>{
 assert.equal(typeof decodeReferenceMetadata,'function')
 for(const serial of [frame({}),frame(null),'K2_REFERENCE_METADATA_BEGIN\n!!!!\nK2_REFERENCE_METADATA_END\n',
  'K2_REFERENCE_METADATA_BEGIN\neA==\nK2_REFERENCE_METADATA_END\n'])assert.throws(()=>decodeReferenceMetadata(serial))
})
