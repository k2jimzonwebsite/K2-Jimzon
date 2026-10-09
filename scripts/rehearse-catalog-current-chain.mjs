// IDEA-20261003-02: actual CSV/server/HMAC/SQL composition on root-owned clone only.
import fs from 'node:fs'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import Papa from 'papaparse'
import {readCatalogExport,serializeCatalogCsv,parseCatalogCsv,previewCatalogImport,buildCatalogCommitPayload,CATALOG_COLUMNS} from '../server/admin-bff/catalog-spreadsheet.js'
import {signedAdminCommandArguments} from '../server/admin-bff/security.js'
import {extractPublicFunctionBodies,intakeFoundationWitnessSha256} from './rehearse-intake-foundation.mjs'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
export const catalogCurrentChainWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export function catalogProductDelta(before,after,sku) {
 const canon=x=>JSON.stringify(Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))))
 const allowed=new Set(['name','title','description','usage_instructions','storage_instructions','ingredients','allergens','country_of_origin','net_weight','package_type','subcategory','seo_keywords','primary_image_url','product_video_url','internal_notes','catalog_record_version','updated_at'])
 const old=before.find(p=>p.sku===sku),current=after.find(p=>p.sku===sku)
 return !!old&&!!current&&before.length===after.length&&new Set(after.map(p=>p.sku)).size===after.length
  &&before.every(p=>{const n=after.find(x=>x.sku===p.sku);return n&&(p.sku!==sku?canon(p)===canon(n):canon(Object.fromEntries(Object.entries(p).filter(([k])=>!allowed.has(k))))===canon(Object.fromEntries(Object.entries(n).filter(([k])=>!allowed.has(k)))))})
  &&current.catalog_record_version===old.catalog_record_version+1
}
export async function rehearseCatalogCurrentChain({sync,value,check,literal,source,evidence,fixture,actor,afterCatalogInstallation}) {
 fs.writeFileSync(path.join(evidence,'executed-catalog-current-chain.mjs'),bytes)
 fs.writeFileSync(path.join(evidence,'executed-catalog-candidate-parser.mjs'),fs.readFileSync(fileURLToPath(new URL('./rehearse-intake-foundation.mjs',import.meta.url))))
 const report={idea:'IDEA-20261003-02',scope:'Local prepared current-body/catalog role-visible CSV and signed SQL composition; not full installer/concurrency/provider/real acceptance',candidateParserSha256:intakeFoundationWitnessSha256,steps:[],queries:[]}
 report.serverSources=['server/admin-bff/catalog-spreadsheet.js','server/admin-bff/security.js'].map(file=>{const b=fs.readFileSync(file);fs.writeFileSync(path.join(evidence,'executed-'+path.basename(file)),b);return {file,sha256:createHash('sha256').update(b).digest('hex')}})
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),write=()=>fs.writeFileSync(path.join(evidence,'catalog-current-chain.json'),JSON.stringify(report,null,2)+'\n')
 const tables=()=>JSON.parse(value(`select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private') and c.relkind in ('r','p');`))
 const hashes=()=>JSON.parse(value(`select jsonb_object_agg(table_name,table_hash)::text from (values ${tables().map(t=>`(${literal(t)},(select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by to_jsonb(x)::text),'')) from ${t} x))`).join(',')}) s(table_name,table_hash);`))
 const products=()=>JSON.parse(value(`select jsonb_agg(to_jsonb(p) order by sku)::text from public.products p;`))
 const functions=()=>JSON.parse(value(`select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'bodyMd5',md5(replace(p.prosrc,chr(13),'')),'catalog',to_jsonb(p)-'prosrc') order by p.oid)::text from pg_proc p where p.pronamespace in ('public'::regnamespace,'k2_private'::regnamespace);`))
 const identitySql=()=>`select set_config('request.jwt.claim.sub',${literal(actor)},false);select set_config('request.jwt.claims','{"aal":"aal2"}',false);set role authenticated;`
 const client={from(table){if(table!=='products')throw Error('CATALOG_QUERY_TABLE_INVALID');let projection;return {select(columns,options){if(options?.count!=='exact'||!columns.split(',').every(c=>/^[a-z_]+$/.test(c)))throw Error('CATALOG_QUERY_INVALID');projection=columns;return this},order(column,options){if(column!=='sku'||options.ascending!==true)throw Error('CATALOG_ORDER_INVALID');return this},async limit(n){if(n!==1001)throw Error('CATALOG_LIMIT_INVALID');const sql=identitySql()+`select jsonb_build_object('count',(select count(*) from public.products),'data',(select coalesce(jsonb_agg(to_jsonb(p) order by sku),'[]'::jsonb) from (select ${projection} from public.products order by sku limit ${n}) p))::text;`;const result=JSON.parse(value(sql));report.queries.push({sql,result,count:result.count,returned:result.data.length});return {...result,error:null}}}}}
 const controls=()=>JSON.parse(value(`select jsonb_build_object('observedNow',clock_timestamp(),'observedBucket',date_trunc('minute',clock_timestamp()),'nonces',(select coalesce(jsonb_agg(to_jsonb(n) order by actor_id,action,nonce),'[]') from k2_private.admin_request_nonces n),'rates',(select coalesce(jsonb_agg(to_jsonb(b) order by scope,subject,bucket_start),'[]') from k2_private.admin_request_rate_buckets b))::text;`))
  const exactControls=(a,b,actor,args)=>{
    if(!args||!Number.isInteger(args.p_timestamp)||args.p_action!=='catalog_import_chunk'
      ||args.p_timestamp<Math.floor(Date.parse(a.observedNow)/1000)
      ||args.p_timestamp>Math.floor(Date.parse(b.observedNow)/1000))return false
    const added=b.nonces.filter(n=>!a.nonces.some(x=>same(x,n))),key=r=>[r.scope,r.subject,r.bucket_start].join('|')
    const old=new Map(a.rates.map(r=>[key(r),r])),deltas=b.rates.map(r=>({...r,delta:r.hit_count-(old.get(key(r))?.hit_count||0)})).filter(r=>r.delta)
    return b.nonces.length===a.nonces.length+1&&a.nonces.every(n=>b.nonces.some(x=>same(x,n)))
      &&added.length===1&&added[0].nonce===args?.p_nonce&&added[0].actor_id===actor&&added[0].action===args.p_action
      &&Object.keys(added[0]).sort().join(',')==='action,actor_id,expires_at,nonce,used_at'
      &&Date.parse(added[0].used_at)>=Date.parse(a.observedNow)
      &&Date.parse(added[0].used_at)<=Date.parse(b.observedNow)
      &&Date.parse(added[0].expires_at)-Date.parse(added[0].used_at)===600000
      &&a.rates.every(r=>b.rates.some(x=>key(x)===key(r)))&&deltas.length===2
      &&deltas.every(r=>r.delta===1)&&deltas.some(r=>r.scope==='actor'&&r.subject===actor)
      &&deltas.some(r=>r.scope==='global'&&r.subject==='all_admin_requests')
      &&deltas[0].bucket_start===deltas[1].bucket_start
      &&[a.observedBucket,b.observedBucket].includes(deltas[0].bucket_start)
      &&b.rates.every(r=>{const previous=old.get(key(r));return previous?same({...previous,hit_count:r.hit_count},r)
        :deltas.some(d=>key(d)===key(r))&&r.hit_count===1&&Object.keys(r).sort().join(',')==='bucket_start,hit_count,scope,subject'})
  }
 const audits=()=>JSON.parse(value(`select jsonb_build_object('operations',(select coalesce(jsonb_agg(to_jsonb(o) order by operation_id),'[]') from k2_private.catalog_import_operations o),'events',(select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]') from k2_private.catalog_import_row_events e),'receipts',(select coalesce(jsonb_agg(to_jsonb(r) order by actor_id,action,idempotency_key),'[]') from k2_private.admin_command_receipts r))::text;`))
 const exactAudit=(a,b,payload,key,beforeProducts,afterProducts,result)=>{
  const additions=k=>b[k].filter(n=>!a[k].some(o=>same(o,n)))
  if(!Object.keys(a).every(k=>a[k].every(o=>b[k].some(n=>same(o,n)))))return false
  const ops=additions('operations'),events=additions('events'),receipts=additions('receipts'),item=payload.rows[0]
  return ops.length===1&&events.length===1&&receipts.length===1&&ops[0].actor_id===actor&&ops[0].operation_id===payload.operationId&&ops[0].status==='completed'&&ops[0].committed_row_count===1&&ops[0].last_chunk_index===0&&ops[0].file_sha256===payload.fileSha256
   &&events[0].actor_id===actor&&events[0].operation_id===payload.operationId&&events[0].operation_key===key&&events[0].sku===item.sku&&events[0].catalog_id===item.catalogId&&events[0].row_number===2&&events[0].outcome==='updated'&&events[0].reason===payload.reason&&same(events[0].before_data,beforeProducts.find(p=>p.sku===item.sku))&&same(events[0].after_data,afterProducts.find(p=>p.sku===item.sku))
   &&receipts[0].actor_id===actor&&receipts[0].action==='catalog_import_chunk'&&receipts[0].idempotency_key===key&&receipts[0].payload_hash===createHash('sha256').update(JSON.stringify(payload)).digest('hex')&&same(receipts[0].result,result)&&!!receipts[0].completed_at
 }
 const command=(payload,key,role='authenticated')=>{const args=signedAdminCommandArguments('catalog_import_chunk',actor,key,payload);return {args,sql:identitySql().replace('set role authenticated;',`set role ${role};`)+`select public.execute_admin_catalog_import_v1(${['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'].map(k=>literal(args[k])).join(',')})::text;`}}
 const body=(csv,operationId)=>({csvText:csv,fileSha256:createHash('sha256').update(csv).digest('hex'),selectedRowNumbers:[2],reason:'Reviewed synthetic supplier metadata in isolated current chain.',operationId,chunkIndex:0,finalChunk:true})
 try {
  report.initialTables=tables();report.initialHashes=hashes()
  for(const name of ['20260822_catalog_spreadsheet_identity.sql','20260822_catalog_spreadsheet_commit.sql']) {
   const sql=source('supabase/migrations/'+name);const step={name,beforeProducts:products(),sha256:createHash('sha256').update(sql).digest('hex'),before:hashes(),beforeFunctions:functions()};report.steps.push(step);fs.writeFileSync(path.join(evidence,'catalog-'+name),sql);step.expectedBodies=extractPublicFunctionBodies(sql);sync(sql);step.after=hashes();step.afterProducts=products();step.afterFunctions=functions();const allowed=name.includes('identity')?['bump_product_catalog_record_version()']:['execute_admin_catalog_import_v1(text,bigint,uuid,uuid,text,text)','read_admin_catalog_import_status_v1(uuid)'];step.changedFunctions=step.afterFunctions.filter(f=>!same(f,step.beforeFunctions.find(b=>b.signature===f.signature))).map(f=>f.signature);check('catalog installation changes only named functions',step.changedFunctions.every(f=>allowed.includes(f))&&step.beforeFunctions.every(f=>step.afterFunctions.some(a=>a.signature===f.signature)))
   const initialKeys=['catalog_id','catalog_record_version','country_of_origin','net_weight','product_video_url'];check('catalog installation preserves exact products except declared identity initialization',step.beforeProducts.length===step.afterProducts.length&&step.beforeProducts.every(p=>{const n=step.afterProducts.find(x=>x.sku===p.sku);if(!n)return false;if(!name.includes('identity'))return same(p,n);return same(Object.fromEntries(Object.entries(p).filter(([k])=>!initialKeys.includes(k))),Object.fromEntries(Object.entries(n).filter(([k])=>!initialKeys.includes(k))))&&(!p.catalog_id||p.catalog_id===n.catalog_id)&&n.catalog_record_version===(p.catalog_record_version??1)&&n.country_of_origin===(p.country_of_origin??p.origin??null)&&n.net_weight===(p.net_weight??null)&&n.product_video_url===(p.product_video_url??null)}))
   check('catalog installed exact candidate function bodies',step.expectedBodies.length>0&&step.expectedBodies.every(b=>step.afterFunctions.filter(f=>f.catalog.proname===b.name).length===1&&step.afterFunctions.find(f=>f.catalog.proname===b.name).bodyMd5===b.md5))
   check('catalog '+name+' preserves every existing non-product table',Object.keys(step.before).filter(t=>t!=='public.products').every(t=>step.before[t]===step.after[t]))
   sync(sql);step.replay=hashes();step.replayFunctions=functions();check('catalog immediate replay retains exact full functions',same(step.afterFunctions,step.replayFunctions));check('catalog '+name+' immediate replay keeps exact all-table data',same(step.after,step.replay))
  }
  if(afterCatalogInstallation)await afterCatalogInstallation()
  report.installedFunctions=functions();report.versionTrigger=JSON.parse(value(`select jsonb_agg(jsonb_build_object('definition',pg_get_triggerdef(t.oid),'catalog',to_jsonb(t)) order by t.oid)::text from pg_trigger t where t.tgrelid='public.products'::regclass and t.tgname='products_catalog_record_version_trigger';`));check('catalog version trigger has exact product binding',report.versionTrigger?.length===1&&report.versionTrigger[0].definition.includes('BEFORE UPDATE ON public.products')&&report.versionTrigger[0].definition.includes('bump_product_catalog_record_version()'))
  report.ownerTotal=Number(value('select count(*) from public.products;'));report.export=await readCatalogExport(client)
  check('actual role-visible catalog count equals full clone owner count',report.export.length===report.ownerTotal)
  const f=fixture('CATALOG-CURRENT',2);report.fixture=f
  const all=await readCatalogExport(client),product=all.find(p=>p.sku===f.sku);check('synthetic catalog fixture exported with immutable identity',!!product?.catalog_id)
  const rows=parseCatalogCsv(serializeCatalogCsv([product]));rows[0].internal_notes='Verified isolated current-chain catalog metadata';report.csv='\uFEFF'+Papa.unparse(rows,{columns:CATALOG_COLUMNS})
  const op=randomUUID(),key=randomUUID();report.preview=await previewCatalogImport(client,report.csv);check('actual CSV preview classifies exactly one reviewed change',report.preview.outcomes.length===1&&report.preview.outcomes[0].category==='Changed')
  report.payload=await buildCatalogCommitPayload(client,body(report.csv,op));
  report.beforeControls=controls();report.beforeAudits=audits();report.beforeProducts=products();report.before=hashes();report.command=command(report.payload,key);report.result=JSON.parse(value(report.command.sql));report.after=hashes();report.afterProducts=products();check('catalog target approved metadata only and every unrelated product unchanged',catalogProductDelta(report.beforeProducts,report.afterProducts,f.sku))
  report.afterControls=controls();report.afterAudits=audits();check('catalog signed update has exact own controls and full audit attribution',exactControls(report.beforeControls,report.afterControls,actor,report.command.args)&&exactAudit(report.beforeAudits,report.afterAudits,report.payload,key,report.beforeProducts,report.afterProducts,report.result))
  const effects=['public.products','k2_private.catalog_import_operations','k2_private.catalog_import_row_events','k2_private.admin_command_receipts','k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets']
  check('signed CSV update succeeds with one attributed metadata row',report.result.status==='completed'&&report.result.committedRowCount===1&&report.result.rows.length===1&&report.result.rows[0].sku===f.sku)
  check('signed CSV changes no physical/order/publication/guest table',Object.keys(report.before).filter(t=>!effects.includes(t)).every(t=>report.before[t]===report.after[t]))
  report.protectedProduct=JSON.parse(value(`select jsonb_build_object('stock',stock_available,'price',srp,'status',status,'published',published,'reviewed',is_human_reviewed,'notes',internal_notes,'catalogId',catalog_id,'version',catalog_record_version)::text from public.products where sku=${literal(f.sku)};`))
  const expectedState=f.catalogExpectedState??{stock:2,price:100,status:'Live',published:true,reviewed:true}
  check('CSV retains initial physical listing state and advances metadata version',Object.entries(expectedState).every(([k,v])=>k==='price'?Number(report.protectedProduct[k])===v:report.protectedProduct[k]===v)&&report.protectedProduct.catalogId===product.catalog_id&&report.protectedProduct.version===Number(product.catalog_record_version)+1&&report.protectedProduct.notes===rows[0].internal_notes)
  const failedKey=randomUUID(),failedOp=randomUUID();report.stalePayload={...report.payload,operationId:failedOp};report.staleCommand=command(report.stalePayload,failedKey);report.beforeStale=hashes();try{value(report.staleCommand.sql)}catch(e){report.staleError=e.message};report.afterStale=hashes();check('stale CSV commit refuses with all-table exact rollback',report.staleError?.includes('K2_CATALOG_STALE_CONFLICT')&&same(report.beforeStale,report.afterStale))
  const fresh=(await readCatalogExport(client)).find(p=>p.sku===f.sku),newRows=parseCatalogCsv(serializeCatalogCsv([fresh]));newRows[0].internal_notes='Recovered isolated current-chain catalog metadata';report.recoveryCsv='\uFEFF'+Papa.unparse(newRows,{columns:CATALOG_COLUMNS});report.recoveryPayload=await buildCatalogCommitPayload(client,body(report.recoveryCsv,failedOp));report.beforeRecoveryControls=controls();report.beforeRecoveryAudits=audits();report.beforeRecoveryProducts=products();report.beforeRecovery=hashes();report.recoveryCommand=command(report.recoveryPayload,failedKey);report.recoveryResult=JSON.parse(value(report.recoveryCommand.sql));report.afterRecovery=hashes();report.afterRecoveryProducts=products();check('catalog recovery retains every protected and unrelated product field',catalogProductDelta(report.beforeRecoveryProducts,report.afterRecoveryProducts,f.sku)&&report.afterRecoveryProducts.find(p=>p.sku===f.sku).internal_notes===newRows[0].internal_notes);check('fresh review recovers same operation/key once without physical/publication effects',report.recoveryResult.status==='completed'&&report.recoveryResult.committedRowCount===1&&Object.keys(report.beforeRecovery).filter(t=>!effects.includes(t)).every(t=>report.beforeRecovery[t]===report.afterRecovery[t]))
  report.afterRecoveryControls=controls();report.afterRecoveryAudits=audits();check('catalog recovery has exact own controls and full audit attribution',exactControls(report.beforeRecoveryControls,report.afterRecoveryControls,actor,report.recoveryCommand.args)&&exactAudit(report.beforeRecoveryAudits,report.afterRecoveryAudits,report.recoveryPayload,failedKey,report.beforeRecoveryProducts,report.afterRecoveryProducts,report.recoveryResult))
  report.anonCommand=command({...report.payload,operationId:randomUUID()},randomUUID(),'anon');report.beforeAnon=hashes();try{value(report.anonCommand.sql)}catch(e){report.anonError=e.message};report.afterAnon=hashes();check('anonymous catalog command denied with every table unchanged',report.anonError?.includes('permission denied')&&same(report.beforeAnon,report.afterAnon))
  report.finalFunctions=functions();check('catalog commands retain exact current and catalog function contracts',same(report.installedFunctions,report.finalFunctions))
 }finally{write()}
}
