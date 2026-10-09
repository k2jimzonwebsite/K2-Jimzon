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

for(const flags of [[],['--release-races'],['--release-eligibility']])test('catalog current-chain refuses '+JSON.stringify(flags)+' before writes',()=>{const f=fixture([...flags,'--catalog-current-chain']);try{assert.throws(f.execute,/CATALOG_CURRENT_CHAIN_REQUIRES_CURRENT_RELEASE/);assert.equal(fs.existsSync(path.join(f.root,'docs')),false)}finally{f.close()}})

test('valid catalog mode exclusively archives startup bytes and refuses reuse',()=>{const f=fixture(['--release-races','--release-current-chain','--catalog-current-chain','--release-run=catalog-startup']);try{f.execute();const p=path.join(f.root,'docs/evidence/20261002-current-release-races/catalog-startup/executed-root.mjs');assert.equal(fs.readFileSync(p,'utf8'),source);assert.throws(f.execute,/REHEARSAL_EVIDENCE_ALREADY_EXISTS/)}finally{f.close()}})

for(const flags of [[],['--release-races','--release-current-chain']])test('intake foundation refuses absent catalog prerequisites '+JSON.stringify(flags),()=>{const f=fixture([...flags,'--catalog-intake-foundation']);try{assert.throws(f.execute,/INTAKE_FOUNDATION_REQUIRES_CURRENT_CATALOG/);assert.equal(fs.existsSync(path.join(f.root,'docs')),false)}finally{f.close()}})
test('intake foundation valid startup retains exclusive archive rules',()=>{const f=fixture(['--release-races','--release-current-chain','--catalog-current-chain','--catalog-intake-foundation','--release-run=intake-startup']);try{f.execute();assert.throws(f.execute,/REHEARSAL_EVIDENCE_ALREADY_EXISTS/)}finally{f.close()}})
test('signed intake lifecycle refuses incomplete foundation before filesystem writes',()=>{const f=fixture(['--intake-lifecycle']);try{assert.throws(f.execute,/INTAKE_LIFECYCLE_REQUIRES_FULL_FOUNDATION/);assert.equal(fs.existsSync(path.join(f.root,'docs')),false)}finally{f.close()}})
test('signed intake flight refuses absent native lifecycle before filesystem writes',()=>{const f=fixture(['--release-races','--release-current-chain','--catalog-current-chain','--catalog-intake-foundation','--intake-flight']);try{assert.throws(f.execute,/INTAKE_FLIGHT_REQUIRES_NATIVE_LIFECYCLE/);assert.equal(fs.existsSync(path.join(f.root,'docs')),false)}finally{f.close()}})

test('intake calendar proof refuses missing native flight before filesystem writes',()=>{const f=fixture(['--release-races','--release-current-chain','--catalog-current-chain','--catalog-intake-foundation','--intake-lifecycle','--intake-calendar']);try{assert.throws(f.execute,/INTAKE_CALENDAR_REQUIRES_NATIVE_FLIGHT/);assert.equal(fs.existsSync(path.join(f.root,'docs')),false)}finally{f.close()}})

test('publication proof refuses missing canonical lifecycle before filesystem writes',()=>{const f=fixture(['--intake-publication']);try{assert.throws(f.execute,/INTAKE_PUBLICATION_REQUIRES_NATIVE_LIFECYCLE/);assert.equal(fs.existsSync(path.join(f.root,'docs')),false)}finally{f.close()}})

test('cleanup proof refuses missing canonical lifecycle before filesystem writes',()=>{const f=fixture(['--intake-cleanup']);try{assert.throws(f.execute,/INTAKE_CLEANUP_REQUIRES_NATIVE_LIFECYCLE/);assert.equal(fs.existsSync(path.join(f.root,'docs')),false)}finally{f.close()}})
test('cleanup baseline refuses absent cleanup proof before filesystem writes',()=>{const f=fixture(['--cleanup-null-baseline']);try{assert.throws(f.execute,/CLEANUP_BASELINE_REQUIRES_CLEANUP/);assert.equal(fs.existsSync(path.join(f.root,'docs')),false)}finally{f.close()}})
test('disabled AI proof refuses missing native lifecycle before filesystem writes',()=>{const f=fixture(['--intake-disabled-ai']);try{assert.throws(f.execute,/INTAKE_DISABLED_AI_REQUIRES_NATIVE_LIFECYCLE/);assert.equal(fs.existsSync(path.join(f.root,'docs')),false)}finally{f.close()}})
