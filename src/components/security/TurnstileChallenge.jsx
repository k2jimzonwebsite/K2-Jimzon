import { useEffect, useId, useRef, useState } from 'react'
import { mountTurnstileWidget } from '../../lib/turnstileWidget'

let scriptPromise = null

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('TURNSTILE_LOAD_TIMEOUT')), 15000)
    const loaded = () => {
      window.clearTimeout(timeout)
      if (window.turnstile) resolve(window.turnstile)
      else reject(new Error('TURNSTILE_API_MISSING'))
    }
    const failed = () => { window.clearTimeout(timeout); reject(new Error('TURNSTILE_LOAD_FAILED')) }
    const existing = document.querySelector('script[data-k2-turnstile]')
    if (existing) {
      existing.addEventListener('load', loaded, { once: true })
      existing.addEventListener('error', failed, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.k2Turnstile = 'true'
    script.onload = loaded
    script.onerror = failed
    document.head.appendChild(script)
  }).catch(error => {
    scriptPromise = null
    document.querySelector('script[data-k2-turnstile]')?.remove()
    throw error
  })
  return scriptPromise
}

export default function TurnstileChallenge({
  onTokenChange,
  action = 'guest_submission',
  description = 'Complete this check before submitting. It helps us prevent automated spam.',
  enabled: enabledOverride,
  tone = 'storefront',
}) {
  const containerRef = useRef(null)
  const errorId = useId()
  const [error, setError] = useState('')
  const [status, setStatus] = useState('loading')
  const [widgetSize, setWidgetSize] = useState('compact')
  const [attempt, setAttempt] = useState(0)
  const enabled = enabledOverride ?? true
  const adminTone = tone === 'admin'
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

  useEffect(() => {
    const container = containerRef.current
    if (!enabled || !container) return undefined
    const measure = () => setWidgetSize(container.clientWidth < 300 ? 'compact' : 'flexible')
    measure()
    if (typeof ResizeObserver !== 'function') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [enabled])

  useEffect(() => {
    if (!enabled) return undefined
    setError('')
    setStatus('loading')
    onTokenChange('')
    if (!siteKey) {
      setError('The security check is not configured. Please contact K2 Jimzon.')
      setStatus('error')
      onTokenChange('')
      return undefined
    }
    let cancelled = false
    let disposeWidget
    loadTurnstile().then((turnstile) => {
      if (cancelled || !turnstile || !containerRef.current) return
      disposeWidget = mountTurnstileWidget(turnstile, containerRef.current, {
        siteKey, action, size: widgetSize, onToken: onTokenChange,
        onState: state => { setStatus(state.status); setError(state.error) },
      })
    }).catch(() => {
      if (!cancelled) {
        setError('Security check could not load. Check your connection and retry.')
        setStatus('error')
        onTokenChange('')
      }
    })
    return () => {
      cancelled = true
      disposeWidget?.()
    }
  }, [action, enabled, onTokenChange, siteKey, attempt, widgetSize])

  if (!enabled) return null
  return (
    <section aria-labelledby={`${errorId}-label`} aria-describedby={error ? errorId : undefined}
      className={adminTone
        ? 'rounded-adm-sm border border-white/15 bg-black/25 p-3.5'
        : 'mt-4 rounded-xl border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] p-4'}>
      <h3 id={`${errorId}-label`} className={adminTone ? 'text-sm font-bold text-white' : 'text-sm font-semibold text-navy'}>Security check</h3>
      <p className={adminTone ? 'mt-1 text-sm leading-relaxed text-white/65' : 'mt-1 text-sm leading-relaxed text-navy-soft'}>{description}</p>
      <div ref={containerRef} className="mt-3 min-h-16" />
      {status !== 'error' && <p role="status" aria-label="Security check status"
        className={adminTone ? 'mt-2 text-sm text-white/80' : 'mt-2 text-sm text-navy-soft'}>
        {status === 'verified' ? 'Security check complete.' : status === 'interactive' ? 'Complete the check above to continue.' : 'Checking your browser…'}
      </p>}
      {error && <p id={errorId} role="alert" className="mt-2 text-sm text-crimson">{error}</p>}
      {error && siteKey && <button type="button" onClick={() => setAttempt(value => value + 1)}
        className={adminTone
          ? 'mt-2 min-h-11 rounded-adm-sm border border-white/25 px-3 text-sm font-bold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-blue motion-reduce:transition-none'
          : 'mt-2 min-h-11 rounded-lg border border-[var(--store-surface-border)] px-3 text-sm font-semibold text-navy focus-visible:outline-2 focus-visible:outline-navy'}>
        Retry security check
      </button>}
    </section>
  )
}
