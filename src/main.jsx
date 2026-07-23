import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'

console.log(
  "%c☕ Ciao! Inspecting the code? You must appreciate the finer things in life, like authentic Italian espresso and beautifully crafted react. Welcome to the manifest.",
  "font-size: 13px; font-family: monospace; color: #8A433A; padding: 10px; border-radius: 4px; border: 1px solid #E5D5C5; background: #FAF7F2;"
)

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
