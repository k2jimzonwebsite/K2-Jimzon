import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ADMIN_PREAUTH_PERMISSION } from '../scripts/admin-preauth-readiness.mjs';
import {classifyInstalledReadiness,classifyInstalledPermissions,classifyBackupProof,selectBackupEvidence,PHASED_RECEIPT} from '../scripts/k2-installed-readiness.mjs';
const present={intake_sessions:1,sku_seq:1,channels:1,channel_shops:1};
const receipt={...PHASED_RECEIPT,statementCount:1,statementBytes:10588727};
test('exact installed source receipt and all required relations classify installed, never permission to reapply',()=>{const r=classifyInstalledReadiness([receipt],present);assert.equal(r.state,'verified');assert.equal(r.mode,'installed');assert.equal(r.reapplyAllowed,false)});
test('empty legacy baseline is first apply only when every chain relation is absent',()=>{assert.equal(classifyInstalledReadiness([],{intake_sessions:0,sku_seq:0,channels:0,channel_shops:0}).mode,'first-apply');assert.equal(classifyInstalledReadiness([],present).state,'blocked')});
test('changed complete-source receipt, duplicate or old controlled receipt refuse',()=>{for(const key of ['version','name','idempotencyKey','statementSha256'])assert.equal(classifyInstalledReadiness([{...receipt,[key]:'changed'}],present).state,'blocked');for(const value of [0,2,null])assert.equal(classifyInstalledReadiness([{...receipt,statementCount:value}],present).state,'blocked');assert.equal(classifyInstalledReadiness([{...receipt,statementBytes:1}],present).state,'blocked');assert.equal(classifyInstalledReadiness([receipt,receipt],present).state,'blocked');assert.equal(classifyInstalledReadiness([{version:'20261013100000'}],present).state,'blocked')});
test('partial installed schema and malformed relation evidence refuse',()=>{for(const key of Object.keys(present))for(const v of [0,null,2,'1'])assert.equal(classifyInstalledReadiness([receipt],{...present,[key]:v}).state,'blocked');assert.equal(classifyInstalledReadiness([receipt],null).state,'blocked')});
const expected=JSON.parse(fs.readFileSync(new URL('../docs/evidence/20261013-installed-readiness-permissions.json',import.meta.url))).functions;
const triggers=expected.filter(r=>r.publicExecute);

test('approved family reader profile passes while every changed authority field refuses',()=>{
 const prior=[...JSON.parse(fs.readFileSync(new URL('../docs/evidence/20261014-installed-readiness-permissions.json',import.meta.url))).functions,ADMIN_PREAUTH_PERMISSION];
 const family={signature:'public.read_storefront_product_families_v1(p_skus text[])',owner:'postgres',definer:true,result:'TABLE(family_id uuid, family_name text, axes text[], sku text, options jsonb)',publicExecute:false};
 const current=[...prior,family];
 assert.equal(classifyInstalledPermissions(current,triggers,current).state,'verified');
 for(const drift of [{signature:family.signature+' changed'},{owner:'anon'},{definer:false},{result:'jsonb'},{publicExecute:true}]) {
  const changed=[...prior,{...family,...drift}];
  assert.equal(classifyInstalledPermissions(changed,triggers,changed).state,'blocked');
 }
 assert.equal(classifyInstalledPermissions([...current,{...family,signature:'public.unreviewed()'}],triggers,current).state,'blocked');
});
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
test('date-only migration version requires the exact restored version and all backup bindings',()=>{
 const version='20261013',p={...proof,latestMigrationVersion:version},a={...actual,latest:version};
 assert.equal(classifyBackupProof(manifest,p,a).state,'verified');
 for(const changed of ['20261012','20261013110000'])assert.equal(classifyBackupProof(manifest,{...p,latestMigrationVersion:changed},a).state,'blocked');
 for(const latest of ['2026101','202610130','2026101311000','20261313','20260230'])assert.equal(classifyBackupProof(manifest,{...p,latestMigrationVersion:latest},{...a,latest}).state,'blocked');
 assert.equal(classifyBackupProof(manifest,p,{...a,sha256:'b'.repeat(64)}).state,'blocked');
});
test('backup must match encrypted bytes/hash and actual restored current migration',()=>{assert.equal(classifyBackupProof(manifest,proof,actual).state,'verified');for(const drift of [{backupId:'other'},{restoreVerified:false},{latestMigrationVersion:'20260928092634'}])assert.equal(classifyBackupProof(manifest,{...proof,...drift},actual).state,'blocked');assert.equal(classifyBackupProof(manifest,proof,{...actual,sha256:'b'.repeat(64)}).state,'blocked');assert.equal(classifyBackupProof(manifest,proof,{...actual,bytes:127}).state,'blocked')});
test('missing proof and impossible/future creation or restoration evidence refuse',()=>{assert.equal(classifyBackupProof(manifest,null,actual).state,'blocked');for(const createdAt of ['bad','2026-10-14T12:00:00Z'])assert.equal(classifyBackupProof({...manifest,createdAt},proof,actual).state,'blocked');assert.equal(classifyBackupProof(manifest,{...proof,verifiedAt:'2026-10-13T11:29:00Z'},actual).state,'blocked')});
test('unknown backup creation metadata cannot be bypassed by a valid candidate',()=>{const valid={file:'valid',manifest},unknown={file:'unknown',manifest:null};for(const candidates of [[valid,unknown],[unknown,valid]])assert.equal(selectBackupEvidence(candidates).state,'blocked');assert.equal(selectBackupEvidence([valid]).candidate.file,'valid');assert.equal(selectBackupEvidence([{file:'bad',manifest:{...manifest,createdAt:'bad'}},valid]).state,'blocked')});
test('backup chronology requires real UTC ISO strings rather than Date.parse coercion',()=>{for(const createdAt of [0,'2026-10-13','2026-02-30T11:30:00Z']){assert.equal(selectBackupEvidence([{file:'bad',manifest:{...manifest,createdAt}}]).state,'blocked');assert.equal(classifyBackupProof({...manifest,createdAt},proof,actual).state,'blocked')}});
