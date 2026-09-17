/**
 * J&T VIP Courier Booking and Bulk Dispatch Engine (MAP-023)
 *
 * Implements courier data formatting and CSV template generation matching
 * the official J&T Express Philippines VIP portal (vip.jtexpress.ph):
 *
 * 1. Single-order Smart Recognition syntax:
 *    "[Name], [Phone], [Street Address], [Barangay], [City], [Province]"
 *    compatible with J&T's address auto-resolve input.
 *
 * 2. Official 13-column bulk import template:
 *    Receiver(*), Receiver Telephone (*), Receiver Address (*),
 *    Receiver Province (*), Receiver City (*), Receiver Region (*),
 *    Express Type (*), Parcel Name (*), Weight (kg) (*), Total parcels(*),
 *    Parcel Value (Insurance Fee) (*), COD (PHP) (*), Remarks
 *
 * 3. Chargeable weight and parcel calculations derived from K2 shipping calculator.
 */

import { calculateCartPackedWeightG } from './cartShippingCalculator.js'

export const JNT_VIP_BULK_HEADERS = Object.freeze([
  'Receiver(*)',
  'Receiver Telephone (*)',
  'Receiver Address (*)',
  'Receiver Province (*)',
  'Receiver City (*)',
  'Receiver Region (*)',
  'Express Type (*)',
  'Parcel Name (*)',
  'Weight (kg)  (*)',
  'Total parcels(*)',
  'Parcel Value (Insurance Fee) (*)',
  'COD (PHP) (*)',
  'Remarks',
])

export const JNT_EXPRESS_TYPES = Object.freeze({
  EZ: 'EZ',
  SUPER: 'J&T Super',
})

/**
 * Normalizes a Philippine phone number into the standard 11-digit mobile format (09xxxxxxxxx).
 *
 * @param {string} phone
 * @returns {string}
 */
export function normalizePhilippinePhone(phone) {
  if (!phone || typeof phone !== 'string') return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('639') && digits.length === 12) {
    return `0${digits.slice(2)}`
  }
  if (digits.startsWith('9') && digits.length === 10) {
    return `0${digits}`
  }
  if (digits.startsWith('09') && digits.length === 11) {
    return digits
  }
  return digits || phone.trim()
}

/**
 * Cleans and escapes a text field for safe inclusion in a CSV file.
 *
 * @param {string|number} value
 * @returns {string}
 */
export function escapeCsvField(value) {
  if (value == null) return '""'
  const str = String(value).trim()
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return `"${str}"`
}

/**
 * Derives structured recipient location elements from an address object or freeform string.
 *
 * @param {object|string} address
 * @returns {{ province: string, city: string, barangay: string, street: string }}
 */
export function parseRecipientAddress(address) {
  if (!address) {
    return { province: '', city: '', barangay: '', street: '' }
  }

  if (typeof address === 'object') {
    const province = (address.province || address.region || '').trim()
    const city = (address.city || address.municipality || '').trim()
    const barangay = (address.barangay || address.brgy || address.district || '').trim()
    const street = (address.street || address.line1 || address.address || '').trim()
    return { province, city, barangay, street }
  }

  const text = String(address).trim()
  const parts = text.split(',').map((p) => p.trim()).filter(Boolean)

  if (parts.length >= 4) {
    const province = parts[parts.length - 1]
    const city = parts[parts.length - 2]
    const barangay = parts[parts.length - 3]
    const street = parts.slice(0, parts.length - 3).join(', ')
    return { province, city, barangay, street }
  }

  if (parts.length === 3) {
    const isSecondBarangay = parts[1].toLowerCase().includes('brgy') || parts[1].toLowerCase().includes('barangay')
    if (isSecondBarangay) {
      return {
        province: 'Metro Manila',
        city: parts[2],
        barangay: parts[1],
        street: parts[0],
      }
    }
    return {
      province: parts[2],
      city: parts[1],
      barangay: '',
      street: parts[0],
    }
  }

  return {
    province: '',
    city: '',
    barangay: '',
    street: text,
  }
}

/**
 * Formats recipient information into J&T VIP Smart Recognition format.
 * Can be pasted directly into J&T's auto-recognition address box.
 *
 * @param {object} order - Order object containing customer, phone, address
 * @returns {string}
 */
export function formatJntSmartAddress(order) {
  if (!order) return ''
  const name = (order.customer || order.customer_name || order.receiver_name || '').trim()
  const rawPhone = order.phone || order.customer_phone || order.receiver_phone || ''
  const phone = normalizePhilippinePhone(rawPhone)
  const addr = parseRecipientAddress(order.address || order.delivery_address || order.shipping_address)

  const components = [name, phone]
  if (addr.street) components.push(addr.street)
  if (addr.barangay) components.push(addr.barangay.startsWith('Brgy') ? addr.barangay : `Brgy. ${addr.barangay}`)
  if (addr.city) components.push(addr.city)
  if (addr.province && addr.province.toLowerCase() !== addr.city.toLowerCase()) {
    components.push(addr.province)
  }

  return components.filter(Boolean).join(', ')
}

/**
 * Extracts normalized J&T VIP booking details for a single order.
 * Matches the fields shown in J&T VIP's "Create Waybill" screen.
 *
 * @param {object} order
 * @returns {object}
 */
export function extractJntOrderDetails(order) {
  if (!order) {
    return {
      receiverName: '',
      receiverPhone: '',
      receiverAddress: '',
      receiverProvince: '',
      receiverCity: '',
      receiverBarangay: '',
      smartAddress: '',
      expressType: JNT_EXPRESS_TYPES.EZ,
      itemName: 'Italian Food Provisions',
      itemWeight: '1.00',
      totalParcels: 1,
      itemValue: '0.00',
      codAmount: '0.00',
      remarks: '',
    }
  }

  const name = (order.customer || order.customer_name || order.receiver_name || '').trim()
  const rawPhone = order.phone || order.customer_phone || order.receiver_phone || ''
  const phone = normalizePhilippinePhone(rawPhone)
  const addr = parseRecipientAddress(order.address || order.delivery_address || order.shipping_address)
  const smartAddress = formatJntSmartAddress(order)

  // Calculate weight from lines if present
  const lines = order.lines || order.items || []
  const totalWeightG = lines.length > 0 ? calculateCartPackedWeightG(lines) : (Number(order.weight_g) || 1000)
  const weightKg = (Math.max(500, totalWeightG) / 1000).toFixed(2)

  // Calculate parcel count
  const totalParcels = Math.max(1, Math.ceil(totalWeightG / 10000))

  // Determine express type
  const method = String(order.fulfillment_method || order.fulfillmentMethod || '').toLowerCase()
  const isSuper = method.includes('express') || method.includes('super')
  const expressType = isSuper ? JNT_EXPRESS_TYPES.SUPER : JNT_EXPRESS_TYPES.EZ

  // Financial values
  const totalAmount = Number(order.total_amount ?? order.total ?? 0)
  const subtotal = Number(order.subtotal ?? totalAmount)
  const note = String(order.customer_note || order.note || '').toLowerCase()
  const paymentEvidence = order.payment_evidence && typeof order.payment_evidence === 'object' ? order.payment_evidence : {}
  const rawMethod = String(order.payment_method || order.paymentMethod || paymentEvidence.payment_method || '').toLowerCase()
  const isCod = rawMethod === 'cod' || note.includes('cash on delivery') || note.includes('[payment: cod]') || note.includes('[payment: cash on delivery')
  const codAmount = isCod ? totalAmount.toFixed(2) : '0.00'
  const itemValue = Math.max(0, subtotal).toFixed(2)

  // Remarks
  const ref = (order.public_reference || order.publicReference || order.id || '').trim()
  const remarks = ref ? `K2 Jimzon ${ref}` : 'K2 Jimzon Order'

  return {
    receiverName: name,
    receiverPhone: phone,
    receiverAddress: addr.street || smartAddress,
    receiverProvince: addr.province || 'Metro Manila',
    receiverCity: addr.city || 'Manila',
    receiverBarangay: addr.barangay || '',
    smartAddress,
    expressType,
    itemName: 'Italian Food Provisions',
    itemWeight: weightKg,
    totalParcels,
    itemValue,
    codAmount,
    remarks,
  }
}

/**
 * Generates an official J&T VIP bulk import CSV string for a list of orders.
 * Matches the 13 required columns in J&T VIP's "Create Waybills In Bulk" upload tool.
 *
 * @param {Array<object>} orders - Array of order objects
 * @returns {string} CSV formatted content with UTF-8 BOM
 */
export function generateJntVipBulkCsv(orders = []) {
  const headerLine = JNT_VIP_BULK_HEADERS.map(escapeCsvField).join(',')

  if (!Array.isArray(orders) || orders.length === 0) {
    return `\uFEFF${headerLine}\r\n`
  }

  const rows = orders.map((order) => {
    const details = extractJntOrderDetails(order)

    // J&T VIP bulk columns in exact contractual order:
    // 1. Receiver(*)
    // 2. Receiver Telephone (*)
    // 3. Receiver Address (*)
    // 4. Receiver Province (*)
    // 5. Receiver City (*)
    // 6. Receiver Region (*) [Barangay in PH]
    // 7. Express Type (*)
    // 8. Parcel Name (*)
    // 9. Weight (kg) (*)
    // 10. Total parcels(*)
    // 11. Parcel Value (Insurance Fee) (*)
    // 12. COD (PHP) (*)
    // 13. Remarks
    const columns = [
      escapeCsvField(details.receiverName),
      escapeCsvField(details.receiverPhone),
      escapeCsvField(details.receiverAddress),
      escapeCsvField(details.receiverProvince),
      escapeCsvField(details.receiverCity),
      escapeCsvField(details.receiverBarangay),
      escapeCsvField(details.expressType),
      escapeCsvField(details.itemName),
      escapeCsvField(details.itemWeight),
      escapeCsvField(details.totalParcels),
      escapeCsvField(details.itemValue),
      escapeCsvField(details.codAmount),
      escapeCsvField(details.remarks),
    ]

    return columns.join(',')
  })

  return `\uFEFF${headerLine}\r\n${rows.join('\r\n')}\r\n`
}

/**
 * Generates an official J&T VIP bulk import CSV string for a single order.
 * Enables 1-click batch upload even for individual orders.
 *
 * @param {object} order - Order object
 * @returns {string} CSV formatted content with UTF-8 BOM
 */
export function generateJntVipSingleOrderCsv(order) {
  if (!order) return generateJntVipBulkCsv([])
  return generateJntVipBulkCsv([order])
}

/**
 * Validates and normalizes a scanned or entered J&T waybill tracking number.
 *
 * @param {string} tracking
 * @returns {{ valid: boolean, normalized: string, error?: string }}
 */
export function validateJntTrackingNumber(tracking) {
  if (!tracking || typeof tracking !== 'string') {
    return { valid: false, normalized: '', error: 'Tracking number is required' }
  }

  const clean = tracking.trim().toUpperCase()

  if (clean.length < 8) {
    return { valid: false, normalized: clean, error: 'Tracking number is too short' }
  }

  // Common J&T formats: starts with PH followed by numbers/alphanumeric, or 12-digit numeric
  const jntPattern = /^(?:PH[A-Z0-9]{8,16}|[0-9]{10,16})$/i
  if (!jntPattern.test(clean)) {
    return { valid: false, normalized: clean, error: 'Invalid J&T tracking format (expected PH... or 10 to 16 digits)' }
  }

  return { valid: true, normalized: clean }
}
