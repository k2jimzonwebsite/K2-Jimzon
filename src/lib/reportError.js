import { fetchWithTimeout } from './fetchWithTimeout.js'

// Browser failures use only the protected Admin BFF when it is explicitly
// enabled. Never write raw errors, stacks, URLs, user agents, or arbitrary
// context directly from a browser to an operational table.

let lastKey = ''
let lastTime = 0

const SAFE_KINDS = new Set(['react-boundary', 'window-error', 'unhandled-rejection'])

export function safeErrorEvent(context = {}) {
  const kind = SAFE_KINDS.has(context.kind) ? context.kind : 'browser-error'
  const pathname = typeof window !== 'undefined' ? String(window.location?.pathname || '/').slice(0, 300) : '/'
  return Object.freeze({ code: 'UI_SECTION_UNAVAILABLE', kind, pathname })
}

function csrfToken() {
  const match=String(document.cookie||'').split('; ')
    .find((entry)=>entry.startsWith('k2_admin_csrf='))
  return match?decodeURIComponent(match.slice('k2_admin_csrf='.length)):''
}

async function sendSafeAdminBrowserEvent(event) {
  if (!__K2_ADMIN_BUILD__) return
  if (String(import.meta.env?.VITE_ADMIN_BFF_ENABLED||'').toLowerCase()!=='true') return
  const csrf=csrfToken()
  if (!csrf||typeof crypto?.randomUUID!=='function') return
  try {
    await fetchWithTimeout('/api/admin/security-events',{
      method:'POST',credentials:'include',headers:{
        Accept:'application/json','Content-Type':'application/json',
        'X-K2-CSRF':csrf,'X-K2-Idempotency-Key':crypto.randomUUID(),
      },body:JSON.stringify({ code:event.code,kind:event.kind }),
    },3000)
  } catch {
    // Telemetry must never cause another visible failure or retry loop.
  }
}

/** Best-effort local reporting. This function must never throw. */
export async function reportError(error, context = {}) {
  try {
    const event = safeErrorEvent(context)
    const key = `${event.code}|${event.kind}|${event.pathname}`
    const now = Date.now()
    if (key === lastKey && now - lastTime < 5000) return event
    lastKey = key
    lastTime = now

    if (import.meta.env?.DEV) console.error('[K2 browser error]', event, error)
    else console.error('[K2 browser error]', event)
    await sendSafeAdminBrowserEvent(event)
    return event
  } catch {
    return Object.freeze({ code: 'UI_SECTION_UNAVAILABLE', kind: 'browser-error', pathname: '/' })
  }
}

/** Attach global handlers once and retain only safe event classifications. */
export function installErrorReporting() {
  if (typeof window === 'undefined' || window.__k2ErrorReporting) return
  window.__k2ErrorReporting = true

  window.addEventListener('error', (event) => {
    reportError(event.error, { kind: 'window-error' })
  })
  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, { kind: 'unhandled-rejection' })
  })
}
