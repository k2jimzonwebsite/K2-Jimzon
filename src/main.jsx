import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
// Vite resolves this alias to a target-specific application entry. Production
// builds contain either the storefront or the admin UI, never both.
import App from '@k2-app-entry'
import { installErrorReporting } from './lib/reportError'

// Capture uncaught errors + promise rejections app-wide without raw diagnostics.
installErrorReporting()

// Self-heal stale-deployment chunk errors. When a lazily-imported view fails to
// fetch (its hashed filename changed after a new deploy), Vite fires this event.
// We reload once to pull the fresh build. The time-guard prevents an infinite
// reload loop if a chunk is genuinely broken (then the ErrorBoundary shows).
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const KEY = 'k2:lastChunkReload'
  const last = Number(sessionStorage.getItem(KEY) || 0)
  if (Date.now() - last > 10000) {
    sessionStorage.setItem(KEY, String(Date.now()))
    window.location.reload()
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)

// Brand fonts improve the visual finish but must never hold the application
// bootstrap hostage when Google's font host is slow, filtered, or offline.
// System fallbacks are already declared in index.css, so load this optional
// stylesheet only after React has been scheduled to render.
const loadBrandFonts = () => {
  if (document.querySelector('link[data-k2-brand-fonts]')) return
  const stylesheet = document.createElement('link')
  stylesheet.rel = 'stylesheet'
  stylesheet.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Source+Sans+3:ital,wght@0,400..800;1,400..700&display=swap'
  stylesheet.dataset.k2BrandFonts = 'true'
  document.head.appendChild(stylesheet)
}

if ('requestIdleCallback' in window) {
  window.requestIdleCallback(loadBrandFonts, { timeout: 2000 })
} else {
  window.setTimeout(loadBrandFonts, 0)
}
