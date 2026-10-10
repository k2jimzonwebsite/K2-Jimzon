// IDEA-20261010-08 / MAP-018: owned RAM qualification, never provider dispatch.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
const root='D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const caseName=process.argv[2]||'oci-imported04'
assert.match(caseName,/^oci-imported\d{2}$/)
const dir=path.join(root,caseName),sha=b=>createHash('sha256').update(b).digest('hex')
assert.ok(!fs.existsSync(dir),'Fresh owned case required')
const prep=spawnSync(process.execPath,['scripts/prepare-imported-provider-fixture.mjs','--case='+caseName,'--product-master-transport'],{windowsHide:true,encoding:'utf8',maxBuffer:1024*1024})
assert.equal(prep.status,0,prep.stderr)
assert.ok(!fs.existsSync(path.join(dir,'execution01')),'Cannot modify executed fixture')
const stage=path.join(dir,'staging/k2'),pkg=JSON.parse(fs.readFileSync(path.join(dir,'guarded-package.json')))
assert.equal(sha(pkg.sql),'d44df9c5a41ee8d31682038cc48147fa4593914997b98a075e1fccab4e667d45')
const initialBytes=fs.readFileSync(root+'/oci-imported03/execution01/before-catalog.json')
assert.equal(sha(initialBytes),'87941b6c79455be42391d9fb2b9a02eebc650f9ee6b1124b9aac2509526ff963')
const initial=JSON.parse(initialBytes)
const installedBytes=fs.readFileSync(root+'/oci-imported03/execution01/after-catalog.json')
assert.equal(sha(installedBytes),'2a4098502a7ecdce4765e3bc5c042b8ad0aef54a6282e9d7f5df4093a5b824b6')
const at=pkg.sql.indexOf('begin;'),body=pkg.sql.slice(at+6).replace(/\ncommit;\s*$/,'')
assert.ok(at>0&&body.startsWith('set local')&&!body.endsWith('commit;'))
const owned="do $owned_recovery$ begin if current_database()<>'postgres' or current_user not in ('postgres','supabase_admin') or current_setting('data_directory')<>'/tmp/k2-managed-data' or inet_server_addr() is not null then raise exception 'OWNED_RAM_RECOVERY_REQUIRED';end if;end $owned_recovery$;\n"
const fn='public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text)'
const q=s=>"'"+s.replaceAll("'","''")+"'"
const physical=[...new Set([...initial.relations, ...JSON.parse(installedBytes).relations].filter(r=>['r','p','S'].includes(r.kind)).map(r=>r.name))].sort()
const snapshot=`set timezone='Asia/Kuala_Lumpur';set search_path='';
${owned}
create temp table k2_recovery_rows(name text,value jsonb);
do $rows$ declare r record;v jsonb;begin
 for r in select c.oid,c.relkind,format('%I.%I',n.nspname,c.relname) as name from pg_class c join pg_namespace n on n.oid=c.relnamespace where format('%I.%I',n.nspname,c.relname)=any(array[${physical.map(q).join(',')}]::text[]) order by 3 loop
  if r.relkind='S' then execute format('select jsonb_build_object(''lastValue'',last_value::text,''isCalled'',is_called) from %s',r.oid::regclass) into v;
  else execute format('select jsonb_build_object(''count'',count(*),''md5'',md5(coalesce(string_agg(to_jsonb(t)::text,chr(10) order by to_jsonb(t)::text collate "C"),''''))) from %s t',r.oid::regclass) into v;end if;
  insert into k2_recovery_rows values(r.name,v);
 end loop;end $rows$;
select jsonb_object_agg(name,value order by name) from k2_recovery_rows;
`
fs.writeFileSync(path.join(stage,'revised-all-rows.sql'),snapshot,{flag:'wx'})
const driftBody=`do $drift$ declare d text;begin d:=pg_get_functiondef(${q(fn)}::regprocedure);if encode(extensions.digest(convert_to(d,'UTF8'),'sha256'),'hex')<>'c7e9f53fe80c68ce99401caf10d31f4ee272bd506a0c0f3bc7f6363c97f38b94' then raise exception 'REVISED_BODY_SOURCE_DRIFT';end if;execute replace(d,'K2_ADMIN_PRODUCT_VERSION_CONFLICT','K2_ADMIN_PRODUCT_VERSION_CONFLICT_DRIFT');end $drift$;`
const cases=[
 ['interruption','',"do $interrupt$ begin raise exception 'REVISED_EXPLICIT_INSTALL_INTERRUPTION';end $interrupt$;",'REVISED_EXPLICIT_INSTALL_INTERRUPTION'],
 ['body-drift',driftBody,'','K2_PROVIDER_SCHEMA_DRIFT'],
 ['authority-drift','alter function '+fn+' security invoker;','','K2_PROVIDER_SCHEMA_DRIFT'],
 ['acl-drift','grant execute on function '+fn+' to anon;','','K2_PROVIDER_SCHEMA_DRIFT'],
]
for(const [name,mutation,fault] of cases)fs.writeFileSync(path.join(stage,'revised-'+name+'.sql'),'begin;\n'+owned+mutation+'\n'+body+'\n'+fault+'\ncommit;\n',{flag:'wx'})
const tables=initial.relations.filter(r=>['r','p'].includes(r.kind))
assert.equal(tables.length,88)
const sequences=initial.relations.filter(r=>r.kind==='S');assert.equal(sequences.length,2)
const empty='begin;\n'+owned+'truncate table '+tables.map(r=>r.name).join(',')+' restart identity;\n'+sequences.map(r=>'alter sequence '+r.name+' restart;').join('\n')+'\ndo $empty$ declare n bigint;begin '+tables.map(r=>'select count(*) into n from '+r.name+";if n<>0 then raise exception 'REVISED_COLD_NOT_EMPTY';end if;").join('\n')+"end $empty$;\ncommit;\nselect 'K2_REVISED_COLD_ALL88_EMPTY';\n"
fs.writeFileSync(path.join(stage,'revised-empty-cold.sql'),empty,{flag:'wx'})
fs.writeFileSync(path.join(stage,'revised-cold-install.sql'),pkg.sql,{flag:'wx'})
const command=(file,user='supabase_admin')=>"su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U "+user+" -d postgres -v ON_ERROR_STOP=1 -f /tmp/"+file+"'"
const conserve=(name,mutation,error)=>{
 const tag=name.replaceAll('-','_').toUpperCase()
 return command('race-catalog.sql')+' > /tmp/revised-'+name+'-schema-before.json\n'+command('revised-all-rows.sql')+' > /tmp/revised-'+name+'-rows-before.json\nset +e\n'+command('revised-'+name+'.sql','postgres')+' > /tmp/revised-'+name+'.log 2>&1\nstatus=$?\nset -e\n[ "$status" -eq 3 ]\ngrep -q '+error+' /tmp/revised-'+name+'.log\n'+(name==='interruption'?'grep -q K2_PROVIDER_FRESH_APPLY /tmp/revised-'+name+'.log\n':'! grep -q K2_PROVIDER_EXACT_REPLAY /tmp/revised-'+name+'.log\n')+command('race-catalog.sql')+' > /tmp/revised-'+name+'-schema-after.json\n'+command('revised-all-rows.sql')+' > /tmp/revised-'+name+'-rows-after.json\ncmp -s /tmp/revised-'+name+'-schema-before.json /tmp/revised-'+name+'-schema-after.json\ncmp -s /tmp/revised-'+name+'-rows-before.json /tmp/revised-'+name+'-rows-after.json\nsha256sum /tmp/revised-'+name+'-schema-before.json /tmp/revised-'+name+'-schema-after.json /tmp/revised-'+name+'-rows-before.json /tmp/revised-'+name+'-rows-after.json\necho K2_REVISED_'+tag+'_FULL_RECOVERY_OK\n'
}
let probe=fs.readFileSync(path.join(stage,'image-probe.sh'),'utf8')
const full=command('full-contents.sql','postgres')
assert.equal(probe.split(full).length,2)
probe=probe.replace(full,()=>conserve('interruption','',cases[0][3])+full+'\n'+cases.slice(1).map(([name,mutation,fault,error])=>conserve(name,mutation,error)).join('\n'))
const recoveryStart=probe.indexOf(command('original-row-projection.sql')+' > /tmp/k2-original-committed.json')
const drop="su postgres -s /bin/sh -c 'dropdb -h /tmp -U supabase_admin postgres'"
const recoveryAt=probe.indexOf(drop,recoveryStart)
const exportsAt=probe.indexOf('echo K2_CATALOG_BEFORE_BEGIN',recoveryAt)
assert.ok(recoveryStart>0&&recoveryAt>recoveryStart&&exportsAt>recoveryAt)
const recovery=probe.slice(recoveryAt,exportsAt)
const cold=recovery+'\n'+command('revised-empty-cold.sql')+'\n'+command('original-row-projection.sql')+' > /tmp/revised-cold-rows-before.json\n'+command('revised-cold-install.sql','postgres')+' > /tmp/revised-cold-install.log 2>&1\ngrep -q K2_PROVIDER_FRESH_APPLY /tmp/revised-cold-install.log\n'+command('revised-cold-install.sql','postgres')+' > /tmp/revised-cold-replay.log 2>&1\ngrep -q K2_PROVIDER_EXACT_REPLAY /tmp/revised-cold-replay.log\n'+command('original-row-projection.sql')+' > /tmp/revised-cold-rows-after.json\ncmp -s /tmp/revised-cold-rows-before.json /tmp/revised-cold-rows-after.json\n'+command('race-catalog.sql')+' > /tmp/revised-cold-schema.json\ncmp -s /tmp/k2-after.json /tmp/revised-cold-schema.json\nsha256sum /tmp/revised-cold-rows-before.json /tmp/revised-cold-rows-after.json /tmp/revised-cold-schema.json\necho K2_REVISED_EMPTY_COLD_COMMIT_REPLAY_OK\n'
probe=probe.slice(0,recoveryAt)+cold+probe.slice(recoveryAt)
fs.writeFileSync(path.join(stage,'image-probe.sh'),probe)
const added=['revised-all-rows.sql',...cases.map(c=>'revised-'+c[0]+'.sql'),'revised-empty-cold.sql','revised-cold-install.sql']
let init=fs.readFileSync(path.join(stage,'init.sh'),'utf8'),anchor='/bin/busybox chroot /k2root /bin/sh /tmp/k2-image-probe.sh'
assert.equal(init.split(anchor).length,2)
init=init.replace(anchor,()=>added.map(n=>'/bin/busybox cp /k2/'+n+' /k2root/tmp/'+n).join('\n')+'\n'+anchor)
fs.writeFileSync(path.join(stage,'init.sh'),init)
const overlayStage=path.join(dir,'qualification-staging'),overlayK2=path.join(overlayStage,'k2')
fs.mkdirSync(overlayK2,{recursive:true})
for(const n of [...added,'init.sh','image-probe.sh'])fs.copyFileSync(path.join(stage,n),path.join(overlayK2,n),fs.constants.COPYFILE_EXCL)
const overlay=path.join(dir,'qualification-overlay.cpio')
const tar=spawnSync('tar.exe',['-cf',overlay,'--format=newc','-C',overlayStage,'k2'],{windowsHide:true,encoding:'utf8'})
assert.equal(tar.status,0,tar.stderr)
const initramfs=path.join(dir,'initramfs.cpio'),prefixSha256=sha(fs.readFileSync(initramfs))
fs.appendFileSync(initramfs,fs.readFileSync(overlay))
const runnerPath=path.join(root,'run-'+caseName+'.mjs')
let runner=fs.readFileSync(runnerPath,'utf8')
const oldBaseline="(stdout.match(/K2_CAPTURED_PROVIDER_BASELINE_AND_LOCALE_OK/g)||[]).length===2",oldRows="(stdout.match(/K2_ALL88_FOUNDATION_ROWS_OK/g)||[]).length===3"
assert.equal(runner.split(oldBaseline).length,2);assert.equal(runner.split(oldRows).length,2)
runner=runner.replace(oldBaseline,oldBaseline.replace('===2','===3')).replace(oldRows,oldRows.replace('===3','===4'))
const required=cases.map(c=>'K2_REVISED_'+c[0].replaceAll('-','_').toUpperCase()+'_FULL_RECOVERY_OK').concat('K2_REVISED_EMPTY_COLD_COMMIT_REPLAY_OK')
runner=runner.replace('report.moduleGucs=','report.moduleGucs='+required.map(m=>'stdout.includes('+JSON.stringify(m)+')&&').join(''))
fs.writeFileSync(runnerPath,runner)
const record={owningMap:'MAP-018',idea:'IDEA-20261010-08',providerWrites:false,prepared:true,nativeVerified:false,caseName,pkgSqlSha256:sha(pkg.sql),initialSchemaSha256:sha(initialBytes),installedSchemaSha256:sha(installedBytes),prefixSha256,overlaySha256:sha(fs.readFileSync(overlay)),sourceSha256:sha(fs.readFileSync('scripts/prepare-product-master-recovery-fixture.mjs')),files:Object.fromEntries([...added,'init.sh','image-probe.sh'].map(n=>[n,sha(fs.readFileSync(path.join(stage,n)))])),runnerSha256:sha(runner),limits:'Empty cold is original schema after guarded owned truncate/reset, committed full apply/replay, then original archive reconstruction. No provider, interruption mid-fragment, data-retaining deactivation or post-final-check authority qualification.'}
fs.writeFileSync(path.join(dir,'revised-qualification.json'),JSON.stringify(record,null,2),{flag:'wx'})
fs.copyFileSync('scripts/prepare-product-master-recovery-fixture.mjs',path.join(dir,'qualification-preparer-source.mjs'),fs.constants.COPYFILE_EXCL)
console.log(JSON.stringify({prepared:true,caseName,pkgSqlSha256:record.pkgSqlSha256,nativeVerified:false}))
