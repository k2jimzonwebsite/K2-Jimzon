// Exercise the actual finally control path with failed observations; no native mutation.
import fs from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
const source=fs.readFileSync('scripts/rehearse-category-policy-foundation.mjs','utf8')
const start=source.indexOf('finally{')+'finally{'.length,end=source.indexOf('\n report.passed=',start)
assert(start>='finally{'.length&&end>start,'unique final preservation control path is present')
const finalize=new Function('sql','guard','fingerprint','report','check','created','marked','database','uuid','q','process','template',source.slice(start,end))
const uuid='20000000-0000-4000-8000-000000000050',database='k2_category_foundation_'+uuid.replaceAll('-','')
const baseline={metadataSha256:'metadata',rowsSha256:'rows',tables:88}
function observed(absent,unchanged){
 const report={checks:[],templateBefore:baseline},process={exitCode:0}
 const sql=(_db,statement)=>statement.startsWith('select pg_get_userbyid')?'postgres|K2 category foundation:'+uuid+'|0':statement.startsWith('select count(*)')?(absent?'0':'1'):''
 const check=(name,passed)=>{report.checks.push({name,passed:!!passed});if(!passed)throw Error(name)}
 finalize(sql,()=>{},()=>unchanged?baseline:{...baseline,rowsSha256:'drift'},report,check,true,true,database,uuid,value=>"'"+value+"'",process,'k2_current_restore_20260929')
 return {report,exitCode:process.exitCode}
}
test('successful clone absence and template preservation permit terminal success',()=>{
 const result=observed(true,true)
 assert.equal(result.exitCode,0)
 assert.equal(result.report.cloneRemoved,true)
 assert.equal(result.report.templateUnchanged,true)
})
test('a false clone-absence observation forces terminal failure',()=>{
 const result=observed(false,true)
 assert.equal(result.report.cloneRemoved,false)
 assert.equal(result.exitCode,1)
})
test('a false template-preservation observation forces terminal failure',()=>{
 const result=observed(true,false)
 assert.equal(result.report.templateUnchanged,false)
 assert.equal(result.exitCode,1)
})
