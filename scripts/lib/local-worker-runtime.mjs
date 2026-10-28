import { createConnection } from 'node:net'
import { withAuthorityScope } from '../../server/privacy-authority/bounds.js'

function bounded(action, timeoutMs) {
  return withAuthorityScope(scope => scope.io(action), { deadlineMs: timeoutMs })
}
export const localRuntimeIo = (action, { timeoutMs = 9000 } = {}) => bounded(action, timeoutMs)
export const waitForLocalRuntime = (owned, { timeoutMs = 5000 } = {}) => bounded(() => owned.ready, timeoutMs)

// Bound startup before entering the operation so a hung ready promise cannot
// prevent the finally path from attempting disposal and retaining uncertainty.
export async function withLocalRuntimeReady(owned, operation, { timeoutMs = 5000, probe, onStop } = {}) {
  try { await waitForLocalRuntime(owned, { timeoutMs }); return await operation(owned) }
  finally {
    const shutdown = await stopLocalRuntime(owned, { timeoutMs, probe })
    onStop?.(shutdown)
    if (!shutdown.ok) throw Object.assign(new Error('OWNED_LOCAL_RUNTIME_STOP_UNVERIFIED'), { shutdown })
  }
}
function probeRefusal(host, port) {
  return new Promise((resolveStop, rejectStop) => {
    const socket = createConnection({ host, port })
    socket.setTimeout(1000)
    socket.once('connect', () => { socket.destroy(); rejectStop(new Error('Owned local runtime still accepts connections')) })
    socket.once('timeout', () => { socket.destroy(); rejectStop(new Error('Owned local runtime shutdown port check timed out')) })
    socket.once('error', error => { socket.destroy(); error.code === 'ECONNREFUSED' ? resolveStop() : rejectStop(error) })
  })
}

// Always attempt disposal, including startup rejection/hang. A receipt with
// unknown port, failed disposal or failed probe is never a successful stop.
export async function stopLocalRuntime(owned, { timeoutMs = 5000, probe = probeRefusal } = {}) {
  const result = { readyObserved: false, disposed: false, portRefused: false, ok: false }
  try {
    const url = new URL(await bounded(() => owned.ready, timeoutMs))
    const port = Number(url.port)
    if (url.hostname !== '127.0.0.1' || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Owned runtime must identify its loopback port')
    result.host = url.hostname; result.port = port; result.readyObserved = true
  } catch (error) { result.startupError = error.message }
  try { await bounded(() => owned.dispose(), timeoutMs); result.disposed = true }
  catch (error) { result.disposeError = error.message }
  if (result.readyObserved && result.disposed) {
    try { await bounded(() => probe(result.host, result.port), timeoutMs); result.portRefused = true }
    catch (error) { result.probeError = error.message }
  }
  result.ok = result.readyObserved && result.disposed && result.portRefused
  return result
}
