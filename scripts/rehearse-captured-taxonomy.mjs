// MAP-018: scoped owned RAM native test; no provider executor.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
const root='D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const source=path.join(root,'oci-imported02')
const caseName=process.argv.find(a=>a.startsWith('--case='))?.slice(7)
assert.match(caseName||'',/^oci-taxonomy\d{2}$/)
const out=path.join(root,caseName),stage=path.join(out,'staging')
assert.ok(!fs.existsSync(out))
const sha=b=>createHash('sha256').update(b).digest('hex')
const pinned=(file,hash)=>{const bytes=fs.readFileSync(file);assert.equal(sha(bytes),hash);return bytes}
const result=JSON.parse(pinned(path.join(source,'execution01/result.json'),'530fa8ac4d49b72835827c441af8578d5ae24353f74882339656887a66de668f'))
assert.equal(result.exit,0);assert.equal(result.processStopped,true)
const pkg=JSON.parse(fs.readFileSync(path.join(source,'guarded-package.json')))
assert.equal(sha(pkg.sql),'ba15a5d893b8fb188dc1c9180c4bef85ce3f6a69ca867b065622aedf45f7c4ef')
const oldProbe=pinned(path.join(source,'staging/k2/image-probe.sh'),'63b06f69ec4e12178daaa192951a7a8c0fccfe1ab87abb1126a6a896f7482bd6').toString()
let init=pinned(path.join(source,'staging/k2/init.sh'),'40380821b7a2a066d164c1f391c92269516ca38c142e8fc55e29cfbeb6e144c2').toString()
const nativeTest=fs.readFileSync('supabase/tests/captured_taxonomy_access.sql','utf8')
fs.mkdirSync(out);fs.mkdirSync(stage);fs.mkdirSync(path.join(stage,'k2'))
fs.writeFileSync(path.join(stage,'k2/taxonomy-test.sql'),nativeTest,{flag:'wx'})
const psql=(user,file)=>`su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U ${user} -d postgres -v ON_ERROR_STOP=1 -f /tmp/${file}'`
const start=oldProbe.indexOf(psql('supabase_admin','race-catalog.sql'))
assert.ok(start>0)
const probe=oldProbe.slice(0,start)+psql('postgres','race-install.sql')+'\n'
 +psql('supabase_admin','original-row-projection.sql')+' > /tmp/taxonomy-rows-before.json\n'
 +psql('supabase_admin','race-catalog.sql')+' > /tmp/taxonomy-schema-before.json\n'
 +psql('postgres','cold-authority.sql')+'\n'
 +psql('supabase_admin','taxonomy-test.sql')+'\n'
 +psql('supabase_admin','original-row-projection.sql')+' > /tmp/taxonomy-rows-after.json\n'
 +psql('supabase_admin','race-catalog.sql')+' > /tmp/taxonomy-schema-after.json\n'
 +psql('postgres','cold-authority.sql')+'\n'
 +'cmp -s /tmp/taxonomy-rows-before.json /tmp/taxonomy-rows-after.json\n'
 +'cmp -s /tmp/taxonomy-schema-before.json /tmp/taxonomy-schema-after.json\n'
 +'sha256sum /tmp/taxonomy-rows-before.json /tmp/taxonomy-rows-after.json /tmp/taxonomy-schema-before.json /tmp/taxonomy-schema-after.json\n'
 +'echo K2_CAPTURED_TAXONOMY_FULL_CONSERVATION_OK\necho K2_GENUINE_POSTGRES_MODULE_PROBE_OK\n'
fs.writeFileSync(path.join(stage,'k2/image-probe.sh'),probe,{flag:'wx'})
const run='/bin/busybox chroot /k2root /bin/sh /tmp/k2-image-probe.sh'
assert.equal(init.split(run).length,2)
init=init.replace(run,'/bin/busybox cp /k2/taxonomy-test.sql /k2root/tmp/taxonomy-test.sql\n'+run)
fs.writeFileSync(path.join(stage,'k2/init.sh'),init,{flag:'wx'})
const overlay=path.join(out,'taxonomy-overlay.cpio')
const tar=spawnSync('tar.exe',['-cf',overlay,'--format=newc','-C',stage,'k2'],{encoding:'utf8',windowsHide:true})
assert.equal(tar.status,0,tar.stderr)
const fd=fs.openSync(path.join(out,'initramfs.cpio'),'wx')
try {for(const file of [path.join(source,'initramfs.cpio'),overlay]){for await(const b of fs.createReadStream(file)){let at=0;while(at<b.length)at+=fs.writeSync(fd,b,at,b.length-at)}const pad=(4-fs.fstatSync(fd).size%4)%4;if(pad)fs.writeSync(fd,Buffer.alloc(pad))}}finally{fs.closeSync(fd)}
const prep=JSON.parse(fs.readFileSync(path.join(source,'preparation.json')))
prep.scope='Scoped actual native captured-authority taxonomy with rolled-back synthetic Staff/Admin claims; not JWT/BFF or product readiness'
prep.taxonomySqlSha256=sha(nativeTest);prep.probeSha256=sha(probe);prep.initSha256=sha(init)
fs.writeFileSync(path.join(out,'preparation.json'),JSON.stringify(prep,null,2),{flag:'wx'})
fs.copyFileSync(new URL(import.meta.url),path.join(out,'executed-rehearsal.mjs'),fs.constants.COPYFILE_EXCL)
let runner=pinned(path.join(root,'run-oci-envelope12.mjs'),'26e4d5ec612536fe67559f7c0ef1ebe7921e1cc111b51ed7b9e22025b9d9794c').toString().replaceAll('oci-envelope12',caseName)
const flags=/report\.moduleGucs=[\s\S]*?;\r?\nif\(report\.moduleGucs\)\{[\s\S]*?report\.fullCatalogRollback=true;\}/
assert.equal((runner.match(flags)||[]).length,1)
runner=runner.replace(flags,()=>"report.moduleGucs=stdout.includes('K2_CAPTURED_STAFF_TAXONOMY_OK')&&stdout.includes('K2_CAPTURED_ADMIN_TAXONOMY_OK')&&stdout.includes('K2_CAPTURED_TAXONOMY_FULL_CONSERVATION_OK')&&(stdout.match(/K2_COLD_GLOBAL_AND_MANAGED_AUTHORITY_OK/g)||[]).length===2;report.taxonomyConservation=report.moduleGucs;")
runner=runner.replace("scope:'Complete guarded10s envelope/fresh/exact replay/cold archive recovery on actual local postgres target; provider physical/locale/project/host qualification separate'",()=> 'scope:'+JSON.stringify(prep.scope))
const runnerFile=path.join(out,'runner-source.mjs');fs.writeFileSync(runnerFile,runner,{flag:'wx'})
console.log(JSON.stringify({prepared:true,caseName,scope:prep.scope,providerWrites:false}))
await import(pathToFileURL(runnerFile).href)
