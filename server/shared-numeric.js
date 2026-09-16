// Single shared strict-numeric boundary for both BFFs (MAP-019 F-019-002).
//
// JSON has no integer/float distinction at the boundary, so bare Number()
// coerces booleans (Number(true) === 1), blank strings, empty arrays and null
// into seemingly valid values. Only genuine numbers and canonical numeric
// strings (optional leading minus, digits, one optional decimal fraction) are
// accepted; anything else is rejected with the caller's error code rather
// than coerced. Hex, exponents and surrounding-word forms such as "0x10" or
// "1e3" are not canonical and are rejected.
//
// The module is dependency-free so server/admin-bff, server/storefront-bff
// and contract specs can all import it without side effects.
const CANONICAL = /^-?\d+(\.\d+)?$/

export function strictNumeric(value, code, { min = 0, max = 10000000 } = {}) {
  if (typeof value === 'boolean' || value === null || value === undefined) throw new Error(code)
  const text = typeof value === 'string' ? value.trim() : value
  if (typeof text !== 'number' && (typeof text !== 'string' || !CANONICAL.test(text))) {
    throw new Error(code)
  }
  const result = typeof text === 'number' ? text : Number(text)
  if (!Number.isFinite(result) || result < min || result > max) throw new Error(code)
  return result
}

export function strictInteger(value, code, { min = 0, max = 10000000 } = {}) {
  const result = strictNumeric(value, code, { min, max })
  if (!Number.isInteger(result)) throw new Error(code)
  return result
}
