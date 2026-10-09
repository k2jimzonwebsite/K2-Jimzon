import { AsyncLocalStorage } from 'node:async_hooks'
import { safeJson } from './security.js'

export const FULFILLMENT_REQUEST_DEADLINE_MS = 30_000
const requests = new AsyncLocalStorage()

export function currentAdminRequestSignal() {
  return requests.getStore()?.signal
}

export function adminRequestFetch(signal) {
  return (input, init = {}) => {
    signal.throwIfAborted()
    const signals = [signal, init.signal, input?.signal].filter(Boolean)
    return globalThis.fetch(input, { ...init, signal: AbortSignal.any(signals) })
  }
}

// Cancellation cannot establish whether a submitted database command committed.
// The caller must reconcile/retry with its original idempotency key.
export async function withFulfillmentDeadline(res, operation, milliseconds = FULFILLMENT_REQUEST_DEADLINE_MS) {
  const controller = new AbortController()
  let closed = false
  let timer
  const guarded = new Proxy(res, {
    set(target, key, value) {
      if (!closed) Reflect.set(target, key, value)
      return true
    },
    get(target, key) {
      const value = Reflect.get(target, key)
      if (typeof value !== 'function') return value
      return (...args) => closed ? undefined : value.apply(target, args)
    },
  })
  const timeout = new Promise(resolve => {
    timer = setTimeout(() => {
      closed = true
      controller.abort(new DOMException('FULFILLMENT_REQUEST_TIMEOUT', 'AbortError'))
      safeJson(res, 503, { error: { code: 'REQUEST_TIMEOUT' } }, { 'Retry-After': '1' })
      resolve(undefined)
    }, milliseconds)
  })
  try {
    return await Promise.race([
      requests.run({ signal: controller.signal }, () => operation(guarded)),
      timeout,
    ])
  } finally {
    closed = true
    clearTimeout(timer)
    controller.abort()
  }
}
