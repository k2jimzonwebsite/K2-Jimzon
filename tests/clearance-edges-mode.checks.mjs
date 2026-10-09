import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../scripts/rehearse-website-stock-locks.mjs',import.meta.url),'utf8');
const start=source.indexOf('const beforeClearanceLockFix=');const end=source.indexOf('const receivingPurchase=');
const prefix=source.slice(start,end);
const execute=argv=>vm.runInNewContext(prefix,{process:{argv},currentWriters:true,signedHolds:true,couponLifecycle:true,paymentLifecycle:true,eligibleLots:true,paymentLotParity:true,receivingWriters:false});
test('clearance edge mode refuses without its corrected-chain parent before any SQL',()=>assert.throws(()=>execute(['--clearance-edges']),/CLEARANCE_EDGES_REQUIRES_CORRECTED_CLEARANCE/));
test('clearance edge mode refuses the old-body diagnostic before any SQL',()=>assert.throws(()=>execute(['--clearance-edges','--clearance-recount','--before-clearance-lock-fix']),/CLEARANCE_EDGES_REQUIRES_CORRECTED_CLEARANCE/));
test('corrected clearance edge mode is explicitly selected',()=>{
  const result=vm.runInNewContext(prefix+'\ntypeof clearanceEdges!=="undefined"&&clearanceEdges',{process:{argv:['--clearance-recount','--clearance-edges']},currentWriters:true,signedHolds:true,couponLifecycle:true,paymentLifecycle:true,eligibleLots:true,paymentLotParity:true,receivingWriters:false});assert.equal(result,true);
});
