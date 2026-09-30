// Isolated local metadata/recovery witness. No Supabase connection or credentials.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash,randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { guestInstallCaptureSql,generateGuestInstallDeactivation } from '../../../scripts/guest-install-recovery.mjs'

const root=process.cwd()
const database='k2_current_restore_20260929'
const psql=path.join(root,'.tools/postgresql-17.11/runtime/pgsql/bin/psql.exe')
const receipt=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/20260930-guest-continuity-rehearsal/local-dependencies-receipt.json'),'utf8'))
const sources=receipt.dependencyManifest.map(entry=>{
  const sql=fs.readFileSync(path.join(root,entry.path),'utf8')
  assert.equal(createHash('sha256').update(sql).digest('hex'),entry.sha256,'REHEARSED_SOURCE_CHANGED')
  return sql.replace(/^(begin(?: transaction read only)?|commit|rollback);\r?$/gmi,'').replace(/^\\set ON_ERROR_STOP on\r?$/gm,'')
}).join('\n')
const literal=value=>"'"+String(value).replaceAll("'","''")+"'"
const expectedDirectory=path.join(root,'.tools/current-restore-20260929-pg-data').replaceAll('\\','/')
const targetGuard=`do $target$ begin
  if current_database()<>${literal(database)} or lower(replace(current_setting('data_directory'),chr(92),'/'))<>lower(${literal(expectedDirectory)}) then
    raise exception 'LOCAL_RESTORE_TARGET_MISMATCH'; end if;
end $target$;`
function run(sql) {
  const result=spawnSync(psql,['-X','--no-psqlrc','-qAt','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','54388','-U','postgres','-d',database],{
    cwd:root,input:targetGuard+'\n'+sql,env:{...process.env,PGSSLMODE:'disable',PGCLIENTENCODING:'UTF8'},encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:4*1024*1024,
  })
  if(result.error || result.status!==0) throw Error(String(result.stderr||result.error?.message).slice(-1800))
  return result.stdout
}
const captured=run(`begin;\n${guestInstallCaptureSql};\n${sources}\n${guestInstallCaptureSql};\nrollback;`)
const snapshots=captured.split(/\r?\n/).filter(line=>line.startsWith('{"tables":') || (line.startsWith('{') && line.includes('"systemIdentifier"'))).map(line=>JSON.parse(line))
assert.equal(snapshots.length,2,'LOCAL_INSTALL_CAPTURES_MISSING')
const [before,after]=snapshots
const recovery=generateGuestInstallDeactivation(before,after)
const recoveryBody=recovery.replace(/^begin;$/m,'').replace(/^commit;$/m,'')
const customer=randomUUID(),conversation=randomUUID(),grant=randomUUID(),message=randomUUID()
const dataFixture=`
insert into public.customers(id,display_name,created_source) values('${customer}','Recovery fixture','website_guest');
insert into public.guest_access_grants(id,customer_id,token_hash,expires_at,max_uses)
values('${grant}','${customer}',extensions.digest('rollback fixture','sha256'),now()+interval '1 day',100);
insert into public.conversations(id,customer_id,customer_name,platform,status,source_kind)
values('${conversation}','${customer}','Recovery fixture','Website','Open','website_message');
insert into public.messages(id,conversation_id,sender_type,content,is_draft,delivery_status,direction)
values('${message}','${conversation}','Customer','Retained during local deactivation',false,'received','inbound');
insert into public.guest_access_grant_scopes(grant_id,scope_kind,scope_id,permissions)
values('${grant}','conversation','${conversation}',array['read','reply']::text[]);
create temp table preserved_recovery_data as
select 'customer' as label,to_jsonb(c) as value from public.customers c where id='${customer}'
union all select 'grant',to_jsonb(g) from public.guest_access_grants g where id='${grant}'
union all select 'conversation',to_jsonb(c) from public.conversations c where id='${conversation}'
union all select 'message',to_jsonb(m) from public.messages m where id='${message}'
union all select 'scope',to_jsonb(s) from public.guest_access_grant_scopes s where grant_id='${grant}';
`
const verification=`
do $data$ begin
  if (select count(*) from preserved_recovery_data)<>5
    or not exists(select 1 from public.customers c,preserved_recovery_data b where c.id='${customer}' and b.label='customer' and to_jsonb(c)=b.value)
    or not exists(select 1 from public.guest_access_grants g,preserved_recovery_data b where g.id='${grant}' and b.label='grant' and to_jsonb(g)=b.value)
    or not exists(select 1 from public.conversations c,preserved_recovery_data b where c.id='${conversation}' and b.label='conversation' and to_jsonb(c)=b.value)
    or not exists(select 1 from public.messages m,preserved_recovery_data b where m.id='${message}' and b.label='message' and to_jsonb(m)=b.value)
    or not exists(select 1 from public.guest_access_grant_scopes s,preserved_recovery_data b where s.grant_id='${grant}' and b.label='scope' and to_jsonb(s)=b.value)
    then raise exception 'RECOVERY_CHANGED_CANONICAL_DATA'; end if;
end $data$;
set local role anon;
do $deny$ begin
  begin
    perform public.start_guest_conversation_v1(null,null,null,null,null,null);
    raise exception 'RECOVERY_ANON_COMMAND_REMAINED_OPEN';
  exception when insufficient_privilege then null; end;
end $deny$;
reset role;
select 'LOCAL_INSTALL_DEACTIVATION_PASS';
rollback;
select case when to_regclass('public.customers') is null
  and not exists(select 1 from public.conversations where id='${conversation}')
  then 'LOCAL_INSTALL_RECOVERY_ROLLBACK_PASS' else 'LOCAL_INSTALL_RECOVERY_ROLLBACK_FAILED' end;
`
const passed=run(`begin;\n${sources}\n${dataFixture}\n${recoveryBody}\n${verification}`)
assert.ok(passed.includes('LOCAL_INSTALL_DEACTIVATION_PASS'))
assert.ok(passed.includes('LOCAL_INSTALL_RECOVERY_ROLLBACK_PASS'))
for(const mutation of [
  `alter function public.start_guest_conversation_v1(bigint,uuid,text,text,text,text) set search_path=public;`,
  `grant select on public.customers to anon;`,
  `grant select(display_name) on public.customers to anon;`,
  `alter table public.messages disable trigger trg_customer_staff_reply_notification;`,
]) {
  assert.throws(()=>run(`begin;\n${sources}\n${mutation}\n${recoveryBody}\nrollback;`),/GUEST_INSTALL_LATER_CHANGE_REFUSED/)
}
const wrongDatabase=generateGuestInstallDeactivation({...before,database:'wrong_database'},{...after,database:'wrong_database'})
assert.throws(()=>run(`begin;\n${sources}\n${wrongDatabase.replace(/^begin;$/m,'').replace(/^commit;$/m,'')}\nrollback;`),/GUEST_INSTALL_DATABASE_MISMATCH/)
const wrongCluster=generateGuestInstallDeactivation({...before,systemIdentifier:'wrong_cluster'},{...after,systemIdentifier:'wrong_cluster'})
assert.throws(()=>run(`begin;\n${sources}\n${wrongCluster.replace(/^begin;$/m,'').replace(/^commit;$/m,'')}\nrollback;`),/GUEST_INSTALL_CLUSTER_MISMATCH/)
const reviewPayloadPath=path.join(root,'.tools/current-production-backups/guest-install-existing-k2-20260930-review.sql')
const reviewPayload=fs.readFileSync(reviewPayloadPath,'utf8')
assert.throws(()=>run(`begin;\n${reviewPayload}\nrollback;`),/GUEST_INSTALL_NEW_SCOPE_OR_TARGET_CHANGED/)
const outputDirectory=path.join(root,'.tools/current-production-backups')
fs.writeFileSync(path.join(outputDirectory,'guest-install-local-before-20260930.json'),JSON.stringify(before,null,2)+'\n')
fs.writeFileSync(path.join(outputDirectory,'guest-install-local-after-20260930.json'),JSON.stringify(after,null,2)+'\n')
fs.writeFileSync(path.join(outputDirectory,'guest-install-local-deactivation-20260930.sql'),recovery)
const evidence={capturedAt:new Date().toISOString(),target:`127.0.0.1:54388/${database}`,
  orderedSources:receipt.dependencyManifest,functionsCaptured:after.functions.length,tablesCaptured:after.tables.length,
  notificationHooksRemoved:after.triggers.length,canonicalCustomerGrantConversationMessageAndScopeRetained:true,
  newFunctionTableAndColumnAccessClosed:true,actualAnonCommandDenied:true,laterFunctionTableColumnAndTriggerDriftRefused:true,
  wrongDatabaseRefused:true,wrongClusterRefused:true,exactLiveInstallationPayloadRefusedOnLocalRestore:true,
  reviewedInstallationSha256:createHash('sha256').update(reviewPayload).digest('hex'),outerRollbackConfirmed:true,recoverySha256:createHash('sha256').update(recovery).digest('hex'),
  boundary:'Local capture-bound deactivation only; leaves schema/data intact; not provider apply, backup restore, managed-role or activation acceptance.'}
fs.writeFileSync(path.join(outputDirectory,'guest-install-recovery-receipt-20260930.json'),JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify(evidence,null,2))
