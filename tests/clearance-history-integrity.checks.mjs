import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as witness from '../scripts/rehearse-clearance-concurrency.mjs'

const archive=JSON.parse(fs.readFileSync(new URL('../docs/evidence/20261003-clearance-concurrency/original/clearance-races.json',import.meta.url)))
const actor='42000000-0000-4000-8000-000000000001'
function verify(report) {
  assert.equal(typeof witness.clearanceHistoryIntegrity,'function','exact stock/history acceptance predicate is required')
  return Object.values(witness.clearanceHistoryIntegrity(report,actor)).every(Boolean)
}
test('all four saved real SQL schedules preserve exact physical lots and history',()=>{
  assert.equal(archive.reports.length,4)
  for(const report of archive.reports)assert.equal(verify(report),true)
})
const mutations={
  'physical quantity':r=>{r.after.lots.find(l=>l.id===r.fixture.short).quantity++},
  'ordinary custody':r=>{r.after.lots.find(l=>l.id===r.fixture.lot).custodian='invented'},
  'prior inventory event':r=>{r.after.inventoryEvents.find(e=>e.id===r.before.inventoryEvents[0].id).reason='rewritten'},
  'clearance event actor':r=>{r.after.batchEvents.find(e=>!r.before.batchEvents.some(p=>p.id===e.id)).actor_id='invented'},
  'clearance old image':r=>{r.after.batchEvents.find(e=>!r.before.batchEvents.some(p=>p.id===e.id)).old_data.quantity++},
  'unrelated new inventory event':r=>{r.after.inventoryEvents.push({...r.after.inventoryEvents[0],id:'unexpected'})},
}
for(const [name,mutate] of Object.entries(mutations))test('acceptance refuses changed '+name,()=>{
  const report=structuredClone(archive.reports[0]);mutate(report)
  assert.equal(verify(report),false)
})
