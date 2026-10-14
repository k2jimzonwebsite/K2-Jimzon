// MAP-018 / IDEA-20261010-08. Local evidence tooling; no dispatcher or credentials.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'

const sourcePins = Object.freeze({
  connected: 'd206e61499c17f9ae94f3240b3c95ca5167f7ed6b7440a4722ca58b326bac19b',
  observer: '900b383bcbd59ffc2f9e7cca69039a581204a8bd3c7fb74e3c6d96e50430ef77',
})
const readPinned = (name, expected) => {
  const bytes = fs.readFileSync(new URL('../20261010-tariff-runtime/' + name, import.meta.url))
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, 'accepted source pin')
  return bytes.toString('utf8')
}

export async function loadNativeBusinessContracts() {
  const connected = readPinned('connected-order-probe.mjs', sourcePins.connected)
  const boundary = '\nexport async function connectedOrderProbe('
  assert.equal(connected.split(boundary).length, 2, 'one pure/HTTP boundary')
  // Exact accepted fixture and pure functions. Never invoke or imitate HTTP.
  const pure = connected.slice(0, connected.indexOf(boundary)) +
    '\nexport { keys, completeState, receiptMatches, acceptedOrder }\n'
  const contracts = await import('data:text/javascript;base64,' + Buffer.from(pure).toString('base64'))
  const observer = readPinned('fixture-observer.sql', sourcePins.observer)
  const query = observer.match(/ with orders as materialized \([\s\S]*?\)\) into v_result;/g)
  assert.equal(query?.length, 1, 'one complete accepted observer query')
  // Preserve the original three owned keys. C reuses the proven non-applied
  // stale key, exactly as accepted resumption04 does; no observer selection drift.
  const keysSql = 'ARRAY[' + contracts.keys.map(key => "'" + key + "'").join(',') + ']::text[]'
  const plainQuery = query[0].replaceAll(/\bp_keys\b/g, keysSql)
    .replaceAll(/\bp_sku\b/g, "'" + contracts.fixture.sku + "'")
    .replace('into v_result;', 'into v_state;')
  const observationSql = name => {
    assert.match(name, /^[A-Za-z][A-Za-z0-9]*$/, 'owned checkpoint name')
    return `DO $observe$ DECLARE v_state jsonb; BEGIN\n${plainQuery}\n` +
      `UPDATE pg_temp.k2_native_witness AS w SET value=w.value||pg_catalog.jsonb_build_object('${name}',v_state);\nEND $observe$;`
  }
  return { fixture: contracts.fixture, keys: contracts.keys, completeState: contracts.completeState,
    receiptMatches: contracts.receiptMatches, acceptedOrder: contracts.acceptedOrder,
    observationSql, pins: sourcePins }
}

export async function verifyNativeBusinessTimeline(witness) {
  const { completeState, acceptedOrder, receiptMatches, fixture } = await loadNativeBusinessContracts()
  const names = ['before', 'acceptedA', 'publishedB', 'replayA', 'staleRefused', 'acceptedB', 'repaired',
    'categoryReplay', 'tariffAReplay', 'tariffBReplay', 'oldAReplay', 'oldBReplay', 'acceptedC', 'replayC']
  const states = Object.fromEntries(names.map(name => [name, completeState(witness.states[name])]))
  const { before, acceptedA: a, acceptedB: b, acceptedC: c } = states
  assert.deepEqual(before.orders, [])
  assert.equal(before.stock.reserved, 0)
  assert.ok(before.stock.onHand >= 3)
  const oldA = acceptedOrder(a, fixture.orderA, 1, 15000)
  assert.equal(a.orders.length, 1); assert.equal(a.stock.reserved, 1)
  receiptMatches(witness.receipts.orderA, oldA)
  for (const name of ['publishedB', 'replayA', 'staleRefused']) assert.deepEqual(states[name], a, name)
  assert.deepEqual(witness.staleRefusal, { sqlstate: '22023', message: 'K2_DELIVERY_QUOTE_CHANGED' })
  assert.deepEqual(witness.receipts.replayA, witness.receipts.orderA)
  assert.equal(b.orders.length, 2); assert.equal(b.stock.reserved, 2)
  assert.deepEqual(acceptedOrder(b, fixture.orderA, 1, 15000), oldA)
  receiptMatches(witness.receipts.orderB, acceptedOrder(b, fixture.orderB, 2, 20000))
  for (const [name, version] of [['category', '1'], ['tariffA', '1'], ['tariffB', '2']]) {
    assert.equal(String(witness.receipts[name]?.version), version, 'saved ' + name + ' receipt')
    assert.deepEqual(witness.receipts[name + 'Replay'], witness.receipts[name], name + ' exact receipt')
  }
  for (const name of ['repaired', 'categoryReplay', 'tariffAReplay', 'tariffBReplay', 'oldAReplay', 'oldBReplay']) {
    assert.deepEqual(states[name], b, name)
  }
  assert.deepEqual(witness.receipts.oldAReplay, witness.receipts.orderA)
  assert.deepEqual(witness.receipts.oldBReplay, witness.receipts.orderB)
  assert.equal(c.orders.length, 3); assert.equal(c.stock.reserved, 3)
  for (const old of b.orders) assert.deepEqual(c.orders.find(order => order.id === old.id), old)
  receiptMatches(witness.receipts.orderC, acceptedOrder(c, fixture.stale, 2, 20000))
  for (const current of [a, b, c]) assert.equal(current.stock.onHand, before.stock.onHand)
  assert.deepEqual(states.replayC, c)
  assert.deepEqual(witness.receipts.replayC, witness.receipts.orderC)
  return { acceptedOrders: 3, checkpoints: names.length, sourcePins, httpEvidence: false,
    scope: 'Complete native business observations only; no HTTP, Auth, cookies, caller-role or service restart evidence' }
}

export function nativeGuestCommandSql(name, resultName, replay = false) {
  const specs = {
    orderA: { key: '76000000-0000-4000-8000-000000000001', ip: 'a1', version: 1, fee: 15000 },
    stale: { key: '76000000-0000-4000-8000-000000000002', ip: 'd1', version: 1, fee: 15000 },
    orderB: { key: '76000000-0000-4000-8000-000000000003', ip: 'b1', version: 2, fee: 20000 },
    orderC: { key: '76000000-0000-4000-8000-000000000002', ip: 'c1', version: 2, fee: 20000 },
  }
  assert.ok(Object.hasOwn(specs, name), 'owned guest command')
  assert.match(resultName, /^[A-Za-z][A-Za-z0-9]*$/)
  assert.ok(name !== 'stale' || !replay, 'stale command is a fresh refusal')
  const { key, ip, version, fee } = specs[name]
  const sign = action => `v_stamp:=extract(epoch from clock_timestamp())::bigint;v_nonce:=pg_catalog.gen_random_uuid();
 v_signature:=pg_catalog.encode(extensions.hmac(pg_catalog.convert_to('${action}'||E'\\n'||v_stamp::text||E'\\n'||v_nonce::text||E'\\n'||pg_catalog.encode(extensions.digest(pg_catalog.convert_to(v_body,'UTF8'),'sha256'),'hex')||E'\\n'||v_ip,'UTF8'),pg_catalog.decode(pg_catalog.repeat('ac',32),'hex'),'sha256'),'hex');`
  const quote = replay ? `SELECT w.value->>'${name}Body' INTO v_body FROM pg_temp.k2_native_witness AS w;` : name === 'stale' ?
    `SELECT w.value->'orderAQuote' INTO v_quote FROM pg_temp.k2_native_witness AS w;` :
    `SELECT pg_catalog.jsonb_build_object('service','standard','items',pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('sku','MAP018-TARIFF-ORDER-01','quantity',1)),'destination',w.value->'destination')::text INTO v_body FROM pg_temp.k2_native_witness AS w;
 ${sign('delivery_quote')}
 v_quote_response:=public.quote_customer_delivery_v1(v_stamp,v_nonce,v_body,v_ip,v_signature);v_quote:=v_quote_response->'quote';
 IF v_quote_response->>'ok' IS DISTINCT FROM 'true' OR v_quote->>'rateVersion' IS DISTINCT FROM '${version}' OR v_quote->>'feeMinor' IS DISTINCT FROM '${fee}' THEN RAISE EXCEPTION 'K2_FULL_QUOTE_RESULT';END IF;
 ${name === 'orderA' ? '' : "IF v_quote->'inputFingerprint' IS DISTINCT FROM (SELECT w.value->'orderAQuote'->'inputFingerprint' FROM pg_temp.k2_native_witness AS w) THEN RAISE EXCEPTION 'K2_FULL_QUOTE_FINGERPRINT_CHANGED';END IF;"}
 UPDATE pg_temp.k2_native_witness AS w SET value=w.value||pg_catalog.jsonb_build_object('${name}Quote',v_quote);`
  const body = replay ? '' : `SELECT pg_catalog.jsonb_build_object('customerName','Synthetic ${name}','email','full-${name.toLowerCase()}@example.test','phone','','address','Synthetic full-profile native address','fulfillmentMethod','Standard Courier Delivery','note','','items',pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('sku','MAP018-TARIFF-ORDER-01','quantity',1)),'idempotencyKey','${key}','delivery',pg_catalog.jsonb_build_object('service','standard','destination',w.value->'destination','acceptance',pg_catalog.jsonb_build_object('inputFingerprint',v_quote->'inputFingerprint','rateVersion',v_quote->'rateVersion')))::text INTO v_body FROM pg_temp.k2_native_witness AS w;
 UPDATE pg_temp.k2_native_witness AS w SET value=w.value||pg_catalog.jsonb_build_object('${name}Body',v_body);`
  const call = `${sign('order')}
 SELECT pg_catalog.to_jsonb(r)-'guest_grant_token' INTO v_result FROM public.submit_guest_order_v1(v_stamp,v_nonce,v_body,v_ip,v_signature,NULL) AS r;`
  const result = name === 'stale' ? `BEGIN
 ${call}
 RAISE EXCEPTION 'K2_FULL_STALE_WRONGLY_ACCEPTED';
 EXCEPTION WHEN SQLSTATE '22023' THEN
 GET STACKED DIAGNOSTICS v_sqlstate=RETURNED_SQLSTATE,v_message=MESSAGE_TEXT;
 IF v_message IS DISTINCT FROM 'K2_DELIVERY_QUOTE_CHANGED' THEN RAISE;END IF;
 UPDATE pg_temp.k2_native_witness AS w SET value=w.value||pg_catalog.jsonb_build_object('staleRefusal',pg_catalog.jsonb_build_object('sqlstate',v_sqlstate,'message',v_message));
 END;` : `${call}
 IF v_result->>'ok' IS DISTINCT FROM 'true' OR (v_result->>'total_amount')::numeric IS DISTINCT FROM ${fee / 100 + 100}::numeric OR v_result->>'shipping_quote_status' IS DISTINCT FROM 'customer_confirmed' OR v_result->>'delivery_status' IS DISTINCT FROM 'ready_to_pack' THEN RAISE EXCEPTION 'K2_FULL_ORDER_RESULT';END IF;
 SELECT o.id INTO v_order_id FROM public.order_requests AS o WHERE o.idempotency_key='${key}';
 IF v_order_id IS NULL OR (SELECT count(*) FROM public.order_requests AS o WHERE o.idempotency_key='${key}')<>1
 OR (SELECT count(*) FROM public.inventory_reservations AS r WHERE r.order_request_id=v_order_id AND r.quantity=1 AND r.status='active')<>1
 OR (SELECT count(*) FROM k2_private.order_delivery_snapshots AS s WHERE s.order_id=v_order_id AND s.quote->>'rateVersion'='${version}' AND s.quote->>'feeMinor'='${fee}')<>1 THEN RAISE EXCEPTION 'K2_FULL_CANONICAL_LINKS';END IF;
 ${replay ? `IF v_result IS DISTINCT FROM (SELECT w.value->'${name}Result' FROM pg_temp.k2_native_witness AS w) THEN RAISE EXCEPTION 'K2_FULL_ORDER_RECEIPT_CHANGED';END IF;` : ''}
 UPDATE pg_temp.k2_native_witness AS w SET value=w.value||pg_catalog.jsonb_build_object('${resultName}Result',v_result);`
  return `DO $guest$ DECLARE v_stamp bigint;v_nonce uuid;v_signature text;v_body text;v_quote_response jsonb;v_quote jsonb;v_result jsonb;v_ip text:=pg_catalog.repeat('${ip}',32);v_order_id uuid;v_sqlstate text;v_message text; BEGIN
 ${quote}
 ${body}
 ${result}
 END $guest$;`
}
