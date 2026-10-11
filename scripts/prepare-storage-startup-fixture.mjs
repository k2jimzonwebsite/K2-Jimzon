// MAP-018/IDEA-20261009-11. Reuse the captured DB foundation used by full Admin.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import {describeStorageLayout} from './storage-runtime-layout.mjs'
const root='D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const name=process.argv.find(value=>value.startsWith('--case='))?.slice(7)
assert.match(name||'',/^oci-storage-startup\d{2}$/)
const out=path.join(root,name),source=path.join(root,'oci-imported02')
assert.ok(!fs.existsSync(out),'Fresh owned fixture required')
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const pin=(file,hash)=>{const bytes=fs.readFileSync(file);assert.equal(sha(bytes),hash,file);return bytes}
const originalProbe=pin(path.join(source,'staging/k2/image-probe.sh'),'63b06f69ec4e12178daaa192951a7a8c0fccfe1ab87abb1126a6a896f7482bd6').toString()
let init=pin(path.join(source,'staging/k2/init.sh'),'40380821b7a2a066d164c1f391c92269516ca38c142e8fc55e29cfbeb6e144c2').toString()
const foundationPins={'race-catalog.sql':'10b5ebadfbb099ad8d3cbc624220b731ec49ddbd9f2c855412f922631d277ceb','cold-authority.sql':'da1ab048555c6d3f009b0f6ae811e51528d299ef3d7f4d8daa60632a65948fd1','original-row-projection.sql':'98b83bb916c9178406ded4c4d6c030ff9c1ed0f3b39bda92e7be1e6826251010','captured-restore.sql':'57c1cf8abe1b36ba078d125751cf91b01c0a46faf9ca0a5be9cd561e60bd9637'}
for(const [file,hash]of Object.entries(foundationPins))pin(path.join(source,'staging/k2',file),hash)
const receipt=JSON.parse(fs.readFileSync('docs/acceptance/LOCAL_STORAGE_COMPATIBLE_RUNTIME_20261011.json'))
const input=receipt.privateCase
assert.equal(path.resolve(input),path.resolve(path.join(root,'storage-runtime03')))
for(const [file,hash]of Object.entries(receipt.pins))pin(path.join(input,file),hash)
const layout=describeStorageLayout({manifest:pin(path.join(input,'manifest.json'),receipt.pins['manifest.json']),config:pin(path.join(input,'config.json'),receipt.pins['config.json']),layers:receipt.layers.map(l=>fs.readFileSync(path.join(input,'layers',l.name))),expectedManifestDigest:receipt.manifestDigest})
const unpacker=pin(path.join(root,'umoci-runtime01/umoci.linux.amd64'),'b51c267ec394499e42c6fde47f240b7b7dba57ea49df0b5acd304378b82a3b71')
fs.mkdirSync(out)
const stage=path.join(out,'staging'),k2=path.join(stage,'k2'),payload=path.join(stage,'storage'),image=path.join(payload,'image')
fs.mkdirSync(k2,{recursive:true});fs.mkdirSync(path.join(image,'blobs/sha256'),{recursive:true})
fs.writeFileSync(path.join(image,'oci-layout'),layout.layout,{flag:'wx'});fs.writeFileSync(path.join(image,'index.json'),layout.index,{flag:'wx'})
for(const blob of layout.blobs)fs.writeFileSync(path.join(image,'blobs/sha256',blob.digest.slice(7)),blob.bytes,{flag:'wx'})
fs.writeFileSync(path.join(payload,'umoci'),unpacker,{flag:'wx'})
fs.copyFileSync('scripts/storage-startup-driver.inc.cjs',path.join(payload,'driver.cjs'),fs.constants.COPYFILE_EXCL)
const psql=(user,file)=>`su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U ${user} -d postgres -v ON_ERROR_STOP=1 -f /tmp/${file}'`
const prefixAt=originalProbe.indexOf(psql('supabase_admin','race-catalog.sql'));assert.ok(prefixAt>0)
let probe=originalProbe.slice(0,prefixAt).replaceAll('-c listen_addresses= -c','-c listen_addresses=127.0.0.1 -c')
const snapshot=state=>[['rows','original-row-projection.sql'],['schema','race-catalog.sql']].map(([kind,file])=>psql('supabase_admin',file)+` > /tmp/storage-${kind}-${state}.json`).join('\n')+'\n'
probe+=snapshot('before')+psql('postgres','cold-authority.sql')+'\n'
probe+=`export PATH=/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin
export DATABASE_URL='postgres://supabase_storage_admin@127.0.0.1:5432/postgres?sslmode=disable&options=-clock_timeout%3D2000%20-cstatement_timeout%3D10000'
export AUTH_JWT_SECRET=synthetic-local-startup-only-secret-20261010
export DB_MIGRATIONS_FREEZE_AT=drop-bucketid-objname-index DB_ALLOW_MIGRATION_REFRESH=false DB_INSTALL_ROLES=false
export MULTI_TENANT=false PG_QUEUE_ENABLE=false VECTOR_STORE_MIGRATIONS_ENABLED=false ENABLE_IMAGE_TRANSFORMATION=false
export STORAGE_BACKEND=file FILE_STORAGE_BACKEND_PATH=/tmp/k2-storage-objects GLOBAL_S3_BUCKET=synthetic-local-bucket
export VERSION=1.79.20 SERVER_HOST=127.0.0.1 SERVER_PORT=9996 SERVER_ADMIN_PORT=9995 REGION=synthetic-local TENANT_ID=synthetic-local FILE_SIZE_LIMIT=4194304 LOG_LEVEL=warn
set +e
chroot /storageroot /bin/sh -c 'cd /app && /usr/local/bin/node /app/k2-startup-driver.cjs'
storage_exit=$?
set -e
export PATH=/nix/var/nix/profiles/default/bin:/usr/lib/postgresql/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
conserved=true
${snapshot('after').trim().split('\n').map(line=>line+' || conserved=false').join('\n')}
${psql('postgres','cold-authority.sql')} || conserved=false
cmp -s /tmp/storage-rows-before.json /tmp/storage-rows-after.json || conserved=false
cmp -s /tmp/storage-schema-before.json /tmp/storage-schema-after.json || conserved=false
sha256sum /tmp/storage-rows-before.json /tmp/storage-rows-after.json /tmp/storage-schema-before.json /tmp/storage-schema-after.json
if [ "$conserved" = true ];then echo K2_STORAGE_STARTUP_CONSERVATION_OK;fi
`
const recoverAt=originalProbe.indexOf("su postgres -s /bin/sh -c 'dropdb",originalProbe.indexOf('K2_ALL88_COMMITTED_ORIGINAL_PROJECTIONS_OK'))
const recoverEnd=originalProbe.indexOf('echo K2_CATALOG_BEFORE_BEGIN',recoverAt)
assert.ok(recoverAt>0&&recoverEnd>recoverAt)
probe+=originalProbe.slice(recoverAt,recoverEnd)+snapshot('cold')+`cmp -s /tmp/storage-rows-before.json /tmp/storage-rows-cold.json
cmp -s /tmp/storage-schema-before.json /tmp/storage-schema-cold.json
sha256sum /tmp/storage-rows-before.json /tmp/storage-rows-cold.json /tmp/storage-schema-before.json /tmp/storage-schema-cold.json
echo K2_STORAGE_COLD_RECOVERY_OK
[ "$storage_exit" = 0 ]
[ "$conserved" = true ]
echo K2_GENUINE_POSTGRES_MODULE_PROBE_OK
`
fs.writeFileSync(path.join(k2,'image-probe.sh'),probe,{flag:'wx'})
const run='/bin/busybox chroot /k2root /bin/sh /tmp/k2-image-probe.sh'
assert.equal(init.split(run).length,2)
const extraction=`/bin/busybox ifconfig lo up
/bin/busybox chmod 755 /storage/umoci
/storage/umoci unpack --image /storage/image:storage /storage-bundle
/bin/busybox mv /storage-bundle/rootfs /k2root/storageroot
/bin/busybox mkdir -p /k2root/storageroot/proc /k2root/storageroot/dev
/bin/busybox mount -t proc proc /k2root/storageroot/proc
/bin/busybox mount --bind /dev /k2root/storageroot/dev
/bin/busybox cp /storage/driver.cjs /k2root/storageroot/app/k2-startup-driver.cjs
`
init=init.replace(run,extraction+run)
fs.writeFileSync(path.join(k2,'init.sh'),init,{flag:'wx'})
const overlay=path.join(out,'overlay.cpio')
const tar=spawnSync('tar.exe',['-cf',overlay,'--format=newc','-C',stage,'k2','storage'],{encoding:'utf8',windowsHide:true});assert.equal(tar.status,0,tar.stderr)
const fd=fs.openSync(path.join(out,'initramfs.cpio'),'wx')
try{for(const file of [path.join(source,'initramfs.cpio'),overlay]){for await(const bytes of fs.createReadStream(file)){let at=0;while(at<bytes.length)at+=fs.writeSync(fd,bytes,at,bytes.length-at)}const pad=(4-fs.fstatSync(fd).size%4)%4;if(pad)fs.writeSync(fd,Buffer.alloc(pad))}}finally{fs.closeSync(fd)}
const prep=JSON.parse(fs.readFileSync(path.join(source,'preparation.json')))
prep.scope='Actual Storage startup/config/HTTP health and captured full application rows/schema/sequence/global-managed authority conservation/cold recovery; no Auth/browser/upload/provider qualification'
Object.assign(prep,{probeSha256:sha(probe),initSha256:sha(init),storageManifestDigest:receipt.manifestDigest,foundationPins})
fs.writeFileSync(path.join(out,'preparation.json'),JSON.stringify(prep,null,2),{flag:'wx'})
fs.copyFileSync(new URL(import.meta.url),path.join(out,'executed-source.mjs'),fs.constants.COPYFILE_EXCL)
fs.copyFileSync('scripts/storage-runtime-layout.mjs',path.join(out,'executed-layout.mjs'),fs.constants.COPYFILE_EXCL)
let runner=pin(path.join(root,'run-oci-envelope12.mjs'),'26e4d5ec612536fe67559f7c0ef1ebe7921e1cc111b51ed7b9e22025b9d9794c').toString().replaceAll('oci-envelope12',name)
const flags=/report\.moduleGucs=[\s\S]*?;\r?\nif\(report\.moduleGucs\)\{[\s\S]*?report\.fullCatalogRollback=true;\}/
assert.equal((runner.match(flags)||[]).length,1)
runner=runner.replace(flags,"report.moduleGucs=['K2_STORAGE_ACTUAL_CONFIG_OK','K2_STORAGE_DB_IDENTITY_OK','K2_STORAGE_ACTUAL_HTTP_HEALTH_OK','K2_STORAGE_PROCESS_STOPPED','K2_STORAGE_STARTUP_CONSERVATION_OK','K2_STORAGE_COLD_RECOVERY_OK'].every(marker=>stdout.includes(marker))&&(stdout.match(/K2_COLD_GLOBAL_AND_MANAGED_AUTHORITY_OK/g)||[]).length===3;")
runner=runner.replace(/scope:'Complete guarded10s[^']*'/,()=> 'scope:'+JSON.stringify(prep.scope))
runner=runner.replace("args[args.indexOf('-m')+1]='4096'","args[args.indexOf('-m')+1]='6144';if(args[args.indexOf('-nic')+1]!=='none')throw Error('NO_NIC_REQUIRED')")
runner=runner.replace('/~ #\\s*$/','/~ #\\s*(?:\\x1b\\[6n)?$/')
const runnerFile=path.join(out,'runner-source.mjs');fs.writeFileSync(runnerFile,runner,{flag:'wx'})
if(!process.argv.includes('--prepare-only'))await import(pathToFileURL(runnerFile).href)
