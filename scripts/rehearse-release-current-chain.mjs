// Prepared current body composition on the UUID-owned restore clone only.
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
export const releaseCurrentChainWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export async function rehearseReleaseCurrentChain({sync,value,check,literal,source,evidence}) {
  fs.writeFileSync(path.join(evidence,'executed-release-current-chain.mjs'),bytes)
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
  const write=(name,data)=>fs.writeFileSync(path.join(evidence,name),JSON.stringify(data,null,2)+'\n')
  const tables=JSON.parse(value(`select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private') and c.relkind in ('r','p');`))
  const hashes=()=>JSON.parse(value(`select jsonb_object_agg(table_name,table_hash)::text from (values ${tables.map(t=>`(${literal(t)},(select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by to_jsonb(x)::text),'')) from ${t} x))`).join(',')}) snapshot(table_name,table_hash);`))
  const functions=()=>JSON.parse(value(`select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'bodyMd5',md5(replace(p.prosrc,chr(13),'')),'catalog',to_jsonb(p)-'prosrc') order by p.oid)::text from pg_proc p where p.pronamespace in ('public'::regnamespace,'k2_private'::regnamespace);`))
  const legacy=['finalize_consignment_receipt(uuid,text)','create_consignment_manifest(text,text)','add_consignment_item_v2(uuid,text,text,text,date,integer)','record_consignment_item_scan(uuid,uuid,text)','advance_consignment(uuid,text)']
  const signed='execute_admin_consignment_command_v1(text,bigint,uuid,uuid,text,text)'
  const steps=[
    ['release','20261002124500_release_lot_eligibility.sql',['cancel_order_request(uuid,text)','release_expired_reservations_v1(integer)','sync_product_batch_compat_columns()']],
    ['compatibility','20261002140500_lot_compatibility_eligibility.sql',['sync_product_batch_compat_columns()','execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)']],
    ['foundation','20260812_admin_consignments_bff_boundary.sql',[signed,...legacy]],
    ['legacy-acl',null,legacy],
    ['custody','20261002225500_receiving_custody_eligibility.sql',[signed,'finalize_consignment_receipt(uuid,text)','k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)']],
    ['calendar','20261002234500_receiving_input_calendar.sql',[signed]],
    ['clearance','20261003151500_signed_clearance_balance_lock_order.sql',['execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)']]
  ]
  const reports=[];write('current-chain-tables.json',tables)
  try {
    for(const [name,file,allowed] of steps) {
      const sql=file?source('supabase/migrations/'+file):legacy.map(s=>`revoke all on function public.${s} from public,anon,authenticated;`).join('\n')
      const r={name,file,allowed,sha256:createHash('sha256').update(sql).digest('hex'),beforeHashes:hashes(),beforeFunctions:functions()};reports.push(r)
      fs.writeFileSync(path.join(evidence,'current-chain-'+name+'.sql'),sql)
      sync(sql);r.afterHashes=hashes();r.afterFunctions=functions()
      const old=new Map(r.beforeFunctions.map(f=>[f.signature,f]))
      r.changed=r.afterFunctions.filter(f=>!same(f,old.get(f.signature))).map(f=>f.signature)
      r.removed=r.beforeFunctions.filter(f=>!r.afterFunctions.some(a=>a.signature===f.signature)).map(f=>f.signature)
      check('current chain '+name+' preserves every table and changes only named function contracts',same(r.beforeHashes,r.afterHashes)&&r.removed.length===0&&r.changed.every(s=>allowed.includes(s)))
      sync(sql);r.replayHashes=hashes();r.replayFunctions=functions()
      check('current chain '+name+' immediate replay preserves exact complete catalogs/data',same(r.afterHashes,r.replayHashes)&&same(r.afterFunctions,r.replayFunctions))
    }
    const final=functions();write('current-chain-functions-final.json',final);write('current-chain-hashes-final.json',hashes())
    const expected={execute_admin_consignment_command_v1:'623e5ab404618196ac98a043134d7071',execute_admin_lot_command_v1:'131951453aa69b42ce5f3ae3623b9e8a',finalize_consignment_receipt_v1:'d8d3b6eb06d2b5d0e7e4edbdeb5b5101',lot_is_eligible_v1:'2339bbb8c55024babf0ea1d873e46413'}
    check('current chain ends at exact current signed receiving/clearance/private eligibility bodies',Object.entries(expected).every(([name,md5])=>final.filter(f=>f.catalog.proname===name).length===1&&final.find(f=>f.catalog.proname===name).bodyMd5===md5))
  }finally{write('current-chain-installation.json',{idea:'IDEA-20261002-10',providerWrites:false,scope:'Local prepared body/explicit legacy ACL composition; not complete cold/current installer or provider grants',reports})}
}
