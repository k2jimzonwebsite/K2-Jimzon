import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  JNT_VIP_BULK_HEADERS,
  JNT_EXPRESS_TYPES,
  normalizePhilippinePhone,
  escapeCsvField,
  parseRecipientAddress,
  formatJntSmartAddress,
  extractJntOrderDetails,
  generateJntVipBulkCsv,
  validateJntTrackingNumber,
} from '../src/lib/jntVipBulkEngine.js'

test('J&T VIP bulk headers match the 13 required contractual template columns', () => {
  expect(JNT_VIP_BULK_HEADERS.length).toBe(13)
  expect(JNT_VIP_BULK_HEADERS[0]).toBe('Receiver(*)')
  expect(JNT_VIP_BULK_HEADERS[1]).toBe('Receiver Telephone (*)')
  expect(JNT_VIP_BULK_HEADERS[2]).toBe('Receiver Address (*)')
  expect(JNT_VIP_BULK_HEADERS[3]).toBe('Receiver Province (*)')
  expect(JNT_VIP_BULK_HEADERS[4]).toBe('Receiver City (*)')
  expect(JNT_VIP_BULK_HEADERS[5]).toBe('Receiver Region (*)')
  expect(JNT_VIP_BULK_HEADERS[6]).toBe('Express Type (*)')
  expect(JNT_VIP_BULK_HEADERS[7]).toBe('Parcel Name (*)')
  expect(JNT_VIP_BULK_HEADERS[8]).toBe('Weight (kg) (*)')
  expect(JNT_VIP_BULK_HEADERS[9]).toBe('Total parcels(*)')
  expect(JNT_VIP_BULK_HEADERS[10]).toBe('Parcel Value (Insurance Fee) (*)')
  expect(JNT_VIP_BULK_HEADERS[11]).toBe('COD (PHP) (*)')
  expect(JNT_VIP_BULK_HEADERS[12]).toBe('Remarks')
})

test('Philippine phone normalizer produces standard 11-digit mobile strings', () => {
  expect(normalizePhilippinePhone('09171234567')).toBe('09171234567')
  expect(normalizePhilippinePhone('+63 917 123 4567')).toBe('09171234567')
  expect(normalizePhilippinePhone('639171234567')).toBe('09171234567')
  expect(normalizePhilippinePhone('9171234567')).toBe('09171234567')
  expect(normalizePhilippinePhone('0917-123-4567')).toBe('09171234567')
  expect(normalizePhilippinePhone('')).toBe('')
})

test('CSV field escaping handles quotes, commas, and newlines', () => {
  expect(escapeCsvField('Simple Text')).toBe('"Simple Text"')
  expect(escapeCsvField('Text with, comma')).toBe('"Text with, comma"')
  expect(escapeCsvField('Text with "quotes"')).toBe('"Text with ""quotes"""')
  expect(escapeCsvField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"')
})

test('smart address formatting generates clean J&T auto-recognition strings', () => {
  const sampleOrder = {
    customer: 'Maria Santos',
    phone: '+63 918 555 1234',
    address: 'Unit 402 Jade Tower, Brgy. San Antonio, Pasig City, Metro Manila',
  }

  const formatted = formatJntSmartAddress(sampleOrder)
  expect(formatted).toContain('Maria Santos')
  expect(formatted).toContain('09185551234')
  expect(formatted).toContain('Pasig City')
  expect(formatted).toContain('Metro Manila')
})

test('single order detail extraction maps correctly to J&T VIP form fields', () => {
  const sampleOrder = {
    id: 'ord-123',
    public_reference: 'WEB-D48394',
    customer: 'Juan Dela Cruz',
    phone: '09954293545',
    address: '123 Mahogany St, Brgy Holy Spirit, Quezon City, Metro Manila',
    total_amount: 1590,
    subtotal: 1495,
    payment_method: 'gcash',
    fulfillment_method: 'standard',
    lines: [
      { product: { name: 'Lavazza Oro', net_weight: '1 kg' }, qty: 1 },
      { product: { name: 'Pesto Genovese', net_weight: '190 g' }, qty: 2 },
    ],
  }

  const details = extractJntOrderDetails(sampleOrder)
  expect(details.receiverName).toBe('Juan Dela Cruz')
  expect(details.receiverPhone).toBe('09954293545')
  expect(details.expressType).toBe(JNT_EXPRESS_TYPES.EZ)
  expect(details.codAmount).toBe('0.00')
  expect(details.itemValue).toBe('1495.00')
  expect(details.remarks).toBe('K2 Jimzon WEB-D48394')
  expect(Number(details.itemWeight)).toBeGreaterThan(1.0)
})

test('bulk CSV generator outputs valid 13-column rows with UTF-8 BOM', () => {
  const sampleOrders = [
    {
      id: 'ord-1',
      public_reference: 'WEB-001',
      customer: 'Alpha Client',
      phone: '09171111111',
      address: 'Bulacan, San Jose Del Monte, Muzon, Phase 1',
      total_amount: 850,
      subtotal: 755,
      payment_method: 'cod',
      fulfillment_method: 'standard',
    },
    {
      id: 'ord-2',
      public_reference: 'WEB-002',
      customer: 'Beta Client',
      phone: '09182222222',
      address: 'Makati City, Bel-Air, 55 Jupiter St',
      total_amount: 2100,
      subtotal: 2005,
      payment_method: 'gcash',
      fulfillment_method: 'express',
    },
  ]

  const csv = generateJntVipBulkCsv(sampleOrders)

  // Must start with UTF-8 BOM
  expect(csv.charCodeAt(0)).toBe(0xfeff)

  const lines = csv.replace(/^\uFEFF/, '').trim().split('\r\n')
  expect(lines.length).toBe(3) // Header + 2 rows

  // Assert header columns
  const headerCols = lines[0].split(',')
  expect(headerCols.length).toBe(13)

  // Assert row 1 (COD)
  expect(lines[1]).toContain('"Alpha Client"')
  expect(lines[1]).toContain('"09171111111"')
  expect(lines[1]).toContain('"850.00"') // COD amount

  // Assert row 2 (Prepaid, Express)
  expect(lines[2]).toContain('"Beta Client"')
  expect(lines[2]).toContain('"09182222222"')
  expect(lines[2]).toContain('"0.00"') // COD 0
  expect(lines[2]).toContain('"J&T Super"') // Express
})

test('J&T tracking number validator distinguishes valid barcodes from invalid input', () => {
  // Valid formats
  expect(validateJntTrackingNumber('PH260123456789').valid).toBe(true)
  expect(validateJntTrackingNumber('780123456789').valid).toBe(true)
  expect(validateJntTrackingNumber(' ph260123456789 ').normalized).toBe('PH260123456789')

  // Invalid formats
  expect(validateJntTrackingNumber('').valid).toBe(false)
  expect(validateJntTrackingNumber('12345').valid).toBe(false)
  expect(validateJntTrackingNumber('TRACKING-WITH-DASH!').valid).toBe(false)
})

test('anti-emoji and humanizer voice rules hold for jntVipBulkEngine', async () => {
  const content = await readFile('src/lib/jntVipBulkEngine.js', 'utf8')
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
  const emDashRegex = /\u2014/

  expect(emojiRegex.test(content)).toBe(false)
  expect(emDashRegex.test(content)).toBe(false)
})
