// MAP-018 / IDEA-20261010-08. Disposable native witness, no product writer.
import assert from 'node:assert/strict'
import { preparePopulatedMatrix } from './populated-matrix.mjs'

export function prepareResumptionProbe(input) {
  const matrix = preparePopulatedMatrix(input)
  const replace = (s, a, b) => { assert.equal(s.split(a).length, 2, 'single anchor:' + a.slice(0, 80)); return s.replace(a, () => b) }
  const psql = (user, file) => `su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U ${user} -d postgres -v ON_ERROR_STOP=1 -f /tmp/${file}'`
  const snapshot = name => `${psql('supabase_admin', 'retained-snapshot.sql')} > /tmp/retained-resumption-${name}.json\n`
  const catalog = name => `${psql('postgres', 'race-catalog.sql')} > /tmp/retained-resumption-catalog-${name}.json\n`
  const prefixAt = matrix.shell.indexOf(psql('postgres', 'retained-state-0.sql'))
  assert.ok(prefixAt > 0, 'matrix prefix anchor')
  const shell = matrix.shell.slice(0, prefixAt).replaceAll('retained-state-', 'retained-resumption-') +
    `${psql('postgres', 'retained-state-0.sql')}\n` + snapshot('before') +
    'cmp -s /tmp/retained-resumption-initial.json /tmp/retained-resumption-before.json\n' +
    `${psql('postgres', 'retained-repair.sql')} > /tmp/retained-resumption-repair.log 2>&1\n` +
    "grep -q 'K2_RETAINED_REPAIR_CORRECTIONS:3' /tmp/retained-resumption-repair.log\n" +
    snapshot('after') + catalog('after') +
    'cmp -s /tmp/retained-resumption-before.json /tmp/retained-resumption-after.json\n' +
    'cmp -s /tmp/retained-catalog-corrected.json /tmp/retained-resumption-catalog-after.json\n' +
    `${psql('postgres', 'retained-repair.sql')} > /tmp/retained-resumption-repeat.log 2>&1\n` +
    "grep -q 'K2_RETAINED_REPAIR_CORRECTIONS:0' /tmp/retained-resumption-repeat.log\n" +
    snapshot('final') + catalog('final') +
    'cmp -s /tmp/retained-resumption-initial.json /tmp/retained-resumption-final.json\n' +
    'cmp -s /tmp/retained-catalog-corrected.json /tmp/retained-resumption-catalog-final.json\n' +
    `${psql('postgres', 'cold-authority.sql')}\necho K2_RETAINED_RESUMPTION_REPAIR_CONSERVED\n` +
    `for name in initial final;do
 echo K2_RETAINED_RESUMPTION_EXPORT_$name"_BEGIN"
 base64 /tmp/retained-resumption-$name.json
 echo K2_RETAINED_RESUMPTION_EXPORT_$name"_END"
done
`
  let connected = input.connected
  connected = replace(connected, 'guestRequest, adminRequest, observe, destination, report', 'guestRequest, newGuestRequest, adminRequest, observe, destination, report')
  connected = replace(connected, "response = await adminRequest('delivery/customer-rates', 'POST', {", 'const tariffPayload = {')
  connected = replace(connected, '  }, { key: fixture.publishB })', "  }\n  response = await adminRequest('delivery/customer-rates', 'POST', tariffPayload, { key: fixture.publishB })")
  connected = replace(connected, '  assert.equal(response.data.result.version, 2)', '  assert.equal(response.data.result.version, 2)\n  const tariffReceipt = response.data')
  connected = replace(connected, "  response = await guestRequest('order', body(fixture.orderB, quoteB, 'TariffB'))", "  const bodyB = body(fixture.orderB, quoteB, 'TariffB')\n  response = await guestRequest('order', bodyB)")
  connected = replace(connected, '  const final = await state()', '  const receiptB = response.data.receipt\n  const final = await state()')
  connected = replace(connected, "  report.checks.push('connected_tariff_orderA_publishB_replayA_refuse_stale_acceptB_retainA')", `  report.checks.push('connected_tariff_orderA_publishB_replayA_refuse_stale_acceptB_retainA')
  return { async resume() {
    assert.deepEqual(await state(), final, 'all original business rows survive repair and restart')
    let response = await adminRequest('delivery/customer-rates', 'POST', tariffPayload, { key: fixture.publishB })
    assert.equal(response.status, 200)
    assert.deepEqual(response.data, tariffReceipt, 'exact saved tariff receipt after repair')
    for (const [payload, receipt] of [[bodyA, receiptA], [bodyB, receiptB]]) {
      response = await guestRequest('order', payload)
      assert.equal(response.status, 201); assert.deepEqual(response.data.receipt, receipt)
    }
    assert.deepEqual(await state(), final, 'old receipt retries preserve all business rows')
    response = await newGuestRequest('delivery/quote', quoteRequest)
    assert.equal(response.status, 200)
    assert.equal(response.data.quote.rateVersion, 2); assert.equal(response.data.quote.feeMinor, 20000)
    const newKey = fixture.stale
    const newBody = body(newKey, response.data.quote, 'TariffC')
    response = await newGuestRequest('order', newBody); assert.equal(response.status, 201)
    const receiptC = response.data.receipt
    const extendedKeys = keys
    const extended = async () => completeState(await observe(extendedKeys, fixture.sku))
    const accepted = await extended()
    assert.equal(accepted.orders.length, 3); assert.equal(accepted.stock.reserved, 3)
    assert.equal(accepted.stock.onHand, final.stock.onHand)
    for (const old of final.orders) assert.deepEqual(accepted.orders.find(o => o.id === old.id), old)
    receiptMatches(receiptC, acceptedOrder(accepted, newKey, 2, 20000))
    response = await newGuestRequest('order', newBody); assert.equal(response.status, 201)
    assert.deepEqual(response.data.receipt, receiptC)
    assert.deepEqual(await extended(), accepted, 'new order replay creates no second hold')
    report.resumption = { exactTariffReceipt: true, oldOrderReceipts: 2, oldBusinessRowsConserved: true, newAcceptedOrders: 1, newOrderHolds: 1, newReceiptReplayConserved: true, currentRateVersion: 2, feeMinor: 20000, beforeBusinessSha256: hash(final), afterBusinessSha256: hash(accepted), scope: 'Actual local routed requests with retained cookies after native repair/restart; no hosted or production availability claim' }
    report.checks.push('post_repair_old_receipts_quote_new_order_single_hold')
  } }
`)
  let helper = replace(input.helper, "import http from 'node:http'", "import http from 'node:http'\nimport net from 'node:net'")
  helper = replace(helper, '  const guestRequest=async(route,body)=>{', '  const guestRequest=async(route,body,{localAddress,jar=guestJar}={})=>{')
  helper = replace(helper, "cookie:[...guestJar].map(([k,v])=>k+'='+v).join('; ')", "cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')")
  helper = replace(helper, "guestJar.delete(part.slice(0,at));else guestJar.set", "jar.delete(part.slice(0,at));else jar.set")
  helper = replace(helper, "    const response=await fetch(vars.K2_STOREFRONT_ORIGINS+'/api/storefront/'+route,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});", `    const response=localAddress ? await new Promise((resolve,reject)=>{
      const outgoing=http.request(vars.K2_STOREFRONT_ORIGINS+'/api/storefront/'+route,{method:'POST',headers,localAddress},reply=>{
        let bytes='';reply.on('data',b=>bytes+=b.toString());reply.once('error',reject);reply.once('end',()=>resolve({status:reply.statusCode,json:async()=>JSON.parse(bytes),headers:{getSetCookie:()=>reply.headers['set-cookie']||[]}}))
      });outgoing.setTimeout(20000,()=>outgoing.destroy(new Error('NEW_CUSTOMER_HTTP_TIMEOUT')));outgoing.once('error',reject);outgoing.end(JSON.stringify(body))
    }) : await fetch(vars.K2_STOREFRONT_ORIGINS+'/api/storefront/'+route,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});`)
  helper = replace(helper, ' const routed=http.createServer((req,res)=>{calls.routed++;', " const routed=http.createServer((req,res)=>{calls.routed++;if(req.url.startsWith('/api/storefront/')){report.guestPeerAddresses??=[];report.guestPeerAddresses.push(String(req.socket.remoteAddress))}")
  helper = replace(helper, '  await connectedOrderProbe({', "  const newGuestJar=new Map();const newGuestRequest=(route,body)=>guestRequest(route,body,{localAddress:'127.0.0.2',jar:newGuestJar});\n  const retained = await connectedOrderProbe({newGuestRequest,")
  helper = replace(helper, "  result=await request('auth/logout','POST',{});assert.equal(result.status,200)", `  await new Promise((resolve,reject)=>{
    const socket=net.createConnection({host:'127.0.0.1',port:54393});socket.setTimeout(10000,()=>socket.destroy(new Error('POPULATION_CONTROL_TIMEOUT')))
    socket.once('connect',()=>socket.end('K2_RETAINED_POPULATED_READY\\n'));socket.once('error',reject);socket.once('close',resolve)
  })
  await new Promise((resolve,reject)=>{
    const deadline=Date.now()+60000
    const connect=()=>{const socket=net.createConnection({host:'127.0.0.1',port:54393});let data='',retrying=false;socket.setTimeout(60000,()=>socket.destroy(new Error('RESTART_CONTROL_TIMEOUT')))
      socket.on('data',b=>{data+=b.toString();if(data.includes('K2_RETAINED_SERVICES_RESTARTED\\n')){socket.end('K2_RETAINED_RESTART_ACK\\n');resolve()}})
      socket.once('error',e=>{if(e.code==='ECONNREFUSED'&&Date.now()<deadline){retrying=true;setTimeout(connect,100)}else reject(e)})
      socket.once('close',()=>{if(retrying||data.includes('K2_RETAINED_SERVICES_RESTARTED\\n'))return;if(data===''&&Date.now()<deadline)setTimeout(connect,100);else reject(new Error('RESTART_CONTROL_CLOSED'))})}
    connect()
  })
  const resumedCategory=await request('product-master','POST',categoryCommand,{key:categoryKey})
  assert.equal(resumedCategory.status,200);assert.deepEqual(resumedCategory.data,categorySet.data)
  await retained.resume()
  report.resumption.exactCategoryReceipt=true
  result=await request('auth/logout','POST',{});assert.equal(result.status,200)`)
  let image = replace(input.image, 'K2 retained repair:3b9bb642-ae60-4f1a-a9cb-00d4b3801c18', 'K2 retained repair:' + input.marker)
  image = replace(image, "if grep -q '^K2_AUTH_DRIVER_OK$' /tmp/auth-driver-status;then echo K2_AUTH_REAL_IDENTITY_OK;else echo K2_AUTH_DRIVER_FAILURE_RECOVERY_REQUIRED;fi", "grep -q '^K2_RETAINED_POPULATED_READY$' /tmp/auth-driver-status")
  image = replace(image, "if grep -q '^K2_AUTH_DRIVER_OK$' /tmp/auth-driver-status;then\n auth_pid=", "if grep -q '^K2_RETAINED_POPULATED_READY$' /tmp/auth-driver-status;then\n auth_pid=")
  const restart = `chroot /authroot /usr/local/bin/auth serve > /tmp/auth-resumption.log 2>&1 &
auth_pid=$!
chroot /restroot /bin/postgrest > /tmp/rest-resumption.log 2>&1 &
rest_pid=$!
restart_healthy=false
for attempt in $(seq 1 100);do
 if wget -q -O /tmp/auth-resumption-health.json http://127.0.0.1:9999/health && wget -q -O /tmp/rest-resumption-health.json 'http://127.0.0.1:9997/brands?select=id&limit=0';then restart_healthy=true;break;fi
 if ! kill -0 "$auth_pid" 2>/dev/null || ! kill -0 "$rest_pid" 2>/dev/null;then break;fi
 sleep 0.1
done
[ "$restart_healthy" = true ]
echo K2_RETAINED_RESTART_HEALTH_OK
printf 'K2_RETAINED_SERVICES_RESTARTED\\n' | /bin/busybox timeout 120 /bin/busybox nc -l -p 9998 > /tmp/retained-restart-ack &
control_pid=$!
wait "$control_pid"
grep -q '^K2_RETAINED_RESTART_ACK$' /tmp/retained-restart-ack
/bin/busybox timeout 120 /bin/busybox nc -l -p 9998 > /tmp/auth-driver-status &
control_pid=$!
wait "$control_pid"
grep -q '^K2_AUTH_DRIVER_OK$' /tmp/auth-driver-status
echo K2_AUTH_REAL_IDENTITY_OK
for pid in "$rest_pid" "$auth_pid";do kill "$pid" 2>/dev/null || true;wait "$pid" 2>/dev/null || true;done
echo K2_RETAINED_RESUMPTION_REQUESTS_COMPLETED
`
  image = replace(image, '[ "$matrix_exit" = 0 ]\n', '[ "$matrix_exit" = 0 ]\n' + restart)
  image = replace(image, "on_hand=10 AND reserved=2", "on_hand=10 AND reserved=3")
  image = replace(image, "quantity=10 AND reserved_quantity=2", "quantity=10 AND reserved_quantity=3")
  image = replace(image, "'76000000-0000-4000-8000-000000000003'))<>2", "'76000000-0000-4000-8000-000000000003'))<>3")
  image = replace(image, "OR EXISTS(SELECT 1 FROM public.order_requests WHERE idempotency_key='76000000-0000-4000-8000-000000000002')", "OR NOT EXISTS(SELECT 1 FROM public.order_requests o JOIN k2_private.order_delivery_snapshots s ON s.order_id=o.id WHERE o.idempotency_key='76000000-0000-4000-8000-000000000002' AND o.shipping_amount=200 AND s.quote->>'rateVersion'='2' AND s.quote->>'feeMinor'='20000')")
  return { shell, helper, connected, image, priorSql: matrix.states[0].sql, repairSql: matrix.repairSql, snapshotSql: matrix.snapshotSql, runtimeExecuted: false, providerWrites: false }
}
