// MAP-018 / IDEA-20261013-07. Pure classifications, never apply authorization.
export const PHASED_RECEIPT=Object.freeze({version:'20261013110000',name:'k2_category_operating_full_catalog_phased_controlled_20261013',idempotencyKey:'k2-controlled-v1:sha256:587e481e549039dc31c1ee3cff9670a0a9bbf8a9cf9a95ee18a20711bf384c3d',statementSha256:'587e481e549039dc31c1ee3cff9670a0a9bbf8a9cf9a95ee18a20711bf384c3d'});
const relationKeys=['intake_sessions','sku_seq','channels','channel_shops'];
const blocked=detail=>({state:'blocked',mode:'unknown',reapplyAllowed:false,detail});
const utcTimestamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,19)===value.slice(0,19);
export const CATEGORY_ACTIVATION_PACKET=Object.freeze({path:'supabase/prepared/20261015_category_policy_activation.sql',sha256:'69e80b1ac8a1e7c255abfbcb8d16c1c9ce5582ff3cf4be651129bf1f6d0051de',proposedDepth:10});
const privateActivationRelation=r=>r?.owner==='postgres'&&r.rls===true&&['publicAccess','anonAccess','authenticatedAccess','serviceAccess'].every(k=>r[k]===false);
export function classifyCategoryActivationPreparation(snapshot,installationMode,requestedHash,actualPacketHash,target){
 const refuse=detail=>({...blocked(detail),writeAuthorized:false});
 if(requestedHash!==CATEGORY_ACTIVATION_PACKET.sha256||actualPacketHash!==requestedHash)return refuse('Exact category activation preparation packet/request hash differs');
 if(installationMode!=='installed'||!privateActivationRelation(snapshot?.relation)||!Array.isArray(snapshot?.rows)||snapshot.rows.length!==0)return refuse('Preparation requires the exact private installed, unactivated target');
 if(!target||['categoryRows','policyRows','eventRows','contextRows'].some(k=>target[k]!==0)||target.configOwnerOnly!==true)return refuse('Category activation empty target or owner-only configuration differs');
 const hashes={payload:'91eba694981253dc8bd8233727c2f2b38cb8686507acc9097999f60abf408d36',start:'23e82f11900727d669d7c41bd6eab31c42a4f5870fae9ceb9d6d736a460ae65c',current:'3f7afcb349d034b121d1fc57d9da514a667e3b491b809bd6d43e5255ae938b25'};
 for(const [key,hash] of Object.entries(hashes)){
  const h=target[key];
  if(!h||h.owner!=='postgres'||h.definer!==true||h.emptySearchPath!==true||h.ownerOnlyExecute!==true||h.bodySha256!==hash)return refuse('Category activation private '+key+' dependency differs');
 }
 return {state:'owner',mode:'exact-activation-preparation',reapplyAllowed:false,writeAuthorized:false,packetSha256:requestedHash,proposedDepth:10,detail:'Exact packet69e80b1a and empty private target match; proposed depth10 and activation await fresh owner authorization. Normal readiness remains blocked until applied and verified'};
}
// Activation presence is an operational precondition, not value approval,
// function/hosted acceptance, an installer replay or authorization to write.
export function classifyCategoryPolicyActivation(snapshot,installationMode){
 if(installationMode==='first-apply'){
  if(snapshot?.relation===null&&Array.isArray(snapshot.rows)&&snapshot.rows.length===0)return {state:'owner',mode:'first-apply',reapplyAllowed:false,detail:'Category activation must be approved and verified after canonical installation, before operations'};
  return blocked('Unexpected category activation on first-apply baseline');
 }
 if(installationMode!=='installed'||!snapshot?.relation||!Array.isArray(snapshot.rows))return blocked('Missing installed category activation evidence');
 const r=snapshot.relation;
 if(!privateActivationRelation(r))return blocked('Category activation relation ownership, RLS or private access differs');
 if(snapshot.rows.length===0)return blocked('Category policy is not configured: singleton activation row is absent');
 const c=snapshot.rows[0];
 if(snapshot.rows.length!==1||c?.singleton!==true||!Number.isInteger(c.maximumDepth)||c.maximumDepth<1||c.maximumDepth>2147483647)return blocked('Category activation must be one true singleton with a positive PostgreSQL integer depth');
 return {state:'verified',mode:'installed',reapplyAllowed:false,detail:`Private category activation present, maximum depth ${c.maximumDepth}; exact value approval/recovery and operational acceptance remain separate`};
}
export function classifyInstalledReadiness(receipts,relations){
 if(!Array.isArray(receipts)||!relations||relationKeys.some(k=>!Number.isInteger(relations[k])))return blocked('Missing complete schema/receipt evidence');
 if(receipts.length===0&&relationKeys.every(k=>relations[k]===0))return {state:'verified',mode:'first-apply',reapplyAllowed:false,detail:'No controlled receipt and all canonical chains absent; exact first-apply authorization still required'};
 if(receipts.length!==1)return blocked('Controlled receipt absent, duplicate or uncertain');
 const r=receipts[0];
 if(!r||Object.entries(PHASED_RECEIPT).some(([k,v])=>r[k]!==v)||r.statementCount!==1||r.statementBytes!==10588727)return blocked('Controlled complete-source receipt differs from approved installation');
 if(!relationKeys.every(k=>relations[k]===1))return blocked('Installed receipt has incomplete canonical relations');
 return {state:'verified',mode:'installed',reapplyAllowed:false,detail:'Exact phased complete-source receipt and canonical relations installed; installer must not be repeated'};
}
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
export function classifyInstalledPermissions(live,publicFunctions,expected){
 if(!Array.isArray(live)||!Array.isArray(publicFunctions)||!Array.isArray(expected)||![26,27,28].includes(expected.length))return blocked('Incomplete installed permission evidence');
 if(expected.length>=27){const adapter=expected.find(r=>r.signature==='public.guest_order_conversation_v1(p_timestamp bigint, p_nonce uuid, p_payload_text text, p_ip_hash text, p_signature text, p_guest_grant_hash text, p_base64 text)');if(!adapter||adapter.owner!=='postgres'||adapter.definer!==true||adapter.result!=='jsonb'||adapter.publicExecute!==false)return blocked('Approved order-chat adapter authority differs');}
 if(expected.length===28){const rate=expected.find(r=>r.signature==='public.consume_admin_preauth_rate_v1(p_action text, p_timestamp bigint, p_nonce uuid, p_ip_hash text, p_contact_hash text, p_signature text)');if(!rate||rate.owner!=='postgres'||rate.definer!==true||rate.result!=='jsonb'||rate.publicExecute!==false)return blocked('Approved pre-auth rate authority differs');}
 const keys=['signature','owner','definer','result','publicExecute'];
 const valid=a=>a.every(r=>r&&typeof r.signature==='string'&&typeof r.owner==='string'&&typeof r.definer==='boolean'&&typeof r.result==='string'&&typeof r.publicExecute==='boolean'&&Object.keys(r).sort().join(',')===keys.slice().sort().join(','))&&new Set(a.map(r=>r.signature)).size===a.length;
 if(!valid(live)||!valid(expected)||!valid(publicFunctions))return blocked('Malformed, partial or duplicate installed permission records');
 const sort=a=>a.slice().sort((a,b)=>a.signature.localeCompare(b.signature));
 const same=(a,b)=>JSON.stringify(stable(sort(a)))===JSON.stringify(stable(sort(b)));
 if(!same(live,expected))return blocked('Anonymous overload signature or authority differs from reviewed installed catalog');
 const triggers=expected.filter(r=>r.publicExecute);
 if(triggers.map(r=>r.signature).sort().join('|')!=='public.sync_product_publication_status()|public.touch_product_intake_session()'||!triggers.every(r=>r.owner==='postgres'&&!r.definer&&r.result==='trigger')||!same(publicFunctions,triggers))return blocked('PUBLIC execute exceeds the two reviewed invoker trigger functions');
 return {state:'verified',mode:'installed',reapplyAllowed:false,detail:`Exact reviewed${expected.length-2} explicit anonymous grants and2 invoker trigger ACLs; hosted caller/legacy-route acceptance remains separate`};
}
export function classifyBackupProof(manifest,proof,actual){
 if(!manifest||!proof||!actual||manifest.projectRef!=='pixplcjqivlfflickobf'||typeof manifest.backupId!=='string'||!manifest.backupId||proof.backupId!==manifest.backupId||proof.restoreVerified!==true)return blocked('Backup and isolated restore identity are not bound');
 if(!/^[a-f0-9]{64}$/.test(actual.sha256)||manifest.encryptedSha256!==actual.sha256||!Number.isSafeInteger(actual.bytes)||actual.bytes<1||manifest.encryptedBytes!==actual.bytes)return blocked('Encrypted backup bytes/hash differ from manifest');
 if(!/^\d{14}$/.test(actual.latest)||proof.latestMigrationVersion!==actual.latest)return blocked('Restored backup does not contain the current installed migration');
 const created=Date.parse(manifest.createdAt),verified=Date.parse(proof.verifiedAt);
 if(!utcTimestamp(manifest.createdAt)||!utcTimestamp(proof.verifiedAt)||!Number.isFinite(actual.now)||created>actual.now+60000||verified>actual.now+60000||verified<created)return blocked('Backup creation/restore chronology is invalid');
 const day=manifest.createdAt.slice(0,10).replaceAll('-','');
 if(day<actual.latest.slice(0,8))return blocked('Backup predates current migration day');
 return {state:'verified',mode:'backup',reapplyAllowed:false,detail:'Encrypted file hash/bytes, K2 backup identity and isolated restored current migration verified; managed provider recovery remains excluded'};
}
export function selectBackupEvidence(candidates){
 if(!Array.isArray(candidates)||candidates.length===0)return blocked('No local encrypted backup evidence');
 const unknown=candidates.filter(c=>!c||typeof c.file!=='string'||!c.manifest||c.manifest.projectRef!=='pixplcjqivlfflickobf'||!utcTimestamp(c.manifest.createdAt));
 if(unknown.length)return blocked('Unclassified backup creation metadata: '+unknown.map(c=>c?.file??'unknown').join(', '));
 const sorted=candidates.slice().sort((a,b)=>Date.parse(b.manifest.createdAt)-Date.parse(a.manifest.createdAt));
 if(sorted.length>1&&Date.parse(sorted[0].manifest.createdAt)===Date.parse(sorted[1].manifest.createdAt))return blocked('Ambiguous newest backup creation timestamps');
 return {state:'verified',candidate:sorted[0],detail:'Newest K2 manifest creation selected; encrypted/restore proof still required'};
}
