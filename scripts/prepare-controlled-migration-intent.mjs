// MAP-018 / IDEA-20261009-08. Pure offline serialization; no credentials or dispatch.
import {createHash} from 'node:crypto';
const sha=v=>createHash('sha256').update(v).digest('hex');
const pins={source:['8ca8e22fedcae9fa63eaba682b897b2dcfaa0b817f3f1c7a010204314fa5dc99',8278524],body:['cb969b36d1de42b912276d8a53d7dc63672bbe5320bc30a777e7c0aba3063b49',8278397],envelope:['c3cd02e1e88a1865c306232e0ff3c1a9b39101ae25f0a836a92e086a92e48157',16565984]};
const exact=(value,keys)=>value!==null && typeof value==='object' && !Array.isArray(value) && Object.getPrototypeOf(value)===Object.prototype && Object.keys(value).sort().join(',')===keys.slice().sort().join(',');
const uuid=v=>typeof v==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const hash=v=>typeof v==='string' && /^[a-f0-9]{64}$/.test(v);
const timestamp=v=>typeof v==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,19)===v.slice(0,19);
const timestampOrder=v=>v.slice(0,19)+'.'+(v.match(/\.(\d+)/)?.[1]??'').padEnd(6,'0');
export function prepareControlledIntent(input){
 if(!exact(input,['source','body','envelope','intentId','createdAt','target','sessionText','sessionEvidenceSha256']) || !uuid(input.intentId) || !timestamp(input.createdAt))throw Error('INPUT_REFUSED');
 const artifacts={};
 for(const [name,[expected,bytes]] of Object.entries(pins)){
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
 const record={format:'k2-controlled-intent-v1',owningMap:'MAP-018',idea:'IDEA-20261009-08',intentId:input.intentId,createdAt:input.createdAt,...artifacts,target,session,receipt:{version:'20261012140000',name:'k2_category_operating_full_cutover_controlled_20261012',idempotencyKey:'k2-controlled-v1:sha256:'+pins.source[0]},authorized:false,dispatched:false,durablyRetained:false,providerAcceptance:false,automaticRetryAllowed:false};
 const text=JSON.stringify(record)+'\n';
 return Object.freeze({text,sha256:sha(text),bytes:Buffer.byteLength(text)});
}
