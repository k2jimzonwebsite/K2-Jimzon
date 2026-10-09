// IDEA-20261003-02. Parent-owned composed restore; synthetic metadata only.
import fs from 'node:fs'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {signedAdminCommandArguments} from '../server/admin-bff/security.js'
import {validateProductMasterCommand} from '../server/admin-bff/product-master.js'
import {validateProductIntakeCommand} from '../server/admin-bff/product-intake.js'
import {validateProductMediaAssignment} from '../server/admin-bff/product-media.js'
const bytes=fs.readFileSync(fileURLToPath(import.meta.url)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
export const intakePublicationWitnessSha256=createHash('sha256').update(bytes).digest('hex')
export async function rehearseIntakePublication({value,check,literal:q,evidence,actor}){
 const report={idea:'IDEA-20261003-02',providerWrites:false,scope:'Native signed master/media receipt/publication composition on owned clone. Storage object metadata is synthetic; no bytes/upload/BFF/browser/host/real catalog acceptance.',commands:[]}
 fs.writeFileSync(path.join(evidence,'executed-intake-publication.mjs'),bytes)
 report.sources=['server/admin-bff/security.js','server/admin-bff/product-master.js','server/admin-bff/product-intake.js','server/admin-bff/product-media.js'].map(file=>{
  const b=fs.readFileSync(file),archive='publication-'+path.basename(file)
  fs.writeFileSync(path.join(evidence,archive),b)
  return {file,archive,sha256:createHash('sha256').update(b).digest('hex')}
 })
 const lifecycle=JSON.parse(fs.readFileSync(path.join(evidence,'intake-lifecycle.json'),'utf8'))
 const sessionId=lifecycle.sessionId,sku=lifecycle.draft.sku
 const tables=JSON.parse(value("select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private','storage') and c.relkind in ('r','p');"))
 const rows=()=>JSON.parse(value(`select jsonb_object_agg(t,r)::text from (values ${tables.map(t=>`(${q(t)},(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]') from ${t} x))`).join(',')}) s(t,r);`))
 const functions=()=>JSON.parse(value("select jsonb_agg(jsonb_build_object('definition',pg_get_functiondef(p.oid),'catalog',to_jsonb(p)) order by p.oid)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','k2_private','storage');"))
 const controls=['k2_private.admin_request_nonces','k2_private.admin_request_rate_buckets','k2_private.admin_command_receipts']
 const call=(action,payload,{key=randomUUID(),error,role='authenticated',effects=[],fault=false}={})=>{
  const args=signedAdminCommandArguments(action,actor,key,payload)
  const rpc=action.startsWith('intake_')?'execute_admin_product_intake_command_v1':action==='product_master_update'?'execute_admin_product_master_command_v1':action==='product_media_upload'?'execute_admin_product_media_command_v1':'execute_admin_product_media_assignment_v1'
  const faultSql=fault?`begin;create function k2_private.publication_witness_fault() returns trigger language plpgsql as $$begin raise exception 'K2_PUBLICATION_WITNESS_FAULT';end;$$;create trigger publication_witness_fault before insert on public.audit_logs for each row execute function k2_private.publication_witness_fault();`:''
  const sql=faultSql+`select set_config('request.jwt.claim.sub',${q(actor)},false);select set_config('request.jwt.claims','{"aal":"aal2"}',false);set role ${role};select public.${rpc}(${['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature'].map(k=>q(args[k])).join(',')})::text;`
  const c={action,key,payload,args,sql,before:rows()};report.commands.push(c)
  try{c.result=JSON.parse(value(sql))}catch(e){c.error=e.message}
  c.after=rows()
  if(error){check(action+' refuses '+error+' with exact all-table rollback',c.error?.includes(error)&&same(c.before,c.after));if(!c.error?.includes(error))throw Error('Unexpected refusal: '+c.error)}
  else{
   check(action+' succeeds',!c.error&&!!c.result);if(c.error)throw Error(c.error)
   check(action+' preserves all unrelated tables',Object.keys(c.before).filter(t=>![...controls,...effects].includes(t)).every(t=>same(c.before[t],c.after[t])))
   const [nt,rt,ct]=controls,bn=c.before[nt],an=c.after[nt],newNonces=an.filter(n=>!bn.some(b=>same(b,n))),nonce=newNonces[0]
   check(action+' consumes exactly own fresh signed nonce and only expired pruning',newNonces.length===1&&nonce.actor_id===actor&&nonce.action===action&&nonce.nonce===args.p_nonce&&Date.parse(nonce.expires_at)-Date.parse(nonce.used_at)===600000&&bn.every(b=>an.some(n=>same(b,n))||Date.parse(b.expires_at)<=Date.parse(nonce.used_at)))
   const br=c.before[rt],ar=c.after[rt],changed=ar.filter(n=>!br.some(b=>same(b,n))),bucket=changed[0]?.bucket_start
   check(action+' consumes exactly own actor/global rate hits and only expired pruning',changed.length===2&&changed.every(n=>n.bucket_start===bucket&&((n.scope==='actor'&&n.subject===actor)||(n.scope==='global'&&n.subject==='all_admin_requests'))&&n.hit_count===(br.find(b=>b.scope===n.scope&&b.subject===n.subject&&b.bucket_start===bucket)?.hit_count??0)+1)&&br.every(b=>ar.some(n=>same(b,n))||changed.some(n=>n.scope===b.scope&&n.subject===b.subject&&n.bucket_start===b.bucket_start)||Date.parse(b.bucket_start)<Date.parse(bucket)-86400000))
   const bc=c.before[ct],ac=c.after[ct],matches=r=>r.actor_id===actor&&r.action===action&&r.idempotency_key===key,old=bc.find(matches),receipt=ac.find(matches)
   check(action+' retains exact own durable receipt and every unrelated receipt',!!receipt&&receipt.payload_hash===createHash('sha256').update(args.p_payload_text).digest('hex')&&same(receipt.result,c.result)&&!!receipt.completed_at&&bc.every(b=>ac.some(n=>same(b,n)))&&ac.length===bc.length+(old?0:1)&&(!old||same(old,receipt)))
   if(action==='intake_publication'){
    const b=c.before['public.products'].find(p=>p.sku===sku),audits=c.after['public.audit_logs'].filter(a=>!c.before['public.audit_logs'].some(x=>x.id===a.id)),changed=b.status!==c.result.status
    const reasonAudit=audits.filter(a=>a.new_data?.operation==='PRODUCT_PUBLICATION_REASON'),transitionAudit=audits.filter(a=>a.new_data?.operation==='TRANSITION_PUBLICATION')
    check('publication records exact transition/reason audits; signed replay adds none',audits.length===(old?0:changed?2:1)&&reasonAudit.length===(old?0:1)&&transitionAudit.length===(old?0:changed?1:0)&&audits.every(a=>a.user_id===actor&&a.action==='UPDATE'&&a.table_name==='products'&&a.record_id===b.id&&a.new_data.intake_session_id===sessionId)&&reasonAudit.every(a=>a.old_data===null&&a.new_data.reason===payload.reason&&a.new_data.requested_status===payload.requestedStatus)&&transitionAudit.every(a=>a.old_data.status===b.status&&a.new_data.status===c.result.status)&&c.before['public.audit_logs'].every(a=>c.after['public.audit_logs'].some(x=>same(a,x))))
   }
  }
  return c
 }
 const publication=status=>validateProductIntakeCommand('intake_publication',{sessionId,requestedStatus:status,reason:'Synthetic local publication acceptance'})
 const publicationEffects=['public.products','public.product_intake_sessions','public.audit_logs']
 try{
  report.before=rows();report.beforeFunctions=functions();report.sku=sku;report.sessionId=sessionId
  const product=()=>rows()['public.products'].find(p=>p.sku===sku)
  check('publication uses genuine lifecycle Draft under review',product().status==='Under Review'&&product().published===false)
  const master=validateProductMasterCommand({action:'update',payload:{sku,patch:{srp:149.125,is_human_reviewed:true,description:'Reviewed synthetic product facts'},expectedUpdatedAt:product().updated_at,reason:'Synthetic reviewed facts on isolated clone'}})
  const m=call(master.action,master.payload,{effects:['public.products','k2_private.product_master_events']})
  check('master records exact reviewed patch and one provenance event',Number(product().srp)===149.125&&product().is_human_reviewed===true&&m.after['k2_private.product_master_events'].length===m.before['k2_private.product_master_events'].length+1&&m.after['k2_private.product_master_events'].some(e=>e.request_id===m.key&&e.actor_id===actor&&e.sku===sku&&same(e.before_state,m.before['public.products'].find(p=>p.sku===sku))&&same(e.after_state,product())))
  const mr=call(master.action,master.payload,{key:m.key});check('master durable retry retains exact result',same(m.result,mr.result))
  call(master.action,{...master.payload,patch:{srp:150}},{error:'K2_ADMIN_PRODUCT_VERSION_CONFLICT'})
  call('intake_publication',publication('live'),{error:'K2_PUBLICATION_NOT_READY'})
  const uploadKey=randomUUID(),sha='0123456789abcdef'.repeat(4),objectPath=`${actor}/product-media/${uploadKey}-${sha.slice(0,16)}.jpg`
  const upload={objectPath,contentType:'image/jpeg',size:1024,width:500,height:500,sha256:sha}
  const media=validateProductMediaAssignment({sku,primary:{url:`https://synthetic.invalid/storage/v1/object/public/product-images/${objectPath}`,objectPath},lifestyle:[],secondary:[],reason:'Synthetic metadata acceptance'})
  call('product_media_upload',upload,{key:uploadKey,error:'K2_ADMIN_MEDIA_OBJECT_UNVERIFIED'})
  call('product_media_assign',media,{error:'K2_ADMIN_MEDIA_UNREGISTERED'})
  report.beforeSyntheticObject=rows()
  value(`insert into storage.objects(bucket_id,name,metadata) values('product-images',${q(objectPath)},'{"mimetype":"image/jpeg","size":1024}');select 'null';`)
  report.afterSyntheticObject=rows()
  check('synthetic object adds exactly one metadata row and preserves every original row/table',Object.keys(report.beforeSyntheticObject).every(t=>t==='storage.objects'?report.afterSyntheticObject[t].length===report.beforeSyntheticObject[t].length+1&&report.beforeSyntheticObject[t].every(r=>report.afterSyntheticObject[t].some(n=>same(r,n))):same(report.beforeSyntheticObject[t],report.afterSyntheticObject[t])))
  call('product_media_assign',media,{error:'K2_ADMIN_MEDIA_UNREGISTERED'})
  const u=call('product_media_upload',upload,{key:uploadKey}),ur=call('product_media_upload',upload,{key:uploadKey})
  check('native upload metadata receipt replays exact attested result',Object.keys(u.result).length===Object.keys(upload).length&&Object.entries(upload).every(([k,v])=>u.result[k]===v)&&same(u.result,ur.result))
  call('product_media_assign',{...media,primary:{...media.primary,url:'https://synthetic.invalid/wrong.jpg'}},{error:'K2_ADMIN_MEDIA_ASSIGNMENT_INVALID'})
  const a=call('product_media_assign',media,{effects:['public.products','k2_private.product_media_events']})
  check('media assignment writes exact primary URLs and one owned event',product().primary_image_url===media.primary.url&&product().image_url===media.primary.url&&a.after['k2_private.product_media_events'].length===a.before['k2_private.product_media_events'].length+1&&a.after['k2_private.product_media_events'].some(e=>e.request_id===a.key&&e.actor_id===actor&&e.sku===sku&&e.after_state.primary===media.primary.url&&e.cleanup_status==='none'))
  const ar=call('product_media_assign',media,{key:a.key});check('assignment durable retry retains exact result',same(a.result,ar.result))
  const live=publication('live'),fault=call('intake_publication',live,{fault:true,error:'K2_PUBLICATION_WITNESS_FAULT'})
  check('publication fault restores exact full function contracts',same(report.beforeFunctions,functions()))
  const l=call('intake_publication',live,{key:fault.key,effects:publicationEffects})
  check('retry after publication audit fault reaches Live with exact transition and reason audits',product().status==='Live'&&product().published===true&&l.after['public.audit_logs'].length===l.before['public.audit_logs'].length+2)
  const lr=call('intake_publication',live,{key:l.key});check('Live durable retry retains exact result',same(l.result,lr.result))
  const noop=call('intake_publication',live,{effects:['public.audit_logs']});check('fresh Live no-op preserves every product/session/physical row and adds only its reason audit',Object.keys(noop.before).filter(t=>!controls.includes(t)&&t!=='public.audit_logs').every(t=>same(noop.before[t],noop.after[t])))
  call('product_media_assign',{...media,primary:null},{error:'K2_ADMIN_MEDIA_PRIMARY_REQUIRED'})
  call('intake_publication',publication('unlisted'),{effects:publicationEffects});check('Unlist removes public flag without changing stock',product().status==='Unlisted'&&product().published===false)
  call('intake_publication',live,{effects:publicationEffects});check('canonical completed session can relist exact same reviewed SKU',product().status==='Live'&&product().published===true)
  call('intake_publication',publication('draft'),{error:'K2_PUBLICATION_TRANSITION_INVALID'})
  call('intake_publication',live,{role:'anon',error:'permission denied'})
  report.after=rows();report.afterFunctions=functions()
  const mutable=['public.products','public.product_intake_sessions']
  const appended=['public.audit_logs','k2_private.product_master_events','k2_private.product_media_events','storage.objects']
  check('complete publication preserves original rows outside exact synthetic product/session and signed controls',Object.entries(report.before).every(([t,r])=>controls.includes(t)|| (mutable.includes(t)?r.filter(x=>t==='public.products'?x.sku!==sku:x.id!==sessionId).every(x=>report.after[t].some(y=>same(x,y))):appended.includes(t)?r.every(x=>report.after[t].some(y=>same(x,y))):same(r,report.after[t]))))
  check('publication retains every full installed function contract',same(report.beforeFunctions,report.afterFunctions))
 }finally{fs.writeFileSync(path.join(evidence,'intake-publication.json'),JSON.stringify(report,null,2)+'\n')}
}
