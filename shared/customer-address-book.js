const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const DELIVERY_SOURCE = 'psgc-2026-06-30'
const invalid = field => { throw Object.assign(new Error('REQUEST_INVALID'), { field }) }
function exact(value, fields, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) invalid(field)
}
function text(value, max, field, required = false) {
  if (typeof value !== 'string') invalid(field)
  const clean = value.trim()
  if (clean.length > max || required && !clean || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(clean)) invalid(field)
  return clean
}
export function editableDeliveryAddress(address) {
  return Object.fromEntries(['id', 'label', 'recipientName', 'phone', 'street', 'postalCode', 'landmark', 'destination']
    .map(key => [key, address[key]]))
}
export function validateDeliveryAddress(address) {
  exact(address, ['id', 'label', 'recipientName', 'phone', 'street', 'postalCode', 'landmark', 'destination'], 'address')
  if (!UUID.test(address.id || '')) invalid('id')
  let phone = text(address.phone, 40, 'phone', true).replace(/[\s()-]/g, '')
  if (/^09\d{9}$/.test(phone)) phone = `+63${phone.slice(1)}`
  else if (/^639\d{9}$/.test(phone)) phone = `+${phone}`
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) invalid('phone')
  const postalCode = text(address.postalCode, 4, 'postalCode')
  if (postalCode && !/^\d{4}$/.test(postalCode)) invalid('postalCode')
  const destination = address.destination
  exact(destination, ['sourceVersion', 'path'], 'destination')
  if (destination.sourceVersion !== DELIVERY_SOURCE || !Array.isArray(destination.path)
    || destination.path.length < 3 || destination.path.length > 5
    || destination.path.some(code => typeof code !== 'string' || !/^\d{10}$/.test(code))
    || new Set(destination.path).size !== destination.path.length) invalid('destination')
  return { id: address.id.toLowerCase(), label: text(address.label, 40, 'label', true),
    recipientName: text(address.recipientName, 140, 'recipientName', true), phone,
    street: text(address.street, 240, 'street', true), postalCode,
    landmark: text(address.landmark, 120, 'landmark'),
    destination: { sourceVersion: DELIVERY_SOURCE, path: [...destination.path] } }
}
export function validateAddressBookCommand(body) {
  exact(body, ['operation', 'operationId', 'expectedRevision', 'displayName', 'addresses', 'defaultAddressId'], 'command')
  if (body.operation !== 'addresses' || !UUID.test(body.operationId || '')
    || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0 || body.expectedRevision >= Number.MAX_SAFE_INTEGER
    || !Array.isArray(body.addresses) || body.addresses.length > 10) invalid('command')
  const addresses = body.addresses.map(validateDeliveryAddress)
  if (new Set(addresses.map(address => address.id)).size !== addresses.length) invalid('addresses')
  const defaultAddressId = body.defaultAddressId === null ? null : String(body.defaultAddressId).toLowerCase()
  if (addresses.length ? !addresses.some(address => address.id === defaultAddressId) : defaultAddressId !== null) invalid('defaultAddressId')
  const result = { operation: 'addresses', operationId: body.operationId.toLowerCase(), expectedRevision: body.expectedRevision,
    displayName: text(body.displayName, 140, 'displayName', true), addresses, defaultAddressId }
  if (new TextEncoder().encode(JSON.stringify(result)).length > 24576) throw new Error('BODY_TOO_LARGE')
  return result
}

// All four delivery values travel together. The caller tracks deliberate edits
// separately from automatically sourced profile/Auth fallbacks.
export function prefillCheckoutDetails(form, settings, user, deliveryTouched) {
  const book = settings?.addressBook
  const selected = book?.addresses?.find(address => address.id === book.defaultAddressId)
  const next = { ...form, email: form.email || user?.email || '' }
  if (deliveryTouched) return { form: next, destination: null, addressId: '' }
  if (selected) return { form: { ...next, name: selected.recipientName, phone: selected.phone, address: selected.formattedAddress },
    destination: selected.destination, addressId: selected.id }
  return { form: { ...next, name: form.name || settings?.displayName || '', phone: form.phone || user?.phone || '',
    address: book?.initialized ? '' : form.address || settings?.deliveryAddress || '' }, destination: null, addressId: '' }
}
