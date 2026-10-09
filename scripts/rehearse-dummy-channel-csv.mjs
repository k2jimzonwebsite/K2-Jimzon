// IDEA-20261002-11. Synthetic CSV -> actual signed staging SQL, owned local DB only.
import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { parseMarketplaceSnapshotCsv, buildMarketplaceProductSuggestions,
  validateMarketplaceMatchDecision } from '../server/admin-bff/marketplace-snapshots.js'
import { signedAdminCommandArguments } from '../server/admin-bff/security.js'

const root=fileURLToPath(new URL('..',import.meta.url))
const bin=path.join(root,'.tools/postgresql-17.11/runtime/pgsql/bin')
const dataDirectory=path.join(root,'.tools/current-restore-20260929-pg-data').replaceAll('\\','/')
const database=`k2_dummy_csv_20261002_${randomUUID().slice(0,8)}`
const marker=randomUUID(), actor='10000000-0000-0000-0000-000000000002'
const evidence=path.join(root,'docs/evidence/20261002-dummy-csv-intake')
const witnessBytes=fs.readFileSync(fileURLToPath(import.meta.url))
fs.mkdirSync(evidence,{recursive:true})
const env={...process.env,PGHOST:'127.0.0.1',PGHOSTADDR:'127.0.0.1',PGPORT:'54388',PGUSER:'postgres',
  PGSSLMODE:'disable',PGCLIENTENCODING:'UTF8',PGOPTIONS:''}
for(const name of ['PGSERVICE','PGSERVICEFILE','PGDATABASE','PGPASSWORD'])delete env[name]
// Local fixture secret only. No project environment or provider credentials are loaded.
process.env.K2_ADMIN_BFF_REQUEST_SECRET=Buffer.from('ab'.repeat(32),'hex').toString('base64')
const literal=value=>`'${String(value).replaceAll("'","''")}'`
const hash=value=>createHash('sha256').update(value).digest('hex')
const checks=[],manifest=[],summaries=[]
let created=false,cloneRemoved=false,error=null
function source(file){const content=fs.readFileSync(path.join(root,file),'utf8');
  manifest.push({path:file,sha256:hash(content)});return content}
const targetGuard=db=>`do $$ begin if current_database()<>${literal(db)}
  or host(inet_server_addr())<>'127.0.0.1' or inet_server_port()<>54388
  or replace(current_setting('data_directory'),chr(92),'/')<>${literal(dataDirectory)}
  then raise exception 'WRONG_LOCAL_TARGET'; end if; end $$;`
function sql(db,text){const r=spawnSync(path.join(bin,'psql.exe'),['-X','--no-psqlrc','-t','-A',
  '-v','ON_ERROR_STOP=1','-d',db],{cwd:root,env,windowsHide:true,encoding:'utf8',input:text,
  timeout:30000,maxBuffer:2*1024*1024});if(r.error||r.status!==0)throw Error(String(r.stderr||r.error?.message));
  return r.stdout.trim()}
const value=text=>sql(database,text).split(/\r?\n/).at(-1)
function check(name,ok){checks.push({name,passed:Boolean(ok)});if(!ok)throw Error(`ASSERTION_FAILED: ${name}`);
  console.log(`[pass] ${name}`)}
function command(action,payload,key=randomUUID()){
  const a=signedAdminCommandArguments(action,actor,key,payload)
  return `select set_config('request.jwt.claim.sub','${actor}',false);
    select set_config('request.jwt.claim.aal','aal2',false); set role authenticated;
    select public.execute_admin_marketplace_snapshot_v1(${[
      'p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'
    ].map(k=>literal(a[k])).join(',')});`
}
const physical=()=>value(`select jsonb_build_object('lots',(select jsonb_agg(to_jsonb(b) order by id)
  from public.product_batches b),'balances',(select jsonb_agg(to_jsonb(b) order by sku,location_code)
  from public.inventory_balances b))::text;`)
try{
  for(const file of ['server/admin-bff/marketplace-snapshots.js','server/admin-bff/security.js',
    'server/shared-numeric.js','src/lib/marketplaceCoverage.js'])source(file)
  sql('postgres',targetGuard('postgres'))
  sql('postgres',`create database "${database}";`);created=true
  sql(database,`${targetGuard(database)} ${source('supabase/tests/marketplace_snapshot_staging_bootstrap.sql')}
    create table k2_test.dummy_csv_owner(marker uuid primary key);insert into k2_test.dummy_csv_owner values('${marker}');`)
  for(const file of ['supabase/marketplace_snapshot_staging_preflight.sql',
    'supabase/migrations/20260831_marketplace_snapshot_staging.sql',
    'supabase/migrations/20260831_marketplace_snapshot_staging.sql',
    'supabase/tests/marketplace_snapshot_staging_assertions.sql'])sql(database,source(file))
  check('existing staging behavior, migration replay and negative SQL assertions execute',true)
  const baseline=physical(),productId=randomUUID()
  sql(database,`insert into public.products(id,sku,name,status,published,barcode,size,subcategory)
    values('${productId}','K2-DUMMY-COFFEE','Lavazza Qualita Oro Ground Coffee 250g','Draft',false,
      '8000000000012','250 g','Coffee');
    insert into public.channel_shops(id,shop_code,channel_code,display_name)
      values('20000000-0000-0000-0000-000000000004','dummy-tiktok-01','tiktok','Synthetic TikTok');`)
  const product={id:productId,sku:'K2-DUMMY-COFFEE',name:'Lavazza Qualita Oro Ground Coffee 250g',
    barcode:'8000000000012',size:'250 g',formulation:'ground coffee',subcategory:'Coffee'}
  for(const [provider,shopId,subcategory] of [
    ['shopee','20000000-0000-0000-0000-000000000001','Spreads'],
    ['lazada','20000000-0000-0000-0000-000000000003','Pasta'],
    ['tiktok','20000000-0000-0000-0000-000000000004','Makeup']]){
    const file=`tests/fixtures/marketplace-snapshots/${provider}.synthetic.csv`
    const csv=source(file);fs.writeFileSync(path.join(evidence,`${provider}.dummy.csv`),csv)
    const parsed=parseMarketplaceSnapshotCsv(csv),importId=randomUUID()
    const rows=parsed.rows.map(row=>({...row,suggestions:buildMarketplaceProductSuggestions(row,[product])}))
    const payload={importId,provider,shopId,sourceIdentity:`dummy-csv-${provider}-${marker}`,
      fileSha256:parsed.fileSha256,schemaVersion:parsed.schemaVersion,periodStart:'2026-08-01',periodEnd:'2026-08-31',
      reason:'Owner-authorized synthetic CSV rehearsal only.',rows}
    const key=randomUUID(),accepted=JSON.parse(value(command('marketplace_snapshot_stage',payload,key)))
    check(`${provider}: actual CSV parser feeds signed SQL stage`,accepted.acceptedRows===2)
    const replay=JSON.parse(value(command('marketplace_snapshot_stage',payload,key)))
    check(`${provider}: same-key fresh signature returns canonical result`,JSON.stringify(replay)===JSON.stringify(accepted))
    const freshReplay=JSON.parse(value(command('marketplace_snapshot_stage',payload)))
    check(`${provider}: same source with new command key creates no duplicate import`,freshReplay.status==='replayed'
      &&value(`select count(*)=1 from k2_private.marketplace_snapshot_imports where id='${importId}';`)==='t')
    const staged=JSON.parse(value(`select jsonb_agg(jsonb_build_object('id',id,'rowNumber',row_number)
      order by row_number)::text from k2_private.marketplace_snapshot_rows where import_id='${importId}';`))
    const linked=validateMarketplaceMatchDecision({decision:'link_existing',productId,
      reason:'Synthetic exact coffee barcode and 250 g variant reviewed.'},rows[0])
    const link=JSON.parse(value(command('marketplace_match_decision',{importId,rowId:staged[0].id,...linked})))
    check(`${provider}: differing marketplace SKUs link to one canonical coffee product`,link.productId===productId)
    const reviewed=validateMarketplaceMatchDecision({decision:'create_new_draft',reviewedProduct:{
      name:rows[1].source.title,barcode:rows[1].source.barcode,size:rows[1].source.size,subcategory},
      reason:'Synthetic exact new variant reviewed for Draft only.'},rows[1])
    const draft=JSON.parse(value(command('marketplace_match_decision',{importId,rowId:staged[1].id,...reviewed})))
    check(`${provider}: reviewed new variant gets server SKU and saved subcategory without publication`,
      /^K2-/.test(draft.sku)&&draft.productStatus==='Draft'&&value(`select not published and
        subcategory=${literal(subcategory)} from public.products where id=${literal(draft.productId)};`)==='t')
    check(`${provider}: CSV staging and decisions preserve exact physical lots and balances`,physical()===baseline)
    summaries.push({provider,importId,rows:2,coffeeReportedQuantity:rows[0].normalized.reportedQuantity,
      canonicalCoffeeSku:product.sku,newDraftSku:draft.sku,subcategory,physicalChanged:false})
  }
  check('three shops retain separate coffee observations, totaling 9 observed units',value(`select
    count(*)=3 and sum(reported_quantity)=9 from k2_private.marketplace_listing_observations
    where product_id='${productId}';`)==='t')
  check('marketplace reported 9 units do not become or increase canonical physical stock',physical()===baseline)
  sql(database,source('supabase/marketplace_snapshot_staging_postflight.sql'))
  const stagedCount=Number(value('select count(*) from k2_private.marketplace_snapshot_imports;'))
  sql(database,source('supabase/marketplace_snapshot_staging_rollback.sql'))
  check('deactivation preserves all four synthetic imports and revokes entry-point access',
    value(`select count(*)=${stagedCount} and ${stagedCount}=4 and not has_function_privilege('authenticated',
      'public.execute_admin_marketplace_snapshot_v1(text,bigint,uuid,uuid,text,text)','EXECUTE')
      from k2_private.marketplace_snapshot_imports;`)==='t')
}catch(e){error=e.message}
finally{
  if(created){try{
    sql(database,`${targetGuard(database)} do $$ begin if (select marker from k2_test.dummy_csv_owner) is distinct from '${marker}'::uuid
      then raise exception 'CLONE_OWNERSHIP_MISMATCH'; end if; end $$;`)
    sql('postgres',`${targetGuard('postgres')} drop database "${database}";`);cloneRemoved=true
  }catch(e){error=[error,e.message].filter(Boolean).join('\n')}}
  if(hash(fs.readFileSync(fileURLToPath(import.meta.url)))!==hash(witnessBytes))
    error=[error,'WITNESS_SOURCE_CHANGED_DURING_RUN'].filter(Boolean).join('\n')
  fs.writeFileSync(path.join(evidence,'executed-csv-bridge.mjs'),witnessBytes)
  fs.writeFileSync(path.join(evidence,'csv-bridge-receipt.json'),JSON.stringify({idea:'IDEA-20261002-11',
    witnessSha256:hash(witnessBytes),database,marker,dataDirectory,
    checks,summaries,manifest,error,cloneRemoved,synthetic:true,providerWrites:false,
    scope:'Actual normalized dummy CSV parsing -> signing -> staging/link/Draft SQL in minimal schema; not HTTP/browser/current restored-schema, stock creation, native provider format or live acceptance'},null,2)+'\n')
}
if(error){console.error(error);process.exitCode=1}else console.log(`${checks.length} dummy CSV bridge checks passed; owned database removed.`)
