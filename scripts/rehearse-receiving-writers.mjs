// IDEA10: common writers after receiving installation, in the owned restore clone only.
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {rehearseCurrentWriterConcurrency} from './rehearse-current-writer-concurrency.mjs'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url))
export const receivingWritersWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export async function rehearseReceivingWriters(args) {
  const {value,check,literal,evidence}=args
  const write=(name,data)=>fs.writeFileSync(path.join(evidence,name),JSON.stringify(data,null,2)+'\n')
  fs.writeFileSync(path.join(evidence,'executed-receiving-writers.mjs'),bytes)
  const functions=()=>JSON.parse(value(`select jsonb_agg(jsonb_build_object('signature',oid::regprocedure::text,
    'bodyMd5',md5(prosrc),'definition',pg_get_functiondef(oid),'catalog',to_jsonb(p)-'prosrc') order by oid)::text
    from pg_proc p where pronamespace in ('public'::regnamespace,'k2_private'::regnamespace);`))
  const tables=['public.consignments','public.consignment_items','public.consignment_scan_events',
    'public.hubs','public.custodians']
  const rows=()=>JSON.parse(value(`select jsonb_build_object(${tables.map(t=>`${literal(t)},
    (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by to_jsonb(x)::text),'')) from ${t} x)`).join(',')})::text;`))
  const beforeFunctions=functions(),beforeRows=rows()
  const record={synthetic:true,providerWrites:false,receivingWritersWitnessSha256,
    scope:'Common writers versus recount after receiving installation; no receiving-finalizer overlap or full all-writer/provider acceptance',
    startingOrder:args.writerReverse?'writer-first':'recount-first',beforeFunctions,beforeRows}
  write('post-receiving-composition.json',record)
  const expected={'execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)':'6690b0ab5cf99a74a5f7e8ad7bafd8d0',
    'execute_admin_consignment_command_v1(text,bigint,uuid,uuid,text,text)':'623e5ab404618196ac98a043134d7071',
    'k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)':'d8d3b6eb06d2b5d0e7e4edbdeb5b5101'}
  check('actual common-writer overlap starts after exact current recount and receiving/calendar bodies are installed',
    Object.entries(expected).every(([signature,md5])=>{
      const exact=beforeFunctions.filter(f=>f.signature===signature)
      return exact.length===1&&exact[0].bodyMd5===md5
    }))
  try {await rehearseCurrentWriterConcurrency({...args,postReceiving:true})}
  finally {
    record.afterFunctions=functions();record.afterRows=rows();write('post-receiving-composition.json',record)
  }
  check('post-receiving common-writer overlaps preserve complete production function definitions/catalogs/ACLs',
    JSON.stringify(record.beforeFunctions)===JSON.stringify(record.afterFunctions))
  check('post-receiving common-writer overlaps preserve receiving and custody records across fixture setup and schedules',
    JSON.stringify(record.beforeRows)===JSON.stringify(record.afterRows))
}
