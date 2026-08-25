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
