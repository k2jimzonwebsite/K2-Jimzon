import { expect, test } from '@playwright/test'
import {
  RESERVATION_POLICY,
  RESERVATION_STATES,
  extensionRefusalReason,
  isExpiredAt,
  reservationDeadline,
  extendedDeadline,
  cartHoldsStock,
  stockEffectOf,
} from '../src/lib/reservationPolicy.js'

// OWNER-002, answered 2 September 2026. The owner's model has four states, and
// the value of the model is that "reserved" and "sold" never blur together:
//
//   cart            -> nothing is held
//   purchase click  -> reserved for 30 minutes
//   confirmed/paid  -> deducted
//   deadline passes -> released
//
// These tests exist because every one of those boundaries is a place where a
// plausible-looking shortcut silently oversells or silently loses stock.

const T0 = '2026-09-02T10:00:00.000Z'
const at = (minutes) => new Date(Date.parse(T0) + minutes * 60_000).toISOString()

// --- the policy constants the owner set ------------------------------------

test('the owner-approved policy values are exactly what OWNER-002 recorded', () => {
  expect(RESERVATION_POLICY).toMatchObject({
    defaultHoldMinutes: 30,
    minimumExtensionMinutes: 30,
    maximumExtensionMinutes: 7 * 24 * 60,
    cartHoldsStock: false,
  })
})

// --- a cart is a list, not a claim -----------------------------------------

test('a cart never holds stock, however long it sits there', () => {
  expect(cartHoldsStock()).toBe(false)
  expect(stockEffectOf('in_cart')).toBe('none')
  // The failure this prevents: abandoned carts locking inventory forever, so the
  // catalog shows sold out for goods still on the shelf.
  for (const minutes of [0, 60, 60 * 24 * 365]) {
    expect(stockEffectOf('in_cart', { ageMinutes: minutes })).toBe('none')
  }
})

test('each lifecycle event has exactly one stock effect', () => {
  expect(stockEffectOf('in_cart')).toBe('none')
  expect(stockEffectOf('purchase_submitted')).toBe('reserved')
  expect(stockEffectOf('confirmed')).toBe('deducted')
  expect(stockEffectOf('expired')).toBe('released')
  expect(stockEffectOf('cancelled')).toBe('released')
})

test('an unknown lifecycle event has no stock effect rather than a guessed one', () => {
  expect(stockEffectOf('something_new')).toBe('none')
  expect(stockEffectOf(null)).toBe('none')
  expect(stockEffectOf(undefined)).toBe('none')
})

// --- the 30 minute hold ----------------------------------------------------

test('the hold starts at purchase submission, not at add-to-cart', () => {
  expect(reservationDeadline(T0)).toBe(at(30))
})

test('a deadline is refused rather than defaulted when the start time is unusable', () => {
  for (const bad of [null, undefined, '', 'yesterday', '2026-13-45T00:00:00Z']) {
    expect(reservationDeadline(bad), String(bad)).toBeNull()
  }
})

test('expiry is exclusive at the boundary: the final second is still held', () => {
  const deadline = reservationDeadline(T0)
  expect(isExpiredAt(deadline, at(29))).toBe(false)
  expect(isExpiredAt(deadline, at(29.9))).toBe(false)
  // Exactly at the deadline the hold is over.
  expect(isExpiredAt(deadline, at(30))).toBe(true)
  expect(isExpiredAt(deadline, at(31))).toBe(true)
})

test('a reservation with no deadline is never treated as expired', () => {
  // A missing deadline is unknown, not overdue. Releasing stock on unknown would
  // silently cancel a real customer's hold.
  expect(isExpiredAt(null, at(9999))).toBe(false)
  expect(isExpiredAt(undefined, at(9999))).toBe(false)
})

// --- staff extensions, bounded 30 minutes to 7 days ------------------------

test('staff may extend within the owner-approved bounds', () => {
  const deadline = reservationDeadline(T0)
  expect(extendedDeadline(deadline, 30)).toBe(at(60))
  expect(extendedDeadline(deadline, 60 * 24)).toBe(at(30 + 60 * 24))
  expect(extendedDeadline(deadline, 7 * 24 * 60)).toBe(at(30 + 7 * 24 * 60))
})

test('an extension shorter than 30 minutes or longer than 7 days is refused', () => {
  const deadline = reservationDeadline(T0)
  for (const minutes of [0, 1, 29, 7 * 24 * 60 + 1, 60 * 24 * 30]) {
    expect(extendedDeadline(deadline, minutes), String(minutes)).toBeNull()
    expect(extensionRefusalReason(minutes)).toMatch(/30 minutes|7 days/)
  }
})

test('a non-integer or negative extension is refused rather than coerced', () => {
  for (const bad of [null, undefined, '30', 30.5, -30, NaN, Infinity]) {
    expect(extendedDeadline(reservationDeadline(T0), bad), String(bad)).toBeNull()
  }
})

test('an accepted extension reports no refusal reason', () => {
  expect(extensionRefusalReason(30)).toBeNull()
  expect(extensionRefusalReason(7 * 24 * 60)).toBeNull()
})

test('extending an already expired reservation is refused, not silently revived', () => {
  // Reviving an expired hold would re-take stock that has already been released
  // back to another customer. Staff must create a new reservation instead.
  const deadline = reservationDeadline(T0)
  expect(extendedDeadline(deadline, 60, { now: at(45) })).toBeNull()
  expect(extendedDeadline(deadline, 60, { now: at(29) })).toBe(at(90))
})

// --- state vocabulary ------------------------------------------------------

test('the reservation states match the ones already in the database', () => {
  // public.inventory_reservations has carried these three since 20260809; the
  // policy layer must not invent a fourth that no column can store.
  expect(RESERVATION_STATES).toEqual(['active', 'released', 'fulfilled'])
})

// --- Pasabuy and wholesale hold nothing ------------------------------------

test('Pasabuy and wholesale produce history, not a stock hold', () => {
  // OWNER-002: these flows are conversation-led through live chat, so each
  // commitment is a durable history record on the customer rather than an
  // expiring claim on inventory.
  expect(stockEffectOf('pasabuy_committed')).toBe('none')
  expect(stockEffectOf('wholesale_committed')).toBe('none')
  expect(reservationDeadline(T0, { channel: 'Pasabuy' })).toBeNull()
  expect(reservationDeadline(T0, { channel: 'Wholesale' })).toBeNull()
  expect(reservationDeadline(T0, { channel: 'Website' })).toBe(at(30))
})
