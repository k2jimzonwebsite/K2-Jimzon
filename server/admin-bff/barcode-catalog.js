const BASE = 'https://world.openfoodfacts.org'
const USER_AGENT = 'K2Jimzon/1.0 (https://www.k2jimzon.com/contact)'

export function isPackageBarcode(value) {
  const code = String(value || '').trim()
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return false
  const digits = [...code].map(Number)
  const check = digits.pop()
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0)
  return (10 - sum % 10) % 10 === check
}

const clean = (value, limit) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit)

export async function lookupBarcodeCatalog(value, { fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  const barcode = String(value || '').trim()
  if (!isPackageBarcode(barcode)) throw new Error('BARCODE_INVALID')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const url = `${BASE}/api/v2/product/${barcode}.json?fields=code,product_name,brands,quantity`
    const response = await fetchImpl(url, {
      method: 'GET', redirect: 'error', signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    })
    if (!response.ok) throw new Error('CATALOG_UNAVAILABLE')
    const raw = await response.text()
    if (raw.length > 32768) throw new Error('CATALOG_UNAVAILABLE')
    const body = JSON.parse(raw)
    if (body?.status === 0) return { status: 'not_found', barcode, source: 'Open Food Facts' }
    if (body?.status !== 1 || !body.product) throw new Error('CATALOG_UNAVAILABLE')
    if (String(body.product.code || '') !== barcode) throw new Error('CATALOG_MISMATCH')
    const name = clean(body.product.product_name, 140)
    if (!name) return { status: 'not_found', barcode, source: 'Open Food Facts' }
    return {
      status: 'found', barcode, name,
      brand: clean(body.product.brands, 80), quantity: clean(body.product.quantity, 80),
      source: 'Open Food Facts', sourceUrl: `${BASE}/product/${barcode}`,
      license: 'Open Database License (ODbL)', lookedUpAt: new Date().toISOString(),
    }
  } catch (error) {
    if (error?.message === 'CATALOG_MISMATCH') throw error
    throw new Error('CATALOG_UNAVAILABLE')
  } finally {
    clearTimeout(timer)
  }
}
