// MAP-018 / IDEA-20261012-01. Genuine owned Auth/PostgREST/BFF, no provider.
import assert from 'node:assert/strict'
export const recoveryTransportKeys=Array.from({length:5},(_,i)=>`a1200000-0000-4000-8000-00000000000${i+1}`)
export async function productMasterRecoveryTransportProbe({uid,sku,client,cleanup,request,good,expect,report}) {
  assert.equal(process.env.SUPABASE_URL,'https://127.0.0.1:54395')
  const result=report.productMasterRecovery={scope:'Genuine local Auth-issued AAL2/current role, actual routed BFF and canonical receipt/version behavior; HTTP loss deliberately injected only in owned loopback fixture',checks:[],keys:recoveryTransportKeys,sku,actor:uid}
  const read=async()=>good('recovery_current_product',await client.from('products').select('id,sku,status,published,srp,is_human_reviewed,updated_at').eq('sku',sku).single())
  const body=(row,patch,reason)=>({action:'update',payload:{sku,patch,expectedUpdatedAt:row.updated_at,reason}})
  const send=(value,key,loss)=>request('product-master','POST',value,{headers:{'x-k2-idempotency-key':key,'x-k2-actor-id':uid,...(loss?{'x-k2-fixture-product-recovery-loss':loss}:{})}})
  const original=await read(),first=body(original,{srp:100,is_human_reviewed:true},'Explicit synthetic recovered human review')
  await assert.rejects(()=>send(first,recoveryTransportKeys[0],'after-commit'),{name:'TypeError'})
  const applied=await read()
  assert.equal(applied.srp,100);assert.equal(applied.is_human_reviewed,true)
  assert.equal(applied.status,original.status);assert.equal(applied.published,original.published);assert.notEqual(applied.updated_at,original.updated_at)
  assert.equal(report.productRecoveryDroppedReplies?.at(-1)?.point,'after-commit')
  const historical=report.productRecoveryDroppedReplies.at(-1).result
  assert.deepEqual(historical,{sku,status:applied.status,updatedAt:applied.updated_at})
  result.checks.push('actual_after_commit_socket_loss_canonical_review_saved')
  const newer=body(applied,{srp:110,is_human_reviewed:false},'Explicit synthetic later review withdrawal')
  expect('recovery_newer_decision',await send(newer,recoveryTransportKeys[1]))
  const later=await read();assert.equal(later.srp,110);assert.equal(later.is_human_reviewed,false);assert.notEqual(later.updated_at,applied.updated_at)
  try {
    assert.deepEqual(good('recovery_role_staff',await cleanup.from('user_profiles').update({role:'Staff'}).eq('id',uid).select('id,role')),[{id:uid,role:'Staff'}])
    const refused=expect('recovery_current_staff_refuses_saved_receipt',await send(first,recoveryTransportKeys[0]),403)
    assert.equal(refused.error.code,'PRODUCT_ADMIN_REQUIRED')
  } finally {
    assert.deepEqual(good('recovery_role_admin',await cleanup.from('user_profiles').update({role:'Admin'}).eq('id',uid).select('id,role')),[{id:uid,role:'Admin'}])
  }
  const replay=expect('recovery_original_historical_receipt',await send(first,recoveryTransportKeys[0])).result
  assert.deepEqual(replay,historical);assert.deepEqual(await read(),later)
  result.checks.push('current_staff_refusal_then_admin_exact_historical_replay_without_reapplying')
  const conflict=JSON.parse(JSON.stringify(first));conflict.payload.reason='Changed synthetic saved reason must refuse'
  const keyConflict=expect('recovery_key_payload_conflict',await send(conflict,recoveryTransportKeys[0]),409)
  assert.equal(keyConflict.error.code,'IDEMPOTENCY_CONFLICT');assert.deepEqual(await read(),later)
  result.checks.push('changed_literal_payload_same_key_refused_without_current_change')
  const absent=body(later,{srp:9999,is_human_reviewed:true},'Explicit synthetic never dispatched review')
  await assert.rejects(()=>send(absent,recoveryTransportKeys[2],'before-dispatch'),{name:'TypeError'})
  assert.deepEqual(await read(),later);assert.equal(report.productRecoveryDroppedReplies.at(-1).point,'before-dispatch')
  expect('recovery_later_after_absent',await send(body(later,{srp:120,is_human_reviewed:false},'Explicit synthetic edit after missing dispatch'),recoveryTransportKeys[3]))
  const changed=await read();assert.equal(changed.srp,120);assert.equal(changed.is_human_reviewed,false)
  for(let attempt=0;attempt<2;attempt++) {
    const refused=expect('recovery_absent_stale_version',await send(absent,recoveryTransportKeys[2]),409)
    assert.equal(refused.error.code,'PRODUCT_VERSION_CONFLICT');assert.deepEqual(await read(),changed)
  }
  result.checks.push('before_dispatch_loss_then_repeated_version_refusal_preserves_current_state')
  // Canonical explicit decision keeps the enclosing Live prerequisite intact.
  expect('recovery_final_explicit_review',await send(body(changed,{srp:100,is_human_reviewed:true},'Explicit synthetic final pricing and human review'),recoveryTransportKeys[4]))
  const final=await read();assert.equal(final.srp,100);assert.equal(final.is_human_reviewed,true)
  assert.equal(final.id,original.id);assert.equal(final.status,original.status);assert.equal(final.published,original.published)
  result.historicalReceipt=replay;result.currentAfterReplay=later;result.currentAfterVersionRefusal=changed;result.final=final
  result.privateReceiptEventWitness='Guest must independently assert four completed receipts/events and no absent-key receipt/event before offline restoration'
  result.renderedBrowser=false;result.safeDiscardQualified=false;result.passed=true
}
