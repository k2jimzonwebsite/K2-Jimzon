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
const flags=['--signed-holds','--coupon-lifecycle','--payment-lifecycle','--eligible-lots',
  '--payment-lot-parity','--current-writers','--receiving-purchase']
function fixture(run) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'k2-purchase-evidence-'))
  fs.mkdirSync(path.join(root,'scripts'))
  for(const name of ['rehearse-current-payment.mjs','rehearse-payment-lot-parity.mjs','rehearse-eligible-lot-composition.mjs'])
    fs.copyFileSync(fileURLToPath(new URL('../scripts/'+name,import.meta.url)),path.join(root,'scripts',name))
  const execute=()=>vm.runInNewContext(startup,{fs,path,createHash,fileURLToPath,URL,
    taskRoot:root,process:{argv:['node',entry,...flags,...(run?[`--purchase-run=${run}`]:[])]}})
  return {root,execute,close:()=>fs.rmSync(root,{recursive:true,force:true})}
}
test('an occupied original archive refuses before replacing executed source',()=>{
  const f=fixture()
  try {
    const dir=path.join(f.root,'docs/evidence/20261003-receiving-purchase/original')
    fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'executed-root.mjs'),'frozen')
    assert.throws(f.execute,/PURCHASE_EVIDENCE_ALREADY_EXISTS/)
    assert.equal(fs.readFileSync(path.join(dir,'executed-root.mjs'),'utf8'),'frozen')
  }finally{f.close()}
})
test('a fresh named run archives the startup bytes in its own destination',()=>{
  const run='acceptance-'+randomUUID(),f=fixture(run)
  try {
    f.execute()
    assert.equal(fs.readFileSync(path.join(f.root,'docs/evidence/20261003-receiving-purchase',run,'executed-root.mjs'),'utf8'),source)
  }finally{f.close()}
})
test('a run destination cannot escape the purchase evidence directory',()=>{
  const f=fixture('../escape')
  try{assert.throws(f.execute,/PURCHASE_EVIDENCE_RUN_INVALID/)}finally{f.close()}
})
