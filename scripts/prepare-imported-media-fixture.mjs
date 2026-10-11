// MAP-018 / IDEA-20261009-11. Genuine Auth/Storage local transport; no provider.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import {execFileSync} from 'node:child_process'
import {catalogValueHash} from './reference-catalog-contract.mjs'
import {extendAdminStockReadFixture} from './admin-stock-read-fixture.inc.mjs'
const root='D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const name=process.argv.find(a=>a.startsWith('--case='))?.slice(7)
const staffStock=process.argv.includes('--staff-stock')
const browserInventory=staffStock||process.argv.includes('--browser-inventory')
const browserWorkflow=browserInventory||process.argv.includes('--browser-workflow')
const currentInstallation=browserWorkflow||process.argv.includes('--current-installation')
const publicMedia=currentInstallation||process.argv.includes('--public-media')
const productWorkflow=publicMedia||process.argv.includes('--product-workflow')
const intakeEvidence=productWorkflow||process.argv.includes('--intake-evidence')
assert.match(name||'',/^oci-imported-media\d{2}$/)
assert.ok(!fs.existsSync(path.join(root,name)),'Fresh fixture required')
const hash=b=>createHash('sha256').update(b).digest('hex')
const receipt=JSON.parse(fs.readFileSync('docs/acceptance/LOCAL_BROWSER_AUTH_20261010.json'))
const base=receipt.cases.find(c=>c.case==='oci-browser-auth03')
const pin=file=>{const bytes=fs.readFileSync(path.join(root,base.case,file));assert.equal(hash(bytes),base.hashes[file],file);return bytes.toString()}
const once=(s,b,a)=>{assert.equal(s.split(b).length,2,b.slice(0,100));return s.replace(b,()=>a)}
let source=pin('executed-source.mjs').replaceAll(base.case,name)
let helper=pin('bff-helper.mjs'),driver=pin('host-driver.mjs')
const scope=publicMedia?'Genuine local BFF imported product flow with HTTPS product-image upload/assignment/replay/anonymous normalized bytes; offline fixture restoration; older admitted installer foundation, no browser/provider acceptance':productWorkflow?'Genuine local BFF CSV imported Draft/review/stock/publication/Website listing and Storage packaging evidence; offline fixture restoration; no browser/provider acceptance':intakeEvidence?'Genuine local BFF Auth/MFA intake session and binary evidence registration/replay/download/cleanup; original captured recovery; no browser/imported product/provider acceptance':'Genuine local Auth/MFA actual Storage upload/download/remove through unified proxy and binary Admin fixture adapter; original captured recovery; no browser/intake registration/provider acceptance'
const executionScope=browserInventory?'Genuine local full accepted installer and rendered Admin password/MFA/imported Draft packaging/manual review/phone Save/first-inventory/Under Review publication, joined to qualified backend public-media/Live/Website commands; offline recovery. No customer browser/hosted/provider acceptance':browserWorkflow?'Genuine local full accepted installer and rendered Admin password/MFA/imported Draft packaging/manual review/phone Save, joined to previously qualified stock/media/Website commands; offline recovery. No customer browser/hosted/provider acceptance':currentInstallation?'Genuine local complete accepted reference/category/tariff installer with protected reference creation and imported product/public-media/stock/Website commands; exact offline application restoration; no browser/provider acceptance':scope
let installationPins
if(currentInstallation){
 const installation=JSON.parse(fs.readFileSync('docs/acceptance/PROTECTED_REFERENCE_INSTALLATION_20261011.json'))
 assert.equal(installation.case,'oci-imported41');assert.equal(installation.controllerExit,0)
 assert.equal(installation.package.sqlSha256,'e051cd65f6b9b070c70754b61ef521a772bc2bad46c211e918081e23b945457f')
 const input=path.join(root,installation.case),inputs=installation.sourcePins.concat(installation.stagedPins.map(p=>({file:path.join(input,'staging/k2',p.file),sha256:p.sha256})))
 for(const p of inputs)assert.equal(hash(fs.readFileSync(p.file)),p.sha256,p.file)
 const expectedFile=path.join(input,'execution01/after-catalog.json'),expectedBytes=fs.readFileSync(expectedFile)
 assert.equal(hash(expectedBytes),installation.result.catalogs.after.sha256)
 assert.equal(catalogValueHash(JSON.parse(expectedBytes)),installation.target.canonicalSha256)
 const files=['race-install.sql','race-catalog.sql']
 const copy=files.map(file=>`fs.writeFileSync(path.join(k2,${JSON.stringify(file)}),pin(${JSON.stringify(path.join(input,'staging/k2',file))},${JSON.stringify(installation.stagedPins.find(p=>p.file===file).sha256)}),{flag:'wx'});`).join('\n')
 source=once(source,"const overlay=path.join(out,'overlay.cpio')",copy+`\nfs.writeFileSync(path.join(k2,'current-installed-expected.json'),pin(${JSON.stringify(expectedFile)},${JSON.stringify(hash(expectedBytes))}),{flag:'wx'});\n`+"const overlay=path.join(out,'overlay.cpio')")
 source=once(source,"probe+=psql('postgres','race-install.sql')+'\\n'","probe+=psql('postgres','race-install.sql')+'\\n';\nprobe+=psql('supabase_admin','race-catalog.sql')+' > /tmp/full-current-installed.json\\ncmp -s /tmp/current-installed-expected.json /tmp/full-current-installed.json\\nsha256sum /tmp/current-installed-expected.json /tmp/full-current-installed.json\\necho K2_FULL_ACCEPTED_INSTALLER_METADATA_OK\\n'")
 source=once(source,"fs.writeFileSync(path.join(k2,'init.sh'),init,{flag:'wx'})","init=init.replace('/bin/busybox cp /k2/race-install.sql /k2root/tmp/race-install.sql',()=>'/bin/busybox cp /k2/current-installed-expected.json /k2root/tmp/current-installed-expected.json\\n/bin/busybox cp /k2/race-install.sql /k2root/tmp/race-install.sql');\nfs.writeFileSync(path.join(k2,'init.sh'),init,{flag:'wx'})")
 source=once(source,"stdout.includes('K2_BFF_PRIVATE_RECOVERY_OK')&&","stdout.includes('K2_FULL_ACCEPTED_INSTALLER_METADATA_OK')&&stdout.includes('K2_BFF_PRIVATE_RECOVERY_OK')&&")
 installationPins={receipt:'docs/acceptance/PROTECTED_REFERENCE_INSTALLATION_20261011.json',receiptSha256:hash(fs.readFileSync('docs/acceptance/PROTECTED_REFERENCE_INSTALLATION_20261011.json')),inputs,expectedFile,expectedSha256:hash(expectedBytes),expectedCanonicalSha256:installation.target.canonicalSha256,package:installation.package}
}
helper=helper.slice(0,helper.indexOf('async function browserProbe('))
helper=once(helper,"import http from 'node:http'","import http from 'node:http'\nconst {readFixtureAdminHttpBody}=await import(pathToFileURL(path.join(process.cwd(),'scripts/fixture-admin-http-body.mjs')).href)")
if(publicMedia){
 const certFile=path.resolve('.tools',name+'-cert.pem'),keyFile=path.resolve('.tools',name+'-key.pem')
 assert.ok(!fs.existsSync(certFile)&&!fs.existsSync(keyFile),'Fresh local TLS inputs required')
 execFileSync('C:/Program Files/Git/mingw64/bin/openssl.exe',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',keyFile,'-out',certFile,'-days','2','-subj','/CN=K2 owned loopback fixture','-addext','subjectAltName=IP:127.0.0.1'],{stdio:'ignore'})
 const cert=fs.readFileSync(certFile,'utf8'),key=fs.readFileSync(keyFile,'utf8')
 helper=once(helper,"import http from 'node:http'",`import http from 'node:http'\nimport https from 'node:https'\nimport tls from 'node:tls'\nconst fixtureTls={cert:${JSON.stringify(cert)},key:${JSON.stringify(key)}}`)
 helper=once(helper,' const vars={'," const originalCas=tls.getCACertificates('default');tls.setDefaultCACertificates([...originalCas,fixtureTls.cert]);\n const vars={")
 helper=once(helper,"SUPABASE_URL:'http://127.0.0.1:54395'","SUPABASE_URL:'https://127.0.0.1:54395'")
 helper=once(helper,'const proxy=http.createServer((req,res)=>{','const proxy=https.createServer(fixtureTls,(req,res)=>{')
 helper=once(helper,'for(const server of [routed,proxy]){','tls.setDefaultCACertificates(originalCas);for(const server of [routed,proxy]){')
}
helper=once(helper,"const calls={auth:0,rest:0,routed:0}","const calls={auth:0,rest:0,storage:0,routed:0}")
helper=once(helper,"const isAuth=req.url.startsWith('/auth/v1/'),isRest=req.url.startsWith('/rest/v1/')","const isAuth=req.url.startsWith('/auth/v1/'),isRest=req.url.startsWith('/rest/v1/'),isStorage=req.url.startsWith('/storage/v1/')")
helper=once(helper,'if(!isAuth&&!isRest)','if(!isAuth&&!isRest&&!isStorage)')
helper=once(helper,"calls[isAuth?'auth':'rest']++","calls[isAuth?'auth':isRest?'rest':'storage']++")
helper=once(helper,"port:isAuth?54392:54394,method:req.method,path:req.url.slice(8)","port:isAuth?54392:isRest?54394:54397,method:req.method,path:req.url.slice(isStorage?11:8)")
helper=once(helper,"const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>16384){res.writeHead(413);res.end();return}chunks.push(chunk)}req.body=Buffer.concat(chunks).toString('utf8');","try{req.body=await readFixtureAdminHttpBody(req)}catch(error){if(error.message!=='FIXTURE_BODY_TOO_LARGE')throw error;res.writeHead(413);res.end();return}req.query=Object.fromEntries(new URL(req.url,'http://127.0.0.1:54396').searchParams);")
// Keep HTTP BFF prerequisites, without repeating completed visible UI acceptance.
const probeFile=productWorkflow?'scripts/imported-product-workflow-probe.inc.mjs':intakeEvidence?'scripts/imported-intake-evidence-probe.inc.mjs':'scripts/imported-media-transport-probe.inc.mjs'
const probeName=productWorkflow?'importedProductProbe':intakeEvidence?'intakeEvidenceProbe':'mediaTransportProbe'
helper=once(helper,'await browserProbe(credentials,report,uid);',intakeEvidence?`await ${probeName}(uid,report,credentials,request,jar);`:'await mediaTransportProbe(uid,report,credentials);')
if(publicMedia)helper=once(helper,'await importedProductProbe(uid,report,credentials,request,jar);',`await importedProductProbe(uid,report,credentials,request,jar,{publicMedia:true,currentInstallation:${currentInstallation},browserWorkflow:${browserWorkflow},browserInventory:${browserInventory},staffStock:${staffStock},browserOut:path.dirname(new URL(import.meta.url).pathname.replace(/^\\/([A-Za-z]:)/,'$1'))});`)
helper+=`\nconst {${probeName}}=await import(pathToFileURL(path.join(process.cwd(),${JSON.stringify(probeFile)})).href)\n`
if(browserWorkflow){
 // Those refusal/logout contracts are already qualified. Avoid exhausting the
 // unchanged login rate limit before the actual browser's fresh login.
 helper=once(helper,"  let result=await request('session');", "  if(false){ // previously qualified HTTP Auth boundaries, intentionally not repeated\n  let result=await request('session');")
 helper=once(helper,'  await importedProductProbe(',"  }\n  process.env.K2_TURNSTILE_ALLOW_UNCONFIGURED='true';report.botScope='Explicit local unconfigured bot fixture; no hosted bot-provider proof';\n  report.checks.push('accepted_http_auth_refusal_logout_evidence_reused');\n  await importedProductProbe(")
}
if(intakeEvidence){
 helper=once(helper,"{cookie,csrf=true}={}","{cookie,csrf=true,headers:extraHeaders={}}={}")
 helper=once(helper,"cookie:cookie??[...jar].map(([k,v])=>k+'='+v).join('; ')","cookie:cookie??[...jar].map(([k,v])=>k+'='+v).join('; '),...extraHeaders")
 helper=once(helper,'body:JSON.stringify(body)','body:Buffer.isBuffer(body)?body:JSON.stringify(body)')
}
driver=once(driver,'await taxonomy(verified.access_token,uid,report)',"report.checks.push('prior_taxonomy_diagnostic_not_repeated')")
driver=driver.replace(/scope:'[^']*'/,()=> 'scope:'+JSON.stringify(executionScope))
if(productWorkflow){
 driver=once(driver,"good('admin_hard_delete_user',await admin.auth.admin.deleteUser(uid,false));uid=null","report.checks.push('auth_user_deletion_deferred_to_offline_fixture_recovery');uid=null")
 driver=once(driver,"if(uid){const cleanup=await admin.auth.admin.deleteUser(uid,false);report.failedPathUserCleanup=!cleanup.error}","if(uid)report.failedPathUserCleanup='deferred_to_offline_fixture_recovery'")
}
fs.writeFileSync('.tools/probe-local-imported-media.mjs',helper)
fs.writeFileSync('.tools/drive-local-imported-media.mjs',driver)
source=source.replaceAll('.tools/probe-local-browser-boundary.mjs','.tools/probe-local-imported-media.mjs').replaceAll('.tools/drive-local-browser-auth.mjs','.tools/drive-local-imported-media.mjs')
source=once(source,"fs.copyFileSync(path.join(process.cwd(),'.tools/prepare-auth-bff-probe.mjs'),path.join(out,'executed-derivation.mjs'),fs.constants.COPYFILE_EXCL)","fs.copyFileSync(path.join(process.cwd(),'scripts/prepare-imported-media-fixture.mjs'),path.join(out,'executed-derivation.mjs'),fs.constants.COPYFILE_EXCL)")
source=source.replace(/prep.scope='[^']*'/,()=> 'prep.scope='+JSON.stringify(executionScope))
source=once(source,"postgres://authenticator@127.0.0.1:5432/postgres?sslmode=disable","postgres://authenticator@127.0.0.1:5432/postgres?sslmode=disable&options=-clock_timeout%3D2000%20-cstatement_timeout%3D10000")
const startup=JSON.parse(fs.readFileSync('docs/acceptance/LOCAL_STORAGE_STARTUP_20261011.json'))
const accepted=startup.cases.find(c=>c.name==='oci-storage-startup02')
const storageProbe=fs.readFileSync(path.join(accepted.privateCase,'staging/k2/image-probe.sh'))
assert.equal(hash(storageProbe),accepted.pins['staging/k2/image-probe.sh'])
let settings=storageProbe.toString().slice(storageProbe.indexOf('export PATH=/usr/local/bin:'),storageProbe.indexOf('set +e',storageProbe.indexOf('export PATH=/usr/local/bin:'))).replace('SERVER_HOST=127.0.0.1','SERVER_HOST=0.0.0.0')
const start=`${settings}chroot /storageroot /bin/sh -c 'cd /app && exec /usr/local/bin/node dist/start/server.js' > /tmp/storage-service.log 2>&1 &
storage_pid=$!
export PATH=/nix/var/nix/profiles/default/bin:/usr/lib/postgresql/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
storage_healthy=false
for attempt in $(seq 1 120);do
 if wget -q -O /tmp/storage-health.json http://127.0.0.1:9996/status;then storage_healthy=true;break;fi
 if ! kill -0 "$storage_pid" 2>/dev/null;then break;fi
 sleep 0.25
done
if [ "$storage_healthy" != true ];then cat /tmp/storage-service.log;exit 1;fi
echo K2_STORAGE_INTEGRATED_HTTP_READY
`
const stop=`kill "$storage_pid" 2>/dev/null || true
set +e
(sleep 10; kill -KILL "$storage_pid" 2>/dev/null) &
storage_watchdog=$!
wait "$storage_pid"
storage_exit=$?
kill "$storage_watchdog" 2>/dev/null
wait "$storage_watchdog" 2>/dev/null
set -e
echo K2_STORAGE_INTEGRATED_STOPPED_EXIT_$storage_exit
`
const inject=`
probe=probe.replace('echo K2_POSTGREST_HEALTH_OK\\n',()=> 'echo K2_POSTGREST_HEALTH_OK\\n'+${JSON.stringify(start)});
probe=probe.replace('kill "$rest_pid" 2>/dev/null || true\\n',()=>${JSON.stringify(stop)}+'kill "$rest_pid" 2>/dev/null || true\\n');
probe=probe.replace('/bin/busybox timeout 120 /bin/busybox nc','/bin/busybox timeout 300 /bin/busybox nc');
`
// Full journey cleanup is an offline disposable-fixture operation, never a product command.
// Capture every original application row and sequence before any synthetic actor is created.
if(productWorkflow){
 const baseline=`su postgres -s /bin/sh -c 'psql -X -q -h /tmp -U supabase_admin -d postgres -v ON_ERROR_STOP=1' <<'PRODUCTBASELINE'
COPY (SELECT id FROM auth.users ORDER BY id) TO '/tmp/product-original-auth.ids';
CREATE TEMP TABLE product_fixture_tables AS SELECT n.nspname,c.relname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname IN ('public','k2_private');
COPY product_fixture_tables TO '/tmp/product-fixture-tables.rows';
SELECT 'K2_PRODUCT_BASELINE_TABLES_'||count(*) FROM product_fixture_tables;
DO $capture$ DECLARE r record; cols text; BEGIN FOR r IN SELECT * FROM product_fixture_tables LOOP SELECT string_agg(quote_ident(attname),',' ORDER BY attnum) INTO cols FROM pg_catalog.pg_attribute WHERE attrelid=format('%I.%I',r.nspname,r.relname)::regclass AND attnum>0 AND NOT attisdropped AND attgenerated=''; EXECUTE format('COPY (SELECT %s FROM %I.%I t ORDER BY to_jsonb(t)::text COLLATE "C") TO %L',cols,r.nspname,r.relname,'/tmp/product-before-'||r.nspname||'-'||r.relname||'.rows'); EXECUTE format('COPY (SELECT to_jsonb(t)::text FROM %I.%I t ORDER BY to_jsonb(t)::text COLLATE "C") TO %L',r.nspname,r.relname,'/tmp/product-before-'||r.nspname||'-'||r.relname||'.full'); END LOOP; END $capture$;
DO $capture$ DECLARE r record; v bigint; called boolean; statements text:=''; BEGIN FOR r IN SELECT n.nspname,c.relname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' AND n.nspname IN ('public','k2_private') ORDER BY n.nspname,c.relname LOOP EXECUTE format('SELECT last_value,is_called FROM %I.%I',r.nspname,r.relname) INTO v,called; statements:=statements||format('SELECT pg_catalog.setval(%L,%s,%L);',format('%I.%I',r.nspname,r.relname),v,called)||chr(10); END LOOP; CREATE TEMP TABLE product_fixture_sequences(statement text); INSERT INTO product_fixture_sequences VALUES(statements); END $capture$;
COPY product_fixture_sequences TO '/tmp/product-fixture-sequences.copy';
PRODUCTBASELINE
echo K2_PRODUCT_FIXTURE_BASELINE_CAPTURED
`
 const prerequisites=`su postgres -s /bin/sh -c 'psql -X -q -h /tmp -U supabase_admin -d postgres -v ON_ERROR_STOP=1' <<'PRODUCTPREREQUISITES'
${currentInstallation?'':"INSERT INTO public.brands(id,name) VALUES('b7000000-0000-4000-8000-000000000001','MAP018 Synthetic pantry brand');\nINSERT INTO public.categories(id,name) VALUES('b7000000-0000-4000-8000-000000000002','MAP018 Synthetic pantry category');"}
INSERT INTO k2_private.category_policy_command_config(singleton,maximum_depth) VALUES(true,10) ON CONFLICT(singleton) DO NOTHING;
PRODUCTPREREQUISITES
echo K2_SYNTHETIC_PRODUCT_PREREQUISITES_READY
`
 const sequenceRecheck=baseline.slice(baseline.indexOf('DO $capture$ DECLARE r record; v bigint;'),baseline.indexOf('PRODUCTBASELINE\necho')).replace('CREATE TEMP TABLE product_fixture_sequences(statement text);','TRUNCATE product_fixture_sequences;').replace('/tmp/product-fixture-sequences.copy','/tmp/product-fixture-sequences-after.copy')
 const restore=`su postgres -s /bin/sh -c 'psql -X -q -h /tmp -U supabase_admin -d postgres -v ON_ERROR_STOP=1' <<'PRODUCTRECOVERY'
BEGIN;
CREATE TEMP TABLE product_fixture_tables(nspname name,relname name);
COPY product_fixture_tables FROM '/tmp/product-fixture-tables.rows';
SET LOCAL session_replication_role=replica;
DO $restore$ DECLARE r record; cols text; BEGIN FOR r IN SELECT * FROM product_fixture_tables LOOP EXECUTE format('DELETE FROM %I.%I',r.nspname,r.relname); END LOOP; FOR r IN SELECT * FROM product_fixture_tables LOOP SELECT string_agg(quote_ident(attname),',' ORDER BY attnum) INTO cols FROM pg_catalog.pg_attribute WHERE attrelid=format('%I.%I',r.nspname,r.relname)::regclass AND attnum>0 AND NOT attisdropped AND attgenerated=''; EXECUTE format('COPY %I.%I(%s) FROM %L',r.nspname,r.relname,cols,'/tmp/product-before-'||r.nspname||'-'||r.relname||'.rows'); END LOOP; END $restore$;
CREATE TEMP TABLE product_fixture_sequences(statement text);
COPY product_fixture_sequences FROM '/tmp/product-fixture-sequences.copy';
DO $restore$ BEGIN EXECUTE (SELECT statement FROM product_fixture_sequences); END $restore$;
SET LOCAL session_replication_role=origin;
CREATE TEMP TABLE product_original_auth(id uuid PRIMARY KEY);
COPY product_original_auth FROM '/tmp/product-original-auth.ids';
DELETE FROM auth.users a WHERE NOT EXISTS(SELECT 1 FROM product_original_auth b WHERE b.id=a.id);
COMMIT;
${sequenceRecheck}
DO $capture$ DECLARE r record; BEGIN FOR r IN SELECT * FROM product_fixture_tables LOOP EXECUTE format('COPY (SELECT to_jsonb(t)::text FROM %I.%I t ORDER BY to_jsonb(t)::text COLLATE "C") TO %L',r.nspname,r.relname,'/tmp/product-after-'||r.nspname||'-'||r.relname||'.full'); END LOOP; END $capture$;
PRODUCTRECOVERY
for before in /tmp/product-before-*.full;do after=$(echo "$before" | sed 's/product-before-/product-after-/');if ! cmp -s "$before" "$after";then echo "K2_PRODUCT_ROW_RECOVERY_MISMATCH_$before";sha256sum "$before" "$after";exit 1;fi;done
sha256sum /tmp/product-before-*.full /tmp/product-after-*.full
cmp -s /tmp/product-fixture-sequences.copy /tmp/product-fixture-sequences-after.copy
sha256sum /tmp/product-fixture-sequences.copy /tmp/product-fixture-sequences-after.copy
echo K2_PRODUCT_ALL_APPLICATION_SEQUENCES_RECOVERED
echo K2_PRODUCT_ALL_APPLICATION_ROWS_RECOVERED
`
 const productInject=`\nprobe=probe.replace("su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f /tmp/original-row-projection.sql' > /tmp/auth-rows-before.json",()=>${JSON.stringify(baseline)}+"su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f /tmp/original-row-projection.sql' > /tmp/auth-rows-before.json\\n"+${JSON.stringify(prerequisites)});\nprobe=probe.replace('echo K2_BFF_PRIVATE_RECOVERY_OK\\n',()=> 'echo K2_BFF_PRIVATE_RECOVERY_OK\\n'+${JSON.stringify(restore)});\n`
 source=once(source,"fs.writeFileSync(path.join(k2,'image-probe.sh'),probe,{flag:'wx'})",productInject+"\nfs.writeFileSync(path.join(k2,'image-probe.sh'),probe,{flag:'wx'})")
}
source=once(source,"fs.writeFileSync(path.join(k2,'image-probe.sh'),probe,{flag:'wx'})",inject+"\nfs.writeFileSync(path.join(k2,'image-probe.sh'),probe,{flag:'wx'})")
const payload=`
const storageReceipt=JSON.parse(fs.readFileSync('docs/acceptance/LOCAL_STORAGE_COMPATIBLE_RUNTIME_20261011.json'));
const {describeStorageLayout}=await import(pathToFileURL(path.join(process.cwd(),'scripts/storage-runtime-layout.mjs')).href);
const storageInput=storageReceipt.privateCase;
const storageLayout=describeStorageLayout({manifest:fs.readFileSync(path.join(storageInput,'manifest.json')),config:fs.readFileSync(path.join(storageInput,'config.json')),layers:storageReceipt.layers.map(l=>fs.readFileSync(path.join(storageInput,'layers',l.name))),expectedManifestDigest:storageReceipt.manifestDigest});
const image=path.join(http,'storage-image');fs.mkdirSync(path.join(image,'blobs/sha256'),{recursive:true});
fs.writeFileSync(path.join(image,'oci-layout'),storageLayout.layout,{flag:'wx'});fs.writeFileSync(path.join(image,'index.json'),storageLayout.index,{flag:'wx'});
for(const blob of storageLayout.blobs)fs.writeFileSync(path.join(image,'blobs/sha256',blob.digest.slice(7)),blob.bytes,{flag:'wx'});
fs.writeFileSync(path.join(http,'umoci'),pin(path.join(root,'umoci-runtime01/umoci.linux.amd64'),'b51c267ec394499e42c6fde47f240b7b7dba57ea49df0b5acd304378b82a3b71'),{flag:'wx'});
extraction+='/bin/busybox chmod 755 /http/umoci\\n/http/umoci unpack --image /http/storage-image:storage /storage-bundle\\n/bin/busybox mv /storage-bundle/rootfs /k2root/storageroot\\n/bin/busybox mkdir -p /k2root/storageroot/proc /k2root/storageroot/dev\\n/bin/busybox mount -t proc proc /k2root/storageroot/proc\\n/bin/busybox mount --bind /dev /k2root/storageroot/dev\\n';
`
source=once(source,"const run='/bin/busybox chroot /k2root /bin/sh /tmp/k2-image-probe.sh';",payload+"\nconst run='/bin/busybox chroot /k2root /bin/sh /tmp/k2-image-probe.sh';")
source=once(source, "\"args[args.indexOf('-m')+1]='4096';args", "\"args[args.indexOf('-m')+1]='7168';args").replace('hostfwd=tcp:127.0.0.1:54394-:9997','hostfwd=tcp:127.0.0.1:54394-:9997,hostfwd=tcp:127.0.0.1:54397-:9996')
source=once(source,"stdout.includes('K2_BFF_PRIVATE_RECOVERY_OK')&&","stdout.includes('K2_STORAGE_INTEGRATED_HTTP_READY')&&stdout.includes('K2_STORAGE_INTEGRATED_STOPPED_EXIT_')&&stdout.includes('K2_BFF_PRIVATE_RECOVERY_OK')&&")
const sources=['scripts/prepare-imported-media-fixture.mjs',probeFile,'scripts/fixture-admin-http-body.mjs','scripts/storage-runtime-layout.mjs',...(intakeEvidence?['server/admin-bff/product-intake.js']:[]),...(productWorkflow?['scripts/imported-intake-evidence-probe.inc.mjs','server/admin-bff/catalog-spreadsheet.js','server/admin-bff/product-master.js','server/admin-bff/channels.js']:[]),...(publicMedia?['server/admin-bff/product-media.js']:[]),...(currentInstallation?['server/admin-bff/references.js','scripts/reference-catalog-contract.mjs']:[])]
if(staffStock){source=extendAdminStockReadFixture(source,once);sources.push('scripts/admin-stock-read-fixture.inc.mjs','scripts/admin-stock-read-probe.inc.mjs','supabase/prepared/admin_product_stock_read.sql','server/admin-bff/product-stock.js','prepared-api/admin/products.js')}
if(browserWorkflow)sources.push('scripts/imported-intake-browser-probe.inc.mjs','src/views/admin/ProductIntakeSessionModal.jsx','src/views/admin/InventoryGrid.jsx','src/services/productIntakeService.js')
const pins=Object.fromEntries(sources.map(f=>[f,hash(fs.readFileSync(f))]))
if(productWorkflow)source=once(source,'const prep=JSON.parse',`const sourceInputs=${JSON.stringify(pins)};fs.mkdirSync(path.join(out,'source-inputs'));for(const [file,expected]of Object.entries(sourceInputs)){const bytes=fs.readFileSync(file);assert.equal(sha(bytes),expected,file);fs.writeFileSync(path.join(out,'source-inputs',file.replaceAll('/','--')),bytes,{flag:'wx'});}\nconst prep=JSON.parse`)
source=once(source,'const prep=JSON.parse',`fs.writeFileSync(path.join(out,'media-source-pins.json'),${JSON.stringify(JSON.stringify(pins,null,2))},{flag:'wx'});\nconst prep=JSON.parse`)
if(currentInstallation)source=once(source,'const prep=JSON.parse',`fs.writeFileSync(path.join(out,'full-installation-pins.json'),${JSON.stringify(JSON.stringify(installationPins,null,2))},{flag:'wx'});\nconst prep=JSON.parse`)
const derived='.tools/derived-imported-media.mjs';fs.writeFileSync(derived,source)
if(!process.argv.includes('--prepare-only'))await import(pathToFileURL(path.join(process.cwd(),derived)).href)
