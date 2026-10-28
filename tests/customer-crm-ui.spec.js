import { test, expect } from '@playwright/test'

const actor = '11000000-0000-4000-8000-000000000001'
const requestId = '61000000-0000-4000-8000-000000000001'
const holdId = '71000000-0000-4000-8000-000000000001'
const fixtureRequest = { id: requestId, customerId: '21000000-0000-4000-8000-000000000001', customerName: 'Synthetic Buyer', state: 'held', createdAt: '2026-10-26T00:00:00Z', verifiedAt: '2026-10-26T00:00:00Z', reasons: ['open_order_or_payment'], assignedTo: actor, holds: [{ id: holdId, kind: 'legal', reason: 'Review in progress' }] }

for (const width of [375,1440]) test(`hold outcomes show current facts and recovery without a false saved notice at ${width}px`,async({page},testInfo)=>{
 test.setTimeout(30000)
 await page.setViewportSize({width,height:900})
 await page.route('https://fixture.supabase.co/**',route=>route.abort())
 await page.route('**/api/admin/customers',route=>route.fulfill({json:{ok:true,data:{mode:'canonical',metricsAvailable:true,customers:[]}}}))
 await page.route('**/api/admin/wholesale-inquiries',route=>route.fulfill({json:{ok:true,data:{inquiries:[]}}}))
 let outcome='PRIVACY_HOLD_ALREADY_RESOLVED',wrongSuccess=false
 await page.route('**/api/admin/customer-privacy**',route=>route.request().method()==='GET'
  ?route.fulfill({json:{ok:true,actorId:actor,requests:[fixtureRequest],nextCursor:null}})
  :wrongSuccess?route.fulfill({json:{ok:true,result:{requestId,action:'add_hold',holdId,currentState:'resolved',checkedAt:'2026-10-28T00:00:00Z',updatedAt:'2026-10-28T00:00:00Z'}}})
  :route.fulfill({status:409,json:{error:{code:outcome}}}))
 await page.goto('/tests/fixtures/customer-crm-harness.html')
 await page.getByRole('tab',{name:'Privacy requests'}).click()
 await page.getByRole('button',{name:'Review request'}).click()
 await page.getByRole('combobox',{name:'Action',exact:true}).first().selectOption('add_hold')
 await page.getByRole('textbox',{name:'Reason',exact:true}).first().fill('Original hold review')
 for(const [code,message] of [
  ['PRIVACY_HOLD_ALREADY_RESOLVED','This saved hold was later resolved. Refresh the request to review its current state.'],
  ['PRIVACY_PROCESSING_STARTED','Closure processing has started. This hold was not added. Refresh the request to review its outcome.'],
  ['PRIVACY_HOLD_RECONCILIATION_REQUIRED','This hold needs reconciliation before it can be changed. Keep its recorded details and leave closure processing disabled.'],
 ]){
  outcome=code;await page.getByRole('button',{name:'Add hold',exact:true}).first().click()
  await expect(page.getByText(message,{exact:true})).toBeVisible()
  await expect(page.getByText('Hold recorded.',{exact:true})).toHaveCount(0)
 }
 await expect(page.getByRole('textbox',{name:'Reason',exact:true}).first()).toHaveValue('Original hold review')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:testInfo.outputPath(`hold-reconciliation-${width}.png`),fullPage:true})
 wrongSuccess=true;await page.getByRole('button',{name:'Add hold',exact:true}).first().click()
 await expect(page.getByRole('button',{name:'Retry saved action',exact:true})).toBeVisible()
 await expect(page.getByText('Hold recorded.',{exact:true})).toHaveCount(0)
})

test('directory search and privacy hold review preserve a lost response retry', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 900 })
  const writes = []
  await page.route('https://fixture.supabase.co/**', route => route.abort())
  await page.route('**/api/admin/customers', route => route.fulfill({ json: { ok: true, data: { mode: 'canonical', metricsAvailable: true, customers: [{ id: 'a', displayName: 'Synthetic Buyer', status: 'active', createdSource: 'website_guest', createdAt: '2026-10-26', account: { linked: true }, contacts: [{ kind: 'email', value: 'buyer@example.test', verificationStatus: 'verified', source: 'website_account' }], channels: [], metrics: { orderCount: 1, pasabuyCount: 0, conversationCount: 0, unreadCount: 0 } }, { id: 'b', displayName: 'Other Guest', status: 'active', createdSource: 'website_guest', createdAt: '2026-10-25', account: { linked: false }, contacts: [], channels: [], metrics: { orderCount: 0, pasabuyCount: 0, conversationCount: 0, unreadCount: 0 } }] } } }))
  await page.route('**/api/admin/wholesale-inquiries', route => route.fulfill({ json: { ok: true, data: { inquiries: [] } } }))
  await page.route('**/api/admin/customer-privacy**', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { ok: true, actorId: actor, requests: [fixtureRequest], nextCursor: null } })
    writes.push({ payload: route.request().postDataJSON(), key: route.request().headers()['x-k2-idempotency-key'], actor: route.request().headers()['x-k2-actor-id'] })
    if (writes.length === 1) return route.abort()
    if (writes.length === 2) return route.fulfill({status:503,json:{error:{code:'PRIVACY_AUTHORITY_UNAVAILABLE'}}})
    return route.fulfill({ json: { ok: true, result: { requestId, action: 'resolve_hold', assignedTo: actor, holdId, currentState:'resolved',checkedAt: '2026-10-27T00:00:00Z' } } })
  })
  await page.goto('/tests/fixtures/customer-crm-harness.html')
  await expect(page.getByRole('heading', { name: 'Identity directory' })).toBeVisible()
  await page.getByLabel('Search loaded customers').fill('buyer@example')
  await expect(page.getByText('Other Guest')).not.toBeVisible()
  await page.getByText('Contact and source details').first().click()
  await expect(page.getByText(/verified · website account/).first()).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('directory-375.png'), fullPage: true })
  await page.getByRole('tab', { name: 'Privacy requests' }).click()
  await page.getByRole('button', { name: 'Review request' }).click()
  await expect(page.getByRole('heading', { name: 'Review Synthetic Buyer' })).toBeFocused()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Review request' })).toBeFocused()
  await page.getByRole('button', { name: 'Review request' }).click()
  await page.getByLabel('Action').selectOption('resolve_hold')
  await page.getByLabel('Hold to resolve').selectOption(holdId)
  await page.getByLabel('Reason').fill('Legal review finished')
  await expect(page.getByText(/may allow the verified closure to resume automatically/)).toBeVisible()
  await page.getByRole('button', { name: 'Resolve this hold' }).click()
  await expect(page.getByRole('button', { name: 'Retry saved action' })).toBeVisible()
  await page.getByRole('button', { name: 'Retry saved action' }).click()
  await expect(page.getByRole('button', { name: 'Retry saved action' })).toBeVisible()
  await expect(page.getByLabel('Reason').first()).toBeDisabled()
  await expect(page.getByLabel('Reason').first()).toHaveValue('Legal review finished')
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`privacy-review-${width}.png`), fullPage: true })
  }
  await page.getByRole('button', { name: 'Retry saved action' }).click()
  await expect(page.getByText(/Hold resolved. Any other holds still apply/)).toBeVisible()
  expect(writes).toHaveLength(3)
  expect(writes[1]).toEqual(writes[0])
  expect(writes[2]).toEqual(writes[0])
  expect(writes[0].actor).toBe(actor)
})

test('a failed directory read is unavailable rather than an empty result', async ({ page }) => {
  await page.route('https://fixture.supabase.co/**', route => route.abort())
  await page.route('**/api/admin/customers', route => route.fulfill({ status: 503, json: { error: { code: 'CUSTOMERS_UNAVAILABLE' } } }))
  await page.route('**/api/admin/wholesale-inquiries', route => route.fulfill({ json: { ok: true, data: { inquiries: [] } } }))
  await page.route('**/api/admin/customer-privacy**', route => route.fulfill({ json: { ok: true, actorId: actor, requests: [], nextCursor: null } }))
  await page.goto('/tests/fixtures/customer-crm-harness.html')
  await expect(page.getByText('Customer records are unavailable. Use Refresh to try again.')).toBeVisible()
  await expect(page.getByText('No customer identities yet')).toHaveCount(0)
})

test('Admin can reconcile a lost reply in read-only closed history after reload', async ({ page }, testInfo) => {
  let closed = false
  await page.route('https://fixture.supabase.co/**', route => route.abort())
  await page.route('**/api/admin/customers', route => route.fulfill({ json: { ok: true, data: { mode: 'canonical', metricsAvailable: true, customers: [] } } }))
  await page.route('**/api/admin/wholesale-inquiries', route => route.fulfill({ json: { ok: true, data: { inquiries: [] } } }))
  await page.route('**/api/admin/customer-privacy**', route => {
    if (route.request().method() === 'POST') { closed = true; return route.abort() }
    const scope = new URL(route.request().url()).searchParams.get('scope')
    const history = { ...fixtureRequest, customerName: 'Closed customer', state: 'closed', providerState: 'pending', reasons: [], holds: [], recentActions: [{ action: 'resolve_hold', actorId: actor, holdId, reason: 'Legal review finished', createdAt: '2026-10-27T00:00:00Z' }] }
    return route.fulfill({ json: { ok: true, actorId: actor, requests: scope === 'history' && closed ? [history] : scope === 'current' && !closed ? [fixtureRequest] : [], nextCursor: null } })
  })
  await page.goto('/tests/fixtures/customer-crm-harness.html')
  await page.getByRole('tab', { name: 'Privacy requests' }).click()
  await page.getByRole('button', { name: 'Review request' }).click()
  await page.getByLabel('Action').selectOption('resolve_hold')
  await page.getByLabel('Hold to resolve').selectOption(holdId)
  await page.getByLabel('Reason').fill('Legal review finished')
  await page.getByRole('button', { name: 'Resolve this hold' }).click()
  await expect(page.getByRole('button', { name: 'Retry saved action' })).toBeVisible()
  page.once('dialog', dialog => dialog.accept())
  await page.reload()
  await page.getByRole('tab', { name: 'Privacy requests' }).click()
  await page.getByRole('button', { name: 'Recent outcomes' }).click()
  await expect(page.getByText('Sign-in cleanup: pending', { exact: false })).toBeVisible()
  await page.getByText('Recent review actions').click()
  await expect(page.getByText(/Legal review finished/)).toBeVisible()
  for (const width of [375, 1440]) { await page.setViewportSize({width,height:900}); await page.screenshot({path:testInfo.outputPath(`outcomes-${width}.png`),fullPage:true}) }
  await expect(page.getByRole('button', { name: 'Review request' })).toHaveCount(0)
})

test('customer hold reconciliation refusal preserves details without a false recorded notice', async ({ page }, testInfo) => {
  const customerId='21000000-0000-4000-8000-000000000001'; const writes=[]
  await page.route('https://fixture.supabase.co/**', route => route.abort())
  await page.route('**/api/admin/customers', route => route.fulfill({ json: { ok: true, data: { mode:'canonical', metricsAvailable:true, customers:[{ id:customerId, displayName:'Synthetic Buyer', status:'active', createdSource:'website_guest', createdAt:'2026-10-26', account:{linked:false}, contacts:[], channels:[], metrics:{orderCount:0,pasabuyCount:0,conversationCount:0,unreadCount:0} }] } } }))
  await page.route('**/api/admin/wholesale-inquiries', route => route.fulfill({ json: { ok: true, data: { inquiries: [] } } }))
  await page.route('**/api/admin/customer-privacy**', route => {
    if(route.request().method()==='POST') { const payload=route.request().postDataJSON();writes.push(payload);return route.fulfill({status:409,json:{error:{code:'PRIVACY_HOLD_RECONCILIATION_REQUIRED'}}}) }
    return route.fulfill({json:{ok:true,actorId:actor,requests:[],customerHolds:[],nextCursor:null}})
  })
  await page.goto('/tests/fixtures/customer-crm-harness.html')
  await page.getByRole('tab', {name:'Privacy requests'}).click()
  await page.getByRole('combobox', {name:'Customer',exact:true}).selectOption(customerId)
  await page.getByLabel('Hold type').selectOption('security')
  await page.getByLabel('Reason').fill('Security investigation underway')
  for (const width of [375, 1440]) { await page.setViewportSize({width,height:900}); await page.screenshot({path:testInfo.outputPath(`customer-hold-${width}.png`),fullPage:true}) }
  await page.getByRole('button', {name:'Add hold'}).click()
  await expect(page.getByText('This hold needs reconciliation before it can be changed. Keep its recorded details and leave closure processing disabled.')).toBeVisible()
  await expect(page.getByText('Customer hold recorded.')).toHaveCount(0)
  await expect(page.getByLabel('Reason')).toHaveValue('Security investigation underway')
  expect(writes).toEqual([{customerId,action:'add_customer_hold',reason:'Security investigation underway',kind:'security'}])
})

test('customer-only hold creation and resolution use checked current results and retain an outage retry',async({page},testInfo)=>{
 const customerId='21000000-0000-4000-8000-000000000001',writes=[]
 await page.route('https://fixture.supabase.co/**',route=>route.abort())
 await page.route('**/api/admin/customers',route=>route.fulfill({json:{ok:true,data:{mode:'canonical',metricsAvailable:true,customers:[{id:customerId,displayName:'Guest before signup',status:'active',createdSource:'website_guest',createdAt:'2026-10-28',account:{linked:false},contacts:[],channels:[],metrics:{orderCount:0,pasabuyCount:0,conversationCount:0,unreadCount:0}}]}}}))
 await page.route('**/api/admin/wholesale-inquiries',route=>route.fulfill({json:{ok:true,data:{inquiries:[]}}}))
 let active=false,activeActor=actor
 await page.route('**/api/admin/customer-privacy**',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{ok:true,actorId:activeActor,requests:[],customerHolds:active?[{id:holdId,kind:'legal',reason:'Pre-request review'}]:[],nextCursor:null}})
  const payload=route.request().postDataJSON();writes.push({payload,key:route.request().headers()['x-k2-idempotency-key'],actor:route.request().headers()['x-k2-actor-id']})
  if(writes.length===1){active=true;return route.abort()}
  if(writes.length===2)return route.fulfill({status:503,json:{error:{code:'PRIVACY_AUTHORITY_UNAVAILABLE'}}})
  if(writes.at(-1).actor!==activeActor)return route.fulfill({status:403,json:{error:{code:'PRIVACY_ACTOR_CHANGED'}}})
  if(writes.at(-1).key===writes[0].key&&writes.at(-1).actor!==writes[0].actor)return route.fulfill({status:409,json:{error:{code:'IDEMPOTENCY_CONFLICT'}}})
  if(payload.action==='resolve_customer_hold')active=false
  return route.fulfill({json:{ok:true,result:{customerId,action:payload.action,holdId,currentState:active?'projected':'resolved',checkedAt:'2026-10-28T00:00:00Z'}}})
 })
 await page.goto('/tests/fixtures/customer-crm-harness.html')
 await page.getByRole('tab',{name:'Privacy requests'}).click()
 await page.getByRole('combobox',{name:'Customer',exact:true}).selectOption(customerId)
 await page.getByRole('textbox',{name:'Reason',exact:true}).fill('Pre-request review')
 await page.getByRole('button',{name:'Add hold',exact:true}).click()
 for(let attempt=0;attempt<1;attempt++){
  await expect(page.getByRole('button',{name:'Retry saved action',exact:true})).toBeVisible()
  await expect(page.getByRole('textbox',{name:'Reason',exact:true})).toBeDisabled()
  await page.getByRole('button',{name:'Retry saved action',exact:true}).click()
 }
 activeActor='11000000-0000-4000-8000-000000000002'
 let actorRead=page.waitForResponse(response=>response.request().method()==='GET'&&response.url().includes('scope=customer'))
 await page.getByRole('button',{name:'Refresh requests',exact:true}).click();await actorRead
 await page.getByRole('button',{name:'Retry saved action',exact:true}).click()
 await expect(page.getByRole('button',{name:'Retry saved action',exact:true})).toBeVisible()
 await expect(page.getByRole('textbox',{name:'Reason',exact:true})).toBeDisabled()
 activeActor=actor
 actorRead=page.waitForResponse(response=>response.request().method()==='GET'&&response.url().includes('scope=customer'))
 await page.getByRole('button',{name:'Refresh requests',exact:true}).click();await actorRead
 await page.getByRole('button',{name:'Retry saved action',exact:true}).click()
 await expect(page.getByText('Customer hold recorded.',{exact:true})).toBeVisible()
 expect(writes).toHaveLength(4);for(const write of writes)expect(write).toEqual(writes[0])
 await page.getByRole('combobox',{name:'Action',exact:true}).selectOption('resolve_customer_hold')
 await page.getByRole('combobox',{name:'Hold to resolve',exact:true}).selectOption(holdId)
 await page.getByRole('textbox',{name:'Reason',exact:true}).fill('Review resolved')
 await page.getByRole('button',{name:'Resolve this hold',exact:true}).click()
 await expect(page.getByText('Customer hold resolved.',{exact:true})).toBeVisible()
 for(const width of [375,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath(`customer-scope-${width}.png`),fullPage:true})}
})

test('customer hold reads retry and ignore late results for an earlier selection', async ({ page }) => {
  const one='21000000-0000-4000-8000-000000000001', two='21000000-0000-4000-8000-000000000002'
  let readsOne=0, releaseOld, startedOld
  const started = new Promise(resolve => { startedOld=resolve })
  const old = new Promise(resolve => { releaseOld=resolve })
  await page.route('https://fixture.supabase.co/**', route => route.abort())
  await page.route('**/api/admin/customers', route => route.fulfill({json:{ok:true,data:{mode:'canonical',metricsAvailable:true,customers:[one,two].map((id,i)=>({id,displayName:`Buyer ${i+1}`,status:'active',createdSource:'website_guest',createdAt:'2026-10-26',account:{linked:false},contacts:[],channels:[],metrics:{orderCount:0,pasabuyCount:0,conversationCount:0,unreadCount:0}}))}}}))
  await page.route('**/api/admin/wholesale-inquiries', route => route.fulfill({json:{ok:true,data:{inquiries:[]}}}))
  await page.route('**/api/admin/customer-privacy**', async route => {
    const url=new URL(route.request().url()); const id=url.searchParams.get('customerId')
    if(url.searchParams.get('scope')!=='customer') return route.fulfill({json:{ok:true,actorId:actor,requests:[],nextCursor:null}})
    if(id===one && ++readsOne===1) return route.fulfill({status:403,json:{error:{code:'PRIVACY_READ_UNAVAILABLE'}}})
    if(id===one && readsOne===2) return route.fulfill({json:{ok:true,actorId:actor,customerHolds:[],requests:[],nextCursor:null}})
    if(id===one) { startedOld(); await old; return route.fulfill({json:{ok:true,actorId:actor,customerHolds:[{id:holdId,kind:'legal',reason:'Old customer hold'}],requests:[],nextCursor:null}}) }
    return route.fulfill({json:{ok:true,actorId:actor,customerHolds:[{id:holdId,kind:'security',reason:'Current customer hold'}],requests:[],nextCursor:null}})
  })
  await page.goto('/tests/fixtures/customer-crm-harness.html')
  await page.getByRole('tab',{name:'Privacy requests'}).click()
  const customer=page.getByRole('combobox',{name:'Customer',exact:true})
  await customer.selectOption(one)
  await page.getByRole('button',{name:'Retry loading holds'}).click()
  await expect(page.getByText('No explicit holds recorded for this customer.')).toBeVisible()
  await customer.selectOption(two)
  await expect(page.getByText('security: Current customer hold')).toBeVisible()
  await customer.selectOption(one); await started
  await customer.selectOption(two)
  await expect(page.getByText('security: Current customer hold')).toBeVisible()
  releaseOld()
  await expect(page.getByText('legal: Old customer hold')).toHaveCount(0)
  await expect(page.getByText('security: Current customer hold')).toBeVisible()
})

test('a delayed outcome response cannot overwrite the current privacy queue', async ({ page }) => {
  let releaseHistory, signalHistory
  const historyStarted = new Promise(resolve => { signalHistory = resolve })
  const waitHistory = new Promise(resolve => { releaseHistory = resolve })
  await page.route('https://fixture.supabase.co/**', route => route.abort())
  await page.route('**/api/admin/customers', route => route.fulfill({json:{ok:true,data:{mode:'canonical',metricsAvailable:true,customers:[]}}}))
  await page.route('**/api/admin/wholesale-inquiries', route => route.fulfill({json:{ok:true,data:{inquiries:[]}}}))
  await page.route('**/api/admin/customer-privacy**', async route => {
    const scope=new URL(route.request().url()).searchParams.get('scope')
    if(scope==='history') {
      signalHistory(); await waitHistory
      return route.fulfill({json:{ok:true,actorId:actor,requests:[{...fixtureRequest,customerName:'Stale closed record',state:'closed',providerState:'complete'}],nextCursor:null}})
    }
    return route.fulfill({json:{ok:true,actorId:actor,requests:[fixtureRequest],nextCursor:null}})
  })
  await page.goto('/tests/fixtures/customer-crm-harness.html')
  await page.getByRole('tab',{name:'Privacy requests'}).click()
  await expect(page.getByRole('heading',{name:'Synthetic Buyer'})).toBeVisible()
  await page.getByRole('button',{name:'Recent outcomes'}).click(); await historyStarted
  await page.getByRole('button',{name:'Requests needing review'}).click()
  await expect(page.getByRole('heading',{name:'Synthetic Buyer'})).toBeVisible()
  releaseHistory()
  await expect(page.getByRole('heading',{name:'Stale closed record'})).toHaveCount(0)
  await expect(page.getByRole('heading',{name:'Synthetic Buyer'})).toBeVisible()
})
