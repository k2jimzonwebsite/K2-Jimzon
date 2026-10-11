// MAP-018 / IDEA-20261009-11. Disposable Linux, no NIC/database/provider access.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { describeStorageLayout } from './storage-runtime-layout.mjs'
import { parseStorageMigrationLedger } from './storage-migration-ledger.mjs'
const root='D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const caseName=process.argv.find(value=>value.startsWith('--case='))?.slice(7)
assert.match(caseName||'',/^storage-native\d{2}$/)
const compatibleAudit=process.argv.includes('--compatible-migration-audit')
const out=path.join(root,caseName), input=path.join(root,compatibleAudit?'storage-runtime03':'storage-runtime01')
const migrationAudit=compatibleAudit||process.argv.includes('--migration-audit')
assert.ok(!fs.existsSync(out),'Fresh native fixture required')
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const receipt=JSON.parse(fs.readFileSync(compatibleAudit?'docs/acceptance/LOCAL_STORAGE_COMPATIBLE_RUNTIME_20261011.json':'docs/acceptance/LOCAL_STORAGE_RUNTIME_PREPARATION_20261011.json'))
assert.equal(path.resolve(receipt.privateCase),path.resolve(input))
const pin=file=>{const bytes=fs.readFileSync(path.join(input,file));assert.equal(sha(bytes),receipt.pins[file],file);return bytes}
for(const file of Object.keys(receipt.pins))pin(file)
const layout=describeStorageLayout({manifest:pin('manifest.json'),config:pin('config.json'),layers:receipt.layers.map(layer=>fs.readFileSync(path.join(input,'layers',layer.name))),expectedManifestDigest:receipt.manifestDigest})
const imageConfig=JSON.parse(pin('config.json'))
const nodeVersion=imageConfig.config.Env.find(value=>value.startsWith('NODE_VERSION='))?.slice(13)
assert.match(nodeVersion||'',/^24\.\d+\.\d+$/)
const unpacker=fs.readFileSync(path.join(root,'umoci-runtime01/umoci.linux.amd64'))
assert.equal(sha(unpacker),'b51c267ec394499e42c6fde47f240b7b7dba57ea49df0b5acd304378b82a3b71')
fs.mkdirSync(out)
const stage=path.join(out,'staging'),payload=path.join(stage,'storage'),image=path.join(payload,'image')
fs.mkdirSync(path.join(image,'blobs/sha256'),{recursive:true})
fs.writeFileSync(path.join(image,'oci-layout'),layout.layout,{flag:'wx'})
fs.writeFileSync(path.join(image,'index.json'),layout.index,{flag:'wx'})
for(const blob of layout.blobs)fs.writeFileSync(path.join(image,'blobs/sha256',blob.digest.slice(7)),blob.bytes,{flag:'wx'})
fs.writeFileSync(path.join(payload,'umoci'),unpacker,{flag:'wx'})
fs.writeFileSync(path.join(payload,'dependency-probe.cjs'),`const p=require('./package.json'); if(p.name!=='supa-storage'||p.version!=='1.11.2')process.exit(1); require('pg'); console.log('K2_STORAGE_PACKAGE_OK '+p.name+' '+p.version);\n`,{flag:'wx'})
let capturedRestoreSha256
if(migrationAudit){
  const captured=fs.readFileSync(path.join(root,'oci-imported02/staging/k2/captured-restore.sql'))
  capturedRestoreSha256=sha(captured)
  assert.equal(capturedRestoreSha256,'57c1cf8abe1b36ba078d125751cf91b01c0a46faf9ca0a5be9cd561e60bd9637')
  fs.writeFileSync(path.join(payload,'ledger.json'),JSON.stringify(parseStorageMigrationLedger(captured.toString('utf8'))),{flag:'wx'})
  fs.copyFileSync('scripts/storage-migration-audit.inc.cjs',path.join(payload,'migration-audit.cjs'),fs.constants.COPYFILE_EXCL)
  if(compatibleAudit){
    fs.copyFileSync('scripts/storage-migration-ledger.mjs',path.join(payload,'ledger.mjs'),fs.constants.COPYFILE_EXCL)
    fs.writeFileSync(path.join(payload,'compatible-audit.json'),JSON.stringify({freezeAt:'drop-bucketid-objname-index'}),{flag:'wx'})
  }
}
const init=`set -eu
trap 'echo K2_STORAGE_NATIVE_FAILED; /bin/busybox poweroff -f' EXIT
/bin/busybox mount -t proc proc /proc
/bin/busybox mount -t devtmpfs devtmpfs /dev
/bin/busybox chmod 755 /storage/umoci
/storage/umoci --version
/storage/umoci unpack --image /storage/image:storage /storage-bundle
echo K2_STORAGE_OCI_UNPACK_OK
test "$(/bin/busybox find /storage-bundle/rootfs -name '.wh.*' | /bin/busybox wc -l)" = 0
echo K2_STORAGE_WHITEOUT_MARKERS_ABSENT
/bin/busybox chroot /storage-bundle/rootfs /usr/local/bin/node --version
/bin/busybox chroot /storage-bundle/rootfs /bin/sh -c 'cd /app && /usr/local/bin/node' < /storage/dependency-probe.cjs
${migrationAudit?`/bin/busybox cp /storage/ledger.json /storage-bundle/rootfs/k2-storage-ledger.json
${compatibleAudit?`/bin/busybox cp /storage/ledger.mjs /storage-bundle/rootfs/k2-storage-ledger.mjs
/bin/busybox cp /storage/compatible-audit.json /storage-bundle/rootfs/k2-storage-compatible-audit.json`:''}
/bin/busybox chroot /storage-bundle/rootfs /bin/sh -c 'cd /app && /usr/local/bin/node' < /storage/migration-audit.cjs`:''}
echo K2_STORAGE_NATIVE_OK
trap - EXIT
/bin/busybox poweroff -f
`
fs.writeFileSync(path.join(payload,'init.sh'),init,{flag:'wx'})
const overlay=path.join(out,'overlay.cpio')
const packed=spawnSync('tar.exe',['-cf',overlay,'--format=newc','-C',stage,'storage'],{encoding:'utf8',windowsHide:true})
assert.equal(packed.status,0,packed.stderr)
const base=path.join(root,'portable-linux-runner01/linux02/boot/initramfs-virt'),initramfs=path.join(out,'initramfs.cpio'),fd=fs.openSync(initramfs,'wx')
try{for(const file of [base,overlay]){for await(const bytes of fs.createReadStream(file)){let at=0;while(at<bytes.length)at+=fs.writeSync(fd,bytes,at,bytes.length-at)}const pad=(4-fs.fstatSync(fd).size%4)%4;if(pad)fs.writeSync(fd,Buffer.alloc(pad))}}finally{fs.closeSync(fd)}
const launch=JSON.parse(fs.readFileSync(path.join(root,'portable-linux-runner01/boot02/launch.json'))),args=[...launch.args]
assert.equal(args[args.indexOf('-nic')+1],'none')
args[args.indexOf('-m')+1]='3072';args[args.indexOf('-accel')+1]='whpx';args[args.indexOf('-initrd')+1]=initramfs
fs.copyFileSync(new URL(import.meta.url),path.join(out,'executed-source.mjs'),fs.constants.COPYFILE_EXCL)
fs.copyFileSync('scripts/storage-runtime-layout.mjs',path.join(out,'executed-layout.mjs'),fs.constants.COPYFILE_EXCL)
fs.copyFileSync('scripts/storage-migration-ledger.mjs',path.join(out,'executed-ledger.mjs'),fs.constants.COPYFILE_EXCL)
const report={owningMap:'MAP-018',idea:'IDEA-20261009-11',scope:'Native public OCI filesystem unpack and Node/Storage dependency admission only; no database/service health/upload/provider acceptance',providerWrites:false,databaseChanges:false,nic:'none',imageTag:'v1.74.0',packageVersion:'1.11.2',manifestDigest:receipt.manifestDigest,unpackerSha256:sha(unpacker),guestInitSha256:sha(init),sourceSha256:sha(fs.readFileSync(new URL(import.meta.url))),layoutSourceSha256:sha(fs.readFileSync('scripts/storage-runtime-layout.mjs')),baseInitramfsSha256:sha(fs.readFileSync(base))}
if(migrationAudit)Object.assign(report,{scope:'Actual image migration loading/hash validation against immutable captured ledger; no database connection/startup/writes',capturedRestoreSha256,ledgerSourceSha256:sha(fs.readFileSync('scripts/storage-migration-ledger.mjs')),auditSourceSha256:sha(fs.readFileSync(path.join(payload,'migration-audit.cjs')))})
Object.assign(report,{imageTag:compatibleAudit?'v1.79.20':'v1.74.0',nodeVersion})
if(process.argv.includes('--prepare-only')){fs.writeFileSync(path.join(out,'preparation.json'),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));process.exit(0)}
let stdout='',stderr='',sent=false
const child=spawn(launch.exe,args,{windowsHide:true,stdio:['pipe','pipe','pipe']});report.pid=child.pid
fs.writeFileSync(path.join(out,'launch.json'),JSON.stringify({exe:launch.exe,args,pid:child.pid},null,2),{flag:'wx'})
report.exit=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{report.timedOut=true;child.kill()},180000);child.on('error',error=>{clearTimeout(timer);reject(error)});child.stdout.on('data',bytes=>{stdout+=bytes;if(!sent&&/~ #\s*$/.test(stdout)){sent=true;(async()=>{for(const char of '/bin/sh /storage/init.sh\n'){if(child.exitCode!==null||child.signalCode!==null)return;child.stdin.write(char);await new Promise(resolve=>setTimeout(resolve,15))}})().catch(error=>{stderr+=error.message;child.kill()})}});child.stderr.on('data',bytes=>stderr+=bytes);child.on('close',code=>{clearTimeout(timer);resolve(code)})})
report.processStopped=child.exitCode!==null||child.signalCode!==null
report.nativeAdmission=stdout.includes('K2_STORAGE_NATIVE_OK')&&stdout.includes('K2_STORAGE_OCI_UNPACK_OK')&&stdout.includes('K2_STORAGE_WHITEOUT_MARKERS_ABSENT')&&stdout.includes('v'+nodeVersion)&&stdout.includes('K2_STORAGE_PACKAGE_OK supa-storage 1.11.2')&&!stdout.includes('K2_STORAGE_NATIVE_FAILED')
if(migrationAudit){
  const line=stdout.split(/\r?\n/).find(line=>line.startsWith('K2_STORAGE_MIGRATION_AUDIT '))
  report.migrationAudit=line?JSON.parse(line.slice('K2_STORAGE_MIGRATION_AUDIT '.length)):null
  report.migrationAuditVerified=stdout.includes('K2_STORAGE_MIGRATION_AUDIT_OK')&&(compatibleAudit?report.migrationAudit?.validatorAccepted===true:report.migrationAudit?.validatorRefused===true)
  report.nativeAdmission=report.nativeAdmission&&report.migrationAuditVerified
}
fs.writeFileSync(path.join(out,'serial.log'),stdout,{flag:'wx'});fs.writeFileSync(path.join(out,'stderr.log'),stderr,{flag:'wx'});report.serialSha256=sha(stdout)
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2),{flag:'wx'})
console.log(JSON.stringify(report));console.log(stdout.split(/\r?\n/).filter(line=>/umoci|^v24|^K2_STORAGE|^  (created|architecture|os)/.test(line)).join('\n'))
if(report.exit!==0||!report.nativeAdmission||!report.processStopped||report.timedOut)process.exitCode=1
