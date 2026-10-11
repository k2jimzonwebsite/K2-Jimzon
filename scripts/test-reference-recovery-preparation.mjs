// MAP-018: preparation assertions are separate from actual native execution.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const root='D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const name=process.argv[2];assert.match(name||'',/^oci-imported\d{2}$/)
const dir=path.join(root,name),record=JSON.parse(fs.readFileSync(path.join(dir,'revised-qualification.json')))
const sha=b=>createHash('sha256').update(b).digest('hex')
assert.equal(record.pkgSqlSha256,'e051cd65f6b9b070c70754b61ef521a772bc2bad46c211e918081e23b945457f','Reference recovery must use the complete accepted reference installer')
assert.equal(record.installedSchemaSha256,'afa55d67f2a423a47a74c9a2afa3602f2a4a37e0499a888f58ac8ecf94297667')
assert.equal(record.providerWrites,false);assert.equal(record.nativeVerified,false)
assert.equal(record.populatedReferenceFixture,true,'Signed reference events and receipts must be present for conservation')
assert.equal(record.physicalSelection.length,151)
for(const name of ['k2_private.reference_events','k2_private.reference_command_context','public.brands','public.categories'])assert.ok(record.physicalSelection.includes(name),name)
for(const pin of Object.entries(record.files))assert.equal(sha(fs.readFileSync(path.join(dir,'staging/k2',pin[0]))),pin[1],pin[0])
const labels=record.controls.map(c=>c.name)
for(const label of ['interruption','reference-body-drift','reference-authority-drift','reference-acl-drift','reference-owner-drift','reference-settings-drift','reference-brand-index-drift','reference-category-index-drift','reference-category-entry-trigger-drift','reference-brand-insert-trigger-drift','reference-category-insert-trigger-drift','reference-events-rls-drift','reference-context-acl-drift','reference-verifier-body-drift'])assert.ok(labels.includes(label),label)
for(const control of record.controls){
 const sql=fs.readFileSync(path.join(dir,'staging/k2/revised-'+control.name+'.sql'),'utf8')
 assert.ok(sql.includes('OWNED_RAM_RECOVERY_REQUIRED'));assert.ok(sql.includes('\\i /tmp/revised-install-body.sql'))
 if(control.name.endsWith('body-drift'))assert.match(sql,/\$function\$;\s*\n\\i /,'Function replacement must finish before the installer include')
}
const runner=fs.readFileSync(path.join(root,'run-'+name+'.mjs'),'utf8')
const probe=fs.readFileSync(path.join(dir,'staging/k2/image-probe.sh'),'utf8')
assert.ok(probe.includes('df -k /tmp || echo K2_REFERENCE_DF_UNAVAILABLE'),'Optional capacity observation must not stop qualification')
for(const control of record.controls){
 const hashAt=probe.indexOf('sha256sum /tmp/revised-'+control.name+'-schema-before.json')
 const cleanupAt=probe.indexOf('rm -f /tmp/revised-'+control.name+'-schema-before.json')
 const logAt=probe.indexOf('echo K2_REFERENCE_SERVER_LOG_RETIRE_'+control.name.replaceAll('-','_').toUpperCase())
 assert.ok(logAt>hashAt&&logAt<cleanupAt,'Retire the owned server log only after verified conservation and evidence transfer')
 assert.ok(probe.slice(logAt,cleanupAt).includes('sha256sum /tmp/k2-managed-postgres.log\nwc -c < /tmp/k2-managed-postgres.log\n: > /tmp/k2-managed-postgres.log\n[ ! -s /tmp/k2-managed-postgres.log ]'),'Record server log digest/size before in-place retirement and verify it')
 const markerAt=probe.indexOf('echo K2_REVISED_'+control.name.replaceAll('-','_').toUpperCase()+'_FULL_RECOVERY_OK')
 assert.ok(hashAt>=0&&cleanupAt>hashAt&&markerAt>cleanupAt,'Retire only verified and hashed native snapshots to bound fixture space')
}
for(const marker of ['K2_REFERENCE_RECOVERY_POPULATED_OK','K2_REFERENCE_RECOVERY_POPULATED_REPLAY_CONSERVED'])assert.ok(runner.includes(marker),marker)
for(const control of record.controls)assert.ok(runner.includes('K2_REVISED_'+control.name.replaceAll('-','_').toUpperCase()+'_FULL_RECOVERY_OK'))
console.log(JSON.stringify({preparedChecksPassed:true,controls:record.controls.length,physicalSelection:151,providerWrites:false,nativeVerified:false}))
