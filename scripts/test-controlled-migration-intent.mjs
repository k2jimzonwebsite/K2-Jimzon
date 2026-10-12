import fs from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
const module=await import('./prepare-controlled-migration-intent.mjs').catch(e=>{
  if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;
  return {prepareControlledIntent:()=>{throw Error('INTENT_NOT_IMPLEMENTED');}};
});
const sha=v=>createHash('sha256').update(v).digest('hex');
const source=JSON.parse(fs.readFileSync('D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc/provider-management-request-20261012-01.json','utf8')).query;
const body=source.slice(source.indexOf('begin;')+6,source.lastIndexOf('\ncommit;'));
const envelope=fs.readFileSync('.tools/map018-controlled-envelope-20261012-01/envelope.sql','utf8');
const intentId='89400000-0000-4000-8000-000000000001';
const session={pid:657,backendStart:'2026-10-12T15:16:34.261274+00:00',application:'k2-controlled-install-'+intentId,currentRole:'postgres',sessionRole:'postgres',superuser:false,database:'postgres',serverVersion:170006,state:'idle in transaction',readOnly:'off'};
const input=()=>({source,body,envelope,intentId,createdAt:'2026-10-12T15:16:35.000Z',target:{kind:'isolated-local',caseId:'native-intent-fixture'},sessionText:JSON.stringify(session),sessionEvidenceSha256:sha(JSON.stringify(session))});
test('candidate binds complete artifacts and synthetic local session without claiming execution',()=>{
 const p=module.prepareControlledIntent(input());const r=JSON.parse(p.text);
 assert.equal(p.sha256,sha(p.text));assert.equal(r.envelope.sha256,sha(envelope));assert.equal(r.body.sha256,sha(body));assert.equal(r.source.sha256,sha(source));
 assert.equal(r.session.pid,657);assert.equal(r.target.kind,'isolated-local');assert.equal(r.authorized,false);assert.equal(r.dispatched,false);assert.equal(r.durablyRetained,false);assert.equal(r.providerAcceptance,false);assert.equal(r.automaticRetryAllowed,false);
 assert.equal(module.prepareControlledIntent(input()).text,p.text);
});
test('one-byte changes to every executed or stored artifact refuse',()=>{
 for(const field of ['source','body','envelope']){
  assert.throws(()=>module.prepareControlledIntent({...input(),[field]:input()[field]+'\n'}),/ARTIFACT_PIN_REQUIRED/);
  const value=input()[field];assert.throws(()=>module.prepareControlledIntent({...input(),[field]:(value[0]==='X'?'Y':'X')+value.slice(1)}),/ARTIFACT_PIN_REQUIRED/);
 }
});
test('normalized impossible dates and backend starts after intent time refuse',()=>{
 assert.throws(()=>module.prepareControlledIntent({...input(),createdAt:'2027-02-30T15:16:35.000Z'}),/INPUT_REFUSED/);
 for(const backendStart of ['2026-02-30T15:16:34.000Z','2026-10-12T15:16:36.000Z','2026-10-12T15:16:35.000999Z']){
  const sessionText=JSON.stringify({...session,backendStart});assert.throws(()=>module.prepareControlledIntent({...input(),sessionText,sessionEvidenceSha256:sha(sessionText)}),/SESSION_REFUSED/);
 }
});
test('foreign, malformed and secret-bearing targets and session evidence refuse',()=>{
 for(const target of [{kind:'k2',projectRef:'yyixsuaimdzyiocswcgc',supabaseUrl:'https://yyixsuaimdzyiocswcgc.supabase.co',identityReceiptSha256:'a'.repeat(64)},{kind:'isolated-local',caseId:'native-intent-fixture',password:'fabricated'}, {kind:'k2',projectRef:'pixplcjqivlfflickobf',supabaseUrl:'https://pixplcjqivlfflickobf.supabase.co/',identityReceiptSha256:'a'.repeat(64)}])assert.throws(()=>module.prepareControlledIntent({...input(),target}),/TARGET_REFUSED/);
 for(const change of [{pid:0},{superuser:true},{currentRole:'supabase_admin'},{sessionRole:'supabase_admin'},{application:'other'},{state:'active'},{readOnly:'on'},{backendStart:'invalid'},{password:'fabricated'}]){
  const sessionText=JSON.stringify({...session,...change});assert.throws(()=>module.prepareControlledIntent({...input(),sessionText,sessionEvidenceSha256:sha(sessionText)}),/SESSION_REFUSED/);
 }
 assert.throws(()=>module.prepareControlledIntent({...input(),sessionEvidenceSha256:'a'.repeat(64)}),/SESSION_EVIDENCE_PIN_REQUIRED/);
 assert.throws(()=>module.prepareControlledIntent({...input(),password:'fabricated'}),/INPUT_REFUSED/);
});
test('K2 identity record remains a supplied evidence binding, never authorization or provider proof',()=>{
 const target={kind:'k2',projectRef:'pixplcjqivlfflickobf',supabaseUrl:'https://pixplcjqivlfflickobf.supabase.co',identityReceiptSha256:'a'.repeat(64)};
 const r=JSON.parse(module.prepareControlledIntent({...input(),target}).text);assert.deepEqual(r.target,target);assert.equal(r.providerAcceptance,false);assert.equal(r.authorized,false);
 const sessionText=JSON.stringify({...session,pid:658});const changed=module.prepareControlledIntent({...input(),sessionText,sessionEvidenceSha256:sha(sessionText)});
 assert.notEqual(changed.sha256,module.prepareControlledIntent(input()).sha256);
 assert.throws(()=>module.prepareControlledIntent({...input(),createdAt:'invalid'}),/INPUT_REFUSED/);
});
