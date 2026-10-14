// MAP-018 / IDEA-20261009-08. Pure offline serialization; no credentials or dispatch.
import {createHash} from 'node:crypto';
const sha=v=>createHash('sha256').update(v).digest('hex');
const pins={source:['8ca8e22fedcae9fa63eaba682b897b2dcfaa0b817f3f1c7a010204314fa5dc99',8278524],body:['cb969b36d1de42b912276d8a53d7dc63672bbe5320bc30a777e7c0aba3063b49',8278397],envelope:['c3cd02e1e88a1865c306232e0ff3c1a9b39101ae25f0a836a92e086a92e48157',16565984]};
const successorPins={source:['77c270d1e2a3eda501b2b513e362ed6ab4b362162ca0f3af2eea6a7580673f0d',8281916],body:['b20d9d3d0ffd1da9140bcb93345c3ff1fb48595eb403780cee6e29900a5f10ce',8281789],envelope:['86f98a991cf5b4e82eb6610919a03eaca9e8612d8945d9cb61640f88764dbd26',16572786]};
const phasedPins={source:['587e481e549039dc31c1ee3cff9670a0a9bbf8a9cf9a95ee18a20711bf384c3d',10588727],body:['5b13ad4b82bd46999bebe9b07b37ff78b2e96160c1154565b3634885d85ed0a6',10588600],envelope:['1d246794d14b6d2c85cde1f8ca12d5f986c79bebcb42daf4c676741ba3c1204b',21186411]};
const exact=(value,keys)=>value!==null && typeof value==='object' && !Array.isArray(value) && Object.getPrototypeOf(value)===Object.prototype && Object.keys(value).sort().join(',')===keys.slice().sort().join(',');
const uuid=v=>typeof v==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const hash=v=>typeof v==='string' && /^[a-f0-9]{64}$/.test(v);
const timestamp=v=>typeof v==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,19)===v.slice(0,19);
const timestampOrder=v=>v.slice(0,19)+'.'+(v.match(/\.(\d+)/)?.[1]??'').padEnd(6,'0');
export function prepareControlledIntent(input){
 if(!exact(input,['source','body','envelope','intentId','createdAt','target','sessionText','sessionEvidenceSha256']) || !uuid(input.intentId) || !timestamp(input.createdAt))throw Error('INPUT_REFUSED');
 const artifacts={};
 const successor=typeof input.source==='string'&&sha(input.source)===successorPins.source[0];
 const phased=typeof input.source==='string'&&sha(input.source)===phasedPins.source[0];
 const selectedPins=phased?phasedPins:successor?successorPins:pins;
 for(const [name,[expected,bytes]] of Object.entries(selectedPins)){
  const value=input[name];
  if(typeof value!=='string' || !value.isWellFormed() || Buffer.byteLength(value)!==bytes || sha(value)!==expected)throw Error('ARTIFACT_PIN_REQUIRED');
  artifacts[name]={sha256:expected,bytes};
 }
 const t=input.target;let target;
 if(exact(t,['kind','caseId']) && t.kind==='isolated-local' && typeof t.caseId==='string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(t.caseId))target={kind:t.kind,caseId:t.caseId};
 else if(exact(t,['kind','projectRef','supabaseUrl','identityReceiptSha256']) && t.kind==='k2' && t.projectRef==='pixplcjqivlfflickobf' && t.supabaseUrl==='https://pixplcjqivlfflickobf.supabase.co' && hash(t.identityReceiptSha256))target={kind:t.kind,projectRef:t.projectRef,supabaseUrl:t.supabaseUrl,identityReceiptSha256:t.identityReceiptSha256};
 else throw Error('TARGET_REFUSED');
 if(typeof input.sessionText!=='string' || Buffer.byteLength(input.sessionText)>4096 || !hash(input.sessionEvidenceSha256) || sha(input.sessionText)!==input.sessionEvidenceSha256)throw Error('SESSION_EVIDENCE_PIN_REQUIRED');
 let s;try{s=JSON.parse(input.sessionText);}catch{throw Error('SESSION_REFUSED');}
 if(!exact(s,['pid','backendStart','application','currentRole','sessionRole','superuser','database','serverVersion','state','readOnly']) || !Number.isSafeInteger(s.pid) || s.pid<1 || s.pid>2147483647 || !timestamp(s.backendStart) || timestampOrder(s.backendStart)>timestampOrder(input.createdAt) || s.application!=='k2-controlled-install-'+input.intentId || s.currentRole!=='postgres' || s.sessionRole!=='postgres' || s.superuser!==false || s.database!=='postgres' || s.serverVersion!==170006 || s.state!=='idle in transaction' || s.readOnly!=='off')throw Error('SESSION_REFUSED');
 const session={pid:s.pid,backendStart:s.backendStart,application:s.application,currentRole:s.currentRole,sessionRole:s.sessionRole,superuser:s.superuser,database:s.database,serverVersion:s.serverVersion,state:s.state,readOnly:s.readOnly,evidenceSha256:input.sessionEvidenceSha256};
 const record={format:'k2-controlled-intent-v1',owningMap:'MAP-018',idea:phased?'IDEA-20261013-06':successor?'IDEA-20261013-04':'IDEA-20261009-08',intentId:input.intentId,createdAt:input.createdAt,...artifacts,target,session,receipt:{version:phased?'20261013110000':successor?'20261013100000':'20261012140000',name:phased?'k2_category_operating_full_catalog_phased_controlled_20261013':successor?'k2_category_operating_full_catalog_pt409_controlled_20261013':'k2_category_operating_full_cutover_controlled_20261012',idempotencyKey:'k2-controlled-v1:sha256:'+selectedPins.source[0]},authorized:false,dispatched:false,durablyRetained:false,providerAcceptance:false,automaticRetryAllowed:false};
 const text=JSON.stringify(record)+'\n';
 return Object.freeze({text,sha256:sha(text),bytes:Buffer.byteLength(text)});
}

// IDEA-20261013-12. Key-only metadata; never a migration receipt or dispatcher.
// Candidate context must also be bound inside private encrypted custody and
// checked after decryption by the future approved runner. This serializer alone
// cannot establish candidate possession, owner approval or provider acceptance.
const guestPins={packageSha256:'67816fe4f452901067eace138d1c533055fb4784d61559b26a0e23b0e7b81707',bodySha256:'7e0bb8af156805454eb174fe6eba41d3587da25c7c2b45b2d51458b9ceed4ffe',admissionSha256:'f7f7ee42c2143a7bf6f39bf22e90cf13f3c0b09a1f0f2b379d40c7d795abd2c7'};
export function prepareGuestSignerOperation(input){
 if(!exact(input,['intentId','packageSha256','bodySha256','admissionSha256','target','candidateContext']) || !uuid(input.intentId))throw Error('INPUT_REFUSED');
 for(const [key,pin] of Object.entries(guestPins))if(input[key]!==pin)throw Error('ARTIFACT_PIN_REQUIRED');
 const t=input.target;
 if(!exact(t,['kind','projectRef','supabaseUrl','identityReceiptSha256']) || t.kind!=='k2' || t.projectRef!=='pixplcjqivlfflickobf' || t.supabaseUrl!=='https://pixplcjqivlfflickobf.supabase.co' || !hash(t.identityReceiptSha256))throw Error('TARGET_REFUSED');
 const c=input.candidateContext;
 if(!exact(c,['format','owningMap','idea','projectRef','intentId','candidateId','packageSha256','bodySha256','keyOrder','keyBytes']) || c.format!=='k2-guest-candidate-context-v1' || c.owningMap!=='MAP-018' || c.idea!=='IDEA-20261013-12' || c.projectRef!==t.projectRef || c.intentId!==input.intentId || !uuid(c.candidateId) || c.packageSha256!==input.packageSha256 || c.bodySha256!==input.bodySha256 || !Array.isArray(c.keyOrder) || c.keyOrder.length!==2 || c.keyOrder[0]!=='request' || c.keyOrder[1]!=='contact' || c.keyBytes!==32)throw Error('CANDIDATE_CONTEXT_REFUSED');
 return Object.freeze({...input,target:Object.freeze({...t}),candidateContext:Object.freeze({...c,keyOrder:Object.freeze([...c.keyOrder])})});
}
export function prepareGuestSignerIntent(input){
 if(!exact(input,['intentId','createdAt','packageSha256','bodySha256','admissionSha256','target','candidateContext','sessionText','sessionEvidenceSha256']) || !uuid(input.intentId) || !timestamp(input.createdAt))throw Error('INPUT_REFUSED');
 const {target:t,candidateContext:c}=prepareGuestSignerOperation(Object.fromEntries(['intentId','packageSha256','bodySha256','admissionSha256','target','candidateContext'].map(k=>[k,input[k]])));
 if(typeof input.sessionText!=='string' || !input.sessionText.isWellFormed() || Buffer.byteLength(input.sessionText)>4096 || !hash(input.sessionEvidenceSha256) || sha(input.sessionText)!==input.sessionEvidenceSha256)throw Error('SESSION_EVIDENCE_PIN_REQUIRED');
 let s;try{s=JSON.parse(input.sessionText);}catch{throw Error('SESSION_REFUSED');}
 if(!exact(s,['pid','backendStart','application','currentRole','sessionRole','superuser','database','serverVersion','state','readOnly','tls','tlsVersion']) || !Number.isSafeInteger(s.pid) || s.pid<1 || s.pid>2147483647 || !timestamp(s.backendStart) || timestampOrder(s.backendStart)>timestampOrder(input.createdAt) || s.application!=='k2-guest-initialize-'+input.intentId || s.currentRole!=='postgres' || s.sessionRole!=='postgres' || s.superuser!==false || s.database!=='postgres' || s.serverVersion!==170006 || s.state!=='idle in transaction' || s.readOnly!=='off' || s.tls!==true || s.tlsVersion!=='TLSv1.3')throw Error('SESSION_REFUSED');
 const record={format:'k2-guest-signer-intent-v1',owningMap:'MAP-018',idea:'IDEA-20261013-12',intentId:input.intentId,createdAt:input.createdAt,...guestPins,target:{...t},candidateContext:{...c,keyOrder:[...c.keyOrder]},session:{...s,evidenceSha256:input.sessionEvidenceSha256},authorized:false,dispatched:false,durablyRetained:false,providerAcceptance:false,automaticRetryAllowed:false,maximumAttempts:1};
 const text=JSON.stringify(record)+'\n';
 return Object.freeze({text,sha256:sha(text),bytes:Buffer.byteLength(text)});
}

// Validate a recorded human approval's declared scope before custody actions.
// The caller must retain authentic owner-message evidence: metadata can never
// establish that a human actually gave consent. No file/key/provider action here.
export function validateGuestSignerCustodyAuthorization(operation,authorization){
 const intent=prepareGuestSignerOperation(Object.fromEntries(['intentId','packageSha256','bodySha256','admissionSha256','target','candidateContext'].map(k=>[k,operation[k]])));
 const a=authorization,c=intent.candidateContext;
 if(!exact(a,['format','owningMap','idea','approved','ownerAnswer','ownerMessageReference','operationId','candidateId','packageSha256','candidateContextSha256','projectRef','supabaseUrl','privateDirectory','actions']) || a.format!=='k2-guest-signer-custody-authorization-v1' || a.owningMap!=='MAP-018' || a.idea!=='IDEA-20261013-12' || a.approved!==true || a.ownerAnswer!=='Approve this guest signer initialization' || typeof a.ownerMessageReference!=='string' || !a.ownerMessageReference.trim() || a.ownerMessageReference.length>512 || /[\x00-\x1f\x7f]/.test(a.ownerMessageReference) || a.operationId!==intent.intentId || a.candidateId!==c.candidateId || a.packageSha256!==intent.packageSha256 || a.candidateContextSha256!==sha(JSON.stringify(c)) || a.projectRef!==intent.target.projectRef || a.supabaseUrl!==intent.target.supabaseUrl || a.privateDirectory!=='C:/Users/jerze/.codex/private/k2-guest-'+c.candidateId || !Array.isArray(a.actions) || a.actions.length!==2 || a.actions[0]!=='create-private-candidate' || a.actions[1]!=='stream-private-copy')throw Error('OWNER_CUSTODY_AUTHORIZATION_REQUIRED');
 return Object.freeze({...a,actions:Object.freeze([...a.actions])});
}
export function prepareGuestSignerCustodyAction(input){
 if(!exact(input,['intent','authorization','action']) || !['create-private-candidate','stream-private-copy'].includes(input.action))throw Error('CUSTODY_ACTION_REFUSED');
 const prepared=prepareGuestSignerIntent(input.intent),intent=JSON.parse(prepared.text);
 const a=validateGuestSignerCustodyAuthorization(input.intent,input.authorization),c=intent.candidateContext;
 return Object.freeze({format:'k2-guest-custody-action-v1',owningMap:'MAP-018',idea:'IDEA-20261013-12',action:input.action,intentSha256:prepared.sha256,operationId:intent.intentId,candidateId:c.candidateId,candidateContextSha256:a.candidateContextSha256,privateDirectory:a.privateDirectory,ownerMessageReference:a.ownerMessageReference,ownerApprovalRecordMatches:true,productionWriteAuthorized:false,dispatched:false,automaticRetryAllowed:false});
}
