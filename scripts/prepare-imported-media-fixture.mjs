// MAP-018 / IDEA-20261009-11. Genuine Auth/Storage local transport; no provider.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
const root='D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const name=process.argv.find(a=>a.startsWith('--case='))?.slice(7)
assert.match(name||'',/^oci-imported-media\d{2}$/)
assert.ok(!fs.existsSync(path.join(root,name)),'Fresh fixture required')
const hash=b=>createHash('sha256').update(b).digest('hex')
const receipt=JSON.parse(fs.readFileSync('docs/acceptance/LOCAL_BROWSER_AUTH_20261010.json'))
const base=receipt.cases.find(c=>c.case==='oci-browser-auth03')
const pin=file=>{const bytes=fs.readFileSync(path.join(root,base.case,file));assert.equal(hash(bytes),base.hashes[file],file);return bytes.toString()}
const once=(s,b,a)=>{assert.equal(s.split(b).length,2,b.slice(0,100));return s.replace(b,()=>a)}
let source=pin('executed-source.mjs').replaceAll(base.case,name)
let helper=pin('bff-helper.mjs'),driver=pin('host-driver.mjs')
const scope='Genuine local Auth/MFA actual Storage upload/download/remove through unified proxy and binary Admin fixture adapter; original captured recovery; no browser/intake registration/provider acceptance'
helper=helper.slice(0,helper.indexOf('async function browserProbe('))
helper=once(helper,"import http from 'node:http'","import http from 'node:http'\nconst {readFixtureAdminHttpBody}=await import(pathToFileURL(path.join(process.cwd(),'scripts/fixture-admin-http-body.mjs')).href)")
helper=once(helper,"const calls={auth:0,rest:0,routed:0}","const calls={auth:0,rest:0,storage:0,routed:0}")
helper=once(helper,"const isAuth=req.url.startsWith('/auth/v1/'),isRest=req.url.startsWith('/rest/v1/')","const isAuth=req.url.startsWith('/auth/v1/'),isRest=req.url.startsWith('/rest/v1/'),isStorage=req.url.startsWith('/storage/v1/')")
helper=once(helper,'if(!isAuth&&!isRest)','if(!isAuth&&!isRest&&!isStorage)')
helper=once(helper,"calls[isAuth?'auth':'rest']++","calls[isAuth?'auth':isRest?'rest':'storage']++")
helper=once(helper,"port:isAuth?54392:54394,method:req.method,path:req.url.slice(8)","port:isAuth?54392:isRest?54394:54397,method:req.method,path:req.url.slice(isStorage?11:8)")
helper=once(helper,"const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>16384){res.writeHead(413);res.end();return}chunks.push(chunk)}req.body=Buffer.concat(chunks).toString('utf8');","try{req.body=await readFixtureAdminHttpBody(req)}catch(error){if(error.message!=='FIXTURE_BODY_TOO_LARGE')throw error;res.writeHead(413);res.end();return}req.query=Object.fromEntries(new URL(req.url,'http://127.0.0.1:54396').searchParams);")
// Keep HTTP BFF prerequisites, without repeating completed visible UI acceptance.
helper=once(helper,'await browserProbe(credentials,report,uid);','await mediaTransportProbe(uid,report,credentials);')
helper+="\nconst {mediaTransportProbe}=await import(pathToFileURL(path.join(process.cwd(),'scripts/imported-media-transport-probe.inc.mjs')).href)\n"
driver=once(driver,'await taxonomy(verified.access_token,uid,report)',"report.checks.push('prior_taxonomy_diagnostic_not_repeated')")
driver=driver.replace(/scope:'[^']*'/,()=> 'scope:'+JSON.stringify(scope))
fs.writeFileSync('.tools/probe-local-imported-media.mjs',helper)
fs.writeFileSync('.tools/drive-local-imported-media.mjs',driver)
source=source.replaceAll('.tools/probe-local-browser-boundary.mjs','.tools/probe-local-imported-media.mjs').replaceAll('.tools/drive-local-browser-auth.mjs','.tools/drive-local-imported-media.mjs')
source=once(source,"fs.copyFileSync(path.join(process.cwd(),'.tools/prepare-auth-bff-probe.mjs'),path.join(out,'executed-derivation.mjs'),fs.constants.COPYFILE_EXCL)","fs.copyFileSync(path.join(process.cwd(),'scripts/prepare-imported-media-fixture.mjs'),path.join(out,'executed-derivation.mjs'),fs.constants.COPYFILE_EXCL)")
source=source.replace(/prep.scope='[^']*'/,()=> 'prep.scope='+JSON.stringify(scope))
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
const sources=['scripts/prepare-imported-media-fixture.mjs','scripts/imported-media-transport-probe.inc.mjs','scripts/fixture-admin-http-body.mjs','scripts/storage-runtime-layout.mjs']
const pins=Object.fromEntries(sources.map(f=>[f,hash(fs.readFileSync(f))]))
source=once(source,'const prep=JSON.parse',`fs.writeFileSync(path.join(out,'media-source-pins.json'),${JSON.stringify(JSON.stringify(pins,null,2))},{flag:'wx'});\nconst prep=JSON.parse`)
const derived='.tools/derived-imported-media.mjs';fs.writeFileSync(derived,source)
if(!process.argv.includes('--prepare-only'))await import(pathToFileURL(path.join(process.cwd(),derived)).href)
