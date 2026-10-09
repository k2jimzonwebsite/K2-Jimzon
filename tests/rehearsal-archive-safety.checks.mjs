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
const modes=[['--receiving-parity','receiving','20261002-current-receiving'],['--release-races','release','20261002-current-release-races'],['--release-eligibility','release','20261002-release-lot-parity']]
function fixture(flags) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'k2-archive-safety-'))
  fs.mkdirSync(path.join(root,'scripts'))
  for(const name of ['rehearse-current-payment.mjs','rehearse-payment-lot-parity.mjs','rehearse-eligible-lot-composition.mjs'])
    fs.copyFileSync(fileURLToPath(new URL('../scripts/'+name,import.meta.url)),path.join(root,'scripts',name))
  return {root,execute:()=>vm.runInNewContext(startup,{fs,path,createHash,fileURLToPath,URL,taskRoot:root,process:{argv:['node',entry,...chain,...flags]}}),close:()=>fs.rmSync(root,{recursive:true,force:true})}
}
for(const [mode,selector,base] of modes) {
  test(mode+' occupied archive refuses without replacing any bytes',()=>{
    const f=fixture([mode]);try {
      const dir=path.join(f.root,'docs/evidence',base,'after-fix');fs.mkdirSync(dir,{recursive:true})
      for(const name of ['executed-root.mjs','results.json'])fs.writeFileSync(path.join(dir,name),'frozen-'+name)
      assert.throws(f.execute,/REHEARSAL_EVIDENCE_ALREADY_EXISTS/)
      for(const name of ['executed-root.mjs','results.json'])assert.equal(fs.readFileSync(path.join(dir,name),'utf8'),'frozen-'+name)
    }finally{f.close()}
  })
  test(mode+' fresh named archive stores exact startup bytes and refuses reuse',()=>{
    const f=fixture([mode,'--'+selector+'-run=fresh-01']);try {
      f.execute();const saved=path.join(f.root,'docs/evidence',base,'fresh-01','executed-root.mjs')
      assert.equal(fs.readFileSync(saved,'utf8'),source)
      assert.throws(f.execute,/REHEARSAL_EVIDENCE_ALREADY_EXISTS/);assert.equal(fs.readFileSync(saved,'utf8'),source)
    }finally{f.close()}
  })
  for(const invalid of [['../escape'],[''],['A'],['a'.repeat(81)],['good','other']])
    test(mode+' rejects invalid selector '+JSON.stringify(invalid)+' before writes',()=>{
      const f=fixture([mode,...invalid.map(run=>'--'+selector+'-run='+run)]);try {
        assert.throws(f.execute,/REHEARSAL_EVIDENCE_RUN_INVALID/);assert.equal(fs.existsSync(path.join(f.root,'docs')),false)
      }finally{f.close()}
    })
}
for(const selector of ['receiving','release'])test(selector+' selector refuses unrelated mode before writes',()=>{
  const f=fixture(['--'+selector+'-run=good']);try{assert.throws(f.execute,/REHEARSAL_EVIDENCE_RUN_INVALID/);assert.equal(fs.existsSync(path.join(f.root,'docs')),false)}finally{f.close()}
})
test('incompatible receiving and release modes refuse before writes',()=>{
  const f=fixture(['--receiving-parity','--release-races','--receiving-run=good']);try{assert.throws(f.execute,/RECEIVING_REQUIRES_CORRECTED_CURRENT_CHAIN/);assert.equal(fs.existsSync(path.join(f.root,'docs')),false)}finally{f.close()}
})
