import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const helpers = await import('../shared/customer-address-book.js').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
  return null
})
const address = (patch = {}) => ({ id: randomUUID(), label: 'Home', recipientName: 'Elena Villanueva',
  phone: '09178546329', street: 'Unit 18, 42 Mabini Street', postalCode: '1600', landmark: '',
  destination: { sourceVersion: 'psgc-2026-06-30', path: ['1300000000', '1374000000', '1374030000', '1374030010'] }, ...patch })
const command = (addresses, patch = {}) => ({ operation: 'addresses', operationId: randomUUID(), expectedRevision: 0,
  displayName: 'Elena Villanueva', addresses, defaultAddressId: addresses[0]?.id || null, ...patch })

test('address commands normalize fulfillment contact without creating an Auth identity', () => {
  assert.ok(helpers, 'the shared address-book contract is not implemented')
  const a = address(), result = helpers.validateAddressBookCommand(command([a]))
  assert.equal(result.addresses[0].phone, '+639178546329')
  assert.equal(result.addresses[0].recipientName, a.recipientName)
  assert.equal(result.defaultAddressId, a.id)
  assert.equal(result.displayName, 'Elena Villanueva')
  assert.equal('userId' in result, false)
  assert.equal('verified' in result.addresses[0], false)
})

test('address book refuses selectors, duplicate IDs, missing defaults and unbounded bodies', () => {
  assert.ok(helpers)
  const a = address()
  for (const input of [command([a], { userId: randomUUID() }), command([a, a]),
    command([a], { defaultAddressId: randomUUID() }), command([a], { expectedRevision: -1 }),
    command([a], { expectedRevision: 0.5 }), command(Array.from({ length: 11 }, () => address()))]) {
    assert.throws(() => helpers.validateAddressBookCommand(input))
  }
  assert.deepEqual(helpers.validateAddressBookCommand(command([], { defaultAddressId: null })).addresses, [])
  assert.throws(() => helpers.validateAddressBookCommand(command([], { defaultAddressId: a.id })))
})

test('saved-address fields and geographic shape are closed and bounded', () => {
  assert.ok(helpers)
  for (const patch of [{ recipientName: '' }, { phone: 'call me' }, { street: '' }, { postalCode: '16000' },
    { label: 'x'.repeat(41) }, { landmark: 'x'.repeat(121) }, { verified: true },
    { destination: { sourceVersion: 'old', path: ['1300000000', '1374000000', '1374030000'] } },
    { destination: { sourceVersion: 'psgc-2026-06-30', path: ['1300000000', '1374030000'] } },
    { destination: { sourceVersion: 'psgc-2026-06-30', path: ['1300000000', '1374000000', 'not-a-code'] } }]) {
    assert.throws(() => helpers.validateAddressBookCommand(command([address(patch)])))
  }
  assert.equal(helpers.validateAddressBookCommand(command([address({ postalCode: '', landmark: 'Blue gate' })])).addresses.length, 1)
})

test('checkout applies a gift default as one recipient/contact/address/destination group', () => {
  assert.ok(helpers)
  const a = { ...address({ recipientName: 'Teresa Abella', phone: '+639276143852' }), formattedAddress: '42 Mabini Street, Pasig City' }
  const form = { name: 'Elena Villanueva', phone: '+639178546329', email: '', address: '' }
  const result = helpers.prefillCheckoutDetails(form, { displayName: 'Elena Villanueva',
    addressBook: { addresses: [a], defaultAddressId: a.id, revision: 1 } }, { email: 'elena@example.invalid' }, false)
  assert.equal(result.form.name, 'Teresa Abella')
  assert.equal(result.form.phone, '+639276143852')
  assert.equal(result.form.address, a.formattedAddress)
  assert.equal(result.form.email, 'elena@example.invalid')
  assert.deepEqual(result.destination, a.destination)
  assert.equal(result.addressId, a.id)
})

test('a manual delivery edit prevents every part of a late default being applied', () => {
  assert.ok(helpers)
  const a = { ...address(), formattedAddress: 'Saved destination' }
  const form = { name: '', phone: '', email: '', address: 'A different street already typed' }
  const result = helpers.prefillCheckoutDetails(form, { addressBook: { addresses: [a], defaultAddressId: a.id } },
    { email: 'elena@example.invalid' }, true)
  assert.equal(result.form.address, form.address)
  assert.equal(result.form.name, '')
  assert.equal(result.form.phone, '')
  assert.equal(result.destination, null)
  assert.equal(result.addressId, '')
})

test('initialized empty address book never falls back to the deleted legacy projection', () => {
  assert.ok(helpers)
  const result = helpers.prefillCheckoutDetails({ name: '', phone: '', email: '', address: '' }, {
    displayName: 'Elena Villanueva', deliveryAddress: 'An obsolete address',
    addressBook: { initialized: true, addresses: [], defaultAddressId: null, revision: 2 },
  }, {}, false)
  assert.equal(result.form.address, '')
  assert.equal(result.destination, null)
})
