// IDEA-20261010-08 / MAP-018: local owned RAM data-retaining recovery qualification.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
const root='D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const caseName=process.argv[2]||'oci-imported05'
assert.match(caseName,/^oci-imported\d{2}$/)
const dir=path.join(root,caseName),sha=b=>createHash('sha256').update(b).digest('hex')
assert.ok(!fs.existsSync(dir),'Fresh owned case required')
const prepared=spawnSync(process.execPath,['scripts/prepare-product-master-recovery-fixture.mjs',caseName],{windowsHide:true,encoding:'utf8',maxBuffer:1024*1024})
assert.equal(prepared.status,0,prepared.stderr)
assert.ok(!fs.existsSync(path.join(dir,'execution01')),'Executed fixture cannot be modified')
const stage=path.join(dir,'staging/k2'),qualified=JSON.parse(fs.readFileSync(path.join(dir,'revised-qualification.json')))
assert.equal(qualified.pkgSqlSha256,'d44df9c5a41ee8d31682038cc48147fa4593914997b98a075e1fccab4e667d45')
assert.equal(qualified.installedSchemaSha256,'2a4098502a7ecdce4765e3bc5c042b8ad0aef54a6282e9d7f5df4093a5b824b6')
const inputs=['category_shelf_life_catalog_deactivate.sql','category_shelf_life_catalog_rollforward.sql','category_shelf_life_policy_command_deactivate.sql','category_shelf_life_policy_command_rollforward.sql']
const sourcePins=inputs.map(n=>({file:'supabase/prepared/'+n,sha256:sha(fs.readFileSync('supabase/prepared/'+n))}))
const names=[]
const write=(name,sql)=>{fs.writeFileSync(path.join(stage,name),sql,{flag:'wx'});names.push(name)}
const owned="do $owned$ begin if current_database()<>'postgres' or current_user<>'postgres' or current_setting('data_directory')<>'/tmp/k2-managed-data' or inet_server_addr() is not null then raise exception 'OWNED_RAM_POLICY_RECOVERY_REQUIRED';end if;end $owned$;\n"
for(const n of inputs)write('policy-recovery-'+n,owned+fs.readFileSync('supabase/prepared/'+n,'utf8'))
const actor='73000000-0000-4000-8000-000000000001',category='74000000-0000-4000-8000-000000000001'
write('policy-recovery-setup.sql',owned+`begin;
do $absent$ begin
 if exists(select 1 from auth.users where id='${actor}') or exists(select 1 from public.user_profiles where id='${actor}') or exists(select 1 from public.categories where id='${category}') or exists(select 1 from k2_private.category_policy_command_config) then raise exception 'POLICY_RECOVERY_FIXTURE_PRESENT';end if;
end $absent$;
insert into auth.users(id) values('${actor}');
insert into public.user_profiles(id,role) values('${actor}','Admin') on conflict(id) do update set role=excluded.role;
insert into public.categories(id,name,parent_id) values('${category}','MAP018 synthetic policy recovery',null);
insert into k2_private.category_policy_command_config(singleton,maximum_depth) values(true,10);
insert into k2_private.admin_bff_secrets(singleton,request_secret) values(true,extensions.gen_random_bytes(32)) on conflict(singleton) do update set request_secret=excluded.request_secret;
commit;
`)
const signed=(minimum,version)=>owned+`begin;
set local lock_timeout='2s';set local statement_timeout='10s';
select '${actor}'::text as actor,extract(epoch from clock_timestamp())::bigint::text as stamp,extensions.gen_random_uuid()::text as nonce,extensions.gen_random_uuid()::text as idem,
 jsonb_build_object('categoryId','${category}','minimumDays',${minimum},'expectedVersion','${version}','reason','Synthetic revised-package recovery')::text as payload \\gset
select encode(extensions.hmac(convert_to('category_policy_set'||E'\\n'||:'stamp'||E'\\n'||:'nonce'||E'\\n'||:'actor'||E'\\n'||:'idem'||E'\\n'||encode(extensions.digest(convert_to(:'payload','UTF8'),'sha256'),'hex'),'UTF8'),request_secret,'sha256'),'hex') as signature from k2_private.admin_bff_secrets where singleton \\gset
select set_config('request.jwt.claim.sub',:'actor',true),set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
select public.execute_admin_product_master_command_v1('category_policy_set',:'stamp'::bigint,:'nonce'::uuid,:'idem'::uuid,:'payload',:'signature');
commit;
`
write('policy-recovery-baseline-command.sql',signed(150,0))
write('policy-recovery-resume-command.sql',signed(180,1))
write('policy-recovery-baseline-check.sql',owned+`do $check$ begin
 if not exists(select 1 from k2_private.category_shelf_life_policy where category_id='${category}' and minimum_days=150 and version=1) or (select count(*) from k2_private.category_shelf_life_events where category_id='${category}')<>1 then raise exception 'POLICY_RECOVERY_BASELINE_FAILED';end if;
end $check$;
select 'K2_POLICY_RECOVERY_POPULATED_BASELINE_OK';
`)
write('policy-recovery-resumed-check.sql',owned+`do $check$ begin
 if not exists(select 1 from k2_private.category_shelf_life_policy where category_id='${category}' and minimum_days=180 and version=2) or (select count(*) from k2_private.category_shelf_life_events where category_id='${category}')<>2 then raise exception 'POLICY_RECOVERY_RESUME_FAILED';end if;
end $check$;
select 'K2_POLICY_RECOVERY_SIGNED_RESUME_OK';
`)
write('policy-recovery-variables.sql',owned+String.raw`select maximum_depth::text as expected_maximum_depth,encode(extensions.digest(convert_to(p.prosrc,'UTF8'),'sha256'),'hex') as expected_execute_body_sha256 from k2_private.category_policy_command_config cross join pg_proc p where p.oid='k2_private.execute_category_policy_payload_v1(text,jsonb)'::regprocedure \gset
\echo :expected_maximum_depth :expected_execute_body_sha256
`)
write('policy-recovery-catalog-denied.sql',"begin;set local role authenticated;select public.execute_admin_catalog_import_v1('catalog_import_chunk',0,'00000000-0000-4000-8000-000000000001'::uuid,'00000000-0000-4000-8000-000000000002'::uuid,'{}','0');rollback;\n")
const command=(name,user='postgres',args='')=>"su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U "+user+" -d postgres -v ON_ERROR_STOP=1 "+args+' -f /tmp/'+name+"'"
const snapshot=(tag)=>command('race-catalog.sql','supabase_admin')+' > /tmp/policy-'+tag+'-schema.json\n'+command('revised-all-rows.sql','supabase_admin')+' > /tmp/policy-'+tag+'-rows.json\n'
const same=(a,b)=>'cmp -s /tmp/policy-'+a+'-schema.json /tmp/policy-'+b+'-schema.json\ncmp -s /tmp/policy-'+a+'-rows.json /tmp/policy-'+b+'-rows.json\n'
const denied=(name,error)=>'set +e\n'+command(name)+' > /tmp/policy-denied.log 2>&1\nstatus=$?\nset -e\n[ "$status" -eq 3 ]\ngrep -q '+error+' /tmp/policy-denied.log\n'
const catalogDeactivate=command('policy-recovery-'+inputs[0]),catalogForward=command('policy-recovery-'+inputs[1])
const policyArgs='-v expected_maximum_depth="$depth" -v expected_execute_body_sha256="$body_hash"'
const policyDeactivate=command('policy-recovery-'+inputs[2],'postgres',policyArgs),policyForward=command('policy-recovery-'+inputs[3],'postgres',policyArgs)
// Capture recovery input values in the shell; only depth and a body hash are emitted.
const policyCommand=cmd=>cmd.replace("su postgres -s /bin/sh -c '","su postgres -s /bin/sh -c '").replace('"$depth"',"'\"$depth\"'").replace('"$body_hash"',"'\"$body_hash\"'")
write('policy-recovery-deactivated-check.sql',owned+String.raw`create temp table policy_recovery_before(value jsonb);
create temp table policy_recovery_after(value jsonb);
\copy policy_recovery_before from '/tmp/policy-before-rows.json'
\copy policy_recovery_after from '/tmp/policy-deactivated-rows.json'
do $check$ declare b jsonb;a jsonb;begin
 select value into strict b from policy_recovery_before;select value into strict a from policy_recovery_after;
 if (b-'k2_private.category_policy_command_config') is distinct from (a-'k2_private.category_policy_command_config') or (a->'k2_private.category_policy_command_config'->>'count')::bigint<>0 or (b->'k2_private.category_policy_command_config'->>'count')::bigint<>1 then raise exception 'POLICY_RECOVERY_ROW_DRIFT';end if;
end $check$;
select 'K2_POLICY_RECOVERY_ONLY_CONFIG_ROW_REMOVED';
`)
let sequence=command('policy-recovery-setup.sql')+'\n'+command('policy-recovery-baseline-command.sql')+'\n'+command('policy-recovery-baseline-check.sql')+'\n'+snapshot('before')
sequence+=catalogDeactivate+'\n'+snapshot('catalog-off')+catalogDeactivate+'\n'+snapshot('catalog-repeat')+same('catalog-off','catalog-repeat')+denied('policy-recovery-catalog-denied.sql','permission.denied.for.function.execute_admin_catalog_import_v1')+snapshot('catalog-denied')+same('catalog-off','catalog-denied')+catalogForward+'\n'+catalogForward+'\n'+snapshot('catalog-restored')+same('before','catalog-restored')+'echo K2_POLICY_RECOVERY_CATALOG_ACCESS_RETAINED_OK\n'
sequence+=command('policy-recovery-variables.sql')+' > /tmp/policy-recovery-vars.txt\nread depth body_hash < /tmp/policy-recovery-vars.txt\n[ "$depth" = 10 ]\n'+policyCommand(policyDeactivate)+'\n'+snapshot('deactivated')+command('policy-recovery-deactivated-check.sql')+'\n'+'cmp -s /tmp/policy-before-schema.json /tmp/policy-deactivated-schema.json\n'+policyCommand(policyDeactivate)+'\n'+snapshot('repeat')+same('deactivated','repeat')+denied('policy-recovery-resume-command.sql','K2_CATEGORY_POLICY_NOT_CONFIGURED')+snapshot('denied')+same('deactivated','denied')+policyCommand(policyForward)+'\n'+policyCommand(policyForward)+'\n'+snapshot('restored')+same('before','restored')+'echo K2_POLICY_RECOVERY_EXACT_ROLLFORWARD_OK\n'+command('policy-recovery-resume-command.sql')+'\n'+command('policy-recovery-resumed-check.sql')+'\n'
sequence+='sha256sum /tmp/policy-*-schema.json /tmp/policy-*-rows.json\necho K2_POLICY_RECOVERY_ALL_CONTROLS_OK\n'
let probe=fs.readFileSync(path.join(stage,'image-probe.sh'),'utf8'),anchor='echo K2_ALL88_COMMITTED_ORIGINAL_PROJECTIONS_OK\n'
assert.equal(probe.split(anchor).length,2);probe=probe.replace(anchor,()=>anchor+sequence)
fs.writeFileSync(path.join(stage,'image-probe.sh'),probe)
let init=fs.readFileSync(path.join(stage,'init.sh'),'utf8'),initAnchor='/bin/busybox chroot /k2root /bin/sh /tmp/k2-image-probe.sh'
assert.equal(init.split(initAnchor).length,2);init=init.replace(initAnchor,()=>names.map(n=>'/bin/busybox cp /k2/'+n+' /k2root/tmp/'+n).join('\n')+'\n'+initAnchor)
fs.writeFileSync(path.join(stage,'init.sh'),init)
const overlayStage=path.join(dir,'policy-recovery-staging'),k2=path.join(overlayStage,'k2');fs.mkdirSync(k2,{recursive:true})
for(const n of [...names,'init.sh','image-probe.sh'])fs.copyFileSync(path.join(stage,n),path.join(k2,n),fs.constants.COPYFILE_EXCL)
const overlay=path.join(dir,'policy-recovery-overlay.cpio'),tar=spawnSync('tar.exe',['-cf',overlay,'--format=newc','-C',overlayStage,'k2'],{windowsHide:true,encoding:'utf8'});assert.equal(tar.status,0,tar.stderr)
const initramfs=path.join(dir,'initramfs.cpio'),prefixSha256=sha(fs.readFileSync(initramfs));fs.appendFileSync(initramfs,fs.readFileSync(overlay))
const runnerPath=path.join(root,'run-'+caseName+'.mjs');let runner=fs.readFileSync(runnerPath,'utf8');assert.equal(runner.split('report.moduleGucs=').length,2);runner=runner.replace('report.moduleGucs=','report.moduleGucs=stdout.includes("K2_POLICY_RECOVERY_ALL_CONTROLS_OK")&&');fs.writeFileSync(runnerPath,runner)
const record={owningMap:'MAP-018',idea:'IDEA-20261010-08',caseName,providerWrites:false,prepared:true,nativeVerified:false,qualifiedManifestSha256:sha(fs.readFileSync(path.join(dir,'revised-qualification.json'))),sourcePins,sourceSha256:sha(fs.readFileSync('scripts/prepare-product-policy-recovery-fixture.mjs')),prefixSha256,overlaySha256:sha(fs.readFileSync(overlay)),files:Object.fromEntries([...names,'init.sh','image-probe.sh'].map(n=>[n,sha(fs.readFileSync(path.join(stage,n)))])),runnerSha256:sha(runner),scope:'Committed catalog access/config deactivation and exact roll-forward/replay with populated synthetic policy/event rows and real signed category commands. Original populated archive reconstructed afterward. No HTTP/provider/through-commit authority qualification.'}
fs.writeFileSync(path.join(dir,'policy-recovery-qualification.json'),JSON.stringify(record,null,2),{flag:'wx'});fs.copyFileSync('scripts/prepare-product-policy-recovery-fixture.mjs',path.join(dir,'policy-recovery-preparer-source.mjs'),fs.constants.COPYFILE_EXCL)
console.log(JSON.stringify({prepared:true,caseName,nativeVerified:false,providerWrites:false}))
