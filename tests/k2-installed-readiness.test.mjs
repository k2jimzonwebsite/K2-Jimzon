import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classifyInstalledReadiness,classifyInstalledPermissions,classifyBackupProof,selectBackupEvidence,PHASED_RECEIPT} from '../scripts/k2-installed-readiness.mjs';
import * as installed from '../scripts/k2-installed-readiness.mjs';
const present={intake_sessions:1,sku_seq:1,channels:1,channel_shops:1};
const activation={relation:{owner:'postgres',rls:true,publicAccess:false,anonAccess:false,authenticatedAccess:false,serviceAccess:false},rows:[{singleton:true,maximumDepth:6}]};
const packetHash='69e80b1ac8a1e7c255abfbcb8d16c1c9ce5582ff3cf4be651129bf1f6d0051de';
const preparedHelper=hash=>({owner:'postgres',definer:true,emptySearchPath:true,ownerOnlyExecute:true,bodySha256:hash});
const activationTarget={categoryRows:0,policyRows:0,eventRows:0,contextRows:0,configOwnerOnly:true,
 payload:preparedHelper('91eba694981253dc8bd8233727c2f2b38cb8686507acc9097999f60abf408d36'),
 start:preparedHelper('23e82f11900727d669d7c41bd6eab31c42a4f5870fae9ceb9d6d736a460ae65c'),
 current:preparedHelper('3f7afcb349d034b121d1fc57d9da514a667e3b491b809bd6d43e5255ae938b25')};
test('only the exact absent activation target and exact packet can be owner-pending, never verified or authorized',()=>{
 assert.equal(typeof installed.classifyCategoryActivationPreparation,'function');
 const r=installed.classifyCategoryActivationPreparation({...activation,rows:[]},'installed',packetHash,packetHash,activationTarget);
 assert.equal(r.state,'owner');assert.equal(r.writeAuthorized,false);assert.equal(r.reapplyAllowed,false);
 assert.equal(installed.classifyCategoryPolicyActivation({...activation,rows:[]},'installed').state,'blocked');
});
test('preparation refuses changed bytes/request, installed config, unsafe relation and incomplete target',()=>{
 const classify=(s,m,h,b,t)=>installed.classifyCategoryActivationPreparation(s,m,h,b,t);
 const empty={...activation,rows:[]};
 for(const [s,m,h,b,t] of [[empty,'installed','other',packetHash,activationTarget],[empty,'installed',packetHash,'other',activationTarget],
  [activation,'installed',packetHash,packetHash,activationTarget],[empty,'first-apply',packetHash,packetHash,activationTarget],
  [empty,'installed',packetHash,packetHash,null],[{...empty,relation:{...empty.relation,anonAccess:true}},'installed',packetHash,packetHash,activationTarget]])
  assert.equal(classify(s,m,h,b,t).state,'blocked');
 for(const field of ['categoryRows','policyRows','eventRows','contextRows'])for(const value of [1,null,'0',undefined])
  assert.equal(classify(empty,'installed',packetHash,packetHash,{...activationTarget,[field]:value}).state,'blocked');
 assert.equal(classify(empty,'installed',packetHash,packetHash,{...activationTarget,configOwnerOnly:false}).state,'blocked');
});
test('preparation refuses altered or missing private payload/context dependency evidence',()=>{
 for(const key of ['payload','start','current']){
  for(const drift of [null,{...activationTarget[key],owner:'other'},{...activationTarget[key],definer:false},
   {...activationTarget[key],emptySearchPath:false},{...activationTarget[key],ownerOnlyExecute:false},
   {...activationTarget[key],bodySha256:'0'.repeat(64)}])
   assert.equal(installed.classifyCategoryActivationPreparation({...activation,rows:[]},'installed',packetHash,packetHash,{...activationTarget,[key]:drift}).state,'blocked');
 }
});
test('installed readiness refuses the observed missing category activation instead of a zero-failed receipt',()=>{
 assert.equal(typeof installed.classifyCategoryPolicyActivation,'function');
 const result=installed.classifyCategoryPolicyActivation({...activation,rows:[]},'installed');
 assert.equal(result.state,'blocked');assert.match(result.detail,/not configured/i);assert.equal(result.reapplyAllowed,false);
});
test('category activation accepts only an observed private singleton with a PostgreSQL integer depth',()=>{
 assert.equal(installed.classifyCategoryPolicyActivation(activation,'installed').state,'verified');
 for(const row of [{singleton:false,maximumDepth:6},{singleton:true,maximumDepth:0},{singleton:true,maximumDepth:-1},{singleton:true,maximumDepth:null},{singleton:true,maximumDepth:'6'},{singleton:true,maximumDepth:1.5},{singleton:true,maximumDepth:2147483648}])
  assert.equal(installed.classifyCategoryPolicyActivation({...activation,rows:[row]},'installed').state,'blocked');
 assert.equal(installed.classifyCategoryPolicyActivation({...activation,rows:[activation.rows[0],activation.rows[0]]},'installed').state,'blocked');
});
test('category activation never verifies missing evidence, unsafe ownership, missing RLS or client access',()=>{
 for(const value of [null,{}, {...activation,relation:null},{...activation,rows:null}])assert.equal(installed.classifyCategoryPolicyActivation(value,'installed').state,'blocked');
 for(const drift of [{owner:'other'},{rls:false},{publicAccess:true},{anonAccess:true},{authenticatedAccess:true},{serviceAccess:true},{serviceAccess:undefined}])
  assert.equal(installed.classifyCategoryPolicyActivation({...activation,relation:{...activation.relation,...drift}},'installed').state,'blocked');
 assert.equal(installed.classifyCategoryPolicyActivation(activation,'unknown').state,'blocked');
});
test('first-apply category activation stays an explicit owner prerequisite, never a verified operation',()=>{
 const r=installed.classifyCategoryPolicyActivation({relation:null,rows:[]},'first-apply');assert.equal(r.state,'owner');assert.equal(r.reapplyAllowed,false);
 assert.equal(installed.classifyCategoryPolicyActivation(activation,'first-apply').state,'blocked');
});
const receipt={...PHASED_RECEIPT,statementCount:1,statementBytes:10588727};
test('exact installed source receipt and all required relations classify installed, never permission to reapply',()=>{const r=classifyInstalledReadiness([receipt],present);assert.equal(r.state,'verified');assert.equal(r.mode,'installed');assert.equal(r.reapplyAllowed,false)});
test('empty legacy baseline is first apply only when every chain relation is absent',()=>{assert.equal(classifyInstalledReadiness([],{intake_sessions:0,sku_seq:0,channels:0,channel_shops:0}).mode,'first-apply');assert.equal(classifyInstalledReadiness([],present).state,'blocked')});
test('changed complete-source receipt, duplicate or old controlled receipt refuse',()=>{for(const key of ['version','name','idempotencyKey','statementSha256'])assert.equal(classifyInstalledReadiness([{...receipt,[key]:'changed'}],present).state,'blocked');for(const value of [0,2,null])assert.equal(classifyInstalledReadiness([{...receipt,statementCount:value}],present).state,'blocked');assert.equal(classifyInstalledReadiness([{...receipt,statementBytes:1}],present).state,'blocked');assert.equal(classifyInstalledReadiness([receipt,receipt],present).state,'blocked');assert.equal(classifyInstalledReadiness([{version:'20261013100000'}],present).state,'blocked')});
test('partial installed schema and malformed relation evidence refuse',()=>{for(const key of Object.keys(present))for(const v of [0,null,2,'1'])assert.equal(classifyInstalledReadiness([receipt],{...present,[key]:v}).state,'blocked');assert.equal(classifyInstalledReadiness([receipt],null).state,'blocked')});
const expected=JSON.parse(fs.readFileSync(new URL('../docs/evidence/20261013-installed-readiness-permissions.json',import.meta.url))).functions;
const triggers=expected.filter(r=>r.publicExecute);
test('installed permission classification names exact reviewed signatures and invoker trigger exceptions',()=>assert.equal(classifyInstalledPermissions(expected,triggers,expected).state,'verified'));
test('extra overload or altered authority cannot hide behind a function name',()=>{for(const drift of [{signature:expected[0].signature+' overload'},{owner:'other'},{definer:false},{publicExecute:true},{result:'k2_private.order_requests'}]){const live=expected.map((r,i)=>i===0?{...r,...drift}:r);assert.equal(classifyInstalledPermissions(live,triggers,expected).state,'blocked')}assert.equal(classifyInstalledPermissions([...expected,expected[0]],triggers,expected).state,'blocked');assert.equal(classifyInstalledPermissions(expected.slice(1),triggers,expected).state,'blocked')});
test('extra PUBLIC execute and trigger SECURITY DEFINER drift refuse',()=>{assert.equal(classifyInstalledPermissions(expected,[...triggers,{...expected[0],publicExecute:true}],expected).state,'blocked');assert.equal(classifyInstalledPermissions(expected,triggers.map(r=>({...r,definer:true})),expected).state,'blocked')});
test('two arbitrary triggers do not inherit the named PUBLIC exception',()=>{const altered=expected.map(r=>r.publicExecute?{...r,signature:r.signature+'changed'}:r);assert.equal(classifyInstalledPermissions(altered,altered.filter(r=>r.publicExecute),altered).state,'blocked')});
test('same-named private trigger cannot replace PUBLIC schema exception',()=>{const privateTriggers=triggers.map(r=>({...r,signature:r.signature.replace('public.','k2_private.')}));assert.equal(classifyInstalledPermissions(expected,privateTriggers,expected).state,'blocked')});
const now=Date.parse('2026-10-13T12:00:00Z'),hash='a'.repeat(64);
test('approved order-chat adapter extends the exact installed catalog without admitting other grants',()=>{
 const adapter={signature:'public.guest_order_conversation_v1(p_timestamp bigint, p_nonce uuid, p_payload_text text, p_ip_hash text, p_signature text, p_guest_grant_hash text, p_base64 text)',owner:'postgres',definer:true,result:'jsonb',publicExecute:false};
 const current=[...expected,adapter];
 assert.equal(classifyInstalledPermissions(current,triggers,current).state,'verified');
 for(const drift of [{signature:adapter.signature+'changed'},{owner:'anon'},{definer:false},{result:'text'},{publicExecute:true}]){
  const changed=[...expected,{...adapter,...drift}];assert.equal(classifyInstalledPermissions(changed,triggers,changed).state,'blocked');
 }
});
const manifest={projectRef:'pixplcjqivlfflickobf',backupId:'current-k2-bound',createdAt:'2026-10-13T11:30:00Z',encryptedSha256:hash,encryptedBytes:128};
const proof={backupId:manifest.backupId,restoreVerified:true,verifiedAt:'2026-10-13T11:31:00Z',latestMigrationVersion:'20261013110000'};
const actual={sha256:hash,bytes:128,latest:'20261013110000',now};
test('backup must match encrypted bytes/hash and actual restored current migration',()=>{assert.equal(classifyBackupProof(manifest,proof,actual).state,'verified');for(const drift of [{backupId:'other'},{restoreVerified:false},{latestMigrationVersion:'20260928092634'}])assert.equal(classifyBackupProof(manifest,{...proof,...drift},actual).state,'blocked');assert.equal(classifyBackupProof(manifest,proof,{...actual,sha256:'b'.repeat(64)}).state,'blocked');assert.equal(classifyBackupProof(manifest,proof,{...actual,bytes:127}).state,'blocked')});
test('missing proof and impossible/future creation or restoration evidence refuse',()=>{assert.equal(classifyBackupProof(manifest,null,actual).state,'blocked');for(const createdAt of ['bad','2026-10-14T12:00:00Z'])assert.equal(classifyBackupProof({...manifest,createdAt},proof,actual).state,'blocked');assert.equal(classifyBackupProof(manifest,{...proof,verifiedAt:'2026-10-13T11:29:00Z'},actual).state,'blocked')});
test('unknown backup creation metadata cannot be bypassed by a valid candidate',()=>{const valid={file:'valid',manifest},unknown={file:'unknown',manifest:null};for(const candidates of [[valid,unknown],[unknown,valid]])assert.equal(selectBackupEvidence(candidates).state,'blocked');assert.equal(selectBackupEvidence([valid]).candidate.file,'valid');assert.equal(selectBackupEvidence([{file:'bad',manifest:{...manifest,createdAt:'bad'}},valid]).state,'blocked')});
test('backup chronology requires real UTC ISO strings rather than Date.parse coercion',()=>{for(const createdAt of [0,'2026-10-13','2026-02-30T11:30:00Z']){assert.equal(selectBackupEvidence([{file:'bad',manifest:{...manifest,createdAt}}]).state,'blocked');assert.equal(classifyBackupProof({...manifest,createdAt},proof,actual).state,'blocked')}});
