import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import net from 'node:net'
import http from 'node:http'
const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const base = root + '/oci-retained-populated04'
const input = {
  priorBytes: fs.readFileSync(root + '/retained-code-pair01/prior-catalog.json'),
  correctedBytes: fs.readFileSync(root + '/oci-retained-calibration01/execution01/retained-catalog-before.json'),
  packageBytes: fs.readFileSync(root + '/oci-imported19/guarded-package.json'),
  fragments: ['product_master', 'customer_tariff', 'category_policy'].map(n => fs.readFileSync('supabase/prepared/' + n + '_version_conflict_transport.sql', 'utf8')),
  marker: '6b9bb642-ae60-4f1a-a9cb-00d4b3801c18',
  helper: fs.readFileSync(base + '/bff-helper.mjs', 'utf8'),
  connected: fs.readFileSync(base + '/connected-order-probe.mjs', 'utf8'),
  image: fs.readFileSync(base + '/staging/k2/image-probe.sh', 'utf8'),
}
const load = async () => { try { return await import('./resumption-probe.mjs') } catch (e) { if (e.code === 'ERR_MODULE_NOT_FOUND') return {}; throw e } }
test('resumption preserves request context and requires repair, healthy restart and terminal response', async () => {
  const { prepareResumptionProbe } = await load()
  assert.equal(typeof prepareResumptionProbe, 'function', 'native resumption witness missing')
  const p = prepareResumptionProbe(input)
  assert.ok(p.shell.includes('K2_RETAINED_REPAIR_CORRECTIONS:3'))
  assert.ok(p.shell.includes('K2_RETAINED_REPAIR_CORRECTIONS:0'))
  assert.ok(p.shell.includes('retained-resumption-initial.json /tmp/retained-resumption-final.json'))
  assert.ok(p.helper.includes('await retained.resume()'))
  assert.ok(p.connected.includes('exact saved tariff receipt after repair'))
  assert.ok(p.connected.includes('new order replay creates no second hold'))
  assert.equal(p.connected.split("newGuestRequest('order', newBody)").length, 3)
  assert.ok(p.helper.includes("localAddress:'127.0.0.2',jar:newGuestJar"))
  assert.ok(p.connected.includes('const newKey = fixture.stale'))
  assert.ok(p.connected.includes('const extendedKeys = keys'))
  assert.ok(p.image.includes('K2_RETAINED_RESTART_ACK'))
  assert.ok(p.image.includes('K2_RETAINED_RESTART_HEALTH_OK'))
  assert.ok(p.image.includes('reserved=3'))
  assert.equal(p.runtimeExecuted, false)
})
test('unexpected source and catalog inputs refuse before successor preparation', async () => {
  const { prepareResumptionProbe } = await load()
  assert.equal(typeof prepareResumptionProbe, 'function')
  assert.throws(() => prepareResumptionProbe({ ...input, helper: input.helper.replace('  result=await request(\'auth/logout\',\'POST\',{});', '') }), /anchor/)
  assert.throws(() => prepareResumptionProbe({ ...input, correctedBytes: Buffer.from('{}') }))
})
test('actual restart control waits through refused connections and requires the exact ready marker', async () => {
  const { prepareResumptionProbe } = await load()
  const helper = prepareResumptionProbe(input).helper
  const start = helper.indexOf('  await new Promise((resolve,reject)=>{\n    const deadline=')
  const end = helper.indexOf('  const resumedCategory=', start)
  assert.ok(start >= 0 && end > start)
  const run = new Function('net', 'return (async()=>{' + helper.slice(start, end) + '})()')
  // Use a real ephemeral TCP port. This tests the generated native-control
  // client, not Auth, repair, or product behavior.
  const server = net.createServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  const code = helper.slice(start, end).replaceAll('54393', String(port)).replaceAll('60000', '2000')
  const promise = new Function('net', 'return (async()=>{' + code + '})()')(net)
  let ack
  const accepted = new Promise(resolve => server.once('connection', socket => {
    socket.once('data', data => { ack = data.toString(); socket.end(); resolve() })
    socket.write('K2_RETAINED_SERVICES_RESTARTED\n')
  }))
  await new Promise(resolve => setTimeout(resolve, 150))
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve))
  try { await promise; await accepted; assert.equal(ack, 'K2_RETAINED_RESTART_ACK\n') }
  finally { await new Promise(resolve => server.close(resolve)) }
  assert.equal(typeof run, 'function')
})
test('closed restart control without the ready marker refuses resumption', async () => {
  const { prepareResumptionProbe } = await load()
  const helper = prepareResumptionProbe(input).helper
  const start = helper.indexOf('  await new Promise((resolve,reject)=>{\n    const deadline=')
  const end = helper.indexOf('  const resumedCategory=', start)
  const server = net.createServer(socket => socket.end('WRONG_READY\n'))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const code = helper.slice(start, end).replaceAll('54393', String(server.address().port))
  try { await assert.rejects(new Function('net', 'return (async()=>{' + code + '})()')(net), /RESTART_CONTROL_CLOSED/) }
  finally { await new Promise(resolve => server.close(resolve)) }
})
test('empty EOF from the retiring listener waits for the successor ready marker', async () => {
  const { prepareResumptionProbe } = await load()
  const helper = prepareResumptionProbe(input).helper
  const start = helper.indexOf('  await new Promise((resolve,reject)=>{\n    const deadline=')
  const end = helper.indexOf('  const resumedCategory=', start)
  let connections = 0
  const server = net.createServer(socket => {
    connections++
    if (connections === 1) socket.end()
    else { socket.write('K2_RETAINED_SERVICES_RESTARTED\n'); socket.on('data', () => socket.end()) }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const code = helper.slice(start, end).replaceAll('54393', String(server.address().port)).replaceAll('60000', '2000')
  try { await new Function('net', 'return (async()=>{' + code + '})()')(net); assert.equal(connections, 2) }
  finally { await new Promise(resolve => server.close(resolve)) }
})
test('new customer uses an actual distinct TCP peer without a forged forwarding header', async () => {
  const { prepareResumptionProbe } = await load()
  const helper = prepareResumptionProbe(input).helper
  const start = helper.indexOf('    const response=localAddress ?')
  const end = helper.indexOf('    const data=await response.json();', start)
  assert.ok(start >= 0 && end > start)
  const server = http.createServer((req, res) => {
    assert.equal(req.socket.remoteAddress, '127.0.0.2')
    assert.equal(req.headers['x-forwarded-for'], undefined)
    res.setHeader('Set-Cookie', 'qualification=actual-peer')
    res.end(JSON.stringify({ peer: req.socket.remoteAddress }))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const run = new Function('http', 'vars', 'localAddress', 'headers', 'body', 'route', 'return (async()=>{' + helper.slice(start, end) + 'return response})()')
  try {
    const response = await run(http, { K2_STOREFRONT_ORIGINS: 'http://127.0.0.1:' + server.address().port }, '127.0.0.2', {}, {}, 'order')
    assert.deepEqual(await response.json(), { peer: '127.0.0.2' })
    assert.deepEqual(response.headers.getSetCookie(), ['qualification=actual-peer'])
  } finally { await new Promise(resolve => server.close(resolve)) }
})
