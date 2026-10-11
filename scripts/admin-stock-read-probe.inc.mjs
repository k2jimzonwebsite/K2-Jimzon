// MAP-018 / IDEA-20261011-01. Genuine local protected reads; dummy facts only.
import assert from 'node:assert/strict'
import { createServerSupabase } from '../server/admin-bff/supabase.js'
import { randomUUID } from 'node:crypto'

export async function adminStockReadProbe({client,request,good,expect,credentials,target,report,phase,stockRoleTransport=false,cleanup,uid,jar}) {
  const sku=target.baseline.sku
  const read=async (value,{masterStatus=200}={})=>{
    const rows=good('staff_stock_'+phase,await client.rpc('read_admin_product_stock_v1',{p_skus:[sku]}))
    assert.deepEqual(rows,[{sku,stock_from_batches:value}])
    const catalog=expect('staff_catalog_'+phase,await request('products'))
    assert.equal(catalog.products.find(p=>p.sku===sku)?.stock_available,value)
    const master=expect('staff_master_'+phase,await request('product-master?sku='+sku),masterStatus)
    if(masterStatus===200)assert.equal(master.product.stock_available,value)
    else assert.equal(master.error.code,'PRODUCT_ADMIN_REQUIRED')
    const snapshot=good('staff_lot_snapshot_'+phase,await client.rpc('read_admin_lot_snapshot_v1',{p_sku:sku}))
    assert.equal(snapshot.complete,true);assert.equal(snapshot.schemaVersion,'k2.admin-lot-snapshot.v1')
    const lotRead=expect('staff_lot_bff_'+phase,await request('lots?sku='+sku)).data
    assert.equal(lotRead.complete,true)
    const physical=lotRead.lots.reduce((sum,b)=>sum+b.quantity,0)
    assert.equal(physical,phase==='before'?0:6)
    return {rpc:rows,catalog:value,master:masterStatus===200?value:{refused:masterStatus},physical,snapshotComplete:true}
  }
  report.staffStockRead ||= {scope:'Current protected staff stock independent of Website offers; prepared SQL extension, not accepted provider envelope',providerWrites:false}
  if(stockRoleTransport)report.staffStockRead.scope='Current-role genuine local Auth/PostgREST/BFF reads using accepted native56 installer; provider/hosted acceptance separate'
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
  assert.equal((await anon.rpc('read_admin_lot_snapshot_v1',{p_sku:sku})).error?.code,'42501')
  report.staffStockRead.anonymousRefused=true
  good('staff_stock_aal1_login',await anon.auth.signInWithPassword({email:credentials.email,password:credentials.password}))
  assert.equal(good('staff_stock_aal1_level',await anon.auth.mfa.getAuthenticatorAssuranceLevel()).currentLevel,'aal1')
  const aal1=await anon.rpc('read_admin_product_stock_v1',{p_skus:[sku]})
  assert.equal(aal1.error?.code,'42501')
  assert.equal((await anon.rpc('read_admin_lot_snapshot_v1',{p_sku:sku})).error?.code,'42501')
  report.staffStockRead.aal1Refused=true
  good('staff_stock_aal1_local_logout',await anon.auth.signOut({scope:'local'}))
  if(stockRoleTransport){
    const promote=async role=>{
      const rows=good('stock_current_role_'+role,await cleanup.from('user_profiles').update({role}).eq('id',uid).select('id,role'))
      assert.deepEqual(rows,[{id:uid,role}])
    }
    report.staffStockRead.currentRoleTransport={auth:'Existing genuine Auth-issued AAL2 session; profile changes are synthetic owner setup',roles:{}}
    try{
      for(const role of ['Staff','SuperAdmin']){
        await promote(role)
        report.staffStockRead.currentRoleTransport.roles[role]=await read(6,{masterStatus:role==='Staff'?403:200})
      }
      await promote('Customer')
      for(const [rpc,args] of [['read_admin_product_stock_v1',{p_skus:[sku]}],['read_admin_lot_snapshot_v1',{p_sku:sku}]]){
        const refused=await client.rpc(rpc,args);assert.equal(refused.error?.code,'42501',rpc)
      }
      const savedJar=new Map(jar),cookie=[...savedJar].map(([k,v])=>k+'='+v).join('; ')
      try{
        for(const route of ['products','product-master?sku='+sku,'lots?sku='+sku])expect('customer_current_stock_refusal',await request(route,'GET',undefined,{cookie}),403)
      }finally{jar.clear();for(const [k,v] of savedJar)jar.set(k,v)}
      report.staffStockRead.currentRoleTransport.roles.Customer={rpcRefused:2,bffRefused:3}
    }finally{await promote('Admin')}
    report.staffStockRead.currentRoleTransport.restoredAdmin=await read(6)
  }
  report.staffStockRead.passed=true
}
