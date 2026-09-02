import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { manilaToday, pesoInputToMinor } from '../src/views/admin/deliveryRateFormat.js'

// DeliveryRateControl publishes what a customer is charged for delivery. It was
// 753 lines with no test of any kind, and the money parsing on the path to
// publishDeliveryCostBff was private to the component, so nothing could reach
// it. These cover the two decisions that turn a keystroke into a published
// courier cost, plus the guards around the publish itself.

test('a typed amount becomes exact centavos, including the binary-float cases', () => {
  expect(pesoInputToMinor('85')).toBe(8500)
  expect(pesoInputToMinor('95.15')).toBe(9515) // 95.15 * 100 is 9514.999999999998
  expect(pesoInputToMinor('105.50')).toBe(10550)
  expect(pesoInputToMinor('2.67')).toBe(267) // 2.67 * 100 is 267.00000000000003
  expect(pesoInputToMinor('1,234.50')).toBe(123450) // thousands separators are typed
  expect(pesoInputToMinor(' 85 ')).toBe(8500)
  expect(pesoInputToMinor(85)).toBe(8500)
})

test('anything that is not a usable cost is refused, not guessed', () => {
  // Null is the refusal the caller checks. A row published with an unknown
  // amount is the state that lets an unknown fee reach a customer.
  for (const bad of ['', '   ', '0', '0.00', '-85', 'abc', null, undefined, NaN]) {
    expect(pesoInputToMinor(bad), `expected ${JSON.stringify(bad)} to be refused`).toBeNull()
  }
})

test('a half-typed or trailing-text amount is refused rather than truncated', () => {
  // parseFloat alone reads all of these as a number and would publish an amount
  // the staff member never confirmed.
  expect(pesoInputToMinor('95.15 or so')).toBeNull()
  expect(pesoInputToMinor('85abc')).toBeNull()
  expect(pesoInputToMinor('1e5')).toBeNull()
  expect(pesoInputToMinor('85.')).toBeNull()
  expect(pesoInputToMinor('.85')).toBeNull()
  // More precision than centavos exist in is a typo, not a rate.
  expect(pesoInputToMinor('85.123')).toBeNull()
  expect(pesoInputToMinor('Infinity')).toBeNull()
})

test('the effective date is Manila\'s, not the workstation\'s', () => {
  // A UTC host at 08:00 Manila is still on the previous calendar day. Publishing
  // from there must not open an interval that reads as having started yesterday.
  const eightAmManila = new Date('2026-09-02T00:00:00Z') // 08:00 +08:00
  expect(manilaToday(eightAmManila)).toBe('2026-09-02')

  // And the last minute of a Manila day is still that day.
  const lateManila = new Date('2026-09-02T15:59:00Z') // 23:59 +08:00
  expect(manilaToday(lateManila)).toBe('2026-09-02')

  // One minute later is the next Manila day.
  const rollover = new Date('2026-09-02T16:00:00Z') // 00:00 +08:00 on the 3rd
  expect(manilaToday(rollover)).toBe('2026-09-03')

  expect(manilaToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

test('publishing refuses an unusable amount and an unexplained change', async () => {
  const source = await readFile('src/views/admin/DeliveryRateControl.jsx', 'utf8')

  // The refusal is checked before anything is sent.
  expect(source).toContain('const amountMinor = pesoInputToMinor(priceEdit.amount)')
  expect(source).toContain("if (!amountMinor) { setError('Enter a delivery cost greater than zero.'); return }")
  // A rate change without a recorded reason cannot be explained after the fact.
  expect(source).toContain('priceEdit.reason.trim().length < 10')
})

test('a published rate is complete, owner-approved, and cannot be backdated', async () => {
  const source = await readFile('src/views/admin/DeliveryRateControl.jsx', 'utf8')

  // delivery_cost_rows refuses an ACTIVE_APPROVED row that is not both complete
  // and owner-approved, so the client must send exactly that or the write fails.
  expect(source).toContain("completeness: 'PROVIDER_TOTAL_COMPLETE'")
  expect(source).toContain('approvedByOwner: true')
  // Backdating an interval would silently reprice orders already quoted.
  expect(source).toContain('min={manilaToday()}')
})

test('raising a price opens a new row instead of editing the current one', async () => {
  const source = await readFile('src/views/admin/DeliveryRateControl.jsx', 'utf8')

  // Append-only is what keeps an accepted quote explainable.
  expect(source).toContain('Raising a price never edits a row')
  expect(source).toContain('Orders already quoted keep the fee they were given')
  expect(source).toContain('publishDeliveryCostBff')
  expect(source).not.toMatch(/updateDeliveryCost|editDeliveryCost|patchDeliveryCost/)
})

test('money is displayed through the shared formatter', async () => {
  const source = await readFile('src/views/admin/DeliveryRateControl.jsx', 'utf8')

  // Display goes through one formatter, so there is one rounding rule on screen.
  expect(source).toContain('formatDeliveryFee')
  // The single toFixed(2) is the edit-input prefill, not a display string. It
  // must stay attached to `amount`, the field pesoInputToMinor later reads.
  const fixedUses = source.match(/toFixed\(2\)/g) ?? []
  expect(fixedUses).toHaveLength(1)
  expect(source).toContain('amount: (row.amountMinor / 100).toFixed(2)')
})

test('re-opening a published rate round-trips to the same centavos', () => {
  // The edit form prefills with (amountMinor / 100).toFixed(2) and republishes
  // through pesoInputToMinor. If that round-trip lost a centavo, simply opening
  // a rate and saving it unchanged would quietly move the customer's fee.
  for (const minor of [1, 5, 99, 8500, 9515, 10550, 267, 123450, 1_000_000]) {
    const prefilled = (minor / 100).toFixed(2)
    expect(pesoInputToMinor(prefilled), `round trip failed for ${minor}`).toBe(minor)
  }
})

test('the extracted helpers have exactly one definition each', async () => {
  const [component, helpers] = await Promise.all([
    readFile('src/views/admin/DeliveryRateControl.jsx', 'utf8'),
    readFile('src/views/admin/deliveryRateFormat.js', 'utf8'),
  ])

  // The component imports them; it must not carry a stale private copy that
  // silently wins over the tested one.
  expect(component).toContain("import { manilaToday, pesoInputToMinor } from './deliveryRateFormat'")
  expect(component).not.toContain('function manilaToday(')
  expect(component).not.toContain('function pesoInputToMinor(')
  expect(helpers).toContain('export function manilaToday')
  expect(helpers).toContain('export function pesoInputToMinor')
})
