import { supabase } from './supabaseClient'

// Best-effort error reporting. This must NEVER throw — a failure to report an
// error should never surface to the user or break the app.

let lastKey = ''
let lastTime = 0

/**
 * Log an error to the console and (best-effort) to the Supabase `error_reports`
 * table. Safe to call from anywhere. Deduplicates identical errors within 5s.
 */
export async function reportError(error, context = {}) {
  try {
    const message = error?.message || String(error || 'Unknown error')
    const stack = error?.stack || null

    // De-dupe identical bursts (e.g. a render loop) so we don't flood the table
    const key = message + '|' + JSON.stringify(context)
    const now = Date.now()
    if (key === lastKey && now - lastTime < 5000) return
    lastKey = key
    lastTime = now

    // Always visible in the console
    console.error('[reportError]', message, context, error)

    if (!supabase) return
    await supabase.from('error_reports').insert({
      message: String(message).slice(0, 2000),
      stack: stack ? String(stack).slice(0, 8000) : null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      context,
    })
  } catch (_) {
    // Swallow — reporting must never break the app.
  }
}

/** Attach global handlers once, so uncaught errors and promise rejections are logged. */
export function installErrorReporting() {
  if (typeof window === 'undefined' || window.__k2ErrorReporting) return
  window.__k2ErrorReporting = true

  window.addEventListener('error', (e) => {
    reportError(e.error || e.message, { kind: 'window.onerror', source: e.filename })
  })
  window.addEventListener('unhandledrejection', (e) => {
    reportError(e.reason, { kind: 'unhandledrejection' })
  })
}
