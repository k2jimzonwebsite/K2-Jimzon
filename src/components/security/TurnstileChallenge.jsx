import { useEffect, useId, useRef, useState } from 'react'
import { guestBffEnabled } from '../../services/guestCommerceService'

let scriptPromise = null

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-k2-turnstile]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.turnstile), { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.k2Turnstile = 'true'
    script.onload = () => resolve(window.turnstile)
    script.onerror = reject
    document.head.appendChild(script)
  })
  return scriptPromise
}

export default function TurnstileChallenge({ onTokenChange }) {
  const containerRef = useRef(null)
  const widgetRef = useRef(null)
  const errorId = useId()
  const [error, setError] = useState('')
  const enabled = guestBffEnabled()
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

  useEffect(() => {
    if (!enabled) return undefined
    if (!siteKey) {
      setError('The security check is not configured. Please contact K2 Jimzon.')
      onTokenChange('')
      return undefined
    }
    let cancelled = false
    loadTurnstile().then((turnstile) => {
      if (cancelled || !turnstile || !containerRef.current) return
      widgetRef.current = turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: 'guest_submission',
        appearance: 'interaction-only',
        callback: (token) => { setError(''); onTokenChange(token) },
        'expired-callback': () => { setError('Security check expired. Please complete it again.'); onTokenChange('') },
        'error-callback': () => { setError('Security check could not load. Please retry.'); onTokenChange(''); return true },
      })
    }).catch(() => {
      if (!cancelled) {
        setError('Security check could not load. Check your connection and retry.')
        onTokenChange('')
      }
    })
    return () => {
      cancelled = true
      if (widgetRef.current != null && window.turnstile) window.turnstile.remove(widgetRef.current)
    }
  }, [enabled, onTokenChange, siteKey])

  if (!enabled) return null
  return (
    <section aria-labelledby={`${errorId}-label`} aria-describedby={error ? errorId : undefined}
      className="mt-4 rounded-xl border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] p-4">
      <h3 id={`${errorId}-label`} className="text-sm font-semibold text-navy">Security check</h3>
      <p className="mt-1 text-sm leading-relaxed text-navy-soft">Complete this check before submitting. It helps us prevent automated spam.</p>
      <div ref={containerRef} className="mt-3 min-h-16" />
      {error && <p id={errorId} role="alert" className="mt-2 text-sm text-crimson">{error}</p>}
    </section>
  )
}
