function pending() { return Object.assign(new Error('AUTHORITY_PENDING'), { code: 'AUTHORITY_PENDING' }) }

export async function withAuthorityScope(operation, { deadlineMs = 9000, signal, deadlineAt: inheritedDeadline } = {}) {
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 9000
    || inheritedDeadline !== undefined && !Number.isFinite(inheritedDeadline)) throw new Error('COMMAND_INVALID')
  if (signal?.aborted) throw pending()
  const deadlineAt = Math.min(performance.now() + deadlineMs, inheritedDeadline ?? Infinity)
  let expired = false, rejectBound
  const controller = new AbortController(), timeout = new Promise((_resolve, reject) => { rejectBound = reject })
  const cancel = () => { expired = true; controller.abort(); rejectBound(pending()) }
  // A synchronous adapter or a microtask chain can prevent the timer callback
  // from running. Check the host-observable monotonic clock at each boundary.
  const check = () => {
    if (!expired && performance.now() >= deadlineAt) cancel()
    if (expired) throw pending()
  }
  timeout.catch(() => {}) // A pre-I/O check may reject before a race is attached.
  const timer = setTimeout(cancel, Math.max(0, deadlineAt - performance.now()))
  signal?.addEventListener('abort', cancel, { once: true })
  const scope = { signal: controller.signal, deadlineAt, check,
    remainingMs() { check(); return Math.max(0, deadlineAt - performance.now()) }, async io(action) {
    check()
    const value = await Promise.race([Promise.resolve().then(() => {
      check()
      return action()
    }), timeout])
    check()
    return value
  } }
  try { return await scope.io(() => operation(scope)) }
  finally { expired = true; controller.abort(); clearTimeout(timer); signal?.removeEventListener('abort', cancel) }
}
