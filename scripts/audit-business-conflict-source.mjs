import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const root='D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc/oci-imported02/execution01'
const hash=b=>createHash('sha256').update(b).digest('hex')
const nativeResult=fs.readFileSync(root+'/result.json')
assert.equal(hash(nativeResult),'530fa8ac4d49b72835827c441af8578d5ae24353f74882339656887a66de668f')
const result=JSON.parse(nativeResult)
assert.equal(result.exit,0);assert.equal(result.fullCatalogRollback,true)
for(const key of ['guestSuccess','serverModuleProbe','moduleGucs','processStopped'])assert.equal(result[key],true,key)
const bytes=fs.readFileSync(root+'/after-catalog.json')
assert.equal(hash(bytes),'e9ff18682ab3f3f65c43bf16eff7e6bad6bc77dc32f3f329ecb68d5b22e15460')
assert.equal(hash(bytes),result.catalogs.after.sha256)
const serial=fs.readFileSync(root+'/serial.log')
assert.equal(hash(serial),'eb579724b49a1415f139d42f8631aa4b5d36623ed77756690ff3712398def9ed')
assert.equal(hash(serial),result.serialSha256)
const catalog=JSON.parse(bytes),sites=[]
for(const f of catalog.functions){
 const raises=[...f.definition.matchAll(/raise\s+exception\s+using\s+errcode\s*=\s*'40001'\s*,\s*message\s*=\s*'([^']+)'/gi)]
 const codes=[...f.definition.matchAll(/errcode\s*=\s*'40001'/gi)]
 if(codes.length!==raises.length)throw Error('UNCLASSIFIED_40001_SITE:'+f.identity)
 for(const m of raises){
  const line=f.definition.slice(0,m.index).split('\n').length
  sites.push({identity:f.identity,definitionSha256:hash(f.definition),line,message:m[1],context:f.definition.split('\n').slice(Math.max(0,line-4),line+1).join('\n')})
 }
}
const paths=fs.readdirSync('server/admin-bff').filter(f=>f.endsWith('.js')).map(f=>'server/admin-bff/'+f)
const mappings=sites.map(s=>({message:s.message,consumers:paths.filter(p=>fs.readFileSync(p,'utf8').includes(s.message)).map(p=>({path:p,sha256:hash(fs.readFileSync(p))}))}))
const codeOnly=paths.flatMap(p=>fs.readFileSync(p,'utf8').split('\n').flatMap((line,i)=>line.includes('40001')?[{path:p,line:i+1,text:line.trim(),sha256:hash(fs.readFileSync(p))}]:[]))
const manualMappings=[
 {message:'K2_PAYMENT_VERSION_CONFLICT',path:'server/admin-bff/fulfillment.js',description:'paymentErrors contains VERSION_CONFLICT; equality uses K2_PAYMENT_${code}; response409/paymentError. Literal-only matching misses this template.',anchors:["'VERSION_CONFLICT', 'ORDER_INELIGIBLE'",'providerCode === `K2_PAYMENT_${code}`','if (paymentError) return safeJson(res, 409']},
 {message:'K2_EXPRESS_QUOTE_STALE',path:'server/express-delivery-contract.js',description:'Shared expressDeliveryFailure maps named message to409/EXPRESS_QUOTE_STALE outside Admin BFF.',anchors:["message.includes('K2_EXPRESS_QUOTE_STALE')", "return [409, 'EXPRESS_QUOTE_STALE']"]},
]
for(const m of manualMappings){const source=fs.readFileSync(m.path,'utf8');for(const a of m.anchors)assert.ok(source.includes(a),a);m.sha256=hash(source)}
const report={owningMap:'MAP-018',idea:'IDEA-20261010-08',providerWrites:false,scope:'Read-only exact retained native imported02 composed function source inventory; no new database execution, HTTP behavior or provider observation',auditCommand:'node scripts/audit-business-conflict-source.mjs',auditorSha256:hash(fs.readFileSync('scripts/audit-business-conflict-source.mjs')),nativeResultSha256:hash(nativeResult),catalogSha256:hash(bytes),nativeSerialSha256:hash(serial),functionsScanned:catalog.functions.length,sites,mappings,mappingMethod:'Literal-only candidate matches within server/admin-bff/*.js. Empty consumers means no literal match; it does not establish absence of a handler. Templates, shared handlers, imports and other scopes require semantic review.',manualMappings,codeOnly,limits:'Contexts classify explicit application raises only. Original actual PostgREST timeout proof is Product Master; each remaining command still needs its own actual transport qualification and full-package/recovery proof. Candidate mappings are not a complete call graph or runtime response proof.'}
fs.writeFileSync('docs/acceptance/BUSINESS_CONFLICT_SOURCE_AUDIT_20261010.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({functionsScanned:report.functionsScanned,sites:sites.map(({identity,message})=>({identity,message})),codeOnly,catalogSha256:report.catalogSha256}))
