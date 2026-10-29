import {test,expect} from '@playwright/test'
import createManifest from '../prepared-api/admin/consignments/create.js'
import {withConsignmentHandler} from './fixtures/consignment-handler-harness.mjs'

test('an existing manifest code is an actionable conflict without private diagnostics',async()=>{
 await withConsignmentHandler({handler:createManifest,command:async()=>({code:'23505',error:'duplicate key value violates unique constraint "consignments_manifest_code_key" private diagnostic'})},async h=>{
  const r=await h.invoke({manifestCode:'K2-2026-10',shipmentReference:''})
  expect(r.status).toBe(409);expect(r.body).toEqual({error:{code:'MANIFEST_CODE_EXISTS'}})
  expect(h.commandCalls()).toHaveLength(1)
 })
})

test('an unrelated uniqueness failure is not mislabeled as a duplicate manifest code',async()=>{
 await withConsignmentHandler({handler:createManifest,command:async()=>({code:'23505',error:'duplicate key value violates unique constraint "other_private_key"'})},async h=>{
  const r=await h.invoke({manifestCode:'K2-NEW',shipmentReference:''})
  expect(r.status).toBe(503);expect(r.body).toEqual({error:{code:'CONSIGNMENT_COMMAND_UNAVAILABLE'}})
 })
})
