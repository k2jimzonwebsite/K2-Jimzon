const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const invalid = () => { throw Error('REQUEST_INVALID') }
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : invalid()
const id = value => UUID.test(text(value, 36)) ? value : invalid()

// Shared literal command shape. Current stage/calendar/quantity are server facts.
export function validatePackingCommand(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid()
  const { operation } = body
  const keys = operation === 'count'
    ? ['operation', 'consignmentId', 'itemId', 'code', 'boxCode', 'batchCode', 'bestBeforeDate', 'delta', 'source']
    : ['operation', 'consignmentId', 'packingRevision', 'reason',
      ...(['remove', 'restore'].includes(operation) ? ['itemId'] : []),
      ...(operation === 'dispatch' ? ['acknowledgeVariance'] : [])]
  if (Object.keys(body).length !== keys.length || keys.some(key => !Object.hasOwn(body, key))) invalid()
  const result = { operation, consignmentId: id(body.consignmentId) }
  if (operation === 'count') {
    if (![1, -1].includes(body.delta) || !['barcode', 'counter'].includes(body.source)) invalid()
    if ((body.delta === -1 || body.source === 'counter') && !body.itemId) invalid()
    const expiry = text(body.bestBeforeDate, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) || expiry.startsWith('0000-')
      || Number.isNaN(Date.parse(expiry + 'T00:00:00Z'))
      || new Date(expiry + 'T00:00:00Z').toISOString().slice(0, 10) !== expiry) invalid()
    return { ...result, itemId: body.itemId === null ? null : id(body.itemId), code: text(body.code, 120),
      boxCode: text(body.boxCode, 120), batchCode: text(body.batchCode, 120), bestBeforeDate: expiry,
      delta: body.delta, source: body.source }
  }
  if (!['remove', 'restore', 'cancel', 'reopen', 'dispatch'].includes(operation)
    || !Number.isSafeInteger(body.packingRevision) || body.packingRevision < 0) invalid()
  return { ...result, ...(['remove', 'restore'].includes(operation) ? { itemId: id(body.itemId) } : {}),
    packingRevision: body.packingRevision, reason: text(body.reason, 500),
    ...(operation === 'dispatch' ? { acknowledgeVariance: typeof body.acknowledgeVariance === 'boolean' ? body.acknowledgeVariance : invalid() } : {}) }
}
