import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import {createHash,randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'

const entry=fileURLToPath(new URL('../scripts/rehearse-website-stock-locks.mjs',import.meta.url))
const source=fs.readFileSync(entry,'utf8')
// Execute the actual entrypoint initialization only. No SQL/process helpers are loaded.
const boundary=source.indexOf('const beforeFix =')
assert.ok(boundary>0)
const startup=source.slice(0,boundary).replace(/^import .*$/gm,'')
  .replace('const root = fileURLToPath(new URL(\'..\', import.meta.url))','const root = taskRoot')
  .replaceAll('import.meta.url',JSON.stringify(new URL('../scripts/rehearse-website-stock-locks.mjs',import.meta.url).href))

const chain=['--signed-holds','--coupon-lifecycle','--payment-lifecycle','--eligible-lots','--payment-lot-parity','--current-writers']
function fixture(flags) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'k2-archive-safety-'))
  fs.mkdirSync(path.join(root,'scripts'))
  for(const name of ['rehearse-current-payment.mjs','rehearse-payment-lot-parity.mjs','rehearse-eligible-lot-composition.mjs'])
    fs.copyFileSync(fileURLToPath(new URL('../scripts/'+name,import.meta.url)),path.join(root,'scripts',name))
  return {root,execute:()=>vm.runInNewContext(startup,{fs,path,createHash,fileURLToPath,URL,taskRoot:root,process:{argv:['node',entry,...chain,...flags]}}),close:()=>fs.rmSync(root,{recursive:true,force:true})}
}

for(const flags of [[],['--release-eligibility'],['--receiving-parity'],['--release-races','--release-witness-failure']])test('current-chain flag refuses incompatible '+JSON.stringify(flags)+' before writes',()=>{
  const f=fixture([...flags,'--release-current-chain']);try{assert.throws(f.execute,/RELEASE_CURRENT_CHAIN_REQUIRES_CORRECTED_RELEASE/);assert.equal(fs.existsSync(path.join(f.root,'docs')),false)}finally{f.close()}
})
test('current-chain release exclusively claims a fresh bounded archive',()=>{
  const f=fixture(['--release-races','--release-current-chain','--release-run=current-check']);try{f.execute();const p=path.join(f.root,'docs/evidence/20261002-current-release-races/current-check/executed-root.mjs');assert.equal(fs.readFileSync(p,'utf8'),source);assert.throws(f.execute,/REHEARSAL_EVIDENCE_ALREADY_EXISTS/)}finally{f.close()}
})

const releaseSource=fs.readFileSync(new URL('../scripts/rehearse-current-release-concurrency.mjs',import.meta.url),'utf8').replace(/\r/g,'')
const isolationStart=releaseSource.indexOf('const due='),isolationEnd=releaseSource.indexOf('\n        }\n        if(releaseCurrentChain)',isolationStart)
const isolation=releaseSource.slice(isolationStart,isolationEnd).replace(/\n\s*}\s*$/,'')
for(const [label,rows,registered,refuses] of [['empty',[],[],false],['registered nonempty',[{id:'a',sku:'owned'}],['owned'],false],['unregistered nonempty',[{id:'a',sku:'foreign'}],[],true],['mixed ownership',[{id:'a',sku:'owned'},{id:'b',sku:'foreign'}],['owned'],true]])test(label+' expiry isolation validates before any writes',()=>{
  const report={},writes=[];let queries=0
  const run=()=>vm.runInNewContext(isolation,{report,fixtureSkus:new Set(registered),literal:x=>JSON.stringify(x),value:()=>JSON.stringify(rows),sync:sql=>writes.push(sql),check:(_name,passed)=>{if(!passed)throw Error('UNREGISTERED_EXPIRY')}})
  if(refuses){assert.throws(run,/UNREGISTERED/);assert.equal(writes.length,0)}else{run();assert.equal(writes.length,1);for(const row of rows)assert.ok(writes[0].includes(JSON.stringify(row.id)));assert.equal(report.isolatedPriorDue.length,rows.length)}
})
