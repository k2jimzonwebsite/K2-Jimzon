export class RequestTimeoutError extends Error {
  constructor() {
    super('REQUEST_TIMEOUT')
    this.name = 'RequestTimeoutError'
  }
}

export function isRequestTimeoutError(error) {
  return error?.name === 'RequestTimeoutError'
}

const RETRYABLE_READ_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

function abortError(signal) {
  if (signal?.reason instanceof Error) return signal.reason
  return new DOMException('aborted', 'AbortError')
}

function abortableDelay(delayMs, signal) {
  if (signal?.aborted) return Promise.reject(abortError(signal))
  return new Promise((resolve, reject) => {
    const timer = setTimeout(finish, delayMs)
    function finish() {
      signal?.removeEventListener('abort', cancel)
      resolve()
    }
    function cancel() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', cancel)
      reject(abortError(signal))
    }
    signal?.addEventListener('abort', cancel, { once: true })
  })
}

function retryAfterMs(response, nowMs) {
  const value = response.headers?.get?.('Retry-After')
  if (!value) return 0
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const dateMs = Date.parse(value)
  return Number.isFinite(dateMs) ? Math.max(0, dateMs - nowMs) : 0
}

function retryDelay(response, attempt, { baseDelayMs, maxDelayMs, random, now }) {
  const exponentialCap = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)))
  const jittered = Math.round(exponentialCap * (0.5 + random()))
  const serverDelay = response ? retryAfterMs(response, now()) : 0
  if (serverDelay > maxDelayMs) return null
  return Math.min(maxDelayMs, Math.max(jittered, serverDelay))
}

function retryableReadError(error) {
  return isRequestTimeoutError(error) || error instanceof TypeError
}

export async function fetchWithTimeout(input, init = {}, timeoutMs = 10000) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120000) {
    throw new TypeError('REQUEST_TIMEOUT_INVALID')
  }

  const controller = new AbortController()
  const upstream = init.signal
  let timedOut = false
  const abortFromUpstream = () => controller.abort(upstream?.reason)

  if (upstream?.aborted) abortFromUpstream()
  else upstream?.addEventListener('abort', abortFromUpstream, { once: true })

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (timedOut) throw new RequestTimeoutError()
    throw error
  } finally {
    clearTimeout(timer)
    upstream?.removeEventListener('abort', abortFromUpstream)
  }
}

export async function fetchReadWithRetry(input, init = {}, options = {}) {
  const method = String(init.method || 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') throw new TypeError('READ_RETRY_METHOD_UNSAFE')

  const {
    timeoutMs = 10000,
    maxAttempts = 3,
    baseDelayMs = 200,
    maxDelayMs = 2000,
    random = Math.random,
    now = Date.now,
  } = options
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) {
    throw new TypeError('READ_RETRY_ATTEMPTS_INVALID')
  }
  if (!Number.isInteger(baseDelayMs) || baseDelayMs < 1 ||
      !Number.isInteger(maxDelayMs) || maxDelayMs < baseDelayMs || maxDelayMs > 10000) {
    throw new TypeError('READ_RETRY_DELAY_INVALID')
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(input, { ...init, method }, timeoutMs)
      if (!RETRYABLE_READ_STATUSES.has(response.status) || attempt === maxAttempts) return response
      const delayMs = retryDelay(response, attempt, { baseDelayMs, maxDelayMs, random, now })
      if (delayMs === null) return response
      if (response.body) await response.body.cancel().catch(() => undefined)
      await abortableDelay(delayMs, init.signal)
    } catch (error) {
      if (error?.name === 'AbortError' || !retryableReadError(error) || attempt === maxAttempts) throw error
      const delayMs = retryDelay(null, attempt, { baseDelayMs, maxDelayMs, random, now })
      await abortableDelay(delayMs, init.signal)
    }
  }

  throw new Error('READ_RETRY_EXHAUSTED')
}
