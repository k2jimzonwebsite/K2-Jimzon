import test from 'node:test'
import assert from 'node:assert/strict'
import * as m from '../scripts/rehearse-intake-foundation.mjs'
const policy={name:'read',qual:'staff',check:null,command:'r',permissive:true,roles:['1','2']}
test('policy role OIDs are an unordered membership set',()=>assert.equal(m.equalIntakeCapturedObjects([policy],[{...policy,roles:['2','1']}]),true))
for(const [name,change] of [['removed role',{roles:['1']}],['added role',{roles:['1','2','3']}],['predicate',{qual:'public'}],['mode',{permissive:false}]])test('refuses different '+name,()=>assert.equal(m.equalIntakeCapturedObjects([policy],[{...policy,...change}]),false))
