// MAP-018 / IDEA-20261009-11. Genuine local command journey, synthetic business facts.
import assert from 'node:assert/strict'
import {randomUUID,createHash} from 'node:crypto'
import {CATALOG_COLUMNS} from '../server/admin-bff/catalog-spreadsheet.js'
import {intakeEvidenceProbe} from './imported-intake-evidence-probe.inc.mjs'
import sharp from 'sharp'
import {decodeEvidenceImage} from '../server/admin-bff/product-intake.js'
import {importedIntakeBrowserProbe} from './imported-intake-browser-probe.inc.mjs'
import {adminStockReadProbe} from './admin-stock-read-probe.inc.mjs'

export async function importedProductProbe(uid,report,credentials,request,jar,{publicMedia=false,currentInstallation=false,browserWorkflow=false,browserInventory=false,staffStock=false,browserOut}={}){
 let mediaCleanup,mediaPath
 const command=async(expect,route,body,key=randomUUID())=>expect(route,await request(route,'POST',body,{headers:{'x-k2-idempotency-key':key}})).result
 const prepareStock=async({expect,cleanup,good},categoryId)=>{
  await command(expect,'product-master',{action:'category_policy_set',payload:{categoryId,minimumDays:150,expectedVersion:0,reason:'Explicit synthetic shelf-life admission'}})
  good('fixture_hub',await cleanup.from('hubs').upsert({id:'HUB-MNL-CENTRAL',name:'Synthetic workflow hub',code:'SYN-WORKFLOW',country:'PH',role:'Synthetic test'},{onConflict:'id',ignoreDuplicates:true}))
  good('fixture_custodian',await cleanup.from('custodians').upsert({id:'CUST-STAFF-ELENA',name:'Synthetic workflow custodian',role:'Synthetic test',hub_id:'HUB-MNL-CENTRAL'},{onConflict:'id',ignoreDuplicates:true}))
 }
 try{
 await intakeEvidenceProbe(uid,report,credentials,request,jar,{
  publicMedia,
  ...(browserWorkflow ? {browser: context => importedIntakeBrowserProbe({...context,credentials,uid,report,out:browserOut,browserInventory,staffStock})} : {}),
  before:async({client,cleanup,request,good,expect})=>{
   const values=Object.fromEntries(CATALOG_COLUMNS.map(k=>[k,'']))
   Object.assign(values,{template_version:'k2-catalog-v1',name:'Synthetic pantry '+randomUUID(),description:'Imported description to preserve',ingredients:'Synthetic label ingredients',country_of_origin:'Spain',primary_image_url:'https://example.invalid/imported-supplied.jpg',internal_notes:'Explicit synthetic CSV provenance'})
   const csv=CATALOG_COLUMNS.join(',')+'\n'+CATALOG_COLUMNS.map(k=>values[k]).join(',')
   const body={csvText:csv,fileSha256:createHash('sha256').update(csv).digest('hex'),operationId:randomUUID(),selectedRowNumbers:[2],chunkIndex:0,finalChunk:true,reason:'Explicit synthetic imported Draft test'}
   const result=await command(expect,'catalog-import/commit',body)
   const sku=result.rows[0].sku
   const baseline=good('imported_product_read',await client.from('products').select('*').eq('sku',sku).single())
   report.importedBaseline={status:baseline.status,published:baseline.published,primaryImagePreserved:baseline.primary_image_url===values.primary_image_url}
   assert.equal(baseline.status,'Draft','imported_status_draft');assert.equal(baseline.published,false,'imported_unpublished');assert.equal(baseline.primary_image_url,values.primary_image_url,'imported_media_preserved')
   const stock=good('imported_zero_stock',await client.from('product_batches').select('id').eq('sku',sku));assert.deepEqual(stock,[])
   let brandId='b7000000-0000-4000-8000-000000000001',categoryId='b7000000-0000-4000-8000-000000000002'
   if(currentInstallation){
    const created=[]
    for(const kind of ['brand','category']){
     const payload={kind,name:'MAP018 synthetic '+kind+' '+randomUUID(),parentId:null,reason:'Explicit synthetic integrated product reference'},key=randomUUID()
     const reply=expect('integrated_'+kind+'_create',await request('references','POST',payload,{headers:{'x-k2-idempotency-key':key,'x-k2-actor-id':uid}}))
     assert.equal(reply.result.reference.kind,kind);assert.equal(reply.result.reused,false);assert.equal(reply.currentReference.status,'available')
     assert.deepEqual(expect('integrated_'+kind+'_replay',await request('references','POST',payload,{headers:{'x-k2-idempotency-key':key,'x-k2-actor-id':uid}})).result,reply.result)
     created.push(reply.result.reference)
     if(kind==='brand')brandId=reply.result.reference.id;else categoryId=reply.result.reference.id
    }
    report.integratedReferences={created,exactReplay:true,protectedBff:true,offlineTaxonomySeeds:false}
   }
   const brands=good('canonical_brand',await client.from('brands').select('id,name').eq('id',brandId))
   const categories=good('canonical_category',await client.from('categories').select('id,name').eq('id',categoryId))
   assert.equal(brands.length,1);assert.equal(categories.length,1)
   const brand=brands[0],category=categories[0]
   if(browserInventory)await prepareStock({expect,cleanup,good},category.id)
   report.importedProduct={id:baseline.id,sku,catalogId:baseline.catalog_id,baselineVersion:String(baseline.catalog_record_version),importedDraft:true,zeroBatches:true,syntheticMediaUrl:values.primary_image_url}
   if(staffStock)await adminStockReadProbe({client,request,good,expect,credentials,target:{baseline,category},report,phase:'before'})
   const readReviewedVersion=async()=>{
    const reviewed=good('review_before_inventory_readback',await client.from('products').select('id,sku,catalog_record_version').eq('id',baseline.id).single())
    assert.equal(reviewed.id,baseline.id);assert.equal(reviewed.sku,baseline.sku)
    assert.equal(Number(reviewed.catalog_record_version),Number(baseline.catalog_record_version)+1)
    return String(reviewed.catalog_record_version)
   }
   return {baseline,brand,category,readReviewedVersion,existingProduct:{productId:baseline.id,recordVersion:String(baseline.catalog_record_version)}}
  },
  after:async({client,cleanup,request,good,expect,target,sessionId,requestId})=>{
   const {baseline,brand,category}=target,sku=baseline.sku
   const reviewedPayload={meta:{schemaVersion:'k2.product-content.v3'},product:{name:baseline.name,description:'Staff accepted correction',ingredients:'Rejected AI suggestion',origin:'Italy',brand:brand.name,category:category.name}}
   const fieldDecisions={name:'accepted',description:'accepted',ingredients:'rejected',origin:'accepted',brand:'accepted',category:'accepted'}
   const step=async(next,patch={})=>command(expect,'product-intake/step',{sessionId,step:next,patch})
   if(!browserWorkflow){
   await step('packaging_evidence')
   await step('research_handoff',{evidenceChecklist:{ingredients:true,allergens:true,storage:true,expiry:true},categoryType:'food'})
   await step('field_review')
   await step('draft_saved',{draftPayload:reviewedPayload,fieldDecisions,fieldProvenance:{sources:[]}})
   const body={sessionId,requestId,reviewedPayload,fieldDecisions},key=randomUUID()
   const reviewed=await command(expect,'product-intake/draft',body,key)
   assert.equal(reviewed.product_id,baseline.id);assert.equal(reviewed.sku,sku)
   assert.deepEqual(await command(expect,'product-intake/draft',body,key),reviewed)
   }
   const product=good('reviewed_product_read',await client.from('products').select('*').eq('id',baseline.id).single())
   for(const field of ['id','sku','catalog_id','primary_image_url','ingredients','internal_notes'])assert.equal(product[field],baseline[field])
   assert.equal(product.description,'Staff accepted correction');assert.equal(product.brand_id,brand.id);assert.equal(product.category_id,category.id)
   if(browserInventory){
    assert.equal(Number(report.intakeBrowser.reviewRecordVersion),Number(baseline.catalog_record_version)+1)
    assert.ok(Number(product.catalog_record_version)>=Number(report.intakeBrowser.reviewRecordVersion))
    report.importedProduct.reviewRecordVersion=report.intakeBrowser.reviewRecordVersion
    report.importedProduct.recordVersionAfterStockAndPublication=String(product.catalog_record_version)
   }else assert.equal(Number(product.catalog_record_version),Number(baseline.catalog_record_version)+1)
   report.importedProduct.reviewedOriginalIdentity=true;report.importedProduct.rejectedIngredientsPreserved=true;report.importedProduct.reviewReplay=!browserWorkflow
   if(publicMedia){
    mediaCleanup=cleanup.storage.from('product-images')
    const bytes=await sharp({create:{width:180,height:140,channels:3,background:{r:184,g:93,b:42}}}).png().toBuffer()
    const decoded=await decodeEvidenceImage(bytes,'image/png'),uploadKey=randomUUID()
    mediaPath=`${uid}/product-media/${uploadKey}-${decoded.sha256.slice(0,16)}.${decoded.extension}`
    const uploadHeaders={'content-type':'image/png','x-k2-idempotency-key':uploadKey}
    const uploaded=expect('public_media_upload',await request('product-media','POST',bytes,{headers:uploadHeaders})).media
    assert.deepEqual(expect('public_media_upload_replay',await request('product-media','POST',bytes,{headers:uploadHeaders})).media,uploaded)
    const url=client.storage.from('product-images').getPublicUrl(mediaPath).data.publicUrl
    assert.equal(uploaded.publicUrl,url);assert.ok(url.startsWith('https://127.0.0.1:54395/storage/v1/object/public/product-images/'))
    const mediaBody={sku,primary:{url,objectPath:mediaPath},lifestyle:[],secondary:[],reason:'Explicit synthetic public product image'},assignmentKey=randomUUID()
    const assigned=expect('public_media_assign',await request('product-media/assign','POST',mediaBody,{headers:{'x-k2-idempotency-key':assignmentKey}}))
    assert.deepEqual(expect('public_media_assign_replay',await request('product-media/assign','POST',mediaBody,{headers:{'x-k2-idempotency-key':assignmentKey}})),assigned)
    const saved=good('public_media_product_readback',await client.from('products').select('primary_image_url').eq('id',baseline.id).single())
    assert.equal(saved.primary_image_url,url)
    const anonymous=await fetch(url);assert.equal(anonymous.status,200)
    const retained=Buffer.from(await anonymous.arrayBuffer());assert.deepEqual(retained,decoded.buffer)
    const dimensions=await sharp(retained).metadata();assert.equal(dimensions.width,180);assert.equal(dimensions.height,140)
    report.publicMedia={url,objectPath:mediaPath,sha256:decoded.sha256,bytes:retained.length,width:180,height:140,uploadReplay:true,assignmentReplay:true,canonicalReadback:true,anonymousDownload:true,certificateValidation:true,browserRendered:false}
   }
   if(!browserInventory){
   // Existing owned fixture catalogs supply real canonical custody identifiers.
   await prepareStock({expect,cleanup,good},category.id)
   const expiry=new Date(Date.now()+400*86400000).toISOString().slice(0,10)
   const inventory={sessionId,inventoryRequestId:randomUUID(),source:'reconciliation',inventory:{quantity:6,boxCode:'SYN-WORKFLOW-BOX',batchCode:'SYN-WORKFLOW-LOT',expiryDate:expiry,isNonExpiry:false,unitCost:40,ownerCode:'SYNTHETIC-OWNER',hubLocation:'HUB-MNL-CENTRAL',custodian:'CUST-STAFF-ELENA',reason:'Explicit dummy opening stock; no physical inventory claim'}}
   const inventoryKey=randomUUID(),stock=await command(expect,'product-intake/inventory',inventory,inventoryKey)
   assert.equal(stock.success,true);assert.deepEqual(await command(expect,'product-intake/inventory',inventory,inventoryKey),stock)
   }
   const batches=good('canonical_stock',await client.from('product_batches').select('quantity,reserved_quantity').eq('sku',sku))
   assert.equal(batches.reduce((n,b)=>n+Number(b.quantity),0),6)
   assert.equal(batches.reduce((n,b)=>n+Number(b.reserved_quantity),0),0)
   report.importedProduct.canonicalStock=6;report.importedProduct.stockReplay=!browserInventory
   if(staffStock)await adminStockReadProbe({client,request,good,expect,credentials,target,report,phase:'after'})
   if(!browserInventory)await command(expect,'product-intake/publication',{sessionId,requestedStatus:'under_review',reason:'Explicit synthetic staff package review'})
   const current=good('publication_master',await client.from('products').select('*').eq('id',baseline.id).single())
   await command(expect,'product-master',{action:'update',payload:{sku,patch:{srp:100,is_human_reviewed:true},expectedUpdatedAt:current.updated_at,reason:'Explicit synthetic Admin pricing and human review'}})
   await command(expect,'product-intake/publication',{sessionId,requestedStatus:'live',reason:'Explicit synthetic final publication review'})
   const final=good('live_product',await client.from('products').select('*').eq('id',baseline.id).single())
   assert.equal(final.status,'Live')
   const listingKey=randomUUID(),assignment={action:'website_listing_set',sku,assigned:true,expectedUpdatedAt:null,reason:'Explicit synthetic Website assignment'}
   const listing=await command(expect,'channels',assignment,listingKey);assert.deepEqual(await command(expect,'channels',assignment,listingKey),listing)
   const row=good('website_listing',await client.from('channel_listings').select('sku,status,channel_source').eq('sku',sku).eq('channel_source','website').single())
   assert.equal(row.status,'Active')
   report.importedProduct.liveOriginalIdentity=true;report.importedProduct.websiteListing=row;report.importedProduct.websiteReplay=true
   report.checks.push('genuine_bff_csv_review_original_identity_canonical_stock_publication_website_listing')
  }
 })
 }finally{
  if(mediaPath){
   const removed=await mediaCleanup.remove([mediaPath]);assert.equal(removed.error,null,'public_media_disposable_cleanup')
   const absent=await fetch(report.publicMedia?.url||process.env.SUPABASE_URL+'/storage/v1/object/public/product-images/'+mediaPath)
   assert.ok([400,404].includes(absent.status),'public_media_cleanup_http_not_found')
   const absentBody=await absent.json()
   assert.equal(Number(absentBody.statusCode),404,'public_media_cleanup_storage_not_found')
   if(report.publicMedia){report.publicMedia.disposableCleanup=true;report.publicMedia.cleanupNotFound={httpStatus:absent.status,storageStatus:Number(absentBody.statusCode)}}
  }
 }
}
