// MAP-018 / IDEA-20261013-07. Pure classifications, never apply authorization.
export const PHASED_RECEIPT=Object.freeze({version:'20261013110000',name:'k2_category_operating_full_catalog_phased_controlled_20261013',idempotencyKey:'k2-controlled-v1:sha256:587e481e549039dc31c1ee3cff9670a0a9bbf8a9cf9a95ee18a20711bf384c3d',statementSha256:'587e481e549039dc31c1ee3cff9670a0a9bbf8a9cf9a95ee18a20711bf384c3d'});
const relationKeys=['intake_sessions','sku_seq','channels','channel_shops'];
const blocked=detail=>({state:'blocked',mode:'unknown',reapplyAllowed:false,detail});
const utcTimestamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,19)===value.slice(0,19);
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
