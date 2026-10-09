import {test,expect} from '@playwright/test'
import {createHash,createHmac,randomUUID} from 'node:crypto'
import {withConsignmentHandler} from './fixtures/consignment-handler-harness.mjs'

const payload=date=>({consignmentId:randomUUID(),sku:'SYNTHETIC-RETRY',batchCode:'B-RETRY',boxCode:'BOX-RETRY',
  bestBeforeDate:date,expectedQty:1})
const receipt={itemId:'43000000-0000-4000-8000-000000000096'}

for(const [name,date,clock] of [['past lower bound','2026-10-02','2026-10-03'],
  ['receded upper bound','2036-10-03','2026-10-02']]) {
  test(`actual authenticated handler forwards an exact receipt beyond the ${name}`,async()=>{
    await withConsignmentHandler({command:async()=>({data:receipt})},async h=>{
      const body=payload(date),key=randomUUID()
      const first=await h.invoke(body,{key,date:clock}),second=await h.invoke(body,{key,date:clock})
      expect(first.status).toBe(200);expect(second.body).toEqual(first.body)
      expect(h.commandCalls()).toHaveLength(2)
      const [a,b]=h.commandCalls().map(c=>c.body)
      expect(a.p_payload_text).toBe(JSON.stringify(body));expect(b.p_payload_text).toBe(a.p_payload_text)
      expect(b.p_nonce).not.toBe(a.p_nonce);expect(b.p_idempotency_key).toBe(key)
      const hash=createHash('sha256').update(a.p_payload_text).digest('hex')
      expect(a.p_signature).toBe(createHmac('sha256',Buffer.alloc(32,44))
        .update([a.p_action,a.p_timestamp,a.p_nonce,h.actor,key,hash].join('\n')).digest('hex'))
      expect(h.calls.some(c=>c.path.endsWith('/execute_admin_session_command_v1'))).toBe(true)
      expect(first.headers['cache-control']).toBe('no-store')
    })
  })
}

test('fresh signed SQL payload refusal becomes a safe HTTP400',async()=>{
  await withConsignmentHandler({command:async()=>({error:'K2_ADMIN_PAYLOAD_INVALID private diagnostic'})},async h=>{
    const result=await h.invoke(payload('2026-10-03'),{date:'2026-10-03'})
    expect(result.status).toBe(400);expect(result.body).toEqual({error:{code:'REQUEST_INVALID'}})
    expect(h.commandCalls()).toHaveLength(1)
  })
})

test('strict calendar and payload parsing rejects malformed retries before consignment RPC',async()=>{
  await withConsignmentHandler({command:async()=>{throw Error('Unexpected consignment RPC')}},async h=>{
    for(const body of [payload('2028-02-30'),payload('2030/01/01'),payload('0000-01-01'),{...payload('2028-02-29'),expectedQty:0},
      {...payload('2028-02-29'),deferDateWindowToReceipt:true}]) {
      const result=await h.invoke(body,{date:'2026-10-03'})
      expect(result.status).toBe(400);expect(result.body.error.code).toBe('REQUEST_INVALID')
    }
    expect(h.commandCalls()).toHaveLength(0)
  })
})

for(const [name,options,headers,status,code] of [
  ['CSRF',{}, {'x-k2-csrf':'invalid'},403,'CSRF_DENIED'],
  ['origin',{}, {origin:'https://untrusted.example.test'},403,'ORIGIN_DENIED'],
  ['missing cookie',{}, {cookie:''},401,'SESSION_EXPIRED'],
  ['MFA',{aal:'aal1'}, {},401,'MFA_REQUIRED'],
  ['staff role',{role:'Customer'}, {},403,'STAFF_ACCESS_REQUIRED'],
  ['revoked registry',{sessionActive:false}, {},401,'SESSION_REVOKED'],
]) test(`${name} refusal precedes any receiving retry`,async()=>{
  await withConsignmentHandler({...options,command:async()=>{throw Error('Unexpected consignment RPC')}},async h=>{
    const result=await h.invoke(payload('2026-10-02'),{date:'2026-10-03',headers})
    expect(result.status).toBe(status);expect(result.body.error.code).toBe(code)
    expect(h.commandCalls()).toHaveLength(0)
  })
})
