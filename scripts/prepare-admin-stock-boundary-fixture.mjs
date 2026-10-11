// MAP-018 / IDEA-20261011-01. Existing guarded composer, owned offline readers.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
const root='D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc',name=process.argv[2]
assert.match(name||'',/^oci-imported\d{2}$/)
const dir=path.join(root,name),sha=b=>createHash('sha256').update(b).digest('hex')
assert.ok(!fs.existsSync(dir),'Fresh owned case required')
const prepared=spawnSync(process.execPath,['scripts/prepare-imported-provider-fixture.mjs','--case='+name,'--product-master-transport','--customer-tariff-transport','--category-policy-transport','--references','--staff-stock'],{windowsHide:true,encoding:'utf8',maxBuffer:1024*1024})
assert.equal(prepared.status,0,prepared.stderr)
const pkg=JSON.parse(fs.readFileSync(path.join(dir,'guarded-package.json')))
assert.equal(sha(pkg.sql),'e6eda8085254f27f0dd30c01f77c3a53bfc4a1652c59ad472a68558079bab052')
const globalCaps=process.argv.includes('--global-caps')
const writerSnapshot=process.argv.includes('--writer-snapshot');assert.ok(!(globalCaps&&writerSnapshot))
const stage=path.join(dir,'staging/k2'),test='tests/sql/admin-stock-boundaries.sql',rows=path.join(root,'oci-imported58/staging/k2/revised-all-rows.sql')
const prior=JSON.parse(fs.readFileSync(path.join(root,'oci-imported58/revised-qualification.json')))
assert.equal(sha(fs.readFileSync(rows)),prior.files['revised-all-rows.sql'])
if(globalCaps||writerSnapshot){
 const setup=fs.readFileSync(test,'utf8'),anchor='do $held$';assert.equal(setup.split(anchor).length,2)
 fs.writeFileSync(path.join(stage,'stock-boundaries.sql'),setup.slice(0,setup.indexOf(anchor))+fs.readFileSync(writerSnapshot?'tests/sql/admin-stock-500lots.sql':'tests/sql/admin-stock-global-caps.sql','utf8'),{flag:'wx'})
}else fs.copyFileSync(test,path.join(stage,'stock-boundaries.sql'),fs.constants.COPYFILE_EXCL)
fs.copyFileSync(rows,path.join(stage,'stock-boundary-rows.sql'),fs.constants.COPYFILE_EXCL)
const command=file=>`su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f /tmp/${file}'`
let probe=fs.readFileSync(path.join(stage,'image-probe.sh'),'utf8')
// Reuse prior concurrent-installer acceptance; retain base/cold recovery.
const raceStart=probe.indexOf(command('race-catalog.sql')),raceEnd=probe.indexOf(command('original-row-projection.sql'),raceStart)
assert.ok(raceStart>0&&raceEnd>raceStart)
probe=probe.slice(0,raceStart)+probe.slice(raceEnd)
const anchor='echo K2_ALL88_COMMITTED_ORIGINAL_PROJECTIONS_OK\n';assert.equal(probe.split(anchor).length,2)
const checks=command('stock-boundary-rows.sql')+' > /tmp/stock-boundary-rows-before.json\n'+command('race-catalog.sql')+' > /tmp/stock-boundary-schema-before.json\n'+command('stock-boundaries.sql')+'\n'+command('stock-boundary-rows.sql')+' > /tmp/stock-boundary-rows-after.json\n'+command('race-catalog.sql')+' > /tmp/stock-boundary-schema-after.json\ncmp -s /tmp/stock-boundary-rows-before.json /tmp/stock-boundary-rows-after.json\ncmp -s /tmp/stock-boundary-schema-before.json /tmp/stock-boundary-schema-after.json\nsha256sum /tmp/stock-boundary-rows-*.json /tmp/stock-boundary-schema-*.json\necho K2_ADMIN_STOCK_BOUNDARY_CONSERVATION_OK\n'
probe=probe.replace(anchor,()=>anchor+checks)
const writerFiles={'stock-writer-setup.sql':'tests/sql/admin-stock-writer-snapshot.sql','stock-writer-cleanup.sql':'tests/sql/admin-stock-writer-cleanup.sql','stock-writer-snapshot.sh':'tests/native/admin-stock-writer-snapshot.sh'}
if(writerSnapshot){
 for(const [file,source] of Object.entries(writerFiles))fs.copyFileSync(source,path.join(stage,file),fs.constants.COPYFILE_EXCL)
 const boundary=command('stock-boundaries.sql')+'\n';assert.equal(probe.split(boundary).length,2)
 probe=probe.replace(boundary,()=>boundary+'/bin/sh /tmp/stock-writer-snapshot.sh\n')
}
fs.writeFileSync(path.join(stage,'image-probe.sh'),probe)
let init=fs.readFileSync(path.join(stage,'init.sh'),'utf8'),entry='/bin/busybox chroot /k2root /bin/sh /tmp/k2-image-probe.sh'
assert.equal(init.split(entry).length,2)
init=init.replace(entry,()=>['stock-boundaries.sql','stock-boundary-rows.sql',...(writerSnapshot?Object.keys(writerFiles):[])].map(f=>'/bin/busybox cp /k2/'+f+' /k2root/tmp/'+f).join('\n')+'\n'+entry)
fs.writeFileSync(path.join(stage,'init.sh'),init)
const overlayStage=path.join(dir,'stock-boundary-overlay-staging'),overlay=path.join(dir,'stock-boundary-overlay.cpio')
fs.mkdirSync(path.join(overlayStage,'k2'),{recursive:true})
const files=['stock-boundaries.sql','stock-boundary-rows.sql','image-probe.sh','init.sh',...(writerSnapshot?Object.keys(writerFiles):[])]
for(const f of files)fs.copyFileSync(path.join(stage,f),path.join(overlayStage,'k2',f),fs.constants.COPYFILE_EXCL)
const tar=spawnSync('tar.exe',['-cf',overlay,'--format=newc','-C',overlayStage,'k2'],{windowsHide:true,encoding:'utf8'});assert.equal(tar.status,0,tar.stderr)
const initramfs=path.join(dir,'initramfs.cpio'),prefixSha256=sha(fs.readFileSync(initramfs));fs.appendFileSync(initramfs,fs.readFileSync(overlay))
const runnerFile=path.join(root,'run-'+name+'.mjs');let runner=fs.readFileSync(runnerFile,'utf8')
const old="stdout.includes('K2_PROTECTED_CONCURRENT_DRIFT_REFUSED_AND_RECOVERED')";assert.equal(runner.split(old).length,2)
runner=runner.replace(old,"stdout.includes('K2_ADMIN_STOCK_BOUNDARY_CHECKS_OK')&&stdout.includes('K2_ADMIN_STOCK_BOUNDARY_CONSERVATION_OK')"+(globalCaps?"&&stdout.includes('K2_ADMIN_STOCK_GLOBAL_CAPS_OK')":"")+(writerSnapshot?"&&stdout.includes('K2_ADMIN_STOCK_WRITER_SNAPSHOT_OK')&&stdout.includes('K2_ADMIN_STOCK_GLOBAL500_ADMITTED_OK')":""))
fs.writeFileSync(runnerFile,runner)
const record={owningMap:'MAP-018',idea:'IDEA-20261011-01',case:name,providerWrites:false,sqlSha256:sha(pkg.sql),physicalSelection:prior.physicalSelection,prefixSha256,overlaySha256:sha(fs.readFileSync(overlay)),initramfsSha256:sha(fs.readFileSync(initramfs)),runnerSha256:sha(runner),sources:[test,'scripts/prepare-admin-stock-boundary-fixture.mjs'].map(file=>({file,sha256:sha(fs.readFileSync(file))})),files:files.map(file=>({file,sha256:sha(fs.readFileSync(path.join(stage,file)))})),scope:'Synthetic rollback-only current Staff/SuperAdmin/Customer reader admission, held physical stock, evidence-based clearance/quarantine, taxonomy Unknown and per-SKU lot cap; not genuine Auth or canonical writer qualification'}
if(globalCaps){record.globalCaps=true;record.sources.push({file:'tests/sql/admin-stock-global-caps.sql',sha256:sha(fs.readFileSync('tests/sql/admin-stock-global-caps.sql'))});record.scope='Owned synthetic global501lots refusal, exact1000reservation/order identities and linkage,1001reservation refusal, independent501product refusal and exact500product completeness; shared setup and full physical/schema/cold recovery retained. Orders derive from reservations; no isolated order overflow or canonical writer acceptance.'}
if(writerSnapshot){record.writerSnapshot=true;record.sources.push(...['tests/sql/admin-stock-500lots.sql',...Object.values(writerFiles)].map(file=>({file,sha256:sha(fs.readFileSync(file))})));record.scope='Exact global500lot admitted IDs plus actual signed canonical lots_reconcile held in independent transaction with three observed row-exclusive resources: old complete lot/hold/order and stock reads while held, old after rollback and new after commit. Synthetic committed setup/cleanup owner replica only; unchanged signed writer and readers origin. Full151 physical/schema and cold recovery retained. No provider or general mid-statement writer schedule claim.'}
fs.writeFileSync(path.join(dir,'stock-boundary-preparation.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'})
fs.copyFileSync('scripts/prepare-admin-stock-boundary-fixture.mjs',path.join(dir,'stock-boundary-preparer-source.mjs'),fs.constants.COPYFILE_EXCL)
console.log(JSON.stringify({case:name,prepared:true,providerWrites:false,physical:record.physicalSelection.length}))
