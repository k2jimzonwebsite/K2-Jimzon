import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useStore } from '../context/StoreContext'
import { ANALYTICS_CHOICE_EVENT, analyticsConsentExpiresAt, browserDeclinesAnalytics, publicAnalyticsPath, readAnalyticsConsent, saveAnalyticsConsent, updateAnalytics } from '../lib/storefrontAnalytics'

export default function StorefrontAnalytics() {
  const { view, productId, getProduct, loading, go } = useStore()
  const [choice, setChoice] = useState(readAnalyticsConsent)
  const [open, setOpen] = useState(() => readAnalyticsConsent() === null)
  const [remembered, setRemembered] = useState(true)
  const panelRef = useRef(null)
  const returnFocus = useRef(null)
  const browserDeclined = browserDeclinesAnalytics()
  const product = view === 'master_product' && !loading ? getProduct(productId) : null
  const path = publicAnalyticsPath(view, product)

  useLayoutEffect(() => { updateAnalytics(choice, path) }, [choice, path])
  useEffect(() => {
    const show = () => { returnFocus.current = document.activeElement; setOpen(true) }
    const sync = () => { const saved = readAnalyticsConsent(); setChoice(saved); setOpen(saved === null) }
    const suspend = () => updateAnalytics(choice, null)
    window.addEventListener(ANALYTICS_CHOICE_EVENT, show)
    window.addEventListener('storage', sync)
    window.addEventListener('k2:analytics-suspend', suspend)
    window.addEventListener('popstate', suspend)
    return () => {
      window.removeEventListener(ANALYTICS_CHOICE_EVENT, show)
      window.removeEventListener('storage', sync)
      window.removeEventListener('k2:analytics-suspend', suspend)
      window.removeEventListener('popstate', suspend)
    }
  }, [choice])
  useEffect(() => {
    let timeout
    const recheck = () => {
      clearTimeout(timeout)
      const expires = analyticsConsentExpiresAt()
      if (!expires) return
      if (expires <= Date.now()) {
        updateAnalytics(null, null)
        setChoice(null)
        setOpen(true)
      } else timeout = setTimeout(recheck, Math.min(expires - Date.now(), 2147483647))
    }
    recheck()
    window.addEventListener('focus', recheck)
    document.addEventListener('visibilitychange', recheck)
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('focus', recheck)
      document.removeEventListener('visibilitychange', recheck)
    }
  }, [choice])
  useEffect(() => {
    if (open && returnFocus.current) panelRef.current?.querySelector('button[data-consent-choice]:not([disabled])')?.focus()
  }, [open])

  const close = () => {
    setOpen(false)
    if (returnFocus.current?.isConnected) returnFocus.current.focus()
    returnFocus.current = null
  }

  const choose = value => {
    const saved = saveAnalyticsConsent(value)
    setRemembered(saved)
    setChoice(value)
    if (saved) close()
    else setOpen(true)
  }
  // The immersive room owns its full viewport. Defer the optional prompt until
  // the visitor leaves; consent remains unset/off and regular controls return.
  if (!open || view === 'store') return null
  return (
    <section ref={panelRef} aria-label="Optional analytics" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close() } }} className="fixed left-4 right-4 z-50 rounded-xl border border-line bg-paper p-5 text-navy sm:right-auto sm:max-w-sm" style={{ bottom: 'calc(var(--k2-mobile-nav-height, 0px) + 5rem)', maxHeight: 'calc(100dvh - var(--k2-mobile-nav-height, 0px) - 6rem)', overflowY: 'auto' }}>
      <button type="button" aria-label="Close analytics choices" onClick={close} className="absolute flex items-center justify-center rounded-xl border border-line text-navy hover:border-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy" style={{ top: 8, right: 8, width: 44, height: 44 }}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m18 6-12 12M6 6l12 12" /></svg></button>
      <h2 className="pr-12 font-sans text-base font-bold">Optional analytics</h2>
      <p className="mt-2 text-sm leading-relaxed text-navy-soft">With your permission, Google Analytics helps us understand visits to our public pages. We exclude your search terms, forms and private account or order pages.</p>
      {browserDeclined && <p className="mt-2 text-sm text-navy-soft">Your browser asks us not to track, so analytics stays off.</p>}
      {!remembered && <p role="status" className="mt-2 text-sm text-navy-soft">Your choice applies to this visit. This browser could not remember it.</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" data-consent-choice disabled={browserDeclined} onClick={() => choose('granted')} className="min-h-11 rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:border-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-50">Accept analytics</button>
        <button type="button" data-consent-choice onClick={() => choose('denied')} className="min-h-11 rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:border-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy">Decline</button>
      </div>
      <button type="button" onClick={() => { close(); go('privacy', { focusSelector: 'main h1' }) }} className="mt-2 min-h-11 text-sm font-semibold underline underline-offset-4">Privacy &amp; Data</button>
    </section>
  )
}
