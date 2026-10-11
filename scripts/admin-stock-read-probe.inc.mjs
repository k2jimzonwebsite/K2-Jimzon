// MAP-018 / IDEA-20261011-01. Genuine local protected reads; dummy facts only.
import assert from 'node:assert/strict'
import { createServerSupabase } from '../server/admin-bff/supabase.js'
import { randomUUID } from 'node:crypto'

export async function adminStockReadProbe({client,request,good,expect,credentials,target,report,phase}) {
  const sku=target.baseline.sku
  const read=async value=>{
    const rows=good('staff_stock_'+phase,await client.rpc('read_admin_product_stock_v1',{p_skus:[sku]}))
    assert.deepEqual(rows,[{sku,stock_from_batches:value}])
    const catalog=expect('staff_catalog_'+phase,await request('products'))
    assert.equal(catalog.products.find(p=>p.sku===sku)?.stock_available,value)
    const master=expect('staff_master_'+phase,await request('product-master?sku='+sku))
    assert.equal(master.product.stock_available,value)
    return {rpc:rows,catalog:value,master:value}
  }
  report.staffStockRead ||= {scope:'Current protected staff stock independent of Website offers; prepared SQL extension, not accepted provider envelope',providerWrites:false}
  if(phase==='before'){
    report.staffStockRead.noLots=await read(0)
    return
  }
  report.staffStockRead.eligible=await read(6)
  const publicRows=good('public_offer_still_absent',await client.from('v_product_stock_from_batches').select('sku,stock_from_batches').eq('sku',sku))
  assert.deepEqual(publicRows,[]);report.staffStockRead.publicDraftOfferAbsent=true
  for(const invalid of [null,[sku,sku],[null],Array.from({length:501},(_,i)=>'synthetic-'+i)]){
    const refused=await client.rpc('read_admin_product_stock_v1',{p_skus:invalid})
    assert.equal(refused.error?.code,'22023')
  }
  report.staffStockRead.invalidInputsRefused=4
  const policy=async(minimumDays,expectedVersion)=>expect('staff_stock_policy',await request('product-master','POST',{
    action:'category_policy_set',payload:{categoryId:target.category.id,minimumDays,expectedVersion,reason:'Explicit synthetic current staff stock policy read test'},
  },{headers:{'x-k2-idempotency-key':randomUUID()}}))
  await policy(500,1)
  report.staffStockRead.currentPolicy=await read(0)
  const physical=good('staff_policy_preserves_physical',await client.from('product_batches').select('quantity,reserved_quantity').eq('sku',sku))
  assert.equal(physical.reduce((sum,b)=>sum+Number(b.quantity),0),6)
  await policy(150,2)
  report.staffStockRead.restoredPolicy=await read(6)
  report.intakeStage='staff_stock_anonymous_refusal'
  const anon=createServerSupabase()
  const denied=await anon.rpc('read_admin_product_stock_v1',{p_skus:[sku]})
  assert.equal(denied.error?.code,'42501')
  report.staffStockRead.anonymousRefused=true
  good('staff_stock_aal1_login',await anon.auth.signInWithPassword({email:credentials.email,password:credentials.password}))
  assert.equal(good('staff_stock_aal1_level',await anon.auth.mfa.getAuthenticatorAssuranceLevel()).currentLevel,'aal1')
  const aal1=await anon.rpc('read_admin_product_stock_v1',{p_skus:[sku]})
  assert.equal(aal1.error?.code,'42501')
  report.staffStockRead.aal1Refused=true
  good('staff_stock_aal1_local_logout',await anon.auth.signOut({scope:'local'}))
  report.staffStockRead.passed=true
}
